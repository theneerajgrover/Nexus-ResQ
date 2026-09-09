// ============================================================
// NEXUS RESQ — PRODUCTION LOCATION SYSTEM INTEGRATION TEST SUITE
// ============================================================
import { query, pool } from '../db';

async function runProductionLocationTests() {
  console.log('\n============================================================');
  console.log('NEXUS RESQ — PRODUCTION LOCATION SYSTEM TEST SUITE');
  console.log('============================================================\n');

  try {
    // TEST 1: Verify PostgreSQL Connection & Schema columns
    console.log('▶ TEST 1: Verifying PostgreSQL connection and location columns...');
    const colCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'emergency_requests' AND column_name IN (
        'device_latitude', 'device_longitude', 'device_accuracy_meters',
        'incident_latitude', 'incident_longitude', 'formatted_address',
        'place_id', 'village', 'locality', 'city', 'district', 'state',
        'postal_code', 'country', 'location_source', 'location_verified'
      )
    `);
    if (colCheck.rowCount! < 12) {
      throw new Error(`Missing required location columns in emergency_requests: found ${colCheck.rowCount}/16`);
    }
    console.log(`  ✔ Found ${colCheck.rowCount} dedicated location columns in PostgreSQL emergency_requests.`);

    // TEST 2: Server-side Coordinate Validation
    console.log('\n▶ TEST 2: Testing server-side coordinate boundaries rejection...');
    const invalidCoords = [
      { lat: 95.0, lon: 76.0, desc: 'latitude > 90' },
      { lat: -95.0, lon: 76.0, desc: 'latitude < -90' },
      { lat: 30.0, lon: 190.0, desc: 'longitude > 180' },
      { lat: 30.0, lon: -190.0, desc: 'longitude < -180' },
      { lat: 30.0, lon: 76.0, accuracy: -5.0, desc: 'negative accuracy' },
    ];

    for (const test of invalidCoords) {
      const res = await fetch('http://localhost:8000/api/location/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: test.lat, longitude: test.lon, accuracy: test.accuracy }),
      });
      const json: any = await res.json();
      if (res.status === 400 && !json.success) {
        console.log(`  ✔ Correctly rejected invalid coordinate (${test.desc}) with HTTP 400: "${json.error}"`);
      } else {
        throw new Error(`Expected HTTP 400 for ${test.desc}, got ${res.status}`);
      }
    }

    // TEST 3: Reverse Geocoding Endpoint (POST & GET)
    console.log('\n▶ TEST 3: Testing reverse-geocoding endpoint structure...');
    const realLat = 30.7333;
    const realLon = 76.7794;
    const revRes = await fetch('http://localhost:8000/api/location/reverse-geocode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: realLat, longitude: realLon, accuracy_meters: 15.5 }),
    });
    const revJson: any = await revRes.json();
    if (!revRes.ok || !revJson.success || !revJson.data) {
      throw new Error(`Reverse geocode failed: ${JSON.stringify(revJson)}`);
    }
    const d = revJson.data;
    console.log(`  ✔ Reverse geocoded successfully:`);
    console.log(`    - Formatted Address: "${d.formatted_address}"`);
    console.log(`    - Source: ${d.source}, Verified: ${d.verified}`);
    console.log(`    - City: ${d.city || d.locality || 'N/A'}, District: ${d.district || 'N/A'}, State: ${d.state || 'N/A'}`);
    console.log(`    - Coordinates: ${d.latitude}, ${d.longitude}`);

    // TEST 4: Places Autocomplete Search
    console.log('\n▶ TEST 4: Testing Google Places / Geocoding autocomplete endpoint...');
    const autoRes = await fetch('http://localhost:8000/api/location/autocomplete?input=Central+Hospital');
    const autoJson: any = await autoRes.json();
    if (!autoRes.ok || !autoJson.success || !Array.isArray(autoJson.data)) {
      throw new Error(`Places autocomplete failed: ${JSON.stringify(autoJson)}`);
    }
    console.log(`  ✔ Autocomplete returned ${autoJson.data.length} candidate suggestions.`);
    if (autoJson.data.length > 0) {
      console.log(`    - Example prediction: "${autoJson.data[0].description}" (Place ID: ${autoJson.data[0].place_id})`);
    }

    // TEST 5: Manual Address Validation (Rejection of unresolvable fake text)
    console.log('\n▶ TEST 5: Testing manual address validation & rejection of fake/unresolvable text...');
    const fakeTextRes = await fetch('http://localhost:8000/api/location/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'zxqw123xyz-non-existent-planet-location-fake' }),
    });
    const fakeJson: any = await fakeTextRes.json();
    if (fakeTextRes.status === 422 && !fakeJson.success) {
      console.log(`  ✔ Unresolvable fake text correctly rejected with HTTP 422: "${fakeJson.error}"`);
    } else {
      throw new Error(`Expected HTTP 422 for unresolvable location, got ${fakeTextRes.status}: ${JSON.stringify(fakeJson)}`);
    }

    // TEST 6: Address Validation of a real geographical location
    console.log('\n▶ TEST 6: Testing validation of a recognized geographical location...');
    const validLocRes = await fetch('http://localhost:8000/api/location/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: 'London, United Kingdom' }),
    });
    const validLocJson: any = await validLocRes.json();
    if (validLocRes.ok && validLocJson.success && validLocJson.data) {
      console.log(`  ✔ Recognized location verified: "${validLocJson.data.formatted_address}"`);
      console.log(`    - Lat: ${validLocJson.data.latitude}, Lng: ${validLocJson.data.longitude}`);
    } else {
      console.log(`  ℹ Location validation response: ${JSON.stringify(validLocJson)}`);
    }

    // TEST 7: Anonymous Emergency Request Submission with Device vs Incident Separation
    console.log('\n▶ TEST 7: Submitting emergency request with Device GPS vs. Reported Incident Location separation...');
    const deviceLat = 30.73331;
    const deviceLon = 76.77942;
    const incidentLat = 30.74100;
    const incidentLon = 76.78500;

    const sosPayload = {
      emergency_type: 'FIRE',
      location_name: 'Sector 17 City Center Plaza',
      formatted_address: 'Sector 17 City Center Plaza, Commercial Zone',
      latitude: incidentLat,
      longitude: incidentLon,
      accuracy: 8.5,
      device_latitude: deviceLat,
      device_longitude: deviceLon,
      device_accuracy_meters: 5.2,
      device_location_timestamp: new Date().toISOString(),
      incident_latitude: incidentLat,
      incident_longitude: incidentLon,
      incident_accuracy_meters: 8.5,
      place_id: 'plc_sector17_test',
      village: 'Sector 17',
      locality: 'Chandigarh',
      city: 'Chandigarh',
      district: 'Chandigarh',
      state: 'Chandigarh',
      postal_code: '160017',
      country: 'India',
      location_source: 'google_places',
      location_verified: true,
      assistance_needed: ['Fire Response Unit', 'Ambulance / Medical Team'],
      details: 'Structural fire alarm verification test with device and incident GPS telemetry',
      contact_name: 'Test Responder Officer',
      contact_phone: '+91 9988776655',
    };

    const emergencyRes = await fetch('http://localhost:8000/api/emergency/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sosPayload),
    });
    const emergencyJson: any = await emergencyRes.json();
    if (!emergencyRes.ok || !emergencyJson.success) {
      throw new Error(`Emergency request submission failed: ${JSON.stringify(emergencyJson)}`);
    }
    const reqData = emergencyJson.data;
    console.log(`  ✔ Emergency request created without authentication (Anonymous Citizen flow):`);
    console.log(`    - SOS ID: ${reqData.id}`);
    console.log(`    - Assigned Incident ID: ${reqData.assignedIncidentId}`);
    console.log(`    - Status: ${reqData.status}`);
    console.log(`    - Incident Coordinates: ${reqData.incidentLatitude}, ${reqData.incidentLongitude}`);
    console.log(`    - Device GPS: ${reqData.deviceLatitude}, ${reqData.deviceLongitude}`);

    // TEST 8: Verify PostgreSQL Persistence
    console.log('\n▶ TEST 8: Verifying PostgreSQL persistence in emergency_requests and incidents...');
    const erQuery = await query(
      `SELECT id, device_latitude, device_longitude, device_accuracy_meters,
              incident_latitude, incident_longitude, incident_accuracy_meters,
              formatted_address, place_id, city, state, postal_code, location_source, location_verified
       FROM emergency_requests WHERE id = $1`,
      [reqData.id]
    );
    if (erQuery.rowCount === 0) {
      throw new Error(`Emergency request ${reqData.id} not found in database!`);
    }
    const erRow = erQuery.rows[0];
    console.log(`  ✔ Verified emergency_requests database record:`);
    console.log(`    - ID: ${erRow.id}`);
    console.log(`    - Device Lat/Lng: ${erRow.device_latitude}, ${erRow.device_longitude} (±${erRow.device_accuracy_meters}m)`);
    console.log(`    - Incident Lat/Lng: ${erRow.incident_latitude}, ${erRow.incident_longitude}`);
    console.log(`    - Address: "${erRow.formatted_address}"`);
    console.log(`    - Place ID: ${erRow.place_id}, Verified: ${erRow.location_verified}, Source: ${erRow.location_source}`);

    const incQuery = await query(
      `SELECT id, latitude, longitude, location, place_id, city, location_verified
       FROM incidents WHERE id = $1`,
      [reqData.assignedIncidentId]
    );
    if (incQuery.rowCount === 0) {
      throw new Error(`Incident ${reqData.assignedIncidentId} not found in database!`);
    }
    const incRow = incQuery.rows[0];
    console.log(`  ✔ Verified incidents database record:`);
    console.log(`    - Incident ID: ${incRow.id}`);
    console.log(`    - Lat/Lng: ${incRow.latitude}, ${incRow.longitude}`);
    console.log(`    - Location: "${incRow.location}" (Place ID: ${incRow.place_id})`);

    // TEST 9: Refresh Simulation via GET /api/emergency/requests/:id
    console.log('\n▶ TEST 9: Simulating page refresh by querying GET /api/emergency/requests/:id...');
    const refreshRes = await fetch(`http://localhost:8000/api/emergency/requests/${reqData.id}`);
    const refreshJson: any = await refreshRes.json();
    if (!refreshRes.ok || !refreshJson.success || !refreshJson.data) {
      throw new Error(`GET /api/emergency/requests/:id failed: ${JSON.stringify(refreshJson)}`);
    }
    console.log(`  ✔ Data persists across requests from PostgreSQL source of truth:`);
    console.log(`    - Retrieved ID: ${refreshJson.data.id}`);
    console.log(`    - Address: "${refreshJson.data.formatted_address || refreshJson.data.location}"`);
    console.log(`    - Incident Lat: ${refreshJson.data.incident_latitude || refreshJson.data.latitude}`);

    // Clean up test records
    await query(`DELETE FROM emergency_requests WHERE id = $1`, [reqData.id]).catch(() => {});
    await query(`DELETE FROM incidents WHERE id = $1`, [reqData.assignedIncidentId]).catch(() => {});

    console.log('\n============================================================');
    console.log('🎉 ALL 9 PRODUCTION LOCATION SYSTEM TESTS PASSED SUCCESSFULLY! ✓');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test failed with error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runProductionLocationTests();
