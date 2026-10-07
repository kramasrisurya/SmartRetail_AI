import React, { useState } from "react";
import { GitBranch, MapPin, ShoppingBag, CreditCard, LogOut, ArrowRight, CheckCircle2 } from "lucide-react";

interface GraphNode {
  id: string;
  type: "entry" | "dwell" | "basket" | "checkout" | "exit";
  label: string;
  zone: string;
  camera: string;
  timestamp: string;
  confidence: number;
}

const JOURNEY_NODES: GraphNode[] = [
  { id: "node-1", type: "entry", label: "Shopper #17 Entrance Gate", zone: "Entrance", camera: "CAM-06", timestamp: "14:00:00 UTC", confidence: 0.98 },
  { id: "node-2", type: "dwell", label: "Shelf A Inspection", zone: "Groceries", camera: "CAM-01", timestamp: "14:00:45 UTC", confidence: 0.95 },
  { id: "node-3", type: "basket", label: "Product B222 Picked", zone: "Beverages", camera: "CAM-03", timestamp: "14:03:30 UTC", confidence: 0.93 },
  { id: "node-4", type: "checkout", label: "Self-Checkout Station", zone: "Checkout", camera: "CAM-05", timestamp: "14:05:05 UTC", confidence: 0.99 },
  { id: "node-5", type: "exit", label: "Store Exit Turnstile", zone: "Exit", camera: "CAM-06", timestamp: "14:05:55 UTC", confidence: 0.97 },
];

export function EventGraphView() {
  const [selectedNode, setSelectedNode] = useState<GraphNode>(JOURNEY_NODES[2]);

  return (
    <div className="space-y-4 font-sans text-zinc-200">
      <div className="border-b border-zinc-800 pb-3">
        <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-cyan-400" />
          Customer Journey & Event Graph Explorer
        </h1>
        <p className="text-xs text-zinc-400">Connected node diagram linking spatial tracks, basket picks, and checkout lifecycle</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Node graph flow canvas */}
        <div className="lg:col-span-2 border border-zinc-800 rounded bg-zinc-900/60 p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
            <span>SUBJECT: Shopper #17 (track_key: 11:4921)</span>
            <span className="text-emerald-400 font-bold">● 5 NODES LINKED</span>
          </div>

          <div className="relative space-y-3 pt-2">
            {JOURNEY_NODES.map((node, index) => {
              const isSelected = selectedNode.id === node.id;
              const isBasket = node.type === "basket";
              const isCheckout = node.type === "checkout";

              return (
                <div key={node.id} className="relative">
                  {index < JOURNEY_NODES.length - 1 && (
                    <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-zinc-700/60 -mb-3 z-0" />
                  )}

                  <div
                    onClick={() => setSelectedNode(node)}
                    className={`relative z-10 flex items-center justify-between p-3 rounded border cursor-pointer transition ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-400 text-white"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${
                        isBasket ? "bg-indigo-900 text-indigo-300 border border-indigo-700" :
                        isCheckout ? "bg-amber-900 text-amber-300 border border-amber-700" :
                        "bg-zinc-800 text-cyan-400 border border-zinc-700"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{node.label}</div>
                        <div className="text-[11px] font-mono text-zinc-500">{node.zone} · {node.camera}</div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className="text-zinc-400 tabular-nums">{node.timestamp}</div>
                      <div className="text-emerald-400 font-bold">[{Math.round(node.confidence * 100)}%]</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Node Telemetry Inspector */}
        <div className="border border-zinc-800 rounded bg-zinc-900/60 p-4 space-y-3 text-xs">
          <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase">NODE TELEMETRY INSPECTOR</span>
          <div className="p-3 bg-zinc-950 rounded border border-zinc-800 space-y-2">
            <div className="flex justify-between font-mono"><span className="text-zinc-500">Node ID:</span><span className="text-white">{selectedNode.id}</span></div>
            <div className="flex justify-between font-mono"><span className="text-zinc-500">Node Type:</span><span className="text-cyan-400 font-bold uppercase">{selectedNode.type}</span></div>
            <div className="flex justify-between font-mono"><span className="text-zinc-500">Sensor:</span><span className="text-zinc-300">{selectedNode.camera}</span></div>
            <div className="flex justify-between font-mono"><span className="text-zinc-500">Zone:</span><span className="text-zinc-300">{selectedNode.zone}</span></div>
            <div className="flex justify-between font-mono"><span className="text-zinc-500">Timestamp:</span><span className="text-zinc-300 tabular-nums">{selectedNode.timestamp}</span></div>
            <div className="flex justify-between font-mono"><span className="text-zinc-500">Confidence:</span><span className="text-emerald-400 font-bold">{Math.round(selectedNode.confidence * 100)}%</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventGraphView;
