// ============================================================
// AUTHORITY / COMMAND REST ROUTER
// ============================================================
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';
import { broadcastEvent } from './realtime';
import { JWT_SECRET } from '../middleware/auth';

export const commandRouter = Router();

// GET /api/command/overview
commandRouter.get('/overview', async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      incidentsRes,
      respondersRes,
      regionsRes,
      agentsRes,
      recommendationRes,
      activePlanRes,
      pendingApprovalRes,
      dispatchesRes,
      historyRes,
      emergencyCountRes,
    ] = await Promise.all([
      query(`
        SELECT id, title, type, severity, location, latitude as lat, longitude as lng, status, responders_count as responders, pending, assigned_responder_id, created_at as "createdAt", updated_at as "updatedAt"
        FROM incidents 
        ORDER BY 
          CASE 
            WHEN status IN ('RESPONDING', 'DISPATCHED', 'ACTIVE') THEN 0 
            WHEN pending THEN 1 
            ELSE 2 
          END, 
          updated_at DESC, 
          created_at DESC 
        LIMIT 50
      `),
      query(`
        SELECT id, name, callsign, status, latitude as lat, longitude as lng, current_incident_id as incident
        FROM responders ORDER BY updated_at DESC, id ASC LIMIT 50
      `),
      query(`
        SELECT region_name as region, risk_score as risk, incident_count as incidents, evacuees_count as evacuees, trend
        FROM risk_zones ORDER BY risk_score DESC
      `),
      query(`
        SELECT agent_id as id, name, description as desc, status, progress, layer, last_event as "lastEvent"
        FROM agent_pipeline_state ORDER BY agent_id ASC
      `),
      query(`
        SELECT * FROM ai_recommendations WHERE status = 'PENDING_APPROVAL' ORDER BY created_at DESC LIMIT 1
      `),
      query(`
        SELECT 
          p.*,
          coalesce(a.status, p.status) as approval_status,
          a.decision as approval_decision,
          a.reviewed_by,
          a.reviewed_at
        FROM orchestration_plans p
        LEFT JOIN approvals a ON (a.plan_id = p.plan_id OR a.plan_id = p.id OR a.approval_id = p.approval_id)
        ORDER BY p.created_at DESC LIMIT 1
      `),
      query(`
        SELECT 
          a.approval_id,
          a.incident_id,
          a.plan_id,
          a.requested_by,
          a.approval_type,
          a.status,
          a.decision,
          a.created_at,
          r.action,
          r.reason,
          r.priority,
          r.affected_zone,
          r.estimated_people_affected,
          r.recommended_resource,
          r.recommended_shelter,
          r.recommended_teams_count,
          r.confidence_score,
          r.risk_flags,
          r.proposed_actions_list,
          i.title as incident_title,
          i.type as incident_type,
          i.severity as incident_severity,
          i.location as incident_location
        FROM approvals a
        LEFT JOIN ai_recommendations r ON a.plan_id = r.id
        LEFT JOIN incidents i ON a.incident_id = i.id
        WHERE a.status = 'PENDING'
        ORDER BY a.created_at DESC
        LIMIT 1
      `),
      query(`
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
          to_char(created_at, 'HH24:MI') as timestamp,
          created_at
        FROM dispatch_records
        ORDER BY created_at DESC
        LIMIT 25
      `),
      query(`
        SELECT 
          id, 
          request_id, 
          incident_id, 
          previous_status, 
          new_status, 
          actor, 
          responder_id, 
          notes, 
          to_char(created_at, 'HH24:MI') as time,
          created_at
        FROM incident_status_history
        ORDER BY created_at DESC
        LIMIT 30
      `),
      query(`
        SELECT count(*)::int as count FROM emergency_requests
      `),
    ]);

    res.json({
      success: true,
      synced_at: new Date().toISOString(),
      data: {
        incidents: incidentsRes.rows,
        responders: respondersRes.rows,
        regionData: regionsRes.rows,
        agents: agentsRes.rows,
        activePlan: activePlanRes.rows[0] || null,
        pendingRecommendation: recommendationRes.rows[0] || null,
        pendingApproval: pendingApprovalRes.rows[0] || null,
        dispatches: dispatchesRes.rows,
        history: historyRes.rows,
        emergencyCount: emergencyCountRes.rows[0]?.count || 0,
      },
    });
  } catch (err: any) {
    console.error('[Command Error] /overview:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve command overview.' });
  }
});

// GET /api/command/regions
commandRouter.get('/regions', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT region_name as region, risk_score as risk, incident_count as incidents, evacuees_count as evacuees, trend
      FROM risk_zones ORDER BY risk_score DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/command/agents
commandRouter.get('/agents', async (req: Request, res: Response): Promise<void> => {
  try {
    const [agentsRes, eventsRes] = await Promise.all([
      query(`SELECT agent_id as id, name, description as desc, status, progress, layer, last_event as "lastEvent" FROM agent_pipeline_state ORDER BY agent_id ASC`),
      query(`SELECT id, agent_id as "agentId", agent_name as "agentName", event_type as "type", message, to_char(created_at, 'HH24:MI:SS') as timestamp FROM agent_activity_events ORDER BY created_at DESC LIMIT 20`),
    ]);

    res.json({
      success: true,
      data: {
        agents: agentsRes.rows,
        events: eventsRes.rows,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/command/recommendations
commandRouter.get('/recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`SELECT * FROM ai_recommendations ORDER BY created_at DESC`);
    res.json({ success: true, data: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/command/recommendations/:id/action
commandRouter.post('/recommendations/:id/action', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, approvedBy, comments } = req.body; // action: 'APPROVE' or 'REJECT'

    if (!action || !['APPROVE', 'REJECT', 'ALLOW', 'DENY'].includes(action.toUpperCase())) {
      res.status(400).json({ success: false, error: 'Valid action (APPROVE or REJECT) is required.' });
      return;
    }

    const newStatus = ['APPROVE', 'ALLOW'].includes(action.toUpperCase()) ? 'APPROVED' : 'REJECTED';
    
    // Resolve reviewer identity and enforce authority role from JWT token or payload
    let reviewer = approvedBy || 'Command Officer';
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded && decoded.name) {
            reviewer = decoded.name;
          }
          if (decoded && decoded.role && !['authority_command', 'authority', 'admin'].includes(decoded.role)) {
            res.status(403).json({
              success: false,
              error: 'Forbidden: Only Authority/Command personnel can authorize dispatch plans.',
            });
            return;
          }
        } catch {}
      }
    }

    // 0. Concurrency & Atomicity protection: Verify plan has not already received a decision
    const checkStatus = await query(`
      SELECT status, approval_status FROM orchestration_plans WHERE id = $1 OR plan_id = $1
      UNION ALL
      SELECT status, status as approval_status FROM approvals WHERE approval_id = $1 OR plan_id = $1
      UNION ALL
      SELECT status, status as approval_status FROM ai_recommendations WHERE id = $1
    `, [id]);
    const alreadyDecided = checkStatus.rows.find((r: any) =>
      r.status === 'APPROVED' || r.approval_status === 'APPROVED' ||
      r.status === 'EXECUTING' || r.status === 'MONITORING' ||
      r.status === 'COMPLETE' || r.status === 'REJECTED' || r.approval_status === 'REJECTED'
    );
    if (alreadyDecided) {
      const isApprovedDecision = alreadyDecided.status === 'APPROVED' || alreadyDecided.approval_status === 'APPROVED' ||
        alreadyDecided.status === 'EXECUTING' || alreadyDecided.status === 'MONITORING' || alreadyDecided.status === 'COMPLETE';
      if (isApprovedDecision && newStatus === 'APPROVED') {
        res.json({
          success: true,
          message: `Response plan ${id} has already been recorded as APPROVED.`,
          decision: 'APPROVED',
          status: 'APPROVED',
        });
        return;
      }
      if (!isApprovedDecision && newStatus === 'REJECTED') {
        res.json({
          success: true,
          message: `Response plan ${id} has already been recorded as REJECTED.`,
          decision: 'REJECTED',
          status: 'REJECTED',
        });
        return;
      }
      res.status(409).json({
        success: false,
        error: `Response plan ${id} has already received a final human decision: ${alreadyDecided.status}.`,
        decision: alreadyDecided.status,
      });
      return;
    }

    // Delegate decision handling to agentOrchestrator service for full continuous loop execution and state mutations
    const orchResult = await agentOrchestrator.handleApprovalDecision(String(id), newStatus, reviewer, comments);

    res.json({
      success: true,
      decision: newStatus,
      message: `Response plan ${id} successfully ${newStatus.toLowerCase()} by ${reviewer}.`,
      data: {
        planId: id,
        decision: newStatus,
        reviewedBy: reviewer,
        reviewedAt: new Date().toISOString(),
        details: orchResult,
      },
    });
  } catch (err: any) {
    console.error('[Command Error] /recommendations/:id/action:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to process plan authorization.' });
  }
});

// POST /api/command/recommendations/:id/dismiss
commandRouter.post('/recommendations/:id/dismiss', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    let reviewer = 'Dir. Sarah Chen';
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          if (decoded && decoded.name) {
            reviewer = decoded.name;
          }
        } catch {}
      }
    }

    const orchResult = await agentOrchestrator.handleApprovalDecision(String(id), 'DISMISSED', reviewer, note);

    res.json({
      success: true,
      decision: 'DISMISSED',
      message: `Approval request for ${id} dismissed.`,
      data: {
        planId: id,
        decision: 'DISMISSED',
        reviewedBy: reviewer,
        reviewedAt: new Date().toISOString(),
        details: orchResult,
      },
    });
  } catch (err: any) {
    console.error('[Command Error] /recommendations/:id/dismiss:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

