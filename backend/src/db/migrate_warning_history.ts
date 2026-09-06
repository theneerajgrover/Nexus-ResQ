// ============================================================
// NEXUS RESQ — MIGRATION: WARNINGS, HISTORY & APPROVAL LIFECYCLE
// ============================================================
import { query, pool } from './index';

export async function runWarningHistoryMigration() {
  console.log('[Migration] Starting Warnings, History & Approval schema enhancements...');

  try {
    // 1. Update alerts table to support operational warnings
    await query(`
      ALTER TABLE alerts
      ADD COLUMN IF NOT EXISTS created_by VARCHAR(100) DEFAULT 'Command Authority',
      ADD COLUMN IF NOT EXISTS warning_type VARCHAR(50) DEFAULT 'HAZARD_WARNING',
      ADD COLUMN IF NOT EXISTS target_coordinates JSONB DEFAULT NULL;
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_category ON alerts(category);
      CREATE INDEX IF NOT EXISTS idx_alerts_issued_at ON alerts(issued_at DESC);
    `);

    // 2. Enhance ai_recommendations table with complete approval lifecycle columns
    await query(`
      ALTER TABLE ai_recommendations
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
      ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS execution_status VARCHAR(50) DEFAULT 'PENDING';
    `);

    // 3. Ensure emergency_requests has proper indexes for history lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_emergency_requests_user_id ON emergency_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_emergency_requests_created_at ON emergency_requests(created_at DESC);
    `);

    // 4. Ensure dispatch_records has proper indexes for responder/operational history
    await query(`
      CREATE INDEX IF NOT EXISTS idx_dispatch_records_created_at ON dispatch_records(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_missions_responder_id ON missions(responder_id);
      CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
    `);

    console.log('[Migration] Warnings, History & Approval schema enhancements completed successfully.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Failed Warning & History schema upgrade:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_warning_history')) {
  runWarningHistoryMigration()
    .then(() => pool.end())
    .catch(() => pool.end());
}
