import React, { useState, useMemo, useCallback } from "react";
import {
  Search,
  X,
  Check,
  AlertTriangle,
  ArrowRight,
  Shield,
  Clock,
  MapPin,
  Camera as CameraIcon,
  User,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";
import { Alert, AlertActionType } from "../../types";
import { cn, formatTimeAgo, getSeverityBadge, getStatusDot } from "../../lib/utils";
import { EmptyState } from "../common/EmptyState";

interface AlertsViewProps {
  alerts: Alert[];
  onAction: (
    alertId: number,
    action: AlertActionType,
    note?: string
  ) => Promise<void>;
  selectedAlert?: Alert | null;
  onSelectAlert: (alert: Alert | null) => void;
  currentUser?: string;
}

export function AlertsView({
  alerts,
  onAction,
  selectedAlert,
  onSelectAlert,
  currentUser = "admin",
}: AlertsViewProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [actionNote, setActionNote] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Memoized Filtered alerts
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (a.title || "").toLowerCase().includes(searchLower) ||
        (a.summary || "").toLowerCase().includes(searchLower) ||
        (a.instance_key || "").toLowerCase().includes(searchLower) ||
        (a.zone || "").toLowerCase().includes(searchLower) ||
        (a.signals?.product_name || "").toLowerCase().includes(searchLower);

      const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [alerts, search, priorityFilter, statusFilter]);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredAlerts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAlerts.map((a) => a.id));
    }
  }, [selectedIds, filteredAlerts]);

  const handleToggleSelect = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleExecuteAction = async (action: AlertActionType) => {
    if (!selectedAlert) return;
    setSubmittingAction(true);
    try {
      await onAction(selectedAlert.id, action, actionNote);
      setActionNote("");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleBulkAction = async (action: AlertActionType) => {
    setSubmittingAction(true);
    try {
      for (const id of selectedIds) {
        await onAction(id, action, "Bulk disposition");
      }
      setSelectedIds([]);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden relative max-w-7xl mx-auto animate-fade-up">
      {/* Left: Main Alert List Area */}
      <div className="flex-1 flex flex-col min-w-0 pr-0 lg:pr-5 overflow-y-auto">
        {/* Controls Bar */}
        <div className="space-y-4 pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Incident Alerts & Triage</h1>
              <p className="text-[14px] text-text-secondary tabular-nums">
                {filteredAlerts.length} of {alerts.length} incidents recorded · Loss prevention AI stream
              </p>
            </div>
          </div>

          {/* Filter / Search Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alerts by sku, zone, heuristic, or subject..."
                className="w-full pl-9 pr-3 py-2 rounded-[8px] border border-border bg-card text-foreground text-[13px] placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary shadow-xs transition"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="px-3 py-2 rounded-[8px] border border-border bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="px-3 py-2 rounded-[8px] border border-border bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="reviewing">In Review</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
              <option value="escalated">Escalated</option>
            </select>

            {(search || priorityFilter !== "all" || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPriorityFilter("all");
                  setStatusFilter("all");
                }}
                className="text-[13px] text-primary hover:underline px-2 font-medium"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Alerts Table */}
        <div className="mt-4 flex-1">
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Incidents Match Filter"
              description="Adjust your search query or filters to inspect past or lower-priority alerts."
              action={{
                label: "Clear All Filters",
                onClick: () => {
                  setSearch("");
                  setPriorityFilter("all");
                  setStatusFilter("all");
                },
              }}
            />
          ) : (
            <div className="border border-border rounded-[10px] overflow-hidden bg-card shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]" aria-label="Alerts Table">
                  <thead className="bg-surface-elevated/60 border-b border-border text-text-tertiary font-semibold text-[12px] uppercase tracking-[0.04em]">
                    <tr className="h-10">
                      <th scope="col" className="px-4 py-2 w-10">
                        <button
                          type="button"
                          onClick={handleSelectAll}
                          aria-label="Select all alerts"
                          className="text-text-tertiary hover:text-foreground"
                        >
                          {selectedIds.length === filteredAlerts.length ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th scope="col" className="px-4 py-2 w-28">Severity</th>
                      <th scope="col" className="px-4 py-2">Incident Details</th>
                      <th scope="col" className="px-4 py-2 hidden sm:table-cell">Location</th>
                      <th scope="col" className="px-4 py-2 hidden md:table-cell w-28 text-right">Confidence</th>
                      <th scope="col" className="px-4 py-2 w-28 text-right">Status</th>
                      <th scope="col" className="px-4 py-2 w-28 text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredAlerts.map((alert) => {
                      const severity = getSeverityBadge(alert.priority);
                      const status = getStatusDot(alert.status);
                      const isSelected = selectedAlert?.id === alert.id;
                      const isChecked = selectedIds.includes(alert.id);

                      return (
                        <tr
                          key={alert.id}
                          onClick={() => onSelectAlert(alert)}
                          className={cn(
                            "hover:bg-primary/[0.03] cursor-pointer transition-colors duration-150 relative",
                            isSelected && "bg-primary/[0.06] font-medium"
                          )}
                        >
                          <td className="px-4 py-3" onClick={(e) => handleToggleSelect(alert.id, e)}>
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-primary" />
                            ) : (
                              <Square className="w-4 h-4 text-text-tertiary" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={severity.className}>
                              <span className={cn("w-1.5 h-1.5 rounded-full", severity.dot)} aria-hidden="true" />
                              {alert.priority}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground text-[14px]">
                              {alert.title || alert.rules.join(", ") || `Incident #${alert.id}`}
                            </div>
                            {alert.summary && (
                              <div className="text-[13px] text-text-secondary truncate max-w-sm mt-0.5">
                                {alert.summary}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-text-secondary hidden sm:table-cell text-[13px]">
                            {alert.signals?.camera || alert.camera || "CAM-01"} ·{" "}
                            {alert.signals?.zone || alert.zone || "Main Floor"}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-text-secondary hidden md:table-cell tabular-nums text-[13px]">
                            {Math.round(alert.confidence * 100)}%
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="inline-flex items-center gap-1.5 text-[12px] capitalize font-medium text-text-secondary">
                              <span className={cn("w-1.5 h-1.5 rounded-full", status.dotClass)} aria-hidden="true" />
                              {alert.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-text-tertiary tabular-nums text-[13px]">
                            {formatTimeAgo(alert.created_at || "")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar at Bottom Center */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-modal rounded-[10px] p-3 px-5 flex items-center gap-4 animate-slide-in-bottom">
          <span className="text-[13px] font-semibold text-foreground">
            {selectedIds.length} incidents selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkAction("resolve")}
              disabled={submittingAction}
              className="px-3 py-1.5 rounded-[8px] bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary-hover transition shadow-xs disabled:opacity-50"
            >
              Resolve All
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction("claim")}
              disabled={submittingAction}
              className="px-3 py-1.5 rounded-[8px] border border-border bg-surface-elevated hover:bg-muted text-[13px] font-medium transition disabled:opacity-50"
            >
              Claim Review
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1 rounded-[6px] text-text-tertiary hover:text-foreground"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Right: Selected Incident Detail Drawer (400px wide) */}
      {selectedAlert && (
        <aside
          role="region"
          aria-label="Incident Detail Drawer"
          className="w-full lg:w-[400px] border-l border-border bg-card p-5 flex flex-col justify-between overflow-y-auto shadow-card animate-slide-in-right shrink-0"
        >
          <div className="space-y-5">
            {/* Header & Close */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={getSeverityBadge(selectedAlert.priority).className}>
                    {getSeverityBadge(selectedAlert.priority).label}
                  </span>
                  <span className="font-mono text-[12px] font-semibold text-text-tertiary">#{selectedAlert.id}</span>
                </div>
                <h3 className="text-[16px] font-semibold text-foreground leading-tight">
                  {selectedAlert.title || selectedAlert.rules.join(", ") || "Incident"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectAlert(null)}
                className="p-1.5 rounded-[6px] text-text-tertiary hover:text-foreground hover:bg-surface-elevated transition"
                title="Close detail panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Plain language explanation */}
            <div className="space-y-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">
                Incident Summary & Heuristic
              </h4>
              <p className="text-[13px] text-foreground leading-relaxed bg-surface-elevated p-3.5 rounded-[8px] border border-border">
                {selectedAlert.signals?.explanation ||
                  selectedAlert.summary ||
                  "Subject exhibited behavior triggering multiple vision signals without final checkout resolution."}
              </p>
            </div>

            {/* Context details */}
            <div className="grid grid-cols-2 gap-2.5 text-[13px]">
              <div className="p-3 rounded-[8px] border border-border bg-surface-elevated">
                <span className="text-[11px] text-text-tertiary block font-medium">Location Zone</span>
                <span className="font-semibold text-foreground">{selectedAlert.zone || "Sales Floor"}</span>
              </div>
              <div className="p-3 rounded-[8px] border border-border bg-surface-elevated">
                <span className="text-[11px] text-text-tertiary block font-medium">Camera Node</span>
                <span className="font-semibold text-foreground">{selectedAlert.camera || "CAM-04"}</span>
              </div>
            </div>

            {/* Signal confidence breakdown */}
            <div className="space-y-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">
                Signal Confidence Breakdown
              </h4>
              <div className="space-y-2 border border-border rounded-[8px] p-3 bg-surface-elevated text-[13px]">
                {(
                  selectedAlert.signals?.rules ||
                  selectedAlert.rules.map((r) => ({
                    rule_name: r,
                    confidence: selectedAlert.confidence,
                  }))
                ).map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[13px]">
                    <span className="text-foreground truncate max-w-[200px] font-medium">
                      {r.rule_name || "Detection heuristic"}
                    </span>
                    <span className="font-mono font-medium text-text-secondary tabular-nums">
                      {Math.round((r.confidence || selectedAlert.confidence) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence clip preview */}
            <div className="space-y-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">
                Evidence Clip Preview
              </h4>
              <div className="aspect-video rounded-[8px] border border-border bg-zinc-950 flex items-center justify-center relative overflow-hidden text-xs text-zinc-400 shadow-xs">
                <div className="absolute inset-8 border border-cyan-400 bg-cyan-400/10 rounded-[4px] flex items-start p-1.5">
                  <span className="text-[10px] font-mono font-semibold text-cyan-300 bg-black/80 px-1.5 py-0.5 rounded-[4px]">
                    Tracked Subject
                  </span>
                </div>
                <span className="text-[12px] font-mono text-zinc-400 z-10">
                  CCTV Snapshot · {selectedAlert.camera || "CAM-04"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border space-y-3 mt-5">
            <input
              type="text"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Add review note..."
              className="w-full px-3 py-2 rounded-[8px] border border-border bg-card text-foreground text-[13px] placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary transition shadow-xs"
            />

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleExecuteAction("resolve")}
                disabled={submittingAction}
                className="py-2 px-2 rounded-[8px] bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover transition disabled:opacity-50 shadow-xs"
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAction("false_positive")}
                disabled={submittingAction}
                className="py-2 px-2 rounded-[8px] border border-border bg-surface-elevated hover:bg-muted text-[13px] text-foreground font-medium transition disabled:opacity-50"
              >
                False Alarm
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAction("escalate")}
                disabled={submittingAction}
                className="py-2 px-2 rounded-[8px] border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-[13px] font-semibold transition disabled:opacity-50"
              >
                Escalate
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default AlertsView;
