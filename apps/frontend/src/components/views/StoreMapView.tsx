import React, { useState, useMemo, useCallback } from "react";
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
  const [hoveredCam, setHoveredCam] = useState<Camera | null>(null);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [timeRange, setTimeRange] = useState<"15m" | "1h" | "24h">("1h");

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
    (cx: number, cy: number, facingDeg: number = 180, fovDeg: number = 70, radius: number = 18) => {
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

  const formatPolygon = useCallback((poly: Array<{ x: number; y: number }>) => {
    return poly.map((pt) => `${pt.x},${pt.y}`).join(" ");
  }, []);

  // Compute bounding box for zone to place title badges in top-left without collisions
  const getZoneBounds = useCallback((polygon: Array<{ x: number; y: number }>) => {
    if (!polygon || polygon.length === 0) return { minX: 10, minY: 10, maxX: 30, maxY: 30 };
    let minX = polygon[0].x;
    let maxX = polygon[0].x;
    let minY = polygon[0].y;
    let maxY = polygon[0].y;
    for (const pt of polygon) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    return { minX, minY, maxX, maxY };
  }, []);

  const customerDots = useMemo(() => {
    return [
      { id: 1, x: 26, y: 78, label: "Shopper #101", dwell: "02:15" },
      { id: 2, x: 52, y: 22, label: "Shopper #102", dwell: "01:40" },
      { id: 3, x: 58, y: 108, label: "Shopper #103", dwell: "04:12" },
      { id: 4, x: 74, y: 44, label: "Shopper #104", dwell: "00:50" },
      { id: 5, x: 22, y: 132, label: "Shopper #105", dwell: "03:00" },
      { id: 6, x: 70, y: 130, label: "Shopper #106", dwell: "01:10" },
    ];
  }, []);

  return (
    <div className="space-y-5 animate-fade-up max-w-7xl mx-auto pb-8">
      {/* Top Header & Map Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
            Interactive Store Floor Plan & Spatial Heatmap
          </h1>
          <p className="text-[14px] text-text-secondary">
            Multi-zone spatial occupancy, camera field-of-view coverage, and thermal footfall density
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[13px]">
          {/* Time range selector */}
          <div className="inline-flex rounded-[8px] border border-border bg-surface-elevated p-0.5 shadow-xs" role="group" aria-label="Time horizon">
            {(["15m", "1h", "24h"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-3 py-1 rounded-[6px] text-[13px] font-medium transition",
                  timeRange === r ? "bg-card font-semibold text-foreground shadow-xs" : "text-text-tertiary hover:text-foreground"
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
              <span className="text-text-secondary font-medium">Thermal Heatmap</span>
            </label>
            {showHeatmap && (
              <input
                type="range"
                min="20"
                max="100"
                value={heatmapIntensity}
                onChange={(e) => setHeatmapIntensity(Number(e.target.value))}
                className="w-20 h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                aria-label="Heatmap intensity slider"
              />
            )}
          </div>

          {/* FOV Cones Toggle */}
          <button
            type="button"
            onClick={() => setShowFovCones(!showFovCones)}
            className={cn(
              "px-3 py-1.5 rounded-[8px] border border-border text-[13px] font-medium transition shadow-xs flex items-center gap-1.5",
              showFovCones ? "bg-surface-elevated text-foreground" : "bg-card text-text-secondary hover:text-foreground"
            )}
          >
            {showFovCones ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>FOV Coverage</span>
          </button>
        </div>
      </div>

      {/* Main Floorplan Presentation Card & Side Inspector */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-[580px]">
        {/* Architectural SVG Canvas Card */}
        <div className="flex-1 rounded-[10px] border border-border bg-card p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[520px] shadow-card">
          {/* Floorplan Legend Bar */}
          <div className="w-full flex items-center justify-between mb-3 px-2 text-[12px] text-text-tertiary">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-primary/20 border border-primary/50" /> Sales Zones
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-dot" /> Live Shoppers
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Camera Nodes
              </span>
            </div>
            <span className="font-mono text-[11px]">Downtown Flagship · Level 1 Floor Plan</span>
          </div>

          <div className="w-full max-w-2xl aspect-[110/160] relative">
            <svg
              viewBox="-10 -8 120 166"
              className="w-full h-full select-none"
              aria-label="Architectural Store Floorplan SVG"
            >
              <defs>
                {/* Heatmap Blur Filter */}
                <filter id="blur-heat" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" />
                </filter>

                {/* Soft FOV Arc Gradient */}
                <radialGradient id="fov-gradient" cx="0%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                  <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </radialGradient>

                <radialGradient id="fov-hover-gradient" cx="0%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                  <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </radialGradient>

                {/* Heatmap color gradients */}
                <radialGradient id="heat-high">
                  <stop offset="0%" stopColor="#dc2626" stopOpacity="0.7" />
                  <stop offset="50%" stopColor="#d97706" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="heat-medium">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
                  <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Architectural Grid & Floor Plate */}
              <rect
                x="-4"
                y="-4"
                width="108"
                height="158"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                className="text-border"
                rx="3"
              />

              {/* Entrance Gate Representation at Bottom */}
              <rect x="38" y="152" width="24" height="3" fill="#4f46e5" opacity="0.6" rx="1" />
              <text x="50" y="157.5" textAnchor="middle" className="text-[2.6px] font-sans font-semibold fill-text-tertiary uppercase tracking-wider">
                Store Entrance / Exit
              </text>

              {/* Zones Layer with Clean Non-Colliding Top-Left Badges */}
              {zones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                const bounds = getZoneBounds(zone.polygon);
                const isStaff = zone.name.toLowerCase().includes("staff");

                return (
                  <g
                    key={zone.id}
                    onClick={() => {
                      setSelectedZone(zone);
                      onSelectCamera(null);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Zone Boundary Polygon */}
                    <polygon
                      points={formatPolygon(zone.polygon)}
                      className={cn(
                        "transition-all duration-200",
                        isSelected
                          ? "fill-primary/20 stroke-primary stroke-[1.4]"
                          : isStaff
                          ? "fill-zinc-500/[0.08] stroke-zinc-500/40 hover:fill-zinc-500/15"
                          : "fill-primary/[0.06] stroke-border/90 hover:fill-primary/[0.12] hover:stroke-primary/50 stroke-[0.8]"
                      )}
                    />

                    {/* Zone Label Badge inside Top-Left corner of Zone (Never Collides with Cameras!) */}
                    <g transform={`translate(${Math.max(-2, bounds.minX + 2.5)}, ${bounds.minY + 3.2})`}>
                      <rect
                        x="-1"
                        y="-2.5"
                        width={zone.name.length * 2.2 + 4}
                        height="5"
                        rx="1.5"
                        className={cn(
                          "transition-colors",
                          isSelected
                            ? "fill-primary text-white"
                            : "fill-surface-elevated/95 stroke-border/60 stroke-[0.4]"
                        )}
                      />
                      <text
                        x="1"
                        y="0.8"
                        className={cn(
                          "text-[2.6px] font-sans font-semibold tracking-tight transition-colors pointer-events-none",
                          isSelected ? "fill-white" : "fill-foreground"
                        )}
                      >
                        {zone.name}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Heatmap Multi-Stop Smooth Thermal Blooms */}
              {showHeatmap &&
                heatmapCells.map((cell, idx) => (
                  <circle
                    key={idx}
                    cx={cell.x}
                    cy={cell.y}
                    r={8 + cell.intensity * 10}
                    fill={cell.intensity > 0.6 ? "url(#heat-high)" : "url(#heat-medium)"}
                    opacity={(cell.intensity * heatmapIntensity) / 120}
                    filter="url(#blur-heat)"
                    className="pointer-events-none transition-opacity duration-300"
                  />
                ))}

              {/* Camera Field-of-View Coverage Cones (Organic Sector Arcs) */}
              {showFovCones &&
                cameras.map((cam) => {
                  if (cam.map_x === null || cam.map_y === null) return null;
                  const isHovered = hoveredCam?.id === cam.id;
                  const isSelected = selectedCamera?.id === cam.id;

                  // Mount position shifted slightly toward zone edge for realism
                  const mountX = cam.map_x;
                  const mountY = Math.max(8, cam.map_y - 6);

                  return (
                    <path
                      key={`fov-${cam.id}`}
                      d={getFovSector(mountX, mountY, cam.facing || 180, cam.fov || 65, 20)}
                      fill={isSelected || isHovered ? "url(#fov-hover-gradient)" : "url(#fov-gradient)"}
                      stroke={isSelected ? "#4f46e5" : isHovered ? "#38bdf8" : "#06b6d4"}
                      strokeWidth={isSelected ? "0.6" : "0.3"}
                      strokeOpacity={isSelected ? 0.8 : 0.4}
                      className="pointer-events-none transition-all duration-200"
                    />
                  );
                })}

              {/* Live Shopper Nodes (6px circle with white core and pulsing aura) */}
              {customerDots.map((dot) => (
                <g key={dot.id} className="cursor-pointer group">
                  <circle cx={dot.x} cy={dot.y} r="2.8" className="fill-emerald-400 animate-pulse-dot" />
                  <circle cx={dot.x} cy={dot.y} r="1.1" className="fill-white stroke-emerald-600 stroke-[0.3]" />
                  {/* Hover Tag */}
                  <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <rect x={dot.x - 8} y={dot.y - 7} width="16" height="4.5" rx="1" fill="#18181b" />
                    <text x={dot.x} y={dot.y - 4} textAnchor="middle" className="text-[2.2px] font-mono fill-white">
                      {dot.label}
                    </text>
                  </g>
                </g>
              ))}

              {/* Camera Hardware Mount Icons (Ceiling mounted, distinct from text) */}
              {cameras.map((cam) => {
                if (cam.map_x === null || cam.map_y === null) return null;
                const isSelected = selectedCamera?.id === cam.id;
                const isHovered = hoveredCam?.id === cam.id;
                const status = getStatusDot(cam.status);
                const mountX = cam.map_x;
                const mountY = Math.max(8, cam.map_y - 6);

                return (
                  <g
                    key={cam.id}
                    transform={`translate(${mountX}, ${mountY})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCamera(cam);
                      setSelectedZone(null);
                    }}
                    onMouseEnter={() => setHoveredCam(cam)}
                    onMouseLeave={() => setHoveredCam(null)}
                    className="cursor-pointer group"
                  >
                    {/* Mounting Base Plate */}
                    <circle
                      r={isSelected ? "3.6" : isHovered ? "3.2" : "2.6"}
                      className={cn(
                        "transition-all duration-200 shadow-sm",
                        isSelected
                          ? "fill-primary stroke-white stroke-[0.8]"
                          : "fill-card stroke-border stroke-[0.6] group-hover:stroke-primary"
                      )}
                    />
                    {/* Status lens center */}
                    <circle r="1.1" className={status.dotClass} />

                    {/* Camera Name Tooltip Tag on Hover */}
                    <g className={cn("transition-opacity pointer-events-none", isHovered || isSelected ? "opacity-100" : "opacity-0")}>
                      <rect x="-10" y="-8.5" width="20" height="5" rx="1.5" fill="#18181b" stroke="#3f3f46" strokeWidth="0.3" />
                      <text x="0" y="-5.2" textAnchor="middle" className="text-[2.3px] font-mono font-semibold fill-white">
                        {cam.name}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Side Context & Zone Inspector Drawer */}
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
                    {selectedCamera ? "Camera Node Inspector" : "Retail Zone Telemetry"}
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

              {/* Camera Details */}
              {selectedCamera && (
                <div className="space-y-3 text-[13px]">
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

              {/* Zone / Camera Recent Spatial Events Stream */}
              <div className="space-y-2.5">
                <h4 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Live Activity Stream</span>
                </h4>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
