import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query all hospitals / medical facilities
export const getHospitals = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx: any, args: any) => {
    if (args.status) {
      return await ctx.db
        .query("hospitals")
        .withIndex("by_status", (q: any) => q.eq("emergencyStatus", args.status!))
        .collect();
    }
    return await ctx.db.query("hospitals").collect();
  },
});

// Recommend nearest hospital with bed availability
export const recommendNearbyHospital = query({
  args: {
    originLat: v.number(),
    originLng: v.number(),
    icuRequired: v.optional(v.boolean()),
  },
  handler: async (ctx: any, args: any) => {
    const list = await ctx.db.query("hospitals").collect();
    const available = list.filter(
      (h: any) => h.availableBeds > 0 && (!args.icuRequired || h.icuAvailability > 0)
    );

    if (available.length === 0) return null;

    // Simple Euclidean distance recommendation
    let best = available[0];
    let minDistance = Infinity;

    for (const h of available) {
      const dist = Math.hypot(h.latitude - args.originLat, h.longitude - args.originLng);
      if (dist < minDistance) {
        minDistance = dist;
        best = h;
      }
    }

    return best;
  },
});

// Update hospital beds / status
export const updateHospitalStatus = mutation({
  args: {
    hospitalId: v.string(),
    availableBeds: v.optional(v.number()),
    icuAvailability: v.optional(v.number()),
    ambulanceAvailability: v.optional(v.number()),
    emergencyStatus: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const hospital = await ctx.db
      .query("hospitals")
      .withIndex("by_hospital_id", (q: any) => q.eq("hospitalId", args.hospitalId))
      .first();

    if (!hospital) throw new Error(`Hospital '${args.hospitalId}' not found.`);

    await ctx.db.patch(hospital._id, {
      ...(args.availableBeds !== undefined && { availableBeds: args.availableBeds }),
      ...(args.icuAvailability !== undefined && { icuAvailability: args.icuAvailability }),
      ...(args.ambulanceAvailability !== undefined && { ambulanceAvailability: args.ambulanceAvailability }),
      ...(args.emergencyStatus && { emergencyStatus: args.emergencyStatus }),
    });

    return { success: true };
  },
});
