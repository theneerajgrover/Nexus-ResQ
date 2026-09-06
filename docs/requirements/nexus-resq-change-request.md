NEXUS RESQ — CONTROLLED FRONTEND + BACKEND CHANGE REQUEST
==========================================================

IMPORTANT: READ THE ENTIRE PROMPT BEFORE MAKING ANY CHANGE.

This is an EXISTING, WORKING Nexus ResQ project.

The current implementation contains working frontend pages, backend APIs, database integration, authentication, role-based interfaces, UI components, animations, routing and operational workflows.

Your job is NOT to redesign, refactor, optimize or rewrite the project.

You must make ONLY the changes explicitly listed in this prompt.

EVERYTHING ELSE MUST BE TREATED AS PROTECTED AND WORKING.

==========================================================
CORE NON-NEGOTIABLE REQUIREMENTS
==========================================================

1. REAL DATABASE DATA ONLY
--------------------------------

All operational data displayed on the frontend MUST come from the actual backend/database.

DO NOT use:

- Demo data
- Mock data
- Fake incidents
- Hardcoded agent statuses
- Hardcoded resource counts
- Fake occupancy
- Fake capacity
- Fake dispatch quantities
- Static approval records
- Fake activity logs
- Artificial 100% completion values
- Placeholder operational values presented as real data

If real data is not available yet, show an appropriate empty/loading/pending/unavailable state.

NEVER fabricate data merely to make the UI look populated.

The frontend must remain connected to the actual backend APIs and database.

----------------------------------------------------------

2. DATABASE PERSISTENCE
-----------------------

Any information that is created, edited, approved, rejected, dispatched, updated or otherwise required to persist MUST be saved in the database.

This includes, where applicable:

- Dispatch quantities
- Required quantities
- Resource additions
- Shelter capacity
- Shelter occupancy
- Ambulance records
- Supply records
- Equipment records
- Approval decisions
- Dispatch records
- Agent workflow state
- Agent completion state
- Execution state
- Relevant timestamps
- Operational records

Do NOT store important operational state only in React/frontend memory.

After page refresh, the correct state must come back from the backend/database.

----------------------------------------------------------

3. DO NOT BREAK EXISTING FUNCTIONALITY
---------------------------------------

The project is already working.

Do NOT modify:

- Existing authentication unless absolutely required for these changes
- Existing authorization/RBAC
- Existing database configuration
- Existing environment configuration
- Existing API contracts unnecessarily
- Existing working endpoints
- Existing unrelated services
- Existing working components
- Existing routing
- Existing animations
- Existing typography
- Existing color system
- Existing layout
- Existing UI design language
- Existing business logic
- Existing pages outside the requested scope

Do not refactor code simply because you think another architecture is better.

Do not replace a working implementation with a new implementation unnecessarily.

----------------------------------------------------------

4. API SAFETY
-------------

DO NOT touch an API/function that is unrelated to the requested changes.

If an existing API absolutely must be modified:

- Preserve its existing behavior.
- Maintain backward compatibility.
- Ensure all existing consumers continue working.
- Do not remove existing response fields.
- Do not unexpectedly rename existing fields.
- Do not change authentication behavior.
- Do not break database operations.
- Do not introduce race conditions.
- Do not introduce server-side exceptions.

Before modifying an existing endpoint, inspect where it is used.

If a new endpoint is genuinely required, implement it cleanly without disturbing existing endpoints.

----------------------------------------------------------

5. NO SERVER ERRORS
-------------------

The final implementation MUST NOT introduce:

- 500 errors
- Database errors
- Migration errors
- Startup errors
- API validation failures
- Undefined backend routes
- Broken imports
- Frontend runtime exceptions
- CORS problems
- Authentication failures
- Broken existing API calls

Do not modify the project setup unnecessarily.

The existing backend must continue starting exactly as before.

----------------------------------------------------------

6. PROTECTED UI
---------------

Do NOT redesign the entire application.

The current visual language must remain intact.

Only make UI changes that are explicitly required by the 11 requested changes below.

Do not change unrelated:

- Cards
- Buttons
- Colors
- Fonts
- Animations
- Navigation styling
- Spacing
- Borders
- Backgrounds
- Icons
- Existing layouts

EXCEPTION:

The ambulance and supplies UI is explicitly requested to be redesigned below.

That redesign must be limited ONLY to those sections.

==========================================================
REQUESTED CHANGES
==========================================================


CHANGE 1 — BACK OPTION ON EVERY PAGE
====================================

Every page/section accessible through Nexus ResQ must provide a clear BACK option.

The Back option must:

- Return to the previous logical page/section.
- Work correctly with browser/application navigation.
- Not create broken navigation states.
- Not reload the entire application unnecessarily.
- Preserve the existing routing architecture wherever possible.

Do not create duplicate or conflicting navigation systems.

The Back control should visually fit the EXISTING Nexus ResQ design.

Do not redesign the navigation globally.

----------------------------------------------------------


CHANGE 2 — STRICT 11-AGENT EXECUTION SEQUENCE
==============================================

The AI agent system MUST operate according to a real dependency sequence.

The frontend must NOT show all agents as completed simply because the page has loaded.

The agent workflow must represent actual backend state.

The required agent architecture is:

1. INGESTION AGENT
2. VERIFICATION AGENT
3. SITUATION AGENT
4. PRIORITY AGENT
5. RESOURCE AGENT
6. CAPACITY AGENT
7. ROUTE AGENT
8. FORECAST AGENT
9. COORDINATOR AGENT
10. CRITIC AGENT
11. ANALYTICS AGENT

The workflow must respect dependencies.

Required conceptual flow:

REPORT / INPUT
      ↓
INGESTION
      ↓
VERIFICATION
      ↓
SITUATION
      ↓
PRIORITY
      ↓
RESOURCE / CAPACITY / ROUTE / FORECAST
      ↓
COORDINATOR
      ↓
CRITIC
      ↓
HUMAN APPROVAL
      ↓
EXECUTION
      ↓
ANALYTICS


CRITICAL REQUIREMENT:

ANALYTICS IS THE FINAL OPERATIONAL AGENT.

Analytics MUST NOT show:

- 100%
- COMPLETE
- Finished
- Finalized

before the preceding workflow has actually reached the required execution/outcome stage.

For example:

If the operation is still awaiting human approval:

ANALYTICS = WAITING / PENDING

If the plan is approved but not executed:

ANALYTICS = WAITING

If execution is underway:

ANALYTICS = WAITING / PROCESSING

Only after the relevant operation has actually been executed and the required outcome data is available may:

ANALYTICS = COMPLETE

The progress indicator must therefore be based on REAL backend workflow state.

Do NOT calculate fake progress simply by dividing the number of agents by 11.

The agent state must represent actual execution.

----------------------------------------------------------

AGENT PROGRESS
--------------

The Authority Command header should continue showing the 11-agent progress indicator.

Example visual concept:

AI ORCHESTRATION
████████░░░ 8/11
PROCESSING

But the numbers MUST come from actual backend state.

Do not hardcode 8/11.

If only 3 agents have completed, it must show 3/11.

If Analytics has not run, it must not appear completed.

----------------------------------------------------------


CHANGE 3 — HOME + INTELLIGENCE MUST NOT FEEL THEORETICAL
========================================================

The Home and Intelligence sections currently feel too theoretical.

Do NOT solve this by simply adding more paragraphs of text.

The information should become operational, visual and engaging.

Use actual available data to communicate intelligence through things such as:

- Live operational indicators
- Trend visualization
- Incident movement
- Risk changes
- Resource pressure
- Capacity changes
- Agent activity
- Geographic distribution
- Response progression
- Before/after operational state
- Priority changes
- Live timelines
- Situation progression
- Action-oriented intelligence cards
- Compact graphs
- Map-based information where actual geographic data exists

The objective is:

NOT:

"AI predicts that risk may increase."

Instead, wherever real data supports it, communicate:

WHAT changed
WHY it matters
WHERE it is happening
WHAT the system recommends
WHAT has already been done
WHAT requires human action

Do not invent data to achieve this.

If graph/map data does not exist in the database, show an appropriate empty state rather than fabricated visualization.

Do not change the existing design language unnecessarily.


----------------------------------------------------------


CHANGE 4 — INCIDENTS: NEEDS DISPATCH MUST BE TOP PRIORITY
===========================================================

In the Authority / Command → Incidents section:

Incidents requiring dispatch must receive the highest operational priority.

The ordering must be:

1. NEEDS DISPATCH
2. CRITICAL
3. HIGH
4. MODERATE

Within the same category, use the existing relevant priority/severity information and timestamp/order logic.

Do not randomly reorder incidents.

Do not change the underlying incident data.

The frontend should derive this ordering from the real backend data.

Example:

NEEDS DISPATCH + CRITICAL
→ highest

NEEDS DISPATCH + HIGH
→ next

CRITICAL but no dispatch required
→ next

HIGH
→ next

MODERATE
→ last

The exact ordering must remain deterministic.

----------------------------------------------------------


CHANGE 5 — DISPATCH: EDIT REQUIRED + DISPATCH UNITS
====================================================

In the Dispatch section, provide an operational control to edit:

1. Number of units/resources REQUIRED
2. Number of units/resources TO BE DISPATCHED

These values must be editable only where the backend allows such modification.

Example:

REQUIRED UNITS
[ 8 ]

DISPATCH UNITS
[ 5 ]

The system must validate:

- Values must be valid numbers.
- Negative quantities are not allowed.
- Dispatch quantity should not exceed available resources.
- Required quantity should follow the relevant backend/business rules.
- Invalid values must produce clear validation feedback.

When the user saves the modification:

- Persist it to the database.
- Update the relevant backend record.
- Refresh the UI using the saved backend value.
- Ensure the dispatch/incident workflow sees the updated quantity.

Do NOT simply update frontend state and pretend it was saved.

----------------------------------------------------------


CHANGE 6 — AUTO-OPEN HIGHEST PRIORITY INCIDENT
==============================================

When the Incidents section opens:

The highest-priority actionable incident should automatically be selected/opened.

Priority must consider:

1. Needs Dispatch
2. Critical
3. High
4. Moderate

If multiple incidents have the same priority:

Use the existing backend priority score / timestamp / deterministic ordering available in the system.

Do NOT randomly choose an incident.

Do NOT open a fabricated incident.

If there are no incidents, show the appropriate empty state.

The selected incident should open naturally within the EXISTING incident UI.

Do not redesign the incident detail panel.


----------------------------------------------------------


CHANGE 7 — COMMAND ORBIT PRIORITY + DISPATCH ORDERING
======================================================

In Authority / Command → Command Orbit:

LEFT SIDE:

The highest-priority incident must appear at the top.

The ordering must follow:

NEEDS DISPATCH
↓
CRITICAL
↓
HIGH
↓
MODERATE

RIGHT SIDE:

If an agent has completed its work and there is a resulting action that requires dispatch, the relevant dispatch action should appear at the top.

In other words:

COMPLETED AI WORK
        ↓
ACTION GENERATED
        ↓
DISPATCH REQUIRED
        ↓
SHOW AS TOP ACTION

Do not show a completed agent's action as a dispatch task unless the backend actually indicates that dispatch is required.

Do not fabricate dispatch actions.

Both sides must be driven by real backend state.


----------------------------------------------------------


CHANGE 8 — RESOURCE MANAGER: REAL-TIME SHELTER CAPACITY/OCCUPANCY
===============================================================

In Resource Manager → Shelters:

Capacity and occupancy must update in real time based on actual operational execution.

The relationship should be:

Initial shelter capacity
+
Current occupancy
+
Approved evacuation/response execution
=
Updated shelter state

When an approved plan is actually executed and people/resources are moved or assigned according to the backend workflow, the relevant shelter occupancy/capacity information must update automatically.

For example:

If a shelter has:

Capacity: 500
Occupancy: 300

and the actual executed operation moves 80 people there:

Occupancy should become:

380

The frontend MUST NOT simply increment the value locally.

The updated values must come from the backend/database.

The system should refresh/synchronize the relevant data automatically.

Use the existing project's real-time/polling mechanism if one already exists.

If the existing application uses a periodic refresh mechanism, reuse it rather than creating an unnecessary parallel system.

The update must be consistent across:

- Resource Manager
- Authority/Command where relevant
- Shelter records
- Operational execution records

Do not create contradictory values between pages.


----------------------------------------------------------


CHANGE 9 — REQUESTS ONLY IN AUTHORITY / ADMIN
=============================================

The Resource Manager MUST NOT have a "REQUESTS" section.

Requests should exist only on the Authority/Admin side.

Resource Manager should instead have a records/history-style section showing what the Authority/Admin has approved and what is actually being dispatched.

Replace the Resource Manager concept of:

REQUESTS

with:

DISPATCH RECORDS / APPROVED DISPATCHES

Use the exact existing design language rather than introducing an unrelated design.

The Resource Manager record should communicate:

- What was approved
- Resource type
- Quantity approved
- Quantity dispatched
- Destination
- Related incident
- Unit/team where applicable
- Status
- Timestamp
- Approval information where available

This is a RECORD of an approved operational decision.

Resource Manager should not independently approve Authority requests if that approval belongs to Authority/Admin.

Do not duplicate the Authority request workflow.

The Authority/Admin remains responsible for approval.

Resource Manager manages the resulting resources and dispatch records.


----------------------------------------------------------


CHANGE 10 — ADD NEW RESOURCES
=============================

Resource Manager must have the ability to add upcoming/new records in:

- Shelters
- Supplies
- Ambulances
- Equipment

Each section should provide an appropriate:

ADD NEW

control.

The addition form must use the existing UI language.

The fields must be based on the actual database schema and existing backend capabilities.

Do NOT invent unnecessary fields.

For example, depending on the existing schema, a shelter may contain:

- Name
- Location
- Capacity
- Current occupancy
- Status
- Other existing supported fields

Supplies may contain:

- Resource name
- Quantity
- Availability
- Location
- Status
- Existing relevant fields

Ambulances may contain:

- Identifier
- Type
- Location
- Availability/status
- Existing relevant fields

Equipment may contain:

- Equipment name
- Quantity
- Location
- Availability/status
- Existing relevant fields

IMPORTANT:

First inspect the existing database models/schema and backend API structure.

Use existing fields wherever possible.

Do NOT create frontend-only fields that cannot be persisted.

When a new record is created:

FRONTEND
   ↓
BACKEND API
   ↓
DATABASE
   ↓
SUCCESS RESPONSE
   ↓
REFRESH LIST
   ↓
DISPLAY REAL SAVED RECORD

After refresh, the record must still exist.

Validation must be implemented on the appropriate side.

Do not allow malformed records to enter the database.


----------------------------------------------------------


CHANGE 11 — REDESIGN ONLY AMBULANCE + SUPPLIES UI
==================================================

The Ambulance and Supplies sections currently need a better visual arrangement.

Redesign ONLY these two sections.

Use the existing Shelter section as the internal Nexus ResQ design reference.

Do NOT copy an external website.

Do NOT redesign the whole Resource Manager.

Required layout:

ONE ROW = TWO BLOCKS

Example conceptual structure:

┌────────────────────────┐   ┌────────────────────────┐
│ AMBULANCE / SUPPLY     │   │ AMBULANCE / SUPPLY     │
│ information            │   │ information            │
│ status                 │   │ status                 │
│ capacity/quantity      │   │ capacity/quantity      │
│ location               │   │ location               │
│ operational state      │   │ operational state      │
└────────────────────────┘   └────────────────────────┘

Then:

┌────────────────────────┐   ┌────────────────────────┐
│ NEXT RECORD            │   │ NEXT RECORD            │
└────────────────────────┘   └────────────────────────┘

The layout must remain responsive.

Use the same design language as the existing Shelter section.

Do not change Shelter itself unless absolutely necessary for consistency.

Do not introduce unrelated visual changes.


==========================================================
GLOBAL RESPONSIVENESS + FIXED VIEW REQUIREMENT
==========================================================

The operational panels should continue respecting the existing Nexus ResQ fixed-screen command interface.

Do NOT introduce unnecessary vertical page scrolling.

Where information is extensive:

- Use compact panels.
- Use internal data areas where already supported.
- Use tabs/sections.
- Use modals/drawers where appropriate.
- Use pagination where appropriate.

But do not make the entire operational dashboard unnecessarily scrollable.

The user should be able to understand the main operational state within the existing viewport.


==========================================================
DATA FLOW REQUIREMENT
==========================================================

For every change, follow this principle:

DATABASE
   ↓
BACKEND
   ↓
API
   ↓
FRONTEND
   ↓
USER ACTION
   ↓
BACKEND
   ↓
DATABASE
   ↓
UPDATED API RESPONSE
   ↓
FRONTEND REFRESH

Do NOT use:

FRONTEND
   ↓
LOCAL FAKE STATE
   ↓
PRETEND IT WAS SAVED


==========================================================
BEFORE IMPLEMENTATION
==========================================================

FIRST inspect the existing Nexus ResQ codebase.

Identify:

- Frontend framework
- Existing routes
- Authority routes/components
- Resource Manager routes/components
- Existing Incident components
- Dispatch components
- Command Orbit components
- Intelligence components
- Home components
- Shelter components
- Supply components
- Ambulance components
- Equipment components
- Existing APIs
- Existing database models
- Existing agent APIs/services
- Existing real-time/polling mechanism
- Existing authentication/RBAC
- Existing request/approval workflow

Then determine the MINIMUM files that actually need modification.

Do NOT immediately rewrite components.

Do NOT perform broad refactoring.


==========================================================
IMPLEMENTATION SAFETY RULE
==========================================================

For every proposed code change ask:

"Is this change explicitly required by this prompt?"

If NO:

DO NOT CHANGE IT.

If YES:

Make the smallest safe modification necessary.

==========================================================
AGENT-SPECIFIC SAFETY
==========================================================

The 11-agent architecture must remain:

1. Ingestion
2. Verification
3. Situation
4. Priority
5. Resource
6. Capacity
7. Route
8. Forecast
9. Coordinator
10. Critic
11. Analytics

Do not:

- Add another agent
- Remove an agent
- Rename agents
- Merge agents
- Show Analytics as completed prematurely
- Bypass dependencies
- Automatically approve human decisions
- Execute critical actions without required human approval

Human approval must remain a real operational checkpoint.

==========================================================
FINAL VALIDATION
==========================================================

Before declaring the work complete, verify ALL of the following:

[ ] Every required page has a working Back option.

[ ] Agent execution follows the correct dependency sequence.

[ ] Analytics is the LAST operational agent.

[ ] Analytics cannot show 100%/COMPLETE before the preceding workflow and execution are complete.

[ ] Agent progress comes from real backend state.

[ ] Home intelligence is operational and visual rather than merely theoretical.

[ ] Incidents requiring dispatch are prioritized first.

[ ] Incident ordering is deterministic.

[ ] Highest-priority incident automatically opens.

[ ] Dispatch allows editing required units.

[ ] Dispatch allows editing dispatched units.

[ ] Dispatch changes are persisted to the database.

[ ] Command Orbit left side prioritizes the highest-priority incident.

[ ] Command Orbit right side prioritizes completed actions requiring dispatch.

[ ] Shelter occupancy/capacity reflects actual executed operations.

[ ] Shelter values are retrieved from real backend/database data.

[ ] Resource Manager no longer contains Requests.

[ ] Authority/Admin retains the request/approval workflow.

[ ] Resource Manager contains approved dispatch/record information.

[ ] New Shelters can be added.

[ ] New Supplies can be added.

[ ] New Ambulances can be added.

[ ] New Equipment can be added.

[ ] Newly added records are persisted in the database.

[ ] Ambulance UI uses the requested two-block-per-row layout.

[ ] Supplies UI uses the requested two-block-per-row layout.

[ ] Existing Shelter UI remains protected.

[ ] Existing authentication remains protected.

[ ] Existing APIs continue working.

[ ] Existing unrelated pages continue working.

[ ] No demo/mock data has been introduced.

[ ] No fake real-time values have been introduced.

[ ] No unnecessary API has been modified.

[ ] No unrelated UI has been redesigned.

[ ] No existing animation has been changed unnecessarily.

[ ] No database configuration has been changed unnecessarily.

[ ] No environment configuration has been changed unnecessarily.

[ ] No server errors have been introduced.

[ ] No frontend runtime errors have been introduced.

[ ] Existing application starts normally.

[ ] Existing backend starts normally.

[ ] Existing API endpoints continue responding correctly.

[ ] Database operations work correctly.

[ ] Page refresh preserves saved data.

[ ] Newly created/edited data comes back from the database after refresh.


==========================================================
ABSOLUTE FINAL INSTRUCTION
==========================================================

DO NOT treat this as an opportunity to improve the entire project.

This is a CONTROLLED CHANGE REQUEST.

The existing Nexus ResQ implementation is considered WORKING.

Protect everything that is already working.

Only implement the 11 requested changes.

Do not change anything outside their required scope.

Do not replace real backend data with mock data.

Do not create fake data to make screens look complete.

Do not make Analytics appear complete before the actual workflow reaches Analytics.

Do not break the existing 11-agent architecture.

Do not bypass human approval.

Do not modify unrelated APIs.

Do not introduce server errors.

Do not modify project setup unnecessarily.

Do not redesign unrelated UI.

Do not alter existing animations/design unless explicitly required.

If a requested feature cannot be implemented safely using the current backend, STOP and identify the exact missing backend capability rather than silently implementing a fake frontend solution.

The priority is:

EXISTING FUNCTIONALITY
        >
DATA INTEGRITY
        >
API STABILITY
        >
DATABASE PERSISTENCE
        >
REQUESTED FUNCTIONALITY
        >
VISUAL ENHANCEMENT

Make the minimum safe changes required to satisfy this specification completely.