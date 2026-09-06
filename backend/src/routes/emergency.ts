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
      accuracy,
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
    const validAccuracy = typeof accuracy === 'number' && !isNaN(accuracy) ? accuracy : null;

    const effectiveName = (name || contact_name || '').trim() || (req.user?.name || 'Anonymous Citizen');
    const effectivePhone = (phone || contact_phone || '').trim() || null;
    const effectiveType = (emergencyType || emergency_type || 'GENERAL_EMERGENCY').toUpperCase();
    const effectiveDetails = (details || description || '').trim() || `Assistance requested: ${assistanceArray.join(', ')}`;
    const userId = req.user?.id || null;

    const sosId = `SOS-${Math.floor(10000 + Math.random() * 90000)}`;
    const incId = `INC-${Date.now().toString().slice(-4)}`;

    // 5. Insert into PostgreSQL emergency_requests table with 8-step lifecycle starting status 'REQUESTED'
    const insertRes = await query(
      `INSERT INTO emergency_requests (
        id, user_id, emergency_type, assistance_types, assistance_requested, location, latitude, longitude,
        accuracy, details, contact_name, requester_name, contact_phone, phone_number, requester_ip, source,
        status, incident_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, $9, $10, $10, $11, $11, $12, 'WEB_EMERGENCY', 'REQUESTED', $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        sosId,
        userId,
        effectiveType,
        assistanceArray,
        effectiveLocation,
        validLat,
        validLon,
        validAccuracy,
        effectiveDetails,
        effectiveName,
        effectivePhone,
        clientIp,
        incId,
      ]
    );

    const savedRequest = insertRes.rows[0];

    // 6. Spawn active incident in Command / Operations feed
    const incidentType = ['STRUCTURAL', 'FLOOD', 'MEDICAL', 'FIRE', 'EVACUATION'].includes(effectiveType)
      ? effectiveType
      : 'OTHER';

    await query(
      `INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, responders_count, pending, request_id)
       VALUES ($1, $2, $3, 'HIGH', $4, $5, $6, 'REQUESTED', 0, TRUE, $7)
       ON CONFLICT (id) DO UPDATE SET request_id = $7`,
      [
        incId,
        `Citizen SOS: ${effectiveType} (${assistanceArray.join(', ')})`,
        incidentType,
        effectiveLocation,
        validLat !== null ? validLat : 0,
        validLon !== null ? validLon : 0,
        sosId,
      ]
    ).catch(() => {});

    // 7. Initial Entry in incident_status_history
    await query(
      `INSERT INTO incident_status_history (id, request_id, incident_id, previous_status, new_status, actor, notes, created_at)
       VALUES ($1, $2, $3, NULL, 'REQUESTED', $4, $5, CURRENT_TIMESTAMP)`,
      [
        `HIST-${Date.now()}`,
        sosId,
        incId,
        effectiveName,
        `Citizen emergency registered at ${effectiveLocation} with device geolocation.`,
      ]
    ).catch(() => {});

    // 8. Notification in notifications table
    const notifId = `NOTIF-${Date.now()}`;
    await query(
      `INSERT INTO notifications (id, role, type, priority, incident_id, title, message, status)
       VALUES ($1, 'authority_command', 'EMERGENCY_REQUEST_RECEIVED', 'CRITICAL', $2, $3, $4, 'UNREAD')`,
      [
        notifId,
        incId,
        'Emergency Request Received',
        `New ${effectiveType} SOS reported by ${effectiveName} at ${effectiveLocation}.`,
      ]
    ).catch(() => {});

    // 9. Real-time SSE Broadcast
    const { broadcastEvent } = await import('./realtime');
    broadcastEvent('EMERGENCY_REQUEST_CREATED', {
      requestId: sosId,
      incidentId: incId,
      location: effectiveLocation,
      latitude: validLat,
      longitude: validLon,
      accuracy: validAccuracy,
      emergencyType: effectiveType,
      assistance: assistanceArray,
      status: 'REQUESTED',
      timestamp: Date.now(),
    });
    broadcastEvent('NOTIFICATION_CREATED', {
      id: notifId,
      title: 'Emergency Request Received',
      priority: 'CRITICAL',
      incidentId: incId,
    });

    // 10. Audit log
    await query(
      `INSERT INTO audit_logs (id, actor, action, entity, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [
        `AUD-${Date.now()}`,
        effectiveName,
        'EMERGENCY_REQUEST_SUBMITTED',
        'emergency_requests',
        JSON.stringify({
          sosId,
          incId,
          location: effectiveLocation,
          assistance: assistanceArray,
          requesterIp: clientIp,
          hasCoordinates: validLat !== null,
          accuracy: validAccuracy,
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
        latitude: savedRequest.latitude ? parseFloat(savedRequest.latitude) : null,
        longitude: savedRequest.longitude ? parseFloat(savedRequest.longitude) : null,
        accuracy: savedRequest.accuracy ? parseFloat(savedRequest.accuracy) : null,
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
