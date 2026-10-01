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
  const [isRecording, setIsRecording] = useState(false);
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
    <div className="flex flex-col h-[calc(100vh-6rem)] overflow-hidden space-y-3">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Live Cameras</h1>
          <p className="text-xs text-muted-foreground tabular-nums">
            {cameras.length} connected feeds · 1080p stream governor active
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-border bg-background cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAiBoxes}
              onChange={(e) => setShowAiBoxes(e.target.checked)}
              className="rounded-[3px] border-border text-primary focus:ring-0"
            />
            <span className="text-muted-foreground">Detection Overlays</span>
          </label>

          {/* Grid Layout Switcher */}
          <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/30" role="group" aria-label="Camera grid layout">
            <button
              type="button"
              onClick={() => setGridLayout(1)}
              aria-label="1 camera view"
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition",
                gridLayout === 1 ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              1×1
            </button>
            <button
              type="button"
              onClick={() => setGridLayout(4)}
              aria-label="4 cameras view"
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition",
                gridLayout === 4 ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              2×2
            </button>
            <button
              type="button"
              onClick={() => setGridLayout(6)}
              aria-label="6 cameras view"
              className={cn(
                "px-2 py-1 rounded text-xs font-medium transition",
                gridLayout === 6 ? "bg-background shadow-xs text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              3×2
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause all feeds" : "Play all feeds"}
            className="p-1.5 rounded border border-border bg-background hover:bg-muted text-foreground transition"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Camera Video Grid */}
      <div
        className={cn(
          "grid gap-3 flex-1 min-h-0 overflow-y-auto",
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
                "relative rounded-lg border overflow-hidden bg-zinc-950 flex flex-col justify-between shadow-sm transition-all",
                isSelected ? "border-primary ring-1 ring-primary/40" : "border-border hover:border-border/80"
              )}
              style={{ minHeight: "220px" }}
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

                {/* Bounding boxes */}
                {showAiBoxes &&
                  isPlaying &&
                  tracks.map((p) => (
                    <div
                      key={p.id}
                      className="absolute border border-cyan-400 bg-cyan-400/10 rounded-sm transition-all duration-300"
                      style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        width: `${p.w}%`,
                        height: `${p.h}%`,
                      }}
                    >
                      <div className="absolute -top-5 left-0 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-300 flex items-center gap-1">
                        <Crosshair className="w-2.5 h-2.5" />
                        <span>{p.label}</span>
                        <span className="text-zinc-400">({p.confidence}%)</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Overlay: Top Camera Name & Status */}
              <div className="relative z-10 p-2.5 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent text-white">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", status.dot)} aria-hidden="true" />
                  <span className="font-medium text-xs tracking-tight">{cam.name}</span>
                  <span className="text-[10px] text-zinc-400">{cam.location || `Zone #${cam.zone_id || "1"}`}</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1 text-red-400 font-medium">
                    <Radio className="w-2.5 h-2.5 animate-pulse" /> REC
                  </span>
                  <span>{currentTimeStr}</span>
                </div>
              </div>

              {/* Overlay: Bottom Telemetry */}
              <div className="relative z-10 p-2 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent text-white text-[10px] font-mono text-zinc-400">
                <span>{cam.fps || 15} FPS · 1080p</span>
                <span>{cam.latency_ms || 28} ms</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CamerasView;
