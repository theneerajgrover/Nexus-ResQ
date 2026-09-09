// ============================================================
// NEXUS RESQ — REAL-TIME WEATHER & LOCATION PROXY ROUTER
// ============================================================
import { Router, Request, Response } from 'express';

export const weatherRouter = Router();
export const locationRouter = Router();

// WMO Weather code translation
function interpretWeatherCode(code: number): { condition: string; description: string; icon: string } {
  if (code === 0) return { condition: 'Clear', description: 'Clear sky', icon: '☀️' };
  if (code === 1) return { condition: 'Mainly Clear', description: 'Mainly clear sky', icon: '🌤️' };
  if (code === 2) return { condition: 'Partly Cloudy', description: 'Partly cloudy sky', icon: '⛅' };
  if (code === 3) return { condition: 'Overcast', description: 'Overcast skies', icon: '☁️' };
  if (code === 45 || code === 48) return { condition: 'Fog', description: 'Fog / depositing rime fog', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { condition: 'Drizzle', description: 'Light to dense drizzle', icon: '🌧️' };
  if (code >= 61 && code <= 65) return { condition: 'Rain', description: 'Slight to heavy rain', icon: '🌧️' };
  if (code >= 71 && code <= 75) return { condition: 'Snow', description: 'Slight to heavy snowfall', icon: '❄️' };
  if (code >= 80 && code <= 82) return { condition: 'Showers', description: 'Rain showers', icon: '🌦️' };
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', description: 'Thunderstorm with precipitation', icon: '⛈️' };
  return { condition: 'Variable', description: 'Variable weather conditions', icon: '🌡️' };
}

// GET /api/weather/current?lat=...&lon=...
weatherRouter.get('/current', async (req: Request, res: Response): Promise<void> => {
  try {
    const latStr = req.query.lat as string;
    const lonStr = req.query.lon as string;

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      res.status(400).json({
        success: false,
        error: 'Valid latitude (-90 to 90) and longitude (-180 to 180) coordinates are required.',
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m&hourly=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&forecast_days=5&wind_speed_unit=kmh&timezone=auto`;

    const apiRes = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!apiRes.ok) {
      throw new Error(`Open-Meteo returned status ${apiRes.status}`);
    }

    const json = (await apiRes.json()) as any;
    const current = json.current;

    if (!current) {
      throw new Error('Invalid weather payload format');
    }

    const weatherInfo = interpretWeatherCode(current.weather_code ?? -1);

    // Parse 5-day daily forecast
    const dailyData: Array<{
      date: string;
      maxTemp: number;
      minTemp: number;
      precipitationProb: number;
      precipitationSum: number;
      maxWind: number;
      weatherCode: number;
      condition: string;
      icon: string;
    }> = [];

    if (json.daily?.time && Array.isArray(json.daily.time)) {
      for (let i = 0; i < json.daily.time.length; i++) {
        const code = json.daily.weather_code?.[i] ?? -1;
        const info = interpretWeatherCode(code);
        dailyData.push({
          date: json.daily.time[i],
          maxTemp: Math.round(json.daily.temperature_2m_max?.[i] ?? 0),
          minTemp: Math.round(json.daily.temperature_2m_min?.[i] ?? 0),
          precipitationProb: json.daily.precipitation_probability_max?.[i] ?? 0,
          precipitationSum: json.daily.precipitation_sum?.[i] ?? 0,
          maxWind: Math.round(json.daily.wind_speed_10m_max?.[i] ?? 0),
          weatherCode: code,
          condition: info.condition,
          icon: info.icon,
        });
      }
    }

    // Parse next 24 hours trend
    const hourlyData: Array<{
      time: string;
      temp: number;
      humidity: number;
      windSpeed: number;
      condition: string;
      icon: string;
    }> = [];

    if (json.hourly?.time && Array.isArray(json.hourly.time)) {
      const nowIso = new Date().toISOString().slice(0, 13);
      const startIndex = Math.max(0, json.hourly.time.findIndex((t: string) => t.startsWith(nowIso)));
      const count = Math.min(24, json.hourly.time.length - startIndex);

      for (let i = startIndex; i < startIndex + count; i++) {
        const code = json.hourly.weather_code?.[i] ?? -1;
        const info = interpretWeatherCode(code);
        hourlyData.push({
          time: json.hourly.time[i],
          temp: Math.round(json.hourly.temperature_2m?.[i] ?? 0),
          humidity: json.hourly.relative_humidity_2m?.[i] ?? 0,
          windSpeed: Math.round(json.hourly.wind_speed_10m?.[i] ?? 0),
          condition: info.condition,
          icon: info.icon,
        });
      }
    }

    res.json({
      success: true,
      data: {
        coordinates: { latitude: lat, longitude: lon },
        temperature: Math.round(current.temperature_2m),
        apparentTemperature: Math.round(current.apparent_temperature),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m),
        windDirection: current.wind_direction_10m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        condition: weatherInfo.condition,
        description: weatherInfo.description,
        icon: weatherInfo.icon,
        observedAt: current.time,
        dailyForecast: dailyData,
        hourlyTrend: hourlyData,
      },
    });
  } catch (err: any) {
    console.warn('[Weather API Warning]: Failed to fetch external weather:', err.message);
    res.status(503).json({
      success: false,
      error: 'Weather service temporarily unavailable.',
      details: err.message,
    });
  }
});

// GET /api/weather/search?query=... (Worldwide location search for Authority Weather)
weatherRouter.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const queryStr = ((req.query.query || req.query.q || '') as string).trim();
    if (!queryStr || queryStr.length < 2) {
      res.status(400).json({ success: false, error: 'Search query of at least 2 characters is required.' });
      return;
    }

    // Check if query is latitude, longitude
    const coordMatch = queryStr.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lon = parseFloat(coordMatch[3]);
      res.json({
        success: true,
        data: [{
          name: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
          region: 'Coordinates Location',
          country: 'Global Grid',
          latitude: lat,
          longitude: lon,
        }]
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryStr)}&count=8&language=en&format=json`;
    const apiRes = await fetch(geoUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!apiRes.ok) {
      throw new Error(`Open-Meteo Geocoding returned status ${apiRes.status}`);
    }

    const json = (await apiRes.json()) as any;
    const results = (json.results || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      region: r.admin1 || r.admin2 || '',
      country: r.country || '',
      countryCode: r.country_code || '',
      latitude: r.latitude,
      longitude: r.longitude,
      elevation: r.elevation,
      timezone: r.timezone,
    }));

    res.json({ success: true, data: results });
  } catch (err: any) {
    console.warn('[Weather Search Warning]: Failed to search location:', err.message);
    res.status(500).json({ success: false, error: 'Failed to search location.' });
  }
});

import { locationService } from '../services/locationService';

// Handler for reverse geocoding (supports both GET and POST)
async function handleReverseGeocode(req: Request, res: Response): Promise<void> {
  try {
    const latRaw = req.method === 'POST' ? req.body.latitude ?? req.body.lat : req.query.lat ?? req.query.latitude;
    const lonRaw = req.method === 'POST' ? req.body.longitude ?? req.body.lon ?? req.body.lng : req.query.lon ?? req.query.longitude ?? req.query.lng;
    const accRaw = req.method === 'POST' ? req.body.accuracy ?? req.body.accuracy_meters : req.query.accuracy ?? req.query.accuracy_meters;

    const lat = typeof latRaw === 'number' ? latRaw : parseFloat(latRaw as string);
    const lon = typeof lonRaw === 'number' ? lonRaw : parseFloat(lonRaw as string);
    const accuracy = accRaw !== undefined && accRaw !== null ? (typeof accRaw === 'number' ? accRaw : parseFloat(accRaw as string)) : null;

    const validation = locationService.validateCoordinates(lat, lon, accuracy);
    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
      });
      return;
    }

    const result = await locationService.reverseGeocode(lat, lon, accuracy);
    if (!result.success || !result.data) {
      res.status(503).json({
        success: false,
        error: result.error || 'Location geocoding service temporarily unavailable.',
      });
      return;
    }

    // Return structured response with both new specification and backward-compatible fields
    res.json({
      success: true,
      data: {
        ...result.data,
        formattedAddress: result.data.formatted_address,
        city: result.data.city || result.data.locality,
        state: result.data.state,
        country: result.data.country,
        postcode: result.data.postal_code,
      },
    });
  } catch (err: any) {
    console.warn('[Location API Warning]: Failed to reverse geocode:', err.message);
    res.status(500).json({
      success: false,
      error: 'Failed to process location reverse geocode.',
      details: err.message,
    });
  }
}

// GET /api/location/reverse-geocode
locationRouter.get('/reverse-geocode', handleReverseGeocode);

// POST /api/location/reverse-geocode
locationRouter.post('/reverse-geocode', handleReverseGeocode);

// GET /api/location/autocomplete?input=...
locationRouter.get('/autocomplete', async (req: Request, res: Response): Promise<void> => {
  try {
    const input = (req.query.input || req.query.query || req.query.q || '') as string;
    const result = await locationService.autocompletePlaces(input);
    res.json(result);
  } catch (err: any) {
    console.warn('[Location Autocomplete Error]:', err.message);
    res.status(500).json({ success: false, error: 'Failed to search places.', data: [] });
  }
});

// POST /api/location/place-details
locationRouter.post('/place-details', async (req: Request, res: Response): Promise<void> => {
  try {
    const placeId = (req.body.placeId || req.body.place_id || req.query.place_id || '') as string;
    if (!placeId) {
      res.status(400).json({ success: false, error: 'Place ID is required.' });
      return;
    }

    const result = await locationService.getPlaceDetails(placeId);
    if (!result.success || !result.data) {
      res.status(404).json({ success: false, error: result.error || 'Place not found.' });
      return;
    }

    res.json({
      success: true,
      data: {
        ...result.data,
        formattedAddress: result.data.formatted_address,
      },
    });
  } catch (err: any) {
    console.warn('[Location Place Details Error]:', err.message);
    res.status(500).json({ success: false, error: 'Failed to resolve place details.' });
  }
});

// POST /api/location/validate
locationRouter.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const address = (req.body.address || req.body.location || req.body.location_name || '') as string;
    if (!address || address.trim().length < 3) {
      res.status(400).json({
        success: false,
        error: 'Address must be at least 3 characters long.',
      });
      return;
    }

    const result = await locationService.validateAddress(address);
    if (!result.success || !result.data) {
      res.status(422).json({
        success: false,
        verified: false,
        error: result.error || 'Location could not be verified. Please select a valid address.',
      });
      return;
    }

    res.json({
      success: true,
      verified: result.data.verified,
      data: {
        ...result.data,
        formattedAddress: result.data.formatted_address,
      },
    });
  } catch (err: any) {
    console.warn('[Location Validation Error]:', err.message);
    res.status(500).json({ success: false, error: 'Failed to validate address.' });
  }
});

