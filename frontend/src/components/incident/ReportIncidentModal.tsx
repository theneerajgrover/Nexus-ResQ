import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { incidentsApi } from '../../api';
import { useAppStore } from '../../store/useAppStore';

const DISASTER_TYPES = [
  { id: 'FLOOD', label: 'FLOOD / WATER', icon: '🌊', color: '#06b6d4' },
  { id: 'FIRE', label: 'FIRE / WILDFIRE', icon: '🔥', color: '#ef4444' },
  { id: 'EARTHQUAKE', label: 'EARTHQUAKE', icon: '🌋', color: '#f59e0b' },
  { id: 'STRUCTURAL', label: 'STRUCTURAL COLLAPSE', icon: '🏚️', color: '#f97316' },
  { id: 'MEDICAL', label: 'MASS CASUALTY / MEDICAL', icon: '🚑', color: '#ec4899' },
  { id: 'CYCLONE', label: 'CYCLONE / STORM', icon: '🌀', color: '#38bdf8' },
  { id: 'ACCIDENT', label: 'MAJOR ACCIDENT', icon: '⚠️', color: '#eab308' },
  { id: 'OTHER', label: 'OTHER HAZARD', icon: '🚨', color: '#a855f7' },
];

const SEVERITY_OPTIONS = [
  { id: 'CRITICAL', label: 'CRITICAL', color: '#dc2626', desc: 'Immediate threat to human life' },
  { id: 'HIGH', label: 'HIGH', color: '#ea580c', desc: 'Severe damage or escalation' },
  { id: 'MODERATE', label: 'MODERATE', color: '#f59e0b', desc: 'Localized containment required' },
  { id: 'LOW', label: 'LOW', color: '#10b981', desc: 'Early warning or advisory' },
];

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: any) => void;
  defaultLocation?: string;
  defaultCoords?: { lat: number; lng: number } | null;
  sourceContext?: 'CITIZEN_REPORT' | 'PORTAL_REPORT' | 'AUTHORITY_REPORT';
}

export default function ReportIncidentModal({
  isOpen,
  onClose,
  onSuccess,
  defaultLocation = '',
  defaultCoords = null,
  sourceContext,
}: ReportIncidentModalProps) {
  const { userName, role } = useAppStore();

  const [disasterType, setDisasterType] = useState('FLOOD');
  const [severity, setSeverity] = useState('HIGH');
  const [location, setLocation] = useState(defaultLocation);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(defaultCoords);
  const [description, setDescription] = useState('');
  const [affectedPeople, setAffectedPeople] = useState(1);
  const [reporterName, setReporterName] = useState(userName || '');
  const [reporterPhone, setReporterPhone] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  const roleSource = sourceContext || (
    role === 'responder' ? 'PORTAL_REPORT' :
    role === 'resource_manager' ? 'PORTAL_REPORT' :
    role === 'authority_command' ? 'AUTHORITY_REPORT' :
    'CITIZEN_REPORT'
  );

  const handleAcquireLocation = () => {
    if (!navigator.geolocation) {
      setSubmitError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setCoords({ lat, lng });
        if (!location) {
          setLocation(`GPS Location (${lat}, ${lng})`);
        }
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation warning:', err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || location.trim().length < 3) {
      setSubmitError('Please enter a valid disaster location or landmark.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res: any = await incidentsApi.report({
        disaster_type: disasterType,
        location: location.trim(),
        latitude: coords?.lat,
        longitude: coords?.lng,
        severity,
        description: description.trim() || `Disaster reported: ${disasterType} at ${location.trim()}`,
        affected_people: affectedPeople,
        source: roleSource,
        reporter_name: reporterName.trim() || userName || 'Anonymous Reporter',
        reporter_phone: reporterPhone.trim() || undefined,
      });

      if (res.data?.success || res.success) {
        const payload = res.data?.data || res.data;
        setSuccessResult(payload);
        onSuccess?.(payload);
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccessResult(null);
          onClose();
        }, 2200);
      } else {
        setSubmitError(res.data?.error || res.error || 'Failed to register incident report.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error('Incident report error:', err);
      setSubmitError(err.response?.data?.error || err.message || 'Network error while submitting report.');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden glass-strong border border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-lg">
                🚨
              </div>
              <div>
                <h2 className="font-condensed font-black text-xl text-white tracking-wide">
                  REPORT EMERGENCY / INCIDENT
                </h2>
                <div className="font-mono text-[11px] text-white/40 tracking-wider">
                  COMMON DISASTER INGESTION PIPELINE · SOURCE: {roleSource}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {successResult ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-3"
              >
                <div className="text-4xl">✓</div>
                <div className="font-condensed font-black text-2xl text-emerald-400">
                  {successResult.isCorrelated ? 'INCIDENT REPORT CORRELATED' : 'NEW INCIDENT CREATED'}
                </div>
                <div className="font-mono text-xs text-white/80 max-w-md mx-auto leading-relaxed">
                  Incident ID: <span className="font-bold text-emerald-300">{successResult.incidentId}</span>
                  {successResult.reportId && ` · Report: ${successResult.reportId}`}
                  <br />
                  {successResult.isCorrelated
                    ? `Correlated with active incident. Replanning triggered across 11 AI agents.`
                    : `Disaster entered into 11-agent AI pipeline & dispatched to Authority Portal.`}
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {submitError && (
                  <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 font-mono text-xs text-red-400">
                    ⚠ {submitError}
                  </div>
                )}

                {/* Disaster Type Grid */}
                <div>
                  <label className="block font-mono text-xs text-white/50 mb-2 tracking-wider">
                    DISASTER / HAZARD TYPE *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DISASTER_TYPES.map((dt) => {
                      const isSelected = disasterType === dt.id;
                      return (
                        <button
                          key={dt.id}
                          type="button"
                          onClick={() => setDisasterType(dt.id)}
                          className="p-2.5 rounded-xl text-left transition-all duration-150 flex flex-col justify-between"
                          style={{
                            background: isSelected ? `${dt.color}20` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isSelected ? dt.color : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          <span className="text-xl mb-1">{dt.icon}</span>
                          <span className="font-condensed font-bold text-xs text-white leading-tight">
                            {dt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Severity Selection */}
                <div>
                  <label className="block font-mono text-xs text-white/50 mb-2 tracking-wider">
                    SEVERITY LEVEL *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SEVERITY_OPTIONS.map((sev) => {
                      const isSelected = severity === sev.id;
                      return (
                        <button
                          key={sev.id}
                          type="button"
                          onClick={() => setSeverity(sev.id)}
                          className="p-2.5 rounded-xl text-left transition-all"
                          style={{
                            background: isSelected ? `${sev.color}25` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${isSelected ? sev.color : 'rgba(255,255,255,0.08)'}`,
                          }}
                        >
                          <div className="font-condensed font-bold text-xs" style={{ color: sev.color }}>
                            {sev.label}
                          </div>
                          <div className="font-mono text-[10px] text-white/40 truncate">
                            {sev.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Location & GPS */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-mono text-xs text-white/50 tracking-wider">
                      INCIDENT LOCATION / SECTOR *
                    </label>
                    <button
                      type="button"
                      onClick={handleAcquireLocation}
                      disabled={isLocating}
                      className="font-mono text-[11px] px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition-colors flex items-center gap-1"
                    >
                      {isLocating ? 'Acquiring GPS...' : '📍 Use Live GPS'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Yamuna Riverbank Sector 4, Connaught Outer Ring..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400/50"
                  />
                  {coords && (
                    <div className="mt-1.5 font-mono text-[10px] text-cyan-400/80">
                      Coordinates: {coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°
                    </div>
                  )}
                </div>

                {/* Description & Impact */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block font-mono text-xs text-white/50 mb-1.5 tracking-wider">
                      SITUATION DETAILS / EVIDENCE *
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what is happening, immediate hazards, trapped victims, rising water level..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-white/50 mb-1.5 tracking-wider">
                      PEOPLE AFFECTED
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={affectedPeople}
                      onChange={(e) => setAffectedPeople(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400/50"
                    />
                    <div className="font-mono text-[10px] text-white/30 mt-1">
                      Estimated population at risk
                    </div>
                  </div>
                </div>

                {/* Contact (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono text-xs text-white/50 mb-1 tracking-wider">
                      REPORTER NAME
                    </label>
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Your name / Unit callsign"
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400/50"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-white/50 mb-1 tracking-wider">
                      CONTACT PHONE
                    </label>
                    <input
                      type="tel"
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      placeholder="+91 / Emergency Contact"
                      className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-400/50"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl font-mono text-xs text-white/60 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl font-condensed font-black text-sm tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        INGESTING DISASTER REPORT...
                      </>
                    ) : (
                      'TRANSMIT EMERGENCY REPORT'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
