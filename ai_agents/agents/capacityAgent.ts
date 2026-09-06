// ============================================================
// AGENT 6: CAPACITY AGENT
// ============================================================
// Monitors capacity of hospitals, shelters and other critical facilities.
// Identifies capacity constraints and potential overload.
// (Executes in Parallel Layer)
// ============================================================

import { CapacityAssessment, AgentStatus } from '../types';

export class CapacityAgent {
  public readonly id = 6;
  public readonly name = 'Capacity';
  public readonly code = 'CAPACITY_AGENT';
  public readonly desc = 'Hospital & shelter capacity projection';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(
    sheltersData: { id: string; name: string; capacity: number; occupancy: number }[],
    hospitalsData: { id: string; name: string; beds: number; icu: number }[]
  ): Promise<CapacityAssessment> {
    this.status = 'RUNNING';
    this.progress = 20;

    const nearbyShelters = sheltersData.map(s => {
      const available = Math.max(0, s.capacity - s.occupancy);
      const utilization = s.capacity > 0 ? (s.occupancy / s.capacity) * 100 : 100;
      return {
        shelterId: s.id,
        name: s.name,
        capacity: s.capacity,
        occupancy: s.occupancy,
        availableBeds: available,
        utilizationRate: Math.round(utilization),
        canAcceptEvacuees: utilization < 95,
      };
    });

    this.progress = 60;

    const hospitals = hospitalsData.map(h => ({
      hospitalId: h.id,
      name: h.name,
      availableBeds: h.beds,
      icuCapacity: h.icu,
    }));

    const isOverCapacityAlert = nearbyShelters.every(s => !s.canAcceptEvacuees);

    this.progress = 100;
    this.status = 'COMPLETE';

    return {
      nearbyShelters,
      hospitals,
      isOverCapacityAlert,
    };
  }
}

export const capacityAgent = new CapacityAgent();
