// ============================================================
// REAL-TIME DATA INGESTION & SENSOR READINGS BACKEND
// ============================================================
// Stores and queries generic environmental sensor data (rainfall,
// temperature, humidity, wind, river level, soil moisture, seismic, etc.)
// ============================================================

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================
// TODO: EXTERNAL API INTEGRATION
// ============================================================
// Purpose:
// Connect live weather/environmental data providers here
// (e.g. OpenWeatherMap, USGS Water Services, NOAA API, Sentinel Satellite, IoT Gateway).
//
// Current implementation:
// Mock & simulated sensor ingestion functions are used for the SIH prototype.
//
// IMPORTANT:
// Do not add API keys, secrets, URLs, or credentials here.
// ============================================================

// Query latest environmental readings
export const getLatestSensorReadings = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: any, args: any) => {
    const readings = await ctx.db
      .query("sensorReadings")
      .order("desc")
      .take(args.limit || 10);
    return readings;
  },
});

// Ingest sensor reading
export const ingestSensorReading = mutation({
  args: {
    sensorId: v.string(),
    disasterType: v.string(),
    location: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    rainfall: v.number(),
    temperature: v.number(),
    humidity: v.number(),
    windSpeed: v.number(),
    riverWaterLevel: v.number(),
    soilMoisture: v.number(),
    seismicReading: v.optional(v.number()),
    fireIndicator: v.optional(v.number()),
    weatherCondition: v.string(),
    satelliteData: v.optional(v.string()),
    populationDensity: v.number(),
    infrastructureStatus: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const id = await ctx.db.insert("sensorReadings", {
      sensorId: args.sensorId,
      disasterType: args.disasterType,
      location: args.location,
      latitude: args.latitude,
      longitude: args.longitude,
      rainfall: args.rainfall,
      temperature: args.temperature,
      humidity: args.humidity,
      windSpeed: args.windSpeed,
      riverWaterLevel: args.riverWaterLevel,
      soilMoisture: args.soilMoisture,
      seismicReading: args.seismicReading || 0,
      fireIndicator: args.fireIndicator || 0,
      weatherCondition: args.weatherCondition,
      satelliteData: args.satelliteData,
      populationDensity: args.populationDensity,
      infrastructureStatus: args.infrastructureStatus,
      timestamp: Date.now(),
    });

    return { id, success: true };
  },
});
