// ============================================================
// AI ORCHESTRATOR REST ROUTER
// Continuous 11-Agent ResQ Intelligence, Human Approval & State Lifecycle
// ============================================================
import { Router, Request, Response } from 'express';
import { agentOrchestrator } from '../services/agentOrchestrator';
import { query } from '../db';
import { optionalAuth } from '../middleware/auth';

export const orchestratorRouter = Router();

/**
 * GET /api/orchestrator/current
 * Return the live state of the active orchestration cycle
 */
orchestratorRouter.get('/current', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await agentOrchestrator.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] GET /current:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve current orchestration state.' });
  }
});

/**
 * POST /api/orchestrator/start
 * Initiate a new response cycle (0/11 -> 11/11)
 */
orchestratorRouter.post('/start', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { incidentId } = req.body;
    const result = await agentOrchestrator.runCycle(incidentId, true);
    res.json({
      success: true,
      data: result,
      message: 'AI continuous orchestration cycle initiated.',
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] POST /start:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Failed to start orchestration cycle.' });
  }
});

/**
 * POST /api/orchestrator/run
 * Trigger full 11-agent orchestration run (starts continuous cycle)
 */
orchestratorRouter.post('/run', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { incidentId, warningId } = req.body;
    const result = await agentOrchestrator.runPipeline(incidentId, warningId);

    res.json({
      success: true,
      data: result,
      message: 'AI agent orchestration cycle started. 11 execution stages in progress.',
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] POST /run:', err.message);
    res.status(500).json({ success: false, error: err.message || 'Orchestration execution failed.' });
  }
});

/**
 * POST /api/orchestrator/:planId/approve
 * Human Authority authorization to execute approved plan and dispatch resources
 */
orchestratorRouter.post('/:planId/approve', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const planId = String(req.params.planId);
    const { approvedBy, comments } = req.body;
    const reviewer = (req as any).user?.name || approvedBy || 'Command Officer';

    const result = await agentOrchestrator.handleApprovalDecision(planId, 'APPROVED', reviewer, comments);
    res.json({
      success: true,
      data: result,
      message: `Plan ${planId} approved. Operational dispatch started.`,
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] POST /:planId/approve:', err.message);
    if (err.code === 'INCIDENT_NOT_FOUND' || err.code === 'PLAN_NOT_FOUND') {
      res.status(404).json({ success: false, code: err.code, error: err.message });
      return;
    }
    if (err.code === 'INCIDENT_STATE_CONFLICT' || err.code === 'RESOURCE_SHORTAGE') {
      res.status(409).json({ success: false, code: err.code, error: err.message });
      return;
    }
    res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      error: 'Failed to approve plan. An internal error occurred while processing dispatch assignments.',
    });
  }
});

/**
 * POST /api/orchestrator/:planId/reject
 * Human Authority tactical rejection of plan
 */
orchestratorRouter.post('/:planId/reject', optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const planId = String(req.params.planId);
    const { reason, rejectedBy } = req.body;
    const reviewer = (req as any).user?.name || rejectedBy || 'Command Officer';

    const result = await agentOrchestrator.handleApprovalDecision(planId, 'REJECTED', reviewer, reason);
    res.json({
      success: true,
      data: result,
      message: `Plan ${planId} rejected. Reassessment cycle queued.`,
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] POST /:planId/reject:', err.message);
    if (err.code === 'INCIDENT_NOT_FOUND' || err.code === 'PLAN_NOT_FOUND') {
      res.status(404).json({ success: false, code: err.code, error: err.message });
      return;
    }
    res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      error: 'Failed to reject plan. An internal error occurred.',
    });
  }
});

/**
 * GET /api/orchestrator/status
 * Get live status of the 11 agents, active plan, and pending approvals
 */
orchestratorRouter.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const status = await agentOrchestrator.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] GET /status:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve orchestrator status.' });
  }
});

/**
 * GET /api/orchestrator/executions
 * Query persistent agent execution records
 */
orchestratorRouter.get('/executions', async (req: Request, res: Response): Promise<void> => {
  try {
    const incidentId = req.query.incidentId as string;
    const planId = req.query.planId as string;
    const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);

    let sql = `SELECT * FROM agent_execution_records`;
    const conditions: string[] = [];
    const params: any[] = [];

    if (planId) {
      params.push(planId);
      conditions.push(`plan_id = $${params.length}`);
    }
    if (incidentId) {
      params.push(incidentId);
      conditions.push(`incident_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    params.push(limit);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] GET /executions:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve agent executions.' });
  }
});

/**
 * GET /api/orchestrator/plans
 * Query historical orchestration plans with versioning
 */
orchestratorRouter.get('/plans', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '30', 10), 100);
    const result = await query(
      `SELECT * FROM orchestration_plans ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] GET /plans:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve orchestration plans.' });
  }
});

/**
 * GET /api/orchestrator/:planId
 * Query a specific response plan by ID
 */
orchestratorRouter.get('/:planId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId } = req.params;
    const planRes = await query(
      `SELECT p.*, r.action, r.reason, r.recommended_resource, r.recommended_shelter, r.proposed_actions_list, r.risk_flags
       FROM orchestration_plans p
       LEFT JOIN ai_recommendations r ON (p.plan_id = r.id OR p.id = r.id)
       WHERE p.plan_id = $1 OR p.id = $1
       LIMIT 1`,
      [planId]
    );

    if (!planRes.rowCount) {
      res.status(404).json({ success: false, error: `Plan ${planId} not found.` });
      return;
    }

    res.json({
      success: true,
      data: planRes.rows[0],
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] GET /:planId:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve plan details.' });
  }
});

/**
 * GET /api/orchestrator/:planId/agents
 * Query execution records of all 11 agents for a specific plan
 */
orchestratorRouter.get('/:planId/agents', async (req: Request, res: Response): Promise<void> => {
  try {
    const { planId } = req.params;
    const records = await query(
      `SELECT * FROM agent_execution_records WHERE plan_id = $1 ORDER BY agent_id ASC`,
      [planId]
    );
    res.json({
      success: true,
      data: records.rows,
    });
  } catch (err: any) {
    console.error('[Orchestrator Error] GET /:planId/agents:', err.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve plan agent executions.' });
  }
});
