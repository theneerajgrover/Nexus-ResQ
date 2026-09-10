// ============================================================
// NEXUS RESQ — AUTOMATIC DISASTER DETECTION & INCIDENT CORRELATION
// Correlates Multi-Source Emergency Reports & Evidence to Unified Incidents
// ============================================================
import { query } from '../db';

export interface CorrelateReportInput {
  disaster_type: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  severity?: string;
  description?: string;
}

export interface CorrelationResult {
  isCorrelated: boolean;
  incidentId: string | null;
  existingIncident: any | null;
  confidence: number;
  reason: string;
}

/**
 * Compute great-circle distance between two coordinates in kilometers using Haversine formula
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if two disaster types are compatible / represent the same hazard category
 */
function areDisasterTypesCompatible(type1: string, type2: string): boolean {
  const t1 = (type1 || '').toUpperCase().trim();
  const t2 = (type2 || '').toUpperCase().trim();

  if (t1 === t2) return true;

  const floodFamily = ['FLOOD', 'WATER', 'WATER_SURGE', 'CYCLONE'];
  if (floodFamily.includes(t1) && floodFamily.includes(t2)) return true;

  const fireFamily = ['FIRE', 'WILDFIRE', 'EXPLOSION', 'STRUCTURAL_FIRE'];
  if (fireFamily.includes(t1) && fireFamily.includes(t2)) return true;

  const collapseFamily = ['STRUCTURAL', 'EARTHQUAKE', 'COLLAPSE'];
  if (collapseFamily.includes(t1) && collapseFamily.includes(t2)) return true;

  return false;
}

/**
 * Evaluate whether an incoming report should be correlated with an active incident.
 * Uses location proximity (<= 2.5 km), disaster compatibility, and recent reporting window (4 hours).
 */
export async function findCorrelatedIncident(input: CorrelateReportInput): Promise<CorrelationResult> {
  try {
    const rawLat = typeof input.latitude === 'number' && !isNaN(input.latitude) ? input.latitude : null;
    const rawLon = typeof input.longitude === 'number' && !isNaN(input.longitude) ? input.longitude : null;
    const normLocation = (input.location || '').trim().toLowerCase();
    const disasterType = (input.disaster_type || 'OTHER').toUpperCase().trim();

    // Query active non-resolved incidents reported in the last 4 hours
    const activeIncRes = await query(`
      SELECT id, title, type, severity, location, latitude, longitude, status, responders_count,
             pending, created_at, updated_at, affected_people, source, description
      FROM incidents
      WHERE status NOT IN ('RESOLVED', 'CANCELLED')
        AND created_at >= NOW() - INTERVAL '4 hours'
      ORDER BY created_at DESC
      LIMIT 25
    `);

    if (activeIncRes.rowCount === 0) {
      return {
        isCorrelated: false,
        incidentId: null,
        existingIncident: null,
        confidence: 0,
        reason: 'No active recent incidents in database to correlate against',
      };
    }

    let bestMatch: any = null;
    let highestConfidence = 0;
    let matchReason = '';

    for (const inc of activeIncRes.rows) {
      const typeCompatible = areDisasterTypesCompatible(disasterType, inc.type);
      if (!typeCompatible) continue;

      let score = 40; // Base score for compatible disaster type

      // Proximity evaluation
      const incLat = inc.latitude ? parseFloat(inc.latitude) : null;
      const incLon = inc.longitude ? parseFloat(inc.longitude) : null;

      if (rawLat !== null && rawLon !== null && incLat !== null && incLon !== null) {
        const distKm = calculateDistanceKm(rawLat, rawLon, incLat, incLon);
        if (distKm <= 1.0) {
          score += 55; // Extremely close proximity (< 1 km)
          matchReason = `High spatial proximity (${(distKm * 1000).toFixed(0)}m) and compatible disaster type (${disasterType})`;
        } else if (distKm <= 2.5) {
          score += 40; // Close proximity (1 - 2.5 km)
          matchReason = `Spatial proximity (${distKm.toFixed(1)} km) and compatible disaster type (${disasterType})`;
        } else if (distKm <= 5.0) {
          score += 15;
        }
      }

      // Textual location similarity
      const incLocation = (inc.location || '').trim().toLowerCase();
      if (normLocation && incLocation) {
        if (normLocation === incLocation) {
          score += 30;
          if (!matchReason) matchReason = `Exact location match (${inc.location}) and disaster type (${disasterType})`;
        } else if (normLocation.includes(incLocation) || incLocation.includes(normLocation)) {
          score += 20;
          if (!matchReason) matchReason = `Location substring match (${inc.location}) and disaster type (${disasterType})`;
        }
      }

      if (score > highestConfidence) {
        highestConfidence = score;
        bestMatch = inc;
      }
    }

    // Threshold: confidence >= 70 indicates reliable correlation
    if (highestConfidence >= 70 && bestMatch) {
      return {
        isCorrelated: true,
        incidentId: bestMatch.id,
        existingIncident: bestMatch,
        confidence: Math.min(100, highestConfidence),
        reason: matchReason,
      };
    }

    return {
      isCorrelated: false,
      incidentId: null,
      existingIncident: null,
      confidence: highestConfidence,
      reason: 'Confidence below threshold; treated as distinct operational incident',
    };
  } catch (err: any) {
    console.error('[Correlation Error] Failed to correlate incident:', err.message);
    return {
      isCorrelated: false,
      incidentId: null,
      existingIncident: null,
      confidence: 0,
      reason: `Correlation error: ${err.message}`,
    };
  }
}
