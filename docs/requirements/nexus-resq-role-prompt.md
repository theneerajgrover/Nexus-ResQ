# NEXUS RESQ — ROLE SIMPLIFICATION & RBAC RESTRUCTURING PROMPT

## OBJECTIVE

Update the existing **Nexus ResQ** project so that the entire platform uses **exactly four core operational roles**.

The old role structure must NOT remain partially implemented anywhere in the system.

The final role model must be:

| Role                        | Responsibilities                                                                |
| --------------------------- | ------------------------------------------------------------------------------- |
| 👤 **Citizen**              | Report emergencies, receive alerts, view shelters and evacuation routes         |
| 🚑 **Responder**            | Receive/accept missions, update mission status, request resources               |
| 🏛️ **Authority / Command** | Monitor disasters, view AI recommendations, approve evacuation, assign missions |
| 📦 **Resource Manager**     | Manage shelters, supplies, ambulances and rescue resources                      |

These four roles are the **only operational roles in Nexus ResQ**.

---

# 1. FIRST — INSPECT THE EXISTING PROJECT

Before modifying anything:

1. Inspect the complete repository.
2. Identify the current authentication system.
3. Identify all existing roles.
4. Find every RBAC implementation.
5. Find role-related database models/enums.
6. Find role-based frontend routes.
7. Find role-based navigation.
8. Find role-based dashboards/home pages.
9. Find permission checks.
10. Find middleware/dependencies enforcing roles.
11. Find seed/default users and role assignments.
12. Find API endpoints restricted by role.
13. Find frontend components conditionally rendered by role.
14. Find documentation referring to old roles.

Do not start blindly editing files.

First understand how roles currently flow through:

```text
Authentication
      ↓
User
      ↓
Role
      ↓
Permissions
      ↓
Backend Authorization
      ↓
API
      ↓
Frontend Route
      ↓
Role-Specific Interface
```

---

# 2. FINAL ROLE MODEL

The final system must contain ONLY:

```text
CITIZEN
RESPONDER
AUTHORITY_COMMAND
RESOURCE_MANAGER
```

Use consistent naming throughout the application.

Prefer a canonical backend representation such as:

```text
citizen
responder
authority_command
resource_manager
```

Do not create additional operational roles to solve individual permissions.

---

# 3. REMOVE OLD ROLES

Find all existing roles from the current implementation.

Remove obsolete roles such as separate:

* Dispatcher
* Authority
* Volunteer
* Organization
* Admin
* Shelter Operator
* NGO Operator
* Community Operator
* Resource Operator
* Any other operational role

unless an existing role is already functionally equivalent to one of the four final roles.

Do not leave obsolete roles in:

* database enums
* models
* schemas
* seed scripts
* JWT claims
* authentication responses
* middleware
* route guards
* frontend navigation
* frontend pages
* TypeScript types
* constants
* documentation
* test fixtures
* demo accounts

---

# 4. ROLE MAPPING

If existing functionality belongs to an old role, map it into the closest core role.

Use this logic:

### Old Dispatcher functionality

→ **Authority / Command**

Because Authority / Command is responsible for:

* monitoring incidents
* assigning missions
* coordinating responders
* approving evacuation
* viewing operational intelligence

---

### Old Volunteer functionality

Do NOT retain Volunteer as a separate role.

If volunteer-style capabilities are required, map them to:

→ **Responder**

only where the functionality represents actual response activity.

Do not create a fifth role.

---

### Old Shelter Operator functionality

→ **Resource Manager**

---

### Old NGO / Organization Operator functionality

Map the actual operational responsibility to:

→ **Authority / Command**

or

→ **Resource Manager**

depending on what the functionality actually does.

Do not preserve the organization role merely because it existed previously.

---

### Old System Admin functionality

Do NOT expose a fifth operational role.

If administrative functionality is technically required for development or infrastructure management, keep it as a **non-operational platform-level mechanism only if the existing architecture absolutely requires it**.

Do not present it as a Nexus ResQ user role.

Do not create an Admin dashboard.

Do not create an Admin option in user role selection.

The product's operational role model remains exactly four roles.

If the existing project can function without a separate system-admin role, remove it completely.

---

# 5. CITIZEN EXPERIENCE

Citizen is the public emergency-facing experience.

Citizen capabilities:

### Emergency

* Report emergency
* Submit SOS/request for help
* Share location
* View request status
* Receive emergency alerts

### Safety

* View nearby shelters
* View evacuation routes
* View affected/risk areas
* View relevant safety instructions

### Information

* View public incident information where authorized
* Receive location-relevant alerts

### Profile

* Manage personal information
* Manage notification preferences
* Manage location permissions

Citizen must NOT have access to:

* dispatch controls
* responder management
* resource allocation
* mission assignment
* AI command controls
* administrative controls
* private responder information
* sensitive operational data

---

# 6. RESPONDER EXPERIENCE

Responder is the field-response role.

Responder capabilities:

### Missions

* View assigned missions
* Accept missions
* Reject/decline where supported
* View incident details
* Update mission status
* Mark arrival
* Mark completion

### Navigation

* View incident location
* View operational route
* View safe routes
* View relevant hazards

### Team

* View authorized team information
* Receive operational updates

### Resources

* Request required resources
* View available resources relevant to the mission

Responder must NOT be able to:

* assign missions to other responders
* approve evacuation
* modify global incident priority
* manage all shelters
* manage global inventory
* access system administration

---

# 7. AUTHORITY / COMMAND EXPERIENCE

Authority / Command is the central operational decision-making role.

This role absorbs the previous Dispatcher + Authority operational responsibilities.

Capabilities:

### Incident Monitoring

* View active incidents
* Monitor incident severity
* View incident locations
* Monitor response status
* Review incident history

### Command

* Assign missions
* Assign responders
* Reassign missions
* Escalate incidents
* Coordinate response

### AI Intelligence

* View AI risk predictions
* View incident prioritization
* View AI recommendations
* Review confidence/context
* Inspect affected areas

### Evacuation

* Review evacuation recommendations
* Approve evacuation operations
* Monitor evacuation
* Review routes and shelters

### Operational Intelligence

* View regional risk
* View active emergencies
* Monitor responder availability
* Monitor resource pressure
* Monitor shelter capacity

Authority / Command is the primary operational command interface.

---

# 8. RESOURCE MANAGER EXPERIENCE

Resource Manager is responsible for physical response capacity.

Capabilities:

### Shelters

* Create/manage shelters
* Update capacity
* Update occupancy
* Update availability
* Maintain shelter information

### Supplies

* Manage inventory
* Update quantities
* Track shortages
* Allocate supplies

### Ambulances

* Manage ambulance availability
* Track operational status
* Track assignment where supported

### Rescue Resources

* Manage rescue equipment
* Track availability
* Track allocation

### Resource Requests

* Receive responder resource requests
* Review requests
* Approve/allocate resources where authorized
* Update allocation state

Resource Manager must NOT:

* approve evacuations
* assign responder missions
* change command decisions
* access citizen private information unnecessarily

---

# 9. ROLE-SPECIFIC HOME PAGES

Do NOT create one universal dashboard.

Each role must have its own home experience.

### CITIZEN

Home concept:

> **YOUR NEXT SAFE MOVE**

Primary actions:

```text
GET HELP
VIEW ALERTS
FIND SHELTER
VIEW SAFE ROUTE
```

---

### RESPONDER

Home concept:

> **YOUR NEXT MISSION**

Primary information:

```text
CURRENT MISSION
MISSION STATUS
NAVIGATION
REQUEST RESOURCE
ALERTS
```

---

### AUTHORITY / COMMAND

Home concept:

> **WHAT NEEDS ACTION NOW**

Primary information:

```text
ACTIVE INCIDENTS
RISK INTELLIGENCE
RESPONDER AVAILABILITY
EVACUATION
RESOURCE PRESSURE
COMMAND ACTIONS
```

This is where the full **Command Orbit / ResQ Sphere** experience should primarily exist.

---

### RESOURCE MANAGER

Home concept:

> **WHERE CAPACITY IS FAILING**

Primary information:

```text
SHELTERS
SUPPLIES
AMBULANCES
RESCUE EQUIPMENT
RESOURCE REQUESTS
SHORTAGES
```

Do not turn this into a generic inventory dashboard.

---

# 10. FRONTEND ROUTING

Review every existing route.

Remove routes that only exist for obsolete roles.

Create role-aware routing such as:

```text
/login
/register

/citizen
/citizen/help
/citizen/alerts
/citizen/shelters
/citizen/routes

/responder
/responder/missions
/responder/missions/:id
/responder/resources
/responder/alerts

/command
/command/incidents
/command/intelligence
/command/evacuation
/command/dispatch

/resources
/resources/shelters
/resources/supplies
/resources/ambulances
/resources/equipment
/resources/requests
```

Exact routing may be adapted to the existing architecture.

Do not duplicate functionality unnecessarily.

---

# 11. AUTHENTICATION

After login:

```text
Authenticate
     ↓
Retrieve user
     ↓
Read role
     ↓
Determine authorized experience
     ↓
Redirect to role-specific home
```

Expected behavior:

```text
citizen
    → /citizen

responder
    → /responder

authority_command
    → /command

resource_manager
    → /resources
```

A user must never be able to access another role's protected interface simply by manually entering its URL.

---

# 12. FRONTEND RBAC

Frontend role checks are for UX.

They must NOT be considered security.

Example:

```text
if role === "citizen"
    show Citizen interface

if role === "responder"
    show Responder interface

if role === "authority_command"
    show Command interface

if role === "resource_manager"
    show Resource Manager interface
```

But every sensitive API operation must also be protected by backend authorization.

---

# 13. BACKEND RBAC

Update backend authorization to support exactly these four operational roles.

Use role dependencies/middleware consistently.

Example conceptual permissions:

```text
CITIZEN
- create SOS
- create reports
- view public alerts
- view shelters
- view evacuation information

RESPONDER
- view assigned missions
- update mission status
- request resources
- view authorized incident information

AUTHORITY_COMMAND
- view incidents
- assign missions
- dispatch responders
- view AI intelligence
- approve evacuation
- monitor operations

RESOURCE_MANAGER
- manage shelters
- manage supplies
- manage ambulances
- manage rescue equipment
- process resource requests
```

Do not rely on frontend restrictions.

---

# 14. DATABASE

Inspect the current user/role schema.

If roles are stored as an enum:

Update the enum to the four final roles.

If roles are stored in a table:

Remove obsolete operational roles and migrate users appropriately.

Do NOT simply rename labels in the frontend while leaving obsolete database roles behind.

The database must represent the final architecture.

---

# 15. JWT / SESSION DATA

Inspect authentication tokens and user/session responses.

The role returned by authentication must use the final role values.

Example:

```json
{
  "id": "...",
  "role": "authority_command"
}
```

Do not return obsolete roles.

Do not maintain compatibility aliases unless required during a controlled database migration.

---

# 16. USER REGISTRATION

Role selection must NOT expose every internal role.

Citizen registration should be straightforward.

Operational roles such as:

* Responder
* Authority / Command
* Resource Manager

should NOT automatically be self-assigned by an ordinary public registration flow unless the existing backend explicitly supports verified role onboarding.

Do not allow a user to simply choose:

```text
Authority / Command
```

and gain command privileges.

Role assignment must be controlled by the backend.

---

# 17. UI NAVIGATION

Each role receives only the navigation relevant to its responsibilities.

### Citizen

```text
Home
Get Help
Alerts
Shelters
Safe Routes
Profile
```

### Responder

```text
Mission
Incidents
Navigation
Resources
Alerts
Profile
```

### Authority / Command

```text
Command
Incidents
Intelligence
Dispatch
Evacuation
Operations
Profile
```

### Resource Manager

```text
Overview
Shelters
Supplies
Ambulances
Rescue Resources
Requests
Profile
```

Do not show irrelevant menu items.

---

# 18. 3D EXPERIENCE

The 3D spatial design remains part of Nexus ResQ.

However, do not force the same 3D complexity onto every role.

### Authority / Command

Full:

* ResQ Sphere
* Command Orbit
* Incident nodes
* Responder nodes
* Risk surfaces
* Evacuation corridors
* Resource/shelter layers

### Responder

Simplified spatial interface focused on:

* Current mission
* Route
* Incident
* Hazards
* Safe areas

### Citizen

Minimal spatial visualization:

* Current location
* Risk
* Safe routes
* Shelters

### Resource Manager

Spatial view where useful:

* Shelter locations
* Resource locations
* Ambulance positions
* Demand zones

Use 3D only where it improves understanding.

---

# 19. NO GENERIC DASHBOARD

Do not implement:

```text
Dashboard
  ├── 10 cards
  ├── graph
  ├── map
  ├── recent activity
  └── table
```

as the default pattern for every role.

The four experiences must have different information architecture.

---

# 20. DATA VISIBILITY

Use least-privilege access.

Citizen:

```text
Public / personal information
```

Responder:

```text
Mission-relevant information
```

Authority / Command:

```text
Operational intelligence
```

Resource Manager:

```text
Resource and shelter operations
```

Never expose unnecessary personal location or sensitive emergency information.

---

# 21. API PERMISSION MATRIX

Create and maintain a clear permission matrix.

Example:

| Capability              | Citizen |        Responder | Authority |  Resource Manager |
| ----------------------- | ------: | ---------------: | --------: | ----------------: |
| Submit SOS              |       ✅ |  ❌/as applicable |         ❌ |                 ❌ |
| Report incident         |       ✅ |                ✅ |         ✅ |                 ❌ |
| View public alerts      |       ✅ |                ✅ |         ✅ |                 ✅ |
| View assigned mission   |       ❌ |                ✅ |         ✅ |                 ❌ |
| Accept mission          |       ❌ |                ✅ |         ❌ |                 ❌ |
| Update mission status   |       ❌ |                ✅ |         ✅ |                 ❌ |
| Assign mission          |       ❌ |                ❌ |         ✅ |                 ❌ |
| View AI recommendations | Limited | Mission-specific |         ✅ | Resource-specific |
| Approve evacuation      |       ❌ |                ❌ |         ✅ |                 ❌ |
| Manage shelters         |    View |             View |   Monitor |                 ✅ |
| Manage supplies         |       ❌ |          Request |   Monitor |                 ✅ |
| Manage ambulances       |       ❌ |          Request |   Monitor |                 ✅ |
| Manage rescue resources |       ❌ |          Request |   Monitor |                 ✅ |

Adjust individual permissions according to the actual backend implementation.

Do not invent permissions that the backend cannot support.

---

# 22. MIGRATION REQUIREMENT

If existing users or seed data use old roles:

Create a controlled migration.

Example conceptual mapping:

```text
Dispatcher
    → authority_command

Authority
    → authority_command

Volunteer
    → responder

Shelter Operator
    → resource_manager

Resource Operator
    → resource_manager
```

For roles that cannot be safely mapped automatically:

DO NOT silently assign privileges.

Flag them for manual review or require explicit reassignment.

---

# 23. TESTING

Update all tests.

Test:

### Authentication

* valid role login
* invalid role rejection
* role persistence
* session restoration

### Authorization

Citizen cannot access command APIs.

Responder cannot assign missions.

Responder cannot approve evacuation.

Resource Manager cannot approve evacuation.

Authority cannot arbitrarily modify resource inventory unless explicitly authorized.

### Routing

Citizen → Citizen home.

Responder → Responder home.

Authority → Command home.

Resource Manager → Resource Manager home.

### API

Every protected endpoint must have role authorization tests.

---

# 24. SEARCH FOR OLD ROLES AFTER IMPLEMENTATION

After making changes, perform a repository-wide search for every old role.

Search terms should include:

```text
dispatcher
authority
volunteer
organization
ngo
admin
shelter_operator
resource_operator
community
```

Review every result.

Do not blindly delete legitimate words such as "administration" if they refer to infrastructure rather than a user role.

The goal is to ensure no obsolete **role logic** remains.

---

# 25. DOCUMENTATION

Update:

* README
* API documentation
* authentication documentation
* frontend documentation
* architecture documentation
* database documentation
* setup instructions
* sample users
* environment documentation

The final documentation must describe only the four operational roles.

---

# 26. DO NOT BREAK EXISTING FUNCTIONALITY

This is a restructuring task, not permission to rewrite the entire project.

Preserve:

* existing working APIs
* database relationships
* UI design system
* 3D architecture
* authentication mechanism
* real-time functionality
* AI services
* geospatial functionality
* emergency workflows

Only change what is required to consolidate the role model.

If an existing feature belonged to an obsolete role, map it to the appropriate core role instead of deleting useful functionality unnecessarily.

---

# 27. NO MOCK DATA

Do not introduce mock operational data to make the new role dashboards appear populated.

Use the existing backend/database.

If data does not exist:

Show a proper empty state.

Example:

> No active missions

not:

> Mission #104 — Flood Rescue — 12:45 PM

unless that data actually exists.

---

# 28. FINAL ACCEPTANCE CRITERIA

The restructuring is complete only when all of the following are true:

### Roles

```text
Citizen
Responder
Authority / Command
Resource Manager
```

are the only operational roles.

### Authentication

Every authenticated user receives exactly one valid operational role.

### Routing

Every role reaches its correct home.

### Authorization

Backend APIs enforce the role model.

### Frontend

Each role has a distinct interface.

### Command

Authority / Command contains dispatch + command + AI + evacuation responsibilities.

### Resources

Resource Manager contains shelters + supplies + ambulances + rescue resources.

### Response

Responder contains missions + mission status + resource requests.

### Public

Citizen contains emergency reporting + alerts + shelters + routes.

### Security

Users cannot escalate their privileges through frontend manipulation or direct API requests.

### Legacy

No obsolete operational role remains in active RBAC logic.

### Quality

No broken routes, imports, buttons, APIs, or role-specific workflows are introduced.

---

# FINAL PRODUCT MODEL

The final Nexus ResQ architecture should conceptually become:

```text
                         NEXUS RESQ
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
       CITIZEN            RESPONDER        AUTHORITY / COMMAND
          │                   │                   │
      REPORT            EXECUTE MISSION       DECIDE
      REQUEST            UPDATE STATUS        DISPATCH
      RECEIVE            REQUEST RESOURCE     EVACUATE
      FIND SAFETY                              ANALYZE
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                       RESOURCE MANAGER
                              │
                         ENABLE RESPONSE
                              │
                  ┌───────────┼───────────┐
                  │           │           │
               SHELTERS     SUPPLIES   VEHICLES/
                                      EQUIPMENT
```

This is the final role architecture.

Do not add a fifth operational role.

Do not preserve old roles merely for compatibility.

Do not create separate dashboards for old role names.

Do not duplicate command functionality across multiple roles.

Keep the system simple:

> **Citizen reports.**
>
> **Responder acts.**
>
> **Authority / Command decides.**
>
> **Resource Manager enables the response.**

Implement this architecture consistently across the **database, backend, authentication, authorization, APIs, frontend routes, navigation, interfaces, UI permissions, tests and documentation**.
