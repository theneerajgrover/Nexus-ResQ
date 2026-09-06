import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query recent audit logs
export const getAuditLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("auditLogs")
      .order("desc")
      .take(args.limit || 25);
  },
});

// Record an audit log entry
export const recordAuditLog = mutation({
  args: {
    actor: v.string(),
    action: v.string(), // disaster_created | risk_updated | alert_created | mission_assigned | resource_allocated | shelter_opened | team_deployed | report_verified | mission_completed
    entity: v.string(),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const now = Date.now();
    const id = await ctx.db.insert("auditLogs", {
      actor: args.actor,
      action: args.action,
      entity: args.entity,
      timestamp: now,
      timeFormatted: new Date(now).toLocaleTimeString("en-GB", { hour12: false }),
      metadata: args.metadata,
    });

    return { id, success: true };
  },
});
