// ============================================================
// NEXUS RESQ — PRODUCTION LOCATION & REVERSE GEOCODING SERVICE
// ============================================================
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  formatted_address: string;
  place_id: string | null;
  locality: string | null;
  city: string | null;
  village: string | null;
  district: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  verified: boolean;
  source: 'google' | 'osm' | 'gps_raw';
  resolved_at: string;
  confidence?: number;
  warning?: string;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  source: 'google' | 'geocoding';
}

export class LocationService {
  private getGoogleApiKey(): string | null {
    return (
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.GOOGLE_MAPS_SERVER_API_KEY ||
      process.env.GOOGLE_GEOCODING_API_KEY ||
      process.env.GOOGLE_PLACES_API_KEY ||
      null
    );
  }

  /**
   * Validate latitude, longitude, and accuracy
   */
  public validateCoordinates(lat: number, lon: number, accuracy?: number | null): { valid: boolean; error?: string } {
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      return { valid: false, error: `Invalid latitude: ${lat}. Latitude must be a number between -90 and 90.` };
    }
    if (typeof lon !== 'number' || isNaN(lon) || lon < -180 || lon > 180) {
      return { valid: false, error: `Invalid longitude: ${lon}. Longitude must be a number between -180 and 180.` };
    }
    if (accuracy !== undefined && accuracy !== null) {
      if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0) {
        return { valid: false, error: `Invalid accuracy: ${accuracy}. Accuracy must be non-negative.` };
      }
    }
    return { valid: true };
  }

  /**
   * Extract administrative components from Google address_components array
   */
  private parseGoogleAddressComponents(components: any[]): {
    village: string | null;
    locality: string | null;
    city: string | null;
    district: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  } {
    let village: string | null = null;
    let locality: string | null = null;
    let city: string | null = null;
    let district: string | null = null;
    let state: string | null = null;
    let postal_code: string | null = null;
    let country: string | null = null;

    if (!Array.isArray(components)) {
      return { village, locality, city, district, state, postal_code, country };
    }

    for (const comp of components) {
      const types = comp.types || [];
      const longName = comp.long_name || comp.short_name;

      if (types.includes('sublocality_level_2') || types.includes('sublocality_level_1') || types.includes('neighborhood')) {
        village = longName;
      }
      if (types.includes('locality')) {
        locality = longName;
        city = longName;
      }
      if (types.includes('administrative_area_level_2')) {
        district = longName;
        if (!city) city = longName;
      }
      if (types.includes('administrative_area_level_1')) {
        state = longName;
      }
      if (types.includes('postal_code')) {
        postal_code = longName;
      }
      if (types.includes('country')) {
        country = longName;
      }
    }

    return { village, locality, city, district, state, postal_code, country };
  }

  /**
   * Reverse-geocode coordinates into human-readable address and administrative components.
   * Priority: Google Geocoding API.
   * Resilient Fallback: Real OpenStreetMap reverse geocoding (labeled unverified, zero fake data).
   */
  public async reverseGeocode(
    lat: number,
    lon: number,
    accuracy: number | null = null
  ): Promise<{ success: boolean; data?: ResolvedLocation; error?: string }> {
    const coordValidation = this.validateCoordinates(lat, lon, accuracy);
    if (!coordValidation.valid) {
      return { success: false, error: coordValidation.error };
    }

    const apiKey = this.getGoogleApiKey();

    // 1. Attempt Google Geocoding API
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}`;
        const res = await fetch(googleUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          if (json.status === 'OK' && json.results && json.results.length > 0) {
            const first = json.results[0];
            const parsed = this.parseGoogleAddressComponents(first.address_components);

            return {
              success: true,
              data: {
                latitude: lat,
                longitude: lon,
                accuracy_meters: accuracy,
                formatted_address: first.formatted_address,
                place_id: first.place_id || null,
                locality: parsed.locality,
                city: parsed.city,
                village: parsed.village,
                district: parsed.district,
                state: parsed.state,
                postal_code: parsed.postal_code,
                country: parsed.country,
                verified: true,
                source: 'google',
                resolved_at: new Date().toISOString(),
                confidence: 95.0,
              },
            };
          } else if (json.status !== 'REQUEST_DENIED' && json.status !== 'OVER_QUERY_LIMIT') {
            console.warn(`[LocationService] Google Geocoding status: ${json.status}`, json.error_message || '');
          }
        }
      } catch (err: any) {
        console.warn('[LocationService] Google Geocoding request failed:', err.message);
      }
    }

    // 2. Resilient OpenStreetMap / Nominatim Fallback (Real data, labeled clearly, never fake demo text)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const osmRes = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'NexusResQ-EmergencyPlatform/1.0 (emergency-location-service)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (osmRes.ok) {
        const json: any = await osmRes.json();
        const addr = json.address || {};
        const road = addr.road || addr.street || addr.neighbourhood || addr.suburb || '';
        const village = addr.village || addr.suburb || addr.neighbourhood || null;
        const locality = addr.suburb || addr.town || addr.village || null;
        const city = addr.city || addr.town || addr.municipality || null;
        const district = addr.county || addr.state_district || null;
        const state = addr.state || null;
        const postal_code = addr.postcode || null;
        const country = addr.country || null;

        const parts = [road, city || village, state, country].filter(Boolean);
        const formatted = parts.length > 0 ? parts.join(', ') : json.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

        return {
          success: true,
          data: {
            latitude: lat,
            longitude: lon,
            accuracy_meters: accuracy,
            formatted_address: formatted,
            place_id: json.osm_id ? `osm_${json.osm_id}` : null,
            locality: locality || city,
            city: city || locality,
            village,
            district,
            state,
            postal_code,
            country,
            verified: false, // Mark unverified so citizen confirms
            source: 'osm',
            resolved_at: new Date().toISOString(),
            confidence: 80.0,
            warning: 'Location resolved via public GIS. Please confirm precision.',
          },
        };
      }
    } catch (err: any) {
      console.warn('[LocationService] OpenStreetMap fallback reverse geocode failed:', err.message);
    }

    // 3. Fallback: Honest coordinate-based representation (never invent fake city names)
    return {
      success: true,
      data: {
        latitude: lat,
        longitude: lon,
        accuracy_meters: accuracy,
        formatted_address: `GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        place_id: null,
        locality: null,
        city: null,
        village: null,
        district: null,
        state: null,
        postal_code: null,
        country: null,
        verified: false,
        source: 'gps_raw',
        resolved_at: new Date().toISOString(),
        confidence: 60.0,
        warning: 'Reverse geocoding unavailable. Coordinates recorded accurately.',
      },
    };
  }

  /**
   * Search candidate places for autocomplete.
   * Uses Google Places Autocomplete API or Geocoding API.
   */
  public async autocompletePlaces(input: string): Promise<{ success: boolean; data: PlacePrediction[]; error?: string }> {
    const queryStr = (input || '').trim();
    if (!queryStr || queryStr.length < 2) {
      return { success: true, data: [] };
    }

    const apiKey = this.getGoogleApiKey();

    // 1. Attempt Google Places Autocomplete API
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const placesUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(queryStr)}&key=${apiKey}`;
        const res = await fetch(placesUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          if (json.status === 'OK' && Array.isArray(json.predictions)) {
            const predictions: PlacePrediction[] = json.predictions.map((p: any) => ({
              place_id: p.place_id,
              description: p.description,
              main_text: p.structured_formatting?.main_text || p.description,
              secondary_text: p.structured_formatting?.secondary_text || '',
              source: 'google',
            }));
            return { success: true, data: predictions };
          }
        }
      } catch (err: any) {
        console.warn('[LocationService] Google Places Autocomplete failed:', err.message);
      }

      // 1b. Attempt Google Geocoding Text Search
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(queryStr)}&key=${apiKey}`;
        const res = await fetch(geoUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          if (json.status === 'OK' && Array.isArray(json.results) && json.results.length > 0) {
            const predictions: PlacePrediction[] = json.results.slice(0, 5).map((r: any) => ({
              place_id: r.place_id || `geo_${r.geometry?.location?.lat}_${r.geometry?.location?.lng}`,
              description: r.formatted_address,
              main_text: r.formatted_address.split(',')[0],
              secondary_text: r.formatted_address.split(',').slice(1).join(',').trim(),
              source: 'google',
            }));
            return { success: true, data: predictions };
          }
        }
      } catch (err: any) {
        console.warn('[LocationService] Google Geocoding text search failed:', err.message);
      }
    }

    // 2. Resilient Open-Meteo Geocoding / Public GIS Search Fallback (Real coordinates, zero mock data)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const searchUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryStr)}&count=5&language=en&format=json`;
      const res = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const json: any = await res.json();
        if (json.results && Array.isArray(json.results)) {
          const predictions: PlacePrediction[] = json.results.map((r: any) => {
            const regionStr = [r.admin1, r.country].filter(Boolean).join(', ');
            return {
              place_id: `om_${r.id}_${r.latitude}_${r.longitude}`,
              description: `${r.name}, ${regionStr}`,
              main_text: r.name,
              secondary_text: regionStr,
              source: 'geocoding',
            };
          });
          return { success: true, data: predictions };
        }
      }
    } catch (err: any) {
      console.warn('[LocationService] Open-Meteo geocoding search failed:', err.message);
    }

    return { success: true, data: [] };
  }

  /**
   * Get Place Details from Place ID or Geocoding
   */
  public async getPlaceDetails(placeId: string): Promise<{ success: boolean; data?: ResolvedLocation; error?: string }> {
    if (!placeId || !placeId.trim()) {
      return { success: false, error: 'Place ID is required.' };
    }

    const apiKey = this.getGoogleApiKey();

    // If placeId starts with 'om_', it is an Open-Meteo place ID encoding lat and lon
    if (placeId.startsWith('om_')) {
      const parts = placeId.split('_');
      if (parts.length >= 4) {
        const lat = parseFloat(parts[2]);
        const lon = parseFloat(parts[3]);
        if (!isNaN(lat) && !isNaN(lon)) {
          return this.reverseGeocode(lat, lon);
        }
      }
    }

    // 1. Attempt Google Place Details API
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry,address_components,name,place_id&key=${apiKey}`;
        const res = await fetch(detailsUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          if (json.status === 'OK' && json.result) {
            const r = json.result;
            const lat = r.geometry?.location?.lat;
            const lon = r.geometry?.location?.lng;
            const parsed = this.parseGoogleAddressComponents(r.address_components);

            if (typeof lat === 'number' && typeof lon === 'number') {
              return {
                success: true,
                data: {
                  latitude: lat,
                  longitude: lon,
                  accuracy_meters: null,
                  formatted_address: r.formatted_address || r.name,
                  place_id: r.place_id || placeId,
                  locality: parsed.locality,
                  city: parsed.city,
                  village: parsed.village,
                  district: parsed.district,
                  state: parsed.state,
                  postal_code: parsed.postal_code,
                  country: parsed.country,
                  verified: true,
                  source: 'google',
                  resolved_at: new Date().toISOString(),
                  confidence: 98.0,
                },
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[LocationService] Google Place Details failed:', err.message);
      }

      // 1b. Attempt Google Geocoding by place_id
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
        const res = await fetch(geoUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          if (json.status === 'OK' && json.results && json.results.length > 0) {
            const first = json.results[0];
            const lat = first.geometry?.location?.lat;
            const lon = first.geometry?.location?.lng;
            const parsed = this.parseGoogleAddressComponents(first.address_components);

            if (typeof lat === 'number' && typeof lon === 'number') {
              return {
                success: true,
                data: {
                  latitude: lat,
                  longitude: lon,
                  accuracy_meters: null,
                  formatted_address: first.formatted_address,
                  place_id: first.place_id || placeId,
                  locality: parsed.locality,
                  city: parsed.city,
                  village: parsed.village,
                  district: parsed.district,
                  state: parsed.state,
                  postal_code: parsed.postal_code,
                  country: parsed.country,
                  verified: true,
                  source: 'google',
                  resolved_at: new Date().toISOString(),
                  confidence: 98.0,
                },
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[LocationService] Google Geocoding by place_id failed:', err.message);
      }
    }

    return {
      success: false,
      error: 'Unable to resolve place details from provider. Please confirm coordinates or address manually.',
    };
  }

  /**
   * Validate a manually entered address or landmark.
   * Returns exact resolved coordinates or a controlled rejection (never silent fake acceptance).
   */
  public async validateAddress(addressText: string): Promise<{ success: boolean; data?: ResolvedLocation; error?: string }> {
    const raw = (addressText || '').trim();
    if (!raw || raw.length < 3) {
      return {
        success: false,
        error: 'Address must be at least 3 characters long.',
      };
    }

    // Check if input is a literal coordinate pair (e.g. "30.6812, 76.6053")
    const coordMatch = raw.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[3]);
      const check = this.validateCoordinates(lat, lon);
      if (check.valid) {
        return this.reverseGeocode(lat, lon);
      }
    }

    const apiKey = this.getGoogleApiKey();

    // 1. Attempt Google Geocoding API
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(raw)}&key=${apiKey}`;
        const res = await fetch(geoUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          if (json.status === 'OK' && json.results && json.results.length > 0) {
            const first = json.results[0];
            const lat = first.geometry?.location?.lat;
            const lon = first.geometry?.location?.lng;
            const parsed = this.parseGoogleAddressComponents(first.address_components);

            if (typeof lat === 'number' && typeof lon === 'number') {
              return {
                success: true,
                data: {
                  latitude: lat,
                  longitude: lon,
                  accuracy_meters: null,
                  formatted_address: first.formatted_address,
                  place_id: first.place_id || null,
                  locality: parsed.locality,
                  city: parsed.city,
                  village: parsed.village,
                  district: parsed.district,
                  state: parsed.state,
                  postal_code: parsed.postal_code,
                  country: parsed.country,
                  verified: true,
                  source: 'google',
                  resolved_at: new Date().toISOString(),
                  confidence: 95.0,
                },
              };
            }
          } else if (json.status === 'ZERO_RESULTS') {
            return {
              success: false,
              error: `Location "${raw}" could not be found. Please select a valid address from suggestions or enter specific street and city details.`,
            };
          }
        }
      } catch (err: any) {
        console.warn('[LocationService] Google Address Validation failed:', err.message);
      }
    }

    // 2. Open-Meteo Geocoding Search Fallback for verified real locations
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(raw)}&count=1&language=en&format=json`;
      const res = await fetch(geoUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const json: any = await res.json();
        if (json.results && json.results.length > 0) {
          const r = json.results[0];
          const region = [r.admin1, r.country].filter(Boolean).join(', ');
          const formatted = `${r.name}, ${region}`;

          return {
            success: true,
            data: {
              latitude: r.latitude,
              longitude: r.longitude,
              accuracy_meters: null,
              formatted_address: formatted,
              place_id: `om_${r.id}`,
              locality: r.name,
              city: r.name,
              village: null,
              district: r.admin2 || null,
              state: r.admin1 || null,
              postal_code: null,
              country: r.country || null,
              verified: true,
              source: 'osm',
              resolved_at: new Date().toISOString(),
              confidence: 85.0,
            },
          };
        }
      }
    } catch (err: any) {
      console.warn('[LocationService] Open-Meteo address validation failed:', err.message);
    }

    // Rejection for unresolvable text: DO NOT silently accept arbitrary fake text!
    return {
      success: false,
      error: `Could not verify "${raw}" as a real geographical location. Please select a recognized address from suggestions or provide nearby landmarks.`,
    };
  }
}

export const locationService = new LocationService();
