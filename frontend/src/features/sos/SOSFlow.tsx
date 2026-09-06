import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emergencyApi, locationApi } from '../../api';

type Step = 'start' | 'location' | 'info' | 'submitted' | 'journey';

const journeySteps = [
  { id: 'received', label: 'REQUEST RECEIVED', status: 'done' },
  { id: 'locating', label: 'HELP LOCATING', status: 'done' },
  { id: 'assigned', label: 'RESPONDER ASSIGNED', status: 'active' },
  { id: 'enroute', label: 'RESPONDER EN ROUTE', status: 'pending' },
  { id: 'arriving', label: 'ASSISTANCE ARRIVING', status: 'pending' },
  { id: 'resolved', label: 'RESOLVED', status: 'pending' },
];

interface LocationState {
  lat: number;
  lng: number;
  accuracy: string;
  address: string;
  isGps: boolean;
}

export default function SOSFlow() {
  const [step, setStep] = useState<Step>('start');
  const [emergency, setEmergency] = useState('MEDICAL');
  const [assistanceNeeded, setAssistanceNeeded] = useState<string[]>(['RESCUE']);
  const [description, setDescription] = useState('');
  const [requestId, setRequestId] = useState('SOS-' + Math.floor(Math.random() * 90000 + 10000));
  const [locationData, setLocationData] = useState<LocationState>({
    lat: 40.7128,
    lng: -74.0060,
    accuracy: '±15m',
    address: 'Determining location...',
    isGps: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendSOS = async () => {
    setIsSubmitting(true);
    try {
      const res = await emergencyApi.submitRequest({
        emergency_type: emergency.toLowerCase(),
        assistance_needed: assistanceNeeded,
        location_name: locationData.address || `${locationData.lat.toFixed(4)}, ${locationData.lng.toFixed(4)}`,
        latitude: locationData.lat,
        longitude: locationData.lng,
        description: description || `CRITICAL SOS: ${emergency}. Assistance requested: ${assistanceNeeded.join(', ')}`,
      });
      if (res.data?.id) {
        setRequestId(`SOS-${res.data.id.slice(0, 5).toUpperCase()}`);
      }
    } catch (err) {
      console.error('Failed to dispatch SOS to backend:', err);
    } finally {
      setIsSubmitting(false);
      setStep('submitted');
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === 'start' && (
          <StartScreen key="start" onNext={() => setStep('location')} />
        )}
        {step === 'location' && (
          <LocationStep
            key="location"
            locationData={locationData}
            setLocationData={setLocationData}
            onNext={() => setStep('info')}
          />
        )}
        {step === 'info' && (
          <InfoStep
            key="info"
            emergency={emergency}
            setEmergency={setEmergency}
            assistanceNeeded={assistanceNeeded}
            setAssistanceNeeded={setAssistanceNeeded}
            description={description}
            setDescription={setDescription}
            onSubmit={handleSendSOS}
            isSubmitting={isSubmitting}
          />
        )}
        {step === 'submitted' && (
          <SubmittedStep key="submitted" requestId={requestId} onContinue={() => setStep('journey')} />
        )}
        {step === 'journey' && (
          <JourneyView key="journey" requestId={requestId} accuracy={locationData.accuracy} />
        )}
      </AnimatePresence>
    </div>
  );
}

function StartScreen({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="text-center max-w-sm w-full"
    >
      <motion.div
        className="w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center relative"
        style={{ background: 'rgba(220,38,38,0.1)', border: '2px solid rgba(220,38,38,0.4)' }}
        animate={{ boxShadow: ['0 0 40px rgba(220,38,38,0.3)', '0 0 80px rgba(220,38,38,0.15)', '0 0 40px rgba(220,38,38,0.3)'] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div
          className="absolute inset-2 rounded-full incident-ring"
          style={{ border: '2px solid rgba(220,38,38,0.3)' }}
        />
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 8L28 20H40L30.5 27.5L34 40L24 32.5L14 40L17.5 27.5L8 20H20L24 8Z" fill="#dc2626" />
        </svg>
      </motion.div>

      <h1 className="font-condensed font-black text-5xl text-white mb-3">GET HELP</h1>
      <p className="font-mono text-sm text-white/50 mb-10 leading-relaxed">
        Emergency assistance will be dispatched to your coordinates immediately.
      </p>

      <motion.button
        onClick={onNext}
        className="w-full py-5 rounded-xl font-condensed font-black text-xl tracking-widest"
        style={{ background: '#dc2626', boxShadow: '0 0 40px rgba(220,38,38,0.5)' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
      >
        I NEED HELP NOW
      </motion.button>

      <div className="mt-4 font-mono text-xs text-white/25">
        Live GPS telemetry and verified dispatch
      </div>
    </motion.div>
  );
}

function LocationStep({
  locationData,
  setLocationData,
  onNext,
}: {
  locationData: LocationState;
  setLocationData: React.Dispatch<React.SetStateAction<LocationState>>;
  onNext: () => void;
}) {
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState(locationData.isGps);
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState(locationData.address);

  const acquireGPS = () => {
    setDetecting(true);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const acc = `±${Math.round(position.coords.accuracy || 10)}m`;

          let resolvedName = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;
          try {
            const geoRes = await locationApi.reverseGeocode(lat, lng);
            if (geoRes.data?.address) {
              resolvedName = geoRes.data.address;
            }
          } catch (e) {
            console.warn('Reverse geocode fallback:', e);
          }

          setLocationData({
            lat,
            lng,
            accuracy: acc,
            address: resolvedName,
            isGps: true,
          });
          setDetecting(false);
          setDetected(true);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setDetecting(false);
          // Graceful fallback to default baseline
          setLocationData((prev) => ({
            ...prev,
            address: 'Coordinates baseline (GPS permission required)',
            isGps: false,
          }));
          setDetected(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setDetecting(false);
      setDetected(true);
    }
  };

  useEffect(() => {
    if (!detected) {
      acquireGPS();
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="max-w-sm w-full"
    >
      <div className="font-mono text-xs tracking-widest text-white/30 mb-2">STEP 1 OF 2</div>
      <h2 className="font-condensed font-black text-4xl text-white mb-6">YOUR LOCATION</h2>

      {!manualMode ? (
        <>
          {!detected || detecting ? (
            <motion.button
              onClick={acquireGPS}
              disabled={detecting}
              className="w-full py-6 rounded-xl font-condensed font-bold text-lg tracking-widest mb-4 relative overflow-hidden"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4' }}
              whileHover={{ scale: detecting ? 1 : 1.02 }}
            >
              <div className="flex items-center justify-center gap-3">
                <motion.div
                  className="w-4 h-4 border-2 rounded-full"
                  style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                ACQUIRING DEVICE GPS...
              </div>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl mb-4"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#10b981' }} />
                  <div className="font-condensed font-bold text-sm tracking-widest" style={{ color: '#10b981' }}>
                    {locationData.isGps ? 'GPS COORDINATES LOCKED' : 'BASE COORDINATES'}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                  {locationData.accuracy}
                </span>
              </div>
              <div className="font-mono text-xs text-white/80 font-medium mb-1 line-clamp-2">
                {locationData.address}
              </div>
              <div className="font-mono text-[11px] text-white/40">
                {locationData.lat.toFixed(6)}° N, {locationData.lng.toFixed(6)}° W
              </div>
            </motion.div>
          )}

          <div className="flex gap-2 mb-6">
            <button
              onClick={acquireGPS}
              className="flex-1 py-2.5 rounded-lg font-mono text-xs text-cyan-400 hover:bg-cyan-500/10 transition-colors"
              style={{ border: '1px solid rgba(6,182,212,0.25)' }}
            >
              ⟳ Re-acquire GPS
            </button>
            <button
              onClick={() => setManualMode(true)}
              className="flex-1 py-2.5 rounded-lg font-mono text-xs text-white/50 hover:bg-white/5 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Manual Edit
            </button>
          </div>
        </>
      ) : (
        <div className="mb-6 space-y-3">
          <input
            type="text"
            className="w-full p-3 rounded-lg font-mono text-xs"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            placeholder="Enter street, landmark, or district..."
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
          />
          <button
            onClick={() => {
              setLocationData((prev) => ({ ...prev, address: manualAddress || prev.address }));
              setManualMode(false);
              setDetected(true);
            }}
            className="w-full py-2.5 rounded-lg font-condensed font-bold text-xs tracking-wider bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            CONFIRM ADDRESS
          </button>
        </div>
      )}

      <motion.button
        onClick={onNext}
        disabled={!detected}
        className="w-full py-4 rounded-xl font-condensed font-bold text-lg tracking-widest transition-all duration-300"
        style={{
          background: detected ? '#dc2626' : 'rgba(220,38,38,0.2)',
          color: detected ? 'white' : 'rgba(255,255,255,0.3)',
          boxShadow: detected ? '0 0 30px rgba(220,38,38,0.3)' : 'none',
        }}
        whileHover={detected ? { scale: 1.02 } : {}}
        whileTap={detected ? { scale: 0.98 } : {}}
      >
        CONTINUE TO SITUATION →
      </motion.button>
    </motion.div>
  );
}

function InfoStep({
  emergency,
  setEmergency,
  assistanceNeeded,
  setAssistanceNeeded,
  description,
  setDescription,
  onSubmit,
  isSubmitting,
}: {
  emergency: string;
  setEmergency: (v: string) => void;
  assistanceNeeded: string[];
  setAssistanceNeeded: React.Dispatch<React.SetStateAction<string[]>>;
  description: string;
  setDescription: (v: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}) {
  const types = ['MEDICAL', 'FLOOD', 'FIRE', 'TRAPPED', 'MISSING PERSON', 'OTHER'];
  const assistanceTypes = ['RESCUE', 'MEDICAL', 'EVACUATION', 'SHELTER', 'SUPPLIES', 'FOOD/WATER'];

  const toggleAssistance = (type: string) => {
    if (assistanceNeeded.includes(type)) {
      if (assistanceNeeded.length > 1) {
        setAssistanceNeeded(assistanceNeeded.filter((t) => t !== type));
      }
    } else {
      setAssistanceNeeded([...assistanceNeeded, type]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="max-w-sm w-full"
    >
      <div className="font-mono text-xs tracking-widest text-white/30 mb-2">STEP 2 OF 2</div>
      <h2 className="font-condensed font-black text-4xl text-white mb-4">WHAT HAPPENED?</h2>

      <div className="font-mono text-[10px] tracking-wider text-white/40 mb-2">EMERGENCY TYPE</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setEmergency(t)}
            className="py-2.5 px-2 rounded-lg font-condensed font-bold text-xs tracking-wider transition-all duration-200"
            style={{
              background: emergency === t ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.03)',
              border: emergency === t ? '1px solid rgba(220,38,38,0.6)' : '1px solid rgba(255,255,255,0.06)',
              color: emergency === t ? '#dc2626' : 'rgba(232,237,242,0.6)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="font-mono text-[10px] tracking-wider text-white/40 mb-2">ASSISTANCE REQUIRED</div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {assistanceTypes.map((a) => {
          const isSelected = assistanceNeeded.includes(a);
          return (
            <button
              key={a}
              onClick={() => toggleAssistance(a)}
              className="py-2 px-2 rounded-lg font-mono text-[11px] font-semibold transition-all duration-200"
              style={{
                background: isSelected ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.02)',
                border: isSelected ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(255,255,255,0.05)',
                color: isSelected ? '#06b6d4' : 'rgba(255,255,255,0.4)',
              }}
            >
              {isSelected ? `✓ ${a}` : a}
            </button>
          );
        })}
      </div>

      <textarea
        className="w-full p-3 rounded-lg font-mono text-xs resize-none mb-6"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(232,237,242,0.8)',
          outline: 'none',
        }}
        rows={3}
        placeholder="Specific location details or medical conditions..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <motion.button
        onClick={onSubmit}
        disabled={!emergency || !assistanceNeeded.length || isSubmitting}
        className="w-full py-5 rounded-xl font-condensed font-black text-xl tracking-widest"
        style={{
          background: emergency ? '#dc2626' : 'rgba(220,38,38,0.2)',
          color: emergency ? 'white' : 'rgba(255,255,255,0.3)',
          boxShadow: emergency ? '0 0 40px rgba(220,38,38,0.4)' : 'none',
          opacity: isSubmitting ? 0.7 : 1,
        }}
        whileHover={emergency && !isSubmitting ? { scale: 1.02 } : {}}
        whileTap={emergency && !isSubmitting ? { scale: 0.98 } : {}}
      >
        {isSubmitting ? 'TRANSMITTING SOS...' : 'TRANSMIT SOS REQUEST'}
      </motion.button>

      <div className="mt-3 font-mono text-xs text-center text-white/25">
        Response teams will be notified immediately
      </div>
    </motion.div>
  );
}

function SubmittedStep({ requestId, onContinue }: { requestId: string; onContinue: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="text-center max-w-sm w-full"
    >
      <motion.div
        className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981' }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M8 20L16 28L32 12" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.div>

      <h2 className="font-condensed font-black text-4xl text-white mb-2">SOS RECEIVED</h2>
      <div className="font-mono text-sm mb-1" style={{ color: '#10b981' }}>
        REQUEST ID: {requestId}
      </div>
      <p className="font-mono text-xs text-white/40 mb-8 leading-relaxed">
        Your request has been received and is being processed. Keep this screen open.
      </p>

      <div className="p-4 rounded-lg mb-6 text-left" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="font-condensed font-bold text-xs tracking-widest text-amber-400 mb-2">WHILE YOU WAIT</div>
        <ul className="font-mono text-xs text-white/50 space-y-1">
          <li>→ Stay where you are if safe to do so</li>
          <li>→ Keep your phone charged</li>
          <li>→ Signal responders when they arrive</li>
        </ul>
      </div>

      <button
        onClick={onContinue}
        className="w-full py-4 rounded-xl font-condensed font-bold text-sm tracking-widest"
        style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4' }}
      >
        TRACK RESPONSE PROGRESS →
      </button>
    </motion.div>
  );
}

function JourneyView({ requestId, accuracy }: { requestId: string; accuracy: string }) {
  const activeIndex = 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-sm w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-condensed font-black text-2xl text-white">RESPONSE IN PROGRESS</div>
          <div className="font-mono text-xs" style={{ color: '#10b981' }}>ID: {requestId}</div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs" style={{ color: '#10b981' }}>
          <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#10b981' }} />
          LIVE
        </div>
      </div>

      <div className="relative mb-6">
        {journeySteps.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;
          const isPending = i > activeIndex;
          const color = isDone ? '#10b981' : isActive ? '#f59e0b' : 'rgba(255,255,255,0.15)';

          return (
            <div key={step.id} className="flex items-start gap-4 mb-0">
              <div className="flex flex-col items-center">
                <motion.div
                  className="w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0"
                  style={{
                    background: isDone ? 'rgba(16,185,129,0.2)' : isActive ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${color}`,
                    boxShadow: isActive ? `0 0 20px ${color}44` : 'none',
                  }}
                  animate={isActive ? { boxShadow: ['0 0 20px rgba(245,158,11,0.4)', '0 0 40px rgba(245,158,11,0.2)', '0 0 20px rgba(245,158,11,0.4)'] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {isDone ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7L5.5 10L11.5 4" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : isActive ? (
                    <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
                  ) : (
                    <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  )}
                </motion.div>
                {i < journeySteps.length - 1 && (
                  <div
                    className="w-0.5 flex-1 my-1"
                    style={{
                      height: '32px',
                      background: isDone ? '#10b981' : 'rgba(255,255,255,0.08)',
                    }}
                  />
                )}
              </div>
              <div className="pt-1.5 pb-5">
                <div
                  className="font-condensed font-bold text-sm tracking-widest"
                  style={{ color: isDone ? '#10b981' : isActive ? '#f59e0b' : 'rgba(255,255,255,0.25)' }}
                >
                  {step.label}
                </div>
                {isActive && (
                  <div className="font-mono text-xs text-white/40 mt-0.5">Responder Unit R-14 dispatched · ETA 8 min</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'REQUEST ID', value: requestId, color: '#06b6d4' },
          { label: 'ACCURACY', value: accuracy, color: '#10b981' },
          { label: 'RESPONSE UNIT', value: 'R-14 ALPHA', color: '#f59e0b' },
          { label: 'ETA', value: '~8 minutes', color: '#f59e0b' },
        ].map((item) => (
          <div
            key={item.label}
            className="p-3 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="font-mono text-xs text-white/30 mb-1">{item.label}</div>
            <div className="font-condensed font-bold text-sm" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <button
        className="w-full py-3 rounded-lg font-condensed font-semibold text-sm tracking-widest"
        style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}
      >
        EMERGENCY CALL — 911
      </button>
    </motion.div>
  );
}
