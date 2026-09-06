import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateRole } from "./authHelpers";

// Query all shelters
export const getShelters = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx: any, args: any) => {
    if (args.status) {
      return await ctx.db
        .query("shelters")
        .withIndex("by_status", (q: any) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("shelters").collect();
  },
});

// Create new shelter
export const createShelter = mutation({
  args: {
    name: v.string(),
    location: v.string(),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    capacity: v.number(),
    currentOccupancy: v.optional(v.number()),
    facilities: v.optional(v.array(v.string())),
    medicalSupport: v.optional(v.boolean()),
    accessibility: v.optional(v.boolean()),
    emergencyContact: v.optional(v.string()),
    status: v.optional(v.string()), // available | almost_full | full | closed | OPEN | NEAR FULL | ACTIVATING
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["resource_manager", "authority", "authority_command", "administrator"]);
    }

    const occ = args.currentOccupancy || 0;
    if (occ > args.capacity) {
      throw new Error(`Occupancy (${occ}) cannot exceed total capacity (${args.capacity}).`);
    }

    const avail = args.capacity - occ;
    let status = args.status || "OPEN";
    if (avail === 0) status = "FULL";
    else if (avail / args.capacity < 0.15) status = "NEAR FULL";

    const shelterId = `SHL-${Math.floor(Math.random() * 90 + 10)}`;

    const id = await ctx.db.insert("shelters", {
      shelterId,
      name: args.name,
      location: args.location,
      latitude: args.latitude || 52.0,
      longitude: args.longitude || 48.0,
      capacity: args.capacity,
      currentOccupancy: occ,
      availableCapacity: avail,
      facilities: args.facilities || ["Food", "Water"],
      medicalSupport: args.medicalSupport ?? true,
      accessibility: args.accessibility ?? true,
      emergencyContact: args.emergencyContact || "+1 555-SHELTER",
      status,
    });

    return { id, shelterId, success: true };
  },
});

// Update shelter occupancy & recalculate capacity automatically
export const updateShelterOccupancy = mutation({
  args: {
    shelterId: v.string(),
    newOccupancy: v.number(),
    newCapacity: v.optional(v.number()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["resource_manager", "authority", "authority_command", "administrator"]);
    }

    const shelter = await ctx.db
      .query("shelters")
      .withIndex("by_shelter_id", (q: any) => q.eq("shelterId", args.shelterId))
      .first();

    if (!shelter) throw new Error(`Shelter '${args.shelterId}' not found.`);

    const capacity = args.newCapacity !== undefined ? args.newCapacity : shelter.capacity;

    if (args.newOccupancy < 0) {
      throw new Error("Occupancy cannot be negative.");
    }

    if (args.newOccupancy > capacity) {
      throw new Error(
        `OVERCAPACITY PREVENTED: Cannot set occupancy to ${args.newOccupancy} for capacity ${capacity}.`
      );
    }

    const avail = capacity - args.newOccupancy;
    let status = shelter.status;

    if (avail === 0) {
      status = "FULL";
    } else if (avail / capacity < 0.15) {
      status = "NEAR FULL";
    } else if (status === "FULL" || status === "NEAR FULL") {
      status = "OPEN";
    }

    await ctx.db.patch(shelter._id, {
      capacity,
      currentOccupancy: args.newOccupancy,
      availableCapacity: avail,
      status,
    });

    return { success: true, availableCapacity: avail, status };
  },
});
