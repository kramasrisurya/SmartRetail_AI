import React, { useState, useEffect } from "react";
import { analytics } from "../../lib/analytics";

interface CookieConsentBannerProps {
  onOpenPrivacy?: () => void;
}

export function CookieConsentBanner({ onOpenPrivacy }: CookieConsentBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("storesight_cookie_consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("storesight_cookie_consent", "all");
    analytics.setEnabled(true);
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem("storesight_cookie_consent", "essential_only");
    analytics.setEnabled(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:right-6 max-w-sm z-50 animate-slide-in-right">
      <div className="rounded-[10px] border border-border bg-card p-4 shadow-modal text-foreground text-[13px] space-y-3">
        <p className="text-text-secondary leading-relaxed">
          We use functional session storage for authentication and anonymous telemetry to optimize camera stream performance.
        </p>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleAcceptAll}
              className="px-3 py-1.5 rounded-[6px] bg-primary text-primary-foreground text-[12px] font-semibold hover:bg-primary-hover transition shadow-xs"
            >
              Accept All
            </button>
            <button
              onClick={handleEssentialOnly}
              className="px-3 py-1.5 rounded-[6px] border border-border bg-surface-elevated text-text-secondary text-[12px] font-medium hover:text-foreground transition"
            >
              Essential Only
            </button>
          </div>
          {onOpenPrivacy && (
            <button
              onClick={() => {
                onOpenPrivacy();
                setVisible(false);
              }}
              className="text-[12px] text-text-tertiary hover:text-primary transition underline font-medium"
            >
              Privacy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
