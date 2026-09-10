// ============================================================
// SHELTERS REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';

export const sheltersRouter = Router();

// GET /api/shelters
sheltersRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        address, 
        distance, 
        walk_time as "walkTime", 
        capacity, 
        occupancy, 
        (capacity - occupancy) as available,
        status, 
        accessible, 
        facilities, 
        route_safe as "routeSafe", 
        latitude as lat, 
        longitude as lng
      FROM shelters
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err: any) {
    console.error('[Shelters Error] GET /:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve shelters.' });
  }
});

// POST /api/shelters
sheltersRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, capacity, occupancy, status, address, accessible, facilities } = req.body;
    if (!name || capacity === undefined) {
      res.status(400).json({ success: false, error: 'name and capacity are required.' });
      return;
    }
    const id = `SHL-${Math.floor(10 + Math.random() * 90)}`;
    const shelterStatus = status || (occupancy && occupancy / capacity > 0.9 ? 'NEAR FULL' : 'OPEN');

    const insertRes = await query(
      `INSERT INTO shelters (id, name, address, capacity, occupancy, status, accessible, facilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, address, capacity, occupancy,
         (capacity - occupancy) as available, status, accessible, facilities`,
      [id, name, address || '', capacity, occupancy || 0, shelterStatus, accessible !== false, facilities || ['Food', 'Water']]
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/shelters/:id
sheltersRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { occupancy, capacity, status } = req.body;

    const result = await query(
      `UPDATE shelters
       SET 
         occupancy = COALESCE($1, occupancy),
         capacity = COALESCE($2, capacity),
         status = COALESCE($3, status),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [occupancy, capacity, status, id]
    );

    if (result.rowCount && result.rowCount > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, error: `Shelter ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
