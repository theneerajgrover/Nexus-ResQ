NEXUS RESQ — AUTHORITY / COMMAND AI AGENT ORCHESTRATION + OPERATIONAL INTELLIGENCE IMPLEMENTATION
🚨 CRITICAL — READ ALL REQUIREMENTS BEFORE MODIFYING ANYTHING

This task is for the existing Nexus ResQ project.

I am NOT asking you to redesign the project.

I am NOT asking you to rebuild the Authority / Command panel.

I am NOT asking you to replace existing functionality.

I am asking you to complete the pending AI-agent orchestration and operational intelligence functionality inside the existing Authority / Command interface.

The existing Nexus ResQ implementation already contains working UI, routing, APIs, database integration, authentication, animations, visual design and operational functionality.

Treat all existing working functionality as FROZEN.

Only implement the explicitly requested changes below.

1. PRIMARY OBJECTIVE

The Authority / Command section of Nexus ResQ currently has the general structure of an operational command center.

However, the AI-agent functionality is not yet implemented at the level required.

I have an earlier project called:

ResQ Pilot

That project contains the concept of an 11-agent AI orchestration system.

I have provided screenshots from that existing system.

The second screenshot specifically shows:

AI Agent Orchestration

Multi-agent coordination pipeline

Agent Orchestration Graph
HUMAN-SUPERVISED

Live Agent Activity

The Nexus ResQ Authority / Command panel must now implement this concept properly.

2. MOST IMPORTANT REQUIREMENT — EXACTLY 11 AGENTS

The new Nexus ResQ implementation must contain:

EXACTLY 11 AI AGENTS

Do NOT create 5 agents.

Do NOT create 7 agents.

Do NOT create 10 agents.

Do NOT create 12 agents.

Do NOT simplify the system to fewer agents.

Use the EXACT SAME 11-AGENT CONCEPT, AGENT ROLES, RESPONSIBILITIES AND FUNCTIONAL FLOW FROM MY EARLIER RESQ PILOT PROJECT.

Before implementing anything:

INSPECT THE EXISTING RESQ PILOT PROJECT/CODE AVAILABLE IN THE PROJECT CONTEXT.

Find the original:

agent definitions
agent names
responsibilities
execution order
dependencies
inputs
outputs
status model
orchestration logic
event generation
decision flow
agent communication
approval/authorization behavior

Do NOT invent missing agent functionality.

Do NOT rename the original agents without a technical reason.

Do NOT merge agents.

Do NOT split agents.

Do NOT replace the original 11-agent architecture with a generic "AI pipeline".

3. RESQ PILOT SCREENSHOT IS THE FUNCTIONAL REFERENCE

The provided ResQ Pilot screenshot demonstrates the expected operational presentation.

It contains:

Left side

Individual agent cards showing information such as:

Agent Name
STATUS
Description / current operation
event count
Live state

For example, the screenshot visibly shows agents such as:

Ingestion Agent
Verification Agent
Situation Agent
Priority Agent
Resource Agent

and the orchestration graph visibly includes additional nodes such as:

Forecast
Capacity
Route
Coordinator

These are examples visible in the provided reference.

IMPORTANT:

Do NOT assume that these visible names constitute the complete list.

The final Nexus ResQ system must contain the complete 11-agent architecture from the existing ResQ Pilot implementation, not merely the agents visible in the screenshot.

4. DO NOT GUESS THE OTHER AGENTS

If the screenshot does not expose the complete 11-agent list:

DO NOT INVENT THE MISSING AGENTS.

Instead:

Inspect the existing ResQ Pilot project/code.
Identify all 11 agents.
Identify their actual responsibilities.
Identify their actual relationships.
Identify their actual execution flow.
Reproduce that architecture inside Nexus ResQ.

The screenshot is the visual/interaction reference.

The existing ResQ Pilot implementation is the functional reference.

5. NEXUS RESQ MUST USE REAL DATA

This is NON-NEGOTIABLE.

The AI-agent system must operate using:

REAL DATABASE-BACKED DATA

Do NOT introduce:

mock incidents
demo incidents
fake agent activity
fake timestamps
fake confidence scores
fake resource availability
fake hospital capacity
fake shelter capacity
fake evacuation recommendations
fake routes
fake AI results
fake agent statuses
hard-coded operational statistics

Do not populate the UI simply to make the screen look impressive.

6. AGENTS MUST PROCESS REAL OPERATIONAL DATA

The 11 agents should consume the existing real Nexus ResQ operational data through the existing backend architecture.

The system should conceptually behave like:

REAL INCIDENT / SENSOR / REPORT DATA
                ↓
        11-AGENT PIPELINE
                ↓
       INDIVIDUAL ANALYSIS
                ↓
       CROSS-AGENT SYNTHESIS
                ↓
       OPERATIONAL RECOMMENDATION
                ↓
        HUMAN AUTHORIZATION
                ↓
       APPROVED OPERATION

Do not create a disconnected frontend simulation.

7. AGENT ORCHESTRATION GRAPH

Add/complete the central orchestration visualization in the Authority / Command intelligence interface.

The graph should represent:

INPUTS
  ↓
AGENT 1
  ↓
AGENT 2
  ↓
AGENT 3
  ↓
...
  ↓
AGENT 11
  ↓
COORDINATED OPERATIONAL RECOMMENDATION
  ↓
HUMAN APPROVAL

However:

DO NOT force all agents into a simple linear chain.

Use the actual dependency/relationship structure from ResQ Pilot.

If the original system has branches, parallel agents, dependencies or converging paths, preserve them.

The graph must represent the actual 11-agent architecture.

8. AGENT STATUS

Every agent must have a meaningful operational state.

Use the existing ResQ Pilot status concept where applicable.

Examples visible in the reference include:

COMPLETE
IDLE

The final implementation may also need states corresponding to the existing backend architecture, such as:

RUNNING
WAITING
FAILED
BLOCKED
AWAITING APPROVAL

BUT:

Do not invent a status model if one already exists in ResQ Pilot/Nexus ResQ.

Reuse the existing status definitions wherever available.

9. AGENT CARD INFORMATION

Each of the 11 agents should have its own operational representation.

Each card should show only information that is actually available from the backend.

Where supported by the existing agent implementation, show:

Agent Name
Current Status
Current Task
Latest Result
Event Count
Last Updated
Execution Duration
Confidence
Input / Output state
Live / Completed state

Do not display fake values.

If a particular metric does not exist in the backend:

DO NOT fabricate it.

Use the project's proper empty/unknown state.

10. LIVE AGENT ACTIVITY

Implement the Live Agent Activity concept shown in the ResQ Pilot reference.

It should display actual agent events.

Conceptually:

LIVE AGENT ACTIVITY

Verification Agent
Consolidated reports...

Priority Agent
Incident escalated...

Resource Agent
Identified suitable resources...

Route Agent
Route selected...

Coordinator Agent
Response plan generated...

But these must come from:

actual agent execution events / backend data.

Do NOT hard-code these messages.

11. AGENT PROGRESS

The Authority / Command interface must clearly communicate the progress of all 11 agents.

Add a compact operational indicator showing:

11 AGENTS
X COMPLETE
X RUNNING
X WAITING
X AWAITING APPROVAL

and/or the appropriate existing states.

The exact design must fit the current Nexus ResQ UI.

Do NOT redesign the entire Command interface.

12. 11-AGENT PROGRESS BAR

The Authority command bar must contain a visible:

11-agent execution progress indicator

It should communicate how far the current analysis pipeline has progressed.

For example conceptually:

AI ORCHESTRATION

██████████████░░░░░░░░

7 / 11 AGENTS COMPLETE

The values must be calculated from actual agent execution state.

NEVER hard-code:
7 / 11
8 / 11
11 / 11

unless that is actually the current backend state.

13. HUMAN APPROVAL IS MANDATORY

This is one of the most important requirements.

The AI agents must NOT automatically execute high-impact operational actions merely because their analysis is complete.

After the agents produce an operational recommendation:

AI AGENTS
    ↓
RECOMMENDATION
    ↓
HUMAN REVIEW
    ↓
APPROVE / REJECT
    ↓
EXECUTION

There must be a human approval stage.

14. HUMAN APPROVAL POPUP

When the 11-agent system produces an actionable recommendation requiring authorization:

show a proper approval popup/modal.

The popup should clearly communicate:

AI RECOMMENDATION

What happened
Why the agents recommend this
Affected incident/zone
Expected action
Resources involved
Risk / confidence
Agents contributing to decision

and provide:

ALLOW / APPROVE
REJECT / DENY

using the existing Nexus ResQ visual language.

The approval action must be connected to the existing backend/data flow.

15. DO NOT AUTO-APPROVE

This is NON-NEGOTIABLE.

The system must NOT:

AI completes
    ↓
automatically execute evacuation

or:

AI completes
    ↓
automatically dispatch resources

when human authorization is required.

Instead:

AI completes
    ↓
AWAITING HUMAN APPROVAL
    ↓
APPROVE
    ↓
existing operational workflow
16. APPROVAL MUST BE PERSISTED

When a human approves or rejects an AI recommendation, the result must be saved using the existing database-backed architecture.

Persist appropriate information such as:

recommendation
decision
decision timestamp
decision maker / authority
affected incident
agent analysis reference
action status

Use the project's existing database schema/service architecture where possible.

Do NOT create a second database system.

Do NOT store critical operational decisions only in frontend state.

17. APPROVAL AUDIT TRAIL

The Authority interface should be able to show that a recommendation has moved through:

AI ANALYSIS
     ↓
RECOMMENDATION
     ↓
AWAITING HUMAN APPROVAL
     ↓
APPROVED / REJECTED
     ↓
EXECUTED / NOT EXECUTED

Use real database state.

Do not create fake approval history.

18. AUTHORITY HOME / COMMAND VIEW

The existing Authority / Command Home/Command interface should remain the primary operational view.

Do not replace it with the ResQ Pilot screen.

Instead, integrate the 11-agent orchestration information into the existing Nexus ResQ Authority experience.

The Authority user should be able to understand:

WHAT IS HAPPENING?
       ↓
WHAT ARE THE AGENTS ANALYZING?
       ↓
WHAT HAVE THEY CONCLUDED?
       ↓
WHAT REQUIRES HUMAN APPROVAL?
       ↓
WHAT HAS BEEN APPROVED?
       ↓
WHAT IS BEING EXECUTED?

without leaving the Authority operational context unnecessarily.

19. INTELLIGENCE SECTION

The existing Authority:

INTELLIGENCE

section should become genuinely operational.

It must not be merely theoretical text.

Use the existing real data to expose:

AI Agent Orchestration
11-agent pipeline
agent states
agent dependencies
execution progress
live activity
Operational Intelligence
incident analysis
risk assessment
priority assessment
resource assessment
route assessment
capacity assessment
forecast information

ONLY where those values are actually available through the existing backend.

20. MAP + AI INTELLIGENCE

Where the existing Authority UI already contains a map or operational visualization, integrate the agent outputs into that existing visualization.

For example:

Incident
Risk Zone
Affected Area
Resource
Route
Evacuation Area
Shelter

should remain visually understandable.

Do not create a separate unrelated dashboard.

The objective is:

connect the AI analysis to the existing operational picture.

21. REAL-TIME DATA UPDATE

The Authority Home/Command interface must refresh operational information approximately every:

5 SECONDS

as previously requested.

This applies to actual backend-backed operational information such as:

incident state
agent status
agent progress
recommendations
resource status
approval state
operational metrics

Do not simply reload the entire browser.

Use the existing API/WebSocket/realtime architecture where available.

22. DO NOT CREATE AN UNNECESSARY POLLING ARCHITECTURE

Before implementing 5-second updates:

inspect whether Nexus ResQ already has:

WebSocket
Server-Sent Events
polling
live update service
event stream

If a suitable existing mechanism exists:

reuse it.

Do not create a second competing realtime architecture.

If polling is already the project's architecture, use it carefully.

Do not create duplicate API calls every five seconds.

23. API SAFETY

This task must NOT become an excuse to modify unrelated APIs.

Do not touch:

Citizen APIs
Responder APIs
Resource Manager APIs
Authentication APIs
unrelated Authority APIs
unrelated database services

Only modify/create backend functionality when absolutely required for the 11-agent orchestration or human approval functionality.

If an existing API already provides the required information:

USE IT.

Do not replace it.

24. SHARED API FUNCTION SAFETY

If a shared backend/frontend function must be modified:

before changing it:

Identify every consumer.
Understand its current behavior.
Preserve its existing response contract.
Preserve existing callers.
Ensure existing APIs continue working.
Make the smallest possible modification.

Do NOT break another role merely to implement Authority AI orchestration.

25. NO BACKEND REBUILD

Do NOT rebuild the backend architecture.

Do NOT replace:

FastAPI
database layer
existing service architecture
authentication
agent architecture

with another technology.

Use what already exists.

26. NO DATABASE RESTRUCTURING UNLESS ABSOLUTELY NECESSARY

Do not modify existing database tables unnecessarily.

If the existing schema already supports:

agents
agent executions
incidents
recommendations
approvals
resources

reuse it.

If a minimal schema addition is genuinely required for persistent agent/approval state:

make only the smallest required migration.

Do not modify unrelated tables.

27. REAL DATA — ZERO DEMO DATA

This rule applies everywhere.

The following are strictly prohibited:

const agents = [...]

containing fake operational results.

Also prohibited:

mockAgents
demoAgents
sampleIncidents
fakeActivity
staticRecommendations
hardcodedApproval

for production UI behavior.

The frontend must consume actual backend/database state.

28. DO NOT FAKE REAL-TIME BEHAVIOR

Do not implement:

setInterval(() => {
    randomizeAgentStatus()
}, 5000)

or equivalent.

Do NOT randomly change:

confidence
agent progress
incident severity
resource counts
timestamps
AI recommendations

The 5-second update must retrieve actual current data.

29. DO NOT MODIFY EXISTING VISUAL DESIGN

This is extremely important.

The existing Nexus ResQ design is already implemented.

Do NOT change:

colors
fonts
typography
spacing
layout system
cards
borders
grid
glow
animations
transitions
3D design
Command Orbit
navigation
existing buttons
existing responsive behavior

unless an explicitly requested AI-agent element absolutely requires a small addition.

The new functionality must fit into the existing design language.

30. DO NOT COPY THE RESQ PILOT UI

The ResQ Pilot screenshot is a:

functional and information-architecture reference

It is NOT a request to clone the ResQ Pilot UI.

Do not copy:

sidebar
header
layout
colors
typography
exact card dimensions
exact page structure

Nexus ResQ must remain visually distinct.

Only carry over the:

11-agent architecture
agent orchestration concept
agent status concept
live activity concept
dependency graph concept
human-supervised workflow
31. EXISTING NEXUS RESQ AUTHORITY DESIGN HAS PRIORITY

If ResQ Pilot and Nexus ResQ have conflicting visual structures:

Nexus ResQ wins.

The final system should look like:

Nexus ResQ with advanced AI orchestration

NOT:

ResQ Pilot copied into Nexus ResQ.

32. AGENT FAILURE HANDLING

The 11-agent system must not assume every agent always succeeds.

Use actual backend status.

If an agent fails:

AGENT FAILED

should be represented appropriately.

The system must not falsely report:

COMPLETE

when execution failed.

The Authority should be able to identify which agent is blocking the pipeline if the existing architecture supports this.

33. AGENT DEPENDENCY VISUALIZATION

The orchestration graph should clearly distinguish:

completed
running
waiting
failed
awaiting approval

using the existing Nexus ResQ visual language.

Connections should represent actual dependencies.

Do NOT draw decorative lines that do not represent real agent relationships.

34. AGENT OUTPUT INSPECTION

The Authority user should be able to inspect an agent's result where the existing functionality supports it.

For example:

Agent
↓
Current task
↓
Input
↓
Analysis
↓
Output
↓
Confidence
↓
Next dependency

Do not expose internal chain-of-thought or hidden reasoning.

Only show the agent's actual operational result, decision factors, structured output, confidence/metadata that the backend intentionally exposes.

35. HUMAN + AI RESPONSIBILITY BOUNDARY

Make the workflow visually clear:

AI
ANALYZE
VERIFY
PRIORITIZE
ASSESS
RECOMMEND

        ↓

HUMAN
REVIEW
APPROVE / REJECT

        ↓

SYSTEM
EXECUTE
TRACK

The Authority remains the final operational decision-maker wherever human approval is required.

36. COMMAND BAR

The existing Authority command bar should communicate:

LIVE

and the state of the 11-agent orchestration.

Add the requested agent progress information without redesigning the command bar.

Conceptually:

● LIVE

AI AGENTS
██████████░  9/11

AWAITING HUMAN APPROVAL: 2

All values must be real.

37. INCIDENT-TO-AGENT RELATIONSHIP

The Authority should be able to understand which incident an agent analysis relates to.

For example:

INCIDENT
   ↓
11-AGENT ANALYSIS
   ↓
RECOMMENDATION
   ↓
APPROVAL

Do not show disconnected AI activity.

Every operational recommendation should have an identifiable underlying incident/context where applicable.

38. RESOURCE / ROUTE / EVACUATION CONNECTION

Where the existing 11-agent architecture produces information relevant to:

resources
routes
capacity
evacuation
incident priority
forecast
coordination

connect those outputs to the existing Nexus ResQ Authority functionality.

Do NOT build separate duplicate systems.

Use the existing:

resource data
incident data
route data
shelter data
evacuation data

already present in Nexus ResQ.

39. AUTHORITY NAVIGATION

Preserve the previously corrected Authority navigation structure.

It must remain:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH

Do not reintroduce duplicate navigation.

Do not create another navigation layer.

Do not change navigation as part of this task unless absolutely required to expose the existing AI functionality.

40. ALL OTHER ROLES MUST REMAIN UNTOUCHED

Do NOT modify:

CITIZEN
RESPONDER
RESOURCE MANAGER

for this task.

Their existing functionality must remain exactly as it is.

Do not alter their:

UI
navigation
API calls
authentication
database access
components
routes

unless a genuinely shared component requires a minimal compatibility-safe change.

41. NO AUTHENTICATION CHANGES

Do NOT modify:

login
signup
JWT
sessions
cookies
RBAC
role permissions
authentication middleware

The Authority user must continue accessing the panel through the existing authentication system.

42. NO ENVIRONMENT CHANGES

Do NOT modify:

.env
.env.example
.gitignore
database credentials
API keys
ports
server configuration
Node configuration
Python configuration
dependency versions

unless absolutely unavoidable.

Do not expose secrets.

Do not hard-code credentials.

43. NO PROJECT RESTRUCTURING

Do not reorganize the entire project.

Do not rename unrelated files.

Do not move unrelated folders.

Do not upgrade dependencies.

Do not replace libraries.

Do not rewrite working components.

44. PRESERVE EXISTING ANIMATIONS

The existing Nexus ResQ animations must remain.

If an agent changes state:

use the existing animation language where appropriate.

Do NOT replace the existing animation system.

Do NOT introduce excessive animations.

Operational clarity is more important than decoration.

45. FIXED OPERATIONAL SCREEN

The Authority operational interface should preserve the previously requested fixed-screen behavior.

The user should not need to continuously scroll through the page to understand the operational state.

Where possible, the existing sections should remain within the fixed command-center viewport.

Do not destroy existing responsive behavior.

46. PERFORMANCE

The 11-agent visualization must not cause excessive API requests or browser performance problems.

Do not make:

11 agents × multiple API requests × every 5 seconds

if the backend can provide a consolidated orchestration state.

Prefer an existing consolidated endpoint/event stream if available.

Avoid unnecessary re-renders.

47. DATA FETCHING

Before adding new API calls:

inspect existing APIs.

If one existing endpoint already returns:

agent state
incident state
recommendations
approval state

reuse it.

Do not create duplicate endpoints returning the same information.

48. NO STATIC GRAPH

The orchestration graph must not be a decorative static SVG/canvas containing hardcoded agent nodes.

The graph must be generated from the actual 11-agent configuration/state.

Conceptually:

DATABASE / AGENT SERVICE
        ↓
AGENT STATE
        ↓
ORCHESTRATION GRAPH

not:

hardcoded graph
        ↓
fake status
49. AGENT COUNT VALIDATION

The UI must always derive the agent count from the actual configured 11-agent system.

There must be:

11 agents

and no accidental duplicate nodes.

At startup/testing, verify:

Total agents = 11

If the backend exposes the configured agent count, use it.

50. HUMAN APPROVAL STATE

The system must distinguish between:

AI COMPLETE

and:

AI COMPLETE + HUMAN APPROVAL REQUIRED

These are NOT the same state.

Example:

11 / 11 agents complete
        ↓
Recommendation generated
        ↓
AWAITING AUTHORIZATION

Only after human approval:

APPROVED
        ↓
EXECUTION
51. APPROVAL POPUP MUST BE OPERATIONAL

The approval popup must not merely say:

Are you sure?

It should give enough structured information for an Authority operator to understand the decision.

Include only actual backend-supported information such as:

Incident
Recommended action
Affected area
Priority
Resources
Agent completion
Confidence
Potential impact

Then:

APPROVE
REJECT
52. APPROVAL ERROR HANDLING

If approval fails:

do NOT show a fake success message.

Show the actual failure state.

Do not update the UI as:

APPROVED

until the backend confirms the operation.

53. DATABASE CONSISTENCY

When a human approves an action:

Frontend
    ↓
Backend
    ↓
Database
    ↓
Confirmed response
    ↓
Frontend state update

Do NOT rely on optimistic frontend state for critical operational decisions unless the existing architecture already intentionally supports it.

54. BACKEND SERVER SAFETY

This requirement is extremely important.

I have already configured and worked on the backend.

DO NOT BREAK MY BACKEND.

Do not introduce:

startup errors
import errors
database connection errors
migration failures
schema mismatch
port conflicts
dependency conflicts
API crashes
500 errors
WebSocket failures

If backend modifications are required, make the smallest possible changes and verify the complete server startup.

55. EXISTING API REGRESSION TEST

After implementation, verify that all previously working functionality still works.

At minimum:

Authority
Citizen
Responder
Resource Manager
Authentication
Database
Existing APIs
Existing routes

must continue working.

56. DO NOT TOUCH UNRELATED API FUNCTIONS

If a function is not directly involved in:

11-agent orchestration
agent status
agent activity
AI recommendation
human approval
Authority intelligence

leave it alone.

Even if you think it could be "cleaned up".

Do not clean it up.

Do not refactor it.

Do not optimize it.

57. TEST THE COMPLETE AI WORKFLOW

Test this complete flow using real project data:

REAL INCIDENT
      ↓
AGENT 1
      ↓
AGENT 2
      ↓
...
      ↓
AGENT 11
      ↓
AGENT RESULTS CONSOLIDATED
      ↓
OPERATIONAL RECOMMENDATION
      ↓
AWAITING HUMAN APPROVAL
      ↓
APPROVE
      ↓
BACKEND CONFIRMATION
      ↓
DATABASE UPDATED
      ↓
OPERATIONAL STATE UPDATED

Also test rejection:

RECOMMENDATION
      ↓
REJECT
      ↓
DATABASE UPDATED
      ↓
NO UNAUTHORIZED EXECUTION
58. REAL-TIME TEST

Verify that the Authority screen receives actual updated data approximately every 5 seconds.

Do NOT simulate this with random frontend changes.

Verify:

Agent status
Agent progress
Live activity
Recommendation
Approval state
Incident state

are synchronized with backend state.

59. BUILD TEST

After implementation, run the project's existing build/test commands.

For example, if configured:

npm run build
npm run lint
npm run type-check

Use the project's actual commands.

There must be:

NO build errors
NO TypeScript errors
NO import errors
NO routing errors
NO runtime errors
60. BACKEND TEST

Start the existing backend exactly as it was previously configured.

Verify:

Server starts
Database connects
Existing APIs respond
Authentication works
Existing roles work
Agent services work
No unexpected 500 errors

Do not require me to recreate the environment.

61. FINAL VISUAL RESULT

The final Nexus ResQ Authority interface should conceptually communicate:

┌───────────────────────────────────────────────────────────────┐
│ AUTHORITY / COMMAND                              ● LIVE       │
│                                                               │
│ AI ORCHESTRATION   ███████████░░  9/11                       │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  11 AGENT STATUS          OPERATIONAL PICTURE                │
│                                                               │
│  Agent 1   COMPLETE                 MAP / INCIDENTS          │
│  Agent 2   COMPLETE                                           │
│  Agent 3   RUNNING                  AI RECOMMENDATION         │
│  Agent 4   COMPLETE                                           │
│  Agent 5   COMPLETE                 [AWAITING APPROVAL]       │
│  ...                                                          │
│  Agent 11  WAITING                                            │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│                  AGENT ORCHESTRATION GRAPH                    │
│                                                               │
│               11 interconnected agents                       │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ LIVE AGENT ACTIVITY                  HUMAN APPROVAL            │
│ Agent → actual event                 APPROVE / REJECT          │
└───────────────────────────────────────────────────────────────┘
This is only a conceptual information structure.

Do NOT copy this ASCII layout literally.

Use the existing Nexus ResQ Authority design.

62. RESQ PILOT FUNCTIONALITY TO PRESERVE

From the provided ResQ Pilot reference, the following concepts are specifically required:

AI Agent Orchestration

The Authority should see the complete multi-agent pipeline.

Individual Agent Monitoring

Each agent has its own state and operational activity.

Orchestration Graph

Agents are represented according to their actual relationships.

Live Agent Activity

Recent actual agent events are visible.

Human Supervision

The pipeline explicitly supports human authorization.

Agent Progress

The operator can immediately see how far the 11-agent process has progressed.

Operational Context

Agent results are connected to actual incidents/resources/routes/capacity where supported.

63. DO NOT COPY RESQ PILOT'S DATA

The ResQ Pilot screenshot contains example values such as:

127 incidents
18 critical incidents
84 resources
72% hospital capacity
61% shelter capacity

These values are NOT to be copied.

They are reference visuals only.

Nexus ResQ must display its own:

REAL DATABASE DATA

64. DO NOT COPY RESQ PILOT'S INCIDENTS

Do not copy:

INC-00481
INC-00479

or any other incident IDs shown in the screenshot.

Use Nexus ResQ's actual incident records.

65. DO NOT COPY RESQ PILOT'S AGENT EVENT TEXT

Messages such as:

Consolidated 7 reports into 3 incidents.
Route R-14 selected.
Response Plan RP-009 generated.

are reference examples.

Do not hard-code them.

Nexus ResQ should display actual events produced by its own agent system.

66. SECURITY

Do not expose:

API keys
database credentials
environment variables
internal secrets
hidden chain-of-thought
sensitive backend implementation details

in the frontend.

Only expose structured operational agent outputs intentionally provided by the backend.

67. NO DEMO FALLBACK

If the API fails:

DO NOT silently switch to fake/demo agent data.

Instead use the project's existing:

loading
empty
error
offline

state.

This is particularly important because this is an operational system.

68. ERROR STATES

The Authority must clearly distinguish:

LIVE
DEGRADED
OFFLINE
AGENT FAILED
WAITING
AWAITING APPROVAL

where the backend actually provides those states.

Do not falsely display:

LIVE

if the underlying data source is unavailable.

Preserve the existing live-status implementation if already present.

69. FILE-LEVEL DISCIPLINE

Before editing:

Inspect the project.

Identify exactly:

Authority components
Authority routes
Intelligence components
Agent services
Agent APIs
Database models
Approval services
Existing ResQ Pilot agent implementation

Then make the smallest possible set of changes.

Do NOT modify files simply because they are nearby.

70. CHANGE BOUNDARY

The permitted change scope is:

AUTHORITY / COMMAND
        ↓
AI INTELLIGENCE
        ↓
11-AGENT ORCHESTRATION
        ↓
AGENT STATUS
        ↓
LIVE AGENT ACTIVITY
        ↓
AI RECOMMENDATION
        ↓
HUMAN APPROVAL
        ↓
REQUIRED DATABASE PERSISTENCE

Everything outside this scope is frozen.

71. DO NOT MODIFY

Unless absolutely required:

Citizen interface
Responder interface
Resource Manager interface
Login
Signup
Authentication
RBAC
Existing navigation
Existing Command Orbit
Existing evacuation UI
Existing operations UI
Existing resource management UI
Existing database architecture
Existing unrelated APIs
Existing animations
Existing visual design
Existing environment
72. IMPORTANT: PREVIOUS NAVIGATION WORK MUST REMAIN

The Authority navigation was intentionally consolidated to:

HOME
COMMAND ORBIT
INTELLIGENCE
EVACUATION
OPERATIONS
INCIDENTS
DISPATCH

Do NOT undo this.

Do NOT introduce another secondary navigation.

Do NOT duplicate:

INTELLIGENCE
EVACUATION
OPERATIONS
73. FINAL ACCEPTANCE CRITERIA

The implementation is considered complete ONLY when all of the following are true:

AI SYSTEM
✓ Exactly 11 agents
✓ Same agent architecture as ResQ Pilot
✓ Same functional responsibilities
✓ Correct dependencies
✓ Correct orchestration flow
✓ No invented agents
✓ No merged agents
✓ No duplicate agents
AUTHORITY UI
✓ Existing Nexus ResQ design preserved
✓ AI orchestration integrated into Authority
✓ Agent status visible
✓ Agent progress visible
✓ 11-agent graph visible
✓ Live agent activity visible
✓ Operational context visible
HUMAN CONTROL
✓ AI recommendation generated
✓ Human approval required
✓ Approval popup available
✓ Approve/Reject works
✓ Approval persisted
✓ No unauthorized automatic execution
DATA
✓ Real database data only
✓ No mock data
✓ No demo data
✓ No fake agent events
✓ No fake recommendations
✓ No hardcoded operational statistics
REAL TIME
✓ Current backend state reflected
✓ Approximately 5-second updates
✓ No random simulation
✓ No duplicate polling storms
BACKEND
✓ Existing APIs preserved
✓ Existing database preserved
✓ Existing authentication preserved
✓ No unrelated API modified
✓ No server errors
✓ No startup errors
✓ No database errors
PROJECT
✓ Build passes
✓ Type checks pass
✓ No runtime errors
✓ No console errors caused by this task
✓ Existing roles continue working
74. FINAL REPORT REQUIRED

After implementation, do NOT simply say:

"Done."

Provide a concise technical report containing:

1. 11 Agents

List the exact 11 agents discovered from ResQ Pilot and their responsibilities.

2. Agent Flow

Show:

Agent → Agent → Agent

including branches/dependencies where applicable.

3. Files Modified

List every modified file.

4. Files Not Modified

Confirm that unrelated files were untouched.

5. APIs Modified

If none:

No unrelated APIs modified.

If any were modified:

explain exactly why.

6. Database Changes

State whether a migration/schema change was required.

7. Human Approval

Explain how:

AI recommendation
→ approval popup
→ approve/reject
→ database persistence

works.

8. Real-Time Updates

Explain how the 5-second/live update mechanism works.

9. Testing

Confirm:

Build
Type check
Frontend runtime
Backend startup
Database
API
Authentication
Authority
Citizen
Responder
Resource Manager
10. Demo Data

Explicitly confirm:

No demo/mock operational data was introduced.

🚨 FINAL NON-NEGOTIABLE INSTRUCTION
DO NOT BREAK MY EXISTING PROJECT.

The project has already been developed and tested.

Assume that everything currently working is intentional.

Do not make unrelated improvements.

Do not redesign anything.

Do not replace working APIs.

Do not replace working components.

Do not modify other roles.

Do not modify authentication.

Do not modify environment configuration.

Do not introduce mock/demo data.

Do not hard-code AI results.

Do not randomly simulate agent activity.

Do not create a fake 11-agent visualization.

Do not copy the ResQ Pilot UI.

Do not guess the missing agents.

FIRST INSPECT THE EXISTING RESQ PILOT IMPLEMENTATION.
IDENTIFY THE EXACT 11 AGENTS AND THEIR ACTUAL FUNCTIONALITY.
THEN MAP THAT FUNCTIONALITY INTO THE EXISTING NEXUS RESQ AUTHORITY / COMMAND ARCHITECTURE.
USE REAL NEXUS RESQ DATABASE DATA.
CONNECT AGENT OUTPUT → RECOMMENDATION → HUMAN APPROVAL → DATABASE → OPERATIONAL STATE.
TEST EVERYTHING.
IF IT IS ALREADY WORKING, DO NOT TOUCH IT.

The goal is not to make Nexus ResQ look like ResQ Pilot.

The goal is to make Nexus ResQ's Authority / Command system operationally intelligent using the proven 11-agent architecture from ResQ Pilot, with real data and human-supervised decision execution.