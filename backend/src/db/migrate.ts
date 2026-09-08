// ============================================================
// NEXUS RESQ — DATABASE MIGRATION & SETUP SCRIPT
// ============================================================
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is always found regardless of working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Client } = pg;

let host = process.env.PGHOST || 'localhost';
let port = parseInt(process.env.PGPORT || '5432', 10);
let user = process.env.PGUSER || 'postgres';
let password = process.env.PGPASSWORD || 'postgres';
let targetDb = process.env.PGDATABASE || 'nexus_resq_db';

// Also parse DATABASE_URL if available
if (process.env.DATABASE_URL) {
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    if (dbUrl.hostname) host = dbUrl.hostname;
    if (dbUrl.port) port = parseInt(dbUrl.port, 10);
    if (dbUrl.username) user = decodeURIComponent(dbUrl.username);
    if (dbUrl.password) password = decodeURIComponent(dbUrl.password);
    if (dbUrl.pathname && dbUrl.pathname.length > 1) targetDb = dbUrl.pathname.replace(/^\//, '');
  } catch {}
}

export async function runMigration() {
  console.log(`[Migration] Initializing database migration for: ${targetDb}...`);

  // Step 1: Connect to server maintenance database 'postgres' to ensure nexus_resq_db exists
  const serverClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });

  try {
    await serverClient.connect();
    console.log('[Migration] Connected to PostgreSQL server.');

    const checkDbRes = await serverClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDb]
    );

    if (checkDbRes.rowCount === 0) {
      console.log(`[Migration] Database "${targetDb}" does not exist. Creating...`);
      // Note: CREATE DATABASE cannot run in a multi-command transaction block
      await serverClient.query(`CREATE DATABASE ${targetDb}`);
      console.log(`[Migration] Database "${targetDb}" created successfully.`);
    } else {
      console.log(`[Migration] Database "${targetDb}" already exists.`);
    }
  } catch (err: any) {
    console.error(`[Migration Error] Unable to check/create database "${targetDb}":`, err.message);
    console.warn(`[Migration Note] Please ensure PostgreSQL is running and credentials in .env are correct.`);
  } finally {
    await serverClient.end().catch(() => {});
  }

  // Step 2: Connect directly to nexus_resq_db to apply schema and seed
  const dbClient = new Client({
    host,
    port,
    user,
    password,
    database: targetDb,
  });

  try {
    await dbClient.connect();
    console.log(`[Migration] Connected to target database "${targetDb}".`);

    // Read and run schema.sql
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await dbClient.query(schemaSql);
      console.log('[Migration] Successfully executed schema.sql (all 18 tables verified).');
    } else {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    // Check if incidents table has any records; if empty, run seed.sql
    const countRes = await dbClient.query(`SELECT count(*)::int as count FROM incidents`);
    const count = countRes.rows[0]?.count || 0;

    if (count === 0) {
      const seedPath = path.resolve(__dirname, 'seed.sql');
      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await dbClient.query(seedSql);
        console.log('[Migration] Successfully executed seed.sql with initial operational data.');
      }
    } else {
      console.log(`[Migration] Database already contains ${count} operational incidents. Skipping seed.`);
    }

    // Step 4: Run auth & emergency schema enhancements
    const { runAuthEmergencyMigration } = await import('./migrate_auth_emergency');
    await runAuthEmergencyMigration();

    // Step 5: Run warnings, history & approval lifecycle schema enhancements
    const { runWarningHistoryMigration } = await import('./migrate_warning_history');
    await runWarningHistoryMigration();

    // Step 6: Run AI Orchestration & Human Approval schema enhancements
    const { runOrchestrationApprovalMigration } = await import('./migrate_orchestration_approval');
    await runOrchestrationApprovalMigration();

    // Step 7: Run Continuous Orchestration engine schema enhancements
    const { runContinuousOrchestrationMigration } = await import('./migrate_continuous_orchestration');
    await runContinuousOrchestrationMigration();

    // Step 8: Run Live Tracking & Routing schema enhancements
    const { runLiveTrackingRoutingMigration } = await import('./migrate_live_tracking_routing');
    await runLiveTrackingRoutingMigration();

    // List all tables created
    const tablesRes = await dbClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const tableNames = tablesRes.rows.map((r: any) => r.table_name);
    console.log(`[Migration] Verified ${tableNames.length} tables in "${targetDb}":\n - ${tableNames.join('\n - ')}`);

    return { success: true, tables: tableNames };
  } catch (err: any) {
    console.error(`[Migration Error] Failed to migrate database "${targetDb}":`, err.message);
    return { success: false, error: err.message };
  } finally {
    await dbClient.end().catch(() => {});
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].includes('migrate')) {
  runMigration().then((result) => {
    if (result.success) {
      console.log('[Migration] Database setup completed successfully.');
      process.exit(0);
    } else {
      console.error('[Migration] Database setup failed:', result.error);
      process.exit(1);
    }
  });
}
