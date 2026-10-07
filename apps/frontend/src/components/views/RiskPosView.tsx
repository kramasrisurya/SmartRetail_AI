import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Check, Eye, AlertCircle, ShoppingCart } from "lucide-react";
import { toast } from "../../store/useToastStore";

interface PosIncident {
  id: string;
  sku: string;
  productName: string;
  stationId: string;
  timestamp: string;
  confidence: number;
  type: "discrepancy" | "normal";
  status: "open" | "acknowledged" | "resolved";
  details: string;
  cameraEvidence: string;
}

const INITIAL_INCIDENTS: PosIncident[] = [
  {
    id: "INC-882",
    sku: "SKU-B222",
    productName: "Premium Highland Single Malt 750ml",
    stationId: "REG-04",
    timestamp: "14:05:15 UTC",
    confidence: 0.94,
    type: "discrepancy",
    status: "open",
    details: "Missed Scan: Customer removed item from cart without matching register barcode event.",
    cameraEvidence: "/cameras/store1/cam3.jpg",
  },
  {
    id: "INC-880",
    sku: "SKU-A109",
    productName: "Luxury Anti-Aging Serum 50ml",
    stationId: "REG-02",
    timestamp: "13:50:22 UTC",
    confidence: 0.89,
    type: "discrepancy",
    status: "open",
    details: "Concealment Alert: Product placed in coat pocket prior to passing checkout register scanner.",
    cameraEvidence: "/cameras/store1/cam4.jpg",
  },
  {
    id: "INC-878",
    sku: "SKU-C440",
    productName: "Organic Cold Brew Coffee 12oz",
    stationId: "REG-01",
    timestamp: "13:42:10 UTC",
    confidence: 0.98,
    type: "normal",
    status: "resolved",
    details: "Barcode Scanned: Verified purchase at self-checkout terminal.",
    cameraEvidence: "/cameras/store1/cam5.jpg",
  },
];

export function RiskPosView() {
  const [incidents, setIncidents] = useState<PosIncident[]>(INITIAL_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState<PosIncident | null>(INITIAL_INCIDENTS[0]);

  const handleAcknowledge = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: "acknowledged" } : inc))
    );
    toast.info(`Incident ${id} acknowledged by operator`);
  };

  const handleReview = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: "resolved" } : inc))
    );
    toast.success(`Incident ${id} reviewed and closed`);
  };

  const activeDiscrepancies = incidents.filter(
    (i) => i.type === "discrepancy" && i.status !== "resolved"
  );

  return (
    <div className="space-y-5 font-sans text-[#E7E7E7]">
      {/* View Header */}
      <div className="flex items-center justify-between border-b border-[#E7E7E7]/10 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#E7E7E7] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#9D69A3]" />
            POS Discrepancy & Risk Console
          </h1>
          <p className="text-xs text-[#E7E7E7]/50">
            Reconciliation timeline of camera pickup telemetry vs physical register barcode scans
          </p>
        </div>

        <div className="font-mono text-xs text-[#E7E7E7]/50 flex items-center gap-2">
          <span>QUEUE:</span>
          <span className="font-bold text-[#9D69A3]">{activeDiscrepancies.length} PENDING AUDIT</span>
        </div>
      </div>

      {activeDiscrepancies.length === 0 ? (
        /* Empty State with large centered Deep Teal icon */
        <div className="py-24 flex flex-col items-center justify-center text-center p-8 rounded-xl bg-[#222829] border border-[#E7E7E7]/10">
          <div className="w-16 h-16 rounded-2xl bg-[#517664]/20 border border-[#517664]/40 flex items-center justify-center text-[#517664] mb-4 shadow-[0_0_30px_rgba(81,118,100,0.3)]">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-[#E7E7E7] tracking-tight">
            All systems clear. No discrepancies detected.
          </h3>
          <p className="text-xs text-[#E7E7E7]/40 max-w-sm mt-1">
            Real-time computer vision inference is continuously cross-referencing shopping carts against register scans.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Incident Timeline Feed */}
          <div className="space-y-3 lg:col-span-2">
            {incidents.map((inc) => {
              const isDiscrepancy = inc.type === "discrepancy";
              const isResolved = inc.status === "resolved";

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-xl transition-all duration-300 ease-in-out cursor-pointer hover:-translate-y-0.5 ${
                    isDiscrepancy && !isResolved
                      ? "bg-[#222829] border-l-4 border-l-[#9D69A3] border-y border-r border-[#E7E7E7]/10 shadow-[0_4px_20px_-5px_rgba(157,105,163,0.15)] hover:border-r-[#816E94]/40"
                      : "bg-[#222829]/60 border border-[#517664]/40 opacity-80"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E7E7]/5 pb-2.5">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className={isDiscrepancy && !isResolved ? "text-[#9D69A3] font-bold" : "text-[#517664]"}>
                        {inc.id}
                      </span>
                      <span className="text-[#E7E7E7]/30">|</span>
                      <span className="text-[#E7E7E7]/60">{inc.stationId}</span>
                      <span className="text-[#E7E7E7]/30">|</span>
                      <span className="text-[#E7E7E7]/40 tabular-nums">{inc.timestamp}</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isDiscrepancy && !isResolved
                          ? "bg-[#9D69A3]/20 text-[#9D69A3] border border-[#9D69A3]/40"
                          : "bg-[#517664]/20 text-[#517664] border border-[#517664]/30"
                      }`}
                    >
                      {Math.round(inc.confidence * 100)}% CONFIDENCE
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-[#E7E7E7]">{inc.productName}</h4>
                      <p className="text-xs text-[#E7E7E7]/60 mt-0.5 leading-relaxed">{inc.details}</p>
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="mt-3.5 pt-2.5 border-t border-[#E7E7E7]/5 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-[#816E94]">{inc.sku}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcknowledge(inc.id);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs text-[#E7E7E7] hover:bg-[#1B2021] border border-transparent hover:border-[#E7E7E7]/20 transition-all duration-300 ease-in-out"
                      >
                        Acknowledge
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReview(inc.id);
                        }}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#517664] text-[#E7E7E7] hover:bg-[#628d78] transition-all duration-300 ease-in-out shadow-[0_0_12px_rgba(81,118,100,0.3)]"
                      >
                        Review Incident
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Evidence Inspector Side Panel */}
          {selectedIncident && (
            <div className="p-5 rounded-xl bg-[#222829] border border-[#E7E7E7]/10 space-y-4 h-fit">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#816E94] block">
                SURVEILLANCE EVIDENCE CROP
              </span>

              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-[#E7E7E7]/10 relative">
                <img
                  src={selectedIncident.cameraEvidence}
                  alt={selectedIncident.productName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded font-mono text-[10px] text-[#9D69A3] border border-[#9D69A3]/30">
                  SHELF PICKUP INTERACTION
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-[#E7E7E7]/5">
                  <span className="text-[#E7E7E7]/40">Incident ID:</span>
                  <span className="text-[#E7E7E7]">{selectedIncident.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E7E7E7]/5">
                  <span className="text-[#E7E7E7]/40">Product SKU:</span>
                  <span className="text-[#816E94]">{selectedIncident.sku}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#E7E7E7]/5">
                  <span className="text-[#E7E7E7]/40">Register Lane:</span>
                  <span className="text-[#E7E7E7]">{selectedIncident.stationId}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#E7E7E7]/40">Reconciliation:</span>
                  <span className="text-[#9D69A3] font-bold">Unmatched</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RiskPosView;
