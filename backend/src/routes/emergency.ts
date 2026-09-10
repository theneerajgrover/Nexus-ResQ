// ============================================================
// CITIZEN EMERGENCY & SOS REQUESTS ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query, getClient } from '../db';
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

    // 4. Coordinates & Location Metadata extraction
    const rawLat = latitude ?? req.body.lat;
    const rawLon = longitude ?? req.body.lon ?? req.body.lng;
    const rawAcc = accuracy ?? req.body.accuracy_meters;

    const validLat = typeof rawLat === 'number' && !isNaN(rawLat) && rawLat >= -90 && rawLat <= 90 ? rawLat : null;
    const validLon = typeof rawLon === 'number' && !isNaN(rawLon) && rawLon >= -180 && rawLon <= 180 ? rawLon : null;
    const validAccuracy = typeof rawAcc === 'number' && !isNaN(rawAcc) && rawAcc >= 0 ? rawAcc : null;

    // Device vs Incident Location separation
    const devLat = typeof req.body.device_latitude === 'number' && !isNaN(req.body.device_latitude) ? req.body.device_latitude : validLat;
    const devLon = typeof req.body.device_longitude === 'number' && !isNaN(req.body.device_longitude) ? req.body.device_longitude : validLon;
    const devAcc = typeof req.body.device_accuracy_meters === 'number' && !isNaN(req.body.device_accuracy_meters) ? req.body.device_accuracy_meters : validAccuracy;
    const devTime = req.body.device_location_timestamp ? new Date(req.body.device_location_timestamp) : (devLat !== null ? new Date() : null);

    const incLat = typeof req.body.incident_latitude === 'number' && !isNaN(req.body.incident_latitude) ? req.body.incident_latitude : validLat;
    const incLon = typeof req.body.incident_longitude === 'number' && !isNaN(req.body.incident_longitude) ? req.body.incident_longitude : validLon;
    const incAcc = typeof req.body.incident_accuracy_meters === 'number' && !isNaN(req.body.incident_accuracy_meters) ? req.body.incident_accuracy_meters : validAccuracy;

    // Administrative and verification metadata
    const placeId = (req.body.place_id || req.body.placeId || null) as string | null;
    const formattedAddress = (req.body.formatted_address || req.body.formattedAddress || effectiveLocation) as string;
    const village = (req.body.village || null) as string | null;
    const locality = (req.body.locality || null) as string | null;
    const city = (req.body.city || null) as string | null;
    const district = (req.body.district || null) as string | null;
    const state = (req.body.state || null) as string | null;
    const postalCode = (req.body.postal_code || req.body.postcode || null) as string | null;
    const country = (req.body.country || null) as string | null;
    const locationSource = (req.body.location_source || (validLat !== null ? 'gps' : 'manual')) as string;
    const locationVerified = Boolean(req.body.location_verified || req.body.verified);
    const locationConfidence = typeof req.body.location_confidence === 'number' ? req.body.location_confidence : (locationVerified ? 95.0 : 70.0);
    const resolvedAt = req.body.location_resolved_at ? new Date(req.body.location_resolved_at) : new Date();

    const effectiveName = (name || contact_name || '').trim() || (req.user?.name || 'Anonymous Citizen');
    const effectivePhone = (phone || contact_phone || '').trim() || null;
    const effectiveType = (emergencyType || emergency_type || 'GENERAL_EMERGENCY').toUpperCase();
    const effectiveDetails = (details || description || '').trim() || `Assistance requested: ${assistanceArray.join(', ')}`;
    const userId = req.user?.id || null;

    // Duplicate Protection: check if an identical request was submitted in the last 5 seconds
    const dupCheck = await query(
      `SELECT id, incident_id FROM emergency_requests 
       WHERE (requester_ip = $1 OR (user_id IS NOT NULL AND user_id = $2))
         AND emergency_type = $3
         AND created_at >= NOW() - INTERVAL '5 seconds'
       ORDER BY created_at DESC LIMIT 1`,
      [clientIp, userId, effectiveType]
    ).catch(() => ({ rowCount: 0, rows: [] }));

    if (dupCheck.rowCount && dupCheck.rowCount > 0) {
      const existing = dupCheck.rows[0];
      const fullReq = await query(`SELECT * FROM emergency_requests WHERE id = $1`, [existing.id]);
      if (fullReq.rowCount && fullReq.rowCount > 0) {
        const saved = fullReq.rows[0];
        res.status(200).json({
          success: true,
          message: 'Emergency request already registered.',
          data: {
            id: saved.id,
            requestId: saved.id,
            incidentId: existing.incident_id,
            incident_id: existing.incident_id,
            status: saved.status,
            location: saved.location,
            formattedAddress: saved.formatted_address || saved.location,
            latitude: saved.latitude ? parseFloat(saved.latitude) : null,
            longitude: saved.longitude ? parseFloat(saved.longitude) : null,
            accuracy: saved.accuracy ? parseFloat(saved.accuracy) : null,
            deviceLatitude: saved.device_latitude ? parseFloat(saved.device_latitude) : null,
            deviceLongitude: saved.device_longitude ? parseFloat(saved.device_longitude) : null,
            incidentLatitude: saved.incident_latitude ? parseFloat(saved.incident_latitude) : null,
            incidentLongitude: saved.incident_longitude ? parseFloat(saved.incident_longitude) : null,
            placeId: saved.place_id,
            locality: saved.locality,
            city: saved.city,
            district: saved.district,
            state: saved.state,
            postalCode: saved.postal_code,
            country: saved.country,
            locationVerified: saved.location_verified,
            locationSource: saved.location_source,
            assistance_types: saved.assistance_types,
            assistance_needed: saved.assistance_requested,
          },
        });
        return;
      }
    }

    const sosId = `SOS-${Math.floor(10000 + Math.random() * 90000)}`;
    const incId = `INC-${Math.floor(10000 + Math.random() * 90000)}`;
    const incidentLat = incLat ?? (validLat ?? 0);
    const incidentLon = incLon ?? (validLon ?? 0);

    const incidentType = ['STRUCTURAL', 'FLOOD', 'MEDICAL', 'FIRE', 'EVACUATION'].includes(effectiveType)
      ? effectiveType
      : 'OTHER';

    let savedRequest: any;
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 5. Insert into PostgreSQL emergency_requests table with full location persistence
      const insertRes = await client.query(
        `INSERT INTO emergency_requests (
          id, user_id, emergency_type, assistance_types, assistance_requested, location, latitude, longitude,
          accuracy, details, contact_name, requester_name, contact_phone, phone_number, requester_ip, source,
          status, incident_id, created_at, updated_at,
          device_latitude, device_longitude, device_accuracy_meters, device_location_timestamp,
          incident_latitude, incident_longitude, incident_accuracy_meters,
          formatted_address, place_id, village, locality, city, district, state, postal_code, country,
          location_source, location_verified, location_confidence, location_resolved_at
        ) VALUES (
          $1, $2, $3, $4, $4, $5, $6, $7,
          $8, $9, $10, $10, $11, $11, $12, 'WEB_EMERGENCY',
          'REQUESTED', $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
          $14, $15, $16, $17,
          $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29,
          $30, $31, $32, $33
        )
        RETURNING *`,
        [
          sosId,
          userId,
          effectiveType,
          assistanceArray,
          effectiveLocation,
          incLat ?? validLat,
          incLon ?? validLon,
          incAcc ?? validAccuracy,
          effectiveDetails,
          effectiveName,
          effectivePhone,
          clientIp,
          incId,
          devLat,
          devLon,
          devAcc,
          devTime,
          incLat,
          incLon,
          incAcc,
          formattedAddress,
          placeId,
          village,
          locality,
          city,
          district,
          state,
          postalCode,
          country,
          locationSource,
          locationVerified,
          locationConfidence,
          resolvedAt,
        ]
      );
      savedRequest = insertRes.rows[0];

      // 6. Spawn active incident in Command feed with location & coordinates
      await client.query(
        `INSERT INTO incidents (
          id, title, type, severity, location, latitude, longitude, status, responders_count, pending, request_id,
          place_id, formatted_address, village, locality, city, district, state, postal_code, country, location_source, location_verified
        )
        VALUES ($1, $2, $3, 'HIGH', $4, $5, $6, 'REQUESTED', 0, TRUE, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET 
          request_id = $7,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          location = EXCLUDED.location`,
        [
          incId,
          `Citizen SOS: ${effectiveType} (${assistanceArray.join(', ')})`,
          incidentType,
          effectiveLocation,
          incidentLat,
          incidentLon,
          sosId,
          placeId,
          formattedAddress,
          village,
          locality,
          city,
          district,
          state,
          postalCode,
          country,
          locationSource,
          locationVerified,
        ]
      );

      // 7. Initial Entry in incident_status_history
      await client.query(
        `INSERT INTO incident_status_history (id, request_id, incident_id, previous_status, new_status, actor, notes, created_at)
         VALUES ($1, $2, $3, NULL, 'REQUESTED', $4, $5, CURRENT_TIMESTAMP)`,
        [
          `HIST-${Date.now()}`,
          sosId,
          incId,
          effectiveName,
          `Citizen emergency registered at ${effectiveLocation} (Verified: ${locationVerified ? 'YES' : 'PENDING_CONFIRMATION'}).`,
        ]
      );

      // 8. Notification in notifications table
      const notifId = `NOTIF-${Date.now()}`;
      await client.query(
        `INSERT INTO notifications (id, role, type, priority, incident_id, title, message, status)
         VALUES ($1, 'authority_command', 'EMERGENCY_REQUEST_RECEIVED', 'CRITICAL', $2, $3, $4, 'UNREAD')`,
        [
          notifId,
          incId,
          'Emergency Request Received',
          `New ${effectiveType} SOS reported by ${effectiveName} at ${effectiveLocation}.`,
        ]
      );

      // 10. Audit log
      await client.query(
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
      );

      await client.query('COMMIT');
    } catch (txErr: any) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('[Emergency] Database transaction failed during SOS creation:', txErr.message);
      res.status(500).json({
        success: false,
        error: 'Failed to record emergency request in database. Please try again or call emergency services directly.'
      });
      return;
    } finally {
      client.release();
    }

    // 9. Real-time SSE Broadcast
    const { broadcastEvent } = await import('./realtime');
    broadcastEvent('EMERGENCY_REQUEST_CREATED', {
      requestId: sosId,
      incidentId: incId,
      location: effectiveLocation,
      formattedAddress: formattedAddress,
      latitude: incidentLat,
      longitude: incidentLon,
      accuracy: incAcc ?? validAccuracy,
      emergencyType: effectiveType,
      assistance: assistanceArray,
      status: 'REQUESTED',
      pending: true,
      timestamp: Date.now(),
    });
    broadcastEvent('NOTIFICATION_CREATED', {
      id: `NOTIF-${Date.now()}`,
      title: 'Emergency Request Received',
      priority: 'CRITICAL',
      incidentId: incId,
    });

    // 11. Auto-trigger 11-agent AI orchestration pipeline for the new incident (fire-and-forget)
    import('../services/agentOrchestrator').then(({ agentOrchestrator }) => {
      agentOrchestrator.runCycle(incId, true).catch((err: any) => {
        console.error(`[Emergency] Auto-orchestration trigger failed for ${incId}:`, err.message);
      });
    }).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Emergency request registered successfully. Responders have been alerted.',
      data: {
        id: savedRequest.id,
        requestId: savedRequest.id,
        incidentId: incId,
        incident_id: incId,
        status: savedRequest.status,
        location: savedRequest.location,
        formattedAddress: savedRequest.formatted_address || savedRequest.location,
        latitude: savedRequest.latitude ? parseFloat(savedRequest.latitude) : null,
        longitude: savedRequest.longitude ? parseFloat(savedRequest.longitude) : null,
        accuracy: savedRequest.accuracy ? parseFloat(savedRequest.accuracy) : null,
        deviceLatitude: savedRequest.device_latitude ? parseFloat(savedRequest.device_latitude) : null,
        deviceLongitude: savedRequest.device_longitude ? parseFloat(savedRequest.device_longitude) : null,
        incidentLatitude: savedRequest.incident_latitude ? parseFloat(savedRequest.incident_latitude) : null,
        incidentLongitude: savedRequest.incident_longitude ? parseFloat(savedRequest.incident_longitude) : null,
        placeId: savedRequest.place_id,
        locality: savedRequest.locality,
        city: savedRequest.city,
        district: savedRequest.district,
        state: savedRequest.state,
        postalCode: savedRequest.postal_code,
        country: savedRequest.country,
        locationVerified: savedRequest.location_verified,
        locationSource: savedRequest.location_source,
        assistanceNeeded: savedRequest.assistance_requested,
        assignedIncidentId: incId,
        hasCoordinates: validLat !== null || incLat !== null,
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

// GET /api/emergency/sos-status
// Public citizen-facing tracking status.
// Validates requestId, optionally validates incidentId cross-reference.
// Returns a controlled public-safe payload. No authentication required.
// No private operational data (responder names, keys, admin info) is exposed.
emergencyRouter.get('/sos-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawRequestId = (req.query.requestId || req.query.request_id || '') as string;
    const rawIncidentId = (req.query.incidentId || req.query.incident_id || '') as string;

    const requestId = rawRequestId.trim();
    if (!requestId) {
      res.status(400).json({ success: false, error: 'requestId query parameter is required.' });
      return;
    }

    // Fetch the emergency request — only safe public fields
    const reqRes = await query(
      `SELECT id, emergency_type, assistance_requested, location, formatted_address, latitude, longitude,
              status, incident_id, created_at, updated_at, location_verified, location_source
       FROM emergency_requests
       WHERE id = $1`,
      [requestId]
    );

    if (!reqRes.rowCount || reqRes.rowCount === 0) {
      res.status(404).json({
        success: false,
        error: `Emergency request "${requestId}" not found. Please check your Request ID.`,
      });
      return;
    }

    const er = reqRes.rows[0];

    // Cross-validate incidentId if provided
    if (rawIncidentId.trim()) {
      const incidentId = rawIncidentId.trim();
      if (er.incident_id !== incidentId) {
        res.status(400).json({
          success: false,
          error: `The provided request ID and incident ID do not correspond to the same emergency record. Please check your tracking link.`,
        });
        return;
      }
    }

    // Fetch incident status — only safe public fields
    let incidentStatus: any = null;
    if (er.incident_id) {
      const incRes = await query(
        `SELECT id, type, severity, status, location, latitude, longitude, created_at, updated_at
         FROM incidents WHERE id = $1`,
        [er.incident_id]
      );
      if (incRes.rowCount && incRes.rowCount > 0) {
        const inc = incRes.rows[0];
        incidentStatus = {
          id: inc.id,
          type: inc.type,
          severity: inc.severity,
          status: inc.status,
          location: inc.location,
          latitude: inc.latitude ? parseFloat(inc.latitude) : null,
          longitude: inc.longitude ? parseFloat(inc.longitude) : null,
          createdAt: inc.created_at,
          updatedAt: inc.updated_at,
        };
      }
    }

    res.json({
      success: true,
      data: {
        requestId: er.id,
        status: er.status,
        emergencyType: er.emergency_type,
        assistanceRequested: er.assistance_requested,
        location: er.formatted_address || er.location,
        latitude: er.latitude ? parseFloat(er.latitude) : null,
        longitude: er.longitude ? parseFloat(er.longitude) : null,
        locationVerified: er.location_verified,
        createdAt: er.created_at,
        updatedAt: er.updated_at,
        incidentId: er.incident_id || null,
        incident: incidentStatus,
      },
    });
  } catch (err: any) {
    console.error('[Emergency Error] GET /sos-status:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve emergency status. Please try again.' });
  }
});

