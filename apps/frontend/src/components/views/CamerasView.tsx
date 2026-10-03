import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  Sliders,
  Crosshair,
  User,
  LayoutGrid,
  Maximize2,
  Video,
  Radio,
  Sparkles,
} from "lucide-react";
import { Camera, Alert, Zone } from "../../types";
import { cn, getStatusDot } from "../../lib/utils";

interface CamerasViewProps {
  cameras: Camera[];
  alerts?: Alert[];
  zones?: Zone[];
  onSelectAlert?: (alert: Alert) => void;
}

export function CamerasView({ cameras, alerts = [] }: CamerasViewProps) {
  const [gridLayout, setGridLayout] = useState<1 | 4 | 6>(4);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("00:00:00");
  const [showAiBoxes, setShowAiBoxes] = useState(true);

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

  // Assigned cameras for each grid slot
  const slotCameras = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      return (
        cameras[i] || {
          id: i + 1,
          name: `CAM-0${i + 1}`,
          status: "active" as const,
          map_x: 20 + i * 10,
          map_y: 30 + i * 5,
          facing: 180,
          fov: 60,
          fps: 15,
          latency_ms: 28 + i * 3,
        }
      );
    });
  }, [cameras]);

  const trackedPeople: Record<
    number,
    Array<{ id: string; label: string; confidence: number; x: number; y: number; w: number; h: number }>
  > = {
    0: [{ id: "P-104", label: "Subject #104", confidence: 96, x: 44, y: 32, w: 22, h: 48 }],
    1: [
      { id: "P-209", label: "Subject #209", confidence: 92, x: 26, y: 22, w: 18, h: 44 },
      { id: "P-211", label: "Subject #211", confidence: 89, x: 74, y: 38, w: 18, h: 42 },
    ],
    2: [
      { id: "P-302", label: "Subject #302", confidence: 94, x: 38, y: 20, w: 20, h: 46 },
      { id: "P-305", label: "Subject #305", confidence: 91, x: 48, y: 44, w: 22, h: 46 },
    ],
    3: [
      { id: "P-401", label: "Subject #401", confidence: 97, x: 28, y: 28, w: 22, h: 52 },
      { id: "P-408", label: "Subject #408", confidence: 93, x: 58, y: 24, w: 20, h: 50 },
    ],
  };

  const visibleCameras = useMemo(() => {
    return slotCameras.slice(0, gridLayout);
  }, [slotCameras, gridLayout]);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden space-y-4 animate-fade-up max-w-7xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Live Camera Governors</h1>
          <p className="text-[14px] text-text-secondary">
            {cameras.length} active edge video streams · H.264 / 1080p telemetry governor
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 text-[13px]">
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-border bg-card shadow-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAiBoxes}
              onChange={(e) => setShowAiBoxes(e.target.checked)}
              className="rounded-[4px] border-border text-primary focus:ring-0"
            />
            <span className="text-text-secondary font-medium">Vision Overlays</span>
          </label>

          {/* Grid Layout Switcher Segmented Control */}
          <div className="inline-flex rounded-[8px] border border-border p-0.5 bg-surface-elevated shadow-xs" role="group" aria-label="Camera grid layout">
            <button
              type="button"
              onClick={() => setGridLayout(1)}
              aria-label="1 camera view"
              className={cn(
                "px-3 py-1 rounded-[6px] text-[13px] font-medium transition",
                gridLayout === 1 ? "bg-card shadow-xs text-foreground" : "text-text-tertiary hover:text-foreground"
              )}
            >
              1×1
            </button>
            <button
              type="button"
              onClick={() => setGridLayout(4)}
              aria-label="4 cameras view"
              className={cn(
                "px-3 py-1 rounded-[6px] text-[13px] font-medium transition",
                gridLayout === 4 ? "bg-card shadow-xs text-foreground" : "text-text-tertiary hover:text-foreground"
              )}
            >
              2×2
            </button>
            <button
              type="button"
              onClick={() => setGridLayout(6)}
              aria-label="6 cameras view"
              className={cn(
                "px-3 py-1 rounded-[6px] text-[13px] font-medium transition",
                gridLayout === 6 ? "bg-card shadow-xs text-foreground" : "text-text-tertiary hover:text-foreground"
              )}
            >
              3×2
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause all feeds" : "Play all feeds"}
            className="p-2 rounded-[8px] border border-border bg-card hover:bg-surface-elevated text-foreground transition shadow-xs"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Camera Video Grid (16:9 Containers) */}
      <div
        className={cn(
          "grid gap-4 flex-1 min-h-0 overflow-y-auto pb-4",
          gridLayout === 1 && "grid-cols-1",
          gridLayout === 4 && "grid-cols-1 md:grid-cols-2",
          gridLayout === 6 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {visibleCameras.map((cam, idx) => {
          const status = getStatusDot(cam.status);
          const tracks = trackedPeople[idx] || [];
          const isSelected = selectedSlot === idx;

          return (
            <div
              key={cam.id}
              onClick={() => setSelectedSlot(idx)}
              className={cn(
                "relative rounded-[10px] border overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-card transition-all duration-200 aspect-video",
                isSelected ? "border-primary ring-2 ring-primary/40 shadow-card-hover" : "border-border hover:border-primary/30"
              )}
            >
              {/* CCTV Live View Simulation Canvas */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 flex items-center justify-center">
                {/* Visual perspective lines for retail aisles */}
                <svg className="w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="10" y1="90" x2="40" y2="40" stroke="currentColor" strokeWidth="0.5" />
                  <line x1="90" y1="90" x2="60" y2="40" stroke="currentColor" strokeWidth="0.5" />
                  <line x1="40" y1="40" x2="60" y2="40" stroke="currentColor" strokeWidth="0.5" />
                  <rect x="5" y="10" width="30" height="70" fill="currentColor" fillOpacity="0.05" />
                  <rect x="65" y="10" width="30" height="70" fill="currentColor" fillOpacity="0.05" />
                </svg>

                {/* Bounding boxes with 8px radius label chips */}
                {showAiBoxes &&
                  isPlaying &&
                  tracks.map((p) => (
                    <div
                      key={p.id}
                      className="absolute border-2 border-cyan-400 bg-cyan-400/10 rounded-[6px] transition-all duration-300 pointer-events-none"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.w}%`,
                        height: `${p.h}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-black/85 backdrop-blur-xs px-2 py-0.5 rounded-[8px] text-[11px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-sm border border-cyan-400/30">
                        <Crosshair className="w-3 h-3 text-cyan-400" />
                        <span className="font-semibold">{p.label}</span>
                        <span className="text-zinc-400">({p.confidence}%)</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Overlay: Top Camera Name & Status */}
              <div className="relative z-10 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent text-white">
                <div className="flex items-center gap-2.5">
                  <span className={cn("w-2 h-2 rounded-full", status.dotClass)} aria-hidden="true" />
                  <span className="font-semibold text-[13px] tracking-tight">{cam.name}</span>
                  <span className="text-[12px] text-zinc-300 font-medium">{cam.location || `Zone #${cam.zone_id || "1"}`}</span>
                </div>

                <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-300">
                  <span className="inline-flex items-center gap-1.5 text-red-400 font-semibold">
                    <Radio className="w-3 h-3 animate-pulse-dot" /> LIVE
                  </span>
                  <span>{currentTimeStr}</span>
                </div>
              </div>

              {/* Overlay: Bottom Telemetry Scrim */}
              <div className="relative z-10 p-3 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent text-white text-[11px] font-mono text-zinc-300">
                <span className="font-medium">{cam.fps || 15} FPS · 1080p stream</span>
                <span>{cam.latency_ms || 28} ms latency</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CamerasView;
