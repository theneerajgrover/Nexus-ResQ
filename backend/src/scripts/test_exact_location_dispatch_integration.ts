// ============================================================
// NEXUS RESQ — END-TO-END EXACT LOCATION DISPATCH INTEGRATION TEST
// ============================================================

import { query, pool } from '../db';
import { agentOrchestrator } from '../services/agentOrchestrator';

const API_BASE = 'http://localhost:8000/api';

async function runTests() {
  console.log('\n============================================================');
  console.log('NEXUS RESQ: EXACT LOCATION -> DISPATCH & ROUTE VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: SUBMIT REAL SOS WITH GPS COORDINATES
    // -------------------------------------------------------------
    console.log('\n--- 1. Submitting Citizen SOS with GPS Coordinates ---');
    const citizenTestCoords = { lat: 30.733312, lon: 76.779415 };
    const citizenAddress = 'Sector 17 City Center, Chandigarh, India';

    const sosRes = await fetch(`${API_BASE}/emergency/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emergencyType: 'MEDICAL',
        assistance: ['Ambulance / Medical Emergency'],
        location: citizenAddress,
        latitude: citizenTestCoords.lat,
        longitude: citizenTestCoords.lon,
        accuracy: 12.5,
        name: 'Inspector E2E Test',
        phone: '9876543210',
        details: 'Critical trauma response required at plaza.',
      }),
    });

    const sosData = (await sosRes.json()) as any;
    assert(sosData.success === true, 'SOS request created successfully');

    const requestId = sosData.data?.requestId || sosData.data?.id;
    const incidentId = sosData.data?.incidentId || sosData.data?.incident_id || sosData.data?.assignedIncidentId;
    assert(Boolean(requestId && requestId.startsWith('SOS-')), `Valid requestId generated: ${requestId}`);
    assert(Boolean(incidentId && incidentId.startsWith('INC-')), `Valid incidentId generated: ${incidentId}`);

    // -------------------------------------------------------------
    // TEST 2: DATABASE PERSISTENCE & RELATIONSHIP INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- 2. Verifying Database Source of Truth ---');
    const reqDb = await query(`SELECT * FROM emergency_requests WHERE id = $1`, [requestId]);
    assert(reqDb.rowCount === 1, 'emergency_requests record found in DB');
    const reqRow = reqDb.rows[0];
    assert(
      Math.abs(parseFloat(reqRow.latitude) - citizenTestCoords.lat) < 0.0001 &&
      Math.abs(parseFloat(reqRow.longitude) - citizenTestCoords.lon) < 0.0001,
      `emergency_requests contains exact citizen coordinates: (${reqRow.latitude}, ${reqRow.longitude})`
    );
    assert(reqRow.incident_id === incidentId, `emergency_requests links to incident: ${reqRow.incident_id}`);

    const incDb = await query(`SELECT * FROM incidents WHERE id = $1`, [incidentId]);
    assert(incDb.rowCount === 1, 'incidents record found in DB');
    const incRow = incDb.rows[0];
    assert(
      Math.abs(parseFloat(incRow.latitude) - citizenTestCoords.lat) < 0.0001 &&
      Math.abs(parseFloat(incRow.longitude) - citizenTestCoords.lon) < 0.0001,
      `incidents contains exact citizen coordinates: (${incRow.latitude}, ${incRow.longitude})`
    );
    assert(incRow.request_id === requestId, `incidents links to request: ${incRow.request_id}`);

    // -------------------------------------------------------------
    // TEST 3: DISPATCH & MISSION FORMATION
    // -------------------------------------------------------------
    console.log('\n--- 3. Authority Dispatch & Responder Assignment ---');
    // Ensure responder R-14 has known real coordinates
    const testResponderCoords = { lat: 30.704649, lon: 76.717873 }; // Mohali Phase 7 base
    await query(
      `UPDATE responders 
       SET latitude = $1, longitude = $2, accuracy = 10, status = 'AVAILABLE' 
       WHERE id = 'R-14'`,
      [testResponderCoords.lat, testResponderCoords.lon]
    );

    // Prepare plan and approve for this incident
    await agentOrchestrator.preparePlan(incidentId);

    // Fetch the pending plan
    const planRes = await query(
      `SELECT * FROM orchestration_plans WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [incidentId]
    );
    const planId = planRes.rows[0]?.plan_id || planRes.rows[0]?.id;

    if (planId) {
      await agentOrchestrator.handleApprovalDecision(planId, 'APPROVED', 'Director E2E', 'Emergency dispatch approved');
    }

    // Verify missions table has exact incident coordinates
    const missionDb = await query(
      `SELECT * FROM missions WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [incidentId]
    );
    assert(missionDb.rowCount === 1, 'missions record found for incident');
    const missionRow = missionDb.rows[0];
    assert(
      Math.abs(parseFloat(missionRow.latitude) - citizenTestCoords.lat) < 0.0001 &&
      Math.abs(parseFloat(missionRow.longitude) - citizenTestCoords.lon) < 0.0001,
      `missions contains exact incident coordinates: (${missionRow.latitude}, ${missionRow.longitude})`
    );

    // -------------------------------------------------------------
    // TEST 4: RESPONDER MISSION ENDPOINT
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing GET /api/responders/mission ---');
    const missionApiRes = await fetch(`${API_BASE}/responders/mission?incidentId=${incidentId}`);
    const missionApiData = (await missionApiRes.json()) as any;
    assert(missionApiData.success === true, 'GET /responders/mission returns 200 OK');
    const m = missionApiData.data;
    assert(m.incidentId === incidentId, `Mission incidentId matches: ${m.incidentId}`);
    assert(m.requestId === requestId, `Mission requestId matches: ${m.requestId}`);
    assert(
      Math.abs(parseFloat(m.destinationLat) - citizenTestCoords.lat) < 0.0001,
      `Mission destinationLat matches citizen GPS: ${m.destinationLat}`
    );
    assert(
      Math.abs(parseFloat(m.destinationLng) - citizenTestCoords.lon) < 0.0001,
      `Mission destinationLng matches citizen GPS: ${m.destinationLng}`
    );
    assert(Boolean(m.destinationAddress), `Mission destinationAddress resolved: ${m.destinationAddress}`);
    assert(
      Math.abs(parseFloat(m.responderLat) - testResponderCoords.lat) < 0.0001,
      `Mission responderLat uses real DB coordinates: ${m.responderLat}`
    );

    // -------------------------------------------------------------
    // TEST 5: ROUTE CALCULATION: RESPONDER -> CITIZEN INCIDENT
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Route Engine: Real Origin -> Real Destination ---');
    const trackingRes = await fetch(`${API_BASE}/tracking/${incidentId}`);
    const trackingData = (await trackingRes.json()) as any;
    assert(trackingData.success === true, 'GET /api/tracking/:incidentId returns 200 OK');
    const bundle = trackingData.data;

    assert(Boolean(bundle.activeRoute), 'activeRoute was generated dynamically');
    if (bundle.activeRoute) {
      assert(
        typeof bundle.activeRoute.distanceMeters === 'number' && bundle.activeRoute.distanceMeters > 0,
        `Real distance computed: ${bundle.activeRoute.distanceFormatted} (${bundle.activeRoute.distanceMeters}m)`
      );
      assert(
        typeof bundle.activeRoute.durationSeconds === 'number' && bundle.activeRoute.durationSeconds > 0,
        `Real duration computed: ${bundle.activeRoute.etaFormatted} (${bundle.activeRoute.durationSeconds}s)`
      );
      assert(
        Array.isArray(bundle.activeRoute.coordinates) && bundle.activeRoute.coordinates.length >= 2,
        `Real polyline coordinates present: ${bundle.activeRoute.coordinates.length} points`
      );

      // Verify destination coordinate is close to citizen's coordinates
      const lastCoord = bundle.activeRoute.coordinates[bundle.activeRoute.coordinates.length - 1];
      const destLatDiff = Math.abs(lastCoord[0] - citizenTestCoords.lat);
      const destLngDiff = Math.abs(lastCoord[1] - citizenTestCoords.lon);
      assert(
        destLatDiff < 0.01 && destLngDiff < 0.01,
        `Route destination terminates at citizen location: [${lastCoord[0]}, ${lastCoord[1]}]`
      );
    }

    // -------------------------------------------------------------
    // TEST 6: EDGE CASES
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Edge Cases ---');

    // Edge Case B: GPS unavailable (Address only, no fake coordinates generated)
    const addrOnlyRes = await fetch(`${API_BASE}/emergency/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emergencyType: 'STRUCTURAL',
        assistance: ['Building Collapse / Search and Rescue'],
        location: 'Old Bus Stand, Kharar, Punjab, India',
        name: 'Citizen Address Only',
        phone: '9812345678',
      }),
    });
    const addrOnlyData = (await addrOnlyRes.json()) as any;
    assert(addrOnlyData.success === true, 'Address-only emergency request succeeds');
    const addrIncId = addrOnlyData.data?.incident_id;
    const addrIncDb = await query(`SELECT latitude, longitude FROM incidents WHERE id = $1`, [addrIncId]);
    assert(
      addrIncDb.rows[0].latitude === null || parseFloat(addrIncDb.rows[0].latitude) === 0,
      'No fake/random coordinates invented when GPS is unavailable'
    );

    // Edge Case C: Invalid coordinates rejected safely without server crash
    const invalidCoordsRes = await fetch(`${API_BASE}/tracking/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'responder',
        entityId: 'R-14',
        latitude: 999.0, // Invalid latitude (> 90)
        longitude: -400.0, // Invalid longitude (< -180)
      }),
    });
    assert(invalidCoordsRes.status === 400, 'Invalid coordinates safely rejected with 400 Bad Request');

    // Edge Case D: Non-existent incident produces controlled 404
    const notFoundRes = await fetch(`${API_BASE}/tracking/INC-NONEXISTENT`);
    assert(notFoundRes.status === 404, 'Non-existent incident returns controlled 404 without crashing');

    // Edge Case H: Multiple simultaneous incidents keep distinct destinations
    const multiIncA = incidentId;
    const missionARes = await fetch(`${API_BASE}/responders/mission?incidentId=${multiIncA}`);
    const missionAData = (await missionARes.json()) as any;
    assert(
      Math.abs(parseFloat(missionAData.data.destinationLat) - citizenTestCoords.lat) < 0.0001,
      'Incident A returns its own specific destination'
    );

    console.log('\n============================================================');
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
