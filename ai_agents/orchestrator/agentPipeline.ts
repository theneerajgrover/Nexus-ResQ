// ============================================================
// 11-AGENT PIPELINE ORCHESTRATOR
// ============================================================
// Orchestrates the exact 11 agents in sequential, parallel, and continuous phases:
// Ingestion -> Verification -> Situation -> Priority
// -> Parallel (Resource, Capacity, Route, Forecast)
// -> Coordinator -> Critic -> Human Approval Gate
// Continuous: Analytics Agent
// ============================================================

import {
  RawFieldInput,
  OrchestrationPipelineResult,
  AgentEvent,
} from '../types';

import { ingestionAgent } from '../agents/ingestionAgent';
import { verificationAgent } from '../agents/verificationAgent';
import { situationAgent } from '../agents/situationAgent';
import { priorityAgent } from '../agents/priorityAgent';
import { resourceAgent } from '../agents/resourceAgent';
import { capacityAgent } from '../agents/capacityAgent';
import { routeAgent } from '../agents/routeAgent';
import { forecastAgent } from '../agents/forecastAgent';
import { coordinatorAgent } from '../agents/coordinatorAgent';
import { criticAgent } from '../agents/criticAgent';
import { analyticsAgent } from '../agents/analyticsAgent';
import { humanSupervisionService } from '../supervision/humanApprovalGate';

export class AgentPipelineOrchestrator {
  /**
   * Executes the full 11-agent pipeline end-to-end.
   */
  public async executePipeline(rawInputs: RawFieldInput[]): Promise<OrchestrationPipelineResult> {
    const startTime = Date.now();
    const events: AgentEvent[] = [];

    const logEvent = (agentId: number, agentName: string, type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS', message: string) => {
      const event: AgentEvent = {
        id: `EVT-${Date.now()}-${events.length + 1}`,
        agentId,
        agentName,
        type,
        message,
        timestamp: Date.now(),
      };
      events.push(event);
      analyticsAgent.trackEvent(event);
    };

    // Phase 1: Sequential Ingestion
    logEvent(1, 'Ingestion Agent', 'INFO', `Collecting and normalizing ${rawInputs.length} field inputs.`);
    const normalized = await ingestionAgent.process(rawInputs);
    logEvent(1, 'Ingestion Agent', 'SUCCESS', `Normalized ${normalized.length} canonical incident reports.`);

    // Phase 2: Sequential Verification
    logEvent(2, 'Verification Agent', 'INFO', 'Analyzing reports for credibility, duplicates and conflicts.');
    const verified = await verificationAgent.process(normalized);
    const trustedCount = verified.filter(v => v.isVerified && !v.isDuplicate).length;
    logEvent(2, 'Verification Agent', 'SUCCESS', `Verified ${trustedCount} unique high-confidence incident reports.`);

    // Phase 3: Sequential Situation Consolidation
    logEvent(3, 'Situation Agent', 'INFO', 'Consolidating operational picture & identifying threat clusters.');
    const situation = await situationAgent.process(verified);
    logEvent(
      3,
      'Situation Agent',
      situation.environmentalThreatLevel === 'SEVERE' ? 'CRITICAL' : 'INFO',
      `Operational picture established: ${situation.criticalClusters.length} geographic clusters identified.`
    );

    // Phase 4: Sequential Priority Assessment
    logEvent(4, 'Priority Agent', 'INFO', 'Triaging incidents and scoring operational priority.');
    const priorities = await priorityAgent.process(situation);
    logEvent(
      4,
      'Priority Agent',
      'SUCCESS',
      `Triaged ${priorities.length} incidents. Highest priority: ${priorities[0]?.priorityLevel || 'P3_MODERATE'}.`
    );

    // Phase 5: PARALLEL LAYER (Resource, Capacity, Route, Forecast)
    logEvent(5, 'Resource Agent', 'INFO', 'Executing parallel evaluation: mapping responder assets.');
    logEvent(6, 'Capacity Agent', 'INFO', 'Executing parallel evaluation: assessing hospital & shelter capacity.');
    logEvent(7, 'Route Agent', 'INFO', 'Executing parallel evaluation: identifying safe evacuation corridors.');
    logEvent(8, 'Forecast Agent', 'INFO', 'Executing parallel evaluation: generating demand & hazard escalation projections.');

    const availableTeams = [
      { id: 'T-01', name: 'Alpha-14 (Search & Rescue)', type: 'search_and_rescue', available: true, lat: 52, lng: 48 },
      { id: 'T-02', name: 'Bravo-7 (Swiftwater Boat)', type: 'flood_rescue', available: true, lat: 35, lng: 30 },
      { id: 'T-03', name: 'Delta-22 (Medical Support)', type: 'medical', available: true, lat: 60, lng: 40 },
    ];

    const sheltersData = [
      { id: 'SH-01', name: 'Central Community Center', capacity: 1200, occupancy: 780 },
      { id: 'SH-02', name: 'Riverside High School Gymnasium', capacity: 800, occupancy: 790 },
    ];

    const hospitalsData = [
      { id: 'H-01', name: 'Metro General Hospital', beds: 42, icu: 6 },
    ];

    const [resourceProposals, capacity, route, forecast] = await Promise.all([
      resourceAgent.process(priorities, availableTeams),
      capacityAgent.process(sheltersData, hospitalsData),
      routeAgent.process({ lat: 52, lng: 48 }, 'Central Community Center'),
      forecastAgent.process(situation),
    ]);

    logEvent(5, 'Resource Agent', 'SUCCESS', `Matched suitable rescue units for ${resourceProposals.length} active incidents.`);
    logEvent(6, 'Capacity Agent', 'SUCCESS', `Evaluated ${capacity.nearbyShelters.length} shelter facilities. Overcapacity alert: ${capacity.isOverCapacityAlert}`);
    logEvent(7, 'Route Agent', 'SUCCESS', `Safe corridor verified: ${route.recommendedEvacuationCorridor} (Safety score: ${route.safetyScore}).`);
    logEvent(8, 'Forecast Agent', 'WARNING', `Escalation forecast complete: ${forecast.potentialDisplacementCount} potential evacuees projected.`);

    // Phase 6: Sequential Coordinator
    logEvent(9, 'Coordinator Agent', 'INFO', 'Synthesizing combined multi-agency response plan.');
    const responsePlan = await coordinatorAgent.process({
      priorities,
      resourceProposals,
      capacity,
      route,
      forecast,
    });
    logEvent(9, 'Coordinator Agent', 'SUCCESS', `Generated response plan: "${responsePlan.title}".`);

    // Phase 7: Sequential Critic
    logEvent(10, 'Critic Agent', 'INFO', 'Reviewing plan for safety violations, risks, and constraint validity.');
    const critique = await criticAgent.process(responsePlan);
    logEvent(
      10,
      'Critic Agent',
      critique.identifiedRisks.length > 0 ? 'WARNING' : 'SUCCESS',
      `Plan critique finalized. Identified ${critique.identifiedRisks.length} risk flags. HUMAN APPROVAL REQUIRED.`
    );

    // Phase 8: Human Approval Gate Registration
    const humanApproval = humanSupervisionService.registerPendingAction(responsePlan, critique);
    logEvent(
      10,
      'Critic Agent',
      'INFO',
      `Transferred response plan to Human Supervision Gate [Recommendation ID: ${humanApproval.recommendationId}].`
    );

    // Phase 9: Continuous Analytics Update
    const cycleTimeMs = Date.now() - startTime;
    logEvent(11, 'Analytics Agent', 'SUCCESS', `Pipeline execution cycle completed in ${cycleTimeMs}ms. All 11 agents synchronized.`);

    return {
      runId: `RUN-${Date.now()}`,
      timestamp: Date.now(),
      status: 'AWAITING_APPROVAL',
      completedAgents: 11,
      totalAgents: 11,
      operationalPicture: situation,
      priorityResults: priorities,
      responsePlan,
      critique,
      humanApproval,
      events,
    };
  }
}

export const agentPipelineOrchestrator = new AgentPipelineOrchestrator();
