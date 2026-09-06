import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query all roads and infrastructure elements
export const getInfrastructureStatus = query({
  args: {
    status: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    let list = await ctx.db.query("roadsAndInfrastructure").collect();

    if (args.status) {
      list = list.filter((i: any) => i.status === args.status);
    }
    if (args.type) {
      list = list.filter((i: any) => i.infrastructureType === args.type);
    }

    return list;
  },
});

// Update road / infrastructure status
export const updateInfrastructureStatus = mutation({
  args: {
    name: v.string(),
    status: v.string(), // safe | risky | blocked | closed
    riskLevel: v.optional(v.string()),
    blockage: v.optional(v.boolean()),
    blockageReason: v.optional(v.string()),
    estimatedReopeningTime: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const existing = await ctx.db
      .query("roadsAndInfrastructure")
      .filter((q: any) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        ...(args.riskLevel && { riskLevel: args.riskLevel }),
        ...(args.blockage !== undefined && { blockage: args.blockage }),
        ...(args.blockageReason !== undefined && { blockageReason: args.blockageReason }),
        ...(args.estimatedReopeningTime !== undefined && { estimatedReopeningTime: args.estimatedReopeningTime }),
      });
    } else {
      await ctx.db.insert("roadsAndInfrastructure", {
        name: args.name,
        infrastructureType: "road",
        coordinates: { lat: 52.0, lng: 48.0 },
        status: args.status,
        riskLevel: args.riskLevel || "MODERATE",
        blockage: args.blockage ?? (args.status === "blocked" || args.status === "closed"),
        blockageReason: args.blockageReason,
        estimatedReopeningTime: args.estimatedReopeningTime,
      });
    }

    return { success: true };
  },
});
