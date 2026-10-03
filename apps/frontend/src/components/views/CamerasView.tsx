import React, { useState, useEffect, useMemo } from "react";
import {
  Play,
  Pause,
  Crosshair,
  Maximize2,
  Minimize2,
  Video,
  Radio,
  Sliders,
  Camera as CameraIcon,
  ZoomIn,
  ZoomOut,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Layers,
  Filter,
} from "lucide-react";
import { Camera, Alert, Zone } from "../../types";
import { cn, getStatusDot } from "../../lib/utils";

interface CamerasViewProps {
  cameras: Camera[];
  alerts?: Alert[];
  zones?: Zone[];
  onSelectAlert?: (alert: Alert) => void;
}

// Simulated rich visual scene for each camera viewpoint
function CameraSceneVisual({
  cameraId,
  name,
  location,
}: {
  cameraId: number;
  name: string;
  location: string;
}) {
  const isAisle1 = cameraId === 1;
  const isAisle2 = cameraId === 2;
  const isAisle3 = cameraId === 3;
  const isAisle4 = cameraId === 4;
  const isCheckout = cameraId === 5;
  const isEntrance = cameraId >= 6;

  return (
    <svg
      className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none"
      viewBox="0 0 400 225"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Subtle camera vignette */}
        <radialGradient id={`vignette-${cameraId}`} cx="50%" cy="50%" r="75%">
          <stop offset="60%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
        </radialGradient>

        {/* Floor perspective gradient */}
        <linearGradient id={`floor-${cameraId}`} x1="0%" y1="100%" x2="0%" y2="40%">
          <stop offset="0%" stopColor="#1e2029" />
          <stop offset="100%" stopColor="#0d0e12" />
        </linearGradient>

        {/* Shelf ambient lighting */}
        <linearGradient id={`shelfLight-${cameraId}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2c303f" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#1a1c24" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#2c303f" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Ceiling & Lighting Grid */}
      <rect x="0" y="0" width="400" height="95" fill="#0d0e12" />
      <line x1="80" y1="0" x2="150" y2="95" stroke="#2a2e3d" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="320" y1="0" x2="250" y2="95" stroke="#2a2e3d" strokeWidth="0.8" strokeDasharray="3 3" />
      <line x1="160" y1="15" x2="240" y2="15" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.35" strokeLinecap="round" />
      <line x1="150" y1="35" x2="250" y2="35" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.3" strokeLinecap="round" />

      {/* Polished Retail Floor */}
      <polygon points="0,225 400,225 250,95 150,95" fill={`url(#floor-${cameraId})`} />
      {/* Floor tile grid perspective lines */}
      <line x1="0" y1="225" x2="150" y2="95" stroke="#323648" strokeWidth="0.75" strokeOpacity="0.4" />
      <line x1="400" y1="225" x2="250" y2="95" stroke="#323648" strokeWidth="0.75" strokeOpacity="0.4" />
      <line x1="120" y1="225" x2="175" y2="95" stroke="#323648" strokeWidth="0.5" strokeOpacity="0.25" />
      <line x1="280" y1="225" x2="225" y2="95" stroke="#323648" strokeWidth="0.5" strokeOpacity="0.25" />
      <line x1="200" y1="225" x2="200" y2="95" stroke="#323648" strokeWidth="0.5" strokeOpacity="0.25" />
      <line x1="75" y1="170" x2="325" y2="170" stroke="#323648" strokeWidth="0.5" strokeOpacity="0.25" />
      <line x1="115" y1="130" x2="285" y2="130" stroke="#323648" strokeWidth="0.5" strokeOpacity="0.2" />

      {/* Scene Elements based on Camera Location */}
      {isAisle1 && (
        <g>
          {/* Left Gondola Shelving (Groceries) */}
          <polygon points="0,40 135,95 135,210 0,225" fill="#181a22" stroke="#2f3447" strokeWidth="0.75" />
          {/* Shelves & Product rows */}
          <line x1="0" y1="85" x2="135" y2="120" stroke="#4f46e5" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="0" y1="125" x2="135" y2="150" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="0" y1="165" x2="135" y2="180" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.5" />
          {/* Cereal / Box items */}
          <rect x="25" y="92" width="16" height="24" fill="#ef4444" opacity="0.6" rx="1" />
          <rect x="45" y="95" width="14" height="22" fill="#3b82f6" opacity="0.6" rx="1" />
          <rect x="63" y="98" width="14" height="20" fill="#10b981" opacity="0.6" rx="1" />
          <rect x="81" y="101" width="14" height="18" fill="#f59e0b" opacity="0.6" rx="1" />

          {/* Right Gondola Shelving */}
          <polygon points="400,40 265,95 265,210 400,225" fill="#181a22" stroke="#2f3447" strokeWidth="0.75" />
          <line x1="400" y1="85" x2="265" y2="120" stroke="#4f46e5" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="400" y1="125" x2="265" y2="150" stroke="#10b981" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="400" y1="165" x2="265" y2="180" stroke="#ec4899" strokeWidth="1.2" strokeOpacity="0.5" />
        </g>
      )}

      {isAisle2 && (
        <g>
          {/* Dairy Refrigerated Cooler Wall (Left) */}
          <polygon points="0,30 140,95 140,210 0,225" fill="#141c26" stroke="#0284c7" strokeWidth="0.8" strokeOpacity="0.6" />
          <line x1="30" y1="40" x2="30" y2="225" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
          <line x1="80" y1="65" x2="80" y2="215" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />
          {/* Cold mist ambient glow */}
          <ellipse cx="60" cy="150" rx="50" ry="30" fill="#38bdf8" opacity="0.08" />
          {/* Right shelf */}
          <polygon points="400,30 260,95 260,210 400,225" fill="#161822" stroke="#2f3447" strokeWidth="0.75" />
          <line x1="400" y1="90" x2="260" y2="125" stroke="#10b981" strokeWidth="1.2" strokeOpacity="0.5" />
          <line x1="400" y1="135" x2="260" y2="155" stroke="#f59e0b" strokeWidth="1.2" strokeOpacity="0.5" />
        </g>
      )}

      {isAisle3 && (
        <g>
          {/* Beverage Drink Coolers */}
          <polygon points="0,35 140,95 140,210 0,225" fill="#141a22" stroke="#2563eb" strokeWidth="0.8" strokeOpacity="0.5" />
          <polygon points="400,35 260,95 260,210 400,225" fill="#141a22" stroke="#2563eb" strokeWidth="0.8" strokeOpacity="0.5" />
          {/* Bottle shelves */}
          <line x1="0" y1="90" x2="140" y2="125" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" />
          <line x1="400" y1="90" x2="260" y2="125" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" />
          {/* Center promotional podium */}
          <ellipse cx="200" cy="140" rx="25" ry="8" fill="#1e2230" stroke="#38bdf8" strokeWidth="0.75" />
          <rect x="190" y="115" width="20" height="25" fill="#2563eb" opacity="0.4" rx="2" />
        </g>
      )}

      {isAisle4 && (
        <g>
          {/* High-Risk Cosmetics / Electronics Locked Case */}
          <polygon points="0,40 135,95 135,210 0,225" fill="#1b1724" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.6" />
          <polygon points="400,40 265,95 265,210 400,225" fill="#1b1724" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.6" />
          {/* Glass reflections */}
          <line x1="15" y1="50" x2="60" y2="215" stroke="#c084fc" strokeWidth="1.5" strokeOpacity="0.3" />
          <line x1="385" y1="50" x2="340" y2="215" stroke="#c084fc" strokeWidth="1.5" strokeOpacity="0.3" />
        </g>
      )}

      {isCheckout && (
        <g>
          {/* Checkout Registers & Lanes */}
          <rect x="120" y="110" width="45" height="50" fill="#1e2230" stroke="#3b82f6" strokeWidth="0.8" rx="2" />
          <rect x="235" y="110" width="45" height="50" fill="#1e2230" stroke="#3b82f6" strokeWidth="0.8" rx="2" />
          {/* POS Monitor Screen */}
          <rect x="135" y="95" width="16" height="12" fill="#0284c7" opacity="0.8" rx="1" />
          <rect x="250" y="95" width="16" height="12" fill="#0284c7" opacity="0.8" rx="1" />
          {/* Conveyor belts */}
          <line x1="125" y1="135" x2="160" y2="135" stroke="#64748b" strokeWidth="3" />
          <line x1="240" y1="135" x2="275" y2="135" stroke="#64748b" strokeWidth="3" />
        </g>
      )}

      {isEntrance && (
        <g>
          {/* Automatic Glass Sliding Doors & Turnstiles */}
          <rect x="145" y="50" width="50" height="75" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" rx="2" />
          <rect x="205" y="50" width="50" height="75" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.6" rx="2" />
          {/* Welcome Rug */}
          <polygon points="120,210 280,210 250,150 150,150" fill="#1e1e24" stroke="#475569" strokeWidth="0.8" />
          {/* Dual Anti-theft RFID Sensor Gates */}
          <rect x="110" y="120" width="8" height="60" fill="#0f172a" stroke="#ef4444" strokeWidth="0.8" rx="1" />
          <rect x="282" y="120" width="8" height="60" fill="#0f172a" stroke="#ef4444" strokeWidth="0.8" rx="1" />
        </g>
      )}

      {/* Vignette Overlay */}
      <rect x="0" y="0" width="400" height="225" fill={`url(#vignette-${cameraId})`} />
    </svg>
  );
}

export function CamerasView({ cameras, alerts = [] }: CamerasViewProps) {
  const [gridLayout, setGridLayout] = useState<1 | 4 | 6>(4);
  const [isPlaying, setIsPlaying] = useState(true);
  const [focusCamera, setFocusCamera] = useState<Camera | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("00:00:00");
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [filterZone, setFilterZone] = useState<string>("all");

  // Live timer for CCTV overlay
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setCurrentTimeStr(`${h}:${m}:${s}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const slotCameras = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      return (
        cameras[i] || {
          id: i + 1,
          name: `CAM-0${i + 1}`,
          status: "active" as const,
          location: i === 0 ? "Shelf A - Groceries" : i === 1 ? "Shelf B - Dairy" : i === 2 ? "Shelf C - Beverages" : i === 3 ? "Shelf D - Cosmetics" : i === 4 ? "Checkout Registers" : "Main Entrance",
          map_x: 20 + i * 10,
          map_y: 30 + i * 5,
          facing: 180,
          fov: 60,
          fps: 30,
          latency_ms: 24 + i * 2,
        }
      );
    });
  }, [cameras]);

  const trackedPeople: Record<
    number,
    Array<{ id: string; label: string; confidence: number; x: number; y: number; w: number; h: number; dwell: string }>
  > = {
    0: [{ id: "P-104", label: "Subject #104", confidence: 96, x: 40, y: 36, w: 20, h: 48, dwell: "02:14" }],
    1: [
      { id: "P-209", label: "Subject #209", confidence: 92, x: 26, y: 30, w: 18, h: 44, dwell: "00:45" },
      { id: "P-211", label: "Subject #211", confidence: 89, x: 68, y: 38, w: 18, h: 42, dwell: "01:30" },
    ],
    2: [
      { id: "P-302", label: "Subject #302", confidence: 94, x: 38, y: 32, w: 20, h: 46, dwell: "03:10" },
      { id: "P-305", label: "Subject #305", confidence: 91, x: 55, y: 44, w: 22, h: 46, dwell: "00:55" },
    ],
    3: [
      { id: "P-401", label: "Subject #401", confidence: 97, x: 28, y: 28, w: 22, h: 52, dwell: "04:20" },
      { id: "P-408", label: "Subject #408", confidence: 93, x: 62, y: 34, w: 20, h: 50, dwell: "01:12" },
    ],
  };

  const visibleCameras = useMemo(() => {
    if (focusCamera) {
      return [focusCamera];
    }
    return slotCameras.slice(0, gridLayout);
  }, [focusCamera, slotCameras, gridLayout]);

  return (
    <div className="space-y-5 animate-fade-up max-w-7xl mx-auto pb-8">
      {/* Top Header & Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Live CCTV Surveillance Studio</h1>
            {focusCamera && (
              <span className="px-2.5 py-0.5 rounded-[6px] bg-primary/10 text-primary border border-primary/20 text-[12px] font-semibold">
                Focused: {focusCamera.name}
              </span>
            )}
          </div>
          <p className="text-[14px] text-text-secondary mt-0.5">
            Real-time H.264 multi-camera edge stream governors with neural subject tracking
          </p>
        </div>

        {/* Global Controls & Layout Switcher */}
        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          {focusCamera && (
            <button
              type="button"
              onClick={() => setFocusCamera(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-border bg-card hover:bg-surface-elevated text-[13px] font-semibold text-foreground shadow-xs transition"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Back to Multi-Grid</span>
            </button>
          )}

          <label className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-border bg-card shadow-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAiBoxes}
              onChange={(e) => setShowAiBoxes(e.target.checked)}
              className="rounded-[4px] border-border text-primary focus:ring-0"
            />
            <span className="text-text-secondary font-medium">AI Bounding Boxes</span>
          </label>

          {/* Grid Layout Switcher Segmented Control */}
          {!focusCamera && (
            <div className="inline-flex rounded-[8px] border border-border p-0.5 bg-surface-elevated shadow-xs" role="group" aria-label="Camera grid layout">
              <button
                type="button"
                onClick={() => setGridLayout(1)}
                className={cn(
                  "px-3 py-1 rounded-[6px] text-[13px] font-medium transition",
                  gridLayout === 1 ? "bg-card shadow-xs text-foreground font-semibold" : "text-text-tertiary hover:text-foreground"
                )}
              >
                1×1 Focus
              </button>
              <button
                type="button"
                onClick={() => setGridLayout(4)}
                className={cn(
                  "px-3 py-1 rounded-[6px] text-[13px] font-medium transition",
                  gridLayout === 4 ? "bg-card shadow-xs text-foreground font-semibold" : "text-text-tertiary hover:text-foreground"
                )}
              >
                2×2 Quad
              </button>
              <button
                type="button"
                onClick={() => setGridLayout(6)}
                className={cn(
                  "px-3 py-1 rounded-[6px] text-[13px] font-medium transition",
                  gridLayout === 6 ? "bg-card shadow-xs text-foreground font-semibold" : "text-text-tertiary hover:text-foreground"
                )}
              >
                3×2 Matrix
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause feeds" : "Play feeds"}
            className="p-2 rounded-[8px] border border-border bg-card hover:bg-surface-elevated text-foreground transition shadow-xs"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Stream Presentation Area */}
      <div
        className={cn(
          "grid gap-5",
          focusCamera
            ? "grid-cols-1"
            : gridLayout === 1
            ? "grid-cols-1 max-w-4xl mx-auto"
            : gridLayout === 4
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {visibleCameras.map((cam, idx) => {
          const status = getStatusDot(cam.status);
          const tracks = trackedPeople[idx] || [];
          const isFocused = focusCamera?.id === cam.id;

          return (
            <div
              key={cam.id}
              className={cn(
                "rounded-[10px] border border-border bg-zinc-950 overflow-hidden shadow-card transition-all duration-200 flex flex-col group relative",
                isFocused ? "ring-2 ring-primary shadow-modal" : "hover:border-primary/40 hover:shadow-card-hover"
              )}
            >
              {/* CCTV Feed Top Header Bar */}
              <div className="px-3.5 py-2.5 bg-zinc-900/95 border-b border-zinc-800 text-white flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                  <span className={cn("w-2 h-2 rounded-full", status.dotClass)} aria-hidden="true" />
                  <span className="font-semibold text-[13px] tracking-tight">{cam.name}</span>
                  <span className="text-[12px] text-zinc-400 font-medium hidden sm:inline">
                    {cam.location || `Zone #${cam.zone_id || "1"}`}
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
                  <span className="inline-flex items-center gap-1.5 text-red-400 font-semibold">
                    <Radio className="w-3 h-3 animate-pulse-dot" /> LIVE
                  </span>
                  <span>{currentTimeStr}</span>
                  <button
                    type="button"
                    onClick={() => setFocusCamera(isFocused ? null : cam)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
                    title={isFocused ? "Exit Focus" : "Focus on Camera"}
                  >
                    {isFocused ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Feed Screen Canvas (Aspect Ratio 16:9) */}
              <div className="relative w-full aspect-video bg-zinc-950 overflow-hidden flex items-center justify-center">
                {/* Photorealistic Simulated Retail Environment */}
                <CameraSceneVisual
                  cameraId={cam.id}
                  name={cam.name}
                  location={cam.location || "Store Floor"}
                />

                {/* Subtle Lens Scanline Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/[0.02] to-transparent pointer-events-none" />

                {/* AI Detection Bounding Boxes */}
                {showAiBoxes &&
                  isPlaying &&
                  tracks.map((p) => (
                    <div
                      key={p.id}
                      className="absolute border-2 border-cyan-400 bg-cyan-400/10 rounded-[6px] transition-all duration-300 pointer-events-none shadow-sm"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.w}%`,
                        height: `${p.h}%`,
                      }}
                    >
                      {/* Reticle corners */}
                      <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
                      <span className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
                      <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />

                      {/* Vision Chip Header */}
                      <div className="absolute -top-7 left-0 bg-black/85 backdrop-blur-xs px-2 py-0.5 rounded-[6px] text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-sm border border-cyan-400/40">
                        <Crosshair className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: "8s" }} />
                        <span className="font-semibold">{p.label}</span>
                        <span className="text-zinc-400 font-sans">({p.confidence}%)</span>
                        <span className="text-[10px] text-amber-400 pl-1 border-l border-zinc-700">{p.dwell}</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* CCTV Feed Bottom Telemetry Bar */}
              <div className="px-3.5 py-2 bg-zinc-900/90 border-t border-zinc-800/80 text-white text-[11px] font-mono flex items-center justify-between text-zinc-400">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-300">1080p @ {cam.fps || 30} FPS</span>
                  <span>·</span>
                  <span>H.264 High</span>
                  <span>·</span>
                  <span>3.8 Mb/s</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-300 font-medium">Latency: {cam.latency_ms || 24} ms</span>
                  <span className="text-emerald-400">● 100% Stream Health</span>
                </div>
              </div>

              {/* Focus Studio PTZ & Triage Controls (Visible only in Focus Mode) */}
              {isFocused && (
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-white space-y-3 animate-fade-up">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* PTZ Direction Pad */}
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400">PTZ Gimbal Control:</span>
                      <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-[8px] border border-zinc-700">
                        <button type="button" className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Pan Left">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button type="button" className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Tilt Up">
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button type="button" className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Tilt Down">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button type="button" className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Pan Right">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Optical Zoom Controls */}
                      <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-[8px] border border-zinc-700">
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-4 h-4" />
                        </button>
                        <span className="px-2 text-[12px] font-mono text-zinc-200">{zoomLevel.toFixed(1)}x</span>
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.min(4, z + 0.5))}
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick Operator Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-[8px] bg-primary text-white text-[12px] font-semibold hover:bg-primary-hover transition shadow-xs"
                      >
                        Snapshot Still
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-[8px] border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[12px] font-medium transition"
                      >
                        Record 30s Clip
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-[8px] border border-red-500/40 bg-red-500/10 text-red-400 text-[12px] font-semibold hover:bg-red-500/20 transition"
                      >
                        Flag Security Incident
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CamerasView;
