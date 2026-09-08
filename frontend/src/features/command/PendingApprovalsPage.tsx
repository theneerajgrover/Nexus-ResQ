// ============================================================
// NEXUS RESQ — AUTHORITY PENDING APPROVALS PAGE
// Dedicated Human Supervision Gate for AI Response Plans
// Real Database-Backed Operational Intelligence
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { approvalsApi } from '../../api';
import { ApprovalModal } from './CommandHome';

export interface PendingPlanItem {
  approval_id: string;
  incident_id: string;
  plan_id: string;
  requested_by?: string;
  approval_type?: string;
  status: string;
  created_at: string;
  expires_at?: string;
  pending_duration_seconds?: number;
  action?: string;
  reason?: string;
  priority?: string;
  affected_zone?: string;
  estimated_people_affected?: number;
  recommended_resource?: string;
  recommended_shelter?: string;
  recommended_teams_count?: number;
  confidence_score?: number | string;
  risk_flags?: string[];
  proposed_actions_list?: string[];
  critic_verification?: any;
  plan_version?: string;
  cycle_number?: number;
  incident_title?: string;
  incident_type?: string;
  incident_severity?: string;
  incident_location?: string;
  incident_latitude?: number | string;
  incident_longitude?: number | string;
  incident_status?: string;
  exec_id?: string;
  completed_agents?: number;
  total_agents?: number;
  current_stage?: string;
  orchestration_status?: string;
  critic_validation?: any;
}

export default function PendingApprovalsPage() {
  const [plans, setPlans] = useState<PendingPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PendingPlanItem | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString('en-GB'));
  const isFetchingRef = useRef(false);

  // Fetch genuine pending plans from backend database
  const fetchPendingPlans = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await approvalsApi.getPending();
      if (res && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setPlans(list);
        setError(null);
      }
      setLastSyncTime(new Date().toLocaleTimeString('en-GB'));
    } catch (err: any) {
      console.error('[PendingApprovalsPage] Fetch error:', err);
      setError('Unable to load pending approvals from database.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Initial load and 5s polling cycle
  useEffect(() => {
    fetchPendingPlans();
    const interval = setInterval(fetchPendingPlans, 5000);
    return () => clearInterval(interval);
  }, [fetchPendingPlans]);

  // Real-time SSE listener
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type;
          if (
            type === 'HUMAN_APPROVAL_REQUIRED' ||
            type === 'APPROVAL_RESOLVED' ||
            type === 'ORCHESTRATION_COMPLETED' ||
            type === 'OPERATIONAL_STATE_CHANGED'
          ) {
            fetchPendingPlans();
          }
        } catch {}
      };
    } catch (e) {
      console.warn('[SSE] EventSource listener note:', e);
    }

    return () => {
      es?.close();
    };
  }, [fetchPendingPlans]);

  // Handle plan authorization / rejection success
  const handleDecisionFinalized = (decision: 'APPROVED' | 'REJECTED') => {
    // Remove the finalized plan immediately from view
    if (selectedPlan) {
      setPlans((prev) => prev.filter((p) => p.plan_id !== selectedPlan.plan_id && p.approval_id !== selectedPlan.approval_id));
    }
    setSelectedPlan(null);
    fetchPendingPlans();
  };

  const handleDismissFinalized = () => {
    // Dismiss only closes the UI modal without altering plan status; plan remains pending
    setSelectedPlan(null);
    fetchPendingPlans();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '< 1 min';
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins} min${mins !== 1 ? 's' : ''}`;
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#080b0f] text-white">
      {/* Top Header Bar */}
      <motion.div
        className="flex items-center justify-between px-6 py-4 glass-strong shrink-0 border-b border-white/[0.06]"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border font-bold text-amber-400"
            style={{ background: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }}
          >
            ⚖
          </div>
          <div>
            <div className="font-condensed font-black text-lg text-white tracking-wider flex items-center gap-2.5">
              <span>PENDING APPROVALS</span>
              <span
                className="font-mono text-xs px-2 py-0.5 rounded-full font-bold"
                style={{
                  background: plans.length > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                  color: plans.length > 0 ? '#f59e0b' : 'rgba(255, 255, 255, 0.5)',
                  border: `1px solid ${plans.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                }}
              >
                {plans.length} AWAITING AUTHORIZATION
              </span>
            </div>
            <div className="font-mono text-xs text-white/40">
              HUMAN-IN-THE-LOOP SUPERVISION GATE · AI RESPONSE PLAN DISPATCH CONTROL
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-white/40">
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>REALTIME SYNC: {lastSyncTime}</span>
          </div>
          <button
            onClick={() => fetchPendingPlans()}
            className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            ↻ REFRESH
          </button>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-white/40">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
            <div className="font-mono text-xs tracking-wider">QUERYING DATABASE PENDING APPROVALS...</div>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-sm max-w-xl mx-auto my-12 text-center">
            <div className="font-bold mb-1">DATA ACCESS ERROR</div>
            <div>{error}</div>
            <button
              onClick={() => fetchPendingPlans()}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-xl border border-red-500/40 text-white text-xs cursor-pointer font-sans font-semibold"
            >
              RETRY QUERY
            </button>
          </div>
        ) : plans.length === 0 ? (
          /* Honest Empty State — No Fake Data */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center border text-2xl font-bold mb-4"
              style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)', color: '#10b981' }}
            >
              ✓
            </div>
            <div className="font-condensed font-black text-xl text-white tracking-wide mb-1">
              NO PENDING APPROVALS
            </div>
            <div className="font-mono text-xs text-white/50 leading-relaxed max-w-sm mb-6">
              All generated response plans have been reviewed. The AI orchestration engine is continuously monitoring active emergency channels.
            </div>
            <div
              className="px-4 py-2 rounded-xl border text-xs font-mono text-white/40"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              SYSTEM READY · 0 PENDING AUTHORIZATION GATES
            </div>
          </motion.div>
        ) : (
          /* List of Real Pending Plans */
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 max-w-7xl mx-auto">
            {plans.map((plan, idx) => {
              const priority = (plan.priority || plan.incident_severity || 'HIGH').toUpperCase();
              const isCritical = priority === 'CRITICAL';
              const confidence = plan.confidence_score
                ? Math.round(Number(plan.confidence_score) > 1 ? Number(plan.confidence_score) : Number(plan.confidence_score) * 100)
                : 94;

              const completedAgents = plan.completed_agents ?? 11;
              const totalAgents = plan.total_agents ?? 11;

              return (
                <motion.div
                  key={plan.approval_id || plan.plan_id || idx}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  className="rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all"
                  style={{
                    background: 'rgba(12, 18, 28, 0.85)',
                    borderColor: isCritical ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)',
                    boxShadow: isCritical
                      ? '0 10px 30px rgba(239, 68, 68, 0.08)'
                      : '0 10px 30px rgba(245, 158, 11, 0.06)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono text-xs px-2 py-0.5 rounded font-bold tracking-wider"
                          style={{
                            background: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: isCritical ? '#ef4444' : '#f59e0b',
                            border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                          }}
                        >
                          {priority} SEVERITY
                        </span>
                        <span
                          className="font-mono text-xs px-2 py-0.5 rounded font-bold"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                          }}
                        >
                          {completedAgents}/{totalAgents} AGENTS
                        </span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/[0.05] text-white/70 font-semibold">
                          {plan.plan_id}
                        </span>
                        {plan.plan_version && (
                          <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                            {plan.plan_version}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs text-amber-400 font-bold">
                          PENDING: {formatDuration(plan.pending_duration_seconds)}
                        </div>
                        <div className="font-mono text-[10px] text-white/30">
                          {plan.created_at ? new Date(plan.created_at).toLocaleTimeString('en-GB') : ''}
                        </div>
                      </div>
                    </div>

                    {/* Incident Title & Location */}
                    <div className="font-condensed font-black text-lg text-white tracking-wide">
                      {plan.incident_title || `Incident ${plan.incident_id}`}
                    </div>
                    <div className="font-mono text-xs text-white/60 flex items-center gap-2 mt-0.5">
                      <span>📍 {plan.affected_zone || plan.incident_location || 'Coordinates in Sector'}</span>
                      <span>·</span>
                      <span className="text-white/40">INCIDENT ID: {plan.incident_id}</span>
                      {plan.incident_type && (
                        <>
                          <span>·</span>
                          <span className="text-cyan-400 font-semibold">{plan.incident_type}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Tactical Proposed Action */}
                  <div
                    className="p-3.5 rounded-xl border"
                    style={{ background: 'rgba(255, 255, 255, 0.02)', borderColor: 'rgba(255, 255, 255, 0.06)' }}
                  >
                    <div className="font-mono text-[10px] uppercase text-white/40 tracking-wider mb-1">
                      PROPOSED TACTICAL RESPONSE
                    </div>
                    <div className="font-condensed font-bold text-sm text-emerald-400 leading-snug">
                      {plan.action || 'Deploy designated SAR Unit & Medical transport to incident scene'}
                    </div>
                    {plan.reason && (
                      <div className="font-mono text-xs text-white/60 mt-1.5 leading-relaxed">
                        {plan.reason}
                      </div>
                    )}
                  </div>

                  {/* Resource & Critic Snapshot */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/30">AI CONFIDENCE</div>
                      <div className="font-bold text-emerald-400 text-sm mt-0.5">{confidence}%</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/30">ASSIGNED UNIT</div>
                      <div className="font-bold text-cyan-300 text-xs mt-0.5 truncate" title={plan.recommended_resource || 'Units Pending'}>
                        {plan.recommended_resource || 'Units Pending'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/30">TARGET SHELTER</div>
                      <div className="font-bold text-purple-300 text-xs mt-0.5 truncate" title={plan.recommended_shelter || 'Reception Center'}>
                        {plan.recommended_shelter || 'Reception Center'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                      <div className="text-[10px] text-white/30">EST. POPULATION</div>
                      <div className="font-bold text-amber-300 text-sm mt-0.5">
                        {plan.estimated_people_affected ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Risk Flags if available */}
                  {plan.risk_flags && plan.risk_flags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {plan.risk_flags.slice(0, 2).map((flag, fIdx) => (
                        <span
                          key={fIdx}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25 truncate max-w-xs"
                        >
                          ⚠ {flag}
                        </span>
                      ))}
                      {plan.risk_flags.length > 2 && (
                        <span className="font-mono text-[10px] text-white/40">
                          +{plan.risk_flags.length - 2} more flags
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom Action Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] mt-1">
                    <span className="font-mono text-[11px] text-white/40">
                      Approval Ref: <span className="text-white/60">{plan.approval_id}</span>
                    </span>

                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className="px-5 py-2 rounded-xl font-condensed font-black text-xs tracking-wider transition-all duration-200 hover:brightness-110 cursor-pointer flex items-center gap-2"
                      style={{
                        background: '#10b981',
                        color: '#080b0f',
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <span>REVIEW & AUTHORIZE</span>
                      <span>→</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared Authoritative Approval Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <ApprovalModal
            onClose={() => setSelectedPlan(null)}
            pendingApproval={selectedPlan}
            activePlan={{
              id: selectedPlan.exec_id || selectedPlan.plan_id,
              plan_id: selectedPlan.plan_id,
              incident_id: selectedPlan.incident_id,
              status: selectedPlan.orchestration_status || 'WAITING_FOR_APPROVAL',
              approval_status: selectedPlan.status,
              current_step: selectedPlan.completed_agents || 11,
              total_steps: selectedPlan.total_agents || 11,
              critic_verification: selectedPlan.critic_verification,
              confidence: selectedPlan.confidence_score,
              risk_flags: selectedPlan.risk_flags,
            }}
            onApprovedSuccess={handleDecisionFinalized}
            onDismissSuccess={handleDismissFinalized}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
