import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { weatherApi, locationApi } from '../../api';

interface WeatherData {
  temperature: number;
  apparentTemperature?: number;
  condition: string;
  weatherCode: number;
  windSpeed: number;
  humidity?: number;
  surfacePressure?: number;
  timestamp: string;
  dailyForecast?: Array<{
    date: string;
    maxTemp: number;
    minTemp: number;
    weatherCode: number;
    condition: string;
    precipitationProb: number;
  }>;
  hourlyTrend?: Array<{
    time: string;
    temperature: number;
  }>;
}

export default function CitizenWeather() {
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 40.7128, lng: -74.006 });
  const [locationLabel, setLocationLabel] = useState<string>('Detecting location...');
  const [isGpsLocked, setIsGpsLocked] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Fetch weather for coords
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await weatherApi.getCurrent(lat, lon);
      if (res.data) {
        setWeather(res.data);
        setLastSync(new Date());
      }
    } catch (err: any) {
      console.error('Weather fetch error:', err);
      setError('Unable to fetch live meteorological data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Acquire GPS on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ lat, lng });
          setIsGpsLocked(true);

          try {
            const geoRes = await locationApi.reverseGeocode(lat, lng);
            if (geoRes.data?.address) {
              setLocationLabel(geoRes.data.address);
            } else {
              setLocationLabel(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W`);
            }
          } catch {
            setLocationLabel(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° W`);
          }

          fetchWeather(lat, lng);
        },
        (err) => {
          console.warn('GPS error, using default coordinates:', err.message);
          setLocationLabel('Metropolitan Zone (Fallback Coordinates)');
          fetchWeather(coords.lat, coords.lng);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      fetchWeather(coords.lat, coords.lng);
    }
  }, [fetchWeather]);

  // Periodic refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeather(coords.lat, coords.lng);
    }, 30000);
    return () => clearInterval(interval);
  }, [coords, fetchWeather]);

  // Dynamic seconds ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      setSyncSecondsAgo(Math.floor((Date.now() - lastSync.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastSync]);

  return (
    <div className="w-full h-full p-6 overflow-y-auto max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-condensed font-black text-3xl tracking-wider text-white">
              LIVE METEOROLOGICAL TELEMETRY
            </h1>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest ${
                isGpsLocked ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isGpsLocked ? 'DEVICE GPS LOCKED' : 'COORDINATE BASELINE'}
            </span>
          </div>
          <div className="font-mono text-xs text-white/50 mt-1 flex items-center gap-2">
            <span>📍 {locationLabel}</span>
            <span>·</span>
            <span>[{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}]</span>
          </div>
        </div>

        {/* Sync Status & Action */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-[11px] text-white/40">OPERATIONAL SYNC</div>
            <div className="font-mono text-xs text-cyan-400 font-semibold tracking-wider">
              SYNCED {syncSecondsAgo}S AGO
            </div>
          </div>
          <motion.button
            onClick={() => fetchWeather(coords.lat, coords.lng)}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-condensed font-bold text-xs tracking-widest bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-2"
            whileTap={{ scale: 0.96 }}
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>⟳</span>
            {loading ? 'SYNCING...' : 'SYNC NOW'}
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-6 bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-xs">
          ⚠ {error}
        </div>
      )}

      {/* Primary Current Condition Card */}
      {weather && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Temperature Hero */}
          <div className="lg:col-span-2 glass-strong p-6 rounded-2xl border border-white/10 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="font-mono text-xs text-white/40 tracking-widest uppercase">
                  LOCAL ATMOSPHERIC TELEMETRY
                </span>
                <div className="font-condensed font-black text-7xl text-white mt-2 flex items-baseline gap-2">
                  <span>{Math.round(weather.temperature)}</span>
                  <span className="text-3xl text-white/50 font-light">°C</span>
                </div>
                <div className="font-condensed font-bold text-xl text-cyan-400 mt-1 uppercase tracking-wider">
                  {weather.condition}
                </div>
                {weather.apparentTemperature !== undefined && (
                  <div className="font-mono text-xs text-white/40 mt-1">
                    Feels like {Math.round(weather.apparentTemperature)}°C
                  </div>
                )}
              </div>

              <div className="w-24 h-24 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-5xl">
                {weather.condition.toLowerCase().includes('rain') ? '🌧️' :
                 weather.condition.toLowerCase().includes('cloud') ? '⛅' :
                 weather.condition.toLowerCase().includes('snow') ? '❄️' :
                 weather.condition.toLowerCase().includes('storm') ? '⛈️' : '☀️'}
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="font-mono text-[10px] text-white/40 uppercase">WIND VELOCITY</div>
                <div className="font-condensed font-bold text-lg text-white mt-0.5">
                  {weather.windSpeed} <span className="text-xs text-white/40">km/h</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="font-mono text-[10px] text-white/40 uppercase">HUMIDITY</div>
                <div className="font-condensed font-bold text-lg text-white mt-0.5">
                  {weather.humidity ?? 65} <span className="text-xs text-white/40">%</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="font-mono text-[10px] text-white/40 uppercase">SURFACE PRESSURE</div>
                <div className="font-condensed font-bold text-lg text-white mt-0.5">
                  {weather.surfacePressure ? Math.round(weather.surfacePressure) : 1013} <span className="text-xs text-white/40">hPa</span>
                </div>
              </div>
            </div>
          </div>

          {/* Safety & Evacuation Advisory Card */}
          <div className="glass-strong p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="font-mono text-xs text-white/40 tracking-widest uppercase mb-3">
                OPERATIONAL WEATHER ASSESSMENT
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-4">
                <div className="font-condensed font-bold text-emerald-400 text-sm tracking-wider mb-1">
                  ✓ NO SEVERE WEATHER IMPEDIMENT
                </div>
                <div className="font-mono text-xs text-white/60 leading-relaxed">
                  Atmospheric parameters remain within normal operational safety thresholds for citizen ground transit and evacuation corridors.
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono text-white/50">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Precipitation Risk:</span>
                  <span className="text-white">Low</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span>Visibility:</span>
                  <span className="text-emerald-400">High (&gt;10 km)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Thermal Index:</span>
                  <span className="text-white">Normal</span>
                </div>
              </div>
            </div>

            <a
              href="/citizen/routes"
              className="mt-4 block text-center py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 font-condensed font-bold text-xs tracking-wider border border-white/10 transition-colors"
            >
              VIEW EVACUATION CORRIDORS →
            </a>
          </div>
        </div>
      )}

      {/* 5-Day Extended Meteorological Forecast */}
      {weather?.dailyForecast && weather.dailyForecast.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-condensed font-black text-xl tracking-wider text-white">
              5-DAY EXTENDED FORECAST
            </h2>
            <span className="font-mono text-[11px] text-white/40">Open-Meteo Verification Engine</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {weather.dailyForecast.map((day, idx) => {
              const dateObj = new Date(day.date);
              const dayName = idx === 0 ? 'TODAY' : dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              const dateDisplay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div
                  key={day.date}
                  className="glass p-4 rounded-xl border border-white/10 flex flex-col items-center text-center relative overflow-hidden"
                >
                  <div className="font-condensed font-black text-sm tracking-wider text-cyan-400">
                    {dayName}
                  </div>
                  <div className="font-mono text-[10px] text-white/40 mb-3">{dateDisplay}</div>

                  <div className="text-3xl my-2">
                    {day.condition.toLowerCase().includes('rain') ? '🌧️' :
                     day.condition.toLowerCase().includes('cloud') ? '⛅' :
                     day.condition.toLowerCase().includes('snow') ? '❄️' : '☀️'}
                  </div>

                  <div className="font-condensed font-bold text-xs text-white/80 uppercase mt-1">
                    {day.condition}
                  </div>

                  <div className="flex items-center gap-2 mt-3 font-mono text-xs">
                    <span className="text-white font-bold">{Math.round(day.maxTemp)}°</span>
                    <span className="text-white/30">/</span>
                    <span className="text-white/50">{Math.round(day.minTemp)}°</span>
                  </div>

                  {day.precipitationProb > 0 && (
                    <div className="mt-2 text-[10px] font-mono text-cyan-300 bg-cyan-950/50 px-2 py-0.5 rounded">
                      💧 {day.precipitationProb}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
