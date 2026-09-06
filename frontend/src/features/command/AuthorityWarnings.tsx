import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { alertsApi } from '../../api';

interface OperationalAlert {
  id: string;
  title: string;
  description: string;
  severity: string;
  type: string;
  warning_type?: string;
  affected_region?: string;
  target_coordinates?: any;
  status?: string;
  active: boolean;
  created_at: string;
}

export default function AuthorityWarnings() {
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [syncSecondsAgo, setSyncSecondsAgo] = useState(0);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('WARNING');
  const [warningType, setWarningType] = useState('EVACUATION');
  const [affectedRegion, setAffectedRegion] = useState('District Core & Coastal Plain');
  const [lat, setLat] = useState('40.7128');
  const [lng, setLng] = useState('-74.0060');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await alertsApi.getActive();
      if (res.data) {
        setAlerts(res.data);
        setLastSync(new Date());
      }
    } catch (err) {
      console.error('Failed to load active alerts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  // Sync ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncSecondsAgo(Math.floor((Date.now() - lastSync.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSync]);

  const handleCreateWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFormError('Title and description are required.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        severity: severity.toLowerCase(),
        type: warningType.toLowerCase(),
        warning_type: warningType,
        affected_region: affectedRegion,
        target_coordinates: {
          lat: parseFloat(lat) || 40.7128,
          lng: parseFloat(lng) || -74.0060,
        },
      };

      const res = await alertsApi.create(payload);
      if (res.success || res.data) {
        setFormSuccess('Operational Warning broadcast successfully to all agencies and citizens.');
        setTitle('');
        setDescription('');
        fetchAlerts();
      } else {
        setFormError(res.error || 'Failed to issue warning');
      }
    } catch (err: any) {
      console.error('Error creating warning:', err);
      setFormError(err.message || 'Transmission error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await alertsApi.deactivate(id);
      fetchAlerts();
    } catch (err) {
      console.error('Failed to deactivate alert:', err);
    }
  };

  return (
    <div className="w-full h-full p-6 overflow-y-auto max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-condensed font-black text-3xl tracking-wider text-white">
              NATIONAL WARNING & THREAT BROADCAST CONSOLE
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30">
              PRIORITY LEVEL 1
            </span>
          </div>
          <p className="font-mono text-xs text-white/50 mt-1">
            Authoritative broadcast issuance system connected to civil defense sirens, citizen mobile push networks, and responder dispatch consoles.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-[10px] text-white/40">NETWORK BROADCAST</div>
            <div className="font-mono text-xs text-cyan-400 font-semibold tracking-wider">
              SYNCED {syncSecondsAgo}S AGO
            </div>
          </div>
          <motion.button
            onClick={fetchAlerts}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-condensed font-bold text-xs tracking-widest bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-all flex items-center gap-2"
            whileTap={{ scale: 0.96 }}
          >
            <span className={loading ? 'animate-spin inline-block' : ''}>⟳</span>
            {loading ? 'SYNCING...' : 'REFRESH'}
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create Warning Form (5 cols) */}
        <div className="lg:col-span-5 glass-strong p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <h2 className="font-condensed font-black text-xl text-white tracking-wider">
              ISSUE OPERATIONAL WARNING
            </h2>
            <span className="font-mono text-[10px] text-red-400 uppercase">Live Broadcast</span>
          </div>

          {formSuccess && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
              ✓ {formSuccess}
            </div>
          )}
          {formError && (
            <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs">
              ⚠ {formError}
            </div>
          )}

          <form onSubmit={handleCreateWarning} className="space-y-4">
            <div>
              <label className="block font-mono text-[11px] text-white/40 uppercase mb-1">
                WARNING TITLE / HEADLINE
              </label>
              <input
                type="text"
                placeholder="e.g. FLASH FLOOD EMERGENCY: LOWER SECTOR EVACUATION"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white focus:border-red-500/50 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] text-white/40 uppercase mb-1">
                  SEVERITY LEVEL
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-black/80 border border-white/10 text-white focus:border-red-500/50 outline-none"
                >
                  <option value="CRITICAL">CRITICAL (LEVEL 1)</option>
                  <option value="WARNING">WARNING (LEVEL 2)</option>
                  <option value="ADVISORY">ADVISORY (LEVEL 3)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] text-white/40 uppercase mb-1">
                  WARNING CATEGORY
                </label>
                <select
                  value={warningType}
                  onChange={(e) => setWarningType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-black/80 border border-white/10 text-white focus:border-red-500/50 outline-none"
                >
                  <option value="EVACUATION">EVACUATION</option>
                  <option value="SHELTER_IN_PLACE">SHELTER IN PLACE</option>
                  <option value="FLASH_FLOOD">FLASH FLOOD</option>
                  <option value="WILDFIRE">WILDFIRE</option>
                  <option value="STRUCTURAL">STRUCTURAL THREAT</option>
                  <option value="HAZMAT">HAZMAT / CHEMICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-white/40 uppercase mb-1">
                AFFECTED JURISDICTION / REGION
              </label>
              <input
                type="text"
                value={affectedRegion}
                onChange={(e) => setAffectedRegion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white focus:border-red-500/50 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] text-white/40 uppercase mb-1">
                  EPICENTER LATITUDE
                </label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white focus:border-red-500/50 outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-[11px] text-white/40 uppercase mb-1">
                  EPICENTER LONGITUDE
                </label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white focus:border-red-500/50 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[11px] text-white/40 uppercase mb-1">
                BROADCAST DIRECTIVE / INSTRUCTIONS
              </label>
              <textarea
                rows={4}
                placeholder="Specific civilian action commands: Evacuate along designated North corridor. Do not attempt to cross flooded roadways..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-white/5 border border-white/10 text-white focus:border-red-500/50 outline-none resize-none"
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl font-condensed font-black text-sm tracking-widest bg-red-600 hover:bg-red-500 text-white border border-red-400/40 transition-all shadow-lg shadow-red-950/50"
              whileTap={{ scale: 0.98 }}
            >
              {submitting ? 'TRANSMITTING BROADCAST...' : 'TRANSMIT ACTIVE WARNING'}
            </motion.button>
          </form>
        </div>

        {/* Right Column: Active Warnings List (7 cols) */}
        <div className="lg:col-span-7 glass-strong p-6 rounded-2xl border border-white/10">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
            <h2 className="font-condensed font-black text-xl text-white tracking-wider">
              ACTIVE TRANSMITTED WARNINGS ({alerts.length})
            </h2>
            <span className="font-mono text-[10px] text-emerald-400">PostgreSQL Live State</span>
          </div>

          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {alerts.length === 0 && !loading ? (
              <div className="p-8 text-center border border-white/5 rounded-xl">
                <div className="font-condensed font-bold text-lg text-white/40">NO ACTIVE WARNINGS</div>
                <p className="font-mono text-xs text-white/30 mt-1">
                  All sectors currently operating under normal baseline safety protocol.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const isCritical = alert.severity?.toUpperCase() === 'CRITICAL';
                const createdDate = new Date(alert.created_at).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border transition-all ${
                      isCritical
                        ? 'bg-red-950/20 border-red-500/40'
                        : 'bg-amber-950/15 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
                              isCritical ? 'bg-red-500 text-black' : 'bg-amber-500 text-black'
                            }`}
                          >
                            {alert.severity?.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs text-white/40">
                            {alert.warning_type || alert.type || 'THREAT'}
                          </span>
                        </div>
                        <h3 className="font-condensed font-black text-base text-white mt-1 tracking-wide">
                          {alert.title}
                        </h3>
                      </div>

                      <button
                        onClick={() => handleDeactivate(alert.id)}
                        className="px-2.5 py-1 rounded font-mono text-[10px] text-white/40 hover:text-red-400 hover:bg-white/5 border border-white/10 transition-colors"
                        title="Deactivate this warning"
                      >
                        DEACTIVATE ✕
                      </button>
                    </div>

                    <p className="font-mono text-xs text-white/70 leading-relaxed mb-3">
                      {alert.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 font-mono text-[10px] text-white/40">
                      <span>Region: <strong className="text-white/70">{alert.affected_region || 'Sector Core'}</strong></span>
                      <span>Issued: {createdDate}</span>
                      <span>ID: {alert.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
