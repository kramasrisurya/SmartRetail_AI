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
  const width = 84;
  const height = 30;
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const colorMap = {
    default: "text-primary bg-primary/10 border-primary/20",
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    danger: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
    info: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  const strokeColorMap = {
    default: "#4f46e5",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  };

  return (
    <div
      className={cn(
        "rounded-[10px] border border-border bg-card p-5 shadow-card hover:shadow-card-hover hover:border-primary/25 transition-all duration-200 relative overflow-hidden group animate-fade-up",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">
            {title}
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-[24px] font-bold tracking-tight text-foreground font-mono tabular-nums leading-none">
              {value}
            </span>
            {subtitle && <span className="text-[12px] text-text-tertiary">{subtitle}</span>}
          </div>
        </div>
        <div className={cn("p-2.5 rounded-[8px] border shrink-0 transition-colors", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-border/50">
        {trend ? (
          <div className="flex items-center gap-1.5 text-[12px] font-medium">
            {trend.neutral ? (
              <Minus className="w-3.5 h-3.5 text-text-tertiary" />
            ) : trend.positive ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            )}
            <span
              className={cn(
                trend.neutral
                  ? "text-text-tertiary"
                  : trend.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {trend.value}
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-text-tertiary">Real-time sync</span>
        )}

        {/* Sparkline */}
        <div className="opacity-75 group-hover:opacity-100 transition-opacity">
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

export default KpiCard;
