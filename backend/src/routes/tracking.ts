// ============================================================
// NEXUS RESQ — REAL-TIME TRACKING & OPERATIONAL LIFECYCLE ROUTER
// ============================================================
// 8-Step Zomato-like Lifecycle:
// REQUESTED -> ACCEPTED -> ASSIGNED -> DEPARTED -> ON_THE_WAY -> NEARBY -> ARRIVED -> COMPLETED
// Real GPS updates, SSE synchronization, and PostgreSQL persistence
// ============================================================

import { Router, Request, Response } from 'express';
import { query } from '../db';
import { broadcastEvent } from './realtime';
import {
  computeRouteAlternatives,
  evaluateRouteSafety,
  persistActiveRoute,
  checkAndTriggerDynamicReroute,
} from '../services/routingService';

export const trackingRouter = Router();

// Standard 8-Step Operational Lifecycle
export const LIFECYCLE_STEPS = [
  'REQUESTED',
  'ACCEPTED',
  'ASSIGNED',
  'DEPARTED',
  'ON_THE_WAY',
  'NEARBY',
  'ARRIVED',
  'COMPLETED',
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STEPS)[number];

// Step display metadata
export const STEP_METADATA: Record<LifecycleStatus, { label: string; description: string }> = {
  REQUESTED: { label: 'Emergency Requested', description: 'Citizen SOS registered. Awaiting operational triage.' },
  ACCEPTED: { label: 'Incident Accepted', description: 'Central dispatch verified and accepted incident.' },
  ASSIGNED: { label: 'Responder Assigned', description: 'Ambulance / Rescue vehicle assigned to the mission.' },
  DEPARTED: { label: 'Vehicle Departed', description: 'Emergency unit has departed station/current post.' },
  ON_THE_WAY: { label: 'En Route to Scene', description: 'Vehicle is actively navigating safest corridor toward citizen.' },
  NEARBY: { label: 'Vehicle Nearby', description: 'Emergency team is within immediate vicinity (< 500m).' },
  ARRIVED: { label: 'Arrived on Scene', description: 'First responders have made physical contact at incident site.' },
  COMPLETED: { label: 'Incident Resolved', description: 'Emergency operation completed and archived.' },
};

/**
 * POST /api/tracking/location
 * Ingests live GPS coordinates from responder or citizen device.
 * Persists update to location_updates, updates entity coordinates,
 * checks route safety dynamically, and broadcasts via SSE.
 */
trackingRouter.post('/location', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      entityType, // 'responder' | 'citizen' | 'ambulance' | 'vehicle'
      entityId,
      incidentId,
      requestId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
    } = req.body;

    if (!entityType || !entityId) {
      res.status(400).json({ success: false, error: 'entityType and entityId are required.' });
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({
        success: false,
        error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.',
      });
      return;
    }

    const updateId = `LOC-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)}`;
    const acc = typeof accuracy === 'number' && !isNaN(accuracy) ? accuracy : null;
    const hdg = typeof heading === 'number' && !isNaN(heading) ? heading : null;
    const spd = typeof speed === 'number' && !isNaN(speed) ? speed : null;

    // 1. Persist to location_updates table
    await query(
      `INSERT INTO location_updates (
        id, entity_type, entity_id, incident_id, request_id, latitude, longitude, accuracy, heading, speed, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [updateId, entityType, entityId, incidentId || null, requestId || null, lat, lon, acc, hdg, spd]
    );

    // 2. Update entity table current location
    if (entityType === 'responder' || entityType === 'ambulance') {
      await query(
        `UPDATE responders
         SET latitude = $1, longitude = $2, accuracy = $3, heading = $4, speed = $5, updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [lat, lon, acc, hdg, spd, entityId]
      );

      // Broadcast real-time SSE event to Citizen & Authority
      broadcastEvent('RESPONDER_LOCATION_UPDATED', {
        responderId: entityId,
        incidentId: incidentId || null,
        requestId: requestId || null,
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        heading: hdg,
        speed: spd,
        timestamp: Date.now(),
      });

      // 3. Continuous Route Check: Verify if active route is still safe as vehicle moves
      if (incidentId) {
        checkAndTriggerDynamicReroute(incidentId, { lat, lng: lon }).catch(() => {});
      }
    } else if (entityType === 'citizen') {
      // Update users table current coordinates for citizen user
      if (entityId) {
        await query(
          `UPDATE users
           SET latitude = $1, longitude = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [lat, lon, entityId]
        ).catch(() => {});
      }

      if (requestId) {
        await query(
          `UPDATE emergency_requests
           SET latitude = $1, longitude = $2, accuracy = $3, updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [lat, lon, acc, requestId]
        );
      }

      broadcastEvent('CITIZEN_LOCATION_UPDATED', {
        citizenId: entityId,
        requestId: requestId || null,
        incidentId: incidentId || null,
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        timestamp: Date.now(),
      });
    }

    res.json({
      success: true,
      message: 'Location recorded successfully.',
      data: {
        id: updateId,
        entityType,
        entityId,
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Tracking Error] POST /location:', err.message);
    res.status(500).json({ success: false, error: 'Failed to record location update.' });
  }
});

/**
 * GET /api/tracking/location/:entityType/:entityId
 * Fetches the latest verified location record for an entity from location_updates.
 */
trackingRouter.get('/location/:entityType/:entityId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;
    const latestRes = await query(
      `SELECT id, latitude, longitude, accuracy, heading, speed, created_at
       FROM location_updates
       WHERE entity_type = $1 AND entity_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [entityType, entityId]
    );

    if (latestRes.rowCount && latestRes.rowCount > 0) {
      const row = latestRes.rows[0];
      res.json({
        success: true,
        data: {
          id: row.id,
          entityType,
          entityId,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          accuracy: row.accuracy ? parseFloat(row.accuracy) : null,
          heading: row.heading ? parseFloat(row.heading) : null,
          speed: row.speed ? parseFloat(row.speed) : null,
          timestamp: row.created_at,
        },
      });
      return;
    }

    // Fallback to users table if citizen
    if (entityType === 'citizen') {
      const userRes = await query(
        `SELECT latitude, longitude, updated_at FROM users WHERE id = $1`,
        [entityId]
      );
      if (userRes.rowCount && userRes.rowCount > 0 && userRes.rows[0].latitude) {
        res.json({
          success: true,
          data: {
            entityType,
            entityId,
            latitude: parseFloat(userRes.rows[0].latitude),
            longitude: parseFloat(userRes.rows[0].longitude),
            accuracy: null,
            timestamp: userRes.rows[0].updated_at,
          },
        });
        return;
      }
    }

    res.json({ success: true, data: null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tracking/status
 * Advances the incident/responder lifecycle across the strict 8 steps:
 * REQUESTED -> ACCEPTED -> ASSIGNED -> DEPARTED -> ON_THE_WAY -> NEARBY -> ARRIVED -> COMPLETED
 */
trackingRouter.post('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { incidentId, requestId, responderId, status, actor, notes } = req.body;

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required.' });
      return;
    }

    const targetStatus = status.toUpperCase();

    // Map common legacy statuses to 8-step lifecycle if needed
    const normalizedStatus: LifecycleStatus =
      targetStatus === 'RECEIVED'
        ? 'REQUESTED'
        : targetStatus === 'EN ROUTE' || targetStatus === 'EN_ROUTE'
        ? 'ON_THE_WAY'
        : targetStatus === 'ON SCENE' || targetStatus === 'ON_SCENE'
        ? 'ARRIVED'
        : targetStatus === 'RESOLVED'
        ? 'COMPLETED'
        : (targetStatus as LifecycleStatus);

    if (!LIFECYCLE_STEPS.includes(normalizedStatus)) {
      res.status(400).json({
        success: false,
        error: `Invalid status '${status}'. Must be one of: ${LIFECYCLE_STEPS.join(', ')}`,
      });
      return;
    }

    // Determine current status
    let currentStatus = 'REQUESTED';
    let effectiveIncidentId = incidentId;
    let effectiveRequestId = requestId;
    let effectiveResponderId = responderId;

    if (effectiveIncidentId) {
      const incRes = await query(`SELECT status, request_id, assigned_responder_id FROM incidents WHERE id = $1`, [
        effectiveIncidentId,
      ]);
      if (incRes.rowCount && incRes.rowCount > 0) {
        currentStatus = incRes.rows[0].status || 'REQUESTED';
        if (!effectiveRequestId) effectiveRequestId = incRes.rows[0].request_id;
        if (!effectiveResponderId) effectiveResponderId = incRes.rows[0].assigned_responder_id;
      }
    } else if (effectiveRequestId) {
      const reqRes = await query(
        `SELECT status, incident_id, assigned_responder_id FROM emergency_requests WHERE id = $1`,
        [effectiveRequestId]
      );
      if (reqRes.rowCount && reqRes.rowCount > 0) {
        currentStatus = reqRes.rows[0].status || 'REQUESTED';
        if (!effectiveIncidentId) effectiveIncidentId = reqRes.rows[0].incident_id;
        if (!effectiveResponderId) effectiveResponderId = reqRes.rows[0].assigned_responder_id;
      }
    }

    const currentIndex = LIFECYCLE_STEPS.indexOf(currentStatus as LifecycleStatus);
    const targetIndex = LIFECYCLE_STEPS.indexOf(normalizedStatus);

    // Record transition in incident_status_history
    const historyId = `HIST-${Date.now().toString().slice(-8)}`;
    const effectiveActor = actor || 'Field Dispatch';

    await query(
      `INSERT INTO incident_status_history (
        id, request_id, incident_id, previous_status, new_status, actor, responder_id, notes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        historyId,
        effectiveRequestId || null,
        effectiveIncidentId || null,
        currentStatus,
        normalizedStatus,
        effectiveActor,
        effectiveResponderId || null,
        notes || STEP_METADATA[normalizedStatus]?.description || null,
      ]
    );

    // Update emergency_requests table
    if (effectiveRequestId) {
      await query(
        `UPDATE emergency_requests
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [normalizedStatus, effectiveRequestId]
      );
    }

    // Update incidents table
    if (effectiveIncidentId) {
      const incidentStatus = normalizedStatus === 'COMPLETED' ? 'RESOLVED' : normalizedStatus;
      await query(
        `UPDATE incidents
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [incidentStatus, effectiveIncidentId]
      );
    }

    // Update missions table
    if (effectiveIncidentId) {
      await query(
        `UPDATE missions
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE incident_id = $2`,
        [normalizedStatus, effectiveIncidentId]
      );
    }

    // Update responders table
    if (effectiveResponderId) {
      const responderOperationalStatus = normalizedStatus === 'COMPLETED' ? 'AVAILABLE' : normalizedStatus;
      await query(
        `UPDATE responders
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [responderOperationalStatus, effectiveResponderId]
      );
    }

    // Create persistent backend notification for Authority, Citizen, and Field Team
    const notifId = `NOTIF-${Date.now().toString().slice(-8)}`;
    const meta = STEP_METADATA[normalizedStatus];
    const notifTitle = meta.label;
    const notifMessage = notes || meta.description;

    await query(
      `INSERT INTO notifications (id, role, type, priority, incident_id, title, message, status)
       VALUES ($1, 'authority_command', 'INCIDENT_STATUS_CHANGED', 'HIGH', $2, $3, $4, 'UNREAD')`,
      [notifId, effectiveIncidentId || null, notifTitle, notifMessage]
    ).catch(() => {});

    // Broadcast SSE to all portals (Citizen, Responder, Authority)
    broadcastEvent('INCIDENT_STATUS_CHANGED', {
      incidentId: effectiveIncidentId || null,
      requestId: effectiveRequestId || null,
      responderId: effectiveResponderId || null,
      previousStatus: currentStatus,
      newStatus: normalizedStatus,
      stepIndex: targetIndex,
      label: meta.label,
      description: meta.description,
      actor: effectiveActor,
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: `Status transitioned to ${normalizedStatus}.`,
      data: {
        previousStatus: currentStatus,
        newStatus: normalizedStatus,
        stepIndex: targetIndex,
        metadata: meta,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Tracking Error] POST /status:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update tracking status.' });
  }
});

/**
 * Shared helper to retrieve real-time synchronized tracking bundle for an incident.
 */
export async function fetchTrackingBundle(incidentId: string) {
  // 1. Query Incident
  const incRes = await query(
    `SELECT i.*, m.id as mission_id, m.responder_id, r.name as responder_name, r.callsign as responder_callsign,
            r.status as responder_status, r.latitude as responder_lat, r.longitude as responder_lng,
            r.accuracy as responder_accuracy, r.heading as responder_heading, r.speed as responder_speed
     FROM incidents i
     LEFT JOIN missions m ON m.incident_id = i.id
     LEFT JOIN responders r ON r.id = COALESCE(m.responder_id, i.assigned_responder_id)
     WHERE i.id = $1`,
    [incidentId]
  );

  if (incRes.rowCount === 0) {
    return null;
  }

  const incident = incRes.rows[0];

  // 2. Query Citizen Emergency Request
  let citizenRequest: any = null;
  const reqRes = await query(
    `SELECT id, user_id, emergency_type, assistance_requested, location, latitude, longitude,
            accuracy, contact_name, requester_name, contact_phone, phone_number, status, created_at
     FROM emergency_requests
     WHERE incident_id = $1 OR id = $2
     LIMIT 1`,
    [incidentId, incident.request_id || '']
  );

  if (reqRes.rowCount && reqRes.rowCount > 0) {
    citizenRequest = reqRes.rows[0];
  }

  // 3. Query Active Route
  const routeRes = await query(
    `SELECT * FROM active_routes WHERE incident_id = $1 AND is_active = TRUE ORDER BY created_at DESC LIMIT 1`,
    [incidentId]
  );

  let activeRoute: any = null;
  let alternatives: any[] = [];

  if (routeRes.rowCount && routeRes.rowCount > 0) {
    const r = routeRes.rows[0];
    activeRoute = {
      id: r.id,
      label: r.route_label,
      distanceMeters: parseFloat(r.distance_meters),
      durationSeconds: parseFloat(r.duration_seconds),
      distanceFormatted:
        r.distance_meters < 1000
          ? `${Math.round(r.distance_meters)} m`
          : `${(r.distance_meters / 1000).toFixed(1)} km`,
      etaFormatted: `${Math.max(1, Math.round(r.duration_seconds / 60))} mins`,
      polyline: r.polyline,
      coordinates: r.geometry || [],
      steps: r.steps || [],
      safetyStatus: r.safety_status,
      safetyScore: r.safety_score,
      riskFactors: r.risk_factors || [],
      recalculationReason: r.recalculation_reason,
      updatedAt: r.updated_at,
    };
    alternatives = r.alternatives || [];
  } else if (
    incident.latitude !== null &&
    incident.latitude !== undefined &&
    incident.longitude !== null &&
    incident.longitude !== undefined &&
    incident.responder_lat !== null &&
    incident.responder_lat !== undefined &&
    incident.responder_lng !== null &&
    incident.responder_lng !== undefined
  ) {
    const oLat = parseFloat(incident.responder_lat);
    const oLng = parseFloat(incident.responder_lng);
    const dLat = parseFloat(incident.latitude);
    const dLng = parseFloat(incident.longitude);

    if (!isNaN(oLat) && !isNaN(oLng) && !isNaN(dLat) && !isNaN(dLng)) {
      try {
        const alts = await computeRouteAlternatives({ lat: oLat, lng: oLng }, { lat: dLat, lng: dLng });
        const evaluated = await evaluateRouteSafety(alts, { incidentId });
        if (evaluated.length > 0) {
          const safest = evaluated[0];
          await persistActiveRoute(
            incidentId,
            incident.request_id || null,
            incident.responder_id || null,
            { lat: oLat, lng: oLng },
            { lat: dLat, lng: dLng },
            safest,
            evaluated,
            'Auto-computed route for assigned responder'
          ).catch(() => {});

          activeRoute = {
            id: safest.id,
            label: safest.label,
            distanceMeters: safest.distanceMeters,
            durationSeconds: safest.durationSeconds,
            distanceFormatted: safest.distanceFormatted,
            etaFormatted: safest.etaFormatted,
            polyline: safest.polyline,
            coordinates: safest.coordinates,
            steps: safest.steps,
            safetyStatus: safest.safetyStatus,
            safetyScore: safest.safetyScore,
            riskFactors: safest.riskFactors,
            updatedAt: new Date(),
          };
          alternatives = evaluated;
        }
      } catch (err: any) {
        console.warn('[Tracking] Dynamic route computation notice:', err.message);
      }
    }
  }

  // 4. Query Status History
  const historyRes = await query(
    `SELECT id, previous_status, new_status, actor, notes, created_at
     FROM incident_status_history
     WHERE incident_id = $1 OR (request_id IS NOT NULL AND request_id = $2)
     ORDER BY created_at ASC`,
    [incidentId, citizenRequest?.id || '']
  );

  // 5. Query Recent Location Trail (Breadcrumbs)
  const breadcrumbsRes = await query(
    `SELECT latitude, longitude, accuracy, heading, speed, created_at
     FROM location_updates
     WHERE incident_id = $1 AND entity_type = 'responder'
     ORDER BY created_at DESC
     LIMIT 30`,
    [incidentId]
  );

  // 6. Calculate Lifecycle Step
  const currentStatus = (incident.status || citizenRequest?.status || 'REQUESTED').toUpperCase();
  const normalizedStatus: LifecycleStatus =
    currentStatus === 'RECEIVED'
      ? 'REQUESTED'
      : currentStatus === 'EN ROUTE' || currentStatus === 'EN_ROUTE'
      ? 'ON_THE_WAY'
      : currentStatus === 'ON SCENE' || currentStatus === 'ON_SCENE'
      ? 'ARRIVED'
      : currentStatus === 'RESOLVED'
      ? 'COMPLETED'
      : LIFECYCLE_STEPS.includes(currentStatus as LifecycleStatus)
      ? (currentStatus as LifecycleStatus)
      : 'REQUESTED';

  const currentStepIndex = LIFECYCLE_STEPS.indexOf(normalizedStatus);

  return {
    incident: {
      id: incident.id,
      title: incident.title,
      type: incident.type,
      severity: incident.severity,
      location: incident.location,
      latitude: incident.latitude !== null && incident.latitude !== undefined && !isNaN(parseFloat(incident.latitude)) ? parseFloat(incident.latitude) : null,
      longitude: incident.longitude !== null && incident.longitude !== undefined && !isNaN(parseFloat(incident.longitude)) ? parseFloat(incident.longitude) : null,
      status: normalizedStatus,
      createdAt: incident.created_at,
    },
    citizen: citizenRequest
      ? {
          requestId: citizenRequest.id,
          name: citizenRequest.requester_name || citizenRequest.contact_name,
          phone: citizenRequest.phone_number || citizenRequest.contact_phone,
          emergencyType: citizenRequest.emergency_type,
          assistance: citizenRequest.assistance_requested,
          location: citizenRequest.location,
          latitude: citizenRequest.latitude ? parseFloat(citizenRequest.latitude) : null,
          longitude: citizenRequest.longitude ? parseFloat(citizenRequest.longitude) : null,
          accuracy: citizenRequest.accuracy ? parseFloat(citizenRequest.accuracy) : null,
        }
      : null,
    responder: incident.responder_id
      ? {
          id: incident.responder_id,
          name: incident.responder_name,
          callsign: incident.responder_callsign,
          status: incident.responder_status,
          latitude: incident.responder_lat ? parseFloat(incident.responder_lat) : null,
          longitude: incident.responder_lng ? parseFloat(incident.responder_lng) : null,
          accuracy: incident.responder_accuracy ? parseFloat(incident.responder_accuracy) : null,
          heading: incident.responder_heading ? parseFloat(incident.responder_heading) : null,
          speed: incident.responder_speed ? parseFloat(incident.responder_speed) : null,
        }
      : null,
    lifecycle: {
      currentStatus: normalizedStatus,
      currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : 0,
      steps: LIFECYCLE_STEPS.map((step, idx) => ({
        step,
        index: idx,
        label: STEP_METADATA[step].label,
        description: STEP_METADATA[step].description,
        isCompleted: currentStepIndex > idx,
        isCurrent: currentStepIndex === idx,
      })),
    },
    activeRoute,
    alternatives,
    statusHistory: historyRes.rows,
    locationTrail: breadcrumbsRes.rows,
    lastSyncedAt: new Date().toISOString(),
  };
}

/**
 * GET /api/tracking/:incidentId
 * Retrieves real-time synchronized tracking bundle for an incident.
 */
trackingRouter.get('/:incidentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const incidentId = String(req.params.incidentId);
    const bundle = await fetchTrackingBundle(incidentId);

    if (!bundle) {
      res.status(404).json({ success: false, error: `Incident ${incidentId} not found.` });
      return;
    }

    res.json({
      success: true,
      data: bundle,
    });
  } catch (err: any) {
    console.error('[Tracking Error] GET /:incidentId:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve live tracking data.' });
  }
});

/**
 * GET /api/tracking/request/:requestId
 * Citizen-facing tracking query by Request ID (e.g. SOS-12345).
 */
trackingRouter.get('/request/:requestId', async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = String(req.params.requestId);
    const reqRes = await query(`SELECT incident_id FROM emergency_requests WHERE id = $1`, [requestId]);

    if (reqRes.rowCount && reqRes.rowCount > 0 && reqRes.rows[0].incident_id) {
      const incidentId = reqRes.rows[0].incident_id;
      const bundle = await fetchTrackingBundle(incidentId);
      if (bundle) {
        res.json({ success: true, data: bundle });
        return;
      }
    }

    res.status(404).json({ success: false, error: `No active incident mapped to SOS request ${requestId}.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/tracking/reroute/:incidentId
 * Forces an immediate recalculation and route safety evaluation for an incident.
 */
trackingRouter.post('/reroute/:incidentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const incidentId = String(req.params.incidentId);
    const { originLat, originLng } = req.body;

    const loc =
      typeof originLat === 'number' && typeof originLng === 'number' ? { lat: originLat, lng: originLng } : undefined;

    const result = await checkAndTriggerDynamicReroute(incidentId, loc);

    res.json({
      success: true,
      message: result.rerouted ? 'Route updated with safer corridor.' : 'Current route verified safe.',
      data: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

