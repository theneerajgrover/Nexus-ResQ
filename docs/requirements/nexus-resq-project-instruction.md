You are working on my existing NEXUS RESQ project.

IMPORTANT: THIS IS AN EXISTING, PARTIALLY IMPLEMENTED, WORKING PROJECT.

Your task is to make ONLY the changes explicitly requested below.

DO NOT rebuild the application.
DO NOT redesign unrelated pages.
DO NOT replace existing architecture.
DO NOT rewrite working APIs.
DO NOT introduce mock/demo/static data.
DO NOT change working authentication, RBAC, database logic, API contracts, animations, routing, components, or UI behavior unless they are directly required for one of the changes listed below.

The existing implementation must be treated as production code that is already working.

==================================================
GLOBAL NON-NEGOTIABLE REQUIREMENTS
==================================================

1. REAL DATABASE DATA ONLY

Every operational value shown in the frontend must come from the existing backend/database/API.

NEVER use:
- hardcoded demo incidents
- fake responders
- fake dispatch units
- fake shelter capacities
- fake alerts
- fake analytics
- fake resource quantities
- static fallback operational data
- placeholder records pretending to be real data

If the database/API has no record:
- show a proper empty state
- show "No active records" / "No data available"
- do NOT manufacture data to make the UI look populated.

Existing real API integrations must remain intact.

2. DATABASE PERSISTENCE

Anything that represents actual system state and is supposed to persist must be saved in the existing database.

Examples:
- incident updates
- dispatch quantities
- resource additions
- shelter occupancy/capacity changes
- approval records
- responder mission status
- resource dispatch records
- alerts/notifications
- any new resource record

Do not store operational state only in React/local state if that state is supposed to persist.

3. DO NOT BREAK EXISTING BACKEND

Do not modify backend functions/endpoints unless absolutely necessary for the requested functionality.

If an existing API function must be modified:
- preserve its existing response structure wherever possible
- preserve existing consumers
- preserve existing authentication
- preserve existing RBAC
- preserve existing database behavior
- preserve unrelated API functionality
- ensure every existing caller continues to work.

Do not introduce:
- server errors
- 500 errors
- startup errors
- database migration failures
- broken imports
- broken API routes
- CORS problems
- authentication regressions
- schema mismatches
- unexpected console/runtime errors.

After every change, verify that the existing application still starts and the existing APIs still work.

4. ROLE-BASED ACCESS IS CRITICAL

NEXUS RESQ has different operational roles.

The system must correctly distinguish at minimum:

- CITIZEN
- RESPONDER
- AUTHORITY / COMMAND
- RESOURCE MANAGER

Do not allow users to manually access another role's portal simply by navigating to its route.

Authentication and authorization must determine which portal the user can access.

If a user is logged in as:

CITIZEN
→ only Citizen experience/routes should be available.

RESPONDER
→ only Responder experience/routes should be available.

AUTHORITY / COMMAND
→ only Authority / Command experience/routes should be available.

RESOURCE MANAGER
→ only Resource Manager experience/routes should be available.

A user must not see both:

AUTHORITY / COMMAND
RESOURCE MANAGER

as interchangeable navigation options after logging in.

Fix the existing issue where the Authority / Command side and Resource Manager side can display each other's portal navigation.

Do NOT break the login system.

Do NOT create a new authentication system.

Use the existing authentication/RBAC implementation and correct only the routing/navigation/access-control issue.

Direct URL access must also respect RBAC.

==================================================
1. CREATE A REAL NEXUS RESQ HOME / LANDING PAGE
==================================================

The current Home experience looks too much like a login page.

Change this.

The root/home page must feel like the landing page of a serious government-grade emergency response platform.

It should NOT look like a login screen.

The Home page should communicate what NEXUS RESQ actually does.

It should feel like a product/mission landing page, not a generic SaaS login page.

Include meaningful content such as:

- NEXUS RESQ identity
- emergency response mission
- AI-assisted disaster coordination
- citizen safety
- responder coordination
- authority command
- resource management
- real-time emergency intelligence
- coordinated response
- human-supervised AI decision support

The page should feel like a government/public-safety product.

Do not fill the page with long theoretical paragraphs.

Use:
- strong short statements
- operational metrics only when backed by real data
- concise feature blocks
- visual hierarchy
- system capabilities
- emergency-focused messaging
- clear calls to action.

==================================================
2. EMERGENCY-FIRST CITIZEN HOME EXPERIENCE
==================================================

The Home page should serve as the entry point for citizens as well.

The primary purpose should immediately communicate:

"I need help / I need emergency assistance."

Add a clearly visible Emergency / GET HELP action.

The emergency action should take the citizen into the existing emergency/help workflow.

DO NOT replace the existing citizen functionality.

Keep login/signup accessible but secondary.

For example:

Main experience:
NEXUS RESQ
Emergency response platform
[ GET EMERGENCY HELP ]

Secondary authentication area:
[ LOGIN ] [ SIGN UP ]

The login/signup buttons should NOT dominate the landing page.

When LOGIN is clicked:
→ open the existing login page.

When SIGN UP is clicked:
→ open the existing registration flow.

Do not embed the login form as the entire homepage.

==================================================
3. BACK BUTTON — FIX EVERYWHERE
==================================================

Every internal page across every role must have a working Back option.

This includes:

Citizen:
- Alerts
- Shelters
- Safe Routes
- Get Help
- any other detail/sub-page

Responder:
- Mission
- Incidents
- Navigation
- Resources
- Alerts
- detail pages

Authority / Command:
- Home
- Command Orbit
- Intelligence
- Evacuation
- Operations
- Incidents
- Dispatch
- detail/modals/pages

Resource Manager:
- Resources
- Shelter
- Supplies
- Ambulance
- Equipment
- Records
- detail/add/edit pages

Volunteer application pages
and any other nested page.

The Back button must actually return to the previous relevant page.

Do not make a decorative Back button.

Fix the currently broken Authority / Command Back button specifically.

Also fix the Citizen Shelter page Back behavior if required.

Do not break browser history.

Preferred behavior:
1. If there is a meaningful previous application route → return there.
2. Otherwise → return to that role's appropriate home/dashboard.

Do NOT blindly redirect every Back button to the global homepage.

==================================================
4. RESPONDER NAVIGATION — REMOVE DUPLICATES
==================================================

On the Responder side, the following navigation currently appears duplicated:

MISSION
INCIDENTS
NAVIGATION
RESOURCES
ALERTS

This must be corrected.

Each navigation item should exist only once in the visible navigation structure.

The same route/navigation must not appear:
- in both sidebar and another duplicate navigation area
- twice in the same sidebar
- as duplicate buttons
- as duplicated page controls.

Create a clean singleton navigation system for the Responder role.

Maintain the existing design language.

Do not change the overall visual identity.

The navigation should behave consistently across all Responder pages.

==================================================
5. RESPONDER — BUILD THE EMPTY PAGES
==================================================

These Responder pages currently have little/no useful content:

MISSION
INCIDENTS
NAVIGATION
RESOURCES
ALERTS

Create meaningful operational content for them using the EXISTING backend/database data.

Do not invent records.

--------------------------------------------------
RESPONDER → MISSION
--------------------------------------------------

Show the responder's actual mission workflow.

Possible operational structure:

- Current mission
- Mission priority
- Incident ID
- Location
- Assignment
- Team
- People affected/trapped
- Hazard information
- ETA
- Mission status
- Status progression

Existing status flow should remain logical:

AVAILABLE
→ ASSIGNED
→ ACCEPTED
→ EN ROUTE
→ ON SCENE
→ ASSISTING
→ COMPLETED

Do not artificially mark a mission as completed.

Only display the actual status from the backend.

--------------------------------------------------
RESPONDER → INCIDENTS
--------------------------------------------------

Show incidents relevant to the logged-in responder.

Use real database data.

Include concise:
- Incident ID
- incident type
- location
- priority
- current status
- assigned team/unit
- required response

Prioritize critical incidents first.

--------------------------------------------------
RESPONDER → NAVIGATION
--------------------------------------------------

Create a useful operational navigation view based on actual incident/mission data.

Show:
- current mission destination
- route information if available
- hazards
- blocked roads
- route warnings
- estimated arrival information

Do not fabricate GPS/location data.

--------------------------------------------------
RESPONDER → RESOURCES
--------------------------------------------------

Show resources relevant to responder operations from the real backend.

Examples:
- medical equipment
- rescue equipment
- vehicles
- personnel/resources assigned
- availability
- quantity/status

Only display what exists in the database.

--------------------------------------------------
RESPONDER → ALERTS
--------------------------------------------------

Create an actual responder alert feed.

Use real alerts/events from the backend.

Examples of legitimate categories could include:
- mission update
- incident escalation
- route hazard
- assignment
- safety warning
- dispatch update

Do not create fake notifications.

If no alerts exist:
show a clean empty state.

==================================================
6. CITIZEN ALERTS PAGE
==================================================

The current Citizen Alerts page is almost empty.

It should become a real notification/alert experience.

Use real backend/database alert data.

Show notifications such as:
- emergency alerts
- evacuation warnings
- shelter updates
- route warnings
- incident-related public alerts
- safety instructions
- service updates

Use concise notification cards rather than huge paragraphs.

Each alert can contain:
- severity
- title
- short message
- timestamp
- affected area if available
- read/unread state if supported by backend.

Do not manufacture alerts.

==================================================
7. CITIZEN SAFE ROUTES — FIX SCREEN OVERFLOW
==================================================

The Safe Routes page currently has a layout/viewport problem where content gets hidden toward the bottom/right of the screen.

Audit the complete Safe Routes page.

Requirements:

- every important element must remain accessible
- no clipped content
- no hidden buttons
- no content extending outside viewport
- responsive behavior must work
- internal scrolling should be intentional
- maps/route areas must not overlap critical UI
- bottom-right content must remain visible
- action controls must remain accessible.

Do not solve this by simply shrinking everything excessively.

Preserve the existing visual design and make the layout properly responsive.

==================================================
8. VOLUNTEER APPLICATION PAGE
==================================================

The Responder/Volunteer application page currently looks messy and text-heavy.

Redesign ONLY this page.

The information should fit into a clean professional single-screen composition wherever the viewport permits.

Avoid making the user continuously scroll through a huge wall of text.

Use:
- clear sections
- compact form layout
- grouped fields
- concise explanatory copy
- clear hierarchy
- professional application form
- visible submission action.

Keep the existing functionality.

Do not remove required fields.

Do not modify unrelated forms.

The application must still save correctly to the existing backend/database.

==================================================
9. AUTHORITY / COMMAND — SUMMARY MUST BE OPERATIONAL
==================================================

The current Authority / Command summary contains too much text.

It looks theoretical and takes too much time to read.

Change the presentation into an operational decision-support interface.

Instead of large paragraphs, use concise information blocks.

Example structure:

IMMEDIATE PRIORITY
INC-2849
STRUCTURAL COLLAPSE
P1 CRITICAL
3 PEOPLE TRAPPED
2 UNITS REQUIRED

RISK
SECONDARY COLLAPSE
45 MIN WINDOW

ACTION
DISPATCH STRUCTURAL TEAM

CAPACITY
SHELTER 93% OCCUPIED

Keep the exact values based on real database/API data.

The summary should answer:

WHAT IS HAPPENING?
WHAT IS MOST IMPORTANT?
WHAT NEEDS ACTION?
WHAT IS THE RISK?
WHAT RESOURCE IS REQUIRED?

Do not turn the page into a text report.

--------------------------------------------------
INTERACTIVE INCIDENT DETAILS
--------------------------------------------------

When the Authority user clicks an incident summary/card:

Open a professional detail popup/modal over the current page.

The modal should provide complete incident information.

Include, where available:

- Incident ID
- incident type
- severity
- priority
- location
- affected people
- trapped people
- required resources
- dispatched resources
- responders
- status
- timestamps
- hazards
- route information
- current operational actions
- AI assessment
- human verification status

Do not display fake fields just to fill space.

Only show real available data.

==================================================
10. AUTHORITY INCIDENT PRIORITY
==================================================

In the Incident section:

"NEED DISPATCH" incidents must be surfaced as the highest operational action group.

Within incidents, sort by:

1. CRITICAL
2. HIGH
3. MODERATE

Within the same priority:
use the most urgent/oldest/unresolved incident ordering based on available real backend fields.

Do not hardcode the ordering.

The most urgent incident should automatically be selected/opened when entering the Incident page.

The user should not first see an empty selection screen when a critical unresolved incident exists.

If no active incident exists:
show a proper empty state.

==================================================
11. DISPATCH SECTION
==================================================

The Dispatch section must allow authorized Authority users to edit:

- required dispatch units
- number of units being dispatched

For example:

REQUIRED
[ 4 ]

DISPATCHING
[ 2 ]

The exact data model must be based on the existing backend.

Do not create an independent frontend-only value.

When the authorized user changes dispatch quantity:

- validate the value
- update backend/database
- update the UI
- update relevant incident state
- update resource availability where applicable
- preserve existing dispatch APIs.

Do not allow impossible negative quantities.

Do not allow dispatch quantities to exceed available resources unless the existing system explicitly supports that workflow.

==================================================
12. COMMAND ORBIT PRIORITY ORDER
==================================================

In Authority / Command → Command Orbit:

LEFT SIDE:
The highest-priority incident/action must appear at the top.

Order operationally:

CRITICAL
→ HIGH
→ MODERATE

Within equal priority, use urgency from real backend data.

RIGHT SIDE:
If an agent has completed its work and generated an actionable result, the relevant DISPATCH/action item should be surfaced toward the top.

The Command Orbit must represent:

WHAT NEEDS HUMAN ATTENTION NOW?

Not merely list everything chronologically.

==================================================
13. RESOURCE MANAGER — REAL-TIME SHELTER CAPACITY
==================================================

In Resource Manager → Shelters:

Capacity and occupancy must reflect actual backend/database state.

As an approved operational plan is executed:

- occupancy should update
- available capacity should update
- utilization percentage should update
- status should update if applicable.

Example:

Capacity: 500
Occupancy: 430
Available: 70

If 20 people are moved/allocated:

Occupancy → 450
Available → 50

These changes must be driven by actual backend state.

Do NOT simulate this with frontend timers.

Do NOT use random numbers.

Do NOT use demo data.

Use the existing database/API.

If real-time infrastructure already exists, use it.

If the existing architecture uses polling/refetching, preserve that architecture rather than introducing an unnecessary new real-time system.

==================================================
14. RESOURCE MANAGER — REMOVE REQUEST SECTION
==================================================

Requests should exist ONLY in the Admin/Authority operational workflow.

The Resource Manager portal should NOT have a "Requests" section.

Resource Manager should instead have:

RECORDS

Records should show what the Authority/Admin has already approved and what is being dispatched.

For example:

APPROVED RESOURCE
→ WHERE IT IS GOING
→ WHAT QUANTITY
→ STATUS
→ APPROVED BY
→ DISPATCH STATUS
→ TIMESTAMP

The Resource Manager should manage/track execution and availability, not independently approve operational requests.

Do not break existing approval logic.

==================================================
15. RESOURCE MANAGER — ADD NEW RESOURCE DATA
==================================================

Provide authorized Resource Manager users with an option to add upcoming/new records in:

- Shelters
- Supplies
- Ambulances
- Equipment

The Add flow must be professional and consistent with the existing design.

Examples:

ADD SHELTER
- name
- location
- total capacity
- available capacity/occupancy according to existing model
- relevant metadata

ADD SUPPLY
- supply name/type
- quantity
- location
- availability
- relevant metadata

ADD AMBULANCE
- identifier
- type
- location
- availability/status
- relevant metadata

ADD EQUIPMENT
- equipment type
- quantity
- location
- availability/status
- relevant metadata

Use the existing backend/database schema whenever possible.

If a required backend field does not currently exist, make the smallest possible backend/database change necessary.

Do not rewrite the resource architecture.

All newly created records must persist in the database.

==================================================
16. RESOURCE MANAGER — SUPPLIES & AMBULANCE UI
==================================================

The Supplies and Ambulance sections currently need a better UI.

Take structural inspiration from the existing Shelter section.

Specifically:

ONE ROW = TWO BLOCKS

Use a two-column card/grid structure where appropriate.

Example:

┌─────────────────────┐ ┌─────────────────────┐
│ SUPPLY INFORMATION  │ │ AVAILABILITY        │
│ Quantity            │ │ Status              │
│ Location            │ │ Last Updated        │
└─────────────────────┘ └─────────────────────┘

Do the same conceptually for Ambulances.

However:

Do NOT blindly duplicate the Shelter UI.

Adapt the information architecture to the resource type.

Preserve the existing NEXUS RESQ visual language.

==================================================
17. AI AGENT ORCHESTRATION
==================================================

The Authority → Intelligence page must represent an actual multi-agent orchestration workflow.

The system previously uses an 11-agent architecture.

Use the actual agent definitions already present in the project/backend/documentation.

DO NOT invent agent responsibilities if the architecture already defines them.

If AGENT-10 and AGENT-11 are genuinely not yet defined anywhere in the project, keep them explicitly labelled:

AGENT-10 — PENDING SPECIFICATION
AGENT-11 — PENDING SPECIFICATION

Do not silently invent names or behavior.

--------------------------------------------------
SEQUENTIAL EXECUTION
--------------------------------------------------

The agents must be represented as a proper sequence/dependency workflow.

Do NOT show Analytics as 100% complete before upstream agents have completed.

The orchestration must behave logically:

INGESTION
↓
VERIFICATION
↓
SITUATION
↓
PRIORITY
↓
RESOURCE
↓
CAPACITY
↓
ROUTE
↓
FORECAST
↓
COORDINATOR
↓
CRITIC
↓
ANALYTICS

The exact order must follow the actual architecture if the backend defines dependencies differently.

The key requirement:

An agent must not be presented as COMPLETE before its dependencies have completed.

Analytics must execute LAST or only after all required upstream analysis has completed.

Never show:

ANALYTICS — 100%

while upstream agents are still running/waiting.

The UI must reflect actual backend agent states.

Possible states:

WAITING
RUNNING
COMPLETED
FAILED
BLOCKED

Do not fake progress.

==================================================
18. TWO AGENT COLLECTIONS / PROJECTS
==================================================

The Intelligence area should clearly distinguish between two major agent groups.

GROUP A — PREDICTIVE / PRE-EVENT INTELLIGENCE

These agents operate before a disaster/event occurs.

Their purpose includes, depending on actual architecture:

- risk prediction
- hazard forecasting
- early warning
- vulnerability analysis
- preparedness
- resource pre-positioning
- predictive intelligence

GROUP B — INCIDENT RESPONSE / ACTIVE DISASTER INTELLIGENCE

These agents operate when an incident is active.

Their purpose includes:

- incident ingestion
- verification
- situation assessment
- priority determination
- resource allocation
- capacity analysis
- route analysis
- response coordination
- operational decision support.

Make the distinction obvious.

Do not present them as two random collections.

They represent:

BEFORE THE INCIDENT
vs.
DURING THE INCIDENT

==================================================
19. AGENT ORCHESTRATION GRAPH POPUP
==================================================

On the Intelligence page, there is an:

AGENT ORCHESTRATION GRAPH

When the user clicks it:

Open a large modal/overlay.

It should occupy approximately 60% of the viewport/page area.

It must NOT cover the entire application.

The background page should remain visible/dimmed.

The expanded graph should clearly show:

- all agents
- their sequence
- dependencies
- current state
- completed agents
- running agents
- waiting agents
- blocked/failed agents if applicable
- directional flow
- human supervision points.

The graph should make the orchestration understandable visually.

Example:

INGESTION
   ↓
VERIFICATION
   ↓
SITUATION
   ↓
PRIORITY
   ↓
RESOURCE
   ↓
CAPACITY
   ↓
ROUTE
   ↓
FORECAST
   ↓
COORDINATOR
   ↓
CRITIC
   ↓
ANALYTICS

But use the actual project architecture if it differs.

Include:

HUMAN-SUPERVISED

as an explicit part of the workflow where human approval/verification is required.

The graph must represent the actual system state, not decorative fake progress.

==================================================
20. INTELLIGENCE PAGE — MAKE IT ENGAGING
==================================================

The Intelligence section must not look like an AI theory page.

Avoid long explanatory paragraphs.

Instead use operational visualizations:

- agent state
- progress
- current operation
- next action
- confidence where genuinely available
- incidents being analyzed
- resources being evaluated
- pending human approvals
- actionable outputs.

The user should understand the AI system in seconds.

==================================================
21. HOME SUMMARY — NOT THEORETICAL
==================================================

The Home summary must also avoid long theoretical descriptions.

Use:

WHAT IS HAPPENING
WHAT NEEDS ACTION
WHAT IS AT RISK
WHAT IS WAITING
WHAT WAS COMPLETED

with compact operational cards.

Use real data.

If no real data exists, show empty states rather than demo content.

==================================================
22. FONT / TYPOGRAPHY AUDIT — ENTIRE APPLICATION
==================================================

The attached screenshots show that the font width/letter proportions currently look excessively wide on multiple pages.

This is NOT limited to the screenshots.

Audit the ENTIRE application:

CITIZEN
RESPONDER
AUTHORITY / COMMAND
RESOURCE MANAGER
HOME
LOGIN
SIGNUP
VOLUNTEER
ALL DETAIL PAGES
ALL MODALS
ALL TABLES
ALL CARDS
ALL NAVIGATION
ALL HEADINGS
ALL LABELS.

The objective is to make typography look normal, professional, readable, and industry-grade.

Do NOT randomly replace the entire design system.

Do NOT remove the existing visual identity.

Adjust only the typography properties required, such as:

- font family where appropriate
- font weight
- letter spacing
- text transform
- font size
- line height
- width/condensation where applicable.

The current excessive character spacing should be corrected.

Do not make every page look identical.

Maintain the existing NEXUS RESQ visual language.

==================================================
23. RESPONSIVE / VIEWPORT AUDIT
==================================================

Review every page, not only the screenshots.

Check:

- horizontal overflow
- vertical overflow
- clipped content
- hidden buttons
- modal overflow
- cards exceeding containers
- navigation duplication
- content hidden below viewport
- incorrect fixed positioning
- elements overlapping
- bottom-right clipping
- sidebar/main-content collisions.

The UI must work at the application's supported desktop viewport and remain usable when viewport dimensions change.

Do not solve layout problems by destroying the existing design.

==================================================
24. DO NOT CHANGE THESE EXISTING THINGS
==================================================

Unless directly required by one of the requested fixes, DO NOT TOUCH:

- existing working API functions
- existing database logic
- authentication implementation
- RBAC implementation except the specific role-routing bug
- existing working routes
- existing animations
- existing transitions
- existing visual identity
- existing color system
- existing map implementation
- existing components
- existing working forms
- existing backend services
- existing API contracts
- existing database tables
- existing integrations
- existing operational workflows.

Do not refactor code simply because you prefer another architecture.

This is an incremental production change.

==================================================
25. API SAFETY RULE
==================================================

Before changing any API:

Identify:
1. who currently calls it
2. what request format it expects
3. what response it returns
4. which frontend components depend on it
5. which database tables it touches.

If an API is unrelated to the requested change:

DO NOT TOUCH IT.

If a shared API must change:

Maintain backward compatibility wherever possible.

After modification:
- test the endpoint
- test existing consumers
- test the database operation
- test authentication
- test authorization
- test error handling.

==================================================
26. DATABASE SAFETY RULE
==================================================

Do not wipe, reset, reseed, or replace the existing database.

Do not delete existing operational records.

Do not introduce a demo seed dataset.

Do not replace PostgreSQL/database-backed data with local arrays.

Do not silently switch database configuration.

Use the existing configured database.

==================================================
27. ERROR SAFETY
==================================================

Before considering the work complete:

Run the project.

Verify:
- frontend builds
- backend starts
- database connects
- authentication works
- role-based routing works
- Citizen portal works
- Responder portal works
- Authority portal works
- Resource Manager portal works
- existing API endpoints still respond
- no new 500 errors
- no new console errors
- no broken imports
- no broken routes
- no broken navigation
- no broken database writes.

If something unrelated breaks, STOP and fix the regression before completing the requested changes.

==================================================
28. IMPLEMENTATION STRATEGY
==================================================

Do NOT immediately start rewriting files.

First:

STEP 1
Inspect the existing project structure.

STEP 2
Identify:
- frontend routing
- authentication
- RBAC
- role detection
- backend APIs
- database models
- resource APIs
- incident APIs
- dispatch APIs
- agent/orchestration APIs
- existing reusable components.

STEP 3
Identify exactly which files/components are responsible for each requested change.

STEP 4
Make the smallest possible scoped changes.

STEP 5
Reuse existing components and APIs whenever possible.

STEP 6
Test each role independently.

STEP 7
Test navigation/back behavior.

STEP 8
Test database persistence.

STEP 9
Test API health.

STEP 10
Perform a final full-project regression check.

==================================================
29. IMPORTANT — ATTACHED SCREENSHOTS / VIDEO
==================================================

Use the attached screenshots and video as visual evidence for the issues described above.

Pay particular attention to:

- excessive font width
- duplicate navigation
- empty pages
- broken Back behavior
- Safe Routes overflow
- Volunteer application layout
- Authority summary density
- Intelligence/Agent orchestration presentation
- role-specific navigation
- overall government-grade professionalism.

However, do NOT modify only the screenshots/pages shown.

Audit the complete application across all roles.

==================================================
30. FINAL PRODUCT STANDARD
==================================================

The final result should feel like a serious government emergency-management platform.

The goal is NOT:

"make the UI prettier."

The goal is:

NEXUS RESQ should feel like an operational emergency-response product where:

CITIZENS
→ can quickly request help and receive alerts.

RESPONDERS
→ can understand missions, incidents, routes, resources and alerts.

AUTHORITY / COMMAND
→ can understand what requires action, supervise AI intelligence, approve decisions and coordinate dispatch.

RESOURCE MANAGER
→ can manage real resources, execute approved allocations and maintain accurate availability records.

AI AGENTS
→ process information sequentially and produce decision support under human supervision.

Every role should have a distinct responsibility.

Every displayed operational value should originate from real data.

Every important action should persist where required.

Every page should be usable.

Every Back button should work.

Every role should remain isolated by RBAC.

Every existing working feature must continue working.

==================================================
FINAL ACCEPTANCE CHECKLIST
==================================================

Before finishing, verify ALL of the following:

[ ] Real DB/API data only
[ ] No demo/static operational data
[ ] No fake fallback records
[ ] All persistent changes saved to database
[ ] Existing authentication preserved
[ ] RBAC corrected
[ ] Authority cannot access Resource Manager portal unless authorized
[ ] Resource Manager cannot access Authority portal unless authorized
[ ] Direct URL access respects RBAC
[ ] Home page is a real NEXUS RESQ landing page
[ ] Emergency action exists on Home
[ ] Login/Signup are secondary actions
[ ] Back button works on every role/page
[ ] Authority Back button fixed
[ ] Citizen Back button works
[ ] Responder Back button works
[ ] Resource Manager Back button works
[ ] Volunteer application is clean and compact
[ ] Citizen Alerts contains real alert records
[ ] Safe Routes has no clipped/hidden content
[ ] Responder navigation has no duplicate items
[ ] Responder Mission has meaningful content
[ ] Responder Incidents has meaningful content
[ ] Responder Navigation has meaningful content
[ ] Responder Resources has meaningful content
[ ] Responder Alerts has meaningful content
[ ] Authority summary is concise and operational
[ ] Incident cards open detailed modal
[ ] Critical incidents appear first
[ ] High incidents appear second
[ ] Moderate incidents appear third
[ ] Highest-priority incident auto-opens
[ ] Dispatch quantity can be edited by authorized user
[ ] Required dispatch quantity can be edited where supported
[ ] Dispatch changes persist
[ ] Command Orbit prioritizes urgent incidents
[ ] Completed actionable agent/dispatch work is surfaced appropriately
[ ] Shelter occupancy is database-backed
[ ] Shelter capacity is database-backed
[ ] Shelter state updates after execution
[ ] Resource Manager has no Requests section
[ ] Resource Manager has Records section
[ ] Records show approved/dispatch information
[ ] Add Shelter works
[ ] Add Supply works
[ ] Add Ambulance works
[ ] Add Equipment works
[ ] New resource records persist
[ ] Supplies UI improved
[ ] Ambulance UI improved
[ ] Two-block-per-row structure used where appropriate
[ ] Agent orchestration follows actual dependency sequence
[ ] Analytics does NOT show 100% prematurely
[ ] Analytics executes only after required upstream agents
[ ] Agent states reflect actual backend state
[ ] Predictive agent group exists
[ ] Active-disaster response agent group exists
[ ] Agent orchestration graph expands into ~60% viewport modal
[ ] Graph shows complete agent workflow
[ ] Human supervision is represented
[ ] Intelligence page is operational, not theoretical
[ ] Home summary is engaging, not theoretical
[ ] Typography audited across EVERY role
[ ] Excessive font width/letter spacing corrected
[ ] No unnecessary redesign
[ ] No unrelated UI changes
[ ] No unrelated API changes
[ ] No backend errors
[ ] No frontend runtime errors
[ ] No broken imports
[ ] No broken routes
[ ] No database reset
[ ] No demo seed data
[ ] Existing functionality remains intact

MOST IMPORTANT:

Do not interpret this prompt as permission to rebuild NEXUS RESQ.

This is a controlled enhancement of an already-working application.

CHANGE ONLY WHAT IS REQUIRED ABOVE.

PRESERVE EVERYTHING THAT ALREADY WORKS.

If you encounter an existing feature that works correctly, leave it alone.

If a requested feature can be implemented without touching the backend, do not touch the backend.

If a backend change is genuinely necessary, make the smallest safe change and verify that every existing API consumer continues to work.

Do not finish by saying something "was implemented" unless you have actually verified the behavior in the running application.