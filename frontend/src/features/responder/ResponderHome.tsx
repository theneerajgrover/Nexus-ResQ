import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router';
import { respondersApi, trackingApi } from '../../api';
import OperationalMap, { MapMarker } from '../../components/map/OperationalMap';
import ReportIncidentModal from '../../components/incident/ReportIncidentModal';

type MissionState =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ASSIGNED'
  | 'DEPARTED'
  | 'ON_THE_WAY'
  | 'NEARBY'
  | 'ARRIVED'
  | 'COMPLETED';

type NavSection = 'mission' | 'incident' | 'navigation' | 'resources' | 'alerts';

const stateFlow: MissionState[] = [
  'REQUESTED',
  'ACCEPTED',
  'ASSIGNED',
  'DEPARTED',
  'ON_THE_WAY',
  'NEARBY',
  'ARRIVED',
  'COMPLETED',
];

const stateColors: Record<MissionState, string> = {
  REQUESTED: '#06b6d4',
  ACCEPTED: '#f59e0b',
  ASSIGNED: '#f59e0b',
  DEPARTED: '#3b82f6',
  ON_THE_WAY: '#06b6d4',
  NEARBY: '#f97316',
  ARRIVED: '#10b981',
  COMPLETED: '#6b7280',
};

const stateNextAction: Partial<Record<MissionState, { label: string; target: MissionState }>> = {
  REQUESTED: { label: 'ACCEPT MISSION', target: 'ACCEPTED' },
  ASSIGNED: { label: 'ACCEPT MISSION', target: 'ACCEPTED' },
  ACCEPTED: { label: 'DEPART STATION', target: 'DEPARTED' },
  DEPARTED: { label: 'MARK ON THE WAY', target: 'ON_THE_WAY' },
  ON_THE_WAY: { label: 'MARK NEARBY (<500M)', target: 'NEARBY' },
  NEARBY: { label: 'ARRIVED ON SCENE', target: 'ARRIVED' },
  ARRIVED: { label: 'COMPLETE MISSION', target: 'COMPLETED' },
};

// ── Mission section ───────────────────────────────────────────────────────────
function MissionSection({
  status,
  mission,
  activeRoute,
  onStatusChange,
  isGpsSharing,
  onToggleGps,
  currentCoords,
}: {
  status: MissionState;
  mission: any;
  activeRoute: any;
  onStatusChange: (s: MissionState) => void;
  isGpsSharing: boolean;
  onToggleGps: () => void;
  currentCoords: { lat: number; lng: number; accuracy?: number } | null;
}) {
  const color = stateColors[status];
  const idx = stateFlow.indexOf(status);
  const nextAction = stateNextAction[status];

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Status flow progression */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {stateFlow.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className="font-mono text-xs px-2.5 py-1 rounded transition-all duration-300"
              style={{
                background: s === status ? `${stateColors[s]}20` : i < idx ? 'rgba(255,255,255,0.03)' : 'transparent',
                color: s === status ? stateColors[s] : i < idx ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                border: `1px solid ${s === status ? stateColors[s] + '44' : 'rgba(255,255,255,0.05)'}`,
                textDecoration: i < idx ? 'line-through' : 'none',
              }}
            >
              {s.replace('_', ' ')}
            </div>
            {i < stateFlow.length - 1 && <div className="text-white/15 text-xs">›</div>}
          </div>
        ))}
      </div>

      {/* Mission card */}
      <div className="p-4 rounded-xl flex-1" style={{ background: `${color}08`, border: `1px solid ${color}33` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-mono text-xs tracking-widest" style={{ color }}>ACTIVE MISSION</div>
          <span className="font-mono text-[10px] text-white/40">INCIDENT ID</span>
        </div>
        <div className="font-condensed font-black text-2xl text-white mb-0.5">{mission?.incidentId || mission?.id || 'Awaiting Incident'}</div>
        <div className="font-condensed font-bold text-lg mb-1" style={{ color }}>{mission?.title || 'EMERGENCY OPERATION'}</div>
        <div className="font-mono text-xs text-white/40 mb-4">{mission?.destinationAddress || mission?.location || 'Operational Zone'}</div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'PRIORITY', value: mission?.priority || 'P1 — CRITICAL', color: '#dc2626' },
            { label: 'ETA TO SCENE', value: activeRoute?.etaFormatted || (status === 'ARRIVED' ? 'ON SCENE' : 'ETA pending route'), color },
            { label: 'UNIT / TEAM', value: mission?.callsign || mission?.responderName || 'ALPHA-14', color: '#10b981' },
            { label: 'ROUTE SAFETY', value: activeRoute?.safetyStatus || 'SAFE', color: activeRoute?.safetyStatus === 'CAUTION' ? '#f59e0b' : '#10b981' },
          ].map((item) => (
            <div key={item.label} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="font-mono text-xs text-white/30 mb-0.5">{item.label}</div>
              <div className="font-condensed font-bold text-sm" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Live GPS Sharing Panel */}
        <div className="p-3.5 rounded-xl mb-4" style={{ background: isGpsSharing ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)', border: isGpsSharing ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isGpsSharing ? 'bg-emerald-400 animate-ping' : 'bg-white/20'}`} />
              <span className="font-mono text-xs font-bold text-white/80">
                {isGpsSharing ? 'LIVE GPS BROADCASTING' : 'DEVICE GPS SHARING'}
              </span>
            </div>
            <button
              onClick={onToggleGps}
              className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-colors ${
                isGpsSharing
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
            >
              {isGpsSharing ? 'STOP GPS' : 'START SHARING GPS'}
            </button>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px] text-white/40">
            <span>
              {currentCoords ? `${currentCoords.lat.toFixed(4)}°N, ${currentCoords.lng.toFixed(4)}°E` : 'Awaiting GPS lock...'}
            </span>
          </div>
        </div>

        {/* Operational Status Advance Button */}
        {nextAction && (
          <motion.button
            onClick={() => onStatusChange(nextAction.target)}
            className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest cursor-pointer"
            style={{
              background: stateColors[nextAction.target],
              color: '#080b0f',
              boxShadow: `0 0 24px ${stateColors[nextAction.target]}44`,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            → {nextAction.label}
          </motion.button>
        )}

        {status === 'COMPLETED' && (
          <div
            className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest text-center"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            ✓ MISSION COMPLETED & ARCHIVED
          </div>
        )}
      </div>
    </div>
  );
}

// ── Incident section ──────────────────────────────────────────────────────────
function IncidentSection({
  mission,
  trackingBundle,
  destLat,
  destLng,
}: {
  mission: any;
  trackingBundle?: any;
  destLat?: number | null;
  destLng?: number | null;
}) {
  const incidentId = mission?.incidentId || mission?.id || 'Pending Incident';
  const requestId = mission?.requestId || trackingBundle?.citizen?.requestId || 'Not Linked';
  const address =
    mission?.destinationAddress ||
    trackingBundle?.citizen?.location ||
    trackingBundle?.incident?.location ||
    mission?.location ||
    'Address Pending';
  const coordsFormatted =
    destLat !== null && destLat !== undefined && destLng !== null && destLng !== undefined
      ? `${destLat.toFixed(5)}°, ${destLng.toFixed(5)}°`
      : 'Coordinates unavailable';

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div className="font-condensed font-black text-xl text-white">INCIDENT DETAILS</div>
      {[
        { label: 'INCIDENT ID', value: incidentId },
        { label: 'SOS REQUEST ID', value: requestId },
        { label: 'TITLE', value: mission?.title || 'Operational Emergency Response' },
        { label: 'SEVERITY', value: mission?.priority || 'CRITICAL', color: '#dc2626' },
        { label: 'STATUS', value: mission?.status || 'ASSIGNED', color: '#10b981' },
        { label: 'DESTINATION GPS', value: coordsFormatted, color: '#38bdf8' },
        { label: 'LOCATION ADDRESS', value: address },
        {
          label: 'CASUALTIES',
          value: mission?.casualtiesReported !== undefined ? `${mission.casualtiesReported} reported` : 'None reported',
        },
      ].map((item) => (
        <div key={item.label} className="flex items-start justify-between py-2.5 border-b border-white/[0.05]">
          <div className="font-mono text-xs text-white/35">{item.label}</div>
          <div
            className="font-condensed font-semibold text-sm text-right"
            style={{ color: item.color || 'rgba(232,237,242,0.9)' }}
          >
            {item.value}
          </div>
        </div>
      ))}
      <div>
        <div className="font-mono text-xs text-white/35 mb-2">OPERATIONAL BRIEF</div>
        <div
          className="p-3 rounded-lg font-mono text-xs text-white/55 leading-relaxed"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {mission?.notes ||
            'Structural hazards and secondary risk active in sector. Maintain tactical distance and report physical contact immediately upon arrival.'}
        </div>
      </div>
    </div>
  );
}

// ── Navigation section ────────────────────────────────────────────────────────
function NavigationSection({ activeRoute }: { activeRoute: any }) {
  const steps = activeRoute?.steps || [];

  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div className="font-condensed font-black text-xl text-white">TACTICAL NAVIGATION</div>
      {activeRoute ? (
        <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div className="font-mono text-xs text-green-400 mb-2 tracking-widest">
            {activeRoute?.safetyStatus ? `ACTIVE ROUTE (${activeRoute.safetyStatus})` : 'RECOMMENDED ROUTE'}
          </div>
          <div className="font-condensed font-bold text-base text-white mb-1">
            {activeRoute?.label || 'Corridor Navigation'}
          </div>
          <div className="font-mono text-xs text-white/40 mb-4">
            {activeRoute?.distanceFormatted} · ETA {activeRoute?.etaFormatted}
          </div>
          <div className="space-y-2">
            {steps.map((s: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 p-2 rounded bg-white/[0.02]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-white/80">{s.instruction}</div>
                  {s.distanceMeters !== undefined && (
                    <div className="font-mono text-[10px] text-white/30">
                      {s.distanceMeters < 1000 ? `${Math.round(s.distanceMeters)}m` : `${(s.distanceMeters / 1000).toFixed(1)}km`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-white/10 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="text-2xl mb-2">📡</div>
          <div className="font-mono text-xs text-white/60 mb-1">NAVIGATION PENDING</div>
          <div className="font-mono text-[11px] text-white/30">
            Route calculation will appear once operational GPS lock and incident destination are verified.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Resources section ─────────────────────────────────────────────────────────
function ResourcesSection() {
  const items = [
    { name: 'Hydraulic Cutter / Spreader', qty: 2, unit: 'sets', ok: true },
    { name: 'Medical Trauma Kit', qty: 4, unit: 'bags', ok: true },
    { name: 'Hazard Isolation Gas Detectors', qty: 3, unit: 'units', ok: true },
  ];

  return (
    <div className="space-y-4 h-full">
      <div className="font-condensed font-black text-xl text-white">ASSIGNED EQUIPMENT</div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.name} className="p-3 rounded-lg flex items-center justify-between border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div>
              <div className="font-condensed font-semibold text-sm text-white">{it.name}</div>
              <div className="font-mono text-xs text-white/30">{it.qty} {it.unit} verified</div>
            </div>
            <div className="font-mono text-xs text-emerald-400 font-bold">READY</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Alerts section ────────────────────────────────────────────────────────────
function AlertsSection({ routeAlert }: { routeAlert: { show: boolean; message: string } | null }) {
  const alerts = [
    ...(routeAlert?.show ? [{ id: 'route-dyn', level: 'WARNING', message: routeAlert.message, time: 'NOW' }] : []),
    { id: 1, level: 'CRITICAL', message: 'Structural advisory: Maintain 20m perimeter around collapsed elements.', time: '14:31' },
    { id: 2, level: 'WARNING', message: 'Severe wind conditions advisory active in northern quadrant.', time: '14:28' },
    { id: 3, level: 'INFO', message: 'Direct dispatch telemetry channel connected.', time: '14:22' },
  ];
  const levelColors = { CRITICAL: '#dc2626', WARNING: '#f59e0b', INFO: '#06b6d4' };

  return (
    <div className="space-y-3 h-full overflow-y-auto">
      <div className="font-condensed font-black text-xl text-white">OPERATIONAL ALERTS</div>
      {alerts.map((a) => {
        const color = levelColors[a.level as keyof typeof levelColors] || '#06b6d4';
        return (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 rounded-xl"
            style={{ background: `${color}06`, border: `1px solid ${color}25` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <div className="font-mono text-xs tracking-widest" style={{ color }}>{a.level}</div>
              <div className="font-mono text-xs text-white/25 ml-auto">{a.time}</div>
            </div>
            <div className="font-mono text-xs text-white/60 leading-relaxed">{a.message}</div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── URL → section mapping ─────────────────────────────────────────────────────
function useSectionFromUrl(): NavSection {
  const { pathname } = useLocation();
  if (pathname.startsWith('/responder/missions')) return 'incident';
  if (pathname.startsWith('/responder/navigation')) return 'navigation';
  if (pathname.startsWith('/responder/resources')) return 'resources';
  if (pathname.startsWith('/responder/alerts')) return 'alerts';
  return 'mission';
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ResponderHome() {
  const [status, setStatus] = useState<MissionState>('ASSIGNED');
  const [mission, setMission] = useState<any>(null);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [trackingBundle, setTrackingBundle] = useState<any>(null);
  const [isGpsSharing, setIsGpsSharing] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [routeAlert, setRouteAlert] = useState<{ show: boolean; message: string } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const section = useSectionFromUrl();
  const watchIdRef = useRef<number | null>(null);

  // Load assigned mission and active route
  const loadMissionData = async () => {
    try {
      const res = await respondersApi.getAssignedMission();
      // apiClient returns the JSON body directly (not wrapped in res.data)
      if (res?.data || res?.success) {
        const m = res.data || (res.success ? res : null);
        if (!m) return;
        setMission(m);

        if (m.status) {
          const s = m.status.toUpperCase().replace(' ', '_');
          if (stateFlow.includes(s as MissionState)) {
            setStatus(s as MissionState);
          }
        }

        // Initialize responder coords from database if available and not yet set
        if (m.responderLat && m.responderLng) {
          const rLat = parseFloat(m.responderLat);
          const rLng = parseFloat(m.responderLng);
          if (!isNaN(rLat) && !isNaN(rLng)) {
            setCurrentCoords((prev) => prev || {
              lat: rLat,
              lng: rLng,
              accuracy: m.responderAccuracy ? parseFloat(m.responderAccuracy) : 15,
            });
          }
        }

        // Query tracking bundle — provides REAL incident destination from the DB
        if (m.incidentId) {
          const trackRes = await trackingApi.getTracking(m.incidentId);
          // apiClient returns JSON body directly, no extra nesting
          if (trackRes?.success && trackRes?.data) {
            const bundle = trackRes.data;
            setTrackingBundle(bundle);
            if (bundle.activeRoute) {
              setActiveRoute(bundle.activeRoute);
            }
            if (bundle.responder?.latitude && bundle.responder?.longitude) {
              const bLat = parseFloat(bundle.responder.latitude);
              const bLng = parseFloat(bundle.responder.longitude);
              if (!isNaN(bLat) && !isNaN(bLng)) {
                setCurrentCoords((prev) => prev || {
                  lat: bLat,
                  lng: bLng,
                  accuracy: bundle.responder.accuracy || 15,
                });
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Failed to load active mission:', err.message);
    }
  };

  useEffect(() => {
    loadMissionData();
  }, []);

  // Listen to SSE updates
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { type, payload: data } = payload;

        if (type === 'ROUTE_UPDATED' && data.activeRoute) {
          setActiveRoute(data.activeRoute);
          setRouteAlert({
            show: true,
            message: data.reason || 'ROUTE UPDATED — SAFER ALTERNATIVE SELECTED',
          });
          setTimeout(() => setRouteAlert(null), 10000);
        } else if (type === 'INCIDENT_STATUS_CHANGED' && data.newStatus) {
          const s = data.newStatus.toUpperCase().replace(' ', '_');
          if (stateFlow.includes(s as MissionState)) {
            setStatus(s as MissionState);
          }
        }
      } catch (err) {
        console.warn('SSE parse error:', err);
      }
    };

    return () => eventSource.close();
  }, []);

  // Toggle Live GPS Sharing
  const toggleGpsSharing = () => {
    if (isGpsSharing) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsGpsSharing(false);
    } else {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }

      setIsGpsSharing(true);
      // Immediately obtain and broadcast position
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy;
          setCurrentCoords({ lat, lng, accuracy: acc });

          trackingApi.sendLocation({
            entityType: 'responder',
            entityId: mission?.responderId || 'R-14',
            incidentId: mission?.incidentId,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            heading: pos.coords.heading || undefined,
            speed: pos.coords.speed || undefined,
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true }
      );

      // Continuous GPS watch
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy;
          setCurrentCoords({ lat, lng, accuracy: acc });

          trackingApi.sendLocation({
            entityType: 'responder',
            entityId: mission?.responderId || 'R-14',
            incidentId: mission?.incidentId,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            heading: pos.coords.heading || undefined,
            speed: pos.coords.speed || undefined,
          }).catch(() => {});
        },
        (err) => console.warn('GPS Watch warning:', err.message),
        { enableHighAccuracy: true, maximumAge: 3000 }
      );
    }
  };


  // Handle Operational Lifecycle Transition
  const handleStatusChange = async (nextStatus: MissionState) => {
    setStatus(nextStatus);
    try {
      await trackingApi.updateStatus({
        incidentId: mission?.incidentId,
        responderId: mission?.responderId || 'R-14',
        status: nextStatus,
        actor: mission?.responderName || 'Alpha-14 Field Responder',
        notes: `Operational state transitioned to ${nextStatus}`,
      });
    } catch (err: any) {
      console.error('Failed to update operational status on backend:', err.message);
    }
  };

  // Map markers for Responder view
  const mapMarkers: MapMarker[] = [];
  if (currentCoords) {
    mapMarkers.push({
      id: 'responder-unit',
      type: 'responder',
      title: `${mission?.responderName || 'You'} (${mission?.callsign || 'ALPHA-14'})`,
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      details: `Status: ${status}`,
      status,
    });
  }

  // ── Destination: prefer real incident coordinates from tracking bundle ────
  // Priority order:
  //   1. Citizen GPS coordinates (most accurate — exact SOS submission point)
  //   2. Incident coordinates stored in DB
  //   3. Last coordinate in the active route polyline (end of route = destination)
  //   4. null — never use hardcoded fallback coordinates
  const incidentDestLat: number | null =
    (trackingBundle?.citizen?.latitude) ||
    (trackingBundle?.incident?.latitude) ||
    (mission?.incidentLat ? parseFloat(mission.incidentLat) : null) ||
    (mission?.lat ? parseFloat(mission.lat) : null) ||
    (activeRoute?.coordinates?.length
      ? activeRoute.coordinates[activeRoute.coordinates.length - 1][0]
      : null);

  const incidentDestLng: number | null =
    (trackingBundle?.citizen?.longitude) ||
    (trackingBundle?.incident?.longitude) ||
    (mission?.incidentLng ? parseFloat(mission.incidentLng) : null) ||
    (mission?.lng ? parseFloat(mission.lng) : null) ||
    (activeRoute?.coordinates?.length
      ? activeRoute.coordinates[activeRoute.coordinates.length - 1][1]
      : null);

  // Only add the destination marker if we have REAL coordinates from the database
  if (incidentDestLat !== null && incidentDestLng !== null) {
    mapMarkers.push({
      id: 'destination-incident',
      type: 'incident',
      title: mission?.title || 'Emergency Destination',
      lat: incidentDestLat,
      lng: incidentDestLng,
      details: trackingBundle?.citizen?.location || trackingBundle?.incident?.location || mission?.location || 'Incident Location',
      severity: mission?.priority || 'CRITICAL',
    });
  }

  const color = stateColors[status];

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Left column — mission brief + nav */}
      <motion.div
        className="w-72 flex flex-col glass-strong shrink-0"
        style={{ borderRight: `1px solid ${color}22` }}
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05]">
          <div className="font-mono text-xs text-white/30 mb-1 tracking-widest">FIELD DISPATCH</div>
          <div className="font-condensed font-black text-2xl text-white leading-tight">TACTICAL UNIT</div>
          <div className="font-condensed font-black text-2xl leading-tight" style={{ color }}>{status.replace('_', ' ')}</div>
        </div>

        {/* Active section indicator */}
        <div className="px-5 py-2 border-b border-white/[0.05]">
          <div className="font-mono text-xs" style={{ color, opacity: 0.7 }}>
            {section === 'mission' ? 'MISSION BRIEF' : section === 'incident' ? 'INCIDENT' : section === 'navigation' ? 'NAVIGATION' : section === 'resources' ? 'RESOURCES' : 'ALERTS'}
          </div>
        </div>

        {/* Team details */}
        <div className="p-4">
          <div className="font-mono text-xs text-white/30 tracking-widest mb-3">DEPLOYED UNIT</div>
          <div className="space-y-2">
            {[
              { name: mission?.responderName || 'Alpha-14 SAR Unit', role: 'Command Lead', st: status },
              { name: 'Ambulance Medic 14', role: 'Medical Staging', st: 'EN ROUTE' },
              { name: 'Rescue Tech Team', role: 'Heavy Extrication', st: 'READY' },
            ].map((m) => {
              const mc = stateColors[m.st as MissionState] || '#10b981';
              return (
                <div key={m.name} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-condensed font-bold text-xs shrink-0" style={{ background: `${mc}18`, color: mc }}>
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-condensed font-semibold text-xs text-white truncate">{m.name}</div>
                    <div className="font-mono text-xs text-white/30">{m.role}</div>
                  </div>
                  <div className="font-mono text-xs" style={{ color: mc, fontSize: '0.6rem' }}>{m.st}</div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-white/[0.05] mt-4">
            <motion.button
              onClick={() => setShowReportModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 px-3 rounded-lg font-condensed font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.35)',
              }}
            >
              <span>📢</span>
              FIELD INCIDENT REPORT
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Center — section content & map */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {/* Section detail */}
          <div className="w-80 flex flex-col border-r border-white/[0.05]">
            <div className="flex-1 p-5 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={section}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="h-full"
                >
                  {section === 'mission' && (
                    <MissionSection
                      status={status}
                      mission={mission}
                      activeRoute={activeRoute}
                      onStatusChange={handleStatusChange}
                      isGpsSharing={isGpsSharing}
                      onToggleGps={toggleGpsSharing}
                      currentCoords={currentCoords}
                    />
                  )}
                  {section === 'incident' && (
                    <IncidentSection
                      mission={mission}
                      trackingBundle={trackingBundle}
                      destLat={incidentDestLat}
                      destLng={incidentDestLng}
                    />
                  )}
                  {section === 'navigation' && <NavigationSection activeRoute={activeRoute} />}
                  {section === 'resources' && <ResourcesSection />}
                  {section === 'alerts' && <AlertsSection routeAlert={routeAlert} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Interactive Map View */}
          <div className="flex-1 relative">
            <OperationalMap
              center={currentCoords || (incidentDestLat !== null && incidentDestLng !== null ? { lat: incidentDestLat, lng: incidentDestLng } : undefined)}
              zoom={14}
              markers={mapMarkers}
              activeRouteCoordinates={activeRoute?.coordinates}
              activeRoutePolyline={activeRoute?.polyline}
              routeSafetyStatus={activeRoute?.safetyStatus || 'SAFE'}
              className="w-full h-full"
            />

            {/* Dynamic Re-Routing Alert Notification */}
            <AnimatePresence>
              {routeAlert?.show && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="absolute top-4 left-4 z-30 max-w-md p-3.5 rounded-xl border flex items-center gap-3 shadow-2xl"
                  style={{
                    background: 'rgba(220, 38, 38, 0.2)',
                    borderColor: '#dc2626',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1 min-w-0 font-mono text-xs">
                    <div className="font-bold text-rose-400">ROUTE UPDATED — SAFER ALTERNATIVE SELECTED</div>
                    <div className="text-white/70 truncate">{routeAlert.message}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tactical HUD Overlay */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
              <div className="glass px-3 py-2 rounded-lg font-mono text-xs" style={{ border: `1px solid ${color}33`, color }}>
                STATUS: {status.replace('_', ' ')}
              </div>
              <div className="glass px-3 py-2 rounded-lg font-mono text-xs text-white/50" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                {activeRoute ? `${activeRoute.distanceFormatted} · ${activeRoute.etaFormatted}` : 'Routing active'}
              </div>
            </div>

            <div className="absolute bottom-4 left-4 z-10 font-mono text-xs text-white/30 glass px-3 py-1.5 rounded-lg border border-white/5">
              Live operational telemetry · {isGpsSharing ? 'GPS Fix Active' : 'Stationary GPS Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* Field Incident Reporting Modal */}
      <ReportIncidentModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        defaultCoords={currentCoords}
        sourceContext="PORTAL_REPORT"
      />
    </div>
  );
}
