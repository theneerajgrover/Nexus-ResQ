ANTIGRAVITY PROMPT — NEXUS RESQ FINAL AUTHENTICATION + EMERGENCY FLOW FIX

You are working on the existing NEXUS RESQ project.

I need you to make the following changes only. Before modifying anything, inspect the existing frontend routing, authentication flow, role-based access control, API integrations, database models, and current page structure so that you understand what is already implemented and working.

⚠️ CRITICAL PROJECT RULES — MUST FOLLOW

These are hard requirements, not suggestions.

1. DO NOT BREAK EXISTING FUNCTIONALITY

The project already contains working functionality.

Do NOT unnecessarily modify:

Existing APIs
Existing API endpoints
Existing database logic
Existing authentication logic that is already working
Existing RBAC/role permissions
Existing routing that is working
Existing UI components
Existing layouts
Existing animations
Existing styling
Existing dashboards
Existing backend services
Existing database structure
Existing working pages
Existing agent orchestration logic
Existing incident logic
Existing dispatch logic
Existing resource-management logic

Only modify the exact functionality mentioned in this prompt.

If an existing function absolutely must be modified to implement one of these changes, make the smallest possible change and verify that every other consumer of that function continues to work.

2. REAL DATABASE DATA ONLY

NEVER display demo, mock, hardcoded, placeholder, fabricated, or static operational data on the frontend.

All operational information must come from the existing backend/database.

This applies to:

Emergency requests
Citizen accounts
User roles
Incidents
Resources
Shelters
Dispatch
Responders
Alerts
Notifications
Agent status
Operational information

If data does not exist in the database, show an appropriate empty state rather than inventing data.

Do not create fake records simply to make the UI look populated.

3. DATABASE PERSISTENCE

Anything that is supposed to be saved must actually be persisted in the existing database.

For example:

Citizen registration
Emergency help request
Emergency location
Emergency category
Requested assistance
Relevant request status

Do not store operational information only in frontend state/localStorage if the existing architecture expects database persistence.

4. NO BACKEND/SERVER ERRORS

This is extremely important.

After making the changes:

No FastAPI/server errors
No 500 errors
No broken API requests
No database connection errors
No schema errors
No migration errors
No CORS errors
No runtime exceptions
No broken authentication requests
No broken existing endpoints

Do not introduce an unusual backend change that forces me to rebuild or reconfigure my existing setup.

Preserve the existing backend environment and configuration.

5. DO NOT REBUILD THE PROJECT

Do not treat this task as a redesign or rewrite.

The project is already implemented.

Think:

BUG FIX + TARGETED FEATURE IMPLEMENTATION

NOT:

REBUILD THE APPLICATION

CURRENT ISSUES TO FIX
1. HOME PAGE — EMERGENCY BUTTON

Currently the home page contains:

⚠ GET EMERGENCY HELP

When clicked, it incorrectly redirects to the login page.

Required behavior:

The emergency button must NOT require login.

When the user clicks:

⚠ GET EMERGENCY HELP

they must be taken directly to an Emergency Help / Raise Emergency Request interface.

The user should immediately be able to report an emergency.

Do NOT redirect the user to:

Login
Authority login
Responder login
Resource Manager login
2. EMERGENCY HELP FLOW

Create/fix the emergency help flow using the existing NEXUS RESQ design language.

The flow should ask the citizen for the essential information required to raise an emergency request.

At minimum include:

Emergency type/category

Examples should come from the project's actual supported categories/data model where available.

Possible categories may include:

Medical
Fire
Flood
Structural collapse
Evacuation
Accident
Rescue
Other emergency

Do not hardcode categories if the backend already provides them. Reuse the existing source of truth.

Location

Provide an appropriate location input based on the existing architecture.

If the project already has location functionality, reuse it.

Do not create a completely separate location system.

Assistance required

The citizen should clearly be able to specify what kind of assistance is required.

For example:

Medical assistance
Rescue team
Ambulance
Evacuation
Fire response
Shelter assistance
Supplies
Other

Again, use existing backend/database definitions if available.

Additional information

Allow the citizen to provide relevant details about the emergency.

3. EMERGENCY REQUEST MUST BE SAVED

When the citizen submits the emergency request:

SAVE IT TO THE DATABASE.

Do not simply show:

"Emergency submitted"

without actually persisting the request.

The request should enter the existing emergency/incident/request workflow if such functionality already exists.

Do not create a parallel emergency system if the backend already has a request/incident model.

Reuse the existing API and database architecture wherever possible.

4. HOME PAGE ROLE CARDS

The home page currently contains:

👤 CITIZEN

Alerts · Shelters · Routes · Help

🚑 RESPONDER

Missions · Navigation

🏛️ AUTHORITY

Command · Intelligence · Dispatch

📦 RESOURCE MGR

Shelters · Supplies · Equipment

These role cards/buttons currently have incorrect navigation behavior where clicking them can send the user into the generic login flow.

Fix this without breaking the existing role-based authentication architecture.

REQUIRED

Maintain strict role-based authentication and authorization.

There must NOT be one generic authentication route that allows users to access every role.

The application must preserve separation between:

CITIZEN
RESPONDER
AUTHORITY / COMMAND
RESOURCE MANAGER

Each role must reach its appropriate authentication/access flow.

Important:

Do not allow:

Citizen → Authority Dashboard

Responder → Resource Manager Dashboard

Resource Manager → Authority Dashboard

etc.

The backend must remain the final authority for role authorization.

Do not rely only on frontend route hiding.

5. LOG IN BUTTON ON HOME PAGE

The home page has a:

LOG IN

button.

This button should ONLY open the login/authentication page.

It must not:

Open emergency help
Open a role dashboard
Automatically authenticate anyone
Redirect directly to Authority
Redirect directly to Responder
Redirect directly to Resource Manager

Preserve the existing authentication architecture.

6. SIGN UP AS CITIZEN

The home page contains:

SIGN UP AS CITIZEN

This button currently incorrectly routes through login.

REQUIRED:

Clicking:

SIGN UP AS CITIZEN

must directly open the Citizen Account Registration / Create Account page.

Flow:

HOME → SIGN UP AS CITIZEN → CITIZEN REGISTRATION

NOT:

HOME → LOGIN → SIGNUP

and NOT:

HOME → GENERIC LOGIN → ROLE SELECTION

7. CITIZEN SIGNUP FORM

The Citizen registration page must contain a proper:

Confirm Password

field.

The form should therefore have password confirmation validation.

The user should not be able to submit if:

Password ≠ Confirm Password

Show an appropriate validation message using the existing project's UI language.

Do not modify unrelated registration fields or existing validation.

8. CITIZEN REGISTRATION MUST USE EXISTING AUTH API

Do not create a second authentication system.

Use the existing registration API/backend logic if available.

The new Citizen registration form should:

Validate fields.
Validate password confirmation.
Submit through the existing appropriate API.
Persist the citizen account in the database.
Respect the existing role model.
Handle API errors properly.
Not break existing authentication.

The newly registered account must be assigned the correct CITIZEN role according to the existing backend architecture.

Do not allow users to self-select privileged roles.

9. LOGIN PAGE MUST HAVE BACK BUTTON

Whenever the login page is opened from the home page, there must be a clearly visible:

← BACK

button.

It must return the user to the HOME PAGE.

Do not use browser-history behavior that can accidentally send the user somewhere unrelated.

The intended flow should be:

HOME → LOGIN → BACK → HOME

10. AUTHORITY / COMMAND LOGIN BACK BUTTON BUG

There is currently a bug on the AUTHORITY / COMMAND login page.

The Back button is visible but is not properly clickable/working.

Fix this.

The Authority login page must have a functional:

← BACK

button.

Expected behavior:

AUTHORITY LOGIN → BACK → HOME

The button must:

Actually receive pointer/click events
Not be blocked by an overlay
Not be disabled accidentally
Not be behind another element
Not trigger form submission
Not cause a server/API request
Not produce a console error

Inspect the actual DOM/layout/z-index/pointer-events/routing issue rather than simply adding another button on top.

11. BACK BUTTON CONSISTENCY

Maintain the previous requirement across the whole NEXUS RESQ project:

Every page that is not a primary landing page should have an appropriate Back option where navigation back is logically required.

This applies across:

CITIZEN
Alerts
Shelters
Safe Routes
Help
Emergency request
Login
Signup
Detail pages
RESPONDER
Mission
Incidents
Navigation
Resources
Alerts
Detail pages
AUTHORITY / COMMAND
Home
Command Orbit
Intelligence
Evacuation
Operations
Incidents
Dispatch
Login
Detail/pop-up views
RESOURCE MANAGER
Shelters
Supplies
Ambulances
Equipment
Records
Detail pages

Do not redesign these pages.

Only ensure that navigation/back behavior works correctly where applicable.

12. IMPORTANT — DO NOT MAKE THE ROLE CARDS BYPASS SECURITY

The home page is a public landing page.

The role cards may direct users toward their appropriate role-specific access flow, but authentication and authorization must remain enforced by the backend.

Do not make frontend route changes that expose protected dashboards.

For example:

/home
   ↓
/login
   ↓
role-specific authentication
   ↓
backend validates credentials + role
   ↓
authorized dashboard

The backend must remain authoritative.

13. HOME PAGE MUST REMAIN A REAL PRODUCT LANDING PAGE

Do NOT convert the home page back into a login screen.

The home page should remain the project's public-facing NEXUS RESQ emergency-response landing page.

It should communicate:

What NEXUS RESQ is
What problem it solves
Emergency response coordination
Citizen assistance
Responder coordination
Authority command
Resource management
AI-assisted disaster coordination

And prominently provide:

⚠ GET EMERGENCY HELP

as the primary emergency action.

Authentication options such as:

LOG IN

and

SIGN UP AS CITIZEN

should remain secondary actions.

Do not redesign the entire home page.

Use the already established visual language.

14. PRESERVE CURRENT DESIGN LANGUAGE

Do not replace the existing NEXUS RESQ visual identity.

Preserve:

Typography system
Colors
Grid
Background treatment
Animations
Cards
Buttons
Borders
Spacing system
Navigation language
Visual hierarchy

Only make the minimum UI additions necessary for:

Emergency Help
Citizen Signup
Confirm Password
Back buttons
Correct routing

Do not randomly introduce a new design system.

15. NO DEMO DATA

This requirement applies especially to the new Emergency Help page.

Do NOT create things such as:

INC-2849
Demo Emergency
Demo Location
Test Citizen
Fake Medical Request
Sample Ambulance

just to populate the interface.

If the page has no existing requests, show a proper empty state.

Operational data must come from the backend/database.

16. DO NOT MODIFY UNRELATED API FUNCTIONS

If the emergency flow requires an existing API:

First inspect whether an appropriate endpoint already exists.

If it exists:

USE IT.

Do not create a duplicate endpoint.

If an existing endpoint needs a very small modification:

Preserve backward compatibility.
Preserve its existing response structure wherever possible.
Verify all existing callers.
Do not break other roles.
Do not change unrelated behavior.

Only create a new endpoint if the existing backend genuinely has no suitable mechanism.

17. DO NOT CHANGE EXISTING ROLE PERMISSIONS

The existing role architecture is important.

Do not weaken:

Authentication
Authorization
RBAC
Admin permissions
Authority permissions
Responder permissions
Resource Manager permissions
Citizen permissions

A citizen emergency request being public does not mean the citizen should receive access to protected dashboards.

The distinction must remain:

PUBLIC
   ↓
GET EMERGENCY HELP
   ↓
CREATE EMERGENCY REQUEST
   ↓
DATABASE

versus:

PROTECTED ROLE
   ↓
LOGIN
   ↓
AUTHENTICATION
   ↓
ROLE AUTHORIZATION
   ↓
ROLE DASHBOARD
18. VERIFY ROUTING

Before completing the task, test all important flows.

Home
HOME
 ├── GET EMERGENCY HELP
 │      └── Emergency Request
 │
 ├── LOG IN
 │      └── Login
 │            └── BACK → HOME
 │
 └── SIGN UP AS CITIZEN
        └── Citizen Signup
              └── Confirm Password
Authority
HOME
 ↓
AUTHORITY ACCESS
 ↓
AUTHORITY LOGIN
 ↓
BACK
 ↓
HOME
Citizen
HOME
 ↓
SIGN UP AS CITIZEN
 ↓
CITIZEN REGISTRATION
 ↓
ACCOUNT CREATED
Emergency
HOME
 ↓
GET EMERGENCY HELP
 ↓
SELECT EMERGENCY TYPE
 ↓
ENTER LOCATION
 ↓
SELECT REQUIRED ASSISTANCE
 ↓
ADD DETAILS
 ↓
SUBMIT
 ↓
DATABASE
19. TEST FOR CLICKABILITY

Specifically test the previously broken:

Authority Back button

and all newly introduced buttons.

Ensure no invisible element, modal, overlay, pointer-events, z-index, or form behavior prevents clicking.

20. TEST EXISTING APPLICATION AFTER CHANGES

After implementation, do not stop after checking the new page.

Verify that the following still work:

Citizen
Home
Login
Signup
Alerts
Shelters
Safe Routes
Help
Responder
Mission
Incidents
Navigation
Resources
Alerts
Authority
Home
Command Orbit
Intelligence
Evacuation
Operations
Incidents
Dispatch
Resource Manager
Shelters
Supplies
Ambulance
Equipment
Records

Verify that existing APIs still respond correctly.

21. NO REGRESSION

Before finishing, explicitly verify:

Existing login still works.
Existing role-based access still works.
Authority access still works.
Responder access still works.
Resource Manager access still works.
Citizen functionality still works.
Existing APIs still work.
Existing database connection still works.
Existing database records are untouched.
Existing UI is not unnecessarily changed.
Existing animations are not removed.
Existing navigation is not broken.
No duplicate navigation systems are introduced.
No duplicate login systems are introduced.
No mock data has been added.
No server errors have been introduced.
FINAL IMPLEMENTATION RULE

Do not make assumptions and start changing multiple files unnecessarily.

First inspect the project and determine:

Current routing architecture
Current authentication architecture
Current role/RBAC implementation
Existing citizen registration API
Existing emergency/request API
Existing database models
Existing home-page components
Existing login components
Existing Authority login route
Existing Back-button implementation

Then make the smallest possible set of changes required to satisfy this prompt.

If a working component already exists, reuse it rather than creating a duplicate.

If a working API already exists, reuse it rather than creating another API.

If a working database model already exists, reuse it rather than creating another data structure.

🚨 MOST IMPORTANT CONSTRAINT

DO NOT TOUCH WHAT IS ALREADY WORKING PERFECTLY.

The goal is not to redesign or rewrite NEXUS RESQ.

The goal is to make the specific authentication, navigation, emergency-help, and signup flows work correctly while preserving the existing project.

Real database data only.
No demo data.
No fake operational records.
No unnecessary API changes.
No broken APIs.
No server errors.
No database errors.
No RBAC/security regression.
No unnecessary UI changes.
No unnecessary design changes.
No unnecessary animation changes.
No rewriting existing functionality.
Everything that needs persistence must be saved in the database.

After implementation, perform a regression check across the existing application and only then consider the task complete.