// ============================================================
// RESOURCE MANAGEMENT REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query, pool } from '../db';
import { broadcastEvent } from './realtime';

export const resourcesRouter = Router();

// GET /api/resources/overview
resourcesRouter.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const [suppliesRes, sheltersRes, ambulancesRes, dispatchesRes, respondersRes, activeEmergencyRes] = await Promise.all([
      query(`SELECT count(*)::int as count FROM supplies WHERE qty < demand`),
      query(`SELECT count(*)::int as count FROM shelters WHERE status = 'NEAR FULL'`),
      query(`SELECT count(*)::int as count FROM ambulances WHERE status = 'AVAILABLE'`),
      query(`SELECT count(*)::int as count FROM dispatch_records WHERE status = 'PENDING'`),
      query(`SELECT count(*)::int as count FROM responders WHERE status = 'AVAILABLE'`),
      query(`SELECT * FROM resource_manager_emergencies WHERE status = 'EMERGENCY_AFFECTED' ORDER BY created_at DESC LIMIT 1`),
    ]);

    const activeEmergency = activeEmergencyRes.rows[0] || null;
    const operationalStatus = activeEmergency ? 'EMERGENCY — RESOURCE REQUEST REQUIRED' : 'OPERATIONAL';

    res.json({
      success: true,
      data: {
        shortages: suppliesRes.rows[0]?.count || 0,
        nearFullShelters: sheltersRes.rows[0]?.count || 0,
        availableAmbulances: ambulancesRes.rows[0]?.count || 0,
        pendingDispatches: dispatchesRes.rows[0]?.count || 0,
        availableResponders: respondersRes.rows[0]?.count || 0,
        operationalStatus,
        isAffected: !!activeEmergency,
        activeEmergency,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/resources/emergency-status
resourcesRouter.get('/emergency-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const [activeRes, historyRes] = await Promise.all([
      query(`SELECT * FROM resource_manager_emergencies WHERE status = 'EMERGENCY_AFFECTED' ORDER BY created_at DESC`),
      query(`SELECT * FROM resource_manager_emergencies ORDER BY created_at DESC LIMIT 20`),
    ]);

    const isAffected = (activeRes.rowCount ?? 0) > 0;
    const operationalStatus = isAffected ? 'EMERGENCY — RESOURCE REQUEST REQUIRED' : 'OPERATIONAL';

    res.json({
      success: true,
      isAffected,
      operationalStatus,
      activeEmergency: activeRes.rows[0] || null,
      activeEmergencies: activeRes.rows,
      history: historyRes.rows,
    });
  } catch (err: any) {
    console.error('[Resources Error] /emergency-status:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resources/declare-emergency
resourcesRouter.post('/declare-emergency', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      managerId,
      location,
      emergencyType,
      severity,
      description,
      requestedResourceType,
      requestedQuantity,
      reservedLocalQuantity,
    } = req.body;

    if (!location || !location.trim()) {
      res.status(400).json({ success: false, error: 'Location of the affected facility is mandatory.' });
      return;
    }
    if (!emergencyType || !emergencyType.trim()) {
      res.status(400).json({ success: false, error: 'Emergency type is mandatory.' });
      return;
    }
    if (!description || description.trim().length < 5) {
      res.status(400).json({ success: false, error: 'A descriptive reason for the emergency declaration is mandatory (min 5 characters).' });
      return;
    }

    const rmeId = `RME-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const effectiveManagerId = managerId || 'USR-004';
    const effectiveSeverity = (severity || 'HIGH').toUpperCase();
    const reqQty = parseInt(requestedQuantity, 10) || 0;
    const resQty = parseInt(reservedLocalQuantity, 10) || 0;

    const insertRes = await query(
      `INSERT INTO resource_manager_emergencies (
        id, manager_id, location, emergency_type, severity, status, description,
        requested_resource_type, requested_quantity, reserved_local_quantity
      ) VALUES ($1, $2, $3, $4, $5, 'EMERGENCY_AFFECTED', $6, $7, $8, $9)
      RETURNING *`,
      [
        rmeId,
        effectiveManagerId,
        location.trim(),
        emergencyType.trim(),
        effectiveSeverity,
        description.trim(),
        requestedResourceType?.trim() || null,
        reqQty,
        resQty,
      ]
    );

    const savedEmergency = insertRes.rows[0];

    // Create persistent notification for Authority / Command in notifications table
    const notifId = `NOTIF-RME-${Date.now()}`;
    const notifPriority = effectiveSeverity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
    const notifTitle = `EMERGENCY: ${location.trim()} Self-Emergency Declared`;
    const notifMsg = `Resource Facility "${location.trim()}" has declared ${emergencyType} (${effectiveSeverity}). Description: ${description.trim()}. Requested Assistance: ${reqQty} ${requestedResourceType || 'units'}. Local Reserves Locked: ${resQty} units. Outgoing transfers restricted.`;

    await query(
      `INSERT INTO notifications (
        id, user_id, role, type, priority, title, message, status
      ) VALUES ($1, $2, 'authority_command', 'RESOURCE_MANAGER_EMERGENCY', $3, $4, $5, 'UNREAD')`,
      [notifId, effectiveManagerId, notifPriority, notifTitle, notifMsg]
    );

    // Real-time broadcast
    broadcastEvent('RESOURCE_MANAGER_EMERGENCY_DECLARED', {
      emergencyId: rmeId,
      location: location.trim(),
      emergencyType: emergencyType.trim(),
      severity: effectiveSeverity,
      requestedResourceType: requestedResourceType?.trim() || null,
      requestedQuantity: reqQty,
      reservedLocalQuantity: resQty,
      status: 'EMERGENCY_AFFECTED',
      timestamp: Date.now(),
    });
    broadcastEvent('NOTIFICATION_CREATED', {
      id: notifId,
      title: notifTitle,
      priority: notifPriority,
    });

    res.status(201).json({
      success: true,
      message: 'Self-emergency declared successfully. Authority Command alerted and local reserve safeguards activated.',
      operationalStatus: 'EMERGENCY — RESOURCE REQUEST REQUIRED',
      data: savedEmergency,
    });
  } catch (err: any) {
    console.error('[Resources Error] /declare-emergency:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resources/restore-status
resourcesRouter.post('/restore-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { emergencyId, location, restoredBy, notes } = req.body;
    const effectiveRestorer = restoredBy || 'Resource Manager';

    let updateRes;
    if (emergencyId) {
      updateRes = await query(
        `UPDATE resource_manager_emergencies
         SET status = 'RESTORED',
             restored_at = CURRENT_TIMESTAMP,
             restored_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND status = 'EMERGENCY_AFFECTED'
         RETURNING *`,
        [effectiveRestorer, emergencyId]
      );
    } else if (location) {
      updateRes = await query(
        `UPDATE resource_manager_emergencies
         SET status = 'RESTORED',
             restored_at = CURRENT_TIMESTAMP,
             restored_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE location = $2 AND status = 'EMERGENCY_AFFECTED'
         RETURNING *`,
        [effectiveRestorer, location]
      );
    } else {
      updateRes = await query(
        `UPDATE resource_manager_emergencies
         SET status = 'RESTORED',
             restored_at = CURRENT_TIMESTAMP,
             restored_by = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'EMERGENCY_AFFECTED'
         RETURNING *`,
        [effectiveRestorer]
      );
    }

    if (updateRes.rowCount === 0) {
      res.json({
        success: true,
        message: 'Facility is already in OPERATIONAL status. No active emergencies to restore.',
        operationalStatus: 'OPERATIONAL',
        data: [],
      });
      return;
    }

    const restoredLocation = location || updateRes.rows[0]?.location || 'All Sites';

    // Create persistent notification for Authority / Command
    const notifId = `NOTIF-RME-RESTORE-${Date.now()}`;
    const notifTitle = `OPERATIONS RESTORED: ${restoredLocation}`;
    const notifMsg = `Resource Facility "${restoredLocation}" has been restored to normal OPERATIONAL status by ${effectiveRestorer}. Notes: ${notes || 'Normal capacity and operations resumed.'}. All transfer restrictions have been lifted.`;

    await query(
      `INSERT INTO notifications (
        id, role, type, priority, title, message, status
      ) VALUES ($1, 'authority_command', 'RESOURCE_MANAGER_RESTORED', 'MODERATE', $2, $3, 'UNREAD')`,
      [notifId, notifTitle, notifMsg]
    );

    // Real-time broadcast
    broadcastEvent('RESOURCE_MANAGER_STATUS_RESTORED', {
      location: restoredLocation,
      restoredBy: effectiveRestorer,
      restoredCount: updateRes.rowCount,
      status: 'OPERATIONAL',
      timestamp: Date.now(),
    });
    broadcastEvent('NOTIFICATION_CREATED', {
      id: notifId,
      title: notifTitle,
      priority: 'MODERATE',
    });

    res.json({
      success: true,
      message: 'Operational status restored to normal. Resource transfer restrictions lifted.',
      operationalStatus: 'OPERATIONAL',
      data: updateRes.rows,
    });
  } catch (err: any) {
    console.error('[Resources Error] /restore-status:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/resources/supplies
resourcesRouter.get('/supplies', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        category, 
        qty, 
        COALESCE(allocated, 0)::int as allocated,
        (qty - COALESCE(allocated, 0))::int as available,
        demand, 
        unit, 
        location, 
        last_sync as "lastSync"
      FROM supplies
      ORDER BY id ASC
    `);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/resources/ambulances
resourcesRouter.get('/ambulances', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        callsign, 
        crew, 
        status, 
        location, 
        last_update as "lastUpdate"
      FROM ambulances
      ORDER BY id ASC
    `);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/resources/equipment
resourcesRouter.get('/equipment', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        qty, 
        available, 
        (qty - available)::int as allocated,
        status, 
        location
      FROM equipment
      ORDER BY id ASC
    `);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/resources/dispatches
resourcesRouter.get('/dispatches', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        resource_type as "resourceType", 
        qty_approved as "qtyApproved", 
        qty_dispatched as "qtyDispatched", 
        destination, 
        incident_id as incident, 
        unit, 
        status, 
        approved_by as "approvedBy", 
        to_char(created_at, 'HH24:MI') as timestamp
      FROM dispatch_records
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resources/dispatches
resourcesRouter.post('/dispatches', async (req: Request, res: Response): Promise<void> => {
  try {
    const { resourceType, qtyApproved, qtyDispatched, destination, incident, unit, approvedBy, sourceLocation } = req.body;

    // 1. Check for Active Self-Emergency & Enforce Local Reserve Safeguards
    const activeEmergencyQuery = sourceLocation
      ? await query(`SELECT * FROM resource_manager_emergencies WHERE status = 'EMERGENCY_AFFECTED' AND location = $1`, [sourceLocation])
      : await query(`SELECT * FROM resource_manager_emergencies WHERE status = 'EMERGENCY_AFFECTED' ORDER BY created_at DESC`);

    if ((activeEmergencyQuery.rowCount ?? 0) > 0) {
      const emergency = activeEmergencyQuery.rows[0];
      const reservedQty = Number(emergency.reserved_local_quantity) || 0;
      const requestedOutward = Number(qtyDispatched || qtyApproved || 1);

      if (reservedQty > 0) {
        // Query total inventory currently available at this location
        const stockRes = await query(`
          SELECT COALESCE(SUM(qty), 0)::int as total_stock
          FROM supplies
          WHERE location = $1
        `, [emergency.location]);

        const totalStock = Number(stockRes.rows[0]?.total_stock) || 0;
        const availableForTransfer = Math.max(0, totalStock - reservedQty);

        if (requestedOutward > availableForTransfer) {
          res.status(400).json({
            success: false,
            error: `Transfer rejected: Location "${emergency.location}" is currently in self-emergency (${emergency.emergency_type}, severity: ${emergency.severity}). ${reservedQty} units are strictly reserved for local survival/operations. Available for external transfer: ${availableForTransfer} units. Requested dispatch: ${requestedOutward} units.`,
            code: 'EMERGENCY_RESERVE_RESTRICTION',
            emergencyId: emergency.id,
            location: emergency.location,
            emergencyType: emergency.emergency_type,
            reservedLocalQuantity: reservedQty,
            totalStock,
            availableForTransfer,
            requestedQuantity: requestedOutward,
          });
          return;
        }
      }
    }

    const id = `DSP-${Math.floor(100 + Math.random() * 900)}`;

    const insertRes = await query(
      `INSERT INTO dispatch_records (
        id, resource_type, qty_approved, qty_dispatched, destination, incident_id, unit, status, approved_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'DISPATCHED', $8)
      RETURNING *`,
      [id, resourceType, qtyApproved || 1, qtyDispatched || 1, destination, incident || null, unit, approvedBy || 'Resource Manager']
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resources/supplies
resourcesRouter.post('/supplies', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, qty, demand, unit, location } = req.body;
    if (!name || !category || !unit || !location) {
      res.status(400).json({ success: false, error: 'name, category, unit, and location are required.' });
      return;
    }
    const id = `SUP-${category?.substring(0, 3).toUpperCase() || 'GEN'}-${Math.floor(10 + Math.random() * 90)}`;

    const insertRes = await query(
      `INSERT INTO supplies (id, name, category, qty, demand, unit, location, last_sync)
       VALUES ($1, $2, $3, $4, $5, $6, $7, to_char(CURRENT_TIMESTAMP, 'HH24:MI'))
       RETURNING id, name, category, qty, demand, unit, location, last_sync as "lastSync"`,
      [id, name, category.toUpperCase(), qty || 0, demand || 0, unit, location]
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resources/ambulances
resourcesRouter.post('/ambulances', async (req: Request, res: Response): Promise<void> => {
  try {
    const { callsign, crew, status, location } = req.body;
    if (!callsign || !location) {
      res.status(400).json({ success: false, error: 'callsign and location are required.' });
      return;
    }
    const id = `AMB-${Math.floor(10 + Math.random() * 90)}`;

    const insertRes = await query(
      `INSERT INTO ambulances (id, callsign, crew, status, location, last_update)
       VALUES ($1, $2, $3, $4, $5, to_char(CURRENT_TIMESTAMP, 'HH24:MI'))
       RETURNING id, callsign, crew, status, location, last_update as "lastUpdate"`,
      [id, callsign, crew || 2, status || 'AVAILABLE', location]
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resources/equipment
resourcesRouter.post('/equipment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, qty, available, location } = req.body;
    if (!name || !location) {
      res.status(400).json({ success: false, error: 'name and location are required.' });
      return;
    }
    const totalQty = qty || 0;
    const availableQty = available !== undefined ? available : totalQty;
    const status = availableQty <= 0 ? 'DEPLETED' : availableQty < totalQty ? 'PARTIAL' : 'AVAILABLE';
    const id = `EQP-${Math.floor(10 + Math.random() * 90)}`;

    const insertRes = await query(
      `INSERT INTO equipment (id, name, qty, available, status, location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, qty, available, status, location`,
      [id, name, totalQty, availableQty, status, location]
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resources/responders
resourcesRouter.post('/responders', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, callsign, status, latitude, longitude } = req.body;
    if (!name) {
      res.status(400).json({ success: false, error: 'name is required.' });
      return;
    }
    const id = `R-${Math.floor(10 + Math.random() * 90)}`;
    const responderStatus = status || 'AVAILABLE';

    const insertRes = await query(
      `INSERT INTO responders (id, name, callsign, status, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, callsign, status, latitude as lat, longitude as lng`,
      [id, name, callsign || name.substring(0, 10).toUpperCase(), responderStatus, latitude || 28.6139, longitude || 77.2090]
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/resources/prototype/trigger-recovery
resourcesRouter.post('/prototype/trigger-recovery', async (req: Request, res: Response): Promise<void> => {
  try {
    const { releaseHours } = req.body || {};
    const { runPrototypeResourceRecovery } = await import('../services/prototypeResourceRecovery');
    const report = await runPrototypeResourceRecovery(
      releaseHours !== undefined ? { releaseHours: Number(releaseHours) } : undefined
    );
    res.json({ success: true, report });
  } catch (err: any) {
    console.error('[Resources Error] /prototype/trigger-recovery:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/resources/supplies/:id
resourcesRouter.patch('/supplies/:id', async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { qty, demand, location } = req.body;

    await client.query('BEGIN');

    const currentRes = await client.query('SELECT * FROM supplies WHERE id = $1 FOR UPDATE', [id]);
    if (currentRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: `Supply item ${id} not found.` });
      return;
    }

    const current = currentRes.rows[0];

    // Query active dispatches where status = 'DISPATCHED' for this supply
    const dispatchRes = await client.query(
      `SELECT COALESCE(SUM(qty_dispatched), 0)::int as active_dispatched
       FROM dispatch_records
       WHERE status = 'DISPATCHED'
         AND (resource_type ILIKE '%' || $1 || '%' OR resource_type ILIKE '%' || $2 || '%')`,
      [current.name, current.category]
    );
    const activeDispatched = parseInt(dispatchRes.rows[0]?.active_dispatched || '0', 10);
    const committedAllocated = Math.max(current.allocated || 0, activeDispatched);

    const targetQty = qty !== undefined ? parseInt(qty, 10) : current.qty;
    if (isNaN(targetQty)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Quantity must be a valid integer.' });
      return;
    }
    if (targetQty < 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Quantity cannot be negative.' });
      return;
    }

    // CRITICAL BUSINESS RULE: NEW TOTAL >= CURRENTLY ALLOCATED
    if (targetQty < committedAllocated) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: `Supply quantity cannot be reduced below ${committedAllocated} — ${committedAllocated} ${current.unit || 'units'} are currently allocated/committed.`,
        allocated: committedAllocated,
        requestedQuantity: targetQty,
      });
      return;
    }

    const targetDemand = demand !== undefined ? parseInt(demand, 10) : current.demand;
    const targetLocation = location !== undefined ? location : current.location;

    const updateRes = await client.query(
      `UPDATE supplies
       SET qty = $1,
           allocated = $2,
           demand = $3,
           location = $4,
           last_sync = to_char(CURRENT_TIMESTAMP, 'HH24:MI'),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, category, qty, allocated,
         (qty - allocated) as available, demand, unit, location,
         last_sync as "lastSync", updated_at`,
      [targetQty, committedAllocated, targetDemand, targetLocation, id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: updateRes.rows[0] });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[Resources Error] PATCH /supplies/:id:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/resources/equipment/:id
resourcesRouter.patch('/equipment/:id', async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { qty, location } = req.body;

    await client.query('BEGIN');

    const currentRes = await client.query('SELECT * FROM equipment WHERE id = $1 FOR UPDATE', [id]);
    if (currentRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: `Equipment item ${id} not found.` });
      return;
    }

    const current = currentRes.rows[0];

    // Query active dispatches for this equipment
    const dispatchRes = await client.query(
      `SELECT COALESCE(SUM(qty_dispatched), 0)::int as active_dispatched
       FROM dispatch_records
       WHERE status = 'DISPATCHED'
         AND (resource_type ILIKE '%' || $1 || '%' OR unit ILIKE '%' || $1 || '%')`,
      [current.name]
    );
    const activeDispatched = parseInt(dispatchRes.rows[0]?.active_dispatched || '0', 10);
    const currentInUse = Math.max(0, current.qty - current.available);
    const committedAllocated = Math.max(currentInUse, activeDispatched);

    const targetQty = qty !== undefined ? parseInt(qty, 10) : current.qty;
    if (isNaN(targetQty)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Quantity must be a valid integer.' });
      return;
    }
    if (targetQty < 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Quantity cannot be negative.' });
      return;
    }

    // CRITICAL BUSINESS RULE: NEW TOTAL >= CURRENTLY ALLOCATED
    if (targetQty < committedAllocated) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: `Equipment quantity cannot be reduced below ${committedAllocated} — ${committedAllocated} units are currently allocated/in use.`,
        allocated: committedAllocated,
        requestedQuantity: targetQty,
      });
      return;
    }

    const newAvailable = targetQty - committedAllocated;
    const newStatus = newAvailable <= 0 ? 'DEPLETED' : newAvailable < targetQty ? 'PARTIAL' : 'AVAILABLE';
    const targetLocation = location !== undefined ? location : current.location;

    const updateRes = await client.query(
      `UPDATE equipment
       SET qty = $1,
           available = $2,
           status = $3,
           location = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, qty, available, (qty - available) as allocated, status, location, updated_at`,
      [targetQty, newAvailable, newStatus, targetLocation, id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: updateRes.rows[0] });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[Resources Error] PATCH /equipment/:id:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

