import React from "react";
import { EventItem } from "../../types";
import { cn, formatTimeAgo, getStatusDot } from "../../lib/utils";

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
  const safetyEvents = events.filter((e) =>
    /fall|restricted|abandoned|congestion|misplaced|mismatch|sweep|replenish/.test(
      e.event_type
    )
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Shelves & inventory</h1>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 tabular-nums">
            <span>6 shelves monitored</span>
            <span>·</span>
            <span>1 misplaced item flagged</span>
            <span>·</span>
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
              className="border border-border rounded-[6px] bg-background p-3.5 space-y-3 text-xs"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-foreground">{shelf.name}</h3>
                  <span className="text-[11px] text-muted-foreground">{shelf.camera} · {shelf.zone}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isIssue ? "bg-amber-500" : "bg-emerald-500"
                    )}
                  />
                  <span>{shelf.status === "compliant" ? "Compliant" : shelf.status === "low_stock" ? "Low stock" : "Discrepancy"}</span>
                </span>
              </div>

              {/* Stock level bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono tabular-nums">
                  <span>Stock capacity</span>
                  <span>{shelf.stockLevel}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      shelf.stockLevel < 50 ? "bg-amber-500" : "bg-foreground"
                    )}
                    style={{ width: `${shelf.stockLevel}%` }}
                  />
                </div>
              </div>

              {shelf.misplaced && (
                <div className="p-2 rounded-[4px] bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                  Misplaced: {shelf.misplaced}
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                <span className="truncate max-w-[160px]">{shelf.skus.join(", ")}</span>
                <span className="font-mono">{shelf.lastAudit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety & Compliance Feed */}
      {safetyEvents.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-sm font-semibold text-foreground">Safety and floor incidents</h2>
          <div className="border border-border rounded-[6px] overflow-hidden bg-background">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                <tr className="h-8">
                  <th className="px-3 py-1 font-medium">Incident type</th>
                  <th className="px-3 py-1 font-medium">Details</th>
                  <th className="px-3 py-1 font-medium w-28 text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {safetyEvents.slice(0, 5).map((ev) => (
                  <tr key={ev.id} className="h-8 hover:bg-muted/40 transition-colors">
                    <td className="px-3 py-1 font-medium text-foreground">
                      {ev.event_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-1 text-muted-foreground truncate">
                      {JSON.stringify(ev.payload)}
                    </td>
                    <td className="px-3 py-1 text-muted-foreground font-mono text-right whitespace-nowrap">
                      {formatTimeAgo(ev.event_timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default InventoryView;
