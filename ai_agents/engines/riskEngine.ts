// ============================================================
// DISASTER RISK ENGINE — DECISION SUPPORT ENGINE
// ============================================================
// Calculates risk scores (0–100) and risk categories based on
// environmental data, terrain, population density, and infrastructure status.
//
// NOTE: Designed as a Decision Support Engine to assist emergency authorities.
// ============================================================

export interface RiskInputData {
  rainfall: number; // mm/hr (0 - 150+)
  riverWaterLevel: number; // meters above normal (0 - 10)
  soilMoisture: number; // % (0 - 100)
  elevationMeters?: number; // meters above sea level (0 - 2000)
  historicalDisasterFrequency?: number; // 0 - 10 rating
  populationDensity: number; // people per sq km
  infrastructureVulnerability?: number; // 0 - 10 rating
  roadVulnerability?: number; // 0 - 10 rating
  shelterAvailabilityCount?: number; // number of open shelters nearby
  seismicReading?: number; // Richter equivalent magnitude
  windSpeed?: number; // km/h
}

export interface RiskAnalysisResult {
  riskScore: number; // 0 to 100
  riskCategory: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  confidenceScore: number; // e.g. 0.85 to 0.95
  contributingFactors: string[];
  affectedPopulationEstimate: number;
  recommendedAction: string;
}

/**
 * Calculates a comprehensive disaster risk score from 0 to 100.
 */
export function calculateRisk(input: RiskInputData): RiskAnalysisResult {
  const factors: string[] = [];

  // 1. Environmental Hydro-Meteorological Factor (Weight ~ 40%)
  let hydroFactor = 0;

  // Heavy Rainfall score (0 - 35)
  if (input.rainfall > 100) {
    hydroFactor += 35;
    factors.push(`Extreme rainfall detected (${input.rainfall} mm/hr)`);
  } else if (input.rainfall > 50) {
    hydroFactor += 25;
    factors.push(`Heavy rainfall recorded (${input.rainfall} mm/hr)`);
  } else if (input.rainfall > 20) {
    hydroFactor += 15;
    factors.push(`Moderate rainfall (${input.rainfall} mm/hr)`);
  } else if (input.rainfall > 5) {
    hydroFactor += 5;
  }

  // River Water Level score (0 - 30)
  if (input.riverWaterLevel > 5) {
    hydroFactor += 30;
    factors.push(`Critical river water level (+${input.riverWaterLevel}m above normal)`);
  } else if (input.riverWaterLevel > 3) {
    hydroFactor += 20;
    factors.push(`High river water level (+${input.riverWaterLevel}m above normal)`);
  } else if (input.riverWaterLevel > 1.5) {
    hydroFactor += 10;
    factors.push(`Elevated river level (+${input.riverWaterLevel}m)`);
  }

  // Soil Saturation score (0 - 20)
  if (input.soilMoisture > 85) {
    hydroFactor += 20;
    factors.push(`Extreme soil saturation (${input.soilMoisture}%) - high landslide risk`);
  } else if (input.soilMoisture > 70) {
    hydroFactor += 12;
    factors.push(`High soil moisture (${input.soilMoisture}%)`);
  }

  // 2. Wind & Seismic Factors (Weight ~ 15%)
  let hazardBonus = 0;
  if (input.seismicReading && input.seismicReading > 5.0) {
    hazardBonus += 25;
    factors.push(`Seismic activity registered (${input.seismicReading} M)`);
  }
  if (input.windSpeed && input.windSpeed > 80) {
    hazardBonus += 15;
    factors.push(`High gale wind speed (${input.windSpeed} km/h)`);
  }

  // 3. Vulnerability & Exposure Factor (Weight ~ 30%)
  let vulnerabilityFactor = 0;

  // Population Density exposure
  if (input.populationDensity > 5000) {
    vulnerabilityFactor += 15;
    factors.push(`High population density area (${input.populationDensity} residents/sq km)`);
  } else if (input.populationDensity > 2000) {
    vulnerabilityFactor += 10;
  } else {
    vulnerabilityFactor += 5;
  }

  // Infrastructure & Terrain Vulnerability
  const infraVuln = input.infrastructureVulnerability ?? 5;
  const roadVuln = input.roadVulnerability ?? 5;
  vulnerabilityFactor += (infraVuln * 0.8) + (roadVuln * 0.7);

  if (infraVuln > 7) factors.push("Vulnerable critical infrastructure");
  if (roadVuln > 7) factors.push("High road blockage & access risk");

  // 4. Mitigation Buffer (Shelter availability reduces effective risk)
  let shelterBuffer = 0;
  const shelters = input.shelterAvailabilityCount ?? 2;
  if (shelters === 0) {
    vulnerabilityFactor += 10;
    factors.push("Zero open shelters available in immediate vicinity");
  } else {
    shelterBuffer = Math.min(shelters * 2, 8);
  }

  // Compute Raw Composite Risk Score
  let rawScore = (hydroFactor * 0.45) + (vulnerabilityFactor * 0.35) + (hazardBonus * 0.20) - shelterBuffer;
  const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

  // Categorize Risk Level
  let riskCategory: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  let recommendedAction: string;

  if (riskScore <= 20) {
    riskCategory = "SAFE";
    recommendedAction = "Maintain standard environmental monitoring. Conditions normal.";
  } else if (riskScore <= 40) {
    riskCategory = "LOW";
    recommendedAction = "Issue advisory alerts. Pre-stage local response resources.";
  } else if (riskScore <= 61) {
    riskCategory = "MODERATE";
    recommendedAction = "Prepare shelters for activation. Pre-position emergency teams. Notify vulnerable populations.";
  } else if (riskScore <= 80) {
    riskCategory = "HIGH";
    recommendedAction = "Issue evacuation warning for low-lying zones. Activate primary emergency shelters and route guidance.";
  } else {
    riskCategory = "CRITICAL";
    recommendedAction = "MANDATORY EVACUATION REQUIRED IMMEDIATELY. Deploy search & rescue teams, close unsafe roads, activate all overflow shelters.";
  }

  // Estimate affected population based on density and risk score
  const affectedFactor = (riskScore / 100) * 0.85;
  const affectedPopulationEstimate = Math.round(input.populationDensity * 4.5 * affectedFactor);

  // Confidence calculation based on data availability
  const confidenceScore = Number((0.85 + (factors.length * 0.02)).toFixed(2));

  return {
    riskScore,
    riskCategory,
    confidenceScore: Math.min(0.98, confidenceScore),
    contributingFactors: factors.length > 0 ? factors : ["Normal environmental baseline parameters"],
    affectedPopulationEstimate,
    recommendedAction,
  };
}
