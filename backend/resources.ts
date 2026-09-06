import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateRole } from "./authHelpers";

// Query all emergency resources
export const getResources = query({
  args: {
    category: v.optional(v.string()),
    resourceType: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    let list = await ctx.db.query("resources").collect();
    if (args.category) {
      list = list.filter((r: any) => r.category === args.category);
    }
    if (args.resourceType) {
      list = list.filter((r: any) => r.resourceType === args.resourceType);
    }
    return list;
  },
});

// Query ambulances
export const getAmbulances = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx: any, args: any) => {
    if (args.status) {
      return await ctx.db
        .query("ambulances")
        .withIndex("by_status", (q: any) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("ambulances").collect();
  },
});

// Query dispatch records
export const getDispatchRecords = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx: any, args: any) => {
    if (args.status) {
      return await ctx.db
        .query("dispatchRecords")
        .withIndex("by_status", (q: any) => q.eq("status", args.status!))
        .collect();
    }
    return await ctx.db.query("dispatchRecords").collect();
  },
});

// Create/add emergency resource
export const createResource = mutation({
  args: {
    name: v.string(),
    resourceType: v.string(),
    category: v.string(), // MEDICAL | WATER | FOOD | SAFETY | EQUIPMENT
    quantity: v.number(),
    unit: v.string(),
    location: v.string(),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["resource_manager", "authority", "authority_command", "administrator"]);
    }

    if (args.quantity < 0) {
      throw new Error("Quantity cannot be negative.");
    }

    const resourceId = `SUP-${args.category.slice(0, 3)}-${Math.floor(Math.random() * 90 + 10)}`;

    const id = await ctx.db.insert("resources", {
      resourceId,
      name: args.name,
      resourceType: args.resourceType,
      category: args.category,
      quantity: args.quantity,
      availableQuantity: args.quantity,
      unit: args.unit,
      location: args.location,
      status: "AVAILABLE",
      priority: "MODERATE",
      lastSync: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    });

    return { id, resourceId, success: true };
  },
});

// Allocate resources to a zone/incident
export const allocateResource = mutation({
  args: {
    resourceId: v.string(),
    quantityToAllocate: v.number(),
    targetZone: v.string(),
    incidentId: v.optional(v.string()),
    unitName: v.optional(v.string()),
    userRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    if (args.userRole) {
      validateRole(args.userRole, ["resource_manager", "authority", "authority_command", "administrator"]);
    }

    const resource = await ctx.db
      .query("resources")
      .filter((q: any) => q.eq(q.field("resourceId"), args.resourceId))
      .first();

    if (!resource) throw new Error(`Resource '${args.resourceId}' not found.`);

    if (args.quantityToAllocate <= 0) {
      throw new Error("Allocation quantity must be greater than zero.");
    }

    if (args.quantityToAllocate > resource.availableQuantity) {
      throw new Error(
        `RESOURCE DEFICIT: Cannot allocate ${args.quantityToAllocate} units. Only ${resource.availableQuantity} available.`
      );
    }

    const newAvailable = resource.availableQuantity - args.quantityToAllocate;
    let status = resource.status;

    if (newAvailable === 0) status = "DEPLETED";
    else if (newAvailable < resource.quantity * 0.25) status = "SHORTAGE";
    else if (newAvailable < resource.quantity * 0.5) status = "LIMITED";

    await ctx.db.patch(resource._id, {
      availableQuantity: newAvailable,
      assignedZone: args.targetZone,
      status,
      lastSync: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    });

    // Create Dispatch Record for Authority & Resource Manager tracking
    const dispatchId = `DSP-${Math.floor(Math.random() * 900 + 100)}`;
    await ctx.db.insert("dispatchRecords", {
      dispatchId,
      resourceType: resource.name.toUpperCase(),
      qtyApproved: args.quantityToAllocate,
      qtyDispatched: args.quantityToAllocate,
      destination: args.targetZone,
      incident: args.incidentId || "INC-GENERAL",
      unit: args.unitName || "Unit Alpha-14",
      status: "DISPATCHED",
      approvedBy: "Authority/Command",
      timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      createdAt: Date.now(),
    });

    return { success: true, newAvailableQuantity: newAvailable, dispatchId };
  },
});
