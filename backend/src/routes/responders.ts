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

// PATCH /api/responders/mission/:id/status
respondersRouter.patch('/mission/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required.' });
      return;
    }

    // Update mission status
    const missionRes = await query(
      `UPDATE missions 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [status, id]
    );

    // Also update responder table status if responder is assigned
    if (missionRes.rowCount && missionRes.rowCount > 0) {
      const responderId = missionRes.rows[0].responder_id;
      if (responderId) {
        await query(
          `UPDATE responders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [status, responderId]
        );
      }

      // Log audit
      await query(
        `INSERT INTO audit_logs (id, actor, action, entity, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [`AUD-${Date.now()}`, 'Field Responder', 'MISSION_STATUS_UPDATED', 'missions', JSON.stringify({ missionId: id, newStatus: status })]
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
