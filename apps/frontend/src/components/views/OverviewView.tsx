import React, { useState, useMemo } from "react";
import { ChevronRight, ArrowUpRight, ShieldCheck, Video, LayoutGrid, List } from "lucide-react";
import { Alert, Camera, ViewTab, Zone } from "../../types";
import { cn, formatTimeAgo, getSeverityBadge, getStatusDot } from "../../lib/utils";
import { EmptyState } from "../common/EmptyState";

interface OverviewViewProps {
  cameras: Camera[];
  alerts: Alert[];
  zones: Zone[];
  onNavigate: (tab: ViewTab) => void;
  onSelectAlert: (alert: Alert) => void;
  onSelectCamera: (camera: Camera) => void;
}

export function OverviewView({
  cameras,
  alerts,
  zones,
  onNavigate,
  onSelectAlert,
  onSelectCamera,
}: OverviewViewProps) {
  const [cameraView, setCameraView] = useState<"table" | "grid">("table");

  const { onlineCameras, degradedCameras, offlineCameras, openAlerts, urgentAlertsCount } =
    useMemo(() => {
      const online = cameras.filter((c) => c.status === "active").length;
      const degraded = cameras.filter((c) => c.status === "degraded").length;
      const offline = cameras.filter((c) => c.status === "faulted").length;
      const open = alerts.filter((a) => a.status === "open" || a.status === "reviewing");
      const urgent = alerts.filter((a) => a.priority === "urgent" || a.priority === "high").length;
      return {
        onlineCameras: online,
        degradedCameras: degraded,
        offlineCameras: offline,
        openAlerts: open,
        urgentAlertsCount: urgent,
      };
    }, [cameras, alerts]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Page Header & Inline Stats Row */}
      <div className="space-y-2 border-b border-border pb-4">
        <h1 className="text-base font-semibold text-foreground tracking-tight">Overview</h1>

        {/* Inline Metrics Summary */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span className="text-foreground font-medium">
            {onlineCameras} of {cameras.length || 13} cameras online
            {degradedCameras > 0 && (
              <span className="text-amber-500 font-normal"> ({degradedCameras} degraded)</span>
            )}
            {offlineCameras > 0 && (
              <span className="text-red-500 font-normal"> ({offlineCameras} offline)</span>
            )}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-foreground font-medium">{openAlerts.length}</strong> open alerts
            {urgentAlertsCount > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {" "}
                ({urgentAlertsCount} urgent)
              </span>
            )}
          </span>
          <span aria-hidden="true">·</span>
          <span>99.2% uptime today</span>
          <span aria-hidden="true">·</span>
          <span>Avg queue 2.4 min</span>
        </div>
      </div>

      {/* 1. Needs Attention: Open Alerts Table */}
      <section className="space-y-3" aria-labelledby="alerts-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="alerts-heading" className="text-sm font-semibold text-foreground">
              Alerts needing review
            </h2>
            {openAlerts.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                ({openAlerts.length})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate("alerts")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {openAlerts.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="All Clear"
            description="No open alerts requiring attention. All flagged incidents have been resolved."
            action={{
              label: "View Alert History",
              onClick: () => onNavigate("alerts"),
            }}
          />
        ) : (
          <div className="border border-border rounded-[6px] overflow-hidden bg-background shadow-sm">
            <table className="w-full text-left text-xs" aria-label="Alerts needing review">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th scope="col" className="px-3 py-1 font-medium w-24">
                    Severity
                  </th>
                  <th scope="col" className="px-3 py-1 font-medium">
                    Incident
                  </th>
                  <th scope="col" className="px-3 py-1 font-medium hidden sm:table-cell">
                    Location
                  </th>
                  <th scope="col" className="px-3 py-1 font-medium hidden md:table-cell w-28">
                    Confidence
                  </th>
                  <th scope="col" className="px-3 py-1 font-medium w-24 text-right">
                    Time
                  </th>
                  <th scope="col" className="px-3 py-1 font-medium w-20 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {openAlerts.map((alert) => {
                  const severity = getSeverityBadge(alert.priority);
                  return (
                    <tr
                      key={alert.id}
                      onClick={() => onSelectAlert(alert)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium",
                            severity.bg,
                            severity.text
                          )}
                        >
                          <span
                            className={cn("w-1.5 h-1.5 rounded-full", severity.dot)}
                            aria-hidden="true"
                          />
                          {alert.priority}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">
                          {alert.title || `Incident #${alert.id}`}
                        </div>
                        {alert.summary && (
                          <div className="text-[11px] text-muted-foreground truncate max-w-md">
                            {alert.summary}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                        {alert.signals?.camera || alert.camera || "CAM-01"} ·{" "}
                        {alert.signals?.zone || alert.zone || "Main Floor"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground font-mono hidden md:table-cell">
                        {Math.round(alert.confidence * 100)}%
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        {formatTimeAgo(alert.created_at || "")}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="text-primary font-medium hover:underline inline-flex items-center gap-0.5">
                          Review <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Quick Camera Grid / Summary */}
      <section className="space-y-3" aria-labelledby="cameras-heading">
        <div className="flex items-center justify-between">
          <h2 id="cameras-heading" className="text-sm font-semibold text-foreground">
            Camera status
          </h2>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/30">
              <button
                type="button"
                onClick={() => setCameraView("table")}
                aria-label="Table view"
                className={cn(
                  "p-1 rounded text-xs transition-colors",
                  cameraView === "table" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setCameraView("grid")}
                aria-label="Grid view"
                className={cn(
                  "p-1 rounded text-xs transition-colors",
                  cameraView === "grid" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("cameras")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded p-0.5"
            >
              <span>Manage all</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {cameraView === "table" ? (
          <div className="border border-border rounded-[6px] overflow-hidden bg-background shadow-sm">
            <table className="w-full text-left text-xs" aria-label="Camera health table">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th scope="col" className="px-3 py-1 font-medium">Camera</th>
                  <th scope="col" className="px-3 py-1 font-medium">Status</th>
                  <th scope="col" className="px-3 py-1 font-medium hidden sm:table-cell">Zone</th>
                  <th scope="col" className="px-3 py-1 font-medium hidden md:table-cell text-right">FPS</th>
                  <th scope="col" className="px-3 py-1 font-medium hidden md:table-cell text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cameras.slice(0, 6).map((cam) => {
                  const status = getStatusDot(cam.status);
                  return (
                    <tr
                      key={cam.id}
                      onClick={() => onSelectCamera(cam)}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-2 font-medium text-foreground flex items-center gap-2">
                        <Video className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                        <span>{cam.name}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground capitalize">
                          <span className={cn("w-2 h-2 rounded-full", status.dot)} aria-hidden="true" />
                          {cam.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                        {cam.location || `Zone #${cam.zone_id || "—"}`}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                        {cam.fps || 15} fps
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground hidden md:table-cell">
                        {cam.latency_ms || 28} ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {cameras.slice(0, 6).map((cam) => {
              const status = getStatusDot(cam.status);
              return (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => onSelectCamera(cam)}
                  className="p-3 rounded-lg border border-border bg-card text-left hover:border-primary/50 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-xs text-foreground">{cam.name}</span>
                    <span className={cn("w-2 h-2 rounded-full", status.dot)} aria-hidden="true" />
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mb-1">
                    {cam.location || `Zone #${cam.zone_id || "—"}`}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/80">
                    {cam.fps || 15} FPS · {cam.latency_ms || 28}ms
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
