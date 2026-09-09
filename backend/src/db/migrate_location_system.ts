// ============================================================
// NEXUS RESQ — MIGRATION: PRODUCTION LOCATION SYSTEM SCHEMA
// ============================================================
import { query, pool } from './index';

export async function runLocationSystemMigration(): Promise<boolean> {
  console.log('[Migration] Starting Production Location System database schema upgrade...');

  try {
    // 1. Extend emergency_requests table with device vs incident location & address metadata
    await query(`
      ALTER TABLE emergency_requests
      ADD COLUMN IF NOT EXISTS device_latitude NUMERIC(10, 6),
      ADD COLUMN IF NOT EXISTS device_longitude NUMERIC(10, 6),
      ADD COLUMN IF NOT EXISTS device_accuracy_meters NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS device_location_timestamp TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS incident_latitude NUMERIC(10, 6),
      ADD COLUMN IF NOT EXISTS incident_longitude NUMERIC(10, 6),
      ADD COLUMN IF NOT EXISTS incident_accuracy_meters NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS formatted_address TEXT,
      ADD COLUMN IF NOT EXISTS place_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS village VARCHAR(100),
      ADD COLUMN IF NOT EXISTS locality VARCHAR(100),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS district VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS postal_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS location_source VARCHAR(50) DEFAULT 'gps',
      ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS location_confidence NUMERIC(5, 2),
      ADD COLUMN IF NOT EXISTS location_resolved_at TIMESTAMPTZ;
    `);

    // Backfill device_latitude / incident_latitude from existing latitude / longitude if present
    await query(`
      UPDATE emergency_requests
      SET 
        device_latitude = COALESCE(device_latitude, latitude),
        device_longitude = COALESCE(device_longitude, longitude),
        incident_latitude = COALESCE(incident_latitude, latitude),
        incident_longitude = COALESCE(incident_longitude, longitude),
        formatted_address = COALESCE(formatted_address, location),
        location_resolved_at = COALESCE(location_resolved_at, created_at)
      WHERE latitude IS NOT NULL;
    `);

    // 2. Extend incidents table with address components & verification
    await query(`
      ALTER TABLE incidents
      ADD COLUMN IF NOT EXISTS place_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS formatted_address TEXT,
      ADD COLUMN IF NOT EXISTS village VARCHAR(100),
      ADD COLUMN IF NOT EXISTS locality VARCHAR(100),
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS district VARCHAR(100),
      ADD COLUMN IF NOT EXISTS state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS postal_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS country VARCHAR(100),
      ADD COLUMN IF NOT EXISTS location_source VARCHAR(50) DEFAULT 'gps',
      ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT FALSE;
    `);

    // Backfill incidents formatted_address from location
    await query(`
      UPDATE incidents
      SET formatted_address = COALESCE(formatted_address, location)
      WHERE location IS NOT NULL AND formatted_address IS NULL;
    `);

    // 3. Create index for place_id lookups
    await query(`
      CREATE INDEX IF NOT EXISTS idx_er_place_id ON emergency_requests(place_id);
      CREATE INDEX IF NOT EXISTS idx_inc_place_id ON incidents(place_id);
    `);

    console.log('[Migration] Production Location System schema upgrade completed successfully.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Location System migration failed:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_location_system')) {
  runLocationSystemMigration()
    .then(() => pool.end())
    .catch(() => pool.end());
}
