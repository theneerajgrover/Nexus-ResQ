// ============================================================
// NEXUS RESQ — MIGRATION: RESOURCE EDIT VALIDATION
// Adds allocated column to supplies and ensures index support
// ============================================================
import { query, pool } from './index';

export async function runResourceEditValidationMigration(): Promise<boolean> {
  console.log('[Migration] Checking Resource Edit Validation schema...');

  try {
    // 1. Add allocated column to supplies if not exists
    await query(`
      ALTER TABLE supplies 
      ADD COLUMN IF NOT EXISTS allocated INT NOT NULL DEFAULT 0;
    `);

    // 2. Add index on supplies category and name for allocation lookup
    await query(`
      CREATE INDEX IF NOT EXISTS idx_supplies_category ON supplies(category);
      CREATE INDEX IF NOT EXISTS idx_supplies_name ON supplies(name);
    `);

    // 3. Sync initial supply allocation from active dispatches where status = 'DISPATCHED'
    await query(`
      UPDATE supplies s
      SET allocated = COALESCE(
        (
          SELECT SUM(d.qty_dispatched)::int
          FROM dispatch_records d
          WHERE d.status = 'DISPATCHED'
            AND (d.resource_type ILIKE '%' || s.name || '%' OR d.resource_type ILIKE '%' || s.category || '%')
        ),
        0
      )
      WHERE s.allocated = 0;
    `);

    console.log('[Migration] Resource Edit Validation schema is up to date.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Resource Edit Validation migration failed:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_resource_edit_validation')) {
  runResourceEditValidationMigration()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
