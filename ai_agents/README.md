# Nexus ResQ — 11-Agent AI Orchestration Architecture

This module implements the complete **11-Agent Intelligence & Coordination Pipeline** for **Nexus ResQ**, modeled on the ResQ Pilot operational architecture with human supervision.

---

## The 11 Core Agents

| # | Agent Name | Execution Layer | Primary Responsibility |
|---|---|---|---|
| **1** | **Ingestion Agent** | Sequential (Phase 1) | Collects incoming citizen/field reports & IoT sensor inputs; normalizes into canonical format. |
| **2** | **Verification Agent** | Sequential (Phase 2) | Analyzes reports for credibility, duplicate reports, and stale information. |
| **3** | **Situation Agent** | Sequential (Phase 3) | Builds and consolidates the real-time operational picture and threat clusters. |
| **4** | **Priority Agent** | Sequential (Phase 4) | Evaluates incidents and assigns priority scores (`P1_CRITICAL` through `P4_LOW`). |
| **5** | **Resource Agent** | Parallel (Phase 5) | Identifies available responders, rescue units, and matches equipment suitability. |
| **6** | **Capacity Agent** | Parallel (Phase 5) | Projects hospital bed and emergency shelter capacity; detects facility overload. |
| **7** | **Route Agent** | Parallel (Phase 5) | Evaluates safe evacuation corridors, transit times, and road blockages. |
| **8** | **Forecast Agent** | Parallel (Phase 5) | Predicts demand escalation, casualty risk, and secondary compound hazards. |
| **9** | **Coordinator Agent** | Sequential (Phase 6) | Combines outputs from the parallel agents and synthesizes multi-agency action plans. |
| **10** | **Critic Agent** | Sequential (Phase 7) | Reviews the response plan for safety conflicts and enforces the human approval gate. |
| **11** | **Analytics Agent** | Continuous (All Phases) | Continuously tracks operational outcomes, agent events, cycle times, and system effectiveness. |

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

## Human-in-the-Loop Supervision

By architectural specification, the AI system **never automatically executes** critical operational or evacuation directives.
- When the **Critic Agent** finishes review, the plan is placed into `PENDING_APPROVAL`.
- The Authority/Command interface prompts the operator with full operational context:
  - Incident severity and affected population
  - AI recommendations and contributing factors
  - Participating agent consensus
  - Allocated rescue units, corridors, and intake facilities
  - Identified risk flags
- The operator must explicitly trigger **Allow / Approve** or **Reject / Deny**.
