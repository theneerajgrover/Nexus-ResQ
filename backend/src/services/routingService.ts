// ============================================================
// NEXUS RESQ — REAL-TIME ROUTING & SAFETY ASSESSMENT ENGINE
// ============================================================
// Optimization Strategy: SAFETY > AVAILABILITY > ETA/DISTANCE
// Integrates Google Routes API v2 with resilient OSRM fallback
// Evaluates route risk against live weather and active hazard perimeters
// ============================================================

import { query } from '../db';
import { broadcastEvent } from '../routes/realtime';

export type SafetyStatus = 'SAFE' | 'CAUTION' | 'HIGH_RISK' | 'BLOCKED';

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  location?: { lat: number; lng: number };
}

export interface RouteOption {
  id: string;
  label: string;
  via: string;
  distanceMeters: number;
  durationSeconds: number;
  distanceFormatted: string;
  etaFormatted: string;
  polyline: string;
  coordinates: [number, number][]; // [lat, lng] array
  steps: RouteStep[];
  safetyStatus: SafetyStatus;
  safetyScore: number; // 0 - 100
  riskFactors: string[];
  isSafest: boolean;
  selected: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

// Distance calculation between two points using Haversine formula (in meters)
export function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Minimum distance from a point to a polyline path (in meters)
export function minDistanceToPathMeters(point: Coordinates, path: [number, number][]): number {
  if (!path || path.length === 0) return Infinity;
  let minDistance = Infinity;
  for (const [lat, lng] of path) {
    const dist = haversineDistanceMeters(point.lat, point.lng, lat, lng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

// Lightweight Polyline Decoder (Google Polyline Algorithm)
export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const poly: [number, number][] = [];
  let index = 0,
    len = encoded.length;
  let lat = 0,
    lng = 0;

  while (index < len) {
    let b,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lat / 1e5, lng / 1e5]);
  }
  return poly;
}

// Lightweight Polyline Encoder
export function encodePolyline(coords: [number, number][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  function encodePoint(val: number) {
    let num = Math.round(val * 1e5);
    num = num < 0 ? ~(num << 1) : num << 1;
    while (num >= 0x20) {
      encoded += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
      num >>= 5;
    }
    encoded += String.fromCharCode(num + 63);
  }

  for (const [lat, lng] of coords) {
    encodePoint(lat - prevLat);
    encodePoint(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return encoded;
}

/**
 * Format meters into human-readable string (e.g. "2.4 km")
 */
function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format seconds into human-readable ETA (e.g. "7 mins")
 */
function formatDuration(seconds: number): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hrs}h ${remainingMins}m`;
}

/**
 * Fetch route alternatives between origin and destination.
 * Strategy:
 * 1. Try Google Routes API v2 if GEMINI_ROUTES_API_KEY / GOOGLE_MAPS_API_KEY is available.
 * 2. Fall back to OSRM driving engine with alternatives.
 * 3. Fall back to geodesic safe path if external network is unavailable.
 */
export async function computeRouteAlternatives(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteOption[]> {
  const apiKey =
    process.env.GEMINI_ROUTES_API_KEY || process.env.GOOGLE_MAPS_API_KEY || process.env.GEMINI_API_KEY;

  // 1. Attempt Google Routes API v2
  if (apiKey && apiKey.startsWith('AIza')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask':
            'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.legs.steps',
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode: 'DRIVE',
          routingPreference: 'TRAFFIC_AWARE',
          computeAlternativeRoutes: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.routes && data.routes.length > 0) {
          const parsedRoutes: RouteOption[] = data.routes.map((r: any, idx: number) => {
            const polylineStr = r.polyline?.encodedPolyline || '';
            const coords = decodePolyline(polylineStr);
            const distMeters = r.distanceMeters || 1000;
            const durSeconds = parseInt(r.duration?.replace('s', '') || '600', 10);
            const via = r.description || `Corridor ${String.fromCharCode(65 + idx)}`;

            const steps: RouteStep[] = (r.legs?.[0]?.steps || []).map((s: any) => ({
              instruction: s.navigationInstruction?.maneuver || 'Proceed on tactical corridor',
              distanceMeters: s.distanceMeters || 0,
              durationSeconds: parseInt(s.staticDuration?.replace('s', '') || '0', 10),
              location: s.startLocation?.latLng
                ? { lat: s.startLocation.latLng.latitude, lng: s.startLocation.latLng.longitude }
                : undefined,
            }));

            return {
              id: `ROUTE-${String.fromCharCode(65 + idx)}`,
              label: `Route ${String.fromCharCode(65 + idx)} (${via})`,
              via,
              distanceMeters: distMeters,
              durationSeconds: durSeconds,
              distanceFormatted: formatDistance(distMeters),
              etaFormatted: formatDuration(durSeconds),
              polyline: polylineStr,
              coordinates: coords,
              steps,
              safetyStatus: 'SAFE' as SafetyStatus,
              safetyScore: 100,
              riskFactors: [],
              isSafest: idx === 0,
              selected: idx === 0,
            };
          });

          return parsedRoutes;
        }
      } else {
        console.warn(`[RoutingService] Google Routes API returned status ${response.status}. Falling back to OSRM.`);
      }
    } catch (err: any) {
      console.warn(`[RoutingService] Google Routes API attempt failed: ${err.message}. Falling back to OSRM.`);
    }
  }

  // 2. Resilient OSRM Driving Engine with Alternatives
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
    const response = await fetch(osrmUrl, {
      headers: { 'User-Agent': 'NexusResQ-Emergency/1.0' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = (await response.json()) as any;
      if (data.routes && data.routes.length > 0) {
        return data.routes.map((r: any, idx: number) => {
          // OSRM coordinates are [lng, lat] GeoJSON format
          const coords: [number, number][] = (r.geometry?.coordinates || []).map(
            (pt: [number, number]) => [pt[1], pt[0]] as [number, number]
          );
          const encodedPoly = encodePolyline(coords);
          const distMeters = Math.round(r.distance || 1000);
          const durSeconds = Math.round(r.duration || 600);
          const via = (r.legs?.[0]?.summary || `Sector Corridor ${String.fromCharCode(65 + idx)}`).trim();

          const steps: RouteStep[] = (r.legs?.[0]?.steps || []).map((s: any) => ({
            instruction: `${s.maneuver?.type || 'Proceed'} ${s.name ? 'onto ' + s.name : ''}`.trim(),
            distanceMeters: Math.round(s.distance || 0),
            durationSeconds: Math.round(s.duration || 0),
            location: s.maneuver?.location
              ? { lat: s.maneuver.location[1], lng: s.maneuver.location[0] }
              : undefined,
          }));

          return {
            id: `ROUTE-${String.fromCharCode(65 + idx)}`,
            label: `Route ${String.fromCharCode(65 + idx)} (${via || 'Direct Arterial'})`,
            via: via || `Highway Access ${String.fromCharCode(65 + idx)}`,
            distanceMeters: distMeters,
            durationSeconds: durSeconds,
            distanceFormatted: formatDistance(distMeters),
            etaFormatted: formatDuration(durSeconds),
            polyline: encodedPoly,
            coordinates: coords,
            steps,
            safetyStatus: 'SAFE' as SafetyStatus,
            safetyScore: 100,
            riskFactors: [],
            isSafest: idx === 0,
            selected: idx === 0,
          };
        });
      }
    }
  } catch (err: any) {
    console.warn(`[RoutingService] OSRM query failed: ${err.message}. Falling back to safe geodesic route.`);
  }

  // 3. Geodesic safe fallback with distinct tactical routes
  const directDist = haversineDistanceMeters(origin.lat, origin.lng, destination.lat, destination.lng);
  const midLat = (origin.lat + destination.lat) / 2;
  const midLng = (origin.lng + destination.lng) / 2;

  // Route A: Direct corridor
  const coordsA: [number, number][] = [
    [origin.lat, origin.lng],
    [midLat, midLng],
    [destination.lat, destination.lng],
  ];

  // Route B: Northern bypass corridor (+0.005 offset)
  const coordsB: [number, number][] = [
    [origin.lat, origin.lng],
    [midLat + 0.005, midLng - 0.003],
    [midLat + 0.004, midLng + 0.003],
    [destination.lat, destination.lng],
  ];

  return [
    {
      id: 'ROUTE-A',
      label: 'Route A (Primary Arterial)',
      via: 'Primary Arterial',
      distanceMeters: Math.round(directDist * 1.15),
      durationSeconds: Math.round((directDist * 1.15) / 10), // ~36 km/h
      distanceFormatted: formatDistance(directDist * 1.15),
      etaFormatted: formatDuration((directDist * 1.15) / 10),
      polyline: encodePolyline(coordsA),
      coordinates: coordsA,
      steps: [
        { instruction: 'Depart origin onto primary arterial', distanceMeters: directDist * 0.5, durationSeconds: 300 },
        { instruction: 'Continue toward destination scene', distanceMeters: directDist * 0.65, durationSeconds: 350 },
      ],
      safetyStatus: 'SAFE',
      safetyScore: 100,
      riskFactors: [],
      isSafest: true,
      selected: true,
    },
    {
      id: 'ROUTE-B',
      label: 'Route B (Secondary Bypass)',
      via: 'Secondary Perimeter Bypass',
      distanceMeters: Math.round(directDist * 1.35),
      durationSeconds: Math.round((directDist * 1.35) / 9),
      distanceFormatted: formatDistance(directDist * 1.35),
      etaFormatted: formatDuration((directDist * 1.35) / 9),
      polyline: encodePolyline(coordsB),
      coordinates: coordsB,
      steps: [
        { instruction: 'Take perimeter bypass route', distanceMeters: directDist * 0.7, durationSeconds: 400 },
        { instruction: 'Merge onto destination approach', distanceMeters: directDist * 0.65, durationSeconds: 400 },
      ],
      safetyStatus: 'SAFE',
      safetyScore: 95,
      riskFactors: [],
      isSafest: false,
      selected: false,
    },
  ];
}

/**
 * Evaluates the safety of multiple candidate routes against active real-world signals:
 * - Active disaster zones and hazardous perimeters from PostgreSQL
 * - Real-time weather conditions from Open-Meteo
 * - Reported road closures and flood zones
 *
 * Optimization Rule: SAFETY > AVAILABILITY > ETA/DISTANCE
 */
export async function evaluateRouteSafety(
  routes: RouteOption[],
  incidentContext?: { incidentId?: string; type?: string; location?: string }
): Promise<RouteOption[]> {
  if (!routes || routes.length === 0) return [];

  // 1. Query active hazard perimeters & incidents from PostgreSQL
  let activeHazards: Array<{
    id: string;
    title: string;
    type: string;
    severity: string;
    lat: number;
    lng: number;
    perimeterMeters: number;
    hazards: string[];
  }> = [];

  try {
    const hazardsRes = await query(`
      SELECT DISTINCT ON (i.id)
        i.id,
        i.title,
        i.type,
        i.severity,
        i.latitude as lat,
        i.longitude as lng,
        COALESCE(m.perimeter, '250m') as perimeter,
        COALESCE(m.hazards, ARRAY[]::text[]) as hazards
      FROM incidents i
      LEFT JOIN missions m ON m.incident_id = i.id
      WHERE i.status NOT IN ('COMPLETED', 'RESOLVED')
        AND i.latitude IS NOT NULL
        AND i.longitude IS NOT NULL
      ORDER BY i.id
      LIMIT 20
    `);

    activeHazards = hazardsRes.rows.map((row: any) => {
      let radius = 250;
      if (typeof row.perimeter === 'string') {
        const num = parseInt(row.perimeter.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num) && num > 0) radius = num;
      }
      return {
        id: row.id,
        title: row.title,
        type: row.type,
        severity: row.severity,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        perimeterMeters: radius,
        hazards: Array.isArray(row.hazards) ? row.hazards : [],
      };
    });
  } catch (err: any) {
    console.warn('[RoutingService] Failed to query active hazards from DB:', err.message);
  }

  // 2. Fetch live weather for the route corridor
  let weatherRiskPenalty = 0;
  let weatherRiskFactor: string | null = null;

  try {
    const firstRoute = routes[0];
    const midPoint =
      firstRoute && firstRoute.coordinates.length > 0
        ? firstRoute.coordinates[Math.floor(firstRoute.coordinates.length / 2)]
        : null;

    if (midPoint) {
      const [midLat, midLon] = midPoint;
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${midLat}&longitude=${midLon}&current=precipitation,weather_code,wind_speed_10m&wind_speed_unit=kmh`,
        { signal: AbortSignal.timeout(3000) }
      );

      if (weatherRes.ok) {
        const weatherJson = (await weatherRes.json()) as any;
        const current = weatherJson?.current;
        if (current) {
          const precip = current.precipitation || 0;
          const wind = current.wind_speed_10m || 0;
          const code = current.weather_code || 0;

          if (code >= 95 || wind > 60 || precip > 10) {
            weatherRiskPenalty = 25;
            weatherRiskFactor = `Severe weather alert: High winds (${Math.round(wind)} km/h), precip (${precip}mm)`;
          } else if (precip > 3 || wind > 35) {
            weatherRiskPenalty = 10;
            weatherRiskFactor = `Weather advisory: Rain/Wind condition along route (${Math.round(wind)} km/h)`;
          }
        }
      }
    }
  } catch {
    // Weather fetch failed gracefully; signal is not fabricated
  }

  // 3. Evaluate each route candidate
  const evaluatedRoutes = routes.map((route) => {
    let score = 100;
    const factors: string[] = [];

    if (weatherRiskFactor) {
      score -= weatherRiskPenalty;
      factors.push(weatherRiskFactor);
    }

    // Check intersection with active hazard zones
    for (const hazard of activeHazards) {
      // Do not count the target incident itself as an obstacle blocking the destination
      if (incidentContext?.incidentId && hazard.id === incidentContext.incidentId) {
        continue;
      }

      if (isNaN(hazard.lat) || isNaN(hazard.lng)) continue;

      const distMeters = minDistanceToPathMeters({ lat: hazard.lat, lng: hazard.lng }, route.coordinates);

      if (distMeters < hazard.perimeterMeters) {
        // Direct intersection with hazard perimeter!
        const penalty = hazard.severity === 'CRITICAL' ? 60 : 40;
        score -= penalty;
        factors.push(
          `Critical obstacle: Path directly traverses ${hazard.title} (${hazard.type}) hazard zone (${Math.round(
            distMeters
          )}m away)`
        );
      } else if (distMeters < hazard.perimeterMeters + 150) {
        // Proximity caution
        score -= 20;
        factors.push(
          `Proximity caution: Path passes within ${Math.round(distMeters)}m of active incident (${hazard.title})`
        );
      }
    }

    const uniqueFactors = Array.from(new Set(factors));

    // Cap score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine safety classification
    let status: SafetyStatus = 'SAFE';
    if (score < 25) {
      status = 'BLOCKED';
    } else if (score < 60) {
      status = 'HIGH_RISK';
    } else if (score < 85) {
      status = 'CAUTION';
    } else {
      status = 'SAFE';
    }

    return {
      ...route,
      safetyStatus: status,
      safetyScore: score,
      riskFactors: uniqueFactors,
      isSafest: false,
      selected: false,
    };
  });

  // 4. Optimization Sort: SAFETY > AVAILABILITY > ETA/DISTANCE
  const statusRank: Record<SafetyStatus, number> = {
    SAFE: 4,
    CAUTION: 3,
    HIGH_RISK: 2,
    BLOCKED: 1,
  };

  evaluatedRoutes.sort((a, b) => {
    const rankDiff = statusRank[b.safetyStatus] - statusRank[a.safetyStatus];
    if (rankDiff !== 0) return rankDiff; // Higher safety rank always wins!

    const scoreDiff = b.safetyScore - a.safetyScore;
    if (scoreDiff !== 0) return scoreDiff; // Higher score wins

    // When safety is equal, prefer shorter duration (ETA)
    return a.durationSeconds - b.durationSeconds;
  });

  // Mark the top route as safest and selected
  if (evaluatedRoutes.length > 0) {
    evaluatedRoutes[0].isSafest = true;
    evaluatedRoutes[0].selected = true;
  }

  return evaluatedRoutes;
}

/**
 * Persists the selected active route to PostgreSQL active_routes table.
 */
export async function persistActiveRoute(
  incidentId: string | null,
  requestId: string | null,
  responderId: string | null,
  origin: Coordinates,
  destination: Coordinates,
  selectedRoute: RouteOption,
  allAlternatives: RouteOption[],
  recalculationReason?: string
): Promise<string> {
  const routeId = `RT-${Date.now().toString().slice(-6)}`;

  // Mark prior active routes for this incident or request as inactive
  if (incidentId) {
    await query(`UPDATE active_routes SET is_active = FALSE WHERE incident_id = $1`, [incidentId]).catch(() => {});
  }
  if (requestId) {
    await query(`UPDATE active_routes SET is_active = FALSE WHERE request_id = $1`, [requestId]).catch(() => {});
  }

  await query(
    `INSERT INTO active_routes (
      id, incident_id, request_id, responder_id, origin_lat, origin_lng, destination_lat, destination_lng,
      route_label, distance_meters, duration_seconds, polyline, geometry, steps, safety_status, safety_score,
      risk_factors, alternatives, is_active, recalculation_reason, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, TRUE, $19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [
      routeId,
      incidentId,
      requestId,
      responderId,
      origin.lat,
      origin.lng,
      destination.lat,
      destination.lng,
      selectedRoute.label,
      selectedRoute.distanceMeters,
      selectedRoute.durationSeconds,
      selectedRoute.polyline,
      JSON.stringify(selectedRoute.coordinates),
      JSON.stringify(selectedRoute.steps),
      selectedRoute.safetyStatus,
      selectedRoute.safetyScore,
      selectedRoute.riskFactors,
      JSON.stringify(allAlternatives),
      recalculationReason || null,
    ]
  );

  return routeId;
}

/**
 * Continuous Route Monitoring:
 * Re-evaluates active route when responder moves or hazard conditions change.
 * If the active route becomes unsafe (e.g. degrades to HIGH_RISK or BLOCKED),
 * recalculates viable routes, selects the safest alternative, updates PostgreSQL,
 * and notifies citizen, responder, and authority via SSE.
 */
export async function checkAndTriggerDynamicReroute(
  incidentId: string,
  currentLocation?: Coordinates
): Promise<{ rerouted: boolean; activeRoute: RouteOption | null }> {
  try {
    // 1. Query the currently active route from PostgreSQL
    const activeRouteRes = await query(
      `SELECT * FROM active_routes WHERE incident_id = $1 AND is_active = TRUE LIMIT 1`,
      [incidentId]
    );

    if (activeRouteRes.rowCount === 0) {
      return { rerouted: false, activeRoute: null };
    }

    const row = activeRouteRes.rows[0];
    const origin: Coordinates = currentLocation || {
      lat: parseFloat(row.origin_lat),
      lng: parseFloat(row.origin_lng),
    };
    const destination: Coordinates = {
      lat: parseFloat(row.destination_lat),
      lng: parseFloat(row.destination_lng),
    };

    // 2. Compute fresh route alternatives
    const candidates = await computeRouteAlternatives(origin, destination);
    const evaluated = await evaluateRouteSafety(candidates, { incidentId });

    if (evaluated.length === 0) {
      return { rerouted: false, activeRoute: null };
    }

    const safestRoute = evaluated[0];
    const previousStatus = row.safety_status;

    // Check if rerouting is required:
    // a) Current route has degraded to HIGH_RISK or BLOCKED while a safer alternative (SAFE/CAUTION) exists
    // b) Safest route has changed significantly in score or corridor
    const currentRouteDegraded =
      (previousStatus === 'HIGH_RISK' || previousStatus === 'BLOCKED') &&
      (safestRoute.safetyStatus === 'SAFE' || safestRoute.safetyStatus === 'CAUTION');

    const scoreDifference = Math.abs(safestRoute.safetyScore - (row.safety_score || 100));
    const shouldReroute = currentRouteDegraded || scoreDifference >= 30;

    if (shouldReroute) {
      console.log(
        `[RoutingService] Dynamic reroute triggered for incident ${incidentId}. New status: ${safestRoute.safetyStatus} (Score: ${safestRoute.safetyScore})`
      );

      const reason = `Hazard detected on previous path. Switched to ${safestRoute.label} (${safestRoute.safetyStatus})`;
      await persistActiveRoute(
        incidentId,
        row.request_id,
        row.responder_id,
        origin,
        destination,
        safestRoute,
        evaluated,
        reason
      );

      // Create persistent notification in PostgreSQL for Authority, Responder, and Citizen
      const notifId = `NOTIF-${Date.now()}`;
      await query(
        `INSERT INTO notifications (id, role, type, priority, incident_id, title, message, status)
         VALUES ($1, 'authority_command', 'ROUTE_UPDATED', 'HIGH', $2, $3, $4, 'UNREAD')`,
        [
          notifId,
          incidentId,
          'ROUTE UPDATED — SAFER ALTERNATIVE SELECTED',
          `AI Dynamic Routing detected a hazard on the operational path. Automatically selected safest viable route: ${safestRoute.label} (${safestRoute.safetyStatus}).`,
        ]
      ).catch(() => {});

      // Broadcast real-time SSE event to Citizen, Responder, Authority
      broadcastEvent('ROUTE_UPDATED', {
        incidentId,
        requestId: row.request_id,
        activeRoute: safestRoute,
        reason: 'ROUTE UPDATED — SAFER ALTERNATIVE SELECTED',
        timestamp: Date.now(),
      });

      return { rerouted: true, activeRoute: safestRoute };
    }

    return { rerouted: false, activeRoute: safestRoute };
  } catch (err: any) {
    console.error('[RoutingService] Error during dynamic reroute check:', err.message);
    return { rerouted: false, activeRoute: null };
  }
}
