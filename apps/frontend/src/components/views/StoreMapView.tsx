import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  Camera as CameraIcon,
  Video,
  Layers,
  Eye,
  EyeOff,
  User,
  Activity,
  Sparkles,
  Lock,
  ShoppingBag,
  Clock,
  TrendingUp,
  Navigation,
  Compass,
} from "lucide-react";
import { Camera, HeatmapCell, Zone, EventItem } from "../../types";
import { cn, formatTimeAgo, getStatusDot } from "../../lib/utils";

interface StoreMapViewProps {
  zones: Zone[];
  cameras: Camera[];
  heatmapCells: HeatmapCell[];
  events: EventItem[];
  selectedCamera?: Camera | null;
  onSelectCamera: (cam: Camera | null) => void;
}

// Logical corner and perimeter camera anchor points for authentic surveillance coverage
// Cameras are NEVER mounted on shelves; they are mounted in ceiling corners, perimeter walls, or overhead gimbals.
const LOGICAL_CAMERA_ANCHORS: Record<
  number,
  {
    x: number;
    y: number;
    facing: number;
    fov: number;
    label: string;
    mount: "Ceiling Corner" | "Perimeter Wall" | "Overhead Gimbal";
  }
> = {
  1: { x: 4, y: 6, facing: 135, fov: 70, label: "NW Ceiling Corner · Aisle 1 & Groceries", mount: "Ceiling Corner" },
  2: { x: 96, y: 6, facing: 225, fov: 70, label: "NE Ceiling Corner · Aisle 3 & Beverages", mount: "Ceiling Corner" },
  3: { x: 97, y: 52, facing: 270, fov: 75, label: "East Perimeter Wall · Coolers & Snacks", mount: "Perimeter Wall" },
  4: { x: 3, y: 52, facing: 80, fov: 75, label: "West Perimeter Wall · Cosmetics & Pharmacy", mount: "Perimeter Wall" },
  5: { x: 50, y: 92, facing: 180, fov: 85, label: "Overhead Ceiling Gimbal · Checkout Bank", mount: "Overhead Gimbal" },
  6: { x: 4, y: 132, facing: 60, fov: 75, label: "Entrance Vestibule · EAS Security Gates", mount: "Ceiling Corner" },
};

// Logical straight-line forward walking trajectories for shoppers
// Shoppers walk strictly straight forward along aisle centerlines or concourses, never backwards.
interface ShopperPath {
  id: number;
  label: string;
  activity: string;
  dwell: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  headingDeg: number; // 0 = North, 90 = East, 180 = South, 270 = West
}

const SHOPPER_PATHS: ShopperPath[] = [
  {
    id: 1,
    label: "Shopper #101",
    activity: "Browsing Aisle 1 (Groceries)",
    dwell: "02:15",
    startX: 11,
    startY: 60,
    endX: 11,
    endY: 18,
    speed: 0.18,
    headingDeg: 0, // Straight North
  },
  {
    id: 2,
    label: "Shopper #102",
    activity: "Walking Aisle 2 (Dairy Wall)",
    dwell: "01:40",
    startX: 41,
    startY: 18,
    endX: 41,
    endY: 62,
    speed: 0.22,
    headingDeg: 180, // Straight South
  },
  {
    id: 3,
    label: "Shopper #103",
    activity: "Navigating Cart Aisle 3 (Snacks)",
    dwell: "03:10",
    startX: 69,
    startY: 58,
    endX: 69,
    endY: 20,
    speed: 0.16,
    headingDeg: 0, // Straight North
  },
  {
    id: 4,
    label: "Shopper #104",
    activity: "Crossing Concourse to Checkout",
    dwell: "00:50",
    startX: 88,
    startY: 78,
    endX: 28,
    endY: 78,
    speed: 0.25,
    headingDeg: 270, // Straight West
  },
  {
    id: 5,
    label: "Shopper #105",
    activity: "Queued at Checkout Lane 2",
    dwell: "04:20",
    startX: 50,
    startY: 114,
    endX: 50,
    endY: 98,
    speed: 0.12,
    headingDeg: 0, // Straight North
  },
  {
    id: 6,
    label: "Shopper #106",
    activity: "Entering through EAS Security Gates",
    dwell: "00:25",
    startX: 28,
    startY: 148,
    endX: 28,
    endY: 126,
    speed: 0.28,
    headingDeg: 0, // Straight North
  },
];

export function StoreMapView({
  zones,
  cameras,
  heatmapCells,
  events,
  selectedCamera,
  onSelectCamera,
}: StoreMapViewProps) {
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(65);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showFovCones, setShowFovCones] = useState(true);
  const [showAisleNames, setShowAisleNames] = useState(true);
  const [hoveredCam, setHoveredCam] = useState<Camera | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [timeRange, setTimeRange] = useState<"15m" | "1h" | "24h">("1h");

  // Continuous straight-forward progress animation for shoppers
  // Shoppers move strictly forward along their designated straight paths, looping to start when reaching end.
  const [shopperProgress, setShopperProgress] = useState<number[]>(
    SHOPPER_PATHS.map((_, i) => (i * 0.22) % 1)
  );

  useEffect(() => {
    let animFrame: number;
    let lastTime = performance.now();

    const animateShoppers = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setShopperProgress((prev) =>
        prev.map((prog, idx) => {
          const path = SHOPPER_PATHS[idx];
          // Constant straight-forward motion
          const next = prog + (dt * path.speed) / 10;
          return next > 1 ? 0 : next;
        })
      );

      animFrame = requestAnimationFrame(animateShoppers);
    };

    animFrame = requestAnimationFrame(animateShoppers);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // Compute live shopper positions strictly advancing straight forward
  const liveShoppers = useMemo(() => {
    return SHOPPER_PATHS.map((p, idx) => {
      const prog = shopperProgress[idx] || 0;
      const curX = p.startX + (p.endX - p.startX) * prog;
      const curY = p.startY + (p.endY - p.startY) * prog;
      return {
        ...p,
        currentX: Number(curX.toFixed(2)),
        currentY: Number(curY.toFixed(2)),
      };
    });
  }, [shopperProgress]);

  // Memoized filtered events for the side drawer
  const activeEvents = useMemo(() => {
    return events.filter((e) => {
      if (selectedCamera) return e.camera_id === selectedCamera.id;
      if (selectedZone) {
        const zName = selectedZone.name.toLowerCase();
        const payloadStr = JSON.stringify(e.payload).toLowerCase();
        return payloadStr.includes(zName);
      }
      return false;
    });
  }, [events, selectedCamera, selectedZone]);

  // Generate smooth arc sector for modern vision coverage FOV
  const getFovSector = useCallback(
    (cx: number, cy: number, facingDeg: number = 180, fovDeg: number = 70, radius: number = 24) => {
      const halfFov = fovDeg / 2;
      const startAngle = ((facingDeg - halfFov - 90) * Math.PI) / 180;
      const endAngle = ((facingDeg + halfFov - 90) * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(endAngle);
      const y2 = cy + radius * Math.sin(endAngle);

      return `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
    },
    []
  );

  // Logical camera mapping: guarantees cameras are placed in corners/perimeters, never inside shelves
  const resolvedCameras = useMemo(() => {
    return cameras.map((cam, idx) => {
      const anchor = LOGICAL_CAMERA_ANCHORS[cam.id] || LOGICAL_CAMERA_ANCHORS[(idx % 6) + 1];
      return {
        ...cam,
        resolvedX: anchor.x,
        resolvedY: anchor.y,
        resolvedFacing: anchor.facing,
        resolvedFov: anchor.fov,
        mountDescription: anchor.label,
        mountType: anchor.mount,
      };
    });
  }, [cameras]);

  // Walkway-anchored thermal heatmap cells (never inside physical shelves!)
  const logicalHeatmapCells = useMemo(() => {
    return [
      { x: 11, y: 24, intensity: 0.85 }, // Aisle 1 Produce high traffic
      { x: 11, y: 46, intensity: 0.7 }, // Aisle 1 Groceries
      { x: 41, y: 32, intensity: 0.95 }, // Aisle 2 Milk & Dairy Chillers (Hotspot)
      { x: 41, y: 52, intensity: 0.65 }, // Aisle 2 Chilled Foods
      { x: 69, y: 28, intensity: 0.75 }, // Aisle 3 Sodas & Chips
      { x: 69, y: 48, intensity: 0.8 }, // Aisle 3 Snack Endcap
      { x: 94, y: 42, intensity: 0.6 }, // Aisle 4 Cosmetics counter
      { x: 32, y: 78, intensity: 0.75 }, // Concourse junction
      { x: 50, y: 76, intensity: 0.85 }, // Concourse central walkway
      { x: 72, y: 78, intensity: 0.7 }, // Concourse right walkway
      { x: 28, y: 104, intensity: 0.8 }, // Checkout Lane 1 queue
      { x: 50, y: 104, intensity: 0.95 }, // Checkout Lane 2 queue (Active register)
      { x: 72, y: 104, intensity: 0.65 }, // Checkout Lane 3 queue
      { x: 28, y: 136, intensity: 0.9 }, // Entrance Turnstiles & EAS Gates (Hotspot)
    ];
  }, []);

  return (
    <div className="space-y-5 animate-fade-up max-w-7xl mx-auto pb-8">
      {/* Top Header & Map Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
              Interactive Architectural Floor Plan & Surveillance Grid
            </h1>
            <span className="px-2.5 py-0.5 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[12px] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
              Live Sensor Sync
            </span>
          </div>
          <p className="text-[14px] text-text-secondary mt-0.5">
            Architectural gondola shelving layout, corner-mounted vision cones, and straight aisle customer footfall
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
          {/* Time range selector */}
          <div
            className="inline-flex rounded-[8px] border border-border bg-surface-elevated p-0.5 shadow-xs"
            role="group"
            aria-label="Time horizon"
          >
            {(["15m", "1h", "24h"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-3 py-1 rounded-[6px] text-[13px] font-medium transition",
                  timeRange === r
                    ? "bg-card font-semibold text-foreground shadow-xs"
                    : "text-text-tertiary hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Heatmap toggle and slider */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-border bg-card shadow-xs">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="rounded-[4px] border-border text-primary focus:ring-0"
              />
              <span className="text-text-secondary font-medium">Thermal Footfall</span>
            </label>
            {showHeatmap && (
              <input
                type="range"
                min="20"
                max="100"
                value={heatmapIntensity}
                onChange={(e) => setHeatmapIntensity(Number(e.target.value))}
                className="w-16 h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                aria-label="Heatmap intensity slider"
              />
            )}
          </div>

          {/* FOV Cones Toggle */}
          <button
            type="button"
            onClick={() => setShowFovCones(!showFovCones)}
            className={cn(
              "px-3 py-1.5 rounded-[8px] border text-[13px] font-medium transition shadow-xs flex items-center gap-1.5",
              showFovCones
                ? "border-primary/40 bg-primary/10 text-primary font-semibold"
                : "border-border bg-card text-text-secondary hover:text-foreground"
            )}
          >
            {showFovCones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>Corner FOV Coverage</span>
          </button>
        </div>
      </div>

      {/* Main Floorplan Presentation Card & Side Inspector */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-[600px]">
        {/* Architectural SVG Canvas Card */}
        <div className="flex-1 rounded-[10px] border border-border bg-card p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[560px] shadow-card">
          {/* Architectural Blueprint Legend Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-4 px-2 text-[12px] text-text-secondary border-b border-border/60 pb-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-2.5 rounded-[2px] bg-zinc-300 dark:bg-zinc-700 border border-zinc-500" />
                <span className="font-medium text-foreground">Gondola Shelves</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-foreground">Shoppers (Moving Straight Forward)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white" />
                <span className="font-medium text-foreground">Corner/Perimeter Cameras</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-2.5 rounded-[2px] bg-amber-500/20 border border-amber-500/60" />
                <span className="font-medium text-foreground">Checkout Lanes</span>
              </span>
            </div>
            <span className="font-mono text-[11px] text-text-tertiary">
              Flagship Supermarket · Level 1 Floor Plan (Scale 1:100)
            </span>
          </div>

          {/* SVG Map Container */}
          <div className="w-full max-w-2xl aspect-[100/155] relative">
            <svg
              viewBox="-4 -4 108 162"
              className="w-full h-full select-none"
              aria-label="Architectural Store Floorplan SVG"
            >
              <defs>
                {/* Heatmap Blur Filter */}
                <filter id="blur-heat" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.8" />
                </filter>

                {/* Soft FOV Corner Arc Gradients */}
                <radialGradient id="fov-corner-gradient" cx="0%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.32" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </radialGradient>

                <radialGradient id="fov-hover-gradient" cx="0%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.5" />
                  <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </radialGradient>

                {/* Heatmap color gradients */}
                <radialGradient id="heat-high">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#ea580c" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="heat-medium">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </radialGradient>

                {/* Shelf Hatch Pattern for structural realism */}
                <pattern id="shelf-pattern" width="4" height="4" patternUnits="userSpaceOnUse">
                  <line x1="0" y1="0" x2="4" y2="0" stroke="currentColor" strokeWidth="0.4" className="text-zinc-400/40 dark:text-zinc-600/40" />
                </pattern>
              </defs>

              {/* 1. STORE EXTERIOR WALLS & FOUNDATION */}
              <rect
                x="0"
                y="0"
                width="100"
                height="154"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="text-zinc-400 dark:text-zinc-600"
                rx="3"
              />

              {/* Floor Tile Grid Guidelines */}
              <line x1="0" y1="12" x2="100" y2="12" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" className="text-border/60" />
              <line x1="0" y1="64" x2="100" y2="64" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" className="text-border/60" />
              <line x1="0" y1="92" x2="100" y2="92" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" className="text-border/60" />
              <line x1="0" y1="124" x2="100" y2="124" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 2" className="text-border/60" />

              {/* 2. PHYSICAL GONDOLA SHELVING UNITS (REAL RETAIL FIXTURES) */}

              {/* GONDOLA A (Groceries & Packaged Goods) */}
              <g
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedZone({ id: 5, name: "Gondola A · Groceries & Dry Goods", type: "shelf", polygon: [] });
                  onSelectCamera(null);
                }}
              >
                {/* Main Shelf Body */}
                <rect
                  x="18"
                  y="16"
                  width="16"
                  height="46"
                  rx="1.5"
                  className="fill-zinc-200/90 dark:fill-zinc-800/90 stroke-zinc-500/80 dark:stroke-zinc-600 stroke-[0.8] group-hover:stroke-primary transition-colors"
                />
                {/* Internal Shelf Tier Slat Lines */}
                <line x1="18" y1="24" x2="34" y2="24" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="18" y1="32" x2="34" y2="32" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="18" y1="40" x2="34" y2="40" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="18" y1="48" x2="34" y2="48" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="18" y1="56" x2="34" y2="56" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />

                {/* Shelf Products (Simulated grocery boxes) */}
                <rect x="20" y="18" width="3" height="4" fill="#ef4444" opacity="0.6" rx="0.4" />
                <rect x="24" y="18" width="3" height="4" fill="#3b82f6" opacity="0.6" rx="0.4" />
                <rect x="28" y="18" width="4" height="4" fill="#10b981" opacity="0.6" rx="0.4" />
                <rect x="20" y="34" width="4" height="4" fill="#f59e0b" opacity="0.6" rx="0.4" />
                <rect x="25" y="34" width="3.5" height="4" fill="#8b5cf6" opacity="0.6" rx="0.4" />

                {/* Top Promotional Endcap Display */}
                <rect x="18" y="12" width="16" height="3.5" rx="1" fill="#4f46e5" opacity="0.25" stroke="#4f46e5" strokeWidth="0.5" />
                <text x="26" y="14.6" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-primary uppercase">
                  Endcap A1
                </text>

                {/* Bottom Promotional Endcap Display */}
                <rect x="18" y="62.5" width="16" height="3.5" rx="1" fill="#4f46e5" opacity="0.25" stroke="#4f46e5" strokeWidth="0.5" />
                <text x="26" y="65.1" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-primary uppercase">
                  Endcap A2
                </text>

                {/* Gondola Signage Label */}
                <g transform="translate(26, 38)">
                  <rect x="-7.5" y="-3.5" width="15" height="7" rx="1.5" className="fill-zinc-900/90 stroke-zinc-700 stroke-[0.3]" />
                  <text x="0" y="-0.5" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-white">
                    Gondola A
                  </text>
                  <text x="0" y="2.2" textAnchor="middle" className="text-[1.8px] font-sans fill-zinc-300">
                    Groceries
                  </text>
                </g>
              </g>

              {/* GONDOLA B (Dairy & Chilled Goods) */}
              <g
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedZone({ id: 6, name: "Gondola B · Dairy & Refrigerated Coolers", type: "shelf", polygon: [] });
                  onSelectCamera(null);
                }}
              >
                {/* Main Shelf Body */}
                <rect
                  x="46"
                  y="16"
                  width="16"
                  height="46"
                  rx="1.5"
                  className="fill-zinc-200/90 dark:fill-zinc-800/90 stroke-zinc-500/80 dark:stroke-zinc-600 stroke-[0.8] group-hover:stroke-primary transition-colors"
                />
                {/* Internal Cooler Shelf Slat Lines */}
                <line x1="46" y1="24" x2="62" y2="24" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="46" y1="32" x2="62" y2="32" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="46" y1="40" x2="62" y2="40" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="46" y1="48" x2="62" y2="48" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="46" y1="56" x2="62" y2="56" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />

                {/* Cooler Bottle & Milk Carton Rows */}
                <rect x="48" y="18" width="3" height="4" fill="#0284c7" opacity="0.6" rx="0.4" />
                <rect x="52" y="18" width="3" height="4" fill="#38bdf8" opacity="0.6" rx="0.4" />
                <rect x="56" y="18" width="4" height="4" fill="#0284c7" opacity="0.6" rx="0.4" />

                {/* Top Endcap */}
                <rect x="46" y="12" width="16" height="3.5" rx="1" fill="#0284c7" opacity="0.2" stroke="#0284c7" strokeWidth="0.5" />
                <text x="54" y="14.6" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-sky-600 dark:fill-sky-400 uppercase">
                  Endcap B1
                </text>

                {/* Bottom Endcap */}
                <rect x="46" y="62.5" width="16" height="3.5" rx="1" fill="#0284c7" opacity="0.2" stroke="#0284c7" strokeWidth="0.5" />
                <text x="54" y="65.1" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-sky-600 dark:fill-sky-400 uppercase">
                  Endcap B2
                </text>

                {/* Gondola Signage Label */}
                <g transform="translate(54, 38)">
                  <rect x="-7.5" y="-3.5" width="15" height="7" rx="1.5" className="fill-zinc-900/90 stroke-zinc-700 stroke-[0.3]" />
                  <text x="0" y="-0.5" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-white">
                    Gondola B
                  </text>
                  <text x="0" y="2.2" textAnchor="middle" className="text-[1.8px] font-sans fill-zinc-300">
                    Dairy & Coolers
                  </text>
                </g>
              </g>

              {/* GONDOLA C (Beverages & Snacks) */}
              <g
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedZone({ id: 7, name: "Gondola C · Snacks & Beverages", type: "shelf", polygon: [] });
                  onSelectCamera(null);
                }}
              >
                {/* Main Shelf Body */}
                <rect
                  x="74"
                  y="16"
                  width="16"
                  height="46"
                  rx="1.5"
                  className="fill-zinc-200/90 dark:fill-zinc-800/90 stroke-zinc-500/80 dark:stroke-zinc-600 stroke-[0.8] group-hover:stroke-primary transition-colors"
                />
                {/* Internal Shelf Tier Slat Lines */}
                <line x1="74" y1="24" x2="90" y2="24" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="74" y1="32" x2="90" y2="32" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="74" y1="40" x2="90" y2="40" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="74" y1="48" x2="90" y2="48" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />
                <line x1="74" y1="56" x2="90" y2="56" stroke="currentColor" strokeWidth="0.5" className="text-zinc-400 dark:text-zinc-600" />

                {/* Snack bags / soda cans */}
                <rect x="76" y="18" width="3.5" height="4" fill="#f59e0b" opacity="0.6" rx="0.4" />
                <rect x="81" y="18" width="3.5" height="4" fill="#ec4899" opacity="0.6" rx="0.4" />
                <rect x="86" y="18" width="3" height="4" fill="#10b981" opacity="0.6" rx="0.4" />

                {/* Top Endcap */}
                <rect x="74" y="12" width="16" height="3.5" rx="1" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" strokeWidth="0.5" />
                <text x="82" y="14.6" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-amber-600 dark:fill-amber-400 uppercase">
                  Endcap C1
                </text>

                {/* Bottom Endcap */}
                <rect x="74" y="62.5" width="16" height="3.5" rx="1" fill="#f59e0b" opacity="0.2" stroke="#f59e0b" strokeWidth="0.5" />
                <text x="82" y="65.1" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-amber-600 dark:fill-amber-400 uppercase">
                  Endcap C2
                </text>

                {/* Gondola Signage Label */}
                <g transform="translate(82, 38)">
                  <rect x="-7.5" y="-3.5" width="15" height="7" rx="1.5" className="fill-zinc-900/90 stroke-zinc-700 stroke-[0.3]" />
                  <text x="0" y="-0.5" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-white">
                    Gondola C
                  </text>
                  <text x="0" y="2.2" textAnchor="middle" className="text-[1.8px] font-sans fill-zinc-300">
                    Snacks & Drinks
                  </text>
                </g>
              </g>

              {/* 3. AISLE WALKWAY IDENTIFIERS (CLEAR HANGING SIGNS) */}
              {showAisleNames && (
                <>
                  {/* Aisle 1 (Produce & Cereals) */}
                  <g transform="translate(11, 8)">
                    <rect x="-8" y="-3" width="16" height="5" rx="1.2" className="fill-surface-elevated stroke-border stroke-[0.4] shadow-xs" />
                    <text x="0" y="0.5" textAnchor="middle" className="text-[2.4px] font-sans font-semibold fill-foreground">
                      Aisle 1 · Produce
                    </text>
                  </g>

                  {/* Aisle 2 (Dairy Wall) */}
                  <g transform="translate(41, 8)">
                    <rect x="-7.5" y="-3" width="15" height="5" rx="1.2" className="fill-surface-elevated stroke-border stroke-[0.4] shadow-xs" />
                    <text x="0" y="0.5" textAnchor="middle" className="text-[2.4px] font-sans font-semibold fill-foreground">
                      Aisle 2 · Dairy
                    </text>
                  </g>

                  {/* Aisle 3 (Snacks & Sodas) */}
                  <g transform="translate(69, 8)">
                    <rect x="-8" y="-3" width="16" height="5" rx="1.2" className="fill-surface-elevated stroke-border stroke-[0.4] shadow-xs" />
                    <text x="0" y="0.5" textAnchor="middle" className="text-[2.4px] font-sans font-semibold fill-foreground">
                      Aisle 3 · Drinks
                    </text>
                  </g>

                  {/* Aisle 4 (Cosmetics & Pharmacy) */}
                  <g transform="translate(95, 20)">
                    <rect x="-4.5" y="-10" width="9" height="20" rx="1.2" className="fill-surface-elevated stroke-border stroke-[0.4] shadow-xs" />
                    <text x="0" y="-1" textAnchor="middle" transform="rotate(90, 0, 0)" className="text-[2.4px] font-sans font-semibold fill-foreground">
                      Aisle 4 · Cosmetics
                    </text>
                  </g>
                </>
              )}

              {/* 4. CENTRAL CUSTOMER CONCOURSE (OPEN CIRCULATION AREA) */}
              <rect
                x="14"
                y="68"
                width="84"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeDasharray="3 3"
                className="text-border"
                rx="2"
              />
              <text x="54" y="79" textAnchor="middle" className="text-[2.6px] font-sans font-semibold fill-text-tertiary uppercase tracking-widest pointer-events-none">
                Main Customer Concourse & Navigation Lane
              </text>

              {/* 5. RESTRICTED STAFF OFFICE & SERVER ROOM (WEST WALL - NO OVERLAP!) */}
              <g
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedZone({ id: 11, name: "Staff Office (Restricted Access)", type: "restricted", polygon: [] });
                  onSelectCamera(null);
                }}
              >
                <rect
                  x="1"
                  y="66"
                  width="12"
                  height="26"
                  rx="1.5"
                  className="fill-zinc-300/60 dark:fill-zinc-900/90 stroke-amber-500/60 stroke-[0.8] group-hover:stroke-amber-500"
                />
                {/* Security Door Swing Arc */}
                <path d="M 13 80 A 6 6 0 0 0 7 86" fill="none" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1 1" />
                <line x1="13" y1="80" x2="13" y2="86" stroke="#f59e0b" strokeWidth="0.8" />

                <g transform="translate(7, 74)">
                  <rect x="-5" y="-3" width="10" height="6" rx="1" fill="#78350f" opacity="0.4" />
                  <text x="0" y="-0.5" textAnchor="middle" className="text-[1.8px] font-sans font-bold fill-amber-500 uppercase">
                    Staff Only
                  </text>
                  <text x="0" y="1.8" textAnchor="middle" className="text-[1.6px] font-sans fill-amber-400">
                    Restricted
                  </text>
                </g>
              </g>

              {/* 6. CHECKOUT LANES (FRONT REGISTERS WITH CONVEYORS & POS) */}
              <g
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedZone({ id: 3, name: "Front Checkout Register Bank", type: "checkout", polygon: [] });
                  onSelectCamera(null);
                }}
              >
                <rect
                  x="14"
                  y="94"
                  width="84"
                  height="28"
                  rx="2"
                  className="fill-primary/[0.03] stroke-border stroke-[0.8] group-hover:stroke-primary/50 transition-colors"
                />

                {/* Checkout Lane 1 */}
                <g transform="translate(20, 98)">
                  <rect x="0" y="0" width="16" height="20" rx="1.5" className="fill-surface-elevated stroke-border stroke-[0.5]" />
                  {/* Conveyor Belt */}
                  <rect x="2" y="2" width="7" height="16" rx="0.8" fill="#27272a" />
                  <line x1="2" y1="6" x2="9" y2="6" stroke="#52525b" strokeWidth="0.5" />
                  <line x1="2" y1="10" x2="9" y2="10" stroke="#52525b" strokeWidth="0.5" />
                  <line x1="2" y1="14" x2="9" y2="14" stroke="#52525b" strokeWidth="0.5" />
                  {/* POS Monitor Screen */}
                  <rect x="10.5" y="4" width="3.5" height="3" rx="0.5" fill="#0284c7" />
                  {/* Cashier Stool */}
                  <circle cx="12" cy="11" r="1.8" className="fill-zinc-400 dark:fill-zinc-600" />
                  <text x="8" y="22.5" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-foreground">
                    Lane 1 (Express)
                  </text>
                </g>

                {/* Checkout Lane 2 */}
                <g transform="translate(48, 98)">
                  <rect x="0" y="0" width="16" height="20" rx="1.5" className="fill-surface-elevated stroke-border stroke-[0.5]" />
                  {/* Conveyor Belt */}
                  <rect x="2" y="2" width="7" height="16" rx="0.8" fill="#27272a" />
                  <line x1="2" y1="6" x2="9" y2="6" stroke="#52525b" strokeWidth="0.5" />
                  <line x1="2" y1="10" x2="9" y2="10" stroke="#52525b" strokeWidth="0.5" />
                  <line x1="2" y1="14" x2="9" y2="14" stroke="#52525b" strokeWidth="0.5" />
                  {/* POS Monitor Screen */}
                  <rect x="10.5" y="4" width="3.5" height="3" rx="0.5" fill="#10b981" />
                  {/* Cashier Stool */}
                  <circle cx="12" cy="11" r="1.8" className="fill-zinc-400 dark:fill-zinc-600" />
                  <text x="8" y="22.5" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-foreground">
                    Lane 2 (Active)
                  </text>
                </g>

                {/* Checkout Lane 3 */}
                <g transform="translate(76, 98)">
                  <rect x="0" y="0" width="16" height="20" rx="1.5" className="fill-surface-elevated stroke-border stroke-[0.5]" />
                  {/* Conveyor Belt */}
                  <rect x="2" y="2" width="7" height="16" rx="0.8" fill="#27272a" />
                  <line x1="2" y1="6" x2="9" y2="6" stroke="#52525b" strokeWidth="0.5" />
                  <line x1="2" y1="10" x2="9" y2="10" stroke="#52525b" strokeWidth="0.5" />
                  <line x1="2" y1="14" x2="9" y2="14" stroke="#52525b" strokeWidth="0.5" />
                  {/* POS Monitor Screen */}
                  <rect x="10.5" y="4" width="3.5" height="3" rx="0.5" fill="#0284c7" />
                  {/* Cashier Stool */}
                  <circle cx="12" cy="11" r="1.8" className="fill-zinc-400 dark:fill-zinc-600" />
                  <text x="8" y="22.5" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-foreground">
                    Lane 3
                  </text>
                </g>
              </g>

              {/* 7. ENTRANCE & EXIT VESTIBULES (SOUTH WALL) */}

              {/* Entrance with Sliding Glass Doors & Anti-Theft EAS Gates */}
              <g
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedZone({ id: 1, name: "Store Main Entrance & Lobby", type: "entrance", polygon: [] });
                  onSelectCamera(null);
                }}
              >
                <rect x="14" y="128" width="32" height="24" rx="1.5" className="fill-sky-500/[0.04] stroke-sky-500/40 stroke-[0.6]" />
                {/* Welcome Floor Rug */}
                <rect x="20" y="132" width="20" height="14" rx="1" fill="#18181b" stroke="#3f3f46" strokeWidth="0.4" />
                <text x="30" y="140" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-zinc-300 uppercase tracking-wider">
                  Welcome to SmartRetail
                </text>

                {/* Dual Anti-theft RFID EAS Gates */}
                <rect x="19" y="145" width="2.5" height="6" rx="0.5" fill="#ef4444" opacity="0.9" />
                <rect x="38.5" y="145" width="2.5" height="6" rx="0.5" fill="#ef4444" opacity="0.9" />
                <text x="20.2" y="149" textAnchor="middle" className="text-[1.6px] font-mono font-bold fill-white">
                  EAS
                </text>
                <text x="39.7" y="149" textAnchor="middle" className="text-[1.6px] font-mono font-bold fill-white">
                  EAS
                </text>

                {/* Sliding Glass Doors */}
                <line x1="22" y1="153.5" x2="38" y2="153.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
                <text x="30" y="157" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-primary uppercase">
                  Main Entrance (In)
                </text>
              </g>

              {/* Store Exit & One-Way Turnstiles */}
              <g
                className="cursor-pointer group"
                onClick={() => {
                  setSelectedZone({ id: 2, name: "Store Exit Concourse", type: "exit", polygon: [] });
                  onSelectCamera(null);
                }}
              >
                <rect x="54" y="128" width="32" height="24" rx="1.5" className="fill-emerald-500/[0.04] stroke-emerald-500/40 stroke-[0.6]" />
                {/* One-way Turnstiles */}
                <line x1="62" y1="140" x2="78" y2="140" stroke="#10b981" strokeWidth="0.8" strokeDasharray="2 1" />
                <text x="70" y="145" textAnchor="middle" className="text-[2.4px] font-sans font-semibold fill-emerald-600 dark:fill-emerald-400">
                  ↓ One-Way Exit Gate ↓
                </text>
                {/* Sliding Glass Doors */}
                <line x1="60" y1="153.5" x2="80" y2="153.5" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />
                <text x="70" y="157" textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-emerald-600 dark:fill-emerald-400 uppercase">
                  Store Exit (Out)
                </text>
              </g>

              {/* 8. THERMAL FOOTFALL HEATMAP (WALKWAYS ONLY) */}
              {showHeatmap &&
                logicalHeatmapCells.map((cell, idx) => (
                  <circle
                    key={idx}
                    cx={cell.x}
                    cy={cell.y}
                    r={7 + cell.intensity * 9}
                    fill={cell.intensity > 0.8 ? "url(#heat-high)" : "url(#heat-medium)"}
                    opacity={(cell.intensity * heatmapIntensity) / 120}
                    filter="url(#blur-heat)"
                    className="pointer-events-none transition-opacity duration-300"
                  />
                ))}

              {/* 9. CORNER-MOUNTED CAMERA FIELD OF VIEW CONES */}
              {showFovCones &&
                resolvedCameras.map((cam) => {
                  const isHovered = hoveredCam?.id === cam.id;
                  const isSelected = selectedCamera?.id === cam.id;

                  return (
                    <path
                      key={`fov-${cam.id}`}
                      d={getFovSector(cam.resolvedX, cam.resolvedY, cam.resolvedFacing, cam.resolvedFov, 28)}
                      fill={isSelected || isHovered ? "url(#fov-hover-gradient)" : "url(#fov-corner-gradient)"}
                      stroke={isSelected ? "#4f46e5" : isHovered ? "#38bdf8" : "#06b6d4"}
                      strokeWidth={isSelected ? "0.8" : "0.4"}
                      strokeOpacity={isSelected ? 0.9 : 0.45}
                      className="pointer-events-none transition-all duration-200"
                    />
                  );
                })}

              {/* 10. REALISTIC SHOPPERS (MOVING STRICTLY STRAIGHT FORWARD) */}
              {liveShoppers.map((shp) => (
                <g key={shp.id} className="cursor-pointer group">
                  {/* Stable Glowing Base Halo (No oscillating scale, 100% stable) */}
                  <circle cx={shp.currentX} cy={shp.currentY} r="2.8" className="fill-emerald-400/30" />
                  <circle cx={shp.currentX} cy={shp.currentY} r="1.4" className="fill-emerald-500 stroke-white stroke-[0.4] shadow-xs" />

                  {/* Straight Forward Heading Arrow (Shows Direction of Travel) */}
                  <g
                    transform={`translate(${shp.currentX}, ${shp.currentY}) rotate(${shp.headingDeg})`}
                    className="pointer-events-none"
                  >
                    <polygon points="0,-3.2 -1.2,-1.6 1.2,-1.6" className="fill-emerald-600 dark:fill-emerald-400" />
                  </g>

                  {/* Shopper Hover Inspection Tooltip */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                    <rect x={shp.currentX - 16} y={shp.currentY - 11} width="32" height="7.5" rx="1.5" fill="#18181b" stroke="#3f3f46" strokeWidth="0.4" />
                    <text x={shp.currentX} y={shp.currentY - 7.5} textAnchor="middle" className="text-[2.2px] font-sans font-bold fill-white">
                      {shp.label} · {shp.dwell}
                    </text>
                    <text x={shp.currentX} y={shp.currentY - 5} textAnchor="middle" className="text-[1.8px] font-sans fill-zinc-300">
                      {shp.activity}
                    </text>
                  </g>
                </g>
              ))}

              {/* 11. CORNER & PERIMETER SURVEILLANCE CAMERA HARDWARE MOUNTS */}
              {resolvedCameras.map((cam) => {
                const isSelected = selectedCamera?.id === cam.id;
                const isHovered = hoveredCam?.id === cam.id;
                const status = getStatusDot(cam.status);

                return (
                  <g
                    key={cam.id}
                    transform={`translate(${cam.resolvedX}, ${cam.resolvedY})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCamera(cam);
                      setSelectedZone(null);
                    }}
                    onMouseEnter={() => setHoveredCam(cam)}
                    onMouseLeave={() => setHoveredCam(null)}
                    className="cursor-pointer group z-20"
                  >
                    {/* Mounting Base Bracket Plate */}
                    <circle
                      r={isSelected ? "4.0" : isHovered ? "3.4" : "2.8"}
                      className={cn(
                        "transition-all duration-200 shadow-sm",
                        isSelected
                          ? "fill-primary stroke-white stroke-[0.9]"
                          : "fill-zinc-900 stroke-zinc-400 stroke-[0.6] group-hover:stroke-primary"
                      )}
                    />
                    {/* Camera Dome Core */}
                    <circle r="1.3" className={status.dotClass} />

                    {/* Camera Identifier Badge */}
                    <g className={cn("transition-opacity pointer-events-none", isHovered || isSelected ? "opacity-100" : "opacity-90")}>
                      <rect
                        x="-10"
                        y="-8.5"
                        width="20"
                        height="5"
                        rx="1.2"
                        className={cn(
                          "transition-colors",
                          isSelected ? "fill-primary" : "fill-zinc-900 stroke-zinc-700 stroke-[0.3]"
                        )}
                      />
                      <text x="0" y="-5.2" textAnchor="middle" className="text-[2.2px] font-mono font-bold fill-white">
                        {cam.name}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Side Context & Zone/Camera Inspector Drawer */}
        {(selectedCamera || selectedZone) && (
          <aside
            role="region"
            aria-label="Spatial Inspection Panel"
            className="w-full lg:w-92 rounded-[10px] border border-border bg-card p-5 flex flex-col justify-between space-y-4 shadow-card animate-slide-in-right shrink-0"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-border pb-3.5">
                <div>
                  <span className="text-[11px] text-text-tertiary uppercase tracking-[0.04em] font-semibold">
                    {selectedCamera ? "Corner Camera Node Inspector" : "Retail Zone Telemetry"}
                  </span>
                  <h3 className="text-[17px] font-semibold text-foreground tracking-tight mt-0.5">
                    {selectedCamera ? selectedCamera.name : selectedZone?.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCamera(null);
                    setSelectedZone(null);
                  }}
                  className="p-1.5 rounded-[6px] text-text-tertiary hover:text-foreground hover:bg-surface-elevated transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Camera Details with Live Photographic CCTV Preview */}
              {selectedCamera && (
                <div className="space-y-3 text-[13px]">
                  {/* Real Photographic Mini-Feed Preview */}
                  <div className="relative rounded-[8px] overflow-hidden border border-border aspect-video bg-black shadow-xs">
                    <img
                      src={`/cameras/cam${Math.min(6, Math.max(1, selectedCamera.id))}.jpg`}
                      alt={selectedCamera.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />

                    {/* OpenCV Style OSD Tags */}
                    <div className="absolute top-2 left-2 pointer-events-none">
                      <span className="text-[#ff1a1a] font-mono font-bold text-[11px] tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        Room Status: Occupied
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 pointer-events-none">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-red-400 bg-black/60 px-1.5 py-0.5 rounded border border-red-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                      </span>
                    </div>

                    {/* Simulated Detection Box on Thumbnail */}
                    <div
                      className="absolute border border-[#00ff00] bg-[#00ff00]/10 rounded-[1px] pointer-events-none"
                      style={{ left: "40%", top: "34%", width: "16%", height: "48%" }}
                    >
                      <span className="absolute -top-3.5 left-0 bg-[#00ff00] text-black text-[8px] font-mono font-bold px-1 rounded-[1px]">
                        Person
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-[8px] bg-surface-elevated border border-border">
                    <span className="text-[11px] text-text-tertiary block font-medium">Mounting Position</span>
                    <span className="font-semibold text-foreground">
                      {LOGICAL_CAMERA_ANCHORS[selectedCamera.id]?.label || "Ceiling Corner Mount"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-[8px] bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-tertiary block font-medium">Stream Status</span>
                      <span className="font-semibold text-foreground capitalize">{selectedCamera.status}</span>
                    </div>
                    <div className="p-3 rounded-[8px] bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-tertiary block font-medium">Edge Framerate</span>
                      <span className="font-semibold text-foreground">{selectedCamera.fps || 30} FPS</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-[8px] bg-surface-elevated border border-border">
                    <span className="text-[11px] text-text-tertiary block font-medium">Telemetry Latency</span>
                    <span className="font-mono font-semibold text-foreground">{selectedCamera.latency_ms || 24} ms</span>
                  </div>
                </div>
              )}

              {/* Zone Telemetry Metrics */}
              {selectedZone && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-[8px] bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-tertiary block font-medium">Zone Occupancy</span>
                      <span className="text-[16px] font-bold text-foreground font-mono">14 shoppers</span>
                    </div>
                    <div className="p-3 rounded-[8px] bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-tertiary block font-medium">Avg Dwell Time</span>
                      <span className="text-[16px] font-bold text-foreground font-mono">2m 45s</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-[8px] bg-surface-elevated border border-border space-y-2">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-text-secondary font-medium">Congestion Density</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">Normal (34%)</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "34%" }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Live Spatial Activity Stream */}
              <div className="space-y-2.5">
                <h4 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Live Activity Stream</span>
                </h4>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {activeEvents.length === 0 ? (
                    <div className="py-6 text-center text-[13px] text-text-tertiary border border-dashed border-border rounded-[8px]">
                      No active anomalies in this zone.
                    </div>
                  ) : (
                    activeEvents.slice(0, 5).map((ev) => (
                      <div key={ev.id} className="p-2.5 rounded-[8px] border border-border bg-surface-elevated text-[13px]">
                        <div className="font-semibold text-foreground capitalize">
                          {ev.event_type.replace(/_/g, " ")}
                        </div>
                        <div className="text-[11px] text-text-tertiary tabular-nums mt-0.5">
                          {formatTimeAgo(ev.event_timestamp)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default StoreMapView;
