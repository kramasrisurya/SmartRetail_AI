import React, { useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "../../lib/utils";

const FOOTFALL_DATA = [
  { hour: "08:00", shoppers: 18, conversion: 68 },
  { hour: "10:00", shoppers: 42, conversion: 74 },
  { hour: "12:00", shoppers: 85, conversion: 82 },
  { hour: "14:00", shoppers: 68, conversion: 78 },
  { hour: "16:00", shoppers: 92, conversion: 85 },
  { hour: "18:00", shoppers: 110, conversion: 88 },
  { hour: "20:00", shoppers: 54, conversion: 72 },
];

const ZONE_DWELL_DATA = [
  { zone: "Groceries", dwellSec: 145 },
  { zone: "Dairy", dwellSec: 185 },
  { zone: "Beverages", dwellSec: 95 },
  { zone: "Snacks", dwellSec: 110 },
  { zone: "Household", dwellSec: 160 },
  { zone: "Cosmetics", dwellSec: 240 },
  { zone: "Checkout", dwellSec: 115 },
];

export function AnalyticsView() {
  const [range, setRange] = useState<"today" | "7d" | "30d">("today");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Analytics</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 tabular-nums">
            <span><strong className="text-foreground font-medium">1,248</strong> shoppers today</span>
            <span>·</span>
            <span><strong className="text-foreground font-medium">16.7 min</strong> avg dwell</span>
            <span>·</span>
            <span><strong className="text-foreground font-medium">4.5 min</strong> peak queue</span>
          </div>
        </div>

        <div className="flex items-center rounded-[4px] border border-border bg-background p-0.5 text-xs">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-2.5 py-0.5 rounded-[3px] transition",
                range === r ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r === "today" ? "Today" : r === "7d" ? "7 days" : "30 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Footfall Chart */}
        <div className="border border-border rounded-[6px] bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium text-foreground">Hourly footfall</h2>
              <p className="text-[11px] text-muted-foreground">Shopper volume by time of day</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">Peak: 18:00</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FOOTFALL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground font-mono" />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground font-mono" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="shoppers" stroke="#2563eb" strokeWidth={1.5} fill="url(#chartBlue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Dwell Chart */}
        <div className="border border-border rounded-[6px] bg-background p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium text-foreground">Dwell time by department</h2>
              <p className="text-[11px] text-muted-foreground">Average seconds spent per customer</p>
            </div>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">Max: Cosmetics</span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ZONE_DWELL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border" />
                <XAxis dataKey="zone" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "currentColor" }} className="text-muted-foreground" />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground font-mono" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="dwellSec" fill="#475569" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsView;
