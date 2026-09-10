// ============================================================
// SHELTERS REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query, pool } from '../db';

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
    const capNum = parseInt(capacity, 10);
    const occNum = occupancy !== undefined ? parseInt(occupancy, 10) : 0;
    if (isNaN(capNum) || isNaN(occNum)) {
      res.status(400).json({ success: false, error: 'Capacity and occupancy must be valid integers.' });
      return;
    }
    if (capNum < 0 || occNum < 0) {
      res.status(400).json({ success: false, error: 'Capacity and occupancy cannot be negative.' });
      return;
    }
    if (capNum < occNum) {
      res.status(400).json({
        success: false,
        error: `Capacity cannot be lower than occupancy of ${occNum}.`,
      });
      return;
    }

    const id = `SHL-${Math.floor(10 + Math.random() * 90)}`;
    const shelterStatus = status || (capNum > 0 && occNum / capNum > 0.9 ? 'NEAR FULL' : 'OPEN');

    const insertRes = await query(
      `INSERT INTO shelters (id, name, address, capacity, occupancy, status, accessible, facilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, address, capacity, occupancy,
         (capacity - occupancy) as available, status, accessible, facilities`,
      [id, name, address || '', capNum, occNum, shelterStatus, accessible !== false, facilities || ['Food', 'Water']]
    );

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/shelters/:id
sheltersRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { occupancy, capacity, status } = req.body;

    await client.query('BEGIN');

    // 1. Fetch current live record with row lock
    const currentRes = await client.query('SELECT * FROM shelters WHERE id = $1 FOR UPDATE', [id]);
    if (currentRes.rowCount === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: `Shelter ${id} not found.` });
      return;
    }

    const current = currentRes.rows[0];
    const targetCapacity = capacity !== undefined ? parseInt(capacity, 10) : current.capacity;
    const targetOccupancy = occupancy !== undefined ? parseInt(occupancy, 10) : current.occupancy;

    if (isNaN(targetCapacity) || isNaN(targetOccupancy)) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Capacity and occupancy must be valid integers.' });
      return;
    }

    if (targetCapacity < 0 || targetOccupancy < 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ success: false, error: 'Capacity and occupancy cannot be negative numbers.' });
      return;
    }

    // 2. Critical Business Rule Validation: NEW TOTAL >= CURRENT OCCUPANCY
    if (targetCapacity < targetOccupancy) {
      await client.query('ROLLBACK');
      res.status(400).json({
        success: false,
        error: `Capacity cannot be reduced below ${targetOccupancy} — ${targetOccupancy} places are currently occupied.`,
        currentOccupancy: targetOccupancy,
        requestedCapacity: targetCapacity,
      });
      return;
    }

    const effectiveStatus = status || (targetCapacity > 0 && targetOccupancy / targetCapacity > 0.9 ? 'NEAR FULL' : 'OPEN');

    // 3. Atomically persist update
    const result = await client.query(
      `UPDATE shelters
       SET 
         occupancy = $1,
         capacity = $2,
         status = $3,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, name, address, distance, walk_time as "walkTime",
         capacity, occupancy, (capacity - occupancy) as available,
         status, accessible, facilities, route_safe as "routeSafe",
         latitude as lat, longitude as lng, updated_at`,
      [targetOccupancy, targetCapacity, effectiveStatus, id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[Shelters Error] PATCH /:id:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});
