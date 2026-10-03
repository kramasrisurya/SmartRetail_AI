import React from "react";
import { LucideIcon, Inbox } from "lucide-react";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[10px] border border-border bg-card shadow-card animate-fade-up",
        className
      )}
    >
      <div className="w-12 h-12 rounded-[10px] bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-xs">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>

      <h3 className="text-[16px] font-semibold text-foreground tracking-tight mb-1.5">{title}</h3>
      <p className="text-[14px] text-text-secondary max-w-md leading-relaxed mb-6">
        {description}
      </p>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 rounded-[8px] bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary-hover active:bg-indigo-800 transition-all duration-150 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
