// ============================================================
// AGENT 2: VERIFICATION AGENT
// ============================================================
// Verifies reports for credibility, duplicates, conflicts and stale information.
// Determines whether incoming information can be trusted.
// ============================================================

import { NormalizedReport, VerifiedReport, AgentStatus } from '../types';

export class VerificationAgent {
  public readonly id = 2;
  public readonly name = 'Verification';
  public readonly code = 'VERIFICATION_AGENT';
  public readonly desc = 'Credibility verification, deduplication & conflict checks';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(reports: NormalizedReport[]): Promise<VerifiedReport[]> {
    this.status = 'RUNNING';
    this.progress = 10;

    const verifiedList: VerifiedReport[] = [];
    const seenLocations = new Map<string, string>(); // location -> reportId

    for (let i = 0; i < reports.length; i++) {
      const rep = reports[i];
      const conflicts: string[] = [];
      let isDuplicate = false;
      let duplicateOf: string | undefined = undefined;

      // Spatial & category deduplication heuristic (within same location area)
      const locKey = `${rep.location.toLowerCase()}_${rep.category}`;
      if (seenLocations.has(locKey)) {
        isDuplicate = true;
        duplicateOf = seenLocations.get(locKey);
      } else {
        seenLocations.set(locKey, rep.reportId);
      }

      // Check for timestamp staleness (> 4 hours old)
      const ageHours = (Date.now() - rep.rawTimestamp) / (1000 * 60 * 60);
      if (ageHours > 4) {
        conflicts.push('Stale report timestamp (> 4 hours old)');
      }

      // Credibility scoring based on source and consistency
      let credibility = 85;
      if (rep.source === 'SENSOR') credibility = 95;
      if (rep.source === 'RESPONDER') credibility = 92;
      if (isDuplicate) credibility = Math.max(50, credibility - 25);
      if (conflicts.length > 0) credibility = Math.max(40, credibility - 20);

      verifiedList.push({
        ...rep,
        isVerified: credibility >= 60,
        credibilityScore: credibility,
        isDuplicate,
        duplicateOf,
        conflictFlags: conflicts,
      });

      this.progress = Math.min(95, Math.round(((i + 1) / reports.length) * 100));
    }

    this.progress = 100;
    this.status = 'COMPLETE';
    return verifiedList;
  }
}

export const verificationAgent = new VerificationAgent();
