# MASTER BUILD PROMPT — NEXUS RESQ

## ROLE

You are the lead product architect, senior UI/UX designer, frontend engineer, 3D interaction designer and frontend-backend integration engineer responsible for building **Nexus ResQ**.

Do not treat this as a normal website, admin dashboard, emergency reporting form, map application or CRUD project.

Nexus ResQ is an **AI-powered disaster intelligence and emergency response ecosystem** connecting people who need help, responders, rescue organizations, volunteers, emergency authorities, resource coordinators and administrators through a real-time operational platform.

The goal is to create something that feels like a **new category of emergency-response software**, not a redesigned version of an existing disaster dashboard.

---

# 1. SOURCE OF TRUTH

Use the two provided Nexus ResQ requirement documents as the primary source of truth:

1. **Nexus ResQ — Backend Requirements & System Specification**
2. **Nexus ResQ — Frontend Requirements & UX Specification**

The backend specification defines the system capabilities, APIs, roles, data entities, AI services, geospatial services, dispatch, resources, shelters, alerts, WebSockets, security and operational workflows.

The frontend specification defines the 3D-first interaction model, ResQ Sphere, Command Orbit, contextual interfaces, accessibility, performance and frontend architecture.

Do not contradict these requirements.

Where the documents do not explicitly define a visual or UX decision, make an original product decision consistent with the Nexus ResQ concept.

Do not blindly add random features simply to make the application appear larger.

---

# 2. ABSOLUTE DESIGN RULE

## DO NOT RECREATE RESQ PILOT.

The earlier ResQ Pilot project is NOT a design reference.

Do not reuse:

* dashboard structure
* homepage composition
* hero section
* sidebar layout
* navigation style
* card arrangements
* map presentation
* colors
* gradients
* typography hierarchy
* buttons
* icon treatment
* animations
* page transitions
* visual metaphors
* component styling
* information architecture
* interaction patterns
* emergency UI patterns

Even if a component technically works in ResQ Pilot, do not copy its visual or interaction design into Nexus ResQ.

Nexus ResQ must be visually distinguishable from ResQ Pilot **at first glance**.

Do not use external disaster-response products as direct design references either.

Think from first principles.

---

# 3. CORE PRODUCT IDEA

The central concept is:

> **Nexus ResQ is a living emergency-intelligence environment.**

The interface should allow users to:

**Observe → Understand → Decide → Act → Verify**

The system should represent emergency information spatially.

Incidents are not merely rows.

Responders are not merely table entries.

Resources are not merely numbers.

Risk is not merely a percentage.

Time is not merely a timestamp.

Instead:

* incidents become spatial events
* responders become moving operational entities
* risk becomes a changing surface
* shelters become spatial safe nodes
* resources become visible capacity
* evacuation routes become dynamic corridors
* AI predictions become intelligence layers
* time becomes an interactive dimension

---

# 4. VERY IMPORTANT — NEXUS RESQ HAS MULTIPLE EXPERIENCES

Do NOT create one generic dashboard for every user.

The platform must dynamically provide **different interfaces for different communities and roles**.

The interface should feel like a different product depending on who is logged in.

Core experiences:

### A. PUBLIC / HELP SEEKER

For citizens, victims, travelers and people requiring assistance.

### B. RESPONDER

For rescue personnel and field teams.

### C. VOLUNTEER

For approved community volunteers.

### D. DISPATCH / CONTROL ROOM

For people coordinating emergency response.

### E. AUTHORITY

For emergency authorities and organizational leadership.

### F. RESOURCE / RELIEF OPERATOR

For people managing supplies, shelters and logistics.

### G. SYSTEM ADMINISTRATOR

For platform administration, security and system configuration.

### H. ORGANIZATION / COMMUNITY OPERATIONS

For participating NGOs, hospitals, local organizations, shelters and community groups.

Do not expose the same navigation, controls or information density to all roles.

Use RBAC from the backend.

The backend remains authoritative for authorization.

---

# 5. PUBLIC HOME EXPERIENCE

The public homepage must NOT look like an enterprise dashboard.

It should immediately answer:

1. Where am I?
2. Is there danger around me?
3. Can I get help?
4. Where can I go?
5. What should I do?

Design an immersive but calm **Emergency Awareness Home**.

Concept:

### "Your Situation. Your Next Safe Move."

The screen should visually establish the user's surroundings.

Possible structure:

* large spatial/environmental visualization
* current location
* local risk state
* nearby safe locations
* active emergency information
* immediate "GET HELP" action
* "I'M SAFE" / status check where appropriate
* evacuation guidance
* nearby shelter availability
* emergency instructions
* community reports

Do NOT turn this into a card dashboard.

The user should feel that the system is **understanding their surroundings**.

---

# 6. HELP SEEKER EXPERIENCE

The help seeker interface must be radically simpler than operational interfaces.

The most important action is:

## GET HELP

Emergency flow:

1. User activates Get Help.
2. Ask for location permission if required.
3. Determine location accuracy.
4. Ask only essential emergency information.
5. Submit SOS.
6. Persist request through backend.
7. Generate request ID.
8. Show acknowledgement.
9. Show response progress.
10. Provide relevant safety instructions.
11. Show evacuation/shelter information if applicable.
12. Continue receiving real-time status.

The interface must never overwhelm someone who is frightened or under pressure.

Avoid:

* long forms
* unnecessary menus
* complicated maps
* excessive animations
* multiple confirmation steps
* decorative content

The emergency flow must remain usable on a phone with one hand.

---

# 7. HELP SEEKER — AFTER SOS

Create a dedicated **Response Journey** experience.

Instead of showing a conventional status card, visually represent:

### REQUEST RECEIVED

↓

### HELP LOCATING

↓

### RESPONDER ASSIGNED

↓

### RESPONDER EN ROUTE

↓

### ASSISTANCE ARRIVING

↓

### RESOLVED

Show:

* request ID
* current state
* approximate response status
* safety instructions
* location accuracy
* last update
* emergency contact options

Do not expose sensitive operational information.

The user should understand what is happening without needing to understand the backend.

---

# 8. RESPONDER EXPERIENCE

A responder should not see the same interface as the public.

Create a **Field Operations Interface** optimized for:

* speed
* outdoor visibility
* mobile devices
* poor connectivity
* minimal interaction
* current assignment
* navigation
* team coordination

Primary responder screen:

## "MY NEXT ACTION"

Show:

* current assignment
* incident severity
* location
* ETA
* route
* required equipment
* team members
* instructions
* incident notes
* communication
* status control

Responder states:

AVAILABLE
→ ASSIGNED
→ EN ROUTE
→ ON SCENE
→ ASSISTING
→ COMPLETED

Large touch targets.

Minimal interface.

No unnecessary analytics.

---

# 9. RESPONDER 3D EXPERIENCE

Use 3D only where it improves operational awareness.

The responder can see:

* incident position
* team position
* hazard boundary
* safe zones
* blocked/unsafe areas
* evacuation route
* nearby resources

The responder should not have to manipulate a complex 3D scene to perform basic actions.

Provide a simplified 2D fallback.

---

# 10. VOLUNTEER EXPERIENCE

Volunteers are a separate community.

Create a **Community Response interface**.

Volunteer onboarding:

* identity
* location
* skills
* availability
* equipment
* preferred response area
* emergency training/certification if applicable

Volunteer home:

### "HOW CAN I HELP?"

Show suitable tasks:

* supply distribution
* shelter assistance
* community verification
* transportation support
* medical-support roles where appropriately qualified
* information collection
* welfare checks
* logistics support

Never expose sensitive incident information unnecessarily.

Volunteers should receive only tasks appropriate to their authorization, skill and location.

---

# 11. DISPATCH / CONTROL ROOM EXPERIENCE

This is where the full **Command Orbit** concept should become powerful.

Do not create a conventional admin dashboard.

Create a spatial command environment.

Central:

## RESQ SPHERE

Around it:

* active incidents
* responders
* risk zones
* shelters
* resources
* evacuation corridors

The operator can move from:

REGION
→ CITY
→ ZONE
→ INCIDENT

without leaving the spatial environment.

---

# 12. COMMAND ORBIT

Command Orbit should contain:

### CENTER

3D operational environment.

### ORBITAL MODES

OBSERVE
RESPOND
EVACUATE
RESOURCES
INTELLIGENCE

### CONTEXTUAL RIGHT PANEL

Appears only when an entity is selected.

### TEMPORAL COMMAND LINE

At the bottom.

Shows:

* incident creation
* escalation
* responder assignment
* movement
* evacuation changes
* resolution

Do not permanently display dozens of widgets.

The interface should reveal complexity progressively.

---

# 13. INCIDENT INTERACTION

When an operator selects an incident:

The camera should subtly focus on it.

Create a contextual **Incident Capsule**.

Show:

* incident type
* severity
* confidence
* source
* timestamp
* affected population/area
* current response state
* assigned team
* ETA
* required resources
* AI assessment
* recommended next action

Separate:

### CONFIRMED FACTS

from

### AI INTELLIGENCE

Never make AI output appear to be confirmed reality.

---

# 14. AI INTELLIGENCE EXPERIENCE

Create a dedicated intelligence layer.

The AI interface should answer:

### WHAT IS HAPPENING?

### WHY IS IT IMPORTANT?

### WHAT MAY HAPPEN NEXT?

### WHAT SHOULD WE CONSIDER?

Display:

* risk score
* risk category
* confidence
* affected area
* trend
* contributing signals where available
* model/version
* prediction timestamp

Do not use giant meaningless "AI 94%" graphics.

AI must feel analytical and explainable.

---

# 15. SCENARIO MODE

Add a controlled **Scenario Mode** for authorized operators.

It must be visually separate from live operations.

Example:

"What if the current flood zone expands by X?"

The system can visualize:

* predicted affected area
* additional population exposure
* shelter pressure
* responder demand
* resource demand
* alternative evacuation routes

Scenario changes must NEVER modify live operational state.

Clearly label:

## SIMULATION — NOT LIVE

---

# 16. EVACUATION EXPERIENCE

Create a dedicated spatial evacuation interface.

Show:

* current risk surface
* affected zones
* safe zones
* evacuation corridors
* route confidence
* shelter capacity
* alternate routes

If a route becomes unsafe, the interface should communicate:

### ROUTE CHANGED

and explain the safer alternative.

Avoid making the user interpret complicated GIS data.

---

# 17. SHELTER EXPERIENCE

Shelters should be represented as operational entities.

Show:

* location
* available capacity
* occupancy
* accessibility
* facilities
* current status
* last update
* estimated arrival time

For the public:

"Can I safely reach this shelter?"

For authorities:

"How much capacity remains?"

For resource operators:

"What supplies does this shelter require?"

Same backend entity.

Different interface.

---

# 18. RESOURCE EXPERIENCE

Create a logistics-focused interface.

Resources include:

* medical supplies
* food
* water
* vehicles
* equipment
* personnel
* shelter capacity

Visualize:

SUPPLY
→ DEMAND
→ ALLOCATION
→ MOVEMENT

Allow authorized users to:

* inspect
* reserve
* allocate
* release

Show:

* current quantity
* location
* demand pressure
* allocated quantity
* low-stock state
* last synchronization

Never represent stale information as live.

---

# 19. AUTHORITY EXPERIENCE

Authority users need strategic awareness.

Create an interface focused on:

* regional risk
* active emergencies
* affected population
* response capacity
* evacuation status
* shelter pressure
* resource shortages
* response performance
* trends

But still preserve the Nexus ResQ spatial design language.

Avoid returning to a traditional KPI-card dashboard.

---

# 20. SYSTEM ADMIN EXPERIENCE

System administrators can use a more conventional interface because operational administration is different from emergency response.

Admin functions:

* users
* roles
* organizations
* permissions
* integrations
* system health
* audit logs
* model versions
* configuration
* security events

However, use the same Nexus ResQ visual system.

---

# 21. ORGANIZATION / COMMUNITY INTERFACE

Nexus ResQ should support multiple participating communities.

Examples:

* NGOs
* hospitals
* rescue organizations
* shelters
* volunteer groups
* local authorities
* community organizations

Organizations should have:

### ORGANIZATION HOME

Show:

* current assignments
* members
* active operations
* resources
* shelters
* response areas
* incoming requests
* organization alerts

Organization boundaries must be enforced by backend authorization.

---

# 22. ROLE-AWARE NAVIGATION

Do not hard-code one navigation menu.

Navigation should depend on role.

Example:

PUBLIC:

Home
Get Help
Safety
Shelters
Reports
Profile

RESPONDER:

My Mission
Nearby Incidents
Team
Navigation
Resources
Alerts

VOLUNTEER:

Help
Assignments
Availability
Community
Safety
Profile

DISPATCHER:

Command
Incidents
Response
Evacuation
Resources
Alerts

AUTHORITY:

Command
Intelligence
Evacuation
Resources
Reports
Operations

ADMIN:

Operations
Users
Organizations
Security
Integrations
Audit

---

# 23. HOME PAGE PHILOSOPHY

Every role must have a different "home".

Do NOT create:

Dashboard.jsx

and dump everything into it.

Instead create role-specific entry experiences.

Examples:

Public:

### "YOUR SAFE NEXT MOVE"

Responder:

### "YOUR NEXT MISSION"

Volunteer:

### "WHERE YOU CAN HELP"

Dispatcher:

### "WHAT NEEDS ACTION NOW"

Authority:

### "WHAT IS CHANGING"

Resource Operator:

### "WHERE CAPACITY IS FAILING"

Admin:

### "IS THE SYSTEM HEALTHY"

These should feel like different experiences inside one ecosystem.

---

# 24. VISUAL SYSTEM

Create a custom Nexus ResQ design system.

Use:

* depth
* spatial layering
* controlled translucency
* physical lighting
* shadows
* subtle reflections
* dimensional objects
* restrained color
* strong typography
* deliberate motion

Do NOT create:

* generic glassmorphism
* neon cyberpunk UI
* generic blue AI dashboard
* excessive glowing borders
* excessive gradients
* template-like rounded cards
* decorative 3D blobs

The 3D design must have operational meaning.

---

# 25. 3D TECHNICAL DIRECTION

Recommended:

React
TypeScript
Vite
Three.js
React Three Fiber
Drei
TanStack Query
Zustand
React Hook Form
Zod
Motion/Framer Motion

The 3D layer must be modular.

Create:

ResQSphere
SceneControls
IncidentNode
ResponderNode
ShelterNode
ResourceNode
RiskSurface
EvacuationRoute
SpatialTooltip
ContextPanel

Use LOD/instancing where necessary.

Do not render thousands of unnecessary DOM elements.

---

# 26. BACKEND INTEGRATION

The frontend must integrate with the actual Nexus ResQ backend.

Backend source of truth includes:

PostgreSQL/PostGIS
FastAPI
REST APIs
WebSockets
Redis
AI inference services
geospatial services
external hazard/weather services

Important APIs include:

/api/v1/auth/*
/api/v1/users/*
/api/v1/incidents/*
/api/v1/sos/*
/api/v1/locations/*
/api/v1/hazards/*
/api/v1/ai/*
/api/v1/evacuation/*
/api/v1/shelters/*
/api/v1/dispatch/*
/api/v1/resources/*
/api/v1/alerts/*
/api/v1/reports/*
/api/v1/volunteers/*
/api/v1/admin/*

Do not create frontend-only business logic that contradicts backend behavior.

---

# 27. REAL-TIME SYSTEM

Implement real-time updates for:

* incidents
* SOS
* responders
* assignments
* alerts
* resources
* shelter capacity
* evacuation changes

Connection states must be visible:

LIVE
RECONNECTING
OFFLINE
STALE

After reconnect:

1. reconnect WebSocket
2. resynchronize server state
3. reconcile missed events
4. update UI

Do not simply refresh the entire page.

---

# 28. DATA STATES

Every API-driven feature must have:

LOADING
SUCCESS
EMPTY
ERROR
STALE
OFFLINE

Do not hide failures.

Never silently display fake data when the backend fails.

No mock emergency statistics.

No fake responders.

No fake incidents.

No fake shelter capacities.

No hard-coded operational values.

---

# 29. EMERGENCY-FIRST UX RULE

When a genuine emergency action exists:

The user must never have to:

open menu
→ find page
→ open card
→ find button
→ submit form

Critical actions must be reachable immediately.

---

# 30. MOBILE STRATEGY

Do NOT shrink the desktop interface.

Design separate mobile experiences.

Public mobile:

GET HELP
LOCATION
SAFETY
SHELTERS
STATUS

Responder mobile:

MISSION
NAVIGATE
STATUS
TEAM
ALERT

Volunteer mobile:

TASK
LOCATION
CHECK-IN
SAFETY

Desktop can contain the full 3D environment.

Mobile may use a simplified spatial/2D hybrid.

---

# 31. 2D FALLBACK

3D is fundamental to the identity of Nexus ResQ.

However:

If WebGL is unavailable,
device performance is poor,
accessibility requires it,
or reduced-motion is enabled,

provide a functional 2D experience.

The application must remain fully usable.

---

# 32. ACCESSIBILITY

Implement:

* keyboard navigation
* visible focus states
* semantic HTML
* ARIA labels
* readable emergency information
* color-independent severity
* reduced motion
* adequate contrast
* 2D fallback
* accessible emergency actions

Do not allow 3D to become an accessibility barrier.

---

# 33. PERFORMANCE

Prioritize:

* fast first meaningful render
* lazy-loaded 3D assets
* instancing
* LOD
* throttled location updates
* optimized WebSocket events
* efficient state updates
* code splitting
* asset compression

Measure:

FPS
3D load time
API latency
WebSocket processing
interaction latency

Emergency actions must remain responsive even when the scene is busy.

---

# 34. SECURITY

Frontend must respect backend RBAC.

Never expose:

* unauthorized incidents
* private citizen locations
* sensitive responder data
* admin operations
* restricted organization data

Frontend restrictions are supplementary.

Backend authorization remains authoritative.

---

# 35. FILE ARCHITECTURE

Use a scalable structure:

src/
app/
components/
3d/
ui/
operations/
features/
auth/
incidents/
sos/
response/
evacuation/
resources/
intelligence/
shelters/
volunteers/
reports/
pages/
api/
realtime/
store/
hooks/
types/
utils/
styles/
assets/

Do not create a huge monolithic App.jsx.

Keep domain functionality modular.

---

# 36. ROUTES

Implement:

/

/public or equivalent role-aware public entry

/incidents
/incidents/:id

/response

/evacuation

/resources

/intelligence

/reports

/volunteers

/shelters

/operations

/profile

/help

Additional role-specific routes may be introduced where justified.

---

# 37. AUTHENTICATION FLOW

Implement:

Registration
Login
Logout
Refresh token
Session restoration
Role detection
Protected routes
Permission-aware UI
Unauthorized state
Account/profile

After authentication:

Determine the user's role and organization.

Route the user into the correct home experience.

Do not show an admin dashboard to a citizen.

Do not show citizen-only UI to an authority.

---

# 38. ERROR HANDLING

Design errors as part of the product.

Examples:

GPS unavailable:
"Location unavailable — choose your location manually."

WebSocket disconnected:
"Live connection interrupted — showing last synchronized information."

AI unavailable:
"Risk intelligence temporarily unavailable. Confirmed operational data remains available."

Map/routing unavailable:
"Route service unavailable — use the displayed safe-zone information."

Backend unavailable:
"Unable to synchronize. Retry."

Do not show raw stack traces to users.

---

# 39. CRITICAL END-TO-END USER JOURNEYS

Fully implement and test these journeys.

### JOURNEY 1 — HELP SEEKER

Open Nexus ResQ
→ determine location
→ detect local situation
→ Get Help
→ submit SOS
→ acknowledgement
→ responder assigned
→ real-time response progress
→ assistance
→ resolution

### JOURNEY 2 — RESPONDER

Login
→ responder home
→ receive assignment
→ inspect incident
→ accept
→ navigate
→ en route
→ on scene
→ assist
→ complete

### JOURNEY 3 — DISPATCHER

Login
→ Command Orbit
→ new SOS appears
→ incident intelligence
→ assess severity
→ view nearby responders
→ select suitable team
→ dispatch
→ monitor
→ reassign/escalate if needed
→ resolve

### JOURNEY 4 — EVACUATION

Risk increases
→ affected zone detected
→ AI prediction
→ evacuation recommendation
→ safe routes calculated
→ shelters checked
→ alert issued
→ public sees safe next move
→ authorities monitor evacuation

### JOURNEY 5 — RESOURCE RESPONSE

Incident detected
→ resource demand predicted
→ nearby inventory identified
→ resource allocation
→ transport/assignment
→ delivery
→ inventory updated

---

# 40. DO NOT OVER-DESIGN

A visually impressive interface is useless if operators cannot understand it.

Follow:

## CLARITY > DECORATION

## SPEED > ANIMATION

## INFORMATION HIERARCHY > MORE COMPONENTS

## REAL DATA > VISUAL MOCKS

## EXPLAINABILITY > AI HYPE

## SAFETY > VISUAL EXPERIMENTATION

---

# 41. BUILD QUALITY REQUIREMENTS

Before considering the frontend complete:

* no broken routes
* no console errors
* no failed imports
* no missing assets
* no placeholder text
* no fake production data
* no dead buttons
* no decorative controls that do nothing
* no broken forms
* no unhandled API failures
* no incorrect role access
* no impossible navigation
* no loading-state gaps
* no WebSocket duplication
* no visual jumps
* no inaccessible emergency controls

Every button must have a real purpose.

Every major interaction must have a state transition.

---

# 42. DEVELOPMENT METHOD

Do NOT build the entire application as one giant pass.

Build in phases.

### PHASE 1

Design system
Authentication
Role detection
Application shell
Public home
Help seeker flow

### PHASE 2

Responder experience
Volunteer experience
Organization experience

### PHASE 3

Command Orbit
ResQ Sphere
Incident spatial interaction

### PHASE 4

Dispatch
Evacuation
Shelters
Resources

### PHASE 5

AI Intelligence
Scenario Mode
Advanced visualization

### PHASE 6

Real-time synchronization
Performance optimization
Accessibility
Security hardening
Testing

At every phase, integrate with the backend rather than creating temporary fake infrastructure.

---

# 43. FINAL PRODUCT TEST

Before finishing, ask:

### If I am a person needing help:

Can I understand what to do in under a few seconds?

### If I am a responder:

Can I immediately understand my next mission?

### If I am a dispatcher:

Can I identify what needs action right now?

### If I am an authority:

Can I understand how the situation is changing?

### If I am a volunteer:

Can I understand where I can safely contribute?

### If I manage resources:

Can I see where shortages are emerging?

### If I am a system administrator:

Can I determine whether the platform is healthy?

### If the 3D scene disappears:

Can the emergency operation still continue?

If the answer to any of these is no, redesign the relevant flow.

---

# 44. MOST IMPORTANT CREATIVE DIRECTION

Do not think:

"How can I make a disaster dashboard look futuristic?"

Think:

"How would I design an entirely new digital operating environment if emergency response had never been represented as dashboards before?"

Build Nexus ResQ around that question.

The result should feel:

**Spatial.**
**Intelligent.**
**Human.**
**Operational.**
**Real-time.**
**Trustworthy.**
**Calm under pressure.**
**Technically advanced.**
**Visually unforgettable.**

But never confusing.

---

# FINAL COMMAND

Build Nexus ResQ as a complete, production-quality frontend ecosystem with **role-specific experiences**, a **3D-first spatial operating environment**, a dramatically simplified **help-seeker experience**, specialized **responder/volunteer/dispatcher/authority/resource/admin interfaces**, and real integration with the specified backend architecture.

Do not build another dashboard.

Build **Nexus ResQ**.
