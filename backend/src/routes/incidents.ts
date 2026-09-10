// ============================================================
// INCIDENTS REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';
import { broadcastEvent } from './realtime';
import { findCorrelatedIncident } from '../services/incidentCorrelation';
import { optionalAuth } from '../middleware/auth';

export const incidentsRouter = Router();

// GET /api/incidents
incidentsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        i.id, 
        i.title, 
        i.type, 
        i.severity, 
        i.location, 
        i.latitude as lat, 
        i.longitude as lng, 
        i.latitude,
        i.longitude,
        i.status, 
        i.responders_count as responders, 
        i.responders_count,
        i.pending, 
        i.created_at as "createdAt",
        i.created_at,
        i.updated_at,
        i.source,
        i.source_reference,
        i.description,
        i.affected_people,
        i.verification_status,
        i.category,
        COALESCE(r.reports_count, 0) as reports_count
      FROM incidents i
      LEFT JOIN (
        SELECT incident_id, COUNT(*)::int as reports_count
        FROM incident_reports
        GROUP BY incident_id
      ) r ON r.incident_id = i.id
      ORDER BY 
        CASE i.severity 
          WHEN 'CRITICAL' THEN 1 
          WHEN 'HIGH' THEN 2 
          WHEN 'MODERATE' THEN 3 
          ELSE 4 
        END,
        i.pending DESC,
        i.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err: any) {
    console.error('[Incidents Error] GET /:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve incidents.' });
  }
});

// GET /api/incidents/:id
incidentsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [incRes, reportsRes] = await Promise.all([
      query(`SELECT * FROM incidents WHERE id = $1`, [id]),
      query(`SELECT * FROM incident_reports WHERE incident_id = $1 ORDER BY created_at DESC`, [id]),
    ]);

    if (incRes.rowCount && incRes.rowCount > 0) {
      const inc = incRes.rows[0];
      inc.reports = reportsRes.rows;
      inc.reports_count = reportsRes.rowCount || 0;
      res.json({ success: true, data: inc });
    } else {
      res.status(404).json({ success: false, error: `Incident ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/incidents/:id/reports
incidentsRouter.get('/:id/reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT * FROM incident_reports WHERE incident_id = $1 ORDER BY created_at DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/incidents/:id/agent-results
incidentsRouter.get('/:id/agent-results', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT DISTINCT ON (aer.agent_id)
        aer.id,
        aer.agent_id,
        aer.agent_name,
        aer.incident_id,
        aer.plan_id,
        aer.status,
        aer.started_at,
        aer.completed_at,
        aer.result,
        aer.confidence,
        aer.error,
        aer.created_at
      FROM agent_execution_records aer
      WHERE aer.incident_id = $1 
         OR aer.plan_id IN (SELECT plan_id FROM orchestration_plans WHERE incident_id = $1)
      ORDER BY aer.agent_id ASC, aer.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/incidents/:id/history
incidentsRouter.get('/:id/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT id, request_id, incident_id, previous_status, new_status, actor, responder_id, notes, to_char(created_at, 'HH24:MI') as time, created_at
       FROM incident_status_history
       WHERE incident_id = $1
       ORDER BY created_at ASC`,
      [id]
    );
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/incidents/report — Common disaster report pipeline across all portals
incidentsRouter.post('/report', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      disaster_type,
      disasterType,
      type,
      location,
      location_name,
      latitude,
      lat,
      longitude,
      lng,
      lon,
      severity,
      description,
      details,
      affected_people,
      affectedPeople,
      source,
      reporter_name,
      name,
      reporter_phone,
      phone,
      media_url,
    } = req.body;

    const effectiveLocation = (location || location_name || '').trim();
    if (!effectiveLocation || effectiveLocation.length < 3) {
      res.status(400).json({ success: false, error: 'Valid disaster location is required (minimum 3 characters).' });
      return;
    }

    const rawType = (disaster_type || disasterType || type || 'OTHER').toUpperCase().trim();
    const allowedTypes = ['FLOOD', 'FIRE', 'EARTHQUAKE', 'MEDICAL', 'STRUCTURAL', 'CYCLONE', 'EVACUATION', 'ACCIDENT', 'OTHER'];
    const effectiveType = allowedTypes.includes(rawType) ? rawType : 'OTHER';

    const rawSeverity = (severity || 'HIGH').toUpperCase().trim();
    const allowedSeverities = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
    const effectiveSeverity = allowedSeverities.includes(rawSeverity) ? rawSeverity : 'HIGH';

    const rawLat = latitude ?? lat;
    const rawLon = longitude ?? lng ?? lon;
    const validLat = typeof rawLat === 'number' && !isNaN(rawLat) && rawLat >= -90 && rawLat <= 90 ? rawLat : null;
    const validLon = typeof rawLon === 'number' && !isNaN(rawLon) && rawLon >= -180 && rawLon <= 180 ? rawLon : null;

    const effectiveDescription = (description || details || `Reported ${effectiveType} at ${effectiveLocation}`).trim();
    const effectiveAffected = Math.max(1, parseInt(affected_people || affectedPeople || '1', 10) || 1);

    const userRole = req.user?.role || 'citizen';
    const effectiveSource = source || (
      userRole === 'responder' ? 'PORTAL_REPORT' :
      userRole === 'resource_manager' ? 'PORTAL_REPORT' :
      userRole === 'authority_command' || userRole === 'admin' ? 'AUTHORITY_REPORT' :
      'CITIZEN_REPORT'
    );

    const effectiveReporterName = (reporter_name || name || req.user?.name || 'Anonymous Citizen').trim();
    const effectivePhone = (reporter_phone || phone || (req.user as any)?.phone || '').trim() || null;
    const reportId = `RPT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    // Automatic incident correlation check
    const correlation = await findCorrelatedIncident({
      disaster_type: effectiveType,
      location: effectiveLocation,
      latitude: validLat,
      longitude: validLon,
      severity: effectiveSeverity,
      description: effectiveDescription,
    });

    let targetIncidentId = '';
    let isCorrelated = false;
    let incidentData: any = null;

    if (correlation.isCorrelated && correlation.incidentId) {
      // Correlated with an existing active incident
      targetIncidentId = correlation.incidentId;
      isCorrelated = true;

      // Insert report linked to existing incident
      await query(`
        INSERT INTO incident_reports (
          id, incident_id, source, user_id, reporter_name, reporter_phone, reporter_role,
          disaster_type, severity, description, location, latitude, longitude, affected_people, media_url, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'CORRELATED')
      `, [
        reportId,
        targetIncidentId,
        effectiveSource,
        req.user?.id || null,
        effectiveReporterName,
        effectivePhone,
        userRole,
        effectiveType,
        effectiveSeverity,
        effectiveDescription,
        effectiveLocation,
        validLat,
        validLon,
        effectiveAffected,
        media_url || null,
      ]);

      // Update parent incident affected count and bump update timestamp
      const updateRes = await query(`
        UPDATE incidents
        SET affected_people = COALESCE(affected_people, 0) + $1,
            verification_status = 'VERIFIED',
            pending = TRUE,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [effectiveAffected, targetIncidentId]);
      incidentData = updateRes.rows[0];

      // Add audit history entry
      await query(`
        INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, actor, notes, created_at)
        VALUES ($1, $2, $3, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        `HIST-${Date.now()}`,
        targetIncidentId,
        incidentData?.status || 'ACTIVE',
        effectiveReporterName,
        `Additional corroborating ${effectiveType} report correlated from ${effectiveSource} (+${effectiveAffected} affected). Reason: ${correlation.reason}`,
      ]);

      // Broadcast report submission & incident update to Authority Portal
      broadcastEvent('INCIDENT_REPORT_SUBMITTED', {
        reportId,
        incidentId: targetIncidentId,
        source: effectiveSource,
        disasterType: effectiveType,
        location: effectiveLocation,
        severity: effectiveSeverity,
        isCorrelated: true,
        correlationReason: correlation.reason,
        timestamp: Date.now(),
      });

      broadcastEvent('INCIDENT_UPDATED', {
        id: targetIncidentId,
        title: incidentData?.title,
        severity: incidentData?.severity,
        affected_people: incidentData?.affected_people,
        verification_status: 'VERIFIED',
        pending: true,
      });

      // Trigger event-driven 11-agent replanning for the updated incident
      agentOrchestrator.runCycle(targetIncidentId, true).catch((err) => {
        console.error(`[Incidents] Replanning cycle failed for correlated incident ${targetIncidentId}:`, err.message);
      });
    } else {
      // Create a brand new unified incident in the common pipeline
      targetIncidentId = `INC-${Date.now().toString().slice(-4)}`;
      const title = `${effectiveSource.replace('_', ' ')}: ${effectiveType} at ${effectiveLocation}`;

      const insertInc = await query(`
        INSERT INTO incidents (
          id, title, type, severity, location, latitude, longitude, status, responders_count, pending,
          source, source_reference, description, affected_people, verification_status, category
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', 0, TRUE, $8, $9, $10, $11, 'UNVERIFIED', $12)
        RETURNING *
      `, [
        targetIncidentId,
        title,
        effectiveType,
        effectiveSeverity,
        effectiveLocation,
        validLat ?? 0,
        validLon ?? 0,
        effectiveSource,
        reportId,
        effectiveDescription,
        effectiveAffected,
        effectiveType,
      ]);
      incidentData = insertInc.rows[0];

      // Insert corresponding initial report record
      await query(`
        INSERT INTO incident_reports (
          id, incident_id, source, user_id, reporter_name, reporter_phone, reporter_role,
          disaster_type, severity, description, location, latitude, longitude, affected_people, media_url, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'SUBMITTED')
      `, [
        reportId,
        targetIncidentId,
        effectiveSource,
        req.user?.id || null,
        effectiveReporterName,
        effectivePhone,
        userRole,
        effectiveType,
        effectiveSeverity,
        effectiveDescription,
        effectiveLocation,
        validLat,
        validLon,
        effectiveAffected,
        media_url || null,
      ]);

      // Initial history entry
      await query(`
        INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, actor, notes, created_at)
        VALUES ($1, $2, NULL, 'ACTIVE', $3, $4, CURRENT_TIMESTAMP)
      `, [
        `HIST-${Date.now()}`,
        targetIncidentId,
        effectiveReporterName,
        `New incident reported via ${effectiveSource} at ${effectiveLocation} (${effectiveSeverity}).`,
      ]);

      // Broadcast new incident to Authority Portal
      broadcastEvent('INCIDENT_CREATED', {
        id: targetIncidentId,
        title,
        type: effectiveType,
        severity: effectiveSeverity,
        location: effectiveLocation,
        lat: validLat,
        lng: validLon,
        source: effectiveSource,
        description: effectiveDescription,
        affected_people: effectiveAffected,
        verification_status: 'UNVERIFIED',
        pending: true,
        timestamp: Date.now(),
      });

      // Fire 11-agent AI orchestration pipeline for the newly created incident
      agentOrchestrator.runCycle(targetIncidentId, true).catch((err) => {
        console.error(`[Incidents] Initial 11-agent orchestration failed for ${targetIncidentId}:`, err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: isCorrelated
        ? `Report successfully submitted and correlated with active incident ${targetIncidentId}. Replanning initiated.`
        : `New incident ${targetIncidentId} successfully registered in disaster coordination system. 11-agent pipeline started.`,
      data: {
        reportId,
        incidentId: targetIncidentId,
        isCorrelated,
        correlationReason: correlation.reason,
        source: effectiveSource,
        disasterType: effectiveType,
        severity: effectiveSeverity,
        location: effectiveLocation,
        affectedPeople: effectiveAffected,
        status: incidentData?.status || 'ACTIVE',
      },
    });
  } catch (err: any) {
    console.error('[Incidents Error] /report:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to submit incident report.' });
  }
});

// POST /api/incidents — Manual Authority Incident creation
incidentsRouter.post('/', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, type, severity, location, latitude, longitude, responders_count, pending, description, affected_people } = req.body;
    const id = `INC-${Date.now().toString().slice(-4)}`;

    const insertRes = await query(
      `INSERT INTO incidents (
        id, title, type, severity, location, latitude, longitude, status, responders_count, pending,
        source, description, affected_people, verification_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE', $8, $9, 'AUTHORITY_REPORT', $10, $11, 'VERIFIED')
      RETURNING *`,
      [
        id,
        title || 'Reported Emergency',
        type || 'OTHER',
        severity || 'HIGH',
        location,
        latitude || 0,
        longitude || 0,
        responders_count || 0,
        pending !== false,
        description || title || 'Manual Authority Incident',
        affected_people || 1,
      ]
    );

    // Formulate 11-agent response plan
    agentOrchestrator.runCycle(id, true).catch((err) => {
      console.error('[Incidents] Automatic plan preparation failed:', err.message);
    });

    broadcastEvent('INCIDENT_CREATED', insertRes.rows[0]);

    res.status(201).json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/incidents/:id
incidentsRouter.patch('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, responders, pending, severity } = req.body;

    const updateRes = await query(
      `UPDATE incidents 
       SET 
         status = COALESCE($1, status),
         responders_count = COALESCE($2, responders_count),
         pending = COALESCE($3, pending),
         severity = COALESCE($4, severity),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [status, responders, pending, severity, id]
    );

    if (updateRes.rowCount && updateRes.rowCount > 0) {
      const inc = updateRes.rows[0];
      if (status === 'RESOLVED' || status === 'COMPLETED') {
        // Release assigned responder
        await query(
          `UPDATE responders
           SET status = 'AVAILABLE', current_incident_id = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE current_incident_id = $1 OR id = $2`,
          [id, inc.assigned_responder_id || null]
        ).catch(() => {});

        // Release associated ambulances
        await query(
          `UPDATE ambulances SET status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE last_update ILIKE $1`,
          [`%${id}%`]
        ).catch(() => {});

        // Restore equipment
        await query(
          `UPDATE equipment SET available = LEAST(qty, available + 1), status = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP WHERE available < qty`
        ).catch(() => {});
      }

      res.json({ success: true, data: inc });
    } else {
      res.status(404).json({ success: false, error: `Incident ${id} not found.` });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

