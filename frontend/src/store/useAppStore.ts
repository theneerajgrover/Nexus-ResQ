import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role =
  | 'citizen'
  | 'responder'
  | 'authority_command'
  | 'resource_manager'
  | null;

export type ConnectionState = 'LIVE' | 'RECONNECTING' | 'OFFLINE' | 'STALE';

interface AppState {
  role: Role;
  isAuthenticated: boolean;
  connectionState: ConnectionState;
  userName: string;
  setRole: (role: Role) => void;
  setAuthenticated: (v: boolean) => void;
  setConnectionState: (s: ConnectionState) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: null,
      isAuthenticated: false,
      connectionState: 'LIVE',
      userName: '',
      setRole: (role) => set({ role }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setConnectionState: (connectionState) => set({ connectionState }),
      logout: () => {
        localStorage.removeItem('nexus_token');
        set({ role: null, isAuthenticated: false, userName: '' });
      },
    }),
    {
      name: 'nexus_app_auth',
      partialize: (state) => ({
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        userName: state.userName,
      }),
    }
  )
);
