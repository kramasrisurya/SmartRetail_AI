import React, { useState, useEffect } from "react";
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Menu,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../lib/utils";

interface HeaderProps {
  onOpenCommand: () => void;
  unreadCount?: number;
  onOpenNotifications?: () => void;
  onToggleMobileMenu?: () => void;
}

export function Header({
  onOpenCommand,
  unreadCount = 0,
  onOpenNotifications,
  onToggleMobileMenu,
}: HeaderProps) {
  const { session, logout, theme, toggleTheme, activeStore, stores, setActiveStore } = useAuth();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close menus on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setStoreDropdownOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-background px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile trigger & Store selector dropdown */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-[8px] text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            aria-haspopup="true"
            aria-expanded={storeDropdownOpen}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-border bg-card hover:bg-surface-elevated text-[13px] font-medium text-foreground transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="truncate max-w-[160px] sm:max-w-none">{activeStore.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
          </button>

          {storeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setStoreDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute left-0 mt-1.5 w-64 rounded-[10px] border border-border bg-popover p-1.5 shadow-popover z-50 animate-fade-up">
                <div className="px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
                  Select Store Location
                </div>
                {stores.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActiveStore(s);
                      setStoreDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-2.5 py-2 rounded-[6px] text-[13px] flex items-center justify-between transition",
                      s.id === activeStore.id
                        ? "bg-primary/10 font-semibold text-primary"
                        : "text-foreground hover:bg-surface-elevated"
                    )}
                  >
                    <span>{s.name}</span>
                    {s.id === activeStore.id && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Command Palette Trigger Chip */}
      <div className="flex-1 max-w-md mx-auto hidden md:block">
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Open command palette"
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-[8px] border border-border bg-card hover:bg-surface-elevated text-text-secondary text-[13px] transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
            <span className="text-text-secondary">Search commands, cameras, incidents...</span>
          </div>
          <kbd className="px-2 py-0.5 text-[11px] font-mono rounded-[6px] border border-border bg-surface-elevated text-text-tertiary shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Theme, Notifications, User Menu */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="p-2 rounded-[8px] text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={`Notifications (${unreadCount} unread)`}
            className="p-2 rounded-[8px] text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse-dot" />
            )}
          </button>
        )}

        {/* User profile dropdown with 24px initials avatar */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-2 p-1.5 rounded-[8px] hover:bg-surface-elevated text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary border border-primary/25 flex items-center justify-center font-semibold text-[11px]">
              {session?.user?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="font-medium text-foreground hidden sm:inline">{session?.user || "Operator"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-text-tertiary hidden sm:inline" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-1.5 w-56 rounded-[10px] border border-border bg-popover p-1.5 shadow-popover z-50 animate-fade-up">
                <div className="px-3 py-2.5 border-b border-border/60 text-xs">
                  <div className="font-semibold text-foreground text-[13px]">{session?.user}</div>
                  <div className="text-[11px] text-text-tertiary capitalize mt-0.5">{session?.role?.replace("_", " ")}</div>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-[6px] text-[13px] text-red-600 dark:text-red-400 hover:bg-destructive/10 flex items-center gap-2 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
