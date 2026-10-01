import React, { useState } from "react";
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
} from "lucide-react";
import { Alert } from "../../types";
import { cn, formatTimeAgo, getSeverityBadge, getStatusDot } from "../../lib/utils";

interface AlertsViewProps {
  alerts: Alert[];
  onAction: (alertId: number, action: "claim" | "resolve" | "false_positive" | "escalate", note?: string) => Promise<void>;
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

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    const matchesSearch =
      (a.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.summary || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.instance_key || "").toLowerCase().includes(search.toLowerCase()) ||
      (a.zone || "").toLowerCase().includes(search.toLowerCase());

    const matchesPriority = priorityFilter === "all" || a.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAlerts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAlerts.map((a) => a.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteAction = async (action: "claim" | "resolve" | "false_positive" | "escalate") => {
    if (!selectedAlert) return;
    setSubmittingAction(true);
    try {
      await onAction(selectedAlert.id, action, actionNote);
      setActionNote("");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleBulkAction = async (action: "resolve" | "claim") => {
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-foreground tracking-tight">Alerts</h1>
              <p className="text-xs text-muted-foreground">
                {filteredAlerts.length} of {alerts.length} incidents
              </p>
            </div>

            {/* Bulk actions */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-mono">{selectedIds.length} selected</span>
                <button
                  onClick={() => handleBulkAction("resolve")}
                  disabled={submittingAction}
                  className="px-2.5 py-1 rounded-[4px] bg-foreground text-background font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  Mark resolved
                </button>
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by keyword, zone, or rule..."
                className="w-full pl-8 pr-3 py-1 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none focus:border-foreground transition"
              />
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Severity:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2 py-1 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none"
              >
                <option value="all">All</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none"
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="reviewing">In review</option>
                <option value="resolved">Resolved</option>
                <option value="false_positive">False positive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Dense Table */}
        <div className="flex-1 mt-3 border border-border rounded-[6px] overflow-hidden bg-background">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium sticky top-0">
              <tr className="h-8">
                <th className="w-8 px-3 py-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredAlerts.length && filteredAlerts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded-[3px] border-border text-foreground focus:ring-0"
                  />
                </th>
                <th className="px-3 py-1 font-medium w-24">Severity</th>
                <th className="px-3 py-1 font-medium">Incident & Rule</th>
                <th className="px-3 py-1 font-medium hidden sm:table-cell">Location</th>
                <th className="px-3 py-1 font-medium hidden md:table-cell w-24">Confidence</th>
                <th className="px-3 py-1 font-medium w-24">Status</th>
                <th className="px-3 py-1 font-medium w-24 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No alerts match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isSelected = selectedAlert?.id === alert.id;
                  const severity = getSeverityBadge(alert.priority);
                  const status = getStatusDot(alert.status);

                  return (
                    <tr
                      key={alert.id}
                      onClick={() => onSelectAlert(alert)}
                      className={cn(
                        "h-9 hover:bg-muted/40 transition-colors cursor-pointer",
                        isSelected && "bg-muted font-medium"
                      )}
                    >
                      <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(alert.id)}
                          onChange={() => handleToggleSelect(alert.id)}
                          className="rounded-[3px] border-border text-foreground focus:ring-0"
                        />
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className={severity.className}>{severity.label}</span>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="font-medium text-foreground truncate max-w-xs sm:max-w-md">
                          {alert.title || alert.rules.join(", ") || "Behavioral anomaly"}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground hidden sm:table-cell truncate">
                        {alert.zone || "Zone 1 · Entrance"}
                      </td>
                      <td className="px-3 py-1.5 font-mono tabular-nums text-muted-foreground hidden md:table-cell">
                        {Math.round(alert.confidence * 100)}%
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.dotClass)} />
                          <span>{status.label}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground font-mono tabular-nums text-right whitespace-nowrap">
                        {formatTimeAgo(alert.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right: Selected Alert Detail Panel */}
      {selectedAlert && (
        <aside className="w-80 lg:w-96 border-l border-border bg-background p-4 flex flex-col justify-between overflow-y-auto shrink-0 animate-in slide-in-from-right-2 duration-150">
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
                  "Subject exhibited prolonged dwell and repetitive reaching behaviors triggering multiple vision signals."}
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
                {(selectedAlert.signals?.rules || selectedAlert.rules.map((r) => ({ rule_name: r, confidence: selectedAlert.confidence }))).map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-foreground truncate max-w-[180px]">{r.rule_name || "Detection heuristic"}</span>
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
                {/* Clean bounding box overlay on dark backdrop */}
                <div className="absolute inset-8 border border-cyan-400/80 bg-cyan-400/5 rounded-sm flex items-start p-1">
                  <span className="text-[9px] font-mono font-medium text-cyan-300 bg-black/80 px-1 rounded">
                    Tracked Subject
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 z-10">CCTV Still · {selectedAlert.camera || "CAM-04"}</span>
              </div>
            </div>
          </div>

          {/* Action Footer (Clean verbs) */}
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
                onClick={() => handleExecuteAction("resolve")}
                disabled={submittingAction}
                className="py-1.5 px-2 rounded-[4px] bg-foreground text-background text-xs font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                Resolve
              </button>
              <button
                onClick={() => handleExecuteAction("false_positive")}
                disabled={submittingAction}
                className="py-1.5 px-2 rounded-[4px] border border-border hover:bg-muted text-xs text-foreground transition disabled:opacity-50"
              >
                False alarm
              </button>
              <button
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
