import React, { useEffect, useState } from "react";
import {
  Search,
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
  FileText,
} from "lucide-react";
import { ViewTab } from "../../types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ViewTab) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectTab }: CommandPaletteProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: "overview" as ViewTab, label: "Overview", category: "Monitor", icon: LayoutDashboard },
    { id: "cameras" as ViewTab, label: "Live cameras", category: "Monitor", icon: Video },
    { id: "map" as ViewTab, label: "Store map", category: "Monitor", icon: MapPin },
    { id: "alerts" as ViewTab, label: "Alerts", category: "Investigate", icon: Bell },
    { id: "review_queue" as ViewTab, label: "Review queue", category: "Investigate", icon: CheckSquare },
    { id: "journeys" as ViewTab, label: "Customer journeys", category: "Investigate", icon: GitBranch },
    { id: "analytics" as ViewTab, label: "Analytics", category: "Insights", icon: BarChart2 },
    { id: "inventory" as ViewTab, label: "Inventory & safety", category: "Insights", icon: Package },
    { id: "assistant" as ViewTab, label: "Assistant", category: "Investigate", icon: Bot },
    { id: "admin_cameras" as ViewTab, label: "Cameras config", category: "Admin", icon: Camera },
    { id: "admin_users" as ViewTab, label: "Users & access", category: "Admin", icon: Users },
    { id: "admin_settings" as ViewTab, label: "Audit log & settings", category: "Admin", icon: Settings },
    { id: "privacy" as ViewTab, label: "Privacy policy", category: "Legal", icon: FileText },
    { id: "terms" as ViewTab, label: "Terms of service", category: "Legal", icon: FileText },
  ];

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-[6px] border border-border bg-popover shadow-xl overflow-hidden z-10">
        <div className="flex items-center px-3 py-2.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground mr-2.5" />
          <input
            autoFocus
            type="text"
            placeholder="Type a screen or command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length > 0 ? (
            <div className="space-y-0.5">
              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-xs text-foreground hover:bg-muted transition text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No matching views found.
            </div>
          )}
        </div>

        <div className="px-3 py-1.5 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Click or Enter to select</span>
          <span className="font-mono">Esc to close</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
