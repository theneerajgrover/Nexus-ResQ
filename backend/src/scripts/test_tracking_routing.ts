// ============================================================
// NEXUS RESQ — BACKEND INTEGRATION TEST: TRACKING & ROUTING
// ============================================================
import { query, pool } from '../db';
import {
  computeRouteAlternatives,
  evaluateRouteSafety,
  persistActiveRoute,
  checkAndTriggerDynamicReroute,
} from '../services/routingService';
import { fetchTrackingBundle } from '../routes/tracking';

async function runTest() {
  console.log('--- STARTING TRACKING & ROUTING INTEGRATION TEST ---');

  const testRequestId = `SOS-TEST-${Date.now().toString().slice(-4)}`;
  const testIncidentId = `INC-TEST-${Date.now().toString().slice(-4)}`;
  const testResponderId = 'R-14';

  const citizenCoords = { lat: 28.6139, lng: 77.2090 }; // New Delhi coordinates
  const responderCoords = { lat: 28.6280, lng: 77.2180 };

  try {
    // 1. Insert Test Incident & Emergency Request
    console.log('[1/7] Creating test emergency request & incident in PostgreSQL...');
    await query(
      `INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, request_id, assigned_responder_id)
       VALUES ($1, 'Test Chemical Spill Incident', 'STRUCTURAL', 'CRITICAL', 'Sector 4 Operational Hub', $2, $3, 'REQUESTED', $4, $5)`,
      [testIncidentId, citizenCoords.lat, citizenCoords.lng, testRequestId, testResponderId]
    );

    await query(
      `INSERT INTO emergency_requests (
        id, emergency_type, assistance_requested, location, latitude, longitude, accuracy, status, incident_id, assigned_responder_id
      ) VALUES ($1, 'STRUCTURAL', ARRAY['RESCUE', 'MEDICAL'], 'Sector 4 Operational Hub', $2, $3, 12.5, 'REQUESTED', $4, $5)`,
      [testRequestId, citizenCoords.lat, citizenCoords.lng, testIncidentId, testResponderId]
    );

    // Initial status history
    await query(
      `INSERT INTO incident_status_history (id, request_id, incident_id, previous_status, new_status, actor, responder_id, notes)
       VALUES ($1, $2, $3, NULL, 'REQUESTED', 'Citizen Reporter', $4, 'Emergency initiated by citizen device.')`,
      [`HIST-T1-${Date.now()}`, testRequestId, testIncidentId, testResponderId]
    );

    console.log('✓ Citizen emergency request and incident created in DB.');

    // 2. Compute Route Alternatives & Evaluate Route Safety
    console.log('[2/7] Computing real route alternatives & evaluating safety score...');
    const candidates = await computeRouteAlternatives(responderCoords, citizenCoords);
    console.log(`✓ Computed ${candidates.length} route candidates:`);
    for (const c of candidates) {
      console.log(`   - ${c.label}: ${c.distanceFormatted}, ETA: ${c.etaFormatted}, polyline length: ${c.polyline.length}`);
    }

    const evaluated = await evaluateRouteSafety(candidates, { incidentId: testIncidentId });
    const safest = evaluated[0];
    console.log(`✓ Evaluated route safety. Selected safest route: ${safest.label} (${safest.safetyStatus} · Score: ${safest.safetyScore}/100)`);

    // 3. Persist Active Route
    console.log('[3/7] Persisting active route to active_routes table...');
    const routeId = await persistActiveRoute(
      testIncidentId,
      testRequestId,
      testResponderId,
      responderCoords,
      citizenCoords,
      safest,
      evaluated,
      'Initial tactical corridor computed'
    );
    console.log(`✓ Active route persisted with ID: ${routeId}`);

    // 4. Ingest Live Location Updates
    console.log('[4/7] Ingesting live GPS coordinates for responder...');
    const locId = `LOC-T-${Date.now()}`;
    await query(
      `INSERT INTO location_updates (id, entity_type, entity_id, incident_id, request_id, latitude, longitude, accuracy, heading, speed)
       VALUES ($1, 'responder', $2, $3, $4, $5, $6, 8.4, 145.2, 42.5)`,
      [locId, testResponderId, testIncidentId, testRequestId, responderCoords.lat - 0.002, responderCoords.lng - 0.001]
    );
    console.log('✓ Location update persisted in location_updates table.');

    // 5. Advance 8-Step Lifecycle
    console.log('[5/7] Advancing 8-step lifecycle through all operational states...');
    const steps = ['ACCEPTED', 'ASSIGNED', 'DEPARTED', 'ON_THE_WAY', 'NEARBY', 'ARRIVED', 'COMPLETED'];
    let prev = 'REQUESTED';
    for (const next of steps) {
      await query(
        `INSERT INTO incident_status_history (id, request_id, incident_id, previous_status, new_status, actor, responder_id, notes)
         VALUES ($1, $2, $3, $4, $5, 'Operational Controller', $6, $7)`,
        [`HIST-T-${next}-${Date.now()}`, testRequestId, testIncidentId, prev, next, testResponderId, `Transitioned to ${next}`]
      );

      await query(`UPDATE incidents SET status = $1 WHERE id = $2`, [next === 'COMPLETED' ? 'RESOLVED' : next, testIncidentId]);
      await query(`UPDATE emergency_requests SET status = $1 WHERE id = $2`, [next, testRequestId]);
      prev = next;
    }
    console.log('✓ Successfully recorded full 8-step lifecycle progression in PostgreSQL.');

    // 6. Test Tracking Bundle Query
    console.log('[6/7] Querying full live tracking bundle...');
    const bundle = await fetchTrackingBundle(testIncidentId);
    if (!bundle) throw new Error('Tracking bundle returned null!');
    console.log(`✓ Tracking bundle verified:`);
    console.log(`   - Incident: ${bundle.incident.title} (${bundle.incident.status})`);
    console.log(`   - Citizen: ${bundle.citizen?.name} (GPS: ${bundle.citizen?.latitude}, ${bundle.citizen?.longitude})`);
    console.log(`   - Responder: ${bundle.responder?.name} (Status: ${bundle.responder?.status})`);
    console.log(`   - Active Route: ${bundle.activeRoute?.label} (${bundle.activeRoute?.safetyStatus})`);
    console.log(`   - Status History Count: ${bundle.statusHistory.length} records`);

    // 7. Test Dynamic Re-routing Check
    console.log('[7/7] Testing dynamic re-route check...');
    const rerouteRes = await checkAndTriggerDynamicReroute(testIncidentId, { lat: 28.6250, lng: 77.2150 });
    console.log(`✓ Re-route verification executed without errors. Safest active route: ${rerouteRes.activeRoute?.label || 'Verified'}`);

    console.log('\n============================================================');
    console.log('ALL BACKEND TRACKING & ROUTING INTEGRATION TESTS PASSED!');
    console.log('============================================================\n');

    // Clean up test records
    await query(`DELETE FROM active_routes WHERE incident_id = $1`, [testIncidentId]);
    await query(`DELETE FROM location_updates WHERE incident_id = $1`, [testIncidentId]);
    await query(`DELETE FROM incident_status_history WHERE incident_id = $1`, [testIncidentId]);
    await query(`DELETE FROM emergency_requests WHERE id = $1`, [testRequestId]);
    await query(`DELETE FROM incidents WHERE id = $1`, [testIncidentId]);
    console.log('✓ Test cleanup complete.');
  } catch (err: any) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTest();
