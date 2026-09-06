import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, type DeviceLocation } from '../store/useAppStore';
import { trackingApi } from '../api';

export interface UseDeviceLocationOptions {
  autoRequest?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  syncWithBackend?: boolean;
}

export function useDeviceLocation(options: UseDeviceLocationOptions = {}) {
  const {
    autoRequest = true,
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 5000,
    syncWithBackend = true,
  } = options;

  const { userLocation, setUserLocation, userId } = useAppStore();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(() =>
    userLocation?.status === 'locked' ? { lat: userLocation.lat, lng: userLocation.lng } : null
  );
  const [accuracy, setAccuracy] = useState<number | null>(() => userLocation?.accuracy ?? null);
  const [timestamp, setTimestamp] = useState<number | null>(() => userLocation?.timestamp ?? null);
  const [status, setStatus] = useState<DeviceLocation['status']>(() => userLocation?.status || 'idle');
  const [error, setError] = useState<string | null>(() => userLocation?.error ?? null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const isMountedRef = useRef(true);
  const isRequestingRef = useRef(false);

  // Sync coords to backend PostgreSQL
  const syncToBackend = useCallback(
    async (lat: number, lng: number, acc: number | null, time: number) => {
      if (!syncWithBackend) return;
      try {
        setIsSyncing(true);
        const entityId = userId || 'CITIZEN-DEVICE';
        await trackingApi.sendLocation({
          entityType: 'citizen',
          entityId,
          latitude: lat,
          longitude: lng,
          accuracy: acc ?? undefined,
        });
        if (isMountedRef.current) {
          setLastSyncedAt(new Date(time));
          setIsSyncing(false);
        }
      } catch (err: any) {
        console.warn('[LocationSync] Could not sync GPS to backend:', err.message);
        if (isMountedRef.current) {
          setIsSyncing(false);
        }
      }
    },
    [syncWithBackend, userId]
  );

  // Core acquisition function
  const requestLocation = useCallback(
    (forceFresh = false) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        setStatus('unavailable');
        setError('Geolocation is not supported by your browser.');
        return;
      }

      if (isRequestingRef.current && !forceFresh) return;
      isRequestingRef.current = true;

      setStatus('acquiring');
      setError(null);

      const geoOptions: PositionOptions = {
        enableHighAccuracy,
        timeout,
        maximumAge: forceFresh ? 0 : maximumAge,
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          isRequestingRef.current = false;
          if (!isMountedRef.current) return;

          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = typeof pos.coords.accuracy === 'number' && !isNaN(pos.coords.accuracy) ? pos.coords.accuracy : null;
          const time = pos.timestamp || Date.now();

          setCoords({ lat, lng });
          setAccuracy(acc);
          setTimestamp(time);
          setStatus('locked');
          setError(null);

          const locPayload: DeviceLocation = {
            lat,
            lng,
            accuracy: acc,
            timestamp: time,
            status: 'locked',
            error: null,
          };
          setUserLocation(locPayload);

          // Persist and broadcast to backend
          syncToBackend(lat, lng, acc, time);
        },
        (err) => {
          isRequestingRef.current = false;
          if (!isMountedRef.current) return;

          let errorMsg = 'Unable to determine device location.';
          let newStatus: DeviceLocation['status'] = 'unavailable';

          if (err.code === err.PERMISSION_DENIED) {
            newStatus = 'denied';
            errorMsg = 'Location permission is required to determine your current position.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            newStatus = 'unavailable';
            errorMsg = 'GPS signal unavailable. Please check device location settings.';
          } else if (err.code === err.TIMEOUT) {
            newStatus = 'timeout';
            errorMsg = 'Location request timed out. Please click Recenter to try again.';
          }

          setStatus(newStatus);
          setError(errorMsg);

          setUserLocation({
            lat: coords?.lat ?? 0,
            lng: coords?.lng ?? 0,
            accuracy: null,
            timestamp: Date.now(),
            status: newStatus,
            error: errorMsg,
          });
        },
        geoOptions
      );
    },
    [enableHighAccuracy, timeout, maximumAge, setUserLocation, syncToBackend, coords]
  );

  // Recenter helper forcing fresh GPS reading
  const recenter = useCallback(() => {
    requestLocation(true);
  }, [requestLocation]);

  // Auto-request on mount if enabled
  useEffect(() => {
    isMountedRef.current = true;

    // If we don't have fresh coordinates (< 60s old), acquire now
    const now = Date.now();
    const hasFreshCoords = userLocation?.status === 'locked' && userLocation.timestamp && now - userLocation.timestamp < 60000;

    if (autoRequest && !hasFreshCoords) {
      requestLocation(false);
    } else if (hasFreshCoords && userLocation) {
      setCoords({ lat: userLocation.lat, lng: userLocation.lng });
      setAccuracy(userLocation.accuracy);
      setTimestamp(userLocation.timestamp);
      setStatus('locked');
      setLastSyncedAt(new Date(userLocation.timestamp));
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoRequest, requestLocation]);

  // Check freshness (stale after 120s)
  const isStale = timestamp ? Date.now() - timestamp > 120000 : false;

  return {
    coords,
    accuracy,
    timestamp,
    status,
    error,
    isGpsLocked: status === 'locked' && coords !== null,
    isAcquiring: status === 'acquiring',
    isDenied: status === 'denied',
    isStale,
    isSyncing,
    lastSyncedAt,
    requestLocation,
    recenter,
  };
}
