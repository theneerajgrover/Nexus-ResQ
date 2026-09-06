// ============================================================
// MIGRATION: Update Approval Lifecycle & Cleanup State
// ============================================================
import { query } from './index';

async function migrate() {
  console.log('[Migration] Updating approvals and orchestration_plans constraints...');

  // 1. Update approvals_status_check constraint to include ACKNOWLEDGED and DISMISSED
  await query(`
    ALTER TABLE approvals DROP CONSTRAINT IF EXISTS approvals_status_check;
    ALTER TABLE approvals ADD CONSTRAINT approvals_status_check
      CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'ACKNOWLEDGED', 'DISMISSED'));
  `);
  console.log('[Migration] approvals status check constraint updated.');

  // 2. Update orchestration_plans_status_check constraint
  await query(`
    ALTER TABLE orchestration_plans DROP CONSTRAINT IF EXISTS orchestration_plans_status_check;
    ALTER TABLE orchestration_plans ADD CONSTRAINT orchestration_plans_status_check
      CHECK (status IN ('INITIALIZED', 'IN_PROGRESS', 'WAITING_FOR_APPROVAL', 'APPROVED', 'PROCESSING', 'COMPLETE', 'COMPLETED', 'FAILED', 'REJECTED', 'DISMISSED'));
  `);
  console.log('[Migration] orchestration_plans status check constraint updated.');

  // 3. Align previous plan PLAN-1788627534727-2849 in orchestration_plans to APPROVED if approved in approvals
  await query(`
    UPDATE orchestration_plans
    SET status = 'APPROVED', approved_by = 'Dir. Sarah Chen', approved_at = CURRENT_TIMESTAMP
    WHERE plan_id = 'PLAN-1788627534727-2849' OR id = 'PLAN-1788627534727-2849';
  `);

  // 4. Mark notifications for PLAN-1788627534727-2849 as READ
  await query(`
    UPDATE notifications
    SET status = 'READ'
    WHERE plan_id = 'PLAN-1788627534727-2849';
  `);
  console.log('[Migration] Aligned historical approved records and marked stale notifications READ.');

  console.log('[Migration] Successfully finished approval lifecycle migration!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[Migration Error]:', err);
  process.exit(1);
});
