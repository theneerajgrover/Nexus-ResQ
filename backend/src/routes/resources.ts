// ============================================================
// RESOURCE MANAGEMENT REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';

export const resourcesRouter = Router();

// GET /api/resources/overview
resourcesRouter.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const [suppliesRes, sheltersRes, ambulancesRes, dispatchesRes, respondersRes] = await Promise.all([
      query(`SELECT count(*)::int as count FROM supplies WHERE qty < demand`),
      query(`SELECT count(*)::int as count FROM shelters WHERE status = 'NEAR FULL'`),
      query(`SELECT count(*)::int as count FROM ambulances WHERE status = 'AVAILABLE'`),
      query(`SELECT count(*)::int as count FROM dispatch_records WHERE status = 'PENDING'`),
      query(`SELECT count(*)::int as count FROM responders WHERE status = 'AVAILABLE'`),
    ]);

    res.json({
      success: true,
      data: {
        shortages: suppliesRes.rows[0]?.count || 0,
        nearFullShelters: sheltersRes.rows[0]?.count || 0,
        availableAmbulances: ambulancesRes.rows[0]?.count || 0,
        pendingDispatches: dispatchesRes.rows[0]?.count || 0,
        availableResponders: respondersRes.rows[0]?.count || 0,
      },
    });
  } catch (err: any) {
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
    const { resourceType, qtyApproved, qtyDispatched, destination, incident, unit, approvedBy } = req.body;
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
