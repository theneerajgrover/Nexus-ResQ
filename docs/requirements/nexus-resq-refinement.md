# NEXUS RESQ — FRONTEND REFINEMENT, 4-ROLE SYSTEM & 11-AGENT COMMAND CENTER

## ROLE

Act as a senior product engineer, UI/UX architect, frontend engineer, real-time systems engineer and AI-agent orchestration interface designer.

You are modifying the existing **Nexus ResQ** project.

Do NOT rebuild the project blindly.

First inspect the existing Nexus ResQ frontend, backend integration, routing, authentication, role system, components, APIs, real-time implementation and current UI.

Then implement the requirements below carefully.

---

# 0. MOST IMPORTANT ARCHITECTURAL RULE

Nexus ResQ has exactly **four operational roles**:

```text
👤 Citizen
🚑 Responder
🏛️ Authority / Command
📦 Resource Manager
```

Do not introduce:

* Dispatcher
* Volunteer
* NGO
* Organization
* Shelter Operator
* Admin as an operational user
* Community Operator
* Resource Operator
* Any fifth operational role

The four roles are:

### CITIZEN

Report emergencies, receive alerts, view shelters and safe routes.

### RESPONDER

Receive/accept missions, update mission status, request resources.

### AUTHORITY / COMMAND

Monitor disasters, view AI recommendations, approve evacuation, assign missions.

### RESOURCE MANAGER

Manage shelters, supplies, ambulances and rescue resources.

This role structure must remain consistent across:

* authentication
* authorization
* database
* API
* frontend routing
* navigation
* pages
* components
* tests
* documentation

Backend authorization remains authoritative.

---

# 1. BEFORE CHANGING ANYTHING — INSPECT THE PROJECT

First inspect:

```text
frontend/
backend/
authentication
RBAC
routing
navigation
role definitions
API services
WebSockets
3D components
Authority panel
Responder panel
Citizen panel
Resource Manager panel
```

Find:

* current role names
* current routes
* current navigation
* current dashboards
* current home pages
* current fonts
* current design tokens
* current API integrations
* current mock/static data
* current real-time data
* existing 3D implementation
* existing command interface

Do not unnecessarily rewrite working architecture.

Make minimal, controlled changes.

---

# 2. RESOURCE MANAGER — FONT CHANGE

The Resource Manager Overview currently uses a font/style that does not fit the intended Nexus ResQ design.

Change the font treatment of the Resource Manager Overview.

Before changing it:

1. Inspect the current global typography system.
2. Determine whether the wrong font is locally overridden.
3. Fix the specific Resource Manager Overview typography.
4. Do not accidentally change typography across the entire application unless the existing global design system requires it.

The final Resource Manager interface should feel consistent with Nexus ResQ while having its own operational identity.

---

# 3. RESOURCE MANAGER — REMOVE CURRENT NAVIGATION ITEMS

Remove these items from the Resource Manager navigation:

```text
Overview
Shelter
Supply
Ambulance
Equipment
Request
```

IMPORTANT:

This requirement means the **navigation presentation must be redesigned**, not that the underlying functionality should simply be deleted.

Do not delete working resource-management APIs or components unless they are genuinely obsolete.

Reorganize the Resource Manager experience into a more compact operational interface.

The Resource Manager should still be able to manage:

```text
Shelters
Supplies
Ambulances
Rescue Equipment
Resource Requests
```

but these should be accessible through the redesigned Resource Manager experience rather than the old navigation structure.

Do not recreate the exact same navigation under different names.

---

# 4. CITIZEN + RESPONDER AUTHENTICATION

The authentication experience must explicitly support:

```text
Citizen
Responder
```

Provide clear:

### Login

and

### Sign Up

flows for the appropriate users.

Citizen:

```text
Sign Up
   ↓
Citizen account
   ↓
Citizen interface
```

Responder:

```text
Authorized Responder registration/onboarding
   ↓
Responder account
   ↓
Responder interface
```

IMPORTANT SECURITY RULE:

Do NOT allow an ordinary user to self-select:

```text
Authority / Command
Resource Manager
```

and immediately gain those privileges.

Those operational roles must be assigned/authorized by the backend.

The frontend must never determine privileged authorization.

---

# 5. RESPONDER INTERFACE — BUILD IT PROPERLY

The current Responder navigation is not functioning correctly.

Do not merely repair the links.

Build the complete Responder experience.

The Responder home should answer:

> **WHAT IS MY NEXT MISSION?**

The responder should immediately see:

* current assignment
* mission priority
* incident location
* mission status
* navigation
* relevant hazards
* ETA
* required resources
* operational instructions
* alerts

Core mission states:

```text
AVAILABLE
    ↓
ASSIGNED
    ↓
ACCEPTED
    ↓
EN ROUTE
    ↓
ON SCENE
    ↓
ASSISTING
    ↓
COMPLETED
```

The responder must be able to update mission state through real backend APIs.

Do not create fake status transitions.

---

# 6. RESPONDER NAVIGATION

Build a functional responder navigation system.

Suggested operational sections:

```text
MISSION
INCIDENT
NAVIGATION
RESOURCES
ALERTS
PROFILE
```

You may refine the labels if the existing architecture requires it, but do not recreate the old dashboard.

Every navigation item must:

* route correctly
* load real content
* handle loading state
* handle empty state
* handle errors
* respect permissions

No dead navigation items.

---

# 7. CITIZEN HOME — SIMPLIFY IT

The Citizen interface must be understandable immediately.

When a Citizen opens Nexus ResQ, the primary emergency action must be visible **at first glance**.

## GET HELP

must be one of the most prominent actions on the first screen.

The Citizen should not have to search menus to request emergency assistance.

The home experience should be simplified.

Do not overload it with:

* analytics
* unnecessary statistics
* complicated 3D controls
* multiple information cards
* operational command data
* technical terminology

The citizen home should answer:

```text
Am I safe?
    ↓
Is there danger nearby?
    ↓
What should I do?
    ↓
Where can I go?
    ↓
How do I get help?
```

---

# 8. CITIZEN — SHELTERS

Build a proper Citizen Shelter interface.

It should allow the citizen to discover nearby shelters using real backend data.

Display useful information such as:

* shelter name
* distance
* location
* capacity where public
* availability
* accessibility
* facilities
* current status
* route

The primary question should be:

> **CAN I REACH A SAFE SHELTER?**

Do not make this a generic table.

Use a spatial/map-oriented presentation where appropriate.

---

# 9. CITIZEN — SAFE ROUTES

Build a dedicated **Safe Routes** experience.

It should communicate:

* current location
* safe destination
* route
* risk zones
* blocked/unsafe areas
* alternate route where available
* route status

The citizen should not need to understand GIS terminology.

Instead of:

```text
Geospatial risk layer: 0.73
```

communicate:

```text
HIGH-RISK AREA AHEAD

Alternative safer route available.
```

Use real route/risk data when available.

Do not hard-code routes.

---

# 10. RESQ PILOT — INSPECT THE ACTUAL PROJECT

This is extremely important.

The earlier project is **ResQ Pilot**.

Do NOT guess what its 11 agents are.

Inspect the actual ResQ Pilot repository/project available to you.

Search for:

```text
agents
multi-agent
agent orchestration
coordinator
ingestion
verification
situation
priority
resource
route
capacity
AI workflow
response plan
human approval
replanning
```

Identify the complete agent architecture implemented/designed in ResQ Pilot.

The ResQ Pilot documentation available in the project explicitly describes these agents:

```text
1. Ingestion Agent
2. Verification Agent
3. Situation Agent
4. Priority Agent
5. Resource Agent
6. Route Agent
7. Capacity Agent
8. Coordinator Agent
```

These agents form a pipeline:

```text
Reports
   ↓
Ingestion
   ↓
Verification
   ↓
Situation Understanding
   ↓
Priority
   ↓
Resources
   ↓
Routes
   ↓
Capacity
   ↓
Coordinator
   ↓
Response Plan
   ↓
Human Approval
   ↓
Execution
```

The source material does NOT provide enough evidence for me to safely invent agents 9–11.

Therefore:

### REQUIRED ACTION

Inspect the actual ResQ Pilot source code/repository and identify the complete 11-agent design.

Use the real implementation as the source of truth.

Do not fabricate three additional agents simply to reach the number eleven.

---

# 11. NEXUS RESQ AUTHORITY PANEL — 11-AGENT SYSTEM

Integrate the complete ResQ Pilot 11-agent architecture into the **Authority / Command** interface.

The Authority should have visibility into the agent pipeline.

The purpose is not to expose technical AI internals unnecessarily.

The interface should answer:

> **WHAT ARE THE AGENTS DOING RIGHT NOW?**

Show:

```text
Agent
Current Task
Status
Progress
Input
Output
Confidence where applicable
Timestamp
```

Possible agent states:

```text
IDLE
ANALYZING
WAITING
COMPLETED
FAILED
REQUIRES REVIEW
```

Do not make all agents look permanently active.

Agent status must come from real backend state.

---

# 12. AUTHORITY COMMAND CENTER

The Authority / Command role is the central operational role.

Its home should answer:

> **WHAT NEEDS ACTION RIGHT NOW?**

Do not create a generic dashboard.

Use the existing Nexus ResQ 3D spatial philosophy.

The main experience should combine:

```text
3D operational environment
+
Live incidents
+
AI agent activity
+
Risk intelligence
+
Responder availability
+
Evacuation state
+
Resource pressure
+
Human approval queue
```

The Authority should be able to move from:

```text
REGION
   ↓
CITY
   ↓
ZONE
   ↓
INCIDENT
```

while maintaining the same operational environment.

---

# 13. AUTHORITY HOME SECTION

Add a dedicated **Home** experience to Authority / Command.

It must not simply duplicate Intelligence or Operations.

Home should provide a concise operational overview:

### CURRENT SITUATION

* active incidents
* critical incidents
* response activity
* current risk
* pending approvals
* agent progress
* evacuation status
* resource pressure

The home screen must be immediately understandable.

---

# 14. REAL-TIME AUTHORITY DATA

Authority Home and operational sections must use **real analysis/data**.

Refresh/update the displayed analysis every:

## 5 SECONDS

Do not blindly reload the entire page every 5 seconds.

Use efficient data synchronization.

Preferred approach:

```text
Initial API request
      ↓
Real-time updates / polling
      ↓
Update changed state only
      ↓
UI refresh
```

If WebSockets already exist:

Use WebSockets for truly real-time events where appropriate.

Use 5-second refresh only for data that requires periodic synchronization.

Do not create unnecessary API load.

Display:

```text
Last Updated: 20:57:05
```

or an equivalent clear freshness indicator.

---

# 15. NEVER USE FAKE LIVE DATA

Do NOT create fake values such as:

```text
Active Incidents: 47
Risk: 83%
Responders: 128
Shelter Capacity: 62%
```

just to make the screen look alive.

All operational data must originate from:

```text
Backend API
Database
AI service
WebSocket
External data integration
```

If real data is unavailable:

show:

```text
No current data available
```

or an appropriate loading/stale/error state.

---

# 16. HUMAN APPROVAL — MANDATORY

The AI agents must NOT independently execute critical operational actions.

The flow must be:

```text
Agent Analysis
      ↓
Agent Results
      ↓
Response Plan
      ↓
Human Approval Required
      ↓
APPROVE / REJECT
      ↓
Execution
```

This follows the ResQ Pilot human-in-the-loop concept.

The source material explicitly defines:

```text
AI Analysis
     ↓
Response Plan
     ↓
Human Review
     ↓
Approve / Reject
     ↓
Execute only after authorization
```

Implement this principle in Nexus ResQ.

---

# 17. HUMAN APPROVAL POPUP

When the agents complete a task that requires authorization:

show a clear approval popup/modal.

The interaction should feel similar to an AI-agent approval request:

```text
┌─────────────────────────────────────┐
│       ACTION REQUIRES APPROVAL      │
│                                     │
│ AI Response Plan Ready              │
│                                     │
│ Incident: [incident]                │
│ Priority: [priority]                │
│ Recommended Action: [action]        │
│                                     │
│ Agents Completed: 11 / 11           │
│ Confidence: [value if available]    │
│                                     │
│ [ REJECT ]        [ ALLOW ]         │
└─────────────────────────────────────┘
```

Use the exact terminology appropriate to the backend.

The popup must NOT falsely imply that clicking Allow executes something if the backend does not actually execute it.

The frontend should call the correct approval API.

---

# 18. APPROVAL STATES

Support:

```text
PENDING_APPROVAL
      ↓
APPROVED
      ↓
EXECUTING
      ↓
EXECUTED
```

or:

```text
PENDING_APPROVAL
      ↓
REJECTED
      ↓
REPLANNING
      ↓
NEW PLAN
      ↓
PENDING_APPROVAL
```

The rejection reason should be persisted when supported.

Never silently discard rejected plans.

---

# 19. COMMAND BAR — 11 AGENT PROGRESS

The Authority Command interface must contain a compact agent progress indicator.

Example:

```text
AI RESPONSE PIPELINE

████████████████░░░  9 / 11 AGENTS

Ingestion       ✓
Verification    ✓
Situation       ✓
Priority        ✓
Resource        ✓
Route           ✓
Capacity        ✓
...
```

Do not hard-code:

```text
11 / 11
```

The progress must reflect actual backend agent state.

If only 4 agents have completed:

```text
4 / 11
```

must be shown.

---

# 20. AGENT PROGRESS DETAIL

Clicking/expanding the agent progress indicator should reveal the current agent pipeline.

Show:

```text
Agent Name
Status
Started At
Completed At
Duration
Current Task
Result
```

Where supported.

Do not expose raw model prompts, secrets or sensitive internal information.

---

# 21. INTELLIGENCE SECTION — MAKE IT UNDERSTANDABLE

The current Intelligence section feels theoretical.

Transform it into an operational intelligence interface.

Use real visualizations such as:

### Risk Trend Graph

```text
Risk
│
│        ╭──╮
│    ╭───╯  ╰──
│────╯
└──────────────── Time
```

### Incident Distribution

Show incident count by:

* severity
* location
* type
* time

### Risk Map

Use a real spatial visualization.

### AI Analysis

Show:

```text
Current Risk
Risk Trend
Affected Area
Confidence
Key Signals
Recommended Attention
```

Do not turn every value into a card.

Use charts, maps and spatial visualization where they communicate better.

---

# 22. EVACUATION SECTION — MAKE IT OPERATIONAL

The current Evacuation section is too theoretical.

Transform it into a practical command interface.

Show:

### MAP

* affected zones
* safe zones
* evacuation routes
* blocked routes
* shelters
* population pressure

### ROUTE ANALYSIS

Compare:

```text
Route A
Distance
ETA
Risk
Capacity

Route B
Distance
ETA
Risk
Capacity
```

### SHELTER CAPACITY

Visualize:

```text
Current Occupancy
Available Capacity
Projected Pressure
```

### EVACUATION STATUS

Examples:

```text
NOT STARTED
PREPARING
ACTIVE
ESCALATED
COMPLETED
```

Authority can review/approve evacuation actions according to backend permissions.

---

# 23. OPERATIONS SECTION — MAKE IT OPERATIONAL

Operations must stop feeling like static theory.

Show real operational state:

### INCIDENTS

Graph / timeline / spatial distribution.

### RESPONDERS

Availability and active assignments.

### RESPONSE PERFORMANCE

Where actual metrics exist:

* assignment time
* response time
* completion time
* unresolved incidents

### RESOURCE PRESSURE

Show shortages and demand.

### LIVE TIMELINE

Example:

```text
20:54  Incident detected
20:55  AI analysis started
20:56  Priority determined
20:56  Resources identified
20:57  Response plan generated
20:57  Awaiting human approval
```

Use real timestamps.

---

# 24. AUTHORITY COMMAND — FIXED SINGLE-SCREEN DESIGN

This requirement applies to **all four operational roles**.

The primary panel for:

```text
Citizen
Responder
Authority / Command
Resource Manager
```

must be designed as a **fixed viewport experience**.

The user should NOT need to vertically scroll through the entire page to understand the operational state.

Do not simply use:

```css
overflow-y: auto;
```

to create a dashboard that is technically contained but still requires long scrolling.

Instead design each interface as a viewport composition.

Example:

```text
┌──────────────────────────────────────────────┐
│ HEADER / STATUS                              │
├───────────────┬──────────────────────────────┤
│ NAVIGATION    │                              │
│               │      MAIN CONTENT            │
│               │                              │
│               │                              │
├───────────────┴──────────────────────────────┤
│ STATUS / TIMELINE / ACTION BAR               │
└──────────────────────────────────────────────┘
```

All critical information should fit into one screen.

---

# 25. SINGLE-SCREEN DOES NOT MEAN TINY TEXT

Do NOT solve the no-scroll requirement by:

* shrinking fonts
* shrinking buttons
* squeezing 20 cards into the viewport
* making everything unreadable
* reducing spacing excessively

Instead:

### Prioritize.

Show only the highest-value information.

Use:

* collapsible contextual panels
* modal details
* tabs
* spatial selection
* expandable overlays
* contextual drawers
* progressive disclosure

The main viewport remains fixed.

---

# 26. ROLE-SPECIFIC SINGLE-SCREEN DESIGN

## Citizen

One-screen priorities:

```text
GET HELP
CURRENT SAFETY
ALERTS
SHELTER
SAFE ROUTE
```

No unnecessary operational data.

---

## Responder

One-screen priorities:

```text
CURRENT MISSION
LOCATION
NAVIGATION
STATUS
RESOURCE REQUEST
ALERT
```

---

## Authority / Command

One-screen priorities:

```text
LIVE INCIDENTS
RESQ SPHERE
AI AGENT PROGRESS
PENDING APPROVAL
RISK
EVACUATION
RESPONSE STATE
```

---

## Resource Manager

One-screen priorities:

```text
RESOURCE HEALTH
SHELTER CAPACITY
SUPPLY PRESSURE
AMBULANCE STATUS
EQUIPMENT
PENDING REQUESTS
```

Details should open contextually rather than requiring page scrolling.

---

# 27. RESPONSIVE BEHAVIOR

The no-scroll requirement applies to the primary operational viewport.

However, smaller screens may require a different information hierarchy.

Do not force the desktop Command Center onto a mobile device.

Use:

```text
Desktop → spatial command environment
Tablet → compact operational interface
Mobile → task-first emergency interface
```

The Citizen mobile interface should prioritize emergency actions.

The Responder mobile interface should prioritize the current mission.

---

# 28. 3D DESIGN MUST REMAIN

Do not remove the Nexus ResQ 3D identity while simplifying the interface.

The 3D environment should remain most prominent in Authority / Command.

Use:

```text
ResQ Sphere
Incident nodes
Responder nodes
Risk surface
Evacuation routes
Shelters
Resource locations
```

But 3D is not allowed to interfere with critical controls.

---

# 29. DATA VISUALIZATION REQUIREMENT

Where Intelligence, Evacuation and Operations currently contain explanatory text, replace unnecessary theory with actual visual information.

Use appropriate:

* line charts
* area charts
* bar charts
* donut/ring indicators where meaningful
* timelines
* spatial maps
* heat/risk surfaces
* route visualization
* capacity gauges
* trend indicators

Every visualization must answer a specific operational question.

Do not add charts simply for decoration.

---

# 30. EMPTY / ERROR / STALE STATES

Every real-time panel must handle:

```text
LOADING
LIVE
EMPTY
ERROR
STALE
OFFLINE
```

If data hasn't updated recently:

show a stale indicator.

Example:

```text
LIVE
Updated 4 sec ago
```

or:

```text
STALE
Last update 2 min ago
```

Never present stale data as current.

---

# 31. PERFORMANCE

Because the four panels are fixed and Authority includes 3D + charts + live updates:

Optimize:

* 3D rendering
* WebSocket updates
* API polling
* React re-renders
* chart rendering
* asset loading

Do not reload the complete page every 5 seconds.

Update only affected state.

---

# 32. DO NOT BREAK THE EXISTING BACKEND

Before implementing frontend changes, inspect available backend endpoints.

Reuse existing APIs.

Do not invent endpoints and pretend they exist.

If a required capability is absent:

identify the exact backend endpoint/service required.

Do not silently replace real functionality with frontend mock data.

---

# 33. DO NOT BREAK EXISTING AUTHENTICATION

Preserve the existing authentication mechanism unless modification is required for the four-role architecture.

Do not:

* bypass authentication
* hard-code roles
* store privileged role information only in frontend state
* allow client-side privilege escalation

---

# 34. FINAL ROLE ARCHITECTURE

The final product must conceptually look like:

```text
                         NEXUS RESQ
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
       CITIZEN            RESPONDER       AUTHORITY / COMMAND
          │                   │                   │
       REPORT              EXECUTE              DECIDE
       GET HELP            MISSION              ANALYZE
       ALERTS              STATUS               DISPATCH
       SHELTER             RESOURCES             EVACUATE
       ROUTES                                    APPROVE
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                       RESOURCE MANAGER
                              │
                           ENABLE
                              │
                  ┌───────────┼───────────┐
                  │           │           │
               SHELTERS     SUPPLIES   VEHICLES /
                                      EQUIPMENT
```

---

# 35. FINAL AUTHORITY AI FLOW

The Authority panel should visually communicate:

```text
LIVE DATA
    ↓
11 SPECIALIZED AGENTS
    ↓
ANALYSIS
    ↓
RECOMMENDATION
    ↓
RESPONSE PLAN
    ↓
HUMAN APPROVAL
    ↓
EXECUTION
    ↓
MONITOR
    ↓
REPLAN IF CONDITIONS CHANGE
```

The system must communicate that AI is **decision support**, not autonomous command authority.

---

# 36. ACCEPTANCE TEST

Do not consider this task complete until all of these can be demonstrated.

### Citizen

[ ] Login works
[ ] Sign-up works
[ ] Get Help is immediately visible
[ ] Home is simple
[ ] Shelter interface works
[ ] Safe Route interface works
[ ] Alerts work

### Responder

[ ] Login works
[ ] Authorized onboarding works
[ ] Navigation works
[ ] Current mission visible
[ ] Mission status can be updated
[ ] Resource request works
[ ] Alerts work

### Authority / Command

[ ] Home exists
[ ] 3D operational environment works
[ ] Live data updates
[ ] Data refreshes/synchronizes at approximately 5-second intervals where polling is used
[ ] 11-agent pipeline visible
[ ] Agent progress visible
[ ] Intelligence contains real charts/maps
[ ] Evacuation contains operational map/routes/capacity
[ ] Operations contains useful operational visualization
[ ] Human approval popup works
[ ] Allow/Approve calls backend
[ ] Reject calls backend
[ ] Replanning is represented where supported

### Resource Manager

[ ] Font corrected
[ ] Old navigation removed
[ ] Shelter management accessible
[ ] Supply management accessible
[ ] Ambulance management accessible
[ ] Equipment management accessible
[ ] Resource requests accessible

### All Roles

[ ] Fixed primary viewport
[ ] No unnecessary vertical scrolling
[ ] Critical information visible on one screen
[ ] Details available through contextual interactions
[ ] No fake operational data
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Stale-data state
[ ] Offline state
[ ] Correct RBAC
[ ] No privilege escalation
[ ] No broken routes
[ ] No dead buttons
[ ] No console errors

---

# 37. FINAL QUALITY RULE

Do not judge the implementation by how many components have been added.

Judge it by whether a real user can understand:

### Citizen

> **How do I get help or stay safe?**

### Responder

> **What is my mission and what do I do next?**

### Authority / Command

> **What is happening, what are the AI agents recommending, and what requires my approval?**

### Resource Manager

> **Where are resources insufficient and what needs to be supplied?**

If the interface cannot answer these questions immediately, simplify and redesign it.

---

# FINAL INSTRUCTION

Implement these changes directly in the existing Nexus ResQ project.

Do not create a separate prototype.

Do not replace working backend functionality with mocks.

Do not invent the missing three ResQ Pilot agents.

Inspect the actual ResQ Pilot project and use its real 11-agent architecture as the source of truth.

Preserve the Nexus ResQ identity:

**3D. Spatial. Real-time. Human-controlled. Operational.**

The final system must feel like a serious emergency-response operating environment rather than a collection of theoretical dashboards.
