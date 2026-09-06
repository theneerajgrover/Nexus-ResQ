NEXUS RESQ — RESOURCE MANAGER NAVIGATION CONSOLIDATION ONLY
⚠️ CRITICAL — READ EVERYTHING BEFORE MODIFYING THE PROJECT

This is a strictly scoped correction to the existing Resource Manager navigation and routing structure.

The Resource Manager already contains functionality that is working.

DO NOT redesign it.

DO NOT rebuild it.

DO NOT change its UI design.

DO NOT change its animations.

DO NOT change its colors.

DO NOT change its typography except where explicitly required by a previous task.

DO NOT change its cards, panels, layouts, interactions, 3D elements, data visualization, API behavior, authentication, database structure, or unrelated functionality.

The ONLY purpose of this task is:

Remove the duplicated Resource Manager navigation structure and consolidate the existing Resource Manager destinations into one correct navigation system without breaking any existing functionality.

1. CURRENT PROBLEM

The current Resource Manager interface has duplicated navigation.

The screenshot clearly shows:

TOP NAVIGATION
RESOURCE MANAGER

OVERVIEW
SHELTERS
SUPPLIES
AMBULANCES
EQUIPMENT
REQUESTS

and immediately below it another navigation layer containing:

OVERVIEW
SHELTERS
SUPPLIES
AMBULANCES
EQUIPMENT
REQUESTS

Therefore the same destinations are being represented twice.

This creates:

duplicate controls
unnecessary navigation
confusing active states
inconsistent routing behavior
unnecessary UI repetition

This must be corrected.

2. REQUIRED FINAL NAVIGATION

The Resource Manager must have ONE navigation system only.

The final functional destinations must be:

OVERVIEW
SHELTERS
SUPPLIES
AMBULANCES
EQUIPMENT
REQUESTS

Each destination must appear exactly once.

There must NOT be:

OVERVIEW
OVERVIEW

SHELTERS
SHELTERS

SUPPLIES
SUPPLIES

AMBULANCES
AMBULANCES

EQUIPMENT
EQUIPMENT

REQUESTS
REQUESTS

There must be only one of each.

3. VERY IMPORTANT — DO NOT DELETE THE FUNCTIONAL SECTIONS

When I say "remove the duplicate navigation", I do NOT mean:

delete Overview, Shelters, Supplies, Ambulances, Equipment or Requests functionality.

The functionality must remain available.

Only the duplicate navigation representation must be removed.

The final Resource Manager should still provide access to:

Overview
Shelters
Supplies
Ambulances
Equipment
Requests

through one unified navigation.

4. INSPECT BEFORE MODIFYING

Before making any changes, inspect the existing project and identify:

Resource Manager layout
Resource Manager navbar
Resource Manager secondary navigation
Resource Manager routes
Resource Manager page components
Resource Manager navigation state
Resource Manager active-state logic
Resource Manager API integrations

Determine which component is responsible for:

Navigation Layer 1

and which component is responsible for:

Navigation Layer 2

Do not start deleting components without understanding their purpose.

5. DETERMINE WHICH NAVIGATION IS DUPLICATED

Inspect the current implementation and determine whether:

Top Navigation

and

Secondary Navigation

are pointing to the same routes/components.

If they are duplicates:

consolidate them.

Do not maintain two independent navigation systems for the same six destinations.

6. SINGLE NAVIGATION ARCHITECTURE

The final structure should conceptually be:

┌────────────────────────────────────────────────────────────────────┐
│ NEXUS RESQ     RESOURCE MANAGER                                   │
│                                                                    │
│ OVERVIEW   SHELTERS   SUPPLIES   AMBULANCES   EQUIPMENT   REQUESTS │
└────────────────────────────────────────────────────────────────────┘

The exact visual implementation must follow the existing Nexus ResQ design.

Do not redesign this header.

Do not invent a new navigation style.

Do not change the visual identity.

7. PRESERVE THE EXISTING RESOURCE MANAGER DESIGN

The following must remain unchanged unless technically required only to remove the duplicate navigation:

dark theme
green Resource Manager accent
purple Requests state
typography
cards
borders
spacing
grid
background
animations
hover effects
active states
status indicators
LIVE indicator
EXIT button
resource request cards
APPROVE button
DECLINE button
ALLOCATED status
existing transitions
existing responsive behavior

This task is about navigation architecture, not visual redesign.

8. OVERVIEW

There must be exactly one:

OVERVIEW

navigation destination.

It must open the existing Resource Manager Overview implementation.

Do NOT create another Overview page.

Do NOT create another Overview component.

Do NOT replace existing Overview data.

Do NOT introduce demo data.

9. SHELTERS

There must be exactly one:

SHELTERS

navigation destination.

It must open the existing Shelter implementation.

Preserve:

existing UI
existing APIs
existing database data
existing functionality
existing interactions

Do not create a duplicate Shelter page.

10. SUPPLIES

There must be exactly one:

SUPPLIES

navigation destination.

Use the existing Supplies implementation.

Do not recreate the page.

Do not duplicate its API calls.

Do not introduce mock inventory.

Do not hard-code supply quantities.

11. AMBULANCES

There must be exactly one:

AMBULANCES

navigation destination.

Use the existing Ambulance implementation.

Do not create fake ambulance records.

Do not change ambulance APIs.

Do not modify backend ambulance logic.

Only ensure the single navigation destination points to the correct existing implementation.

12. EQUIPMENT

There must be exactly one:

EQUIPMENT

navigation destination.

Use the existing Equipment implementation.

Do not create a second Equipment interface.

Do not introduce static equipment data.

Do not change unrelated resource-management APIs.

13. REQUESTS

There must be exactly one:

REQUESTS

navigation destination.

The existing Requests functionality must remain fully operational.

Existing states such as:

APPROVE
DECLINE
ALLOCATED

must continue working exactly as they currently do.

Do not change the approval logic.

Do not change the request API unless navigation cannot work without it.

14. ACTIVE NAVIGATION STATE

Only the currently selected section should be visually active.

For example:

OVERVIEW
SHELTERS
SUPPLIES
AMBULANCES
EQUIPMENT
REQUESTS

If the user is on Requests:

REQUESTS

should retain the existing active styling.

Do not display two active states caused by duplicate navigation components.

15. ROUTING

Inspect the project's existing route structure.

Do not blindly create new routes.

Use the existing routes wherever possible.

Conceptually, the navigation should resolve to:

OVERVIEW
    ↓
existing Resource Manager Overview

SHELTERS
    ↓
existing Shelter implementation

SUPPLIES
    ↓
existing Supplies implementation

AMBULANCES
    ↓
existing Ambulance implementation

EQUIPMENT
    ↓
existing Equipment implementation

REQUESTS
    ↓
existing Requests implementation

Use the actual route names already implemented in the project.

16. NO PLACEHOLDER PAGES

When clicking any Resource Manager destination:

OVERVIEW
SHELTERS
SUPPLIES
AMBULANCES
EQUIPMENT
REQUESTS

there must be no:

Phase 2 Implementation
Coming Soon
Placeholder
Blank Screen
Temporary Page
Demo Screen

If a working implementation already exists, route to it.

Do not create a new placeholder.

17. NO DUPLICATE COMPONENTS

Do NOT create:

SheltersNew
SheltersPage2
RequestsNew
OverviewNew
ResourceManagerNavigation2

or equivalent duplicate components simply to make routing work.

Reuse the existing implementation.

The objective is consolidation.

18. REAL DATABASE DATA ONLY

This rule is NON-NEGOTIABLE.

All Resource Manager operational data must come from the existing real backend/database.

Do NOT introduce:

demo data
mock data
fake requests
fake shelters
fake supplies
fake ambulances
fake equipment
static resource numbers
fake approval states
hard-coded operational values

If the existing implementation already retrieves real data from the database:

leave that data flow unchanged.

19. DATABASE PERSISTENCE

Any operational state that is already intended to be persisted must continue to be persisted in the existing database.

For example, if an existing action changes:

REQUEST
→ APPROVED

that state must continue to use the existing backend/database persistence.

Do NOT replace database persistence with:

localStorage
sessionStorage
frontend state only
hard-coded values

However:

Do not add new database functionality because of this navigation task.

Only preserve the existing persistence behavior.

20. API SAFETY

This task must NOT modify unrelated APIs.

Do NOT touch:

authentication APIs
Citizen APIs
Responder APIs
Authority APIs
AI-agent APIs
incident APIs
evacuation APIs
dispatch APIs
unrelated Resource Manager APIs

Only navigation/routing code directly involved in this task may be changed.

21. IF A SHARED COMPONENT MUST BE MODIFIED

If the duplicated navigation is implemented inside a shared layout component:

Before modifying it:

Identify every page using it.
Determine whether the change affects other roles.
Make the smallest possible scoped change.
Verify all affected pages.

Do NOT accidentally modify:

Citizen
Responder
Authority / Command

navigation while fixing Resource Manager.

22. DO NOT TOUCH AUTHENTICATION

Do NOT modify:

Login
Signup
JWT
sessions
cookies
RBAC
role assignment
permissions
authorization middleware

unless a routing guard is directly responsible for the navigation bug.

If authentication is already working:

leave it completely untouched.

23. DO NOT TOUCH THE BACKEND

This is primarily a:

Resource Manager frontend navigation + routing consolidation

task.

If the existing frontend can be corrected without backend changes:

DO NOT MODIFY THE BACKEND.

Do not modify:

FastAPI routes
database models
migrations
schemas
services
AI services
WebSockets
workers
environment configuration
database configuration
24. SERVER STABILITY REQUIREMENT

Under NO circumstances should this change introduce backend/server errors.

After implementation, verify that the backend continues to start and operate exactly as before.

Do not:

change ports
change database configuration
change .env
change credentials
change connection strings
modify dependency versions
modify server startup
modify unrelated backend files

The existing development setup must continue working.

I should NOT need to recreate or repair my project environment after this change.

25. ENVIRONMENT SAFETY

Do NOT modify:

.env
.env.example
.gitignore
database credentials
API keys
environment variables
Node configuration
Python configuration
package configuration

unless there is an absolutely unavoidable technical reason.

There is no reason to modify them for normal navigation consolidation.

Therefore:

Leave them untouched.
26. NO UI / DESIGN CHANGES

Do NOT use this task to "improve" the Resource Manager design.

Do not change:

font
colors
shadows
glows
cards
spacing
border radius
icons
animations
background
grid
button styling
status badges
responsive design

The only visible UI change expected is:

The duplicate navigation disappears and the existing destinations are represented once.

27. NO FUNCTIONALITY CHANGES

The following existing Resource Manager functionality must remain untouched:

Shelter management
Supply management
Ambulance management
Equipment management
Resource requests
Approve
Decline
Allocation state
Live status
Database integration

If it currently works, leave it alone.

28. RESOURCE MANAGER NAVIGATION MUST NOT BE SCROLL-DEPENDENT

The primary Resource Manager interface should continue following the existing fixed-screen requirement.

Do not introduce a new page layout that requires the user to scroll merely to access navigation.

The navigation should remain immediately accessible.

Do not change the existing fixed viewport implementation.

29. DIRECT URL TEST

After consolidation, test each existing Resource Manager route directly.

For example, using the project's actual routes:

Overview
Shelters
Supplies
Ambulances
Equipment
Requests

Verify:

route loads
correct component loads
correct data loads
no duplicate navigation appears
no redirect loop
no blank page
no API errors
30. PAGE REFRESH TEST

For each destination:

OVERVIEW
SHELTERS
SUPPLIES
AMBULANCES
EQUIPMENT
REQUESTS

perform a browser refresh.

The correct Resource Manager section must remain loaded.

Do not introduce client-side routing problems.

31. BACK/FORWARD TEST

Test:

OVERVIEW
→ SHELTERS
→ SUPPLIES
→ REQUESTS

then:

BACK
BACK
FORWARD

The correct pages and active navigation states must remain synchronized.

32. NO API REGRESSION

After changing navigation, verify that the existing Resource Manager APIs still behave normally.

Especially verify existing functionality for:

Shelters
Supplies
Ambulances
Equipment
Requests

Do not modify an API merely because it is used by a page being navigated to.

Only change API code if absolutely unavoidable.

33. BUILD / TYPE CHECK

After the change, run the project's existing checks.

For example, if available:

npm run build

and:

npm run lint

and/or:

npm run type-check

Use the project's actual configured commands.

There must be:

no TypeScript errors
no JSX errors
no import errors
no route errors
no build errors
no runtime errors caused by this modification
34. CONSOLE CHECK

Open the Resource Manager and test:

OVERVIEW
SHELTERS
SUPPLIES
AMBULANCES
EQUIPMENT
REQUESTS

There must be no new:

React errors
routing errors
API errors
404 errors
undefined errors
failed imports
uncaught exceptions

caused by this change.

35. FINAL EXPECTED RESULT

The Resource Manager should conceptually have:

┌──────────────────────────────────────────────────────────────────────┐
│ NEXUS RESQ     RESOURCE MANAGER                                     │
│                                                                      │
│ OVERVIEW   SHELTERS   SUPPLIES   AMBULANCES   EQUIPMENT   REQUESTS   │
└──────────────────────────────────────────────────────────────────────┘

and NOT:

TOP NAVIGATION
OVERVIEW SHELTERS SUPPLIES AMBULANCES EQUIPMENT REQUESTS

SECOND NAVIGATION
OVERVIEW SHELTERS SUPPLIES AMBULANCES EQUIPMENT REQUESTS

The duplicated layer must be removed/consolidated.

36. RELATION TO THE PREVIOUS AUTHORITY FIX

Apply the same architectural principle that was requested for the Authority / Command panel:

Authority / Command

One navigation:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH
Resource Manager

One navigation:

OVERVIEW
SHELTERS
SUPPLIES
AMBULANCES
EQUIPMENT
REQUESTS

Do NOT apply Authority-specific pages to Resource Manager.

Do NOT change Resource Manager's functionality to match Authority.

The common principle is only:

ONE ROLE → ONE NAVIGATION SYSTEM → ONE DESTINATION PER FUNCTION → NO DUPLICATES.

37. STRICT CHANGE BOUNDARY

Before modifying anything, identify the exact files responsible for the duplicate Resource Manager navigation.

Modify ONLY the files required to solve:

Resource Manager
    ↓
duplicate navigation
    ↓
route/navigation consolidation

Do not perform unrelated refactoring.

At completion, report:

FILES MODIFIED:
- ...
- ...

FILES NOT MODIFIED:
- Authority / Command
- Citizen
- Responder
- Backend APIs
- Database
- Authentication
- AI agents
- Environment configuration
- Unrelated components
38. FINAL VERIFICATION REPORT

After completing the change, report:

Navigation
✓ Overview
✓ Shelters
✓ Supplies
✓ Ambulances
✓ Equipment
✓ Requests
Routing
✓ All destinations open existing implementations
✓ No duplicate routes
✓ No placeholder pages
✓ No broken navigation
Data
✓ Real database data preserved
✓ No demo data introduced
✓ No mock data introduced
APIs
✓ Existing Resource Manager APIs preserved
✓ No unrelated API modified
✓ No API regression
Project stability
✓ No backend/server changes
✓ No environment changes
✓ No authentication changes
✓ No database-breaking changes
✓ No build errors
✓ No runtime errors
UI
✓ Existing design preserved
✓ Existing animations preserved
✓ Existing Resource Manager functionality preserved
✓ Only duplicate navigation removed
🚨 NON-NEGOTIABLE FINAL RULE

DO NOT IMPROVE WHAT I DID NOT ASK YOU TO IMPROVE.

The Resource Manager is already implemented.

Treat all existing working functionality as frozen.

This task is ONLY to correct the duplicate navigation structure.

The final Resource Manager must have exactly:

OVERVIEW · SHELTERS · SUPPLIES · AMBULANCES · EQUIPMENT · REQUESTS

ONE TIME EACH.

No second navigation.

No duplicate buttons.

No placeholder pages.

No fake data.

No demo data.

No unrelated API modifications.

No backend restructuring.

No database changes unless strictly required for an existing route to function.

No authentication changes.

No environment changes.

No design redesign.

No animation changes.

No 3D changes.

No unrelated refactoring.

No server errors.

No breaking existing functionality.

FIRST INSPECT → IDENTIFY DUPLICATE NAVIGATION → CONSOLIDATE → TEST EVERY EXISTING DESTINATION → VERIFY APIs → VERIFY BUILD → STOP.

Do not make additional changes after the requested issue is fixed.