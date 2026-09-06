// ============================================================
// AGENT 8: FORECAST AGENT
// ============================================================
// Forecasts potential demand, incident escalation and resource requirements.
// Provides forward-looking intelligence to the command system.
// (Executes in Parallel Layer)
// ============================================================

import { OperationalPicture, EscalationForecast, AgentStatus } from '../types';

export class ForecastAgent {
  public readonly id = 8;
  public readonly name = 'Forecast';
  public readonly code = 'FORECAST_AGENT';
  public readonly desc = 'Demand & escalation forecasting';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(situation: OperationalPicture): Promise<EscalationForecast> {
    this.status = 'RUNNING';
    this.progress = 20;

    const criticalCount = situation.criticalClusters.filter(c => c.severity === 'CRITICAL').length;
    let predictedCasualty: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' = 'MODERATE';
    let displacement = 450;
    const secondaryHazards: string[] = ['Power grid degradation'];
    const recommendations: string[] = ['Preposition mobile water purification units'];

    if (criticalCount >= 2 || situation.environmentalThreatLevel === 'SEVERE') {
      predictedCasualty = 'HIGH';
      displacement = 1800;
      secondaryHazards.push('Flash flood cresting in downstream zone', 'Secondary mudslide along river corridor');
      recommendations.push(
        'Deploy heavy pumps to North Pumping Substation',
        'Pre-stage high-clearance rescue vehicles at staging point Bravo'
      );
    } else if (criticalCount === 1 || situation.environmentalThreatLevel === 'HIGH') {
      displacement = 950;
      secondaryHazards.push('Road embankment saturation failure');
      recommendations.push('Prepare overflow shelter capacity in Central Zone');
    }

    this.progress = 80;

    const forecast: EscalationForecast = {
      timeHorizonHours: 6,
      predictedCasualtyRisk: predictedCasualty,
      potentialDisplacementCount: displacement,
      secondaryHazards,
      recommendedPrepositioning: recommendations,
    };

    this.progress = 100;
    this.status = 'COMPLETE';
    return forecast;
  }
}

export const forecastAgent = new ForecastAgent();
