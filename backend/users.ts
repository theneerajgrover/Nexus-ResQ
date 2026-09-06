import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateRole, isAuthorityOrAdmin } from "./authHelpers";

// Query all users
export const getUsers = query({
  args: { role: v.optional(v.string()) },
  handler: async (ctx: any, args: any) => {
    if (args.role) {
      return await ctx.db
        .query("users")
        .withIndex("by_role", (q: any) => q.eq("role", args.role!))
        .collect();
    }
    return await ctx.db.query("users").collect();
  },
});

// Query single user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();
  },
});

// Create or register new user
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    role: v.string(), // citizen | authority | rescue_team | medical_team | administrator | responder | authority_command | resource_manager
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    requestorRole: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    // Validate role permissions: citizens can register as citizen, but operational roles require authorization
    if (args.role !== "citizen" && args.role !== "responder") {
      if (!isAuthorityOrAdmin(args.requestorRole)) {
        throw new Error("UNAUTHORIZED: Operational roles (Authority/Command/Resource Manager) must be assigned by an Administrator.");
      }
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error(`User with email '${args.email}' already exists.`);
    }

    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      role: args.role,
      location: args.location || "Unknown Location",
      latitude: args.latitude || 0,
      longitude: args.longitude || 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    return { userId, success: true };
  },
});

// Update user status/location
export const updateUserStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.optional(v.string()),
    location: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found.");

    await ctx.db.patch(args.userId, {
      ...(args.status && { status: args.status }),
      ...(args.location && { location: args.location }),
      ...(args.latitude !== undefined && { latitude: args.latitude }),
      ...(args.longitude !== undefined && { longitude: args.longitude }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
