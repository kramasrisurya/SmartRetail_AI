import React, { useMemo } from "react";
import { Package, AlertCircle, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
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
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Shelves & Inventory Health</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 tabular-nums">
            <span>6 shelves monitored</span>
            <span aria-hidden="true">·</span>
            <span>1 misplaced item flagged</span>
            <span aria-hidden="true">·</span>
            <span>1 low stock warning</span>
          </div>
        </div>
      </div>

      {/* Shelves Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SHELVES_DATA.map((shelf, idx) => {
          const isIssue = shelf.status === "discrepancy" || shelf.status === "low_stock";
          return (
            <div
              key={idx}
              className="border border-border rounded-[6px] bg-background p-3.5 space-y-3 text-xs shadow-sm hover:border-border/80 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-xs">{shelf.name}</h3>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {shelf.zone} · {shelf.camera}
                  </div>
                </div>

                <span
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider",
                    shelf.status === "compliant" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                    shelf.status === "discrepancy" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                    shelf.status === "low_stock" && "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  )}
                >
                  {shelf.status.replace("_", " ")}
                </span>
              </div>

              {/* Stock bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Stock Level</span>
                  <span className="font-mono text-foreground font-medium tabular-nums">{shelf.stockLevel}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      shelf.stockLevel > 70 ? "bg-emerald-500" : shelf.stockLevel > 40 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${shelf.stockLevel}%` }}
                  />
                </div>
              </div>

              {/* Planogram SKUs */}
              <div className="text-[11px] text-muted-foreground">
                <span className="block text-[10px] font-medium text-foreground/80 mb-0.5">Assigned SKUs:</span>
                <span className="font-mono">{shelf.skus.join(", ")}</span>
              </div>

              {shelf.misplaced && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Misplaced: {shelf.misplaced}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Safety & Store Anomaly Stream */}
      <section className="space-y-3 pt-2">
        <h2 className="text-sm font-semibold text-foreground">Safety & Operational Anomalies</h2>

        {safetyEvents.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Zero Safety Anomalies"
            description="No aisle spills, trip hazards, or stock misplacements recorded in recent frames."
          />
        ) : (
          <div className="border border-border rounded-[6px] overflow-hidden bg-background shadow-sm">
            <table className="w-full text-left text-xs" aria-label="Safety events table">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th scope="col" className="px-3 py-1 font-medium">Anomaly Type</th>
                  <th scope="col" className="px-3 py-1 font-medium">Camera</th>
                  <th scope="col" className="px-3 py-1 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {safetyEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 font-medium text-foreground capitalize">
                      {ev.event_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground font-mono">
                      {ev.camera_id ? `CAM-0${ev.camera_id}` : "Sensor System"}
                    </td>
                    <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                      {formatTimeAgo(ev.event_timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default InventoryView;
