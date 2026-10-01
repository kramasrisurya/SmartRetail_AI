import React from "react";
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
  const sections = [
    {
      title: "Monitor",
      items: [
        { id: "overview" as ViewTab, label: "Overview", icon: LayoutDashboard },
        { id: "cameras" as ViewTab, label: "Live cameras", icon: Video },
        { id: "map" as ViewTab, label: "Store map", icon: MapPin },
      ],
    },
    {
      title: "Investigate",
      items: [
        {
          id: "alerts" as ViewTab,
          label: "Alerts",
          icon: Bell,
          count: openAlertsCount > 0 ? openAlertsCount : undefined,
        },
        { id: "journeys" as ViewTab, label: "Customer journeys", icon: GitBranch },
        { id: "review_queue" as ViewTab, label: "Review queue", icon: CheckSquare },
        { id: "assistant" as ViewTab, label: "Assistant", icon: Bot },
      ],
    },
    {
      title: "Insights",
      items: [
        { id: "analytics" as ViewTab, label: "Analytics", icon: BarChart2 },
        { id: "inventory" as ViewTab, label: "Inventory & safety", icon: Package },
      ],
    },
    {
      title: "Admin",
      items: [
        { id: "admin_cameras" as ViewTab, label: "Cameras", icon: Camera },
        { id: "admin_users" as ViewTab, label: "Users & access", icon: Users },
        { id: "admin_settings" as ViewTab, label: "Settings", icon: Settings },
      ],
    },
  ];

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
        />
      )}

      <aside
        className={cn(
          "w-56 border-r border-border bg-background flex flex-col justify-between select-none z-50 shrink-0",
          "hidden md:flex relative",
          mobileOpen && "flex fixed inset-y-0 left-0 shadow-lg"
        )}
      >
        <div>
          {/* Brand header: quiet, confident wordmark */}
          <div className="h-12 px-4 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm tracking-tight text-foreground">
              StoreSight
            </span>
            {mobileOpen && (
              <button
                onClick={onCloseMobile}
                className="md:hidden p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation links */}
          <nav className="p-2 space-y-4">
            {sections.map((section, sIdx) => (
              <div key={sIdx}>
                <div className="px-2 pb-1 text-[11px] font-medium text-muted-foreground">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className={cn(
                          "w-full h-8 px-2 rounded-[6px] text-[13px] flex items-center justify-between transition-colors text-left",
                          isActive
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-foreground" : "text-muted-foreground")} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.count !== undefined && (
                          <span className="px-1.5 py-0.2 rounded text-[11px] font-mono tabular-nums font-medium bg-red-500/10 text-red-600 dark:text-red-400">
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Quiet footer with legal links */}
        <div className="p-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelect("privacy")}
              className={cn("hover:text-foreground transition", currentTab === "privacy" && "text-foreground font-medium")}
            >
              Privacy
            </button>
            <span>·</span>
            <button
              onClick={() => handleSelect("terms")}
              className={cn("hover:text-foreground transition", currentTab === "terms" && "text-foreground font-medium")}
            >
              Terms
            </button>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/60">v1.2</span>
        </div>
      </aside>
    </>
  );
}
