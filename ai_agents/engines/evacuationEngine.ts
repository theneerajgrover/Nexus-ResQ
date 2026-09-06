// ============================================================
// EVACUATION ROUTE ENGINE
// ============================================================
// Calculates safe evacuation corridors and routes avoiding hazard zones,
// blocked roads, and flooded sectors.
//
// ============================================================
// TODO: EXTERNAL ROUTING API INTEGRATION
// ============================================================
// Purpose:
// Replace simulated route calculation with a production routing provider here
// (e.g. OpenStreetMap / OSRM / Mapbox Navigation API / Google Directions).
//
// Current implementation:
// Simulated route evaluation algorithm is used for the prototype.
//
// IMPORTANT:
// Do not add API keys, secrets, URLs, or credentials here.
// ============================================================

export interface RouteRequestInput {
  originLocation: { name: string; lat: number; lng: number };
  destinationShelterId?: string;
  dangerZones: { name: string; lat: number; lng: number; radiusKm: number; riskLevel: string }[];
  blockedRoadNames: string[];
}

export interface EvacuationRouteDetail {
  routeId: string;
  label: string;
  via: string;
  origin: string;
  destination: string;
  waypoints: { label: string; lat: number; lng: number }[];
  distance: string;
  distanceKm: number;
  estimatedTime: string;
  estimatedTimeMinutes: number;
  safetyScore: number; // 0 to 100
  riskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  riskNote: string;
  congestion: "LIGHT" | "MODERATE" | "HEAVY" | "BLOCKED";
  blockedRoads: string[];
  safe: boolean;
  status: "CLEAR" | "CONGESTED" | "BLOCKED" | "RECOMMENDED";
  capacity: string;
  shelterTarget: string;
  segments: { type: "CLEAR" | "WARNING" | "BLOCKED"; label: string }[];
}

/**
 * Calculates optimal evacuation routes using local geographic data.
 */
export function calculateEvacuationRoutes(input: RouteRequestInput): EvacuationRouteDetail[] {
  const isNorthBlocked = input.blockedRoadNames.some(
    (r) => r.toLowerCase().includes("north") || r.toLowerCase().includes("zone ne-4")
  );

  const routeA: EvacuationRouteDetail = {
    routeId: "RT-A",
    label: "Route A — Recommended Corridor",
    via: "River Road → Highway 12 North",
    origin: input.originLocation.name || "Current Location",
    destination: "Central Community Center",
    waypoints: [
      { label: "River Road Intersection", lat: 0.5, lng: 0.55 },
      { label: "Highway 12 North Access", lat: 0.5, lng: 0.38 },
      { label: "Central Community Center", lat: 0.38, lng: 0.28 },
    ],
    distance: "4.2 km",
    distanceKm: 4.2,
    estimatedTime: "12 min by car · 52 min on foot",
    estimatedTimeMinutes: 12,
    safetyScore: 94,
    riskLevel: "LOW",
    riskNote: "Clear elevated bypass, no active hazards or road blockages reported.",
    congestion: "LIGHT",
    blockedRoads: [],
    safe: true,
    status: "RECOMMENDED",
    capacity: "4,000 evacuees/hr",
    shelterTarget: "Central Community Center",
    segments: [
      { type: "CLEAR", label: "River Road — elevated surface clear" },
      { type: "CLEAR", label: "Highway 12 North — open flow" },
      { type: "CLEAR", label: "Arrival at Central Community Center" },
    ],
  };

  const routeB: EvacuationRouteDetail = {
    routeId: "RT-B",
    label: "Route B — Alternative Route",
    via: "Bridge St → East Service Road",
    origin: input.originLocation.name || "Current Location",
    destination: "Riverside High School",
    waypoints: [
      { label: "Bridge Street", lat: 0.35, lng: 0.48 },
      { label: "East Service Road", lat: 0.6, lng: 0.65 },
      { label: "Riverside High School", lat: 0.65, lng: 0.65 },
    ],
    distance: "5.8 km",
    distanceKm: 5.8,
    estimatedTime: "18 min by car · 72 min on foot",
    estimatedTimeMinutes: 18,
    safetyScore: 68,
    riskLevel: "MODERATE",
    riskNote: "Passes adjacent to minor water accumulation near Bridge St. Elevated but passable.",
    congestion: "MODERATE",
    blockedRoads: [],
    safe: true,
    status: "CONGESTED",
    capacity: "2,200 evacuees/hr",
    shelterTarget: "Riverside High School",
    segments: [
      { type: "WARNING", label: "Bridge St — minor water on shoulder" },
      { type: "CLEAR", label: "East Service Road — clear path" },
      { type: "CLEAR", label: "Arrival at Riverside High School" },
    ],
  };

  const routeC: EvacuationRouteDetail = {
    routeId: "RT-C",
    label: "Route C — Unsafe / Blocked",
    via: "North Ave → Zone NE-4",
    origin: input.originLocation.name || "Current Location",
    destination: "North Community Hall",
    waypoints: [
      { label: "North Avenue Access", lat: 0.5, lng: 0.6 },
      { label: "Zone NE-4 Perimeter", lat: 0.7, lng: 0.2 },
    ],
    distance: "2.1 km",
    distanceKm: 2.1,
    estimatedTime: "UNAVAILABLE",
    estimatedTimeMinutes: 999,
    safetyScore: 12,
    riskLevel: "CRITICAL",
    riskNote: "Zone NE-4 is under mandatory evacuation. Blocked by collapse debris and emergency perimeter.",
    congestion: "BLOCKED",
    blockedRoads: ["North Ave", "Bridge Sector 7 Corridor"],
    safe: false,
    status: "BLOCKED",
    capacity: "0 evacuees/hr",
    shelterTarget: "North Community Hall",
    segments: [
      { type: "BLOCKED", label: "North Ave — emergency perimeter restriction" },
      { type: "BLOCKED", label: "Zone NE-4 — structural collapse & gas main hazard" },
    ],
  };

  return [routeA, routeB, routeC];
}
