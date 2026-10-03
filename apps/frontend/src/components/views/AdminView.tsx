import React, { useState, useEffect, useMemo } from "react";
import { Camera, Zone, AuditLogEntry } from "../../types";
import { api } from "../../lib/api";
import { cn, formatTimeAgo, getStatusDot } from "../../lib/utils";
import { EmptyState } from "../common/EmptyState";
import { Shield, Users, Video, FileText, ArrowUpDown, Plus, Sparkles, Check } from "lucide-react";

interface AdminViewProps {
  cameras: Camera[];
  zones: Zone[];
  activeSubTab?: "cameras" | "users" | "settings";
}

const DEMO_USERS = [
  { id: 1, username: "admin", email: "admin@storesight.local", role: "Org Admin", active: true },
  { id: 2, username: "op1", email: "op1@storesight.local", role: "Security Operator", active: true },
  { id: 3, username: "manager", email: "manager@storesight.local", role: "Store Manager", active: true },
  { id: 4, username: "viewer", email: "viewer@storesight.local", role: "View Only", active: true },
];

export function AdminView({ cameras, zones, activeSubTab = "cameras" }: AdminViewProps) {
  const [subTab, setSubTab] = useState<"cameras" | "users" | "settings">(activeSubTab);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    async function loadAudit() {
      setLoadingAudit(true);
      try {
        const logs = await api.getAuditLog(25);
        setAuditLogs(logs);
      } catch {
        setAuditLogs([
          { id: 1, timestamp: new Date(Date.now() - 120000).toISOString(), user: "admin", action: "auth.login", target_type: "user", target_id: "admin" },
          { id: 2, timestamp: new Date(Date.now() - 340000).toISOString(), user: "op1", action: "alert.resolve", target_type: "alert", target_id: "1" },
          { id: 3, timestamp: new Date(Date.now() - 850000).toISOString(), user: "system", action: "camera.health_check", target_type: "camera", target_id: "CAM-06" },
        ]);
      } finally {
        setLoadingAudit(false);
      }
    }
    loadAudit();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header & Sub-Navigation with Underline Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">System Control & Administration</h1>
          <p className="text-[14px] text-text-secondary">Camera edge telemetry nodes, RBAC permissions, and auditable trails</p>
        </div>

        {/* Tab-based Sub-Navigation with Underline Indicator */}
        <div className="flex items-center gap-1 border-b sm:border-0 border-border" role="tablist" aria-label="Admin categories">
          {(["cameras", "users", "settings"] as const).map((tab) => {
            const isActive = subTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setSubTab(tab)}
                className={cn(
                  "relative px-4 py-2 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[6px]",
                  isActive
                    ? "text-primary font-semibold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-primary after:rounded-full"
                    : "text-text-secondary hover:text-foreground hover:bg-surface-elevated"
                )}
              >
                {tab === "cameras" ? "Camera Governors" : tab === "users" ? "Users & RBAC" : "Security Audit Log"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Subtab 1: Cameras Table */}
      {subTab === "cameras" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[13px] text-text-secondary">
            <span>{cameras.length} camera stream governors registered & active</span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Register Camera Node</span>
            </button>
          </div>

          <div className="border border-border rounded-[10px] overflow-hidden bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]" aria-label="Registered cameras table">
                <thead className="bg-surface-elevated/60 border-b border-border text-text-tertiary font-semibold text-[12px] uppercase tracking-[0.04em]">
                  <tr className="h-10">
                    <th scope="col" className="px-4 py-2 w-32">Status</th>
                    <th scope="col" className="px-4 py-2">Camera Node Name</th>
                    <th scope="col" className="px-4 py-2">Zone Assignment</th>
                    <th scope="col" className="px-4 py-2 w-28 text-right">Target FPS</th>
                    <th scope="col" className="px-4 py-2 w-28 text-right">Latency</th>
                    <th scope="col" className="px-4 py-2 w-32 text-right">Last Heartbeat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {cameras.map((c) => {
                    const status = getStatusDot(c.status);
                    return (
                      <tr key={c.id} className="hover:bg-primary/[0.03] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2 text-[13px] text-foreground font-medium">
                            <span className={cn("w-2 h-2 rounded-full shrink-0", status.dotClass)} aria-hidden="true" />
                            <span>{status.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground text-[14px]">{c.name}</td>
                        <td className="px-4 py-3 text-text-secondary text-[13px]">{c.location || "Sales Floor"}</td>
                        <td className="px-4 py-3 font-mono font-medium text-text-secondary tabular-nums text-right text-[13px]">{c.fps || 15} FPS</td>
                        <td className="px-4 py-3 font-mono font-medium text-text-secondary tabular-nums text-right text-[13px]">{c.latency_ms || 28} ms</td>
                        <td className="px-4 py-3 font-mono text-text-tertiary text-right text-[13px]">
                          {c.last_heartbeat_at ? formatTimeAgo(c.last_heartbeat_at) : "Active"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Users & Access */}
      {subTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[13px] text-text-secondary">
            <span>Enterprise Role-Based Access Control</span>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-hover transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Operator</span>
            </button>
          </div>

          <div className="border border-border rounded-[10px] overflow-hidden bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]" aria-label="RBAC user accounts table">
                <thead className="bg-surface-elevated/60 border-b border-border text-text-tertiary font-semibold text-[12px] uppercase tracking-[0.04em]">
                  <tr className="h-10">
                    <th scope="col" className="px-4 py-2">Operator / User</th>
                    <th scope="col" className="px-4 py-2">Enterprise Email</th>
                    <th scope="col" className="px-4 py-2">Assigned Role</th>
                    <th scope="col" className="px-4 py-2 text-right">Account Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {DEMO_USERS.map((u) => (
                    <tr key={u.id} className="hover:bg-primary/[0.03] transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-3">
                        {/* 24px Circle Avatar with Initials and primary/20 background */}
                        <div className="w-7 h-7 rounded-full bg-primary/15 text-primary border border-primary/25 flex items-center justify-center font-bold text-[12px] shrink-0">
                          {u.username[0].toUpperCase()}
                        </div>
                        <span>{u.username}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-[13px]">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-1 rounded-[6px] bg-surface-elevated text-[12px] font-medium border border-border text-foreground">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[13px]">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: Audit Log */}
      {subTab === "settings" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-[13px] text-text-secondary">
            <span>Immutable Multi-Node Audit Stream</span>
          </div>

          {auditLogs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Audit Records"
              description="No operator modifications or administrative actions recorded yet."
            />
          ) : (
            <div className="border border-border rounded-[10px] overflow-hidden bg-card shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]" aria-label="Audit log table">
                  <thead className="bg-surface-elevated/60 border-b border-border text-text-tertiary font-semibold text-[12px] uppercase tracking-[0.04em]">
                    <tr className="h-10">
                      <th scope="col" className="px-4 py-2 w-36">Timestamp</th>
                      <th scope="col" className="px-4 py-2">Operator / Actor</th>
                      <th scope="col" className="px-4 py-2">Action Performed</th>
                      <th scope="col" className="px-4 py-2">Target Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-primary/[0.03] transition-colors">
                        <td className="px-4 py-3 font-mono text-text-tertiary tabular-nums text-[13px]">
                          {formatTimeAgo(log.timestamp)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-foreground text-[14px]">{log.user}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[12px] text-primary font-semibold px-2 py-0.5 rounded-[6px] bg-primary/10 border border-primary/20">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-[13px]">
                          {log.target_type}:{String(log.target_id)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminView;
