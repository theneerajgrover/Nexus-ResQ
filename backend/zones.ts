import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { rankZonesByPriority } from "./priorityEngine";

// Get all geographic risk zones for map visualization
export const getRiskZones = query({
  args: {},
  handler: async (ctx: any) => {
    return await ctx.db.query("riskZones").collect();
  },
});

// Get ranked risk zones (Priority Engine Integration)
export const getRankedRiskZones = query({
  args: {},
  handler: async (ctx: any) => {
    const zones = await ctx.db.query("riskZones").collect();

    const priorityInput = zones.map((z: any) => ({
      zoneId: z.zoneId,
      name: z.name,
      riskScore: z.riskScore,
      populationVulnerability: Math.round((z.vulnerablePopulation / (z.population || 1)) * 100),
      urgencyScore: z.riskLevel === "CRITICAL" ? 95 : z.riskLevel === "HIGH" ? 75 : z.riskLevel === "MODERATE" ? 50 : 20,
      infrastructureDamageScore: z.riskScore > 75 ? 85 : z.riskScore > 50 ? 55 : 20,
      resourceShortageScore: z.riskScore > 75 ? 80 : 30,
    }));

    return rankZonesByPriority(priorityInput);
  },
});

// Update risk score & category for a zone
export const updateZoneRisk = mutation({
  args: {
    zoneId: v.string(),
    riskScore: v.number(),
    riskLevel: v.string(), // SAFE | LOW | MODERATE | HIGH | CRITICAL
    status: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const zone = await ctx.db
      .query("riskZones")
      .withIndex("by_zone_id", (q: any) => q.eq("zoneId", args.zoneId))
      .first();

    if (!zone) throw new Error(`Risk zone '${args.zoneId}' not found.`);

    const now = Date.now();
    await ctx.db.patch(zone._id, {
      riskScore: args.riskScore,
      riskLevel: args.riskLevel,
      ...(args.status && { currentStatus: args.status }),
      lastUpdatedTime: now,
    });

    return { success: true };
  },
});
