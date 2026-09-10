import { query } from './index';

async function check() {
  const res = await query(`
    SELECT conname, pg_get_constraintdef(oid) as def 
    FROM pg_constraint 
    WHERE conrelid = 'incidents'::regclass
  `);
  console.log('CONSTRAINTS:', res.rows);
  process.exit(0);
}

check();
