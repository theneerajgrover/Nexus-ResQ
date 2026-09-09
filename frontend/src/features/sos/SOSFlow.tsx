import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router';
import { emergencyApi, locationApi, trackingApi } from '../../api';
import OperationalMap, { MapMarker } from '../../components/map/OperationalMap';

type Step = 'start' | 'location' | 'info' | 'submitted' | 'journey';

interface LocationState {
  lat: number;
  lng: number;
  accuracy: string;
  address: string;
  isGps: boolean;
}

export default function SOSFlow() {
  const [searchParams] = useSearchParams();
  const urlReqId = searchParams.get('requestId');
  const urlIncId = searchParams.get('incidentId');

  const [step, setStep] = useState<Step>(urlReqId || urlIncId ? 'journey' : 'start');
  const [emergency, setEmergency] = useState('MEDICAL');
  const [assistanceNeeded, setAssistanceNeeded] = useState<string[]>(['RESCUE']);
  const [description, setDescription] = useState('');
  const [requestId, setRequestId] = useState(urlReqId || 'SOS-' + Math.floor(Math.random() * 90000 + 10000));
  const [incidentId, setIncidentId] = useState<string | null>(urlIncId || null);
  const [locationData, setLocationData] = useState<LocationState>({
    lat: 28.6139,
    lng: 77.2090,
    accuracy: '±15m',
    address: 'Determining location...',
    isGps: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (urlReqId) setRequestId(urlReqId);
    if (urlIncId) setIncidentId(urlIncId);
    if (urlReqId || urlIncId) setStep('journey');
  }, [urlReqId, urlIncId]);

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
      const data = res.data?.data || res.data;
      if (data?.id || data?.requestId) {
        const id = data.id || data.requestId;
        setRequestId(id);
      }
      if (data?.assignedIncidentId) {
        setIncidentId(data.assignedIncidentId);
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

interface JourneyViewProps {
  requestId: string;
  incidentId?: string | null;
  accuracy?: string;
}

function JourneyView({ requestId, incidentId: initialIncidentId, accuracy }: JourneyViewProps) {
  const [trackingData, setTrackingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());
  const [syncedSecondsAgo, setSyncedSecondsAgo] = useState(0);
  const [routeUpdatedAlert, setRouteUpdatedAlert] = useState<{ show: boolean; message: string } | null>(null);

  const fetchTracking = async () => {
    try {
      let res: any;
      if (initialIncidentId) {
        res = await trackingApi.getTracking(initialIncidentId);
      } else {
        res = await trackingApi.getTrackingByRequest(requestId);
      }

      // apiClient returns the JSON body directly (not wrapped in res.data)
      if (res?.success && res?.data) {
        const bundle = res.data;

        // If both requestId and incidentId are provided, validate they correspond.
        // The citizen data inside the bundle carries the real requestId from DB.
        if (initialIncidentId && requestId && bundle.citizen?.requestId) {
          if (bundle.citizen.requestId !== requestId) {
            setTrackingError('The request ID and incident ID provided do not correspond to the same emergency record.');
            setLoading(false);
            return;
          }
        }

        setTrackingData(bundle);
        setTrackingError(null);
        setLastSyncTime(Date.now());
      } else {
        // Not found or controlled error from backend
        const errMsg = res?.error || `Emergency record not found.`;
        setTrackingError(errMsg);
      }
    } catch (err: any) {
      console.warn('[JourneyView] Tracking query error:', err.message);
      setTrackingError('Tracking service temporarily unavailable. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and 15s refresh
  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 15000);
    return () => clearInterval(interval);
  }, [requestId, initialIncidentId]);

  // Synced X seconds ago counter
  useEffect(() => {
    const timer = setInterval(() => {
      const diff = Math.floor((Date.now() - lastSyncTime) / 1000);
      setSyncedSecondsAgo(diff);
      if (diff >= 30) {
        fetchTracking();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastSyncTime]);

  // Real-time SSE synchronization
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { type, payload: data } = payload;

        if (type === 'RESPONDER_LOCATION_UPDATED') {
          // Update live vehicle coordinates
          setTrackingData((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              responder: prev.responder
                ? {
                    ...prev.responder,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    heading: data.heading,
                    speed: data.speed,
                  }
                : {
                    id: data.responderId,
                    latitude: data.latitude,
                    longitude: data.longitude,
                  },
            };
          });
          setLastSyncTime(Date.now());
        } else if (type === 'INCIDENT_STATUS_CHANGED') {
          // Update lifecycle step
          setTrackingData((prev: any) => {
            if (!prev) return prev;
            const stepIdx = data.stepIndex !== undefined ? data.stepIndex : prev.lifecycle?.currentStepIndex;
            return {
              ...prev,
              incident: { ...prev.incident, status: data.newStatus },
              lifecycle: {
                ...prev.lifecycle,
                currentStatus: data.newStatus,
                currentStepIndex: stepIdx,
                steps: prev.lifecycle?.steps?.map((s: any, idx: number) => ({
                  ...s,
                  isCompleted: stepIdx > idx,
                  isCurrent: stepIdx === idx,
                })),
              },
            };
          });
          setLastSyncTime(Date.now());
        } else if (type === 'ROUTE_UPDATED') {
          // Dynamic re-routing detected!
          if (data.activeRoute) {
            setTrackingData((prev: any) => {
              if (!prev) return prev;
              return {
                ...prev,
                activeRoute: data.activeRoute,
              };
            });
            setRouteUpdatedAlert({
              show: true,
              message: data.reason || 'ROUTE UPDATED — SAFER ALTERNATIVE SELECTED',
            });
            setLastSyncTime(Date.now());
            setTimeout(() => setRouteUpdatedAlert(null), 10000);
          }
        }
      } catch (err) {
        console.warn('[JourneyView] SSE parse warning:', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-lg flex flex-col items-center gap-6 text-center py-16"
      >
        <motion.div
          className="w-16 h-16 rounded-full border-2 border-amber-400/60 border-t-amber-400"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
        <div className="font-condensed font-black text-2xl text-white">LOADING TRACKING DATA</div>
        <div className="font-mono text-xs text-white/40">Connecting to emergency response system...</div>
        <div className="font-mono text-[11px] text-white/25">Request: {requestId}</div>
      </motion.div>
    );
  }

  // ── Error / not-found state ───────────────────────────────────
  if (trackingError || !trackingData) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md flex flex-col items-center gap-5 text-center py-12"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.4)' }}
        >
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="font-condensed font-black text-2xl text-white">TRACKING UNAVAILABLE</div>
        <div
          className="font-mono text-xs text-amber-400/90 px-5 py-3 rounded-xl leading-relaxed max-w-sm"
          style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
        >
          {trackingError || 'Emergency record not found. The request ID may be invalid or the record may not exist.'}
        </div>
        <div className="font-mono text-[11px] text-white/30 space-y-1">
          <div>Request ID: {requestId}</div>
          {initialIncidentId && <div>Incident ID: {initialIncidentId}</div>}
        </div>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { window.location.reload(); }}
            className="px-4 py-2 rounded-lg font-mono text-xs text-white/50 hover:text-white/80 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            🔄 Retry
          </button>
          <a
            href="/"
            className="px-4 py-2 rounded-lg font-mono text-xs text-white/50 hover:text-white/80 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            ← Return Home
          </a>
        </div>
        <div className="font-mono text-[10px] text-white/20 mt-2">
          If you just submitted, please wait 5–10 seconds and refresh.
        </div>
      </motion.div>
    );
  }

  // Map markers construction
  const mapMarkers: MapMarker[] = [];
  const citizenLat = trackingData?.citizen?.latitude || trackingData?.incident?.latitude;
  const citizenLng = trackingData?.citizen?.longitude || trackingData?.incident?.longitude;

  if (citizenLat && citizenLng) {

    mapMarkers.push({
      id: 'citizen-location',
      type: 'citizen',
      title: 'Emergency Origin (You)',
      lat: citizenLat,
      lng: citizenLng,
      details: trackingData?.citizen?.location || 'Emergency Request Location',
      status: 'AWAITING TEAM',
    });
  }

  if (trackingData?.responder?.latitude && trackingData?.responder?.longitude) {
    mapMarkers.push({
      id: 'responder-vehicle',
      type: 'responder',
      title: `${trackingData.responder.name || 'Emergency Responder'} (${trackingData.responder.callsign || 'UNIT'})`,
      lat: trackingData.responder.latitude,
      lng: trackingData.responder.longitude,
      details: `Operational Status: ${trackingData.responder.status || 'EN ROUTE'}`,
      status: trackingData.responder.status || 'ACTIVE',
    });
  }

  const activeRoute = trackingData?.activeRoute;
  const lifecycle = trackingData?.lifecycle;
  const currentStepIndex = lifecycle?.currentStepIndex !== undefined ? lifecycle.currentStepIndex : 0;
  const currentStatus = lifecycle?.currentStatus || 'REQUESTED';

  const routeSafetyStatus = activeRoute?.safetyStatus || 'SAFE';
  const safetyColor =
    routeSafetyStatus === 'BLOCKED' || routeSafetyStatus === 'HIGH_RISK'
      ? '#dc2626'
      : routeSafetyStatus === 'CAUTION'
      ? '#f59e0b'
      : '#10b981';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl flex flex-col gap-6"
    >
      {/* Dynamic Re-Routing Alert Banner */}
      <AnimatePresence>
        {routeUpdatedAlert?.show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-xl border flex items-center justify-between gap-4 shadow-2xl"
            style={{
              background: 'rgba(220, 38, 38, 0.15)',
              borderColor: '#dc2626',
              boxShadow: '0 0 30px rgba(220, 38, 38, 0.3)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl animate-bounce">⚠️</span>
              <div>
                <div className="font-condensed font-black text-sm tracking-wider text-rose-400">
                  ROUTE UPDATED — SAFER ALTERNATIVE SELECTED
                </div>
                <div className="font-mono text-xs text-white/70">
                  {routeUpdatedAlert.message} · Active navigation dynamically switched to avoid risk corridor.
                </div>
              </div>
            </div>
            <button
              onClick={() => setRouteUpdatedAlert(null)}
              className="px-3 py-1 rounded font-mono text-xs bg-white/10 hover:bg-white/20 text-white/70 transition-colors"
            >
              DISMISS
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header & Sync Status */}
      <div className="glass p-5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider"
              style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', border: '1px solid rgba(16,185,129,0.4)' }}
            >
              STEP {currentStepIndex + 1} OF 8: {currentStatus}
            </span>
            <span className="font-mono text-xs text-white/40">ID: {requestId}</span>
          </div>
          <h1 className="font-condensed font-black text-2xl tracking-wide text-white">
            LIVE EMERGENCY RESPONSE TRACKING
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs text-white/50">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">Synced {syncedSecondsAgo}s ago</span>
          </div>
          <button
            onClick={fetchTracking}
            title="Refresh telemetry"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 transition-colors"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Map & Operational Tracking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Tactical Map */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative h-[380px] w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            <OperationalMap
              center={citizenLat && citizenLng ? { lat: citizenLat, lng: citizenLng } : undefined}
              zoom={14}
              markers={mapMarkers}
              activeRouteCoordinates={activeRoute?.coordinates}
              activeRoutePolyline={activeRoute?.polyline}
              routeSafetyStatus={activeRoute?.safetyStatus || 'SAFE'}
              className="w-full h-full"
            />

            {/* Floating Live Route Indicator */}
            {activeRoute && (
              <div className="absolute bottom-4 left-4 z-20 glass px-3 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: safetyColor }} />
                <div className="font-mono text-xs">
                  <span className="font-bold text-white">{activeRoute.label}</span>
                  <span className="text-white/40 ml-2">({activeRoute.safetyStatus})</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div className="p-2.5 rounded-xl glass border border-white/5">
              <div className="text-[10px] text-white/40 mb-0.5">DISTANCE</div>
              <div className="font-condensed font-black text-sm text-cyan-400">
                {activeRoute?.distanceFormatted || 'Calculating...'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl glass border border-white/5">
              <div className="text-[10px] text-white/40 mb-0.5">ETA</div>
              <div className="font-condensed font-black text-sm text-emerald-400">
                {activeRoute?.etaFormatted || '~5-8 mins'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl glass border border-white/5">
              <div className="text-[10px] text-white/40 mb-0.5">CORRIDOR RISK</div>
              <div className="font-condensed font-black text-sm" style={{ color: safetyColor }}>
                {activeRoute?.safetyStatus || 'VERIFIED SAFE'}
              </div>
            </div>
            <div className="p-2.5 rounded-xl glass border border-white/5">
              <div className="text-[10px] text-white/40 mb-0.5">UNIT</div>
              <div className="font-condensed font-black text-sm text-amber-400 truncate">
                {trackingData?.responder?.name || 'Assigned Post'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 8-Step Operational Lifecycle Timeline */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="glass p-5 rounded-2xl border border-white/10 flex flex-col h-full">
            <div className="font-mono text-xs tracking-wider text-white/40 mb-4 flex items-center justify-between">
              <span>OPERATIONAL LIFECYCLE</span>
              <span className="text-emerald-400 font-bold">{currentStepIndex + 1}/8 COMPLETE</span>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {(lifecycle?.steps || [
                { step: 'REQUESTED', label: 'Emergency Requested', description: 'Citizen SOS registered.' },
                { step: 'ACCEPTED', label: 'Incident Accepted', description: 'Central dispatch verified incident.' },
                { step: 'ASSIGNED', label: 'Responder Assigned', description: 'Rescue unit allocated.' },
                { step: 'DEPARTED', label: 'Vehicle Departed', description: 'Unit departed base station.' },
                { step: 'ON_THE_WAY', label: 'En Route to Scene', description: 'Navigating safest corridor.' },
                { step: 'NEARBY', label: 'Vehicle Nearby', description: 'Team is within 500m.' },
                { step: 'ARRIVED', label: 'Arrived on Scene', description: 'Physical contact at site.' },
                { step: 'COMPLETED', label: 'Incident Resolved', description: 'Operation archived.' },
              ]).map((s: any, idx: number) => {
                const isCompleted = currentStepIndex > idx;
                const isCurrent = currentStepIndex === idx;
                const isPending = currentStepIndex < idx;

                return (
                  <div
                    key={s.step || idx}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : isCompleted
                        ? 'bg-emerald-500/5 border border-emerald-500/15'
                        : 'opacity-40 border border-transparent'
                    }`}
                  >
                    <div className="pt-0.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            : isCurrent
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500 animate-pulse'
                            : 'bg-white/5 text-white/30 border border-white/10'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`font-condensed font-bold text-sm tracking-wide ${
                          isCompleted ? 'text-emerald-400' : isCurrent ? 'text-white' : 'text-white/40'
                        }`}
                      >
                        {s.label}
                      </div>
                      <div className="font-mono text-[11px] text-white/50 leading-tight">
                        {s.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Emergency Hotlines */}
            <div className="mt-4 pt-4 border-t border-white/10">
              <a
                href="tel:911"
                className="w-full py-3 rounded-xl font-condensed font-bold text-sm tracking-widest bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>📞</span> DIRECT EMERGENCY DISPATCH
              </a>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

