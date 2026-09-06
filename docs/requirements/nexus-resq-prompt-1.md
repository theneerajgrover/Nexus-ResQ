NEXUS RESQ — FINAL FRONTEND FIX & COMPLETION PROMPT

You are working on my existing Nexus ResQ project.

I need you to make the following specific frontend fixes and additions only. This is an existing working project, so do not treat this as a new UI implementation or redesign task.

The existing UI language, visual system, animations, typography, colors, layouts, components, role interfaces, APIs, backend structure, database structure, and working functionality must remain intact unless a change below explicitly requires modification.

I have identified several usability and routing issues from the current implementation. Fix them carefully and completely.

🚨 CRITICAL PROJECT RULES — MUST FOLLOW

These requirements are mandatory.

1. REAL DATABASE DATA ONLY

The frontend must display real data retrieved from the existing backend/database.

DO NOT:

Add mock data
Add dummy cards
Add hardcoded incidents
Add fake notifications
Add placeholder shelters
Add fake routes
Add static resource counts
Add fake agent statuses
Add fake volunteer applications
Add simulated backend responses
Add temporary frontend arrays merely to make the UI look populated

If data is not available from the backend/database, show the appropriate existing empty/loading state instead of inventing data.

Every value displayed as operational data must originate from the existing backend/database.

🚨 2. DO NOT BREAK EXISTING FUNCTIONALITY

The project is already partially implemented and several things are working correctly.

DO NOT modify working functionality unnecessarily.

Do not:

rewrite existing APIs
restructure the backend
replace existing authentication
change database architecture
change existing API contracts
change working API endpoints
change working RBAC
change existing role permissions
change existing navigation architecture unless required for the fixes below
replace existing components unnecessarily
change existing animations
change the existing visual theme
change colors
change typography
change spacing system
redesign existing pages
change working dashboard logic
change existing agent logic
change existing resource-management logic

Only modify the exact areas required by this prompt.

🚨 3. API SAFETY

If an existing API function absolutely must be modified to support one of these fixes:

Make the smallest possible change.
Preserve its existing request/response behavior.
Preserve compatibility with every other existing frontend consumer.
Do not break authentication.
Do not break role-based access.
Do not break database persistence.
Do not introduce new unnecessary endpoints.
Do not modify unrelated API functions.

After the modification, verify that all existing API consumers still work.

🚨 4. DATABASE PERSISTENCE

Anything that represents actual system state and needs to persist must be saved in the existing database.

Examples:

notification state
volunteer application state
navigation-related operational state, if applicable
shelter occupancy/capacity changes
resource changes
approval state
dispatch state

Do not store persistent operational data only in React/local state.

Do not use localStorage as a replacement for the database.

🚨 5. NO BACKEND/SERVER ERRORS

This is extremely important.

Do not introduce:

500 errors
404 API errors
CORS errors
database connection errors
broken imports
undefined API calls
invalid request payloads
frontend crashes caused by missing backend data
authentication failures
routing errors
server startup errors

Do not change my existing setup/configuration unnecessarily.

I should not have to rebuild or reconfigure my backend because of these frontend changes.

🚨 6. DO NOT CHANGE THE EXISTING DESIGN

The current Nexus ResQ design is intentional.

Do NOT redesign the application.

The existing:

3D/visual language
dark operational interface
role-specific accent colors
typography
animations
cards
borders
grids
navigation styling
visual hierarchy
transitions
map styling
command-center styling

must remain unchanged.

Only fix layout/visibility/navigation problems mentioned below.

🚨 7. RESPONSIVE / SINGLE-SCREEN REQUIREMENT

All four operational roles should remain usable within the existing single-screen operational interface.

Where the current project already uses a fixed-screen design:

do not introduce unnecessary page scrolling
do not allow content to disappear below the viewport
do not allow important controls to be hidden behind the bottom edge
do not create horizontal overflow
ensure the viewport height is properly respected

If content is larger than the available area, use the existing internal panel/card scrolling pattern, not full-page scrolling, where appropriate.

Do not shrink text to an unreadable size just to force everything into the viewport.

TASK 1 — FIX THE BACK BUTTON EVERYWHERE

The existing Back button is currently not functioning correctly.

For example, on the Citizen Shelter page, clicking:

← BACK

does not correctly return to the previous page.

Fix this.

Required behavior:

Every secondary/detail page across every role must have a working Back action.

Examples:

Citizen
Shelter details → Back
Safe Routes → Back
Alert details → Back
Help flow/detail pages → Back
Any future nested citizen page → Back
Responder

Every nested responder page must have Back.

Authority / Command

Every secondary authority page must have Back.

Resource Manager

Every secondary resource page must have Back.

Back behavior

The Back button should return to the actual previous application page/state, not blindly redirect to a random dashboard.

Prefer the application's existing routing/history mechanism.

If a page was opened directly and there is no valid previous application history, use the appropriate role home page as the fallback.

Do not break browser back navigation.

Do not create duplicate navigation history entries unnecessarily.

TASK 2 — CREATE THE NEXUS RESQ HOME / LANDING PAGE

There is currently no proper project-level HOME page.

Create the project's main landing page.

This is not a role dashboard.

It should be the initial entry point of Nexus ResQ.

The purpose is:

NEXUS RESQ

Emergency coordination and response platform.

The user should be able to understand the system and then select the appropriate role.

The Home page should provide role entry options for the four operational roles:

👤 CITIZEN

Report emergencies, receive alerts, find help, shelters and safe routes.

🚑 RESPONDER

Receive missions, accept assignments, update mission status and communicate operational needs.

🏛️ AUTHORITY / COMMAND

Monitor incidents, coordinate AI intelligence, approve decisions, dispatch responders and manage emergency operations.

📦 RESOURCE MANAGER

Manage shelters, supplies, ambulances, equipment and resource allocation.

IMPORTANT

Do not create a generic SaaS landing page.

Do not introduce a completely different visual language.

The Home page should feel like a natural entry point into the existing Nexus ResQ system.

Keep the existing Nexus ResQ identity.

The user should select a role and then enter the appropriate role-based authentication/interface.

TASK 3 — ROLE-BASED ACCESS MUST REMAIN STRICT

The system has exactly these four operational roles:

Citizen
Responder
Authority / Command
Resource Manager

The Home page may allow users to choose which role they want to access.

However:

Role selection must NOT grant privileges.

Authentication and backend authorization remain the source of truth.

A Citizen must not be able to access Authority / Command merely by clicking it.

A Responder must not gain Authority permissions.

A Resource Manager must not gain Authority permissions.

An Authority user must not automatically gain Resource Manager permissions.

Preserve the existing RBAC implementation.

TASK 4 — FIX THE RESPONDER APPLICATION PAGE

The current responder/volunteer application page looks messy and text-heavy.

It currently resembles a long form that does not fit properly into the viewport.

Improve only the layout and presentation of this page.

The existing responder application functionality must remain intact.

Requirements:
Fit the application into a clean single-screen composition.
Avoid unnecessary page scrolling.
Group related fields logically.
Maintain the existing Nexus ResQ visual language.
Make the form visually structured.
Clearly distinguish required fields.
Keep validation messages visible.
Keep the submission action clearly accessible.
Do not remove any required existing field.
Do not change the backend payload unless absolutely necessary.
Do not create fake submission success.
Submit through the existing backend/API.
Preserve existing administrator verification workflow.

The final result should feel like an operational registration/application interface rather than a wall of text.

TASK 5 — CITIZEN ALERTS PAGE MUST ACTUALLY SHOW ALERTS

The Citizen interface currently has an ALERTS section, but the page is essentially empty.

This must be fixed.

The Alerts page should display actual alerts retrieved from the existing backend/database.

Examples of information that can be displayed only if supported by existing backend data:

Alert severity
Alert title
Incident reference
Location
Time
Status
Instructions
Affected area
Recommended action

Use the existing Nexus ResQ visual language.

Do not populate the page with fake alerts.

If there are no real alerts:

Show an appropriate:

NO ACTIVE ALERTS

state instead of dummy content.

TASK 6 — CITIZEN SHELTER PAGE

The existing Shelter page already has the correct general concept.

Preserve it.

The Back button must work.

The page must remain readable within the viewport.

Shelter information must come from the backend/database.

Do not hardcode:

capacity
occupancy
distance
availability
status

If those values already come from APIs, continue using those APIs.

TASK 7 — FIX CITIZEN SAFE ROUTES VIEWPORT BUG

There is a layout problem on the Citizen Safe Routes page.

As shown in the provided screenshot/video, content at the lower/right side becomes hidden or clipped when the Safe Routes page is opened.

Fix the layout so that:

all important content is visible
no important controls are cut off
no bottom-right information disappears
the map/route area remains usable
route information remains readable
controls remain accessible
the existing visual design remains unchanged

Do not simply reduce the entire UI scale.

Correct the underlying:

height calculations
flex/grid sizing
overflow behavior
viewport constraints
panel dimensions

where necessary.

Use the existing responsive layout system.

TASK 8 — BACK BUTTON MUST EXIST ON EVERY ROLE'S PAGES

Perform a complete route audit.

Check:

Citizen

Home
Get Help
Alerts
Shelters
Safe Routes
Any detail pages

Responder

Home/dashboard
Missions
Mission details
Resources/requests where applicable
Profile/application-related pages

Authority / Command

Home
Command Orbit
Incidents
Intelligence
Dispatch
Evacuation
Operations
Agent-related/detail pages
Approval/detail pages

Resource Manager

Overview/Home
Shelters
Supplies
Ambulances
Equipment
Dispatch/records/detail pages

Every secondary page must have a usable Back action.

Do not add Back to a page where it would conflict with an existing primary navigation control; instead integrate it using the existing design system.

TASK 9 — DO NOT CREATE DUPLICATE NAVIGATION

There have previously been duplicated navigation structures such as:

COMMAND / INCIDENTS / INTELLIGENCE / DISPATCH / EVACUATION / OPERATIONS

appearing both in upper navigation and secondary navigation.

Likewise, Resource Manager previously had duplicated:

OVERVIEW / SHELTERS / SUPPLIES / AMBULANCES / EQUIPMENT / REQUESTS

navigation.

Do not recreate this problem.

There should be a clear distinction between:

Global role navigation

and

Page-specific controls

Do not display the same navigation twice unless it has a genuinely different purpose.

The existing previously requested navigation structure should remain:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH

for Authority / Command.

Resource Manager should contain only its intended operational sections, with Requests remaining an Authority/Admin function, not a Resource Manager request inbox.

Do not reintroduce removed/duplicate navigation.

TASK 10 — PRESERVE THE AI AGENT ARCHITECTURE

The Authority / Command interface already has the multi-agent concept based on the existing ResQ Pilot architecture.

Do not replace it.

Do not invent a different agent architecture.

The existing 11-agent orchestration must remain consistent with the implementation already established for Nexus ResQ.

The agents must execute in their proper dependency/order.

Do not display an agent as:

100% COMPLETE

before its actual stage has executed.

Analytics/final analysis must occur at the appropriate final stage, not prematurely.

Agent status must represent actual backend/processing state wherever the existing architecture supports it.

Do not fake progress.

Do not create fake agent activity merely to make the UI appear alive.

TASK 11 — FINAL VALIDATION

After making these changes, test the application as an actual user.

Test:

Landing

Home → role selection

Citizen

Home → Get Help
Home → Alerts
Home → Shelters
Shelter → Back
Home → Safe Routes
Safe Routes → Back

Verify no content is clipped.

Responder

Application page
Navigation
Back buttons
Authentication
Existing responder functionality

Authority

Navigation
Command Orbit
Incidents
Intelligence
Dispatch
Evacuation
Operations
Back buttons
AI agent sequence
Approval flow

Resource Manager

Overview
Shelters
Supplies
Ambulances
Equipment
Records/dispatch information
Back buttons

🚨 FINAL NON-NEGOTIABLE CHECKLIST

Before considering the task complete, verify all of the following:

 No mock data added.
 No demo data added.
 No hardcoded operational values added.
 All operational data comes from the existing database/backend.
 Home/Landing page exists.
 Home allows role selection.
 Role selection does not bypass RBAC.
 Four roles remain the only operational roles.
 Back works correctly.
 Back exists on every required secondary page.
 Browser history remains functional.
 Responder application page is properly structured.
 Responder application fits within the intended viewport.
 Citizen Alerts displays real backend data.
 Citizen Alerts has a proper empty state when no alerts exist.
 Citizen Shelter page remains functional.
 Citizen Safe Routes no longer clips/hides content.
 No unnecessary full-page scrolling introduced.
 No duplicate navigation introduced.
 Existing Authority navigation remains intact.
 Existing Resource Manager navigation remains intact.
 Resource Manager does not regain the Authority request-management interface.
 Existing 11-agent architecture remains intact.
 Agents execute in the correct sequence.
 Analytics does not show completion before its actual stage.
 No fake agent progress.
 Existing human approval functionality remains intact.
 Existing authentication remains intact.
 Existing RBAC remains intact.
 Existing APIs remain compatible.
 Existing database remains compatible.
 Required persistent changes are saved in the database.
 No 500 errors.
 No 404 errors.
 No CORS errors.
 No broken API calls.
 No authentication errors.
 No console-breaking frontend errors.
 No backend/server startup errors.
 No unrelated files/functions have been modified.
 No existing UI redesign has been performed.
 No existing animations have been changed.
 No existing visual theme has been changed.
MOST IMPORTANT IMPLEMENTATION PRINCIPLE

This is a controlled correction and completion task, NOT a redesign.

First inspect the existing implementation and understand:

current routing
current authentication
current RBAC
current API integrations
current database-backed data flow
current role layouts
current reusable components
current Authority/Command agent implementation
current Citizen pages
current Responder pages
current Resource Manager pages

Then make the minimum necessary changes.

Do not rebuild components that already work.

Do not replace working APIs.

Do not introduce mock data.

Do not make assumptions about backend data.

Do not change unrelated functionality.

Preserve everything that already works and fix only what has been explicitly requested above.

After implementation, perform a complete route/API/console sanity check and report exactly which files/functions were changed and why.