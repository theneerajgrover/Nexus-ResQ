// ============================================================
// NEXUS RESQ — POSTGRESQL DATABASE CLIENT
// ============================================================
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend folder reliably
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.PGUSER || 'postgres'}:${encodeURIComponent(process.env.PGPASSWORD || 'postgres')}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'nexus_resq_db'}`;

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected idle client error on PostgreSQL pool:', err.message);
});

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 50) {
      console.log(`[DB] Executed query in ${duration}ms:`, { text: text.slice(0, 100), count: res.rowCount });
    }
    return res;
  } catch (err: any) {
    console.error(`[DB Error] Failed to execute query: "${text.slice(0, 100)}" —`, err.message);
    throw err;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}

export async function testConnection(): Promise<{ connected: boolean; error?: string }> {
  try {
    const res = await pool.query('SELECT current_database(), current_user, version()');
    const dbName = res.rows[0].current_database;
    const user = res.rows[0].current_user;
    console.log(`[DB] Connected to PostgreSQL successfully [Database: ${dbName}, User: ${user}]`);
    return { connected: true };
  } catch (err: any) {
    console.warn(`[DB] PostgreSQL connection check warning: ${err.message}`);
    return { connected: false, error: err.message };
  }
}
