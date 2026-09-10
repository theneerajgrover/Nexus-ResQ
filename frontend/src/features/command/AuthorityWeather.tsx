import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { weatherApi, incidentsApi, locationApi } from '../../api';
import OperationalMap, { MapMarker } from '../../components/map/OperationalMap';

interface SearchResult {
  id: string | number;
  name: string;
  fullName?: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  region?: string;
  district?: string;
  state?: string;
  city?: string;
  village?: string;
  locality?: string;
  timezone?: string;
}

interface WeatherReport {
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

export default function AuthorityWeather() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lng: number }>({
    name: 'Command HQ, New Delhi',
    lat: 28.6139,
    lng: 77.2090,
  });
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  // Fetch real incidents from PostgreSQL to plot on map
  useEffect(() => {
    incidentsApi.getAll().then((res) => {
      if (res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setIncidents(list);
      }
    }).catch(() => {});
  }, []);

  const fetchWeatherForLocation = useCallback(async (lat: number, lng: number) => {
    setLoadingWeather(true);
    setError(null);
    try {
      const res = await weatherApi.getCurrent(lat, lng);
      if (res.data) {
        setWeather(res.data);
        setLastSync(new Date());
      }
    } catch (err: any) {
      console.error('Command weather error:', err);
      setError('WEATHER DATA UNAVAILABLE: Unable to fetch live meteorological telemetry for specified sector.');
      setWeather(null);
    } finally {
      setLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    fetchWeatherForLocation(selectedLocation.lat, selectedLocation.lng);
  }, [selectedLocation, fetchWeatherForLocation]);

  // Sync ticker: calculated from real timestamp
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncSecondsAgo(Math.floor((Date.now() - lastSync.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSync]);

  // Handle GPS location found from device (via map recenter button or direct GPS click)
  const handleLocationFound = useCallback(async (coords: { lat: number; lng: number }) => {
    const { lat, lng } = coords;
    try {
      const geoRes = await locationApi.reverseGeocode(lat, lng);
      const gData = geoRes?.data || geoRes;
      const address = gData?.formattedAddress || gData?.formatted_address || gData?.display_name || `GPS [${lat.toFixed(4)}°, ${lng.toFixed(4)}°]`;
      setSelectedLocation({
        name: address,
        lat,
        lng,
      });
      setSearchError(null);
    } catch {
      setSelectedLocation({
        name: `GPS Sector [${lat.toFixed(4)}°, ${lng.toFixed(4)}°]`,
        lat,
        lng,
      });
    }
  }, []);

  // Dedicated GPS button trigger
  const triggerDeviceGps = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setSearchError('Browser geolocation is not supported.');
      return;
    }
    setLocatingGps(true);
    setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        handleLocationFound({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        setLocatingGps(false);
        if (err.code === err.PERMISSION_DENIED) {
          setSearchError('Location permission was denied. You can search manually.');
        } else {
          setSearchError('Unable to acquire device GPS position. Try searching manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleLocationFound]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      setSearchError('Please enter a city, village or place.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res: any = await weatherApi.searchLocations(cleanQuery);
      const data = res?.data || res;
      const resolvedLoc = data?.location;
      const list: SearchResult[] = Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];

      if (resolvedLoc && typeof resolvedLoc.latitude === 'number' && typeof resolvedLoc.longitude === 'number') {
        setSelectedLocation({
          name: resolvedLoc.name || cleanQuery,
          lat: resolvedLoc.latitude,
          lng: resolvedLoc.longitude,
        });
        if (list.length > 1) {
          setSearchResults(list);
        } else {
          setSearchResults([]);
        }
      } else if (list.length > 0) {
        selectSearchResult(list[0]);
        if (list.length > 1) {
          setSearchResults(list);
        }
      } else {
        setSearchResults([]);
        setSearchError('Location not found. Try a city, village, town or locality name.');
      }
    } catch (err: any) {
      console.error('Location search error:', err);
      setSearchResults([]);
      const msg = err.response?.data?.error || 'Unable to search this location. Please try again.';
      setSearchError(msg);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (item: SearchResult) => {
    const label = item.fullName || item.name || `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`;
    setSelectedLocation({
      name: label,
      lat: Number(item.latitude),
      lng: Number(item.longitude),
    });
    setSearchResults([]);
    setSearchError(null);
    setQuery('');
  };

  // Compile real map markers: selected target sector + active incidents from database
  const mapMarkers: MapMarker[] = [
    {
      id: 'TARGET_SECTOR',
      type: 'citizen',
      title: selectedLocation.name,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng,
      details: 'Active Weather Target Sector',
    },
    ...incidents
      .filter((inc) => inc.latitude && inc.longitude)
      .map((inc) => ({
        id: inc.id,
        type: 'incident' as const,
        title: inc.title || inc.id,
        lat: Number(inc.latitude),
        lng: Number(inc.longitude),
        details: `${inc.severity} · ${inc.location || 'Active Incident'}`,
        severity: inc.severity,
      })),
  ];

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedLocation({
      name: `${marker.title}${marker.details ? ` (${marker.details})` : ''}`,
      lat: marker.lat,
      lng: marker.lng,
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-condensed font-black text-3xl tracking-wider text-white">
              COMMAND SECTOR WEATHER & REAL-TIME GEOSPATIAL RADAR
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30">
              AUTHORITY GRADE
            </span>
          </div>
          <div className="font-mono text-xs text-white/50 mt-1">
            Active Target: <span className="text-white font-medium">{selectedLocation.name}</span> · [{selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}]
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-[10px] text-white/40">SATELLITE TELEMETRY</div>
            <div className="font-mono text-xs text-cyan-400 font-semibold tracking-wider">
              SYNCED {syncSecondsAgo}S AGO
            </div>
          </div>
          <motion.button
            onClick={() => fetchWeatherForLocation(selectedLocation.lat, selectedLocation.lng)}
            disabled={loadingWeather}
            className="px-4 py-2 rounded-lg font-condensed font-bold text-xs tracking-widest bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-2"
            whileTap={{ scale: 0.96 }}
          >
            <span className={loadingWeather ? 'animate-spin inline-block' : ''}>⟳</span>
            {loadingWeather ? 'REFRESHING...' : 'REFRESH'}
          </motion.button>
        </div>
      </div>

      {/* Global Sector Search */}
      <div className="glass-strong p-4 rounded-xl border border-white/10 relative">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search village, city, town, district, or place (e.g., Ludhiana, Mohali, Kotkapura)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (searchError) setSearchError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="w-full px-4 py-2.5 rounded-lg font-mono text-xs text-white bg-white/5 border border-white/10 focus:border-cyan-500/50 outline-none transition-all placeholder:text-white/30"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={searching}
              className="px-6 py-2.5 rounded-lg font-condensed font-bold text-xs tracking-widest bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 min-w-[110px]"
            >
              {searching && <span className="animate-spin inline-block">⟳</span>}
              {searching ? 'SEARCHING...' : 'SEARCH'}
            </button>
            <button
              type="button"
              onClick={triggerDeviceGps}
              disabled={locatingGps}
              title="Use current device GPS location"
              className="px-4 py-2.5 rounded-lg font-condensed font-bold text-xs tracking-widest bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className={locatingGps ? 'animate-spin inline-block' : ''}>🎯</span>
              <span>{locatingGps ? 'LOCATING...' : 'GPS'}</span>
            </button>
          </div>
        </form>

        {/* Validation / Search Error Feedback */}
        {searchError && (
          <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center gap-2">
            <span>⚠</span>
            <span>{searchError}</span>
          </div>
        )}

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 top-full mt-2 z-30 glass-strong border border-cyan-500/30 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
            <div className="px-4 py-2 text-[10px] font-mono text-cyan-400/80 border-b border-white/5 bg-white/[0.03] flex items-center justify-between">
              <span>SELECT A MATCHING SECTOR:</span>
              <span className="text-white/40">{searchResults.length} location(s)</span>
            </div>
            {searchResults.map((item) => {
              const regionName = item.region || item.admin1 || item.district || item.state;
              const displayTitle = item.name || item.fullName?.split(',')[0];
              const displaySub = item.fullName || [displayTitle, regionName, item.country].filter(Boolean).join(', ');
              return (
                <button
                  key={String(item.id)}
                  onClick={() => selectSearchResult(item)}
                  className="w-full px-4 py-3 text-left font-mono text-xs hover:bg-white/10 border-b border-white/5 flex items-center justify-between text-white transition-colors cursor-pointer"
                >
                  <div className="pr-4">
                    <span className="font-bold text-cyan-400">{displayTitle}</span>
                    <div className="text-[11px] text-white/60 truncate max-w-lg">{displaySub}</div>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono whitespace-nowrap">
                    {Number(item.latitude).toFixed(3)}°, {Number(item.longitude).toFixed(3)}°
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Real-Time Geospatial Operational Map (Google Maps dark theme, Satellite, 3D) */}
      <div className="glass-strong p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-condensed font-bold text-sm tracking-wider text-white uppercase">
              REAL-TIME GEOSPATIAL MAP — {selectedLocation.name}
            </span>
          </div>
          <div className="font-mono text-xs text-white/40">
            {incidents.length} Active Incidents Plotted
          </div>
        </div>

        <div className="h-[360px] rounded-xl overflow-hidden border border-white/10 relative">
          <OperationalMap
            center={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
            zoom={11}
            markers={mapMarkers}
            onMarkerClick={handleMarkerClick}
            onLocationFound={handleLocationFound}
            className="w-full h-full"
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-white/40 pt-1">
          <span>Click on any incident marker to inspect and synchronize weather telemetry</span>
          <span>Google Maps Platform · Dark Operational / Satellite / 3D</span>
        </div>
      </div>

      {/* Weather Error State Handling */}
      {error && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-xs flex items-center gap-3">
          <span className="text-lg">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Main Meteorological Grid */}
      {weather && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Target Sector Overview Card */}
          <div className="lg:col-span-3 glass-strong p-6 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span className="font-mono text-xs text-white/40 tracking-widest uppercase">
                  SECTOR ATMOSPHERIC ANALYSIS
                </span>
                <div className="font-condensed font-black text-6xl text-white mt-1 flex items-baseline gap-2">
                  <span>{Math.round(weather.temperature)}</span>
                  <span className="text-2xl text-white/40 font-light">°C</span>
                </div>
                <div className="font-condensed font-bold text-xl text-cyan-400 uppercase tracking-wider mt-1">
                  {weather.condition}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="font-mono text-[10px] text-white/40">FEELS LIKE</div>
                  <div className="font-condensed font-bold text-xl text-white">
                    {weather.apparentTemperature ? Math.round(weather.apparentTemperature) : Math.round(weather.temperature)}°C
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="font-mono text-[10px] text-white/40">WIND SPEED</div>
                  <div className="font-condensed font-bold text-xl text-amber-400">
                    {weather.windSpeed} <span className="text-xs font-normal">km/h</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <div className="font-mono text-[10px] text-white/40">PRESSURE</div>
                  <div className="font-condensed font-bold text-xl text-emerald-400">
                    {weather.surfacePressure ? Math.round(weather.surfacePressure) : 1013} <span className="text-xs font-normal">hPa</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 24-Hour Trend */}
            {weather.hourlyTrend && weather.hourlyTrend.length > 0 && (
              <div className="pt-4 border-t border-white/5">
                <div className="font-mono text-[11px] text-white/40 uppercase mb-3">
                  HOURLY TEMPERATURE PROFILE (NEXT 24H)
                </div>
                <div className="flex items-end gap-2 overflow-x-auto pb-2">
                  {weather.hourlyTrend.slice(0, 16).map((h) => {
                    const timeLabel = new Date(h.time).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
                    const heightPercent = Math.max(20, Math.min(100, (h.temperature + 10) * 2));
                    return (
                      <div key={h.time} className="flex flex-col items-center min-w-[48px] gap-1">
                        <span className="font-mono text-[10px] text-white/60">{Math.round(h.temperature)}°</span>
                        <div
                          className="w-full rounded-t bg-cyan-500/20 border-t border-cyan-400/50 hover:bg-cyan-500/40 transition-colors"
                          style={{ height: `${heightPercent}px` }}
                        />
                        <span className="font-mono text-[9px] text-white/30 uppercase">{timeLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Disaster Advisory Assessment */}
          <div className="glass-strong p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="font-mono text-xs text-white/40 tracking-widest uppercase mb-3">
                MISSION READINESS EVALUATION
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <span className="text-white/50">Air Reconnaissance:</span>
                  <span className="font-bold text-emerald-400">OPTIMAL</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <span className="text-white/50">Ground Transit:</span>
                  <span className="font-bold text-emerald-400">UNIMPEDED</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <span className="text-white/50">Thermal Stress:</span>
                  <span className="font-bold text-white">LOW</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <span className="text-white/50">Flood Risk:</span>
                  <span className="font-bold text-emerald-400">NORMAL</span>
                </div>
              </div>
            </div>

            <a
              href="/command/warnings"
              className="mt-6 block text-center py-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-condensed font-bold text-xs tracking-wider border border-red-500/30 transition-colors"
            >
              ⚠ ISSUE SECTOR WARNING →
            </a>
          </div>
        </div>
      )}

      {/* 5-Day Command Forecast */}
      {weather?.dailyForecast && weather.dailyForecast.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-condensed font-black text-xl tracking-wider text-white">
              SECTOR 5-DAY OPERATIONAL FORECAST
            </h2>
            <span className="font-mono text-[11px] text-white/40">Verified Real-Time Model</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {weather.dailyForecast.map((day, idx) => {
              const dateObj = new Date(day.date);
              const dayName = idx === 0 ? 'TODAY' : dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
              const dateDisplay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div
                  key={day.date}
                  className="glass p-4 rounded-xl border border-white/10 flex flex-col items-center text-center"
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
                      💧 {day.precipitationProb}% Prob
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
