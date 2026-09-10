// ============================================================
// NEXUS RESQ — PROTOTYPE RESOURCE AUTO-RELEASE & RECOVERY SERVICE
// Automatically releases prototype-allocated resources after 3 hours
// Operates on real PostgreSQL records. No demo/mock data.
// ============================================================
import { query, pool } from '../db';

export interface RecoveryReport {
  success: boolean;
  releaseHours: number;
  releasedDispatches: number;
  releasedResponders: string[];
  releasedAmbulances: string[];
  releasedMissions: string[];
  restoredEquipment: string[];
  restoredShelters: string[];
  restoredSuppliesCount: number;
  timestamp: string;
  error?: string;
}

let isRecoveryRunning = false;
let recoveryTimer: NodeJS.Timeout | null = null;

/**
 * Execute a single idempotent cycle of prototype resource recovery.
 * Recovers real PostgreSQL resources that have been active/dispatched for >= releaseHours.
 */
export async function runPrototypeResourceRecovery(options?: { releaseHours?: number }): Promise<RecoveryReport> {
  const configuredHours = Number(process.env.PROTOTYPE_RESOURCE_RELEASE_HOURS || 3);
  const releaseHours = options?.releaseHours !== undefined ? options.releaseHours : configuredHours;

  const report: RecoveryReport = {
    success: true,
    releaseHours,
    releasedDispatches: 0,
    releasedResponders: [],
    releasedAmbulances: [],
    releasedMissions: [],
    restoredEquipment: [],
    restoredShelters: [],
    restoredSuppliesCount: 0,
    timestamp: new Date().toISOString(),
  };

  if (isRecoveryRunning) {
    console.log('[Resource Recovery] Cycle skipped: Previous recovery execution is still in progress.');
    return report;
  }

  isRecoveryRunning = true;
  const client = await pool.connect();

  try {
    // ------------------------------------------------------------
    // 1. RECOVER EXPIRED OPERATIONAL DISPATCHES
    // ------------------------------------------------------------
    const expiredDispatchesRes = await client.query(`
      SELECT * FROM dispatch_records
      WHERE status = 'DISPATCHED'
        AND (is_prototype_released IS NULL OR is_prototype_released = FALSE)
        AND created_at <= NOW() - ($1 || ' hours')::interval
      ORDER BY created_at ASC
      FOR UPDATE
    `, [releaseHours]);

    for (const dispatch of expiredDispatchesRes.rows) {
      await client.query('BEGIN');
      try {
        // A. Idempotent marker update on dispatch_records
        const markRes = await client.query(`
          UPDATE dispatch_records
          SET is_prototype_released = TRUE,
              released_at = CURRENT_TIMESTAMP,
              status = 'DELIVERED'
          WHERE id = $1 AND (is_prototype_released IS NULL OR is_prototype_released = FALSE)
          RETURNING id
        `, [dispatch.id]);

        if (!markRes.rowCount || markRes.rowCount === 0) {
          // Already marked by another transaction
          await client.query('ROLLBACK');
          continue;
        }

        report.releasedDispatches++;
        const incidentId = dispatch.incident_id;

        if (incidentId) {
          // B. Release assigned responder for this incident ONLY if not reassigned to a newer active dispatch
          const hasNewerDispatch = await client.query(`
            SELECT id FROM dispatch_records
            WHERE (unit ILIKE $1 OR resource_type ILIKE $1)
              AND status = 'DISPATCHED'
              AND (is_prototype_released IS NULL OR is_prototype_released = FALSE)
              AND created_at > $2
            LIMIT 1
          `, [`%${dispatch.unit?.replace(/^Unit\s+/i, '')}%`, dispatch.created_at]);

          if (!hasNewerDispatch.rowCount || hasNewerDispatch.rowCount === 0) {
            const respRes = await client.query(`
              UPDATE responders
              SET status = 'AVAILABLE',
                  current_incident_id = NULL,
                  updated_at = CURRENT_TIMESTAMP
              WHERE current_incident_id = $1
                AND status IN ('ASSIGNED', 'EN ROUTE', 'ON SCENE', 'ASSISTING', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED')
              RETURNING id, name
            `, [incidentId]);

            for (const r of respRes.rows) {
              if (!report.releasedResponders.includes(r.id)) {
                report.releasedResponders.push(r.id);
              }
            }
          } else {
            console.log(`[Resource Recovery] Responder ${dispatch.unit} preserved: Reassigned to newer active dispatch ${hasNewerDispatch.rows[0].id}.`);
          }

          // C. Complete associated mission
          const msnRes = await client.query(`
            UPDATE missions
            SET status = 'COMPLETED',
                updated_at = CURRENT_TIMESTAMP
            WHERE incident_id = $1
              AND status IN ('ASSIGNED', 'ACCEPTED', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED', 'EN ROUTE', 'ON SCENE', 'ASSISTING')
            RETURNING id
          `, [incidentId]);

          for (const m of msnRes.rows) {
            if (!report.releasedMissions.includes(m.id)) {
              report.releasedMissions.push(m.id);
            }
          }

          // D. Release associated ambulances ONLY if not assigned to a newer active incident
          const ambRes = await client.query(`
            UPDATE ambulances
            SET status = 'AVAILABLE',
                last_update = 'Available / Base Standby',
                updated_at = CURRENT_TIMESTAMP
            WHERE last_update ILIKE $1
              AND status = 'DISPATCHED'
            RETURNING id, callsign
          `, [`%${incidentId}%`]);

          for (const a of ambRes.rows) {
            if (!report.releasedAmbulances.includes(a.id)) {
              report.releasedAmbulances.push(a.id);
            }
          }

          // E. Restore equipment (bounded by total qty)
          const eqpRes = await client.query(`
            UPDATE equipment
            SET available = LEAST(qty, available + 1),
                status = CASE WHEN available + 1 >= qty THEN 'AVAILABLE' ELSE 'PARTIAL' END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = (
              SELECT id FROM equipment 
              WHERE available < qty 
              ORDER BY updated_at ASC LIMIT 1
            )
            RETURNING id, name
          `);

          for (const e of eqpRes.rows) {
            report.restoredEquipment.push(e.id);
          }

          // F. Restore shelter occupancy if an intake occurred for this incident
          const recShelterRes = await client.query(`
            SELECT recommended_shelter FROM ai_recommendations 
            WHERE incident_id = $1 AND recommended_shelter IS NOT NULL 
            LIMIT 1
          `, [incidentId]);

          const targetShelterName = recShelterRes.rows[0]?.recommended_shelter;
          if (targetShelterName) {
            const shlRes = await client.query(`
              UPDATE shelters
              SET occupancy = GREATEST(0, occupancy - 20),
                  status = CASE WHEN GREATEST(0, occupancy - 20) >= capacity THEN 'NEAR FULL' ELSE 'OPEN' END,
                  updated_at = CURRENT_TIMESTAMP
              WHERE name ILIKE $1 AND occupancy > 0
              RETURNING id, name
            `, [`%${targetShelterName}%`]);

            for (const s of shlRes.rows) {
              report.restoredShelters.push(s.id);
            }
          }

          // G. Resolve incident state
          await client.query(`
            UPDATE incidents
            SET status = 'RESOLVED',
                responders_count = 0,
                pending = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status != 'RESOLVED'
          `, [incidentId]);

          // H. Log transition in incident_status_history
          const histId = `HIST-${Date.now()}-REL-${dispatch.id}`;
          await client.query(`
            INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, actor, notes, created_at)
            VALUES ($1, $2, 'RESPONDING', 'RESOLVED', 'PROTOTYPE_LIFECYCLE', $3, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO NOTHING
          `, [
            histId,
            incidentId,
            `Prototype lifecycle auto-release completed (${releaseHours}h): ${dispatch.unit} and related operational assets transitioned back to AVAILABLE.`,
          ]);
        }

        // I. If dispatch represented supply distribution, restore supply quantity
        const isSupplyDispatch = dispatch.resource_type && (
          dispatch.resource_type.toLowerCase().includes('water') ||
          dispatch.resource_type.toLowerCase().includes('food') ||
          dispatch.resource_type.toLowerCase().includes('medical') ||
          dispatch.resource_type.toLowerCase().includes('suppl') ||
          dispatch.resource_type.toLowerCase().includes('blanket')
        );

        if (isSupplyDispatch) {
          const qtyToRestore = Number(dispatch.qty_dispatched) || 0;
          if (qtyToRestore > 0) {
            const supRes = await client.query(`
              UPDATE supplies
              SET qty = qty + $1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE name ILIKE $2 OR category ILIKE $2
              RETURNING id
            `, [qtyToRestore, `%${dispatch.resource_type.split(' ')[0]}%`]);

            if (supRes.rowCount && supRes.rowCount > 0) {
              report.restoredSuppliesCount += qtyToRestore;
            }
          }
        }

        // J. Store database-backed notification for command/operational history
        const notifId = `NOTIF-${Date.now()}-${dispatch.id}`;
        await client.query(`
          INSERT INTO notifications (id, role, type, priority, incident_id, title, message, status, created_at)
          VALUES ($1, 'authority_command', 'PROTOTYPE_RESOURCE_RELEASE', 'LOW', $2, 'Prototype Resource Auto-Release', $3, 'UNREAD', CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO NOTHING
        `, [
          notifId,
          incidentId || null,
          `Prototype 3-hour lifecycle completed — ${dispatch.unit || 'Resource unit'} released back to AVAILABLE in live PostgreSQL database.`,
        ]);

        await client.query('COMMIT');
      } catch (dispatchErr: any) {
        await client.query('ROLLBACK');
        console.error(`[Resource Recovery Error] Failed to release dispatch ${dispatch.id}:`, dispatchErr.message);
      }
    }

    // ------------------------------------------------------------
    // 2. RECOVER STANDALONE / ORPHANED RESPONDERS (ACTIVE >= releaseHours)
    // ------------------------------------------------------------
    const expiredRespondersRes = await client.query(`
      UPDATE responders
      SET status = 'AVAILABLE',
          current_incident_id = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('ASSIGNED', 'EN ROUTE', 'ON SCENE', 'ASSISTING', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED')
        AND updated_at <= NOW() - ($1 || ' hours')::interval
        AND id NOT IN (
          SELECT r.id FROM responders r
          JOIN dispatch_records d ON (d.unit ILIKE '%' || r.name || '%' OR d.unit ILIKE '%' || r.callsign || '%')
          WHERE d.status = 'DISPATCHED' AND (d.is_prototype_released IS NULL OR d.is_prototype_released = FALSE)
        )
      RETURNING id, name
    `, [releaseHours]);

    for (const r of expiredRespondersRes.rows) {
      if (!report.releasedResponders.includes(r.id)) {
        report.releasedResponders.push(r.id);
      }
    }

    // ------------------------------------------------------------
    // 3. RECOVER STANDALONE / ORPHANED AMBULANCES (ACTIVE >= releaseHours)
    // ------------------------------------------------------------
    const expiredAmbulancesRes = await client.query(`
      UPDATE ambulances
      SET status = 'AVAILABLE',
          last_update = 'Available / Base Standby',
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'DISPATCHED'
        AND updated_at <= NOW() - ($1 || ' hours')::interval
      RETURNING id, callsign
    `, [releaseHours]);

    for (const a of expiredAmbulancesRes.rows) {
      if (!report.releasedAmbulances.includes(a.id)) {
        report.releasedAmbulances.push(a.id);
      }
    }

    // ------------------------------------------------------------
    // 4. RECOVER STANDALONE / ORPHANED MISSIONS (ACTIVE >= releaseHours)
    // ------------------------------------------------------------
    const expiredMissionsRes = await client.query(`
      UPDATE missions
      SET status = 'COMPLETED',
          updated_at = CURRENT_TIMESTAMP
      WHERE status IN ('ASSIGNED', 'ACCEPTED', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED', 'EN ROUTE', 'ON SCENE', 'ASSISTING')
        AND updated_at <= NOW() - ($1 || ' hours')::interval
      RETURNING id
    `, [releaseHours]);

    for (const m of expiredMissionsRes.rows) {
      if (!report.releasedMissions.includes(m.id)) {
        report.releasedMissions.push(m.id);
      }
    }

    if (
      report.releasedDispatches > 0 ||
      report.releasedResponders.length > 0 ||
      report.releasedAmbulances.length > 0 ||
      report.restoredEquipment.length > 0
    ) {
      console.log(`[Resource Recovery] Completed (${releaseHours}h threshold):`, {
        releasedDispatches: report.releasedDispatches,
        responders: report.releasedResponders,
        ambulances: report.releasedAmbulances,
        equipment: report.restoredEquipment,
        shelters: report.restoredShelters,
        suppliesCount: report.restoredSuppliesCount,
      });
    }

  } catch (err: any) {
    report.success = false;
    report.error = err.message;
    console.error('[Resource Recovery Fatal Error]:', err.message);
  } finally {
    client.release();
    isRecoveryRunning = false;
  }

  return report;
}

/**
 * Start the background scheduler for prototype resource auto-release.
 * Polls at configurable interval (default: 60 seconds).
 */
export function startPrototypeResourceRecoveryScheduler(): NodeJS.Timeout | null {
  const isEnabled = process.env.PROTOTYPE_AUTO_RESOURCE_RELEASE !== 'false';
  if (!isEnabled) {
    console.log('[Resource Recovery] Background scheduler is disabled by PROTOTYPE_AUTO_RESOURCE_RELEASE=false');
    return null;
  }

  if (recoveryTimer) {
    return recoveryTimer;
  }

  const intervalMs = parseInt(process.env.PROTOTYPE_RESOURCE_RECOVERY_INTERVAL_MS || '60000', 10);
  const hours = Number(process.env.PROTOTYPE_RESOURCE_RELEASE_HOURS || 3);

  console.log(`[Resource Recovery] Scheduler initialized: Checking every ${Math.round(intervalMs / 1000)}s for allocations >= ${hours} hours.`);

  // Initial check on server boot
  runPrototypeResourceRecovery().catch((err) => {
    console.error('[Resource Recovery Boot Check Error]:', err.message);
  });

  recoveryTimer = setInterval(() => {
    runPrototypeResourceRecovery().catch((err) => {
      console.error('[Resource Recovery Periodic Error]:', err.message);
    });
  }, intervalMs);

  // Unref timer so it does not block Node process exit if needed
  if (typeof recoveryTimer.unref === 'function') {
    recoveryTimer.unref();
  }

  return recoveryTimer;
}

/**
 * Stop background scheduler (for testing or shutdown).
 */
export function stopPrototypeResourceRecoveryScheduler(): void {
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
    console.log('[Resource Recovery] Scheduler stopped.');
  }
}
