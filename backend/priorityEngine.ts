// ============================================================
// AI-BASED RESOURCE PRIORITIZATION ENGINE
// ============================================================
// Ranks emergency risk zones according to transparent operational priority formula.
// ============================================================

export interface ScoringWeights {
  riskWeight: number; // default 0.35
  populationVulnerabilityWeight: number; // default 0.25
  urgencyWeight: number; // default 0.20
  infrastructureDamageWeight: number; // default 0.10
  resourceShortageWeight: number; // default 0.10
}

export const DEFAULT_PRIORITY_WEIGHTS: ScoringWeights = {
  riskWeight: 0.35,
  populationVulnerabilityWeight: 0.25,
  urgencyWeight: 0.20,
  infrastructureDamageWeight: 0.10,
  resourceShortageWeight: 0.10,
};

export interface ZonePriorityData {
  zoneId: string;
  name: string;
  riskScore: number; // 0-100
  populationVulnerability: number; // 0-100 (percentage vulnerable)
  urgencyScore: number; // 0-100 (rate of deterioration or pending SOS count)
  infrastructureDamageScore: number; // 0-100
  resourceShortageScore: number; // 0-100
}

export interface RankedZoneResult extends ZonePriorityData {
  priorityScore: number; // 0-100
  rank: number;
  priorityLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
}

/**
 * Calculates priority score for a single zone using transparent weighted formula.
 */
export function calculatePriorityScore(
  data: ZonePriorityData,
  weights: ScoringWeights = DEFAULT_PRIORITY_WEIGHTS
): number {
  const normRisk = Math.min(100, Math.max(0, data.riskScore));
  const normVuln = Math.min(100, Math.max(0, data.populationVulnerability));
  const normUrg = Math.min(100, Math.max(0, data.urgencyScore));
  const normInfra = Math.min(100, Math.max(0, data.infrastructureDamageScore));
  const normRes = Math.min(100, Math.max(0, data.resourceShortageScore));

  const rawScore =
    normRisk * weights.riskWeight +
    normVuln * weights.populationVulnerabilityWeight +
    normUrg * weights.urgencyWeight +
    normInfra * weights.infrastructureDamageWeight +
    normRes * weights.resourceShortageWeight;

  return Math.min(100, Math.max(0, Math.round(rawScore)));
}

/**
 * Ranks an array of zones by emergency priority.
 */
export function rankZonesByPriority(
  zones: ZonePriorityData[],
  weights: ScoringWeights = DEFAULT_PRIORITY_WEIGHTS
): RankedZoneResult[] {
  const scored = zones.map((z) => {
    const priorityScore = calculatePriorityScore(z, weights);
    let priorityLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" = "LOW";
    if (priorityScore >= 80) priorityLevel = "CRITICAL";
    else if (priorityScore >= 60) priorityLevel = "HIGH";
    else if (priorityScore >= 40) priorityLevel = "MODERATE";

    return {
      ...z,
      priorityScore,
      priorityLevel,
      rank: 0,
    };
  });

  // Sort descending by priorityScore
  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  // Assign ranks (1-indexed)
  return scored.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
