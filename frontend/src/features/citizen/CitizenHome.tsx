import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { alertsApi, sheltersApi, incidentsApi } from '../../api';
import OperationalMap, { type MapMarker } from '../../components/map/OperationalMap';

type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
const riskColors: Record<RiskLevel, string> = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#dc2626' };
const riskMessages: Record<RiskLevel, string> = {
  LOW: 'Area conditions are normal. Stay alert.',
  MODERATE: 'Elevated risk in your area. Monitor alerts.',
  HIGH: 'Active emergency nearby. Follow instructions.',
  CRITICAL: 'Critical emergency. Take immediate action.',
};

export default function CitizenHome() {
  const navigate = useNavigate();
  const [risk, setRisk] = useState<RiskLevel>('LOW');
  const [activeAlertCount, setActiveAlertCount] = useState<number>(0);
  const [shelters, setShelters] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({ lat: 40.7128, lng: -74.006 });
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<number>(0);

  // Acquire real device GPS
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsActive(true);
        },
        (err) => {
          console.warn('Citizen GPS fallback active:', err.message);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  // Fetch real alerts, shelters, and incidents from backend
  const loadData = () => {
    alertsApi.getActive()
      .then((res) => {
        const alerts = res.data || [];
        setActiveAlertCount(alerts.length);
        if (alerts.some((a: any) => a.severity === 'critical' || a.severity === 'CRITICAL')) {
          setRisk('CRITICAL');
        } else if (alerts.some((a: any) => a.severity === 'warning' || a.severity === 'WARNING')) {
          setRisk('HIGH');
        } else if (alerts.length > 0) {
          setRisk('MODERATE');
        } else {
          setRisk('LOW');
        }
      })
      .catch((err) => console.error('Failed to load risk level:', err));

    sheltersApi.getAll()
      .then((res) => setShelters(res.data || []))
      .catch((err) => console.error('Failed to load shelters:', err));

    incidentsApi.getAll()
      .then((res) => setIncidents(res.data || []))
      .catch((err) => console.error('Failed to load incidents:', err));

    setLastSync(new Date());
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncSecondsAgo(Math.floor((Date.now() - lastSync.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSync]);

  // Construct map markers
  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];

    // Citizen GPS location
    list.push({
      id: 'citizen-location',
      type: 'citizen',
      title: 'YOUR LOCATION',
      lat: gpsCoords.lat,
      lng: gpsCoords.lng,
      details: gpsActive ? 'Real Device GPS Fix' : 'Default Coordinate Baseline',
    });

    // Real shelters
    shelters.forEach((s) => {
      if (s.latitude && s.longitude) {
        list.push({
          id: s.id,
          type: 'shelter',
          title: s.name,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          capacity: Number(s.capacity) || 0,
          occupancy: Number(s.current_occupancy ?? s.occupancy) || 0,
          status: s.status || 'OPEN',
          details: `${s.current_occupancy ?? s.occupancy ?? 0}/${s.capacity} Occupied · ${s.address || 'Designated Shelter'}`,
        });
      }
    });

    // Real incidents
    incidents.forEach((inc) => {
      if (inc.latitude && inc.longitude) {
        list.push({
          id: inc.id,
          type: 'incident',
          title: inc.title || inc.description || 'Reported Incident',
          lat: Number(inc.latitude),
          lng: Number(inc.longitude),
          severity: inc.severity || 'HIGH',
          status: inc.status || 'ACTIVE',
          details: `${inc.type || 'INCIDENT'} · Status: ${inc.status || 'ACTIVE'}`,
        });
      }
    });

    return list;
  }, [gpsCoords, gpsActive, shelters, incidents]);

  // Find nearest shelter for Safe Route calculation
  const nearestShelter = useMemo(() => {
    if (!shelters.length) return null;
    let closest: any = null;
    let minDist = Infinity;
    shelters.forEach((s) => {
      if (s.latitude && s.longitude) {
        const d = Math.hypot(Number(s.latitude) - gpsCoords.lat, Number(s.longitude) - gpsCoords.lng);
        if (d < minDist) {
          minDist = d;
          closest = s;
        }
      }
    });
    if (!closest) return null;
    return {
      lat: Number(closest.latitude),
      lng: Number(closest.longitude),
      label: closest.name,
    };
  }, [shelters, gpsCoords]);

  const riskColor = riskColors[risk];

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Left — spatial operational map */}
      <div className="flex-1 relative">
        <OperationalMap
          center={gpsCoords}
          zoom={13}
          markers={markers}
          safeRouteDestination={nearestShelter}
          onRecenter={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition((pos) => {
                setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsActive(true);
              });
            }
          }}
        />

        {/* Risk overlay badge */}
        <div
          className="absolute top-4 left-4 z-10 flex items-center gap-3 glass px-4 py-2.5 rounded-lg pointer-events-none"
          style={{ border: `1px solid ${riskColor}44` }}
        >
          <motion.div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: riskColor }}
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <div>
            <div className="font-condensed font-black text-sm tracking-widest" style={{ color: riskColor }}>{risk} RISK</div>
            <div className="font-mono text-[10px] text-white/50">
              {gpsActive ? 'LIVE GPS ACTIVE' : 'COORDINATE BASELINE'} · SYNCED {syncSecondsAgo}S AGO
            </div>
          </div>
        </div>
      </div>

      {/* Right — action panel (fixed width, no scroll) */}
      <motion.div
        className="w-80 flex flex-col glass-strong shrink-0"
        style={{ borderLeft: `1px solid ${riskColor}22` }}
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Situation summary */}
        <div className="px-6 pt-6 pb-4 border-b border-white/[0.05]">
          <div className="font-mono text-xs text-white/30 mb-2 tracking-widest">YOUR SITUATION</div>
          <div className="font-condensed font-black text-4xl leading-none text-white mb-1">AM I</div>
          <div className="font-condensed font-black text-4xl leading-none mb-3" style={{ color: riskColor }}>SAFE?</div>
          <p className="font-mono text-xs leading-relaxed text-white/50">{riskMessages[risk]}</p>
        </div>

        {/* Primary emergency action */}
        <div className="px-6 py-5 border-b border-white/[0.05]">
          <motion.button
            onClick={() => navigate('/citizen/help')}
            className="w-full py-5 rounded-xl font-condensed font-black text-2xl tracking-widest relative overflow-hidden"
            style={{ background: '#dc2626', boxShadow: '0 0 40px rgba(220,38,38,0.45)' }}
            whileHover={{ scale: 1.02, boxShadow: '0 0 60px rgba(220,38,38,0.55)' }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.div
              className="absolute inset-0 opacity-20"
              style={{ background: 'radial-gradient(circle at 50% 50%, white, transparent 70%)' }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0, 0.2] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
            <span className="relative z-10">GET HELP NOW</span>
          </motion.button>
          <button
            className="w-full mt-3 py-3 rounded-lg font-condensed font-semibold text-sm tracking-widest transition-all duration-200"
            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            ✓ I'M SAFE — CHECK IN
          </button>
        </div>

        {/* Quick actions */}
        <div className="px-6 py-4 flex flex-col gap-2 flex-1 overflow-y-auto">
          {[
            { label: 'VIEW ALERTS', icon: '⚠', path: '/citizen/alerts', color: '#f59e0b', desc: activeAlertCount > 0 ? `${activeAlertCount} active alert${activeAlertCount > 1 ? 's' : ''} in your area` : 'No active alerts in your area' },
            { label: 'FIND SHELTER', icon: '⊕', path: '/citizen/shelters', color: '#10b981', desc: 'Shelter facilities in your area' },
            { label: 'SAFE ROUTES', icon: '→', path: '/citizen/routes', color: '#06b6d4', desc: 'Evacuation corridors & status' },
            { label: 'LIVE WEATHER', icon: '⚡', path: '/citizen/weather', color: '#38bdf8', desc: 'Device GPS weather & 5-day forecast' },
            { label: 'MY HISTORY', icon: '⟳', path: '/citizen/history', color: '#a855f7', desc: 'Past emergency requests & status' },
          ].map((a, i) => (
            <motion.button
              key={a.path}
              onClick={() => navigate(a.path)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08 }}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200 group"
              style={{ background: `${a.color}08`, border: `1px solid ${a.color}20` }}
              whileHover={{ scale: 1.01, borderColor: `${a.color}44` }}
              whileTap={{ scale: 0.99 }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center font-condensed font-black text-lg shrink-0"
                style={{ background: `${a.color}15`, color: a.color }}
              >
                {a.icon}
              </div>
              <div>
                <div className="font-condensed font-bold text-sm tracking-wider text-white">{a.label}</div>
                <div className="font-mono text-xs text-white/35">{a.desc}</div>
              </div>
              <div className="ml-auto font-condensed font-bold text-sm text-white/20 group-hover:text-white/50 transition-colors">›</div>
            </motion.button>
          ))}
        </div>

        {/* Emergency contact */}
        <div className="px-6 py-4 border-t border-white/[0.05]">
          <div className="font-mono text-xs text-white/25 text-center">Emergency services: <span className="text-white/50">911</span></div>
        </div>
      </motion.div>
    </div>
  );
}
