NEXUS RESQ — CRITICAL ROLE-BASED ACCESS CONTROL FIX
====================================================

IMPORTANT: THIS IS A BUG FIX, NOT A UI REDESIGN.

I have identified a serious role-isolation issue in the Nexus ResQ application.

CURRENT BUG
-----------

When clicking:

AUTHORITY / COMMAND

the interface shows two role options:

- AUTHORITY / COMMAND
- RESOURCE MANAGER

Likewise, when clicking:

RESOURCE MANAGER

the interface ALSO shows:

- AUTHORITY / COMMAND
- RESOURCE MANAGER

This is incorrect.

Both role interfaces currently expose the ability to switch between the two operational roles.

The application must NOT work this way.

====================================================
REQUIRED ROLE-BASED BEHAVIOR
====================================================

Nexus ResQ has role-based access.

The two operational roles are:

1. AUTHORITY / COMMAND
2. RESOURCE MANAGER

After authentication, the user's role must determine which operational interface they are allowed to access.

----------------------------------------------------
AUTHORITY / COMMAND USER
----------------------------------------------------

If the authenticated user has the:

AUTHORITY / COMMAND

role:

They must ONLY see and access the Authority / Command interface.

They must NOT see:

- RESOURCE MANAGER role switch
- RESOURCE MANAGER role selector
- Resource Manager navigation
- Resource Manager dashboard
- Any UI control allowing them to change into Resource Manager

The Authority user should enter directly into their authorized Authority / Command environment.

----------------------------------------------------
RESOURCE MANAGER USER
----------------------------------------------------

If the authenticated user has the:

RESOURCE MANAGER

role:

They must ONLY see and access the Resource Manager interface.

They must NOT see:

- AUTHORITY / COMMAND role switch
- Authority role selector
- Authority / Command dashboard
- Authority / Command navigation
- Any UI control allowing them to change into Authority / Command

The Resource Manager should enter directly into their authorized Resource Manager environment.

====================================================
NO ROLE SWITCHING FROM THE FRONTEND
====================================================

DO NOT provide a frontend dropdown, button, toggle, selector or navigation item that allows:

AUTHORITY → RESOURCE MANAGER

or

RESOURCE MANAGER → AUTHORITY

The role is determined by authentication and authorization.

The user cannot simply change their role by clicking a UI element.

====================================================
BACKEND AUTHORIZATION IS MANDATORY
====================================================

Do NOT solve this only by hiding buttons in the frontend.

The backend must enforce the user's actual role.

Frontend visibility:

             +
Backend authorization:

             BOTH REQUIRED

If an Authority user manually attempts to access a Resource Manager route/API:

→ backend must reject unauthorized access.

If a Resource Manager user manually attempts to access an Authority route/API:

→ backend must reject unauthorized access.

Do not rely on frontend route hiding as the security mechanism.

====================================================
IMPORTANT — PRESERVE EXISTING AUTHENTICATION
====================================================

The existing login/signup/authentication system is already implemented.

DO NOT rewrite it.

DO NOT replace the authentication architecture.

DO NOT change password handling.

DO NOT change token/session handling unnecessarily.

DO NOT change existing working authentication APIs unless absolutely required for this role-isolation fix.

First inspect how the existing application currently determines:

- authenticated user
- user ID
- role
- session/token
- authorization
- protected routes

Then use the existing mechanism.

If the role is already available in the authenticated user/session/token, reuse it.

DO NOT create a second role-management system.

====================================================
ROLE → INTERFACE MAPPING
====================================================

The expected behavior is:

LOGIN
  ↓
AUTHENTICATED USER
  ↓
READ AUTHENTICATED ROLE
  ↓
┌─────────────────────────────┐
│                             │
│ AUTHORITY / COMMAND         │ RESOURCE MANAGER
│                             │
↓                             ↓
AUTHORITY INTERFACE           RESOURCE MANAGER INTERFACE
ONLY                           ONLY


There must NOT be:

LOGIN
  ↓
COMMON ROLE SELECTION SCREEN
  ↓
Choose Authority / Resource Manager

unless the existing authentication architecture explicitly requires such a role-selection mechanism.

The user's authorized role should determine the interface.

====================================================
DIRECT URL ACCESS MUST ALSO BE PROTECTED
====================================================

This is extremely important.

Do not only fix the visible buttons.

Test direct navigation.

For example, if a Resource Manager user manually enters the Authority route in the browser:

/authority/...

they must NOT gain access.

Likewise, if an Authority user manually enters:

/resource-manager/...

they must NOT gain access.

The protected route must verify authorization.

If unauthorized:

→ redirect to the user's own authorized interface

OR

→ show a proper unauthorized/access-denied state

Do not expose the protected page before redirecting.

====================================================
API ACCESS MUST ALSO BE PROTECTED
====================================================

Inspect the existing API authorization.

If there are Authority-only APIs and Resource-Manager-only APIs, ensure the authenticated user's role is checked before allowing access.

Example:

AUTHORITY USER
→ Authority APIs: ALLOWED
→ Resource Manager APIs: DENIED

RESOURCE MANAGER USER
→ Resource Manager APIs: ALLOWED
→ Authority APIs: DENIED

Do NOT modify unrelated APIs.

Only touch authorization logic directly involved in this role isolation.

====================================================
ROLE-SPECIFIC NAVIGATION
====================================================

AUTHORITY / COMMAND navigation should contain ONLY the navigation that belongs to Authority.

RESOURCE MANAGER navigation should contain ONLY the navigation that belongs to Resource Manager.

There must be no shared role-switching header such as:

[ AUTHORITY / COMMAND ] [ RESOURCE MANAGER ]

inside either operational panel.

The role indicator may remain if it is part of the existing design, but it must be informational, not a switch.

For example:

AUTHORITY / COMMAND

should identify the current role.

It must NOT behave as:

"click me to change role".

Likewise:

RESOURCE MANAGER

must only identify the current role.

====================================================
DO NOT BREAK EXISTING FUNCTIONALITY
====================================================

This is an existing working Nexus ResQ project.

The following are PROTECTED:

- Existing authentication
- Existing signup
- Existing login
- Existing database
- Existing APIs
- Existing API contracts
- Existing role data
- Existing routing architecture
- Existing Authority interface
- Existing Resource Manager interface
- Existing UI
- Existing design
- Existing animations
- Existing typography
- Existing colors
- Existing components
- Existing agent system
- Existing incident system
- Existing dispatch system
- Existing shelter system
- Existing supply system
- Existing ambulance system
- Existing equipment system
- Existing database persistence
- Existing backend configuration
- Existing environment configuration

DO NOT redesign anything.

DO NOT refactor unrelated code.

DO NOT improve unrelated functionality.

DO NOT change existing screens simply because you think they can be improved.

ONLY fix the role isolation problem described in this prompt.

====================================================
REAL DATABASE DATA ONLY
====================================================

Do not introduce:

- Demo users
- Mock roles
- Fake users
- Hardcoded role switching
- Static authorization values
- Fake operational data

The authenticated user's actual role must come from the existing authentication/database/backend mechanism.

Do not hardcode:

role = "authority"

or

role = "resource_manager"

for all users.

Use the actual authenticated user's role.

====================================================
DATABASE PERSISTENCE
====================================================

If the existing system stores user roles in the database, continue using that mechanism.

Do NOT create a frontend-only role.

If any role-related modification is genuinely required:

FRONTEND
   ↓
BACKEND
   ↓
DATABASE

must remain the source of truth.

The frontend must never become the authority for assigning itself a role.

====================================================
NO SERVER ERRORS
====================================================

This fix must NOT introduce:

- HTTP 500 errors
- Database errors
- Authentication errors
- Token errors
- Session errors
- CORS errors
- Broken API endpoints
- Broken imports
- Route errors
- Startup errors
- Authorization exceptions
- Frontend runtime errors

The existing backend must continue starting normally.

The existing frontend must continue running normally.

====================================================
IMPORTANT SECURITY RULE
====================================================

DO NOT implement this solution as:

if role === "authority":
    show authority
else:
    show resource manager

alone.

That is insufficient.

The system must have:

1. Frontend role-based rendering
2. Protected frontend routes
3. Backend authorization
4. API-level role enforcement

where applicable within the existing architecture.

The backend/database remains the source of truth.

====================================================
TEST THESE EXACT SCENARIOS
====================================================

TEST 1
------

Login using an Authority / Command account.

Expected:

AUTHORITY / COMMAND interface opens.

Resource Manager option:

NOT VISIBLE.

Resource Manager route:

NOT ACCESSIBLE.

Resource Manager APIs:

NOT AUTHORIZED.


TEST 2
------

Login using a Resource Manager account.

Expected:

RESOURCE MANAGER interface opens.

Authority / Command option:

NOT VISIBLE.

Authority route:

NOT ACCESSIBLE.

Authority APIs:

NOT AUTHORIZED.


TEST 3
------

Refresh the page.

Expected:

The user's role remains unchanged.

The correct role-specific interface remains open.

No role selection screen appears.


TEST 4
------

Logout and login as another role.

Expected:

The newly authenticated user's authorized interface opens.

The previous user's role must not leak into the new session.


TEST 5
------

Attempt direct URL access to the opposite role.

Expected:

ACCESS DENIED / REDIRECT.

The unauthorized dashboard must never become accessible.


TEST 6
------

Open browser developer tools and attempt to manually manipulate frontend state.

Expected:

This must NOT grant access to the other role.

Backend authorization must still reject unauthorized requests.


TEST 7
------

Refresh after navigating through multiple role-specific pages.

Expected:

No broken routes.

No accidental role switching.

No blank screen.

No 404.

No 500.


====================================================
CRITICAL SESSION / STATE REQUIREMENT
====================================================

Check for any existing frontend state such as:

- selectedRole
- activeRole
- currentPanel
- role
- userRole
- dashboardType
- interfaceType

If such state is currently being used to allow users to switch between Authority and Resource Manager, DO NOT blindly delete it.

Determine whether it is required elsewhere.

Modify only the minimum logic necessary so that:

AUTHENTICATED ROLE
        ↓
AUTHORIZED ROLE
        ↓
AUTHORIZED INTERFACE

becomes the source of the displayed panel.

Do not break unrelated state management.


====================================================
FINAL ACCEPTANCE CRITERIA
====================================================

The bug is considered FIXED only when:

[ ] Authority user sees Authority / Command only.

[ ] Resource Manager user sees Resource Manager only.

[ ] Authority cannot switch to Resource Manager.

[ ] Resource Manager cannot switch to Authority.

[ ] No role-selection buttons appear inside either operational interface.

[ ] Role comes from the existing authenticated user.

[ ] Frontend routes are role protected.

[ ] Backend authorization is enforced.

[ ] Opposite-role API access is rejected.

[ ] Direct URL manipulation cannot bypass authorization.

[ ] Refresh preserves the correct role.

[ ] Logout/login correctly changes the authorized interface.

[ ] Existing authentication continues working.

[ ] Existing APIs continue working.

[ ] Existing database continues working.

[ ] Existing UI remains unchanged except for removing the incorrect role-switching behavior.

[ ] Existing animations remain unchanged.

[ ] Existing design remains unchanged.

[ ] Existing Authority functionality remains unchanged.

[ ] Existing Resource Manager functionality remains unchanged.

[ ] No mock/demo role data is introduced.

[ ] No mock/demo operational data is introduced.

[ ] No database configuration is changed unnecessarily.

[ ] No environment configuration is changed unnecessarily.

[ ] No unrelated API is modified.

[ ] No server errors are introduced.

[ ] No frontend runtime errors are introduced.

====================================================
ABSOLUTE INSTRUCTION
====================================================

THIS IS A ROLE-ISOLATION BUG FIX.

DO NOT REDESIGN NEXUS RESQ.

DO NOT REBUILD AUTHENTICATION.

DO NOT REBUILD THE DASHBOARDS.

DO NOT CHANGE THE EXISTING DESIGN.

DO NOT CHANGE ANIMATIONS.

DO NOT MODIFY UNRELATED APIs.

DO NOT MODIFY UNRELATED DATABASE TABLES.

DO NOT INTRODUCE MOCK DATA.

DO NOT CREATE A NEW ROLE SYSTEM.

DO NOT ALLOW FRONTEND ROLE SWITCHING.

USE THE EXISTING AUTHENTICATION + DATABASE ROLE AS THE SOURCE OF TRUTH.

Make the SMALLEST POSSIBLE SAFE CHANGE required to enforce:

AUTHORITY ACCOUNT
       ↓
AUTHORITY / COMMAND ONLY

RESOURCE MANAGER ACCOUNT
       ↓
RESOURCE MANAGER ONLY

Nothing else should be changed.

Before making changes, inspect the existing authentication, role, routing and authorization implementation and identify exactly where the unwanted role switching is originating.

After the fix, test both roles and direct unauthorized route/API access before declaring the task complete.