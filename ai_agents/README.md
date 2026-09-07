# Nexus ResQ — 11-Agent AI Orchestration Architecture

This module implements the complete **11-Agent Intelligence & Coordination Pipeline** and underlying computational decision engines for **Nexus ResQ**, modeled on the ResQ Pilot operational architecture with human supervision.

---

## The 11 Core Agents

The 11 specialized agents are partitioned into sequential assessment phases and parallel operational analysis layers:

| # | Agent Name | Execution Layer | Primary Responsibility |
|---|---|---|---|
| **1** | **Ingestion Agent** | Sequential (Phase 1) | Collects incoming citizen/field reports & IoT sensor inputs; normalizes data into canonical operational schema. |
| **2** | **Verification Agent** | Sequential (Phase 2) | Analyzes incoming reports for credibility, detects duplicate submissions, and flags stale or conflicting information. |
| **3** | **Situation Agent** | Sequential (Phase 3) | Aggregates localized incident signals to construct a unified operational picture and identify compound threat clusters. |
| **4** | **Priority Agent** | Sequential (Phase 4) | Evaluates incidents against casualty risk and vulnerability metrics to assign triage priority (`P1_CRITICAL` through `P4_LOW`). |
| **5** | **Resource Agent** | Parallel (Phase 5) | Evaluates responder availability, specialty matching (SAR, medical, flood), and equipment inventory compatibility. |
| **6** | **Capacity Agent** | Parallel (Phase 5) | Monitors live intake capacity at emergency shelters and critical care medical facilities; predicts facility saturation. |
| **7** | **Route Agent** | Parallel (Phase 5) | Evaluates evacuation corridor safety, road blockages, bridge structural risks, and transit times. |
| **8** | **Forecast Agent** | Parallel (Phase 5) | Projects disaster perimeter escalation, casualty expansion, weather hazards, and compound secondary threats. |
| **9** | **Coordinator Agent** | Sequential (Phase 6) | Synthesizes findings from all parallel agents into a comprehensive, multi-agency operational response plan. |
| **10** | **Critic Agent** | Sequential (Phase 7) | Performs safety and ethical reviews on synthesized plans, checks resource conflicts, and enforces the human approval gate. |
| **11** | **Analytics Agent** | Continuous (All Phases) | Continuously records agent execution metrics, consensus latency, operational cycle times, and response effectiveness. |

---

## Orchestration Flow

```text
REPORTS / SENSOR TELEMETRY
           ↓
     [1. INGESTION]
           ↓
    [2. VERIFICATION]
           ↓
     [3. SITUATION]
           ↓
      [4. PRIORITY]
           ↓
 ┌──────────┬──────────┬──────────┬──────────┐
 │5.RESOURCE│6.CAPACITY│ 7. ROUTE │8.FORECAST│  (Parallel Execution Layer)
 └──────────┴──────────┴──────────┴──────────┘
           ↓
    [9. COORDINATOR]
           ↓
      [10. CRITIC]
           ↓
   [HUMAN APPROVAL GATE]   <-- Authority/Command Operator (ALLOW/REJECT)
           ↓
  AUTHORIZED OPERATION
           │
  [11. ANALYTICS AGENT]    <-- Tracks entire pipeline continuously
```

---

## Computational Decision Engines

In addition to the agent pipeline, `ai_agents` provides specialized computational engines in `src/engines/`:

### 1. AI Decision Engine (`aiDecisionEngine.ts`)
- Synthesizes action recommendations from incident context and participating agent outputs.
- Allocates specific responder units, evacuation paths, and destination facilities.

### 2. Evacuation Engine (`evacuationEngine.ts`)
- Computes safe evacuation paths avoiding active hazard zones.
- Evaluates route safety metrics (`SAFE`, `CAUTION`, `HIGH_RISK`, `BLOCKED`) and estimates transit times.

### 3. Priority Engine (`priorityEngine.ts`)
- Ranks geographic zones and incidents by urgency using weighted multi-factor scoring (casualty exposure, infrastructure criticality, hazard velocity).
- Implements `rankZonesByPriority` and `calculatePriorityScore`.

### 4. Risk Engine (`riskEngine.ts`)
- Assesses compound disaster risk using environmental telemetry (rainfall, river level, wind, seismic) and population vulnerability.

### 5. Simulation Engine (`simulationEngine.ts`)
- Runs what-if scenarios (e.g., flood crest escalation or route obstruction) to project impact on shelter capacity and responder demand without modifying live database state.

---

## Human-in-the-Loop Supervision Gate

By architectural specification, the AI system **never autonomously executes** critical operational or evacuation directives:
- When the **Critic Agent** finishes review, the plan is assigned the status `PENDING_APPROVAL`.
- The Authority/Command interface prompts the operator with full operational context:
  - Incident severity and affected population estimates
  - AI recommendations and contributing factor explanations
  - Participating agent consensus breakdown
  - Allocated rescue units, evacuation corridors, and destination facilities
  - Identified risk flags and safety conflicts
- The operator must explicitly trigger **Allow / Approve** or **Reject / Deny**.
- Operational execution only proceeds after explicit authority authorization is recorded.

---

## Integration with Backend Server

The AI orchestration pipeline is invoked by the backend via dedicated endpoints in `backend/src/routes/`:
- `POST /api/orchestrator/run`: Executes the complete pipeline for an active incident.
- `GET /api/orchestrator/status`: Checks active execution state.
- `POST /api/command/predictive/run`: Executes Group A predictive intelligence agents.

---

## TypeScript Verification

Verify type safety of all agents, orchestrator graphs, and computational engines:
```bash
npm run typecheck
```
