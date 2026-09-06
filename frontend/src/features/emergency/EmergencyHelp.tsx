import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import { emergencyApi, locationApi, weatherApi } from '../../api';
import { useAppStore } from '../../store/useAppStore';

type Step = 'type' | 'location' | 'details' | 'submitted';

const emergencyTypes = [
  { id: 'medical', label: 'MEDICAL', icon: '🏥', color: '#dc2626', desc: 'Injury, illness, cardiac' },
  { id: 'fire', label: 'FIRE', icon: '🔥', color: '#f97316', desc: 'Structure, wildfire, smoke' },
  { id: 'flood', label: 'FLOOD', icon: '🌊', color: '#06b6d4', desc: 'Rising water, drainage' },
  { id: 'structural', label: 'STRUCTURAL', icon: '🏗️', color: '#f59e0b', desc: 'Collapse, unsafe building' },
  { id: 'evacuation', label: 'EVACUATION', icon: '🚶', color: '#a855f7', desc: 'Need help evacuating' },
  { id: 'rescue', label: 'RESCUE', icon: '🆘', color: '#dc2626', desc: 'Trapped, stranded' },
  { id: 'accident', label: 'ACCIDENT', icon: '🚗', color: '#f59e0b', desc: 'Vehicle, road, work' },
  { id: 'other', label: 'OTHER', icon: '⚠️', color: '#6b7280', desc: 'Other emergency' },
];

const assistanceOptions = [
  { id: 'ambulance', label: 'Ambulance / Medical Team' },
  { id: 'rescue', label: 'Rescue Team' },
  { id: 'fire', label: 'Fire Response Unit' },
  { id: 'evacuation', label: 'Evacuation Assistance' },
  { id: 'shelter', label: 'Shelter Placement' },
  { id: 'supplies', label: 'Emergency Supplies' },
  { id: 'other', label: 'Other Assistance' },
];

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ['type', 'location', 'details'];
  const labels = ['TYPE', 'LOCATION', 'DETAILS'];
  const curr = steps.indexOf(current);
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded"
            style={{
              background: i <= curr ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.04)',
              color: i <= curr ? '#dc2626' : 'rgba(255,255,255,0.25)',
              border: `1px solid ${i <= curr ? 'rgba(220,38,38,0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {i < curr ? '✓ ' : `${i + 1}. `}{labels[i]}
          </div>
          {i < steps.length - 1 && <div className="text-white/15 text-xs">›</div>}
        </div>
      ))}
    </div>
  );
}

export default function EmergencyHelp() {
  const navigate = useNavigate();
  const { userLocation, setUserLocation } = useAppStore();
  const [step, setStep] = useState<Step>('type');
  const [emergencyType, setEmergencyType] = useState('');
  const [location, setLocation] = useState('');
  const [assistance, setAssistance] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Real-time location & weather states
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [geoAccuracy, setGeoAccuracy] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [createdIncidentId, setCreatedIncidentId] = useState<string | null>(null);
  const [weatherData, setWeatherData] = useState<{
    temperature?: number;
    wind_speed?: number;
    condition?: string;
    icon?: string;
  } | null>(null);

  // Automatically use store GPS coords if available, or trigger automatic detection on mount
  useEffect(() => {
    if (userLocation?.status === 'locked' && userLocation.lat && userLocation.lng) {
      const lat = userLocation.lat;
      const lon = userLocation.lng;
      setGeoCoords({ lat, lon });
      if (userLocation.accuracy) setGeoAccuracy(userLocation.accuracy);

      // Auto reverse-geocode address if location field is empty
      locationApi.reverseGeocode(lat, lon).then((geoRes) => {
        const gData = geoRes?.data || geoRes;
        const address = gData?.formattedAddress || gData?.rawDisplayName || gData?.display_name;
        if (address) {
          setLocation((prev) => prev || address);
        }
      }).catch((e) => console.warn('Reverse geocoding failed:', e));

      // Auto fetch weather
      weatherApi.getCurrent(lat, lon).then((weatherRes) => {
        const wData = weatherRes?.data || weatherRes?.current;
        if (wData) {
          setWeatherData({
            temperature: wData.temperature,
            wind_speed: wData.windSpeed !== undefined ? wData.windSpeed : wData.wind_speed,
            condition: wData.condition,
            icon: wData.icon,
          });
        }
      }).catch((e) => console.warn('Weather fetch failed:', e));
    } else {
      // Auto-detect GPS if not yet acquired
      detectLocation();
    }
  }, []);

  const toggleAssistance = (id: string) =>
    setAssistance((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const canProceedType = !!emergencyType;
  // Mandatory location (>= 3 chars) AND at least one assistance item selected
  const canProceedLocation = location.trim().length >= 3 && assistance.length > 0;

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        setGeoCoords({ lat, lon });
        setGeoAccuracy(acc);
        setUserLocation({
          lat,
          lng: lon,
          accuracy: acc,
          timestamp: pos.timestamp || Date.now(),
          status: 'locked',
        });
        try {
          // Reverse geocode via server proxy
          const geoRes = await locationApi.reverseGeocode(lat, lon);
          const gData = geoRes?.data || geoRes;
          const address = gData?.formattedAddress || gData?.rawDisplayName || gData?.display_name;
          if (address && !location) {
            setLocation(address);
          }
        } catch (e) {
          console.warn('Reverse geocoding failed:', e);
        }
        try {
          // Live weather via server proxy
          const weatherRes = await weatherApi.getCurrent(lat, lon);
          const wData = weatherRes?.data || weatherRes?.current;
          if (wData) {
            setWeatherData({
              temperature: wData.temperature,
              wind_speed: wData.windSpeed !== undefined ? wData.windSpeed : wData.wind_speed,
              condition: wData.condition,
              icon: wData.icon,
            });
          }
        } catch (e) {
          console.warn('Weather fetch failed:', e);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please enter address manually.');
        } else {
          setGeoError('GPS signal unavailable. Please enter address manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async () => {
    if (!location.trim() || assistance.length === 0) {
      setSubmitError('Location and at least one assistance category are mandatory.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await emergencyApi.submitRequest({
        emergency_type: emergencyType || 'other',
        location_name: location.trim(),
        latitude: geoCoords ? geoCoords.lat : undefined,
        longitude: geoCoords ? geoCoords.lon : undefined,
        accuracy: geoAccuracy ?? undefined,
        description: details || `Assistance needed: ${assistance.join(', ') || 'Emergency'}`,
        contact_name: name.trim() || undefined,
        contact_phone: phone.trim() || undefined,
        assistance_needed: assistance,
      });
      const data = res.data?.data || res.data;
      if (data?.id || data?.requestId) setCreatedRequestId(data.id || data.requestId);
      if (data?.assignedIncidentId) setCreatedIncidentId(data.assignedIncidentId);
      setStep('submitted');
    } catch (err: any) {
      console.error('Failed to submit emergency request:', err);
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to submit emergency request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="relative w-full h-full flex flex-col items-center overflow-y-auto bg-[#080b0f]">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.06]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="ehg" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="15,2 45,2 58,26 45,50 15,50 2,26" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#ehg)" />
        </svg>
      </div>
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(220,38,38,0.07) 0%, transparent 55%)'
      }} />

      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-8 py-4 shrink-0 relative z-10">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 font-mono text-xs text-white/35 hover:text-white/70 transition-colors"
        >
          ← BACK TO HOME
        </button>
        <div className="flex items-center gap-2 font-mono text-xs" style={{ color: '#dc2626' }}>
          <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#dc2626' }} />
          EMERGENCY REQUEST
        </div>
        <div className="font-mono text-xs text-white/25">
          {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-2xl px-8 pb-12 flex flex-col">
        <AnimatePresence mode="wait">

          {/* Step 1 — Emergency Type */}
          {step === 'type' && (
            <motion.div key="type"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StepIndicator current="type" />
              <div className="font-condensed font-black text-3xl text-white mb-1">WHAT IS YOUR EMERGENCY?</div>
              <div className="font-mono text-xs text-white/35 mb-6">Select the type of emergency you are experiencing.</div>
              <div className="grid grid-cols-4 gap-3 mb-6">
                {emergencyTypes.map((t) => (
                  <motion.button
                    key={t.id}
                    onClick={() => setEmergencyType(t.id)}
                    className="p-4 rounded-xl text-left flex flex-col gap-2 transition-colors duration-200"
                    style={{
                      background: emergencyType === t.id ? `${t.color}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${emergencyType === t.id ? t.color + '55' : 'rgba(255,255,255,0.07)'}`,
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-2xl">{t.icon}</div>
                    <div className="font-condensed font-black text-xs tracking-wide" style={{ color: emergencyType === t.id ? t.color : 'rgba(255,255,255,0.7)' }}>{t.label}</div>
                    <div className="font-mono text-white/30 leading-tight" style={{ fontSize: '0.6rem' }}>{t.desc}</div>
                  </motion.button>
                ))}
              </div>
              <motion.button
                onClick={() => setStep('location')}
                disabled={!canProceedType}
                className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-wide transition-all"
                style={{
                  background: canProceedType ? '#dc2626' : 'rgba(220,38,38,0.15)',
                  color: canProceedType ? '#fff' : 'rgba(255,255,255,0.25)',
                }}
                whileHover={canProceedType ? { scale: 1.01 } : {}}
                whileTap={canProceedType ? { scale: 0.99 } : {}}
              >
                CONTINUE →
              </motion.button>
            </motion.div>
          )}

          {/* Step 2 — Location + Assistance */}
          {step === 'location' && (
            <motion.div key="location"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StepIndicator current="location" />
              <div className="font-condensed font-black text-3xl text-white mb-1">YOUR LOCATION &amp; CONTACT</div>
              <div className="font-mono text-xs text-white/35 mb-6">Responders need to know where to find you. Both location and assistance required.</div>

              <div className="space-y-4 mb-6">
                {/* Location with GPS Trigger */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-mono text-xs text-white/40 tracking-wide">
                      LOCATION / ADDRESS <span className="text-red-400">*</span>
                    </div>
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={geoLoading}
                      className="flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <span>📍</span>
                      <span>{geoLoading ? 'DETECTING GPS...' : 'USE CURRENT GPS LOCATION'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Street address, landmark, or description of location (min 3 characters)"
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${location.trim().length >= 3 ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.1)'}`, color: '#e8edf2', outline: 'none' }}
                  />

                  {/* GPS & Weather indicators */}
                  {geoCoords && (
                    <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-3 py-1.5 rounded">
                      <span>✓</span>
                      <span>GPS Coordinates Locked: {geoCoords.lat.toFixed(5)}, {geoCoords.lon.toFixed(5)}</span>
                    </div>
                  )}
                  {geoError && (
                    <div className="mt-2 font-mono text-[11px] text-amber-400/90 bg-amber-950/20 border border-amber-500/20 px-3 py-1.5 rounded">
                      ⚠️ {geoError}
                    </div>
                  )}
                  {weatherData && (
                    <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-white/70 bg-white/[0.03] border border-white/10 px-3 py-2 rounded">
                      <div className="flex items-center gap-2">
                        <span>{weatherData.icon || '🌤️'}</span>
                        <span className="text-white/80">{weatherData.condition ? weatherData.condition.toUpperCase() : 'LOCAL CONDITIONS'}:</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-cyan-400 font-bold">{weatherData.temperature ?? '--'}°C</span>
                        <span className="text-white/30">|</span>
                        <span>WIND: {weatherData.wind_speed ?? '--'} km/h</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <div className="font-mono text-xs text-white/40 mb-1.5 tracking-wide">YOUR NAME</div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (optional but helpful)"
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8edf2', outline: 'none' }}
                  />
                </div>
                {/* Phone */}
                <div>
                  <div className="font-mono text-xs text-white/40 mb-1.5 tracking-wide">PHONE NUMBER</div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    className="w-full px-4 py-3 rounded-lg font-mono text-sm"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8edf2', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Assistance needed (MANDATORY) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-mono text-xs text-white/40 tracking-wide">
                    ASSISTANCE NEEDED <span className="text-red-400">* (Select at least 1)</span>
                  </div>
                  {assistance.length === 0 && (
                    <span className="font-mono text-[11px] text-red-400/90 font-medium">Required</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {assistanceOptions.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => toggleAssistance(a.id)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer"
                      style={{
                        background: assistance.includes(a.id) ? 'rgba(220,38,38,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${assistance.includes(a.id) ? 'rgba(220,38,38,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      }}
                    >
                      <div className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0" style={{ background: assistance.includes(a.id) ? '#dc2626' : 'rgba(255,255,255,0.08)', border: `1px solid ${assistance.includes(a.id) ? '#dc2626' : 'rgba(255,255,255,0.15)'}` }}>
                        {assistance.includes(a.id) && <div className="font-mono text-white" style={{ fontSize: '0.55rem', lineHeight: 1 }}>✓</div>}
                      </div>
                      <div className="font-mono text-xs" style={{ color: assistance.includes(a.id) ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>{a.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {!canProceedLocation && (
                <div className="font-mono text-[11px] text-amber-400/70 mb-3 text-center">
                  * Address (min 3 chars) and at least 1 assistance category are required to continue.
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('type')} className="px-5 py-3 rounded-xl font-condensed font-bold text-sm tracking-wide text-white/40 transition-colors hover:text-white/70" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  ← BACK
                </button>
                <motion.button
                  onClick={() => setStep('details')}
                  disabled={!canProceedLocation}
                  className="flex-1 py-3.5 rounded-xl font-condensed font-black text-base tracking-wide"
                  style={{ background: canProceedLocation ? '#dc2626' : 'rgba(220,38,38,0.15)', color: canProceedLocation ? '#fff' : 'rgba(255,255,255,0.25)' }}
                  whileHover={canProceedLocation ? { scale: 1.01 } : {}}
                  whileTap={canProceedLocation ? { scale: 0.99 } : {}}
                >
                  CONTINUE →
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Details + Submit */}
          {step === 'details' && (
            <motion.div key="details"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StepIndicator current="details" />
              <div className="font-condensed font-black text-3xl text-white mb-1">ADDITIONAL DETAILS</div>
              <div className="font-mono text-xs text-white/35 mb-6">Any additional information that helps responders assist you.</div>

              {/* Summary */}
              <div className="p-4 rounded-xl mb-5 space-y-2" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <div className="font-mono text-xs text-red-400/60 tracking-wide">REQUEST SUMMARY</div>
                <div className="flex gap-3 flex-wrap">
                  <div className="font-condensed font-bold text-sm text-white">{emergencyTypes.find(t => t.id === emergencyType)?.label}</div>
                  <div className="font-mono text-xs text-white/40">·</div>
                  <div className="font-mono text-xs text-white/80">{location}</div>
                </div>
                <div className="font-mono text-xs text-white/50">
                  Assistance: {assistance.map(a => assistanceOptions.find(o => o.id === a)?.label || a).join(', ')}
                </div>
                {geoCoords && (
                  <div className="font-mono text-xs text-emerald-400/80">
                    GPS: {geoCoords.lat.toFixed(5)}, {geoCoords.lon.toFixed(5)}
                  </div>
                )}
                {weatherData && (
                  <div className="font-mono text-xs text-cyan-400/80">
                    Conditions: {weatherData.temperature}°C, Wind {weatherData.wind_speed} km/h
                  </div>
                )}
              </div>

              {submitError && (
                <div className="p-3 rounded-lg mb-4 bg-red-950/40 border border-red-500/40 font-mono text-xs text-red-300">
                  ⚠️ {submitError}
                </div>
              )}

              <div className="mb-5">
                <div className="font-mono text-xs text-white/40 mb-1.5 tracking-wide">DESCRIBE YOUR SITUATION</div>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={5}
                  placeholder="Describe the emergency situation — number of people involved, current condition, any hazards, access issues..."
                  className="w-full px-4 py-3 rounded-lg font-mono text-sm resize-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#e8edf2', outline: 'none' }}
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('location')} className="px-5 py-3 rounded-xl font-condensed font-bold text-sm tracking-wide text-white/40 transition-colors hover:text-white/70" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  ← BACK
                </button>
                <motion.button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl font-condensed font-black text-base tracking-wide flex items-center justify-center gap-2 cursor-pointer"
                  style={{ background: '#dc2626', color: '#fff', boxShadow: '0 0 32px rgba(220,38,38,0.4)', opacity: isSubmitting ? 0.7 : 1 }}
                  whileHover={isSubmitting ? {} : { scale: 1.01 }}
                  whileTap={isSubmitting ? {} : { scale: 0.99 }}
                >
                  {isSubmitting ? 'TRANSMITTING...' : '⚠ SUBMIT EMERGENCY REQUEST'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Submitted */}
          {step === 'submitted' && (
            <motion.div key="submitted"
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.4)', boxShadow: '0 0 40px rgba(16,185,129,0.2)' }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="9" stroke="#10b981" strokeWidth="1.5" opacity="0.6" />
                </svg>
              </div>
              <div className="font-condensed font-black text-3xl text-white mb-2">REQUEST SUBMITTED</div>
              <div className="font-mono text-xs text-white/40 mb-6 leading-relaxed max-w-sm mx-auto">
                Your emergency request has been received. Authorized responders will be notified. Stay at your reported location if it is safe to do so.
              </div>
              <div className="p-4 rounded-xl mb-6 text-left" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="text-white/30">TYPE</div>
                  <div className="text-white/70">{emergencyTypes.find(t => t.id === emergencyType)?.label}</div>
                  <div className="text-white/30">LOCATION</div>
                  <div className="text-white/70">{location}</div>
                  <div className="text-white/30">ASSISTANCE</div>
                  <div className="text-white/70">{assistance.join(', ')}</div>
                  {geoCoords && (
                    <>
                      <div className="text-white/30">COORDINATES</div>
                      <div className="text-emerald-400">{geoCoords.lat.toFixed(5)}, {geoCoords.lon.toFixed(5)}</div>
                    </>
                  )}
                  <div className="text-white/30">STATUS</div>
                  <div style={{ color: '#10b981' }}>RECEIVED</div>
                </div>
              </div>
              <div className="p-3 rounded-lg mb-6" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="font-mono text-xs text-amber-400/80 leading-relaxed">
                  If this is life-threatening, also call your local emergency number (911 or equivalent) immediately.
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button
                  onClick={() =>
                    navigate(
                      `/citizen/sos?requestId=${createdRequestId || ''}&incidentId=${createdIncidentId || ''}`
                    )
                  }
                  className="font-condensed font-bold text-sm tracking-widest px-6 py-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>📍</span> TRACK EMERGENCY DISPATCH (LIVE)
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="font-condensed font-bold text-sm tracking-wide px-6 py-3 rounded-lg text-white/40 transition-colors hover:text-white/70 cursor-pointer border border-white/10"
                >
                  ← RETURN TO HOME
                </button>
              </div>
            </motion.div>

          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
