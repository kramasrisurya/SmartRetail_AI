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
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden">
      {/* Left: Main Alert List Area */}
      <div className="flex-1 flex flex-col min-w-0 pr-0 lg:pr-4 overflow-y-auto">
        {/* Controls Bar */}
        <div className="space-y-3 pb-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">Alerts</h1>
              <p className="text-xs text-muted-foreground tabular-nums">
                {filteredAlerts.length} of {alerts.length} incidents recorded
              </p>
            </div>

            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in">
                <span className="text-xs text-muted-foreground font-medium">
                  {selectedIds.length} selected:
                </span>
                <button
                  type="button"
                  onClick={() => handleBulkAction("resolve")}
                  disabled={submittingAction}
                  className="px-2.5 py-1 rounded bg-foreground text-background text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  Resolve Selected
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkAction("claim")}
                  disabled={submittingAction}
                  className="px-2.5 py-1 rounded border border-border hover:bg-muted text-xs transition disabled:opacity-50"
                >
                  Claim
                </button>
              </div>
            )}
          </div>

          {/* Filter / Search Row */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search alerts by sku, zone, rule, or subject..."
                className="w-full pl-8 pr-3 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground transition"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="px-2.5 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none focus:border-foreground"
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
              className="px-2.5 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none focus:border-foreground"
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
                className="text-xs text-muted-foreground hover:text-foreground underline px-1"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Alerts Table */}
        <div className="mt-3 flex-1">
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No Incidents Match Filter"
              description="Try adjusting your search query, priority filter, or status filter to see other alerts."
              action={{
                label: "Clear Filters",
                onClick: () => {
                  setSearch("");
                  setPriorityFilter("all");
                  setStatusFilter("all");
                },
              }}
            />
          ) : (
            <div className="border border-border rounded-[6px] overflow-hidden bg-background shadow-sm">
              <table className="w-full text-left text-xs" aria-label="Alerts Table">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                  <tr className="h-8">
                    <th scope="col" className="px-3 py-1 w-8">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        aria-label="Select all alerts"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {selectedIds.length === filteredAlerts.length ? (
                          <CheckSquare className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </th>
                    <th scope="col" className="px-3 py-1 w-24">Severity</th>
                    <th scope="col" className="px-3 py-1">Incident Details</th>
                    <th scope="col" className="px-3 py-1 hidden sm:table-cell">Location</th>
                    <th scope="col" className="px-3 py-1 hidden md:table-cell w-24 text-right">Confidence</th>
                    <th scope="col" className="px-3 py-1 w-24 text-right">Status</th>
                    <th scope="col" className="px-3 py-1 w-24 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
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
                          "hover:bg-muted/30 cursor-pointer transition-colors",
                          isSelected && "bg-muted/50 font-medium"
                        )}
                      >
                        <td className="px-3 py-2" onClick={(e) => handleToggleSelect(alert.id, e)}>
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
                              severity.bg,
                              severity.text
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", severity.dot)} aria-hidden="true" />
                            {alert.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-foreground">
                            {alert.title || alert.rules.join(", ") || `Incident #${alert.id}`}
                          </div>
                          {alert.summary && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-sm">
                              {alert.summary}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                          {alert.signals?.camera || alert.camera || "CAM-01"} ·{" "}
                          {alert.signals?.zone || alert.zone || "Main Floor"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground hidden md:table-cell tabular-nums">
                          {Math.round(alert.confidence * 100)}%
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                            <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} aria-hidden="true" />
                            {alert.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                          {formatTimeAgo(alert.created_at || "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right: Selected Incident Detail Drawer */}
      {selectedAlert && (
        <aside
          role="region"
          aria-label="Incident Detail Drawer"
          className="w-full lg:w-96 border-l border-border bg-card/60 p-4 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right-4 duration-150"
        >
          <div className="space-y-4">
            {/* Header & close */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={getSeverityBadge(selectedAlert.priority).className}>
                    {getSeverityBadge(selectedAlert.priority).label}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">#{selectedAlert.id}</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {selectedAlert.title || selectedAlert.rules.join(", ") || "Incident"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectAlert(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Close detail panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Plain language explanation */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-medium text-muted-foreground">Explanation</h4>
              <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-2.5 rounded-[4px] border border-border">
                {selectedAlert.signals?.explanation ||
                  selectedAlert.summary ||
                  "Subject exhibited behavior triggering multiple vision signals without final checkout resolution."}
              </p>
            </div>

            {/* Context details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-[4px] border border-border bg-muted/20">
                <span className="text-[10px] text-muted-foreground block">Location</span>
                <span className="font-medium text-foreground">{selectedAlert.zone || "Sales Floor"}</span>
              </div>
              <div className="p-2 rounded-[4px] border border-border bg-muted/20">
                <span className="text-[10px] text-muted-foreground block">Camera</span>
                <span className="font-medium text-foreground">{selectedAlert.camera || "CAM-04"}</span>
              </div>
            </div>

            {/* Signals confidence breakdown */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-medium text-muted-foreground">Signal confidence</h4>
              <div className="space-y-1.5 border border-border rounded-[4px] p-2 bg-muted/10 text-xs">
                {(
                  selectedAlert.signals?.rules ||
                  selectedAlert.rules.map((r) => ({
                    rule_name: r,
                    confidence: selectedAlert.confidence,
                  }))
                ).map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate max-w-[180px]">
                      {r.rule_name || "Detection heuristic"}
                    </span>
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {Math.round((r.confidence || selectedAlert.confidence) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence clip preview */}
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-medium text-muted-foreground">Evidence preview</h4>
              <div className="aspect-video rounded-[4px] border border-border bg-zinc-900 flex items-center justify-center relative overflow-hidden text-xs text-zinc-400">
                <div className="absolute inset-8 border border-cyan-400/80 bg-cyan-400/5 rounded-sm flex items-start p-1">
                  <span className="text-[9px] font-mono font-medium text-cyan-300 bg-black/80 px-1 rounded">
                    Tracked Subject
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 z-10">
                  CCTV Still · {selectedAlert.camera || "CAM-04"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-border space-y-2 mt-4">
            <input
              type="text"
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="Add disposition note..."
              className="w-full px-2.5 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none focus:border-foreground transition"
            />

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleExecuteAction("resolve")}
                disabled={submittingAction}
                className="py-1.5 px-2 rounded-[4px] bg-foreground text-background text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                Resolve
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAction("false_positive")}
                disabled={submittingAction}
                className="py-1.5 px-2 rounded-[4px] border border-border hover:bg-muted text-xs text-foreground transition disabled:opacity-50"
              >
                False alarm
              </button>
              <button
                type="button"
                onClick={() => handleExecuteAction("escalate")}
                disabled={submittingAction}
                className="py-1.5 px-2 rounded-[4px] border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-medium transition disabled:opacity-50"
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
