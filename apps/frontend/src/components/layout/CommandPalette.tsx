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
  CornerDownLeft,
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-sm animate-fade-up"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-[12px] border border-border bg-card shadow-modal overflow-hidden z-10">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border">
          <Search className="w-5 h-5 text-text-tertiary mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search views, telemetry, or commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-[16px] text-foreground placeholder:text-text-tertiary focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="p-1 rounded-[6px] text-text-tertiary hover:text-foreground hover:bg-surface-elevated transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-88 overflow-y-auto p-2" role="listbox">
          {filtered.length > 0 ? (
            <div className="space-y-1">
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
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[14px] transition text-left focus-visible:outline-none font-medium",
                      isSelected ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-surface-elevated"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[11px] font-mono px-2 py-0.5 rounded-[4px]",
                          isSelected ? "bg-white/20 text-white" : "bg-surface-elevated text-text-tertiary border border-border"
                        )}
                      >
                        {item.category}
                      </span>
                      {isSelected && <CornerDownLeft className="w-3.5 h-3.5 opacity-80" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-[14px] text-text-secondary">
              No matching views or commands found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 border-t border-border bg-surface-elevated/50 flex items-center justify-between text-[11px] text-text-tertiary">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border">↵</kbd> Select</span>
            <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border">esc</kbd> Dismiss</span>
          </div>
          <span>SmartRetail AI</span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
