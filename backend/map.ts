// ============================================================
// GIS / LIVE MAP BACKEND API
// ============================================================
// Aggregates geographic coordinates and spatial markers for all map elements:
// disaster locations, risk zones, shelters, hospitals, rescue teams,
// ambulances, blocked/safe roads, emergency missions, and evacuation routes.
//
// ============================================================
// TODO: EXTERNAL MAP API INTEGRATION
// ============================================================
// Purpose:
// Add production map provider integration here (e.g. Mapbox GL JS / OpenStreetMap / Esri ArcGIS / Google Maps API).
//
// Current implementation:
// Coordinates and spatial features are served using structured GeoJSON-compatible mock/demo backend data.
//
// IMPORTANT:
// Do not add API keys, secrets, URLs, or credentials here.
// ============================================================

import { query } from "./_generated/server";

export const getLiveMapData = query({
  args: {},
  handler: async (ctx: any) => {
    const disasters = await ctx.db.query("disasterEvents").collect();
    const riskZones = await ctx.db.query("riskZones").collect();
    const shelters = await ctx.db.query("shelters").collect();
    const hospitals = await ctx.db.query("hospitals").collect();
    const rescueTeams = await ctx.db.query("rescueTeams").collect();
    const ambulances = await ctx.db.query("ambulances").collect();
    const missions = await ctx.db.query("emergencyMissions").collect();
    const routes = await ctx.db.query("evacuationRoutes").collect();
    const infrastructure = await ctx.db.query("roadsAndInfrastructure").collect();

    return {
      disasters: disasters.map((d: any) => ({
        id: d._id,
        type: d.disasterType,
        title: d.title,
        severity: d.severity,
        status: d.status,
        lat: d.latitude,
        lng: d.longitude,
        location: d.location,
      })),
      riskZones: riskZones.map((z: any) => ({
        id: z.zoneId,
        name: z.name,
        lat: z.latitude,
        lng: z.longitude,
        riskScore: z.riskScore,
        riskLevel: z.riskLevel,
        population: z.population,
        polygon: z.boundaryPolygon,
      })),
      shelters: shelters.map((s: any) => ({
        id: s.shelterId,
        name: s.name,
        lat: s.latitude,
        lng: s.longitude,
        capacity: s.capacity,
        occupancy: s.currentOccupancy,
        available: s.availableCapacity,
        status: s.status,
      })),
      hospitals: hospitals.map((h: any) => ({
        id: h.hospitalId,
        name: h.name,
        lat: h.latitude,
        lng: h.longitude,
        availableBeds: h.availableBeds,
        status: h.emergencyStatus,
      })),
      rescueTeams: rescueTeams.map((t: any) => ({
        id: t.teamId,
        name: t.teamName,
        lat: t.latitude,
        lng: t.longitude,
        type: t.teamType,
        status: t.status,
      })),
      ambulances: ambulances.map((a: any) => ({
        id: a.ambulanceId,
        callsign: a.callsign,
        lat: a.latitude,
        lng: a.longitude,
        status: a.status,
      })),
      missions: missions.map((m: any) => ({
        id: m.missionId,
        type: m.type,
        priority: m.priority,
        status: m.status,
        lat: m.latitude,
        lng: m.longitude,
        pending: m.pending,
      })),
      evacuationRoutes: routes,
      roadsAndInfrastructure: infrastructure,
      lastSync: new Date().toISOString(),
    };
  },
});
