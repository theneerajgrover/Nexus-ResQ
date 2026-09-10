import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Role } from '../../store/useAppStore';
import { authApi } from '../../api';
import ConnectionStatus from './ConnectionStatus';

const navConfig: Record<NonNullable<Role>, { label: string; path: string }[]> = {
  citizen: [
    { label: 'HOME', path: '/citizen' },
    { label: 'GET HELP', path: '/citizen/help' },
    { label: 'WEATHER', path: '/citizen/weather' },
    { label: 'HISTORY', path: '/citizen/history' },
    { label: 'ALERTS', path: '/citizen/alerts' },
    { label: 'SHELTERS', path: '/citizen/shelters' },
    { label: 'SAFE ROUTES', path: '/citizen/routes' },
  ],
  responder: [
    { label: 'MISSION', path: '/responder' },
    { label: 'HISTORY', path: '/responder/history' },
    { label: 'INCIDENTS', path: '/responder/missions' },
    { label: 'NAVIGATION', path: '/responder/navigation' },
    { label: 'RESOURCES', path: '/responder/resources' },
    { label: 'ALERTS', path: '/responder/alerts' },
  ],
  authority_command: [
    { label: 'HOME', path: '/command' },
    { label: 'PENDING APPROVALS', path: '/command/pending-approvals' },
    { label: 'COMMAND ORBIT', path: '/command/orbit' },
    { label: 'INTELLIGENCE', path: '/command/intelligence' },
    { label: 'WARNINGS', path: '/command/warnings' },
    { label: 'WEATHER', path: '/command/weather' },
    { label: 'INCIDENTS', path: '/command/incidents' },
    { label: 'DISPATCH', path: '/command/dispatch' },
  ],
  resource_manager: [
    { label: 'OVERVIEW', path: '/resources' },
    { label: 'SHELTERS', path: '/resources/shelters' },
    { label: 'SUPPLIES', path: '/resources/supplies' },
    { label: 'AMBULANCES', path: '/resources/ambulances' },
    { label: 'EQUIPMENT', path: '/resources/equipment' },
    { label: 'DISPATCHES', path: '/resources/dispatches' },
  ],
};

const roleLabels: Record<NonNullable<Role>, string> = {
  citizen: 'CITIZEN',
  responder: 'RESPONDER',
  authority_command: 'AUTHORITY / COMMAND',
  resource_manager: 'RESOURCE MANAGER',
};

const roleColors: Record<NonNullable<Role>, string> = {
  citizen: '#06b6d4',
  responder: '#f59e0b',
  authority_command: '#dc2626',
  resource_manager: '#10b981',
};

export default function Navigation() {
  const { role, logout, isAuthenticated } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<{ id?: string; name?: string; email?: string; phone?: string; phone_number?: string; role?: string } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const isPublicOrAuthRoute = ['/', '/login', '/signup', '/emergency'].includes(location.pathname);

  useEffect(() => {
    if (role && isAuthenticated && !isPublicOrAuthRoute) {
      authApi.getMe(role).then((res) => {
        if (res.success && res.user) {
          setProfile(res.user);
        }
      }).catch(() => {});
    }
  }, [role, isAuthenticated, isPublicOrAuthRoute]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    if (showProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfile]);

  if (!role || !isAuthenticated || isPublicOrAuthRoute) return null;

  const items = navConfig[role] || [];
  const color = roleColors[role];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    localStorage.removeItem('nexus_token');
    logout();
    navigate('/login');
  };

  return (
    <motion.nav
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 glass-strong"
      style={{ borderBottom: `1px solid ${color}22` }}
    >
      <div className="flex items-center h-12 px-4 lg:px-6 gap-3 lg:gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div style={{ filter: `drop-shadow(0 0 8px ${color}88)` }} className="transition-all duration-500">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke={color} strokeWidth="1.5" fill="none" opacity="0.5" />
              <polygon points="14,6 22,10 22,18 14,22 6,18 6,10" stroke={color} strokeWidth="1" fill="none" opacity="0.7" />
              <circle cx="14" cy="14" r="3" fill={color} />
            </svg>
          </div>
          <div>
            <div className="font-condensed font-bold text-sm tracking-widest text-white">NEXUS</div>
            <div className="font-condensed text-xs tracking-widest" style={{ color, lineHeight: '1', marginTop: '-2px' }}>RESQ</div>
          </div>
        </Link>

        {/* Role badge */}
        <div
          className="font-mono text-xs px-2.5 py-1 rounded tracking-widest shrink-0"
          style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}
        >
          {roleLabels[role]}
        </div>

        {/* Nav items */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {items.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="relative inline-flex items-center justify-center h-8 px-2.5 lg:px-3 font-condensed font-semibold text-xs tracking-wider lg:tracking-widest transition-colors duration-200 text-center whitespace-nowrap shrink-0"
                style={{ color: active ? color : 'rgba(232,237,242,0.45)' }}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: `${color}16`, border: `1px solid ${color}33` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4 relative" ref={popoverRef}>
          <ConnectionStatus />

          {/* User Profile Chip */}
          <button
            onClick={() => setShowProfile((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1 rounded font-mono text-xs tracking-wide transition-all cursor-pointer"
            style={{
              background: showProfile ? `${color}25` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showProfile ? `${color}55` : 'rgba(255,255,255,0.1)'}`,
              color: showProfile ? '#fff' : 'rgba(232,237,242,0.7)',
            }}
            title="View User Profile"
          >
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span>{profile?.name || roleLabels[role]}</span>
          </button>

          {/* User Profile Popover */}
          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="absolute right-16 top-12 w-64 p-4 rounded-xl glass-strong shadow-2xl z-50 text-left"
                style={{
                  background: '#0c1017',
                  border: `1px solid ${color}33`,
                  boxShadow: `0 12px 36px rgba(0,0,0,0.6), 0 0 16px ${color}15`,
                }}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
                  <div className="font-condensed font-bold text-sm tracking-wider text-white">
                    USER PROFILE
                  </div>
                  <div
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded tracking-widest"
                    style={{ background: `${color}22`, color }}
                  >
                    {roleLabels[role]}
                  </div>
                </div>

                <div className="space-y-2 mb-4 font-mono text-xs">
                  <div>
                    <div className="text-white/30 text-[10px]">NAME</div>
                    <div className="text-white/90 font-medium">{profile?.name || 'Verified User'}</div>
                  </div>
                  <div>
                    <div className="text-white/30 text-[10px]">EMAIL</div>
                    <div className="text-white/80">{profile?.email || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-white/30 text-[10px]">PHONE</div>
                    <div className="text-white/80">{profile?.phone_number || profile?.phone || 'Not provided'}</div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full py-2 rounded-lg font-condensed font-bold text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  style={{
                    background: 'rgba(220,38,38,0.12)',
                    color: '#f87171',
                    border: '1px solid rgba(220,38,38,0.3)',
                  }}
                >
                  <span>⎋</span>
                  <span>LOG OUT</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Direct Exit Button */}
          <button
            onClick={handleLogout}
            className="font-condensed text-xs tracking-widest px-3 py-1.5 rounded transition-all duration-200 hover:opacity-80 cursor-pointer"
            style={{ color: 'rgba(232,237,242,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            EXIT
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
