// ============================================================
// NEXUS RESQ — MIGRATION: RESOURCE MANAGER SELF-EMERGENCY
// ============================================================
import { query, pool } from './index';

export async function runResourceManagerEmergencyMigration() {
  console.log('[Migration] Starting Resource Manager Self-Emergency schema migration...');

  try {
    // Create resource_manager_emergencies table
    await query(`
      CREATE TABLE IF NOT EXISTS resource_manager_emergencies (
        id VARCHAR(64) PRIMARY KEY,
        manager_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        location VARCHAR(255) NOT NULL,
        emergency_type VARCHAR(50) NOT NULL CHECK (emergency_type IN ('FLOOD', 'FIRE', 'STRUCTURAL', 'MEDICAL', 'EARTHQUAKE', 'SUPPLY_DEFICIT', 'OTHER')),
        severity VARCHAR(50) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
        status VARCHAR(50) NOT NULL DEFAULT 'EMERGENCY_AFFECTED' CHECK (status IN ('EMERGENCY_AFFECTED', 'REQUESTING_ASSISTANCE', 'RESTORED')),
        description TEXT,
        requested_resource_type VARCHAR(100) NOT NULL,
        requested_quantity INT NOT NULL DEFAULT 1,
        reserved_local_quantity INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        restored_at TIMESTAMPTZ,
        restored_by VARCHAR(100)
      );
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_rme_location ON resource_manager_emergencies(location);
      CREATE INDEX IF NOT EXISTS idx_rme_status ON resource_manager_emergencies(status);
      CREATE INDEX IF NOT EXISTS idx_rme_created_at ON resource_manager_emergencies(created_at DESC);
    `);

    console.log('[Migration] resource_manager_emergencies table and indexes successfully verified.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Failed Resource Manager Emergency schema migration:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_resource_manager_emergency')) {
  runResourceManagerEmergencyMigration()
    .then(() => pool.end())
    .catch(() => pool.end());
}
