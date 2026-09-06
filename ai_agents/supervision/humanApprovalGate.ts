// ============================================================
// HUMAN SUPERVISION & OPERATIONAL SAFETY GATE
// ============================================================
// Architectural Rule:
// CRITIC -> HUMAN APPROVAL -> EXECUTION
// The AI system must NOT automatically execute high-impact actions
// without explicit human authorization (ALLOW / APPROVE or REJECT / DENY).
// ============================================================

import { ResponsePlan, PlanCritique, HumanApprovalGate } from '../types';

export class HumanSupervisionService {
  private activePendingGates: Map<string, HumanApprovalGate> = new Map();

  /**
   * Registers a response plan awaiting human approval following Critic validation.
   */
  public registerPendingAction(plan: ResponsePlan, critique: PlanCritique): HumanApprovalGate {
    const recommendationId = `REC-${Date.now().toString().slice(-4)}`;

    const gate: HumanApprovalGate = {
      recommendationId,
      planId: plan.planId,
      status: 'PENDING_APPROVAL',
      actionSummary: `${plan.title} (${plan.priority})`,
      supportingIntelligence: [
        `Target Zone: ${plan.targetZone}`,
        `Allocated Teams: ${plan.allocatedTeams.join(', ')}`,
        `Assigned Corridors: ${plan.evacuationRoutes.join(', ')}`,
        `Intake Shelters: ${plan.targetShelters.join(', ')}`,
        ...critique.identifiedRisks.map(r => `Risk Flag: ${r}`),
      ],
      participatingAgents: [
        'Ingestion',
        'Verification',
        'Situation',
        'Priority',
        'Resource',
        'Capacity',
        'Route',
        'Forecast',
        'Coordinator',
        'Critic',
      ],
    };

    this.activePendingGates.set(recommendationId, gate);
    return gate;
  }

  /**
   * Authority/Command Operator issues explicit ALLOW / APPROVE decision.
   */
  public approve(recommendationId: string, reviewerId: string, comments?: string): HumanApprovalGate {
    const gate = this.activePendingGates.get(recommendationId);
    if (!gate) {
      throw new Error(`Pending recommendation '${recommendationId}' not found.`);
    }

    gate.status = 'APPROVED';
    gate.reviewedBy = reviewerId;
    gate.reviewTimestamp = Date.now();
    gate.comments = comments || 'Authorized for field execution by Command Operator';

    return gate;
  }

  /**
   * Authority/Command Operator issues explicit REJECT / DENY decision.
   */
  public reject(recommendationId: string, reviewerId: string, reason: string): HumanApprovalGate {
    const gate = this.activePendingGates.get(recommendationId);
    if (!gate) {
      throw new Error(`Pending recommendation '${recommendationId}' not found.`);
    }

    gate.status = 'REJECTED';
    gate.reviewedBy = reviewerId;
    gate.reviewTimestamp = Date.now();
    gate.comments = reason;

    return gate;
  }

  public getPendingGate(recommendationId: string): HumanApprovalGate | undefined {
    return this.activePendingGates.get(recommendationId);
  }

  public getAllPending(): HumanApprovalGate[] {
    return Array.from(this.activePendingGates.values()).filter(g => g.status === 'PENDING_APPROVAL');
  }
}

export const humanSupervisionService = new HumanSupervisionService();
