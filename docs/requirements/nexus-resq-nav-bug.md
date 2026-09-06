NEXUS RESQ — STRICT NAVIGATION BUG FIX ONLY

IMPORTANT: This is a surgical bug-fix task.

DO NOT redesign, refactor, optimize, rewrite, or modify any part of the existing NEXUS RESQ project except the exact navigation/back-button behavior described below.

The existing project is already implemented and working. Treat every existing feature, API, database operation, UI component, styling, animation, routing structure, authentication logic, role logic, and backend behavior as WORKING and PROTECTED.

==================================================
BUG TO FIX
==================================================

Current behavior:

From the NEXUS RESQ HOME page, when the user selects any role:

• CITIZEN
• RESPONDER
• AUTHORITY / COMMAND
• RESOURCE MANAGER

the system correctly redirects to the intended role/access page.

However, when the user presses the BACK button from that role/access page, the application does NOT return to the HOME page.

Instead, it navigates to an intermediate role-selection/access page containing content such as:

"NEXUS
RESQ

SYSTEM OPERATIONAL

SELECT YOUR ACCESS TYPE

WHO ARE YOU?

Your role determines your interface and permissions.

CITIZEN
Report emergencies · Find shelter · Stay safe
LOG IN
SIGN UP

RESPONDER
Execute missions · Update status · Request resources
LOG IN
APPLY

AUTHORITY / COMMAND
Assigned by organization

RESOURCE MANAGER
Assigned by organization

These roles are assigned by backend administrators.
Self-registration is not available.

AUTHORIZED ACCESS ONLY · ALL SESSIONS LOGGED · FOUR OPERATIONAL ROLES"

This intermediate page must NOT appear in the Back navigation flow when the user has arrived there by selecting a role from the HOME page.

==================================================
REQUIRED BEHAVIOR
==================================================

1. HOME → ROLE

When the user is on the HOME page and selects:

CITIZEN
RESPONDER
AUTHORITY / COMMAND
RESOURCE MANAGER

the existing forward navigation must continue working exactly as it currently does.

DO NOT change where these buttons currently take the user.

--------------------------------------------------

2. ROLE PAGE → BACK

When the user presses the BACK button from the resulting role/access page:

MUST GO DIRECTLY TO:

HOME PAGE

It must NOT go to:

• the "SELECT YOUR ACCESS TYPE" page
• the role-selection page
• the login-selection page
• any intermediate authentication-selection screen
• any previous internal role-selection route

The intended navigation is:

HOME
  ↓
Selected Role / Access Page
  ↓ BACK
HOME

NOT:

HOME
  ↓
Selected Role / Access Page
  ↓ BACK
SELECT YOUR ACCESS TYPE
  ↓
HOME

--------------------------------------------------

3. "BACK TO HOME" BUTTON

There is also a page containing:

"← BACK TO HOME"

This button is currently not working correctly.

Make this button reliably navigate directly to the HOME page.

Expected behavior:

BACK TO HOME
      ↓
HOME

Do not use browser history if that would potentially return to an intermediate role-selection page.

The action should explicitly resolve to the project's existing HOME route.

--------------------------------------------------

4. AUTHORITY / COMMAND LOGIN BACK BUTTON

The Authority / Command authentication/access page has a BACK button.

That BACK button must also return directly to HOME.

Expected:

HOME
  ↓
AUTHORITY / COMMAND ACCESS / LOGIN
  ↓ BACK
HOME

Do NOT send the user to the generic role-selection page.

--------------------------------------------------

5. RESOURCE MANAGER

Apply the same navigation rule to RESOURCE MANAGER.

Expected:

HOME
  ↓
RESOURCE MANAGER ACCESS / LOGIN
  ↓ BACK
HOME

--------------------------------------------------

6. RESPONDER

Apply the same navigation rule to RESPONDER.

Expected:

HOME
  ↓
RESPONDER ACCESS / LOGIN / APPLICATION
  ↓ BACK
HOME

--------------------------------------------------

7. CITIZEN

Apply the same navigation rule to CITIZEN role/access navigation.

Expected:

HOME
  ↓
CITIZEN ACCESS
  ↓ BACK
HOME

Do NOT disturb the already-working:

• GET EMERGENCY HELP flow
• CITIZEN SIGN UP flow
• CITIZEN LOGIN flow
• emergency request flow
• existing citizen pages

Only correct the BACK navigation where necessary.

==================================================
CRITICAL ROUTING REQUIREMENT
==================================================

Do NOT simply call:

history.back()

unless you have verified that the browser history for every entry path guarantees HOME as the previous page.

The problem indicates that browser history currently contains an unwanted intermediate role-selection page.

Therefore, for these specific BACK / BACK TO HOME controls, use the application's existing explicit HOME route/navigation mechanism so that the destination is deterministic.

The desired result is:

BACK → HOME

not:

BACK → previous browser history entry.

Use the existing routing system and existing HOME route already present in the project.

Do not introduce a new routing library.

Do not replace the project's router.

Do not restructure routing.

Do not modify unrelated routes.

==================================================
VERY IMPORTANT — DO NOT MODIFY THE ROLE SYSTEM
==================================================

The following must remain completely unchanged:

• Role-based authentication
• Role permissions
• Role-specific dashboards
• Citizen access
• Responder access
• Authority / Command access
• Resource Manager access
• Admin authorization
• Backend role validation
• Session handling
• Authentication APIs
• Authorization APIs
• Protected routes
• Logout behavior
• Existing login behavior
• Existing signup behavior
• Existing emergency-help behavior

The ONLY change is the incorrect BACK navigation described above.

==================================================
DO NOT TOUCH EXISTING UI
==================================================

Do NOT change:

• UI design
• layout
• typography
• fonts
• font widths
• colors
• spacing
• cards
• buttons' visual appearance
• animations
• transitions
• backgrounds
• icons
• responsive behavior
• headers
• navigation bars
• sidebars
• dashboards
• page content

The BACK button should visually remain exactly as it is.

Only its navigation behavior should be corrected.

==================================================
DATABASE / API REQUIREMENTS
==================================================

This task should require NO database changes.

Do not create demo data.

Do not add mock data.

Do not add static operational data.

All existing project data must continue to come from the real database wherever the existing application already does so.

Do not modify any API that is unrelated to this navigation bug.

If a routing change technically touches a shared component, preserve all existing API behavior and functionality.

There must be:

• NO backend server errors
• NO API regressions
• NO authentication regressions
• NO database errors
• NO startup errors
• NO new console errors
• NO broken existing routes

==================================================
SCOPE CONTROL — EXTREMELY IMPORTANT
==================================================

ONLY fix:

1. BACK from role/access pages → HOME
2. BACK TO HOME → HOME
3. Authority / Command BACK → HOME
4. Resource Manager BACK → HOME
5. Responder BACK → HOME
6. Citizen BACK where applicable → HOME

Nothing else.

Do NOT use this task as an opportunity to:

• refactor routing
• clean up code
• rename components
• reorganize folders
• rewrite authentication
• improve UI
• improve responsiveness
• change APIs
• modify database schemas
• change role logic
• change existing page behavior
• modify emergency functionality
• modify dashboards
• modify animations
• add features
• remove features

==================================================
VALIDATION / TESTING
==================================================

After making the minimal change, test these exact flows:

TEST 1:
HOME
→ CITIZEN
→ BACK
Expected: HOME

TEST 2:
HOME
→ RESPONDER
→ BACK
Expected: HOME

TEST 3:
HOME
→ AUTHORITY / COMMAND
→ BACK
Expected: HOME

TEST 4:
HOME
→ RESOURCE MANAGER
→ BACK
Expected: HOME

TEST 5:
Open the generic role/access page if it is still reachable through its existing intended route.
Click:
"← BACK TO HOME"
Expected: HOME

TEST 6:
Open Authority / Command login/access page.
Click BACK.
Expected: HOME.

TEST 7:
Verify:
⚠ GET EMERGENCY HELP
still works exactly as it did before.

TEST 8:
Verify Citizen SIGN UP still opens the existing Citizen signup page.

TEST 9:
Verify Citizen LOGIN still opens the existing login flow.

TEST 10:
Verify all existing role-based protected pages still work after login.

==================================================
SUCCESS CRITERIA
==================================================

The fix is successful ONLY if:

HOME → ROLE → BACK = HOME

for every role.

And:

BACK TO HOME = HOME

The intermediate:

"SELECT YOUR ACCESS TYPE / WHO ARE YOU?"

page must no longer appear as the destination of these BACK actions.

The browser history must not cause the user to be trapped in the unwanted role-selection page.

Everything else in the existing application must remain unchanged.

==================================================
FINAL SAFETY RULE
==================================================

Before modifying anything:

1. Inspect the existing routing/navigation implementation.
2. Identify exactly why BACK currently resolves to the intermediate role-selection page.
3. Make the smallest possible change.
4. Reuse the existing HOME route.
5. Do not modify unrelated files unless absolutely required.
6. If a shared navigation component is involved, change ONLY the relevant BACK navigation handler.
7. Preserve every existing API, database, authentication, authorization, UI, animation, and functionality.

DO NOT assume that because this prompt exists, other parts of the project need improvement.

THE EXISTING PROJECT IS CONSIDERED CORRECT EXCEPT FOR THE SPECIFIC BUG DESCRIBED ABOVE.

Make the smallest surgical fix possible.