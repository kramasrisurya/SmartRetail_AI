import React from "react";
import { cn, getSeverityBadge, getStatusDot } from "../../lib/utils";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "priority" | "status" | "default" | "outline" | "success" | "warning" | "danger" | "info";
  value?: string;
  size?: "sm" | "md";
  className?: string;
  showDot?: boolean;
}

export function Badge({
  children,
  variant = "default",
  value,
  size = "sm",
  className,
  showDot = true,
}: BadgeProps) {
  if (variant === "priority" && value) {
    const sev = getSeverityBadge(value);
    return (
      <span className={cn(sev.className, className)}>
        {showDot && <span className={cn("w-1.5 h-1.5 rounded-full", sev.dot)} aria-hidden="true" />}
        <span>{children || sev.label}</span>
      </span>
    );
  }

  if (variant === "status" && value) {
    const s = getStatusDot(value);
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12px] font-medium border border-border bg-surface-elevated text-foreground",
          className
        )}
      >
        {showDot && <span className={cn("w-1.5 h-1.5 rounded-full", s.dotClass)} aria-hidden="true" />}
        <span>{children || s.label}</span>
      </span>
    );
  }

  const variantStyles = {
    default: "bg-surface-elevated text-text-secondary border-border",
    outline: "bg-transparent text-text-secondary border-border",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    danger: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[12px] font-medium border",
        variantStyles[variant as keyof typeof variantStyles] || variantStyles.default,
        size === "md" && "px-3 py-1.5 text-[13px]",
        className
      )}
    >
      {children || value}
    </span>
  );
}

export default Badge;
