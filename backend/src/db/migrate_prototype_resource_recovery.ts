// ============================================================
// NEXUS RESQ — MIGRATION: PROTOTYPE RESOURCE AUTO-RELEASE LIFECYCLE
// ============================================================
import { query, pool } from './index';

export async function runPrototypeResourceRecoveryMigration(): Promise<boolean> {
  console.log('[Migration] Checking Prototype Resource Auto-Release schema...');

  try {
    // 1. Add non-destructive tracking columns to dispatch_records
    await query(`
      ALTER TABLE dispatch_records 
      ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_prototype_released BOOLEAN DEFAULT FALSE;
    `);

    // 2. Ensure ambulances.last_update accommodates full destination descriptions
    await query(`
      ALTER TABLE ambulances 
      ALTER COLUMN last_update TYPE VARCHAR(255);
    `);

    // 3. Create index for high-performance idempotent querying
    await query(`
      CREATE INDEX IF NOT EXISTS idx_dispatch_records_prototype_release 
      ON dispatch_records(is_prototype_released, created_at);
    `);

    console.log('[Migration] Prototype Resource Auto-Release schema is up to date.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Prototype Resource Auto-Release migration failed:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_prototype_resource_recovery')) {
  runPrototypeResourceRecoveryMigration()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
