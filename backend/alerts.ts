import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateRole } from "./authHelpers";

// Query active emergency alerts
export const getActiveAlerts = query({
  args: {
    targetAudience: v.optional(v.string()),
    severity: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    let list = await ctx.db
      .query("alerts")
      .withIndex("by_status", (q: any) => q.eq("status", "active"))
      .collect();

    if (args.targetAudience) {
      list = list.filter(
        (a: any) => a.targetAudience === args.targetAudience || a.targetAudience === "public"
      );
    }

    if (args.severity) {
      list = list.filter((a: any) => a.severity === args.severity);
    }

    return list;
  },
});

// Create emergency alert (Authority / Command only)
export const createAlert = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    disasterType: v.string(),
    severity: v.string(), // CRITICAL | WARNING | INFO | HIGH | MODERATE | LOW
    affectedArea: v.string(),
    targetAudience: v.string(), // public | authority | rescue-team | shelter | mission
    location: v.string(),
    durationHours: v.optional(v.number()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["authority", "authority_command", "administrator"]);
    }

    const now = Date.now();
    const duration = (args.durationHours || 6) * 3600000;
    const alertId = `ALT-${Math.floor(Math.random() * 9000 + 1000)}`;

    const id = await ctx.db.insert("alerts", {
      alertId,
      title: args.title,
      message: args.message,
      disasterType: args.disasterType,
      severity: args.severity,
      affectedArea: args.affectedArea,
      targetAudience: args.targetAudience,
      location: args.location,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString("en-GB", { hour12: false }),
      expirationTime: now + duration,
      status: "active",
    });

    // Write audit log
    await ctx.db.insert("auditLogs", {
      actor: args.userRole || "Authority",
      action: "alert_created",
      entity: `Alert ${alertId}: ${args.title}`,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString("en-GB", { hour12: false }),
      metadata: `Severity: ${args.severity} | Audience: ${args.targetAudience}`,
    });

    return { id, alertId, success: true };
  },
});
