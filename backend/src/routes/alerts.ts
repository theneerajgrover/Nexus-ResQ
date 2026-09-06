// ============================================================
// ALERTS REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';

export const alertsRouter = Router();

// GET /api/alerts
alertsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        title, 
        message, 
        severity, 
        category, 
        affected_area as "affectedArea", 
        is_active as "isActive", 
        issued_at as "issuedAt"
      FROM alerts
      WHERE is_active = TRUE
      ORDER BY 
        CASE severity 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MODERATE' THEN 3 
          ELSE 4 
        END,
        issued_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err: any) {
    console.error('[Alerts Error] GET /:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve alerts.' });
  }
});

// POST /api/alerts (Issue Operational Warning / Emergency Alert)
alertsRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, message, description, severity, category, affected_area, affectedArea, affected_region, warning_type, created_by, expires_at } = req.body;
    const alertId = `WRN-${Date.now().toString().slice(-5)}`;

    const msg = message || description || title || 'Operational Warning';
    const targetArea = affected_area || affectedArea || affected_region || 'Command Sector';
    const warnType = warning_type || category || 'HAZARD_WARNING';
    const author = created_by || 'Command Authority';
    let sev = (severity || 'HIGH').toUpperCase();
    if (sev === 'WARNING') sev = 'HIGH';
    else if (sev === 'ADVISORY') sev = 'MODERATE';
    else if (!['CRITICAL', 'HIGH', 'MODERATE', 'LOW'].includes(sev)) sev = 'HIGH';

    const insertRes = await query(
      `INSERT INTO alerts (id, title, message, severity, category, affected_area, warning_type, created_by, is_active, issued_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, CURRENT_TIMESTAMP, $9)
       RETURNING *`,
      [alertId, title, msg, sev, warnType, targetArea, warnType, author, expires_at || null]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (id, actor, action, entity, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [`AUD-${Date.now()}`, author, 'OPERATIONAL_WARNING_ISSUED', 'alerts', JSON.stringify({ alertId, title, severity: sev, targetArea })]
    ).catch(() => {});

    // Automatically formulate AI orchestration response plan (awaits human approval before execution)
    agentOrchestrator.preparePlan(undefined, alertId).catch((err) => {
      console.error('[Alerts] Automatic plan preparation failed:', err.message);
    });

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    console.error('[Alerts Error] POST /:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/alerts/:id/deactivate (Deactivate / expire operational warning)
alertsRouter.patch('/:id/deactivate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateRes = await query(
      `UPDATE alerts SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [id]
    );

    if (updateRes.rowCount && updateRes.rowCount > 0) {
      // Audit log
      await query(
        `INSERT INTO audit_logs (id, actor, action, entity, metadata) VALUES ($1, $2, $3, $4, $5)`,
        [`AUD-${Date.now()}`, 'Command Authority', 'OPERATIONAL_WARNING_DEACTIVATED', 'alerts', JSON.stringify({ alertId: id })]
      ).catch(() => {});

      res.json({ success: true, data: updateRes.rows[0], message: `Warning ${id} deactivated.` });
    } else {
      res.status(404).json({ success: false, error: `Alert ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/alerts/:id
alertsRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await query(`UPDATE alerts SET is_active = FALSE WHERE id = $1`, [id]);
    res.json({ success: true, message: `Alert ${id} archived.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
