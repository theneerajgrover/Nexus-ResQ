import { pool } from '../db';

async function inspect() {
  const tables = [
    'incidents',
    'emergency_requests',
    'orchestration_plans',
    'approvals',
    'missions',
    'responders',
    'dispatch_records',
    'dispatches',
    'ai_recommendations',
    'agent_execution_records',
    'incident_status_history',
    'notifications',
    'audit_logs'
  ];

  for (const t of tables) {
    const res = await pool.query(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns 
       WHERE table_name = $1 
       ORDER BY ordinal_position`,
      [t]
    );
    console.log(`\n=== TABLE: ${t} ===`);
    if (res.rows.length === 0) {
      console.log('DOES NOT EXIST');
    } else {
      console.log(res.rows.map((r: any) => `${r.column_name} (${r.data_type})`).join(', '));
    }
  }

  const fkeys = await pool.query(`
    SELECT
      tc.table_name, kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule, rc.update_rule
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY';
  `);
  console.log('\n=== FOREIGN KEYS ===');
  console.log(fkeys.rows.map((r: any) => `${r.table_name}.${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`).join('\n'));

  process.exit(0);
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
