import React, { useState, useEffect } from "react";
import { Camera, Zone } from "../../types";
import { api } from "../../lib/api";
import { cn, formatTimeAgo, getStatusDot } from "../../lib/utils";

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
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadAudit() {
      try {
        const logs = await api.getAuditLog(25);
        setAuditLogs(logs);
      } catch {
        setAuditLogs([
          { ts: Date.now() / 1000 - 120, actor: "admin", action: "auth.login", entity_type: "user", entity_id: "admin" },
          { ts: Date.now() / 1000 - 340, actor: "op1", action: "alert.resolve", entity_type: "alert", entity_id: "1" },
          { ts: Date.now() / 1000 - 850, actor: "system", action: "camera.health_check", entity_type: "camera", entity_id: "CAM-06" },
        ]);
      }
    }
    loadAudit();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Administration</h1>
          <p className="text-xs text-muted-foreground">Camera nodes, user access, and system logs</p>
        </div>

        <div className="flex items-center rounded-[4px] border border-border bg-background p-0.5 text-xs">
          {(["cameras", "users", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={cn(
                "px-2.5 py-0.5 rounded-[3px] capitalize transition",
                subTab === tab ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "cameras" ? "Cameras" : tab === "users" ? "Users & access" : "Audit log"}
            </button>
          ))}
        </div>
      </div>

      {/* Subtab 1: Cameras Table */}
      {subTab === "cameras" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{cameras.length} cameras configured</span>
            <button className="px-2.5 py-1 rounded-[4px] bg-foreground text-background font-medium hover:opacity-90 transition">
              Add camera
            </button>
          </div>

          <div className="border border-border rounded-[6px] overflow-hidden bg-background">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th className="px-3 py-1 font-medium w-28">Status</th>
                  <th className="px-3 py-1 font-medium">Camera name</th>
                  <th className="px-3 py-1 font-medium">Zone</th>
                  <th className="px-3 py-1 font-medium w-24">FPS</th>
                  <th className="px-3 py-1 font-medium w-24">Latency</th>
                  <th className="px-3 py-1 font-medium w-28 text-right">Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cameras.map((c) => {
                  const status = getStatusDot(c.status);
                  return (
                    <tr key={c.id} className="h-9 hover:bg-muted/40 transition-colors">
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.dotClass)} />
                          <span>{status.label}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5 font-medium text-foreground">{c.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{c.location || "Sales Floor"}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground tabular-nums">{c.fps || 24}</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground tabular-nums">{c.latency_ms || 32}ms</td>
                      <td className="px-3 py-1.5 font-mono text-muted-foreground tabular-nums text-right whitespace-nowrap">
                        {formatTimeAgo(c.last_heartbeat_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Users Table */}
      {subTab === "users" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{DEMO_USERS.length} user accounts</span>
            <button className="px-2.5 py-1 rounded-[4px] bg-foreground text-background font-medium hover:opacity-90 transition">
              Invite user
            </button>
          </div>

          <div className="border border-border rounded-[6px] overflow-hidden bg-background">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th className="px-3 py-1 font-medium">Username</th>
                  <th className="px-3 py-1 font-medium">Email</th>
                  <th className="px-3 py-1 font-medium">Role</th>
                  <th className="px-3 py-1 font-medium w-24 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {DEMO_USERS.map((u) => (
                  <tr key={u.id} className="h-9 hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-1.5 font-medium text-foreground">{u.username}</td>
                    <td className="px-3 py-1.5 text-muted-foreground font-mono">{u.email}</td>
                    <td className="px-3 py-1.5 text-foreground">{u.role}</td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: System Audit Log */}
      {subTab === "settings" && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Recent operator actions and system events
          </div>

          <div className="border border-border rounded-[6px] overflow-hidden bg-background">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th className="px-3 py-1 font-medium">Action</th>
                  <th className="px-3 py-1 font-medium">Actor</th>
                  <th className="px-3 py-1 font-medium">Target</th>
                  <th className="px-3 py-1 font-medium w-28 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="h-8 hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-1 text-foreground">{log.action}</td>
                    <td className="px-3 py-1 text-muted-foreground">{log.actor}</td>
                    <td className="px-3 py-1 text-muted-foreground">
                      {log.entity_type}:{log.entity_id}
                    </td>
                    <td className="px-3 py-1 text-muted-foreground text-right whitespace-nowrap">
                      {formatTimeAgo(new Date(log.ts * 1000).toISOString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminView;
