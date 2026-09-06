import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { alertsApi } from '../../api';

interface AlertItem {
  id: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  category: string;
  affectedArea: string;
  issuedAt?: string;
}

const severityColors: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#f59e0b',
  MODERATE: '#06b6d4',
  LOW: '#10b981',
};

export default function CitizenAlerts() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadAlerts() {
      try {
        const res = await alertsApi.getActive();
        if (mounted && res.success && Array.isArray(res.data)) {
          setAlerts(res.data);
        }
      } catch (err) {
        console.warn('Failed to load alerts:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAlerts();
    return () => { mounted = false; };
  }, []);

  const filteredAlerts = alerts.filter(a => filter === 'ALL' || a.severity === filter);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.05] shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 font-mono text-xs text-white/30 hover:text-cyan-400 transition-colors mb-2"
        >
          ← BACK
        </button>
        <div className="font-condensed font-black text-2xl text-white leading-tight mb-1">ACTIVE ALERTS</div>
        <div className="font-mono text-xs text-white/35">Real-time emergency notifications for your area</div>
      </div>

      {/* Alert filter strip */}
      <div className="px-6 py-3 border-b border-white/[0.05] shrink-0 flex items-center gap-3">
        {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE'] as const).map((level) => (
          <button
            key={level}
            onClick={() => setFilter(level)}
            className="font-mono text-xs px-2.5 py-1 rounded transition-colors"
            style={{
              background: filter === level ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.04)',
              color: filter === level ? '#06b6d4' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${filter === level ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {level}
          </button>
        ))}
        <div className="ml-auto font-mono text-xs text-white/20">LAST UPDATED — LIVE</div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="h-full flex items-center justify-center font-mono text-xs text-white/30">
            Querying active regional alerts...
          </div>
        ) : filteredAlerts.length > 0 ? (
          <div className="space-y-4 max-w-2xl mx-auto">
            {filteredAlerts.map((alert, i) => {
              const color = severityColors[alert.severity] || '#06b6d4';
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-xl"
                  style={{ background: `${color}0d`, border: `1px solid ${color}33` }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-mono text-xs px-2 py-0.5 rounded font-bold" style={{ background: `${color}22`, color }}>
                      {alert.severity} · {alert.category}
                    </span>
                    <span className="font-mono text-xs text-white/35">{alert.affectedArea}</span>
                  </div>
                  <h3 className="font-condensed font-black text-xl text-white mb-1.5">{alert.title}</h3>
                  <p className="font-mono text-xs text-white/60 leading-relaxed">{alert.message}</p>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center">
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
                </svg>
              </div>
              <div className="font-condensed font-black text-3xl text-white/15 mb-2 tracking-widest">NO ACTIVE ALERTS</div>
              <div className="font-mono text-xs text-white/25 max-w-xs leading-relaxed">
                Your area is currently clear. You will be notified immediately when emergency alerts are issued.
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Info footer strip */}
      <div className="px-6 py-3 border-t border-white/[0.05] shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <div className="font-mono text-xs text-white/25">Monitoring active · Alerts will appear here as soon as they are issued</div>
        </div>
      </div>
    </div>
  );
}
