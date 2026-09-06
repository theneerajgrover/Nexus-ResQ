// ============================================================
// NEXUS RESQ — AI AGENTS ARCHITECTURE TYPES
// ============================================================

export type AgentStatus = 'IDLE' | 'RUNNING' | 'COMPLETE' | 'WAITING' | 'BLOCKED' | 'FAILED';

export type AgentExecutionLayer = 'sequential' | 'parallel' | 'continuous';

export interface AgentInfo {
  id: number;
  name: string;
  code: string;
  desc: string;
  status: AgentStatus;
  progress: number;
  layer: AgentExecutionLayer;
  lastUpdated: number;
}

export interface AgentEvent {
  id: string;
  agentId: number;
  agentName: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

// ── Pipeline Data Contracts ────────────────────────────────────────

export interface RawFieldInput {
  source: 'CITIZEN' | 'SENSOR' | 'RESPONDER' | 'EXTERNAL';
  sourceId: string;
  location: string;
  coordinates: { lat: number; lng: number };
  category: string;
  severity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  text: string;
  telemetry?: Record<string, number>;
  timestamp: number;
}

export interface NormalizedReport {
  reportId: string;
  source: string;
  location: string;
  lat: number;
  lng: number;
  category: string;
  details: string;
  rawTimestamp: number;
  ingestedAt: number;
}

export interface VerifiedReport extends NormalizedReport {
  isVerified: boolean;
  credibilityScore: number; // 0 to 100
  isDuplicate: boolean;
  duplicateOf?: string;
  conflictFlags: string[];
}

export interface OperationalPicture {
  timestamp: number;
  activeIncidentsCount: number;
  verifiedReports: VerifiedReport[];
  criticalClusters: {
    zoneName: string;
    center: { lat: number; lng: number };
    severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    incidentCount: number;
  }[];
  environmentalThreatLevel: 'SAFE' | 'ELEVATED' | 'HIGH' | 'SEVERE';
}

export interface PriorityTriageResult {
  incidentId: string;
  zone: string;
  priorityScore: number; // 0 to 100
  priorityLevel: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MODERATE' | 'P4_LOW';
  requiresImmediateEvacuation: boolean;
  contributingFactors: string[];
}

export interface ResourceAllocationProposal {
  incidentId: string;
  proposedUnits: {
    teamId: string;
    teamName: string;
    teamType: string;
    etaMinutes: number;
    distanceKm: number;
  }[];
  equipmentNeeded: string[];
  sufficientResourcesAvailable: boolean;
}

export interface CapacityAssessment {
  nearbyShelters: {
    shelterId: string;
    name: string;
    capacity: number;
    occupancy: number;
    availableBeds: number;
    utilizationRate: number;
    canAcceptEvacuees: boolean;
  }[];
  hospitals: {
    hospitalId: string;
    name: string;
    availableBeds: number;
    icuCapacity: number;
  }[];
  isOverCapacityAlert: boolean;
}

export interface SafeRouteAnalysis {
  routeId: string;
  origin: { lat: number; lng: number };
  destination: string;
  corridorStatus: 'CLEAR' | 'CONGESTED' | 'HAZARDOUS' | 'BLOCKED';
  safetyScore: number;
  estimatedTransitTimeMinutes: number;
  recommendedEvacuationCorridor: string;
  avoidRoads: string[];
}

export interface EscalationForecast {
  timeHorizonHours: number;
  predictedCasualtyRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  potentialDisplacementCount: number;
  secondaryHazards: string[];
  recommendedPrepositioning: string[];
}

export interface ResponsePlan {
  planId: string;
  incidentId: string;
  targetZone: string;
  title: string;
  summary: string;
  priority: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  actions: string[];
  allocatedTeams: string[];
  evacuationRoutes: string[];
  targetShelters: string[];
  confidence: number;
  createdAt: number;
}

export interface PlanCritique {
  planId: string;
  isSafe: boolean;
  identifiedRisks: string[];
  unresolvedConflicts: string[];
  requiresHumanApproval: boolean; // Always true for critical operations
  suggestedMitigations: string[];
  critiqueConfidence: number;
}

export interface HumanApprovalGate {
  recommendationId: string;
  planId: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REPLANNING';
  actionSummary: string;
  supportingIntelligence: string[];
  participatingAgents: string[];
  reviewedBy?: string;
  reviewTimestamp?: number;
  comments?: string;
}

export interface OrchestrationPipelineResult {
  runId: string;
  timestamp: number;
  status: 'PROCESSING' | 'AWAITING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'REJECTED';
  completedAgents: number;
  totalAgents: 11;
  operationalPicture: OperationalPicture;
  priorityResults: PriorityTriageResult[];
  responsePlan: ResponsePlan;
  critique: PlanCritique;
  humanApproval: HumanApprovalGate;
  events: AgentEvent[];
}
