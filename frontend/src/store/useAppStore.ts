import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role =
  | 'citizen'
  | 'responder'
  | 'authority_command'
  | 'resource_manager'
  | null;

export type ConnectionState = 'LIVE' | 'RECONNECTING' | 'OFFLINE' | 'STALE';

export interface DeviceLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
  status: 'idle' | 'acquiring' | 'locked' | 'denied' | 'unavailable' | 'timeout';
  error?: string | null;
}

interface AppState {
  role: Role;
  userId?: string | null;
  userName: string;
  userEmail?: string | null;
  isAuthenticated: boolean;
  connectionState: ConnectionState;
  userLocation: DeviceLocation | null;
  setRole: (role: Role) => void;
  setUser: (user: { id?: string; name?: string; email?: string } | null) => void;
  setUserLocation: (loc: DeviceLocation | null) => void;
  setAuthenticated: (v: boolean) => void;
  setConnectionState: (s: ConnectionState) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: null,
      userId: null,
      userName: '',
      userEmail: null,
      isAuthenticated: false,
      connectionState: 'LIVE',
      userLocation: null,
      setRole: (role) => set({ role }),
      setUser: (user) =>
        set({
          userId: user?.id || null,
          userName: user?.name || '',
          userEmail: user?.email || null,
        }),
      setUserLocation: (userLocation) => set({ userLocation }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setConnectionState: (connectionState) => set({ connectionState }),
      logout: () => {
        localStorage.removeItem('nexus_token');
        set({ role: null, userId: null, isAuthenticated: false, userName: '', userEmail: null, userLocation: null });
      },
    }),
    {
      name: 'nexus_app_auth',
      partialize: (state) => ({
        role: state.role,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
        userName: state.userName,
        userEmail: state.userEmail,
        userLocation: state.userLocation,
      }),
    }
  )
);
