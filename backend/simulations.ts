import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { runDisasterSimulation } from "./simulationEngine";
import { validateRole } from "./authHelpers";

// Trigger Disaster Simulation Mode (For SIH Demonstration)
export const triggerDisasterSimulation = mutation({
  args: {
    scenarioName: v.optional(v.string()), // e.g. "Heavy Rainfall + River Surge + High Saturation"
    intensity: v.optional(v.string()), // MODERATE | HIGH | CRITICAL
    rainfallMmHr: v.optional(v.number()), // e.g. 110
    riverLevelMeters: v.optional(v.number()), // e.g. 5.8
    soilSaturationPct: v.optional(v.number()), // e.g. 92
    targetZoneId: v.optional(v.string()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["authority", "authority_command", "administrator"]);
    }

    const intensity = (args.intensity as "MODERATE" | "HIGH" | "CRITICAL") || "CRITICAL";

    const result = await runDisasterSimulation(ctx, {
      scenarioName: args.scenarioName || "Heavy Rainfall + River Level Surge + High Soil Saturation",
      intensity,
      rainfallMmHr: args.rainfallMmHr || 110,
      riverLevelMeters: args.riverLevelMeters || 5.8,
      soilSaturationPct: args.soilSaturationPct || 92,
      targetZoneId: args.targetZoneId || "ZONE-NE4",
    });

    return result;
  },
});
