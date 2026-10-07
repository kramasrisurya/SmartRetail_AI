import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { EventRibbon } from "../common/EventRibbon";
import { ToastContainer } from "../common/ToastContainer";
import { CommandPalette } from "./CommandPalette";
import { ViewTab } from "../../types";

interface DashboardLayoutProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  openAlertsCount: number;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
  commandPaletteOpen: boolean;
  onSetCommandPaletteOpen: (open: boolean) => void;
  children: React.ReactNode;
}

export function DashboardLayout({
  currentTab,
  onNavigate,
  openAlertsCount,
  mobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  commandPaletteOpen,
  onSetCommandPaletteOpen,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans text-[13px] antialiased select-none">
      <ToastContainer />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => onSetCommandPaletteOpen(false)}
        onSelectTab={onNavigate}
      />

      <Sidebar
        currentTab={currentTab}
        onTabChange={onNavigate}
        openAlertsCount={openAlertsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={onCloseMobileMenu}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950">
        <Header
          onOpenCommand={() => onSetCommandPaletteOpen(true)}
          unreadCount={openAlertsCount}
          onOpenNotifications={() => onNavigate("alerts")}
          onToggleMobileMenu={onToggleMobileMenu}
        />

        <EventRibbon onNavigate={onNavigate} />

        <main className="flex-1 overflow-y-auto p-3 sm:p-5 bg-zinc-950 relative">
          <div className="w-full max-w-[1920px] mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
