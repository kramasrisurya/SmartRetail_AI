import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  RefreshCw,
  Download,
} from "lucide-react";
import { Camera, Alert, Zone } from "../../types";
import { cn, getStatusDot } from "../../lib/utils";

interface CamerasViewProps {
  cameras: Camera[];
  alerts?: Alert[];
  zones?: Zone[];
  onSelectAlert?: (alert: Alert) => void;
}

interface TrackedSubject {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
  dwell: string;
}

// Precise bounding box coordinates matched to the real photography subjects
const CAMERA_PRESETS: Record<
  number,
  {
    imageSrc: string;
    zoneName: string;
    description: string;
    roomStatus: "Occupied" | "Clear" | "Alert";
    subjects: TrackedSubject[];
  }
> = {
  1: {
    imageSrc: "/cameras/cam1.jpg",
    zoneName: "Aisle 1 - Packaged Cereals & Groceries",
    description: "High-angle view of center grocery aisle",
    roomStatus: "Occupied",
    subjects: [
      { id: "P-104", label: "Person", confidence: 98.4, x: 47.2, y: 34.0, w: 7.8, h: 49.0, dwell: "02:14" },
    ],
  },
  2: {
    imageSrc: "/cameras/cam2.jpg",
    zoneName: "Aisle 8 - Dairy & Refrigerated Coolers",
    description: "Refrigerated beverage & milk cooler wall",
    roomStatus: "Occupied",
    subjects: [
      { id: "P-209", label: "Person", confidence: 96.8, x: 38.5, y: 38.0, w: 14.5, h: 57.5, dwell: "01:05" },
      { id: "P-211", label: "Person", confidence: 89.2, x: 62.0, y: 24.0, w: 5.8, h: 25.0, dwell: "00:32" },
    ],
  },
  3: {
    imageSrc: "/cameras/cam3.jpg",
    zoneName: "Aisle 14 - Drinks, Sodas & Chips",
    description: "Center aisle with shopping cart navigation",
    roomStatus: "Occupied",
    subjects: [
      { id: "P-302", label: "Person", confidence: 97.5, x: 40.2, y: 34.0, w: 14.8, h: 51.5, dwell: "03:10" },
    ],
  },
  4: {
    imageSrc: "/cameras/cam4.jpg",
    zoneName: "Dept 4 - Fragrance & High-Value Cosmetics",
    description: "Lighted perfume display cases & pharmacy lockup",
    roomStatus: "Occupied",
    subjects: [
      { id: "P-401", label: "Person", confidence: 98.1, x: 59.2, y: 47.0, w: 9.2, h: 41.5, dwell: "04:20" },
      { id: "P-408", label: "Person", confidence: 91.0, x: 10.5, y: 44.0, w: 5.5, h: 14.0, dwell: "01:12" },
    ],
  },
  5: {
    imageSrc: "/cameras/cam5.jpg",
    zoneName: "Lane 4 - Front Checkout Registers",
    description: "Conveyor belt POS terminal & payment terminal",
    roomStatus: "Occupied",
    subjects: [
      { id: "P-501", label: "Staff", confidence: 99.2, x: 33.2, y: 35.0, w: 18.0, h: 48.0, dwell: "18:40" },
      { id: "P-502", label: "Customer", confidence: 97.4, x: 53.0, y: 24.0, w: 13.8, h: 50.0, dwell: "02:25" },
    ],
  },
  6: {
    imageSrc: "/cameras/cam6.jpg",
    zoneName: "Main Entrance - Sliding Doors & EAS Gates",
    description: "Store lobby turnstiles and RFID security gates",
    roomStatus: "Occupied",
    subjects: [
      { id: "P-601", label: "Person", confidence: 97.8, x: 49.0, y: 44.0, w: 9.8, h: 36.5, dwell: "00:15" },
    ],
  },
};

export function CamerasView({ cameras, alerts = [] }: CamerasViewProps) {
  const [gridLayout, setGridLayout] = useState<1 | 4 | 6>(4);
  const [isPlaying, setIsPlaying] = useState(true);
  const [focusCamera, setFocusCamera] = useState<Camera | null>(null);
  const [cctvTimestamp, setCctvTimestamp] = useState<string>("");
  const [showAiBoxes, setShowAiBoxes] = useState(true);
  const [osdStyle, setOsdStyle] = useState<"opencv" | "modern">("opencv");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  // Real-time ticking date and timestamp formatted exactly like authentic CCTV / OpenCV feeds
  // E.g.: "Tuesday 03 Oct 2026 12:25:28PM" (as seen in user reference)
  useEffect(() => {
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const updateTimestamp = () => {
      const now = new Date();
      const day = dayNames[now.getDay()];
      const date = String(now.getDate()).padStart(2, "0");
      const month = monthNames[now.getMonth()];
      const year = now.getFullYear();

      let hours = now.getHours();
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const hoursStr = String(hours).padStart(2, "0");
      const minutesStr = String(now.getMinutes()).padStart(2, "0");
      const secondsStr = String(now.getSeconds()).padStart(2, "0");

      setCctvTimestamp(`${day} ${date} ${month} ${year} ${hoursStr}:${minutesStr}:${secondsStr}${ampm}`);
    };

    updateTimestamp();
    const timer = setInterval(updateTimestamp, 1000);
    return () => clearInterval(timer);
  }, []);

  const slotCameras = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const preset = CAMERA_PRESETS[i + 1];
      return (
        cameras[i] || {
          id: i + 1,
          name: `CAM-0${i + 1}`,
          status: "active" as const,
          location: preset ? preset.zoneName : `Camera Slot #${i + 1}`,
          map_x: 20 + i * 12,
          map_y: 30 + i * 5,
          facing: 180,
          fov: 65,
          fps: 30,
          latency_ms: 22 + i * 2,
        }
      );
    });
  }, [cameras]);

  const visibleCameras = useMemo(() => {
    if (focusCamera) {
      return [focusCamera];
    }
    return slotCameras.slice(0, gridLayout);
  }, [focusCamera, slotCameras, gridLayout]);

  const handleImageError = useCallback((camId: number) => {
    setImageErrors((prev) => ({ ...prev, [camId]: true }));
  }, []);

  return (
    <div className="space-y-5 animate-fade-up max-w-7xl mx-auto pb-8">
      {/* Top Header & Surveillance Hub Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
              Live CCTV Surveillance Feeds
            </h1>
            {focusCamera ? (
              <span className="px-2.5 py-0.5 rounded-[6px] bg-primary/10 text-primary border border-primary/20 text-[12px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Focused: {focusCamera.name}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[12px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                6 Edge Cameras Online
              </span>
            )}
          </div>
          <p className="text-[14px] text-text-secondary mt-0.5">
            Real-time photographic surveillance stream with OpenCV / YOLO neural subject detection
          </p>
        </div>

        {/* Global Controls & Layout Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
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

          {/* Toggle AI Bounding Boxes */}
          <button
            type="button"
            onClick={() => setShowAiBoxes(!showAiBoxes)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border text-[13px] font-medium transition shadow-xs",
              showAiBoxes
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border bg-card text-text-secondary hover:text-foreground"
            )}
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-500" />
            <span>AI Bounding Boxes</span>
          </button>

          {/* CCTV OSD Style Switcher */}
          <button
            type="button"
            onClick={() => setOsdStyle(osdStyle === "opencv" ? "modern" : "opencv")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border text-[13px] font-medium transition shadow-xs",
              osdStyle === "opencv"
                ? "border-red-500/40 bg-red-500/10 text-red-500 font-semibold"
                : "border-border bg-card text-text-secondary hover:text-foreground"
            )}
            title="Toggle between OpenCV Red CCTV OSD and Modern Overlay"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>{osdStyle === "opencv" ? "CCTV Red OSD" : "Modern HUD"}</span>
          </button>

          {/* Grid Layout Switcher */}
          {!focusCamera && (
            <div
              className="inline-flex rounded-[8px] border border-border p-0.5 bg-surface-elevated shadow-xs"
              role="group"
              aria-label="Camera grid layout"
            >
              <button
                type="button"
                onClick={() => setGridLayout(1)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition",
                  gridLayout === 1
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-text-tertiary hover:text-foreground"
                )}
              >
                1×1 Focus
              </button>
              <button
                type="button"
                onClick={() => setGridLayout(4)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition",
                  gridLayout === 4
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-text-tertiary hover:text-foreground"
                )}
              >
                2×2 Quad
              </button>
              <button
                type="button"
                onClick={() => setGridLayout(6)}
                className={cn(
                  "px-2.5 py-1 rounded-[6px] text-[12px] font-medium transition",
                  gridLayout === 6
                    ? "bg-card shadow-xs text-foreground font-semibold"
                    : "text-text-tertiary hover:text-foreground"
                )}
              >
                3×2 Matrix
              </button>
            </div>
          )}

          {/* Play / Pause Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause feeds" : "Play feeds"}
            className="p-2 rounded-[8px] border border-border bg-card hover:bg-surface-elevated text-foreground transition shadow-xs"
            title={isPlaying ? "Pause Stream" : "Resume Stream"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-500" />}
          </button>
        </div>
      </div>

      {/* Main CCTV Grid Feeds */}
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
        {visibleCameras.map((cam) => {
          const preset = CAMERA_PRESETS[cam.id] || CAMERA_PRESETS[1];
          const subjects = preset.subjects || [];
          const isFocused = focusCamera?.id === cam.id;
          const status = getStatusDot(cam.status);
          const hasImgError = imageErrors[cam.id];

          return (
            <div
              key={cam.id}
              className={cn(
                "rounded-[10px] border border-zinc-700/80 bg-zinc-950 overflow-hidden shadow-card transition-all duration-200 flex flex-col group relative",
                isFocused ? "ring-2 ring-primary shadow-modal" : "hover:border-zinc-500"
              )}
            >
              {/* Window Title Bar - Classic Security Feed Window Style */}
              <div className="px-3.5 py-2 bg-gradient-to-r from-zinc-900 to-zinc-900/90 border-b border-zinc-800 text-zinc-200 flex items-center justify-between select-none z-10">
                <div className="flex items-center gap-2.5">
                  {/* Traffic Light Dots */}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block shadow-xs" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block shadow-xs" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block shadow-xs" />
                  </div>
                  <span className="font-mono text-[13px] font-semibold text-white tracking-wide ml-1">
                    Security Feed : {cam.name}
                  </span>
                  <span className="text-[12px] text-zinc-400 font-sans hidden sm:inline truncate max-w-[200px]">
                    ({cam.location || preset.zoneName})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-[4px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    LIVE
                  </span>
                  <button
                    type="button"
                    onClick={() => setFocusCamera(isFocused ? null : cam)}
                    className="p-1 rounded-[4px] hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                    title={isFocused ? "Exit Focus" : "Focus on Camera"}
                  >
                    {isFocused ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Feed Screen Canvas - Photographic Surveillance Feed */}
              <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center select-none">
                {/* Photographic Surveillance Camera Photo */}
                {!hasImgError ? (
                  <img
                    src={preset.imageSrc}
                    alt={`${cam.name} - ${cam.location}`}
                    onError={() => handleImageError(cam.id)}
                    className="w-full h-full object-cover pointer-events-none transition-transform duration-300 origin-center"
                    style={{
                      transform: isFocused && zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-500 space-y-2">
                    <CameraIcon className="w-8 h-8 text-zinc-600" />
                    <span className="text-[12px] font-mono">Camera Feed Signal Connecting...</span>
                  </div>
                )}

                {/* Subtle CCTV Lens Vignette & Scanlines */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/30 pointer-events-none" />

                {/* ========================================================================= */}
                {/* CCTV OVERLAYS (EXACT MATCH TO USER REFERENCE PHOTO: media_1791030479531) */}
                {/* ========================================================================= */}

                {osdStyle === "opencv" ? (
                  <>
                    {/* Top-Left: Red OSD Status (Exact user reference: "Room Status: Occupied") */}
                    <div className="absolute top-3 left-3 pointer-events-none z-20 flex flex-col">
                      <span className="text-[#ff1a1a] font-mono font-bold text-[14px] sm:text-[16px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        Room Status: {preset.roomStatus}
                      </span>
                      <span className="text-[#ff4444] font-mono text-[11px] sm:text-[12px] tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        Zone: {cam.location || preset.zoneName}
                      </span>
                    </div>

                    {/* Bottom-Left: Red OSD Timestamp (Exact user reference: "Tuesday 19 May 2015 12:25:28PM") */}
                    <div className="absolute bottom-2.5 left-3 pointer-events-none z-20">
                      <span className="text-[#ff1a1a] font-mono font-medium text-[12px] sm:text-[14px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                        {cctvTimestamp}
                      </span>
                    </div>

                    {/* Top-Right: Camera Rec Indicator & Codec */}
                    <div className="absolute top-3 right-3 pointer-events-none z-20 flex items-center gap-2">
                      <span className="text-[#ff1a1a] font-mono font-bold text-[11px] sm:text-[12px] tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#ff1a1a] animate-pulse" />
                        REC
                      </span>
                      <span className="text-zinc-300 font-mono text-[11px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] hidden sm:inline">
                        1080p/{cam.fps || 30}fps
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Modern Clean HUD Mode */}
                    <div className="absolute top-3 left-3 pointer-events-none z-20 flex items-center gap-2 bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-[6px] border border-white/10 text-white">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                      <span className="font-semibold text-[12px]">{cam.name}</span>
                      <span className="text-zinc-400 text-[11px]">| {preset.roomStatus}</span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 pointer-events-none z-20 bg-black/75 backdrop-blur-xs px-2.5 py-1 rounded-[6px] border border-white/10 text-zinc-300 font-mono text-[11px]">
                      {cctvTimestamp}
                    </div>
                  </>
                )}

                {/* ========================================================================= */}
                {/* AI OBJECT DETECTION BOUNDING BOXES (EXACT GREEN RECTANGLE MATCH)           */}
                {/* ========================================================================= */}
                {showAiBoxes &&
                  isPlaying &&
                  subjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="absolute border-2 border-[#00ff00] bg-[#00ff00]/5 rounded-[2px] pointer-events-none transition-all duration-300"
                      style={{
                        left: `${sub.x}%`,
                        top: `${sub.y}%`,
                        width: `${sub.w}%`,
                        height: `${sub.h}%`,
                        boxShadow: "0 0 6px rgba(0, 255, 0, 0.4)",
                      }}
                    >
                      {/* Reticle Corner Ticks */}
                      <span className="absolute -top-1 -left-1 w-1.5 h-1.5 border-t-2 border-l-2 border-[#00ff00]" />
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 border-t-2 border-r-2 border-[#00ff00]" />
                      <span className="absolute -bottom-1 -left-1 w-1.5 h-1.5 border-b-2 border-l-2 border-[#00ff00]" />
                      <span className="absolute -bottom-1 -right-1 w-1.5 h-1.5 border-b-2 border-r-2 border-[#00ff00]" />

                      {/* OpenCV Style Label Tag (Green Background / Black Text) */}
                      <div className="absolute -top-5 left-0 bg-[#00ff00] px-1.5 py-0.5 rounded-[2px] text-[10px] sm:text-[11px] font-mono font-bold text-black flex items-center gap-1 shadow-sm leading-none whitespace-nowrap">
                        <span>{sub.label}</span>
                        <span>{sub.confidence}%</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Feed Bottom Status & Telemetry Bar */}
              <div className="px-3.5 py-2 bg-zinc-900 border-t border-zinc-800 text-zinc-400 text-[11px] font-mono flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-zinc-300">H.264 Main</span>
                  <span>·</span>
                  <span>Bitrate: 4.2 Mbps</span>
                  <span>·</span>
                  <span className="text-emerald-400">FPS: {cam.fps || 30}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-zinc-300">Latency: {cam.latency_ms || 24}ms</span>
                  <span className="text-emerald-400 hidden sm:inline">● Stream OK</span>
                </div>
              </div>

              {/* Focus Mode PTZ Studio Gimbal & Triage Bar */}
              {isFocused && (
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 text-white space-y-3 animate-fade-up">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* PTZ Direction Pad */}
                    <div className="flex items-center gap-4">
                      <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                        PTZ Gimbal Pan/Tilt:
                      </span>
                      <div className="flex items-center gap-1 bg-zinc-800 p-1 rounded-[8px] border border-zinc-700">
                        <button
                          type="button"
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
                          title="Pan Left"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
                          title="Tilt Up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
                          title="Tilt Down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
                          title="Pan Right"
                        >
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
                        <span className="px-2 text-[12px] font-mono text-zinc-200">
                          {zoomLevel.toFixed(1)}x
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoomLevel((z) => Math.min(3, z + 0.5))}
                          className="p-1 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Operator Quick Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = preset.imageSrc;
                          link.download = `${cam.name}_still.jpg`;
                          link.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-primary text-white text-[12px] font-semibold hover:bg-primary-hover transition shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Snapshot Still</span>
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-[8px] border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[12px] font-medium transition"
                      >
                        Record 30s Buffer
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
