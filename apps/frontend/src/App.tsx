import React, { useState, useEffect, Suspense, lazy, useCallback, useMemo } from "react";
import { useAuth } from "./context/AuthContext";
import { useAppStore, appStore } from "./store/useAppStore";
import {
  useBootstrapQuery,
  useAlertsQuery,
  useEventsQuery,
  useHeatmapQuery,
  useAlertActionMutation,
} from "./hooks/useDashboardQueries";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { CommandPalette } from "./components/layout/CommandPalette";
import { LoginModal } from "./components/views/LoginModal";
import { CookieConsentBanner } from "./components/common/CookieConsentBanner";
import { ToastContainer } from "./components/common/ToastContainer";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { ViewSkeleton } from "./components/common/Skeleton";
import { Alert, Camera, ViewTab } from "./types";
import { analytics } from "./lib/analytics";

// Lazy-loaded Views for optimum code-splitting & reduced initial JS bundle
const OverviewView = lazy(() =>
  import("./components/views/OverviewView").then((m) => ({ default: m.OverviewView }))
);
const CamerasView = lazy(() =>
  import("./components/views/CamerasView").then((m) => ({ default: m.CamerasView }))
);
const StoreMapView = lazy(() =>
  import("./components/views/StoreMapView").then((m) => ({ default: m.StoreMapView }))
);
const AlertsView = lazy(() =>
  import("./components/views/AlertsView").then((m) => ({ default: m.AlertsView }))
);
const JourneysView = lazy(() =>
  import("./components/views/JourneysView").then((m) => ({ default: m.JourneysView }))
);
const AnalyticsView = lazy(() =>
  import("./components/views/AnalyticsView").then((m) => ({ default: m.AnalyticsView }))
);
const InventoryView = lazy(() =>
  import("./components/views/InventoryView").then((m) => ({ default: m.InventoryView }))
);
const AssistantView = lazy(() =>
  import("./components/views/AssistantView").then((m) => ({ default: m.AssistantView }))
);
const AdminView = lazy(() =>
  import("./components/views/AdminView").then((m) => ({ default: m.AdminView }))
);
const PrivacyPolicyView = lazy(() =>
  import("./components/views/PrivacyPolicyView").then((m) => ({ default: m.PrivacyPolicyView }))
);
const TermsView = lazy(() =>
  import("./components/views/TermsView").then((m) => ({ default: m.TermsView }))
);
const NotFoundView = lazy(() =>
  import("./components/views/NotFoundView").then((m) => ({ default: m.NotFoundView }))
);

export function App() {
  const { isAuthenticated, session } = useAuth();

  // Selective store subscriptions to prevent whole-tree re-renders
  const currentTab = useAppStore((s) => s.currentTab);
  const mobileMenuOpen = useAppStore((s) => s.mobileMenuOpen);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const loginModalOpen = useAppStore((s) => s.loginModalOpen);
  const unauthLegalTab = useAppStore((s) => s.unauthLegalTab);
  const selectedAlert = useAppStore((s) => s.selectedAlert);
  const selectedCamera = useAppStore((s) => s.selectedCamera);

  // TanStack React Query Hooks for cached, resilient data fetching
  const { data: bootstrapData } = useBootstrapQuery();
  const { data: alerts = [], refetch: refetchAlerts } = useAlertsQuery();
  const { data: events = [] } = useEventsQuery(50);
  const { data: heatmapData } = useHeatmapQuery();
  const alertActionMutation = useAlertActionMutation();

  const cameras = useMemo(() => bootstrapData?.cameras || [], [bootstrapData]);
  const zones = useMemo(() => bootstrapData?.zones || [], [bootstrapData]);
  const heatmapCells = useMemo(() => heatmapData?.cells || [], [heatmapData]);

  // Analytics tracking on view change
  useEffect(() => {
    analytics.trackPageView(currentTab);
  }, [currentTab]);

  // Navigation and selection callbacks
  const handleNavigate = useCallback((tab: ViewTab) => {
    appStore.setCurrentTab(tab);
  }, []);

  const handleSelectAlert = useCallback((alert: Alert | null) => {
    appStore.setSelectedAlert(alert);
  }, []);

  const handleSelectCamera = useCallback((camera: Camera | null) => {
    appStore.setSelectedCamera(camera);
    if (camera) {
      appStore.setCurrentTab("cameras");
    }
  }, []);

  const handleAlertAction = useCallback(
    async (
      alertId: number,
      action: "claim" | "resolve" | "false_positive" | "escalate",
      note?: string
    ) => {
      await alertActionMutation.mutate({ alertId, action, note });
      analytics.trackEvent("Alerts", action, `alert_${alertId}`);
    },
    [alertActionMutation]
  );

  const openAlertsCount = useMemo(() => {
    return alerts.filter((a) => a.status === "open" || a.status === "reviewing").length;
  }, [alerts]);

  // Unauthenticated Layout
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground font-sans p-4 overflow-y-auto">
        <Suspense fallback={<ViewSkeleton />}>
          {unauthLegalTab === "privacy" ? (
            <div className="w-full max-w-2xl p-4 my-auto">
              <PrivacyPolicyView onBack={() => appStore.setUnauthLegalTab(null)} />
            </div>
          ) : unauthLegalTab === "terms" ? (
            <div className="w-full max-w-2xl p-4 my-auto">
              <TermsView onBack={() => appStore.setUnauthLegalTab(null)} />
            </div>
          ) : (
            <LoginModal
              isOpen={true}
              onClose={() => refetchAlerts()}
              onOpenPrivacy={() => appStore.setUnauthLegalTab("privacy")}
              onOpenTerms={() => appStore.setUnauthLegalTab("terms")}
            />
          )}
        </Suspense>

        <CookieConsentBanner onOpenPrivacy={() => appStore.setUnauthLegalTab("privacy")} />
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans text-[13px]">
      {/* Toast Notification Stack */}
      <ToastContainer />

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => appStore.setCommandPaletteOpen(false)}
        onSelectTab={handleNavigate}
      />

      {/* Responsive Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleNavigate}
        openAlertsCount={openAlertsCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => appStore.setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onOpenCommand={() => appStore.setCommandPaletteOpen(true)}
          unreadCount={openAlertsCount}
          onOpenNotifications={() => handleNavigate("alerts")}
          onToggleMobileMenu={() => appStore.setMobileMenuOpen(!mobileMenuOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background">
          <ErrorBoundary
            key={currentTab}
            fallbackTitle={`Failed to load ${currentTab} view`}
            fallbackMessage="An error occurred while loading this view. You can retry or navigate to another view."
            onReset={() => refetchAlerts()}
          >
            <Suspense fallback={<ViewSkeleton />}>
              {currentTab === "overview" && (
                <OverviewView
                  cameras={cameras}
                  alerts={alerts}
                  zones={zones}
                  onNavigate={handleNavigate}
                  onSelectAlert={handleSelectAlert}
                  onSelectCamera={handleSelectCamera}
                />
              )}

              {currentTab === "cameras" && (
                <CamerasView
                  cameras={cameras}
                  alerts={alerts}
                  zones={zones}
                  onSelectAlert={handleSelectAlert}
                />
              )}

              {currentTab === "map" && (
                <StoreMapView
                  zones={zones}
                  cameras={cameras}
                  heatmapCells={heatmapCells}
                  events={events}
                  selectedCamera={selectedCamera}
                  onSelectCamera={handleSelectCamera}
                />
              )}

              {(currentTab === "alerts" || currentTab === "review_queue") && (
                <AlertsView
                  alerts={alerts}
                  onAction={handleAlertAction}
                  selectedAlert={selectedAlert}
                  onSelectAlert={handleSelectAlert}
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
                  onNavigate={handleNavigate}
                  onSelectAlert={handleSelectAlert}
                  onSelectCamera={handleSelectCamera}
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
                <PrivacyPolicyView onBack={() => handleNavigate("overview")} />
              )}

              {currentTab === "terms" && (
                <TermsView onBack={() => handleNavigate("overview")} />
              )}

              {currentTab === "not_found" && (
                <NotFoundView onBack={() => handleNavigate("overview")} />
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default App;
