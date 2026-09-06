// ============================================================
// AI DECISION SUPPORT ENGINE
// ============================================================
// Synthesizes environmental risk assessments into prioritized,
// actionable emergency recommendations for Command Authorities.
// ============================================================

import { RiskAnalysisResult } from "./riskEngine";

export interface AIRecommendation {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  action: string;
  reason: string;
  affectedZone: string;
  estimatedPeopleAffected: number;
  recommendedResource: string;
  recommendedShelter?: string;
  recommendedTeamsCount: number;
  confidenceScore: number;
  riskFlags: string[];
  proposedActionsList: string[];
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "REPLANNING" | "COMPLETED";
  timestamp: number;
}

/**
 * Generates tailored AI recommendations based on zone risk assessment.
 */
export function generateAIRecommendations(
  zoneId: string,
  zoneName: string,
  riskAssessment: RiskAnalysisResult,
  population: number,
  availableShelterNames: string[] = ["Central Community Center", "Riverside High School"]
): AIRecommendation[] {
  const recommendations: AIRecommendation[] = [];
  const now = Date.now();

  if (riskAssessment.riskScore >= 80) {
    // CRITICAL RECS
    recommendations.push({
      id: `REC-CRIT-${zoneId}-${now}`,
      priority: "CRITICAL",
      action: `Evacuate ${zoneName}`,
      reason: `${riskAssessment.contributingFactors.slice(0, 2).join(" + ")} · Critical flood & structural risk`,
      affectedZone: zoneName,
      estimatedPeopleAffected: riskAssessment.affectedPopulationEstimate || Math.round(population * 0.75),
      recommendedResource: "Flood & Search/Rescue Teams + Evacuation Transport",
      recommendedShelter: availableShelterNames[0] || "Central Community Center",
      recommendedTeamsCount: Math.ceil((population / 2500) + 2),
      confidenceScore: riskAssessment.confidenceScore,
      riskFlags: [
        "Proximity to gas main / structural collapse hazard",
        "North approach route congested / unsafe",
        "High population density in low-lying sector",
      ],
      proposedActionsList: [
        `Dispatch structural rescue team via clear south/east corridor`,
        `Deploy MEDIC units to eastern staging area — Capacity Agent confirmed bed availability`,
        `Activate 200m safety exclusion perimeter around ${zoneName}`,
        `Issue urgent public evacuation broadcast to Zone ${zoneName}`,
        `Alert ${availableShelterNames[0] || "Shelter #1"} for immediate emergency intake`,
      ],
      status: "PENDING_APPROVAL",
      timestamp: now,
    });
  } else if (riskAssessment.riskScore >= 60) {
    // HIGH RECS
    recommendations.push({
      id: `REC-HIGH-${zoneId}-${now}`,
      priority: "HIGH",
      action: `Prepare Evacuation — ${zoneName}`,
      reason: `${riskAssessment.contributingFactors.join(", ")}`,
      affectedZone: zoneName,
      estimatedPeopleAffected: Math.round(population * 0.45),
      recommendedResource: "Rescue Vehicles & Medical Staging",
      recommendedShelter: availableShelterNames[1] || "Riverside High School",
      recommendedTeamsCount: 2,
      confidenceScore: riskAssessment.confidenceScore,
      riskFlags: ["Rising river water level", "Saturated soil embankment"],
      proposedActionsList: [
        `Pre-position 2 emergency rescue teams at staging point`,
        `Notify ${availableShelterNames[1] || "Shelter #2"} to prepare overflow cots`,
        `Broadcast targeted advisory alert to residents`,
      ],
      status: "PENDING_APPROVAL",
      timestamp: now,
    });
  } else if (riskAssessment.riskScore >= 40) {
    // MODERATE RECS
    recommendations.push({
      id: `REC-MOD-${zoneId}-${now}`,
      priority: "MODERATE",
      action: `Enhanced Monitoring — ${zoneName}`,
      reason: `Moderate risk detected. ${riskAssessment.contributingFactors[0] || "Elevated rainfall"}`,
      affectedZone: zoneName,
      estimatedPeopleAffected: Math.round(population * 0.15),
      recommendedResource: "Environmental Inspection Patrol",
      recommendedTeamsCount: 1,
      confidenceScore: riskAssessment.confidenceScore,
      riskFlags: ["Increased precipitation"],
      proposedActionsList: [
        `Increase sensor polling frequency to 5-minute intervals`,
        `Conduct visual check on drainage infrastructure`,
      ],
      status: "APPROVED",
      timestamp: now,
    });
  }

  return recommendations;
}
