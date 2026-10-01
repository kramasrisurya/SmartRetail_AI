import React, { useState, useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { CommandPalette } from "./components/layout/CommandPalette";
import { LoginModal } from "./components/views/LoginModal";
import { OverviewView } from "./components/views/OverviewView";
import { CamerasView } from "./components/views/CamerasView";
import { StoreMapView } from "./components/views/StoreMapView";
import { AlertsView } from "./components/views/AlertsView";
import { JourneysView } from "./components/views/JourneysView";
import { AnalyticsView } from "./components/views/AnalyticsView";
import { InventoryView } from "./components/views/InventoryView";
import { AssistantView } from "./components/views/AssistantView";
import { AdminView } from "./components/views/AdminView";
import { PrivacyPolicyView } from "./components/views/PrivacyPolicyView";
import { TermsView } from "./components/views/TermsView";
import { NotFoundView } from "./components/views/NotFoundView";
import { CookieConsentBanner } from "./components/common/CookieConsentBanner";
import { TableSkeleton } from "./components/common/Skeleton";
import { Alert, Camera, EventItem, HeatmapCell, ViewTab, Zone } from "./types";
import { api } from "./lib/api";
import { analytics } from "./lib/analytics";

export function App() {
  const { isAuthenticated, session } = useAuth();
  const [currentTab, setCurrentTab] = useState<ViewTab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [unauthLegalTab, setUnauthLegalTab] = useState<"privacy" | "terms" | null>(null);

  // Core Data State
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [heatmapCells, setHeatmapCells] = useState<HeatmapCell[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection / Detail Drawer State
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "error" = "info") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    analytics.trackPageView(currentTab);
  }, [currentTab]);

  const loadData = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);

      const boot = await api.getBootstrap().catch(() => ({ zones: [], cameras: [] }));
      if (boot.cameras?.length) setCameras(boot.cameras);
      if (boot.zones?.length) setZones(boot.zones);

      if (session?.token) {
        const alertList = await api.getAlerts().catch(() => []);
        setAlerts(alertList);
      }

      const evList = await api.getEvents(50).catch(() => []);
      setEvents(evList);

      const heat = await api.getHeatmap().catch(() => ({ cells: [] }));
      setHeatmapCells(heat.cells || []);
    } catch (err) {
      console.error("Failed to load StoreSight data", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [session?.token]);

  const handleAlertAction = async (
    alertId: number,
    action: "claim" | "resolve" | "false_positive" | "escalate",
    note?: string
  ) => {
    try {
      await api.actOnAlert(alertId, action, session?.user || "admin", note);
      analytics.trackEvent("Alerts", action, `alert_${alertId}`);
      showToast(`Incident #${alertId} marked as ${action.replace("_", " ")}`, "success");
      const updated = await api.getAlerts().catch(() => []);
      setAlerts(updated);
      if (selectedAlert?.id === alertId) {
        const found = updated.find((a) => a.id === alertId);
        if (found) setSelectedAlert(found);
      }
    } catch (err: any) {
      showToast(`Action failed: ${err.message}`, "error");
    }
  };

  const openAlertsCount = alerts.filter((a) => a.status === "open" || a.status === "reviewing").length;

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground font-sans p-4 overflow-y-auto">
        {unauthLegalTab === "privacy" ? (
          <div className="w-full max-w-2xl p-4 my-auto">
            <PrivacyPolicyView onBack={() => setUnauthLegalTab(null)} />
          </div>
        ) : unauthLegalTab === "terms" ? (
          <div className="w-full max-w-2xl p-4 my-auto">
            <TermsView onBack={() => setUnauthLegalTab(null)} />
          </div>
        ) : (
          <LoginModal
            isOpen={true}
            onClose={() => loadData()}
            onOpenPrivacy={() => setUnauthLegalTab("privacy")}
            onOpenTerms={() => setUnauthLegalTab("terms")}
          />
        )}
        <CookieConsentBanner onOpenPrivacy={() => setUnauthLegalTab("privacy")} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans text-[13px]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in duration-100">
          <div className="px-3 py-2 rounded-[4px] border border-border bg-popover shadow-md text-xs font-normal flex items-center gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                toastMessage.type === "success"
                  ? "bg-emerald-500"
                  : toastMessage.type === "error"
                  ? "bg-red-500"
                  : "bg-blue-500"
              }`}
            />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTab={(tab) => setCurrentTab(tab)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => {
          setLoginModalOpen(false);
          loadData();
        }}
        onOpenPrivacy={() => setCurrentTab("privacy")}
        onOpenTerms={() => setCurrentTab("terms")}
      />

      {/* Plain Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setMobileMenuOpen(false);
          if (!isAuthenticated && (tab === "alerts" || tab === "review_queue" || tab.startsWith("admin_"))) {
            setLoginModalOpen(true);
          }
        }}
        openAlertsCount={openAlertsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Minimal Header */}
        <Header
          onOpenCommand={() => {
            if (!isAuthenticated) setLoginModalOpen(true);
            else setCommandPaletteOpen(true);
          }}
          unreadCount={openAlertsCount}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* View Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="space-y-4">
              <TableSkeleton rows={6} cols={4} />
            </div>
          ) : (
            <>
              {currentTab === "overview" && (
                <OverviewView
                  cameras={cameras}
                  alerts={alerts}
                  zones={zones}
                  onNavigate={(tab) => setCurrentTab(tab)}
                  onSelectAlert={(a) => {
                    setSelectedAlert(a);
                    setCurrentTab("alerts");
                  }}
                  onSelectCamera={(c) => {
                    setSelectedCamera(c);
                    setCurrentTab("map");
                  }}
                />
              )}

              {currentTab === "cameras" && (
                <CamerasView
                  cameras={cameras}
                  alerts={alerts}
                  zones={zones}
                  onSelectAlert={(a) => {
                    setSelectedAlert(a);
                    setCurrentTab("alerts");
                  }}
                />
              )}

              {currentTab === "map" && (
                <StoreMapView
                  zones={zones}
                  cameras={cameras}
                  heatmapCells={heatmapCells}
                  events={events}
                  selectedCamera={selectedCamera}
                  onSelectCamera={(c) => setSelectedCamera(c)}
                />
              )}

              {(currentTab === "alerts" || currentTab === "review_queue") && (
                <AlertsView
                  alerts={alerts}
                  onAction={handleAlertAction}
                  selectedAlert={selectedAlert}
                  onSelectAlert={(a) => setSelectedAlert(a)}
                  currentUser={session?.user}
                />
              )}

              {currentTab === "journeys" && <JourneysView />}

              {currentTab === "analytics" && <AnalyticsView />}

              {currentTab === "inventory" && <InventoryView events={events} />}

              {currentTab === "assistant" && (
                <AssistantView
                  alerts={alerts}
                  cameras={cameras}
                  onNavigate={(tab) => setCurrentTab(tab)}
                  onSelectAlert={(a) => {
                    setSelectedAlert(a);
                    setCurrentTab("alerts");
                  }}
                  onSelectCamera={(c) => {
                    setSelectedCamera(c);
                    setCurrentTab("map");
                  }}
                />
              )}

              {currentTab === "admin_cameras" && (
                <AdminView cameras={cameras} zones={zones} activeSubTab="cameras" />
              )}

              {currentTab === "admin_users" && (
                <AdminView cameras={cameras} zones={zones} activeSubTab="users" />
              )}

              {currentTab === "admin_settings" && (
                <AdminView cameras={cameras} zones={zones} activeSubTab="settings" />
              )}

              {currentTab === "privacy" && (
                <PrivacyPolicyView onBack={() => setCurrentTab("overview")} />
              )}

              {currentTab === "terms" && (
                <TermsView onBack={() => setCurrentTab("overview")} />
              )}

              {currentTab === "not_found" && (
                <NotFoundView onNavigate={(t) => setCurrentTab(t)} />
              )}
            </>
          )}
        </main>
      </div>

      <CookieConsentBanner onOpenPrivacy={() => setCurrentTab("privacy")} />
    </div>
  );
}

export default App;
