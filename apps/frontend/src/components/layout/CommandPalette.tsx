import React, { useEffect, useState, useMemo, useRef } from "react";
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
import { cn } from "../../lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: ViewTab) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectTab }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = useMemo(() => {
    return [
      { id: "overview" as ViewTab, label: "Overview", category: "Operations", icon: LayoutDashboard },
      { id: "cameras" as ViewTab, label: "Live Cameras", category: "Operations", icon: Video },
      { id: "map" as ViewTab, label: "Floor Plan & Store Map", category: "Operations", icon: MapPin },
      { id: "alerts" as ViewTab, label: "Incident Alerts", category: "Investigation", icon: Bell },
      { id: "review_queue" as ViewTab, label: "Review Queue", category: "Investigation", icon: CheckSquare },
      { id: "journeys" as ViewTab, label: "Customer Journeys", category: "Investigation", icon: GitBranch },
      { id: "analytics" as ViewTab, label: "Store Analytics", category: "Intelligence", icon: BarChart2 },
      { id: "inventory" as ViewTab, label: "Shelves & Safety", category: "Intelligence", icon: Package },
      { id: "assistant" as ViewTab, label: "Store Assistant", category: "Investigation", icon: Bot },
      { id: "admin_cameras" as ViewTab, label: "Camera Node Config", category: "Admin", icon: Camera },
      { id: "admin_users" as ViewTab, label: "Users & RBAC", category: "Admin", icon: Users },
      { id: "admin_settings" as ViewTab, label: "Audit Log & System Config", category: "Admin", icon: Settings },
      { id: "privacy" as ViewTab, label: "Privacy Policy", category: "Legal", icon: FileText },
      { id: "terms" as ViewTab, label: "Terms of Service", category: "Legal", icon: FileText },
    ];
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        onSelectTab(filtered[selectedIndex].id);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onSelectTab, filtered, selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-100"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-lg border border-border bg-popover shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-100">
        <div className="flex items-center px-3 py-2.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground mr-2.5" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search views, entities, or commands (↑↓ to navigate, ↵ to select)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5" role="listbox">
          {filtered.length > 0 ? (
            <div className="space-y-0.5">
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs transition text-left focus-visible:outline-none",
                      isSelected ? "bg-primary text-primary-foreground font-medium" : "text-foreground hover:bg-muted/70"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-mono px-1.5 py-0.5 rounded",
                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.category}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching views or commands found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
