// ============================================================
// NEXUS RESQ — MIGRATION: AUTH & EMERGENCY SCHEMA ENHANCEMENT
// ============================================================
import bcrypt from 'bcryptjs';
import { query, pool } from './index';

export async function runAuthEmergencyMigration() {
  console.log('[Migration] Starting Auth & Emergency database schema upgrade...');

  try {
    // 1. Update users table columns
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);

    await query(`
      UPDATE users 
      SET phone_number = phone 
      WHERE phone_number IS NULL AND phone IS NOT NULL;
    `);

    await query(`
      UPDATE users 
      SET is_active = (status = 'active') 
      WHERE is_active IS NULL;
    `);

    // 2. Set default secure password for existing seed institutional users
    const defaultPassword = 'password123';
    const salt = bcrypt.genSaltSync(10);
    const defaultHash = bcrypt.hashSync(defaultPassword, salt);

    const seedEmails = [
      'citizen@nexusresq.org',
      'responder@nexusresq.org',
      'authority@nexusresq.org',
      'resources@nexusresq.org'
    ];

    for (const email of seedEmails) {
      await query(
        `UPDATE users 
         SET password_hash = $1, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE email = $2 AND (password_hash IS NULL OR password_hash = '')`,
        [defaultHash, email]
      );
    }

    // 3. Update emergency_requests table columns
    await query(`
      ALTER TABLE emergency_requests
      ADD COLUMN IF NOT EXISTS requester_ip VARCHAR(100),
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'WEB_EMERGENCY',
      ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS assistance_requested TEXT[];
    `);

    await query(`
      UPDATE emergency_requests
      SET requester_name = contact_name
      WHERE requester_name IS NULL AND contact_name IS NOT NULL;
    `);

    await query(`
      UPDATE emergency_requests
      SET phone_number = contact_phone
      WHERE phone_number IS NULL AND contact_phone IS NOT NULL;
    `);

    await query(`
      UPDATE emergency_requests
      SET assistance_requested = assistance_types
      WHERE assistance_requested IS NULL AND assistance_types IS NOT NULL;
    `);

    console.log('[Migration] Auth & Emergency schema upgrade completed successfully.');
    return true;
  } catch (err: any) {
    console.error('[Migration Error] Failed Auth & Emergency schema upgrade:', err.message);
    throw err;
  }
}

// Self-executing if run directly
if (process.argv[1]?.includes('migrate_auth_emergency')) {
  runAuthEmergencyMigration()
    .then(() => pool.end())
    .catch(() => pool.end());
}
