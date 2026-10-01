import React from "react";
import { cn, getSeverityBadge, getStatusDot } from "../../lib/utils";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "priority" | "status" | "default" | "outline" | "success" | "warning" | "danger";
  value?: string;
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "default", value, size = "sm", className }: BadgeProps) {
  if (variant === "priority" && value) {
    const sev = getSeverityBadge(value);
    return (
      <span className={cn(sev.className, className)}>
        {children || sev.label}
      </span>
    );
  }

  if (variant === "status" && value) {
    const s = getStatusDot(value);
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-foreground", className)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", s.dotClass)} />
        <span>{children || s.label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium border border-border bg-muted/60 text-muted-foreground",
        className
      )}
    >
      {children || value}
    </span>
  );
}

export default Badge;
