import React, { useState } from "react";
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
  onToggleMobileMenu,
}: HeaderProps) {
  const { session, logout, theme, toggleTheme, activeStore, stores, setActiveStore } = useAuth();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-12 border-b border-border bg-background px-4 flex items-center justify-between gap-3 sticky top-0 z-20">
      {/* Left: Mobile trigger & Store selector */}
      <div className="flex items-center gap-2">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
            aria-label="Toggle navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-border hover:bg-muted text-xs font-medium text-foreground transition"
          >
            <span className="truncate max-w-[160px] sm:max-w-none">{activeStore.name}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          {storeDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setStoreDropdownOpen(false)} />
              <div className="absolute left-0 mt-1 w-60 rounded-[6px] border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in duration-100">
                <div className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  Select location
                </div>
                {stores.map((s) => (
                  <button
                    key={s.id}
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
                      <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
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
          onClick={onOpenCommand}
          className="w-full flex items-center justify-between px-2.5 py-1 rounded-[6px] border border-border bg-background hover:bg-muted/50 text-muted-foreground text-xs transition"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Search...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border border-border bg-muted/50 text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Theme, Notifications, User */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenCommand}
          className="relative p-1.5 rounded-[6px] text-muted-foreground hover:text-foreground hover:bg-muted transition"
          title="Alerts and notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-red-600 text-white text-[9px] font-mono font-medium flex items-center justify-center leading-none">
              {unreadCount}
            </span>
          )}
        </button>

        <div className="h-4 w-px bg-border mx-1" />

        {/* User profile / session */}
        {session ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-[6px] hover:bg-muted transition text-xs"
            >
              <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[11px] font-medium text-foreground">
                {session.user.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-foreground hidden sm:inline">{session.user}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:inline" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-48 rounded-[6px] border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in duration-100">
                  <div className="px-2.5 py-1.5 border-b border-border text-xs">
                    <p className="font-medium text-foreground">{session.user}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{session.role.replace("_", " ")}</p>
                  </div>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        logout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-[4px] transition text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenCommand}
            className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-foreground text-background text-xs font-medium hover:opacity-90 transition"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}
