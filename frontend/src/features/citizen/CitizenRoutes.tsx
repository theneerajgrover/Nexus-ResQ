import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router';
import { routesApi, sheltersApi, incidentsApi } from '../../api';
import OperationalMap, { MapMarker } from '../../components/map/OperationalMap';
import { useDeviceLocation } from '../../hooks/useDeviceLocation';
import { useAppStore } from '../../store/useAppStore';

interface RouteSegment {
  type: string;
  label: string;
}

interface RouteItem {
  id: string;
  label: string;
  via: string;
  distance: string;
  eta: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  riskNote: string;
  congestion: string;
  destination: string;
  safe: boolean;
  segments: RouteSegment[];
  coordinates: [number, number][];
  polyline?: string;
  isSafest?: boolean;
}

const riskColors = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#dc2626' };
const segColors: Record<string, string> = { CLEAR: '#10b981', WARNING: '#f59e0b', BLOCKED: '#dc2626' };

export default function CitizenRoutes() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [activeRoute, setActiveRoute] = useState<string>('ROUTE-A');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [destinationShelter, setDestinationShelter] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const shelterIdParam = searchParams.get('shelterId');

  // Real citizen location: query params > device browser GPS > user store > canonical fallback
  const { coords: deviceCoords } = useDeviceLocation({ autoRequest: true, syncWithBackend: false });
  const { userLocation } = useAppStore();

  const queryOriginLat = searchParams.get('originLat') ? parseFloat(searchParams.get('originLat')!) : null;
  const queryOriginLng = searchParams.get('originLng') ? parseFloat(searchParams.get('originLng')!) : null;

  const originLat =
    queryOriginLat && !isNaN(queryOriginLat)
      ? queryOriginLat
      : (deviceCoords?.lat ?? (userLocation?.status === 'locked' ? userLocation.lat : 28.6139));
  const originLng =
    queryOriginLng && !isNaN(queryOriginLng)
      ? queryOriginLng
      : (deviceCoords?.lng ?? (userLocation?.status === 'locked' ? userLocation.lng : 77.2090));

  // Load destination shelter from PostgreSQL and active incidents
  useEffect(() => {
    let isMounted = true;

    async function loadContext() {
      try {
        const [shelterRes, incidentRes] = await Promise.allSettled([
          sheltersApi.getAll(),
          incidentsApi.getAll(),
        ]);

        if (!isMounted) return;

        let shelterList: any[] = [];
        if (shelterRes.status === 'fulfilled' && shelterRes.value.success && Array.isArray(shelterRes.value.data)) {
          shelterList = shelterRes.value.data;
        }

        // Identify target destination shelter from PostgreSQL
        let chosenShelter = shelterIdParam ? shelterList.find((s) => s.id === shelterIdParam) : null;
        if (!chosenShelter) {
          const sheltersWithCoords = shelterList.filter((s) => {
            const lat = parseFloat(s.lat ?? s.latitude);
            const lng = parseFloat(s.lng ?? s.longitude);
            return !isNaN(lat) && !isNaN(lng) && s.status === 'OPEN';
          });

          if (sheltersWithCoords.length > 0) {
            sheltersWithCoords.sort((a, b) => {
              const dA = Math.hypot(parseFloat(a.lat ?? a.latitude) - originLat, parseFloat(a.lng ?? a.longitude) - originLng);
              const dB = Math.hypot(parseFloat(b.lat ?? b.latitude) - originLat, parseFloat(b.lng ?? b.longitude) - originLng);
              return dA - dB;
            });
            chosenShelter = sheltersWithCoords[0];
          } else {
            chosenShelter = shelterList[0] || null;
          }
        }

        setDestinationShelter(chosenShelter);

        if (incidentRes.status === 'fulfilled' && incidentRes.value.success && Array.isArray(incidentRes.value.data)) {
          setIncidents(incidentRes.value.data);
        }
      } catch (err) {
        console.warn('[CitizenRoutes] Error loading initial shelter/incident context:', err);
      }
    }

    loadContext();
    return () => {
      isMounted = false;
    };
  }, [shelterIdParam, originLat, originLng]);

  // Calculate real routes via backend routing service (Google Routes / OSRM engine)
  useEffect(() => {
    let isMounted = true;
    if (!destinationShelter) return;

    const destLat = parseFloat(destinationShelter.lat ?? destinationShelter.latitude ?? '28.6328');
    const destLng = parseFloat(destinationShelter.lng ?? destinationShelter.longitude ?? '77.2197');

    if (isNaN(destLat) || isNaN(destLng)) return;

    async function fetchRealRoutes() {
      setIsLoading(true);
      try {
        const res = await routesApi.calculate({
          originLat,
          originLng,
          destinationLat: destLat,
          destinationLng: destLng,
        });

        if (!isMounted) return;

        if (res.success && res.data && Array.isArray(res.data.alternatives) && res.data.alternatives.length > 0) {
          const alts = res.data.alternatives;

          const mappedRoutes: RouteItem[] = alts.map((alt: any, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            const isSafest = Boolean(alt.isSafest);

            // Risk level mapping from backend safety evaluation
            let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
            if (alt.safetyStatus === 'BLOCKED') riskLevel = 'CRITICAL';
            else if (alt.safetyStatus === 'HIGH_RISK') riskLevel = 'HIGH';
            else if (alt.safetyStatus === 'CAUTION') riskLevel = 'MODERATE';

            // Real segments derived from actual turn-by-turn routing steps
            let segments: RouteSegment[] = [];
            if (Array.isArray(alt.steps) && alt.steps.length > 0) {
              const roadNames: string[] = [];
              for (const s of alt.steps) {
                if (!s.instruction) continue;
                let name = '';
                if (s.instruction.includes('onto ')) {
                  name = s.instruction.split('onto ')[1].trim();
                } else if (!['turn', 'depart', 'arrive'].includes(s.instruction.toLowerCase().trim())) {
                  name = s.instruction.trim();
                }
                if (name && !roadNames.includes(name) && !name.toLowerCase().includes('tactical corridor')) {
                  roadNames.push(name);
                }
              }

              segments = roadNames.slice(0, 3).map((roadName) => ({
                type: alt.safetyStatus === 'BLOCKED' ? 'BLOCKED' : alt.safetyStatus === 'CAUTION' ? 'WARNING' : 'CLEAR',
                label: roadName,
              }));

              if (destinationShelter?.name) {
                segments.push({
                  type: 'CLEAR',
                  label: `${destinationShelter.name} Arrival`,
                });
              }
            }

            if (segments.length === 0) {
              segments = [
                { type: 'CLEAR', label: alt.via || `Corridor ${letter}` },
                { type: 'CLEAR', label: `${destinationShelter.name} Arrival` },
              ];
            }

            const uniqueFactors = Array.from(new Set(alt.riskFactors || []));
            const riskNote =
              uniqueFactors.length > 0
                ? uniqueFactors.slice(0, 2).join('. ')
                : 'Clear road corridor, no active hazard blockages detected.';

            return {
              id: alt.id || `ROUTE-${letter}`,
              label: isSafest ? `Route ${letter} — Recommended` : `Route ${letter} — Alternative`,
              via: alt.via || `Arterial Corridor ${letter}`,
              distance: alt.distanceFormatted || `${((alt.distanceMeters || 3000) / 1000).toFixed(1)} km`,
              eta: `${alt.etaFormatted || '10 mins'} by car`,
              riskLevel,
              riskNote,
              congestion: alt.safetyStatus === 'SAFE' ? 'LIGHT' : 'MODERATE',
              destination: destinationShelter.name,
              safe: alt.safetyStatus !== 'BLOCKED',
              segments,
              coordinates: alt.coordinates || [],
              polyline: alt.polyline,
              isSafest,
            };
          });

          setRoutes(mappedRoutes);

          // Select safest/recommended route by default
          const safest = mappedRoutes.find((r) => r.isSafest) || mappedRoutes[0];
          setActiveRoute(safest.id);
        }
      } catch (err) {
        console.warn('[CitizenRoutes] Routing calculation error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchRealRoutes();

    return () => {
      isMounted = false;
    };
  }, [destinationShelter, originLat, originLng]);

  // Current active route object
  const activeRouteItem = routes.find((r) => r.id === activeRoute) || routes[0];

  // Alternative route object (for simultaneous rendering on the real map)
  const alternativeRouteItem = routes.find((r) => r.id !== activeRoute);

  // Real operational markers for the map
  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];

    // Real citizen location marker
    list.push({
      id: 'citizen-you-location',
      type: 'citizen',
      title: 'YOU (Citizen Location)',
      lat: originLat,
      lng: originLng,
      details: 'Current citizen position',
      status: 'ACTIVE',
    });

    // Real destination shelter marker
    if (destinationShelter) {
      const dLat = parseFloat(destinationShelter.lat ?? destinationShelter.latitude ?? '28.6328');
      const dLng = parseFloat(destinationShelter.lng ?? destinationShelter.longitude ?? '77.2197');
      if (!isNaN(dLat) && !isNaN(dLng)) {
        list.push({
          id: `shelter-${destinationShelter.id}`,
          type: 'shelter',
          title: destinationShelter.name,
          lat: dLat,
          lng: dLng,
          details: destinationShelter.address || 'Designated Safe Shelter Facility',
          capacity: destinationShelter.capacity,
          occupancy: destinationShelter.occupancy,
          status: destinationShelter.status,
        });
      }
    }

    // Real active incident markers (no fake hazards)
    incidents
      .filter((inc) => inc.status !== 'COMPLETED' && inc.status !== 'RESOLVED' && inc.latitude && inc.longitude)
      .slice(0, 10)
      .forEach((inc) => {
        const iLat = parseFloat(inc.latitude);
        const iLng = parseFloat(inc.longitude);
        if (!isNaN(iLat) && !isNaN(iLng)) {
          list.push({
            id: `incident-${inc.id}`,
            type: 'incident',
            title: inc.title,
            lat: iLat,
            lng: iLng,
            severity: inc.severity,
            details: inc.description || `${inc.type} - Active emergency incident`,
            status: inc.status,
          });
        }
      });

    return list;
  }, [originLat, originLng, destinationShelter, incidents]);

  // Fallback route placeholder if loading
  const route = activeRouteItem || {
    id: 'ROUTE-A',
    label: 'Route A — Recommended',
    via: 'Calculating road network...',
    distance: '-- km',
    eta: '-- min',
    riskLevel: 'LOW' as const,
    riskNote: 'Evaluating live road safety and corridor availability...',
    congestion: 'LIGHT',
    destination: destinationShelter?.name || 'Safe Evacuation Facility',
    safe: true,
    segments: [{ type: 'CLEAR', label: 'Primary Road Network' }],
    coordinates: [],
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Left — Real Road Map */}
      <div className="flex-1 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          style={{
            background: 'rgba(8,11,15,0.75)',
            color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#06b6d4')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
        >
          ← BACK
        </button>

        {/* Real Operational Google Map with road network and dual routes */}
        <OperationalMap
          center={{ lat: originLat, lng: originLng }}
          markers={markers}
          activeRouteCoordinates={activeRouteItem?.coordinates}
          activeRoutePolyline={activeRouteItem?.polyline}
          routeSafetyStatus={
            activeRouteItem?.riskLevel === 'CRITICAL'
              ? 'BLOCKED'
              : activeRouteItem?.riskLevel === 'HIGH'
              ? 'HIGH_RISK'
              : activeRouteItem?.riskLevel === 'MODERATE'
              ? 'CAUTION'
              : 'SAFE'
          }
          alternativeRouteCoordinates={alternativeRouteItem?.coordinates}
          alternativeRoutePolyline={alternativeRouteItem?.polyline}
          alternativeRouteSafetyStatus={
            alternativeRouteItem?.riskLevel === 'CRITICAL'
              ? 'BLOCKED'
              : alternativeRouteItem?.riskLevel === 'HIGH'
              ? 'HIGH_RISK'
              : alternativeRouteItem?.riskLevel === 'MODERATE'
              ? 'CAUTION'
              : 'SAFE'
          }
          onSelectAlternativeRoute={() => {
            if (alternativeRouteItem) {
              setActiveRoute(alternativeRouteItem.id);
            }
          }}
        />

        {/* Blocked banner */}
        {!route.safe && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg z-20"
            style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.5)' }}
          >
            <div className="font-condensed font-black text-sm tracking-widest text-red-400">
              ⛔ ROUTE BLOCKED — USE ALTERNATIVE CORRIDOR
            </div>
          </motion.div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 font-mono text-xs text-white/50 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-lg border border-white/10 shadow-lg">
          <span className="flex items-center gap-1.5">
            <span style={{ display: 'inline-block', width: 22, height: 3, background: '#10b981', borderRadius: 2 }} />
            {routes[0]?.label.split('—')[0].trim() || 'ROUTE A'}
          </span>
          {routes.length > 1 && (
            <span className="flex items-center gap-1.5">
              <span style={{ display: 'inline-block', width: 22, height: 3, background: '#f59e0b', borderRadius: 2 }} />
              {routes[1]?.label.split('—')[0].trim() || 'ROUTE B'}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span style={{ display: 'inline-block', width: 22, height: 3, background: '#dc2626', borderRadius: 2 }} />
            BLOCKED
          </span>
        </div>
      </div>

      {/* Right — route panel (Existing Visual Design & Structure Preserved) */}
      <motion.div
        className="w-80 flex flex-col glass-strong shrink-0 overflow-hidden"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.05)' }}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <div className="font-condensed font-black text-2xl text-white leading-tight mb-1">SAFE ROUTES</div>
          <div className="font-mono text-xs text-white/35">Select a route to see details</div>
        </div>

        {/* Route selector */}
        <div className="p-3 space-y-2 border-b border-white/[0.05]">
          {isLoading && routes.length === 0 ? (
            <div className="p-4 text-center font-mono text-xs text-white/40">
              <span className="animate-spin inline-block mr-2">⟳</span>
              Calculating real road routes...
            </div>
          ) : (
            routes.map((r) => {
              const rc = riskColors[r.riskLevel as keyof typeof riskColors];
              const isActive = activeRoute === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveRoute(r.id)}
                  className="w-full text-left p-3 rounded-lg transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive ? `${rc}0e` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? rc + '44' : 'rgba(255,255,255,0.05)'}`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: rc }} />
                    <div className="font-condensed font-semibold text-sm text-white">{r.label}</div>
                    {!r.safe && <div className="font-mono text-xs ml-auto text-red-400">BLOCKED</div>}
                  </div>
                  <div className="font-mono text-xs text-white/35 pl-4">
                    {r.distance} · {r.eta}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Route detail */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRoute}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto"
          >
            {/* Risk */}
            <div
              className="p-4 rounded-xl"
              style={{
                background: `${riskColors[route.riskLevel as keyof typeof riskColors]}08`,
                border: `1px solid ${riskColors[route.riskLevel as keyof typeof riskColors]}33`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: riskColors[route.riskLevel as keyof typeof riskColors] }}
                />
                <div
                  className="font-condensed font-bold text-sm tracking-widest"
                  style={{ color: riskColors[route.riskLevel as keyof typeof riskColors] }}
                >
                  {route.riskLevel} RISK
                </div>
              </div>
              <div className="font-mono text-xs text-white/50 leading-relaxed">{route.riskNote}</div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'DISTANCE', value: route.distance, color: '#06b6d4' },
                { label: 'TRAVEL TIME', value: route.eta.split('·')[0].trim(), color: '#f59e0b' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-3 rounded-lg text-center"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="font-condensed font-black text-base mb-0.5" style={{ color: s.color }}>
                    {s.value}
                  </div>
                  <div className="font-mono text-xs text-white/30">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Segments */}
            <div>
              <div className="font-mono text-xs text-white/30 tracking-widest mb-2">ROUTE SEGMENTS</div>
              <div className="space-y-2">
                {route.segments.map((seg, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: segColors[seg.type as keyof typeof segColors] || '#10b981' }}
                    />
                    <div
                      className="font-mono text-xs"
                      style={{
                        color:
                          segColors[seg.type as keyof typeof segColors] === '#10b981'
                            ? 'rgba(255,255,255,0.6)'
                            : segColors[seg.type as keyof typeof segColors] || 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {seg.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="font-mono text-xs text-white/30">
              Destination: <span className="text-white/60">{route.destination}</span>
            </div>

            <motion.button
              disabled={!route.safe}
              className="mt-auto w-full py-4 rounded-xl font-condensed font-black text-base tracking-widest cursor-pointer"
              style={{
                background: route.safe
                  ? riskColors[route.riskLevel as keyof typeof riskColors]
                  : 'rgba(220,38,38,0.15)',
                color: route.safe ? '#080b0f' : '#dc2626',
                border: route.safe ? 'none' : '1px solid rgba(220,38,38,0.35)',
              }}
              whileHover={route.safe ? { scale: 1.02 } : {}}
              whileTap={route.safe ? { scale: 0.98 } : {}}
            >
              {route.safe ? 'START NAVIGATION →' : 'ROUTE UNAVAILABLE'}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
