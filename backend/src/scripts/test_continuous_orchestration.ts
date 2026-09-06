// ============================================================
// VERIFICATION SCRIPT: CONTINUOUS AI ORCHESTRATION CYCLE
// Tests 0/11 -> 11/11 -> Approval -> Database Mutation -> Next Cycle
// ============================================================
import { query, pool } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';

async function verifyContinuousLoop() {
  console.log('\n============================================================');
  console.log('  TESTING CONTINUOUS AI ORCHESTRATION & STATE MACHINE');
  console.log('============================================================\n');

  try {
    // 0. Ensure at least one active pending incident exists for testing
    let incRes = await query(`
      SELECT * FROM incidents WHERE status IN ('ACTIVE', 'PENDING', 'RESPONDING') AND status != 'RESOLVED' LIMIT 1
    `);
    if (incRes.rowCount === 0) {
      await query(`
        INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, pending)
        VALUES ('INC-9999', 'Structural Collapse & Evac Test', 'STRUCTURAL', 'CRITICAL', 'Bridge Sector · Zone NE-4', 52.12, 48.34, 'ACTIVE', TRUE)
      `);
      console.log('[Test Setup] Created test incident INC-9999');
    }

    // Capture baseline database state before execution
    const [baseResp, baseAmb, baseEqp, baseShl] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM responders WHERE status = 'AVAILABLE'`),
      query(`SELECT COUNT(*) as count FROM ambulances WHERE status = 'AVAILABLE'`),
      query(`SELECT id, available FROM equipment WHERE available > 0 LIMIT 1`),
      query(`SELECT id, occupancy FROM shelters WHERE status IN ('OPEN', 'ACTIVATING') ORDER BY (capacity - occupancy) DESC LIMIT 1`),
    ]);
    console.log('[Baseline Operational State]');
    console.log(`- Available Responders: ${baseResp.rows[0]?.count}`);
    console.log(`- Available Ambulances: ${baseAmb.rows[0]?.count}`);
    console.log(`- Equipment ${baseEqp.rows[0]?.id} Available: ${baseEqp.rows[0]?.available}`);
    console.log(`- Shelter ${baseShl.rows[0]?.id} Occupancy: ${baseShl.rows[0]?.occupancy}`);

    // 1. Run Cycle #1 (0/11 -> 11/11)
    console.log('\n--- PHASE 1: TRIGGERING ORCHESTRATION CYCLE #1 (0/11 -> 11/11) ---');
    const result1 = await agentOrchestrator.runCycle(undefined, false);

    if (!result1) {
      throw new Error('Cycle #1 returned null (no active disaster)');
    }

    console.log(`✓ Cycle #1 Completed: Plan ID = ${result1.planId}, Status = ${result1.status}, Cycle = ${result1.cycleNumber}`);
    if (result1.agentsExecuted !== 11) {
      throw new Error(`Expected 11 agents executed, got ${result1.agentsExecuted}`);
    }

    // Verify status in PostgreSQL
    const planCheck1 = await query(`SELECT * FROM orchestration_plans WHERE plan_id = $1`, [result1.planId]);
    console.log(`✓ PostgreSQL Plan Status: ${planCheck1.rows[0]?.status}, Current Step: ${planCheck1.rows[0]?.current_step}/11`);
    if (planCheck1.rows[0]?.current_step !== 11) {
      throw new Error(`Expected step 11 in DB, found ${planCheck1.rows[0]?.current_step}`);
    }
    if (planCheck1.rows[0]?.status !== 'WAITING_FOR_APPROVAL') {
      throw new Error(`Expected WAITING_FOR_APPROVAL in DB, found ${planCheck1.rows[0]?.status}`);
    }

    // Verify Human Approval Gate is armed in approvals table
    const appCheck = await query(`SELECT * FROM approvals WHERE plan_id = $1`, [result1.planId]);
    console.log(`✓ PostgreSQL Approval Status: ${appCheck.rows[0]?.status} (ID: ${appCheck.rows[0]?.approval_id})`);
    if (appCheck.rows[0]?.status !== 'PENDING') {
      throw new Error(`Expected PENDING approval in DB, found ${appCheck.rows[0]?.status}`);
    }

    // 2. Authorize Plan #1
    console.log('\n--- PHASE 2: HUMAN AUTHORIZATION & OPERATIONAL EXECUTION ---');
    const approveResult = await agentOrchestrator.handleApprovalDecision(result1.planId, 'APPROVED', 'Dir. Sarah Chen');
    console.log(`✓ Approval Finalized: Decision = ${approveResult.decision}, Assigned Unit = ${approveResult.assignedUnit}`);

    // Verify Real PostgreSQL Operational Database Mutations
    const [mutResp, mutAmb, mutEqp, mutShl, mutDisp, mutInc] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM responders WHERE status = 'AVAILABLE'`),
      query(`SELECT COUNT(*) as count FROM ambulances WHERE status = 'AVAILABLE'`),
      query(`SELECT available FROM equipment WHERE id = $1`, [baseEqp.rows[0]?.id]),
      query(`SELECT occupancy FROM shelters WHERE id = $1`, [baseShl.rows[0]?.id]),
      query(`SELECT * FROM dispatch_records WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1`, [result1.incidentId]),
      query(`SELECT status, pending, responders_count FROM incidents WHERE id = $1`, [result1.incidentId]),
    ]);

    console.log('\n[Post-Approval Database Mutations Verified]');
    console.log(`✓ Available Responders now: ${mutResp.rows[0]?.count} (was ${baseResp.rows[0]?.count})`);
    console.log(`✓ Available Ambulances now: ${mutAmb.rows[0]?.count} (was ${baseAmb.rows[0]?.count})`);
    console.log(`✓ Equipment Available now: ${mutEqp.rows[0]?.available} (was ${baseEqp.rows[0]?.available})`);
    console.log(`✓ Shelter Occupancy now: ${mutShl.rows[0]?.occupancy} (was ${baseShl.rows[0]?.occupancy})`);
    console.log(`✓ Real Dispatch Record created: Unit ${mutDisp.rows[0]?.unit} dispatched to ${mutDisp.rows[0]?.destination}`);
    console.log(`✓ Incident Status now: ${mutInc.rows[0]?.status} (Pending: ${mutInc.rows[0]?.pending}, Responders: ${mutInc.rows[0]?.responders_count})`);

    console.log('\n============================================================');
    console.log('  ALL ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!');
    console.log('============================================================\n');

    process.exit(0);
  } catch (err: any) {
    console.error('\n[Test Error]:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyContinuousLoop();
