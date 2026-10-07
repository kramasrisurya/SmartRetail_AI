import React, { useState } from "react";
import {
  Video,
  Crosshair,
  Maximize2,
  Minimize2,
  Sliders,
  Layers,
  AlertTriangle,
  Radio,
  Eye,
} from "lucide-react";
import { Camera } from "../../types";

interface DetectionBox {
  id: string;
  type: "person" | "cart" | "risk";
  label: string;
  confidence: number;
  x: number; // percentage
  y: number; // percentage
  w: number; // percentage
  h: number; // percentage
}

interface CameraChannel {
  id: number;
  name: string;
  zone: string;
  imageSrc: string;
  fps: number;
  latencyMs: number;
  detections: DetectionBox[];
}

const DEFAULT_CHANNELS: CameraChannel[] = [
  {
    id: 1,
    name: "CAM-01",
    zone: "Packaged Cereals & Groceries",
    imageSrc: "/cameras/store1/cam1.jpg",
    fps: 30,
    latencyMs: 18,
    detections: [
      { id: "P-101", type: "person", label: "Shopper #17", confidence: 98, x: 44, y: 22, w: 14, h: 58 },
    ],
  },
  {
    id: 2,
    name: "CAM-02",
    zone: "Dairy & Chilled Milk Coolers",
    imageSrc: "/cameras/store1/cam2.jpg",
    fps: 30,
    latencyMs: 22,
    detections: [
      { id: "P-104", type: "person", label: "Customer", confidence: 96, x: 38, y: 24, w: 16, h: 60 },
      { id: "C-02", type: "cart", label: "Basket Cart", confidence: 94, x: 55, y: 52, w: 12, h: 20 },
    ],
  },
  {
    id: 3,
    name: "CAM-03",
    zone: "Beverages & High-Dwell Snacks",
    imageSrc: "/cameras/store1/cam3.jpg",
    fps: 30,
    latencyMs: 19,
    detections: [
      { id: "P-109", type: "risk", label: "Concealment Risk", confidence: 94, x: 39, y: 32, w: 15, h: 54 },
    ],
  },
  {
    id: 4,
    name: "CAM-04",
    zone: "High-Value Cosmetics Lockup",
    imageSrc: "/cameras/store1/cam4.jpg",
    fps: 30,
    latencyMs: 24,
    detections: [
      { id: "P-201", type: "person", label: "Customer", confidence: 97, x: 58, y: 45, w: 10, h: 42 },
    ],
  },
  {
    id: 5,
    name: "CAM-05",
    zone: "Front Checkout POS Registers",
    imageSrc: "/cameras/store1/cam5.jpg",
    fps: 30,
    latencyMs: 17,
    detections: [
      { id: "P-301", type: "person", label: "Cashier", confidence: 99, x: 32, y: 34, w: 16, h: 48 },
      { id: "C-09", type: "cart", label: "Active Cart", confidence: 95, x: 52, y: 23, w: 14, h: 52 },
    ],
  },
  {
    id: 6,
    name: "CAM-06",
    zone: "Main Entrance & EAS Pedestals",
    imageSrc: "/cameras/store1/cam6.jpg",
    fps: 30,
    latencyMs: 21,
    detections: [
      { id: "P-401", type: "person", label: "Entering", confidence: 98, x: 48, y: 43, w: 10, h: 36 },
    ],
  },
];

interface CameraMatrixProps {
  cameras?: Camera[];
}

export function CameraMatrix({ cameras }: CameraMatrixProps) {
  const [showOverlays, setShowOverlays] = useState(true);
  const [gridCount, setGridCount] = useState<1 | 4 | 6>(4);
  const [focusedId, setFocusedId] = useState<number | null>(null);

  const displayedChannels = focusedId !== null
    ? DEFAULT_CHANNELS.filter((c) => c.id === focusedId)
    : DEFAULT_CHANNELS.slice(0, gridCount);

  return (
    <div className="space-y-4 font-sans">
      {/* Control Dock */}
      <div className="h-14 px-5 rounded-xl bg-[#222829] border border-[#E7E7E7]/10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#517664] shadow-[0_0_8px_#517664]" />
            <span className="font-mono text-xs font-bold text-[#E7E7E7]">VISION MATRIX</span>
          </div>
          <span className="text-[#E7E7E7]/20">|</span>
          <span className="text-xs text-[#E7E7E7]/50 font-mono hidden sm:inline">6 STREAM FEEDS CONNECTED</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* AI Overlays Toggle */}
          <button
            type="button"
            onClick={() => setShowOverlays(!showOverlays)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-300 ${
              showOverlays
                ? "bg-[#816E94]/20 border border-[#816E94]/60 text-[#E7E7E7] shadow-[0_0_12px_rgba(129,110,148,0.2)]"
                : "bg-[#1B2021] border border-[#E7E7E7]/10 text-[#E7E7E7]/40 hover:text-[#E7E7E7]"
            }`}
          >
            <Crosshair className={`w-3.5 h-3.5 ${showOverlays ? "text-[#816E94]" : "text-[#E7E7E7]/40"}`} />
            <span>AI OVERLAYS</span>
          </button>

          {/* Grid Layout Switcher */}
          {!focusedId && (
            <div className="inline-flex rounded-lg border border-[#E7E7E7]/10 bg-[#1B2021] p-0.5">
              {([1, 4, 6] as const).map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setGridCount(cnt)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all duration-300 ${
                    gridCount === cnt
                      ? "bg-[#517664] text-[#E7E7E7] font-bold shadow-[0_0_10px_rgba(81,118,100,0.3)]"
                      : "text-[#E7E7E7]/40 hover:text-[#E7E7E7]"
                  }`}
                >
                  {cnt}X
                </button>
              ))}
            </div>
          )}

          {focusedId && (
            <button
              type="button"
              onClick={() => setFocusedId(null)}
              className="px-3 py-1.5 rounded-lg bg-[#517664] text-[#E7E7E7] text-xs font-mono font-bold hover:bg-[#5f8974] transition"
            >
              EXIT FOCUS
            </button>
          )}
        </div>
      </div>

      {/* Camera Video Grid with Hover Glow Vintage Lavender */}
      <div
        className={`grid gap-4 ${
          focusedId !== null || gridCount === 1
            ? "grid-cols-1 max-w-5xl mx-auto"
            : gridCount === 4
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {displayedChannels.map((channel) => (
          <div
            key={channel.id}
            className="group relative rounded-xl bg-[#1B2021] border border-[#E7E7E7]/10 overflow-hidden transition-all duration-300 ease-in-out hover:border-[#816E94]/60 hover:shadow-[0_0_25px_-5px_rgba(129,110,148,0.25)] flex flex-col"
          >
            {/* Top Channel Bar */}
            <div className="px-4 py-2.5 bg-[#222829]/90 border-b border-[#E7E7E7]/10 flex items-center justify-between text-xs z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#517664] animate-pulse" />
                <span className="font-mono font-bold text-[#E7E7E7]">{channel.name}</span>
                <span className="text-[#E7E7E7]/40 truncate max-w-[160px]">· {channel.zone}</span>
              </div>

              <button
                type="button"
                onClick={() => setFocusedId(focusedId === channel.id ? null : channel.id)}
                className="p-1 rounded text-[#E7E7E7]/40 hover:text-[#E7E7E7] hover:bg-[#1B2021] transition"
                title="Toggle focus"
              >
                {focusedId === channel.id ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Video Viewport Canvas */}
            <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
              <img
                src={channel.imageSrc}
                alt={channel.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Faint Dark Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

              {/* Floating Telemetry Pill (Top Right) */}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full font-mono text-[11px] text-[#E7E7E7] border border-[#E7E7E7]/10 pointer-events-none flex items-center gap-2 shadow-lg">
                <span className="text-[#517664] font-bold">{channel.fps} FPS</span>
                <span className="text-[#E7E7E7]/20">|</span>
                <span className="text-[#E7E7E7]/60">{channel.latencyMs}ms</span>
              </div>

              {/* AI Bounding Boxes Overlay */}
              {showOverlays &&
                channel.detections.map((box) => {
                  const isRisk = box.type === "risk";
                  const isCart = box.type === "cart";
                  const isPerson = box.type === "person";

                  // Strict color system:
                  // Person: 1px solid Vintage Lavender (#816E94)
                  // Cart: 1px solid Deep Teal (#517664)
                  // Risk: Thick Vivid Lavender (#9D69A3) pulsing
                  const borderColor = isRisk
                    ? "border-2 border-[#9D69A3] shadow-[0_0_15px_#9D69A3] animate-pulse"
                    : isCart
                    ? "border border-[#517664]"
                    : "border border-[#816E94]";

                  const badgeColor = isRisk
                    ? "bg-[#9D69A3] text-black font-bold"
                    : isCart
                    ? "bg-[#517664] text-white"
                    : "bg-[#816E94] text-white";

                  return (
                    <div
                      key={box.id}
                      className={`absolute pointer-events-none transition-all duration-300 ${borderColor}`}
                      style={{
                        left: `${box.x}%`,
                        top: `${box.y}%`,
                        width: `${box.w}%`,
                        height: `${box.h}%`,
                      }}
                    >
                      <div
                        className={`absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[10px] font-mono leading-none whitespace-nowrap shadow-md ${badgeColor}`}
                      >
                        {box.label} [{box.confidence}%]
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Bottom Telemetry Bar */}
            <div className="px-4 py-2 bg-[#1B2021] border-t border-[#E7E7E7]/10 flex items-center justify-between text-[11px] font-mono text-[#E7E7E7]/50">
              <span className="text-[#E7E7E7]/70">YOLOv11 Edge Inference</span>
              <span className="text-[#517664]">● LIVE STREAM</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CameraMatrix;
