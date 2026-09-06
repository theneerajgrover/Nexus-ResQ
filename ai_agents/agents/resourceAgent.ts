// ============================================================
// AGENT 5: RESOURCE AGENT
// ============================================================
// Identifies available responders, rescue teams, equipment and other resources.
// Determines suitable resources for active incidents.
// (Executes in Parallel Layer)
// ============================================================

import { PriorityTriageResult, ResourceAllocationProposal, AgentStatus } from '../types';

export class ResourceAgent {
  public readonly id = 5;
  public readonly name = 'Resource';
  public readonly code = 'RESOURCE_AGENT';
  public readonly desc = 'Asset availability & suitability mapping';
  public status: AgentStatus = 'IDLE';
  public progress = 0;

  public async process(
    priorities: PriorityTriageResult[],
    availableTeams: { id: string; name: string; type: string; available: boolean; lat: number; lng: number }[]
  ): Promise<ResourceAllocationProposal[]> {
    this.status = 'RUNNING';
    this.progress = 15;

    const proposals: ResourceAllocationProposal[] = [];
    const assignedTeamIds = new Set<string>();

    for (let i = 0; i < priorities.length; i++) {
      const incident = priorities[i];
      const neededEquipment: string[] = [];

      if (incident.priorityLevel === 'P1_CRITICAL') {
        neededEquipment.push('Hydraulic Extrication Tools', 'Swiftwater Boats', 'Advanced Life Support Kit');
      } else if (incident.priorityLevel === 'P2_HIGH') {
        neededEquipment.push('Rescue Vehicle', 'Standard Medical Staging Kit');
      } else {
        neededEquipment.push('First Aid & Patrol Supplies');
      }

      // Match suitable unassigned teams
      const suitableTeams = availableTeams
        .filter(t => t.available && !assignedTeamIds.has(t.id))
        .slice(0, incident.priorityLevel === 'P1_CRITICAL' ? 2 : 1)
        .map(t => {
          assignedTeamIds.add(t.id);
          return {
            teamId: t.id,
            teamName: t.name,
            teamType: t.type,
            etaMinutes: Math.floor(8 + Math.random() * 12),
            distanceKm: parseFloat((2.5 + Math.random() * 4).toFixed(1)),
          };
        });

      proposals.push({
        incidentId: incident.incidentId,
        proposedUnits: suitableTeams,
        equipmentNeeded: neededEquipment,
        sufficientResourcesAvailable: suitableTeams.length > 0,
      });

      this.progress = Math.min(95, Math.round(((i + 1) / priorities.length) * 100));
    }

    this.progress = 100;
    this.status = 'COMPLETE';
    return proposals;
  }
}

export const resourceAgent = new ResourceAgent();
