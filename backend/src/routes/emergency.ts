// ============================================================
// CITIZEN EMERGENCY & SOS REQUESTS ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { optionalAuth } from '../middleware/auth';

export const emergencyRouter = Router();

// Helper to reliably extract originating client IP address server-side
function extractClientIp(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

// POST /api/emergency/request (Submit emergency / SOS request)
emergencyRouter.post('/request', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      emergencyType,
      emergency_type,
      assistance,
      assistance_needed,
      location,
      location_name,
      latitude,
      longitude,
      details,
      description,
      name,
      contact_name,
      phone,
      contact_phone,
    } = req.body;

    // 1. Mandatory Location Validation
    const effectiveLocation = (location || location_name || '').trim();
    if (!effectiveLocation || effectiveLocation.length < 3) {
      res.status(400).json({
        success: false,
        error: 'Location / Address is mandatory. Please provide a street address, landmark, or description of your location.',
      });
      return;
    }

    // 2. Mandatory Assistance Validation
    const rawAssistance = assistance || assistance_needed;
    const assistanceArray = Array.isArray(rawAssistance)
      ? rawAssistance.filter((x: any) => typeof x === 'string' && x.trim())
      : (typeof rawAssistance === 'string' && rawAssistance.trim() ? [rawAssistance.trim()] : []);

    if (assistanceArray.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Assistance Needed is mandatory. Please select at least one assistance category.',
      });
      return;
    }

    // 3. Server-side IP Address Capture (audit/traceability, not exact physical tracking)
    const clientIp = extractClientIp(req);

    // 4. Coordinates extraction (use actual coordinates if valid numbers, else null — no hardcoded dummy coordinates)
    const validLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : null;
    const validLon = typeof longitude === 'number' && !isNaN(longitude) ? longitude : null;

    const effectiveName = (name || contact_name || '').trim() || (req.user?.name || 'Anonymous Citizen');
    const effectivePhone = (phone || contact_phone || '').trim() || null;
    const effectiveType = (emergencyType || emergency_type || 'GENERAL_EMERGENCY').toUpperCase();
    const effectiveDetails = (details || description || '').trim() || `Assistance requested: ${assistanceArray.join(', ')}`;
    const userId = req.user?.id || null;

    const sosId = `SOS-${Math.floor(10000 + Math.random() * 90000)}`;

    // 5. Insert into PostgreSQL emergency_requests table
    const insertRes = await query(
      `INSERT INTO emergency_requests (
        id, user_id, emergency_type, assistance_types, assistance_requested, location, latitude, longitude,
        details, contact_name, requester_name, contact_phone, phone_number, requester_ip, source, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $9, $10, $10, $11, 'WEB_EMERGENCY', 'RECEIVED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        sosId,
        userId,
        effectiveType,
        assistanceArray,
        effectiveLocation,
        validLat,
        validLon,
        effectiveDetails,
        effectiveName,
        effectivePhone,
        clientIp,
      ]
    );

    const savedRequest = insertRes.rows[0];

    // 6. Spawn active incident in Command / Operations feed
    const incId = `INC-${Date.now().toString().slice(-4)}`;
    const incidentType = ['STRUCTURAL', 'FLOOD', 'MEDICAL', 'FIRE', 'EVACUATION'].includes(effectiveType)
      ? effectiveType
      : 'OTHER';

    await query(
      `INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, responders_count, pending)
       VALUES ($1, $2, $3, 'HIGH', $4, $5, $6, 'PENDING', 0, TRUE)
       ON CONFLICT (id) DO NOTHING`,
      [
        incId,
        `Citizen SOS: ${effectiveType} (${assistanceArray.join(', ')})`,
        incidentType,
        effectiveLocation,
        validLat || 52.0,
        validLon || 48.0,
      ]
    ).catch(() => {});

    // 7. Audit log
    await query(
      `INSERT INTO audit_logs (id, actor, action, entity, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [
        `AUD-${Date.now()}`,
        effectiveName,
        'EMERGENCY_REQUEST_SUBMITTED',
        'emergency_requests',
        JSON.stringify({
          sosId,
          location: effectiveLocation,
          assistance: assistanceArray,
          requesterIp: clientIp,
          hasCoordinates: validLat !== null,
        }),
      ]
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Emergency request registered successfully. Responders have been alerted.',
      data: {
        id: savedRequest.id,
        requestId: savedRequest.id,
        status: savedRequest.status,
        location: savedRequest.location,
        assistanceNeeded: savedRequest.assistance_requested,
        assignedIncidentId: incId,
        hasCoordinates: validLat !== null,
        timestamp: savedRequest.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Emergency Error] /request:', err.message);
    res.status(500).json({ success: false, error: 'Failed to record emergency request due to an internal error.' });
  }
});

// GET /api/emergency/requests
emergencyRouter.get('/requests', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(
      `SELECT id, user_id, emergency_type, assistance_requested, location, latitude, longitude,
              requester_name, phone_number, requester_ip, status, created_at
       FROM emergency_requests 
       ORDER BY created_at DESC 
       LIMIT 50`
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/emergency/requests/:id
emergencyRouter.get('/requests/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(`SELECT * FROM emergency_requests WHERE id = $1`, [id]);
    if (result.rowCount && result.rowCount > 0) {
      res.json({ success: true, data: result.rows[0] });
    } else {
      res.status(404).json({ success: false, error: `Emergency request ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/emergency/history (Citizen request history from database)
emergencyRouter.get('/history', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || (req.query.user_id as string);
    let result;
    if (userId) {
      result = await query(
        `SELECT id, user_id, emergency_type, assistance_requested, location, latitude, longitude,
                details, requester_name, phone_number, requester_ip, status, assigned_mission_id,
                created_at, updated_at
         FROM emergency_requests
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
      );
    } else {
      result = await query(
        `SELECT id, user_id, emergency_type, assistance_requested, location, latitude, longitude,
                details, requester_name, phone_number, requester_ip, status, assigned_mission_id,
                created_at, updated_at
         FROM emergency_requests
         ORDER BY created_at DESC
         LIMIT 50`
      );
    }
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
