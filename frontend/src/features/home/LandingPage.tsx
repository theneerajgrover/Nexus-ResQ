import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';

const capabilities = [
  { label: 'AI-ASSISTED', desc: '11-agent orchestration' },
  { label: 'REAL-TIME', desc: 'Live incident feeds' },
  { label: 'MULTI-AGENCY', desc: 'Unified command' },
  { label: 'HUMAN-SUPERVISED', desc: 'Approval at every step' },
];

const roles = [
  { icon: '👤', label: 'CITIZEN', color: '#06b6d4', desc: 'Alerts · Shelters · Routes · Help', path: '/citizen' },
  { icon: '🚑', label: 'RESPONDER', color: '#f59e0b', desc: 'Missions · Navigation · Resources', path: '/responder' },
  { icon: '🏛️', label: 'AUTHORITY', color: '#dc2626', desc: 'Command · Intelligence · Dispatch', path: '/command' },
  { icon: '📦', label: 'RESOURCE MGR', color: '#10b981', desc: 'Shelters · Supplies · Equipment', path: '/resources' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="lhg" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon points="15,2 45,2 58,26 45,50 15,50 2,26" fill="none" stroke="white" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#lhg)" />
        </svg>
      </div>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% -5%, rgba(6,182,212,0.09) 0%, transparent 55%),
          radial-gradient(ellipse 45% 35% at 95% 100%, rgba(220,38,38,0.05) 0%, transparent 50%),
          radial-gradient(ellipse 35% 30% at 5% 85%, rgba(16,185,129,0.04) 0%, transparent 50%)
        `,
      }} />

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-8 py-4 shrink-0">
        <div className="flex items-center gap-5">
          <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer">
            <div style={{ filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.5))' }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <polygon points="14,2 26,8 26,20 14,26 2,20 2,8" stroke="#06b6d4" strokeWidth="1.5" fill="none" opacity="0.5" />
                <polygon points="14,6 22,10 22,18 14,22 6,18 6,10" stroke="#06b6d4" strokeWidth="1" fill="none" opacity="0.7" />
                <circle cx="14" cy="14" r="3" fill="#06b6d4" />
              </svg>
            </div>
            <div>
              <div className="font-condensed font-bold text-sm tracking-wider text-white">NEXUS</div>
              <div className="font-condensed text-xs tracking-wider text-cyan-400" style={{ lineHeight: '1', marginTop: '-2px' }}>RESQ</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#06b6d4' }} />
          SYSTEM OPERATIONAL
        </div>
        <div className="font-mono text-xs text-white/25">
          {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
        </div>
      </div>

      {/* Main content — centered */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 gap-8">

        {/* Hero */}
        <motion.div
          className="text-center max-w-2xl"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <div className="font-condensed font-black text-5xl tracking-wide text-white mb-1 leading-tight">
            NEXUS RESQ
          </div>
          <div className="font-condensed font-semibold text-xl tracking-wide mb-3" style={{ color: '#06b6d4', opacity: 0.75 }}>
            NATIONAL EMERGENCY COORDINATION &amp; RESPONSE PLATFORM
          </div>
          <div className="font-mono text-xs text-white/35 leading-relaxed max-w-lg mx-auto">
            AI-assisted, multi-agency disaster coordination — connecting citizens in need with responders, command authorities, and resource networks in real time.
          </div>
        </motion.div>

        {/* Primary CTA */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <motion.button
            onClick={() => navigate('/emergency')}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-condensed font-black text-xl tracking-wide"
            style={{
              background: 'rgba(220,38,38,0.85)',
              color: '#fff',
              border: '2px solid rgba(220,38,38,0.6)',
              boxShadow: '0 0 48px rgba(220,38,38,0.4), 0 4px 24px rgba(0,0,0,0.5)',
            }}
            whileHover={{ scale: 1.03, boxShadow: '0 0 64px rgba(220,38,38,0.55), 0 4px 24px rgba(0,0,0,0.5)' }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="text-2xl">⚠</span>
            GET EMERGENCY HELP
          </motion.button>
          <div className="font-mono text-xs text-white/25">
            Report an emergency · Request assistance · Find shelters &amp; routes
          </div>
        </motion.div>

        {/* Capability strip */}
        <motion.div
          className="flex items-center gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          {capabilities.map((c, i) => (
            <div key={c.label} className="flex items-center gap-2 text-center">
              {i > 0 && <div className="w-px h-6 bg-white/[0.08] mr-4" />}
              <div>
                <div className="font-condensed font-black text-xs tracking-wide text-white/70">{c.label}</div>
                <div className="font-mono text-xs text-white/25" style={{ fontSize: '0.6rem' }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Role entry + Auth row */}
        <motion.div
          className="w-full max-w-3xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Role cards */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            {roles.map((r) => (
              <motion.button
                key={r.label}
                onClick={() => navigate(r.path)}
                className="p-4 rounded-xl text-left flex flex-col gap-2 transition-colors duration-200"
                style={{ background: `${r.color}07`, border: `1px solid ${r.color}20` }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="text-xl">{r.icon}</div>
                <div>
                  <div className="font-condensed font-black text-xs tracking-wide mb-1" style={{ color: r.color }}>{r.label}</div>
                  <div className="font-mono text-white/30 leading-relaxed" style={{ fontSize: '0.6rem' }}>{r.desc}</div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Secondary auth actions */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="font-condensed font-bold text-sm tracking-wide px-5 py-2 rounded-lg transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              LOG IN
            </button>
            <div className="font-mono text-xs text-white/20">·</div>
            <button
              onClick={() => navigate('/signup')}
              className="font-condensed font-bold text-sm tracking-wide px-5 py-2 rounded-lg transition-all duration-200"
              style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              SIGN UP AS CITIZEN
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-20 shrink-0 text-center pb-4">
        <div className="font-mono text-xs text-white/12 tracking-wide">
          AUTHORIZED OPERATIONAL ACCESS ONLY · ALL SESSIONS LOGGED · FOUR OPERATIONAL ROLES
        </div>
      </div>
    </div>
  );
}
