// ============================================================
// NOTIFICATION SYSTEM BACKEND
// ============================================================
// Tracks backend notification records for citizens, rescue teams, and authorities.
//
// ============================================================
// TODO: EXTERNAL NOTIFICATION API INTEGRATION
// ============================================================
// Purpose:
// Connect production SMS (Twilio/AWS SNS), Email (SendGrid/Postmark),
// and Mobile Push (Firebase Cloud Messaging/APNs) notification providers here.
//
// Current implementation:
// Database-persisted notifications are used for the SIH prototype.
//
// IMPORTANT:
// Do not add API keys, secrets, URLs, or credentials here.
// ============================================================

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query notifications for recipient
export const getNotifications = query({
  args: { recipientId: v.string() },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_recipient", (q: any) => q.eq("recipientId", args.recipientId))
      .order("desc")
      .collect();
  },
});

// Create notification
export const sendNotification = mutation({
  args: {
    recipientId: v.string(),
    notificationType: v.string(), // SMS | EMAIL | APP | CRITICAL_ALERT
    title: v.string(),
    message: v.string(),
    priority: v.string(),
    relatedDisasterId: v.optional(v.string()),
    relatedMissionId: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const id = await ctx.db.insert("notifications", {
      recipientId: args.recipientId,
      notificationType: args.notificationType,
      title: args.title,
      message: args.message,
      priority: args.priority,
      relatedDisasterId: args.relatedDisasterId,
      relatedMissionId: args.relatedMissionId,
      read: false,
      timestamp: Date.now(),
    });

    return { id, success: true };
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.notificationId, { read: true });
    return { success: true };
  },
});
