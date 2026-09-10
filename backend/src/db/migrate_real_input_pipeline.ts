// ============================================================
// NEXUS RESQ — MIGRATION: REAL-INPUT DISASTER PIPELINE
// Common Incident Model, Multi-Source Reports & Evidence Schema
// ============================================================
import { query, pool } from './index';

export async function runRealInputPipelineMigration() {
  console.log('[Migration] Starting Real-Input Disaster Pipeline schema migration...');

  try {
    // 1. Extend incidents table with normalized common input fields
    await query(`
      ALTER TABLE incidents 
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'CITIZEN_SOS',
      ADD COLUMN IF NOT EXISTS source_reference VARCHAR(100),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS affected_people INT DEFAULT 1,
      ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'UNVERIFIED',
      ADD COLUMN IF NOT EXISTS category VARCHAR(50);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_source ON incidents(source);
      CREATE INDEX IF NOT EXISTS idx_incidents_verification_status ON incidents(verification_status);
    `);

    // 1b. Expand incidents_type_check to support all disaster types
    await query(`
      ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_type_check;
      ALTER TABLE incidents ADD CONSTRAINT incidents_type_check 
        CHECK (type IN ('STRUCTURAL', 'FLOOD', 'MEDICAL', 'FIRE', 'EVACUATION', 'EARTHQUAKE', 'CYCLONE', 'ACCIDENT', 'HAZMAT', 'OTHER'));
    `);

    // 2. Create incident_reports table for multi-source evidence and disaster intelligence
    await query(`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id VARCHAR(64) PRIMARY KEY,
        incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE SET NULL,
        source VARCHAR(50) NOT NULL CHECK (source IN ('CITIZEN_SOS', 'CITIZEN_REPORT', 'PORTAL_REPORT', 'AUTHORITY_REPORT', 'SENSOR', 'EXTERNAL_ALERT')),
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
        reporter_name VARCHAR(255),
        reporter_phone VARCHAR(50),
        reporter_role VARCHAR(50),
        disaster_type VARCHAR(50) NOT NULL,
        severity VARCHAR(50) DEFAULT 'HIGH' CHECK (severity IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
        description TEXT,
        location VARCHAR(255) NOT NULL,
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        affected_people INT DEFAULT 1,
        media_url TEXT,
        status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'CORRELATED', 'VERIFIED', 'DISMISSED')),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_incident_reports_incident ON incident_reports(incident_id);
      CREATE INDEX IF NOT EXISTS idx_incident_reports_source ON incident_reports(source);
      CREATE INDEX IF NOT EXISTS idx_incident_reports_created ON incident_reports(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incident_reports_disaster ON incident_reports(disaster_type);
    `);

    console.log('[Migration] Real-Input Disaster Pipeline schema successfully migrated.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Real-Input Disaster Pipeline migration failed:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_real_input_pipeline')) {
  runRealInputPipelineMigration()
    .then(() => {
      console.log('[Migration] Completed successfully.');
      pool.end();
    })
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      pool.end();
    });
}
