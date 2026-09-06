import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateRole } from "./authHelpers";

// Query all rescue teams
export const getRescueTeams = query({
  args: {
    status: v.optional(v.string()),
    teamType: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    let teams = await ctx.db.query("rescueTeams").collect();

    if (args.status) {
      teams = teams.filter((t: any) => t.status === args.status);
    }
    if (args.teamType) {
      teams = teams.filter((t: any) => t.teamType === args.teamType);
    }

    return teams;
  },
});

// Update rescue team status (Rescue team members & Command Authorities)
export const updateTeamStatus = mutation({
  args: {
    teamId: v.string(),
    status: v.string(), // available | deployed | busy | offline | EN ROUTE | ON SCENE | ASSISTING | COMPLETED
    currentMissionId: v.optional(v.string()),
    currentLocation: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
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

    const team = await ctx.db
      .query("rescueTeams")
      .withIndex("by_team_id", (q: any) => q.eq("teamId", args.teamId))
      .first();

    if (!team) throw new Error(`Rescue team '${args.teamId}' not found.`);

    const isAvailable = args.status === "available" || args.status === "AVAILABLE" || args.status === "COMPLETED";

    await ctx.db.patch(team._id, {
      status: args.status,
      availability: isAvailable,
      ...(args.currentMissionId !== undefined && { currentMissionId: args.currentMissionId }),
      ...(args.currentLocation && { currentLocation: args.currentLocation }),
      ...(args.latitude !== undefined && { latitude: args.latitude }),
      ...(args.longitude !== undefined && { longitude: args.longitude }),
    });

    return { success: true };
  },
});
