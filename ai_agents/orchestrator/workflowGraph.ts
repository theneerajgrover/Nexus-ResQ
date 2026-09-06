// ============================================================
// 11-AGENT ORCHESTRATION WORKFLOW GRAPH
// ============================================================
// Defines the exact structural dependencies of the ResQ Pilot architecture.
// ============================================================

export interface GraphNode {
  id: number;
  code: string;
  name: string;
  layer: 'sequential' | 'parallel' | 'continuous' | 'human_gate';
  dependsOn: number[]; // Agent IDs that must complete before this node activates
  description: string;
}

export const WORKFLOW_GRAPH: GraphNode[] = [
  {
    id: 1,
    code: 'INGESTION',
    name: 'Ingestion Agent',
    layer: 'sequential',
    dependsOn: [], // Root of pipeline
    description: 'Collects incoming citizen/field reports, sensor telemetry, and normalizes them.',
  },
  {
    id: 2,
    code: 'VERIFICATION',
    name: 'Verification Agent',
    layer: 'sequential',
    dependsOn: [1], // Depends on Ingestion
    description: 'Verifies credibility, detects duplicates and conflicts.',
  },
  {
    id: 3,
    code: 'SITUATION',
    name: 'Situation Agent',
    layer: 'sequential',
    dependsOn: [2], // Depends on Verification
    description: 'Consolidates verified information into a coherent operational picture.',
  },
  {
    id: 4,
    code: 'PRIORITY',
    name: 'Priority Agent',
    layer: 'sequential',
    dependsOn: [3], // Depends on Situation
    description: 'Triages active incidents and evaluates severity levels.',
  },
  // ── Parallel Layer (Gated on Priority Agent completion) ──────
  {
    id: 5,
    code: 'RESOURCE',
    name: 'Resource Agent',
    layer: 'parallel',
    dependsOn: [4],
    description: 'Maps asset availability and unit suitability.',
  },
  {
    id: 6,
    code: 'CAPACITY',
    name: 'Capacity Agent',
    layer: 'parallel',
    dependsOn: [4],
    description: 'Projects hospital and shelter occupancy constraints.',
  },
  {
    id: 7,
    code: 'ROUTE',
    name: 'Route Agent',
    layer: 'parallel',
    dependsOn: [4],
    description: 'Evaluates safe evacuation corridors and road accessibility.',
  },
  {
    id: 8,
    code: 'FORECAST',
    name: 'Forecast Agent',
    layer: 'parallel',
    dependsOn: [4],
    description: 'Forecasts demand escalation and secondary hazard evolution.',
  },
  // ── Convergence ──────────────────────────────────────────────
  {
    id: 9,
    code: 'COORDINATOR',
    name: 'Coordinator Agent',
    layer: 'sequential',
    dependsOn: [5, 6, 7, 8], // Must wait for all 4 parallel agents to complete
    description: 'Synthesizes multi-agency response plans combining all parallel analyses.',
  },
  {
    id: 10,
    code: 'CRITIC',
    name: 'Critic Agent',
    layer: 'sequential',
    dependsOn: [9], // Depends on Coordinator
    description: 'Identifies operational risks, safety issues, and enforces human approval gate.',
  },
  // ── Continuous Layer ─────────────────────────────────────────
  {
    id: 11,
    code: 'ANALYTICS',
    name: 'Analytics Agent',
    layer: 'continuous',
    dependsOn: [], // Operates continuously across all phases
    description: 'Tracks operational outcomes, event timestamps, and system performance metrics.',
  },
];
