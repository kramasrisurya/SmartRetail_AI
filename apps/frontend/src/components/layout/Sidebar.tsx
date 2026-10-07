import React, { useMemo } from "react";
import {
  LayoutDashboard,
  Video,
  MapPin,
  Bell,
  GitBranch,
  CheckSquare,
  Bot,
  BarChart2,
  Package,
  Camera,
  Users,
  Settings,
  X,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { ViewTab } from "../../types";

interface SidebarProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  openAlertsCount: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  currentTab,
  onTabChange,
  openAlertsCount,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const sections = useMemo(() => {
    return [
      {
        title: "Operations",
        items: [
          { id: "overview" as ViewTab, label: "Overview", icon: LayoutDashboard },
          { id: "cameras" as ViewTab, label: "Live Cameras", icon: Video },
          { id: "map" as ViewTab, label: "Store Map", icon: MapPin },
        ],
      },
      {
        title: "Investigation",
        items: [
          {
            id: "alerts" as ViewTab,
            label: "Incident Alerts",
            icon: Bell,
            count: openAlertsCount > 0 ? openAlertsCount : undefined,
          },
          { id: "journeys" as ViewTab, label: "Customer Journeys", icon: GitBranch },
          { id: "review_queue" as ViewTab, label: "Review Queue", icon: CheckSquare },
          { id: "assistant" as ViewTab, label: "AI Assistant", icon: Bot },
        ],
      },
      {
        title: "Intelligence",
        items: [
          { id: "analytics" as ViewTab, label: "Analytics", icon: BarChart2 },
          { id: "inventory" as ViewTab, label: "Shelves & Safety", icon: Package },
        ],
      },
      {
        title: "System Control",
        items: [
          { id: "admin_cameras" as ViewTab, label: "Camera Nodes", icon: Camera },
          { id: "admin_users" as ViewTab, label: "Users & RBAC", icon: Users },
          { id: "admin_settings" as ViewTab, label: "Audit & Config", icon: Settings },
        ],
      },
    ];
  }, [openAlertsCount]);

  const handleSelect = (id: ViewTab) => {
    onTabChange(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-up"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Sidebar Navigation"
        className={cn(
          "w-[260px] border-r border-border bg-[#fafafc] dark:bg-[#111113] flex flex-col justify-between select-none z-50 shrink-0 transition-all duration-200",
          "hidden md:flex relative",
          mobileOpen && "flex fixed inset-y-0 left-0 shadow-2xl animate-slide-in-right"
        )}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="h-14 px-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-semibold text-[15px] tracking-tight text-foreground">
              <div className="w-6 h-6 rounded-[6px] bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>SmartRetail AI</span>
            </div>

            {mobileOpen && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation sidebar"
                className="md:hidden p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {sections.map((sec, idx) => (
              <div key={idx} className="space-y-1">
                <div className="px-3 py-1 text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.06em]">
                  {sec.title}
                </div>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-[14px] font-medium transition-all duration-150 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        isActive
                          ? "bg-primary/10 text-primary font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-primary before:rounded-r"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-elevated"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-text-tertiary group-hover:text-text-secondary"
                          )}
                          aria-hidden="true"
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.count !== undefined && (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-[6px] text-[11px] font-mono font-bold tracking-tight",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          )}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Footer info & Legal Links */}
        <div className="p-3.5 border-t border-border bg-surface/30 text-[11px] text-text-tertiary flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-text-tertiary">v1.0.0 Enterprise</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" /> Live Stream
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[11px]">
            <button
              type="button"
              onClick={() => onTabChange("privacy")}
              className={cn(
                "hover:text-foreground transition underline-offset-2 hover:underline",
                currentTab === "privacy" && "text-primary font-semibold"
              )}
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => onTabChange("terms")}
              className={cn(
                "hover:text-foreground transition underline-offset-2 hover:underline",
                currentTab === "terms" && "text-primary font-semibold"
              )}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
