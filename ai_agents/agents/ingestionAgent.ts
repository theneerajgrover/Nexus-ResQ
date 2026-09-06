// ============================================================
// AGENT 1: INGESTION AGENT
// ============================================================
// Collects incoming citizen/field reports, sensor inputs and operational data.
// Normalizes incoming information into a canonical incident format.
// ============================================================

import { RawFieldInput, NormalizedReport, AgentStatus } from '../types';

export class IngestionAgent {
  public readonly id = 1;
  public readonly name = 'Ingestion';
  public readonly code = 'INGESTION_AGENT';
  public readonly desc = 'Multi-source data collection & canonical normalization';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(rawInputs: RawFieldInput[]): Promise<NormalizedReport[]> {
    this.status = 'RUNNING';
    this.progress = 20;

    const normalized: NormalizedReport[] = [];

    for (let i = 0; i < rawInputs.length; i++) {
      const input = rawInputs[i];
      const reportId = `REP-${Date.now().toString().slice(-4)}-${i + 1}`;

      normalized.push({
        reportId,
        source: input.source,
        location: input.location.trim(),
        lat: input.coordinates.lat,
        lng: input.coordinates.lng,
        category: input.category.toUpperCase(),
        details: input.text.trim(),
        rawTimestamp: input.timestamp,
        ingestedAt: Date.now(),
      });

      this.progress = Math.min(95, Math.round(((i + 1) / rawInputs.length) * 100));
    }

    this.progress = 100;
    this.status = 'COMPLETE';
    return normalized;
  }
}

export const ingestionAgent = new IngestionAgent();
