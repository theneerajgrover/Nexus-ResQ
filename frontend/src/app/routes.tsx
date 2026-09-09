import { createBrowserRouter, Navigate, useLocation } from 'react-router';
import Shell from '../components/layout/Shell';
import AuthPage from '../features/auth/AuthPage';
import LandingPage from '../features/home/LandingPage';
import EmergencyHelp from '../features/emergency/EmergencyHelp';
import CitizenSignup from '../features/citizen/CitizenSignup';
import CitizenHome from '../features/citizen/CitizenHome';
import CitizenSheltersPage from '../features/citizen/CitizenShelters';
import CitizenRoutesPage from '../features/citizen/CitizenRoutes';
import CitizenAlertsPage from '../features/citizen/CitizenAlerts';
import SOSFlow from '../features/sos/SOSFlow';
import CitizenWeather from '../features/citizen/CitizenWeather';
import CitizenHistory from '../features/citizen/CitizenHistory';
import ResponderHome from '../features/responder/ResponderHome';
import ResponderHistory from '../features/responder/ResponderHistory';
import CommandHome from '../features/command/CommandHome';
import AuthorityWeather from '../features/command/AuthorityWeather';
import AuthorityWarnings from '../features/command/AuthorityWarnings';
import PendingApprovalsPage from '../features/command/PendingApprovalsPage';
import ResourceManagerHome from '../features/resources/ResourceManagerHome';
import { useAppStore, type Role } from '../store/useAppStore';

// ── Role guards ───────────────────────────────────────────────────────────────

function RequireAuth({ allowedRoles, children }: { allowedRoles: Role[]; children: React.ReactNode }) {
  const { isAuthenticated, role } = useAppStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(role)) {
    // Redirect to the correct home for this role rather than exposing a 403
    switch (role) {
      case 'citizen': return <Navigate to="/citizen" replace />;
      case 'responder': return <Navigate to="/responder" replace />;
      case 'authority_command': return <Navigate to="/command" replace />;
      case 'resource_manager': return <Navigate to="/resources" replace />;
      default: return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}

// ── Root home page ───────────────────────────────────────────────────────────

function RoleHome() {
  return <LandingPage />;
}

// ── Citizen sub-routes ────────────────────────────────────────────────────────

function CitizenRoute({ children }: { children: React.ReactNode }) {
  return <RequireAuth allowedRoles={['citizen']}>{children}</RequireAuth>;
}

function CitizenAlerts() { return <CitizenAlertsPage />; }
function CitizenShelters() { return <CitizenSheltersPage />; }
function CitizenRoutes() { return <CitizenRoutesPage />; }

// ── Responder sub-routes ──────────────────────────────────────────────────────

function ResponderRoute({ children }: { children: React.ReactNode }) {
  return <RequireAuth allowedRoles={['responder']}>{children}</RequireAuth>;
}

function ResponderMissions() { return <RequireAuth allowedRoles={['responder']}><ResponderHome /></RequireAuth>; }
function ResponderNavigation() { return <RequireAuth allowedRoles={['responder']}><ResponderHome /></RequireAuth>; }
function ResponderResources() { return <RequireAuth allowedRoles={['responder']}><ResponderHome /></RequireAuth>; }
function ResponderAlerts() { return <RequireAuth allowedRoles={['responder']}><ResponderHome /></RequireAuth>; }

// ── Authority / Command sub-routes ────────────────────────────────────────────

function CommandRoute({ children }: { children: React.ReactNode }) {
  return <RequireAuth allowedRoles={['authority_command']}>{children}</RequireAuth>;
}

// ── Resource Manager sub-routes ───────────────────────────────────────────────

function ResourceRoute({ children }: { children: React.ReactNode }) {
  return <RequireAuth allowedRoles={['resource_manager']}>{children}</RequireAuth>;
}

// ── Shared utilities ──────────────────────────────────────────────────────────

function ComingSoon({ label, color, role }: { label: string; color: string; role: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <div className="font-condensed font-black text-5xl" style={{ color }}>{label}</div>
      <div className="font-mono text-xs text-white/30">{role} · PHASE 2 IMPLEMENTATION</div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <div className="font-condensed font-black text-8xl text-white/10">404</div>
      <div className="font-mono text-xs tracking-widest text-white/30">ROUTE NOT FOUND</div>
      <a href="/" className="font-mono text-xs text-white/40 hover:text-white/70 underline mt-2">Return home</a>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Shell,
    children: [
      // Root — redirect to role home
      { index: true, Component: RoleHome },

      // Auth
      { path: 'login', Component: AuthPage },

      // Public pages (no auth required)
      { path: 'emergency', Component: EmergencyHelp },
      { path: 'signup', Component: CitizenSignup },
      // Public SOS tracking — accessible without login (citizen tracks their own submission)
      { path: 'citizen/sos', Component: SOSFlow },

      // ── CITIZEN ──────────────────────────────────────────────────────────
      {
        path: 'citizen',
        element: <CitizenRoute><CitizenHome /></CitizenRoute>,
      },
      {
        path: 'citizen/help',
        element: <CitizenRoute><SOSFlow /></CitizenRoute>,
      },
      {
        path: 'citizen/weather',
        element: <CitizenRoute><CitizenWeather /></CitizenRoute>,
      },
      {
        path: 'citizen/history',
        element: <CitizenRoute><CitizenHistory /></CitizenRoute>,
      },
      {
        path: 'citizen/alerts',
        element: <CitizenRoute><CitizenAlerts /></CitizenRoute>,
      },
      {
        path: 'citizen/shelters',
        element: <CitizenRoute><CitizenShelters /></CitizenRoute>,
      },
      {
        path: 'citizen/routes',
        element: <CitizenRoute><CitizenRoutes /></CitizenRoute>,
      },

      // ── RESPONDER ─────────────────────────────────────────────────────────
      {
        path: 'responder',
        element: <ResponderRoute><ResponderHome /></ResponderRoute>,
      },
      {
        path: 'responder/history',
        element: <ResponderRoute><ResponderHistory /></ResponderRoute>,
      },
      {
        path: 'responder/missions',
        element: <ResponderRoute><ResponderMissions /></ResponderRoute>,
      },
      {
        path: 'responder/navigation',
        element: <ResponderRoute><ResponderNavigation /></ResponderRoute>,
      },
      {
        path: 'responder/resources',
        element: <ResponderRoute><ResponderResources /></ResponderRoute>,
      },
      {
        path: 'responder/alerts',
        element: <ResponderRoute><ResponderAlerts /></ResponderRoute>,
      },

      // ── AUTHORITY / COMMAND ───────────────────────────────────────────────
      // All command routes mount CommandHome or dedicated views; the component derives the active
      // section from the URL pathname — no secondary internal tab bar.
      {
        path: 'command',
        element: <CommandRoute><CommandHome /></CommandRoute>,
      },
      {
        path: 'command/pending-approvals',
        element: <CommandRoute><PendingApprovalsPage /></CommandRoute>,
      },
      {
        path: 'command/orbit',
        element: <CommandRoute><CommandHome /></CommandRoute>,
      },
      {
        path: 'command/weather',
        element: <CommandRoute><AuthorityWeather /></CommandRoute>,
      },
      {
        path: 'command/warnings',
        element: <CommandRoute><AuthorityWarnings /></CommandRoute>,
      },
      {
        path: 'command/incidents',
        element: <CommandRoute><CommandHome /></CommandRoute>,
      },
      {
        path: 'command/intelligence',
        element: <CommandRoute><CommandHome /></CommandRoute>,
      },
      {
        path: 'command/dispatch',
        element: <CommandRoute><CommandHome /></CommandRoute>,
      },
      {
        path: 'command/evacuation',
        element: <CommandRoute><CommandHome /></CommandRoute>,
      },

      // ── RESOURCE MANAGER ─────────────────────────────────────────────────
      {
        path: 'resources',
        element: <ResourceRoute><ResourceManagerHome /></ResourceRoute>,
      },
      {
        path: 'resources/shelters',
        element: <ResourceRoute><ResourceManagerHome /></ResourceRoute>,
      },
      {
        path: 'resources/supplies',
        element: <ResourceRoute><ResourceManagerHome /></ResourceRoute>,
      },
      {
        path: 'resources/ambulances',
        element: <ResourceRoute><ResourceManagerHome /></ResourceRoute>,
      },
      {
        path: 'resources/equipment',
        element: <ResourceRoute><ResourceManagerHome /></ResourceRoute>,
      },
      {
        path: 'resources/dispatches',
        element: <ResourceRoute><ResourceManagerHome /></ResourceRoute>,
      },

      // 404
      { path: '*', Component: NotFound },
    ],
  },
]);
