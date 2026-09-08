// ============================================================
// NEXUS RESQ — MIGRATION: AI ORCHESTRATION & APPROVAL LIFECYCLE
// ============================================================
import { query, pool } from './index';

export async function runOrchestrationApprovalMigration() {
  console.log('[Migration] Starting AI Orchestration & Approval schema enhancement...');

  try {
    // 1. Agent execution records table (tracks each run of the 11 agents)
    await query(`
      CREATE TABLE IF NOT EXISTS agent_execution_records (
        id VARCHAR(64) PRIMARY KEY,
        agent_id INT NOT NULL,
        agent_name VARCHAR(100) NOT NULL,
        incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE SET NULL,
        status VARCHAR(50) NOT NULL CHECK (status IN ('WAITING', 'RUNNING', 'COMPLETE', 'FAILED')),
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMPTZ,
        result JSONB DEFAULT '{}'::jsonb,
        confidence NUMERIC(5, 2) DEFAULT 90.00,
        error TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_aer_incident_agent ON agent_execution_records(incident_id, agent_id);
      CREATE INDEX IF NOT EXISTS idx_aer_created_at ON agent_execution_records(created_at DESC);
      ALTER TABLE agent_execution_records ADD COLUMN IF NOT EXISTS plan_id VARCHAR(64);
    `);

    // 1b. Orchestration plans table (tracks lifecycle of AI orchestration runs)
    await query(`
      CREATE TABLE IF NOT EXISTS orchestration_plans (
        id VARCHAR(64) PRIMARY KEY,
        incident_id VARCHAR(64),
        warning_id VARCHAR(64),
        status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('INITIALIZED', 'IN_PROGRESS', 'COMPLETE', 'FAILED', 'AWAITING_APPROVAL')),
        current_step INT NOT NULL DEFAULT 0,
        total_steps INT NOT NULL DEFAULT 11,
        started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_orch_plans_incident ON orchestration_plans(incident_id);
      CREATE INDEX IF NOT EXISTS idx_orch_plans_status ON orchestration_plans(status);
      CREATE INDEX IF NOT EXISTS idx_orch_plans_created_at ON orchestration_plans(created_at DESC);

      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS plan_id VARCHAR(64);
      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS current_stage VARCHAR(100) DEFAULT 'CONTINUOUS INGESTION';
      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS approved_by VARCHAR(100);
      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS approval_id VARCHAR(64);

      -- Update status constraint to support full lifecycle
      ALTER TABLE orchestration_plans DROP CONSTRAINT IF EXISTS orchestration_plans_status_check;
      ALTER TABLE orchestration_plans ADD CONSTRAINT orchestration_plans_status_check
        CHECK (status IN ('INITIALIZED', 'IN_PROGRESS', 'WAITING_FOR_APPROVAL', 'APPROVED', 'PROCESSING', 'EXECUTING', 'MONITORING', 'REASSESSING', 'COMPLETE', 'COMPLETED', 'FAILED', 'REJECTED', 'DISMISSED', 'SUPERSEDED', 'NO_ACTIVE_INCIDENTS'));

      CREATE INDEX IF NOT EXISTS idx_orch_plans_plan_id ON orchestration_plans(plan_id);
    `);

    // 2. Human approvals table (Human Supervision Gate)
    await query(`
      CREATE TABLE IF NOT EXISTS approvals (
        approval_id VARCHAR(64) PRIMARY KEY,
        incident_id VARCHAR(64),
        plan_id VARCHAR(64) NOT NULL,
        requested_by VARCHAR(100) DEFAULT 'AI_ORCHESTRATOR',
        approval_type VARCHAR(100) DEFAULT 'DISPATCH_PLAN',
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED')),
        decision VARCHAR(50),
        reason TEXT,
        reviewed_by VARCHAR(100),
        reviewed_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
      CREATE INDEX IF NOT EXISTS idx_approvals_created_at ON approvals(created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_pending_plan ON approvals(plan_id) WHERE status = 'PENDING';

      ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_status_check;
      ALTER TABLE approvals ADD CONSTRAINT approvals_status_check
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ACKNOWLEDGED', 'DISMISSED', 'SUPERSEDED'));
    `);

    // 3. Authority/Admin notifications table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64),
        role VARCHAR(50) DEFAULT 'authority_command',
        type VARCHAR(100) NOT NULL,
        priority VARCHAR(50) NOT NULL DEFAULT 'CRITICAL' CHECK (priority IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
        incident_id VARCHAR(64),
        approval_id VARCHAR(64),
        plan_id VARCHAR(64),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'UNREAD' CHECK (status IN ('UNREAD', 'READ', 'ARCHIVED')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_notif_role_status ON notifications(role, status);
      CREATE INDEX IF NOT EXISTS idx_notif_created_at ON notifications(created_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_unread_approval ON notifications(approval_id, type) WHERE status = 'UNREAD';
    `);

    // 4. Enhance ai_recommendations with critic verification fields and updated_at
    await query(`
      ALTER TABLE ai_recommendations
      ADD COLUMN IF NOT EXISTS critic_verification JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS validation_status VARCHAR(50) DEFAULT 'VALIDATED',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE ai_recommendations DROP CONSTRAINT IF EXISTS ai_recommendations_status_check;
      ALTER TABLE ai_recommendations ADD CONSTRAINT ai_recommendations_status_check
        CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REPLANNING', 'COMPLETED', 'DISMISSED', 'SUPERSEDED'));
    `);

    // 5. Ensure the 11 agents in agent_pipeline_state have standard names and codes
    const agentsData = [
      { id: 1, name: 'Continuous Ingestion', code: 'CONTINUOUS_INGESTION', desc: 'Multi-source continuous data ingestion & telemetry normalization', layer: 'continuous' },
      { id: 2, name: 'Verification', code: 'VERIFICATION', desc: 'Credibility assessment, deduplication & conflict checks', layer: 'sequential' },
      { id: 3, name: 'Situation', code: 'SITUATION', desc: 'Operational picture synthesis & perimeter consolidation', layer: 'sequential' },
      { id: 4, name: 'Priority', code: 'PRIORITY', desc: 'Incident triage, casualty threat & urgency scoring', layer: 'sequential' },
      { id: 5, name: 'Resource', code: 'RESOURCE', desc: 'Unit suitability mapping, specialized asset calculation', layer: 'parallel' },
      { id: 6, name: 'Capacity', code: 'CAPACITY', desc: 'Hospital intake, shelter headroom & logistics forecasting', layer: 'parallel' },
      { id: 7, name: 'Route', code: 'ROUTE', desc: 'Safe corridor analysis, obstruction & flood evasion', layer: 'parallel' },
      { id: 8, name: 'Forecast', code: 'FORECAST', desc: 'Meteorological surge & risk progression forecasting', layer: 'parallel' },
      { id: 9, name: 'Coordinator', code: 'COORDINATOR', desc: 'Response plan synthesis & multi-agency action coordination', layer: 'sequential' },
      { id: 10, name: 'Critic', code: 'CRITIC', desc: 'Plan risk verification, constraint checking & gatekeeping', layer: 'sequential' },
      { id: 11, name: 'Analytics', code: 'ANALYTICS', desc: 'Performance analytics, outcome auditing & latency tracking', layer: 'continuous' },
    ];

    for (const a of agentsData) {
      await query(`
        INSERT INTO agent_pipeline_state (agent_id, name, code, description, status, progress, layer, last_event, updated_at)
        VALUES ($1, $2, $3, $4, 'WAITING', 0, $5, 'Initialized in standby', CURRENT_TIMESTAMP)
        ON CONFLICT (agent_id) DO UPDATE
        SET name = EXCLUDED.name,
            code = EXCLUDED.code,
            description = EXCLUDED.description,
            layer = EXCLUDED.layer;
      `, [a.id, a.name, a.code, a.desc, a.layer]);
    }

    console.log('[Migration] AI Orchestration & Approval schema upgrade completed successfully.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Failed Orchestration & Approval migration:', err.message);
    throw err;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('migrate_orchestration_approval')) {
  runOrchestrationApprovalMigration()
    .then(() => pool.end())
    .catch(() => pool.end());
}
