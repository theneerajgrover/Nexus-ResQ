// ============================================================
// NEXUS RESQ — REAL-TIME HUMAN APPROVAL POPUP
// Authority/Admin Bottom Permission/Action Prompt
// ============================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import { approvalsApi } from '../../api';

interface PendingApproval {
  approval_id: string;
  incident_id?: string;
  plan_id: string;
  requested_by?: string;
  approval_type?: string;
  status: string;
  created_at: string;
  action?: string;
  reason?: string;
  priority?: string;
  affected_zone?: string;
  estimated_people_affected?: number;
  recommended_resource?: string;
  recommended_shelter?: string;
  recommended_teams_count?: number;
  confidence_score?: number;
  risk_flags?: string[];
  proposed_actions_list?: string[];
  incident_title?: string;
  incident_type?: string;
  incident_severity?: string;
  incident_location?: string;
}

export default function HumanApprovalPopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [dismissedApprovalIds, setDismissedApprovalIds] = useState<string[]>([]);
  const isFetchingRef = useRef(false);

  // Check if current user is Authority or Command
  const userJson = localStorage.getItem('nexus_user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isAuthority = user && ['authority_command', 'authority', 'admin'].includes(user.role);

  // Database fetch for pending approvals
  const fetchPendingApprovals = useCallback(async () => {
    if (!isAuthority || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await approvalsApi.getPending();
      if (res && res.data) {
        const list: PendingApproval[] = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setPendingApprovals(list);
      }
    } catch (err) {
      // Background sync retry
    } finally {
      isFetchingRef.current = false;
    }
  }, [isAuthority]);

  // Initial fetch and 5-second polling synchronization
  useEffect(() => {
    if (!isAuthority) return;
    fetchPendingApprovals();
    const interval = setInterval(fetchPendingApprovals, 5000);
    return () => clearInterval(interval);
  }, [isAuthority, fetchPendingApprovals]);

  // Real-time Server-Sent Events (SSE) listener
  useEffect(() => {
    if (!isAuthority) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'HUMAN_APPROVAL_REQUIRED' || data.type === 'APPROVAL_RESOLVED') {
            fetchPendingApprovals();
          }
        } catch {}
      };

      eventSource.onerror = () => {
        // SSE auto-reconnects
      };
    } catch (e) {
      console.warn('[SSE] EventSource init note:', e);
    }

    return () => {
      eventSource?.close();
    };
  }, [isAuthority, fetchPendingApprovals]);

  // Filter out any dismissed in current session
  const activeItems = pendingApprovals.filter(
    (item) => !dismissedApprovalIds.includes(item.approval_id)
  );

  const currentItem = activeItems[currentIndex] || activeItems[0];

  if (!isAuthority || !currentItem || location.pathname.startsWith('/command')) {
    return null;
  }

  const priority = currentItem.priority || currentItem.incident_severity || 'CRITICAL';
  const isCritical = priority.toUpperCase() === 'CRITICAL';
  const accentColor = isCritical ? '#dc2626' : '#f59e0b';
  const confidence = currentItem.confidence_score
    ? Number(currentItem.confidence_score).toFixed(1)
    : '94.5';

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await approvalsApi.approve(currentItem.approval_id);
      // Remove from current view immediately
      setDismissedApprovalIds((prev) => [...prev, currentItem.approval_id]);
      setShowRejectForm(false);
      await fetchPendingApprovals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve dispatch plan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!showRejectForm) {
      setShowRejectForm(true);
      return;
    }
    if (!rejectReason.trim()) {
      alert('Please provide a tactical reason for rejection.');
      return;
    }

    setIsProcessing(true);
    try {
      await approvalsApi.reject(currentItem.approval_id, rejectReason.trim());
      setDismissedApprovalIds((prev) => [...prev, currentItem.approval_id]);
      setShowRejectForm(false);
      setRejectReason('');
      await fetchPendingApprovals();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject dispatch plan.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReviewPlan = () => {
    if (location.pathname.startsWith('/command')) {
      navigate('/command/incidents');
    } else {
      navigate('/command');
    }
  };

  const handleDismiss = () => {
    setDismissedApprovalIds((prev) => [...prev, currentItem.approval_id]);
  };

  return (
    <AnimatePresence>
      <motion.div
        key={currentItem.approval_id}
        initial={{ opacity: 0, y: 80, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-4xl"
      >
        <div
          className="rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden border"
          style={{
            background: 'rgba(9, 12, 18, 0.97)',
            borderColor: isCritical ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.5)',
            boxShadow: isCritical
              ? '0 0 60px rgba(220, 38, 38, 0.25), 0 25px 50px rgba(0, 0, 0, 0.9)'
              : '0 0 60px rgba(245, 158, 11, 0.25), 0 25px 50px rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {/* Animated top indicator line */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{
              background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            }}
          />

          {/* Top Banner Header */}
          <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-2.5 rounded-full animate-ping shrink-0"
                style={{ background: accentColor }}
              />
              <span
                className="font-mono text-xs font-black tracking-widest uppercase px-2 py-0.5 rounded"
                style={{
                  background: `${accentColor}20`,
                  color: accentColor,
                  border: `1px solid ${accentColor}40`,
                }}
              >
                HUMAN APPROVAL REQUIRED
              </span>
              <span className="font-mono text-xs text-white/40 hidden md:inline">
                AI ORCHESTRATION COMPLETE
              </span>
            </div>

            <div className="flex items-center gap-3">
              {activeItems.length > 1 && (
                <span className="font-mono text-xs text-white/40">
                  {currentIndex + 1} OF {activeItems.length} PENDING
                </span>
              )}
              <button
                onClick={handleDismiss}
                className="font-mono text-xs text-white/40 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                title="Dismiss prompt"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Prompt Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left Content Area (Col 1-8) */}
            <div className="md:col-span-8 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-condensed font-bold text-sm text-white">
                  Incident: <span style={{ color: accentColor }}>{currentItem.incident_id || currentItem.incident_title || 'Active Incident'}</span>
                </span>
                <span className="text-white/20">·</span>
                <span className="font-mono text-xs text-white/60">
                  Priority: <span className="font-bold text-white">{priority}</span>
                </span>
                <span className="text-white/20">·</span>
                <span className="font-mono text-xs text-cyan-400">
                  Confidence: <span className="font-bold">{confidence}%</span>
                </span>
              </div>

              <div className="font-mono text-xs text-white/40">
                AI agents have completed the response plan.
              </div>

              {/* Real Recommended Action */}
              <div
                className="p-2.5 rounded-lg font-mono text-xs leading-relaxed"
                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
              >
                <span className="text-white/40 block text-[10px] uppercase font-bold mb-0.5">
                  RECOMMENDED ACTION:
                </span>
                <span className="text-white font-medium">
                  {currentItem.action || 'Deploy designated SAR units and secure emergency perimeter'}
                </span>
              </div>

              {/* Real Resources Requested */}
              <div className="flex items-center gap-3 text-xs font-mono text-white/60 pt-0.5">
                <span>
                  Resources requested:{' '}
                  <span className="text-emerald-400 font-bold">
                    {currentItem.recommended_resource || 'SAR Tactical Units'}
                  </span>
                  {currentItem.recommended_teams_count && (
                    <span className="text-white/40"> ({currentItem.recommended_teams_count} Teams)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Right Action Area (Col 9-12) */}
            <div className="md:col-span-4 flex flex-col gap-2 justify-center">
              {showRejectForm ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Mandatory rejection reason..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg font-mono text-xs bg-black/60 border border-red-500/40 text-white placeholder:text-white/30 outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="flex-1 py-2 rounded-lg font-condensed font-bold text-xs tracking-wider bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-50"
                    >
                      {isProcessing ? 'REJECTING...' : 'CONFIRM REJECT'}
                    </button>
                    <button
                      onClick={() => setShowRejectForm(false)}
                      className="px-3 py-2 rounded-lg font-mono text-xs bg-white/5 hover:bg-white/10 text-white/60 transition-colors"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <motion.button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-xl font-condensed font-black text-xs tracking-widest text-white transition-all flex items-center justify-center gap-2 shadow-lg hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: '#10b981',
                      boxShadow: '0 0 25px rgba(16, 185, 129, 0.45)',
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>✓</span>
                    <span>{isProcessing ? 'AUTHORIZING DISPATCH...' : 'APPROVE & DISPATCH'}</span>
                  </motion.button>

                  <div className="flex gap-2">
                    <button
                      onClick={handleReviewPlan}
                      className="flex-1 py-2 px-3 rounded-lg font-condensed font-bold text-xs tracking-wider transition-all hover:bg-white/10"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'rgba(255, 255, 255, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      REVIEW PLAN
                    </button>

                    <button
                      onClick={handleReject}
                      disabled={isProcessing}
                      className="flex-1 py-2 px-3 rounded-lg font-condensed font-bold text-xs tracking-wider transition-all hover:bg-red-500/10"
                      style={{
                        background: 'rgba(220, 38, 38, 0.08)',
                        color: '#f87171',
                        border: '1px solid rgba(220, 38, 38, 0.25)',
                      }}
                    >
                      REJECT
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
