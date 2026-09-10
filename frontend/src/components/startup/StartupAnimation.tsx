import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StartupAnimationProps {
  onComplete: () => void;
}

// 4 Emergency Coordination Pillars converging into NEXUS
const PILLARS = [
  { label: 'CITIZENS', color: '#06b6d4', x: -140, y: -70, icon: '👤', delay: 0.1 },
  { label: 'INCIDENTS', color: '#dc2626', x: 140, y: -70, icon: '⚠️', delay: 0.2 },
  { label: 'RESOURCES', color: '#10b981', x: -140, y: 70, icon: '📦', delay: 0.3 },
  { label: 'RESPONDERS', color: '#f59e0b', x: 140, y: 70, icon: '🚑', delay: 0.4 },
];

const NEXUS_LETTERS = ['N', 'E', 'X', 'U', 'S'];
const RESQ_LETTERS = ['R', 'E', 'S', 'Q'];

export default function StartupAnimation({ onComplete }: StartupAnimationProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [telemetryText, setTelemetryText] = useState('SYSTEM BOOT // PROTOCOL INITIALIZING');
  const finishedRef = useRef(false);

  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 380);
  };

  useEffect(() => {
    // Check user preference for reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      const quickTimer = setTimeout(handleFinish, 800);
      return () => clearTimeout(quickTimer);
    }

    // Telemetry text updates across the 3-second sequence
    const t1 = setTimeout(() => {
      setTelemetryText('SYNTHESIZING EMERGENCY COORDINATION FABRIC...');
    }, 700);

    const t2 = setTimeout(() => {
      setTelemetryText('CONVERGING DISPATCH, CITIZEN & RESOURCE NETWORKS...');
    }, 1300);

    const t3 = setTimeout(() => {
      setTelemetryText('NEXUS RESQ ENGINE ONLINE // ALL NODES SYNCHRONIZED');
    }, 2200);

    // Guaranteed exit at ~2.7s to initiate smooth transition into Home at 3.0s
    const exitTimer = setTimeout(() => {
      handleFinish();
    }, 2700);

    // Allow user to press Escape or Space to skip
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(exitTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 1.02 : 1 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070a0f] text-white overflow-hidden select-none cursor-pointer"
      onClick={handleFinish}
      title="Click or press ESC to skip"
    >
      {/* ── Background Tactical Grid ────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="startup-hex" x="0" y="0" width="50" height="43.3" patternUnits="userSpaceOnUse">
              <polygon
                points="12.5,1.5 37.5,1.5 48.5,21.6 37.5,41.8 12.5,41.8 1.5,21.6"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#startup-hex)" />
        </svg>
      </div>

      {/* ── Ambient Radial Glow Orbs (4 Corner Emergency Colors) ─────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 45% at 50% 50%, rgba(6,182,212,0.11) 0%, transparent 65%),
            radial-gradient(ellipse 40% 30% at 20% 25%, rgba(6,182,212,0.06) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 80% 25%, rgba(220,38,38,0.06) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 20% 75%, rgba(16,185,129,0.05) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 80% 75%, rgba(245,158,11,0.05) 0%, transparent 50%)
          `,
        }}
      />

      {/* ── HUD Telemetry Top Bar ────────────────────────────────────────────── */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between text-[10px] md:text-xs font-mono text-white/30 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-widest text-cyan-400/70 font-semibold">NEXUS RESQ // OS BOOT</span>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-white/20 tracking-wider">
          <span>AI-ORCHESTRATION: V2.4</span>
          <span>·</span>
          <span>HUMAN-SUPERVISED GATE: ACTIVE</span>
        </div>
        <div className="text-white/25 hover:text-white/50 transition-colors">
          [ESC / CLICK TO SKIP]
        </div>
      </div>

      {/* ── Main Animation Stage ─────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center w-full max-w-2xl px-4">

        {/* Shockwave ring pulse at brand lock-in (2.2s) */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 1.8], opacity: [0, 0.45, 0] }}
          transition={{ delay: 2.15, duration: 0.65, ease: 'easeOut' }}
          className="absolute w-72 h-72 rounded-full pointer-events-none"
          style={{ border: '1.5px solid rgba(6,182,212,0.7)', boxShadow: '0 0 30px rgba(6,182,212,0.4)' }}
        />

        {/* ── Central Converging Vector Network & Emblem ───────────────────── */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center mb-6">
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Radar Rings */}
            <motion.circle
              cx="100"
              cy="100"
              r="85"
              stroke="rgba(6,182,212,0.12)"
              strokeWidth="1"
              strokeDasharray="4 6"
              initial={{ rotate: 0, opacity: 0 }}
              animate={{ rotate: 360, opacity: 1 }}
              transition={{ rotate: { duration: 15, repeat: Infinity, ease: 'linear' }, opacity: { duration: 0.5 } }}
            />
            <motion.circle
              cx="100"
              cy="100"
              r="68"
              stroke="rgba(6,182,212,0.18)"
              strokeWidth="1"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.6 }}
              transition={{ duration: 0.6 }}
            />

            {/* 4 Convergence Vector Beams from Pillars to Center */}
            {/* Top-Left: Citizens */}
            <motion.path
              d="M 20 40 L 100 100"
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="120"
              initial={{ strokeDashoffset: 120, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: [0, 0.8, 0.3] }}
              transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
            />
            {/* Top-Right: Incidents */}
            <motion.path
              d="M 180 40 L 100 100"
              stroke="#dc2626"
              strokeWidth="1.5"
              strokeDasharray="120"
              initial={{ strokeDashoffset: 120, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: [0, 0.8, 0.3] }}
              transition={{ duration: 0.7, delay: 0.55, ease: 'easeOut' }}
            />
            {/* Bottom-Left: Resources */}
            <motion.path
              d="M 20 160 L 100 100"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="120"
              initial={{ strokeDashoffset: 120, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: [0, 0.8, 0.3] }}
              transition={{ duration: 0.7, delay: 0.65, ease: 'easeOut' }}
            />
            {/* Bottom-Right: Responders */}
            <motion.path
              d="M 180 160 L 100 100"
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="120"
              initial={{ strokeDashoffset: 120, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: [0, 0.8, 0.3] }}
              transition={{ duration: 0.7, delay: 0.75, ease: 'easeOut' }}
            />

            {/* Traveling energy packets along the beams */}
            <motion.circle
              r="3"
              fill="#06b6d4"
              initial={{ cx: 20, cy: 40, opacity: 0 }}
              animate={{ cx: [20, 100], cy: [40, 100], opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, delay: 0.6, ease: 'easeInOut' }}
            />
            <motion.circle
              r="3"
              fill="#dc2626"
              initial={{ cx: 180, cy: 40, opacity: 0 }}
              animate={{ cx: [180, 100], cy: [40, 100], opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, delay: 0.7, ease: 'easeInOut' }}
            />
            <motion.circle
              r="3"
              fill="#10b981"
              initial={{ cx: 20, cy: 160, opacity: 0 }}
              animate={{ cx: [20, 100], cy: [160, 100], opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, delay: 0.8, ease: 'easeInOut' }}
            />
            <motion.circle
              r="3"
              fill="#f59e0b"
              initial={{ cx: 180, cy: 160, opacity: 0 }}
              animate={{ cx: [180, 100], cy: [160, 100], opacity: [0, 1, 0] }}
              transition={{ duration: 0.5, delay: 0.9, ease: 'easeInOut' }}
            />

            {/* ── Official Nexus ResQ Double-Hex Shield ────────────────────── */}
            {/* Outer Hexagon (Progressive path drawing: 0.8s - 1.6s) */}
            <motion.polygon
              points="100,50 143,75 143,125 100,150 57,125 57,75"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(6,182,212,0.06)"
              style={{
                strokeDasharray: 300,
                filter: 'drop-shadow(0 0 10px rgba(6,182,212,0.65))',
              }}
              initial={{ strokeDashoffset: 300, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: 1 }}
              transition={{ duration: 0.85, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Inner Hexagon (Counter path drawing: 1.0s - 1.7s) */}
            <motion.polygon
              points="100,64 130,81 130,119 100,136 70,119 70,81"
              stroke="#06b6d4"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="rgba(6,182,212,0.03)"
              style={{
                strokeDasharray: 240,
                filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.5))',
              }}
              initial={{ strokeDashoffset: -240, opacity: 0 }}
              animate={{ strokeDashoffset: 0, opacity: 0.85 }}
              transition={{ duration: 0.75, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Hexagonal Vertex Marker Points */}
            {[
              [100, 50], [143, 75], [143, 125], [100, 150], [57, 125], [57, 75],
            ].map(([vx, vy], idx) => (
              <motion.circle
                key={idx}
                cx={vx}
                cy={vy}
                r="2.5"
                fill="#ffffff"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.9 }}
                transition={{ delay: 1.2 + idx * 0.05, duration: 0.25 }}
              />
            ))}

            {/* Central Nexus Core Node (Ignites at 1.25s) */}
            <motion.circle
              cx="100"
              cy="100"
              r="7"
              fill="#06b6d4"
              style={{ filter: 'drop-shadow(0 0 12px #06b6d4)' }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.4, 1], opacity: 1 }}
              transition={{ delay: 1.25, duration: 0.45, ease: 'easeOut' }}
            />
            <motion.circle
              cx="100"
              cy="100"
              r="3.5"
              fill="#ffffff"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.35, duration: 0.3 }}
            />
          </svg>

          {/* 4 Satellite Entity Nodes with Mini Icons */}
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, scale: 0.5, x: p.x * 1.3, y: p.y * 1.3 }}
              animate={{ opacity: [0, 1, 0.85], scale: 1, x: p.x, y: p.y }}
              transition={{ duration: 0.6, delay: p.delay, ease: 'easeOut' }}
              className="absolute flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono tracking-wider font-semibold border"
              style={{
                background: 'rgba(8, 12, 18, 0.85)',
                borderColor: `${p.color}55`,
                color: p.color,
                boxShadow: `0 0 12px ${p.color}25`,
                backdropFilter: 'blur(8px)',
              }}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </motion.div>
          ))}
        </div>

        {/* ── Dynamic Wordmark Reveal: NEXUS RESQ (1.35s - 2.2s) ────────────── */}
        <div className="relative flex flex-col items-center">

          {/* Laser beam sweep bar that glides across as letters construct */}
          <motion.div
            initial={{ left: '0%', opacity: 0, width: 0 }}
            animate={{
              left: ['5%', '95%'],
              opacity: [0, 1, 1, 0],
              width: ['0px', '40px', '40px', '0px'],
            }}
            transition={{ delay: 1.35, duration: 0.9, ease: 'easeInOut' }}
            className="absolute -top-3 h-0.5 bg-cyan-300 blur-[1px] pointer-events-none"
            style={{ boxShadow: '0 0 12px #06b6d4, 0 0 20px #06b6d4' }}
          />

          {/* NEXUS Letters — Constructed Sequentially with Laser Scan Effect */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            {NEXUS_LETTERS.map((letter, index) => (
              <motion.div
                key={index}
                className="relative overflow-hidden flex items-center justify-center"
                initial={{ opacity: 0, y: 16, scale: 0.85, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{
                  duration: 0.35,
                  delay: 1.38 + index * 0.08, // Staggered: 1.38s, 1.46s, 1.54s, 1.62s, 1.70s
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                {/* Vertical micro scanline during construction */}
                <motion.div
                  initial={{ y: '-100%' }}
                  animate={{ y: '200%' }}
                  transition={{ delay: 1.38 + index * 0.08, duration: 0.35, ease: 'easeIn' }}
                  className="absolute inset-x-0 h-1 bg-cyan-400/80 blur-[1px] z-10"
                />

                <span
                  className="font-condensed font-black text-4xl sm:text-5xl md:text-6xl tracking-widest text-white"
                  style={{
                    textShadow: '0 2px 20px rgba(255,255,255,0.25)',
                    letterSpacing: '0.15em',
                  }}
                >
                  {letter}
                </span>
              </motion.div>
            ))}
          </div>

          {/* RESQ Letters — Formed with Cyan Energy & Tactical Corner Brackets */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.76, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex items-center px-4 py-0.5 mt-0.5"
          >
            {/* Tactical Corner Reticle Brackets */}
            <span
              className="absolute left-0 top-0 text-cyan-400 font-mono text-sm leading-none font-bold"
              style={{ textShadow: '0 0 8px #06b6d4' }}
            >
              ⌜
            </span>
            <span
              className="absolute right-0 bottom-0 text-cyan-400 font-mono text-sm leading-none font-bold"
              style={{ textShadow: '0 0 8px #06b6d4' }}
            >
              ⌟
            </span>

            {/* RESQ letter-by-letter reveal */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {RESQ_LETTERS.map((letter, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.28,
                    delay: 1.78 + index * 0.07, // Staggered: 1.78s, 1.85s, 1.92s, 1.99s
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="font-condensed font-black text-2xl sm:text-3xl md:text-4xl text-cyan-400"
                  style={{
                    letterSpacing: '0.22em',
                    textShadow: '0 0 14px rgba(6,182,212,0.7), 0 0 28px rgba(6,182,212,0.3)',
                  }}
                >
                  {letter}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Subtitle / Platform Mission Statement (Reveals at 2.05s) */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 0.75, y: 0 }}
            transition={{ delay: 2.05, duration: 0.45, ease: 'easeOut' }}
            className="font-mono text-[10px] sm:text-xs text-cyan-300/80 tracking-[0.2em] uppercase mt-4 text-center"
          >
            NATIONAL EMERGENCY COORDINATION &amp; RESPONSE PLATFORM
          </motion.div>
        </div>

        {/* ── Telemetry & Progress Status (Bottom) ──────────────────────────── */}
        <div className="w-full max-w-sm flex flex-col items-center mt-8 gap-2">
          {/* Progress Loading Bar */}
          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden border border-white/[0.08]">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400"
              style={{ boxShadow: '0 0 12px rgba(6,182,212,0.8)' }}
            />
          </div>

          {/* Dynamic Status Text */}
          <div className="flex items-center justify-between w-full font-mono text-[10px] text-white/40 tracking-wider">
            <span className="truncate">{telemetryText}</span>
            <span className="text-cyan-400 font-semibold shrink-0 ml-2">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.7] }}
                transition={{ duration: 0.4, delay: 2.2 }}
              >
                100% READY
              </motion.span>
            </span>
          </div>
        </div>

      </div>

      {/* ── HUD Bottom Information Bar ───────────────────────────────────────── */}
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-[10px] font-mono text-white/20 pointer-events-none">
        <div>SECURITY: ZERO-TRUST // ENCRYPTED AES-256</div>
        <div>REAL-TIME DISASTER INTELLIGENCE</div>
      </div>
    </motion.div>
  );
}
