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
    <div className="fixed bottom-3 right-3 sm:right-4 max-w-sm z-50 animate-in fade-in duration-100">
      <div className="rounded-[6px] border border-border bg-popover p-3 shadow-lg text-foreground text-xs space-y-2">
        <p className="text-muted-foreground leading-normal">
          We use functional session storage for authentication and optional anonymous metrics to track camera stream performance.
        </p>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAcceptAll}
              className="px-2.5 py-1 rounded-[4px] bg-foreground text-background text-xs font-medium hover:opacity-90 transition"
            >
              Accept
            </button>
            <button
              onClick={handleEssentialOnly}
              className="px-2.5 py-1 rounded-[4px] border border-border text-foreground text-xs hover:bg-muted transition"
            >
              Essential only
            </button>
          </div>
          {onOpenPrivacy && (
            <button
              onClick={() => {
                onOpenPrivacy();
                setVisible(false);
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition underline"
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
