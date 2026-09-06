// ============================================================
// AGENT 3: SITUATION AGENT
// ============================================================
// Builds and continuously updates the operational picture.
// Consolidates verified information into the current disaster situation.
// ============================================================

import { VerifiedReport, OperationalPicture, AgentStatus } from '../types';

export class SituationAgent {
  public readonly id = 3;
  public readonly name = 'Situation';
  public readonly code = 'SITUATION_AGENT';
  public readonly desc = 'Operational picture consolidation & threat assessment';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(verifiedReports: VerifiedReport[]): Promise<OperationalPicture> {
    this.status = 'RUNNING';
    this.progress = 25;

    // Filter to verified and non-duplicate records
    const trusted = verifiedReports.filter(r => r.isVerified && !r.isDuplicate);

    // Identify geographic clusters
    const clustersMap = new Map<string, { lat: number; lng: number; count: number; maxSeverityScore: number }>();

    for (const report of trusted) {
      const zone = report.location || 'Central Sector';
      const existing = clustersMap.get(zone) || { lat: report.lat, lng: report.lng, count: 0, maxSeverityScore: 0 };
      existing.count += 1;
      clustersMap.set(zone, existing);
    }

    this.progress = 65;

    const clusters = Array.from(clustersMap.entries()).map(([zoneName, data]) => {
      let severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'MODERATE';
      if (data.count >= 4) severity = 'CRITICAL';
      else if (data.count >= 2) severity = 'HIGH';

      return {
        zoneName,
        center: { lat: data.lat, lng: data.lng },
        severity,
        incidentCount: data.count,
      };
    });

    let overallThreat: 'SAFE' | 'ELEVATED' | 'HIGH' | 'SEVERE' = 'ELEVATED';
    if (clusters.some(c => c.severity === 'CRITICAL')) {
      overallThreat = 'SEVERE';
    } else if (clusters.some(c => c.severity === 'HIGH')) {
      overallThreat = 'HIGH';
    }

    this.progress = 100;
    this.status = 'COMPLETE';

    return {
      timestamp: Date.now(),
      activeIncidentsCount: trusted.length,
      verifiedReports: trusted,
      criticalClusters: clusters,
      environmentalThreatLevel: overallThreat,
    };
  }
}

export const situationAgent = new SituationAgent();
