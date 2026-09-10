# Nexus ResQ — Frontend Application

Modern, high-performance web client for the **Nexus ResQ** Disaster Intelligence & Emergency Response Platform, built with React 19, TypeScript, Vite, and Tailwind CSS v4.

---

## Technology Stack

- **Framework**: React 19 with React Router v7
- **Build Tool**: Vite 6 with `@vitejs/plugin-react`
- **Styling**: Tailwind CSS v4 with custom dark tactical palette and glassmorphism styling
- **State Management**: Zustand (`useAppStore`) with persistent authentication and role context
- **Motion & Micro-interactions**: Framer Motion
- **Mapping & Geospatial**: Custom Google Maps JavaScript API integration (`OperationalMap.tsx`) with dark tactical styling, dynamic SVG overlays, and route polylines
- **Location Services**: Browser Geolocation API integration (`useDeviceLocation.ts`)
- **API Client**: Modular Fetch-based REST client (`apiClient.ts`) with automatic JWT bearer token injection

---

## Role-Based Architecture & Portals

The application implements strict Role-Based Access Control (RBAC). When authenticated, users are routed to their designated operational workspace:

### 1. Public & Onboarding Routes
- `/`: Platform landing page with emergency guidance and rapid incident reporting entry.
- `/login`: Secure role-based login portal supporting all four system roles.
- `/signup`: Citizen registration with client-side and server-side password complexity validation.
- `/emergency`: Public guided emergency request wizard for unauthenticated or immediate citizen SOS submissions.

### 2. Citizen Emergency Portal (`/citizen`)
Designed for simplicity and rapid operation under distress:
- `/citizen`: Main citizen dashboard with automated real-device GPS location detection, quick SOS dispatch trigger, active emergency alerts banner, and nearby relief services.
- `/citizen/help`: Multi-step guided SOS wizard capturing assistance categories (medical, rescue, shelter, supplies), GPS coordinates, description, and contact information.
- `/citizen/weather`: Localized meteorological condition monitoring and hazard forecasts.
- `/citizen/history`: History of emergency requests submitted by the citizen and their live resolution status.
- `/citizen/alerts`: Broadcast emergency warnings, safety advisories, and alert severity tiers.
- `/citizen/shelters`: Real-time shelter directory with live occupancy, capacity status, and navigation coordinates.
- `/citizen/routes`: Designated safe evacuation corridors with active safety ratings (`SAFE`, `CAUTION`, `HIGH_RISK`, `BLOCKED`).

### 3. Responder Field Portal (`/responder`)
Optimized for field personnel executing emergency rescue missions:
- `/responder`: Active mission dashboard displaying assigned incident details, priority ranking, reporter contact, and one-tap status lifecycle buttons (`ASSIGNED` → `EN_ROUTE` → `ON_SCENE` → `ASSISTING` → `COMPLETED`).
- `/responder/missions`: Assigned mission queue with triage details and hazard ratings.
- `/responder/navigation`: Tactical turn-by-turn route visualization between responder location and the incident scene.
- `/responder/resources`: On-scene resource request submissions and equipment tracking.
- `/responder/alerts`: Field advisories, weather warnings, and command bulletins.
- `/responder/history`: Mission log of completed rescues and operational summaries.

### 4. Authority / Command Center (`/command`)
Comprehensive situational awareness and AI orchestration hub for incident commanders:
- `/command`: Central Command Orbit dashboard integrating active incident feeds, spatial map overview, 11-agent pipeline visualization, and pending decision approvals.
- `/command/orbit`: Full-screen tactical operational map displaying real-time incidents, responder telemetry, and risk perimeters.
- `/command/weather`: Regional environmental hazards, rainfall, and storm telemetry.
- `/command/warnings`: Weather warning issuance and operational broadcast log.
- `/command/incidents`: Incident triage table with severity ranking and manual override controls.
- `/command/intelligence`: Deep analysis of AI response plans, agent recommendations, and decision explanations.
- `/command/dispatch`: Field dispatch coordinator for deploying response teams and emergency medical units.
- `/command/operations`: Comprehensive multi-agency operational audit timeline.

### 5. Resource Manager Portal (`/resources`)
Logistics command center for managing critical relief assets and vehicle fleets:
- `/resources`: Central supply and logistics overview with inventory status cards and critical deficit alerts.
- `/resources/shelters`: Live shelter capacity, total beds, current occupancy, and overflow alerts.
- `/resources/supplies`: Granular stock levels for food rations, drinking water, medical kits, and sanitation supplies.
- `/resources/ambulances`: Emergency medical transport fleet tracking, vehicle readiness, and active dispatch status.
- `/resources/equipment`: Heavy rescue equipment, boats, power generators, and protective gear.
- `/resources/dispatches`: Inter-agency dispatch order creation, fulfillment verification, and delivery tracking.

---

## Key Technical Components

### Operational Map (`OperationalMap.tsx`)
- Integrates the Google Maps JavaScript API with a custom dark tactical theme (`DARK_MAP_STYLE`).
- Dynamically renders typed markers for citizens, emergency incidents, shelters, and field responders.
- Renders colored polyline evacuation corridors reflecting real-time safety scores (`SAFE`, `CAUTION`, `HIGH_RISK`, `BLOCKED`).
- Gracefully falls back to interactive vector SVG rendering when no external API key is provided.

### Device Geolocation Hook (`useDeviceLocation.ts`)
- Accesses the device's hardware GPS via `navigator.geolocation.getCurrentPosition` and `watchPosition`.
- Extracts high-accuracy latitude, longitude, accuracy radius, and timestamps.
- Automatically synchronizes current device coordinates to the backend tracking service (`POST /api/tracking/location`).

### Human-in-the-Loop Approval Modal
- Intercepts high-severity operational response plans generated by the 11-Agent AI pipeline.
- Presents incident severity, affected population, contributing risk signals, agent consensus, and proposed allocations.
- Requires explicit Command authority approval (`Allow / Approve` or `Reject / Deny`) before operational execution.

---

## Environment Configuration

Configure client-side environment variables in `frontend/.env`:

```env
# Backend REST API Base URL
VITE_API_URL=http://localhost:8000/api

# Google Maps JavaScript API Key (Optional)
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

> **Security Note:** Do not include sensitive backend secrets in frontend environment files, as variables prefixed with `VITE_` are exposed in client-side bundles.

---

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
npm install
```

### Development Server
Start the local Vite development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.

### Production Build
Compile TypeScript and generate an optimized production bundle in `dist/`:
```bash
npm run build
```

### Preview Production Build
Locally preview the generated production build:
```bash
npm run preview
```
