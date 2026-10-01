import React, { useState, useEffect, useMemo } from "react";
import { Camera, Zone, AuditLogEntry } from "../../types";
import { api } from "../../lib/api";
import { cn, formatTimeAgo, getStatusDot } from "../../lib/utils";
import { EmptyState } from "../common/EmptyState";
import { Shield, Users, Video, FileText } from "lucide-react";

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
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Administration & System Control</h1>
          <p className="text-xs text-muted-foreground">Camera telemetry nodes, RBAC permissions, and auditable trails</p>
        </div>

        <div className="flex items-center rounded-[4px] border border-border bg-background p-0.5 text-xs" role="tablist" aria-label="Admin categories">
          {(["cameras", "users", "settings"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={subTab === tab}
              onClick={() => setSubTab(tab)}
              className={cn(
                "px-2.5 py-0.5 rounded-[3px] capitalize transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                subTab === tab ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "cameras" ? "Cameras" : tab === "users" ? "Users & Access" : "Audit Log"}
            </button>
          ))}
        </div>
      </div>

      {/* Subtab 1: Cameras Table */}
      {subTab === "cameras" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{cameras.length} camera stream governors registered</span>
            <button
              type="button"
              className="px-2.5 py-1 rounded-[4px] bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm"
            >
              Register Camera
            </button>
          </div>

          <div className="border border-border rounded-[6px] overflow-hidden bg-background shadow-sm">
            <table className="w-full text-left text-xs" aria-label="Registered cameras table">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th scope="col" className="px-3 py-1 font-medium w-28">Status</th>
                  <th scope="col" className="px-3 py-1 font-medium">Camera Name</th>
                  <th scope="col" className="px-3 py-1 font-medium">Zone Location</th>
                  <th scope="col" className="px-3 py-1 font-medium w-24 text-right">Target FPS</th>
                  <th scope="col" className="px-3 py-1 font-medium w-24 text-right">Latency</th>
                  <th scope="col" className="px-3 py-1 font-medium w-28 text-right">Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cameras.map((c) => {
                  const status = getStatusDot(c.status);
                  return (
                    <tr key={c.id} className="h-9 hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.dotClass)} aria-hidden="true" />
                          <span>{status.label}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-medium text-foreground">{c.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{c.location || "Sales Floor"}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground tabular-nums text-right">{c.fps || 15}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground tabular-nums text-right">{c.latency_ms || 28}ms</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground text-right">
                        {c.last_heartbeat_at ? formatTimeAgo(c.last_heartbeat_at) : "Active"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Users & Access */}
      {subTab === "users" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Enterprise RBAC Accounts</span>
            <button
              type="button"
              className="px-2.5 py-1 rounded-[4px] bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition shadow-sm"
            >
              Add User
            </button>
          </div>

          <div className="border border-border rounded-[6px] overflow-hidden bg-background shadow-sm">
            <table className="w-full text-left text-xs" aria-label="RBAC user accounts table">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th scope="col" className="px-3 py-1 font-medium">Username</th>
                  <th scope="col" className="px-3 py-1 font-medium">Email</th>
                  <th scope="col" className="px-3 py-1 font-medium">Role</th>
                  <th scope="col" className="px-3 py-1 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DEMO_USERS.map((u) => (
                  <tr key={u.id} className="h-9 hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-1.5 font-medium text-foreground">{u.username}</td>
                    <td className="px-3 py-1.5 text-muted-foreground font-mono">{u.email}</td>
                    <td className="px-3 py-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-medium border border-border">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Audit Log */}
      {subTab === "settings" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Immutable Security Audit Stream</span>
          </div>

          {auditLogs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No Audit Records"
              description="No operator modifications or administrative actions recorded yet."
            />
          ) : (
            <div className="border border-border rounded-[6px] overflow-hidden bg-background shadow-sm">
              <table className="w-full text-left text-xs" aria-label="Audit log table">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                  <tr className="h-8">
                    <th scope="col" className="px-3 py-1 font-medium">Timestamp</th>
                    <th scope="col" className="px-3 py-1 font-medium">Operator / Actor</th>
                    <th scope="col" className="px-3 py-1 font-medium">Action Performed</th>
                    <th scope="col" className="px-3 py-1 font-medium">Target Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="h-9 hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-1.5 font-mono text-muted-foreground tabular-nums">
                        {formatTimeAgo(log.timestamp)}
                      </td>
                      <td className="px-3 py-1.5 font-medium text-foreground">{log.user}</td>
                      <td className="px-3 py-1.5">
                        <span className="font-mono text-xs text-primary">{log.action}</span>
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground font-mono">
                        {log.target_type}:{String(log.target_id)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminView;
