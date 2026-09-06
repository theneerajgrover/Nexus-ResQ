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

// POST /api/evacuation-routes/calculate
// Computes real route alternatives between origin and destination coordinates,
// evaluates route safety against hazards and weather, and returns the safest route option.
routesRouter.post('/calculate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { originLat, originLng, destinationLat, destinationLng, incidentId } = req.body;

    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destinationLat);
    const dLng = parseFloat(destinationLng);

    if (isNaN(oLat) || isNaN(oLng) || isNaN(dLat) || isNaN(dLng)) {
      res.status(400).json({ success: false, error: 'originLat, originLng, destinationLat, destinationLng are required.' });
      return;
    }

    const { computeRouteAlternatives, evaluateRouteSafety } = await import('../services/routingService');
    const alternatives = await computeRouteAlternatives({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng });
    const evaluated = await evaluateRouteSafety(alternatives, { incidentId });

    res.json({
      success: true,
      data: {
        safestRoute: evaluated[0] || null,
        alternatives: evaluated,
      },
    });
  } catch (err: any) {
    console.error('[Routes Error] POST /calculate:', err.message);
    res.status(500).json({ success: false, error: 'Failed to compute routes.' });
  }
});

// GET /api/evacuation-routes/active/:incidentId
routesRouter.get('/active/:incidentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { incidentId } = req.params;
    const result = await query(
      `SELECT * FROM active_routes WHERE incident_id = $1 AND is_active = TRUE ORDER BY created_at DESC LIMIT 1`,
      [incidentId]
    );

    if (result.rowCount && result.rowCount > 0) {
      const r = result.rows[0];
      res.json({
        success: true,
        data: {
          id: r.id,
          label: r.route_label,
          distanceMeters: parseFloat(r.distance_meters),
          durationSeconds: parseFloat(r.duration_seconds),
          polyline: r.polyline,
          geometry: r.geometry,
          steps: r.steps,
          safetyStatus: r.safety_status,
          safetyScore: r.safety_score,
          riskFactors: r.risk_factors,
          alternatives: r.alternatives,
          recalculationReason: r.recalculation_reason,
          updatedAt: r.updated_at,
        },
      });
    } else {
      res.json({ success: true, data: null, message: 'No active route recorded for incident.' });
    }
  } catch (err: any) {
    console.error('[Routes Error] GET /active/:incidentId:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve active route.' });
  }
});

