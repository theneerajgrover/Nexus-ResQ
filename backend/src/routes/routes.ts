// ============================================================
// EVACUATION ROUTES REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';

export const routesRouter = Router();

// GET /api/evacuation-routes
routesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        label, 
        via, 
        distance, 
        eta, 
        risk_level as "riskLevel", 
        risk_note as "riskNote", 
        congestion, 
        destination, 
        safe, 
        segments
      FROM evacuation_routes
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err: any) {
    console.error('[Routes Error] GET /:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve evacuation routes.' });
  }
});
