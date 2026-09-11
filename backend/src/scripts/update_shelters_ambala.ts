// Update SHL-01 and SHL-02 shelters from Delhi to Ambala
import { pool, query } from '../db';

async function main() {
  // Update SHL-01: Central Community Center → Ambala Safe Zone
  const r1 = await query(
    `UPDATE shelters SET name = 'Ambala Safe Zone', address = 'Ambala, Haryana, India', latitude = 30.3782, longitude = 76.7767 WHERE id = 'SHL-01'`
  );
  console.log(`SHL-01 updated: ${r1.rowCount} row(s)`);

  // Update SHL-02: Riverside High School → Ambala Relief Camp
  const r2 = await query(
    `UPDATE shelters SET name = 'Ambala Relief Camp', address = 'Near Railway Station, Ambala Cantt, Haryana, India', latitude = 30.3598, longitude = 76.8282 WHERE id = 'SHL-02'`
  );
  console.log(`SHL-02 updated: ${r2.rowCount} row(s)`);

  // Verify
  const verify = await query(`SELECT id, name, address, latitude, longitude, status FROM shelters WHERE id IN ('SHL-01', 'SHL-02')`);
  console.log('\nVerification:');
  verify.rows.forEach((r: any) => console.log(`  ${r.id}: ${r.name} @ (${r.latitude}, ${r.longitude}) [${r.status}]`));

  await pool.end();
}

main().catch(console.error);
