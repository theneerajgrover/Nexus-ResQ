// ============================================================
// AGENT 10: CRITIC AGENT
// ============================================================
// Reviews the generated response plan and recommendations.
// Identifies risks, conflicts, unsafe assumptions or weaknesses before execution.
// CRITICAL GATE: Enforces that plans require Human Approval prior to execution.
// ============================================================

import { ResponsePlan, PlanCritique, AgentStatus } from '../types';

export class CriticAgent {
  public readonly id = 10;
  public readonly name = 'Critic';
  public readonly code = 'CRITIC_AGENT';
  public readonly desc = 'Plan review, risk identification & safety gate validation';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(plan: ResponsePlan): Promise<PlanCritique> {
    this.status = 'RUNNING';
    this.progress = 20;

    const risks: string[] = [];
    const conflicts: string[] = [];
    const mitigations: string[] = [];

    // Verify team adequacy
    if (plan.allocatedTeams.length < 2 && plan.priority === 'CRITICAL') {
      risks.push('Limited rescue unit redundancy for critical zone evacuation');
      mitigations.push('Request mutual aid from neighboring operational districts');
    }

    // Verify route safety
    if (plan.evacuationRoutes.length === 1) {
      risks.push('Single point of failure on primary evacuation corridor');
      mitigations.push('Establish secondary unimpeded emergency vehicle egress');
    }

    // Verify shelter assignment
    if (plan.targetShelters.length === 0) {
      conflicts.push('No designated intake facility provided in plan');
    }

    this.progress = 75;

    // By architectural mandate, all critical / high response operations require HUMAN APPROVAL
    const requiresHumanApproval = true;

    this.progress = 100;
    this.status = 'COMPLETE';

    return {
      planId: plan.planId,
      isSafe: conflicts.length === 0,
      identifiedRisks: risks,
      unresolvedConflicts: conflicts,
      requiresHumanApproval,
      suggestedMitigations: mitigations,
      critiqueConfidence: 89,
    };
  }
}

export const criticAgent = new CriticAgent();
