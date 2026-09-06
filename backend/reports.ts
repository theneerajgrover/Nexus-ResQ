import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateRole, isAuthorityOrAdmin } from "./authHelpers";

// Query citizen reports
export const getCitizenReports = query({
  args: {
    status: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    let list = await ctx.db.query("citizenReports").collect();

    if (args.status) {
      list = list.filter((r: any) => r.status === args.status);
    }
    if (args.category) {
      list = list.filter((r: any) => r.category === args.category);
    }

    return list;
  },
});

// Submit citizen emergency report
export const submitReport = mutation({
  args: {
    userId: v.optional(v.string()),
    userName: v.optional(v.string()),
    userPhone: v.optional(v.string()),
    category: v.string(), // flood | fire | road_blockage | trapped_person | medical_emergency | landslide | damaged_infrastructure | missing_person | other
    description: v.string(),
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    imageRef: v.optional(v.string()),
    severity: v.optional(v.string()), // CRITICAL | HIGH | MODERATE | LOW
  },
  handler: async (ctx: any, args: any) => {
    const now = Date.now();
    const reportNum = Math.floor(Math.random() * 90000 + 10000);
    const reportId = `SOS-${reportNum}`;

    const id = await ctx.db.insert("citizenReports", {
      reportId,
      userId: args.userId,
      userName: args.userName || "Anonymous Citizen",
      userPhone: args.userPhone,
      category: args.category,
      description: args.description,
      location: args.location,
      latitude: args.latitude,
      longitude: args.longitude,
      imageRef: args.imageRef,
      severity: args.severity || "HIGH",
      status: "submitted",
      timestamp: now,
    });

    return { id, reportId, success: true };
  },
});

// Verify citizen report & optionally convert to emergency mission (Authority only)
export const verifyReport = mutation({
  args: {
    reportId: v.string(),
    newStatus: v.string(), // verified | investigating | converted_to_mission | resolved | rejected
    convertToMission: v.optional(v.boolean()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["authority", "authority_command", "administrator"]);
    }

    const report = await ctx.db
      .query("citizenReports")
      .filter((q: any) => q.eq(q.field("reportId"), args.reportId))
      .first();

    if (!report) throw new Error(`Report '${args.reportId}' not found.`);

    await ctx.db.patch(report._id, {
      status: args.newStatus,
    });

    let missionId: string | undefined = undefined;

    if (args.convertToMission || args.newStatus === "converted_to_mission") {
      const missionNum = Math.floor(Math.random() * 9000 + 1000);
      missionId = `INC-${missionNum}`;

      await ctx.db.insert("emergencyMissions", {
        missionId,
        incidentId: missionId,
        type: report.category.toUpperCase(),
        location: report.location,
        latitude: report.latitude,
        longitude: report.longitude,
        priority: report.severity === "CRITICAL" ? "P1 — CRITICAL" : "HIGH",
        severity: report.severity,
        description: `CONVERTED CITIZEN REPORT: ${report.description}`,
        peopleAffected: 1,
        medicalRequirement: report.category === "medical_emergency" || report.category === "trapped_person",
        requiredResources: ["Rescue Unit"],
        status: "pending",
        pending: true,
        respondersCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true, missionId };
  },
});
