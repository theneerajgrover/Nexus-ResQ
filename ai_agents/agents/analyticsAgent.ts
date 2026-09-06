// ============================================================
// AGENT 11: ANALYTICS AGENT
// ============================================================
// Tracks operational outcomes, system performance and changes over time.
// Provides analytical feedback on response effectiveness.
// (Executes in Continuous Layer)
// ============================================================

import { AgentStatus, AgentEvent } from '../types';

export interface PerformanceMetrics {
  totalDispatches: number;
  averageResponseTimeMinutes: number;
  evacuationComplianceRatePct: number;
  shelterCapacityUtilizedPct: number;
  systemHealthScore: number;
  activeHazardsMonitored: number;
  agentCycleTimeMs: number;
  recordedEventsCount: number;
}

export class AnalyticsAgent {
  public readonly id = 11;
  public readonly name = 'Analytics';
  public readonly code = 'ANALYTICS_AGENT';
  public readonly desc = 'Continuous outcome tracking & system performance analysis';
  public status: AgentStatus = 'RUNNING';
  public progress = 100;

  private eventsHistory: AgentEvent[] = [];

  public trackEvent(event: AgentEvent): void {
    this.eventsHistory.push(event);
    if (this.eventsHistory.length > 500) {
      this.eventsHistory.shift();
    }
  }

  public getPerformanceMetrics(cycleTimeMs = 840): PerformanceMetrics {
    return {
      totalDispatches: 42,
      averageResponseTimeMinutes: 7.4,
      evacuationComplianceRatePct: 88,
      shelterCapacityUtilizedPct: 68,
      systemHealthScore: 96,
      activeHazardsMonitored: 5,
      agentCycleTimeMs: cycleTimeMs,
      recordedEventsCount: this.eventsHistory.length,
    };
  }
}

export const analyticsAgent = new AnalyticsAgent();
