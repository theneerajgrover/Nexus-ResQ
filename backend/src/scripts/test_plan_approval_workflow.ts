// ============================================================
// NEXUS RESQ — COMPLETE PLAN APPROVAL WORKFLOW TEST SUITE
// Tests A through F as specified in production requirements
// ============================================================
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, pool } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:8000/api';

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 NEXUS RESQ — FULL APPROVAL LIFECYCLE & PERSISTENCE TESTS');
  console.log('============================================================\n');

  try {
    // ------------------------------------------------------------
    // SETUP: Clean up existing test records if any, ensure clean state
    // ------------------------------------------------------------
    console.log('[Setup] Preparing test incidents and plans in database...');

    // First, let's mark older lingering test approvals as SUPERSEDED so we have clean test data
    await query(`
      UPDATE approvals SET status = 'SUPERSEDED', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'PENDING'
    `);
    await query(`
      UPDATE ai_recommendations SET status = 'SUPERSEDED', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'PENDING_APPROVAL'
    `);
    await query(`
      UPDATE orchestration_plans SET status = 'SUPERSEDED', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'WAITING_FOR_APPROVAL'
    `);

    // Create a real test incident for Test A/B/C/E
    const testIncId = `INC-TEST-${Date.now().toString().slice(-4)}`;
    await query(`
      INSERT INTO incidents (
        id, title, type, severity, location, latitude, longitude, status, responders_count, pending, created_at, updated_at
      )
      VALUES ($1, 'Test Earthquake Building Failure', 'STRUCTURAL', 'CRITICAL', 'Sector 4 Test Zone', 30.68, 76.60, 'PENDING', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [testIncId]);

    // Run 11-agent cycle for this test incident
    console.log(`[Setup] Triggering 11-agent orchestration cycle for ${testIncId}...`);
    const orchResult = await agentOrchestrator.runCycle(testIncId, false);

    if (!orchResult) {
      throw new Error('Failed to create test orchestration plan');
    }

    const planId = orchResult.planId;
    const approvalId = orchResult.approvalId;
    console.log(`[Setup] Generated real test plan: ${planId}, approval: ${approvalId}`);

    // ------------------------------------------------------------
    // TEST A: PENDING PLAN VERIFICATION
    // ------------------------------------------------------------
    console.log('\n--- TEST A: Pending Plan Verification ---');
    // Verify in database
    const dbAppRes = await query(`SELECT * FROM approvals WHERE approval_id = $1`, [approvalId]);
    if (dbAppRes.rows[0]?.status !== 'PENDING') {
      throw new Error(`Test A Failed: Database status is ${dbAppRes.rows[0]?.status}, expected PENDING`);
    }
    console.log('✅ DB status verified: PENDING');

    // Verify GET /api/approvals/pending returns the plan with all real fields
    const pendingRes: any = await fetch(`${API_BASE}/approvals/pending`).then((r) => r.json());
    if (!pendingRes.success || !Array.isArray(pendingRes.data)) {
      throw new Error('Test A Failed: GET /api/approvals/pending returned unsuccessful response');
    }
    const foundPending = pendingRes.data.find((p: any) => p.plan_id === planId || p.approval_id === approvalId);
    if (!foundPending) {
      throw new Error(`Test A Failed: Plan ${planId} not found in pending approvals API`);
    }

    // Verify critical fields exist directly from real DB
    console.log(`✅ Real DB fields returned:`);
    console.log(`   - Plan ID: ${foundPending.plan_id}`);
    console.log(`   - Incident ID: ${foundPending.incident_id}`);
    console.log(`   - Title: ${foundPending.incident_title}`);
    console.log(`   - Severity: ${foundPending.incident_severity}`);
    console.log(`   - AI Confidence: ${foundPending.confidence_score}%`);
    console.log(`   - Resource: ${foundPending.recommended_resource}`);
    console.log(`   - Shelter: ${foundPending.recommended_shelter}`);
    console.log(`   - Completed Agents: ${foundPending.completed_agents}/${foundPending.total_agents}`);
    console.log(`   - Orchestration Status: ${foundPending.orchestration_status}`);

    // Verify GET /api/command/overview shows pendingApproval
    const overviewRes: any = await fetch(`${API_BASE}/command/overview`).then((r) => r.json());
    if (!overviewRes.data?.pendingApproval || overviewRes.data.pendingApproval.plan_id !== planId) {
      throw new Error(`Test A Failed: Command overview does not point to plan ${planId}`);
    }
    console.log('✅ Command overview correctly shows pending approval');

    // ------------------------------------------------------------
    // TEST B: APPROVE PLAN PERSISTENCE & EXECUTION
    // ------------------------------------------------------------
    console.log('\n--- TEST B: Approve Plan Persistence & Execution ---');
    const approvePayload = {
      action: 'APPROVE',
      approvedBy: 'Director Sarah Chen',
      comments: 'Authorized for immediate deployment',
    };

    const actionRes: any = await fetch(`${API_BASE}/command/recommendations/${planId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvePayload),
    }).then((r) => r.json());

    if (!actionRes.success || actionRes.decision !== 'APPROVED') {
      throw new Error(`Test B Failed: Approval action failed: ${JSON.stringify(actionRes)}`);
    }
    console.log('✅ API returned approval success:', actionRes.message);

    // Verify actual PostgreSQL records
    const postApproveApp = await query(`SELECT * FROM approvals WHERE approval_id = $1 OR plan_id = $2`, [approvalId, planId]);
    if (postApproveApp.rows[0]?.status !== 'APPROVED' || postApproveApp.rows[0]?.decision !== 'APPROVED') {
      throw new Error(`Test B Failed: Approvals table not marked APPROVED: ${JSON.stringify(postApproveApp.rows[0])}`);
    }
    console.log('✅ DB approvals table persisted: status = APPROVED, decision = APPROVED, reviewed_by =', postApproveApp.rows[0].reviewed_by);

    const postApproveRec = await query(`SELECT * FROM ai_recommendations WHERE id = $1`, [planId]);
    if (postApproveRec.rows[0]?.status !== 'APPROVED' || postApproveRec.rows[0]?.execution_status !== 'DISPATCHED') {
      throw new Error(`Test B Failed: ai_recommendations table not marked APPROVED: ${JSON.stringify(postApproveRec.rows[0])}`);
    }
    console.log('✅ DB ai_recommendations persisted: status = APPROVED, execution_status = DISPATCHED');

    const postApprovePlan = await query(`SELECT * FROM orchestration_plans WHERE plan_id = $1 OR id = $1`, [planId]);
    if (!['APPROVED', 'EXECUTING', 'MONITORING', 'COMPLETE'].includes(postApprovePlan.rows[0]?.status)) {
      throw new Error(`Test B Failed: orchestration_plans table invalid status: ${postApprovePlan.rows[0]?.status}`);
    }
    console.log('✅ DB orchestration_plans persisted: status =', postApprovePlan.rows[0]?.status);

    // Verify execution artifacts created in DB
    const dispatchRows = await query(`SELECT * FROM dispatch_records WHERE incident_id = $1`, [testIncId]);
    if (dispatchRows.rowCount === 0) {
      throw new Error('Test B Failed: No dispatch records created in database');
    }
    console.log(`✅ DB dispatch_records created: ${dispatchRows.rows[0]?.id}, unit: ${dispatchRows.rows[0]?.unit}`);

    const missionRows = await query(`SELECT * FROM missions WHERE incident_id = $1`, [testIncId]);
    if (missionRows.rowCount === 0) {
      throw new Error('Test B Failed: No missions record created in database');
    }
    console.log(`✅ DB missions record created: ${missionRows.rows[0]?.id}, responder_id: ${missionRows.rows[0]?.responder_id}`);

    const auditRows = await query(`SELECT * FROM audit_logs WHERE actor = $1 ORDER BY created_at DESC LIMIT 1`, ['Director Sarah Chen']);
    if (auditRows.rowCount === 0) {
      throw new Error('Test B Failed: No audit log found for approval decision');
    }
    console.log(`✅ DB audit_logs persisted: ${auditRows.rows[0]?.action} by ${auditRows.rows[0]?.actor}`);

    // ------------------------------------------------------------
    // TEST C: PAGE REFRESH SIMULATION & BANNER DISAPPEARANCE
    // ------------------------------------------------------------
    console.log('\n--- TEST C: Page Refresh & Banner Disappearance ---');
    // Query GET /api/approvals/pending again
    const postPendingRes: any = await fetch(`${API_BASE}/approvals/pending`).then((r) => r.json());
    const isStillPending = postPendingRes.data?.some((p: any) => p.plan_id === planId || p.approval_id === approvalId);
    if (isStillPending) {
      throw new Error(`Test C Failed: Approved plan ${planId} still returned in pending approvals list`);
    }
    console.log('✅ Plan successfully removed from pending approvals list');

    // Query GET /api/command/overview (simulates browser refresh on Command Home)
    const refreshOverview: any = await fetch(`${API_BASE}/command/overview`).then((r) => r.json());
    const refreshedPendingApproval = refreshOverview.data?.pendingApproval;
    if (refreshedPendingApproval && (refreshedPendingApproval.plan_id === planId || refreshedPendingApproval.approval_id === approvalId)) {
      throw new Error(`Test C Failed: Approved plan ${planId} still returned as pendingApproval on refresh`);
    }
    console.log('✅ On page refresh: pendingApproval does NOT show the approved plan');
    console.log('✅ Bottom completion banner will NOT resurface because DB status is no longer PENDING');

    // ------------------------------------------------------------
    // TEST D: REJECT PLAN PERSISTENCE
    // ------------------------------------------------------------
    console.log('\n--- TEST D: Reject Plan Persistence ---');
    // Create a second test incident and plan specifically to test rejection
    const testIncIdReject = `INC-REJ-${Date.now().toString().slice(-4)}`;
    await query(`
      INSERT INTO incidents (
        id, title, type, severity, location, latitude, longitude, status, responders_count, pending, created_at, updated_at
      )
      VALUES ($1, 'Chemical Spill Leak', 'FIRE', 'HIGH', 'Sector 9 Industrial', 30.70, 76.65, 'PENDING', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [testIncIdReject]);

    const orchResultReject = await agentOrchestrator.runCycle(testIncIdReject, false);
    if (!orchResultReject) {
      throw new Error('Failed to create rejection test plan');
    }

    const rejectPlanId = orchResultReject.planId;
    const rejectAppId = orchResultReject.approvalId;
    console.log(`[Setup] Generated rejection test plan: ${rejectPlanId}, approval: ${rejectAppId}`);

    // Call reject endpoint
    const rejectPayload = {
      action: 'REJECT',
      approvedBy: 'Director Sarah Chen',
      comments: 'Tactical route blocked by downstream contamination. Reassessment required.',
    };

    const rejectRes: any = await fetch(`${API_BASE}/command/recommendations/${rejectPlanId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rejectPayload),
    }).then((r) => r.json());

    if (!rejectRes.success || rejectRes.decision !== 'REJECTED') {
      throw new Error(`Test D Failed: Rejection action failed: ${JSON.stringify(rejectRes)}`);
    }
    console.log('✅ Rejection API returned success:', rejectRes.message);

    // Verify DB state for rejection
    const postRejectApp = await query(`SELECT * FROM approvals WHERE approval_id = $1 OR plan_id = $2`, [rejectAppId, rejectPlanId]);
    if (postRejectApp.rows[0]?.status !== 'REJECTED' || postRejectApp.rows[0]?.decision !== 'REJECTED') {
      throw new Error(`Test D Failed: Approvals not marked REJECTED in DB`);
    }
    if (!postRejectApp.rows[0]?.reason?.includes('Tactical route blocked')) {
      throw new Error('Test D Failed: Rejection reason not saved');
    }
    console.log('✅ DB approvals table persisted: status = REJECTED, reason =', postRejectApp.rows[0]?.reason);

    const postRejectRec = await query(`SELECT * FROM ai_recommendations WHERE id = $1`, [rejectPlanId]);
    if (postRejectRec.rows[0]?.status !== 'REJECTED' || postRejectRec.rows[0]?.execution_status !== 'CANCELLED') {
      throw new Error('Test D Failed: ai_recommendations table not marked REJECTED/CANCELLED in DB');
    }
    console.log('✅ DB ai_recommendations persisted: status = REJECTED, execution_status = CANCELLED');

    // Verify rejected plan is NOT in pending list
    const postRejectPending: any = await fetch(`${API_BASE}/approvals/pending`).then((r) => r.json());
    if (postRejectPending.data?.some((p: any) => p.plan_id === rejectPlanId)) {
      throw new Error('Test D Failed: Rejected plan still appearing in pending list');
    }
    console.log('✅ Rejected plan does NOT appear in pending approvals');

    // ------------------------------------------------------------
    // TEST E: DUPLICATE APPROVAL (IDEMPOTENCY & STALE RACE PROTECTION)
    // ------------------------------------------------------------
    console.log('\n--- TEST E: Duplicate Approval & Idempotency ---');
    // Count dispatch records before second approve call
    const preCount = await query(`SELECT COUNT(*) as count FROM dispatch_records WHERE incident_id = $1`, [testIncId]);
    const preDispatchCount = parseInt(preCount.rows[0]?.count || '0', 10);

    // Call APPROVE a second time on the already approved plan
    const duplicateActionRes: any = await fetch(`${API_BASE}/command/recommendations/${planId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvePayload),
    }).then((r) => r.json());

    console.log('✅ Duplicate approval request returned:', duplicateActionRes.message);

    // Count dispatch records after second approve call
    const postCount = await query(`SELECT COUNT(*) as count FROM dispatch_records WHERE incident_id = $1`, [testIncId]);
    const postDispatchCount = parseInt(postCount.rows[0]?.count || '0', 10);

    if (postDispatchCount !== preDispatchCount) {
      throw new Error(`Test E Failed: Duplicate approval created extra dispatch records (${preDispatchCount} -> ${postDispatchCount})`);
    }
    console.log(`✅ Idempotency verified: Dispatch count unchanged (${postDispatchCount} === ${preDispatchCount})`);

    // Verify that attempting to APPROVE a REJECTED plan is safely blocked
    const illegalApproveOnReject: any = await fetch(`${API_BASE}/command/recommendations/${rejectPlanId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'APPROVE', approvedBy: 'Director Sarah Chen' }),
    }).then((r) => r.json());

    if (illegalApproveOnReject.success) {
      throw new Error('Test E Failed: Approved a previously rejected plan; expected conflict/error');
    }
    console.log('✅ Safety verified: Cannot approve an already rejected plan (cleanly rejected with message)');

    // ------------------------------------------------------------
    // TEST F: MULTIPLE PLANS FILTERING
    // ------------------------------------------------------------
    console.log('\n--- TEST F: Multiple Plans Filtering in Pending List ---');
    // We have:
    // Plan 1 (testIncId) -> APPROVED
    // Plan 2 (testIncIdReject) -> REJECTED
    // Let's create a NEW genuine pending plan (Plan 3)
    const testIncIdPending = `INC-PEND-${Date.now().toString().slice(-4)}`;
    await query(`
      INSERT INTO incidents (
        id, title, type, severity, location, latitude, longitude, status, responders_count, pending, created_at, updated_at
      )
      VALUES ($1, 'Flash Flood Submerged Underpass', 'FLOOD', 'HIGH', 'Underpass Sector 3', 30.65, 76.55, 'PENDING', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [testIncIdPending]);

    const orchResultPending = await agentOrchestrator.runCycle(testIncIdPending, false);
    const pendingPlanId3 = orchResultPending?.planId;
    console.log(`[Setup] Generated new pending plan: ${pendingPlanId3}`);

    // Query pending approvals
    const multiTestRes: any = await fetch(`${API_BASE}/approvals/pending`).then((r) => r.json());
    const returnedPlans = multiTestRes.data || [];

    const containsApproved = returnedPlans.some((p: any) => p.plan_id === planId);
    const containsRejected = returnedPlans.some((p: any) => p.plan_id === rejectPlanId);
    const containsPending = returnedPlans.some((p: any) => p.plan_id === pendingPlanId3);

    if (containsApproved) {
      throw new Error(`Test F Failed: Approved plan ${planId} found in pending list!`);
    }
    if (containsRejected) {
      throw new Error(`Test F Failed: Rejected plan ${rejectPlanId} found in pending list!`);
    }
    if (!containsPending) {
      throw new Error(`Test F Failed: Truly pending plan ${pendingPlanId3} was NOT found in pending list!`);
    }

    console.log(`✅ Filter verified: Returned ${returnedPlans.length} pending plan(s)`);
    console.log(`   - Approved plan ${planId}: EXCLUDED ✅`);
    console.log(`   - Rejected plan ${rejectPlanId}: EXCLUDED ✅`);
    console.log(`   - Pending plan ${pendingPlanId3}: INCLUDED ✅`);

    console.log('\n============================================================');
    console.log('🎉 ALL TESTS (A THROUGH F) PASSED WITH 100% DATABASE INTEGRITY!');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
