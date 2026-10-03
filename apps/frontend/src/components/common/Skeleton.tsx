import React from "react";
import { cn } from "../../lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[6px] bg-surface-elevated relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/10 dark:before:via-white/5 before:to-transparent",
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("p-5 rounded-[10px] border border-border bg-card shadow-card space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-[4px]" />
        <Skeleton className="h-6 w-6 rounded-[6px]" />
      </div>
      <Skeleton className="h-8 w-24 rounded-[6px]" />
      <Skeleton className="h-3.5 w-36 rounded-[4px]" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-3 p-4 rounded-[10px] border border-border bg-card shadow-card" aria-label="Loading table data">
      <div className="flex gap-4 border-b border-border pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 rounded-[4px]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3 border-b border-border/50 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-5 flex-1 rounded-[4px]", c === 0 && "w-1/4", c === cols - 1 && "w-16")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-[10px] border border-border bg-card p-5 space-y-4 flex flex-col justify-between shadow-card"
      style={{ minHeight: `${height}px` }}
      aria-label="Loading analytics chart"
    >
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-40 rounded-[6px]" />
        <Skeleton className="h-4 w-24 rounded-[4px]" />
      </div>
      <div className="flex items-end gap-3 h-44 pt-4">
        {Array.from({ length: 12 }).map((_, i) => {
          const heights = [40, 65, 85, 30, 95, 55, 75, 90, 60, 80, 45, 70];
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <Skeleton className="w-full rounded-t-[4px]" style={{ height: `${heights[i % heights.length]}%` }} />
              <Skeleton className="h-3 w-6 rounded-[3px]" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="w-full h-full min-h-[480px] rounded-[10px] border border-border bg-card p-4 flex flex-col gap-4 shadow-card">
      <div className="flex justify-between items-center border-b border-border pb-3">
        <Skeleton className="h-5 w-48 rounded-[6px]" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-[8px]" />
          <Skeleton className="h-8 w-24 rounded-[8px]" />
        </div>
      </div>
      <div className="flex-1 rounded-[8px] border border-dashed border-border bg-surface-elevated/40 flex items-center justify-center relative overflow-hidden">
        <Skeleton className="w-full h-full rounded-[8px]" />
      </div>
    </div>
  );
}

export function ViewSkeleton() {
  return (
    <div className="p-6 space-y-6 w-full animate-fade-up max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 rounded-[6px]" />
          <Skeleton className="h-4 w-72 rounded-[4px]" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-[8px]" />
          <Skeleton className="h-8 w-28 rounded-[8px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}
