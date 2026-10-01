import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-border bg-card/40 my-4 transition-all",
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-secondary/80 flex items-center justify-center text-muted-foreground mb-3 ring-8 ring-secondary/30">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-sm mb-4 leading-relaxed">{description}</p>

      {(action || secondaryAction || children) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 justify-center px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {ActionIcon && <ActionIcon className="w-3.5 h-3.5" aria-hidden="true" />}
              {action.label}
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-md bg-muted text-foreground text-xs font-medium hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted"
            >
              {secondaryAction.label}
            </button>
          )}

          {children}
        </div>
      )}
    </div>
  );
}
