# 🌐 Nexus ResQ

### AI-Powered Disaster Intelligence & Emergency Response Platform

<p align="center">
  <strong>Observe. Understand. Decide. Respond.</strong><br>
  A real-time emergency coordination platform connecting citizens, field responders, command authorities, shelters, and logistics through intelligent geospatial operations and human-supervised AI.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-green?style=for-the-badge" alt="Status">
  <img src="https://img.shields.io/badge/AI%20Pipeline-11%20Agents-blue?style=for-the-badge" alt="AI Pipeline">
  <img src="https://img.shields.io/badge/Backend-Express%20%7C%20Node.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/Language-TypeScript%205-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Maps-Google%20Maps%20API-4285F4?style=for-the-badge&logo=google-maps&logoColor=white" alt="Google Maps">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

---

## 🚨 The Problem

During major natural disasters and emergencies, critical failure occurs not from a lack of goodwill, but from **fragmented communication, isolated databases, and delayed operational coordination**:

- Citizens in peril struggle to communicate exact GPS locations and specific survival needs.
- Field responders face ambiguous incident details and lack dynamic, hazard-aware routing.
- Command authorities receive overwhelming volumes of unstructured reports without unified situational triage.
- Shelters and hospitals lack visibility into incoming population pressure, leading to facility overload.
- Critical equipment (boats, trauma kits, power generators) remains idle or misallocated due to fragmented logistics.

**Nexus ResQ bridges these disconnected operations into a single, unified emergency response operating system.**

---

## 🧭 Platform Overview

**Nexus ResQ** coordinates the complete emergency-response lifecycle:

$$\text{Citizen SOS} \longrightarrow \text{Triage \& AI Assessment} \longrightarrow \text{Command Authorization} \longrightarrow \text{Field Dispatch} \longrightarrow \text{Resolution}$$

### Key Architectural Pillars

1. **Role-Specific Operational Portals**: Dedicated workspaces for Citizens, Field Responders, Incident Command, and Resource Managers.
2. **11-Agent AI Coordination Pipeline**: Multi-agent intelligence engine modeling situational synthesis, risk assessment, capacity forecasting, and multi-agency coordination.
3. **Human-in-the-Loop Decision Gate**: High-stakes AI response plans require explicit Command Authority review (`Allow / Approve` or `Reject / Deny`) before field execution.
4. **Real-Time GPS & Operational Telemetry**: Browser Geolocation API integration for automated device GPS detection, synchronized continuously to PostgreSQL and streamed via Server-Sent Events (SSE).
5. **Tactical Geospatial Operations**: Google Maps JavaScript API with custom dark tactical styling, dynamic SVG overlays, live incident markers, and safety-rated evacuation corridors.

---

## 👥 One Platform. Four Connected Portals.

Nexus ResQ enforces strict Role-Based Access Control (RBAC), providing tailored workspaces for each operational community:

| Operational Role | Primary Route | Core Capabilities |
|---|---|---|
| **🆘 Citizen** | `/citizen` | Auto-GPS location detection, 1-tap SOS wizard, weather hazard tracking, emergency request history, shelter locator, and safe evacuation corridors. |
| **🚑 Field Responder** | `/responder` | Active mission queue, one-tap operational lifecycle transitions (`ASSIGNED` → `EN_ROUTE` → `ON_SCENE` → `ASSISTING` → `COMPLETED`), turn-by-turn route navigation, and on-scene resource requests. |
| **🎛️ Command / Authority** | `/command` | Command Orbit situation map, live incident feed, 11-agent AI pipeline visualization, Human Approval Required decision modal, regional warning broadcasts, and dispatch coordinator. |
| **📦 Resource Manager** | `/resources` | Central relief logistics, shelter capacity and bed occupancy monitoring, critical supply inventories (rations, water, medical kits), emergency vehicle fleet tracking (ambulances, boats), and dispatch fulfillment. |

---

## 🧠 11-Agent AI Orchestration Architecture

The AI subsystem (`ai_agents/`) executes an 11-agent pipeline combining sequential assessment with parallel operational analysis:

```text
                  INCOMING CITIZEN SOS / SENSOR TELEMETRY
                                     │
                                     ▼
                           [1. INGESTION AGENT]
                                     │
                                     ▼
                          [2. VERIFICATION AGENT]
                                     │
                                     ▼
                           [3. SITUATION AGENT]
                                     │
                                     ▼
                            [4. PRIORITY AGENT]
                                     │
           ┌─────────────────────────┼─────────────────────────┐
           ▼                         ▼                         ▼
   [5. RESOURCE AGENT]      [6. CAPACITY AGENT]       [7. ROUTE AGENT]
           │                         │                         │
           └─────────────────────────┬─────────────────────────┘
                                     │
                                     ▼
                            [8. FORECAST AGENT]
                                     │
                                     ▼
                          [9. COORDINATOR AGENT]
                                     │
                                     ▼
                            [10. CRITIC AGENT]
                                     │
                                     ▼
                       ═════════════════════════════
                       HUMAN APPROVAL REQUIRED MODAL
                       Command Operator: ALLOW / REJECT
                       ═════════════════════════════
                                     │ (On Approval)
                                     ▼
                        AUTHORIZED FIELD OPERATION
                                     │
                                     ▼
                         [11. ANALYTICS AGENT]
                    (Continuous system-wide telemetry)
```

### Human-in-the-Loop Governance
The platform adheres to strict ethical and operational safety standards:
- The AI pipeline **never autonomously triggers** high-stakes evacuations, resource dispatches, or operational alerts.
- Response plans are placed in `PENDING_APPROVAL`.
- Incident Commanders review the complete agent consensus, risk signals, affected populations, and resource allocations before explicitly approving or rejecting the plan.

---

## 🗺️ Geospatial & Real-Time Tracking

- **Real Device GPS**: The frontend uses `useDeviceLocation.ts` to access hardware GPS via the browser Geolocation API, acquiring high-accuracy coordinates without mock fallbacks.
- **Location Synchronization**: Coordinates are synchronized to PostgreSQL via `POST /api/tracking/location`.
- **Live Event Stream**: The backend streams operational events, telemetry, and status changes in real time over Server-Sent Events (SSE) on `GET /api/events`.
- **Tactical Map**: The `OperationalMap.tsx` component features Google Maps dark styling (`#090d12` base), dynamic marker clustering, interactive SVG overlays, and safety-rated colored polylines (`SAFE`, `CAUTION`, `HIGH_RISK`, `BLOCKED`).

---

## 🏗️ System Architecture

```text
                             ┌──────────────────────────────┐
                             │       NEXUS RESQ CLIENT      │
                             │ React 19 + TypeScript + Vite │
                             │  Tailwind CSS v4 + Zustand   │
                             │  Google Maps Tactical Canvas │
                             └──────────────┬───────────────┘
                                            │
                             ┌──────────────┴───────────────┐
                             │                              │
                     REST APIs (Fetch)              SSE (/api/events)
                             │                              │
                             └──────────────┬───────────────┘
                                            │
                             ┌──────────────▼───────────────┐
                             │      EXPRESS REST BACKEND    │
                             │   Node.js (v18+) + TypeScript│
                             │   JWT Authentication / RBAC  │
                             │   16 Domain Route Handlers   │
                             └──────────────┬───────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
                    ▼                       ▼                       ▼
         ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
         │     POSTGRESQL      │ │    AI AGENT ENGINE  │ │  EXTERNAL SERVICES  │
         │  Native Pool ('pg') │ │ 11-Agent Pipeline   │ │ Weather Telemetry   │
         │  15+ Core Tables    │ │ Computational Models│ │ Geocoding Services  │
         │  Database Migrations│ │ Human Approval Gate │ │ Google Maps API     │
         └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

---

## 📁 Repository Structure

```text
nexus-resq/
├── ai_agents/              # 11-Agent AI Orchestration Subsystem
│   ├── agents/             # The 11 individual agent implementations
│   ├── engines/            # Decision, evacuation, priority, risk & simulation engines
│   ├── orchestrator/       # Pipeline orchestrator & workflow graph
│   ├── supervision/        # Human approval gate service
│   ├── types/              # Agent contracts and operational types
│   ├── index.ts            # Public subsystem API exports
│   └── package.json
│
├── backend/                # Node.js + Express REST API Server
│   ├── src/
│   │   ├── db/             # PostgreSQL pool, schema.sql & modular migration scripts
│   │   ├── middleware/     # JWT authentication & role-based access control
│   │   ├── routes/         # 16 domain REST routers (auth, tracking, emergency, etc.)
│   │   ├── services/       # Routing services, predictive engine & orchestrator bridge
│   │   └── server.ts       # Express server initialization & router mounting
│   └── package.json
│
├── frontend/               # React 19 + Vite Web Application
│   ├── src/
│   │   ├── api/            # Centralized API client & typed endpoints
│   │   ├── app/            # React Router v7 configuration with RBAC guards
│   │   ├── components/     # Layout shell, navigation, and Tactical Operational Map
│   │   ├── features/       # Role portals: citizen, responder, command, resources, sos
│   │   ├── hooks/          # useDeviceLocation hook for real-time GPS
│   │   └── store/          # Zustand global state (auth, locations, notifications)
│   └── package.json
│
├── .env.example            # Environment template (placeholders only)
├── .gitignore              # Strict secret protection rules
├── LICENSE                 # MIT License
├── package.json            # Root workspace scripts
└── README.md               # Platform documentation
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`
- **PostgreSQL**: `>= 14.0` running locally or on a remote host

---

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/theneerajgrover/Nexus-ResQ.git
cd Nexus-ResQ

# Install all workspace dependencies
npm install --prefix backend
npm install --prefix frontend
npm install --prefix ai_agents
```

---

### 2. Configure Environment Variables

Create `.env` files using the variable names below (never commit actual secrets):

#### Backend (`backend/.env`):
```env
PORT=8000
NODE_ENV=development
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_database_password
PGDATABASE=nexus_resq_db
DATABASE_URL=postgresql://postgres:your_database_password@localhost:5432/nexus_resq_db
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your_jwt_secret_key_here
```

#### Frontend (`frontend/.env`):
```env
VITE_API_URL=http://localhost:8000/api
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

---

### 3. Initialize Database & Run Migrations

```bash
npm run db:setup
```
This executes `backend/src/db/migrate.ts` to create the PostgreSQL tables, apply database extensions, and initialize system schemas.

---

### 4. Start Development Servers

Run backend and frontend servers using the root convenience commands:

```bash
# Terminal 1: Backend Express Server (Port 8000)
npm run dev:backend

# Terminal 2: Frontend Vite Server (Port 5173)
npm run dev:frontend
```

Once running:
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:8000`
- **Backend Health Check**: `http://localhost:8000/health`

---

## 🧪 Validation & Type Verification

Validate TypeScript correctness across all subsystems:

```bash
# Check TypeScript in backend and ai_agents
npm run typecheck

# Check and build frontend production bundle
npm run build:frontend
```

---

## 🔐 Security & Secret Protection

- **No Secrets in Source Control**: All `.env` files are ignored via `.gitignore` and must never be committed.
- **Stateless Tokens**: JWTs use expiration windows and are validated per request.
- **Input Sanitization**: Password complexity requirements, query parameterization (`$1`, `$2`), and CORS whitelist protection are strictly enforced on all endpoints.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](file:///e:/Nexus%20ResQ/LICENSE) for more information.
