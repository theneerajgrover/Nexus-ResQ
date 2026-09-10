import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router';
import { resourcesApi, sheltersApi } from '../../api';
import ReportIncidentModal from '../../components/incident/ReportIncidentModal';

type Section = 'overview' | 'shelters' | 'supplies' | 'ambulances' | 'equipment' | 'dispatches';

// ── Data — loaded from PostgreSQL via API, no hardcoded defaults ─────────────

// ── Shared styles ─────────────────────────────────────────────────────────────
const sectionColor: Record<Section, string> = {
  overview: '#10b981', shelters: '#06b6d4', supplies: '#f59e0b',
  ambulances: '#dc2626', equipment: '#f97316', dispatches: '#a855f7',
};

const dispatchStatusColors: Record<string, string> = {
  DISPATCHED: '#06b6d4', DELIVERED: '#10b981', PENDING: '#f59e0b',
};

const ambulanceStatusColors: Record<string, string> = {
  AVAILABLE: '#10b981', DISPATCHED: '#dc2626', RETURNING: '#f59e0b', MAINTENANCE: '#6b7280',
};
const equipStatusColors: Record<string, string> = {
  AVAILABLE: '#10b981', PARTIAL: '#f59e0b', DEPLETED: '#dc2626',
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
      <motion.div className="h-full rounded-full" style={{ background: color }}
        initial={{ width: 0 }} animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
        transition={{ duration: 0.7, delay: 0.1 }} />
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────
function OverviewTab({
  suppliesData = [],
  sheltersData = [],
  ambulancesData = [],
  dispatchesData = [],
  emergencyStatus,
  onRestore,
  restoring,
}: {
  suppliesData?: any[];
  sheltersData?: any[];
  ambulancesData?: any[];
  dispatchesData?: any[];
  emergencyStatus?: any;
  onRestore?: () => void;
  restoring?: boolean;
} = {}) {
  const shortages = suppliesData.filter((s) => s.qty < s.demand).length;
  const nearFull = sheltersData.filter((s) => s.status === 'NEAR FULL').length;
  const availAmbs = ambulancesData.filter((a) => a.status === 'AVAILABLE').length;
  const pendingDispatches = dispatchesData.filter((d) => d.status === 'PENDING').length;

  const kpis = [
    { label: 'SUPPLY SHORTAGES', value: shortages, color: shortages > 0 ? '#dc2626' : '#10b981', sub: 'items below demand' },
    { label: 'SHELTERS NEAR FULL', value: nearFull, color: nearFull > 0 ? '#f59e0b' : '#10b981', sub: 'capacity warning' },
    { label: 'AMBULANCES AVAILABLE', value: availAmbs, color: availAmbs < 2 ? '#dc2626' : '#10b981', sub: `of ${ambulancesData.length} total` },
    { label: 'PENDING DISPATCHES', value: pendingDispatches, color: pendingDispatches > 0 ? '#a855f7' : '#10b981', sub: 'awaiting resource movement' },
  ];

  const warnings = [
    { label: 'SHL-03 Metro Complex', warn: 'NEAR FULL — 89 places remain', color: '#dc2626' },
    { label: 'SUP-MED-01 Trauma Kits', warn: 'SHORTAGE — 140 unit deficit', color: '#dc2626' },
    { label: 'SUP-FOO-03 Rations', warn: 'SHORTAGE — 400 pack deficit', color: '#f59e0b' },
    { label: 'EQP-05 Water Pumps', warn: 'FULLY DEPLOYED — none available', color: '#f59e0b' },
  ];

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {/* Active Self-Emergency Alert Banner */}
      {emergencyStatus?.isAffected && emergencyStatus?.activeEmergency && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl flex items-center justify-between gap-4 shrink-0"
          style={{
            background: 'linear-gradient(90deg, rgba(220,38,38,0.15) 0%, rgba(245,158,11,0.08) 100%)',
            border: '1px solid rgba(220,38,38,0.4)',
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-bold text-lg shrink-0 mt-0.5">
              ⚠
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold tracking-wider">
                  FACILITY EMERGENCY: {emergencyStatus.activeEmergency.emergency_type} ({emergencyStatus.activeEmergency.severity})
                </span>
                <span className="font-mono text-xs text-white/50">
                  LOCATION: {emergencyStatus.activeEmergency.location}
                </span>
              </div>
              <div className="text-white text-xs mt-1 font-condensed font-medium">
                {emergencyStatus.activeEmergency.description}
              </div>
              <div className="flex items-center gap-4 mt-2 font-mono text-xs text-white/50 flex-wrap">
                <div>
                  REQUESTED AID: <span className="text-amber-400 font-bold">{emergencyStatus.activeEmergency.requested_quantity} {emergencyStatus.activeEmergency.requested_resource_type || 'units'}</span>
                </div>
                <div>•</div>
                <div>
                  LOCAL RESERVES LOCKED: <span className="text-red-400 font-bold">{emergencyStatus.activeEmergency.reserved_local_quantity} units</span>
                </div>
                <div>•</div>
                <div className="text-amber-300/80">
                  External transfer safeguard active
                </div>
              </div>
            </div>
          </div>
          {onRestore && (
            <motion.button
              onClick={onRestore}
              disabled={restoring}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="font-condensed font-bold text-xs px-4 py-2 rounded-lg shrink-0 flex items-center gap-2"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)' }}
            >
              <span>✓</span>
              {restoring ? 'RESTORING...' : 'RESTORE STATUS'}
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Main Grid: KPI + Right panel */}
      <div className="flex-1 flex gap-5 overflow-hidden">
        {/* KPI grid */}
        <div className="grid grid-cols-2 grid-rows-2 gap-4 w-96 shrink-0">
          {kpis.map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="p-4 rounded-xl flex flex-col justify-between"
              style={{ background: 'rgba(15,19,25,0.8)', border: `1px solid ${k.color}22` }}>
              <div className="font-mono text-xs text-white/35 mb-1">{k.label}</div>
              <div className="font-condensed font-black text-4xl" style={{ color: k.color }}>{k.value}</div>
              <div className="font-mono text-xs text-white/25 mt-1">{k.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Right panel: warnings + supply bars */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Urgent warnings */}
          <div className="p-4 rounded-xl space-y-2 shrink-0" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.18)' }}>
            <div className="font-mono text-xs tracking-widest text-red-400 mb-2">CAPACITY WARNINGS</div>
            {warnings.map((w) => (
              <div key={w.label} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: w.color }} />
                <div className="font-condensed font-bold text-xs text-white flex-1">{w.label}</div>
                <div className="font-mono text-xs ml-auto shrink-0" style={{ color: w.color }}>{w.warn}</div>
              </div>
            ))}
          </div>

          {/* Supply bars */}
          <div className="flex-1 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="font-mono text-xs tracking-widest text-white/30 mb-4">SUPPLY vs DEMAND</div>
            <div className="space-y-4">
              {suppliesData.map((s) => {
                const isShort = s.qty < s.demand;
                const color = isShort ? '#dc2626' : '#10b981';
                const pct = Math.round(Math.min((s.qty / (s.demand || 1)) * 100, 100));
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="font-condensed font-semibold text-xs text-white">{s.name}</div>
                      <div className="font-mono text-xs" style={{ color }}>{pct}% · {s.qty.toLocaleString()} / {s.demand.toLocaleString()} {s.unit}</div>
                    </div>
                    <Bar value={s.qty} max={s.demand} color={color} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeclareEmergencyModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (values: {
    location: string;
    emergencyType: string;
    severity: string;
    description: string;
    requestedResourceType: string;
    requestedQuantity: number;
    reservedLocalQuantity: number;
  }) => Promise<void>;
}) {
  const [location, setLocation] = useState('Regional Logistics Hub West');
  const [emergencyType, setEmergencyType] = useState('FLOOD');
  const [severity, setSeverity] = useState('CRITICAL');
  const [description, setDescription] = useState('');
  const [requestedResourceType, setRequestedResourceType] = useState('WATER_PUMPS');
  const [requestedQuantity, setRequestedQuantity] = useState('10');
  const [reservedLocalQuantity, setReservedLocalQuantity] = useState('15');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!location.trim()) {
      setError('Location is required.');
      return;
    }
    if (!description.trim() || description.trim().length < 5) {
      setError('Please provide a description (min 5 characters).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        location: location.trim(),
        emergencyType: emergencyType.trim(),
        severity,
        description: description.trim(),
        requestedResourceType: requestedResourceType.trim(),
        requestedQuantity: parseInt(requestedQuantity, 10) || 0,
        reservedLocalQuantity: parseInt(reservedLocalQuantity, 10) || 0,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to declare emergency.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(8,11,15,0.85)', backdropFilter: 'blur(6px)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#0d1017', border: '1px solid rgba(220,38,38,0.4)', boxShadow: '0 0 60px rgba(220,38,38,0.15)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'rgba(220,38,38,0.1)', borderBottom: '1px solid rgba(220,38,38,0.25)' }}>
          <div className="flex items-center gap-2.5">
            <span className="text-red-400 font-bold text-lg">⚠</span>
            <div className="font-condensed font-black text-lg text-white">DECLARE FACILITY SELF-EMERGENCY</div>
          </div>
          <button onClick={onClose} className="font-mono text-xs text-white/30 hover:text-white/60">✕</button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-xs tracking-widest text-white/40 mb-1.5">FACILITY LOCATION</div>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Regional Logistics Hub West"
                className="w-full px-4 py-2 rounded-lg font-mono text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
              />
            </div>

            <div>
              <div className="font-mono text-xs tracking-widest text-white/40 mb-1.5">EMERGENCY TYPE</div>
              <select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg font-mono text-xs"
                style={{ background: '#131822', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
              >
                <option value="FLOOD">FLOOD</option>
                <option value="FIRE">FIRE</option>
                <option value="EARTHQUAKE">EARTHQUAKE</option>
                <option value="STRUCTURAL DAMAGE">STRUCTURAL DAMAGE</option>
                <option value="MEDICAL EMERGENCY">MEDICAL EMERGENCY</option>
                <option value="POWER FAILURE">POWER FAILURE</option>
                <option value="SECURITY HAZARD">SECURITY HAZARD</option>
              </select>
            </div>
          </div>

          <div>
            <div className="font-mono text-xs tracking-widest text-white/40 mb-1.5">SEVERITY LEVEL</div>
            <div className="flex gap-3">
              {['CRITICAL', 'HIGH', 'MODERATE'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`flex-1 py-1.5 rounded-lg font-mono text-xs font-bold transition-colors ${
                    severity === s
                      ? s === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                      : s === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                      : 'bg-white/[0.04] text-white/40 border border-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-xs tracking-widest text-white/40 mb-1.5">EMERGENCY DESCRIPTION</div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the nature of the emergency, current impact on facility operations, and immediate hazards..."
              className="w-full px-4 py-2 rounded-lg font-mono text-xs"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-mono text-xs tracking-widest text-white/40 mb-1.5">REQUESTED RESOURCE</div>
              <input
                type="text"
                value={requestedResourceType}
                onChange={(e) => setRequestedResourceType(e.target.value)}
                placeholder="e.g. WATER_PUMPS, MEDICINE"
                className="w-full px-4 py-2 rounded-lg font-mono text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
              />
            </div>

            <div>
              <div className="font-mono text-xs tracking-widest text-white/40 mb-1.5">REQUESTED QUANTITY</div>
              <input
                type="number"
                value={requestedQuantity}
                onChange={(e) => setRequestedQuantity(e.target.value)}
                placeholder="e.g. 10"
                className="w-full px-4 py-2 rounded-lg font-mono text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="font-mono text-xs tracking-widest text-red-400 font-semibold">RESERVED LOCAL QUANTITY (LOCK)</div>
              <div className="font-mono text-[11px] text-white/30">Safeguards local inventory</div>
            </div>
            <input
              type="number"
              value={reservedLocalQuantity}
              onChange={(e) => setReservedLocalQuantity(e.target.value)}
              placeholder="e.g. 15"
              className="w-full px-4 py-2 rounded-lg font-mono text-xs"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5', outline: 'none' }}
            />
            <div className="font-mono text-[11px] text-white/35 mt-1">
              * Units reserved for on-site operations. External dispatch transfers exceeding remaining stock will be blocked.
            </div>
          </div>

          {error && (
            <div className="font-mono text-xs text-red-400 pt-1">{error}</div>
          )}

          <div className="flex gap-3 pt-2">
            <motion.button
              className="flex-1 py-3 rounded-xl font-condensed font-black text-sm tracking-widest"
              style={{ background: saving ? '#6b7280' : '#dc2626', color: 'white' }}
              whileHover={saving ? {} : { scale: 1.02 }}
              whileTap={saving ? {} : { scale: 0.97 }}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'TRANSMITTING ALERT...' : 'BROADCAST EMERGENCY & REQUEST AID'}
            </motion.button>
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl font-condensed font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AddNewModal({ title, fields, onClose, onSubmit }: { title: string; fields: { label: string; key: string; type: string; placeholder: string }[]; onClose: () => void; onSubmit: (values: Record<string, string>) => Promise<void> }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(8,11,15,0.85)', backdropFilter: 'blur(6px)' }}>
      <motion.div initial={{ opacity: 0, scale: 0.93, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0d1017', border: '1px solid rgba(16,185,129,0.35)', boxShadow: '0 0 60px rgba(16,185,129,0.1)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'rgba(16,185,129,0.08)', borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="font-condensed font-black text-lg text-white">{title}</div>
          <button onClick={onClose} className="font-mono text-xs text-white/30 hover:text-white/60">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <div className="font-mono text-xs tracking-widest text-white/40 mb-1.5">{f.label}</div>
              <input type={f.type} placeholder={f.placeholder}
                value={values[f.key] || ''}
                onChange={(e) => setValues((p) => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg font-mono text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }} />
            </div>
          ))}
          {error && (
            <div className="font-mono text-xs text-red-400 pt-1">{error}</div>
          )}
          <div className="flex gap-3 pt-1">
            <motion.button
              className="flex-1 py-3 rounded-xl font-condensed font-black text-sm tracking-widest"
              style={{ background: saving ? '#6b7280' : '#10b981', color: '#080b0f' }}
              whileHover={saving ? {} : { scale: 1.02 }} whileTap={saving ? {} : { scale: 0.97 }}
              onClick={handleSubmit}
              disabled={saving}>
              {saving ? 'SAVING...' : 'ADD RECORD'}
            </motion.button>
            <button onClick={onClose} className="px-5 py-3 rounded-xl font-condensed font-bold text-sm"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}>
              CANCEL
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function SheltersTab({
  sheltersData = [],
  onUpdateShelter,
  onRefresh,
  onReportIncident,
}: {
  sheltersData?: any[];
  onUpdateShelter?: (id: string, cap: number, occ: number) => Promise<any>;
  onRefresh?: () => void;
  onReportIncident?: (shelter: any) => void;
} = {}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [tempCap, setTempCap] = useState<Record<string, number>>({});
  const [tempOcc, setTempOcc] = useState<Record<string, number>>({});
  const [editError, setEditError] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleSaveShelter = async (s: any) => {
    const cap = tempCap[s.id] !== undefined ? tempCap[s.id] : s.capacity;
    const occ = tempOcc[s.id] !== undefined ? tempOcc[s.id] : s.occupancy;
    if (cap < occ) {
      setEditError((p) => ({
        ...p,
        [s.id]: `Capacity cannot be reduced below ${occ} — ${occ} places are currently occupied.`,
      }));
      return;
    }
    setSaving((p) => ({ ...p, [s.id]: true }));
    setEditError((p) => ({ ...p, [s.id]: null }));
    try {
      if (onUpdateShelter) {
        await onUpdateShelter(s.id, cap, occ);
      }
      setEditing(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update shelter capacity.';
      setEditError((p) => ({ ...p, [s.id]: msg }));
    } finally {
      setSaving((p) => ({ ...p, [s.id]: false }));
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="font-mono text-xs tracking-widest text-white/30">SHELTER RECORDS — {sheltersData.length}</div>
        <motion.button onClick={() => setShowAdd(true)}
          className="font-condensed font-bold text-xs px-4 py-1.5 rounded-lg"
          style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          + ADD SHELTER
        </motion.button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-4 content-start overflow-y-auto">
        {sheltersData.map((s, i) => {
          const pct = Math.round(((s.occupancy || 0) / (s.capacity || 1)) * 100);
          const statusColor = s.status === 'NEAR FULL' ? '#dc2626' : s.status === 'ACTIVATING' ? '#f59e0b' : '#10b981';
          const facilities = Array.isArray(s.facilities) ? s.facilities : ['Food', 'Water', 'Medical'];
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="p-5 rounded-xl"
              style={{ background: 'rgba(15,19,25,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: `${statusColor}18`, color: statusColor }}>{s.status}</div>
                    {s.accessible && <div className="font-mono text-xs text-white/30">♿</div>}
                  </div>
                  <div className="font-condensed font-black text-base text-white">{s.name}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="font-condensed font-black text-3xl" style={{ color: statusColor }}>{pct}%</div>
                  <div className="font-mono text-xs text-white/30">occupied</div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Bar value={s.occupancy || 0} max={s.capacity || 1} color={statusColor} />
                <div className="font-mono text-xs shrink-0" style={{ color: statusColor }}>{s.occupancy}/{s.capacity}</div>
              </div>
              <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                {facilities.map((f: string) => (
                  <div key={f} className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4' }}>{f}</div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditing(editing === s.id ? null : s.id);
                    setEditError((p) => ({ ...p, [s.id]: null }));
                  }}
                  className="flex-1 font-condensed font-bold text-xs px-3 py-1.5 rounded transition-all duration-200 cursor-pointer"
                  style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
                  {editing === s.id ? 'CANCEL' : 'UPDATE CAPACITY'}
                </button>
                <button
                  type="button"
                  onClick={() => onReportIncident?.(s)}
                  className="font-condensed font-bold text-xs px-3 py-1.5 rounded transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                  style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                  title={`Report incident at ${s.name}`}
                >
                  <span>📢</span>
                  REPORT INCIDENT
                </button>
              </div>
              <AnimatePresence>
                {editing === s.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-white/5 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {['Capacity', 'Occupancy'].map((field) => (
                        <div key={field}>
                          <div className="font-mono text-xs text-white/30 mb-1">{field.toUpperCase()}</div>
                          <input type="number"
                            defaultValue={field === 'Capacity' ? s.capacity : s.occupancy}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              if (field === 'Capacity') setTempCap((p) => ({ ...p, [s.id]: val }));
                              else setTempOcc((p) => ({ ...p, [s.id]: val }));
                            }}
                            className="w-full px-3 py-2 rounded font-mono text-sm"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }} />
                        </div>
                      ))}
                    </div>
                    <div className="font-mono text-[11px] text-white/30">
                      * Capacity cannot be lower than occupancy ({s.occupancy || 0})
                    </div>
                    {editError[s.id] && (
                      <div className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1.5 rounded">
                        ⚠ {editError[s.id]}
                      </div>
                    )}
                    <button
                      disabled={saving[s.id]}
                      className="w-full py-2 rounded font-condensed font-bold text-sm tracking-widest cursor-pointer"
                      style={{ background: saving[s.id] ? '#6b7280' : '#10b981', color: '#080b0f' }}
                      onClick={() => handleSaveShelter(s)}>
                      {saving[s.id] ? 'SAVING...' : 'SAVE UPDATE'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>
        {showAdd && (
          <AddNewModal title="ADD SHELTER" onClose={() => setShowAdd(false)} fields={[
            { label: 'SHELTER NAME', key: 'name', type: 'text', placeholder: 'e.g. East Community Hall' },
            { label: 'CAPACITY', key: 'capacity', type: 'number', placeholder: 'e.g. 400' },
            { label: 'CURRENT OCCUPANCY', key: 'occupancy', type: 'number', placeholder: '0' },
            { label: 'STATUS', key: 'status', type: 'text', placeholder: 'OPEN / ACTIVATING / NEAR FULL' },
          ]} onSubmit={async (v) => {
            await sheltersApi.create({ name: v.name, capacity: parseInt(v.capacity) || 0, occupancy: parseInt(v.occupancy) || 0, status: v.status || undefined });
            if (onRefresh) onRefresh();
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function SuppliesTab({ suppliesData = [], onRefresh }: { suppliesData?: any[]; onRefresh?: () => void } = {}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [tempQty, setTempQty] = useState<Record<string, number>>({});
  const [editError, setEditError] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleSaveSupply = async (s: any) => {
    const newQty = tempQty[s.id] !== undefined ? tempQty[s.id] : s.qty;
    const allocated = s.allocated || 0;
    if (newQty < allocated) {
      setEditError((p) => ({
        ...p,
        [s.id]: `Cannot reduce quantity below ${allocated} — ${allocated} ${s.unit || 'units'} are already allocated/committed.`,
      }));
      return;
    }
    setSaving((p) => ({ ...p, [s.id]: true }));
    setEditError((p) => ({ ...p, [s.id]: null }));
    try {
      await resourcesApi.updateSupply(s.id, { qty: newQty });
      if (onRefresh) onRefresh();
      setEditing(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update supply quantity.';
      setEditError((p) => ({ ...p, [s.id]: msg }));
    } finally {
      setSaving((p) => ({ ...p, [s.id]: false }));
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="font-mono text-xs tracking-widest text-white/30">SUPPLY RECORDS — {suppliesData.length}</div>
        <motion.button onClick={() => setShowAdd(true)}
          className="font-condensed font-bold text-xs px-4 py-1.5 rounded-lg"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          + ADD SUPPLY
        </motion.button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-4 content-start overflow-y-auto">
        {suppliesData.map((s, i) => {
          const isShort = s.qty < s.demand;
          const color = isShort ? '#dc2626' : '#10b981';
          const pct = Math.min((s.qty / (s.demand || 1)) * 100, 100);
          const allocated = s.allocated || 0;
          const available = s.available !== undefined ? s.available : Math.max(0, s.qty - allocated);

          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="p-5 rounded-xl"
              style={{ background: isShort ? 'rgba(220,38,38,0.05)' : 'rgba(15,19,25,0.8)', border: `1px solid ${isShort ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>{s.category}</div>
                    {isShort && <div className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>SHORTAGE</div>}
                  </div>
                  <div className="font-condensed font-black text-base text-white leading-tight">{s.name}</div>
                  <div className="font-mono text-xs text-white/35 mt-0.5">{s.location}</div>
                </div>
                <div className="w-12 h-12 relative shrink-0">
                  <svg width="48" height="48" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="3.5"
                      strokeDasharray={`${(pct / 100) * 125.7} 125.7`} strokeLinecap="round" transform="rotate(-90 24 24)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-condensed font-black" style={{ color, fontSize: '11px' }}>
                    {Math.round(pct)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Bar value={s.qty} max={s.demand} color={color} />
                <div className="font-mono text-xs shrink-0" style={{ color }}>{s.qty.toLocaleString()}/{s.demand.toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-white/25">synced {s.lastSync || 'recently'}</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(editing === s.id ? null : s.id);
                      setEditError((p) => ({ ...p, [s.id]: null }));
                    }}
                    className="font-condensed font-bold text-xs px-3 py-1.5 rounded transition-all duration-200 cursor-pointer"
                    style={{ background: 'rgba(245,158,11,0.08)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    {editing === s.id ? 'CANCEL' : 'UPDATE QUANTITY'}
                  </button>
                  <button className="font-condensed font-bold text-xs px-3 py-1.5 rounded transition-all duration-200"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}33` }}>
                    ALLOCATE
                  </button>
                </div>
              </div>
              <AnimatePresence>
                {editing === s.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between font-mono text-xs text-white/40">
                      <span>COMMITTED: <strong className="text-amber-400">{allocated} {s.unit}</strong></span>
                      <span>AVAILABLE: <strong className="text-emerald-400">{available} {s.unit}</strong></span>
                    </div>
                    <div>
                      <div className="font-mono text-xs text-white/30 mb-1">TOTAL QUANTITY ({s.unit?.toUpperCase() || 'UNITS'})</div>
                      <input
                        type="number"
                        defaultValue={s.qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setTempQty((p) => ({ ...p, [s.id]: val }));
                        }}
                        className="w-full px-3 py-2 rounded font-mono text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                      />
                      <div className="font-mono text-[11px] text-white/30 mt-1">
                        * Cannot be lower than currently allocated ({allocated} {s.unit})
                      </div>
                    </div>
                    {editError[s.id] && (
                      <div className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1.5 rounded">
                        ⚠ {editError[s.id]}
                      </div>
                    )}
                    <button
                      disabled={saving[s.id]}
                      onClick={() => handleSaveSupply(s)}
                      className="w-full py-2 rounded font-condensed font-bold text-sm tracking-widest cursor-pointer"
                      style={{ background: saving[s.id] ? '#6b7280' : '#10b981', color: '#080b0f' }}
                    >
                      {saving[s.id] ? 'SAVING...' : 'SAVE QUANTITY UPDATE'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>
        {showAdd && (
          <AddNewModal title="ADD SUPPLY" onClose={() => setShowAdd(false)} fields={[
            { label: 'RESOURCE NAME', key: 'name', type: 'text', placeholder: 'e.g. Blankets' },
            { label: 'CATEGORY', key: 'category', type: 'text', placeholder: 'MEDICAL / FOOD / WATER / SAFETY' },
            { label: 'QUANTITY', key: 'qty', type: 'number', placeholder: 'e.g. 500' },
            { label: 'LOCATION', key: 'location', type: 'text', placeholder: 'e.g. Depot North' },
          ]} onSubmit={async (v) => {
            await resourcesApi.createSupply({ name: v.name, category: v.category, qty: parseInt(v.qty) || 0, unit: 'units', location: v.location });
            if (onRefresh) onRefresh();
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function AmbulancesTab({ ambulancesData = [], onRefresh }: { ambulancesData?: any[]; onRefresh?: () => void } = {}) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="font-mono text-xs tracking-widest text-white/30">AMBULANCE RECORDS — {ambulancesData.length}</div>
        <motion.button onClick={() => setShowAdd(true)}
          className="font-condensed font-bold text-xs px-4 py-1.5 rounded-lg"
          style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)' }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          + ADD AMBULANCE
        </motion.button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-4 content-start overflow-y-auto">
        {ambulancesData.map((a, i) => {
          const color = ambulanceStatusColors[a.status] || '#6b7280';
          return (
            <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="p-5 rounded-xl"
              style={{ background: 'rgba(15,19,25,0.8)', border: `1px solid ${color}22` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}33` }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="8" width="20" height="10" rx="2" stroke={color} strokeWidth="1.5" />
                    <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="1.5" />
                    <circle cx="7" cy="18" r="2" stroke={color} strokeWidth="1.5" />
                    <circle cx="17" cy="18" r="2" stroke={color} strokeWidth="1.5" />
                    <path d="M10 12h4M12 10v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-condensed font-black text-base text-white">{a.callsign || a.name || a.id}</div>
                  <div className="font-mono text-xs text-white/40">{a.location}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-mono text-xs text-white/30 mb-0.5">CREW</div>
                  <div className="font-condensed font-bold text-2xl text-white">{a.crew || 2}</div>
                </div>
                <div className="font-mono text-xs px-3 py-1.5 rounded tracking-widest"
                  style={{ background: `${color}15`, color, border: `1px solid ${color}33` }}>
                  {a.status}
                </div>
              </div>
              <div className="font-mono text-xs text-white/25 pt-2 border-t border-white/[0.04]">
                Updated {a.lastUpdate || 'recently'}
              </div>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>
        {showAdd && (
          <AddNewModal title="ADD AMBULANCE" onClose={() => setShowAdd(false)} fields={[
            { label: 'CALLSIGN', key: 'callsign', type: 'text', placeholder: 'e.g. MEDIC 31' },
            { label: 'CREW SIZE', key: 'crew', type: 'number', placeholder: 'e.g. 2' },
            { label: 'HOME STATION', key: 'location', type: 'text', placeholder: 'e.g. Station 4' },
            { label: 'STATUS', key: 'status', type: 'text', placeholder: 'AVAILABLE / MAINTENANCE' },
          ]} onSubmit={async (v) => {
            await resourcesApi.createAmbulance({ callsign: v.callsign, crew: parseInt(v.crew) || 2, status: v.status || 'AVAILABLE', location: v.location });
            if (onRefresh) onRefresh();
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function EquipmentTab({ equipmentData = [], onRefresh }: { equipmentData?: any[]; onRefresh?: () => void } = {}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [tempQty, setTempQty] = useState<Record<string, number>>({});
  const [editError, setEditError] = useState<Record<string, string | null>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleSaveEquipment = async (e: any) => {
    const newQty = tempQty[e.id] !== undefined ? tempQty[e.id] : e.qty;
    const allocated = Math.max(0, e.qty - e.available);
    if (newQty < allocated) {
      setEditError((p) => ({
        ...p,
        [e.id]: `Cannot reduce quantity below ${allocated} — ${allocated} units are currently allocated/in use.`,
      }));
      return;
    }
    setSaving((p) => ({ ...p, [e.id]: true }));
    setEditError((p) => ({ ...p, [e.id]: null }));
    try {
      await resourcesApi.updateEquipment(e.id, { qty: newQty });
      if (onRefresh) onRefresh();
      setEditing(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update equipment quantity.';
      setEditError((p) => ({ ...p, [e.id]: msg }));
    } finally {
      setSaving((p) => ({ ...p, [e.id]: false }));
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="font-mono text-xs tracking-widest text-white/30">EQUIPMENT RECORDS — {equipmentData.length}</div>
        <motion.button onClick={() => setShowAdd(true)}
          className="font-condensed font-bold text-xs px-4 py-1.5 rounded-lg"
          style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', border: '1px solid rgba(249,115,22,0.3)' }}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          + ADD EQUIPMENT
        </motion.button>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-4 content-start overflow-y-auto">
        {equipmentData.map((e, i) => {
          const color = equipStatusColors[e.status] || '#6b7280';
          const pct = Math.round((e.available / (e.qty || 1)) * 100);
          const allocated = Math.max(0, e.qty - e.available);
          return (
            <motion.div key={e.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="p-5 rounded-xl"
              style={{ background: 'rgba(15,19,25,0.8)', border: `1px solid ${color}22` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>{e.status}</div>
                <div className="font-condensed font-black text-2xl" style={{ color }}>{e.available}/{e.qty}</div>
              </div>
              <div className="font-condensed font-bold text-sm text-white mb-1">{e.name}</div>
              <div className="font-mono text-xs text-white/35 mb-4">{e.location}</div>
              <div className="flex items-center gap-2 mb-3">
                <Bar value={e.available} max={e.qty || 1} color={color} />
                <div className="font-mono text-xs text-white/30 shrink-0">{pct}%</div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="font-mono text-xs text-white/30">
                  Allocated: <strong className="text-amber-400">{allocated}</strong>
                </div>
                <button
                  onClick={() => {
                    setEditing(editing === e.id ? null : e.id);
                    setEditError((p) => ({ ...p, [e.id]: null }));
                  }}
                  className="font-condensed font-bold text-xs px-3 py-1 rounded transition-all duration-200 cursor-pointer"
                  style={{ background: 'rgba(249,115,22,0.08)', color: '#f97316', border: '1px solid rgba(249,115,22,0.2)' }}
                >
                  {editing === e.id ? 'CANCEL' : 'UPDATE QUANTITY'}
                </button>
              </div>
              <AnimatePresence>
                {editing === e.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-2 border-t border-white/5 space-y-2">
                    <div>
                      <div className="font-mono text-xs text-white/30 mb-1">TOTAL QUANTITY</div>
                      <input
                        type="number"
                        defaultValue={e.qty}
                        onChange={(ev) => {
                          const val = parseInt(ev.target.value, 10) || 0;
                          setTempQty((p) => ({ ...p, [e.id]: val }));
                        }}
                        className="w-full px-3 py-2 rounded font-mono text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                      />
                      <div className="font-mono text-[11px] text-white/30 mt-1">
                        * Cannot be lower than in-use units ({allocated})
                      </div>
                    </div>
                    {editError[e.id] && (
                      <div className="font-mono text-xs text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1.5 rounded">
                        ⚠ {editError[e.id]}
                      </div>
                    )}
                    <button
                      disabled={saving[e.id]}
                      onClick={() => handleSaveEquipment(e)}
                      className="w-full py-2 rounded font-condensed font-bold text-sm tracking-widest cursor-pointer"
                      style={{ background: saving[e.id] ? '#6b7280' : '#10b981', color: '#080b0f' }}
                    >
                      {saving[e.id] ? 'SAVING...' : 'SAVE QUANTITY UPDATE'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>
        {showAdd && (
          <AddNewModal title="ADD EQUIPMENT" onClose={() => setShowAdd(false)} fields={[
            { label: 'EQUIPMENT NAME', key: 'name', type: 'text', placeholder: 'e.g. Defibrillators' },
            { label: 'TOTAL QUANTITY', key: 'qty', type: 'number', placeholder: 'e.g. 10' },
            { label: 'AVAILABLE', key: 'available', type: 'number', placeholder: 'e.g. 10' },
            { label: 'LOCATION', key: 'location', type: 'text', placeholder: 'e.g. Station 1' },
          ]} onSubmit={async (v) => {
            await resourcesApi.createEquipment({ name: v.name, qty: parseInt(v.qty) || 0, available: parseInt(v.available) || 0, location: v.location });
            if (onRefresh) onRefresh();
          }} />
        )}
      </AnimatePresence>
    </div>
  );
}

function DispatchRecordsTab({ dispatchesData = [] }: { dispatchesData?: any[] } = {}) {
  return (
    <div className="h-full space-y-3 overflow-y-auto">
      <div className="font-mono text-xs tracking-widest text-white/30 mb-1">
        APPROVED DISPATCH RECORDS — AUTHORITY / COMMAND
      </div>
      {dispatchesData.map((rec, i) => {
        const color = dispatchStatusColors[rec.status] || '#6b7280';
        return (
          <motion.div key={rec.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="p-4 rounded-xl"
            style={{ background: 'rgba(15,19,25,0.8)', border: `1px solid ${color}22` }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <div className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>{rec.status}</div>
                  <div className="font-mono text-xs text-white/30">{rec.id}</div>
                  <div className="font-mono text-xs text-white/20">{rec.timestamp}</div>
                </div>
                <div className="font-condensed font-black text-base text-white">{rec.resourceType}</div>
                <div className="font-mono text-xs text-white/40">{rec.unit} → {rec.destination}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-xs text-white/30 mb-0.5">APPROVED / DISPATCHED</div>
                <div className="font-condensed font-bold text-lg" style={{ color }}>
                  {rec.qtyApproved} / {rec.qtyDispatched}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 pt-3 border-t border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div className="font-mono text-xs text-white/25">INCIDENT</div>
                <div className="font-mono text-xs" style={{ color: '#dc2626' }}>{rec.incident}</div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <div className="font-mono text-xs text-white/25">APPROVED BY</div>
                <div className="font-mono text-xs text-white/50">{rec.approvedBy}</div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ResourceManagerHome() {
  const location = useLocation();
  const section: Section =
    location.pathname.startsWith('/resources/shelters') ? 'shelters' :
    location.pathname.startsWith('/resources/supplies') ? 'supplies' :
    location.pathname.startsWith('/resources/ambulances') ? 'ambulances' :
    location.pathname.startsWith('/resources/equipment') ? 'equipment' :
    location.pathname.startsWith('/resources/dispatches') ? 'dispatches' : 'overview';

  const [shelterList, setShelterList] = useState<any[]>([]);
  const [supplyList, setSupplyList] = useState<any[]>([]);
  const [ambulanceList, setAmbulanceList] = useState<any[]>([]);
  const [equipmentList, setEquipmentList] = useState<any[]>([]);
  const [dispatchList, setDispatchList] = useState<any[]>([]);
  const [emergencyStatus, setEmergencyStatus] = useState<any>(null);
  const [showDeclareModal, setShowDeclareModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedShelterForReport, setSelectedShelterForReport] = useState<any | null>(null);
  const [restoring, setRestoring] = useState(false);

  const refreshShelters = () => sheltersApi.getAll().then((r) => r.data && setShelterList(r.data)).catch(() => {});
  const refreshSupplies = () => resourcesApi.getSupplies().then((r) => r.data && setSupplyList(r.data)).catch(() => {});
  const refreshAmbulances = () => resourcesApi.getAmbulances().then((r) => r.data && setAmbulanceList(r.data)).catch(() => {});
  const refreshEquipment = () => resourcesApi.getEquipment().then((r) => r.data && setEquipmentList(r.data)).catch(() => {});
  const refreshDispatches = () => resourcesApi.getDispatches().then((r) => r.data && setDispatchList(r.data)).catch(() => {});
  const refreshEmergencyStatus = () =>
    resourcesApi
      .getEmergencyStatus()
      .then((r) => r.data && setEmergencyStatus(r.data))
      .catch(() => {});

  useEffect(() => {
    refreshShelters();
    refreshSupplies();
    refreshAmbulances();
    refreshEquipment();
    refreshDispatches();
    refreshEmergencyStatus();
  }, []);

  const handleDeclareEmergency = async (values: any) => {
    await resourcesApi.declareEmergency(values);
    await refreshEmergencyStatus();
    await refreshDispatches();
  };

  const handleRestoreStatus = async () => {
    setRestoring(true);
    try {
      await resourcesApi.restoreOperationalStatus();
      await refreshEmergencyStatus();
      await refreshDispatches();
    } catch (err) {
      console.error('Failed to restore operational status:', err);
    } finally {
      setRestoring(false);
    }
  };

  const handleUpdateShelter = async (id: string, cap: number, occ: number) => {
    const res = await sheltersApi.updateStatus(id, { capacity: cap, occupancy: occ });
    await refreshShelters();
    return res;
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <motion.div
        className="glass-strong shrink-0 flex items-center gap-6 px-6 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Title */}
        <div className="shrink-0">
          <div className="font-condensed font-black text-lg text-white leading-none">WHERE CAPACITY</div>
          <div className="font-condensed font-black text-lg leading-none" style={{ color: '#10b981' }}>IS FAILING</div>
        </div>

        {/* Status */}
        <div className="font-mono text-xs text-white/25 shrink-0">
          RESOURCE MGR · <span className="text-white/45">LIVE</span>
        </div>

        {/* Operational Status Badge */}
        {emergencyStatus?.isAffected ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 font-mono text-xs font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            EMERGENCY — RESOURCE REQUEST REQUIRED
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            OPERATIONAL
          </div>
        )}

        {/* Header Action Buttons */}
        <div className="ml-auto flex items-center gap-3">
          <motion.button
            onClick={() => {
              setSelectedShelterForReport(null);
              setShowReportModal(true);
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="font-condensed font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer"
            style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)' }}
          >
            <span>📢</span>
            REPORT INCIDENT
          </motion.button>

          {emergencyStatus?.isAffected ? (
            <motion.button
              onClick={handleRestoreStatus}
              disabled={restoring}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="font-condensed font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-2"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.35)' }}
            >
              <span>✓</span>
              {restoring ? 'RESTORING...' : 'RESTORE OPERATIONAL STATUS'}
            </motion.button>
          ) : (
            <motion.button
              onClick={() => setShowDeclareModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="font-condensed font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-2"
              style={{ background: 'rgba(220,38,38,0.15)', color: '#ef4444', border: '1px solid rgba(220,38,38,0.4)' }}
            >
              <span>⚠</span>
              DECLARE LOCATION EMERGENCY
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Content area — fills remaining height */}
      <div className="flex-1 overflow-hidden p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {section === 'overview' && (
              <OverviewTab
                suppliesData={supplyList}
                sheltersData={shelterList}
                ambulancesData={ambulanceList}
                dispatchesData={dispatchList}
                emergencyStatus={emergencyStatus}
                onRestore={handleRestoreStatus}
                restoring={restoring}
              />
            )}
            {section === 'shelters' && (
              <SheltersTab
                sheltersData={shelterList}
                onUpdateShelter={handleUpdateShelter}
                onRefresh={refreshShelters}
                onReportIncident={(shelter) => {
                  setSelectedShelterForReport(shelter);
                  setShowReportModal(true);
                }}
              />
            )}
            {section === 'supplies' && <SuppliesTab suppliesData={supplyList} onRefresh={refreshSupplies} />}
            {section === 'ambulances' && <AmbulancesTab ambulancesData={ambulanceList} onRefresh={refreshAmbulances} />}
            {section === 'equipment' && <EquipmentTab equipmentData={equipmentList} onRefresh={refreshEquipment} />}
            {section === 'dispatches' && <DispatchRecordsTab dispatchesData={dispatchList} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showDeclareModal && (
          <DeclareEmergencyModal
            onClose={() => setShowDeclareModal(false)}
            onSubmit={handleDeclareEmergency}
          />
        )}
      </AnimatePresence>

      <ReportIncidentModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedShelterForReport(null);
        }}
        onSuccess={() => {
          refreshShelters();
        }}
        sourceContext="RESOURCE_MANAGER"
        shelterId={selectedShelterForReport?.id || null}
        shelterName={selectedShelterForReport?.name || null}
        defaultLocation={selectedShelterForReport?.name || ''}
        defaultCoords={
          selectedShelterForReport?.latitude && selectedShelterForReport?.longitude
            ? {
                lat: parseFloat(selectedShelterForReport.latitude),
                lng: parseFloat(selectedShelterForReport.longitude),
              }
            : null
        }
      />
    </div>
  );
}
