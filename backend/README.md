# Nexus ResQ — Backend Services & Database

Convex-powered serverless backend, real-time database, and operational API endpoints for **Nexus ResQ**.

## Database Schema (18 Tables)

- `users`: User profiles, credentials, operational roles, phone & coordinates
- `disasterEvents`: Active emergencies (floods, earthquakes, fires, landslides)
- `sensorReadings`: Environmental telemetry (rainfall, river level, seismic, wind)
- `riskZones`: Geofenced risk scores (0-100), vulnerability metrics, boundary polygons
- `shelters`: Shelter locations, live capacity, occupancy, medical support, amenities
- `rescueTeams`: Specialized units (flood, medical, SAR), status, equipment, location
- `resources`: Asset inventory (food, water, medical kits, rescue gear, boats)
- `emergencyMissions`: Real-time incident dispatch records and operational assignments
- `citizenReports`: Verified citizen SOS inputs and incident reports
- `alerts`: Multi-channel public and authority emergency alerts
- `notifications`: SMS/App/Email push notifications for field personnel & citizens
- `evacuationRoutes`: Primary/secondary corridors with live safety scores and congestion
- `hospitals`: Critical care capacity, available beds, ICU status, ambulances
- `roadsAndInfrastructure`: Bridge, road, and power infrastructure blockage tracking
- `auditLogs`: Immutable compliance audit trail of critical operational actions
- `aiRecommendations`: AI-generated action plans pending or granted human approval
- `ambulances`: Emergency medical transport fleet status and GPS updates
- `dispatchRecords`: Inter-agency dispatch logs between Command & Resource Management

## API Endpoints

- `disasters.ts`: Disaster lifecycle queries and mutations
- `alerts.ts`: Broadcast, active alert retrieval, and severity filters
- `missions.ts`: Mission creation, triage assignment, responder status tracking
- `reports.ts`: Citizen emergency submissions and report verification
- `resources.ts`: Resource allocation, inventory replenishment, and dispatching
- `shelters.ts`: Capacity adjustments, occupancy check-ins, nearby shelter queries
- `hospitals.ts`: Bed availability queries and status updates
- `zones.ts`: Zone priority rankings, risk level evaluations
- `simulations.ts`: What-if simulation runs with casualty and damage projections
- `teams.ts`: Rescue team deployment and availability management
- `users.ts`: Role-based authentication and user profiles
- `notifications.ts`: Notification dispatch and read confirmations
- `audit.ts`: Operational compliance audit logging

## Getting Started

### Prerequisites
- Node.js >= 18
- Convex account (free tier supported)

### Installation
```bash
npm install
```

### Start Backend in Development Mode
```bash
npm run dev
# or
npx convex dev
```

### Seed Database with Initial Operational Data
```bash
npm run seed
# or
npx convex run seed:seedDatabase
```
Populates realistic incidents, rescue teams, shelters, hospitals, sensor readings, and supply inventories.
