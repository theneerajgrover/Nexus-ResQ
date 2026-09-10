// ============================================================
// NEXUS RESQ — MIGRATION: SHELTER INCIDENT LINK
// Safely adds shelter_id column to incidents table for direct relational linking
// ============================================================
import { query, pool } from './index';

export async function runShelterIncidentLinkMigration(): Promise<boolean> {
  console.log('[Migration] Checking Shelter-Incident Link schema...');

  try {
    // 1. Add shelter_id column if not exists
    await query(`
      ALTER TABLE incidents 
      ADD COLUMN IF NOT EXISTS shelter_id VARCHAR(64) REFERENCES shelters(id) ON DELETE SET NULL;
    `);

    // 2. Create index for efficient querying
    await query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_shelter_id 
      ON incidents(shelter_id);
    `);

    // 3. Expand incident_reports_source_check to include RESOURCE_MANAGER
    await query(`
      ALTER TABLE incident_reports DROP CONSTRAINT IF EXISTS incident_reports_source_check;
      ALTER TABLE incident_reports ADD CONSTRAINT incident_reports_source_check 
        CHECK (source IN ('CITIZEN_SOS', 'CITIZEN_REPORT', 'PORTAL_REPORT', 'AUTHORITY_REPORT', 'SENSOR', 'EXTERNAL_ALERT', 'RESOURCE_MANAGER'));
    `);

    console.log('[Migration] Shelter-Incident Link schema is up to date.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Shelter-Incident Link migration failed:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_shelter_incident_link')) {
  runShelterIncidentLinkMigration()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      pool.end();
    });
}
