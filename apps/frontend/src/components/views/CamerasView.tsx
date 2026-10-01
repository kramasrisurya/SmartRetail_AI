import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Square,
  Circle,
  ChevronRight,
  ChevronDown,
  User,
  Crosshair,
  Sliders,
} from "lucide-react";
import { Camera, Alert, Zone } from "../../types";
import { cn, getStatusDot } from "../../lib/utils";

interface CamerasViewProps {
  cameras: Camera[];
  alerts?: Alert[];
  zones?: Zone[];
  onSelectAlert?: (alert: Alert) => void;
}

export function CamerasView({ cameras, alerts = [], zones = [] }: CamerasViewProps) {
  const [gridLayout, setGridLayout] = useState<1 | 4 | 6>(4);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("03:12:18");
  const [resolutionMap, setResolutionMap] = useState<Record<number, "1080p" | "720p">>({
    0: "1080p",
    1: "1080p",
    2: "1080p",
    3: "1080p",
  });
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [activeCameraId, setActiveCameraId] = useState<number>(cameras[0]?.id || 1);

  // Live timer for CCTV overlay
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const s = String(now.getSeconds()).padStart(2, "0");
      setCurrentTimeStr(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Assigned cameras for each grid slot
  const slotCameras = [
    cameras[0] || { id: 1, name: "Front entrance", status: "active", fps: 24, latency_ms: 28 },
    cameras[1] || { id: 2, name: "Self-checkout 1", status: "active", fps: 25, latency_ms: 32 },
    cameras[3] || { id: 4, name: "Aisle 3 - Snacks", status: "active", fps: 22, latency_ms: 30 },
    cameras[4] || { id: 5, name: "Aisle 7 - Health", status: "active", fps: 24, latency_ms: 35 },
    cameras[5] || { id: 6, name: "Back storage exit", status: "degraded", fps: 8, latency_ms: 110 },
    cameras[2] || { id: 3, name: "Main corridor", status: "active", fps: 24, latency_ms: 29 },
  ];

  // Tracked subjects with clean bounding boxes (no neon glow)
  const trackedPeople: Record<number, Array<{ id: string; label: string; confidence: number; x: number; y: number; w: number; h: number }>> = {
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

  const toggleResolution = (slotIdx: number, res: "1080p" | "720p") => {
    setResolutionMap((prev) => ({ ...prev, [slotIdx]: res }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3 mb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Live cameras</h1>
          <p className="text-xs text-muted-foreground">
            {cameras.length} connected feeds · 1080p streams
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-border bg-background cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAiBoxes}
              onChange={(e) => setShowAiBoxes(e.target.checked)}
              className="rounded-[3px] border-border text-foreground focus:ring-0"
            />
            <span className="text-muted-foreground">Detection boxes</span>
          </label>

          {/* Grid Presets: 1, 4, 6 */}
          <div className="flex items-center rounded-[4px] border border-border bg-background p-0.5">
            {([1, 4, 6] as const).map((count) => (
              <button
                key={count}
                onClick={() => setGridLayout(count)}
                className={cn(
                  "px-2 py-0.5 rounded-[3px] font-mono text-xs transition",
                  gridLayout === count
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title={`${count} camera layout`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Workspace: Left Inspection Panel + Camera Matrix Grid */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Left Control Column */}
        <div className="w-64 border border-border rounded-[6px] bg-background p-3 flex flex-col justify-between overflow-y-auto shrink-0 select-none">
          <div className="space-y-4">
            {/* 1. Target Profile Card */}
            <div className="space-y-2 border-b border-border pb-3">
              <span className="text-[11px] font-medium text-muted-foreground block">
                Inspected target
              </span>
              <div className="flex items-start gap-2.5">
                <div className="w-12 h-14 rounded-[4px] border border-border bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
                  <User className="w-6 h-6 opacity-60" />
                </div>
                <div className="min-w-0 space-y-0.5 text-xs">
                  <div className="font-medium text-foreground truncate">Shopper #104</div>
                  <div className="text-[11px] text-muted-foreground truncate">Checkout passage</div>
                  <div className="text-[11px] font-mono tabular-nums text-muted-foreground">
                    Dwell: <strong className="text-foreground">05:20</strong>
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-amber-600 dark:text-amber-400 font-medium">
                    Risk score: 88%
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Playback Bar */}
            <div className="space-y-2 border-b border-border pb-3">
              <span className="text-[11px] font-medium text-muted-foreground block">Playback</span>
              <div className="flex items-center justify-between p-1 rounded-[4px] border border-border bg-muted/20 text-xs">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded hover:bg-muted text-foreground transition"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsPlaying(false)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
                  title="Stop"
                >
                  <Square className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsRecording(!isRecording)}
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition",
                    isRecording ? "bg-red-500/10 text-red-600 dark:text-red-400" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Record feed"
                >
                  <Circle className={cn("w-2.5 h-2.5 fill-current", isRecording && "text-red-600")} />
                  <span>REC</span>
                </button>
                <span className="text-[11px] font-mono text-muted-foreground tabular-nums">1.0x</span>
              </div>
            </div>

            {/* 3. Camera List */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground block">Cameras</span>
              <div className="space-y-0.5">
                {cameras.map((cam) => {
                  const status = getStatusDot(cam.status);
                  const isSelected = activeCameraId === cam.id;
                  return (
                    <button
                      key={cam.id}
                      onClick={() => setActiveCameraId(cam.id)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-[4px] text-xs flex items-center justify-between transition",
                        isSelected
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.dotClass)} />
                        <span className="truncate">{cam.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                        {cam.fps || 24}fps
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border text-[11px] font-mono text-muted-foreground">
            Session: {currentTimeStr} GMT
          </div>
        </div>

        {/* Right Camera Matrix Feeds */}
        <div className="flex-1 overflow-y-auto">
          <div
            className={cn(
              "grid gap-2.5",
              gridLayout === 1
                ? "grid-cols-1"
                : gridLayout === 4
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {slotCameras.slice(0, gridLayout).map((cam, idx) => {
              const resolution = resolutionMap[idx] || "1080p";
              const isSelected = selectedSlot === idx;
              const targets = trackedPeople[idx] || [];

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedSlot(idx)}
                  className={cn(
                    "relative aspect-video rounded-[6px] overflow-hidden border bg-zinc-950 flex flex-col justify-between group transition select-none cursor-pointer",
                    isSelected ? "border-foreground" : "border-border hover:border-muted-foreground"
                  )}
                >
                  {/* Subtle CCTV Architectural Interior */}
                  <div className="absolute inset-0 pointer-events-none opacity-40">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      <line x1="0%" y1="100%" x2="50%" y2="40%" stroke="#52525b" strokeWidth="0.8" />
                      <line x1="100%" y1="100%" x2="50%" y2="40%" stroke="#52525b" strokeWidth="0.8" />
                      <line x1="20%" y1="80%" x2="80%" y2="80%" stroke="#3f3f46" strokeWidth="0.8" />
                      <line x1="30%" y1="65%" x2="70%" y2="65%" stroke="#3f3f46" strokeWidth="0.8" />
                    </svg>
                  </div>

                  {/* Clean 1px Bounding Boxes around detected subjects */}
                  {showAiBoxes && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      {targets.map((tgt) => (
                        <div
                          key={tgt.id}
                          className="absolute border border-sky-400 bg-sky-500/10 rounded-[2px]"
                          style={{
                            left: `${tgt.x}%`,
                            top: `${tgt.y}%`,
                            width: `${tgt.w}%`,
                            height: `${tgt.h}%`,
                          }}
                        >
                          {/* Clean minimal tag */}
                          <div className="absolute -top-4 left-0 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-sky-300 font-medium whitespace-nowrap">
                            {tgt.label} · {tgt.confidence}%
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Top Overlay: Camera Name, Live dot, FPS */}
                  <div className="relative z-20 p-2 flex items-start justify-between bg-gradient-to-b from-black/80 to-transparent text-white text-xs">
                    <div>
                      <div className="font-medium text-white drop-shadow-sm">{cam.name}</div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        {cam.fps || 24} fps · {cam.latency_ms || 32} ms
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      <span>LIVE</span>
                    </div>
                  </div>

                  {/* Bottom Overlay: Time, Resolution toggle */}
                  <div className="relative z-20 p-2 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent text-white text-xs">
                    <span className="font-mono text-[11px] text-zinc-300">{currentTimeStr}</span>
                    <div className="flex items-center rounded border border-white/20 bg-black/50 p-0.5 text-[9px] font-mono">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleResolution(idx, "1080p");
                        }}
                        className={cn(
                          "px-1 rounded",
                          resolution === "1080p" ? "bg-white text-black font-semibold" : "text-zinc-400"
                        )}
                      >
                        1080p
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleResolution(idx, "720p");
                        }}
                        className={cn(
                          "px-1 rounded",
                          resolution === "720p" ? "bg-white text-black font-semibold" : "text-zinc-400"
                        )}
                      >
                        720p
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CamerasView;
