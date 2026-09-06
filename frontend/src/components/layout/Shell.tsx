import { Outlet, useLocation } from 'react-router';
import Navigation from './Navigation';
import HumanApprovalPopup from './HumanApprovalPopup';
import { useAppStore } from '../../store/useAppStore';

export default function Shell() {
  const { isAuthenticated } = useAppStore();
  const location = useLocation();

  const isPublicOrAuthRoute = ['/', '/login', '/signup', '/emergency'].includes(location.pathname);
  const showNav = isAuthenticated && !isPublicOrAuthRoute;

  return (
    <div className="relative w-full h-full bg-[#080b0f] overflow-hidden grid-lines">
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 100% 100%, rgba(245,158,11,0.04) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 0% 80%, rgba(220,38,38,0.03) 0%, transparent 50%)
          `,
        }}
      />

      {showNav && <Navigation />}

      <main className={`relative z-10 w-full h-full ${showNav ? 'pt-12' : ''}`}>
        <Outlet />
      </main>

      {/* Global Human Approval Popup for Authority Command */}
      <HumanApprovalPopup />
    </div>
  );
}
