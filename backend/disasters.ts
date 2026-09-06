import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateRole, isAuthorityOrAdmin } from "./authHelpers";

// Query all disaster events
export const getDisasterEvents = query({
  args: {
    status: v.optional(v.string()),
    severity: v.optional(v.string()),
    disasterType: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    let events = await ctx.db.query("disasterEvents").collect();

    if (args.status) {
      events = events.filter((e: any) => e.status === args.status);
    }
    if (args.severity) {
      events = events.filter((e: any) => e.severity === args.severity);
    }
    if (args.disasterType) {
      events = events.filter((e: any) => e.disasterType === args.disasterType);
    }

    return events;
  },
});

// Query active disaster events
export const getActiveDisasters = query({
  args: {},
  handler: async (ctx: any) => {
    return await ctx.db
      .query("disasterEvents")
      .filter((q: any) => q.neq(q.field("status"), "resolved"))
      .collect();
  },
});

// Create a disaster event (Authority/Admin only)
export const createDisasterEvent = mutation({
  args: {
    disasterType: v.string(), // flood | earthquake | landslide | forest_fire | cyclone | cloudburst | extreme_rainfall | heatwave | other
    title: v.string(),
    description: v.string(),
    severity: v.string(), // CRITICAL | HIGH | MODERATE | LOW
    status: v.string(), // monitoring | warning | active | contained | resolved
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    affectedArea: v.string(),
    startTime: v.optional(v.number()),
    estimatedEndTime: v.optional(v.number()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    // Validate role authorization
    if (args.userRole) {
      validateRole(args.userRole, ["authority", "authority_command", "administrator"]);
    }

    const now = Date.now();
    const id = await ctx.db.insert("disasterEvents", {
      disasterType: args.disasterType,
      title: args.title,
      description: args.description,
      severity: args.severity,
      status: args.status,
      location: args.location,
      latitude: args.latitude,
      longitude: args.longitude,
      affectedArea: args.affectedArea,
      startTime: args.startTime || now,
      estimatedEndTime: args.estimatedEndTime,
      createdAt: now,
      updatedAt: now,
    });

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actor: args.userRole || "System/Authority",
      action: "disaster_created",
      entity: `Disaster: ${args.title} (${args.disasterType})`,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString("en-GB", { hour12: false }),
      metadata: `Severity: ${args.severity} | Location: ${args.location}`,
    });

    return { id, success: true };
  },
});

// Update disaster status (Authority/Admin only)
export const updateDisasterStatus = mutation({
  args: {
    disasterId: v.id("disasterEvents"),
    status: v.string(), // monitoring | warning | active | contained | resolved
    severity: v.optional(v.string()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["authority", "authority_command", "administrator"]);
    }

    const existing = await ctx.db.get(args.disasterId);
    if (!existing) throw new Error("Disaster event not found.");

    const now = Date.now();
    await ctx.db.patch(args.disasterId, {
      status: args.status,
      ...(args.severity && { severity: args.severity }),
      updatedAt: now,
    });

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actor: args.userRole || "Authority",
      action: "disaster_status_updated",
      entity: `Disaster: ${existing.title}`,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString("en-GB", { hour12: false }),
      metadata: `New Status: ${args.status} | Severity: ${args.severity || existing.severity}`,
    });

    return { success: true };
  },
});
