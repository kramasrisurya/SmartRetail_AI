import React from "react";
import { ViewTab } from "../../types";

interface NotFoundViewProps {
  onNavigate?: (tab: ViewTab) => void;
  onBack?: () => void;
}

export function NotFoundView({ onNavigate, onBack }: NotFoundViewProps) {
  const handleClick = () => {
    if (onBack) onBack();
    else if (onNavigate) onNavigate("overview");
  };

  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-4 animate-fade-up">
      <div className="font-mono text-4xl font-bold text-text-tertiary">404</div>
      <div className="space-y-1.5">
        <h1 className="text-[18px] font-semibold text-foreground tracking-tight">View Not Found</h1>
        <p className="text-[14px] text-text-secondary">
          The requested store view, camera node, or dashboard module does not exist.
        </p>
      </div>

      <div className="pt-3">
        <button
          onClick={handleClick}
          className="px-4 py-2 rounded-[8px] bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary-hover transition shadow-xs"
        >
          Return to Overview
        </button>
      </div>
    </div>
  );
}

export default NotFoundView;
