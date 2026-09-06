import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateRole } from "./authHelpers";

// Query all emergency missions
export const getMissions = query({
  args: {
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    pendingOnly: v.optional(v.boolean()),
  },
  handler: async (ctx: any, args: any) => {
    let list = await ctx.db.query("emergencyMissions").collect();

    if (args.pendingOnly) {
      list = list.filter((m: any) => m.pending || m.status === "pending" || m.status === "PENDING");
    } else if (args.status) {
      list = list.filter((m: any) => m.status === args.status);
    }

    if (args.priority) {
      list = list.filter((m: any) => m.priority === args.priority);
    }

    return list;
  },
});

// Query mission by ID
export const getMissionById = query({
  args: { missionId: v.string() },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("emergencyMissions")
      .filter((q: any) =>
        q.or(
          q.eq(q.field("missionId"), args.missionId),
          q.eq(q.field("incidentId"), args.missionId)
        )
      )
      .first();
  },
});

// Create Emergency Mission (Authority/Admin)
export const createMission = mutation({
  args: {
    type: v.string(), // STRUCTURAL | FLOOD | MEDICAL | FIRE | EVACUATION
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    priority: v.string(), // P1 — CRITICAL | CRITICAL | HIGH | MODERATE | LOW
    severity: v.string(),
    description: v.string(),
    peopleAffected: v.number(),
    medicalRequirement: v.boolean(),
    requiredResources: v.array(v.string()),
    assignedTeamId: v.optional(v.string()),
    assignedTeamName: v.optional(v.string()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["authority", "authority_command", "administrator"]);
    }

    const now = Date.now();
    const missionNum = Math.floor(Math.random() * 9000 + 1000);
    const missionId = `INC-${missionNum}`;

    const id = await ctx.db.insert("emergencyMissions", {
      missionId,
      incidentId: missionId,
      type: args.type,
      location: args.location,
      latitude: args.latitude,
      longitude: args.longitude,
      priority: args.priority,
      severity: args.severity,
      description: args.description,
      peopleAffected: args.peopleAffected,
      medicalRequirement: args.medicalRequirement,
      requiredResources: args.requiredResources,
      assignedTeamId: args.assignedTeamId,
      assignedTeamName: args.assignedTeamName,
      status: args.assignedTeamId ? "assigned" : "pending",
      pending: !args.assignedTeamId,
      respondersCount: args.assignedTeamId ? 2 : 0,
      createdAt: now,
      updatedAt: now,
    });

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actor: args.userRole || "Authority",
      action: "mission_created",
      entity: `Mission ${missionId}: ${args.type} at ${args.location}`,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString("en-GB", { hour12: false }),
      metadata: `Priority: ${args.priority} | People Affected: ${args.peopleAffected}`,
    });

    return { id, missionId, success: true };
  },
});

// Assign Team to Mission (Authority/Admin)
export const assignTeamToMission = mutation({
  args: {
    missionId: v.string(),
    teamId: v.string(),
    teamName: v.string(),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["authority", "authority_command", "administrator"]);
    }

    const mission = await ctx.db
      .query("emergencyMissions")
      .filter((q: any) =>
        q.or(
          q.eq(q.field("missionId"), args.missionId),
          q.eq(q.field("incidentId"), args.missionId)
        )
      )
      .first();

    if (!mission) throw new Error(`Mission '${args.missionId}' not found.`);

    const now = Date.now();
    await ctx.db.patch(mission._id, {
      assignedTeamId: args.teamId,
      assignedTeamName: args.teamName,
      status: "assigned",
      pending: false,
      respondersCount: (mission.respondersCount || 0) + 1,
      updatedAt: now,
    });

    // Update Team status to deployed
    const team = await ctx.db
      .query("rescueTeams")
      .withIndex("by_team_id", (q: any) => q.eq("teamId", args.teamId))
      .first();

    if (team) {
      await ctx.db.patch(team._id, {
        status: "deployed",
        availability: false,
        currentMissionId: args.missionId,
      });
    }

    return { success: true };
  },
});

// Update Mission Status (Rescue Teams & Command)
export const updateMissionStatus = mutation({
  args: {
    missionId: v.string(),
    status: v.string(), // pending | assigned | accepted | in_progress | completed | cancelled | ACCEPTED | EN ROUTE | ON SCENE | ASSISTING | COMPLETED
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, [
        "responder",
        "rescue_team",
        "medical_team",
        "authority",
        "authority_command",
        "administrator",
      ]);
    }

    const mission = await ctx.db
      .query("emergencyMissions")
      .filter((q: any) =>
        q.or(
          q.eq(q.field("missionId"), args.missionId),
          q.eq(q.field("incidentId"), args.missionId)
        )
      )
      .first();

    if (!mission) throw new Error(`Mission '${args.missionId}' not found.`);

    const now = Date.now();
    const isCompleted = args.status === "completed" || args.status === "COMPLETED";

    await ctx.db.patch(mission._id, {
      status: args.status,
      pending: isCompleted ? false : mission.pending,
      updatedAt: now,
    });

    // If mission completed, release assigned team
    if (isCompleted && mission.assignedTeamId) {
      const team = await ctx.db
        .query("rescueTeams")
        .withIndex("by_team_id", (q: any) => q.eq("teamId", mission.assignedTeamId!))
        .first();

      if (team) {
        await ctx.db.patch(team._id, {
          status: "available",
          availability: true,
          currentMissionId: undefined,
        });
      }
    }

    return { success: true };
  },
});
