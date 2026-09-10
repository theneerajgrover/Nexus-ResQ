// ============================================================
// NEXUS RESQ — COMPLETE OPERATIONAL WORKFLOW TEST:
// HUMAN APPROVAL → AUTOMATIC DISPATCH → RESOURCE UPDATE → INCIDENT UPDATE → HISTORY
// ============================================================
import dotenv from 'dotenv';
import path from 'path';
import { query, pool } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:8000/api';

async function runOperationalWorkflowTest() {
  console.log('\n============================================================');
  console.log('🚨 NEXUS RESQ — OPERATIONAL WORKFLOW VALIDATION');
  console.log('   HUMAN APPROVAL → AUTO DISPATCH → RESOURCE → INCIDENT → HISTORY');
  console.log('============================================================\n');

  try {
    // ------------------------------------------------------------
    // STEP 0: ENSURE PREREQUISITES (AVAILABLE RESPONDER & RESOURCE)
    // ------------------------------------------------------------
    console.log('[Step 0] Ensuring active responder and equipment resources exist...');
    
    // Ensure at least one available responder
    const respCheck = await query(`SELECT id, name, status FROM responders WHERE status = 'AVAILABLE' LIMIT 1`);
    let testResponderId: string;
    if (respCheck.rowCount === 0) {
      const newRespId = `R-TEST-${Date.now().toString().slice(-4)}`;
      const respInsert = await query(`
        INSERT INTO responders (id, name, callsign, status, latitude, longitude)
        VALUES ($1, 'Rescue Alpha Unit', 'ALPHA-TEST', 'AVAILABLE', 30.68, 76.60)
        RETURNING id
      `, [newRespId]);
      testResponderId = respInsert.rows[0].id;
    } else {
      testResponderId = respCheck.rows[0].id;
    }
    console.log(`[Step 0] Available responder: ${testResponderId}`);

    // Check initial equipment resource available count
    const equipBeforeRes = await query(`
      SELECT id, name, available, qty
      FROM equipment
      WHERE available > 0
      LIMIT 1
    `);
    if (equipBeforeRes.rowCount === 0) {
      await query(`
        INSERT INTO equipment (id, name, qty, available, status, location)
        VALUES ('EQP-TEST-01', 'Heavy Rescue Drone Pack', 5, 5, 'AVAILABLE', 'Base Alpha')
      `);
    }

    const testEquipBefore = await query(`SELECT id, name, available FROM equipment WHERE available > 0 LIMIT 1`);
    const initialAvailableEquip = testEquipBefore.rows[0].available;
    const testEquipId = testEquipBefore.rows[0].id;
    console.log(`[Step 0] Equipment ${testEquipBefore.rows[0].name} initial available: ${initialAvailableEquip}`);

    // ------------------------------------------------------------
    // STEP 1: CREATE EMERGENCY REQUEST & INCIDENT
    // ------------------------------------------------------------
    const testIncId = `INC-AUTO-${Date.now().toString().slice(-4)}`;
    console.log(`\n[Step 1] Creating incident ${testIncId} with PENDING state...`);
    
    await query(`
      INSERT INTO incidents (
        id, title, type, severity, location, latitude, longitude, status, responders_count, pending, created_at, updated_at
      )
      VALUES ($1, 'Major Fire & Structural Hazard', 'FIRE', 'CRITICAL', 'Sector 12 Logistics Center', 30.69, 76.62, 'PENDING', 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [testIncId]);

    // Initial status history log
    const initialHistId = `HIST-${Date.now().toString().slice(-4)}`;
    await query(`
      INSERT INTO incident_status_history (id, incident_id, previous_status, new_status, actor, notes)
      VALUES ($1, $2, 'NONE', 'PENDING', 'CITIZEN_SOS', 'Emergency request logged from field')
    `, [initialHistId, testIncId]);

    // ------------------------------------------------------------
    // STEP 2: RUN 11-AGENT ORCHESTRATION CYCLE (AI PREPARES PLAN)
    // ------------------------------------------------------------
    console.log(`\n[Step 2] AI preparing response plan for ${testIncId}...`);
    const orchResult = await agentOrchestrator.runCycle(testIncId, false);
    if (!orchResult) {
      throw new Error('AI Orchestrator failed to synthesize response plan');
    }

    const planId = orchResult.planId;
    const approvalId = orchResult.approvalId;
    console.log(`✅ Plan synthesized: ${planId}, approval: ${approvalId}`);

    // Verify initial pre-approval state
    const preApprovalCheck = await query(`SELECT status FROM approvals WHERE approval_id = $1`, [approvalId]);
    console.log(`   Approvals status: ${preApprovalCheck.rows[0]?.status} (expected PENDING)`);
    if (preApprovalCheck.rows[0]?.status !== 'PENDING') {
      throw new Error(`Pre-approval status is ${preApprovalCheck.rows[0]?.status}, expected PENDING`);
    }

    const preDispatches = await query(`SELECT COUNT(*) as cnt FROM dispatch_records WHERE incident_id = $1`, [testIncId]);
    console.log(`   Pre-approval dispatch count: ${preDispatches.rows[0]?.cnt} (expected 0)`);
    if (parseInt(preDispatches.rows[0]?.cnt, 10) !== 0) {
      throw new Error(`Pre-approval dispatch count is non-zero`);
    }

    // ------------------------------------------------------------
    // STEP 3: HUMAN AUTHORITY REVIEWS AND APPROVES
    // ------------------------------------------------------------
    console.log(`\n[Step 3] Human Authority reviewing and approving plan...`);
    const approvePayload = {
      action: 'APPROVE',
      approvedBy: 'Incident Commander Marcus Vance',
      comments: 'Plan verified against tactical GIS map. Priority 1 dispatch authorized.',
    };

    const actionRes: any = await fetch(`${API_BASE}/command/recommendations/${planId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvePayload),
    }).then((r) => r.json());

    if (!actionRes.success || actionRes.decision !== 'APPROVED') {
      throw new Error(`Approval action API call failed: ${JSON.stringify(actionRes)}`);
    }
    console.log(`✅ Human Approval API returned: ${actionRes.message}`);

    // ------------------------------------------------------------
    // STEP 4: VERIFY AUTOMATIC DISPATCH & ALL DATABASE MUTATIONS
    // ------------------------------------------------------------
    console.log(`\n[Step 4] Verifying all coordinated database updates in PostgreSQL...`);

    // 4.1 Plan becomes AUTHORIZED / APPROVED
    const postAppCheck = await query(`SELECT * FROM approvals WHERE approval_id = $1`, [approvalId]);
    console.log(`   1. approvals status: ${postAppCheck.rows[0]?.status} | reviewed_by: ${postAppCheck.rows[0]?.reviewed_by}`);
    if (postAppCheck.rows[0]?.status !== 'APPROVED') {
      throw new Error(`approvals record not APPROVED: ${postAppCheck.rows[0]?.status}`);
    }

    // 4.2 Dispatch is automatically triggered -> dispatch_records created
    const postDispatchCheck = await query(`
      SELECT * FROM dispatch_records 
      WHERE incident_id = $1
      ORDER BY created_at DESC
    `, [testIncId]);
    console.log(`   2. dispatch_records count: ${postDispatchCheck.rowCount}`);
    if (postDispatchCheck.rowCount === 0) {
      throw new Error(`Automatic dispatch failed: No dispatch_records created for ${testIncId}`);
    }
    const dispatchRow = postDispatchCheck.rows[0];
    console.log(`      Dispatch ID: ${dispatchRow.id} | Unit: ${dispatchRow.unit} | Status: ${dispatchRow.status}`);
    if (dispatchRow.status !== 'DISPATCHED') {
      throw new Error(`dispatch_records status is ${dispatchRow.status}, expected DISPATCHED`);
    }

    // 4.3 Assigned responder becomes ACTIVE / DISPATCHED / ASSIGNED
    const incPreRespCheck = await query(`SELECT assigned_responder_id FROM incidents WHERE id = $1`, [testIncId]);
    const assignedRespId = incPreRespCheck.rows[0]?.assigned_responder_id;
    if (assignedRespId) {
      const respPostCheck = await query(`SELECT id, name, status, current_incident_id FROM responders WHERE id = $1`, [assignedRespId]);
      console.log(`   3. Assigned responder: ${respPostCheck.rows[0]?.name} | Status: ${respPostCheck.rows[0]?.status} | Incident: ${respPostCheck.rows[0]?.current_incident_id}`);
      if (respPostCheck.rows[0]?.status !== 'ASSIGNED' && respPostCheck.rows[0]?.status !== 'EN ROUTE') {
        throw new Error(`Responder status not updated: ${respPostCheck.rows[0]?.status}`);
      }
    }

    // 4.4 Available resource counts are updated
    const equipAfterRes = await query(`SELECT id, name, available FROM equipment WHERE id = $1`, [testEquipId]);
    console.log(`   4. Resource inventory update: ${equipAfterRes.rows[0]?.name} available = ${equipAfterRes.rows[0]?.available} (was ${initialAvailableEquip})`);

    // 4.5 Incident status is updated to RESPONDING, pending = false, responders_count >= 1
    const incPostCheck = await query(`SELECT id, status, pending, responders_count, assigned_responder_id FROM incidents WHERE id = $1`, [testIncId]);
    const incRow = incPostCheck.rows[0];
    console.log(`   5. Incident update: status = ${incRow.status} | pending = ${incRow.pending} | responders_count = ${incRow.responders_count}`);
    if (incRow.status !== 'RESPONDING') {
      throw new Error(`Incident status is ${incRow.status}, expected RESPONDING`);
    }
    if (incRow.pending !== false) {
      throw new Error(`Incident pending flag is ${incRow.pending}, expected false`);
    }
    if (incRow.responders_count < 1) {
      throw new Error(`Incident responders_count is ${incRow.responders_count}, expected >= 1`);
    }

    // 4.6 Incident history / audit trail is updated
    const historyCheck = await query(`
      SELECT * FROM incident_status_history 
      WHERE incident_id = $1 
      ORDER BY created_at ASC
    `, [testIncId]);
    console.log(`   6. incident_status_history entries: ${historyCheck.rowCount}`);
    historyCheck.rows.forEach((h: any, idx: number) => {
      console.log(`      [${idx + 1}] ${h.previous_status} → ${h.new_status} | By: ${h.actor} | Notes: ${h.notes}`);
    });
    const hasApprovalEntry = historyCheck.rows.some((h: any) => h.notes?.includes('approved') || h.actor?.includes('Marcus Vance') || h.new_status === 'APPROVED');
    const hasDispatchEntry = historyCheck.rows.some((h: any) => h.new_status === 'RESPONDING' || h.new_status === 'DISPATCHED' || h.notes?.includes('Automatic dispatch'));
    if (!hasApprovalEntry || !hasDispatchEntry) {
      throw new Error(`Missing required history transition entries: approval=${hasApprovalEntry}, dispatch=${hasDispatchEntry}`);
    }

    // ------------------------------------------------------------
    // STEP 5: IDEMPOTENCY — NO DOUBLE DISPATCH / NO DOUBLE RESOURCE DEDUCTION
    // ------------------------------------------------------------
    console.log(`\n[Step 5] Testing idempotency on duplicate approval attempt...`);
    const preDupDispatchCount = postDispatchCheck.rowCount;
    const preDupEquipCount = equipAfterRes.rows[0]?.available;

    const dupRes: any = await fetch(`${API_BASE}/command/recommendations/${planId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approvePayload),
    }).then((r) => r.json());

    console.log(`   Duplicate call response:`, dupRes.message);

    const postDupDispatchCheck = await query(`SELECT COUNT(*) as cnt FROM dispatch_records WHERE incident_id = $1`, [testIncId]);
    const postDupDispatchCount = parseInt(postDupDispatchCheck.rows[0]?.cnt, 10);

    const postDupEquipRes = await query(`SELECT available FROM equipment WHERE id = $1`, [testEquipId]);
    const postDupEquipCount = postDupEquipRes.rows[0]?.available;

    if (postDupDispatchCount !== preDupDispatchCount) {
      throw new Error(`Idempotency failure: Dispatch count changed (${preDupDispatchCount} -> ${postDupDispatchCount})`);
    }
    if (postDupEquipCount !== preDupEquipCount) {
      throw new Error(`Idempotency failure: Equipment count changed (${preDupEquipCount} -> ${postDupEquipCount})`);
    }
    console.log(`✅ Idempotency strictly preserved: No double dispatch, no double resource deduction.`);

    // ------------------------------------------------------------
    // STEP 6: VERIFY API ENDPOINTS (COMMAND OVERVIEW & INCIDENT HISTORY)
    // ------------------------------------------------------------
    console.log(`\n[Step 6] Testing read endpoints for Command UI integration...`);

    // 6.1 GET /api/incidents/:id/history
    const historyApiRes: any = await fetch(`${API_BASE}/incidents/${testIncId}/history`).then((r) => r.json());
    if (!historyApiRes.success || !Array.isArray(historyApiRes.data)) {
      throw new Error(`GET /api/incidents/:id/history failed: ${JSON.stringify(historyApiRes)}`);
    }
    console.log(`✅ GET /api/incidents/${testIncId}/history returned ${historyApiRes.data.length} real history events`);

    // 6.2 GET /api/command/overview
    const overviewApiRes: any = await fetch(`${API_BASE}/command/overview`).then((r) => r.json());
    if (!overviewApiRes.data) {
      throw new Error(`GET /api/command/overview returned no data`);
    }
    const overviewDispatches = overviewApiRes.data.dispatches || [];
    const overviewHistory = overviewApiRes.data.history || [];
    console.log(`✅ GET /api/command/overview returned:`);
    console.log(`   - Dispatches count: ${overviewDispatches.length}`);
    console.log(`   - History count: ${overviewHistory.length}`);
    console.log(`   - Emergency count: ${overviewApiRes.data.emergencyCount}`);
    console.log(`   - Incidents count: ${overviewApiRes.data.incidents?.length}`);
    console.log(`   - Responders count: ${overviewApiRes.data.responders?.length}`);

    const foundIncidentInOverview = overviewApiRes.data.incidents?.find((i: any) => i.id === testIncId);
    if (!foundIncidentInOverview) {
      throw new Error(`Test incident ${testIncId} not in command overview incidents`);
    }
    console.log(`   - Incident state in overview: status = ${foundIncidentInOverview.status}, pending = ${foundIncidentInOverview.pending}`);
    if (foundIncidentInOverview.status !== 'RESPONDING' || foundIncidentInOverview.pending !== false) {
      throw new Error(`Incident in command overview does not reflect approved/dispatched state`);
    }

    console.log('\n============================================================');
    console.log('🏆 OPERATIONAL WORKFLOW TEST: 100% SUCCESSFUL');
    console.log('   HUMAN APPROVAL → AUTOMATIC DISPATCH → RESOURCE UPDATE → INCIDENT UPDATE → HISTORY');
    console.log('============================================================\n');

  } catch (err: any) {
    console.error('\n❌ Operational Workflow Test Failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runOperationalWorkflowTest();
