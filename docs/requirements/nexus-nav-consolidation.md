NEXUS RESQ — AUTHORITY / COMMAND NAVIGATION CONSOLIDATION ONLY
⚠️ CRITICAL: READ THIS BEFORE MAKING ANY CHANGE

This is a strictly scoped frontend navigation correction inside the existing Nexus ResQ Authority / Command interface.

I do NOT want a redesign.

I do NOT want you to improve unrelated components.

I do NOT want you to modify the backend architecture.

I do NOT want you to change APIs that are not directly required for this navigation correction.

The project already contains functionality that is working correctly. Treat everything outside the exact scope below as frozen.

The only purpose of this task is to:

Remove the duplicated Authority navigation structure, eliminate the useless/placeholder navigation behavior, and consolidate the existing Authority pages into one correct navigation system.

1. CURRENT PROBLEM

The current Authority / Command interface has two navigation areas.

The screenshots show that the same destinations are appearing repeatedly.

For example, the second navigation row contains:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS

while the upper navigation already contains:

COMMAND
INCIDENTS
INTELLIGENCE
DISPATCH
EVACUATION
OPERATIONS

This creates duplicate navigation concepts and confusing routing.

Additionally, when clicking some of the upper navigation items such as:

INCIDENTS
DISPATCH

the preview can open a page similar to the attached second screenshot, where the screen essentially displays:

INCIDENTS

AUTHORITY / COMMAND · PHASE 2 IMPLEMENTATION

with no useful operational content.

This is not acceptable.

2. REQUIRED FINAL NAVIGATION

After the correction, the Authority / Command interface must expose exactly these eight navigation destinations:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH

That is the complete required Authority navigation set.

IMPORTANT

Do NOT show duplicated versions of:

COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS

There must be one navigation destination for each.

There must also be only one HOME destination.

There must be only one INCIDENTS destination.

There must be only one DISPATCH destination.

3. DO NOT INTERPRET THIS AS A VISUAL REDESIGN

Preserve the existing:

color system
typography
spacing
borders
glow effects
animations
3D environment
Command Orbit
incident visualization
cards
panels
modals
graphs
maps
responsive behavior
hover states
active states
loading animations
transitions
existing visual hierarchy

Do not redesign any of these.

The screenshots are being provided only to demonstrate the current navigation/routing problem.

The goal is to fix the information architecture/routing, not the visual design.

4. DETERMINE THE CORRECT NAVIGATION ARCHITECTURE

Before editing code, inspect the existing Authority / Command implementation.

Identify:

the top navigation component
the secondary navigation component
Authority route definitions
nested routes
route redirects
Command page
Home page
Command Orbit page
Intelligence page
Evacuation page
Operations page
Incidents page
Dispatch page

Determine which navigation layer currently owns each destination.

Then consolidate them.

Do not create duplicate components merely to make the routes work.

5. REQUIRED FINAL STRUCTURE

Use one coherent Authority navigation structure.

Conceptually:

AUTHORITY / COMMAND

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH

The exact visual placement should follow the existing Nexus ResQ design.

Do not invent a new navbar design.

6. IMPORTANT: DO NOT DELETE WORKING FUNCTIONALITY

If:

COMMAND

currently contains functionality that should actually belong to:

COMMAND ORBIT

do not delete that functionality.

Move/reference the existing implementation appropriately.

Likewise, if:

INCIDENTS

already has working components somewhere else in the project, use those existing components.

Do not create a fake replacement page.

Do not create placeholder content.

Do not duplicate an existing implementation.

7. INCIDENTS PAGE

The screenshot shows that the current /command/incidents destination appears to behave like a placeholder/phase page.

Do NOT leave it like this.

Inspect whether an actual Incident interface already exists elsewhere in the project.

If it exists:

Route the single INCIDENTS navigation item to the existing working Incident implementation.

If the current Incident implementation is incomplete:

Only connect the existing available functionality necessary for the navigation task.

Do NOT build a new Incident-management system as part of this task.

Do NOT invent incident data.

Do NOT add mock incidents.

8. DISPATCH PAGE

Apply the same rule to:

DISPATCH

Find the existing Dispatch implementation.

If it already exists:

DISPATCH navigation
       ↓
existing Dispatch implementation

Do not create a second Dispatch page.

Do not create fake dispatch data.

Do not create a placeholder "Phase 2" screen.

If Dispatch requires an existing backend endpoint, use the existing endpoint.

Do not modify unrelated backend services.

9. HOME MUST REMAIN AVAILABLE

HOME must remain a valid Authority destination.

The problem currently appears to be that when the upper navigation is used, the secondary navigation can change/disappear.

Fix the routing/layout relationship so that:

Authority / Command
       ↓
HOME

is always available through the consolidated Authority navigation.

Do not create multiple Home buttons.

10. COMMAND ORBIT

There must be exactly one:

COMMAND ORBIT

navigation destination.

It should continue opening the existing Command Orbit implementation.

Do not recreate Command Orbit.

Do not change its 3D behavior.

Do not change its incident visualization.

Do not change its existing controls.

Only ensure that the consolidated navigation points to the correct existing route/component.

11. INTELLIGENCE

There must be exactly one:

INTELLIGENCE

destination.

It must point to the existing Authority Intelligence implementation.

Do not duplicate the page.

Do not redesign the Intelligence interface.

Do not change existing charts, maps, graphs or AI analysis.

12. EVACUATION

There must be exactly one:

EVACUATION

destination.

It must point to the existing Evacuation implementation.

Do not redesign it.

Do not modify evacuation APIs.

Do not change evacuation business logic.

Only correct navigation/routing if necessary.

13. OPERATIONS

There must be exactly one:

OPERATIONS

destination.

Use the existing Operations implementation.

Do not duplicate it.

Do not create a second Operations page.

Do not change its data/API behavior.

14. INCIDENTS + DISPATCH ARE NOT TO BE DUPLICATED

The final navigation must NOT look like:

TOP NAVIGATION
COMMAND
INCIDENTS
INTELLIGENCE
DISPATCH
EVACUATION
OPERATIONS

SECOND NAVIGATION
HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS

This is precisely what must be eliminated.

Instead, the user must have one coherent Authority navigation containing:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH
15. ROUTING REQUIREMENT

Every item must have a valid route.

Conceptually:

HOME
→ Authority home

COMMAND ORBIT
→ existing Command Orbit page

INTELLIGENCE
→ existing Intelligence page

EVACUATION
→ existing Evacuation page

OPERATIONS
→ existing Operations page

INCIDENTS
→ existing Incident page

DISPATCH
→ existing Dispatch page

Use the project's existing routing conventions.

Do not change the routing library.

Do not introduce a second routing mechanism.

16. NO DEAD LINKS

After implementation, clicking each of these must produce a meaningful existing Nexus ResQ interface:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH

There must be:

no blank page
no placeholder page
no "Phase 2 Implementation" screen
no broken route
no console routing error
no 404
no unexpected redirect
no duplicate page
17. ACTIVE STATE

The currently selected destination must retain the existing Nexus ResQ active navigation styling.

For example:

HOME

active → existing active style.

COMMAND ORBIT

active → existing active style.

Do not redesign active states.

Do not introduce a new visual language.

18. DIRECT URL ACCESS

Test every route directly.

For example, if the project uses routes equivalent to:

/command
/command/orbit
/command/intelligence
/command/evacuation
/command/operations
/command/incidents
/command/dispatch

open each route directly and verify that the correct interface loads.

Use the project's actual existing route names rather than blindly creating these paths.

19. BROWSER BACK/FORWARD

Verify:

HOME
→ COMMAND ORBIT
→ INTELLIGENCE
→ INCIDENTS
→ DISPATCH

and then browser Back/Forward behavior.

Do not introduce route state bugs.

20. DO NOT TOUCH AUTHENTICATION

Do not modify:

login
signup
JWT
sessions
cookies
authentication middleware
RBAC
user roles

unless a routing guard absolutely requires a minimal adjustment.

Authority access must remain exactly as it currently works.

21. DO NOT TOUCH BACKEND APIs

This task is primarily a:

frontend navigation + routing consolidation

task.

Do not modify:

database models
database migrations
API contracts
API response formats
AI services
agent services
WebSockets
background workers
authentication endpoints
unrelated backend services

If an API is already working, leave it alone.

22. REAL DATABASE DATA ONLY

This project uses real database-backed data.

Do NOT introduce:

mock data
demo data
static incident data
fake AI results
fake dispatch records
fake graphs
fake maps
fake resource values

for the purpose of making a page look functional.

If an existing page uses real database data, preserve that implementation.

If no data exists:

show the existing proper empty/loading state.

Never fabricate operational data.

23. DATABASE PERSISTENCE

If this navigation correction requires any state to be persisted:

It must be saved through the existing database-backed architecture.

Do not use localStorage/sessionStorage as a substitute for persistent operational data.

Do not introduce a temporary frontend-only database.

However, do not add persistence unless it is actually required for this task.

24. PRESERVE ALL EXISTING API BEHAVIOR

This is extremely important.

If you touch any shared function/component used by multiple pages:

verify that:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH

continue working correctly.

A navigation change must not break an unrelated API.

25. NO UNRELATED REFACTORING

Do NOT use this task as an opportunity to:

reorganize the entire frontend
rename components
rename APIs
change folder structure
replace libraries
upgrade dependencies
change Tailwind configuration
change fonts
change theme
redesign layouts
rewrite components
refactor unrelated code
optimize unrelated APIs

Only touch files directly involved in:

Authority navigation
Authority routing
Authority page mounting
Authority navigation state

and only when necessary.

26. ERROR PREVENTION

Before finishing:

Run the existing frontend build.

Verify:

npm run build

or the project's actual existing build command.

Also run the project's existing lint/type-check commands if they are already configured.

There must be:

no TypeScript errors
no JSX errors
no import errors
no route errors
no build errors
no runtime console errors caused by this change
27. BACKEND SAFETY CHECK

If no backend files need to change:

DO NOT TOUCH THE BACKEND.

If you discover that a backend modification is absolutely unavoidable:

STOP before modifying it and determine the smallest possible change.

Any backend modification must:

preserve all existing API contracts
preserve existing database behavior
preserve existing authentication
preserve existing agent behavior
preserve existing WebSocket behavior
not introduce server errors
not require the project setup/environment to be recreated

Do not make speculative backend changes.

28. ENVIRONMENT SAFETY

Do NOT modify:

.env
.env.example
database credentials
API keys
environment variables
Python environment
Node environment
package manager configuration
server configuration

unless the navigation cannot function without it.

Never expose secrets.

Never hard-code credentials.

29. FINAL VISUAL REQUIREMENT

The final Authority interface must still look like the current Nexus ResQ design shown in the screenshots.

Do not change:

red/black visual identity
cyan highlights
typography
3D Command Orbit
grid background
incident markers
panel styling
glow
borders
animations
command-center aesthetic

The only visible conceptual change should be:

the navigation is now unified and no longer duplicated/confusing.

30. FINAL EXPECTED NAVIGATION

The final Authority / Command navigation must expose:

┌──────────────────────────────────────────────────────────────────────────┐
│ AUTHORITY / COMMAND                                                      │
│                                                                          │
│ HOME   COMMAND ORBIT   INTELLIGENCE   EVACUATION   OPERATIONS            │
│                                                                          │
│ INCIDENTS   DISPATCH                                                      │
└──────────────────────────────────────────────────────────────────────────┘

The exact visual arrangement can remain consistent with the existing design.

The important requirement is that the functional navigation set is exactly:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH

No duplicates.

No dead routes.

No placeholder pages.

No unnecessary navigation layer.

31. FINAL TEST MATRIX

Before declaring completion, test:

Destination	Opens correctly	Existing UI preserved	Real data preserved
HOME	✅	✅	✅
COMMAND ORBIT	✅	✅	✅
INTELLIGENCE	✅	✅	✅
EVACUATION	✅	✅	✅
OPERATIONS	✅	✅	✅
INCIDENTS	✅	✅	✅
DISPATCH	✅	✅	✅

Also test:

✓ Navigation switching
✓ Active navigation state
✓ Browser Back
✓ Browser Forward
✓ Direct URL
✓ Page refresh
✓ Authentication protection
✓ API calls
✓ Real database data
✓ Existing animations
✓ Existing 3D components
✓ No console errors
✓ No build errors
32. STRICT CHANGE BOUNDARY

Before editing, identify the exact files that need modification.

At the end, report:

FILES MODIFIED:
- file 1
- file 2
- ...

FILES NOT MODIFIED:
- backend
- database
- authentication
- AI agents
- unrelated frontend modules

Also provide a short explanation of:

What caused the duplicate navigation.
Which existing route/component each final navigation item now uses.
Which placeholder/duplicate route was removed or redirected.
Confirmation that no unrelated functionality was modified.
Confirmation that the frontend build passes.
Confirmation that no backend/server errors were introduced.
NON-NEGOTIABLE RULE

DO NOT IMPROVE WHAT I DID NOT ASK YOU TO IMPROVE.

The existing Nexus ResQ project has already implemented functionality that I consider working.

Treat it as production code.

This task is ONLY:

Consolidate the Authority / Command navigation into the seven required functional destinations and make every one of them point to the correct existing implementation.

The required destinations are:

HOME · COMMAND ORBIT · INTELLIGENCE · EVACUATION · OPERATIONS · INCIDENTS · DISPATCH

Everything else must remain untouched.

NO MOCK DATA.
NO DEMO DATA.
NO UNRELATED API CHANGES.
NO BACKEND REWORK.
NO UI REDESIGN.
NO ANIMATION CHANGES.
NO 3D CHANGES.
NO AUTH CHANGES.
NO DATABASE BREAKING CHANGES.
NO ENVIRONMENT CHANGES.
NO PLACEHOLDER PAGES.
NO NEW DUPLICATE COMPONENTS.
NO SERVER ERRORS.

First inspect → identify the existing implementations → consolidate routes/navigation → test every destination → verify build → stop.