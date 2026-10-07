import React, { useState } from "react";
import { ShieldAlert, CheckCircle, Archive, AlertTriangle, Eye, ShoppingCart } from "lucide-react";
import { toast } from "../../store/useToastStore";

interface DiscrepancyItem {
  id: string;
  sku: string;
  productName: string;
  stationId: string;
  timestamp: string;
  confidence: number;
  pickupCam: string;
  registerCam: string;
  status: "pending" | "flagged" | "dismissed" | "archived";
}

const SAMPLE_INCIDENTS: DiscrepancyItem[] = [
  { id: "DISC-902", sku: "SKU-B222", productName: "Premium Scotch Whiskey 750ml", stationId: "REG-04", timestamp: "14:05:15 UTC", confidence: 0.94, pickupCam: "/cameras/store1/cam3.jpg", registerCam: "/cameras/store1/cam5.jpg", status: "pending" },
  { id: "DISC-904", sku: "SKU-A123", productName: "Organic Cold Pressed Olive Oil", stationId: "REG-02", timestamp: "13:42:10 UTC", confidence: 0.88, pickupCam: "/cameras/store1/cam1.jpg", registerCam: "/cameras/store1/cam5.jpg", status: "pending" },
];

export function RiskPosView() {
  const [incidents, setIncidents] = useState<DiscrepancyItem[]>(SAMPLE_INCIDENTS);
  const [activeId, setActiveId] = useState<string>("DISC-902");

  const current = incidents.find((i) => i.id === activeId) || incidents[0];

  const updateStatus = (id: string, nextStatus: DiscrepancyItem["status"], msg: string) => {
    setIncidents((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)));
    toast.success(msg);
  };

  return (
    <div className="space-y-4 font-sans text-zinc-200">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            POS Discrepancy & Barcode Reconciliation Console
          </h1>
          <p className="text-xs text-zinc-400">Side-by-side computer vision verification vs point-of-sale barcode logs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Incident Queue List */}
        <div className="border border-zinc-800 rounded bg-zinc-900/60 p-3 space-y-2">
          <span className="text-[11px] font-mono font-bold text-zinc-400 uppercase">Unresolved Scans</span>
          {incidents.map((inc) => (
            <div
              key={inc.id}
              onClick={() => setActiveId(inc.id)}
              className={`p-2.5 rounded border cursor-pointer transition ${
                activeId === inc.id ? "bg-rose-950/40 border-rose-500 text-white" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-rose-400 font-bold">{inc.id}</span>
                <span className="text-rose-300 font-bold tabular-nums">[{Math.round(inc.confidence * 100)}% CONF]</span>
              </div>
              <div className="text-xs font-semibold mt-1 truncate">{inc.productName}</div>
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                <span>{inc.stationId}</span>
                <span>{inc.timestamp}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Side-by-side Evidence Split View */}
        {current && (
          <div className="lg:col-span-2 border border-zinc-800 rounded bg-zinc-900/60 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="font-mono text-sm font-bold text-white">{current.id} · {current.productName} ({current.sku})</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => updateStatus(current.id, "dismissed", `Incident ${current.id} dismissed as false positive`)}
                  className="px-2.5 py-1 rounded text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300"
                >
                  Dismiss Alert
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(current.id, "flagged", `Incident ${current.id} escalated to Store Manager`)}
                  className="px-2.5 py-1 rounded text-xs bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200"
                >
                  Flag for Manager
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(current.id, "archived", `Incident ${current.id} archived for LP audit`)}
                  className="px-2.5 py-1 rounded text-xs bg-rose-900 hover:bg-rose-800 text-white font-semibold"
                >
                  Archive Incident
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-cyan-400">SHELF PICKUP CROP (CAM-03)</span>
                <div className="aspect-video bg-black rounded border border-zinc-800 overflow-hidden relative">
                  <img src={current.pickupCam} alt="Shelf Pickup" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-black/70 px-1.5 py-0.5 rounded font-mono text-[10px] text-emerald-400 border border-emerald-500/40">PICKUP DETECTED</div>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-rose-400">REGISTER SCAN EVENT (CAM-05 · {current.stationId})</span>
                <div className="aspect-video bg-black rounded border border-zinc-800 overflow-hidden relative">
                  <img src={current.registerCam} alt="Register Scan" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-black/70 px-1.5 py-0.5 rounded font-mono text-[10px] text-rose-400 border border-rose-500/40">NO BARCODE MATCH</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RiskPosView;
