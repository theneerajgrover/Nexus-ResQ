// ============================================================
// RESPONDERS & MISSIONS REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';

export const respondersRouter = Router();

// GET /api/responders
respondersRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        callsign, 
        status, 
        latitude as lat, 
        longitude as lng, 
        current_incident_id as incident
      FROM responders
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err: any) {
    console.error('[Responders Error] GET /:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve responders.' });
  }
});

// GET /api/responders/mission
respondersRouter.get('/mission', async (req: Request, res: Response): Promise<void> => {
  try {
    const incidentId = req.query.incidentId as string | undefined;
    const responderId = req.query.responderId as string | undefined;

    let whereClause = '';
    const params: any[] = [];
    if (incidentId) {
      params.push(incidentId);
      whereClause = `WHERE m.incident_id = $${params.length}`;
    } else if (responderId) {
      params.push(responderId);
      whereClause = `WHERE m.responder_id = $${params.length}`;
    }

    const result = await query(`
      SELECT 
        m.id,
        m.incident_id as "incidentId",
        COALESCE(i.request_id, eq.id) as "requestId",
        COALESCE(m.plan_id, p.plan_id) as "planId",
        COALESCE(m.plan_id, p.plan_id) as plan_id,
        COALESCE(m.dispatch_id, d.id) as "dispatchId",
        COALESCE(m.dispatch_id, d.id) as dispatch_id,
        m.title,
        COALESCE(i.formatted_address, i.location, eq.formatted_address, eq.location, m.location) as "destinationAddress",
        COALESCE(i.formatted_address, i.location, eq.formatted_address, eq.location, m.location) as location,
        COALESCE(i.latitude, eq.latitude, m.latitude) as "destinationLat",
        COALESCE(i.longitude, eq.longitude, m.longitude) as "destinationLng",
        COALESCE(i.latitude, eq.latitude, m.latitude) as lat,
        COALESCE(i.longitude, eq.longitude, m.longitude) as lng,
        m.status as "dispatchStatus",
        m.status,
        i.status as "incidentStatus",
        m.priority,
        m.casualties_reported as "casualtiesReported",
        m.hazards,
        m.perimeter,
        m.notes,
        m.responder_id as "responderId",
        r.name as "responderName",
        r.callsign,
        r.latitude as "responderLat",
        r.longitude as "responderLng",
        r.accuracy as "responderAccuracy",
        r.heading as "responderHeading",
        r.speed as "responderSpeed"
      FROM missions m
      LEFT JOIN incidents i ON m.incident_id = i.id
      LEFT JOIN emergency_requests eq ON (eq.incident_id = i.id OR eq.id = i.request_id)
      LEFT JOIN responders r ON m.responder_id = r.id
      LEFT JOIN orchestration_plans p ON (p.incident_id = m.incident_id AND p.status IN ('APPROVED', 'EXECUTING', 'COMPLETED', 'WAITING_FOR_APPROVAL'))
      LEFT JOIN dispatch_records d ON (d.incident_id = m.incident_id)
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT 1
    `, params);

    if (result.rowCount && result.rowCount > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.json({ success: true, data: null, message: 'No active mission assigned.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/responders
respondersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
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

// PATCH /api/responders/:id
respondersRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, latitude, longitude, current_incident_id } = req.body;

    // Foreign key validation: if current_incident_id is provided and non-null, verify it exists in incidents table
    if (current_incident_id !== undefined && current_incident_id !== null && current_incident_id !== '') {
      const incCheck = await query(`SELECT id FROM incidents WHERE id = $1`, [current_incident_id]);
      if (!incCheck.rowCount || incCheck.rowCount === 0) {
        res.status(404).json({
          success: false,
          error: `Incident '${current_incident_id}' does not exist in active database records.`,
          code: 'INCIDENT_NOT_FOUND',
        });
        return;
      }
    }

    const result = await query(
      `UPDATE responders
       SET status = COALESCE($1, status),
           latitude = COALESCE($2, latitude),
           longitude = COALESCE($3, longitude),
           current_incident_id = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE current_incident_id END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING id, name, callsign, status, latitude as lat, longitude as lng, current_incident_id as incident`,
      [status, latitude, longitude, current_incident_id !== undefined ? current_incident_id : null, id]
    );

    if (result.rowCount && result.rowCount > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, error: `Responder ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/responders/mission/:id/status
respondersRouter.patch('/mission/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, actor, notes } = req.body;

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required.' });
      return;
    }

    const isCompleted = status === 'COMPLETED' || status === 'RESOLVED';
    const missionStatus = isCompleted ? 'COMPLETED' : status;

    // Update mission status
    const missionRes = await query(
      `UPDATE missions 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [missionStatus, id]
    );

    if (missionRes.rowCount && missionRes.rowCount > 0) {
      const missionRow = missionRes.rows[0];
      const responderId = missionRow.responder_id;
      const incidentId = missionRow.incident_id;

      if (responderId) {
        const respStatus = isCompleted ? 'AVAILABLE' : status;
        await query(
          `UPDATE responders 
           SET status = $1, current_incident_id = CASE WHEN $2 = TRUE THEN NULL ELSE current_incident_id END, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $3`,
          [respStatus, isCompleted, responderId]
        );
      }

      if (incidentId) {
        const incidentStatus = isCompleted ? 'RESOLVED' : status;
        await query(
          `UPDATE incidents SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [incidentStatus, incidentId]
        );

        // Update emergency_requests
        await query(
          `UPDATE emergency_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE incident_id = $2`,
          [status, incidentId]
        );

        // Update orchestration_plans execution status
        await query(
          `UPDATE orchestration_plans 
           SET execution_status = $1,
               status = CASE WHEN $2 = TRUE THEN 'COMPLETED' ELSE status END,
               execution_completed_at = CASE WHEN $2 = TRUE THEN CURRENT_TIMESTAMP ELSE execution_completed_at END,
               updated_at = CURRENT_TIMESTAMP 
           WHERE incident_id = $3`,
          [status, isCompleted, incidentId]
        );

        // Record in incident_status_history
        await query(
          `INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, actor, responder_id, notes, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
          [
            `HIST-${Date.now()}`,
            incidentId,
            missionRow.status,
            status,
            actor || 'Field Responder',
            responderId || null,
            notes || `Operational state transitioned to ${status} via field update.`,
          ]
        ).catch(() => {});

        // Broadcast real-time SSE event
        const { broadcastEvent } = await import('./realtime');
        broadcastEvent('INCIDENT_STATUS_CHANGED', {
          incidentId,
          responderId: responderId || null,
          previousStatus: missionRow.status,
          newStatus: status,
          actor: actor || 'Field Responder',
          notes: notes || `Operational state transitioned to ${status}`,
          timestamp: Date.now(),
        });
      }

      if (isCompleted && incidentId) {
        // Release any associated ambulance
        await query(
          `UPDATE ambulances SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE last_update ILIKE $1`,
          [`%${incidentId}%`]
        ).catch(() => {});
        // Restore equipment
        await query(
          `UPDATE equipment SET available = LEAST(qty, available + 1), status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE available < qty`
        ).catch(() => {});
      }

      // Log audit
      await query(
        `INSERT INTO audit_logs (id, actor, action, entity, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [`AUD-${Date.now()}`, actor || 'Field Responder', 'MISSION_STATUS_UPDATED', 'missions', JSON.stringify({ missionId: id, newStatus: status, isCompleted })]
      ).catch(() => {});

      res.json({ success: true, data: missionRes.rows[0] });
    } else {
      res.status(404).json({ success: false, error: `Mission ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/responders/history (Historical missions and dispatches from database)
respondersRouter.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const responderId = req.query.responder_id as string;
    let missionsQuery;
    let params: any[] = [];

    if (responderId) {
      missionsQuery = `
        SELECT 
          m.id,
          m.incident_id as "incidentId",
          COALESCE(i.request_id, eq.id) as "requestId",
          m.title,
          COALESCE(i.formatted_address, i.location, eq.formatted_address, eq.location, m.location) as "destinationAddress",
          COALESCE(i.formatted_address, i.location, eq.formatted_address, eq.location, m.location) as location,
          COALESCE(i.latitude, eq.latitude, m.latitude) as "destinationLat",
          COALESCE(i.longitude, eq.longitude, m.longitude) as "destinationLng",
          COALESCE(i.latitude, eq.latitude, m.latitude) as lat,
          COALESCE(i.longitude, eq.longitude, m.longitude) as lng,
          m.status as "dispatchStatus",
          m.status,
          i.status as "incidentStatus",
          m.priority,
          m.casualties_reported as "casualtiesReported",
          m.hazards,
          m.perimeter,
          m.notes,
          m.created_at as "createdAt",
          m.updated_at as "updatedAt",
          r.name as "responderName",
          r.callsign
        FROM missions m
        LEFT JOIN incidents i ON m.incident_id = i.id
        LEFT JOIN emergency_requests eq ON (eq.incident_id = i.id OR eq.id = i.request_id)
        LEFT JOIN responders r ON m.responder_id = r.id
        WHERE m.responder_id = $1
        ORDER BY m.updated_at DESC
        LIMIT 50
      `;
      params = [responderId];
    } else {
      missionsQuery = `
        SELECT 
          m.id,
          m.incident_id as "incidentId",
          COALESCE(i.request_id, eq.id) as "requestId",
          m.title,
          COALESCE(i.formatted_address, i.location, eq.formatted_address, eq.location, m.location) as "destinationAddress",
          COALESCE(i.formatted_address, i.location, eq.formatted_address, eq.location, m.location) as location,
          COALESCE(i.latitude, eq.latitude, m.latitude) as "destinationLat",
          COALESCE(i.longitude, eq.longitude, m.longitude) as "destinationLng",
          COALESCE(i.latitude, eq.latitude, m.latitude) as lat,
          COALESCE(i.longitude, eq.longitude, m.longitude) as lng,
          m.status as "dispatchStatus",
          m.status,
          i.status as "incidentStatus",
          m.priority,
          m.casualties_reported as "casualtiesReported",
          m.hazards,
          m.perimeter,
          m.notes,
          m.created_at as "createdAt",
          m.updated_at as "updatedAt",
          r.name as "responderName",
          r.callsign
        FROM missions m
        LEFT JOIN incidents i ON m.incident_id = i.id
        LEFT JOIN emergency_requests eq ON (eq.incident_id = i.id OR eq.id = i.request_id)
        LEFT JOIN responders r ON m.responder_id = r.id
        ORDER BY m.updated_at DESC
        LIMIT 50
      `;
    }

    const [missionsRes, dispatchesRes] = await Promise.all([
      query(missionsQuery, params),
      query(`
        SELECT id, resource_type as "resourceType", qty_dispatched as "qtyDispatched", destination, incident_id as "incidentId", unit, status, created_at as "createdAt"
        FROM dispatch_records
        ORDER BY created_at DESC
        LIMIT 20
      `),
    ]);

    res.json({
      success: true,
      data: {
        missions: missionsRes.rows,
        dispatches: dispatchesRes.rows,
      },
    });
  } catch (err: any) {
    console.error('[Responders History Error]:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve responder history.' });
  }
});
