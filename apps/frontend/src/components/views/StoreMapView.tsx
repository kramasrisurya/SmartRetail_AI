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
  const [heatmapIntensity, setHeatmapIntensity] = useState<number>(60);
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

  // Calculate FOV cone polygon coordinates for SVG
  const getFovCone = useCallback(
    (cx: number, cy: number, facingDeg: number = 0, fovDeg: number = 70, length: number = 20) => {
      const angle1 = ((facingDeg - fovDeg / 2 - 90) * Math.PI) / 180;
      const angle2 = ((facingDeg + fovDeg / 2 - 90) * Math.PI) / 180;
      const x1 = cx + length * Math.cos(angle1);
      const y1 = cy + length * Math.sin(angle1);
      const x2 = cx + length * Math.cos(angle2);
      const y2 = cy + length * Math.sin(angle2);
      return `${cx},${cy} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
    },
    []
  );

  const formatPolygon = useCallback((poly: Array<{ x: number; y: number }>) => {
    return poly.map((pt) => `${pt.x},${pt.y}`).join(" ");
  }, []);

  const customerDots = useMemo(() => {
    return [
      { id: 1, x: 22, y: 72, label: "Shopper #101" },
      { id: 2, x: 48, y: 18, label: "Shopper #102" },
      { id: 3, x: 50, y: 104, label: "Shopper #103" },
      { id: 4, x: 78, y: 40, label: "Shopper #104" },
      { id: 5, x: 18, y: 138, label: "Shopper #105" },
    ];
  }, []);

  return (
    <div className="space-y-5 animate-fade-up max-w-7xl mx-auto">
      {/* Top Header & Map Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">
            Floor Plan & Spatial Heatmap
          </h1>
          <p className="text-[14px] text-text-secondary">
            {zones.length} monitored retail zones · {cameras.length} camera viewpoints · 12 live shoppers
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
              <span className="text-text-secondary font-medium">Heatmap</span>
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
            <span>FOV Cones</span>
          </button>
        </div>
      </div>

      {/* Main Area: SVG Floorplan Canvas + Side Context Drawer */}
      <div className="flex flex-col lg:flex-row gap-5 min-h-[560px]">
        {/* SVG Floorplan Canvas Card */}
        <div className="flex-1 rounded-[10px] border border-border bg-card p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[500px] shadow-card">
          <div className="w-full max-w-2xl aspect-[100/150] relative">
            <svg
              viewBox="0 0 100 150"
              className="w-full h-full select-none"
              aria-label="Store Floorplan Interactive SVG"
            >
              {/* Outer boundary wall */}
              <rect
                x="0"
                y="0"
                width="100"
                height="150"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-border"
              />

              {/* Zones Layer: 8% opacity primary fill with 1px stroke */}
              {zones.map((zone) => {
                const isSelected = selectedZone?.id === zone.id;
                return (
                  <g
                    key={zone.id}
                    onClick={() => {
                      setSelectedZone(zone);
                      onSelectCamera(null);
                    }}
                    className="cursor-pointer group"
                  >
                    <polygon
                      points={formatPolygon(zone.polygon)}
                      className={cn(
                        "transition-all duration-200 stroke-1",
                        isSelected
                          ? "fill-primary/20 stroke-primary stroke-[1.5]"
                          : "fill-primary/[0.06] stroke-border/80 hover:fill-primary/[0.12] hover:stroke-primary/50"
                      )}
                    />
                    {zone.polygon[0] && (
                      <text
                        x={(zone.polygon[0].x + zone.polygon[2]?.x) / 2 || zone.polygon[0].x + 5}
                        y={(zone.polygon[0].y + zone.polygon[2]?.y) / 2 || zone.polygon[0].y + 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[3.2px] font-sans font-semibold fill-text-secondary group-hover:fill-foreground pointer-events-none transition-colors"
                      >
                        {zone.name}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Heatmap Dwell Intensity Overlay with Radial Gradients & Blur */}
              {showHeatmap &&
                heatmapCells.map((cell, idx) => (
                  <circle
                    key={idx}
                    cx={cell.x}
                    cy={cell.y}
                    r={7 + cell.intensity * 9}
                    fill={cell.intensity > 0.6 ? "#dc2626" : cell.intensity > 0.3 ? "#d97706" : "#2563eb"}
                    opacity={(cell.intensity * heatmapIntensity) / 140}
                    className="pointer-events-none blur-[3px] transition-opacity duration-300"
                  />
                ))}

              {/* Camera FOV Cones: 5% opacity fill with dashed stroke */}
              {showFovCones &&
                cameras.map((cam) => {
                  if (cam.map_x === null || cam.map_y === null) return null;
                  const isHovered = hoveredCam?.id === cam.id;
                  const isSelected = selectedCamera?.id === cam.id;

                  return (
                    <polygon
                      key={`cone-${cam.id}`}
                      points={getFovCone(cam.map_x, cam.map_y, cam.facing || 0, cam.fov || 65, 22)}
                      strokeDasharray="1 1"
                      className={cn(
                        "pointer-events-none transition-all duration-150",
                        isSelected
                          ? "fill-primary/20 stroke-primary stroke-[0.6]"
                          : isHovered
                          ? "fill-cyan-500/15 stroke-cyan-400 stroke-[0.5]"
                          : "fill-cyan-500/[0.05] stroke-cyan-500/30 stroke-[0.3]"
                      )}
                    />
                  );
                })}

              {/* Live Shopper Dots: 6px circles with 2px white ring and pulse */}
              {customerDots.map((dot) => (
                <g key={dot.id} className="pointer-events-none">
                  <circle cx={dot.x} cy={dot.y} r="2.4" className="fill-emerald-400 animate-pulse-dot" />
                  <circle cx={dot.x} cy={dot.y} r="1" className="fill-white stroke-emerald-600 stroke-[0.3]" />
                </g>
              ))}

              {/* Camera Icon Markers */}
              {cameras.map((cam) => {
                if (cam.map_x === null || cam.map_y === null) return null;
                const isSelected = selectedCamera?.id === cam.id;
                const isHovered = hoveredCam?.id === cam.id;
                const status = getStatusDot(cam.status);

                return (
                  <g
                    key={cam.id}
                    transform={`translate(${cam.map_x}, ${cam.map_y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCamera(cam);
                      setSelectedZone(null);
                    }}
                    onMouseEnter={() => setHoveredCam(cam)}
                    onMouseLeave={() => setHoveredCam(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      r={isSelected ? "3.6" : isHovered ? "3.0" : "2.4"}
                      className={cn(
                        "transition-all duration-150",
                        isSelected
                          ? "fill-primary stroke-background stroke-[1]"
                          : "fill-card stroke-border stroke-[0.8] hover:fill-surface-elevated"
                      )}
                    />
                    <circle
                      r="1.2"
                      className={status.dotClass}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Side Context & Event Log Drawer */}
        {(selectedCamera || selectedZone) && (
          <aside
            role="region"
            aria-label="Spatial Selection Details"
            className="w-full lg:w-88 rounded-[10px] border border-border bg-card p-5 flex flex-col justify-between space-y-4 shadow-card animate-slide-in-right"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <span className="text-[11px] text-text-tertiary uppercase tracking-[0.04em] font-semibold">
                    {selectedCamera ? "Camera Node" : "Store Zone"}
                  </span>
                  <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
                    {selectedCamera ? selectedCamera.name : selectedZone?.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCamera(null);
                    setSelectedZone(null);
                  }}
                  className="p-1 rounded-[6px] text-text-tertiary hover:text-foreground hover:bg-surface-elevated transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedCamera && (
                <div className="space-y-2.5 text-[13px]">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 rounded-[8px] bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-tertiary block font-medium">Status</span>
                      <span className="font-semibold text-foreground capitalize">{selectedCamera.status}</span>
                    </div>
                    <div className="p-2.5 rounded-[8px] bg-surface-elevated border border-border">
                      <span className="text-[11px] text-text-tertiary block font-medium">Target FPS</span>
                      <span className="font-semibold text-foreground">{selectedCamera.fps || 15} FPS</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-surface-elevated border border-border">
                    <span className="text-[11px] text-text-tertiary block font-medium">Telemetry Latency</span>
                    <span className="font-mono font-medium text-foreground">{selectedCamera.latency_ms || 28} ms</span>
                  </div>
                </div>
              )}

              {/* Real-time Zone / Camera Events Stream */}
              <div className="space-y-2.5">
                <h4 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span>Recent Spatial Events</span>
                </h4>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {activeEvents.length === 0 ? (
                    <div className="py-6 text-center text-[13px] text-text-tertiary border border-dashed border-border rounded-[8px]">
                      No active events recorded in this zone.
                    </div>
                  ) : (
                    activeEvents.slice(0, 6).map((ev) => (
                      <div key={ev.id} className="p-2.5 rounded-[8px] border border-border bg-surface-elevated text-[13px]">
                        <div className="font-medium text-foreground capitalize">
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
