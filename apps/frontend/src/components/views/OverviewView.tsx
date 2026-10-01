import React, { useState } from "react";
import { ChevronRight, ArrowUpRight } from "lucide-react";
import { Alert, Camera, Zone } from "../../types";
import { cn, formatTimeAgo, getSeverityBadge, getStatusDot } from "../../lib/utils";

interface OverviewViewProps {
  cameras: Camera[];
  alerts: Alert[];
  zones: Zone[];
  onNavigate: (tab: any) => void;
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

  const onlineCameras = cameras.filter((c) => c.status === "active").length;
  const degradedCameras = cameras.filter((c) => c.status === "degraded").length;
  const offlineCameras = cameras.filter((c) => c.status === "faulted").length;
  const openAlerts = alerts.filter((a) => a.status === "open" || a.status === "reviewing");
  const urgentAlertsCount = alerts.filter((a) => a.priority === "urgent" || a.priority === "high").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header & Inline Stats Row (No big hero cards) */}
      <div className="space-y-2 border-b border-border pb-4">
        <h1 className="text-base font-semibold text-foreground tracking-tight">Overview</h1>
        
        {/* Inline Metrics Summary */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span className="text-foreground font-medium">
            {onlineCameras} of {cameras.length || 13} cameras online
            {degradedCameras > 0 && <span className="text-muted-foreground font-normal"> ({degradedCameras} degraded)</span>}
            {offlineCameras > 0 && <span className="text-muted-foreground font-normal"> ({offlineCameras} offline)</span>}
          </span>
          <span>·</span>
          <span>
            <strong className="text-foreground font-medium">{openAlerts.length}</strong> open alerts
            {urgentAlertsCount > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium"> ({urgentAlertsCount} urgent)</span>
            )}
          </span>
          <span>·</span>
          <span>99.2% uptime today</span>
          <span>·</span>
          <span>Avg queue 2.4 min</span>
        </div>
      </div>

      {/* 1. Needs Attention: Open Alerts Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Alerts needing review</h2>
            {openAlerts.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono tabular-nums">
                ({openAlerts.length})
              </span>
            )}
          </div>
          <button
            onClick={() => onNavigate("alerts")}
            className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
          >
            <span>View all</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {openAlerts.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-[6px]">
            No open alerts. All flagged incidents have been resolved.
          </div>
        ) : (
          <div className="border border-border rounded-[6px] overflow-hidden bg-background">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th className="px-3 py-1 font-medium w-24">Severity</th>
                  <th className="px-3 py-1 font-medium">Incident</th>
                  <th className="px-3 py-1 font-medium hidden sm:table-cell">Location</th>
                  <th className="px-3 py-1 font-medium hidden md:table-cell w-28">Confidence</th>
                  <th className="px-3 py-1 font-medium w-24 text-right">Time</th>
                  <th className="px-3 py-1 font-medium w-20 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {openAlerts.map((alert) => {
                  const severity = getSeverityBadge(alert.priority);
                  return (
                    <tr
                      key={alert.id}
                      onClick={() => onSelectAlert(alert)}
                      className="h-9 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
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
                      <td className="px-3 py-1.5 text-muted-foreground font-mono tabular-nums text-right whitespace-nowrap">
                        {formatTimeAgo(alert.created_at)}
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAlert(alert);
                          }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 2. Camera Status Table */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">Cameras</h2>
            <span className="text-xs text-muted-foreground">
              {onlineCameras} active, {degradedCameras + offlineCameras} issues
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <button
              onClick={() => setCameraView("table")}
              className={cn(
                "px-2 py-0.5 rounded-[4px] transition",
                cameraView === "table" ? "bg-muted text-foreground font-medium" : "hover:text-foreground"
              )}
            >
              Table
            </button>
            <span>·</span>
            <button
              onClick={() => setCameraView("grid")}
              className={cn(
                "px-2 py-0.5 rounded-[4px] transition",
                cameraView === "grid" ? "bg-muted text-foreground font-medium" : "hover:text-foreground"
              )}
            >
              Grid
            </button>
            <span className="mx-1">·</span>
            <button
              onClick={() => onNavigate("cameras")}
              className="text-primary hover:underline flex items-center gap-0.5"
            >
              <span>Live feeds</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {cameraView === "table" ? (
          <div className="border border-border rounded-[6px] overflow-hidden bg-background">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th className="px-3 py-1 font-medium w-28">Status</th>
                  <th className="px-3 py-1 font-medium">Camera</th>
                  <th className="px-3 py-1 font-medium hidden sm:table-cell">Zone</th>
                  <th className="px-3 py-1 font-medium hidden md:table-cell w-24">FPS</th>
                  <th className="px-3 py-1 font-medium hidden md:table-cell w-24">Latency</th>
                  <th className="px-3 py-1 font-medium w-28 text-right">Heartbeat</th>
                  <th className="px-3 py-1 font-medium w-20 text-right">Feed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cameras.map((camera) => {
                  const statusInfo = getStatusDot(camera.status);
                  return (
                    <tr
                      key={camera.id}
                      onClick={() => onSelectCamera(camera)}
                      className="h-9 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusInfo.dotClass)} />
                          <span>{statusInfo.label}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-medium text-foreground">
                        {camera.name}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground hidden sm:table-cell">
                        {camera.location || "Sales Floor"}
                      </td>
                      <td className="px-3 py-1.5 font-mono tabular-nums text-muted-foreground hidden md:table-cell">
                        {camera.fps || 24} fps
                      </td>
                      <td className="px-3 py-1.5 font-mono tabular-nums text-muted-foreground hidden md:table-cell">
                        {camera.latency_ms || 32} ms
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground font-mono tabular-nums text-right whitespace-nowrap">
                        {formatTimeAgo(camera.last_heartbeat_at)}
                      </td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCamera(camera);
                          }}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {cameras.map((cam) => {
              const status = getStatusDot(cam.status);
              return (
                <div
                  key={cam.id}
                  onClick={() => onSelectCamera(cam)}
                  className="p-2.5 rounded-[6px] border border-border bg-background hover:bg-muted/40 transition cursor-pointer text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground truncate">{cam.name}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <span className={cn("w-1.5 h-1.5 rounded-full", status.dotClass)} />
                      <span>{status.label}</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {cam.location || "Sales Floor"}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/50">
                    <span>{cam.fps || 24} fps</span>
                    <span>{cam.latency_ms || 32} ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default OverviewView;
