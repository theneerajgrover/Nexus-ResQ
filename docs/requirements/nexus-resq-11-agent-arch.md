Proceed with the FULL 11-agent architecture from my existing ResQ Pilot project. Do NOT use placeholders such as AGENT-10 or AGENT-11.

The exact 11 agents and their responsibilities are:

1. INGESTION AGENT
   - Collects incoming citizen/field reports, sensor inputs and operational data.
   - Normalizes incoming information into a canonical incident format.

2. VERIFICATION AGENT
   - Verifies reports for credibility, duplicates, conflicts and stale information.
   - Determines whether incoming information can be trusted.

3. SITUATION AGENT
   - Builds and continuously updates the operational picture.
   - Consolidates verified information into the current disaster situation.

4. PRIORITY AGENT
   - Evaluates incidents and assigns priority/severity.
   - Determines which incidents require immediate operational attention.

5. RESOURCE AGENT
   - Identifies available responders, rescue teams, equipment and other resources.
   - Determines suitable resources for active incidents.

6. CAPACITY AGENT
   - Monitors capacity of hospitals, shelters and other critical facilities.
   - Identifies capacity constraints and potential overload.

7. ROUTE AGENT
   - Evaluates routes, accessibility and operational movement.
   - Identifies viable routes for responders, evacuation and resource deployment.

8. FORECAST AGENT
   - Forecasts potential demand, incident escalation and resource requirements.
   - Provides forward-looking intelligence to the command system.

9. COORDINATOR AGENT
   - Combines outputs from the operational agents.
   - Generates and updates response plans and coordinates recommended actions.

10. CRITIC AGENT
    - Reviews the generated response plan and recommendations.
    - Identifies risks, conflicts, unsafe assumptions or weaknesses before execution.

11. ANALYTICS AGENT
    - Tracks operational outcomes, system performance and changes over time.
    - Provides analytical feedback on response effectiveness.

IMPLEMENT THE ORCHESTRATION FLOW AS:

REPORTS / FIELD DATA
        ↓
INGESTION
        ↓
VERIFICATION
        ↓
SITUATION
        ↓
PRIORITY
        ↓
 ┌──────────┬──────────┬──────────┬──────────┐
RESOURCE  CAPACITY    ROUTE    FORECAST
 └──────────┴──────────┴──────────┴──────────┘
        ↓
COORDINATOR
        ↓
CRITIC
        ↓
HUMAN APPROVAL
        ↓
AUTHORIZED OPERATION

ANALYTICS should continuously track the resulting operational outcomes and agent activity.

For the Nexus ResQ Authority / Command panel, implement the complete 11-agent orchestration experience, not merely a visual list.

REQUIRED UI BEHAVIOR:

- Show all 11 agents individually.
- Every agent must have a clear status:
  IDLE / RUNNING / COMPLETE / WAITING / BLOCKED / FAILED
- Show the current activity of each agent.
- Show progress for the complete 11-agent pipeline.
- Show which agents have completed their work and which are currently processing.
- Show timestamps/events for agent activity.
- Show the relationship/dependency between agents through an orchestration graph.
- The graph should clearly communicate the actual workflow above.
- Do not invent additional agents.
- Do not rename the 11 agents.
- Do not merge multiple agents into one.
- Do not remove any agent.

HUMAN SUPERVISION:

After the Coordinator and Critic complete their processing, the system must NOT automatically execute a critical operational recommendation.

Instead:

CRITIC → HUMAN APPROVAL → EXECUTION

Create a proper human-approval interaction where the Authority/Command operator can review the AI recommendation and explicitly:

ALLOW / APPROVE
or
REJECT / DENY

The approval modal should clearly show:
- Incident
- AI-generated recommendation
- Reasoning / supporting intelligence
- Agents involved
- Confidence where available
- Relevant resource/route/capacity information
- Potential risk
- Approve / Reject controls

The Command header should also contain the overall 11-agent progress indicator, for example:

AI ORCHESTRATION
████████████░░░  9/11 AGENTS
STATUS: PROCESSING
HUMAN APPROVAL: REQUIRED

The values must ultimately come from the backend/database and must NOT be hardcoded demo values.

LIVE AGENT ACTIVITY:

Add/retain a live activity feed showing actual agent events such as:

Verification Agent
Verified incoming reports.

Priority Agent
Incident escalated based on priority assessment.

Resource Agent
Identified suitable response resources.

Route Agent
Evaluated viable operational route.

Coordinator Agent
Response plan generated — awaiting review.

Critic Agent
Plan reviewed — human approval required.

Analytics Agent
Response outcome updated.

These are examples of the event structure only. Do not hardcode these messages as fake data. They must be populated from real backend data when available.

IMPORTANT NEXUS RESQ REQUIREMENTS:

1. Use REAL DATABASE-BACKED DATA.
   There must be NO demo data, mock data, fake counters, static agent statuses, hardcoded incidents, fake activity logs or fabricated operational metrics displayed as if they were real.

2. The frontend must consume the existing backend APIs/database data.

3. Do not create a parallel fake data system simply to make the UI look populated.

4. If a required value does not yet exist in the backend, structure the UI so it correctly represents an unavailable/pending state rather than inventing a value.

5. Any information that must persist — including human approvals/rejections, agent execution status, recommendations, operational decisions, timestamps and relevant workflow state — must be persisted in the database through the appropriate backend functionality.

6. Do NOT modify unrelated backend APIs.

7. Do NOT modify existing authentication, authorization, routing, database configuration, working APIs or business logic unless it is strictly necessary for this specific 11-agent orchestration functionality.

8. If an existing function must be changed, preserve all existing behavior and ensure every existing consumer/API continues working correctly.

9. Do not introduce a new API architecture when an existing endpoint/service can safely support the required functionality.

10. Do not break any currently working frontend functionality.

11. Do not change existing UI/design language, animations, typography, colors, spacing, navigation structure or working components outside the exact Authority/Command functionality being implemented.

12. Do not redesign unrelated pages.

13. Do not alter the Resource Manager, Responder or Citizen interfaces as part of this task unless a shared component must be minimally extended without changing its existing behavior.

14. Do not introduce server errors, startup errors, database errors, migration failures, API exceptions or unexpected backend behavior.

15. Do not change environment configuration, database configuration or project setup unnecessarily.

16. Before making changes, inspect the existing Nexus ResQ implementation and identify which components, routes, services and APIs already exist.

17. Reuse existing components and APIs wherever possible.

18. Keep the implementation modular so the 11-agent orchestration can receive real backend events without requiring another frontend rewrite.

19. The Authority/Command interface must remain a fixed operational screen. Do not introduce unnecessary page scrolling. Information should be organized into panels, cards, graphs and activity areas that fit within the existing viewport.

20. The final implementation must feel like an actual operational command interface rather than a theoretical AI dashboard.

MOST IMPORTANT:

The existing project is already working. Treat every existing feature as WORKING AND PROTECTED.

Make ONLY the changes explicitly required for:
- Complete 11-agent orchestration
- Correct agent dependency visualization
- Agent progress in Command header
- Live agent activity
- Human approval workflow
- Real backend/database integration for these features

DO NOT "improve", refactor, redesign or optimize anything else.

Do not replace working functionality merely because you prefer another implementation.

Do not use placeholder agents.

Use exactly these 11 agents:

INGESTION
VERIFICATION
SITUATION
PRIORITY
RESOURCE
CAPACITY
ROUTE
FORECAST
COORDINATOR
CRITIC
ANALYTICS

The implementation must preserve the existing Nexus ResQ project completely outside this defined scope.