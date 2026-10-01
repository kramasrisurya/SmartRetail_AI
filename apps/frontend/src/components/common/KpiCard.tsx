import React from "react";
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "../../lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive?: boolean;
    neutral?: boolean;
  };
  sparklineData?: number[];
  color?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  sparklineData = [35, 42, 38, 55, 49, 62, 70],
  color = "default",
  className,
}: KpiCardProps) {
  // Generate a mini sparkline SVG path
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const colorMap = {
    default: "text-primary bg-primary/10 border-primary/20",
    success: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    danger: "text-red-400 bg-red-500/10 border-red-500/20",
    info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  const strokeColorMap = {
    default: "currentColor",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm hover:border-border/80 transition-all duration-200 relative overflow-hidden group",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground font-mono tabular-nums">
              {value}
            </span>
            {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
          </div>
        </div>
        <div className={cn("p-2.5 rounded-lg border", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pt-2 border-t border-border/40">
        {trend ? (
          <div className="flex items-center gap-1 text-xs font-medium">
            {trend.neutral ? (
              <Minus className="w-3.5 h-3.5 text-muted-foreground" />
            ) : trend.positive ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            )}
            <span
              className={cn(
                trend.neutral
                  ? "text-muted-foreground"
                  : trend.positive
                  ? "text-emerald-400"
                  : "text-rose-400"
              )}
            >
              {trend.value}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Real-time sync</span>
        )}

        {/* Sparkline */}
        <div className="opacity-70 group-hover:opacity-100 transition-opacity">
          <svg width={width} height={height} className="overflow-visible">
            <polyline
              fill="none"
              stroke={strokeColorMap[color]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
