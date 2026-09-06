-- ============================================================
-- NEXUS RESQ — INITIAL DATABASE SEED (nexus_resq_db)
-- Populates realistic operational records if tables are empty.
-- ============================================================

-- 1. Initial Users
INSERT INTO users (id, name, email, role, phone, department)
VALUES 
    ('USR-001', 'Elena Rostova', 'citizen@nexusresq.org', 'citizen', '+1-555-0192', 'Public Safety'),
    ('USR-002', 'Capt. Marcus Vance', 'responder@nexusresq.org', 'responder', '+1-555-0144', 'Metro SAR Unit 3'),
    ('USR-003', 'Dir. Sarah Chen', 'authority@nexusresq.org', 'authority_command', '+1-555-0100', 'Emergency Management Agency'),
    ('USR-004', 'Logan Miller', 'resources@nexusresq.org', 'resource_manager', '+1-555-0188', 'Regional Logistics Depot')
ON CONFLICT (id) DO NOTHING;

-- 2. Incidents
INSERT INTO incidents (id, title, type, severity, location, latitude, longitude, status, responders_count, pending)
VALUES
    ('INC-2849', 'Structural Failure - River Embankment', 'STRUCTURAL', 'CRITICAL', 'Bridge Sector 7 · Zone NE-4', 52.0, 48.0, 'ACTIVE', 2, TRUE),
    ('INC-2847', 'River Surge Overtopping Barrier', 'FLOOD', 'HIGH', 'Riverside Park · Zone S-2', 35.0, 30.0, 'RESPONDING', 4, FALSE),
    ('INC-2851', 'Mass Dehydration & Medical Distress', 'MEDICAL', 'HIGH', 'Eastern Ridge · Zone E-1', 65.0, 60.0, 'PENDING', 0, TRUE),
    ('INC-2845', 'Electrical Substation Fire', 'FIRE', 'MODERATE', 'Industrial Loop 4', 78.0, 25.0, 'CONTAINED', 3, FALSE),
    ('INC-2850', 'Mandatory Lowland Evacuation', 'EVACUATION', 'HIGH', 'South Shoreline Community', 22.0, 70.0, 'ACTIVE', 6, FALSE)
ON CONFLICT (id) DO NOTHING;

-- 3. Shelters
INSERT INTO shelters (id, name, address, distance, walk_time, capacity, occupancy, status, accessible, facilities, route_safe, latitude, longitude)
VALUES
    ('SHL-01', 'Central Community Center', '142 River Road, Zone 4', '0.8 km', '10 min', 450, 263, 'OPEN', TRUE, ARRAY['Medical', 'Food', 'Water', 'Cots'], TRUE, 52.1, 48.1),
    ('SHL-02', 'Riverside High School', '88 School Ave, Zone 3', '1.4 km', '18 min', 800, 458, 'OPEN', TRUE, ARRAY['Food', 'Water', 'Cots', 'Parking'], TRUE, 35.1, 30.1),
    ('SHL-03', 'Metro Sports Complex', '1 Stadium Drive, Zone 1', '3.2 km', '40 min', 1200, 1111, 'NEAR FULL', TRUE, ARRAY['Food', 'Medical'], FALSE, 65.1, 60.1),
    ('SHL-04', 'North Community Hall', '55 North Blvd, Zone 6', '4.1 km', '52 min', 300, 0, 'ACTIVATING', FALSE, ARRAY['Food', 'Water'], TRUE, 78.1, 25.1)
ON CONFLICT (id) DO NOTHING;

-- 4. Evacuation Routes
INSERT INTO evacuation_routes (id, label, via, distance, eta, risk_level, risk_note, congestion, destination, safe, segments)
VALUES
    ('RT-A', 'Route A — Recommended', 'River Road → Highway 12 North', '4.2 km', '12 min by car · 52 min on foot', 'LOW', 'Clear path, no known hazards.', 'LIGHT', 'Central Community Center', TRUE, 
     '[{"type": "CLEAR", "label": "River Road"}, {"type": "CLEAR", "label": "Highway 12 North"}, {"type": "CLEAR", "label": "Shelter arrival"}]'::jsonb),
    ('RT-B', 'Route B — Alternative', 'Bridge St → East Service Road', '5.8 km', '18 min by car · 72 min on foot', 'MODERATE', 'Bridge St passes near flood-risk zone. Elevated but passable.', 'MODERATE', 'Riverside High School', TRUE, 
     '[{"type": "WARNING", "label": "Bridge St — flood risk nearby"}, {"type": "CLEAR", "label": "East Service Road"}, {"type": "CLEAR", "label": "Shelter arrival"}]'::jsonb),
    ('RT-C', 'Route C — Blocked', 'North Ave → Zone NE-4', '2.1 km', 'UNAVAILABLE', 'CRITICAL', 'Zone NE-4 is under mandatory evacuation. This route is blocked by emergency services.', 'BLOCKED', 'North Community Hall', FALSE, 
     '[{"type": "BLOCKED", "label": "North Ave — access restricted"}, {"type": "BLOCKED", "label": "Zone NE-4 — mandatory evacuation"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 5. Active Alerts
INSERT INTO alerts (id, title, message, severity, category, affected_area, is_active)
VALUES
    ('ALT-001', 'Flash Flood Warning - Lowland Sectors', 'Rapidly rising water along River Sector 7. Mandatory evacuation in effect for low-lying zones.', 'CRITICAL', 'FLOOD', 'Zone NE-4 & Riverside', TRUE),
    ('ALT-002', 'High Wind & Structural Advisory', 'Gusts up to 85 km/h. Avoid compromised structures near Bridge Sector.', 'HIGH', 'WEATHER', 'North District', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. Responders
INSERT INTO responders (id, name, callsign, status, latitude, longitude, current_incident_id)
VALUES
    ('R-14', 'Alpha-14', 'RESCUE-14', 'EN ROUTE', 48.0, 52.0, 'INC-2849'),
    ('R-07', 'Bravo-7', 'BOAT-07', 'ON SCENE', 34.0, 29.0, 'INC-2847'),
    ('R-22', 'Delta-22', 'MEDIC-22', 'AVAILABLE', 60.0, 40.0, NULL),
    ('R-03', 'Echo-3', 'RESCUE-03', 'ASSISTING', 65.0, 61.0, 'INC-2851')
ON CONFLICT (id) DO NOTHING;

-- 7. Missions
INSERT INTO missions (id, incident_id, responder_id, title, location, latitude, longitude, status, priority, casualties_reported, hazards, perimeter)
VALUES
    ('INC-2849', 'INC-2849', 'R-14', 'STRUCTURAL COLLAPSE', 'Bridge Sector 7 · Zone NE-4', 52.0, 48.0, 'EN ROUTE', 'CRITICAL', 3, ARRAY['Gas Line Leak', 'Unstable Upper Slab', 'Electrical Arc Hazard'], '200m Safety Perimeter Active')
ON CONFLICT (id) DO NOTHING;

-- 8. Supplies
INSERT INTO supplies (id, name, category, qty, demand, unit, location, last_sync)
VALUES
    ('SUP-MED-01', 'Trauma Kits', 'MEDICAL', 240, 380, 'kits', 'Depot North', '14:28'),
    ('SUP-WAT-02', 'Water (500ml)', 'WATER', 8400, 6200, 'bottles', 'Central Depot', '14:30'),
    ('SUP-FOO-03', 'Emergency Rations', 'FOOD', 1200, 1600, 'packs', 'Multiple', '14:20'),
    ('SUP-MED-04', 'Blood O+ Units', 'MEDICAL', 48, 35, 'units', 'Hospital A', '14:31'),
    ('SUP-PPE-05', 'Protective Equipment', 'SAFETY', 560, 340, 'sets', 'Depot South', '14:25')
ON CONFLICT (id) DO NOTHING;

-- 9. Ambulances
INSERT INTO ambulances (id, callsign, crew, status, location, last_update)
VALUES
    ('AMB-14', 'MEDIC 14', 2, 'AVAILABLE', 'Station 3', '14:30'),
    ('AMB-07', 'MEDIC 07', 2, 'DISPATCHED', 'INC-2847 scene', '14:18'),
    ('AMB-22', 'MEDIC 22', 3, 'AVAILABLE', 'Station 1', '14:29'),
    ('AMB-03', 'MEDIC 03', 2, 'RETURNING', 'En route Station 2', '14:26'),
    ('AMB-09', 'MEDIC 09', 2, 'MAINTENANCE', 'Workshop', '12:00')
ON CONFLICT (id) DO NOTHING;

-- 10. Equipment
INSERT INTO equipment (id, name, qty, available, status, location)
VALUES
    ('EQP-01', 'Hydraulic Rescue Sets', 8, 5, 'PARTIAL', 'Station 3'),
    ('EQP-02', 'Rope & Harness Kits', 24, 18, 'AVAILABLE', 'Depot North'),
    ('EQP-03', 'Thermal Imaging Units', 4, 2, 'PARTIAL', 'Multiple'),
    ('EQP-04', 'Emergency Generators', 12, 7, 'PARTIAL', 'Depot South'),
    ('EQP-05', 'Water Pumping Units', 6, 0, 'DEPLETED', 'Field')
ON CONFLICT (id) DO NOTHING;

-- 11. Dispatch Records
INSERT INTO dispatch_records (id, resource_type, qty_approved, qty_dispatched, destination, incident_id, unit, status, approved_by)
VALUES
    ('DSP-041', 'TRAUMA KITS', 3, 3, 'INC-2849 staging', 'INC-2849', 'Unit Alpha-14', 'DISPATCHED', 'Authority/Command'),
    ('DSP-039', 'WATER BOTTLES', 50, 50, 'INC-2847 scene', 'INC-2847', 'Unit Bravo-7', 'DELIVERED', 'Authority/Command'),
    ('DSP-038', 'HYDRAULIC RESCUE', 1, 0, 'INC-2849 zone', 'INC-2849', 'Unit Echo-3', 'PENDING', 'Authority/Command'),
    ('DSP-035', 'ROPE KITS', 2, 2, 'INC-2845 area', 'INC-2845', 'Unit Delta-22', 'DELIVERED', 'Authority/Command')
ON CONFLICT (id) DO NOTHING;

-- 12. Regional Intelligence / Risk Zones
INSERT INTO risk_zones (id, region_name, risk_score, incident_count, evacuees_count, trend, status)
VALUES
    ('ZONE-N1', 'North District', 92, 4, 1240, 'up', 'CRITICAL'),
    ('ZONE-NE4', 'Bridge Sector', 88, 2, 340, 'stable', 'HIGH'),
    ('ZONE-S2', 'Riverside Zone', 61, 3, 890, 'down', 'MODERATE'),
    ('ZONE-E1', 'Eastern Forest', 45, 1, 120, 'stable', 'MODERATE')
ON CONFLICT (id) DO NOTHING;

-- 13. The 11 AI Agents Initial State
INSERT INTO agent_pipeline_state (agent_id, name, code, description, status, progress, layer, last_event)
VALUES
    (1, 'Ingestion', 'INGESTION', 'Multi-source data collection & normalization', 'COMPLETE', 100, 'sequential', 'Normalized 48 citizen & IoT telemetry records'),
    (2, 'Verification', 'VERIFICATION', 'Credibility, deduplication & conflict checks', 'COMPLETE', 100, 'sequential', 'Verified 42 unique reports; 0 duplicates detected'),
    (3, 'Situation', 'SITUATION', 'Operational picture consolidation', 'COMPLETE', 100, 'sequential', 'Active situational picture consolidated across 4 zones'),
    (4, 'Priority', 'PRIORITY', 'Incident triage & severity scoring', 'COMPLETE', 100, 'sequential', 'Triaged INC-2849 as Critical Priority (Score 94)'),
    (5, 'Resource', 'RESOURCE', 'Asset availability & suitability mapping', 'RUNNING', 72, 'parallel', 'Matched Unit Alpha-14 & Bravo-7 to active sectors'),
    (6, 'Capacity', 'CAPACITY', 'Hospital & shelter capacity projection', 'RUNNING', 58, 'parallel', 'Monitored 4 shelters; Central Community Center at 58% capacity'),
    (7, 'Route', 'ROUTE', 'Safe corridor & accessibility evaluation', 'RUNNING', 44, 'parallel', 'Verified Route A clear; Bridge Street flagged as restricted'),
    (8, 'Forecast', 'FORECAST', 'Demand & escalation forecasting', 'WAITING', 0, 'parallel', 'Awaiting river surge sensor projection baseline'),
    (9, 'Coordinator', 'COORDINATOR', 'Response plan synthesis & action coordination', 'WAITING', 0, 'sequential', 'Standing by for parallel analysis convergence'),
    (10, 'Critic', 'CRITIC', 'Plan review, risk identification & validation', 'WAITING', 0, 'sequential', 'Human approval gate armed'),
    (11, 'Analytics', 'ANALYTICS', 'Outcome tracking & performance analysis', 'RUNNING', 100, 'continuous', 'Response efficiency score: 96%')
ON CONFLICT (agent_id) DO NOTHING;

-- 14. Initial AI Recommendation (Pending Human Approval)
INSERT INTO ai_recommendations (id, incident_id, priority, action, reason, affected_zone, estimated_people_affected, recommended_resource, recommended_shelter, recommended_teams_count, confidence_score, risk_flags, proposed_actions_list, status)
VALUES
    ('REC-2849', 'INC-2849', 'CRITICAL', 'Evacuate Zone NE-4 & Dispatch Heavy Rescue Unit Alpha-14', 
     'Compounding structural instability detected near river bridge pier 4. High probability of collapse within 90 minutes.', 
     'Bridge Sector · Zone NE-4', 340, 'Hydraulic Heavy Extrication Unit + Evacuation Transport', 'Central Community Center', 2, 94.5, 
     ARRAY['Proximity to high-pressure gas main', 'North approach route submerged / impassable', 'High population density in low-lying sector'],
     ARRAY['Dispatch structural rescue team via clear southern corridor', 'Deploy MEDIC units to eastern staging area', 'Activate 200m safety exclusion perimeter around Zone NE-4', 'Issue urgent public evacuation broadcast to Zone NE-4', 'Alert Central Community Center for emergency intake'],
     'PENDING_APPROVAL')
ON CONFLICT (id) DO NOTHING;
