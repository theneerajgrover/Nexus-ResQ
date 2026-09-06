// ============================================================
// AGENT 9: COORDINATOR AGENT
// ============================================================
// Combines outputs from the operational agents.
// Generates and updates response plans and coordinates recommended actions.
// (Executes Sequentially after Parallel Layer)
// ============================================================

import {
  PriorityTriageResult,
  ResourceAllocationProposal,
  CapacityAssessment,
  SafeRouteAnalysis,
  EscalationForecast,
  ResponsePlan,
  AgentStatus,
} from '../types';

export class CoordinatorAgent {
  public readonly id = 9;
  public readonly name = 'Coordinator';
  public readonly code = 'COORDINATOR_AGENT';
  public readonly desc = 'Response plan synthesis & action coordination';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(params: {
    priorities: PriorityTriageResult[];
    resourceProposals: ResourceAllocationProposal[];
    capacity: CapacityAssessment;
    route: SafeRouteAnalysis;
    forecast: EscalationForecast;
  }): Promise<ResponsePlan> {
    this.status = 'RUNNING';
    this.progress = 25;

    const topIncident = params.priorities[0] || {
      incidentId: 'INC-AUTO-01',
      zone: 'Riverside Sector',
      priorityLevel: 'P1_CRITICAL',
    };

    const targetShelter = params.capacity.nearbyShelters.find(s => s.canAcceptEvacuees) || {
      name: 'Central Community Center',
    };

    const matchedResource = params.resourceProposals.find(r => r.incidentId === topIncident.incidentId);
    const allocatedTeams = matchedResource?.proposedUnits.map(u => u.teamName) || ['Echo-3 (Rescue)', 'Delta-22 (Logistics)'];

    this.progress = 65;

    const actions: string[] = [
      `Initiate immediate human-supervised evacuation of ${topIncident.zone}`,
      `Dispatch units ${allocatedTeams.join(', ')} via ${params.route.recommendedEvacuationCorridor}`,
      `Direct displaced population to designated facility: ${targetShelter.name}`,
      `Activate priority medical intake at nearby regional facility`,
    ];

    if (params.forecast.predictedCasualtyRisk === 'HIGH') {
      actions.push('Execute secondary hazard mitigation: pre-stage high-water rescue apparatus');
    }

    const plan: ResponsePlan = {
      planId: `PLAN-${Date.now().toString().slice(-4)}`,
      incidentId: topIncident.incidentId,
      targetZone: topIncident.zone,
      title: `Coordinated Evacuation & Rescue Order — ${topIncident.zone}`,
      summary: `Synthesized response directive addressing ${topIncident.priorityLevel} incident in ${topIncident.zone}.`,
      priority: topIncident.priorityLevel === 'P1_CRITICAL' ? 'CRITICAL' : 'HIGH',
      actions,
      allocatedTeams,
      evacuationRoutes: [params.route.recommendedEvacuationCorridor],
      targetShelters: [targetShelter.name],
      confidence: 91,
      createdAt: Date.now(),
    };

    this.progress = 100;
    this.status = 'COMPLETE';
    return plan;
  }
}

export const coordinatorAgent = new CoordinatorAgent();
