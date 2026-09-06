import { useAppStore } from '../../store/useAppStore';

const states = {
  LIVE: { label: 'LIVE', color: '#10b981', pulse: true },
  RECONNECTING: { label: 'RECONNECTING', color: '#f59e0b', pulse: true },
  OFFLINE: { label: 'OFFLINE', color: '#6b7280', pulse: false },
  STALE: { label: 'STALE DATA', color: '#f59e0b', pulse: false },
};

export default function ConnectionStatus() {
  const connectionState = useAppStore((s) => s.connectionState);
  const cfg = states[connectionState];

  return (
    <div className="flex items-center gap-2 font-mono text-xs tracking-widest" style={{ color: cfg.color }}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${cfg.pulse ? 'live-dot' : ''}`}
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </div>
  );
}
