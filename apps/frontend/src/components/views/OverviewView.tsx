import React, { useState, useMemo } from "react";
import {
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Video,
  LayoutGrid,
  List,
  Users,
  Activity,
  AlertTriangle,
  Cpu,
} from "lucide-react";
import { Alert, Camera, ViewTab, Zone } from "../../types";
import { cn, formatTimeAgo, getSeverityBadge, getStatusDot } from "../../lib/utils";
import { EmptyState } from "../common/EmptyState";
import { KpiCard } from "../common/KpiCard";

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
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
            Store Operations Overview
          </h1>
          <p className="text-[14px] text-text-secondary mt-0.5">
            Real-time multi-camera spatial tracking, loss prevention, and customer telemetry
          </p>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-border bg-card shadow-xs text-[13px] font-medium text-foreground">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span>Store Stream Active</span>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Footfall"
          value="1,248"
          subtitle="Shoppers today"
          icon={Users}
          trend={{ value: "+14.2% vs yesterday", positive: true }}
          sparklineData={[420, 680, 850, 940, 1100, 1180, 1248]}
          color="info"
        />
        <KpiCard
          title="Live Occupancy"
          value="42"
          subtitle="Inside store now"
          icon={Activity}
          trend={{ value: "+6 peak surge", positive: true }}
          sparklineData={[18, 26, 34, 45, 38, 40, 42]}
          color="default"
        />
        <KpiCard
          title="Open Incidents"
          value={openAlerts.length}
          subtitle={`${urgentAlertsCount} urgent flagged`}
          icon={AlertTriangle}
          trend={{
            value: urgentAlertsCount > 0 ? `${urgentAlertsCount} high severity` : "All clear",
            positive: urgentAlertsCount === 0,
            neutral: urgentAlertsCount === 0,
          }}
          sparklineData={[2, 4, 3, 5, 2, 3, openAlerts.length || 1]}
          color={urgentAlertsCount > 0 ? "danger" : "success"}
        />
        <KpiCard
          title="Camera Governors"
          value={`${onlineCameras}/${cameras.length || 13}`}
          subtitle="99.2% uptime"
          icon={Cpu}
          trend={{ value: "28ms avg latency", positive: true }}
          sparklineData={[99, 99, 98, 99, 100, 99, 99]}
          color="success"
        />
      </div>

      {/* 1. Needs Attention: Open Alerts Table */}
      <section className="space-y-4" aria-labelledby="alerts-heading">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 id="alerts-heading" className="text-[16px] font-semibold text-foreground tracking-tight">
              Incidents Needing Review
            </h2>
            {openAlerts.length > 0 && (
              <span className="px-2 py-0.5 rounded-[6px] text-[12px] font-mono font-medium bg-surface-elevated text-text-secondary border border-border">
                {openAlerts.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate("alerts")}
            className="text-[13px] text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-medium group"
          >
            <span>View all incidents</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </button>
        </div>

        {openAlerts.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="All Incidents Resolved"
            description="No active incidents require review. Multi-camera heuristics are monitoring customer paths."
            action={{
              label: "View Alert History",
              onClick: () => onNavigate("alerts"),
            }}
          />
        ) : (
          <div className="border border-border rounded-[10px] overflow-hidden bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]" aria-label="Incidents needing review">
                <thead className="bg-surface-elevated/60 border-b border-border text-text-tertiary font-semibold text-[12px] uppercase tracking-[0.04em]">
                  <tr className="h-10">
                    <th scope="col" className="px-4 py-2 w-28">Severity</th>
                    <th scope="col" className="px-4 py-2">Incident Details</th>
                    <th scope="col" className="px-4 py-2 hidden sm:table-cell">Location & Camera</th>
                    <th scope="col" className="px-4 py-2 hidden md:table-cell w-28 text-right">Confidence</th>
                    <th scope="col" className="px-4 py-2 w-28 text-right">Logged</th>
                    <th scope="col" className="px-4 py-2 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {openAlerts.map((alert) => {
                    const severity = getSeverityBadge(alert.priority);
                    return (
                      <tr
                        key={alert.id}
                        onClick={() => onSelectAlert(alert)}
                        className="hover:bg-primary/[0.03] cursor-pointer transition-colors duration-150"
                      >
                        <td className="px-4 py-3">
                          <span className={severity.className}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", severity.dot)} aria-hidden="true" />
                            {alert.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground text-[14px]">
                            {alert.title || `Incident #${alert.id}`}
                          </div>
                          {alert.summary && (
                            <div className="text-[13px] text-text-secondary truncate max-w-md mt-0.5">
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
                        <td className="px-4 py-3 text-right text-text-tertiary tabular-nums text-[13px]">
                          {formatTimeAgo(alert.created_at || "")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-primary font-medium hover:underline inline-flex items-center gap-1 text-[13px]">
                            Review <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 2. Camera Status Grid / Summary */}
      <section className="space-y-4" aria-labelledby="cameras-heading">
        <div className="flex items-center justify-between">
          <h2 id="cameras-heading" className="text-[16px] font-semibold text-foreground tracking-tight">
            Live Camera Node Telemetry
          </h2>
          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="inline-flex rounded-[8px] border border-border p-0.5 bg-surface-elevated shadow-xs" role="group" aria-label="Camera layout">
              <button
                type="button"
                onClick={() => setCameraView("table")}
                aria-label="Table view"
                className={cn(
                  "p-1.5 rounded-[6px] transition-colors",
                  cameraView === "table" ? "bg-card shadow-xs text-foreground" : "text-text-tertiary hover:text-foreground"
                )}
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setCameraView("grid")}
                aria-label="Grid view"
                className={cn(
                  "p-1.5 rounded-[6px] transition-colors",
                  cameraView === "grid" ? "bg-card shadow-xs text-foreground" : "text-text-tertiary hover:text-foreground"
                )}
              >
                <LayoutGrid className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate("cameras")}
              className="text-[13px] text-text-secondary hover:text-primary transition-colors flex items-center gap-1 font-medium group"
            >
              <span>Manage all</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </button>
          </div>
        </div>

        {cameraView === "table" ? (
          <div className="border border-border rounded-[10px] overflow-hidden bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]" aria-label="Camera health table">
                <thead className="bg-surface-elevated/60 border-b border-border text-text-tertiary font-semibold text-[12px] uppercase tracking-[0.04em]">
                  <tr className="h-10">
                    <th scope="col" className="px-4 py-2 font-semibold">Camera Node</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Live Status</th>
                    <th scope="col" className="px-4 py-2 font-semibold hidden sm:table-cell">Zone Assignment</th>
                    <th scope="col" className="px-4 py-2 font-semibold hidden md:table-cell text-right">Stream FPS</th>
                    <th scope="col" className="px-4 py-2 font-semibold hidden md:table-cell text-right">Telemetry Latency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {cameras.slice(0, 6).map((cam) => {
                    const status = getStatusDot(cam.status);
                    return (
                      <tr
                        key={cam.id}
                        onClick={() => onSelectCamera(cam)}
                        className="hover:bg-primary/[0.03] cursor-pointer transition-colors duration-150"
                      >
                        <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2.5">
                          <div className="p-1 rounded-[6px] bg-primary/10 text-primary border border-primary/20">
                            <Video className="w-3.5 h-3.5" aria-hidden="true" />
                          </div>
                          <span>{cam.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-2 text-[13px] text-text-secondary capitalize font-medium">
                            <span className={cn("w-2 h-2 rounded-full", status.dotClass)} aria-hidden="true" />
                            {cam.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary hidden sm:table-cell text-[13px]">
                          {cam.location || `Zone #${cam.zone_id || "-"}`}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-text-secondary hidden md:table-cell tabular-nums text-[13px]">
                          {cam.fps || 15} FPS
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-text-secondary hidden md:table-cell tabular-nums text-[13px]">
                          {cam.latency_ms || 28} ms
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                  className="p-4 rounded-[10px] border border-border bg-card text-left hover:border-primary/40 hover:shadow-card-hover transition-all duration-200 shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[13px] text-foreground">{cam.name}</span>
                    <span className={cn("w-2 h-2 rounded-full", status.dotClass)} aria-hidden="true" />
                  </div>
                  <div className="text-[12px] text-text-secondary truncate mb-2">
                    {cam.location || `Zone #${cam.zone_id || "-"}`}
                  </div>
                  <div className="text-[11px] font-mono text-text-tertiary pt-2 border-t border-border/50">
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

export default OverviewView;
