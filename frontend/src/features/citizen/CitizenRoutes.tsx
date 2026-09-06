import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { routesApi } from '../../api';

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
}

const riskColors = { LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#f97316', CRITICAL: '#dc2626' };
const segColors: Record<string, string> = { CLEAR: '#10b981', WARNING: '#f59e0b', BLOCKED: '#dc2626' };

function RouteMap({ routeId }: { routeId: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    c.width = c.offsetWidth;
    c.height = c.offsetHeight;
    const W = c.width, H = c.height;

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Risk zone NE-4
    const gz = ctx.createRadialGradient(W * 0.7, H * 0.2, 0, W * 0.7, H * 0.2, 120);
    gz.addColorStop(0, 'rgba(220,38,38,0.18)'); gz.addColorStop(1, 'rgba(220,38,38,0)');
    ctx.fillStyle = gz; ctx.beginPath(); ctx.arc(W * 0.7, H * 0.2, 120, 0, Math.PI * 2); ctx.fill();

    // Flood zone
    const fz = ctx.createRadialGradient(W * 0.35, H * 0.45, 0, W * 0.35, H * 0.45, 80);
    fz.addColorStop(0, 'rgba(245,158,11,0.14)'); fz.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = fz; ctx.beginPath(); ctx.arc(W * 0.35, H * 0.45, 80, 0, Math.PI * 2); ctx.fill();

    // Roads
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(0, H * 0.6); ctx.lineTo(W, H * 0.6); ctx.stroke(); // River Road
    ctx.beginPath(); ctx.moveTo(W * 0.5, 0); ctx.lineTo(W * 0.5, H); ctx.stroke(); // Highway 12
    ctx.beginPath(); ctx.moveTo(0, H * 0.25); ctx.lineTo(W, H * 0.55); ctx.stroke(); // Bridge St

    // Route A — green dashed
    ctx.strokeStyle = routeId === 'RT-A' ? '#10b981' : 'rgba(16,185,129,0.35)';
    ctx.lineWidth = routeId === 'RT-A' ? 3.5 : 2; ctx.setLineDash([10, 5]);
    ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.6); ctx.lineTo(W * 0.5, H * 0.28); ctx.lineTo(W * 0.28, H * 0.18); ctx.stroke();

    // Route B — amber
    ctx.strokeStyle = routeId === 'RT-B' ? '#f59e0b' : 'rgba(245,158,11,0.3)';
    ctx.lineWidth = routeId === 'RT-B' ? 3.5 : 2;
    ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.6); ctx.lineTo(W * 0.35, H * 0.48); ctx.lineTo(W * 0.65, H * 0.35); ctx.stroke();

    // Route C — red X
    ctx.strokeStyle = 'rgba(220,38,38,0.4)'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(W * 0.5, H * 0.6); ctx.lineTo(W * 0.7, H * 0.2); ctx.stroke();
    ctx.setLineDash([]);

    // Shelters
    [[W * 0.28, H * 0.18, '#10b981'], [W * 0.65, H * 0.35, '#06b6d4']].forEach(([x, y, col]) => {
      ctx.beginPath(); ctx.arc(x as number, y as number, 6, 0, Math.PI * 2);
      ctx.fillStyle = col as string; ctx.fill();
      ctx.beginPath(); ctx.arc(x as number, y as number, 14, 0, Math.PI * 2);
      ctx.strokeStyle = (col as string) + '55'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    // Zone labels
    ctx.fillStyle = 'rgba(220,38,38,0.7)'; ctx.font = '11px monospace';
    ctx.fillText('ZONE NE-4', W * 0.72, H * 0.18);
    ctx.fillStyle = 'rgba(245,158,11,0.6)';
    ctx.fillText('FLOOD RISK', W * 0.21, H * 0.44);

    // You
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.6, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#06b6d4'; ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.5, H * 0.6, 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(6,182,212,0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = 'rgba(6,182,212,0.7)'; ctx.font = '10px monospace';
    ctx.fillText('YOU', W * 0.5 + 17, H * 0.6 + 4);
  }, [routeId]);

  return <canvas ref={ref} className="w-full h-full" />;
}

export default function CitizenRoutes() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [activeRoute, setActiveRoute] = useState<string>('RT-A');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function loadRoutes() {
      try {
        const res = await routesApi.getAll();
        if (active && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRoutes(res.data);
          setActiveRoute(res.data[0].id);
        }
      } catch (err) {
        console.warn('Failed to fetch routes:', err);
      }
    }
    loadRoutes();
    return () => { active = false; };
  }, []);

  const route = routes.find((r) => r.id === activeRoute) || routes[0] || {
    id: 'RT-A',
    label: 'Route A — Recommended',
    via: 'River Road → Highway 12 North',
    distance: '4.2 km',
    eta: '12 min by car',
    riskLevel: 'LOW' as const,
    riskNote: 'Clear path, no known hazards.',
    congestion: 'LIGHT',
    destination: 'Central Community Center',
    safe: true,
    segments: [{ type: 'CLEAR', label: 'River Road' }],
  };

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Left — map */}
      <div className="flex-1 relative">
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-20 flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(8,11,15,0.75)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(4px)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#06b6d4')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
          ← BACK
        </button>
        <RouteMap routeId={activeRoute} />

        {/* Blocked banner */}
        {!route.safe && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg z-10"
            style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.5)' }}
          >
            <div className="font-condensed font-black text-sm tracking-widest text-red-400">
              ⛔ ROUTE BLOCKED — USE ROUTE A OR B
            </div>
          </motion.div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex items-center gap-4 font-mono text-xs text-white/35">
          <span className="flex items-center gap-1.5"><span style={{ display: 'inline-block', width: 24, height: 2, background: '#10b981' }} /> ROUTE A</span>
          <span className="flex items-center gap-1.5"><span style={{ display: 'inline-block', width: 24, height: 2, background: '#f59e0b' }} /> ROUTE B</span>
          <span className="flex items-center gap-1.5"><span style={{ display: 'inline-block', width: 24, height: 2, background: '#dc2626' }} /> BLOCKED</span>
        </div>
      </div>

      {/* Right — route panel */}
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
          {routes.map((r) => {
            const rc = riskColors[r.riskLevel as keyof typeof riskColors];
            const isActive = activeRoute === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRoute(r.id)}
                className="w-full text-left p-3 rounded-lg transition-all duration-200"
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
                <div className="font-mono text-xs text-white/35 pl-4">{r.distance} · {r.eta}</div>
              </button>
            );
          })}
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
                <div className="w-2 h-2 rounded-full" style={{ background: riskColors[route.riskLevel as keyof typeof riskColors] }} />
                <div className="font-condensed font-bold text-sm tracking-widest" style={{ color: riskColors[route.riskLevel as keyof typeof riskColors] }}>
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
                <div key={s.label} className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="font-condensed font-black text-base mb-0.5" style={{ color: s.color }}>{s.value}</div>
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
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: segColors[seg.type as keyof typeof segColors] }} />
                    <div className="font-mono text-xs" style={{ color: segColors[seg.type as keyof typeof segColors] === '#10b981' ? 'rgba(255,255,255,0.6)' : segColors[seg.type as keyof typeof segColors] }}>
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
              className="mt-auto w-full py-4 rounded-xl font-condensed font-black text-base tracking-widest"
              style={{
                background: route.safe ? riskColors[route.riskLevel as keyof typeof riskColors] : 'rgba(220,38,38,0.15)',
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
