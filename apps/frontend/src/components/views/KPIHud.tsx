import React, { useState } from "react";
import {
  Users,
  Clock,
  ShieldAlert,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface SparkPoint {
  val: number;
}

const FOOTFALL_SPARK: SparkPoint[] = [
  { val: 45 }, { val: 62 }, { val: 78 }, { val: 95 }, { val: 110 }, { val: 124 },
];

const DWELL_SPARK: SparkPoint[] = [
  { val: 12.1 }, { val: 13.0 }, { val: 12.8 }, { val: 14.5 }, { val: 13.9 }, { val: 14.2 },
];

const POS_ALERT_SPARK: SparkPoint[] = [
  { val: 1 }, { val: 3 }, { val: 2 }, { val: 5 }, { val: 4 }, { val: 6 },
];

const CARTS_SPARK: SparkPoint[] = [
  { val: 18 }, { val: 24 }, { val: 31 }, { val: 28 }, { val: 35 }, { val: 38 },
];

const TRAFFIC_CONVERSION_DATA = [
  { time: "08:00", traffic: 120, conversion: 68 },
  { time: "10:00", traffic: 340, conversion: 75 },
  { time: "12:00", traffic: 680, conversion: 84 },
  { time: "14:00", traffic: 520, conversion: 79 },
  { time: "16:00", traffic: 790, conversion: 86 },
  { time: "18:00", traffic: 980, conversion: 91 },
  { time: "20:00", traffic: 460, conversion: 74 },
];

export function KPIHud() {
  const [activeRange, setActiveRange] = useState<"today" | "7d" | "30d">("today");

  const cards = [
    {
      title: "Foot Traffic",
      value: "1,248",
      unit: "Shoppers",
      trend: "+14.2% vs baseline",
      positive: true,
      sparkData: FOOTFALL_SPARK,
      color: "#517664",
      icon: Users,
    },
    {
      title: "Avg Dwell Time",
      value: "14.2",
      unit: "Minutes",
      trend: "+1.1m engagement",
      positive: true,
      sparkData: DWELL_SPARK,
      color: "#517664",
      icon: Clock,
    },
    {
      title: "POS Discrepancies",
      value: "6",
      unit: "Unresolved",
      trend: "+3 flagged scans",
      positive: false, // Attention metric -> Vivid Lavender (#9D69A3)
      sparkData: POS_ALERT_SPARK,
      color: "#9D69A3",
      icon: ShieldAlert,
    },
    {
      title: "Active Carts",
      value: "38",
      unit: "In circulation",
      trend: "+5 surge peak",
      positive: true,
      sparkData: CARTS_SPARK,
      color: "#517664",
      icon: ShoppingCart,
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Header HUD Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E7E7E7]/10">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#E7E7E7] flex items-center gap-2.5">
            <span>Executive Command HUD</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#517664]/20 text-[#517664] border border-[#517664]/30 font-semibold uppercase tracking-wider">
              REALTIME SYNC
            </span>
          </h1>
          <p className="text-xs text-[#E7E7E7]/50 mt-0.5">
            Multi-camera spatial footfall velocity, dwell analytics, and point-of-sale risk reconciliation
          </p>
        </div>

        {/* Range Selector */}
        <div className="inline-flex rounded-lg border border-[#E7E7E7]/10 bg-[#222829] p-0.5">
          {(["today", "7d", "30d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setActiveRange(r)}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-all duration-300 ${
                activeRange === r
                  ? "bg-[#517664] text-[#E7E7E7] font-semibold shadow-[0_0_12px_rgba(81,118,100,0.4)]"
                  : "text-[#E7E7E7]/40 hover:text-[#E7E7E7]"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Metric Cards Grid with Recharts Mini Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const isAlert = !card.positive;

          return (
            <div
              key={card.title}
              className={`p-5 rounded-xl bg-[#222829] border border-[#E7E7E7]/10 transition-all duration-300 ease-in-out hover:-translate-y-0.5 ${
                isAlert ? "hover:border-[#9D69A3]/50 shadow-[0_0_20px_-5px_rgba(157,105,163,0.15)]" : "hover:border-[#816E94]/40 hover:shadow-[0_0_20px_-5px_rgba(129,110,148,0.15)]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#E7E7E7]/40 block">
                    {card.title}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-[#E7E7E7] tracking-tight tabular-nums">
                      {card.value}
                    </span>
                    <span className="text-[11px] font-mono text-[#E7E7E7]/40">{card.unit}</span>
                  </div>
                </div>

                <div
                  className={`p-2 rounded-lg border ${
                    isAlert
                      ? "bg-[#9D69A3]/15 border-[#9D69A3]/30 text-[#9D69A3]"
                      : "bg-[#517664]/15 border-[#517664]/30 text-[#517664]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Sparkline & Trend */}
              <div className="mt-4 pt-3 border-t border-[#E7E7E7]/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  {card.positive ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#517664]" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#9D69A3]" />
                  )}
                  <span className={card.positive ? "text-[#517664]" : "text-[#9D69A3] font-semibold"}>
                    {card.trend}
                  </span>
                </div>

                {/* Mini Sparkline */}
                <div className="w-20 h-7">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={card.sparkData}>
                      <Area
                        type="monotone"
                        dataKey="val"
                        stroke={card.color}
                        strokeWidth={2}
                        fill={card.color}
                        fillOpacity={0.15}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Area Chart: Store Traffic vs Conversion */}
      <div className="p-6 rounded-xl bg-[#222829] border border-[#E7E7E7]/10 transition-all duration-300 hover:border-[#816E94]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E7E7]/5 pb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#E7E7E7] tracking-wide">
              Store Traffic Velocity vs. Conversion Funnel
            </h2>
            <p className="text-xs text-[#E7E7E7]/50 mt-0.5">
              Live foot traffic count overlaid with checkout conversion rates
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#816E94]" />
              <span className="text-[#E7E7E7]/70">Traffic Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#517664]" />
              <span className="text-[#E7E7E7]/70">Conversion %</span>
            </div>
          </div>
        </div>

        {/* Vintage Lavender (#816E94) to transparent gradient */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={TRAFFIC_CONVERSION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="vintageLavenderGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#816E94" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#816E94" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#517664" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#517664" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E7E7E7" strokeOpacity={0.07} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "rgba(231, 231, 231, 0.4)", fontFamily: "monospace" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "rgba(231, 231, 231, 0.4)", fontFamily: "monospace" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1B2021",
                  borderColor: "rgba(231, 231, 231, 0.15)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#E7E7E7",
                  boxShadow: "0 10px 25px -5px rgba(0,0,0,0.5)",
                }}
              />
              <Area
                type="monotone"
                dataKey="traffic"
                stroke="#816E94"
                strokeWidth={2.5}
                fill="url(#vintageLavenderGrad)"
              />
              <Area
                type="monotone"
                dataKey="conversion"
                stroke="#517664"
                strokeWidth={2}
                fill="url(#tealGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default KPIHud;
