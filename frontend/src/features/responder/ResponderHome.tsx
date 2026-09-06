import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router';
import { respondersApi } from '../../api';

type MissionState = 'AVAILABLE' | 'ASSIGNED' | 'ACCEPTED' | 'EN ROUTE' | 'ON SCENE' | 'ASSISTING' | 'COMPLETED';
type NavSection = 'mission' | 'incident' | 'navigation' | 'resources' | 'alerts';

const stateFlow: MissionState[] = ['AVAILABLE', 'ASSIGNED', 'ACCEPTED', 'EN ROUTE', 'ON SCENE', 'ASSISTING', 'COMPLETED'];
const stateColors: Record<MissionState, string> = {
  AVAILABLE: '#10b981',
  ASSIGNED: '#f59e0b',
  ACCEPTED: '#f59e0b',
  'EN ROUTE': '#06b6d4',
  'ON SCENE': '#f97316',
  ASSISTING: '#dc2626',
  COMPLETED: '#6b7280',
};
const stateNextLabel: Partial<Record<MissionState, string>> = {
  ASSIGNED: 'ACCEPT MISSION',
  ACCEPTED: 'MARK EN ROUTE',
  'EN ROUTE': 'ARRIVED ON SCENE',
  'ON SCENE': 'BEGIN ASSISTING',
  ASSISTING: 'MARK COMPLETED',
};

// ── Spatial mission map ───────────────────────────────────────────────────────
function MissionMap({ status }: { status: MissionState }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const W = c.width, H = c.height;

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Risk zone
    const g = ctx.createRadialGradient(W * 0.55, H * 0.35, 0, W * 0.55, H * 0.35, 110);
    g.addColorStop(0, 'rgba(220,38,38,0.12)'); g.addColorStop(1, 'rgba(220,38,38,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(W * 0.55, H * 0.35, 110, 0, Math.PI * 2); ctx.fill();

    // Roads
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, H * 0.65); ctx.lineTo(W, H * 0.65); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.4, 0); ctx.lineTo(W * 0.4, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W * 0.6, 0); ctx.lineTo(W * 0.6, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H * 0.35); ctx.lineTo(W, H * 0.35); ctx.stroke();

    // Blocked route (red)
    ctx.strokeStyle = 'rgba(220,38,38,0.5)'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(W * 0.4, H * 0.65); ctx.lineTo(W * 0.4, H * 0.35); ctx.stroke();
    ctx.setLineDash([]);

    // Safe route (green dashed)
    const atScene = ['ON SCENE', 'ASSISTING', 'COMPLETED'].includes(status);
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 3; ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(W * 0.25, H * 0.75);
    ctx.lineTo(W * 0.25, H * 0.65);
    ctx.lineTo(W * 0.6, H * 0.65);
    ctx.lineTo(W * 0.6, H * 0.35);
    ctx.stroke();
    ctx.setLineDash([]);

    // Gas perimeter
    ctx.strokeStyle = 'rgba(245,158,11,0.5)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(W * 0.55, H * 0.35, 70, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(245,158,11,0.6)'; ctx.font = '10px monospace';
    ctx.fillText('GAS PERIMETER', W * 0.6 + 4, H * 0.35 - 60);

    // Incident marker
    ctx.beginPath(); ctx.arc(W * 0.6, H * 0.35, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626'; ctx.fill();
    ctx.fillStyle = 'rgba(220,38,38,0.7)'; ctx.font = '11px monospace';
    ctx.fillText('INC-2849', W * 0.6 + 14, H * 0.35 + 4);

    // My position
    const myX = atScene ? W * 0.6 : W * 0.25;
    const myY = atScene ? H * 0.35 : H * 0.75;
    ctx.beginPath(); ctx.arc(myX, myY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b'; ctx.fill();
    ctx.strokeStyle = 'rgba(245,158,11,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(myX, myY, 16, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f59e0b'; ctx.font = '10px monospace';
    ctx.fillText('YOU', myX + 19, myY + 4);

    // Team member on scene
    ctx.beginPath(); ctx.moveTo(W * 0.62, H * 0.33); ctx.lineTo(W * 0.66, H * 0.4); ctx.lineTo(W * 0.58, H * 0.4); ctx.closePath();
    ctx.fillStyle = '#06b6d4'; ctx.fill();
    ctx.fillStyle = 'rgba(6,182,212,0.7)'; ctx.font = '10px monospace';
    ctx.fillText('R3', W * 0.67, H * 0.36);

    ctx.fillStyle = 'rgba(220,38,38,0.6)';
    ctx.fillText('✕ BLOCKED', W * 0.25, H * 0.5);
  }, [status]);
  return <canvas ref={ref} className="w-full h-full" />;
}

// ── Mission section ───────────────────────────────────────────────────────────
function MissionSection({ status, onStatusChange }: { status: MissionState; onStatusChange: (s: MissionState) => void }) {
  const color = stateColors[status];
  const idx = stateFlow.indexOf(status);
  const next = stateFlow[idx + 1] as MissionState | undefined;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Status flow */}
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
              {s}
            </div>
            {i < stateFlow.length - 1 && <div className="text-white/15 text-xs">›</div>}
          </div>
        ))}
      </div>

      {/* Mission card */}
      <div className="p-4 rounded-xl flex-1" style={{ background: `${color}08`, border: `1px solid ${color}33` }}>
        <div className="font-mono text-xs tracking-widest mb-2" style={{ color }}>ACTIVE MISSION</div>
        <div className="font-condensed font-black text-2xl text-white mb-0.5">INC-2849</div>
        <div className="font-condensed font-bold text-lg mb-1" style={{ color }}>STRUCTURAL COLLAPSE</div>
        <div className="font-mono text-xs text-white/40 mb-4">Bridge Sector 7 · Zone NE-4</div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: 'PRIORITY', value: 'P1 — CRITICAL', color: '#dc2626' },
            { label: 'ETA TO SCENE', value: status === 'ON SCENE' || status === 'ASSISTING' ? 'ON SCENE' : '6 min', color },
            { label: 'TEAM', value: 'ALPHA-3', color: '#10b981' },
            { label: 'PERSONS', value: '3 trapped', color: '#f97316' },
          ].map((item) => (
            <div key={item.label} className="p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="font-mono text-xs text-white/30 mb-0.5">{item.label}</div>
              <div className="font-condensed font-bold text-sm" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg mb-4" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)' }}>
          <div className="font-mono text-xs text-red-400 mb-1">HAZARD NOTES</div>
          <div className="font-mono text-xs text-white/50 leading-relaxed">Gas leak detected. Maintain 20m perimeter. North approach blocked. Use East Service Road via Hwy 12.</div>
        </div>

        {next && (
          <motion.button
            onClick={() => onStatusChange(next)}
            className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest"
            style={{ background: stateColors[next], color: '#080b0f', boxShadow: `0 0 24px ${stateColors[next]}44` }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            → {stateNextLabel[status] || `MARK ${next}`}
          </motion.button>
        )}
        {status === 'COMPLETED' && (
          <div className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest text-center" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
            ✓ MISSION COMPLETED
          </div>
        )}
      </div>
    </div>
  );
}

// ── Incident section ──────────────────────────────────────────────────────────
function IncidentSection() {
  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div className="font-condensed font-black text-xl text-white">INCIDENT DETAILS</div>
      {[
        { label: 'INCIDENT ID', value: 'INC-2849' },
        { label: 'TYPE', value: 'Structural Collapse' },
        { label: 'SEVERITY', value: 'CRITICAL', color: '#dc2626' },
        { label: 'REPORTED', value: '14:02 UTC' },
        { label: 'ADDRESS', value: 'Bridge Sector 7, Zone NE-4' },
        { label: 'PERSONS TRAPPED', value: '3 confirmed' },
      ].map((item) => (
        <div key={item.label} className="flex items-start justify-between py-2.5 border-b border-white/[0.05]">
          <div className="font-mono text-xs text-white/35">{item.label}</div>
          <div className="font-condensed font-semibold text-sm text-right" style={{ color: item.color || 'rgba(232,237,242,0.9)' }}>{item.value}</div>
        </div>
      ))}
      <div>
        <div className="font-mono text-xs text-white/35 mb-2">FULL NOTES</div>
        <div className="p-3 rounded-lg font-mono text-xs text-white/55 leading-relaxed" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          Partial structural collapse on northwest span. Three construction workers reported trapped on second level. Gas main ruptured — utility crew en route. Do not use any electrical equipment near site. Fire unit standing by.
        </div>
      </div>
    </div>
  );
}

// ── Navigation section ────────────────────────────────────────────────────────
function NavigationSection() {
  return (
    <div className="space-y-4 h-full">
      <div className="font-condensed font-black text-xl text-white">NAVIGATION</div>
      <div className="p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' }}>
        <div className="font-mono text-xs text-green-400 mb-2 tracking-widest">RECOMMENDED ROUTE</div>
        <div className="font-condensed font-bold text-base text-white mb-1">East Service Road via Highway 12</div>
        <div className="font-mono text-xs text-white/40 mb-4">2.4 km · ETA 6 min</div>
        <div className="space-y-2">
          {[
            { step: '1', instruction: 'Head north on River Road', distance: '0.4 km', ok: true },
            { step: '2', instruction: 'Turn right onto Highway 12', distance: '1.2 km', ok: true },
            { step: '3', instruction: 'Turn left onto East Service Road', distance: '0.6 km', ok: true },
            { step: '4', instruction: 'Arrive: Bridge Sector 7 East entrance', distance: '0.2 km', ok: true },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>{s.step}</div>
              <div className="font-mono text-xs text-white/60 flex-1">{s.instruction}</div>
              <div className="font-mono text-xs text-white/30">{s.distance}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 rounded-xl" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
        <div className="font-mono text-xs text-red-400 mb-1">⛔ AVOID</div>
        <div className="font-mono text-xs text-white/50">North approach via Bridge Ave — blocked by structural collapse perimeter</div>
      </div>
    </div>
  );
}

// ── Resources section ─────────────────────────────────────────────────────────
function ResourcesSection() {
  const [requested, setRequested] = useState<string[]>([]);
  const items = [
    { id: 'hydraulic', name: 'Hydraulic Rescue Kit', status: 'AVAILABLE', location: 'Station 3 · 0.8 km' },
    { id: 'medkit', name: 'Advanced Trauma Kit', status: 'AVAILABLE', location: 'MEDIC 22 · nearby' },
    { id: 'airbag', name: 'Lifting Air Bags', status: 'LIMITED', location: 'Depot North · 3 km' },
    { id: 'rope', name: 'Rope & Harness Set', status: 'AVAILABLE', location: 'On unit' },
  ];
  return (
    <div className="space-y-4 h-full overflow-y-auto">
      <div className="font-condensed font-black text-xl text-white">RESOURCE REQUEST</div>
      <div className="font-mono text-xs text-white/35">Request resources for this mission. Requests are sent to Resource Manager.</div>
      <div className="space-y-2">
        {items.map((item) => {
          const isReq = requested.includes(item.id);
          const color = item.status === 'AVAILABLE' ? '#10b981' : '#f59e0b';
          return (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex-1">
                <div className="font-condensed font-semibold text-sm text-white">{item.name}</div>
                <div className="font-mono text-xs text-white/35">{item.location}</div>
              </div>
              <div className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>{item.status}</div>
              <button
                onClick={() => setRequested((p) => isReq ? p.filter((x) => x !== item.id) : [...p, item.id])}
                className="font-condensed font-bold text-xs px-3 py-1.5 rounded transition-all duration-200"
                style={{
                  background: isReq ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.1)',
                  color: isReq ? '#10b981' : '#f59e0b',
                  border: `1px solid ${isReq ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.25)'}`,
                }}
              >
                {isReq ? '✓ REQUESTED' : 'REQUEST'}
              </button>
            </div>
          );
        })}
      </div>
      {requested.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div className="font-mono text-xs text-green-400">{requested.length} resource request(s) submitted to Resource Manager</div>
        </motion.div>
      )}
    </div>
  );
}

// ── Alerts section ────────────────────────────────────────────────────────────
function AlertsSection() {
  const alerts = [
    { id: 1, level: 'CRITICAL', message: 'Gas leak confirmed at INC-2849. Maintain 20m exclusion zone.', time: '14:31' },
    { id: 2, level: 'WARNING', message: 'Secondary structural collapse risk elevated at Bridge Sector 7.', time: '14:28' },
    { id: 3, level: 'INFO', message: 'Fire unit Bravo-5 now standing by at east perimeter.', time: '14:22' },
    { id: 4, level: 'INFO', message: 'Utility crew dispatched to secure gas main. ETA 15 min.', time: '14:18' },
  ];
  const levelColors = { CRITICAL: '#dc2626', WARNING: '#f59e0b', INFO: '#06b6d4' };
  return (
    <div className="space-y-3 h-full overflow-y-auto">
      <div className="font-condensed font-black text-xl text-white">OPERATIONAL ALERTS</div>
      {alerts.map((a) => {
        const color = levelColors[a.level as keyof typeof levelColors];
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ResponderHome() {
  const [status, setStatus] = useState<MissionState>('ASSIGNED');
  const [mission, setMission] = useState<any>(null);
  const section = useSectionFromUrl();

  useEffect(() => {
    respondersApi.getAssignedMission()
      .then((res) => {
        if (res.data) {
          setMission(res.data);
          if (res.data.status && stateFlow.includes(res.data.status as MissionState)) {
            setStatus(res.data.status as MissionState);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load active mission:', err);
      });
  }, []);

  const handleStatusChange = async (nextStatus: MissionState) => {
    setStatus(nextStatus);
    const missionId = mission?.id || 'm-1';
    try {
      await respondersApi.updateMissionStatus(missionId, nextStatus);
    } catch (err) {
      console.error('Failed to update mission status on backend:', err);
    }
  };

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
          <div className="font-mono text-xs text-white/30 mb-1 tracking-widest">MY NEXT MISSION</div>
          <div className="font-condensed font-black text-2xl text-white leading-tight">WHAT DO I</div>
          <div className="font-condensed font-black text-2xl leading-tight" style={{ color }}>DO NEXT?</div>
        </div>

        {/* Active section indicator */}
        <div className="px-5 py-2 border-b border-white/[0.05]">
          <div className="font-mono text-xs" style={{ color, opacity: 0.7 }}>
            {section === 'mission' ? 'MISSION' : section === 'incident' ? 'INCIDENT' : section === 'navigation' ? 'NAVIGATION' : section === 'resources' ? 'RESOURCES' : 'ALERTS'}
          </div>
        </div>

        {/* Team */}
        <div className="p-4">
          <div className="font-mono text-xs text-white/30 tracking-widest mb-3">TEAM ALPHA-3</div>
          <div className="space-y-2">
            {[
              { name: 'J. Martinez', role: 'Lead', st: 'ON SCENE' },
              { name: 'S. Okafor', role: 'Medic', st: 'EN ROUTE' },
              { name: 'R. Chen', role: 'Tech', st: 'ON SCENE' },
            ].map((m) => {
              const mc = stateColors[m.st as MissionState] || '#6b7280';
              return (
                <div key={m.name} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center font-condensed font-bold text-xs shrink-0" style={{ background: `${mc}18`, color: mc }}>
                    {m.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-condensed font-semibold text-xs text-white">{m.name}</div>
                    <div className="font-mono text-xs text-white/30">{m.role}</div>
                  </div>
                  <div className="font-mono text-xs" style={{ color: mc, fontSize: '0.6rem' }}>{m.st}</div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Center — section content */}
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
                  {section === 'mission' && <MissionSection status={status} onStatusChange={handleStatusChange} />}
                  {section === 'incident' && <IncidentSection />}
                  {section === 'navigation' && <NavigationSection />}
                  {section === 'resources' && <ResourcesSection />}
                  {section === 'alerts' && <AlertsSection />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Spatial map */}
          <div className="flex-1 relative">
            <div className="absolute inset-0">
              <MissionMap status={status} />
            </div>

            {/* HUD */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
              <div className="glass px-3 py-2 rounded-lg font-mono text-xs" style={{ border: `1px solid ${color}33`, color }}>
                STATUS: {status}
              </div>
              <div className="glass px-3 py-2 rounded-lg font-mono text-xs text-white/35" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                INC-2849 · {['ON SCENE', 'ASSISTING'].includes(status) ? 'AT SCENE' : '~6 min ETA'}
              </div>
            </div>

            <div className="absolute bottom-4 left-4 z-10 font-mono text-xs text-white/25">
              Tap the mission section to update status
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
