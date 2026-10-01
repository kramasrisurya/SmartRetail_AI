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
            label: "Alerts",
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
        title: "Admin",
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
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <nav
        aria-label="Main Navigation"
        className={cn(
          "w-56 border-r border-border bg-background flex flex-col justify-between select-none z-50 shrink-0 transition-transform duration-200",
          "hidden md:flex relative",
          mobileOpen && "flex fixed inset-y-0 left-0 shadow-xl"
        )}
      >
        <div>
          {/* Brand header */}
          <div className="h-12 px-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm tracking-tight text-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span>SmartRetail AI</span>
            </div>

            {mobileOpen && onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close navigation sidebar"
                className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation sections */}
          <div className="p-2 space-y-4">
            {sections.map((sec, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
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
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{item.label}</span>
                      </div>

                      {item.count !== undefined && (
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                            isActive ? "bg-white/20 text-white" : "bg-red-500/10 text-red-600 dark:text-red-400"
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

        {/* Footer info */}
        <div className="p-3 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
          <span className="font-mono text-[10px]">v1.0.0 · prod</span>
          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
          </span>
        </div>
      </nav>
    </>
  );
}

export default Sidebar;
