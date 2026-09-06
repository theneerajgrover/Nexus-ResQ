import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { sheltersApi } from '../../api';

interface ShelterItem {
  id: string;
  name: string;
  distance: string;
  walkTime: string;
  capacity: number;
  available: number;
  status: string;
  accessible: boolean;
  address: string;
  facilities: string[];
  routeSafe: boolean;
  lat: number;
  lng: number;
}

const statusColors: Record<string, string> = {
  OPEN: '#10b981', 'NEAR FULL': '#f59e0b', ACTIVATING: '#06b6d4', CLOSED: '#dc2626',
};

export default function CitizenShelters() {
  const [shelters, setShelters] = useState<ShelterItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    async function fetchShelters() {
      try {
        const res = await sheltersApi.getAll();
        if (active && res.success && Array.isArray(res.data)) {
          setShelters(res.data);
        }
      } catch (err) {
        console.warn('Failed to load shelters:', err);
      }
    }
    fetchShelters();
    return () => { active = false; };
  }, []);

  const selectedShelter = shelters.find((s) => s.id === selected);

  return (
    <div className="w-full h-full flex overflow-hidden">
      {/* Left — shelter list */}
      <div className="w-80 flex flex-col glass-strong shrink-0" style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="px-5 py-4 border-b border-white/[0.05]">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 font-mono text-xs text-white/30 hover:text-cyan-400 transition-colors mb-2">
            ← BACK
          </button>
          <div className="font-condensed font-black text-2xl text-white leading-tight mb-1">CAN I REACH</div>
          <div className="font-condensed font-black text-2xl leading-tight mb-3" style={{ color: '#10b981' }}>A SAFE SHELTER?</div>
          <div className="font-mono text-xs text-white/35">
            {shelters.filter((s) => s.status === 'OPEN').length} shelters open · Sorted by distance
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {shelters.map((s, i) => {
            const pct = Math.round(((s.capacity - s.available) / s.capacity) * 100);
            const color = statusColors[s.status];
            const isSelected = selected === s.id;
            return (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => setSelected(isSelected ? null : s.id)}
                className="w-full text-left p-4 rounded-xl transition-all duration-200"
                style={{
                  background: isSelected ? `${color}0e` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? color + '44' : 'rgba(255,255,255,0.05)'}`,
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <div className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>
                        {s.status}
                      </div>
                      {s.accessible && <div className="font-mono text-xs text-white/30">♿</div>}
                      {!s.routeSafe && <div className="font-mono text-xs text-amber-400">⚠ ROUTE RISK</div>}
                    </div>
                    <div className="font-condensed font-bold text-sm text-white leading-tight">{s.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-condensed font-black text-lg" style={{ color }}>{s.distance}</div>
                    <div className="font-mono text-xs text-white/30">{s.walkTime}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full overflow-hidden bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="font-mono text-xs" style={{ color }}>{s.available} free</div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Right — detail or map */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {selectedShelter ? (
            <motion.div
              key={selectedShelter.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="absolute inset-0 p-6 flex flex-col gap-5 overflow-y-auto"
            >
              <div>
                <button onClick={() => setSelected(null)} className="font-mono text-xs text-white/30 hover:text-white/60 mb-4">← BACK TO LIST</button>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-condensed font-black text-2xl text-white mb-1">{selectedShelter.name}</div>
                    <div className="font-mono text-xs text-white/40">{selectedShelter.address}</div>
                  </div>
                  <div
                    className="font-mono text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: `${statusColors[selectedShelter.status]}15`, color: statusColors[selectedShelter.status], border: `1px solid ${statusColors[selectedShelter.status]}33` }}
                  >
                    {selectedShelter.status}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'DISTANCE', value: selectedShelter.distance, color: '#06b6d4' },
                  { label: 'WALK TIME', value: selectedShelter.walkTime, color: '#f59e0b' },
                  { label: 'AVAILABLE', value: `${selectedShelter.available} places`, color: statusColors[selectedShelter.status] },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="font-condensed font-black text-xl mb-1" style={{ color: item.color }}>{item.value}</div>
                    <div className="font-mono text-xs text-white/30">{item.label}</div>
                  </div>
                ))}
              </div>

              {/* Occupancy */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs text-white/30 tracking-widest">OCCUPANCY</div>
                  <div className="font-mono text-xs text-white/50">
                    {selectedShelter.capacity - selectedShelter.available} / {selectedShelter.capacity}
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-white/[0.06]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: statusColors[selectedShelter.status] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${((selectedShelter.capacity - selectedShelter.available) / selectedShelter.capacity) * 100}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>

              {/* Facilities */}
              <div>
                <div className="font-mono text-xs text-white/30 tracking-widest mb-3">FACILITIES</div>
                <div className="flex flex-wrap gap-2">
                  {selectedShelter.facilities.map((f) => (
                    <div key={f} className="font-mono text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
                      {f}
                    </div>
                  ))}
                  {selectedShelter.accessible && (
                    <div className="font-mono text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                      ♿ Wheelchair Accessible
                    </div>
                  )}
                </div>
              </div>

              {/* Route warning */}
              {!selectedShelter.routeSafe && (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' }}>
                  <div className="font-condensed font-bold text-sm text-amber-400 mb-1">⚠ ROUTE RISK</div>
                  <div className="font-mono text-xs text-white/50 leading-relaxed">Direct route passes through a risk zone. Consider an alternative shelter or wait for updated route guidance.</div>
                </div>
              )}

              <motion.button
                className="w-full py-4 rounded-xl font-condensed font-black text-base tracking-widest"
                style={{
                  background: selectedShelter.routeSafe ? '#10b981' : '#f59e0b',
                  color: '#080b0f',
                  boxShadow: `0 0 30px ${selectedShelter.routeSafe ? 'rgba(16,185,129,0.35)' : 'rgba(245,158,11,0.35)'}`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {selectedShelter.routeSafe ? 'GET DIRECTIONS →' : 'PROCEED WITH CAUTION →'}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="text-center">
                <div className="font-condensed font-black text-4xl text-white/10 mb-2">SELECT A SHELTER</div>
                <div className="font-mono text-xs text-white/20">Choose a shelter from the list to see details and directions</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
