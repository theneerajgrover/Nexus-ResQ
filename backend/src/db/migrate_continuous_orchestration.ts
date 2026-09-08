// ============================================================
// NEXUS RESQ — MIGRATION: CONTINUOUS ORCHESTRATION ENGINE
// Multi-cycle versioning, execution states & operational mutations
// ============================================================
import { query, pool } from './index';

export async function runContinuousOrchestrationMigration() {
  console.log('[Migration] Starting Continuous AI Orchestration schema enhancement...');

  try {
    // 1. Add cycle_number, plan_version, and rejection_reason columns to orchestration_plans
    await query(`
      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS cycle_number INT DEFAULT 1;
      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS plan_version VARCHAR(32) DEFAULT 'V1';
      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      ALTER TABLE orchestration_plans ADD COLUMN IF NOT EXISTS critic_validation JSONB DEFAULT '{}'::jsonb;
    `);

    // 2. Update orchestration_plans status check constraint to support all continuous loop states
    await query(`
      ALTER TABLE orchestration_plans DROP CONSTRAINT IF EXISTS orchestration_plans_status_check;
      ALTER TABLE orchestration_plans ADD CONSTRAINT orchestration_plans_status_check
        CHECK (status IN (
          'INITIALIZED',
          'IN_PROGRESS',
          'PROCESSING',
          'WAITING_FOR_APPROVAL',
          'APPROVED',
          'EXECUTING',
          'MONITORING',
          'REASSESSING',
          'COMPLETE',
          'COMPLETED',
          'FAILED',
          'REJECTED',
          'DISMISSED',
          'SUPERSEDED',
          'NO_ACTIVE_INCIDENTS'
        ));
    `);

    // 3. Add plan_version column to ai_recommendations if missing
    await query(`
      ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS plan_version VARCHAR(32) DEFAULT 'V1';
      ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS cycle_number INT DEFAULT 1;
      ALTER TABLE ai_recommendations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    // 4. Add index for incident cycle queries
    await query(`
      CREATE INDEX IF NOT EXISTS idx_orch_plans_incident_cycle 
      ON orchestration_plans(incident_id, cycle_number, created_at DESC);
    `);

    console.log('[Migration] Continuous Orchestration schema enhancement completed successfully.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Failed Continuous Orchestration migration:', err.message);
    throw err;
  }
}

// Auto-run if executed directly
if (process.argv[1]?.includes('migrate_continuous_orchestration')) {
  runContinuousOrchestrationMigration()
    .then(() => pool.end())
    .catch(() => pool.end());
}
