// ============================================================
// INCIDENTS REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';

export const incidentsRouter = Router();

// GET /api/incidents
incidentsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        title, 
        type, 
        severity, 
        location, 
        latitude as lat, 
        longitude as lng, 
        status, 
        responders_count as responders, 
        pending, 
        created_at as "createdAt"
      FROM incidents
      ORDER BY 
        CASE severity 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MODERATE' THEN 3 
          ELSE 4 
        END,
        pending DESC,
        created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err: any) {
    console.error('[Incidents Error] GET /:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve incidents.' });
  }
});

// GET /api/incidents/:id
incidentsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM incidents WHERE id = $1`, [id]);
    if (result.rowCount && result.rowCount > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, error: `Incident ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/incidents/:id/history
incidentsRouter.get('/:id/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, request_id, incident_id, previous_status, new_status, actor, responder_id, notes, to_char(created_at, 'HH24:MI') as time, created_at
       FROM incident_status_history
       WHERE incident_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/incidents
incidentsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, type, severity, location, latitude, longitude, responders_count, pending } = req.body;
    const id = `INC-${Date.now().toString().slice(-4)}`;

    const insertRes = await query(
      `INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, responders_count, pending)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9) RETURNING *`,
      [id, title || 'Reported Emergency', type || 'OTHER', severity || 'HIGH', location, latitude || 0, longitude || 0, responders_count || 0, pending !== false]
    );

    // Automatically formulate AI orchestration response plan (awaits human approval before execution)
    agentOrchestrator.preparePlan(id).catch((err) => {
      console.error('[Incidents] Automatic plan preparation failed:', err.message);
    });

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/incidents/:id
incidentsRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, responders, pending, severity } = req.body;

    const updateRes = await query(
      `UPDATE incidents 
       SET 
         status = COALESCE($1, status),
         responders_count = COALESCE($2, responders_count),
         pending = COALESCE($3, pending),
         severity = COALESCE($4, severity),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status, responders, pending, severity, id]
    );

    if (updateRes.rowCount && updateRes.rowCount > 0) {
      const inc = updateRes.rows[0];
      if (status === 'RESOLVED' || status === 'COMPLETED') {
        // Release assigned responder
        await query(
          `UPDATE responders
           SET status = 'AVAILABLE', current_incident_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE current_incident_id = $1 OR id = $2`,
          [id, inc.assigned_responder_id || null]
        ).catch(() => {});

        // Release associated ambulances
        await query(
          `UPDATE ambulances SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE last_update ILIKE $1`,
          [`%${id}%`]
        ).catch(() => {});

        // Restore equipment
        await query(
          `UPDATE equipment SET available = LEAST(qty, available + 1), status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE available < qty`
        ).catch(() => {});
      }

      res.json({ success: true, data: inc });
    } else {
      res.status(404).json({ success: false, error: `Incident ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
