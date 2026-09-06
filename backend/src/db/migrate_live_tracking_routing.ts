// ============================================================
// NEXUS RESQ — MIGRATION: LIVE TRACKING, ROUTING & STATUS LIFECYCLE
// ============================================================
import { query, pool } from './index';

export async function runLiveTrackingRoutingMigration() {
  console.log('[Migration] Starting Live Tracking & Routing database schema upgrade...');

  try {
    // 1. Create location_updates table
    await query(`
      CREATE TABLE IF NOT EXISTS location_updates (
        id VARCHAR(64) PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL, -- 'responder' | 'citizen' | 'ambulance' | 'vehicle'
        entity_id VARCHAR(64) NOT NULL,
        incident_id VARCHAR(64),
        request_id VARCHAR(64),
        latitude NUMERIC(10, 6) NOT NULL,
        longitude NUMERIC(10, 6) NOT NULL,
        accuracy NUMERIC(10, 2),
        heading NUMERIC(6, 2),
        speed NUMERIC(6, 2),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_loc_entity ON location_updates(entity_type, entity_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_loc_incident ON location_updates(incident_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_loc_request ON location_updates(request_id, created_at DESC);
    `);

    // 2. Create incident_status_history table
    await query(`
      CREATE TABLE IF NOT EXISTS incident_status_history (
        id VARCHAR(64) PRIMARY KEY,
        request_id VARCHAR(64),
        incident_id VARCHAR(64),
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        actor VARCHAR(100) NOT NULL,
        responder_id VARCHAR(64),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ish_request ON incident_status_history(request_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_ish_incident ON incident_status_history(incident_id, created_at DESC);
    `);

    // 3. Create active_routes table
    await query(`
      CREATE TABLE IF NOT EXISTS active_routes (
        id VARCHAR(64) PRIMARY KEY,
        incident_id VARCHAR(64),
        request_id VARCHAR(64),
        responder_id VARCHAR(64),
        origin_lat NUMERIC(10, 6) NOT NULL,
        origin_lng NUMERIC(10, 6) NOT NULL,
        destination_lat NUMERIC(10, 6) NOT NULL,
        destination_lng NUMERIC(10, 6) NOT NULL,
        route_label VARCHAR(255) NOT NULL,
        distance_meters NUMERIC(12, 2) NOT NULL,
        duration_seconds NUMERIC(12, 2) NOT NULL,
        polyline TEXT,
        geometry JSONB,
        steps JSONB DEFAULT '[]'::jsonb,
        safety_status VARCHAR(50) NOT NULL DEFAULT 'SAFE' CHECK (safety_status IN ('SAFE', 'CAUTION', 'HIGH_RISK', 'BLOCKED')),
        safety_score INT DEFAULT 100,
        risk_factors TEXT[] DEFAULT '{}',
        alternatives JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        recalculation_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ar_incident_active ON active_routes(incident_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_ar_request_active ON active_routes(request_id, is_active);
    `);

    // 4. Extend emergency_requests columns
    await query(`
      ALTER TABLE emergency_requests
      ADD COLUMN IF NOT EXISTS incident_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS assigned_responder_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS accuracy NUMERIC(10, 2);
    `);

    // 5. Extend responders columns
    await query(`
      ALTER TABLE responders
      ADD COLUMN IF NOT EXISTS accuracy NUMERIC(10, 2),
      ADD COLUMN IF NOT EXISTS heading NUMERIC(6, 2),
      ADD COLUMN IF NOT EXISTS speed NUMERIC(6, 2);
    `);

    // 6. Extend incidents columns
    await query(`
      ALTER TABLE incidents
      ADD COLUMN IF NOT EXISTS request_id VARCHAR(64),
      ADD COLUMN IF NOT EXISTS assigned_responder_id VARCHAR(64);
    `);

    // 7. Update status check constraints to support 8-step lifecycle without breaking existing values
    // 7a. emergency_requests
    await query(`
      ALTER TABLE emergency_requests DROP CONSTRAINT IF EXISTS emergency_requests_status_check;
      ALTER TABLE emergency_requests ADD CONSTRAINT emergency_requests_status_check 
        CHECK (status IN (
          'REQUESTED', 'ACCEPTED', 'ASSIGNED', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED', 'COMPLETED',
          'RECEIVED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED', 'CANCELLED'
        ));
    `);

    // 7b. missions
    await query(`
      ALTER TABLE missions DROP CONSTRAINT IF EXISTS missions_status_check;
      ALTER TABLE missions ADD CONSTRAINT missions_status_check 
        CHECK (status IN (
          'AVAILABLE', 'REQUESTED', 'ACCEPTED', 'ASSIGNED', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED', 'COMPLETED',
          'EN ROUTE', 'ON SCENE', 'ASSISTING'
        ));
    `);

    // 7c. responders
    await query(`
      ALTER TABLE responders DROP CONSTRAINT IF EXISTS responders_status_check;
      ALTER TABLE responders ADD CONSTRAINT responders_status_check 
        CHECK (status IN (
          'AVAILABLE', 'REQUESTED', 'ACCEPTED', 'ASSIGNED', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED', 'COMPLETED',
          'EN ROUTE', 'ON SCENE', 'ASSISTING', 'MAINTENANCE', 'OFFLINE'
        ));
    `);

    // 7d. incidents
    await query(`
      ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
      ALTER TABLE incidents ADD CONSTRAINT incidents_status_check 
        CHECK (status IN (
          'ACTIVE', 'RESPONDING', 'PENDING', 'CONTAINED', 'RESOLVED',
          'REQUESTED', 'ACCEPTED', 'ASSIGNED', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED', 'COMPLETED'
        ));
    `);

    console.log('[Migration] Live Tracking & Routing schema upgrade completed successfully.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Failed Live Tracking & Routing schema upgrade:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_live_tracking_routing')) {
  runLiveTrackingRoutingMigration()
    .then(() => pool.end())
    .catch(() => pool.end());
}
