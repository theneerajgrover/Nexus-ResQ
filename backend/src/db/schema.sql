-- ============================================================
-- NEXUS RESQ — POSTGRESQL DATABASE SCHEMA (nexus_resq_db)
-- ============================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('citizen', 'responder', 'authority_command', 'resource_manager', 'admin')),
    phone VARCHAR(50),
    department VARCHAR(255),
    certifications TEXT[],
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Responder Applications Table
CREATE TABLE IF NOT EXISTS responder_applications (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    certification_id VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY, -- e.g. INC-2849
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('STRUCTURAL', 'FLOOD', 'MEDICAL', 'FIRE', 'EVACUATION', 'OTHER')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
    location VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESPONDING', 'PENDING', 'CONTAINED', 'RESOLVED')),
    responders_count INT DEFAULT 0,
    pending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);

-- 4. Citizen Emergency / SOS Requests Table
CREATE TABLE IF NOT EXISTS emergency_requests (
    id VARCHAR(64) PRIMARY KEY, -- e.g. SOS-10293
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    emergency_type VARCHAR(50) NOT NULL,
    assistance_types TEXT[],
    location VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    details TEXT,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'RESOLVED', 'CANCELLED')),
    assigned_mission_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(status);

-- 5. Shelters Table
CREATE TABLE IF NOT EXISTS shelters (
    id VARCHAR(64) PRIMARY KEY, -- e.g. SHL-01
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    distance VARCHAR(50),
    walk_time VARCHAR(50),
    capacity INT NOT NULL CHECK (capacity >= 0),
    occupancy INT NOT NULL DEFAULT 0 CHECK (occupancy >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'NEAR FULL', 'ACTIVATING', 'CLOSED')),
    accessible BOOLEAN DEFAULT TRUE,
    facilities TEXT[],
    route_safe BOOLEAN DEFAULT TRUE,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shelters_status ON shelters(status);

-- 6. Evacuation Routes Table
CREATE TABLE IF NOT EXISTS evacuation_routes (
    id VARCHAR(64) PRIMARY KEY, -- e.g. RT-A
    label VARCHAR(255) NOT NULL,
    via VARCHAR(255) NOT NULL,
    distance VARCHAR(50) NOT NULL,
    eta VARCHAR(100) NOT NULL,
    risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    risk_note TEXT,
    congestion VARCHAR(50) NOT NULL DEFAULT 'LIGHT' CHECK (congestion IN ('LIGHT', 'MODERATE', 'HEAVY', 'BLOCKED')),
    destination VARCHAR(255) NOT NULL,
    safe BOOLEAN DEFAULT TRUE,
    segments JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
    category VARCHAR(50) NOT NULL,
    affected_area VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active);

-- 8. Responders Table
CREATE TABLE IF NOT EXISTS responders (
    id VARCHAR(64) PRIMARY KEY, -- e.g. R-14
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    callsign VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'EN ROUTE', 'ON SCENE', 'ASSISTING', 'MAINTENANCE', 'OFFLINE')),
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    current_incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Missions Table
CREATE TABLE IF NOT EXISTS missions (
    id VARCHAR(64) PRIMARY KEY, -- e.g. INC-2849
    incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE CASCADE,
    responder_id VARCHAR(64) REFERENCES responders(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'ACCEPTED', 'EN ROUTE', 'ON SCENE', 'ASSISTING', 'COMPLETED')),
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
    casualties_reported INT DEFAULT 0,
    hazards TEXT[],
    perimeter VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Supplies Table
CREATE TABLE IF NOT EXISTS supplies (
    id VARCHAR(64) PRIMARY KEY, -- e.g. SUP-MED-01
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('MEDICAL', 'WATER', 'FOOD', 'SAFETY', 'EQUIPMENT')),
    qty INT NOT NULL DEFAULT 0,
    demand INT NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    last_sync VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Ambulances Table
CREATE TABLE IF NOT EXISTS ambulances (
    id VARCHAR(64) PRIMARY KEY, -- e.g. AMB-14
    callsign VARCHAR(100) NOT NULL,
    crew INT NOT NULL DEFAULT 2,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'DISPATCHED', 'RETURNING', 'MAINTENANCE')),
    location VARCHAR(255) NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    last_update VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Equipment Table
CREATE TABLE IF NOT EXISTS equipment (
    id VARCHAR(64) PRIMARY KEY, -- e.g. EQP-01
    name VARCHAR(255) NOT NULL,
    qty INT NOT NULL DEFAULT 0,
    available INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'PARTIAL', 'DEPLETED')),
    location VARCHAR(255) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Dispatch Records Table
CREATE TABLE IF NOT EXISTS dispatch_records (
    id VARCHAR(64) PRIMARY KEY, -- e.g. DSP-041
    resource_type VARCHAR(100) NOT NULL,
    qty_approved INT NOT NULL,
    qty_dispatched INT NOT NULL,
    destination VARCHAR(255) NOT NULL,
    incident_id VARCHAR(64),
    unit VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('DISPATCHED', 'DELIVERED', 'PENDING')),
    approved_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Regional Intelligence / Risk Zones Table
CREATE TABLE IF NOT EXISTS risk_zones (
    id VARCHAR(64) PRIMARY KEY, -- e.g. ZONE-NE4
    region_name VARCHAR(255) NOT NULL,
    risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    incident_count INT NOT NULL DEFAULT 0,
    evacuees_count INT NOT NULL DEFAULT 0,
    trend VARCHAR(50) NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'stable', 'down')),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. AI Recommendations Table (Human Supervision Gate)
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id VARCHAR(64) PRIMARY KEY, -- e.g. REC-2849
    incident_id VARCHAR(64),
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
    action VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    affected_zone VARCHAR(255) NOT NULL,
    estimated_people_affected INT DEFAULT 0,
    recommended_resource VARCHAR(255),
    recommended_shelter VARCHAR(255),
    recommended_teams_count INT DEFAULT 1,
    confidence_score NUMERIC(5, 2) DEFAULT 90.00,
    risk_flags TEXT[],
    proposed_actions_list TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REPLANNING', 'COMPLETED', 'DISMISSED', 'SUPERSEDED')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Agent Pipeline State Table (The 11 Core Agents)
CREATE TABLE IF NOT EXISTS agent_pipeline_state (
    agent_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'RUNNING', 'COMPLETE', 'WAITING', 'BLOCKED', 'FAILED')),
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    layer VARCHAR(50) NOT NULL CHECK (layer IN ('sequential', 'parallel', 'continuous')),
    last_event TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Live Agent Activity Events Table
CREATE TABLE IF NOT EXISTS agent_activity_events (
    id VARCHAR(64) PRIMARY KEY,
    agent_id INT NOT NULL,
    agent_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('INFO', 'WARNING', 'CRITICAL', 'SUCCESS')),
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_events_created ON agent_activity_events(created_at DESC);

-- 18. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    entity VARCHAR(255) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- GROUP A — PREDICTIVE INTELLIGENCE (A1–A6) TABLES
-- ============================================================

-- 19. Predictive Agent State Table (A1 to A6)
CREATE TABLE IF NOT EXISTS predictive_agent_state (
    agent_id VARCHAR(10) PRIMARY KEY, -- e.g. 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'RUNNING', 'COMPLETE', 'WAITING', 'FAILED')),
    progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    summary_metric VARCHAR(255),
    last_run TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 20. A1 — Risk Predictions Table
CREATE TABLE IF NOT EXISTS predictive_risk_assessments (
    id VARCHAR(64) PRIMARY KEY, -- e.g. PRA-001
    region_id VARCHAR(64),
    region_name VARCHAR(255) NOT NULL,
    risk_score INT NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'INSUFFICIENT_DATA')),
    contributing_factors TEXT[] DEFAULT '{}',
    confidence NUMERIC(5, 2) DEFAULT 90.00,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pra_region ON predictive_risk_assessments(region_name);

-- 21. A2 — Hazard Forecasts Table
CREATE TABLE IF NOT EXISTS hazard_forecasts (
    id VARCHAR(64) PRIMARY KEY, -- e.g. HZF-001
    hazard_type VARCHAR(50) NOT NULL CHECK (hazard_type IN ('FLOOD', 'STRUCTURAL', 'FIRE', 'WEATHER', 'MEDICAL', 'OTHER')),
    region VARCHAR(255) NOT NULL,
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    confidence NUMERIC(5, 2) DEFAULT 88.00,
    supporting_factors TEXT[] DEFAULT '{}',
    forecast_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (forecast_status IN ('ACTIVE', 'MONITORING', 'RESOLVED')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hzf_hazard_type ON hazard_forecasts(hazard_type);

-- 22. A3 — Vulnerability Assessments Table
CREATE TABLE IF NOT EXISTS vulnerability_assessments (
    id VARCHAR(64) PRIMARY KEY, -- e.g. VULN-001
    region VARCHAR(255) NOT NULL,
    vulnerability_score INT NOT NULL CHECK (vulnerability_score >= 0 AND vulnerability_score <= 100),
    vulnerability_level VARCHAR(50) NOT NULL CHECK (vulnerability_level IN ('NOMINAL', 'MODERATE', 'ELEVATED', 'CRITICAL')),
    factors TEXT[] DEFAULT '{}',
    shelter_deficit INT DEFAULT 0,
    evacuation_status VARCHAR(100) DEFAULT 'CLEAR',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 23. A4 — Resource Pre-Positioning Recommendations Table (Human Approval Gate)
CREATE TABLE IF NOT EXISTS resource_preposition_recommendations (
    id VARCHAR(64) PRIMARY KEY, -- e.g. PPR-001
    target_region VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    requested_quantity INT NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
    reasoning TEXT NOT NULL,
    supporting_factors TEXT[] DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISPATCHED')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ppr_status ON resource_preposition_recommendations(status);

-- 24. A5 — Early Warnings Table
CREATE TABLE IF NOT EXISTS early_warnings (
    id VARCHAR(64) PRIMARY KEY, -- e.g. EW-001
    threat_level VARCHAR(50) NOT NULL CHECK (threat_level IN ('NORMAL', 'MONITORING', 'WARNING', 'CRITICAL')),
    headline VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    affected_zone VARCHAR(255) NOT NULL,
    recommended_action TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 25. A6 — Preparedness Assessments Table
CREATE TABLE IF NOT EXISTS preparedness_assessments (
    id VARCHAR(64) PRIMARY KEY, -- e.g. PRP-001
    overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    readiness_tier VARCHAR(50) NOT NULL CHECK (readiness_tier IN ('OPTIMAL', 'ACCEPTABLE', 'SUB_OPTIMAL', 'DEFICIENT')),
    shelter_readiness_pct INT NOT NULL,
    resource_coverage_pct INT NOT NULL,
    responder_readiness_pct INT NOT NULL,
    key_vulnerabilities TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 26. Resource Manager Self-Emergencies & Resource Requests Table
CREATE TABLE IF NOT EXISTS resource_manager_emergencies (
    id VARCHAR(64) PRIMARY KEY,
    manager_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    location VARCHAR(255) NOT NULL,
    emergency_type VARCHAR(50) NOT NULL CHECK (emergency_type IN ('FLOOD', 'FIRE', 'STRUCTURAL', 'MEDICAL', 'EARTHQUAKE', 'SUPPLY_DEFICIT', 'OTHER')),
    severity VARCHAR(50) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MODERATE', 'LOW')),
    status VARCHAR(50) NOT NULL DEFAULT 'EMERGENCY_AFFECTED' CHECK (status IN ('EMERGENCY_AFFECTED', 'REQUESTING_ASSISTANCE', 'RESTORED')),
    description TEXT,
    requested_resource_type VARCHAR(100) NOT NULL,
    requested_quantity INT NOT NULL DEFAULT 1,
    reserved_local_quantity INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    restored_at TIMESTAMPTZ,
    restored_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_rme_location ON resource_manager_emergencies(location);
CREATE INDEX IF NOT EXISTS idx_rme_status ON resource_manager_emergencies(status);
CREATE INDEX IF NOT EXISTS idx_rme_created_at ON resource_manager_emergencies(created_at DESC);


