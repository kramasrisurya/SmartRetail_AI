import React, { useMemo } from "react";
import { Package, AlertCircle, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { EventItem } from "../../types";
import { cn, formatTimeAgo } from "../../lib/utils";
import { EmptyState } from "../common/EmptyState";

interface InventoryViewProps {
  events: EventItem[];
}

const SHELVES_DATA = [
  {
    name: "Aisle 1 - Groceries",
    zone: "Shelf A",
    camera: "CAM-01",
    stockLevel: 82,
    skus: ["Coffee beans", "Cereal 500g"],
    status: "compliant",
    lastAudit: "12 min ago",
  },
  {
    name: "Aisle 2 - Dairy",
    zone: "Shelf B",
    camera: "CAM-02",
    stockLevel: 64,
    skus: ["Milk 1L", "White bread"],
    status: "discrepancy",
    misplaced: "Coffee beans deposited here",
    lastAudit: "4 min ago",
  },
  {
    name: "Aisle 3 - Beverages",
    zone: "Shelf C",
    camera: "CAM-03",
    stockLevel: 91,
    skus: ["Energy drink", "Bottled water"],
    status: "compliant",
    lastAudit: "18 min ago",
  },
  {
    name: "Aisle 4 - Snacks",
    zone: "Shelf D",
    camera: "CAM-04",
    stockLevel: 48,
    skus: ["Chocolate bar"],
    status: "low_stock",
    lastAudit: "7 min ago",
  },
  {
    name: "Aisle 5 - Household",
    zone: "Shelf E",
    camera: "CAM-05",
    stockLevel: 75,
    skus: ["Laundry detergent"],
    status: "compliant",
    lastAudit: "25 min ago",
  },
  {
    name: "Aisle 6 - Health & beauty",
    zone: "Shelf F",
    camera: "CAM-06",
    stockLevel: 58,
    skus: ["Toothpaste", "Shampoo"],
    status: "discrepancy",
    lastAudit: "2 min ago",
  },
];

export function InventoryView({ events }: InventoryViewProps) {
  const safetyEvents = useMemo(() => {
    return events.filter((e) =>
      /fall|restricted|abandoned|congestion|misplaced|mismatch|sweep|replenish/.test(
        e.event_type
      )
    );
  }, [events]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Shelves & Planogram Intelligence</h1>
          <p className="text-[14px] text-text-secondary">
            Automated shelf replenishment monitoring, misplaced SKU detection, and safety hazards
          </p>
        </div>

        <div className="flex items-center gap-3 text-[13px] text-text-secondary tabular-nums">
          <span className="px-3 py-1 rounded-[8px] border border-border bg-card shadow-xs font-medium text-foreground">
            6 Shelves Monitored
          </span>
          <span className="px-3 py-1 rounded-[8px] border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
            1 Misplaced Item
          </span>
          <span className="px-3 py-1 rounded-[8px] border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400 font-medium">
            1 Low Stock
          </span>
        </div>
      </div>

      {/* Shelves Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SHELVES_DATA.map((shelf, idx) => {
          return (
            <div
              key={idx}
              className="border border-border rounded-[10px] bg-card p-5 space-y-4 shadow-card hover:shadow-card-hover hover:border-primary/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground text-[15px] tracking-tight">{shelf.name}</h3>
                  <div className="text-[12px] text-text-tertiary font-mono mt-0.5">
                    {shelf.zone} · {shelf.camera}
                  </div>
                </div>

                <span
                  className={cn(
                    "px-2.5 py-1 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.04em]",
                    shelf.status === "compliant" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                    shelf.status === "discrepancy" && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
                    shelf.status === "low_stock" && "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  )}
                >
                  {shelf.status.replace("_", " ")}
                </span>
              </div>

              {/* Stock Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px] text-text-secondary font-medium">
                  <span>Stock Level</span>
                  <span className="font-mono text-foreground font-semibold tabular-nums">{shelf.stockLevel}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden border border-border/40">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      shelf.stockLevel > 70 ? "bg-emerald-500" : shelf.stockLevel > 40 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${shelf.stockLevel}%` }}
                  />
                </div>
              </div>

              {/* Planogram SKUs */}
              <div className="text-[13px] text-text-secondary">
                <span className="block text-[11px] font-semibold text-text-tertiary uppercase tracking-[0.04em] mb-1">Assigned SKUs:</span>
                <span className="font-mono font-medium text-foreground">{shelf.skus.join(", ")}</span>
              </div>

              {shelf.misplaced && (
                <div className="p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/20 text-[12px] text-amber-700 dark:text-amber-400 flex items-center gap-2 font-medium shadow-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Misplaced: {shelf.misplaced}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Safety & Store Anomaly Stream */}
      <section className="space-y-4 pt-2">
        <h2 className="text-[16px] font-semibold text-foreground tracking-tight">Safety & Operational Anomalies</h2>

        {safetyEvents.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Zero Safety Anomalies"
            description="No aisle spills, trip hazards, or stock misplacements recorded in recent frames."
          />
        ) : (
          <div className="border border-border rounded-[10px] overflow-hidden bg-card shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[14px]" aria-label="Safety events table">
                <thead className="bg-surface-elevated/60 border-b border-border text-text-tertiary font-semibold text-[12px] uppercase tracking-[0.04em]">
                  <tr className="h-10">
                    <th scope="col" className="px-4 py-2 font-semibold">Anomaly Type</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Camera Node</th>
                    <th scope="col" className="px-4 py-2 font-semibold text-right">Logged Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {safetyEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-primary/[0.03] transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground capitalize text-[14px]">
                        {ev.event_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-text-secondary font-mono text-[13px]">
                        {ev.camera_id ? `CAM-0${ev.camera_id}` : "Sensor System"}
                      </td>
                      <td className="px-4 py-3 text-right text-text-tertiary tabular-nums text-[13px]">
                        {formatTimeAgo(ev.event_timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default InventoryView;
