/// <reference types="vite/client" />

/**
 * StoreSight Privacy-Preserving Telemetry & Client Analytics (Item 19)
 *
 * Lightweight, zero-cookie, GDPR/CCPA compliant client-side performance and
 * interaction telemetry tracker. No personal data or identifiable video frames
 * are ever transmitted.
 */

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: string;
}

export interface PageView {
  page: string;
  referrer: string;
  timestamp: string;
}

class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private pageViews: PageView[] = [];
  private isEnabled: boolean = true;

  constructor() {
    // Check if user enabled or restricted analytics via cookie consent
    const consent = localStorage.getItem("storesight_cookie_consent");
    if (consent === "essential_only") {
      this.isEnabled = false;
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public trackPageView(page: string) {
    if (!this.isEnabled) return;
    const record: PageView = {
      page,
      referrer: document.referrer || "direct",
      timestamp: new Date().toISOString(),
    };
    this.pageViews.push(record);
    if (import.meta.env.DEV) {
      console.log(`[StoreSight Telemetry] PageView: ${page}`);
    }
  }

  public trackEvent(category: string, action: string, label?: string, value?: number) {
    if (!this.isEnabled) return;
    const event: AnalyticsEvent = {
      category,
      action,
      label,
      value,
      timestamp: new Date().toISOString(),
    };
    this.events.push(event);
    if (this.events.length > 100) {
      this.events.shift(); // retain last 100 events
    }
    if (import.meta.env.DEV) {
      console.log(`[StoreSight Telemetry] Event:`, event);
    }
  }

  public trackTiming(name: string, durationMs: number) {
    if (!this.isEnabled) return;
    this.trackEvent("Performance", name, undefined, Math.round(durationMs));
  }

  public getRecentEvents(): AnalyticsEvent[] {
    return [...this.events];
  }
}

export const analytics = new AnalyticsManager();
