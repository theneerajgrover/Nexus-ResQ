// ============================================================
// REAL DATABASE END-TO-END VERIFICATION SCRIPT
// Tests the exact operational workflow against live PostgreSQL & API
// ============================================================
import { query, pool } from '../db/index';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';

const API_BASE = 'http://localhost:8000/api';

async function main() {
  console.log('--- STARTING REAL OPERATIONAL WORKFLOW VALIDATION ---');

  // Create valid Authority JWT token
  const token = jwt.sign(
    { id: 'USR-CMD-01', name: 'Director Sarah Chen', email: 'command@nexus.gov', role: 'authority_command' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // ────────────────────────────────────────────────────────────
  // TEST 1: APPROVAL FROM PENDING APPROVALS
  // ────────────────────────────────────────────────────────────
  console.log('\n[TEST 1] Approval from Pending Approvals:');
  const incId1 = `INC-T1-${Date.now().toString().slice(-4)}`;
  const sosId1 = `SOS-T1-${Date.now().toString().slice(-4)}`;
  const planId1 = `PLAN-${incId1}-V1-${Date.now().toString().slice(-4)}`;
  const appId1 = `APP-T1-${Date.now().toString().slice(-4)}`;

  // Ensure at least 2 real responders are in AVAILABLE status for Test 1 and Test 2
  await query(`UPDATE responders SET status = 'AVAILABLE', current_incident_id = NULL WHERE id IN ('R-22', 'R-14')`);
  console.log('Ensured R-22 and R-14 are AVAILABLE for operational dispatch testing.');

  // Count available units before dispatch
  const countBeforeRes = await query(`SELECT count(*)::int as count FROM responders WHERE status = 'AVAILABLE'`);
  const availBefore = countBeforeRes.rows[0].count;
  console.log(`Available responders before Test 1: ${availBefore}`);

  // Insert real incident
  await query(`
    INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, responders_count, pending, request_id)
    VALUES ($1, 'Severe Flooding at Sector 7', 'FLOOD', 'HIGH', 'Sector 7 Promenade', 34.05, -118.25, 'PENDING', 0, TRUE, $2)
  `, [incId1, sosId1]);

  // Insert real emergency request
  await query(`
    INSERT INTO emergency_requests (id, emergency_type, assistance_types, location, status, incident_id)
    VALUES ($1, 'FLOOD', ARRAY['EVACUATION', 'MEDICAL'], 'Sector 7 Promenade', 'RECEIVED', $2)
  `, [sosId1, incId1]);

  // Insert real orchestration plan
  await query(`
    INSERT INTO orchestration_plans (id, plan_id, incident_id, status, approval_status, current_step, total_steps, current_stage)
    VALUES ($1, $1, $2, 'WAITING_FOR_APPROVAL', 'PENDING', 11, 11, 'WAITING FOR APPROVAL')
  `, [planId1, incId1]);

  // Insert real AI recommendation
  await query(`
    INSERT INTO ai_recommendations (id, incident_id, priority, action, reason, affected_zone, recommended_resource, status)
    VALUES ($1, $2, 'HIGH', 'Deploy Water Rescue Team', 'Rising water levels threaten residential block', 'Sector 7 Promenade', 'Water Rescue Team Alpha', 'PENDING_APPROVAL')
  `, [planId1, incId1]);

  // Insert real approval
  await query(`
    INSERT INTO approvals (approval_id, incident_id, plan_id, status, approval_type, requested_by)
    VALUES ($1, $2, $3, 'PENDING', 'DISPATCH_PLAN', 'AI_ORCHESTRATOR')
  `, [appId1, incId1, planId1]);

  // Verify it appears in GET /api/approvals/pending
  const pendingRes = await fetch(`${API_BASE}/approvals/pending`, { headers: authHeaders });
  const pendingData: any = await pendingRes.json();
  const foundInPending = pendingData.data.some((p: any) => p.plan_id === planId1 || p.approval_id === appId1);
  console.log(`Plan appears in Pending Approvals: ${foundInPending}`);
  if (!foundInPending) throw new Error('Test 1 failed: Plan not found in GET /approvals/pending');

  // Approve via POST /api/approvals/:id/approve (Pending Approvals endpoint)
  const appApproveRes = await fetch(`${API_BASE}/approvals/${appId1}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  const appApproveJson: any = await appApproveRes.json();
  console.log(`Approve response:`, appApproveJson);
  if (!appApproveJson.success) throw new Error('Test 1 failed: Approval endpoint failed: ' + JSON.stringify(appApproveJson));

  // Verify database state:
  const checkAppDB = await query(`SELECT status, decision, reviewed_by FROM approvals WHERE approval_id = $1`, [appId1]);
  console.log('DB Approvals row:', checkAppDB.rows[0]);
  if (checkAppDB.rows[0]?.status !== 'APPROVED') throw new Error('DB Approval status is not APPROVED');

  const checkPlanDB = await query(`SELECT status, approval_status, execution_status FROM orchestration_plans WHERE plan_id = $1`, [planId1]);
  console.log('DB Orchestration Plan row:', checkPlanDB.rows[0]);
  if (checkPlanDB.rows[0]?.approval_status !== 'APPROVED') throw new Error('DB Plan approval_status is not APPROVED');

  const checkIncDB = await query(`SELECT status, pending, assigned_responder_id, responders_count FROM incidents WHERE id = $1`, [incId1]);
  console.log('DB Incident row:', checkIncDB.rows[0]);
  if (checkIncDB.rows[0]?.status !== 'RESPONDING' || checkIncDB.rows[0]?.pending !== false) {
    throw new Error('DB Incident status is not updated to RESPONDING with pending=false');
  }

  const checkDispDB = await query(`SELECT id, incident_id, unit, status, approved_by FROM dispatch_records WHERE incident_id = $1`, [incId1]);
  console.log('DB Dispatch record:', checkDispDB.rows[0]);
  if (!checkDispDB.rows[0] || checkDispDB.rows[0].status !== 'DISPATCHED') throw new Error('DB Dispatch record missing or not DISPATCHED');

  const checkHistDB = await query(`SELECT new_status, actor, notes FROM incident_status_history WHERE incident_id = $1 ORDER BY created_at ASC`, [incId1]);
  console.log('DB Incident History rows:', checkHistDB.rows);
  if (checkHistDB.rows.length < 2) throw new Error('DB Incident history did not record both approval and dispatch events');

  // Count available units after dispatch
  const countAfterRes = await query(`SELECT count(*)::int as count FROM responders WHERE status = 'AVAILABLE'`);
  const availAfter = countAfterRes.rows[0].count;
  console.log(`Available responders before: ${availBefore}, after: ${availAfter}`);
  if (availAfter !== availBefore - 1) throw new Error('Available responder count was not correctly decremented in database');

  // Verify plan is removed from Pending Approvals
  const pendingCheck2 = await fetch(`${API_BASE}/approvals/pending`, { headers: authHeaders });
  const pendingData2: any = await pendingCheck2.json();
  const stillInPending = pendingData2.data.some((p: any) => p.plan_id === planId1 || p.approval_id === appId1);
  console.log(`Plan removed from Pending Approvals: ${!stillInPending}`);
  if (stillInPending) throw new Error('Test 1 failed: Approved plan still returned in pending approvals!');

  // ────────────────────────────────────────────────────────────
  // TEST 2: APPROVAL FROM COMMAND / PLAN REVIEW
  // ────────────────────────────────────────────────────────────
  console.log('\n[TEST 2] Approval from Command / Plan Review:');
  const incId2 = `INC-T2-${Date.now().toString().slice(-4)}`;
  const sosId2 = `SOS-T2-${Date.now().toString().slice(-4)}`;
  const planId2 = `PLAN-${incId2}-V1-${Date.now().toString().slice(-4)}`;
  const appId2 = `APP-T2-${Date.now().toString().slice(-4)}`;

  // Insert second incident & plan
  await query(`
    INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, responders_count, pending, request_id)
    VALUES ($1, 'Chemical Spill at Harbor', 'OTHER', 'CRITICAL', 'Pier 9 Cargo Berth', 34.01, -118.28, 'PENDING', 0, TRUE, $2)
  `, [incId2, sosId2]);

  await query(`
    INSERT INTO emergency_requests (id, emergency_type, assistance_types, location, status, incident_id)
    VALUES ($1, 'CHEMICAL', ARRAY['HAZMAT'], 'Pier 9 Cargo Berth', 'RECEIVED', $2)
  `, [sosId2, incId2]);

  await query(`
    INSERT INTO orchestration_plans (id, plan_id, incident_id, status, approval_status, current_step, total_steps, current_stage)
    VALUES ($1, $1, $2, 'WAITING_FOR_APPROVAL', 'PENDING', 11, 11, 'WAITING FOR APPROVAL')
  `, [planId2, incId2]);

  await query(`
    INSERT INTO ai_recommendations (id, incident_id, priority, action, reason, affected_zone, recommended_resource, status)
    VALUES ($1, $2, 'CRITICAL', 'Deploy Hazmat Containment Unit', 'Corrosive vapor plume expanding', 'Pier 9 Cargo Berth', 'Hazmat Response Unit 3', 'PENDING_APPROVAL')
  `, [planId2, incId2]);

  await query(`
    INSERT INTO approvals (approval_id, incident_id, plan_id, status, approval_type, requested_by)
    VALUES ($1, $2, $3, 'PENDING', 'DISPATCH_PLAN', 'AI_ORCHESTRATOR')
  `, [appId2, incId2, planId2]);

  // Approve via POST /api/command/recommendations/:id/action (Command Plan Review endpoint)
  const cmdApproveRes = await fetch(`${API_BASE}/command/recommendations/${planId2}/action`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'APPROVE', comments: 'Authorized from Command Review' }),
  });
  const cmdApproveJson: any = await cmdApproveRes.json();
  console.log('Command approve response:', cmdApproveJson);
  if (!cmdApproveJson.success) throw new Error('Test 2 failed: Command approval endpoint failed: ' + JSON.stringify(cmdApproveJson));

  // Verify database updates
  const checkAppDB2 = await query(`SELECT status, decision FROM approvals WHERE plan_id = $1`, [planId2]);
  console.log('DB Approvals row 2:', checkAppDB2.rows[0]);
  if (checkAppDB2.rows[0]?.status !== 'APPROVED') throw new Error('Test 2: DB Approval status is not APPROVED');

  const checkIncDB2 = await query(`SELECT status, pending, assigned_responder_id FROM incidents WHERE id = $1`, [incId2]);
  console.log('DB Incident row 2:', checkIncDB2.rows[0]);
  if (checkIncDB2.rows[0]?.status !== 'RESPONDING' || checkIncDB2.rows[0]?.pending !== false) {
    throw new Error('Test 2: DB Incident status is not updated');
  }

  const checkDispDB2 = await query(`SELECT id, incident_id, unit, status FROM dispatch_records WHERE incident_id = $1`, [incId2]);
  console.log('DB Dispatch record 2:', checkDispDB2.rows[0]);
  if (!checkDispDB2.rows[0] || checkDispDB2.rows[0].status !== 'DISPATCHED') {
    throw new Error('Test 2: DB Dispatch record missing');
  }

  // Verify Pending Approvals no longer lists it
  const pendingCheckT2 = await fetch(`${API_BASE}/approvals/pending`, { headers: authHeaders });
  const pendingDataT2: any = await pendingCheckT2.json();
  const foundT2InPending = pendingDataT2.data.some((p: any) => p.plan_id === planId2 || p.approval_id === appId2);
  console.log(`Plan 2 removed from Pending Approvals: ${!foundT2InPending}`);
  if (foundT2InPending) throw new Error('Test 2 failed: Approved plan still returned in pending approvals!');

  // ────────────────────────────────────────────────────────────
  // TEST 3: PREVENT DUPLICATE APPROVAL / DOUBLE DISPATCH
  // ────────────────────────────────────────────────────────────
  console.log('\n[TEST 3] Prevent Duplicate Approval / Double Dispatch:');
  const dispatchesCountBefore = (await query(`SELECT count(*)::int as count FROM dispatch_records WHERE incident_id = $1`, [incId2])).rows[0].count;
  const responderAvailBeforeDup = (await query(`SELECT count(*)::int as count FROM responders WHERE status = 'AVAILABLE'`)).rows[0].count;

  // Attempt to approve plan 2 AGAIN via command API
  const dupCmdRes = await fetch(`${API_BASE}/command/recommendations/${planId2}/action`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'APPROVE', comments: 'Attempted duplicate approval' }),
  });
  const dupCmdJson: any = await dupCmdRes.json();
  console.log('Duplicate approval response (command API):', dupCmdJson);
  if (!dupCmdJson.success) throw new Error('Test 3: Idempotent return should indicate success=true');

  // Attempt to approve plan 2 AGAIN via approvals API
  const dupAppRes = await fetch(`${API_BASE}/approvals/${appId2}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  const dupAppJson: any = await dupAppRes.json();
  console.log('Duplicate approval response (approvals API):', dupAppJson);
  if (!dupAppJson.success) throw new Error('Test 3: Idempotent return on approvals API should indicate success=true');

  // Verify NO second dispatch was created
  const dispatchesCountAfter = (await query(`SELECT count(*)::int as count FROM dispatch_records WHERE incident_id = $1`, [incId2])).rows[0].count;
  console.log(`Dispatches count before: ${dispatchesCountBefore}, after duplicate attempt: ${dispatchesCountAfter}`);
  if (dispatchesCountAfter !== dispatchesCountBefore) throw new Error('Test 3 failed: Duplicate dispatch record was created!');

  // Verify available responder count did NOT decrement again
  const responderAvailAfterDup = (await query(`SELECT count(*)::int as count FROM responders WHERE status = 'AVAILABLE'`)).rows[0].count;
  console.log(`Responders available before: ${responderAvailBeforeDup}, after duplicate attempt: ${responderAvailAfterDup}`);
  if (responderAvailAfterDup !== responderAvailBeforeDup) throw new Error('Test 3 failed: Responder count decremented on duplicate approval!');

  // ────────────────────────────────────────────────────────────
  // TEST 4: RESOURCE SHORTAGE HANDLING
  // ────────────────────────────────────────────────────────────
  console.log('\n[TEST 4] Resource Shortage Handling:');
  // Temporarily set all responders to OFFLINE to simulate 0 available responders
  const savedStatuses = await query(`SELECT id, status FROM responders`);
  await query(`UPDATE responders SET status = 'OFFLINE', current_incident_id = NULL`);

  const incId4 = `INC-T4-${Date.now().toString().slice(-4)}`;
  const planId4 = `PLAN-${incId4}-V1-${Date.now().toString().slice(-4)}`;
  const appId4 = `APP-T4-${Date.now().toString().slice(-4)}`;

  await query(`
    INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, responders_count, pending)
    VALUES ($1, 'Wildfire Outbreak', 'FIRE', 'CRITICAL', 'Canyon Ridge', 34.15, -118.35, 'PENDING', 0, TRUE)
  `, [incId4]);

  await query(`
    INSERT INTO orchestration_plans (id, plan_id, incident_id, status, approval_status, current_step, total_steps, current_stage)
    VALUES ($1, $1, $2, 'WAITING_FOR_APPROVAL', 'PENDING', 11, 11, 'WAITING FOR APPROVAL')
  `, [planId4, incId4]);

  await query(`
    INSERT INTO ai_recommendations (id, incident_id, priority, action, reason, affected_zone, status)
    VALUES ($1, $2, 'CRITICAL', 'Deploy Wildfire Crew', 'Fire line advancing', 'Canyon Ridge', 'PENDING_APPROVAL')
  `, [planId4, incId4]);

  await query(`
    INSERT INTO approvals (approval_id, incident_id, plan_id, status)
    VALUES ($1, $2, $3, 'PENDING')
  `, [appId4, incId4, planId4]);

  // Attempt approval when no resources available
  const shortageRes = await fetch(`${API_BASE}/command/recommendations/${planId4}/action`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ action: 'APPROVE' }),
  });
  const shortageJson: any = await shortageRes.json();
  console.log('Resource shortage response:', shortageJson);

  // Restore responder statuses
  for (const row of savedStatuses.rows) {
    await query(`UPDATE responders SET status = $1 WHERE id = $2`, [row.status, row.id]);
  }

  if (shortageJson.success) {
    throw new Error('Test 4 failed: System allowed dispatch with zero available resources!');
  }
  console.log('Resource shortage handled cleanly with controlled error:', shortageJson.error);

  // Clean up test rows
  await query(`DELETE FROM dispatch_records WHERE incident_id IN ($1, $2, $3)`, [incId1, incId2, incId4]);
  await query(`DELETE FROM incident_status_history WHERE incident_id IN ($1, $2, $3)`, [incId1, incId2, incId4]);
  await query(`DELETE FROM approvals WHERE incident_id IN ($1, $2, $3)`, [incId1, incId2, incId4]);
  await query(`DELETE FROM ai_recommendations WHERE incident_id IN ($1, $2, $3)`, [incId1, incId2, incId4]);
  await query(`DELETE FROM orchestration_plans WHERE incident_id IN ($1, $2, $3)`, [incId1, incId2, incId4]);
  await query(`DELETE FROM emergency_requests WHERE incident_id IN ($1, $2, $3)`, [incId1, incId2, incId4]);
  await query(`DELETE FROM incidents WHERE id IN ($1, $2, $3)`, [incId1, incId2, incId4]);
  await query(`UPDATE responders SET status = 'AVAILABLE', current_incident_id = NULL WHERE current_incident_id IN ($1, $2, $3)`, [incId1, incId2, incId4]);

  console.log('\n============================================================');
  console.log('  ALL 4 REAL OPERATIONAL TESTS PASSED PERFECTLY!');
  console.log('============================================================\n');

  await pool.end();
}

main().catch(async (e) => {
  console.error('VERIFICATION ERROR:', e);
  await pool.end();
  process.exit(1);
});
