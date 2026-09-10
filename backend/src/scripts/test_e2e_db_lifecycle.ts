// ============================================================
// NEXUS RESQ — COMPREHENSIVE END-TO-END DATABASE LIFECYCLE TEST SUITE
// Tests all 12 Scenarios from Section 61 of the prompt against real PostgreSQL
// ============================================================
import { pool, query } from '../db';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth';
import { agentOrchestrator } from '../services/agentOrchestrator';

const BASE_URL = 'http://localhost:8000/api';

// Helper to generate Authority Auth Token
function getAuthorityToken(): string {
  return jwt.sign(
    { id: 'usr-admin-test', name: 'Commander Test Vance', role: 'authority_command', email: 'vance@resq.gov' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Helper to make fetch calls
async function api(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runE2ETests() {
  console.log('\n================================================================');
  console.log('  NEXUS RESQ — END-TO-END DATABASE LIFECYCLE TEST SUITE');
  console.log('================================================================\n');

  const authHeader = { Authorization: `Bearer ${getAuthorityToken()}` };

  // Ensure at least 1 responder is AVAILABLE in DB
  await query(`UPDATE responders SET status = 'AVAILABLE', current_incident_id = NULL WHERE id = 'R-01'`);

  let createdSosId = '';
  let createdIncId = '';
  let createdPlanId = '';
  let createdApprovalId = '';
  const testIdempotencyKey = `IDEMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  // ============================================================
  // TEST 1 — CITIZEN REQUEST CREATION
  // ============================================================
  console.log('--> TEST 1: Citizen SOS Submission');
  const sosPayload = {
    emergency_type: 'flood',
    assistance_needed: ['RESCUE', 'EVACUATION'],
    location_name: 'Sector 17 Plaza, Chandigarh',
    formatted_address: 'Sector 17 Plaza, Chandigarh, Punjab 160017',
    latitude: 30.7398,
    longitude: 76.7827,
    accuracy: 12,
    description: 'Flash flooding near commercial plaza. Multiple citizens need rescue.',
    contact_name: 'Citizen Test User',
    contact_phone: '+91 98765 43210',
    idempotency_key: testIdempotencyKey,
  };

  const reqRes = await api('/emergency/request', {
    method: 'POST',
    body: JSON.stringify(sosPayload),
  });

  if (reqRes.status !== 201 || !reqRes.data?.success) {
    throw new Error(`TEST 1 FAILED: /emergency/request failed with status ${reqRes.status}: ${JSON.stringify(reqRes.data)}`);
  }

  createdSosId = reqRes.data.data.requestId || reqRes.data.data.id;
  createdIncId = reqRes.data.data.incidentId || reqRes.data.data.incident_id;

  if (!createdSosId.startsWith('SOS-') || !createdIncId.startsWith('INC-')) {
    throw new Error(`TEST 1 FAILED: Non-canonical IDs returned: sosId=${createdSosId}, incId=${createdIncId}`);
  }

  // PostgreSQL Verification
  const dbReq = await query(`SELECT * FROM emergency_requests WHERE id = $1`, [createdSosId]);
  const dbInc = await query(`SELECT * FROM incidents WHERE id = $1`, [createdIncId]);
  const dbRep = await query(`SELECT * FROM incident_reports WHERE id = $1`, [createdSosId]);
  const dbHist = await query(`SELECT * FROM incident_status_history WHERE request_id = $1`, [createdSosId]);

  if (dbReq.rowCount === 0) throw new Error(`TEST 1 FAILED: emergency_requests row not found in DB`);
  if (dbInc.rowCount === 0) throw new Error(`TEST 1 FAILED: incidents row not found in DB`);
  if (dbRep.rowCount === 0) throw new Error(`TEST 1 FAILED: incident_reports row not found in DB`);
  if (dbHist.rowCount === 0) throw new Error(`TEST 1 FAILED: incident_status_history row not found in DB`);

  if (dbInc.rows[0].request_id !== createdSosId) {
    throw new Error(`TEST 1 FAILED: Incidents request_id (${dbInc.rows[0].request_id}) != createdSosId (${createdSosId})`);
  }
  console.log(`✓ TEST 1 PASSED: Created canonical Request ${createdSosId} and Incident ${createdIncId} in PostgreSQL.`);

  // ============================================================
  // TEST 2 — AUTHORITY DASHBOARD & INCIDENT RETRIEVAL
  // ============================================================
  console.log('\n--> TEST 2: Authority Incident Retrieval');
  const incsRes = await api('/incidents');
  if (!incsRes.ok || !incsRes.data?.success) throw new Error(`TEST 2 FAILED: /incidents failed`);
  const foundInc = incsRes.data.data.find((i: any) => i.id === createdIncId);
  if (!foundInc) throw new Error(`TEST 2 FAILED: Incident ${createdIncId} not in /incidents list`);
  if (foundInc.requestId !== createdSosId && foundInc.request_id !== createdSosId) {
    throw new Error(`TEST 2 FAILED: Incident in Authority view is missing canonical requestId`);
  }

  const overviewRes = await api('/command/overview');
  if (!overviewRes.ok || !overviewRes.data) throw new Error(`TEST 2 FAILED: /command/overview failed`);
  const overviewInc = overviewRes.data.data?.incidents?.find((i: any) => i.id === createdIncId);
  if (!overviewInc) throw new Error(`TEST 2 FAILED: Incident ${createdIncId} not in /command/overview`);
  console.log(`✓ TEST 2 PASSED: Authority queries retrieved exact same Incident ${createdIncId} linked to ${createdSosId}.`);

  // ============================================================
  // TEST 3 — 11 AI AGENTS EXECUTION
  // ============================================================
  console.log('\n--> TEST 3: 11 AI Agents Pipeline Execution');
  // Run cycle synchronously for this incident to guarantee 11/11 completion
  const orchResult = await agentOrchestrator.runCycle(createdIncId, false);
  if (!orchResult) throw new Error(`TEST 3 FAILED: runCycle returned null for ${createdIncId}`);

  createdPlanId = orchResult.planId;
  createdApprovalId = orchResult.approvalId;

  // Verify all 11 agents in agent_execution_records
  const agentsDb = await query(
    `SELECT agent_id, agent_name, status FROM agent_execution_records WHERE plan_id = $1 ORDER BY agent_id ASC`,
    [createdPlanId]
  );

  if (agentsDb.rowCount !== 11) {
    throw new Error(`TEST 3 FAILED: Expected 11 agent execution records in DB, found ${agentsDb.rowCount}`);
  }
  const incomplete = agentsDb.rows.filter((r) => r.status !== 'COMPLETE');
  if (incomplete.length > 0) {
    throw new Error(`TEST 3 FAILED: Some agents not COMPLETE: ${JSON.stringify(incomplete)}`);
  }
  console.log(`✓ TEST 3 PASSED: All 11 agents executed and stored in agent_execution_records for ${createdPlanId}.`);

  // ============================================================
  // TEST 4 — RESPONSE PLAN PERSISTENCE
  // ============================================================
  console.log('\n--> TEST 4: Response Plan & Approval Gate Persistence');
  const planDb = await query(`SELECT * FROM orchestration_plans WHERE plan_id = $1`, [createdPlanId]);
  const recDb = await query(`SELECT * FROM ai_recommendations WHERE id = $1`, [createdPlanId]);
  const appDb = await query(`SELECT * FROM approvals WHERE plan_id = $1`, [createdPlanId]);

  if (planDb.rowCount === 0) throw new Error(`TEST 4 FAILED: orchestration_plans record missing for ${createdPlanId}`);
  if (recDb.rowCount === 0) throw new Error(`TEST 4 FAILED: ai_recommendations record missing for ${createdPlanId}`);
  if (appDb.rowCount === 0) throw new Error(`TEST 4 FAILED: approvals record missing for ${createdPlanId}`);

  if (planDb.rows[0].incident_id !== createdIncId) {
    throw new Error(`TEST 4 FAILED: Plan incident_id mismatch`);
  }
  if (appDb.rows[0].status !== 'PENDING') {
    throw new Error(`TEST 4 FAILED: Approval status is ${appDb.rows[0].status}, expected PENDING`);
  }
  console.log(`✓ TEST 4 PASSED: Plan ${createdPlanId} persisted in DB and waiting for human approval.`);

  // ============================================================
  // TEST 5 — HUMAN APPROVAL VIA AUTHORITY API
  // ============================================================
  console.log('\n--> TEST 5: Human Authority Approval');
  const approveRes = await api(`/approvals/${createdPlanId}/approve`, {
    method: 'POST',
    headers: authHeader,
  });

  if (approveRes.status !== 200 || !approveRes.data?.success) {
    throw new Error(`TEST 5 FAILED: /approvals/:id/approve returned status ${approveRes.status}: ${JSON.stringify(approveRes.data)}`);
  }

  // Verify PostgreSQL DB State Changes
  const postApp = await query(`SELECT status FROM approvals WHERE plan_id = $1`, [createdPlanId]);
  const postPlan = await query(`SELECT status, approval_status, execution_status FROM orchestration_plans WHERE plan_id = $1`, [createdPlanId]);
  const postInc = await query(`SELECT status, assigned_responder_id FROM incidents WHERE id = $1`, [createdIncId]);
  const postReq = await query(`SELECT status, assigned_responder_id, assigned_mission_id FROM emergency_requests WHERE id = $1`, [createdSosId]);
  const postMsn = await query(`SELECT * FROM missions WHERE incident_id = $1`, [createdIncId]);
  const postDsp = await query(`SELECT * FROM dispatch_records WHERE incident_id = $1`, [createdIncId]);

  if (postApp.rows[0]?.status !== 'APPROVED') throw new Error(`TEST 5 FAILED: approvals status != APPROVED`);
  if (postPlan.rows[0]?.status !== 'EXECUTING') throw new Error(`TEST 5 FAILED: orchestration_plans status != EXECUTING`);
  if (postInc.rows[0]?.status !== 'RESPONDING') throw new Error(`TEST 5 FAILED: incidents status != RESPONDING`);
  if (postReq.rows[0]?.status !== 'ASSIGNED') throw new Error(`TEST 5 FAILED: emergency_requests status != ASSIGNED`);
  if (postMsn.rowCount === 0) throw new Error(`TEST 5 FAILED: mission record not created in DB`);
  if (postDsp.rowCount === 0) throw new Error(`TEST 5 FAILED: dispatch_records not created in DB`);
  if (postMsn.rows[0].plan_id !== createdPlanId) {
    throw new Error(`TEST 5 FAILED: missions plan_id (${postMsn.rows[0].plan_id}) != ${createdPlanId}`);
  }
  console.log(`✓ TEST 5 PASSED: Plan approved transactionally; mission, dispatch, and responder assigned in DB.`);

  // ============================================================
  // TEST 6 — DISPATCH RECORD & RESPONDER ASSIGNMENT INTEGRITY
  // ============================================================
  console.log('\n--> TEST 6: Dispatch & Foreign Key Integrity');
  const assignedRespId = postInc.rows[0].assigned_responder_id;
  const respDb = await query(`SELECT * FROM responders WHERE id = $1`, [assignedRespId]);
  if (respDb.rowCount === 0) throw new Error(`TEST 6 FAILED: Assigned responder ${assignedRespId} not in DB`);
  if (respDb.rows[0].current_incident_id !== createdIncId) {
    throw new Error(`TEST 6 FAILED: Responder current_incident_id (${respDb.rows[0].current_incident_id}) != ${createdIncId}`);
  }
  console.log(`✓ TEST 6 PASSED: Real responder ${respDb.rows[0].name} (${assignedRespId}) linked to ${createdIncId}.`);

  // ============================================================
  // TEST 7 — RESPONDER RETRIEVES REAL ASSIGNMENT (PLAN ID & COORDS)
  // ============================================================
  console.log('\n--> TEST 7: Responder Mission Query');
  const msnRes = await api(`/responders/mission?incidentId=${createdIncId}`);
  if (!msnRes.ok || !msnRes.data?.data) throw new Error(`TEST 7 FAILED: /responders/mission query failed`);
  const msn = msnRes.data.data;

  if (msn.incidentId !== createdIncId) throw new Error(`TEST 7 FAILED: Mission incidentId mismatch`);
  if (msn.planId !== createdPlanId) throw new Error(`TEST 7 FAILED: Mission planId (${msn.planId}) != approved ${createdPlanId}`);
  if (!msn.destinationLat || !msn.destinationLng) throw new Error(`TEST 7 FAILED: Real destination coordinates missing`);
  console.log(`✓ TEST 7 PASSED: Responder received Incident ${createdIncId}, Plan ${createdPlanId}, Coords [${msn.destinationLat}, ${msn.destinationLng}].`);

  // ============================================================
  // TEST 8 — EXECUTION STATUS ADVANCE & DB PROPAGATION
  // ============================================================
  console.log('\n--> TEST 8: Execution Status Lifecycle Progression');
  const executionSteps = ['DEPARTED', 'ON_THE_WAY', 'ARRIVED', 'COMPLETED'];
  for (const step of executionSteps) {
    const statusUpdateRes = await api('/tracking/status', {
      method: 'POST',
      body: JSON.stringify({
        incidentId: createdIncId,
        requestId: createdSosId,
        responderId: assignedRespId,
        status: step,
        actor: 'Test Responder Alpha',
        notes: `Operational test transition to ${step}`,
      }),
    });

    if (!statusUpdateRes.ok || !statusUpdateRes.data?.success) {
      throw new Error(`TEST 8 FAILED: Status transition to ${step} failed: ${JSON.stringify(statusUpdateRes.data)}`);
    }

    // Verify DB reflects step
    const checkMsn = await query(`SELECT status FROM missions WHERE incident_id = $1`, [createdIncId]);
    const checkReq = await query(`SELECT status FROM emergency_requests WHERE id = $1`, [createdSosId]);
    const checkPlan = await query(`SELECT execution_status FROM orchestration_plans WHERE plan_id = $1`, [createdPlanId]);

    if (checkMsn.rows[0].status !== step) {
      throw new Error(`TEST 8 FAILED: Mission status in DB is ${checkMsn.rows[0].status}, expected ${step}`);
    }
    if (checkReq.rows[0].status !== step) {
      throw new Error(`TEST 8 FAILED: Emergency request status in DB is ${checkReq.rows[0].status}, expected ${step}`);
    }
    if (checkPlan.rows[0].execution_status !== step) {
      throw new Error(`TEST 8 FAILED: Orchestration plan execution_status in DB is ${checkPlan.rows[0].execution_status}, expected ${step}`);
    }
    console.log(`  -> Transitioned to ${step} (DB verified: missions=${step}, emergency_requests=${step})`);
  }

  // Verify COMPLETED releases responder and resolves incident
  const finalResp = await query(`SELECT status, current_incident_id FROM responders WHERE id = $1`, [assignedRespId]);
  const finalInc = await query(`SELECT status FROM incidents WHERE id = $1`, [createdIncId]);

  if (finalResp.rows[0].status !== 'AVAILABLE') throw new Error(`TEST 8 FAILED: Responder not restored to AVAILABLE`);
  if (finalResp.rows[0].current_incident_id !== null) throw new Error(`TEST 8 FAILED: Responder current_incident_id not cleared`);
  if (finalInc.rows[0].status !== 'RESOLVED') throw new Error(`TEST 8 FAILED: Incident not marked RESOLVED`);
  console.log(`✓ TEST 8 PASSED: Full execution lifecycle completed and resources released.`);

  // ============================================================
  // TEST 9 — CITIZEN TRACKING AND PERSISTENT SYNC
  // ============================================================
  console.log('\n--> TEST 9: Citizen Tracking Reflection');
  const trackRes = await api(`/tracking/request/${createdSosId}`);
  if (!trackRes.ok || !trackRes.data?.data) throw new Error(`TEST 9 FAILED: /tracking/request/${createdSosId} failed`);
  const bundle = trackRes.data.data;
  if (bundle.lifecycle.currentStatus !== 'COMPLETED') {
    throw new Error(`TEST 9 FAILED: Citizen tracking currentStatus is ${bundle.lifecycle.currentStatus}, expected COMPLETED`);
  }

  const reqGetRes = await api(`/emergency/requests/${createdSosId}`);
  if (!reqGetRes.ok || !reqGetRes.data?.data) throw new Error(`TEST 9 FAILED: /emergency/requests/${createdSosId} failed`);
  const reqDetails = reqGetRes.data.data;
  if (reqDetails.incident_status !== 'RESOLVED') {
    throw new Error(`TEST 9 FAILED: Request incident_status is ${reqDetails.incident_status}, expected RESOLVED`);
  }
  console.log(`✓ TEST 9 PASSED: Citizen tracking correctly reflects completed operational lifecycle from PostgreSQL.`);

  // ============================================================
  // TEST 10 — IDEMPOTENCY: DUPLICATE APPROVAL PROTECTION
  // ============================================================
  console.log('\n--> TEST 10: Idempotent Approval Protection');
  const dupApproveRes = await api(`/approvals/${createdPlanId}/approve`, {
    method: 'POST',
    headers: authHeader,
  });

  // Expected: 200 with already approved notice or clean alreadyDecided response
  if (!dupApproveRes.ok && dupApproveRes.status !== 409) {
    throw new Error(`TEST 10 FAILED: Duplicate approval returned unexpected status ${dupApproveRes.status}`);
  }

  // Verify no duplicate dispatches created in DB
  const dspCount = await query(`SELECT COUNT(*) as count FROM dispatch_records WHERE incident_id = $1`, [createdIncId]);
  if (parseInt(dspCount.rows[0].count, 10) > 1) {
    throw new Error(`TEST 10 FAILED: Duplicate dispatch record created in DB! Count: ${dspCount.rows[0].count}`);
  }
  console.log(`✓ TEST 10 PASSED: Duplicate approval handled cleanly; no duplicate dispatch created.`);

  // ============================================================
  // TEST 11 — IDEMPOTENCY: DUPLICATE REQUEST PROTECTION
  // ============================================================
  console.log('\n--> TEST 11: Idempotent Request Creation Protection');
  const dupReqRes = await api('/emergency/request', {
    method: 'POST',
    body: JSON.stringify(sosPayload), // same payload with same idempotency_key
  });

  if (dupReqRes.status !== 200) {
    throw new Error(`TEST 11 FAILED: Expected 200 for duplicate request, got ${dupReqRes.status}`);
  }
  const dupReturnedId = dupReqRes.data.data.requestId || dupReqRes.data.data.id;
  const dupReturnedInc = dupReqRes.data.data.incidentId || dupReqRes.data.data.incident_id;

  if (dupReturnedId !== createdSosId || dupReturnedInc !== createdIncId) {
    throw new Error(`TEST 11 FAILED: Duplicate submission spawned new IDs: ${dupReturnedId} / ${dupReturnedInc} instead of ${createdSosId}`);
  }
  console.log(`✓ TEST 11 PASSED: Duplicate submission returned existing ${createdSosId} without creating duplicate incident.`);

  // ============================================================
  // TEST 12 — CONTROLLED ERROR HANDLING FOR INVALID STATES
  // ============================================================
  console.log('\n--> TEST 12: Controlled Error Handling (No 500s or SQL leaks)');

  // 12a: Nonexistent plan approval
  const nonExistentApp = await api('/approvals/PLAN-NONEXISTENT-9999/approve', {
    method: 'POST',
    headers: authHeader,
  });
  if (nonExistentApp.status !== 404) {
    throw new Error(`TEST 12a FAILED: Nonexistent plan approval returned status ${nonExistentApp.status}, expected 404`);
  }

  // 12b: Foreign key check on responder update
  const invalidFkRes = await api('/responders/R-01', {
    method: 'PATCH',
    body: JSON.stringify({ current_incident_id: 'INC-DOES-NOT-EXIST-8888' }),
  });
  if (invalidFkRes.status !== 404) {
    throw new Error(`TEST 12b FAILED: Invalid FK update returned status ${invalidFkRes.status}, expected 404`);
  }
  if (invalidFkRes.data?.error?.includes('violates foreign key constraint')) {
    throw new Error(`TEST 12b FAILED: Leaked raw PostgreSQL foreign key error to client!`);
  }

  // 12c: Missing location in emergency request
  const invalidReq = await api('/emergency/request', {
    method: 'POST',
    body: JSON.stringify({ emergency_type: 'fire', assistance_needed: ['FIRE'] }),
  });
  if (invalidReq.status !== 400) {
    throw new Error(`TEST 12c FAILED: Invalid request returned ${invalidReq.status}, expected 400`);
  }

  console.log(`✓ TEST 12 PASSED: Invalid states return controlled 400/404 responses with zero SQL leak.`);

  console.log('\n================================================================');
  console.log('  ALL 12 END-TO-END DATABASE LIFECYCLE TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
  process.exit(0);
}

runE2ETests().catch((err) => {
  console.error('\n❌ E2E TEST SUITE FAILED:', err.message);
  process.exit(1);
});
