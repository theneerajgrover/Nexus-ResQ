import { mutation } from "./_generated/server";

export const seedDemoDatabase = mutation({
  args: {},
  handler: async (ctx: any) => {
    const now = Date.now();
    const timeFormatted = new Date(now).toLocaleTimeString("en-GB", { hour12: false });

    // Check if seed already populated
    const existingZones = await ctx.db.query("riskZones").collect();
    if (existingZones.length > 0) {
      return { success: true, message: "Database already seeded with demo data." };
    }

    // Seed Users
    await ctx.db.insert("users", {
      name: "Commander J. Martinez",
      email: "command@nexusresq.org",
      phone: "+1 555-0192",
      role: "authority_command",
      location: "Command Center Central",
      latitude: 52.0,
      longitude: 48.0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("users", {
      name: "S. Okafor",
      email: "responder@nexusresq.org",
      phone: "+1 555-0193",
      role: "responder",
      location: "Bridge Sector 7",
      latitude: 48.0,
      longitude: 52.0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("users", {
      name: "Alex Citizen",
      email: "citizen@nexusresq.org",
      phone: "+1 555-0194",
      role: "citizen",
      location: "Riverside District",
      latitude: 35.0,
      longitude: 30.0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Seed Disaster Events
    await ctx.db.insert("disasterEvents", {
      disasterType: "flood",
      title: "Bridge Sector Flash Flood & Collapse Risk",
      description: "Torrential downpour causing rapid river surge and structural risk at Bridge Sector span.",
      severity: "CRITICAL",
      status: "active",
      location: "Bridge Sector 7, Zone NE-4",
      latitude: 52.0,
      longitude: 48.0,
      affectedArea: "North District & Bridge Sector",
      startTime: now - 3600000 * 2,
      createdAt: now - 3600000 * 2,
      updatedAt: now,
    });

    // Seed Risk Zones
    const zones = [
      { id: "ZONE-NE4", name: "North District", lat: 52.0, lng: 48.0, risk: 92, level: "CRITICAL", pop: 12400, vuln: 4500, status: "active_evacuation" },
      { id: "ZONE-BRG", name: "Bridge Sector", lat: 35.0, lng: 30.0, risk: 88, level: "CRITICAL", pop: 8500, vuln: 3200, status: "evacuation_needed" },
      { id: "ZONE-RIV", name: "Riverside Zone", lat: 65.0, lng: 60.0, risk: 61, level: "MODERATE", pop: 14200, vuln: 2800, status: "warning" },
      { id: "ZONE-EAS", name: "Eastern Forest", lat: 78.0, lng: 25.0, risk: 45, level: "LOW", pop: 3100, vuln: 450, status: "monitoring" },
    ];

    for (const z of zones) {
      await ctx.db.insert("riskZones", {
        zoneId: z.id,
        name: z.name,
        latitude: z.lat,
        longitude: z.lng,
        riskScore: z.risk,
        riskLevel: z.level,
        population: z.pop,
        vulnerablePopulation: z.vuln,
        disasterType: "flood",
        currentStatus: z.status,
        lastUpdatedTime: now,
      });
    }

    // Seed Shelters
    const shelters = [
      { id: "SHL-01", name: "Central Community Center", cap: 450, occ: 263, status: "OPEN", lat: 0.38, lng: 0.28, acc: true, fac: ["Medical", "Food", "Water", "Cots"] },
      { id: "SHL-02", name: "Riverside High School", cap: 800, occ: 458, status: "OPEN", lat: 0.65, lng: 0.65, acc: true, fac: ["Food", "Water", "Cots", "Parking"] },
      { id: "SHL-03", name: "Metro Sports Complex", cap: 1200, occ: 1111, status: "NEAR FULL", lat: 0.2, lng: 0.7, acc: true, fac: ["Food", "Medical"] },
      { id: "SHL-04", name: "North Community Hall", cap: 300, occ: 0, status: "ACTIVATING", lat: 0.15, lng: 0.3, acc: false, fac: ["Food", "Water"] },
    ];

    for (const s of shelters) {
      await ctx.db.insert("shelters", {
        shelterId: s.id,
        name: s.name,
        location: `${s.name} Location`,
        latitude: s.lat,
        longitude: s.lng,
        capacity: s.cap,
        currentOccupancy: s.occ,
        availableCapacity: s.cap - s.occ,
        facilities: s.fac,
        medicalSupport: true,
        accessibility: s.acc,
        emergencyContact: "+1 555-SHELTER",
        status: s.status,
      });
    }

    // Seed Rescue Teams
    const teams = [
      { id: "R-14", name: "Alpha-14", type: "flood_rescue", status: "EN ROUTE", lat: 48.0, lng: 52.0, mission: "INC-2849" },
      { id: "R-07", name: "Bravo-7", type: "medical", status: "ON SCENE", lat: 34.0, lng: 29.0, mission: "INC-2847" },
      { id: "R-22", name: "Delta-22", type: "search_and_rescue", status: "AVAILABLE", lat: 60.0, lng: 40.0, mission: undefined },
      { id: "R-03", name: "Echo-3", type: "fire", status: "ASSISTING", lat: 65.0, lng: 61.0, mission: "INC-2851" },
    ];

    for (const t of teams) {
      await ctx.db.insert("rescueTeams", {
        teamId: t.id,
        teamName: t.name,
        membersCount: 4,
        teamType: t.type,
        currentLocation: `Sector ${t.id}`,
        latitude: t.lat,
        longitude: t.lng,
        availability: t.status === "AVAILABLE",
        skills: ["Rescue", "First Aid", "Swiftwater"],
        equipment: ["Rope Kit", "Trauma Pack"],
        currentMissionId: t.mission,
        status: t.status,
      });
    }

    // Seed Emergency Missions
    const incs = [
      { id: "INC-2849", type: "STRUCTURAL", sev: "CRITICAL", lat: 52, lng: 48, status: "ACTIVE", resp: 2, pending: true },
      { id: "INC-2847", type: "FLOOD", sev: "HIGH", lat: 35, lng: 30, status: "RESPONDING", resp: 4, pending: false },
      { id: "INC-2851", type: "MEDICAL", sev: "HIGH", lat: 65, lng: 60, status: "PENDING", resp: 0, pending: true },
      { id: "INC-2845", type: "FIRE", sev: "MODERATE", lat: 78, lng: 25, status: "CONTAINED", resp: 3, pending: false },
      { id: "INC-2850", type: "EVACUATION", sev: "HIGH", lat: 22, lng: 70, status: "ACTIVE", resp: 6, pending: false },
    ];

    for (const inc of incs) {
      await ctx.db.insert("emergencyMissions", {
        missionId: inc.id,
        incidentId: inc.id,
        type: inc.type,
        location: `Bridge Sector Location ${inc.id}`,
        latitude: inc.lat,
        longitude: inc.lng,
        priority: inc.sev === "CRITICAL" ? "P1 — CRITICAL" : inc.sev,
        severity: inc.sev,
        description: `${inc.type} incident reported near lat ${inc.lat}, lng ${inc.lng}. Emergency unit dispatch required.`,
        peopleAffected: 3,
        medicalRequirement: true,
        requiredResources: ["Trauma Kit", "Rescue Gear"],
        status: inc.status,
        pending: inc.pending,
        respondersCount: inc.resp,
        createdAt: now - 1800000,
        updatedAt: now,
      });
    }

    // Seed Resources
    const resources = [
      { id: "SUP-MED-01", name: "Trauma Kits", cat: "MEDICAL", qty: 240, demand: 380, unit: "kits", loc: "Depot North", status: "SHORTAGE" },
      { id: "SUP-WAT-02", name: "Water (500ml)", cat: "WATER", qty: 8400, demand: 6200, unit: "bottles", loc: "Central Depot", status: "AVAILABLE" },
      { id: "SUP-FOO-03", name: "Emergency Rations", cat: "FOOD", qty: 1200, demand: 1600, unit: "packs", loc: "Multiple", status: "SHORTAGE" },
      { id: "SUP-MED-04", name: "Blood O+ Units", cat: "MEDICAL", qty: 48, demand: 35, unit: "units", loc: "Hospital A", status: "AVAILABLE" },
      { id: "SUP-PPE-05", name: "Protective Equipment", cat: "SAFETY", qty: 560, demand: 340, unit: "sets", loc: "Depot South", status: "AVAILABLE" },
    ];

    for (const r of resources) {
      await ctx.db.insert("resources", {
        resourceId: r.id,
        name: r.name,
        resourceType: r.cat.toLowerCase(),
        category: r.cat,
        quantity: r.demand,
        availableQuantity: r.qty,
        unit: r.unit,
        location: r.loc,
        status: r.status,
        priority: "HIGH",
        lastSync: timeFormatted,
      });
    }

    // Seed Ambulances
    const ambs = [
      { id: "AMB-14", callsign: "MEDIC 14", crew: 2, status: "AVAILABLE", loc: "Station 3" },
      { id: "AMB-07", callsign: "MEDIC 07", crew: 2, status: "DISPATCHED", loc: "INC-2847 scene" },
      { id: "AMB-22", callsign: "MEDIC 22", crew: 3, status: "AVAILABLE", loc: "Station 1" },
      { id: "AMB-03", callsign: "MEDIC 03", crew: 2, status: "RETURNING", loc: "En route Station 2" },
      { id: "AMB-09", callsign: "MEDIC 09", crew: 2, status: "MAINTENANCE", loc: "Workshop" },
    ];

    for (const a of ambs) {
      await ctx.db.insert("ambulances", {
        ambulanceId: a.id,
        callsign: a.callsign,
        crew: a.crew,
        status: a.status,
        location: a.loc,
        latitude: 52.0,
        longitude: 48.0,
        lastUpdate: timeFormatted,
      });
    }

    // Audit Log
    await ctx.db.insert("auditLogs", {
      actor: "SYSTEM_INITIALIZER",
      action: "DEMO_DATABASE_SEEDED",
      entity: "All Disaster Platform Collections",
      timestamp: now,
      timeFormatted,
      metadata: "Initial seed completed successfully with realistic spatial data.",
    });

    return { success: true, message: "Demo database seeded successfully." };
  },
});
