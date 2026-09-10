// ============================================================
// NEXUS RESQ — MIGRATION: END-TO-END CANONICAL LIFECYCLE
// Safely adds plan_id & dispatch_id to missions and idempotency_key to emergency_requests
// ============================================================
import { query, pool } from './index';

export async function runE2ELifecycleMigration(): Promise<boolean> {
  console.log('[Migration] Checking End-to-End Canonical Lifecycle schema...');

  try {
    // 1. Add plan_id and dispatch_id columns to missions table if not exists
    await query(`
      ALTER TABLE missions 
      ADD COLUMN IF NOT EXISTS plan_id VARCHAR(100);
    `);

    await query(`
      ALTER TABLE missions 
      ADD COLUMN IF NOT EXISTS dispatch_id VARCHAR(100);
    `);

    // 2. Add idempotency_key to emergency_requests table if not exists
    await query(`
      ALTER TABLE emergency_requests 
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);
    `);

    // 3. Create indexes for efficient querying
    await query(`
      CREATE INDEX IF NOT EXISTS idx_missions_plan_id 
      ON missions(plan_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_missions_dispatch_id 
      ON missions(dispatch_id);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_emergency_requests_idempotency 
      ON emergency_requests(idempotency_key);
    `);

    console.log('[Migration] End-to-End Canonical Lifecycle schema is up to date.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] End-to-End Lifecycle migration failed:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_e2e_lifecycle')) {
  runE2ELifecycleMigration()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
