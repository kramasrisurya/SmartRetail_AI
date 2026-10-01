import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return "just now";
  try {
    const diff = (Date.now() - new Date(isoString).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return "recent";
  }
}

// Filled badges for incident severity
export function getSeverityBadge(priority: string) {
  switch (priority.toLowerCase()) {
    case "urgent":
    case "critical":
      return {
        label: "Urgent",
        className:
          "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium text-[11px] px-1.5 py-0.5 rounded-[4px]",
        bg: "bg-red-500/10 border border-red-500/20",
        text: "text-red-600 dark:text-red-400",
        dot: "bg-red-500",
      };
    case "high":
      return {
        label: "High",
        className:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-medium text-[11px] px-1.5 py-0.5 rounded-[4px]",
        bg: "bg-amber-500/10 border border-amber-500/20",
        text: "text-amber-700 dark:text-amber-400",
        dot: "bg-amber-500",
      };
    case "medium":
      return {
        label: "Medium",
        className:
          "bg-muted text-muted-foreground border border-border font-medium text-[11px] px-1.5 py-0.5 rounded-[4px]",
        bg: "bg-muted border border-border",
        text: "text-muted-foreground",
        dot: "bg-zinc-400",
      };
    default:
      return {
        label: "Low",
        className: "text-muted-foreground text-[11px] px-1 py-0.5",
        bg: "bg-transparent",
        text: "text-muted-foreground",
        dot: "bg-zinc-400",
      };
  }
}

// Status dot + label mapping
export function getStatusDot(status: string) {
  switch (status.toLowerCase()) {
    case "active":
    case "online":
    case "resolved":
      return {
        label: status === "active" ? "Online" : "Resolved",
        dotClass: "bg-emerald-500",
        dot: "bg-emerald-500",
      };
    case "degraded":
    case "open":
    case "reviewing":
      return {
        label: status === "degraded" ? "Degraded" : status === "open" ? "Open" : "In review",
        dotClass: "bg-amber-500",
        dot: "bg-amber-500",
      };
    case "faulted":
    case "offline":
    case "escalated":
      return {
        label: status === "faulted" ? "Offline" : status === "offline" ? "Offline" : "Escalated",
        dotClass: "bg-red-500",
        dot: "bg-red-500",
      };
    default:
      return {
        label: status.replace("_", " "),
        dotClass: "bg-zinc-400",
        dot: "bg-zinc-400",
      };
  }
}
