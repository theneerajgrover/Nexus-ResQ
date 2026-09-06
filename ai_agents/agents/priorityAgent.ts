// ============================================================
// AGENT 4: PRIORITY AGENT
// ============================================================
// Evaluates incidents and assigns priority/severity.
// Determines which incidents require immediate operational attention.
// ============================================================

import { OperationalPicture, PriorityTriageResult, AgentStatus } from '../types';

export class PriorityAgent {
  public readonly id = 4;
  public readonly name = 'Priority';
  public readonly code = 'PRIORITY_AGENT';
  public readonly desc = 'Incident triage & severity scoring';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(situation: OperationalPicture): Promise<PriorityTriageResult[]> {
    this.status = 'RUNNING';
    this.progress = 20;

    const triageResults: PriorityTriageResult[] = [];

    for (let i = 0; i < situation.verifiedReports.length; i++) {
      const rep = situation.verifiedReports[i];
      let score = 50;
      const factors: string[] = [];

      // Category weighting
      if (rep.category.includes('TRAPPED') || rep.category.includes('STRUCTURAL') || rep.category.includes('COLLAPSE')) {
        score += 35;
        factors.push('Life-safety structural hazard / trapped persons');
      } else if (rep.category.includes('FLOOD') || rep.category.includes('FIRE')) {
        score += 25;
        factors.push('Rapid-onset environmental threat');
      } else if (rep.category.includes('MEDICAL')) {
        score += 20;
        factors.push('Urgent medical assistance requested');
      }

      // Proximity to cluster
      const cluster = situation.criticalClusters.find(c => c.zoneName === rep.location);
      if (cluster && cluster.severity === 'CRITICAL') {
        score += 15;
        factors.push('Located within active high-density incident cluster');
      }

      const clampedScore = Math.min(100, score);
      let level: 'P1_CRITICAL' | 'P2_HIGH' | 'P3_MODERATE' | 'P4_LOW' = 'P3_MODERATE';

      if (clampedScore >= 80) level = 'P1_CRITICAL';
      else if (clampedScore >= 65) level = 'P2_HIGH';
      else if (clampedScore < 40) level = 'P4_LOW';

      triageResults.push({
        incidentId: rep.reportId,
        zone: rep.location,
        priorityScore: clampedScore,
        priorityLevel: level,
        requiresImmediateEvacuation: clampedScore >= 80,
        contributingFactors: factors,
      });

      this.progress = Math.min(95, Math.round(((i + 1) / situation.verifiedReports.length) * 100));
    }

    // Sort descending by priority score
    triageResults.sort((a, b) => b.priorityScore - a.priorityScore);

    this.progress = 100;
    this.status = 'COMPLETE';
    return triageResults;
  }
}

export const priorityAgent = new PriorityAgent();
