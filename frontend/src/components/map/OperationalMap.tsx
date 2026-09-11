import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MapMarker {
  id: string;
  type: 'citizen' | 'shelter' | 'incident' | 'responder';
  title: string;
  lat: number;
  lng: number;
  details?: string;
  status?: string;
  severity?: string;
  capacity?: number;
  occupancy?: number;
}

export interface OperationalMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  safeRouteDestination?: { lat: number; lng: number; label: string } | null;
  activeRouteCoordinates?: [number, number][];
  activeRoutePolyline?: string;
  routeSafetyStatus?: 'SAFE' | 'CAUTION' | 'HIGH_RISK' | 'BLOCKED';
  alternativeRouteCoordinates?: [number, number][];
  alternativeRoutePolyline?: string;
  alternativeRouteSafetyStatus?: 'SAFE' | 'CAUTION' | 'HIGH_RISK' | 'BLOCKED';
  onSelectAlternativeRoute?: () => void;
  onMarkerClick?: (marker: MapMarker) => void;
  className?: string;
  onRecenter?: () => void;
  onLocationFound?: (coords: { lat: number; lng: number }) => void;
}


type MapMode = 'DARK' | 'SATELLITE';

// Tactical Dark Google Maps Style JSON
const DARK_MAP_STYLE: any[] = [
  { elementType: 'geometry', stylers: [{ color: '#090d12' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#090d12' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0d1520' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#172230' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#111927' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#04070a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }],
  },
];

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<void>;
    __nexusGoogleMapsCallback?: () => void;
    gm_authFailure?: () => void;
  }
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // 1. If already fully loaded and Map class is ready, resolve immediately
  if (window.google?.maps?.Map) {
    return Promise.resolve();
  }

  // 2. If a load is already in progress, reuse the existing promise
  if (window.__googleMapsLoadingPromise) {
    return window.__googleMapsLoadingPromise;
  }

  // 3. Initiate loading
  window.__googleMapsLoadingPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.maps?.Map) {
      resolve();
      return;
    }

    const callbackName = '__nexusGoogleMapsCallback';

    const onReady = () => {
      // If modern importLibrary is supported, ensure maps, marker, and geometry libraries are ready
      if (typeof window.google?.maps?.importLibrary === 'function') {
        Promise.all([
          window.google.maps.importLibrary('maps'),
          window.google.maps.importLibrary('marker'),
          window.google.maps.importLibrary('geometry'),
          window.google.maps.importLibrary('places'),
        ])
          .then(() => resolve())
          .catch(() => resolve()); // Core maps may already be available
      } else {
        resolve();
      }
    };

    window[callbackName] = () => {
      onReady();
    };

    // Check if script tag was already injected in DOM
    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      if (window.google?.maps?.Map) {
        resolve();
        return;
      }
      existingScript.addEventListener('load', () => onReady());
      existingScript.addEventListener('error', (e) => {
        window.__googleMapsLoadingPromise = undefined;
        reject(e);
      });
      return;
    }

    const script = document.createElement('script');
    // Load required libraries (places, geometry, marker) with asynchronous callback
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker&v=weekly&loading=async&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => {
      window.__googleMapsLoadingPromise = undefined;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return window.__googleMapsLoadingPromise;
}

export default function OperationalMap({
  center = { lat: 28.6139, lng: 77.2090 },
  zoom = 13,
  markers = [],
  safeRouteDestination = null,
  activeRouteCoordinates,
  activeRoutePolyline,
  routeSafetyStatus = 'SAFE',
  alternativeRouteCoordinates,
  alternativeRoutePolyline,
  alternativeRouteSafetyStatus = 'SAFE',
  onSelectAlternativeRoute,
  onMarkerClick,
  className = 'w-full h-full',
  onRecenter,
  onLocationFound,
}: OperationalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const directionsRendererRef = useRef<any>(null);
  const customPolylineRef = useRef<any>(null);
  const altPolylineRef = useRef<any>(null);
  const deviceMarkerRef = useRef<any>(null);

  const [mapMode, setMapMode] = useState<MapMode>('DARK');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [activeMarkerInfo, setActiveMarkerInfo] = useState<MapMarker | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoStatusMsg, setGeoStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [currentCenter, setCurrentCenter] = useState(center);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Update or render the current device location marker
  const updateDeviceLocationMarker = useCallback((lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    if (!deviceMarkerRef.current) {
      deviceMarkerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map,
        title: 'Command Unit (Your Device)',
        zIndex: 9999,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#06b6d4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2.5,
        },
      });

      deviceMarkerRef.current.addListener('click', () => {
        setActiveMarkerInfo({
          id: 'current-device-location',
          type: 'responder',
          title: 'Command Device Location',
          lat,
          lng,
          details: `Live GPS Position: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E`,
          status: 'ACTIVE GPS FIX',
        });
      });
    } else {
      deviceMarkerRef.current.setPosition({ lat, lng });
      deviceMarkerRef.current.setMap(map);
    }
  }, []);

  // Cleanup device marker on unmount
  useEffect(() => {
    return () => {
      if (deviceMarkerRef.current) {
        deviceMarkerRef.current.setMap(null);
        deviceMarkerRef.current = null;
      }
    };
  }, []);

  // Recenter handler: obtains fresh device GPS coordinates and pans map
  const handleRecenter = useCallback(() => {
    // Invoke optional parent onRecenter callback if provided
    onRecenter?.();

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoStatusMsg({ text: 'Geolocation is not supported by your browser.', isError: true });
      setTimeout(() => setGeoStatusMsg(null), 4000);
      return;
    }

    setIsLocating(true);
    setGeoStatusMsg({ text: 'Acquiring device GPS position...', isError: false });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setCurrentCenter({ lat, lng });
        onLocationFound?.({ lat, lng });

        const map = mapInstanceRef.current;
        if (map && window.google?.maps) {
          map.panTo({ lat, lng });
          const currentZoom = typeof map.getZoom === 'function' ? map.getZoom() : zoom;
          if (currentZoom < 14) {
            map.setZoom(15);
          }
          updateDeviceLocationMarker(lat, lng);
        }

        setIsLocating(false);
        setGeoStatusMsg({
          text: `Recentered: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
          isError: false,
        });
        setTimeout(() => setGeoStatusMsg(null), 3500);
      },
      (error) => {
        setIsLocating(false);
        let errorText = 'Unable to retrieve device location.';
        if (error.code === 1) {
          errorText = 'Location permission denied. Please allow browser location access.';
        } else if (error.code === 2) {
          errorText = 'Current position unavailable. Please check device GPS.';
        } else if (error.code === 3) {
          errorText = 'Location request timed out. Please try again.';
        }
        setGeoStatusMsg({ text: errorText, isError: true });
        setTimeout(() => setGeoStatusMsg(null), 4000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // Fresh reading every click
      }
    );
  }, [onRecenter, onLocationFound, zoom, updateDeviceLocationMarker]);

  // Initialize Google Maps
  useEffect(() => {
    if (!apiKey) {
      setLoadError('VITE_GOOGLE_MAPS_API_KEY is not configured in .env');
      return;
    }

    let isMounted = true;

    // Listen for auth failure from Google Maps Platform
    const prevAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      console.warn('[Google Maps Platform]: Authentication failure reported by Google.');
      if (isMounted) {
        setLoadError('Google Maps Platform authentication failed. Please verify API key, billing status, and domain restrictions in Google Cloud Console.');
      }
      if (typeof prevAuthFailure === 'function') {
        prevAuthFailure();
      }
    };

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;

        if (!window.google?.maps?.Map) {
          throw new Error('Google Maps JavaScript API Map class unavailable.');
        }

        const controlPosition =
          window.google.maps.ControlPosition?.RIGHT_BOTTOM ?? 9;

        const map = new window.google.maps.Map(mapContainerRef.current, {
          center,
          zoom,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: controlPosition,
          },
          mapTypeId: mapMode === 'SATELLITE' ? 'hybrid' : 'roadmap',
          backgroundColor: '#090d12',
        });

        mapInstanceRef.current = map;
        setMapLoaded(true);
        setLoadError(null);
      })
      .catch((err) => {
        console.warn('[Google Maps Platform Load Notice]:', err);
        if (isMounted) {
          setLoadError('Google Maps Platform initialization unavailable. Operating in tactical telemetry mode.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Handle map mode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    if (mapMode === 'DARK') {
      map.setMapTypeId('roadmap');
      map.setOptions({ styles: DARK_MAP_STYLE, tilt: 0, heading: 0 });
    } else if (mapMode === 'SATELLITE') {
      map.setMapTypeId('hybrid');
      map.setOptions({ styles: [], tilt: 0, heading: 0 });
    }
  }, [mapMode]);

  // Center update
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.panTo(center);
      setCurrentCenter(center);
    }
  }, [center?.lat, center?.lng]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    markers.forEach((item) => {
      if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return;

      let iconColor = '#06b6d4'; // default cyan
      let scale = 7;
      let path = window.google!.maps.SymbolPath.CIRCLE;

      if (item.type === 'citizen') {
        iconColor = '#06b6d4';
        scale = 8;
      } else if (item.type === 'shelter') {
        iconColor = '#10b981';
        scale = 9;
      } else if (item.type === 'incident') {
        iconColor = item.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b';
        scale = 9;
      } else if (item.type === 'responder') {
        iconColor = '#f59e0b';
        scale = 8;
      }

      const marker = new window.google!.maps.Marker({
        position: { lat: item.lat, lng: item.lng },
        map,
        title: item.title,
        icon: {
          path,
          scale,
          fillColor: iconColor,
          fillOpacity: 0.9,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        },
      });

      marker.addListener('click', () => {
        setActiveMarkerInfo(item);
        if (onMarkerClick) onMarkerClick(item);
      });

      markersRef.current.push(marker);
    });
  }, [markers, onMarkerClick]);

  // Calculate & Render Google Directions Safe Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps || !safeRouteDestination || !center) {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
        setRouteInfo(null);
      }
      return;
    }

    const directionsService = new window.google.maps.DirectionsService();

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#10b981',
          strokeOpacity: 0.85,
          strokeWeight: 4,
        },
      });
    }

    directionsService.route(
      {
        origin: center,
        destination: { lat: safeRouteDestination.lat, lng: safeRouteDestination.lng },
        travelMode: window.google.maps.TravelMode.WALKING,
      },
      (result: any, status: any) => {
        if (status === window.google!.maps.DirectionsStatus.OK && result) {
          directionsRendererRef.current?.setDirections(result);
          const leg = result.routes[0]?.legs[0];
          if (leg) {
            setRouteInfo({
              distance: leg.distance?.text || 'Calculated',
              duration: leg.duration?.text || 'En route',
            });
          }
        } else {
          console.warn('[Directions Routing]: Direct corridor navigation fallback.');
        }
      }
    );
  }, [safeRouteDestination, center]);

  // Render tactical active route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    if (customPolylineRef.current) {
      customPolylineRef.current.setMap(null);
      customPolylineRef.current = null;
    }

    let coords = activeRouteCoordinates;
    if ((!coords || coords.length === 0) && activeRoutePolyline) {
      try {
        if (window.google.maps.geometry?.encoding) {
          const decoded = window.google.maps.geometry.encoding.decodePath(activeRoutePolyline);
          coords = decoded.map((p: any) => [p.lat(), p.lng()]);
        }
      } catch {
        // polyline decode fallback
      }
    }

    if (coords && coords.length > 0) {
      const path = coords.map(([lat, lng]) => ({ lat, lng }));
      const strokeColor =
        routeSafetyStatus === 'BLOCKED' || routeSafetyStatus === 'HIGH_RISK'
          ? '#dc2626'
          : routeSafetyStatus === 'CAUTION'
          ? '#f59e0b'
          : '#10b981';

      customPolylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor,
        strokeOpacity: 0.95,
        strokeWeight: 5.0,
        zIndex: 10,
        map,
      });
    }

    return () => {
      if (customPolylineRef.current) {
        customPolylineRef.current.setMap(null);
        customPolylineRef.current = null;
      }
    };
  }, [activeRouteCoordinates, activeRoutePolyline, routeSafetyStatus, mapLoaded]);

  // Render tactical alternative route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    if (altPolylineRef.current) {
      altPolylineRef.current.setMap(null);
      altPolylineRef.current = null;
    }

    let coords = alternativeRouteCoordinates;
    if ((!coords || coords.length === 0) && alternativeRoutePolyline) {
      try {
        if (window.google.maps.geometry?.encoding) {
          const decoded = window.google.maps.geometry.encoding.decodePath(alternativeRoutePolyline);
          coords = decoded.map((p: any) => [p.lat(), p.lng()]);
        }
      } catch {
        // polyline decode fallback
      }
    }

    if (coords && coords.length > 0) {
      const path = coords.map(([lat, lng]) => ({ lat, lng }));
      const strokeColor =
        alternativeRouteSafetyStatus === 'BLOCKED' || alternativeRouteSafetyStatus === 'HIGH_RISK'
          ? '#dc2626'
          : '#f59e0b'; // Amber tactical corridor for alternative route B

      altPolylineRef.current = new window.google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor,
        strokeOpacity: 0.65,
        strokeWeight: 3.5,
        zIndex: 5,
        map,
      });

      if (onSelectAlternativeRoute) {
        altPolylineRef.current.addListener('click', () => {
          onSelectAlternativeRoute();
        });
      }
    }

    return () => {
      if (altPolylineRef.current) {
        altPolylineRef.current.setMap(null);
        altPolylineRef.current = null;
      }
    };
  }, [alternativeRouteCoordinates, alternativeRoutePolyline, alternativeRouteSafetyStatus, onSelectAlternativeRoute, mapLoaded]);

  // Auto-fit bounds to display full route corridors and endpoints
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google?.maps) return;

    const coords = activeRouteCoordinates || [];
    const altCoords = alternativeRouteCoordinates || [];
    if (coords.length === 0 && altCoords.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    coords.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    altCoords.forEach(([lat, lng]) => bounds.extend({ lat, lng }));

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
    }
  }, [activeRouteCoordinates, alternativeRouteCoordinates, mapLoaded]);

  return (
    <div className={`relative ${className} bg-[#080b0f] overflow-hidden select-none`}>
      {/* Map Target Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Overlay while Google Maps Platform initializes */}
      {!mapLoaded && !loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#080b0f]/80 backdrop-blur-xs z-20 pointer-events-none">
          <div className="glass p-5 rounded-xl border border-white/10 flex flex-col items-center gap-3 font-mono text-xs shadow-2xl">
            <div className="w-7 h-7 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
            <div className="flex items-center gap-2 text-cyan-400 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              INITIALIZING GOOGLE MAPS PLATFORM...
            </div>
            <div className="text-white/40 text-[10px]">Synchronizing tactical spatial layers</div>
          </div>
        </div>
      )}

      {/* Controlled Operational Fallback if Google Maps is unconfigured/unavailable */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#080b0f]/95 z-20">
          <div className="max-w-md w-full glass p-6 rounded-xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                TACTICAL SPATIAL TELEMETRY
              </div>
              <span className="font-mono text-[10px] text-white/30">GPS ACTIVE</span>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-xs space-y-1">
              <div className="text-white/40 text-[10px] tracking-widest">DEVICE POSITION</div>
              <div className="text-white/90 font-bold">
                {currentCenter.lat.toFixed(5)}° N, {currentCenter.lng.toFixed(5)}° E
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-[10px] text-white/40 tracking-wider">DETECTED PROXIMITY ENTITIES</div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 font-mono text-xs">
                {markers.length > 0 ? (
                  markers.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => onMarkerClick?.(m)}
                      className="p-2 rounded bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              m.type === 'shelter' ? '#10b981' : m.type === 'incident' ? '#dc2626' : '#06b6d4',
                          }}
                        />
                        <span className="text-white/80">{m.title}</span>
                      </div>
                      <span className="text-white/30 text-[10px]">{m.type.toUpperCase()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-white/30 text-[11px]">Scanning localized emergency channels...</div>
                )}
              </div>
            </div>

            <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] leading-relaxed">
              ⚠️ {loadError}
            </div>
          </div>
        </div>
      )}

      {/* Floating Map Controls (Top Right) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 font-mono text-xs bg-black/70 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-2xl">
        <button
          onClick={() => setMapMode('DARK')}
          className={`px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
            mapMode === 'DARK' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-white/40 hover:text-white/80'
          }`}
        >
          DARK
        </button>
        <button
          onClick={() => setMapMode('SATELLITE')}
          className={`px-3 py-1.5 rounded transition-all cursor-pointer font-bold ${
            mapMode === 'SATELLITE' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-white/40 hover:text-white/80'
          }`}
        >
          SATELLITE
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button
          id="command-orbit-recenter-btn"
          onClick={handleRecenter}
          disabled={isLocating}
          title="Recenter to Device GPS Location"
          className={`px-2.5 py-1.5 rounded border transition-colors cursor-pointer flex items-center gap-1 text-[11px] ${
            isLocating
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 cursor-wait'
              : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border-white/10'
          }`}
        >
          <span className={isLocating ? 'animate-spin inline-block' : ''}>🎯</span>
          <span>{isLocating ? 'LOCATING...' : 'RECENTER'}</span>
        </button>
      </div>

      {/* Geolocation Tactical Feedback Notification */}
      <AnimatePresence>
        {geoStatusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`absolute top-16 right-4 z-30 font-mono text-[11px] px-3 py-1.5 rounded-md border shadow-lg flex items-center gap-2 backdrop-blur-md ${
              geoStatusMsg.isError
                ? 'bg-red-950/80 text-red-300 border-red-500/30'
                : 'bg-cyan-950/80 text-cyan-300 border-cyan-500/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${geoStatusMsg.isError ? 'bg-red-400' : 'bg-cyan-400 animate-pulse'}`} />
            <span>{geoStatusMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safe Route ETA HUD (Top Left) */}
      <AnimatePresence>
        {routeInfo && safeRouteDestination && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-4 z-30 font-mono text-xs bg-emerald-950/80 backdrop-blur-md px-4 py-2.5 rounded-lg border border-emerald-500/30 shadow-xl flex items-center gap-4"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-300 font-bold">SAFE CORRIDOR:</span>
              <span className="text-white/90">{safeRouteDestination.label}</span>
            </div>
            <div className="flex items-center gap-3 text-emerald-400 font-bold">
              <span>{routeInfo.distance}</span>
              <span className="text-white/30">|</span>
              <span>{routeInfo.duration}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Marker Detail Card (Bottom Right) */}
      <AnimatePresence>
        {activeMarkerInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-6 right-6 z-30 max-w-xs w-full glass-strong p-4 rounded-xl border border-white/15 shadow-2xl font-mono text-xs space-y-2"
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
                style={{
                  background:
                    activeMarkerInfo.type === 'shelter'
                      ? '#10b98122'
                      : activeMarkerInfo.type === 'incident'
                      ? '#dc262622'
                      : '#06b6d422',
                  color:
                    activeMarkerInfo.type === 'shelter'
                      ? '#10b981'
                      : activeMarkerInfo.type === 'incident'
                      ? '#dc2626'
                      : '#06b6d4',
                }}
              >
                {activeMarkerInfo.type}
              </span>
              <button
                onClick={() => setActiveMarkerInfo(null)}
                className="text-white/40 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="font-condensed font-bold text-base text-white">{activeMarkerInfo.title}</div>
            {activeMarkerInfo.details && (
              <div className="text-white/60 text-[11px] leading-relaxed">{activeMarkerInfo.details}</div>
            )}
            {activeMarkerInfo.capacity !== undefined && (
              <div className="flex items-center justify-between text-white/50 text-[11px] pt-1 border-t border-white/10">
                <span>Occupancy:</span>
                <span className="text-emerald-400 font-bold">
                  {activeMarkerInfo.occupancy ?? 0} / {activeMarkerInfo.capacity}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
