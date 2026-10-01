import React from "react";
import { ViewTab } from "../../types";

interface NotFoundViewProps {
  onNavigate: (tab: ViewTab) => void;
}

export function NotFoundView({ onNavigate }: NotFoundViewProps) {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-4">
      <div className="font-mono text-2xl font-semibold text-muted-foreground">404</div>
      <div className="space-y-1">
        <h1 className="text-base font-semibold text-foreground">Page not found</h1>
        <p className="text-xs text-muted-foreground">
          The page or camera view you requested does not exist.
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={() => onNavigate("overview")}
          className="px-3 py-1.5 rounded-[4px] bg-foreground text-background text-xs font-medium hover:opacity-90 transition"
        >
          Return to overview
        </button>
      </div>
    </div>
  );
}

export default NotFoundView;
