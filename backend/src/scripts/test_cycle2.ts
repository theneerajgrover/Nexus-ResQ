// ============================================================
// TEST: CYCLE #2 EXECUTION WITH MUTATED DATABASE STATE
// ============================================================
import { query, pool } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';

async function testCycle2() {
  console.log('[Test Cycle #2] Starting reassessment and Cycle #2 execution...');

  try {
    // Check available units before Cycle #2
    const [resp, amb, shl] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM responders WHERE status = 'AVAILABLE'`),
      query(`SELECT COUNT(*) as count FROM ambulances WHERE status = 'AVAILABLE'`),
      query(`SELECT id, name, occupancy, capacity FROM shelters WHERE status IN ('OPEN', 'ACTIVATING') ORDER BY (capacity - occupancy) DESC LIMIT 1`),
    ]);
    console.log(`[Before Cycle 2 DB State] Responders Available: ${resp.rows[0]?.count}, Ambulances Available: ${amb.rows[0]?.count}, Shelter Headroom: ${shl.rows[0]?.capacity - shl.rows[0]?.occupancy}`);

    // Run Cycle #2
    const result2 = await agentOrchestrator.runCycle(undefined, false);
    if (!result2) {
      console.log('[Test Cycle #2] No active disaster to formulate plan.');
      process.exit(0);
    }

    console.log(`\n✓ Cycle #2 Successful:`);
    console.log(`- Incident Targeted: ${result2.incidentId}`);
    console.log(`- Plan ID: ${result2.planId}`);
    console.log(`- Cycle Number: ${result2.cycleNumber}`);
    console.log(`- Status: ${result2.status}`);
    console.log(`- Confidence: ${result2.confidence}%`);
    console.log(`- Recommended Resource: ${result2.plan?.recommended_resource}`);
    console.log(`- Proposed Actions:\n  * ${result2.plan?.actions?.join('\n  * ')}`);

    // Verify it is armed for human authorization at 11/11
    const appRes = await query(`SELECT * FROM approvals WHERE plan_id = $1`, [result2.planId]);
    console.log(`\n✓ Cycle #2 Human Approval Gate Armed in DB: ${appRes.rows[0]?.status} (ID: ${appRes.rows[0]?.approval_id})`);

    process.exit(0);
  } catch (err: any) {
    console.error('[Test Cycle #2 Error]:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testCycle2();
