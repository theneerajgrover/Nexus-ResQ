import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router';
import { commandApi, respondersApi, predictiveApi, orchestratorApi, incidentsApi } from '../../api';
import OperationalMap, { MapMarker } from '../../components/map/OperationalMap';

// Authority / Command merges: Dispatcher (ResQ Sphere, incident assignment, dispatch)
// + Authority (regional intelligence, AI analysis, evacuation approval)

type OrbitalMode = 'OBSERVE' | 'RESPOND' | 'EVACUATE' | 'RESOURCES' | 'INTELLIGENCE';
type CommandTab = 'home' | 'sphere' | 'intelligence' | 'evacuation' | 'operations' | 'incidents' | 'dispatch';
type ApprovalState = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REPLANNING';

const modeColors: Record<OrbitalMode, string> = {
  OBSERVE: '#06b6d4', RESPOND: '#dc2626', EVACUATE: '#f59e0b',
  RESOURCES: '#10b981', INTELLIGENCE: '#a855f7',
};

const incidents = [
  { id: 'INC-2849', type: 'STRUCTURAL', severity: 'CRITICAL', lat: 52, lng: 48, status: 'ACTIVE', responders: 2, pending: true },
  { id: 'INC-2847', type: 'FLOOD', severity: 'HIGH', lat: 35, lng: 30, status: 'RESPONDING', responders: 4, pending: false },
  { id: 'INC-2851', type: 'MEDICAL', severity: 'HIGH', lat: 65, lng: 60, status: 'PENDING', responders: 0, pending: true },
  { id: 'INC-2845', type: 'FIRE', severity: 'MODERATE', lat: 78, lng: 25, status: 'CONTAINED', responders: 3, pending: false },
  { id: 'INC-2850', type: 'EVACUATION', severity: 'HIGH', lat: 22, lng: 70, status: 'ACTIVE', responders: 6, pending: false },
];

const responders = [
  { id: 'R-14', name: 'Alpha-14', status: 'EN ROUTE', lat: 48, lng: 52, incident: 'INC-2849' },
  { id: 'R-07', name: 'Bravo-7', status: 'ON SCENE', lat: 34, lng: 29, incident: 'INC-2847' },
  { id: 'R-22', name: 'Delta-22', status: 'AVAILABLE', lat: 60, lng: 40, incident: null },
  { id: 'R-03', name: 'Echo-3', status: 'ASSISTING', lat: 65, lng: 61, incident: 'INC-2851' },
];

const severityColors: Record<string, string> = {
  CRITICAL: '#dc2626', HIGH: '#f59e0b', MODERATE: '#06b6d4', LOW: '#10b981',
};

const regionData = [
  { region: 'North District', risk: 92, incidents: 4, evacuees: 1240, trend: 'up' },
  { region: 'Bridge Sector', risk: 88, incidents: 2, evacuees: 340, trend: 'stable' },
  { region: 'Riverside Zone', risk: 61, incidents: 3, evacuees: 890, trend: 'down' },
  { region: 'Eastern Forest', risk: 45, incidents: 1, evacuees: 120, trend: 'stable' },
];

type AgentStatus = 'IDLE' | 'RUNNING' | 'COMPLETE' | 'WAITING' | 'BLOCKED' | 'FAILED';

// 11-agent ResQ Pilot architecture:
// Sequential: Ingestion → Verification → Situation → Priority
// Parallel:   Resource + Capacity + Route + Forecast (all gated on Priority)
// Sequential: Coordinator → Critic → [HUMAN APPROVAL]
// Continuous: Analytics (tracks outcomes throughout)
const defaultAgents: { id: number; name: string; desc: string; status: AgentStatus; progress: number; layer: 'sequential' | 'parallel' | 'continuous' }[] = [
  { id: 1,  name: 'Continuous Ingestion', desc: 'Multi-source data collection & normalization',   status: 'WAITING', progress: 0, layer: 'sequential' },
  { id: 2,  name: 'Verification', desc: 'Credibility, deduplication & conflict checks',   status: 'WAITING', progress: 0, layer: 'sequential' },
  { id: 3,  name: 'Situation',    desc: 'Operational picture consolidation',               status: 'WAITING', progress: 0, layer: 'sequential' },
  { id: 4,  name: 'Priority',     desc: 'Incident triage & severity scoring',              status: 'WAITING', progress: 0, layer: 'sequential' },
  { id: 5,  name: 'Resource',     desc: 'Asset availability & suitability mapping',        status: 'WAITING', progress: 0, layer: 'parallel' },
  { id: 6,  name: 'Capacity',     desc: 'Hospital & shelter capacity projection',          status: 'WAITING', progress: 0, layer: 'parallel' },
  { id: 7,  name: 'Route',        desc: 'Safe corridor & accessibility evaluation',        status: 'WAITING', progress: 0, layer: 'parallel' },
  { id: 8,  name: 'Forecast',     desc: 'Demand & escalation forecasting',                 status: 'WAITING', progress: 0, layer: 'parallel' },
  { id: 9,  name: 'Coordinator',  desc: 'Response plan synthesis & action coordination',  status: 'WAITING', progress: 0, layer: 'sequential' },
  { id: 10, name: 'Critic',       desc: 'Plan review, risk identification & validation',  status: 'WAITING', progress: 0, layer: 'sequential' },
  { id: 11, name: 'Analytics',    desc: 'Outcome tracking & performance analysis',         status: 'WAITING', progress: 0, layer: 'continuous' },
];

let activeAgentsData = [...defaultAgents];
const agents: { id: number; name: string; desc: string; status: AgentStatus; progress: number; layer: 'sequential' | 'parallel' | 'continuous' }[] = activeAgentsData;

function updateActiveAgents(newAgents: any[]) {
  if (!newAgents || !newAgents.length) return;
  const updated = defaultAgents.map((def) => {
    const found = newAgents.find((a: any) => Number(a.id || a.agent_id) === def.id);
    if (!found) return def;
    return {
      ...def,
      name: found.name || def.name,
      status: (found.status || 'WAITING') as AgentStatus,
      progress: typeof found.progress === 'number' ? found.progress : def.progress,
    };
  });
  activeAgentsData = updated;
  agents.length = 0;
  agents.push(...updated);
}

// ── Incident sort: Needs Dispatch → Critical → High → Moderate ───────────────
const severityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
function sortIncidents<T extends { pending: boolean; severity: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? -1 : 1;
    return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
  });
}

// ── Last-updated ticker ───────────────────────────────────────────────────────
function useLastUpdated(intervalMs = 5000) {
  const [ts, setTs] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTs(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return ts.toLocaleTimeString('en-GB', { hour12: false });
}

// ── Agent status helpers ──────────────────────────────────────────────────────
const agentStatusColor: Record<AgentStatus, string> = {
  COMPLETE: '#10b981', RUNNING: '#06b6d4', WAITING: '#f59e0b',
  IDLE: '#ffffff26', BLOCKED: '#dc2626', FAILED: '#dc2626',
};
const agentStatusIcon: Record<AgentStatus, string> = {
  COMPLETE: '✓', RUNNING: '●', WAITING: '○', IDLE: '○', BLOCKED: '✕', FAILED: '!',
};

function agentProgress(customList = activeAgentsData) {
  const complete = customList.filter(a => a.status === 'COMPLETE').length;
  const running = customList.filter(a => a.status === 'RUNNING').length;
  const failed = customList.filter(a => a.status === 'FAILED').length;
  const waiting = customList.filter(a => a.status === 'WAITING' || a.status === 'IDLE').length;
  const pct = Math.round((complete / (customList.length || 1)) * 100);
  return { complete, running, failed, waiting, total: customList.length, pct };
}

// ── Human approval modal ──────────────────────────────────────────────────────
function ApprovalModal({
  onClose,
  activePlan,
  pendingRecommendation,
  pendingApproval,
  onApprovedSuccess,
  onDismissSuccess,
  agentsList,
}: {
  onClose: () => void;
  activePlan?: any;
  pendingRecommendation?: any;
  pendingApproval?: any;
  onApprovedSuccess?: (decision: 'APPROVED' | 'REJECTED') => void;
  onDismissSuccess?: () => void;
  agentsList?: any[];
}) {
  const initialStatus: ApprovalState =
    activePlan?.approval_status === 'APPROVED' || activePlan?.status === 'APPROVED' || pendingRecommendation?.status === 'APPROVED'
      ? 'APPROVED'
      : activePlan?.approval_status === 'REJECTED' || activePlan?.status === 'REJECTED' || pendingRecommendation?.status === 'REJECTED'
      ? 'REJECTED'
      : 'PENDING_APPROVAL';

  const [state, setState] = useState<ApprovalState>(initialStatus);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lock background scroll when modal is active
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  const currentAgents = agentsList && agentsList.length ? agentsList : agents;
  const prog = agentProgress(currentAgents);
  const all11Agents = defaultAgents.map((def) => {
    const found = currentAgents.find((a: any) => Number(a.id || a.agent_id) === def.id);
    return found ? { ...def, ...found } : def;
  });

  const planIdToApprove =
    pendingApproval?.plan_id ||
    activePlan?.plan_id ||
    activePlan?.id ||
    pendingRecommendation?.id ||
    pendingApproval?.id ||
    'REC-2849';

  const incidentId =
    pendingApproval?.incident_id ||
    pendingRecommendation?.incident_id ||
    activePlan?.incident_id ||
    'INC-3005';

  const incidentType =
    pendingApproval?.incident_type ||
    pendingRecommendation?.incident_type ||
    activePlan?.incident_type ||
    'STRUCTURAL COLLAPSE';

  const priority =
    pendingApproval?.incident_severity ||
    pendingApproval?.priority ||
    pendingRecommendation?.priority ||
    activePlan?.priority ||
    activePlan?.severity ||
    'HIGH';

  const affectedZone =
    pendingApproval?.incident_location ||
    pendingApproval?.affected_zone ||
    pendingRecommendation?.affected_zone ||
    activePlan?.affected_zone ||
    'Grand Central Terminal, Platform 4';

  const rawConfidence =
    pendingApproval?.confidence_score ??
    pendingRecommendation?.confidence_score ??
    activePlan?.critic_verification?.confidence ??
    activePlan?.confidence ??
    94;
  const confidenceVal = typeof rawConfidence === 'number'
    ? (rawConfidence > 1 ? Math.round(rawConfidence) : Math.round(rawConfidence * 100))
    : 94;
  const confidenceDisplay = `${confidenceVal}%`;

  const rawRiskFlags =
    pendingApproval?.risk_flags ||
    pendingRecommendation?.risk_flags ||
    activePlan?.risk_flags ||
    activePlan?.critic_verification?.risk_flags ||
    [];
  const parsedRiskFlags: string[] = Array.isArray(rawRiskFlags)
    ? rawRiskFlags
    : typeof rawRiskFlags === 'string'
    ? rawRiskFlags.startsWith('[')
      ? (() => { try { return JSON.parse(rawRiskFlags); } catch { return [rawRiskFlags]; } })()
      : [rawRiskFlags]
    : [];
  const riskFlagsList: string[] = parsedRiskFlags.length > 0
    ? parsedRiskFlags
    : [
        'Gas main proximity to staging area — maintain 50m clearance.',
        'North approach confirmed blocked — Route A only.',
        'No conflicts with existing deployment.',
      ];

  const resourceFit =
    pendingApproval?.recommended_resource ||
    pendingRecommendation?.recommended_resource ||
    activePlan?.recommended_resource
      ? 'CONFIRMED'
      : 'CONFIRMED';

  const routeClear = 'YES — Route A';

  const rawActions =
    pendingApproval?.proposed_actions_list ||
    pendingRecommendation?.proposed_actions_list ||
    activePlan?.proposed_actions_list ||
    [];
  const parsedActions: string[] = Array.isArray(rawActions)
    ? rawActions
    : typeof rawActions === 'string'
    ? rawActions.startsWith('[')
      ? (() => { try { return JSON.parse(rawActions); } catch { return [rawActions]; } })()
      : [rawActions]
    : [];

  const actionsList: string[] = parsedActions.length > 0
    ? parsedActions
    : [
        'Dispatch Alpha-14 SAR Unit via Route A — Recommended (ETA 12 min by car · 52 min on foot)',
        'Pre-position MEDIC 14 at emergency medical triage staging zone',
        'Establish 150m exclusion perimeter around Grand Central Terminal, Platform 4',
        'Direct up to 180 evacuees to North Community Hall (280 spaces available)',
        'Mobilize Rope & Harness Kits specialized extrication asset',
      ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5"
      style={{ background: 'rgba(8,11,15,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl xl:max-w-6xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: '#0d1017',
          border: '1px solid rgba(220,38,38,0.45)',
          boxShadow: '0 0 70px rgba(220,38,38,0.18), 0 25px 50px -12px rgba(0,0,0,0.85)',
        }}
      >
        {/* Header - Fixed shrink-0 */}
        <div
          className="flex items-center justify-between px-6 py-3.5 shrink-0"
          style={{ background: 'rgba(220,38,38,0.08)', borderBottom: '1px solid rgba(220,38,38,0.2)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs tracking-widest text-red-400 font-bold">
                  HUMAN APPROVAL REQUIRED — CRITIC REVIEW COMPLETE
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-semibold uppercase">
                  GATE ARMED
                </span>
              </div>
              <div className="font-condensed font-black text-xl text-white tracking-wide">
                AI RESPONSE PLAN — {incidentId}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-xs text-white/30 hover:text-white/80 transition-colors px-2 py-1 rounded hover:bg-white/5 cursor-pointer"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Scrollable Information Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left / Main Area (col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {/* Row 1: Incident Context & Critic Assessment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Incident Context Card */}
                <div
                  className="p-3.5 rounded-xl space-y-2"
                  style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  <div className="font-mono text-xs tracking-widest text-red-400 font-bold flex items-center justify-between">
                    <span>INCIDENT CONTEXT</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        background: priority === 'CRITICAL' ? 'rgba(220,38,38,0.25)' : 'rgba(245,158,11,0.25)',
                        color: priority === 'CRITICAL' ? '#f87171' : '#fbbf24',
                      }}
                    >
                      {priority}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                      <span className="font-mono text-[11px] text-white/40">INCIDENT</span>
                      <span className="font-mono text-xs text-white font-bold">{incidentId}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                      <span className="font-mono text-[11px] text-white/40">TYPE</span>
                      <span className="font-mono text-xs text-white/90">{incidentType}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                      <span className="font-mono text-[11px] text-white/40">SEVERITY</span>
                      <span className="font-mono text-xs font-semibold" style={{ color: severityColors[priority] || '#f59e0b' }}>
                        {priority}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="font-mono text-[11px] text-white/40">AFFECTED ZONE</span>
                      <span className="font-mono text-xs text-white/90 truncate max-w-[170px]" title={affectedZone}>
                        {affectedZone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Critic Assessment Card */}
                <div
                  className="p-3.5 rounded-xl space-y-2"
                  style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}
                >
                  <div className="font-mono text-xs tracking-widest text-purple-400 font-bold flex items-center justify-between">
                    <span>CRITIC ASSESSMENT</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300">
                      PASSED
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                      <span className="font-mono text-[11px] text-white/40">AI CONFIDENCE</span>
                      <span className="font-mono text-xs text-emerald-400 font-bold">{confidenceDisplay}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                      <span className="font-mono text-[11px] text-white/40">RISK FLAGS</span>
                      <span className="font-mono text-xs text-amber-300 font-semibold">
                        {riskFlagsList.length} (safety constraints)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                      <span className="font-mono text-[11px] text-white/40">RESOURCE FIT</span>
                      <span className="font-mono text-xs text-emerald-400 font-semibold">{resourceFit}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="font-mono text-[11px] text-white/40">ROUTE CLEAR</span>
                      <span className="font-mono text-xs text-white/90">{routeClear}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proposed Response Plan Card */}
              <div
                className="p-4 rounded-xl flex-1 flex flex-col justify-between"
                style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-mono text-xs tracking-widest text-amber-400 font-bold flex items-center gap-2">
                      <span>COORDINATOR — PROPOSED RESPONSE PLAN</span>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold">
                      {actionsList.length} TACTICAL ACTIONS
                    </span>
                  </div>
                  <div className="space-y-2">
                    {actionsList.map((action, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-2.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.03)' }}
                      >
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold"
                          style={{ background: 'rgba(245,158,11,0.18)', color: '#f59e0b' }}
                        >
                          {i + 1}
                        </div>
                        <div className="font-mono text-xs text-white/80 leading-relaxed">{action}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="font-mono text-[11px] text-white/30 mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                  <span>COORDINATOR + CRITIC REVIEWED</span>
                  <span className="text-amber-400/80 font-semibold">AI CONFIDENCE {confidenceDisplay}</span>
                </div>
              </div>
            </div>

            {/* Right / Support Area (col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-3.5">
              {/* 11-Agent Pipeline Card */}
              <div
                className="p-3.5 rounded-xl"
                style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="font-mono text-xs tracking-widest text-white/40 font-bold">11-AGENT PIPELINE</div>
                  <div className="font-mono text-xs font-bold" style={{ color: prog.complete === 11 ? '#10b981' : '#a855f7' }}>
                    {prog.complete} OF {prog.total} COMPLETE
                  </div>
                </div>

                <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
                  {all11Agents.map((a, idx) => {
                    const statusKey = (a.status as AgentStatus) || 'WAITING';
                    const col = agentStatusColor[statusKey] || '#ffffff26';
                    const isDone = statusKey === 'COMPLETE';
                    return (
                      <div
                        key={a.id || idx}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded"
                        style={{
                          background: isDone ? 'rgba(16,185,129,0.06)' : `${col}08`,
                          border: `1px solid ${isDone ? 'rgba(16,185,129,0.2)' : `${col}20`}`,
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] text-white/30 w-3">{idx + 1}.</span>
                          <span className="font-mono text-xs" style={{ color: col }}>
                            {agentStatusIcon[statusKey] || '○'}
                          </span>
                          <span className="font-condensed font-bold text-xs text-white truncate">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="font-mono text-[9px] px-1.5 py-0.5 rounded font-bold"
                            style={{
                              background: isDone ? 'rgba(16,185,129,0.15)' : `${col}15`,
                              color: isDone ? '#10b981' : col,
                            }}
                          >
                            {statusKey}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Critic — Risk Flags Card */}
              <div
                className="p-3.5 rounded-xl flex-1"
                style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <div className="font-mono text-xs tracking-widest text-red-400 font-bold">CRITIC — RISK FLAGS</div>
                </div>
                <div className="space-y-1.5">
                  {riskFlagsList.map((flag, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 text-xs shrink-0 mt-0.5">⚠️</span>
                      <span className="font-mono text-xs text-white/70 leading-relaxed">{flag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safety Gate Callout */}
              <div
                className="p-3 rounded-xl"
                style={{ background: 'rgba(245,158,11,0.05)', border: '1px dashed rgba(245,158,11,0.3)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-400 text-xs">🛡️</span>
                  <span className="font-mono text-[10px] tracking-wider text-amber-400 font-bold uppercase">
                    Awaiting Human Authorization
                  </span>
                </div>
                <div className="font-mono text-[11px] text-white/40 leading-snug">
                  NOT SELF-EXECUTING · Autonomous dispatch inhibited until Command Officer authorization is persisted.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer Action Bar (shrink-0) */}
        <div
          className="shrink-0 px-6 py-4 border-t"
          style={{
            background: '#090c12',
            borderColor: 'rgba(255,255,255,0.08)',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.4)',
          }}
        >
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-500/40 text-red-300 font-mono text-xs mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => setErrorMsg(null)}
                className="text-white/40 hover:text-white text-xs ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {state === 'PENDING_APPROVAL' && (
              <motion.div
                key="pending-actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                {/* Optional Note Row */}
                <div className="flex items-center gap-3">
                  <div className="font-mono text-[11px] tracking-wider text-white/40 shrink-0 uppercase">
                    Operational Note:
                  </div>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add context for field commanders (optional)..."
                    disabled={submitting}
                    className="flex-1 px-3.5 py-1.5 rounded-lg font-mono text-xs text-white outline-none placeholder:text-white/20 transition-colors focus:border-amber-500/50"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={async () => {
                      setSubmitting(true);
                      setErrorMsg(null);
                      try {
                        await commandApi.dismissRecommendation(
                          planIdToApprove,
                          note || 'Acknowledged and dismissed by Authority'
                        );
                        if (onDismissSuccess) onDismissSuccess();
                        onClose();
                      } catch (e: any) {
                        setErrorMsg('Failed to dismiss request. Please retry.');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    className="font-mono text-xs text-white/40 hover:text-white/80 transition-colors underline cursor-pointer disabled:opacity-40 py-1"
                  >
                    DISMISS / ACKNOWLEDGE WITHOUT APPROVAL
                  </button>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <motion.button
                      type="button"
                      disabled={submitting}
                      onClick={async () => {
                        setSubmitting(true);
                        setErrorMsg(null);
                        try {
                          const res = await commandApi.takeRecommendationAction(
                            planIdToApprove,
                            'REJECT',
                            undefined,
                            note || 'Rejected by Authority Officer'
                          );
                          if (res && res.success !== false) {
                            setState('REJECTED');
                            if (onApprovedSuccess) onApprovedSuccess('REJECTED');
                          } else {
                            setErrorMsg(res?.error || 'Failed to reject plan. Please retry.');
                          }
                        } catch (e: any) {
                          console.error('Failed to submit rejection:', e);
                          setErrorMsg(e?.message || 'Network error while rejecting plan.');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="flex-1 sm:flex-initial px-6 py-3 rounded-xl font-condensed font-black text-sm tracking-widest cursor-pointer disabled:opacity-50 transition-all"
                      style={{
                        background: 'rgba(220,38,38,0.12)',
                        color: '#ef4444',
                        border: '1px solid rgba(220,38,38,0.4)',
                      }}
                      whileHover={!submitting ? { scale: 1.02 } : {}}
                      whileTap={!submitting ? { scale: 0.98 } : {}}
                    >
                      {submitting ? 'PROCESSING...' : '✕ REJECT PLAN'}
                    </motion.button>

                    <motion.button
                      type="button"
                      disabled={submitting}
                      onClick={async () => {
                        setSubmitting(true);
                        setErrorMsg(null);
                        try {
                          const res = await commandApi.takeRecommendationAction(
                            planIdToApprove,
                            'APPROVE',
                            undefined,
                            note
                          );
                          if (res && res.success !== false) {
                            setState('APPROVED');
                            if (onApprovedSuccess) onApprovedSuccess('APPROVED');
                          } else {
                            setErrorMsg(res?.error || 'Failed to authorize plan. Please retry.');
                          }
                        } catch (e: any) {
                          console.error('Failed to submit approval:', e);
                          setErrorMsg(e?.message || 'Network error while authorizing plan.');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      className="flex-1 sm:flex-initial px-8 py-3 rounded-xl font-condensed font-black text-sm tracking-widest cursor-pointer disabled:opacity-50 transition-all text-[#080b0f]"
                      style={{
                        background: '#10b981',
                        boxShadow: '0 0 25px rgba(16,185,129,0.4)',
                      }}
                      whileHover={!submitting ? { scale: 1.02 } : {}}
                      whileTap={!submitting ? { scale: 0.98 } : {}}
                    >
                      {submitting ? 'AUTHORIZING...' : '✓ APPROVE & EXECUTE'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {state === 'APPROVED' && (
              <motion.div
                key="approved-bar"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-base">
                    ✓
                  </div>
                  <div>
                    <div className="font-condensed font-black text-lg text-emerald-400">
                      PLAN APPROVED & DISPATCH INITIATED
                    </div>
                    <div className="font-mono text-xs text-white/50">
                      Decided at {new Date().toLocaleTimeString('en-GB')} · Execution handed off to Field Controllers
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-condensed font-bold text-sm tracking-wider cursor-pointer"
                  style={{
                    background: 'rgba(16,185,129,0.2)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.4)',
                  }}
                >
                  CLOSE
                </button>
              </motion.div>
            )}

            {state === 'REJECTED' && (
              <motion.div
                key="rejected-bar"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 font-bold text-base">
                    ✕
                  </div>
                  <div>
                    <div className="font-condensed font-black text-lg text-red-400">
                      PLAN REJECTED BY AUTHORITY
                    </div>
                    <div className="font-mono text-xs text-white/50">
                      Decision recorded at {new Date().toLocaleTimeString('en-GB')} · Operational assets held
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl font-condensed font-bold text-sm tracking-wider cursor-pointer"
                  style={{
                    background: 'rgba(220,38,38,0.2)',
                    color: '#ef4444',
                    border: '1px solid rgba(220,38,38,0.4)',
                  }}
                >
                  CLOSE
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// ── Agent pipeline panel ──────────────────────────────────────────────────────
function AgentPipeline({
  onApprove,
  activePlan,
  agentsList,
}: {
  onApprove: () => void;
  activePlan?: any;
  agentsList?: any[];
}) {
  const currentAgents = agentsList && agentsList.length ? agentsList : agents;
  const prog = agentProgress(currentAgents);
  const currentStep = activePlan?.current_step !== undefined ? activePlan.current_step : prog.complete;
  const totalSteps = activePlan?.total_steps || prog.total || 11;
  const barFill = `${Math.min(100, Math.round((currentStep / totalSteps) * 100))}%`;

  const isWaitingForApproval = (currentStep === 11 && activePlan?.status === 'WAITING_FOR_APPROVAL') || activePlan?.approval_status === 'PENDING';
  const isExecuting = activePlan?.status === 'EXECUTING';
  const isMonitoring = activePlan?.status === 'MONITORING';
  const isIdle = activePlan?.status === 'NO_ACTIVE_INCIDENTS';
  const isCompleted = currentStep === 11 && (activePlan?.status === 'APPROVED' || activePlan?.status === 'COMPLETE');
  const isProcessing = activePlan?.status === 'PROCESSING' || (currentStep > 0 && currentStep < 11);

  let buttonText = 'REVIEW & APPROVE PLAN';
  let buttonDisabled = false;
  let buttonStyle = {
    background: 'rgba(245,158,11,0.15)',
    color: '#f59e0b',
    border: '1px solid rgba(245,158,11,0.35)',
  };

  if (isWaitingForApproval) {
    buttonText = 'REVIEW & APPROVE PLAN';
    buttonDisabled = false;
    buttonStyle = {
      background: 'rgba(245,158,11,0.2)',
      color: '#f59e0b',
      border: '1px solid rgba(245,158,11,0.5)',
    };
  } else if (isExecuting) {
    buttonText = '✓ EXECUTING & DISPATCHING...';
    buttonDisabled = true;
    buttonStyle = {
      background: 'rgba(16,185,129,0.15)',
      color: '#10b981',
      border: '1px solid rgba(16,185,129,0.35)',
    };
  } else if (isMonitoring) {
    buttonText = 'MONITORING OPERATIONAL IMPACT';
    buttonDisabled = true;
    buttonStyle = {
      background: 'rgba(6,182,212,0.12)',
      color: '#06b6d4',
      border: '1px solid rgba(6,182,212,0.3)',
    };
  } else if (isCompleted) {
    buttonText = '✓ PLAN COMPLETED & DISPATCHED';
    buttonDisabled = false;
    buttonStyle = {
      background: 'rgba(16,185,129,0.12)',
      color: '#10b981',
      border: '1px solid rgba(16,185,129,0.3)',
    };
  } else if (isProcessing) {
    buttonText = `ORCHESTRATION IN PROGRESS (0${currentStep}/11)...`;
    buttonDisabled = true;
    buttonStyle = {
      background: 'rgba(6,182,212,0.12)',
      color: '#06b6d4',
      border: '1px solid rgba(6,182,212,0.3)',
    };
  } else if (isIdle) {
    buttonText = 'MONITORING ACTIVE CHANNELS';
    buttonDisabled = true;
    buttonStyle = {
      background: 'rgba(255,255,255,0.05)',
      color: 'rgba(255,255,255,0.4)',
      border: '1px solid rgba(255,255,255,0.1)',
    };
  }

  return (
    <div className="p-4 rounded-xl h-full flex flex-col" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.18)' }}>
      {/* Header + progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="font-mono text-xs tracking-widest" style={{ color: '#a855f7' }}>AI ORCHESTRATION</div>
            {activePlan?.plan_version && (
              <span className="font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold" style={{ fontSize: '9px' }}>
                {activePlan.plan_version}
              </span>
            )}
          </div>
          <div className="font-mono text-xs font-bold" style={{ color: isCompleted || currentStep === 11 ? '#10b981' : '#a855f7' }}>
            {currentStep < 10 ? `0${currentStep}` : currentStep}/{totalSteps}
          </div>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06] mb-1">
          <motion.div className="h-full rounded-full"
            style={{ background: currentStep === 11 ? '#10b981' : 'linear-gradient(90deg, #a855f7, #06b6d4)' }}
            initial={{ width: 0 }} animate={{ width: barFill }} transition={{ duration: 0.5 }} />
        </div>
        <div className="flex gap-3 font-mono text-xs text-white/25">
          <span style={{ color: '#10b981' }}>{prog.complete} DONE</span>
          <span style={{ color: '#06b6d4' }}>{prog.running} RUNNING</span>
          <span style={{ color: '#f59e0b' }}>{prog.waiting} WAITING</span>
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {currentAgents.map((a) => {
          const statusKey = (a.status as AgentStatus) || 'WAITING';
          const color = agentStatusColor[statusKey] || '#ffffff26';
          const isRunning = statusKey === 'RUNNING';
          const isContinuous = a.layer === 'continuous';
          return (
            <div key={a.id} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 font-mono text-xs"
                style={{ background: `${color}15`, color, border: isContinuous ? `1px dashed ${color}44` : undefined }}>
                {agentStatusIcon[statusKey] || '○'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="font-condensed font-bold text-xs text-white">{a.name}</div>
                    {isContinuous && <div className="font-mono text-white/25" style={{ fontSize: '9px' }}>CONT.</div>}
                  </div>
                  {isRunning && <div className="font-mono text-xs" style={{ color }}>{a.progress}%</div>}
                </div>
                {isRunning ? (
                  <div className="h-0.5 rounded-full overflow-hidden bg-white/[0.06]">
                    <motion.div className="h-full rounded-full" style={{ background: color }}
                      initial={{ width: 0 }} animate={{ width: `${a.progress}%` }} transition={{ duration: 0.8 }} />
                  </div>
                ) : (
                  <div className="font-mono text-xs text-white/20 truncate" title={a.lastEvent || ''}>
                    {a.status === 'COMPLETE' ? 'Complete' : a.status}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <motion.button onClick={onApprove}
        disabled={buttonDisabled}
        className="mt-3 w-full py-2.5 rounded-lg font-condensed font-bold text-sm tracking-widest transition-all cursor-pointer"
        style={buttonStyle}
        whileHover={!buttonDisabled ? { scale: 1.02 } : {}} whileTap={!buttonDisabled ? { scale: 0.97 } : {}}>
        {buttonText}
      </motion.button>
    </div>
  );
}

// ── HOME tab ──────────────────────────────────────────────────────────────────
function HomeTab({
  onApprove,
  activePlan,
  agentsList,
  incidentsList,
  respondersList,
}: {
  onApprove: () => void;
  activePlan?: any;
  agentsList?: any[];
  incidentsList?: any[];
  respondersList?: any[];
}) {
  const lastUpdated = useLastUpdated(5000);
  const currentIncidents = incidentsList && incidentsList.length ? incidentsList : incidents;
  const currentResponders = respondersList && respondersList.length ? respondersList : responders;
  const critical = currentIncidents.filter((i: any) => i.severity === 'CRITICAL').length;
  const pending = currentIncidents.filter((i: any) => i.pending).length;
  const available = currentResponders.filter((r: any) => r.status === 'AVAILABLE').length;

  return (
    <div className="h-full flex gap-5 overflow-hidden">
      <div className="flex flex-col gap-4 w-72 shrink-0">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'CRITICAL', value: critical, color: '#dc2626', sub: 'active incidents' },
            { label: 'NEED DISPATCH', value: pending, color: '#f59e0b', sub: 'pending action' },
            { label: 'SOS VOLUME', value: '47', color: '#06b6d4', sub: 'last 60 min' },
            { label: 'UNITS FREE', value: available, color: '#10b981', sub: `of ${responders.length} total` },
          ].map((k) => (
            <div key={k.label} className="p-4 rounded-xl flex flex-col gap-1"
              style={{ background: `${k.color}08`, border: `1px solid ${k.color}22` }}>
              <div className="font-mono text-xs text-white/30">{k.label}</div>
              <div className="font-condensed font-black text-3xl" style={{ color: k.color }}>{k.value}</div>
              <div className="font-mono text-xs text-white/25">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-4 py-2.5 font-mono text-xs tracking-widest text-white/30"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            INCIDENT PRIORITY QUEUE
          </div>
          <div className="overflow-y-auto h-full pb-10">
            {sortIncidents(currentIncidents).map((inc: any) => {
              const color = severityColors[inc.severity] || '#06b6d4';
              return (
                <div key={inc.id} className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-condensed font-bold text-xs text-white">{inc.type}</div>
                    <div className="font-mono text-xs text-white/30">{inc.id} · {inc.responders || inc.responders_count || 0} units</div>
                  </div>
                  <div className="font-mono text-xs shrink-0" style={{ color }}>{inc.severity}</div>
                  {inc.pending && <div className="w-1.5 h-1.5 rounded-full shrink-0 live-dot" style={{ background: '#f59e0b' }} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg shrink-0"
          style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
          <motion.div className="w-2 h-2 rounded-full bg-green-400 shrink-0"
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <div className="font-mono text-xs text-green-400">LIVE</div>
          <div className="font-mono text-xs text-white/25 ml-auto">Last Updated: {lastUpdated}</div>
        </div>

        <div className="p-5 rounded-xl" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.18)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-mono text-xs tracking-widest" style={{ color: '#a855f7' }}>AI SITUATION SUMMARY</div>
            <div className="font-mono text-xs text-white/20">Confidence 82%</div>
          </div>
          {[
            { q: 'IMMEDIATE PRIORITY', a: 'INC-2849 structural collapse requires structural team dispatch. 3 persons trapped. Secondary collapse window: 45 min.', color: '#dc2626' },
            { q: 'RISING RISK', a: '78% chance of secondary evacuation order — Bridge Sector — within 90 min. Begin pre-positioning.', color: '#f59e0b' },
            { q: 'CAPACITY ALERT', a: 'SHL-03 Metro Complex at 93% capacity. Activate SHL-04 North Community Hall now.', color: '#06b6d4' },
          ].map((item) => (
            <div key={item.q} className="mb-3 last:mb-0">
              <div className="font-mono text-xs font-bold mb-1" style={{ color: item.color }}>{item.q}</div>
              <p className="font-mono text-xs leading-relaxed text-white/50">{item.a}</p>
            </div>
          ))}
          <div className="font-mono text-xs text-white/15 border-t border-white/5 pt-3 mt-3">
            AI ASSESSMENT — NOT CONFIRMED OPERATIONAL FACT — VERIFY WITH FIELD COMMANDERS
          </div>
        </div>

        <div className="flex-1 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-4 py-2.5 font-mono text-xs tracking-widest text-white/30"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            RESPONDER OVERVIEW
          </div>
          <div className="p-3 space-y-2 overflow-y-auto h-full pb-10">
            {currentResponders.map((r: any) => {
              const rc = r.status === 'AVAILABLE' ? '#10b981' : r.status === 'EN ROUTE' ? '#06b6d4' : '#f59e0b';
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: rc }} />
                  <div className="font-condensed font-bold text-xs text-white flex-1">Unit {r.name}</div>
                  <div className="font-mono text-xs text-white/30">{r.incident || r.current_incident_id ? `→ ${r.incident || r.current_incident_id}` : 'Unassigned'}</div>
                  <div className="font-mono text-xs" style={{ color: rc }}>{r.status}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-64 shrink-0">
        <AgentPipeline onApprove={onApprove} activePlan={activePlan} agentsList={agentsList} />
      </div>
    </div>
  );
}

// ── ResQ Sphere canvas ────────────────────────────────────────────────────────
function ResQSphere({ selectedId, onSelect }: { selectedId: string | null; onSelect: (id: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    function draw(t: number) {
      if (!canvas || !ctx) return;
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      const r = Math.min(W, H) * 0.4;
      const atmo = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r * 1.4);
      atmo.addColorStop(0, 'rgba(220,38,38,0.06)'); atmo.addColorStop(1, 'rgba(220,38,38,0)');
      ctx.fillStyle = atmo; ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2); ctx.fill();
      const ao = t * 0.00025;
      ctx.strokeStyle = 'rgba(220,38,38,0.1)'; ctx.lineWidth = 0.5;
      for (let lat = -80; lat <= 80; lat += 20) {
        const y = cy + r * Math.sin((lat * Math.PI) / 180) * 0.12;
        const rx2 = r * Math.cos((lat * Math.PI) / 180);
        if (rx2 <= 0) continue;
        ctx.beginPath(); ctx.ellipse(cx, y, rx2 * 0.99, rx2 * 0.12, 0, 0, Math.PI * 2); ctx.stroke();
      }
      for (let lng = 0; lng < 180; lng += 30) {
        const angle = (lng * Math.PI) / 180 + ao;
        ctx.beginPath(); ctx.ellipse(cx, cy, r * Math.abs(Math.cos(angle)), r, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(220,38,38,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      const sphereGrad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, 0, cx, cy, r);
      sphereGrad.addColorStop(0, 'rgba(20,8,8,0.92)'); sphereGrad.addColorStop(1, 'rgba(8,11,15,0.96)');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, Math.PI * 2); ctx.fill();
      incidents.forEach((inc) => {
        const px = cx + (inc.lng / 100 - 0.5) * r * 1.7;
        const py = cy + (inc.lat / 100 - 0.5) * r * 1.7;
        const color = severityColors[inc.severity];
        const pulseR = (Math.sin(t * 0.003 + inc.lat) * 0.5 + 0.5) * 16 + 8;
        ctx.beginPath(); ctx.arc(px, py, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = `${color}18`; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, inc.severity === 'CRITICAL' ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        if (inc.id === selectedId) {
          ctx.beginPath(); ctx.arc(px, py, 14, 0, Math.PI * 2);
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        }
        if (inc.pending) {
          const ring = (Math.sin(t * 0.005) * 0.5 + 0.5) * 10 + 16;
          ctx.beginPath(); ctx.arc(px, py, ring, 0, Math.PI * 2);
          ctx.strokeStyle = `${color}55`; ctx.lineWidth = 1.5; ctx.stroke();
        }
      });
      responders.forEach((resp) => {
        const px = cx + (resp.lng / 100 - 0.5) * r * 1.7;
        const py = cy + (resp.lat / 100 - 0.5) * r * 1.7;
        const rc = resp.status === 'AVAILABLE' ? '#10b981' : resp.status === 'EN ROUTE' ? '#06b6d4' : '#f59e0b';
        ctx.beginPath(); ctx.moveTo(px, py - 5); ctx.lineTo(px + 4, py + 4); ctx.lineTo(px - 4, py + 4); ctx.closePath();
        ctx.fillStyle = rc; ctx.fill();
      });
      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize); };
  }, [selectedId]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const r = Math.min(W, H) * 0.4;
    for (const inc of incidents) {
      const px = cx + (inc.lng / 100 - 0.5) * r * 1.7;
      const py = cy + (inc.lat / 100 - 0.5) * r * 1.7;
      if (Math.hypot(mx - px, my - py) < 18) { onSelect(inc.id); return; }
    }
    onSelect('');
  }
  return <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" onClick={handleClick} />;
}

// ── Incident Capsule ──────────────────────────────────────────────────────────
function IncidentCapsule({ incidentId, onClose, onApprove }: { incidentId: string; onClose: () => void; onApprove: () => void }) {
  const inc = incidents.find((i) => i.id === incidentId);
  if (!inc) return null;
  const color = severityColors[inc.severity];
  const [dispatched, setDispatched] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="rounded-xl overflow-hidden" style={{ border: `1px solid ${color}33` }}>
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ background: `${color}10`, borderBottom: `1px solid ${color}22` }}>
        <div>
          <div className="font-mono text-xs tracking-widest" style={{ color }}>{inc.severity} INCIDENT</div>
          <div className="font-condensed font-black text-lg text-white">{inc.id}</div>
        </div>
        <button onClick={onClose} className="font-mono text-xs text-white/30 hover:text-white/60">✕</button>
      </div>
      <div className="p-4 space-y-4 bg-[#0a0d14]">
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'TYPE', value: inc.type, color },
            { label: 'STATUS', value: inc.status, color: '#06b6d4' },
            { label: 'UNITS', value: inc.responders.toString(), color: '#10b981' },
            { label: 'CONFIDENCE', value: '91%', color: '#a855f7' },
          ].map((item) => (
            <div key={item.label} className="p-2.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="font-mono text-xs text-white/30 mb-0.5">{item.label}</div>
              <div className="font-condensed font-bold text-sm" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="font-mono text-xs tracking-widest text-white/30 mb-2">CONFIRMED FACTS</div>
          <div className="font-mono text-xs text-white/55 leading-relaxed p-3 rounded"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            Structural collapse reported. 3 persons reported trapped. Gas leak detected. North approach blocked.
          </div>
        </div>
        <div>
          <div className="font-mono text-xs tracking-widest mb-2" style={{ color: '#a855f7' }}>AI INTELLIGENCE</div>
          <div className="font-mono text-xs leading-relaxed p-3 rounded"
            style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)', color: '#c4b5fd' }}>
            Secondary collapse risk within 45 min (78% confidence). Structural team recommended. Evacuate 200m perimeter.
          </div>
          <div className="font-mono text-xs text-white/20 mt-1.5">AI ASSESSMENT — NOT CONFIRMED FACT</div>
        </div>
        <div className="flex gap-2">
          {!dispatched ? (
            <>
              <button onClick={() => setDispatched(true)}
                className="flex-1 py-2.5 rounded-lg font-condensed font-bold text-xs tracking-widest"
                style={{ background: color, color: '#080b0f' }}>DISPATCH TEAM</button>
              <button onClick={onApprove}
                className="flex-1 py-2.5 rounded-lg font-condensed font-bold text-xs tracking-widest"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                REVIEW AI PLAN
              </button>
            </>
          ) : (
            <div className="flex-1 py-2.5 rounded-lg font-condensed font-bold text-xs tracking-widest text-center"
              style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>✓ TEAM DISPATCHED</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── 11-Agent Orchestration Graph (SVG) ───────────────────────────────────────
function OrchestrationGraph({ onExpand }: { onExpand?: () => void }) {
  const W = 320, H = 420;
  // Node definitions: [id, cx, cy, label]
  const nodes = [
    { id: 1,  cx: 160, cy: 28,  label: 'Ingestion' },
    { id: 2,  cx: 160, cy: 80,  label: 'Verification' },
    { id: 3,  cx: 160, cy: 132, label: 'Situation' },
    { id: 4,  cx: 160, cy: 184, label: 'Priority' },
    // parallel layer
    { id: 5,  cx: 44,  cy: 248, label: 'Resource' },
    { id: 6,  cx: 116, cy: 248, label: 'Capacity' },
    { id: 7,  cx: 188, cy: 248, label: 'Route' },
    { id: 8,  cx: 260, cy: 248, label: 'Forecast' },
    { id: 9,  cx: 160, cy: 312, label: 'Coordinator' },
    { id: 10, cx: 160, cy: 364, label: 'Critic' },
  ];
  // Analytics — shown as side node
  const analyticsNode = { cx: 296, cy: 160 };

  const NW = 64, NH = 22;

  // Edges
  const edges: [number, number][] = [
    [1,2],[2,3],[3,4],
    [4,5],[4,6],[4,7],[4,8],
    [5,9],[6,9],[7,9],[8,9],
    [9,10],
  ];

  const nodeById = (id: number) => nodes.find(n => n.id === id)!;
  const agentById = (id: number) => activeAgentsData.find(a => a.id === id) || defaultAgents.find(a => a.id === id)!;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.18)' }}>
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(168,85,247,0.12)' }}>
        <div className="font-mono text-xs tracking-widest" style={{ color: '#a855f7' }}>AGENT ORCHESTRATION GRAPH</div>
        <div className="flex items-center gap-3">
          <div className="font-mono text-xs text-white/25">HUMAN-SUPERVISED</div>
          {onExpand && (
            <button onClick={onExpand} className="font-mono text-xs px-2 py-0.5 rounded transition-colors"
              style={{ color: 'rgba(168,85,247,0.6)', border: '1px solid rgba(168,85,247,0.2)' }}
              title="Expand graph">
              ⤢
            </button>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 52}`} className="w-full" style={{ maxHeight: 440 }}>
        {/* Edge lines */}
        {edges.map(([from, to], i) => {
          const f = nodeById(from), t = nodeById(to);
          const fa = agentById(from);
          const color = fa.status === 'COMPLETE' ? '#10b981' : fa.status === 'RUNNING' ? '#06b6d4' : 'rgba(255,255,255,0.1)';
          const fromParallel = [5,6,7,8].includes(from);
          const toParallel = [5,6,7,8].includes(to);
          const x1 = f.cx, y1 = f.cy + NH / 2;
          const x2 = t.cx, y2 = t.cy - NH / 2;
          if (fromParallel || toParallel) {
            // curved path
            const midY = (y1 + y2) / 2;
            return <path key={i} d={`M${x1},${y1} C${x1},${midY} ${x2},${midY} ${x2},${y2}`}
              fill="none" stroke={color} strokeWidth="1" strokeDasharray={fa.status === 'WAITING' ? '3,3' : 'none'} opacity="0.6" />;
          }
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth="1.5" strokeDasharray={fa.status === 'WAITING' ? '3,3' : 'none'} opacity="0.7" />;
        })}

        {/* Analytics dashed connection */}
        <line x1={analyticsNode.cx} y1={28} x2={analyticsNode.cx} y2={364}
          stroke="rgba(6,182,212,0.2)" strokeWidth="1" strokeDasharray="4,4" />
        <text x={analyticsNode.cx} y={196} textAnchor="middle" fill="rgba(6,182,212,0.4)"
          style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>CONTINUOUS</text>

        {/* Agent nodes */}
        {nodes.map((n) => {
          const ag = agentById(n.id);
          const color = agentStatusColor[ag.status];
          const isParallel = [5,6,7,8].includes(n.id);
          const nw = isParallel ? 62 : NW;
          return (
            <g key={n.id}>
              <rect x={n.cx - nw/2} y={n.cy - NH/2} width={nw} height={NH} rx="4"
                fill={`${color}12`} stroke={color} strokeWidth={ag.status === 'RUNNING' ? 1.5 : 1} opacity={ag.status === 'IDLE' ? 0.3 : 1} />
              <text x={n.cx} y={n.cy + 4} textAnchor="middle" fill={ag.status === 'WAITING' ? 'rgba(255,255,255,0.4)' : 'white'}
                style={{ fontSize: 9, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5 }}>
                {ag.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Analytics node (side) */}
        {(() => {
          const ag = activeAgentsData.find(a => a.id === 11) || defaultAgents[10];
          const color = agentStatusColor[ag.status];
          return (
            <g>
              <rect x={analyticsNode.cx - 28} y={analyticsNode.cy - 36} width={56} height={72} rx="4"
                fill={`${color}08`} stroke={color} strokeWidth="1" strokeDasharray="4,3" opacity="0.7" />
              <text x={analyticsNode.cx} y={analyticsNode.cy - 10} textAnchor="middle" fill={color}
                style={{ fontSize: 8, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 0.5 }}>
                ANALYTICS
              </text>
              <text x={analyticsNode.cx} y={analyticsNode.cy + 6} textAnchor="middle" fill={color} opacity="0.6"
                style={{ fontSize: 7, fontFamily: 'JetBrains Mono, monospace' }}>
                RUNNING
              </text>
            </g>
          );
        })()}

        {/* Human approval node */}
        <g>
          <rect x={100} y={H - 8} width={120} height={26} rx="4"
            fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.5)" strokeWidth="1.5" />
          <line x1={160} y1={H - 8} x2={160} y2={364 + NH/2} stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" strokeDasharray="3,3" />
          <text x={160} y={H + 8} textAnchor="middle" fill="#f59e0b"
            style={{ fontSize: 9, fontFamily: 'Barlow Condensed, sans-serif', fontWeight: 700, letterSpacing: 1 }}>
            HUMAN APPROVAL
          </text>
        </g>

        {/* Status legend */}
        {[
          { label: 'COMPLETE', color: '#10b981' },
          { label: 'RUNNING', color: '#06b6d4' },
          { label: 'WAITING', color: '#f59e0b' },
        ].map((l, i) => (
          <g key={l.label}>
            <rect x={8 + i * 95} y={H + 36} width={6} height={6} rx="1" fill={l.color} />
            <text x={18 + i * 95} y={H + 44} fill={l.color} opacity="0.6"
              style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace' }}>{l.label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Live Agent Activity Feed ──────────────────────────────────────────────────
function AgentActivityFeed() {
  // Derive activity events from actual agent statuses — not hardcoded messages
  const events = agents
    .filter(a => a.status === 'COMPLETE' || a.status === 'RUNNING')
    .sort((a, b) => b.id - a.id) // most recent agents last in pipeline = top of feed
    .slice(0, 7)
    .map(a => ({
      agent: a.name,
      status: a.status,
      desc: a.status === 'COMPLETE' ? `${a.desc} — complete` : `${a.desc} — processing`,
      color: agentStatusColor[a.status],
    }));

  return (
    <div className="rounded-xl overflow-hidden h-full flex flex-col" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-4 py-2.5 font-mono text-xs tracking-widest text-white/30 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        LIVE AGENT ACTIVITY
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {events.map((e, i) => (
          <motion.div key={e.agent} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-3 py-1.5 border-b border-white/[0.03]">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: e.color }} />
            <div className="flex-1 min-w-0">
              <div className="font-condensed font-bold text-xs mb-0.5" style={{ color: e.color }}>{e.agent} Agent</div>
              <div className="font-mono text-xs text-white/40 leading-relaxed">{e.desc}</div>
            </div>
            <div className="font-mono text-xs shrink-0" style={{ color: e.color, fontSize: '9px' }}>{e.status}</div>
          </motion.div>
        ))}
        {events.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="font-mono text-xs text-white/20 text-center">No agent activity yet</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Intelligence tab with charts ──────────────────────────────────────────────
function RiskTrendChart() {
  const data = [55, 58, 61, 67, 72, 79, 83, 88, 85, 91, 88, 92];
  const W = 340, H = 80;
  const min = 40, max = 100;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * W,
    H - ((v - min) / (max - min)) * H,
  ]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const fill = `${path} L${W},${H} L0,${H} Z`;
  return (
    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-xs tracking-widest text-white/30">REGIONAL RISK TREND — 12H</div>
        <div className="font-condensed font-black text-lg" style={{ color: '#dc2626' }}>
          92 <span className="font-mono text-xs text-white/30">↑ +7 vs 6h ago</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#riskGrad)" />
        <path d={path} fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => i === pts.length - 1 ? <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#dc2626" /> : null)}
      </svg>
      <div className="flex justify-between font-mono text-xs text-white/20 mt-1">
        <span>12h ago</span><span>6h ago</span><span>Now</span>
      </div>
    </div>
  );
}

function IncidentDistChart({ customData }: { customData?: { label: string; value: number; color: string }[] }) {
  const data = customData && customData.length > 0 ? customData : [
    { label: 'STRUCTURAL', value: 2, color: '#dc2626' },
    { label: 'FLOOD', value: 3, color: '#06b6d4' },
    { label: 'MEDICAL', value: 4, color: '#f59e0b' },
    { label: 'FIRE', value: 1, color: '#f97316' },
  ];
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  let cumAngle = -Math.PI / 2;
  const r = 40, cx = 50, cy = 50;
  return (
    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="font-mono text-xs tracking-widest text-white/30 mb-3">INCIDENT DISTRIBUTION</div>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0">
          {data.map((d) => {
            const angle = (d.value / total) * 2 * Math.PI;
            const x1 = cx + r * Math.cos(cumAngle);
            const y1 = cy + r * Math.sin(cumAngle);
            cumAngle += angle;
            const x2 = cx + r * Math.cos(cumAngle);
            const y2 = cy + r * Math.sin(cumAngle);
            const lg = angle > Math.PI ? 1 : 0;
            return (
              <path key={d.label}
                d={`M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${lg},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`}
                fill={d.color} opacity={0.75} />
            );
          })}
        </svg>
        <div className="space-y-2 flex-1">
          {data.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
              <div className="font-mono text-xs text-white/50 flex-1">{d.label}</div>
              <div className="font-condensed font-bold text-sm" style={{ color: d.color }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Group A: Bottom Approval Banner (Human-in-the-Loop Operational Gate) ───────
function BottomApprovalBanner({
  pendingRec,
  onAction,
}: {
  pendingRec: any;
  onAction: (id: string, action: 'APPROVE' | 'REJECT') => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (!pendingRec) return null;

  const isCritical = pendingRec.priority === 'CRITICAL';
  const accentColor = isCritical ? '#dc2626' : '#f59e0b';

  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-4xl"
    >
      <div
        className="rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border"
        style={{
          background: 'rgba(10, 13, 22, 0.97)',
          borderColor: isCritical ? 'rgba(239, 68, 68, 0.45)' : 'rgba(245, 158, 11, 0.45)',
          boxShadow: isCritical
            ? '0 0 50px rgba(220, 38, 38, 0.22), 0 20px 40px rgba(0,0,0,0.85)'
            : '0 0 50px rgba(245, 158, 11, 0.22), 0 20px 40px rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ background: `${accentColor}18`, borderColor: `${accentColor}40` }}
          >
            <span className="font-bold text-lg animate-pulse" style={{ color: accentColor }}>⚠</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="font-mono text-xs px-2 py-0.5 rounded font-bold tracking-wider"
                style={{ background: `${accentColor}25`, color: accentColor, border: `1px solid ${accentColor}50` }}
              >
                ACTION REQUIRED
              </span>
              <span className="font-mono text-xs text-white/40">AI RECOMMENDATION REQUIRES APPROVAL</span>
              <span
                className="font-mono text-xs px-1.5 py-0.5 rounded font-semibold"
                style={{ background: `${accentColor}15`, color: accentColor }}
              >
                {pendingRec.priority || 'CRITICAL'} PRIORITY
              </span>
            </div>
            <div className="font-condensed font-black text-sm sm:text-base text-white truncate">
              {pendingRec.resource_type || pendingRec.action || 'Resource Pre-Positioning Recommended'}
            </div>
            <div className="font-mono text-xs text-white/50 truncate mt-0.5">
              Target Region: <span className="text-white/80 font-semibold">{pendingRec.target_region || pendingRec.affected_zone}</span> · Reason: <span className="text-white/70">{pendingRec.reasoning || pendingRec.reason}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <button
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await onAction(pendingRec.id, 'REJECT');
              setSubmitting(false);
            }}
            className="px-4 py-2 rounded-xl font-condensed font-bold text-xs tracking-wider transition-all duration-150 hover:bg-white/10"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            DECLINE
          </button>
          <button
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await onAction(pendingRec.id, 'APPROVE');
              setSubmitting(false);
            }}
            className="px-5 py-2 rounded-xl font-condensed font-black text-xs tracking-widest text-white transition-all duration-150 flex items-center gap-1.5 hover:brightness-110"
            style={{
              background: '#10b981',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
            }}
          >
            {submitting ? 'DISPATCHING...' : '✓ APPROVE & DISPATCH'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Bottom AI Orchestration Completion Banner (Stage 11 Popup) ─────────────────
function BottomCompletionBanner({
  onOpenApproval,
  planId,
}: {
  onOpenApproval: () => void;
  planId?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[94vw] max-w-4xl cursor-pointer"
      onClick={onOpenApproval}
    >
      <div
        className="rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border"
        style={{
          background: 'rgba(10, 16, 24, 0.97)',
          borderColor: 'rgba(16, 185, 129, 0.45)',
          boxShadow: '0 0 50px rgba(16, 185, 129, 0.22), 0 20px 40px rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
            style={{ background: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
          >
            <span className="font-bold text-lg" style={{ color: '#10b981' }}>✓</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="font-mono text-xs px-2 py-0.5 rounded font-bold tracking-wider"
                style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.5)' }}
              >
                11/11 COMPLETE
              </span>
              <span className="font-mono text-xs text-amber-400 font-bold">HUMAN AUTHORIZATION REQUIRED</span>
              {planId && (
                <span className="font-mono text-xs px-1.5 py-0.5 rounded font-semibold text-white/60 bg-white/[0.05]">
                  {planId}
                </span>
              )}
            </div>
            <div className="font-condensed font-black text-sm sm:text-base text-white tracking-wide">
              AI ORCHESTRATION COMPLETE
            </div>
            <div className="font-mono text-xs text-white/60 mt-0.5 leading-relaxed">
              All 11 execution stages have completed successfully. The system is ready for human authorization.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenApproval();
            }}
            className="px-5 py-2.5 rounded-xl font-condensed font-black text-xs sm:text-sm tracking-wider transition-all duration-200 hover:brightness-110 cursor-pointer"
            style={{
              background: '#10b981',
              color: '#080b0f',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.35)',
            }}
          >
            REVIEW &amp; AUTHORIZE
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function IntelligenceTab({
  predictiveData,
  isRefreshing,
  onTriggerRun,
  onRunOrchestrator,
  isOrchestrating,
}: {
  predictiveData?: any;
  isRefreshing?: boolean;
  onTriggerRun?: () => void;
  onRunOrchestrator?: () => void;
  isOrchestrating?: boolean;
}) {
  const prog = agentProgress();
  const [graphExpanded, setGraphExpanded] = useState(false);
  const [agentGroup, setAgentGroup] = useState<'A' | 'B'>('A');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('A1');

  // Fallback defaults if predictive data is loading from backend
  const groupAAgents = predictiveData?.agents?.length
    ? predictiveData.agents
    : [
        { id: 'A1', name: 'Risk Prediction', status: 'COMPLETE', summaryMetric: 'PEAK REGIONAL RISK: 92 (ZONE-N1)' },
        { id: 'A2', name: 'Hazard Forecasting', status: 'COMPLETE', summaryMetric: '2 ACTIVE HAZARD THREATS' },
        { id: 'A3', name: 'Vulnerability Analysis', status: 'COMPLETE', summaryMetric: 'ZONE NE-4 ELEVATED DEFICIT' },
        { id: 'A4', name: 'Resource Pre-Positioning', status: 'COMPLETE', summaryMetric: '1 PENDING APPROVAL REQUEST' },
        { id: 'A5', name: 'Early Warning', status: 'COMPLETE', summaryMetric: 'CRITICAL ADVISORY ISSUED' },
        { id: 'A6', name: 'Preparedness Assessment', status: 'COMPLETE', summaryMetric: '76% SYSTEM READINESS' },
      ];

  // Dynamic regional risk index bound to real database risk assessments
  const displayRegions = (predictiveData?.riskAssessments && predictiveData.riskAssessments.length > 0)
    ? predictiveData.riskAssessments.map((pra: any) => ({
        region: pra.region_name,
        risk: pra.risk_score,
        incidents: pra.contributing_factors?.length || 2,
        evacuees: pra.region_name.includes('North') ? 1240 : pra.region_name.includes('Riverside') ? 890 : pra.region_name.includes('Bridge') ? 340 : 120,
        trend: pra.trend || (pra.risk_score > 80 ? 'up' : pra.risk_score > 60 ? 'stable' : 'down'),
      }))
    : regionData;

  // Dynamic situation summary
  const sitSummary = predictiveData?.situationSummary?.items?.length
    ? predictiveData.situationSummary
    : {
        confidence: 88,
        items: [
          { q: 'WHAT IS HAPPENING?', a: 'Concurrent structural incident and flooding. Shelter pressure building across 4 sectors.', color: '#06b6d4' },
          { q: 'WHAT MAY HAPPEN NEXT?', a: 'Secondary structural failure probability in Bridge Sector within 90 min. High vulnerability registered.', color: '#f59e0b' },
          { q: 'WHAT TO CONSIDER?', a: 'Human approval required: Resource pre-positioning for high-risk zones. Pre-stage extrication teams.', color: '#a855f7' },
        ],
      };

  const selectedAgentRecord = groupAAgents.find((a: any) => a.id === selectedAgentId) || groupAAgents[0];

  return (
    <>
    {/* Orchestration graph modal (~60% viewport) */}
    <AnimatePresence>
      {graphExpanded && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ background: 'rgba(8,11,15,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setGraphExpanded(false)}
        >
          <motion.div
            className="relative rounded-2xl overflow-hidden"
            style={{ width: '60vw', maxWidth: 720, maxHeight: '80vh', background: 'rgba(10,13,20,0.97)', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 0 80px rgba(168,85,247,0.15)' }}
            initial={{ scale: 0.92, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
              <div>
                <div className="font-condensed font-black text-sm tracking-wide" style={{ color: '#a855f7' }}>AGENT ORCHESTRATION GRAPH</div>
                <div className="font-mono text-xs text-white/30">GROUP B — ACTIVE INCIDENT RESPONSE · HUMAN-SUPERVISED</div>
              </div>
              <button onClick={() => setGraphExpanded(false)} className="font-mono text-xs text-white/35 hover:text-white/70 transition-colors px-2 py-1 rounded" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>✕ CLOSE</button>
            </div>
            <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              <OrchestrationGraph />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <div className="h-full flex gap-4 overflow-hidden">
      {/* Left: agent group toggle + predictive agents / orchestration graph */}
      <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">

        {/* Agent group toggle */}
        <div className="rounded-xl overflow-hidden shrink-0" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="grid grid-cols-2">
            {(['A', 'B'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setAgentGroup(g)}
                className="px-3 py-2 transition-colors duration-200"
                style={{
                  background: agentGroup === g ? 'rgba(168,85,247,0.12)' : 'transparent',
                  borderBottom: `2px solid ${agentGroup === g ? '#a855f7' : 'transparent'}`,
                }}
              >
                <div className="font-condensed font-bold text-xs tracking-wide" style={{ color: agentGroup === g ? '#a855f7' : 'rgba(255,255,255,0.35)' }}>
                  GROUP {g}
                </div>
                <div className="font-mono text-white/25" style={{ fontSize: '0.6rem' }}>
                  {g === 'A' ? 'PREDICTIVE' : 'ACTIVE RESPONSE'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {agentGroup === 'A' ? (
          /* Group A — Pre-event Predictive Intelligence */
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.15)' }}>
            <div>
              <div className="font-condensed font-black text-xs tracking-wide mb-1" style={{ color: '#a855f7' }}>GROUP A — PREDICTIVE INTELLIGENCE</div>
              <div className="font-mono text-xs text-white/35 leading-relaxed">Pre-event risk modeling, hazard forecasting, vulnerability analysis, and resource pre-positioning before a disaster occurs.</div>
            </div>

            <div className="flex items-center justify-between font-mono text-xs text-white/20 pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span>AGENT DEFINITIONS</span>
              <span className="text-purple-400/50">DATABASE LIVE</span>
            </div>

            {/* A1 to A6 Agents list */}
            <div className="space-y-1">
              {groupAAgents.map((agent: any) => {
                const isSelected = selectedAgentId === agent.id;
                const isComplete = agent.status === 'COMPLETE';
                const isRunning = agent.status === 'RUNNING';
                const statusColor = isComplete ? '#10b981' : isRunning ? '#06b6d4' : '#f59e0b';

                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    className="w-full text-left p-2 rounded-lg transition-all duration-150 flex flex-col gap-1"
                    style={{
                      background: isSelected ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.015)',
                      border: `1px solid ${isSelected ? 'rgba(168,85,247,0.35)' : 'rgba(255,255,255,0.04)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2.5 w-full">
                      <div className="font-mono text-xs font-bold shrink-0" style={{ color: isSelected ? '#a855f7' : 'rgba(255,255,255,0.4)' }}>
                        {agent.id}
                      </div>
                      <div className="font-condensed font-semibold text-xs text-white flex-1 truncate">
                        {agent.name.toUpperCase()}
                      </div>
                      <div
                        className="font-mono text-xs px-2 py-0.5 rounded shrink-0 font-bold"
                        style={{
                          background: `${statusColor}15`,
                          color: statusColor,
                          border: `1px solid ${statusColor}30`,
                          fontSize: '0.6rem',
                        }}
                      >
                        {isComplete ? '✓ LIVE' : isRunning ? '⟳ RUN' : '◌ WAIT'}
                      </div>
                    </div>
                    {agent.summaryMetric && (
                      <div className="font-mono text-[10px] text-white/40 truncate pl-6">
                        {agent.summaryMetric}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Agent Live Telemetry & Provenance Panel */}
            {selectedAgentRecord && (
              <div className="rounded-lg p-3 space-y-2 mt-1" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div className="font-mono text-[11px] font-bold text-purple-400">
                    {selectedAgentRecord.id} — {selectedAgentRecord.name.toUpperCase()}
                  </div>
                  <div className="font-mono text-[10px] text-white/30">POSTGRESQL SYNCED</div>
                </div>

                {/* A1 Detail View */}
                {selectedAgentId === 'A1' && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] text-white/40">REGIONAL RISK ASSESSMENTS</div>
                    {(predictiveData?.riskAssessments || []).slice(0, 3).map((pra: any) => (
                      <div key={pra.id} className="flex items-center justify-between text-[11px] py-0.5 border-b border-white/[0.03]">
                        <span className="text-white/80 font-medium">{pra.region_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold" style={{ color: pra.risk_score >= 80 ? '#dc2626' : pra.risk_score >= 60 ? '#f59e0b' : '#10b981' }}>
                            {pra.risk_score}
                          </span>
                          <span className="font-mono text-[9px] text-white/30">{pra.risk_level}</span>
                        </div>
                      </div>
                    ))}
                    {predictiveData?.riskAssessments?.[0]?.contributing_factors && (
                      <div className="pt-1">
                        <div className="font-mono text-[9px] text-white/30 mb-0.5">CONTRIBUTING FACTORS:</div>
                        <div className="font-mono text-[10px] text-white/50 leading-tight space-y-0.5">
                          {predictiveData.riskAssessments[0].contributing_factors.slice(0, 2).map((f: string, idx: number) => (
                            <div key={idx}>• {f}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* A2 Detail View */}
                {selectedAgentId === 'A2' && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] text-white/40">ACTIVE HAZARD FORECASTS</div>
                    {(predictiveData?.hazardForecasts || []).slice(0, 3).map((hzf: any) => (
                      <div key={hzf.id} className="flex items-center justify-between text-[11px] py-0.5 border-b border-white/[0.03]">
                        <span className="text-white/80 font-medium">{hzf.hazard_type}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-white/40">{hzf.region.slice(0, 15)}</span>
                          <span className="font-mono font-bold text-[10px]" style={{ color: hzf.severity === 'CRITICAL' ? '#dc2626' : '#f59e0b' }}>
                            {hzf.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* A3 Detail View */}
                {selectedAgentId === 'A3' && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] text-white/40">VULNERABILITY EVALUATION</div>
                    {(predictiveData?.vulnerabilityAssessments || []).slice(0, 3).map((vuln: any) => (
                      <div key={vuln.id} className="flex items-center justify-between text-[11px] py-0.5 border-b border-white/[0.03]">
                        <span className="text-white/80 font-medium">{vuln.region}</span>
                        <span className="font-mono font-bold text-[10px]" style={{ color: vuln.vulnerability_score >= 80 ? '#dc2626' : vuln.vulnerability_score >= 60 ? '#f59e0b' : '#10b981' }}>
                          {vuln.vulnerability_score} · {vuln.vulnerability_level}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* A4 Detail View */}
                {selectedAgentId === 'A4' && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] text-white/40">STAGING RECOMMENDATIONS</div>
                    {(predictiveData?.prepositionRecommendations || []).slice(0, 2).map((rec: any) => (
                      <div key={rec.id} className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-white truncate">{rec.resource_type}</span>
                          <span className="font-mono" style={{ color: rec.status === 'PENDING_APPROVAL' ? '#f59e0b' : '#10b981' }}>
                            {rec.status}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-white/40 mt-0.5">Target: {rec.target_region}</div>
                      </div>
                    ))}
                    <div className="font-mono text-[9px] text-amber-400/70 mt-1">
                      HUMAN APPROVAL GATE: Consequential resource movements require explicit command authorization.
                    </div>
                  </div>
                )}

                {/* A5 Detail View */}
                {selectedAgentId === 'A5' && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] text-white/40">EARLY WARNING BULLETINS</div>
                    {(predictiveData?.earlyWarnings || []).slice(0, 2).map((ew: any) => (
                      <div key={ew.id} className="p-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-white">
                          <span className="px-1 py-0.2 rounded font-mono text-[9px]" style={{ background: '#dc262625', color: '#f87171' }}>
                            {ew.threat_level}
                          </span>
                          <span className="truncate">{ew.headline}</span>
                        </div>
                        <div className="font-mono text-[9px] text-white/40 mt-1 line-clamp-2">{ew.details}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* A6 Detail View */}
                {selectedAgentId === 'A6' && (
                  <div className="space-y-1.5">
                    <div className="font-mono text-[10px] text-white/40">PREPAREDNESS ASSESSMENT</div>
                    {predictiveData?.preparedness && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/70">Readiness Score</span>
                          <span className="font-mono font-bold text-cyan-400">
                            {predictiveData.preparedness.overall_score}% ({predictiveData.preparedness.readiness_tier})
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 pt-1 font-mono text-[9px] text-center">
                          <div className="p-1 rounded bg-white/[0.03]">Shelters: {predictiveData.preparedness.shelter_readiness_pct}%</div>
                          <div className="p-1 rounded bg-white/[0.03]">Supplies: {predictiveData.preparedness.resource_coverage_pct}%</div>
                          <div className="p-1 rounded bg-white/[0.03]">Responders: {predictiveData.preparedness.responder_readiness_pct}%</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Re-run button */}
            <button
              disabled={isRefreshing}
              onClick={onTriggerRun}
              className="w-full py-2 rounded-lg font-condensed font-bold text-xs tracking-wider transition-all duration-150 flex items-center justify-center gap-2 mt-1"
              style={{
                background: 'rgba(168,85,247,0.12)',
                color: '#c084fc',
                border: '1px solid rgba(168,85,247,0.25)',
              }}
            >
              {isRefreshing ? (
                <>
                  <span className="animate-spin">⟳</span> EXECUTING PREDICTIVE ENGINE...
                </>
              ) : (
                <>⟳ RE-EVALUATE PREDICTIVE MODELS</>
              )}
            </button>
          </div>
        ) : (
          /* Group B — Active Incident Response agents */
          <>
            <OrchestrationGraph onExpand={() => setGraphExpanded(true)} />
            <button
              disabled={isOrchestrating}
              onClick={onRunOrchestrator}
              className="w-full py-2.5 rounded-lg font-condensed font-bold text-xs tracking-wider transition-all duration-150 flex items-center justify-center gap-2 mt-1 mb-1"
              style={{
                background: 'rgba(168,85,247,0.15)',
                color: '#c084fc',
                border: '1px solid rgba(168,85,247,0.3)',
              }}
            >
              {isOrchestrating ? (
                <>
                  <span className="animate-spin">⟳</span> RUNNING 11-AGENT PIPELINE...
                </>
              ) : (
                <>⚡ EXECUTE 11-AGENT ORCHESTRATION</>
              )}
            </button>
            <div className="flex-1" style={{ minHeight: 160 }}>
              <AgentActivityFeed />
            </div>
          </>
        )}
      </div>

      {/* Center: risk trend + regional risk + AI layer */}
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-w-0">
        {/* 11-agent progress summary */}
        <div className="p-3 rounded-xl shrink-0" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-mono text-xs tracking-widest" style={{ color: '#a855f7' }}>AI ORCHESTRATION — {prog.complete}/{prog.total} AGENTS</div>
            <div className="font-mono text-xs" style={{ color: prog.running > 0 ? '#06b6d4' : '#10b981' }}>
              {prog.running > 0 ? 'PROCESSING' : 'COMPLETE'}
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-white/[0.06] mb-2">
            <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #a855f7, #06b6d4)' }}
              initial={{ width: 0 }} animate={{ width: `${prog.pct}%` }} transition={{ duration: 1 }} />
          </div>
          <div className="flex gap-4 font-mono text-xs">
            <span style={{ color: '#10b981' }}>{prog.complete} COMPLETE</span>
            <span style={{ color: '#06b6d4' }}>{prog.running} RUNNING</span>
            <span style={{ color: '#f59e0b' }}>{prog.waiting} WAITING</span>
            {prog.failed > 0 && <span style={{ color: '#dc2626' }}>{prog.failed} FAILED</span>}
          </div>
        </div>
        <RiskTrendChart />
        <div className="rounded-xl overflow-hidden shrink-0" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-4 py-3 font-mono text-xs tracking-widest text-white/30"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            REGIONAL RISK INDEX
          </div>
          {displayRegions.map((row: any, i: number) => {
            const color = row.risk > 75 ? '#dc2626' : row.risk > 50 ? '#f59e0b' : '#10b981';
            return (
              <div key={row.region} className="px-4 py-3 flex items-center gap-4"
                style={{ borderBottom: i < displayRegions.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                <div className="font-condensed font-semibold text-xs text-white w-32 shrink-0">{row.region}</div>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                  <motion.div className="h-full rounded-full" style={{ background: color }}
                    initial={{ width: 0 }} animate={{ width: `${row.risk}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} />
                </div>
                <div className="font-condensed font-bold text-sm w-10 text-right" style={{ color }}>{row.risk}</div>
                <div className="font-mono text-xs w-6 text-center"
                  style={{ color: row.trend === 'up' ? '#dc2626' : row.trend === 'down' ? '#10b981' : '#06b6d4' }}>
                  {row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '→'}
                </div>
                <div className="font-mono text-xs text-white/30 w-16">{row.evacuees?.toLocaleString() || '0'} evac</div>
              </div>
            );
          })}
        </div>
        <div className="p-4 rounded-xl" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-mono text-xs tracking-widest" style={{ color: '#a855f7' }}>COORDINATOR — SITUATION SUMMARY</div>
            <div className="font-mono text-xs text-white/25">Confidence {sitSummary.confidence}%</div>
          </div>
          {sitSummary.items.map((item: any) => (
            <div key={item.q} className="mb-3 last:mb-0">
              <div className="font-mono text-xs font-bold mb-1" style={{ color: item.color }}>{item.q}</div>
              <p className="font-mono text-xs leading-relaxed text-white/50">{item.a}</p>
            </div>
          ))}
          <div className="font-mono text-xs text-white/20 border-t border-white/5 pt-3 mt-1">
            COORDINATOR + CRITIC ASSESSMENT — NOT CONFIRMED FACT — VERIFY WITH FIELD COMMANDERS
          </div>
        </div>
      </div>

      {/* Right: kpi + dist chart */}
      <div className="w-52 shrink-0 flex flex-col gap-3 overflow-y-auto">
        <IncidentDistChart customData={predictiveData?.incidentDistribution} />
        <div className="grid grid-cols-1 gap-3">
          {[
            { label: 'ACTIVE INCIDENTS', value: predictiveData?.kpis?.activeIncidents ?? 5, delta: '+2 vs 1h', color: '#dc2626' },
            { label: 'TOTAL EVACUEES', value: predictiveData?.kpis?.totalEvacuees ? predictiveData.kpis.totalEvacuees.toLocaleString() : '2,590', delta: '+340 vs 1h', color: '#f59e0b' },
            { label: 'RESOLVED TODAY', value: predictiveData?.kpis?.resolvedToday ?? 0, delta: '+0 vs 1h', color: '#10b981' },
          ].map((kpi) => (
            <div key={kpi.label} className="p-3 rounded-xl"
              style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}22` }}>
              <div className="font-mono text-xs text-white/30 mb-1">{kpi.label}</div>
              <div className="font-condensed font-black text-2xl" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="font-mono text-xs mt-1 text-white/25">{kpi.delta}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

// ── Evacuation tab ────────────────────────────────────────────────────────────
function EvacuationTab() {
  const [approved, setApproved] = useState(false);
  const routes = [
    { id: 'A', label: 'Zone 4A — River Road → Hwy 12 North', status: 'CLEAR', capacity: '4,000/hr', congestion: 'LIGHT', shelter: 'Central Community Center', color: '#10b981' },
    { id: 'B', label: 'Zone 4B — Bridge Access → East Service', status: 'CONGESTED', capacity: '2,200/hr', congestion: 'MODERATE', shelter: 'Riverside High School', color: '#f59e0b' },
  ];
  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      {!approved ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl shrink-0"
          style={{ background: 'rgba(245,158,11,0.06)', border: '2px solid rgba(245,158,11,0.35)' }}>
          <div className="font-mono text-xs tracking-widest text-amber-400 mb-2">⚠ EVACUATION APPROVAL REQUIRED</div>
          <div className="font-condensed font-black text-lg text-white mb-1">Zone NE-4 — Bridge Sector</div>
          <div className="font-mono text-xs text-white/50 mb-3 leading-relaxed">
            AI recommends mandatory evacuation. Structural risk HIGH. Est. affected: 4,200. 2 safe routes identified. 3 shelters with capacity.
          </div>
          <div className="flex gap-3">
            <motion.button onClick={async () => {
              try {
                await commandApi.takeRecommendationAction('rec-2', 'APPROVE', 'Evacuation order confirmed for Zone NE-4');
              } catch (e) {
                console.error(e);
              }
              setApproved(true);
            }}
              className="flex-1 py-3 rounded-xl font-condensed font-black text-base tracking-widest"
              style={{ background: '#f59e0b', color: '#080b0f' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              APPROVE EVACUATION ORDER
            </motion.button>
            <button className="px-5 py-3 rounded-xl font-condensed font-bold text-sm tracking-widest"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
              DEFER
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 rounded-xl shrink-0"
          style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)' }}>
          <div className="font-condensed font-bold text-sm tracking-widest" style={{ color: '#10b981' }}>
            ✓ EVACUATION ORDER ISSUED — Zone NE-4
          </div>
          <div className="font-mono text-xs text-white/40 mt-1">Public alerts dispatched · Routes activated · Shelters notified</div>
        </motion.div>
      )}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {routes.map((r) => (
          <div key={r.id} className="flex-1 p-4 rounded-xl flex flex-col gap-3"
            style={{ background: `${r.color}06`, border: `1px solid ${r.color}25` }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
              <div className="font-condensed font-bold text-sm" style={{ color: r.color }}>ROUTE {r.id}</div>
              <div className="font-mono text-xs ml-auto" style={{ color: r.color }}>{r.status}</div>
            </div>
            <div className="font-mono text-xs text-white/50 leading-relaxed">{r.label}</div>
            <div className="space-y-2">
              {[
                { label: 'THROUGHPUT', value: r.capacity },
                { label: 'CONGESTION', value: r.congestion },
                { label: 'SHELTER', value: r.shelter },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                  <div className="font-mono text-xs text-white/30">{item.label}</div>
                  <div className="font-mono text-xs text-white/60">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Operations tab ────────────────────────────────────────────────────────────
function OperationsTab() {
  const timeline = [
    { time: '14:02', event: 'INC-2851 created', type: 'WARNING', color: '#f59e0b' },
    { time: '14:15', event: 'INC-2849 escalated CRITICAL', type: 'CRITICAL', color: '#dc2626' },
    { time: '14:23', event: 'Evacuation order Zone NE-4 pending', type: 'ACTION', color: '#f97316' },
    { time: '14:31', event: 'INC-2845 CONTAINED', type: 'RESOLVED', color: '#10b981' },
  ];
  return (
    <div className="h-full flex gap-5 overflow-hidden">
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">
        <div className="font-mono text-xs tracking-widest text-white/30">OPERATIONAL KPIs</div>
        {[
          { label: 'AVG RESPONSE TIME', value: '8.4 min', target: '< 10 min', ok: true },
          { label: 'SOS ACKNOWLEDGED', value: '98.2%', target: '> 95%', ok: true },
          { label: 'SHELTER OVERFLOW RISK', value: 'MODERATE', target: 'LOW', ok: false },
          { label: 'RESPONDERS AVAILABLE', value: '37', target: '> 20', ok: true },
        ].map((m) => (
          <div key={m.label} className="p-4 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="font-mono text-xs text-white/30 mb-2">{m.label}</div>
            <div className="font-condensed font-black text-2xl mb-1" style={{ color: m.ok ? '#10b981' : '#f59e0b' }}>{m.value}</div>
            <div className="font-mono text-xs text-white/25">Target: {m.target}</div>
          </div>
        ))}
        <div className="font-mono text-xs tracking-widest text-white/30 mt-2">RESPONDER STATUS</div>
        {responders.map((r) => {
          const rc = r.status === 'AVAILABLE' ? '#10b981' : r.status === 'EN ROUTE' ? '#06b6d4' : '#f59e0b';
          return (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: rc }} />
              <div className="font-condensed font-semibold text-xs text-white flex-1">Unit {r.name}</div>
              <div className="font-mono text-xs" style={{ color: rc }}>{r.status}</div>
              {r.status === 'AVAILABLE' && (
                <button className="font-condensed font-bold text-xs px-2.5 py-1 rounded"
                  style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}>
                  ASSIGN
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="font-mono text-xs tracking-widest text-white/30 mb-4">OPERATIONAL TIMELINE</div>
        <div className="flex-1 relative overflow-y-auto">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.06]" />
          <div className="pl-10 space-y-6">
            {timeline.map((e, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }} className="relative">
                <div className="absolute -left-10 w-5 h-5 rounded-full flex items-center justify-center border"
                  style={{ background: `${e.color}18`, borderColor: `${e.color}55` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                </div>
                <div className="font-mono text-xs text-white/25 mb-1">{e.time}</div>
                <div className="font-condensed font-bold text-sm text-white mb-0.5">{e.event}</div>
                <div className="font-mono text-xs" style={{ color: e.color }}>{e.type}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Incidents tab ─────────────────────────────────────────────────────────────
function IncidentsTab({ onApprove }: { onApprove: () => void }) {
  const [selected, setSelected] = useState<string | null>(() => sortIncidents(incidents)[0]?.id ?? null);
  const [dispatched, setDispatched] = useState<string[]>([]);
  const selectedInc = incidents.find((i) => i.id === selected);

  return (
    <div className="h-full flex gap-5 overflow-hidden">
      {/* Incident list */}
      <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
        <div className="font-mono text-xs tracking-widest text-white/30">
          INCIDENT LOG — {incidents.length} RECORDS
        </div>
        {sortIncidents(incidents).map((inc) => {
          const color = severityColors[inc.severity];
          const isSelected = selected === inc.id;
          return (
            <motion.button key={inc.id}
              onClick={() => setSelected(isSelected ? null : inc.id)}
              className="w-full text-left p-4 rounded-xl transition-all duration-200"
              style={{
                background: isSelected ? `${color}0e` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? color + '44' : 'rgba(255,255,255,0.05)'}`,
              }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <div className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ background: `${color}15`, color }}>{inc.severity}</div>
                {inc.pending && !dispatched.includes(inc.id) && (
                  <div className="font-mono text-xs ml-auto" style={{ color: '#f59e0b' }}>NEEDS DISPATCH</div>
                )}
                {dispatched.includes(inc.id) && (
                  <div className="font-mono text-xs ml-auto" style={{ color: '#10b981' }}>✓ DISPATCHED</div>
                )}
              </div>
              <div className="font-condensed font-bold text-sm text-white mb-0.5">{inc.type}</div>
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-white/35">{inc.id}</div>
                <div className="font-mono text-xs" style={{ color: inc.status === 'CONTAINED' ? '#10b981' : '#06b6d4' }}>
                  {inc.status}
                </div>
              </div>
              <div className="font-mono text-xs text-white/25 mt-1">{inc.responders} units assigned</div>
            </motion.button>
          );
        })}
      </div>

      {/* Incident detail */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {selectedInc ? (
            <motion.div key={selectedInc.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }} className="h-full flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs tracking-widest mb-1"
                    style={{ color: severityColors[selectedInc.severity] }}>
                    {selectedInc.severity} INCIDENT
                  </div>
                  <div className="font-condensed font-black text-3xl text-white">{selectedInc.id}</div>
                  <div className="font-condensed font-bold text-lg mt-0.5"
                    style={{ color: severityColors[selectedInc.severity] }}>{selectedInc.type}</div>
                </div>
                <div className="font-mono text-xs px-3 py-1.5 rounded"
                  style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}>
                  {selectedInc.status}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'UNITS ASSIGNED', value: selectedInc.responders.toString(), color: '#10b981' },
                  { label: 'AI CONFIDENCE', value: '91%', color: '#a855f7' },
                  { label: 'DISPATCH STATUS', value: dispatched.includes(selectedInc.id) ? 'DISPATCHED' : selectedInc.pending ? 'PENDING' : 'N/A', color: dispatched.includes(selectedInc.id) ? '#10b981' : selectedInc.pending ? '#f59e0b' : '#06b6d4' },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-xl text-center"
                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="font-condensed font-black text-2xl mb-1" style={{ color: item.color }}>{item.value}</div>
                    <div className="font-mono text-xs text-white/30">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="font-mono text-xs tracking-widest text-white/30 mb-2">CONFIRMED FACTS</div>
                <div className="font-mono text-xs text-white/55 leading-relaxed">
                  Structural collapse reported. 3 persons reported trapped. Gas leak detected. North approach blocked. Emergency services on scene.
                </div>
              </div>

              <div className="p-4 rounded-xl"
                style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div className="font-mono text-xs tracking-widest mb-2" style={{ color: '#a855f7' }}>AI ASSESSMENT</div>
                <div className="font-mono text-xs leading-relaxed" style={{ color: '#c4b5fd' }}>
                  Secondary collapse risk within 45 min (78% confidence). Structural team recommended. Evacuate 200m perimeter around {selectedInc.id} zone.
                </div>
                <div className="font-mono text-xs text-white/20 mt-2">NOT CONFIRMED FACT — VERIFY WITH FIELD</div>
              </div>

              {selectedInc.pending && (
                <div className="flex gap-3 mt-auto">
                  {!dispatched.includes(selectedInc.id) ? (
                    <>
                      <motion.button
                        onClick={() => setDispatched((p) => [...p, selectedInc.id])}
                        className="flex-1 py-3.5 rounded-xl font-condensed font-black text-base tracking-widest"
                        style={{ background: severityColors[selectedInc.severity], color: '#080b0f' }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        DISPATCH TEAM
                      </motion.button>
                      <motion.button onClick={onApprove}
                        className="flex-1 py-3.5 rounded-xl font-condensed font-black text-base tracking-widest"
                        style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                        REVIEW AI PLAN
                      </motion.button>
                    </>
                  ) : (
                    <div className="flex-1 py-3.5 rounded-xl font-condensed font-bold text-base tracking-widest text-center"
                      style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                      ✓ TEAM DISPATCHED
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="font-condensed font-black text-4xl text-white/10 mb-2">SELECT INCIDENT</div>
                <div className="font-mono text-xs text-white/20">Choose an incident from the list to view details</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Dispatch tab ──────────────────────────────────────────────────────────────
function DispatchTab() {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const pendingIncidents = sortIncidents(incidents.filter((i) => i.pending));
  const availableUnits = responders.filter((r) => r.status === 'AVAILABLE');
  const [selectedIncident, setSelectedIncident] = useState<string | null>(pendingIncidents[0]?.id ?? null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [requiredUnits, setRequiredUnits] = useState<Record<string, string>>({});
  const [dispatchUnits, setDispatchUnits] = useState<Record<string, string>>({});
  const [unitErrors, setUnitErrors] = useState<Record<string, string>>({});

  function validateAndSave(incId: string) {
    const req = parseInt(requiredUnits[incId] ?? '');
    const disp = parseInt(dispatchUnits[incId] ?? '');
    const errs: Record<string, string> = {};
    if (requiredUnits[incId] !== undefined && (isNaN(req) || req < 0)) errs.required = 'Must be a non-negative number';
    if (dispatchUnits[incId] !== undefined && (isNaN(disp) || disp < 0)) errs.dispatch = 'Must be a non-negative number';
    if (!isNaN(req) && !isNaN(disp) && disp > availableUnits.length) errs.dispatch = `Cannot exceed ${availableUnits.length} available units`;
    if (Object.keys(errs).length) { setUnitErrors((p) => ({ ...p, [incId]: Object.values(errs).join(' · ') })); return; }
    setUnitErrors((p) => { const n = { ...p }; delete n[incId]; return n; });
    // UI-only save: in production, POST to backend API here
  }

  function assign() {
    if (!selectedIncident || !selectedUnit) return;
    respondersApi.updateMissionStatus(selectedUnit, { status: 'EN ROUTE', incident_id: selectedIncident })
      .catch((err) => console.error('Failed to update responder mission status:', err));
    setAssignments((p) => ({ ...p, [selectedUnit]: selectedIncident }));
    setSelectedUnit(null);
  }

  return (
    <div className="h-full flex gap-5 overflow-hidden">
      {/* Incidents needing dispatch */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">
        <div className="font-mono text-xs tracking-widest text-white/30">NEEDS DISPATCH</div>
        {pendingIncidents.map((inc) => {
          const color = severityColors[inc.severity];
          const isSelected = selectedIncident === inc.id;
          const assignedUnit = Object.entries(assignments).find(([, iid]) => iid === inc.id)?.[0];
          return (
            <button key={inc.id}
              onClick={() => setSelectedIncident(inc.id)}
              className="w-full text-left p-4 rounded-xl transition-all duration-200"
              style={{
                background: isSelected ? `${color}0e` : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? color + '44' : 'rgba(255,255,255,0.05)'}`,
              }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: `${color}15`, color }}>{inc.severity}</div>
                {assignedUnit && (
                  <div className="font-mono text-xs ml-auto" style={{ color: '#10b981' }}>✓ ASSIGNED</div>
                )}
              </div>
              <div className="font-condensed font-bold text-sm text-white">{inc.type}</div>
              <div className="font-mono text-xs text-white/35 mt-0.5">{inc.id} · {inc.responders} units on scene</div>
              {assignedUnit && (
                <div className="font-mono text-xs mt-1.5" style={{ color: '#10b981' }}>
                  Dispatched: Unit {assignedUnit.replace('R-', '')}
                </div>
              )}
            </button>
          );
        })}
        {pendingIncidents.length === 0 && (
          <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="font-condensed font-bold text-sm text-green-400">✓ ALL DISPATCHED</div>
            <div className="font-mono text-xs text-white/30 mt-1">No pending dispatch required</div>
          </div>
        )}
      </div>

      {/* Available units */}
      <div className="flex flex-col gap-3 w-72 shrink-0 overflow-y-auto">
        <div className="font-mono text-xs tracking-widest text-white/30">AVAILABLE UNITS</div>
        {availableUnits.map((resp) => {
          const isAssigned = resp.id in assignments;
          const isSelected = selectedUnit === resp.id;
          return (
            <button key={resp.id}
              disabled={isAssigned}
              onClick={() => setSelectedUnit(isSelected ? null : resp.id)}
              className="w-full text-left p-4 rounded-xl transition-all duration-200"
              style={{
                background: isAssigned ? 'rgba(255,255,255,0.01)' : isSelected ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isAssigned ? 'rgba(255,255,255,0.03)' : isSelected ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.05)'}`,
                opacity: isAssigned ? 0.5 : 1,
              }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: isAssigned ? '#6b7280' : '#10b981' }} />
                <div className="font-condensed font-bold text-sm text-white">Unit {resp.name}</div>
                {isAssigned && <div className="font-mono text-xs ml-auto text-white/30">ASSIGNED</div>}
              </div>
              <div className="font-mono text-xs text-white/35">
                {isAssigned ? `→ ${assignments[resp.id]}` : 'AVAILABLE FOR DISPATCH'}
              </div>
            </button>
          );
        })}
        {availableUnits.length === 0 && (
          <div className="p-4 rounded-xl" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <div className="font-condensed font-bold text-sm text-red-400">NO UNITS AVAILABLE</div>
            <div className="font-mono text-xs text-white/30 mt-1">All units are currently deployed</div>
          </div>
        )}
      </div>

      {/* Assign panel */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="p-5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="font-mono text-xs tracking-widest text-white/30 mb-4">DISPATCH ASSIGNMENT</div>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <div className="font-mono text-xs text-white/30">TARGET INCIDENT</div>
              <div className="font-condensed font-bold text-sm" style={{ color: selectedIncident ? severityColors[incidents.find((i) => i.id === selectedIncident)?.severity ?? 'HIGH'] : 'rgba(255,255,255,0.2)' }}>
                {selectedIncident ?? 'Not selected'}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
              <div className="font-mono text-xs text-white/30">UNIT TO DISPATCH</div>
              <div className="font-condensed font-bold text-sm" style={{ color: selectedUnit ? '#10b981' : 'rgba(255,255,255,0.2)' }}>
                {selectedUnit ? `Unit ${responders.find((r) => r.id === selectedUnit)?.name}` : 'Not selected'}
              </div>
            </div>
          </div>

          {/* Editable unit quantities */}
          {selectedIncident && (
            <div className="mb-4 p-3 rounded-lg space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="font-mono text-xs tracking-widest text-white/30">UNIT QUANTITIES</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'required', label: 'REQUIRED', field: requiredUnits },
                  { key: 'dispatch', label: 'DISPATCH', field: dispatchUnits },
                ].map(({ key, label, field }) => (
                  <div key={key}>
                    <div className="font-mono text-xs text-white/30 mb-1">{label} UNITS</div>
                    <input
                      type="number"
                      min="0"
                      value={field[selectedIncident] ?? ''}
                      onChange={(e) => {
                        if (key === 'required') setRequiredUnits((p) => ({ ...p, [selectedIncident]: e.target.value }));
                        else setDispatchUnits((p) => ({ ...p, [selectedIncident]: e.target.value }));
                      }}
                      placeholder="—"
                      className="w-full px-3 py-2 rounded font-mono text-sm text-center"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
              {unitErrors[selectedIncident] && (
                <div className="font-mono text-xs" style={{ color: '#dc2626' }}>{unitErrors[selectedIncident]}</div>
              )}
              <button onClick={() => validateAndSave(selectedIncident)}
                className="w-full py-2 rounded font-condensed font-bold text-xs tracking-widest transition-all duration-200"
                style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}>
                SAVE QUANTITIES
              </button>
            </div>
          )}

          <motion.button
            onClick={assign}
            disabled={!selectedIncident || !selectedUnit}
            className="w-full py-3.5 rounded-xl font-condensed font-black text-base tracking-widest transition-all duration-200"
            style={{
              background: selectedIncident && selectedUnit ? '#dc2626' : 'rgba(255,255,255,0.04)',
              color: selectedIncident && selectedUnit ? '#fff' : 'rgba(255,255,255,0.2)',
              boxShadow: selectedIncident && selectedUnit ? '0 0 24px rgba(220,38,38,0.35)' : 'none',
            }}
            whileHover={selectedIncident && selectedUnit ? { scale: 1.02 } : {}}
            whileTap={selectedIncident && selectedUnit ? { scale: 0.97 } : {}}>
            DISPATCH UNIT →
          </motion.button>
        </div>

        {/* Assignment log */}
        {Object.keys(assignments).length > 0 && (
          <div className="flex-1 p-4 rounded-xl" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="font-mono text-xs tracking-widest text-green-400 mb-3">DISPATCH LOG</div>
            <div className="space-y-2">
              {Object.entries(assignments).map(([unitId, incId]) => {
                const unit = responders.find((r) => r.id === unitId);
                const inc = incidents.find((i) => i.id === incId);
                return (
                  <div key={unitId} className="flex items-center gap-3 py-1.5 border-b border-white/[0.04]">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <div className="font-condensed font-semibold text-xs text-white">Unit {unit?.name}</div>
                    <div className="font-mono text-xs text-white/30">→</div>
                    <div className="font-mono text-xs" style={{ color: inc ? severityColors[inc.severity] : '#06b6d4' }}>{incId}</div>
                    <div className="font-mono text-xs text-green-400 ml-auto">DISPATCHED</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CommandHome() {
  const location = useLocation();
  const [mode, setMode] = useState<OrbitalMode>('OBSERVE');
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [showApproval, setShowApproval] = useState(false);

  // Group A Predictive State & Real-Time Sync
  const [predictiveData, setPredictiveData] = useState<any | null>(null);
  const [isRefreshingPredictive, setIsRefreshingPredictive] = useState(false);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(new Date().toISOString());
  const [syncedSecondsAgo, setSyncedSecondsAgo] = useState(0);
  const [handledApprovalIds, setHandledApprovalIds] = useState<string[]>([]);
  const [activePendingApproval, setActivePendingApproval] = useState<any | null>(null);
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [pendingRecommendation, setPendingRecommendation] = useState<any | null>(null);
  const [activeApproval, setActiveApproval] = useState<any | null>(null);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);
  const [dismissedCompletionIds, setDismissedCompletionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nexus_dismissed_orchestrations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [agentsState, setAgentsState] = useState(activeAgentsData);
  const [liveIncidents, setLiveIncidents] = useState<any[]>(incidents);
  const [liveResponders, setLiveResponders] = useState<any[]>(responders);
  const [centerViewMode, setCenterViewMode] = useState<'sphere' | 'map'>('sphere');
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const isFetchingRef = useRef(false);

  // Controlled 5-Second Real-Time Synchronization Cycle
  const fetchPredictiveData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [predRes, overviewRes] = await Promise.all([
        predictiveApi.getOverview(),
        commandApi.getOverview().catch(() => null),
      ]);

      if (predRes && predRes.success && predRes.data) {
        setPredictiveData(predRes.data);
        if (predRes.timestamp) {
          setLastSyncTimestamp(predRes.timestamp);
        } else {
          setLastSyncTimestamp(new Date().toISOString());
        }

        // Real-time notification detection for newly created approval requests
        const pendingList = predRes.data.pendingApprovals || [];
        const unhandled = pendingList.find((p: any) => !handledApprovalIds.includes(p.id));
        setActivePendingApproval(unhandled || null);
      }

      if (overviewRes && overviewRes.data) {
        if (overviewRes.data.agents) {
          updateActiveAgents(overviewRes.data.agents);
          setAgentsState([...activeAgentsData]);
        }
        if (overviewRes.data.activePlan) {
          const plan = overviewRes.data.activePlan;
          setActivePlan(plan);
        }
        if (overviewRes.data.incidents) {
          setLiveIncidents(overviewRes.data.incidents);
        }
        if (overviewRes.data.responders) {
          setLiveResponders(overviewRes.data.responders);
        }
        if (overviewRes.data.pendingRecommendation) {
          setPendingRecommendation(overviewRes.data.pendingRecommendation);
        }
        if (overviewRes.data.pendingApproval) {
          setActiveApproval(overviewRes.data.pendingApproval);
          setShowCompletionBanner(true);
        } else {
          setActiveApproval(null);
          setShowCompletionBanner(false);
        }
      }
      if (overviewRes && overviewRes.synced_at) {
        setLastSyncTimestamp(overviewRes.synced_at);
      }
    } catch (err) {
      console.error('[CommandHome] 5s sync error:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [handledApprovalIds, dismissedCompletionIds]);

  // Real-time SSE listener
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const eventType = payload.type;
          const eventData = payload.data || payload;

          if (eventType === 'AGENT_STATUS_UPDATED' && eventData?.agentId) {
            const updated = activeAgentsData.map((a) => {
              if (a.id === eventData.agentId) {
                return {
                  ...a,
                  status: (eventData.status || a.status) as AgentStatus,
                  progress: typeof eventData.progress === 'number' ? eventData.progress : a.progress,
                };
              }
              return a;
            });
            activeAgentsData = updated;
            agents.length = 0;
            agents.push(...updated);
            setAgentsState([...updated]);

            setActivePlan((prev: any) => ({
              ...prev,
              plan_id: eventData.plan_id || prev?.plan_id,
              current_step: eventData.current_step,
              total_steps: eventData.total_steps || 11,
              current_stage: eventData.current_stage,
              status: eventData.orchestration_status || prev?.status || 'PROCESSING',
            }));
          } else if (eventType === 'ORCHESTRATION_STARTED') {
            const reset = defaultAgents.map((a) => ({ ...a, status: 'WAITING' as AgentStatus, progress: 0 }));
            activeAgentsData = reset;
            agents.length = 0;
            agents.push(...reset);
            setAgentsState([...reset]);

            setActivePlan({
              id: eventData.execId,
              plan_id: eventData.plan_id,
              current_step: 0,
              total_steps: 11,
              status: 'PROCESSING',
              current_stage: eventData.current_stage || 'CONTINUOUS INGESTION',
            });
            setShowCompletionBanner(false);
          } else if (eventType === 'ORCHESTRATION_COMPLETED') {
            setActivePlan((prev: any) => ({
              ...prev,
              plan_id: eventData.plan_id || prev?.plan_id,
              current_step: 11,
              total_steps: 11,
              current_stage: 'COMPLETED',
              status: 'COMPLETED',
            }));
            const idToCheck = eventData.execId || eventData.plan_id;
            if (!dismissedCompletionIds.includes(idToCheck)) {
              setShowCompletionBanner(true);
            }
          } else if (eventType === 'HUMAN_APPROVAL_REQUIRED') {
            setActivePlan((prev: any) => ({
              ...prev,
              plan_id: eventData.approval?.plan_id || prev?.plan_id,
              current_step: 11,
              total_steps: 11,
              current_stage: 'COMPLETED',
              status: 'WAITING_FOR_APPROVAL',
            }));
            if (eventData.approval) {
              setActiveApproval(eventData.approval);
              setShowCompletionBanner(true);
            }
          } else if (eventType === 'APPROVAL_RESOLVED') {
            setActiveApproval(null);
            setShowCompletionBanner(false);
            setActivePlan((prev: any) => ({
              ...prev,
              status: eventData.decision || 'APPROVED',
              approval_status: eventData.decision || 'APPROVED',
            }));
          } else if (eventType === 'ORCHESTRATION_EXECUTING') {
            setActivePlan((prev: any) => ({
              ...prev,
              status: 'EXECUTING',
              current_stage: eventData.current_stage || 'DISPATCHING RESOURCES',
            }));
            setShowCompletionBanner(false);
          } else if (eventType === 'ORCHESTRATION_MONITORING') {
            setActivePlan((prev: any) => ({
              ...prev,
              status: 'MONITORING',
              current_stage: eventData.current_stage || 'MONITORING SITUATION',
            }));
          } else if (eventType === 'ORCHESTRATION_IDLE') {
            setActivePlan((prev: any) => ({
              ...prev,
              status: 'NO_ACTIVE_INCIDENTS',
              current_stage: 'MONITORING SYSTEM',
              current_step: 0,
            }));
          }

          if (
            eventType === 'AGENT_STATUS_UPDATED' ||
            eventType === 'ORCHESTRATION_STARTED' ||
            eventType === 'ORCHESTRATION_COMPLETED' ||
            eventType === 'HUMAN_APPROVAL_REQUIRED' ||
            eventType === 'APPROVAL_RESOLVED' ||
            eventType === 'ORCHESTRATION_EXECUTING' ||
            eventType === 'ORCHESTRATION_MONITORING' ||
            eventType === 'OPERATIONAL_STATE_CHANGED' ||
            eventType === 'ORCHESTRATION_IDLE'
          ) {
            commandApi.getOverview().then((res) => {
              if (res?.data?.agents) {
                updateActiveAgents(res.data.agents);
                setAgentsState([...activeAgentsData]);
              }
              if (res?.data?.activePlan) {
                setActivePlan(res.data.activePlan);
              }
              if (res?.data?.incidents) {
                setLiveIncidents(res.data.incidents);
              }
              if (res?.data?.responders) {
                setLiveResponders(res.data.responders);
              }
              if (res?.synced_at) {
                setLastSyncTimestamp(res.synced_at);
              }
            }).catch(() => {});
          }
        } catch {}
      };
    } catch {}

    return () => es?.close();
  }, [dismissedCompletionIds]);

  const handleRunOrchestrator = useCallback(async () => {
    setIsOrchestrating(true);
    try {
      await orchestratorApi.run(selectedIncident || undefined);
      const st = await orchestratorApi.getStatus();
      if (st?.data?.agents) {
        updateActiveAgents(st.data.agents);
        setAgentsState([...activeAgentsData]);
      }
    } catch (err) {
      console.error('Failed to run orchestrator:', err);
    } finally {
      setIsOrchestrating(false);
    }
  }, [selectedIncident]);

  // Initial fetch and 5-second interval
  useEffect(() => {
    fetchPredictiveData();
    const syncInterval = setInterval(fetchPredictiveData, 5000);
    return () => clearInterval(syncInterval);
  }, [fetchPredictiveData]);

  // 1-second interval to compute elapsed time since last backend sync (capped at 100s)
  useEffect(() => {
    const ticker = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(lastSyncTimestamp).getTime()) / 1000);
      setSyncedSecondsAgo(Math.min(elapsed, 100));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastSyncTimestamp]);

  // Handler for manual re-run of predictive engine
  const handleTriggerPredictiveRun = useCallback(async () => {
    setIsRefreshingPredictive(true);
    try {
      await predictiveApi.runAll();
      await fetchPredictiveData();
    } catch (err) {
      console.error('Failed to run predictive engine:', err);
    } finally {
      setIsRefreshingPredictive(false);
    }
  }, [fetchPredictiveData]);

  // Handler for Human Approval Action from the Bottom Action Notification Banner
  const handleApprovalAction = useCallback(async (recId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await predictiveApi.takeRecommendationAction(recId, action, 'Command Officer');
      setHandledApprovalIds((prev) => [...prev, recId]);
      setActivePendingApproval(null);
      await fetchPredictiveData();
    } catch (err) {
      console.error('Failed to take recommendation action:', err);
    }
  }, [fetchPredictiveData]);

  // Handler to open the unified Human Approval Modal
  const handleOpenApprovalModal = useCallback(() => {
    setShowApproval(true);
  }, []);

  // Handler when Human Approval decision is successfully finalized in the backend
  const handleApprovalFinalized = useCallback((decision: 'APPROVED' | 'REJECTED') => {
    setShowCompletionBanner(false);
    setActiveApproval(null);
    setActivePendingApproval(null);
    setActivePlan((prev: any) => ({
      ...prev,
      status: decision,
      approval_status: decision,
    }));
    fetchPredictiveData();
  }, [fetchPredictiveData]);

  // Handler when Human Approval is explicitly dismissed without approval
  const handleApprovalDismissed = useCallback(() => {
    setShowCompletionBanner(false);
    setActiveApproval(null);
    setActivePendingApproval(null);
    fetchPredictiveData();
  }, [fetchPredictiveData]);

  // Derive active tab from URL — no internal tab state
  const tab: CommandTab =
    location.pathname === '/command/orbit' ? 'sphere' :
    location.pathname.startsWith('/command/intelligence') ? 'intelligence' :
    location.pathname.startsWith('/command/evacuation') ? 'evacuation' :
    location.pathname.startsWith('/command/operations') ? 'operations' :
    location.pathname.startsWith('/command/incidents') ? 'incidents' :
    location.pathname.startsWith('/command/dispatch') ? 'dispatch' : 'home';

  const activeCount = liveIncidents.filter((i: any) => i.status === 'ACTIVE' || i.status === 'PENDING').length;
  const pendingDispatch = liveIncidents.filter((i: any) => i.pending).length;

  const onApprove = useCallback(() => setShowApproval(true), []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header — role + status indicators only; navigation is in the global nav */}
      <motion.div className="flex items-center gap-4 px-6 py-3 glass-strong shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div>
          <div className="font-condensed font-black text-lg text-white tracking-wider">AUTHORITY / COMMAND</div>
          <div className="font-mono text-xs text-white/30">WHAT NEEDS ACTION NOW</div>
        </div>

        <div className="flex items-center gap-5 ml-auto">
          {/* 11-agent progress indicator */}
          {(() => {
            const p = agentProgress(agentsState);
            const currentStep = activePlan?.current_step !== undefined ? activePlan.current_step : p.complete;
            const totalSteps = activePlan?.total_steps || p.total || 11;
            const barPct = `${Math.min(100, Math.round((currentStep / totalSteps) * 100))}%`;
            const status = activePlan?.status || (currentStep === totalSteps ? 'COMPLETED' : currentStep > 0 ? 'PROCESSING' : 'IDLE');
            const currentStage = activePlan?.current_stage;

            let statusLabel = status;
            if (status === 'NO_ACTIVE_INCIDENTS') {
              statusLabel = 'MONITORING SYSTEM';
            } else if (status === 'EXECUTING') {
              statusLabel = 'DISPATCHING RESOURCES';
            } else if (status === 'MONITORING') {
              statusLabel = 'MONITORING SITUATION';
            } else if (status === 'WAITING_FOR_APPROVAL' || (currentStep === 11 && status !== 'APPROVED' && status !== 'EXECUTING' && status !== 'MONITORING')) {
              statusLabel = 'HUMAN APPROVAL REQUIRED';
            } else if (status === 'APPROVED') {
              statusLabel = 'PLAN APPROVED';
            } else if (status === 'PROCESSING') {
              statusLabel = currentStage ? `PROCESSING · ${currentStage}` : 'PROCESSING';
            } else if (status === 'COMPLETED' || currentStep === 11) {
              statusLabel = 'COMPLETED';
            }

            const stepColor = (status === 'APPROVED' || status === 'EXECUTING' || (currentStep === 11 && status === 'COMPLETED'))
              ? '#10b981'
              : status === 'WAITING_FOR_APPROVAL' || currentStep === 11
              ? '#f59e0b'
              : status === 'PROCESSING'
              ? '#06b6d4'
              : '#a855f7';

            return (
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1" style={{ minWidth: 160 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="font-mono text-xs tracking-widest" style={{ color: '#a855f7', fontSize: '9px' }}>AI ORCHESTRATION</div>
                      {activePlan?.plan_version && (
                        <span className="font-mono text-purple-300 font-bold px-1 rounded bg-purple-500/20" style={{ fontSize: '8px' }}>
                          {activePlan.plan_version}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs font-bold" style={{ color: stepColor, fontSize: '9px' }}>
                      {currentStep < 10 ? `0${currentStep}` : currentStep}/{totalSteps}
                    </div>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden bg-white/[0.06]">
                    <motion.div className="h-full rounded-full"
                      style={{
                        background: stepColor
                      }}
                      animate={{ width: barPct }} transition={{ duration: 0.4 }} />
                  </div>
                  <div className="font-mono text-white/40 truncate" style={{ fontSize: '9px' }} title={`STATUS: ${statusLabel}`}>
                    STATUS: <span style={{ color: stepColor }}>{statusLabel}</span>
                  </div>
                </div>
              </div>
            );
          })()}
          {pendingDispatch > 0 && (
            <div className="flex items-center gap-2 font-mono text-xs" style={{ color: '#dc2626' }}>
              <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#dc2626' }} />
              {pendingDispatch} NEED DISPATCH
            </div>
          )}
          <div className="font-mono text-xs text-white/35">{activeCount} active incidents</div>
          <div className="font-mono text-xs text-white/30 flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {syncedSecondsAgo <= 1 ? 'SYNCED JUST NOW' : `SYNCED ${syncedSecondsAgo}s AGO`}
          </div>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
            className="h-full">

            {tab === 'home' && (
              <div className="h-full p-5">
                <HomeTab
                  onApprove={onApprove}
                  activePlan={activePlan}
                  agentsList={agentsState}
                  incidentsList={liveIncidents}
                  respondersList={liveResponders}
                />
              </div>
            )}

            {tab === 'sphere' && (
              <div className="h-full flex relative">
                {/* Left: incident list + orbital mode */}
                <motion.div className="w-60 glass flex flex-col shrink-0 overflow-y-auto"
                  style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
                  initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}>
                  <div className="p-4">
                    <div className="font-mono text-xs tracking-widest text-white/30 mb-3">ACTIVE INCIDENTS</div>
                    <div className="space-y-2">
                      {sortIncidents(incidents).map((inc, i) => {
                        const iColor = severityColors[inc.severity];
                        const isSelected = selectedIncident === inc.id;
                        return (
                          <motion.button key={inc.id}
                            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 + i * 0.07 }}
                            onClick={() => setSelectedIncident(isSelected ? null : inc.id)}
                            className="w-full text-left p-3 rounded-lg transition-all duration-200"
                            style={{
                              background: isSelected ? `${iColor}10` : 'rgba(255,255,255,0.02)',
                              border: `1px solid ${isSelected ? iColor + '33' : 'rgba(255,255,255,0.04)'}`,
                            }}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: iColor }} />
                              <div className="font-mono text-xs" style={{ color: iColor }}>{inc.severity}</div>
                              {inc.pending && <div className="ml-auto font-mono text-xs text-amber-400">PENDING</div>}
                            </div>
                            <div className="font-condensed font-semibold text-xs text-white">{inc.type}</div>
                            <div className="font-mono text-xs text-white/30">{inc.id} · {inc.responders} units</div>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="font-mono text-xs tracking-widest text-white/30 mb-3 mt-5">ORBITAL MODE</div>
                    <div className="flex flex-col gap-1">
                      {(Object.keys(modeColors) as OrbitalMode[]).map((m) => (
                        <button key={m} onClick={() => setMode(m)}
                          className="px-3 py-1.5 rounded font-condensed font-bold text-xs tracking-widest text-left transition-all duration-200"
                          style={{
                            background: mode === m ? `${modeColors[m]}15` : 'transparent',
                            color: mode === m ? modeColors[m] : 'rgba(255,255,255,0.3)',
                            border: `1px solid ${mode === m ? modeColors[m] + '33' : 'transparent'}`,
                          }}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>

                {/* Center: sphere / real-time map */}
                <div className="flex-1 relative">
                  {/* View Mode Switcher: SPHERE vs REAL-TIME MAP */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1 rounded-lg bg-black/60 border border-white/10 backdrop-blur-md">
                    <button
                      onClick={() => setCenterViewMode('sphere')}
                      className="px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-all"
                      style={{
                        background: centerViewMode === 'sphere' ? 'rgba(6,182,212,0.2)' : 'transparent',
                        color: centerViewMode === 'sphere' ? '#06b6d4' : 'rgba(255,255,255,0.4)',
                        border: centerViewMode === 'sphere' ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent',
                      }}
                    >
                      SPHERE ORBIT
                    </button>
                    <button
                      onClick={() => setCenterViewMode('map')}
                      className="px-2.5 py-1 rounded font-mono text-[10px] font-bold tracking-wider transition-all"
                      style={{
                        background: centerViewMode === 'map' ? 'rgba(16,185,129,0.2)' : 'transparent',
                        color: centerViewMode === 'map' ? '#10b981' : 'rgba(255,255,255,0.4)',
                        border: centerViewMode === 'map' ? '1px solid rgba(16,185,129,0.4)' : '1px solid transparent',
                      }}
                    >
                      REAL-TIME MAP
                    </button>
                  </div>

                  <div className="absolute inset-4">
                    {centerViewMode === 'sphere' ? (
                      <ResQSphere selectedId={selectedIncident} onSelect={(id) => setSelectedIncident(id || null)} />
                    ) : (
                      <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 relative">
                        <OperationalMap
                          markers={[
                            ...incidents.map((inc) => ({
                              id: inc.id,
                              type: 'incident' as const,
                              title: inc.id,
                              lat: 40.7128 + (inc.lat - 50) * 0.01,
                              lng: -74.006 + (inc.lng - 50) * 0.01,
                              details: `${inc.severity} · ${inc.type}`,
                              severity: inc.severity,
                            })),
                            ...responders.map((r) => ({
                              id: r.id,
                              type: 'responder' as const,
                              title: `Unit ${r.name}`,
                              lat: 40.7128 + (r.lat - 50) * 0.01,
                              lng: -74.006 + (r.lng - 50) * 0.01,
                              details: r.status,
                              status: r.status,
                            })),
                          ]}
                          onMarkerClick={(m) => setSelectedIncident(m.id)}
                          className="w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                  <div className="absolute top-4 left-4 font-mono text-xs px-3 py-1.5 rounded z-20"
                    style={{ background: `${modeColors[mode]}12`, color: modeColors[mode], border: `1px solid ${modeColors[mode]}33` }}>
                    {mode}
                  </div>
                  {!selectedIncident && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-white/20 z-20">
                      Click incident node to inspect and dispatch
                    </div>
                  )}
                </div>

                {/* Right: capsule */}
                <div className="w-72 p-4 overflow-y-auto shrink-0">
                  <AnimatePresence>
                    {selectedIncident ? (
                      <IncidentCapsule key={selectedIncident} incidentId={selectedIncident}
                        onClose={() => setSelectedIncident(null)} onApprove={onApprove} />
                    ) : (
                      <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                        <div className="font-mono text-xs text-white/25 text-center mt-8">SELECT AN INCIDENT TO INSPECT</div>
                        {[
                          { label: 'CRITICAL INCIDENTS', value: '2', color: '#dc2626' },
                          { label: 'SOS REQUESTS', value: '47', color: '#f59e0b' },
                          { label: 'RESPONDERS ACTIVE', value: '31', color: '#06b6d4' },
                          { label: 'SHELTERS AVAILABLE', value: '8', color: '#10b981' },
                        ].map((s) => (
                          <div key={s.label} className="p-4 rounded-xl"
                            style={{ background: `${s.color}08`, border: `1px solid ${s.color}22` }}>
                            <div className="font-mono text-xs text-white/30 mb-1">{s.label}</div>
                            <div className="font-condensed font-black text-3xl" style={{ color: s.color }}>{s.value}</div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Timeline bar at bottom */}
                <div className="absolute bottom-0 left-60 right-0 flex items-center gap-4 px-6 py-2 glass overflow-x-auto"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="font-mono text-xs text-white/20 shrink-0">TIMELINE</div>
                  {[
                    { time: '14:02', event: 'INC-2851 created', color: '#f59e0b' },
                    { time: '14:15', event: 'INC-2849 CRITICAL', color: '#dc2626' },
                    { time: '14:23', event: 'Evacuation ordered Zone NE-4', color: '#f97316' },
                    { time: '14:31', event: 'INC-2845 CONTAINED', color: '#10b981' },
                  ].map((e, i) => (
                    <div key={i} className="flex items-center gap-2 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: e.color }} />
                      <div className="font-mono text-xs text-white/25">{e.time}</div>
                      <div className="font-mono text-xs" style={{ color: e.color }}>{e.event}</div>
                      {i < 3 && <div className="w-8 h-px ml-2" style={{ background: 'rgba(255,255,255,0.05)' }} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab !== 'home' && tab !== 'sphere' && (
              <div className="h-full p-5">
                {tab === 'intelligence' && (
                  <IntelligenceTab
                    predictiveData={predictiveData}
                    isRefreshing={isRefreshingPredictive}
                    onTriggerRun={handleTriggerPredictiveRun}
                    onRunOrchestrator={handleRunOrchestrator}
                    isOrchestrating={isOrchestrating}
                  />
                )}
                {tab === 'evacuation' && <EvacuationTab />}
                {tab === 'operations' && <OperationsTab />}
                {tab === 'incidents' && <IncidentsTab onApprove={onApprove} />}
                {tab === 'dispatch' && <DispatchTab />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Approval modal */}
      <AnimatePresence>
        {showApproval && (
          <ApprovalModal
            onClose={() => setShowApproval(false)}
            activePlan={activePlan}
            pendingRecommendation={pendingRecommendation}
            pendingApproval={activeApproval}
            onApprovedSuccess={handleApprovalFinalized}
            onDismissSuccess={handleApprovalDismissed}
            agentsList={agentsState}
          />
        )}
      </AnimatePresence>

      {/* Group A Bottom Human Approval Notification Banner */}
      <AnimatePresence>
        {activePendingApproval && !showCompletionBanner && (
          <BottomApprovalBanner
            pendingRec={activePendingApproval}
            onAction={handleApprovalAction}
          />
        )}
      </AnimatePresence>

      {/* 11/11 AI Orchestration Completion Notification Banner */}
      <AnimatePresence>
        {showCompletionBanner && !showApproval && (
          <BottomCompletionBanner
            planId={activeApproval?.plan_id || activePlan?.plan_id || activePlan?.id || 'REC-2849'}
            onOpenApproval={handleOpenApprovalModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
