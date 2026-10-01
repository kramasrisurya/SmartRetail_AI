import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Menu,
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
    <header className="h-12 border-b border-border bg-background px-4 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-xs">
      {/* Left: Mobile trigger & Store selector */}
      <div className="flex items-center gap-2">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-border hover:bg-muted text-xs font-medium text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="truncate max-w-[140px] sm:max-w-none">{activeStore.name}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {storeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setStoreDropdownOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute left-0 mt-1 w-64 rounded-[6px] border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in duration-100">
                <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
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
                      "w-full text-left px-2 py-1.5 rounded-[4px] text-xs font-normal flex items-center justify-between transition",
                      s.id === activeStore.id
                        ? "bg-muted font-medium text-foreground"
                        : "text-foreground hover:bg-muted/70"
                    )}
                  >
                    <span>{s.name}</span>
                    {s.id === activeStore.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Search trigger */}
      <div className="flex-1 max-w-sm mx-auto hidden md:block">
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Open command palette"
          className="w-full flex items-center justify-between px-2.5 py-1 rounded-[6px] border border-border bg-background hover:bg-muted/50 text-muted-foreground text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Search commands & entities...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-border bg-muted/50 text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Theme, Notifications, User Menu */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {onOpenNotifications && (
          <button
            type="button"
            onClick={onOpenNotifications}
            aria-label={`Notifications (${unreadCount} unread)`}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        )}

        {/* User profile dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-1.5 p-1 rounded hover:bg-muted text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-semibold text-[11px]">
              {session?.user?.[0]?.toUpperCase() || "A"}
            </div>
            <span className="font-medium text-foreground hidden sm:inline">{session?.user || "Operator"}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:inline" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 mt-1 w-52 rounded-[6px] border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in duration-100">
                <div className="px-2.5 py-2 border-b border-border/50 text-xs">
                  <div className="font-semibold text-foreground">{session?.user}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{session?.role?.replace("_", " ")}</div>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-[4px] text-xs text-red-600 dark:text-red-400 hover:bg-destructive/10 flex items-center gap-2 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
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
