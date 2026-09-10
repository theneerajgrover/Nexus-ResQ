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

  /**
   * Search real geographical places (villages, towns, cities, districts, localities, landmarks).
   * Multi-provider cascade:
   * 1. Google Geocoding API (if active)
   * 2. OpenStreetMap / Nominatim Search API (comprehensive coverage of villages, tehsils, towns, cities, districts)
   * 3. Open-Meteo Geocoding Search API (city-level fallback)
   */
  public async searchPlaces(queryStr: string): Promise<{
    success: boolean;
    location?: {
      name: string;
      latitude: number;
      longitude: number;
      city: string | null;
      locality: string | null;
      village: string | null;
      district: string | null;
      state: string | null;
      country: string | null;
      place_id?: string | null;
    };
    results: Array<{
      id: string | number;
      name: string;
      fullName: string;
      latitude: number;
      longitude: number;
      city?: string | null;
      locality?: string | null;
      village?: string | null;
      district?: string | null;
      state?: string | null;
      country?: string | null;
      countryCode?: string | null;
      region?: string | null;
      admin1?: string | null;
    }>;
    error?: string;
  }> {
    const raw = (queryStr || '').trim();
    if (!raw || raw.length < 2) {
      return { success: false, results: [], error: 'Search query must be at least 2 characters.' };
    }

    // Check if input is a literal coordinate pair (e.g. "30.9010, 75.8570")
    const coordMatch = raw.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[3]);
      const check = this.validateCoordinates(lat, lon);
      if (check.valid) {
        const rev = await this.reverseGeocode(lat, lon);
        const name = rev.data?.formatted_address || `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
        const item = {
          id: `coord_${lat}_${lon}`,
          name,
          fullName: name,
          latitude: lat,
          longitude: lon,
          city: rev.data?.city || null,
          locality: rev.data?.locality || null,
          village: rev.data?.village || null,
          district: rev.data?.district || null,
          state: rev.data?.state || null,
          country: rev.data?.country || null,
          region: rev.data?.state || 'Coordinates Location',
        };
        return {
          success: true,
          location: {
            name,
            latitude: lat,
            longitude: lon,
            city: rev.data?.city || null,
            locality: rev.data?.locality || null,
            village: rev.data?.village || null,
            district: rev.data?.district || null,
            state: rev.data?.state || null,
            country: rev.data?.country || null,
            place_id: rev.data?.place_id || null,
          },
          results: [item],
        };
      }
    }

    const apiKey = this.getGoogleApiKey();

    // 1. Attempt Google Geocoding API if key is available
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(raw)}&key=${apiKey}`;
        const res = await fetch(googleUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const json: any = await res.json();
          if (json.status === 'OK' && Array.isArray(json.results) && json.results.length > 0) {
            const parsedResults = json.results.map((r: any, idx: number) => {
              const p = this.parseGoogleAddressComponents(r.address_components);
              const lat = r.geometry?.location?.lat;
              const lon = r.geometry?.location?.lng;
              const mainName = r.formatted_address.split(',')[0];
              return {
                id: r.place_id || `google_${idx}`,
                name: mainName,
                fullName: r.formatted_address,
                latitude: lat,
                longitude: lon,
                city: p.city || p.locality,
                locality: p.locality,
                village: p.village,
                district: p.district,
                state: p.state,
                country: p.country,
                region: p.state,
                admin1: p.state,
              };
            }).filter((r: any) => typeof r.latitude === 'number' && typeof r.longitude === 'number');

            if (parsedResults.length > 0) {
              const best = parsedResults[0];
              return {
                success: true,
                location: {
                  name: best.fullName,
                  latitude: best.latitude,
                  longitude: best.longitude,
                  city: best.city || null,
                  locality: best.locality || null,
                  village: best.village || null,
                  district: best.district || null,
                  state: best.state || null,
                  country: best.country || null,
                  place_id: String(best.id),
                },
                results: parsedResults,
              };
            }
          }
        }
      } catch (err: any) {
        console.warn('[LocationService] Google Geocoding place search notice:', err.message);
      }
    }

    // 2. OpenStreetMap / Nominatim Search API (Full coverage of real villages, towns, tehsils, cities, districts)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(raw)}&format=json&addressdetails=1&limit=8`;
      const res = await fetch(osmUrl, {
        headers: {
          'User-Agent': 'NexusResQ-EmergencyPlatform/1.0 (emergency-location-service)',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json: any = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          const parsedResults = json.map((item: any) => {
            const addr = item.address || {};
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            const city = addr.city || addr.town || addr.municipality || null;
            const locality = addr.suburb || addr.quarter || addr.neighbourhood || addr.city_district || null;
            const village = addr.village || addr.hamlet || addr.isolated_dwelling || null;
            const district = addr.county || addr.state_district || null;
            const state = addr.state || null;
            const country = addr.country || null;
            const countryCode = (addr.country_code || '').toUpperCase();

            const mainName = item.name || locality || village || city || item.display_name.split(',')[0].trim();
            const regionParts = [district, state, country].filter(Boolean);
            const cleanFullName = [mainName, ...regionParts.filter((p: string) => p !== mainName)].join(', ');

            return {
              id: item.osm_id ? `osm_${item.osm_id}` : `osm_${lat}_${lon}`,
              name: mainName,
              fullName: item.display_name || cleanFullName,
              latitude: lat,
              longitude: lon,
              city: city || village || locality,
              locality,
              village,
              district,
              state,
              country,
              countryCode,
              region: state || district,
              admin1: state,
            };
          }).filter((r: any) => !isNaN(r.latitude) && !isNaN(r.longitude));

          if (parsedResults.length > 0) {
            const best = parsedResults[0];
            return {
              success: true,
              location: {
                name: best.fullName,
                latitude: best.latitude,
                longitude: best.longitude,
                city: best.city || null,
                locality: best.locality || null,
                village: best.village || null,
                district: best.district || null,
                state: best.state || null,
                country: best.country || null,
                place_id: String(best.id),
              },
              results: parsedResults,
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[LocationService] OpenStreetMap Nominatim search notice:', err.message);
    }

    // 3. Open-Meteo Geocoding Search Fallback
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(raw)}&count=8&language=en&format=json`;
      const res = await fetch(omUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const json: any = await res.json();
        if (Array.isArray(json.results) && json.results.length > 0) {
          const parsedResults = json.results.map((r: any) => {
            const region = r.admin1 || r.admin2 || '';
            const fullName = [r.name, region, r.country].filter(Boolean).join(', ');
            return {
              id: r.id,
              name: r.name,
              fullName,
              latitude: r.latitude,
              longitude: r.longitude,
              city: r.name,
              locality: null,
              village: null,
              district: r.admin2 || null,
              state: r.admin1 || null,
              country: r.country || null,
              countryCode: r.country_code || '',
              region,
              admin1: r.admin1 || '',
            };
          });

          if (parsedResults.length > 0) {
            const best = parsedResults[0];
            return {
              success: true,
              location: {
                name: best.fullName,
                latitude: best.latitude,
                longitude: best.longitude,
                city: best.city,
                locality: null,
                village: null,
                district: best.district,
                state: best.state,
                country: best.country,
                place_id: `om_${best.id}`,
              },
              results: parsedResults,
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[LocationService] Open-Meteo search fallback notice:', err.message);
    }

    return {
      success: false,
      results: [],
      error: `Location "${raw}" not found. Try entering a city, village, town, or locality name.`,
    };
  }
}

export const locationService = new LocationService();
