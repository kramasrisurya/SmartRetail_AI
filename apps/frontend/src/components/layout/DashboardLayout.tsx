import React, { useState } from "react";
import {
  LayoutDashboard,
  Video,
  Map,
  ShieldAlert,
  GitBranch,
  Bell,
  Search,
  Sparkles,
  Layers,
  Activity,
  Menu,
  X,
  User,
  Sliders,
} from "lucide-react";
import { ViewTab } from "../../types";

interface DashboardLayoutProps {
  currentTab: ViewTab;
  onNavigate: (tab: ViewTab) => void;
  openAlertsCount?: number;
  children: React.ReactNode;
}

interface NavItem {
  id: ViewTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  alert?: boolean;
}

export function DashboardLayout({
  currentTab,
  onNavigate,
  openAlertsCount = 0,
  children,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navigation: { section: string; items: NavItem[] }[] = [
    {
      section: "INTELLIGENCE & SENSORS",
      items: [
        { id: "overview", label: "Executive Overview", icon: LayoutDashboard },
        { id: "cameras", label: "Live Vision Grid", icon: Video },
        { id: "map", label: "Spatial Store Map", icon: Map },
      ],
    },
    {
      section: "FORENSICS & ANOMALY",
      items: [
        {
          id: "alerts",
          label: "Incident Triage",
          icon: Bell,
          badge: openAlertsCount,
          alert: openAlertsCount > 0,
        },
        { id: "risk_pos", label: "POS Risk Console", icon: ShieldAlert },
        { id: "event_graph", label: "Event Graph Explorer", icon: GitBranch },
      ],
    },
    {
      section: "SYSTEM GOVERNANCE",
      items: [
        { id: "analytics", label: "Store Analytics", icon: Activity },
        { id: "admin_cameras", label: "Edge Topology", icon: Layers },
      ],
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1B2021] text-[#E7E7E7] font-sans antialiased select-none">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation - Fixed Carbon Black (#1B2021) with Deep Teal accents */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1B2021] border-r border-[#E7E7E7]/10 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Header */}
          <div className="h-16 px-6 border-b border-[#E7E7E7]/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#517664] flex items-center justify-center text-[#E7E7E7] shadow-[0_0_15px_-2px_rgba(81,118,100,0.5)]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-sm tracking-wide text-[#E7E7E7]">SmartRetail</span>
                <span className="ml-1 text-[11px] font-mono text-[#816E94] uppercase tracking-wider font-bold">AI</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-[#E7E7E7]/50 hover:text-[#E7E7E7]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            {navigation.map((group) => (
              <div key={group.section} className="space-y-1.5">
                <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#E7E7E7]/40">
                  {group.section}
                </div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id || (item.id === "map" && currentTab === "spatial");

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-300 ease-in-out group ${
                        isActive
                          ? "bg-gradient-to-r from-[#517664]/20 via-[#517664]/5 to-transparent border-l-2 border-[#517664] text-[#E7E7E7] shadow-[0_0_12px_rgba(81,118,100,0.15)]"
                          : "text-[#E7E7E7]/50 hover:text-[#E7E7E7] hover:bg-[#222829]/60 hover:translate-x-0.5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive ? "text-[#517664]" : "text-[#E7E7E7]/40 group-hover:text-[#E7E7E7]"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>

                      {item.badge !== undefined && item.badge > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            item.alert
                              ? "bg-[#9D69A3]/25 text-[#9D69A3] border border-[#9D69A3]/40 animate-pulse"
                              : "bg-[#517664]/20 text-[#517664] border border-[#517664]/30"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Footer Edge Status */}
        <div className="p-4 border-t border-[#E7E7E7]/10 bg-[#15191A] text-[11px] font-mono flex items-center justify-between text-[#E7E7E7]/60">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#517664] shadow-[0_0_8px_#517664]" />
            <span>EDGE NODE OK</span>
          </div>
          <span className="text-[#816E94] font-bold">v2.4 LTS</span>
        </div>
      </aside>

      {/* Main Canvas with Glassmorphic Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#1B2021]">
        {/* Top Bar - Glassmorphism (Carbon Black 60% opacity, backdrop-blur-md) */}
        <header className="h-16 px-5 sm:px-8 border-b border-[#E7E7E7]/10 bg-[#1B2021]/60 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#E7E7E7]/60 hover:text-[#E7E7E7] hover:bg-[#222829]"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search with Subtle Lavender border */}
            <div className="relative w-64 sm:w-80">
              <Search className="w-4 h-4 text-[#816E94] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search telemetry, tracks, SKUs..."
                className="w-full bg-[#222829]/80 border border-[#816E94]/30 focus:border-[#816E94] focus:ring-1 focus:ring-[#816E94] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#E7E7E7] placeholder:text-[#E7E7E7]/35 outline-none transition-all duration-300"
              />
            </div>
          </div>

          {/* User profile & Quick Action dock */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("alerts")}
              className="relative p-2 rounded-lg bg-[#222829] border border-[#E7E7E7]/10 text-[#E7E7E7]/70 hover:text-[#E7E7E7] hover:border-[#816E94]/40 transition-all duration-300"
            >
              <Bell className="w-4 h-4" />
              {openAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#9D69A3] ring-2 ring-[#1B2021] animate-pulse" />
              )}
            </button>

            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E7E7E7]/10">
              <div className="w-8 h-8 rounded-lg bg-[#517664]/20 border border-[#517664]/40 flex items-center justify-center font-mono font-bold text-xs text-[#517664]">
                OP
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-[#E7E7E7]">Station Lead</div>
                <div className="text-[10px] font-mono text-[#E7E7E7]/40">Store #01 Flagship</div>
              </div>
            </div>
          </div>
        </header>

        {/* Viewport Canvas (#222829 elevation with smooth scroll) */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 bg-[#1B2021] relative">
          <div className="max-w-[1920px] mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
