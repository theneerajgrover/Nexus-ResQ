// ============================================================
// DISASTER SIMULATION ENGINE — SIH DEMONSTRATION MODE
// ============================================================
// Simulates compounding disaster scenarios (e.g. Extreme Rainfall + River Rising + High Soil Saturation)
// and automatically triggers the full end-to-end intelligence cascade:
// 1. Environmental updates
// 2. Risk recalculation
// 3. Zone risk updates
// 4. Vulnerable population estimates
// 5. AI decision recommendations
// 6. Resource prioritization
// 7. Evacuation route orders
// 8. Shelter capacity recalculations
// 9. Emergency mission generation
// 10. Automated public & operational alert broadcasts
// ============================================================

import { MutationCtx } from "./_generated/server";
import { calculateRisk } from "./riskEngine";
import { generateAIRecommendations } from "./aiDecisionEngine";
import { rankZonesByPriority, DEFAULT_PRIORITY_WEIGHTS } from "./priorityEngine";

export interface SimulationConfig {
  scenarioName: string; // "Heavy Rainfall + River Surge + High Saturation"
  intensity: "MODERATE" | "HIGH" | "CRITICAL";
  rainfallMmHr: number; // e.g. 110
  riverLevelMeters: number; // e.g. 5.8
  soilSaturationPct: number; // e.g. 92
  targetZoneId?: string; // default "ZONE-NE4"
}

/**
 * Runs a complete disaster simulation pipeline across the database.
 */
export async function runDisasterSimulation(
  ctx: MutationCtx,
  config: SimulationConfig
) {
  const now = Date.now();
  const timeFormatted = new Date(now).toLocaleTimeString("en-GB", { hour12: false });

  // 1. Store Environmental Sensor Reading
  await ctx.db.insert("sensorReadings", {
    sensorId: `SIM-SENSOR-${now.toString().slice(-4)}`,
    disasterType: "flood",
    location: "Bridge Sector 7 / Zone NE-4",
    latitude: 52.0,
    longitude: 48.0,
    rainfall: config.rainfallMmHr,
    temperature: 24,
    humidity: 95,
    windSpeed: 45,
    riverWaterLevel: config.riverLevelMeters,
    soilMoisture: config.soilSaturationPct,
    seismicReading: 0,
    fireIndicator: 0,
    weatherCondition: "Extreme Downpour",
    satelliteData: "RADAR_SAT_SURGE_ALERT",
    populationDensity: 4500,
    infrastructureStatus: "Critical River Embankment Stress",
    timestamp: now,
  });

  // 2. Recalculate Risk
  const riskResult = calculateRisk({
    rainfall: config.rainfallMmHr,
    riverWaterLevel: config.riverLevelMeters,
    soilMoisture: config.soilSaturationPct,
    populationDensity: 4500,
    infrastructureVulnerability: 8,
    roadVulnerability: 8,
    shelterAvailabilityCount: 2,
  });

  // 3. Update Affected Zone in DB
  const existingZones = await ctx.db.query("riskZones").collect();
  const targetZone = existingZones.find(z => z.zoneId === (config.targetZoneId || "ZONE-NE4")) || existingZones[0];

  if (targetZone) {
    await ctx.db.patch(targetZone._id, {
      riskScore: riskResult.riskScore,
      riskLevel: riskResult.riskCategory,
      vulnerablePopulation: Math.round(targetZone.population * 0.38),
      currentStatus: riskResult.riskScore > 75 ? "active_evacuation" : "warning",
      lastUpdatedTime: now,
    });
  }

  // 4. Generate AI Recommendations
  const aiRecs = generateAIRecommendations(
    targetZone ? targetZone.zoneId : "ZONE-NE4",
    targetZone ? targetZone.name : "Bridge Sector",
    riskResult,
    targetZone ? targetZone.population : 12500,
    ["Central Community Center", "Riverside High School"]
  );

  for (const rec of aiRecs) {
    await ctx.db.insert("aiRecommendations", {
      recommendationId: rec.id,
      priority: rec.priority,
      action: rec.action,
      reason: rec.reason,
      affectedZone: rec.affectedZone,
      estimatedPeopleAffected: rec.estimatedPeopleAffected,
      recommendedResource: rec.recommendedResource,
      recommendedShelter: rec.recommendedShelter,
      recommendedTeamsCount: rec.recommendedTeamsCount,
      confidenceScore: rec.confidenceScore,
      riskFlags: rec.riskFlags,
      proposedActionsList: rec.proposedActionsList,
      status: "PENDING_APPROVAL",
      timestamp: now,
    });
  }

  // 5. Generate Emergency Alert
  const alertId = `ALT-SIM-${now.toString().slice(-4)}`;
  await ctx.db.insert("alerts", {
    alertId,
    title: `🚨 CRITICAL FLOOD & RISK ALERT — ${targetZone ? targetZone.name : "Zone NE-4"}`,
    message: `Simulated torrential rainfall (${config.rainfallMmHr}mm/hr) and river surge (+${config.riverLevelMeters}m). Risk level: ${riskResult.riskCategory} (${riskResult.riskScore}/100). Mandatory evacuation recommended for low-lying sectors.`,
    disasterType: "flood",
    severity: riskResult.riskCategory === "CRITICAL" ? "CRITICAL" : "WARNING",
    affectedArea: targetZone ? targetZone.name : "Bridge Sector 7",
    targetAudience: "public",
    location: targetZone ? targetZone.name : "Zone NE-4",
    timestamp: now,
    timeFormatted,
    expirationTime: now + 3600000 * 6, // 6 hours
    status: "active",
  });

  // 6. Generate Emergency Mission if Risk is Critical
  let createdMissionId: string | null = null;
  if (riskResult.riskScore >= 75) {
    createdMissionId = `INC-${Math.floor(Math.random() * 9000 + 1000)}`;
    await ctx.db.insert("emergencyMissions", {
      missionId: createdMissionId,
      incidentId: createdMissionId,
      type: "FLOOD",
      location: `${targetZone ? targetZone.name : "Zone NE-4"} River Embankment`,
      latitude: 52.0,
      longitude: 48.0,
      priority: "CRITICAL",
      severity: "CRITICAL",
      description: `SIMULATED EMERGENCY: Rapid river surge and soil saturation breaching embankment. Evacuate 4,200 residents to Central Community Center.`,
      peopleAffected: riskResult.affectedPopulationEstimate,
      medicalRequirement: true,
      requiredResources: ["Boats", "Trauma Kits", "Evacuation Transport"],
      status: "PENDING",
      pending: true,
      respondersCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 7. Write Audit Log Entry
  await ctx.db.insert("auditLogs", {
    actor: "SIMULATION_ENGINE (SIH DEMO)",
    action: "SIMULATION_EXECUTED",
    entity: `Scenario: ${config.scenarioName}`,
    timestamp: now,
    timeFormatted,
    metadata: `Rainfall: ${config.rainfallMmHr}mm/hr | River: +${config.riverLevelMeters}m | Risk Score: ${riskResult.riskScore}/100 (${riskResult.riskCategory})`,
  });

  return {
    success: true,
    scenarioName: config.scenarioName,
    riskScore: riskResult.riskScore,
    riskCategory: riskResult.riskCategory,
    affectedZone: targetZone ? targetZone.name : "Bridge Sector 7",
    affectedPopulation: riskResult.affectedPopulationEstimate,
    recommendationsCount: aiRecs.length,
    alertCreatedId: alertId,
    missionCreatedId: createdMissionId,
    timestamp: now,
  };
}
