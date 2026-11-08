import React, { useState } from "react";
import { ShieldCheck, ShieldAlert, Check, Eye, AlertCircle, ShoppingCart, Zap, Download, RefreshCw } from "lucide-react";
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

const playAlertBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {}
};

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

  const handleSimulateSweethearting = () => {
    playAlertBeep();
    const newInc: PosIncident = {
      id: `INC-${Math.floor(890 + Math.random() * 100)}`,
      sku: "SKU-SH778",
      productName: "Wireless Noise-Cancelling Headphones Pro",
      stationId: "REG-03",
      timestamp: new Date().toLocaleTimeString() + " UTC",
      confidence: 0.97,
      type: "discrepancy",
      status: "open",
      details: "Sweethearting Pattern: Cashier passed retail box below scanner plane directly into bagging area.",
      cameraEvidence: "/cameras/store1/cam2.jpg",
    };
    setIncidents((prev) => [newInc, ...prev]);
    setSelectedIncident(newInc);
    toast.error(`Sweethearting Anomaly Detected on REG-03 (97% Confidence)`);
  };

  const handleSimulateMissedScan = () => {
    playAlertBeep();
    const newInc: PosIncident = {
      id: `INC-${Math.floor(990 + Math.random() * 100)}`,
      sku: "SKU-MS104",
      productName: "Organic Extra Virgin Olive Oil 1L",
      stationId: "REG-01",
      timestamp: new Date().toLocaleTimeString() + " UTC",
      confidence: 0.92,
      type: "discrepancy",
      status: "open",
      details: "Unscanned Transfer: Item transferred from cart into personal tote bag at self-checkout.",
      cameraEvidence: "/cameras/store1/cam1.jpg",
    };
    setIncidents((prev) => [newInc, ...prev]);
    setSelectedIncident(newInc);
    toast.warning(`Unmatched Basket Scan on REG-01 (92% Confidence)`);
  };

  const exportAuditCSV = () => {
    const headers = "Incident ID,SKU,Product Name,Station,Timestamp,Confidence,Type,Status,Details\n";
    const rows = incidents
      .map(
        (i) =>
          `"${i.id}","${i.sku}","${i.productName}","${i.stationId}","${i.timestamp}","${Math.round(
            i.confidence * 100
          )}%","${i.type}","${i.status}","${i.details.replace(/"/g, '""')}"`
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `POS_Risk_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("POS Audit Log exported to CSV");
  };

  const activeDiscrepancies = incidents.filter(
    (i) => i.type === "discrepancy" && i.status !== "resolved"
  );

  return (
    <div className="space-y-5 font-sans text-[#E7E7E7]">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#E7E7E7]/10 pb-3 gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#E7E7E7] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#9D69A3]" />
            POS Discrepancy & Risk Console
          </h1>
          <p className="text-xs text-[#E7E7E7]/50">
            Reconciliation timeline of camera pickup telemetry vs physical register barcode scans
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSimulateSweethearting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#9D69A3]/20 text-[#9D69A3] border border-[#9D69A3]/40 hover:bg-[#9D69A3]/30 transition-all shadow-[0_0_12px_rgba(157,105,163,0.2)]"
          >
            <Zap className="w-3.5 h-3.5" />
            Simulate Sweethearting
          </button>
          <button
            type="button"
            onClick={handleSimulateMissedScan}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#816E94]/20 text-[#816E94] border border-[#816E94]/40 hover:bg-[#816E94]/30 transition-all"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Simulate Missed Scan
          </button>
          <button
            type="button"
            onClick={exportAuditCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#222829] text-[#E7E7E7]/80 border border-[#E7E7E7]/15 hover:bg-[#1B2021] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <div className="font-mono text-xs text-[#E7E7E7]/50 flex items-center gap-1 pl-2 border-l border-[#E7E7E7]/10">
            <span className="font-bold text-[#9D69A3]">{activeDiscrepancies.length} PENDING</span>
          </div>
        </div>
      </div>

      {activeDiscrepancies.length === 0 ? (
        /* Empty State */
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
          <button
            type="button"
            onClick={handleSimulateSweethearting}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-[#9D69A3] text-white hover:bg-[#8a5590] transition-all"
          >
            Trigger Test Discrepancy
          </button>
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
                    selectedIncident?.id === inc.id
                      ? "ring-2 ring-[#9D69A3]/60 bg-[#222829]"
                      : ""
                  } ${
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
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#816E94] block">
                  SURVEILLANCE EVIDENCE CROP
                </span>
                <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  YOLOv11 Inference Active
                </span>
              </div>

              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-[#E7E7E7]/10 relative">
                <img
                  src={selectedIncident.cameraEvidence}
                  alt={selectedIncident.productName}
                  className="w-full h-full object-cover"
                />
                {/* Real-time Bounding Box Simulation */}
                <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-[#9D69A3] bg-[#9D69A3]/10 rounded flex items-start justify-between p-1.5 animate-pulse">
                  <span className="bg-[#9D69A3] text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-bold">
                    UNSCANNED ITEM ({Math.round(selectedIncident.confidence * 100)}%)
                  </span>
                  <span className="text-[9px] font-mono text-[#E7E7E7]/80 bg-black/60 px-1 rounded">
                    FOV: 74°
                  </span>
                </div>
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
                  <span className="text-[#9D69A3] font-bold">Unmatched Telemetry</span>
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
