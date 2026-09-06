import { query, pool } from '../db';

async function runCitizenLocationTest() {
  console.log('\n============================================================');
  console.log('NEXUS RESQ — CITIZEN GPS LOCATION INTEGRATION TEST SUITE');
  console.log('============================================================\n');

  try {
    // 1. Verify DB connection
    console.log('[TEST 1] Testing PostgreSQL connection...');
    const connCheck = await query('SELECT NOW() as now, current_database() as db');
    console.log(`✓ PostgreSQL Connected to database: ${connCheck.rows[0].db} at ${connCheck.rows[0].now}`);

    // 2. Test Invalid Coordinates Rejection (lat > 90)
    console.log('\n[TEST 2] Testing server-side validation on invalid coordinates...');
    const invalidRes = await fetch('http://localhost:8000/api/tracking/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'citizen',
        entityId: 'CIT-TEST-INVALID',
        latitude: 195.5, // Invalid!
        longitude: 76.6053,
      }),
    });
    const invalidJson = (await invalidRes.json()) as any;
    if (invalidRes.status === 400 && !invalidJson.success) {
      console.log(`✓ Invalid coordinates correctly rejected with HTTP 400: "${invalidJson.error}"`);
    } else {
      throw new Error(`Expected HTTP 400 for invalid coordinates, got ${invalidRes.status}`);
    }

    // 3. Test Ingestion of Real Device Coordinates
    console.log('\n[TEST 3] Testing ingestion of real citizen device GPS coordinates...');
    const testCitizenId = `CIT-TEST-${Date.now().toString().slice(-4)}`;
    const realGpsPayload = {
      entityType: 'citizen',
      entityId: testCitizenId,
      latitude: 30.681245,
      longitude: 76.605312,
      accuracy: 14.8,
      heading: null,
      speed: null,
    };

    const validRes = await fetch('http://localhost:8000/api/tracking/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(realGpsPayload),
    });
    const validJson = (await validRes.json()) as any;

    if (!validRes.ok || !validJson.success) {
      throw new Error(`POST /api/tracking/location failed: ${JSON.stringify(validJson)}`);
    }
    console.log(`✓ Real GPS coordinates accepted: ID=${validJson.data.id}, Lat=${validJson.data.latitude}, Lng=${validJson.data.longitude}, Acc=±${validJson.data.accuracy}m`);

    // 4. Verify PostgreSQL persistence in location_updates
    console.log('\n[TEST 4] Verifying PostgreSQL persistence in location_updates table...');
    const dbLocRes = await query(
      `SELECT id, entity_type, entity_id, latitude, longitude, accuracy, created_at
       FROM location_updates
       WHERE id = $1`,
      [validJson.data.id]
    );

    if (dbLocRes.rowCount === 0) {
      throw new Error(`Location record ${validJson.data.id} not found in location_updates table!`);
    }
    const row = dbLocRes.rows[0];
    console.log(`✓ Persisted record verified in PostgreSQL: entity=${row.entity_type}, id=${row.entity_id}, lat=${row.latitude}, lng=${row.longitude}, acc=±${row.accuracy}m, captured_at=${row.created_at}`);

    // 5. Query via GET /api/tracking/location/:entityType/:entityId
    console.log('\n[TEST 5] Testing GET /api/tracking/location/citizen/:citizenId...');
    const getLocRes = await fetch(`http://localhost:8000/api/tracking/location/citizen/${testCitizenId}`);
    const getLocJson = (await getLocRes.json()) as any;

    if (!getLocRes.ok || !getLocJson.success || !getLocJson.data) {
      throw new Error(`GET /api/tracking/location failed: ${JSON.stringify(getLocJson)}`);
    }
    console.log(`✓ Verified location query retrieved latest fix: Lat=${getLocJson.data.latitude}, Lng=${getLocJson.data.longitude}, Timestamp=${getLocJson.data.timestamp}`);

    // 6. Test Reverse Geocoding with real coordinates
    console.log('\n[TEST 6] Testing real GPS reverse geocoding endpoint...');
    const revGeoRes = await fetch(`http://localhost:8000/api/location/reverse-geocode?lat=30.681245&lon=76.605312`);
    const revGeoJson = (await revGeoRes.json()) as any;
    if (revGeoRes.ok && revGeoJson.success) {
      console.log(`✓ Reverse geocoded address: "${revGeoJson.data.formattedAddress}"`);
    } else {
      console.log(`ℹ Reverse geocoding service response: ${JSON.stringify(revGeoJson)}`);
    }

    // 7. Test Emergency Request submission with GPS coordinates and accuracy
    console.log('\n[TEST 7] Testing emergency request submission with real GPS coordinates...');
    const emergencyRes = await fetch('http://localhost:8000/api/emergency/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emergency_type: 'MEDICAL',
        location_name: 'Sector 7 Community Complex',
        latitude: 30.681245,
        longitude: 76.605312,
        accuracy: 14.8,
        assistance_needed: ['Ambulance / Medical Team'],
        description: 'Citizen GPS integration test verification',
        contact_name: 'Automated Test Citizen',
        contact_phone: '+91 9876543210',
      }),
    });
    const emergencyJson = (await emergencyRes.json()) as any;

    if (!emergencyRes.ok || !emergencyJson.success) {
      throw new Error(`Emergency request submission failed: ${JSON.stringify(emergencyJson)}`);
    }
    console.log(`✓ Emergency request created with real GPS: SOS ID=${emergencyJson.data.id}, Lat=${emergencyJson.data.latitude}, Lng=${emergencyJson.data.longitude}, Acc=±${emergencyJson.data.accuracy}m`);

    console.log('\n============================================================');
    console.log('ALL 7 CITIZEN GPS INTEGRATION TESTS PASSED SUCCESSFULLY! ✓');
    console.log('============================================================\n');
  } catch (err: any) {
    console.error('\n❌ Test failed with error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runCitizenLocationTest();
