# Nexus ResQ

<p align="center">
  <strong>NATIONAL EMERGENCY COORDINATION & RESPONSE PLATFORM</strong>
</p>

<p align="center">
  AI-assisted, multi-agency disaster coordination connecting citizens,
  responders, command authorities, and resource networks in real time.
</p>

<p align="center">

![Status](https://img.shields.io/badge/status-operational-success)
![Frontend](https://img.shields.io/badge/frontend-React%2019-61DAFB)
![Backend](https://img.shields.io/badge/backend-Node.js%20%2B%20Express-339933)
![Database](https://img.shields.io/badge/database-PostgreSQL-4169E1)
![AI](https://img.shields.io/badge/AI-11--Agent%20Orchestration-6C63FF)
![Authentication](https://img.shields.io/badge/auth-JWT-orange)
![Maps](https://img.shields.io/badge/maps-OSM%20%2B%20Routing-green)
![License](https://img.shields.io/badge/license-MIT-blue)

</p>

---

## Overview

**Nexus ResQ** is an AI-assisted emergency coordination and disaster-response platform designed to connect the entire emergency-response ecosystem through a unified operational system.

The platform is designed around a simple principle:

> **Detect → Verify → Understand → Prioritize → Plan → Approve → Execute → Monitor → Re-plan**

Instead of treating disaster response as a collection of disconnected systems, Nexus ResQ brings citizens, emergency responders, command authorities, and resource managers into one coordinated operational environment.

The system combines:

- Real-time incident intelligence
- AI-assisted disaster analysis
- Multi-agent response planning
- Human-supervised decision making
- Emergency assistance requests
- Resource coordination
- Shelter management
- Ambulance and responder coordination
- Safe-route selection
- Weather intelligence
- Live operational monitoring
- PostgreSQL-backed persistence
- JWT-based authentication
- Role-based access control

The goal is not simply to display disaster information.

The goal is to help authorities **understand what is happening, determine what should happen next, obtain human authorization where required, execute the response, and continuously adapt as conditions change.**

---

# Core Operational Roles

Nexus ResQ uses four core operational roles.

| Role | Primary Responsibility |
|---|---|
| 👤 **Citizen** | Report emergencies, request help, receive alerts, find shelters and safe routes |
| 🚑 **Responder** | Receive missions, navigate to incidents, update mission status, request resources |
| 🏛️ **Authority / Command** | Monitor incidents, analyze intelligence, review AI plans, approve response actions and coordinate dispatch |
| 📦 **Resource Manager** | Manage shelters, supplies, ambulances, equipment and approved resource dispatch records |

Access to operational functionality is controlled through role-based authentication.

---

# System Architecture

```text
                         ┌───────────────────────┐
                         │       CITIZEN         │
                         │                       │
                         │ Emergency Help        │
                         │ Alerts                │
                         │ Shelters              │
                         │ Safe Routes           │
                         │ History               │
                         └───────────┬───────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────┐
│                       NEXUS RESQ                             │
│                                                             │
│              Emergency Coordination Layer                   │
└─────────────────────────────────────────────────────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
      ┌───────────────┐      ┌───────────────┐      ┌────────────────┐
      │   RESPONDER   │      │   AUTHORITY   │      │ RESOURCE MGR   │
      │               │      │               │      │                │
      │ Missions      │      │ Command       │      │ Shelters       │
      │ Navigation    │      │ Intelligence  │      │ Supplies       │
      │ Resources     │      │ Dispatch      │      │ Ambulances     │
      │ Alerts        │      │ Evacuation    │      │ Equipment      │
      └───────────────┘      │ Operations    │      └────────────────┘
                             └───────┬───────┘
                                     │
                                     ▼
                         ┌──────────────────────┐
                         │  AI ORCHESTRATION    │
                         │                      │
                         │     11 AGENTS        │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ HUMAN APPROVAL       │
                         │                      │
                         │ Approve / Reject     │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ RESPONSE EXECUTION   │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ CONTINUOUS MONITORING │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ NEW RESPONSE PLAN    │
                         └──────────────────────┘
````

---

# 11-Agent AI Orchestration

One of the core components of Nexus ResQ is its **11-stage AI orchestration pipeline**.

The agents operate sequentially rather than presenting a static collection of independent AI outputs.

## Group A — Predictive Intelligence

The predictive intelligence layer continuously evaluates incoming information and prepares the system for changing disaster conditions.

### 1. Continuous Ingestion

Collects incoming operational information from available data sources.

Inputs can include:

* Disaster events
* Weather information
* Incident reports
* Resource state
* Responder updates
* Road conditions
* Location information
* Operational events

---

### 2. Verification

Evaluates incoming information before it is used for operational decisions.

The purpose is to reduce the possibility of unverified information influencing a response plan.

---

### 3. Situation

Builds an operational understanding of the current disaster situation.

It considers:

* Incident location
* Affected areas
* Severity
* Nearby hazards
* Population impact
* Existing deployments
* Available infrastructure

---

### 4. Priority

Determines the relative urgency of incidents.

Typical priority levels include:

```text
CRITICAL
HIGH
MODERATE
```

Incidents requiring dispatch are prioritized for command visibility.

---

### 5. Resource

Determines what resources may be required.

Examples include:

* Ambulances
* Search & rescue teams
* Medical units
* Equipment
* Shelters
* Supplies
* Specialized rescue assets

---

### 6. Capacity

Checks whether required resources are actually available.

The system should consider current resource availability rather than assuming that resources exist.

---

### 7. Route

Determines viable routes for responders and emergency resources.

The system is designed around **safety-first routing** rather than simply choosing the shortest route.

---

### 8. Forecast

Evaluates changing conditions and potential future risks.

This allows response plans to account for conditions that may deteriorate after the initial decision.

---

### 9. Coordinator

Combines the preceding intelligence into a proposed response plan.

Example actions can include:

```text
1. Dispatch rescue unit
2. Deploy medical resources
3. Establish exclusion perimeter
4. Initiate evacuation
5. Activate emergency shelter
```

---

### 10. Critic

Reviews the proposed response plan before human authorization.

The critic evaluates factors such as:

* Risk flags
* Resource fit
* Route availability
* Existing deployments
* Conflicting operations
* AI confidence
* Operational constraints

---

### 11. Analytics

Provides final operational analysis after the preceding stages have completed.

Analytics is intentionally treated as a downstream stage rather than being shown as completed before the rest of the pipeline.

---

# Human-Supervised AI

Nexus ResQ is designed around **human-supervised emergency decision making**.

AI agents can analyze information and prepare a response plan, but consequential response execution requires human authorization where configured.

The operational sequence is:

```text
Incident
   ↓
11-Agent Analysis
   ↓
Response Plan
   ↓
Critic Review
   ↓
Human Approval Required
   ↓
┌───────────────────┐
│                   │
▼                   ▼
APPROVE            REJECT
│                   │
▼                   ▼
EXECUTE            STOP / REVIEW
```

The system explicitly distinguishes between:

**AI recommendation**

and

**authorized operational action**

This prevents the AI pipeline from being represented as an autonomous authority.

---

# Continuous Response Planning

Nexus ResQ is not intended to stop after a single plan reaches `11/11`.

During an active disaster, conditions can change continuously.

For example:

```text
PLAN #001
    ↓
11 AGENTS
    ↓
HUMAN APPROVAL
    ↓
EXECUTION
    ↓
LIVE MONITORING
    ↓
NEW INCIDENT / HAZARD / RESOURCE CHANGE
    ↓
PLAN #002
    ↓
11 AGENTS
    ↓
HUMAN APPROVAL
    ↓
EXECUTION
    ↓
...
```

Each new plan can use updated information such as:

* New incidents
* Changed weather
* New road hazards
* Changed resource availability
* New responder locations
* Shelter occupancy
* Supply levels
* Ambulance availability
* Evacuation requirements

This creates a continuous operational response loop.

---

# Emergency Assistance

The public-facing emergency flow is designed to provide immediate access to assistance.

The emergency flow can collect:

* Assistance category
* Location
* GPS coordinates
* Emergency details
* Relevant contact information

The request is persisted in the backend and can become part of the operational incident workflow.

---

# Location & GPS

Nexus ResQ uses device location capabilities where permission is available.

Location information can support:

* Emergency requests
* Incident positioning
* Shelter discovery
* Safe-route calculation
* Responder navigation
* Command situational awareness

Location data should be handled according to applicable privacy, security and legal requirements.

---

# Safe Route Intelligence

A central requirement of Nexus ResQ is that emergency vehicles should not simply receive the shortest route.

The system should prioritize:

> **Safety over distance.**

Multiple candidate routes can be evaluated.

Example:

```text
Route A
Distance: 8 km
Hazard: Flood
Safety: 25/100
Status: UNSAFE

Route B
Distance: 11 km
Hazard: None detected
Safety: 91/100
Status: SAFE

Route C
Distance: 9 km
Hazard: Fire proximity
Safety: 48/100
Status: CAUTION
```

The system should prefer **Route B**, even though it is not the shortest route.

---

## Dynamic Route Re-evaluation

Routing should not be treated as a one-time operation.

During an active mission:

```text
AMBULANCE
    ↓
CURRENT ROUTE
    ↓
CONTINUOUS MONITORING
    ↓
NEW ROAD HAZARD
    ↓
ROUTE SAFETY SCORE CHANGES
    ↓
RECALCULATE
    ↓
SAFER ALTERNATIVE
    ↓
RESPONDER NAVIGATION
```

Possible route intelligence inputs include:

* Road network data
* Traffic information
* Weather conditions
* Disaster zones
* Road closures
* Responder reports
* Incident proximity
* Evacuation zones
* Known obstructions

---

# Mapping

The platform is designed to integrate map and routing services for operational visualization.

The map interface can support:

* Current location
* Incident locations
* Resource locations
* Shelters
* Emergency routes
* Route alternatives
* Hazard areas
* Disaster zones
* Operational markers

Map providers and API credentials are configured through environment variables and should never be committed to the repository.

---

# Weather Intelligence

Weather information is used as an additional operational signal.

## Citizen

The citizen interface can display weather information relevant to the user's current location.

## Authority

Command authorities can inspect weather conditions for operationally relevant areas.

Weather information can contribute to:

* Flood risk
* Storm conditions
* Visibility
* Temperature
* Wind conditions
* Disaster planning
* Route safety assessment

Weather information should be treated as one input into operational decision-making rather than as the sole source of truth.

---

# Resource Management

The Resource Manager interface is designed to maintain operational visibility over:

### Shelters

* Shelter location
* Capacity
* Occupancy
* Availability

### Supplies

* Supply type
* Quantity
* Availability
* Allocation

### Ambulances

* Unit identity
* Availability
* Assignment
* Current operational status

### Equipment

* Equipment type
* Quantity
* Availability
* Assignment

---

# Real-Time Resource Updates

Resource state should reflect operational changes.

For example:

```text
Shelter Capacity
280

Occupancy
140

Available
140
```

If an evacuation plan is executed:

```text
Occupancy
140 → 180
```

The Resource Manager should reflect the updated operational state.

---

# Resource Dispatch

Resource requests are handled through the command workflow.

The Authority/Command side can determine:

* What resource is required
* How much is required
* Where it is required
* Which units should be dispatched

The Resource Manager maintains the operational record of approved dispatches and resource movements.

---

# Citizen Features

The Citizen interface focuses on immediate access to safety information.

### Core features

* Emergency assistance
* Emergency reporting
* Alerts
* Shelters
* Safe routes
* Weather
* Emergency history
* Account/profile

The emergency action is intentionally prominent so that users do not need to navigate through multiple pages during a crisis.

---

# Responder Features

The Responder interface is designed around field operations.

### Core features

* Missions
* Incidents
* Navigation
* Resources
* Alerts
* Mission status
* Emergency history
* Profile

Responders can receive assigned missions and update operational status.

---

# Authority / Command Features

The Authority interface provides the primary command environment.

### Command

Central operational overview containing:

* Active incidents
* Priority incidents
* Resource status
* AI orchestration progress
* Operational state
* Critical alerts

### Incidents

Provides detailed incident information and prioritization.

### Intelligence

Provides AI-generated operational intelligence and agent orchestration.

### Dispatch

Provides dispatch planning and resource assignment.

### Evacuation

Provides evacuation planning and affected-area information.

### Operations

Provides operational status and ongoing response activity.

### Weather

Allows command personnel to inspect weather conditions relevant to operational areas.

---

# AI Orchestration Interface

The command interface provides visibility into the 11-agent pipeline.

Example:

```text
AI ORCHESTRATION

11 / 11

11 DONE
0 RUNNING
0 WAITING

✓ Continuous Ingestion     COMPLETE
✓ Verification             COMPLETE
✓ Situation                COMPLETE
✓ Priority                 COMPLETE
✓ Resource                 COMPLETE
✓ Capacity                 COMPLETE
✓ Route                    COMPLETE
✓ Forecast                 COMPLETE
✓ Coordinator              COMPLETE
✓ Critic                   COMPLETE
✓ Analytics                COMPLETE
```

During execution, the status should reflect the actual stage being processed rather than displaying a permanently completed state.

---

# Human Approval Workflow

When the AI pipeline completes a response plan, the Authority receives a human-approval request.

The approval request can contain:

* Incident ID
* Incident type
* Severity
* Affected zone
* AI confidence
* Risk flags
* Resource fit
* Route status
* Proposed response actions
* Operational notes

Example:

```text
HUMAN APPROVAL REQUIRED

AI RESPONSE PLAN

11-AGENT PIPELINE
11 OF 11 COMPLETE

INCIDENT CONTEXT
INCIDENT: INC-XXXX
SEVERITY: CRITICAL

CRITIC ASSESSMENT
AI CONFIDENCE: 94%
RESOURCE FIT: CONFIRMED
ROUTE CLEAR: YES

PROPOSED RESPONSE PLAN
1. Dispatch rescue team
2. Deploy medical units
3. Establish exclusion perimeter
4. Issue evacuation broadcast
5. Activate emergency shelter

[ APPROVE & EXECUTE ]

[ REJECT PLAN ]
```

The approval decision is persisted in the backend.

---

# Authentication & Security

Nexus ResQ uses role-based authentication.

Authentication includes:

* User registration
* Login
* JWT-based authentication
* Logout
* Role-based authorization
* Protected operational routes
* Password hashing
* User profile management

Passwords must never be stored as plaintext.

---

# Password Requirements

Account passwords must satisfy the configured security requirements.

Minimum requirements:

```text
✓ At least 8 characters
✓ At least 1 uppercase letter
✓ At least 1 digit
✓ At least 1 special character
```

Passwords that do not satisfy these requirements must not be accepted.

The backend stores only the hashed password.

---

# Database

Nexus ResQ uses PostgreSQL for persistent application data.

Primary database:

```text
nexus_resq_db
```

The database is responsible for persistent operational information including, where applicable:

* Users
* Authentication data
* Incidents
* Emergency requests
* Missions
* Resources
* Shelters
* Supplies
* Ambulances
* Equipment
* Dispatch records
* AI execution state
* AI plans
* Human approvals
* Alerts
* Notifications
* Weather-related operational records
* History
* Audit information

The exact schema should be treated as implementation-specific and maintained through the project's database setup/migration system.

---

# Data Integrity Principle

Nexus ResQ follows a strict operational rule:

> **Frontend data should originate from the backend/database or an explicitly configured live external data source.**

The frontend should not use fabricated operational data as a substitute for unavailable backend data.

If live data is unavailable, the application should expose the appropriate unavailable/error state rather than silently presenting fake operational information.

---

# Real-Time Synchronization

Operational interfaces can periodically synchronize with the backend.

The synchronization indicator represents the time since the most recent backend data refresh rather than the amount of time the browser has been open.

Example:

```text
SYNCED 3s AGO
SYNCED 8s AGO
SYNCED 21s AGO
```

The synchronization cycle should reset when fresh backend data is successfully received.

---

# API Architecture

The frontend communicates with backend APIs for operational data.

Typical API domains include:

```text
/auth
/users
/incidents
/emergency
/missions
/resources
/shelters
/supplies
/ambulances
/equipment
/dispatch
/routes
/weather
/alerts
/notifications
/ai
/approvals
/history
```

The exact endpoint structure is implementation-dependent.

API contracts should remain backward-compatible wherever possible.

---

# Technology Stack

## Frontend

* React 19
* TypeScript
* Vite
* Modern CSS/UI system
* Client-side routing
* Real-time API synchronization

## Backend

* Node.js
* Express
* TypeScript
* REST APIs
* JWT authentication
* PostgreSQL
* Server-Sent Events / real-time communication where configured

## Database

* PostgreSQL

## Mapping & Routing

* OpenStreetMap-based geographic data
* Routing engine integration
* External map/routing APIs where configured

## AI

* 11-stage orchestration architecture
* Predictive intelligence
* Operational response planning
* Human-supervised execution

---

# Project Structure

```text
Nexus ResQ/
│
├── backend/
│   ├── src/
│   │   ├── ...
│   │   └── server.ts
│   │
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── ...
│   │   └── main.*
│   │
│   ├── package.json
│   └── ...
│
├── package.json
├── .gitignore
└── README.md
```

The repository structure may evolve as the platform develops.

---

# Local Development

## Prerequisites

Install:

* Node.js
* npm
* PostgreSQL
* Git

Verify Node.js:

```bash
node --version
```

Verify npm:

```bash
npm --version
```

Verify PostgreSQL:

```bash
psql --version
```

---

# Environment Variables

Environment files are intentionally excluded from Git.

Typical environment configuration may include:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/nexus_resq_db
JWT_SECRET=your_secure_secret
PORT=8000
```

Frontend configuration may include environment-specific API and external service keys.

**Never commit real `.env` files or API secrets to GitHub.**

Only safe example configuration should be committed, such as:

```text
.env.example
```

---

# Running the Project

From the root directory:

### Backend

```bash
npm run dev:backend
```

Backend:

```text
http://localhost:8000
```

### Frontend

Open another terminal:

```bash
npm run dev:frontend
```

Frontend:

```text
http://localhost:5173
```

---

# Running Services Individually

## Backend

```bash
cd backend
npm run dev
```

## Frontend

```bash
cd frontend
npm run dev
```

---

# Database Setup

From the root:

```bash
npm run db:setup
```

Or:

```bash
cd backend
npm run db:setup
```

Database configuration must be supplied through environment variables.

---

# Type Checking

## Frontend

```bash
cd frontend
npx tsc --noEmit
```

## Backend

```bash
cd backend
npm run typecheck
```

---

# Production Build

Build the frontend:

```bash
cd frontend
npm run build
```

The generated production assets can then be deployed through the selected hosting provider.

---

# Deployment Architecture

The intended deployment architecture is:

```text
                    USERS
                      │
                      ▼
             ┌─────────────────┐
             │     VERCEL      │
             │                 │
             │    FRONTEND     │
             │ React + Vite    │
             └────────┬────────┘
                      │
                      │ HTTPS API
                      ▼
             ┌─────────────────┐
             │     RENDER      │
             │                 │
             │     BACKEND     │
             │ Node + Express  │
             └────────┬────────┘
                      │
                      ▼
             ┌─────────────────┐
             │   PostgreSQL    │
             │                 │
             │ nexus_resq_db   │
             └─────────────────┘
```

### Frontend

Recommended hosting:

**Vercel**

### Backend

Recommended hosting:

**Render**

### Database

PostgreSQL can be hosted locally during development or through a managed PostgreSQL provider for production.

---

# Production Security

Before production deployment:

* Never commit `.env`
* Never expose database passwords
* Never expose JWT secrets
* Never expose private API keys
* Enable HTTPS
* Restrict database access
* Configure CORS correctly
* Validate all API input
* Hash passwords
* Apply role-based authorization
* Validate JWT tokens
* Implement rate limiting where appropriate
* Maintain audit logs for sensitive operations
* Protect emergency and command endpoints
* Apply appropriate data-retention policies

---

# Operational Safety Principles

Nexus ResQ is designed as a decision-support and coordination platform.

AI recommendations should not automatically be interpreted as legally or operationally authorized actions.

Important operational decisions should remain subject to appropriate human authority.

The platform therefore emphasizes:

```text
AI ANALYSIS
     ↓
AI RECOMMENDATION
     ↓
CRITIC REVIEW
     ↓
HUMAN AUTHORIZATION
     ↓
EXECUTION
     ↓
MONITORING
```

---

# Failure Handling

Emergency systems must expect partial failures.

The architecture should account for:

* API failures
* External API outages
* Network interruptions
* GPS unavailable
* Weather API unavailable
* Mapping API unavailable
* Database connectivity issues
* Invalid or expired authentication
* Stale operational data
* Conflicting resource states

The system should expose an appropriate operational status instead of silently presenting fabricated information.

---

# Auditability

Important operational actions should be traceable.

Examples include:

* Emergency request creation
* Incident creation
* Mission assignment
* Resource dispatch
* AI plan creation
* AI plan completion
* Human approval
* Human rejection
* Plan execution
* Resource status changes
* Mission status changes

A future production deployment should maintain appropriate audit logs for command and emergency actions.

---

# Design Philosophy

Nexus ResQ is designed around emergency operations rather than conventional dashboard design.

The interface prioritizes:

### Clarity

Critical information should be visible without unnecessary reading.

### Speed

Emergency workflows should require minimal interaction.

### Situational awareness

Maps, incidents, resources and hazards should be understandable at a glance.

### Human oversight

AI should assist decision-makers rather than silently replacing them.

### Continuous operation

Disaster response is dynamic and must continuously adapt to changing conditions.

### Data integrity

Operational information must come from reliable data sources.

---

# Future Development

Potential future capabilities include:

* Multi-agency interoperability
* Advanced GIS layers
* Satellite imagery
* IoT sensor integration
* Drone telemetry
* Computer vision for disaster assessment
* Automated damage detection
* Predictive evacuation modeling
* Advanced traffic intelligence
* Dedicated responder mobile application
* Offline emergency operation
* Mesh-network communication
* Public warning integration
* Government emergency-system interoperability
* Advanced resource optimization
* Historical disaster analytics
* Post-disaster recovery planning

---

# Project Vision

Nexus ResQ aims to evolve from a disaster-response prototype into a unified emergency coordination platform capable of supporting government agencies, emergency responders, communities and citizens during large-scale disasters.

The long-term objective is to create a system where:

```text
DATA
 ↓
INTELLIGENCE
 ↓
DECISION
 ↓
HUMAN AUTHORIZATION
 ↓
ACTION
 ↓
MONITORING
 ↓
ADAPTATION
```

happens continuously within a single coordinated platform.

---

# Important Disclaimer

Nexus ResQ is a technology prototype and research/development project.

It should not be treated as a certified emergency-management, dispatch, navigation, medical, governmental or life-safety system without appropriate:

* Government authorization
* Security assessment
* Reliability testing
* GIS validation
* Disaster-management validation
* Legal review
* Privacy review
* Infrastructure testing
* Operational certification
* Human-in-the-loop procedures
* Fail-safe mechanisms

External map, weather, traffic and routing services may have their own availability, accuracy and licensing limitations.

For real-world deployment, all operational decisions must remain subject to qualified emergency-management personnel and applicable laws and regulations.

---

# Contributing

Contributions are welcome.

Before submitting changes:

1. Understand the existing architecture.
2. Avoid unnecessary changes to working functionality.
3. Maintain existing API contracts where possible.
4. Do not introduce mock operational data.
5. Do not commit credentials or secrets.
6. Test both frontend and backend.
7. Run TypeScript validation.
8. Test database interactions.
9. Verify authentication and authorization.
10. Document significant architectural changes.

---

# Development Commands

| Purpose            | Command                           |
| ------------------ | --------------------------------- |
| Start backend      | `npm run dev:backend`             |
| Start frontend     | `npm run dev:frontend`            |
| Database setup     | `npm run db:setup`                |
| Frontend typecheck | `cd frontend && npx tsc --noEmit` |
| Backend typecheck  | `cd backend && npm run typecheck` |
| Frontend build     | `cd frontend && npm run build`    |

---

# Repository

**Nexus ResQ**

National Emergency Coordination & Response Platform

Built as an AI-assisted disaster coordination and emergency-response platform.

---

<p align="center">
  <strong>NEXUS RESQ</strong><br>
  AI-ASSISTED · REAL-TIME · MULTI-AGENCY · HUMAN-SUPERVISED
</p>
