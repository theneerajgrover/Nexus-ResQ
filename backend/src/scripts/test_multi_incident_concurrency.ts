// ============================================================
// NEXUS RESQ — MULTI-INCIDENT CONCURRENCY & INDEPENDENT APPROVAL TEST SUITE
// Validates 11-Agent Isolated Pipeline, Concurrent Approvals, Idempotency & DB State
// ============================================================
import { query, pool } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('NEXUS RESQ — MULTI-INCIDENT ORCHESTRATION & APPROVAL VALIDATION');
  console.log('============================================================\n');

  try {
    // ------------------------------------------------------------
    // TEST 1: Single incident 0/11 -> 11/11 -> PENDING HUMAN APPROVAL
    // ------------------------------------------------------------
    console.log('▶ TEST 1: Create incident -> 11 AI Agents execute -> 11/11 Complete -> PENDING HUMAN APPROVAL');
    const incId1 = `INC-TST1-${Date.now().toString().slice(-4)}`;
    await query(`
      INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, pending, responders_count)
      VALUES ($1, 'Chemical Fire North Sector', 'FIRE', 'CRITICAL', 'Chemical Storage Depot Alpha', 52.35, 48.72, 'ACTIVE', TRUE, 0)
    `, [incId1]);

    const result1 = await agentOrchestrator.runCycle(incId1, false);
    if (!result1) throw new Error('Test 1 failed: runCycle returned null');

    // Verify DB states for Plan 1
    const plan1Res = await query(`SELECT * FROM orchestration_plans WHERE plan_id = $1`, [result1.planId]);
    const app1Res = await query(`SELECT * FROM approvals WHERE plan_id = $1`, [result1.planId]);
    const rec1Res = await query(`SELECT * FROM ai_recommendations WHERE id = $1`, [result1.planId]);
    const aer1Res = await query(`SELECT COUNT(*) as count FROM agent_execution_records WHERE plan_id = $1 AND status = 'COMPLETE'`, [result1.planId]);

    console.log(`  Plan ID: ${result1.planId}`);
    console.log(`  Orchestration status: ${plan1Res.rows[0]?.orchestration_status || plan1Res.rows[0]?.status}`);
    console.log(`  Approval status: ${app1Res.rows[0]?.status}`);
    console.log(`  Recommendation status: ${rec1Res.rows[0]?.status}`);
    console.log(`  Completed Agents in DB: ${aer1Res.rows[0]?.count}/11`);

    if (app1Res.rows[0]?.status !== 'PENDING') throw new Error('Test 1 failed: Approval status is not PENDING');
    if (parseInt(aer1Res.rows[0]?.count, 10) !== 11) throw new Error('Test 1 failed: Not all 11 agents recorded COMPLETE');
    console.log('  ✔ TEST 1 PASSED: 11/11 Complete, Plan entered PENDING Human Approval in DB.\n');

    // ------------------------------------------------------------
    // TEST 2: Approve plan -> approval persisted -> execution starts -> idempotent
    // ------------------------------------------------------------
    console.log('▶ TEST 2: Approve plan -> approval persisted -> execution starts');
    const approveRes1 = await agentOrchestrator.handleApprovalDecision(result1.planId, 'APPROVED', 'Commander Vance');
    if (!approveRes1.success) throw new Error('Test 2 failed: Approval decision returned failure');

    const app1After = await query(`SELECT * FROM approvals WHERE plan_id = $1`, [result1.planId]);
    const plan1After = await query(`SELECT * FROM orchestration_plans WHERE plan_id = $1`, [result1.planId]);
    const disp1After = await query(`SELECT * FROM dispatch_records WHERE incident_id = $1`, [incId1]);

    console.log(`  Approval status in DB: ${app1After.rows[0]?.status}`);
    console.log(`  Reviewed by: ${app1After.rows[0]?.reviewed_by}`);
    console.log(`  Execution status: ${plan1After.rows[0]?.execution_status}`);
    console.log(`  Dispatched units count: ${disp1After.rows.length}`);

    if (app1After.rows[0]?.status !== 'APPROVED') throw new Error('Test 2 failed: Approval status not APPROVED');
    if (disp1After.rows.length === 0) throw new Error('Test 2 failed: No dispatch records created');
    console.log('  ✔ TEST 2 PASSED: Plan approved, dispatch initiated, persisted in DB.\n');

    // ------------------------------------------------------------
    // TEST 3: Duplicate approval (Idempotency & Race Protection)
    // ------------------------------------------------------------
    console.log('▶ TEST 3: Idempotent Approval Protection (Second approve request must not dispatch twice)');
    const dupApproveRes = await agentOrchestrator.handleApprovalDecision(result1.planId, 'APPROVED', 'Commander Vance');
    const disp1AfterDup = await query(`SELECT * FROM dispatch_records WHERE incident_id = $1`, [incId1]);

    console.log(`  Idempotent response: success=${dupApproveRes.success}, alreadyDecided=${dupApproveRes.alreadyDecided}`);
    console.log(`  Dispatch records count after duplicate call: ${disp1AfterDup.rows.length}`);

    if (disp1AfterDup.rows.length !== disp1After.rows.length) {
      throw new Error('Test 3 failed: Duplicate approval caused duplicate dispatch!');
    }
    console.log('  ✔ TEST 3 PASSED: Duplicate approval safely detected without double dispatch.\n');

    // ------------------------------------------------------------
    // TEST 4: Reject plan -> rejection persisted -> execution prevented
    // ------------------------------------------------------------
    console.log('▶ TEST 4: Reject plan -> rejection persisted -> no execution');
    const incIdReject = `INC-REJ-${Date.now().toString().slice(-4)}`;
    await query(`
      INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, pending, responders_count)
      VALUES ($1, 'False Alarm Flash Flood', 'FLOOD', 'LOW', 'Drainage Basin Gamma', 52.12, 48.45, 'ACTIVE', TRUE, 0)
    `, [incIdReject]);

    const rejectPlanResult = await agentOrchestrator.runCycle(incIdReject, false);
    if (!rejectPlanResult) throw new Error('Test 4 failed: could not formulate plan for reject test');

    const rejectRes = await agentOrchestrator.handleApprovalDecision(
      rejectPlanResult.planId,
      'REJECTED',
      'Duty Officer Cole',
      'Sensors indicate water subsided; no deployment needed.'
    );

    const appRejDb = await query(`SELECT * FROM approvals WHERE plan_id = $1`, [rejectPlanResult.planId]);
    const planRejDb = await query(`SELECT * FROM orchestration_plans WHERE plan_id = $1`, [rejectPlanResult.planId]);
    const dispRejDb = await query(`SELECT * FROM dispatch_records WHERE incident_id = $1`, [incIdReject]);

    console.log(`  Approval status in DB: ${appRejDb.rows[0]?.status}`);
    console.log(`  Rejection reason in DB: ${planRejDb.rows[0]?.rejection_reason}`);
    console.log(`  Dispatch records created: ${dispRejDb.rows.length}`);

    if (appRejDb.rows[0]?.status !== 'REJECTED') throw new Error('Test 4 failed: Approval status not REJECTED');
    if (dispRejDb.rows.length > 0) throw new Error('Test 4 failed: Rejected plan created dispatch records!');
    console.log('  ✔ TEST 4 PASSED: Plan rejection persisted, dispatch prevented.\n');

    // ------------------------------------------------------------
    // TEST 5 & 6: Concurrency — 3 Independent Incidents Executed Simultaneously
    // ------------------------------------------------------------
    console.log('▶ TEST 5 & 6: Concurrency — 3 Distinct Incidents execute 11 agents simultaneously');
    const incA = `INC-CONC-A-${Date.now().toString().slice(-4)}`;
    const incB = `INC-CONC-B-${Date.now().toString().slice(-4)}`;
    const incC = `INC-CONC-C-${Date.now().toString().slice(-4)}`;

    await Promise.all([
      query(`INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, pending) VALUES ($1, 'Major Fire East', 'FIRE', 'CRITICAL', 'East Warehouse 3', 52.34, 48.71, 'ACTIVE', TRUE)`, [incA]),
      query(`INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, pending) VALUES ($1, 'Bridge Structural Failure', 'STRUCTURAL', 'HIGH', 'West River Crossing', 52.36, 48.69, 'ACTIVE', TRUE)`, [incB]),
      query(`INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, pending) VALUES ($1, 'Mass Casualty Event', 'MEDICAL', 'MODERATE', 'Metro Station 9', 52.33, 48.75, 'ACTIVE', TRUE)`, [incC]),
    ]);

    console.log(`  Running agent orchestration for ${incA}, ${incB}, ${incC} concurrently...`);
    const [resA, resB, resC] = await Promise.all([
      agentOrchestrator.runCycle(incA, false),
      agentOrchestrator.runCycle(incB, false),
      agentOrchestrator.runCycle(incC, false),
    ]);

    if (!resA || !resB || !resC) throw new Error('Concurrent test failed: One or more cycles returned null');

    console.log(`  Plan A ID: ${resA.planId} (Incident: ${resA.incidentId})`);
    console.log(`  Plan B ID: ${resB.planId} (Incident: ${resB.incidentId})`);
    console.log(`  Plan C ID: ${resC.planId} (Incident: ${resC.incidentId})`);

    // Verify all 3 have distinct plan IDs
    if (resA.planId === resB.planId || resB.planId === resC.planId || resA.planId === resC.planId) {
      throw new Error('Concurrent test failed: Plan IDs are not unique!');
    }

    // Verify all 3 have independent 11/11 completion in DB
    const [aerA, aerB, aerC] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM agent_execution_records WHERE plan_id = $1 AND status = 'COMPLETE'`, [resA.planId]),
      query(`SELECT COUNT(*) as count FROM agent_execution_records WHERE plan_id = $1 AND status = 'COMPLETE'`, [resB.planId]),
      query(`SELECT COUNT(*) as count FROM agent_execution_records WHERE plan_id = $1 AND status = 'COMPLETE'`, [resC.planId]),
    ]);

    console.log(`  Plan A completed agents: ${aerA.rows[0]?.count}/11`);
    console.log(`  Plan B completed agents: ${aerB.rows[0]?.count}/11`);
    console.log(`  Plan C completed agents: ${aerC.rows[0]?.count}/11`);

    if (parseInt(aerA.rows[0]?.count, 10) !== 11 ||
        parseInt(aerB.rows[0]?.count, 10) !== 11 ||
        parseInt(aerC.rows[0]?.count, 10) !== 11) {
      throw new Error('Concurrent test failed: Not all concurrent plans recorded 11/11 completed agents');
    }
    console.log('  ✔ TEST 5 & 6 PASSED: 3 concurrent incidents created 3 unique plans with isolated 11-agent states.\n');

    // ------------------------------------------------------------
    // TEST 9 & 10: Pending Approvals Queue & Selective Decision
    // ------------------------------------------------------------
    console.log('▶ TEST 9 & 10: Pending Approvals Queue — Verify all pending plans appear and selective approval works');
    const pendingBefore = await query(`SELECT approval_id, plan_id, incident_id, status FROM approvals WHERE status = 'PENDING'`);
    console.log(`  Total pending approvals currently in DB: ${pendingBefore.rows.length}`);
    const pendingPlanIds = pendingBefore.rows.map(r => r.plan_id);

    if (!pendingPlanIds.includes(resA.planId) || !pendingPlanIds.includes(resB.planId) || !pendingPlanIds.includes(resC.planId)) {
      throw new Error('Test 9 failed: One or more newly generated concurrent plans not found in pending queue!');
    }
    console.log(`  ✔ Verified Plan A, Plan B, and Plan C all coexist in PENDING queue.`);

    // Approve ONLY Plan B
    console.log(`  Approving ONLY Plan B (${resB.planId})...`);
    await agentOrchestrator.handleApprovalDecision(resB.planId, 'APPROVED', 'Director Chen');

    // Verify Plan B is no longer pending, but Plan A and Plan C remain pending
    const appBCheck = await query(`SELECT status FROM approvals WHERE plan_id = $1`, [resB.planId]);
    const appACheck = await query(`SELECT status FROM approvals WHERE plan_id = $1`, [resA.planId]);
    const appCCheck = await query(`SELECT status FROM approvals WHERE plan_id = $1`, [resC.planId]);

    console.log(`  Plan B status: ${appBCheck.rows[0]?.status}`);
    console.log(`  Plan A status: ${appACheck.rows[0]?.status}`);
    console.log(`  Plan C status: ${appCCheck.rows[0]?.status}`);

    if (appBCheck.rows[0]?.status !== 'APPROVED') throw new Error('Test 10 failed: Plan B not approved');
    if (appACheck.rows[0]?.status !== 'PENDING') throw new Error('Test 10 failed: Plan A was affected by Plan B approval!');
    if (appCCheck.rows[0]?.status !== 'PENDING') throw new Error('Test 10 failed: Plan C was affected by Plan B approval!');
    console.log('  ✔ TEST 9 & 10 PASSED: Plan B approved and removed from pending; Plan A and Plan C remain pending.\n');

    // ------------------------------------------------------------
    // TEST 8: Resumability / No Duplicate Execution on Re-run
    // ------------------------------------------------------------
    console.log('▶ TEST 8: Resumable execution — Re-running plan checks existing agent_execution_records');
    const existingRecs = await query(`SELECT COUNT(*) as count FROM agent_execution_records WHERE plan_id = $1`, [resA.planId]);
    const countBefore = parseInt(existingRecs.rows[0]?.count, 10);
    console.log(`  Existing agent execution records for Plan A: ${countBefore}`);

    // Call runCycle targeting incA: it should recognize already pending approval for incA
    const rerunResult = await agentOrchestrator.runCycle(incA, false);
    console.log(`  Re-run response: ${rerunResult?.planId}`);

    const existingRecsAfter = await query(`SELECT COUNT(*) as count FROM agent_execution_records WHERE plan_id = $1`, [resA.planId]);
    const countAfter = parseInt(existingRecsAfter.rows[0]?.count, 10);
    console.log(`  Agent execution records for Plan A after check: ${countAfter}`);

    if (countAfter !== countBefore) {
      throw new Error('Test 8 failed: Redundant execution duplicated agent records for Plan A!');
    }
    console.log('  ✔ TEST 8 PASSED: Existing completed agent records preserved without duplicate executions.\n');

    // Clean up approved/rejected test records for cleanliness
    console.log('Cleaning up test data...');
    await query(`
      DELETE FROM dispatch_records WHERE incident_id IN ($1, $2, $3, $4, $5)
    `, [incId1, incIdReject, incA, incB, incC]).catch(() => {});
    await query(`
      DELETE FROM missions WHERE incident_id IN ($1, $2, $3, $4, $5)
    `, [incId1, incIdReject, incA, incB, incC]).catch(() => {});

    console.log('============================================================');
    console.log('🎉 ALL TESTS PASSED! Multi-Incident Concurrency & Approval Workflow Verified.');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTestSuite();
