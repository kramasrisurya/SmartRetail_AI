import React, { useState, useMemo } from "react";
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
import { cn, REFERO_CHART_PALETTE } from "../../lib/utils";
import { TrendingUp, Users, Clock, ShoppingCart } from "lucide-react";
import { KpiCard } from "../common/KpiCard";

const RAW_FOOTFALL_DATA = {
  today: [
    { hour: "08:00", shoppers: 18, conversion: 68 },
    { hour: "10:00", shoppers: 42, conversion: 74 },
    { hour: "12:00", shoppers: 85, conversion: 82 },
    { hour: "14:00", shoppers: 68, conversion: 78 },
    { hour: "16:00", shoppers: 92, conversion: 85 },
    { hour: "18:00", shoppers: 110, conversion: 88 },
    { hour: "20:00", shoppers: 54, conversion: 72 },
  ],
  "7d": [
    { hour: "Mon", shoppers: 410, conversion: 75 },
    { hour: "Tue", shoppers: 480, conversion: 78 },
    { hour: "Wed", shoppers: 520, conversion: 80 },
    { hour: "Thu", shoppers: 590, conversion: 82 },
    { hour: "Fri", shoppers: 720, conversion: 86 },
    { hour: "Sat", shoppers: 940, conversion: 91 },
    { hour: "Sun", shoppers: 810, conversion: 84 },
  ],
  "30d": [
    { hour: "Week 1", shoppers: 3400, conversion: 79 },
    { hour: "Week 2", shoppers: 3800, conversion: 81 },
    { hour: "Week 3", shoppers: 4200, conversion: 84 },
    { hour: "Week 4", shoppers: 4600, conversion: 86 },
  ],
};

const RAW_ZONE_DWELL_DATA = [
  { zone: "Groceries", dwellSec: 145 },
  { zone: "Dairy", dwellSec: 185 },
  { zone: "Beverages", dwellSec: 95 },
  { zone: "Snacks", dwellSec: 110 },
  { zone: "Household", dwellSec: 160 },
  { zone: "Cosmetics", dwellSec: 240 },
  { zone: "Checkout", dwellSec: 115 },
];

// 7x24 Peak Hours Heatmap Simulation
const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS_BLOCKS = ["8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm"];

export function AnalyticsView() {
  const [range, setRange] = useState<"today" | "7d" | "30d">("today");

  const footfallData = useMemo(() => {
    return RAW_FOOTFALL_DATA[range];
  }, [range]);

  const zoneDwellData = useMemo(() => {
    return RAW_ZONE_DWELL_DATA;
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Retail Analytics & Spatial Intelligence</h1>
          <p className="text-[14px] text-text-secondary">
            Customer footfall velocity, zone engagement, and conversion telemetry
          </p>
        </div>

        {/* Date Range Segmented Control */}
        <div className="inline-flex rounded-[8px] border border-border bg-surface-elevated p-0.5 shadow-xs" role="group" aria-label="Time horizon">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "px-3.5 py-1 rounded-[6px] text-[13px] font-medium transition",
                range === r ? "bg-card font-semibold text-foreground shadow-xs" : "text-text-tertiary hover:text-foreground"
              )}
            >
              {r === "today" ? "Today" : r === "7d" ? "7 Days" : "30 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Period Footfall"
          value={range === "today" ? "1,248" : range === "7d" ? "4,770" : "16,000"}
          subtitle="Unique shoppers"
          icon={Users}
          trend={{ value: "+8.4% vs last period", positive: true }}
          color="info"
        />
        <KpiCard
          title="Average Dwell"
          value="16.7 min"
          subtitle="Across all aisles"
          icon={Clock}
          trend={{ value: "+1.2 min engagement", positive: true }}
          color="default"
        />
        <KpiCard
          title="Store Conversion"
          value="82.4%"
          subtitle="Basket checkout rate"
          icon={ShoppingCart}
          trend={{ value: "+3.1% lift", positive: true }}
          color="success"
        />
        <KpiCard
          title="Checkout Queue"
          value="2.4 min"
          subtitle="Avg wait time"
          icon={TrendingUp}
          trend={{ value: "-45s queue speedup", positive: true }}
          color="success"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Footfall Chart */}
        <div className="border border-border rounded-[10px] bg-card p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Hourly Footfall Volume</h2>
              <p className="text-[13px] text-text-secondary">Shopper traversal velocity across store hours</p>
            </div>
            <span className="font-mono text-[12px] font-semibold text-primary px-2 py-0.5 rounded-[6px] bg-primary/10 border border-primary/20">
              Peak: 18:00
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={footfallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartIndigo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis
                  dataKey="hour"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  className="font-mono"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  className="font-mono"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="shoppers"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#chartIndigo)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Zone Dwell Chart */}
        <div className="border border-border rounded-[10px] bg-card p-5 space-y-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-foreground">Zone Engagement Times</h2>
              <p className="text-[13px] text-text-secondary">Average shopper dwell time in seconds per aisle</p>
            </div>
            <span className="font-mono text-[12px] font-semibold text-text-secondary px-2 py-0.5 rounded-[6px] bg-surface-elevated border border-border">
              Avg: 153s
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneDwellData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
                <XAxis
                  dataKey="zone"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  className="font-mono"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(val: number) => [`${val} seconds`, "Dwell Time"]}
                />
                <Bar dataKey="dwellSec" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Peak Hours Heatmap Matrix (7x8 block) */}
      <div className="border border-border rounded-[10px] bg-card p-5 space-y-4 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Store Peak Hours Traffic Matrix</h2>
            <p className="text-[13px] text-text-secondary">Weekly shopper density distribution across operational hours</p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
            <span>Low</span>
            <div className="flex gap-1">
              <span className="w-3 h-3 rounded-[3px] bg-primary/10" />
              <span className="w-3 h-3 rounded-[3px] bg-primary/30" />
              <span className="w-3 h-3 rounded-[3px] bg-primary/60" />
              <span className="w-3 h-3 rounded-[3px] bg-primary" />
            </div>
            <span>High</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[600px] space-y-2">
            <div className="grid grid-cols-9 gap-2 text-[12px] font-mono text-text-tertiary text-center">
              <span className="text-left font-sans">Day</span>
              {HOURS_BLOCKS.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>

            {DAYS_OF_WEEK.map((day, dIdx) => (
              <div key={day} className="grid grid-cols-9 gap-2 items-center text-xs">
                <span className="font-semibold text-foreground text-[13px]">{day}</span>
                {HOURS_BLOCKS.map((_, hIdx) => {
                  const intensity = Math.sin((dIdx + 1) * 0.5 + hIdx * 0.6) * 0.5 + 0.5;
                  return (
                    <div
                      key={hIdx}
                      className={cn(
                        "h-8 rounded-[6px] border border-border/40 transition-transform hover:scale-105 cursor-pointer flex items-center justify-center font-mono text-[10px] text-foreground font-semibold",
                        intensity > 0.75
                          ? "bg-primary text-white"
                          : intensity > 0.5
                          ? "bg-primary/50 text-foreground"
                          : intensity > 0.25
                          ? "bg-primary/20 text-foreground"
                          : "bg-primary/[0.06] text-text-tertiary"
                      )}
                      title={`${day} @ ${HOURS_BLOCKS[hIdx]}: ${Math.round(intensity * 100)}% density`}
                    >
                      {Math.round(intensity * 60 + 20)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsView;
