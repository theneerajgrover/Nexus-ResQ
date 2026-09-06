import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { emergencyApi } from '../../api';

interface EmergencyRecord {
  id: string;
  emergency_type: string;
  assistance_needed?: string[];
  assistance_requested?: string[];
  location_name?: string;
  location?: string;
  latitude: number | null;
  longitude: number | null;
  description?: string;
  details?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

export default function CitizenHistory() {
  const [history, setHistory] = useState<EmergencyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await emergencyApi.getHistory();
      if (res.data) {
        setHistory(res.data);
        setLastSync(new Date());
      }
    } catch (err: any) {
      console.error('Failed to load emergency history:', err);
      setError('Unable to retrieve emergency incident logs');
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
    if (s === 'RESOLVED' || s === 'COMPLETED') {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    }
    if (s === 'IN_PROGRESS' || s === 'ASSIGNED') {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    }
    return 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-condensed font-black text-3xl tracking-wider text-white">
              MY EMERGENCY REQUEST LOGS
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              AUDIT RECORD
            </span>
          </div>
          <p className="font-mono text-xs text-white/50 mt-1">
            Permanent database record of all transmitted SOS signals, dispatch assignments, and incident resolutions.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-[10px] text-white/40">AUDIT SYNC</div>
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

      {error && (
        <div className="p-4 rounded-xl mb-6 bg-red-950/40 border border-red-500/30 text-red-300 font-mono text-xs">
          ⚠ {error}
        </div>
      )}

      {/* History List */}
      {history.length === 0 && !loading ? (
        <div className="glass-strong p-12 rounded-2xl border border-white/10 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center text-2xl text-white/30">
            ✓
          </div>
          <h2 className="font-condensed font-black text-2xl text-white mb-2">NO INCIDENTS ON RECORD</h2>
          <p className="font-mono text-xs text-white/40 mb-6 leading-relaxed">
            You currently have no recorded emergency calls or SOS triggers logged in the national coordination database.
          </p>
          <a
            href="/citizen/help"
            className="inline-block px-6 py-3 rounded-xl font-condensed font-black text-sm tracking-widest bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            REQUEST ASSISTANCE NOW
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record) => {
            const formattedDate = new Date(record.created_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            });

            const assistanceList = record.assistance_requested || record.assistance_needed || [];
            const locName = record.location || record.location_name || (record.latitude && record.longitude ? `${Number(record.latitude).toFixed(4)}, ${Number(record.longitude).toFixed(4)}` : 'Operational Sector');
            const descText = record.details || record.description;

            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong p-5 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      ID: {record.id.slice(0, 9).toUpperCase()}
                    </span>
                    <span className="font-mono text-xs text-white/30">·</span>
                    <span className="font-condensed font-bold text-sm tracking-wider uppercase text-white">
                      {record.emergency_type} EMERGENCY
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border font-semibold ${getStatusBadge(
                      record.status
                    )}`}
                  >
                    ● {record.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3 border-y border-white/5 font-mono text-xs">
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">COORDINATES & SECTOR</span>
                    <div className="text-white font-medium mt-0.5">
                      {locName}
                    </div>
                  </div>

                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">REQUESTED ASSISTANCE</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {assistanceList.length > 0 ? (
                        assistanceList.map((a) => (
                          <span key={a} className="bg-white/10 text-white/80 px-2 py-0.5 rounded text-[10px] uppercase">
                            {a}
                          </span>
                        ))
                      ) : (
                        <span className="text-white/60">Standard Rescue</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">TRANSMISSION TIMESTAMP</span>
                    <div className="text-white/70 mt-0.5">{formattedDate}</div>
                  </div>
                </div>

                {descText && (
                  <div className="mt-3 text-xs font-mono text-white/60 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    "{descText}"
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
