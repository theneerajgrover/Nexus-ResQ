// ============================================================
// AUTHORITY / COMMAND APPROVALS REST ROUTER
// Human Supervision Gate for AI-Generated Dispatch Plans
// ============================================================
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { authenticateToken } from '../middleware/auth';
import { broadcastEvent } from './realtime';
import { agentOrchestrator } from '../services/agentOrchestrator';

export const approvalsRouter = Router();

/**
 * GET /api/approvals/pending
 * Retrieve all pending approvals joined with plan and incident details
 */
approvalsRouter.get('/pending', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await query(`
      SELECT 
        a.approval_id,
        a.incident_id,
        a.plan_id,
        a.requested_by,
        a.approval_type,
        a.status,
        a.created_at,
        a.expires_at,
        ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - a.created_at))) as pending_duration_seconds,
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
        r.critic_verification,
        coalesce(r.plan_version, p.plan_version, 'V1') as plan_version,
        coalesce(r.cycle_number, p.cycle_number, 1) as cycle_number,
        i.title as incident_title,
        i.type as incident_type,
        i.severity as incident_severity,
        i.location as incident_location,
        i.latitude as incident_latitude,
        i.longitude as incident_longitude,
        i.status as incident_status,
        p.id as exec_id,
        coalesce(p.completed_agent_count, p.current_step, 11) as completed_agents,
        coalesce(p.total_steps, 11) as total_agents,
        p.current_stage,
        coalesce(p.orchestration_status, p.status) as orchestration_status,
        p.critic_validation
      FROM approvals a
      LEFT JOIN ai_recommendations r ON a.plan_id = r.id
      LEFT JOIN incidents i ON a.incident_id = i.id
      LEFT JOIN orchestration_plans p ON (p.plan_id = a.plan_id OR p.approval_id = a.approval_id)
      WHERE a.status = 'PENDING'
      ORDER BY a.created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err: any) {
    console.error('[Approvals Error] GET /pending:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve pending approvals.' });
  }
});

/**
 * POST /api/approvals/:id/approve
 * Human authorization to execute and dispatch AI recommended plan
 */
approvalsRouter.post('/:id/approve', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Verify role permissions
    if (!user || !['authority_command', 'authority', 'admin'].includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Only Authority/Command personnel can authorize dispatch plans.',
      });
      return;
    }

    // Verify approval exists and is PENDING (match by approval_id or plan_id)
    let appRes = await query(`
      SELECT a.*, r.action, r.reason, r.recommended_resource, r.recommended_teams_count, r.affected_zone, r.incident_id as rec_incident_id
      FROM approvals a
      LEFT JOIN ai_recommendations r ON a.plan_id = r.id
      WHERE a.approval_id = $1 OR a.plan_id = $1
      ORDER BY a.created_at DESC LIMIT 1
    `, [id]);

    if (appRes.rowCount === 0) {
      // Check if plan exists in orchestration_plans or ai_recommendations
      const planRes = await query(`
        SELECT p.*, r.id as rec_id, r.action, r.reason, r.recommended_resource, r.recommended_teams_count, r.affected_zone
        FROM orchestration_plans p
        LEFT JOIN ai_recommendations r ON p.plan_id = r.id OR p.id = r.id
        WHERE p.id = $1 OR p.plan_id = $1 OR r.id = $1
        ORDER BY p.created_at DESC LIMIT 1
      `, [id]);
      if (planRes.rowCount && planRes.rowCount > 0) {
        const plan = planRes.rows[0];
        if (!plan.incident_id) {
          res.status(404).json({ success: false, error: `Plan ${id} is not associated with any valid incident.`, code: 'INCIDENT_NOT_FOUND' });
          return;
        }
        const newAppId = `APP-${Date.now().toString().slice(-6)}`;
        const insApp = await query(`
          INSERT INTO approvals (approval_id, incident_id, plan_id, requested_by, approval_type, status, expires_at)
          VALUES ($1, $2, $3, 'AI_ORCHESTRATOR', 'DISPATCH_PLAN', 'PENDING', CURRENT_TIMESTAMP + interval '4 hours')
          ON CONFLICT DO NOTHING
          RETURNING *
        `, [newAppId, plan.incident_id, plan.plan_id || plan.id || id]);
        if (insApp.rowCount && insApp.rowCount > 0) {
          appRes = insApp;
        }
      }
    }

    if (appRes.rowCount === 0) {
      res.status(404).json({ success: false, error: `Approval record ${id} not found.`, code: 'APPROVAL_NOT_FOUND' });
      return;
    }

    const approval = appRes.rows[0];
    if (approval.status !== 'PENDING') {
      if (approval.status === 'APPROVED') {
        res.json({
          success: true,
          message: `Approval ${id} has already been approved.`,
          data: approval,
        });
        return;
      }
      res.status(409).json({
        success: false,
        error: `Approval ${id} is already ${approval.status} and cannot be modified.`,
        code: 'STATE_CONFLICT',
      });
      return;
    }

    const reviewerName = user.name || 'Command Officer';

    // Execute real database mutations, enter monitoring, and trigger continuous loop via agentOrchestrator
    const result = await agentOrchestrator.handleApprovalDecision(approval.plan_id || id, 'APPROVED', reviewerName);

    res.json({
      success: true,
      message: `Dispatch plan ${approval.plan_id} approved and resources dispatched.`,
      data: {
        approvalId: id,
        planId: approval.plan_id,
        decision: 'APPROVED',
        dispatchId: result?.dispatchId,
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        details: result,
      },
    });
  } catch (err: any) {
    console.error('[Approvals Error] POST /:id/approve:', err.message);
    const statusCode =
      err.statusCode ||
      (err.code === 'INCIDENT_NOT_FOUND'
        ? 404
        : ['INCIDENT_STATE_CONFLICT', 'RESOURCE_SHORTAGE', 'STATE_CONFLICT'].includes(err.code)
        ? 409
        : 500);

    const safeError = statusCode === 500 ? 'Failed to approve dispatch plan.' : err.message;

    res.status(statusCode).json({
      success: false,
      error: safeError,
      code: err.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ACTION_FAILED'),
    });
  }
});

/**
 * POST /api/approvals/:id/reject
 * Tactical rejection of AI-generated response plan
 */
approvalsRouter.post('/:id/reject', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    // Verify role permissions
    if (!user || !['authority_command', 'authority', 'admin'].includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Only Authority/Command personnel can reject dispatch plans.',
      });
      return;
    }

    const rejectionReason = reason && reason.trim() ? reason.trim() : 'Rejected by Command Authority';

    // Verify approval exists and is PENDING (match by approval_id or plan_id)
    let appRes = await query(`
      SELECT * FROM approvals WHERE approval_id = $1 OR plan_id = $1 ORDER BY created_at DESC LIMIT 1
    `, [id]);

    if (appRes.rowCount === 0) {
      // Check if plan exists in orchestration_plans or ai_recommendations
      const planRes = await query(`
        SELECT p.*, r.id as rec_id FROM orchestration_plans p
        LEFT JOIN ai_recommendations r ON p.plan_id = r.id OR p.id = r.id
        WHERE p.id = $1 OR p.plan_id = $1 OR r.id = $1
        ORDER BY p.created_at DESC LIMIT 1
      `, [id]);
      if (planRes.rowCount && planRes.rowCount > 0) {
        const plan = planRes.rows[0];
        const newAppId = `APP-${Date.now().toString().slice(-6)}`;
        const insApp = await query(`
          INSERT INTO approvals (approval_id, incident_id, plan_id, requested_by, approval_type, status, expires_at)
          VALUES ($1, $2, $3, 'AI_ORCHESTRATOR', 'DISPATCH_PLAN', 'PENDING', CURRENT_TIMESTAMP + interval '4 hours')
          ON CONFLICT DO NOTHING
          RETURNING *
        `, [newAppId, plan.incident_id || 'INC-2849', plan.plan_id || plan.id || id]);
        if (insApp.rowCount && insApp.rowCount > 0) {
          appRes = insApp;
        }
      }
    }

    if (appRes.rowCount === 0) {
      res.status(404).json({ success: false, error: `Approval record ${id} not found.` });
      return;
    }

    const approval = appRes.rows[0];
    if (approval.status !== 'PENDING') {
      if (approval.status === 'REJECTED') {
        res.json({
          success: true,
          message: `Approval ${id} has already been rejected.`,
          data: approval,
        });
        return;
      }
      res.status(409).json({
        success: false,
        error: `Approval ${id} is already ${approval.status} and cannot be modified.`,
      });
      return;
    }

    const reviewerName = user.name || 'Command Officer';

    // Record rejection and queue reassessment cycle via agentOrchestrator
    const result = await agentOrchestrator.handleApprovalDecision(approval.plan_id || id, 'REJECTED', reviewerName, rejectionReason);

    res.json({
      success: true,
      message: `Dispatch plan ${approval.plan_id} rejected. Reassessment cycle queued.`,
      data: {
        approvalId: id,
        planId: approval.plan_id,
        decision: 'REJECTED',
        reason: rejectionReason,
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        details: result,
      },
    });
  } catch (err: any) {
    console.error('[Approvals Error] POST /:id/reject:', err.message);
    res.status(500).json({ success: false, error: 'Failed to reject dispatch plan.' });
  }
});

/**
 * POST /api/approvals/:id/dismiss
 * Dismiss approval notification without approving the plan
 */
approvalsRouter.post('/:id/dismiss', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!user || !['authority_command', 'authority', 'admin'].includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'Forbidden: Authority level required.',
      });
      return;
    }

    const reviewerName = user.name || 'Command Officer';

    const result = await agentOrchestrator.handleApprovalDecision(String(id), 'DISMISSED', reviewerName, reason);

    res.json({
      success: true,
      message: `Approval request ${id} dismissed.`,
      data: {
        approvalId: id,
        decision: 'DISMISSED',
        reviewedBy: reviewerName,
        reviewedAt: new Date().toISOString(),
        details: result,
      },
    });
  } catch (err: any) {
    console.error('[Approvals Error] POST /:id/dismiss:', err.message);
    res.status(500).json({ success: false, error: 'Failed to dismiss approval.' });
  }
});
