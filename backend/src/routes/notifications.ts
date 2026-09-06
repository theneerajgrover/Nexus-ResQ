// ============================================================
// AUTHORITY / COMMAND NOTIFICATIONS REST ROUTER
// Persistent Operational Notifications
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { optionalAuth } from '../middleware/auth';

export const notificationsRouter = Router();

/**
 * GET /api/notifications
 * Retrieve operational notifications for Authority/Admin
 */
notificationsRouter.get('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const role = req.user?.role || 'authority_command';
    const limit = Math.min(parseInt(req.query.limit as string || '25', 10), 100);

    const result = await query(`
      SELECT *
      FROM notifications
      WHERE role = $1 OR role = 'all'
      ORDER BY created_at DESC
      LIMIT $2
    `, [role, limit]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err: any) {
    console.error('[Notifications Error] GET /:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve notifications.' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as READ
 */
notificationsRouter.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE notifications
      SET status = 'READ'
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rowCount === 0) {
      res.status(404).json({ success: false, error: `Notification ${id} not found.` });
      return;
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err: any) {
    console.error('[Notifications Error] PATCH /:id/read:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update notification status.' });
  }
});
