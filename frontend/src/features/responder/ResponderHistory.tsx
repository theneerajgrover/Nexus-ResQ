import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { respondersApi } from '../../api';

interface MissionRecord {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  incident_id?: string;
  responder_id?: string;
  unit_name?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  notes?: string;
}

interface DispatchRecord {
  id: string;
  resource_type: string;
  quantity: number;
  status: string;
  origin?: string;
  destination?: string;
  dispatched_at: string;
}

export default function ResponderHistory() {
  const [missions, setMissions] = useState<MissionRecord[]>([]);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'missions' | 'dispatches'>('missions');
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await respondersApi.getHistory();
      if (res.data) {
        setMissions(res.data.missions || []);
        setDispatches(res.data.dispatches || []);
        setLastSync(new Date());
      }
    } catch (err: any) {
      console.error('Responder history error:', err);
      setError('Unable to load responder operational history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  // Sync ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncSecondsAgo(Math.floor((Date.now() - lastSync.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSync]);

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'COMPLETED' || s === 'RESOLVED') {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
    if (s === 'ACTIVE' || s === 'IN_PROGRESS' || s === 'ASSIGNED') {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
    return 'bg-white/10 text-white/50 border-white/10';
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-condensed font-black text-3xl tracking-wider text-white">
              RESPONDER OPERATIONAL ARCHIVE
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MISSION DEBRIEF
            </span>
          </div>
          <p className="font-mono text-xs text-white/50 mt-1">
            Historical audit record of all deployed missions, field dispatches, and emergency remediations.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-[10px] text-white/40">ARCHIVE SYNC</div>
            <div className="font-mono text-xs text-cyan-400 font-semibold tracking-wider">
              SYNCED {syncSecondsAgo}S AGO
            </div>
          </div>
          <motion.button
            onClick={fetchHistory}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-condensed font-bold text-xs tracking-widest bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-2"
            whileTap={{ scale: 0.96 }}
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>⟳</span>
            {loading ? 'SYNCING...' : 'REFRESH'}
          </motion.button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setActiveTab('missions')}
          className={`px-5 py-2.5 rounded-xl font-condensed font-bold text-xs tracking-wider transition-all ${
            activeTab === 'missions'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg'
              : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
          }`}
        >
          DEPLOYED MISSIONS ({missions.length})
        </button>
        <button
          onClick={() => setActiveTab('dispatches')}
          className={`px-5 py-2.5 rounded-xl font-condensed font-bold text-xs tracking-wider transition-all ${
            activeTab === 'dispatches'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg'
              : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
          }`}
        >
          RESOURCE DISPATCHES ({dispatches.length})
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-6 bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-xs">
          ⚠ {error}
        </div>
      )}

      {/* Missions List */}
      {activeTab === 'missions' && (
        <div className="space-y-4">
          {missions.length === 0 && !loading ? (
            <div className="glass-strong p-12 rounded-2xl border border-white/10 text-center max-w-lg mx-auto">
              <div className="font-condensed font-black text-2xl text-white mb-2">NO MISSIONS ON RECORD</div>
              <p className="font-mono text-xs text-white/40">
                No active or completed field missions have been assigned to your unit yet.
              </p>
            </div>
          ) : (
            missions.map((m: any) => {
              const dateRaw = m.created_at || m.createdAt || new Date().toISOString();
              const createdDate = new Date(dateRaw).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const unitLabel = m.unit_name || m.responderName || m.callsign || 'Rapid Response Unit';

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        MISSION ID: {m.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="font-mono text-xs text-white/30">·</span>
                      <span className="font-condensed font-bold text-base text-white tracking-wide">
                        {m.title}
                      </span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border font-semibold ${getStatusBadge(
                        m.status
                      )}`}
                    >
                      ● {m.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-3 border-y border-white/5 font-mono text-xs">
                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">MISSION TYPE</span>
                      <div className="text-white font-medium mt-0.5">{m.type || 'SEARCH & RESCUE'}</div>
                    </div>

                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">PRIORITY LEVEL</span>
                      <div className="text-amber-400 font-bold mt-0.5">{m.priority || 'HIGH'}</div>
                    </div>

                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">DEPLOYED UNIT</span>
                      <div className="text-white/80 mt-0.5">{unitLabel}</div>
                    </div>

                    <div>
                      <span className="text-white/40 block text-[10px] uppercase">ASSIGNED TIME</span>
                      <div className="text-white/60 mt-0.5">{createdDate}</div>
                    </div>
                  </div>

                  {m.notes && (
                    <div className="mt-3 text-xs font-mono text-white/60 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                      Debrief note: "{m.notes}"
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Dispatches List */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          {dispatches.length === 0 && !loading ? (
            <div className="glass-strong p-12 rounded-2xl border border-white/10 text-center max-w-lg mx-auto">
              <div className="font-condensed font-black text-2xl text-white mb-2">NO DISPATCHES RECORDED</div>
              <p className="font-mono text-xs text-white/40">
                No logistical resource dispatches recorded in this sector yet.
              </p>
            </div>
          ) : (
            dispatches.map((d: any) => {
              const dateRaw = d.dispatched_at || d.createdAt || new Date().toISOString();
              const dispatchDate = new Date(dateRaw).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              const resType = d.resource_type || d.resourceType || 'Tactical Asset';
              const qty = d.quantity ?? d.qtyDispatched ?? 1;

              return (
                <div
                  key={d.id}
                  className="glass-strong p-5 rounded-2xl border border-white/10 font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-cyan-400 font-bold">DISPATCH: {d.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-white/30">·</span>
                      <span className="text-white font-semibold">{resType} (Qty: {qty})</span>
                    </div>
                    <div className="text-white/40 text-[11px]">
                      From: {d.origin || d.unit || 'Central Logistics Hub'} → To: {d.destination || 'Field Operational Base'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-white/40 text-[11px]">{dispatchDate}</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border ${getStatusBadge(d.status)}`}>
                      ● {d.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
