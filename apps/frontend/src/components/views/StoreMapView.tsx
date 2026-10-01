import React, { useState, useMemo, useCallback } from "react";
import {
  X,
  Sliders,
  Camera as CameraIcon,
  Video,
  Layers,
  Eye,
  EyeOff,
  User,
  Activity,
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
    (cx: number, cy: number, facingDeg: number = 0, fovDeg: number = 70, length: number = 18) => {
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
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Header & Map Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Floor Plan & Spatial Map</h1>
          <p className="text-xs text-muted-foreground tabular-nums">
            {zones.length} zones · {cameras.length} cameras · 12 live shoppers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Time range selector */}
          <div className="flex items-center rounded-[4px] border border-border bg-background p-0.5" role="group" aria-label="Time range">
            {(["15m", "1h", "24h"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-2 py-0.5 rounded-[3px] text-xs transition",
                  timeRange === r ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Heatmap toggle and slider */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] border border-border bg-background">
            <label className="flex items-center gap-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="rounded-[3px] border-border text-primary focus:ring-0"
              />
              <span className="text-muted-foreground">Heatmap</span>
            </label>
            {showHeatmap && (
              <input
                type="range"
                min="20"
                max="100"
                value={heatmapIntensity}
                onChange={(e) => setHeatmapIntensity(Number(e.target.value))}
                className="w-16 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                aria-label="Heatmap intensity"
              />
            )}
          </div>

          {/* FOV Cones Toggle */}
          <button
            type="button"
            onClick={() => setShowFovCones(!showFovCones)}
            className={cn(
              "px-2 py-1 rounded-[4px] border border-border text-xs transition flex items-center gap-1",
              showFovCones ? "bg-muted text-foreground font-medium" : "bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            {showFovCones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>FOV Cones</span>
          </button>
        </div>
      </div>

      {/* Main Area: SVG Floorplan Canvas + Side Context Drawer */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-[520px]">
        {/* SVG Floorplan Canvas */}
        <div className="flex-1 rounded-lg border border-border bg-card/60 p-4 relative overflow-hidden flex flex-col items-center justify-center min-h-[480px]">
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

              {/* Zones Layer */}
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
                        "transition-all duration-150 stroke-1",
                        isSelected
                          ? "fill-primary/20 stroke-primary stroke-[1.5]"
                          : "fill-muted/30 stroke-border hover:fill-muted/50 hover:stroke-primary/50"
                      )}
                    />
                    {zone.polygon[0] && (
                      <text
                        x={(zone.polygon[0].x + zone.polygon[2]?.x) / 2 || zone.polygon[0].x + 5}
                        y={(zone.polygon[0].y + zone.polygon[2]?.y) / 2 || zone.polygon[0].y + 8}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[3px] font-sans font-medium fill-muted-foreground group-hover:fill-foreground pointer-events-none transition-colors"
                      >
                        {zone.name}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Heatmap Dwell Intensity Overlay */}
              {showHeatmap &&
                heatmapCells.map((cell, idx) => (
                  <circle
                    key={idx}
                    cx={cell.x}
                    cy={cell.y}
                    r={6 + cell.intensity * 8}
                    fill={cell.intensity > 0.6 ? "#ef4444" : cell.intensity > 0.3 ? "#f59e0b" : "#3b82f6"}
                    opacity={(cell.intensity * heatmapIntensity) / 140}
                    className="pointer-events-none blur-[2px] transition-opacity"
                  />
                ))}

              {/* Camera FOV Cones */}
              {showFovCones &&
                cameras.map((cam) => {
                  if (cam.map_x === null || cam.map_y === null) return null;
                  const isHovered = hoveredCam?.id === cam.id;
                  const isSelected = selectedCamera?.id === cam.id;

                  return (
                    <polygon
                      key={`cone-${cam.id}`}
                      points={getFovCone(cam.map_x, cam.map_y, cam.facing || 0, cam.fov || 65, 20)}
                      className={cn(
                        "pointer-events-none transition-all duration-150",
                        isSelected
                          ? "fill-primary/25 stroke-primary/60 stroke-[0.5]"
                          : isHovered
                          ? "fill-cyan-500/20 stroke-cyan-400/50 stroke-[0.5]"
                          : "fill-cyan-500/8 stroke-cyan-500/20 stroke-[0.2]"
                      )}
                    />
                  );
                })}

              {/* Live Shopper Dots */}
              {customerDots.map((dot) => (
                <g key={dot.id} className="pointer-events-none">
                  <circle cx={dot.x} cy={dot.y} r="2" className="fill-emerald-400 animate-pulse" />
                  <circle cx={dot.x} cy={dot.y} r="0.9" className="fill-white" />
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
                      r={isSelected ? "3.2" : isHovered ? "2.8" : "2.2"}
                      className={cn(
                        "transition-all duration-150",
                        isSelected
                          ? "fill-primary stroke-background stroke-[0.8]"
                          : "fill-card stroke-border stroke-[0.6] hover:fill-muted"
                      )}
                    />
                    <circle
                      r="1"
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
            aria-label="Map Selection Details"
            className="w-full lg:w-80 rounded-lg border border-border bg-card p-4 flex flex-col justify-between space-y-4 animate-in slide-in-from-right-4 duration-150"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between border-b border-border pb-2.5">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {selectedCamera ? "Camera Node" : "Store Zone"}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedCamera ? selectedCamera.name : selectedZone?.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCamera(null);
                    setSelectedZone(null);
                  }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {selectedCamera && (
                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-muted/20 border border-border">
                      <span className="text-[10px] text-muted-foreground block">Status</span>
                      <span className="font-medium text-foreground capitalize">{selectedCamera.status}</span>
                    </div>
                    <div className="p-2 rounded bg-muted/20 border border-border">
                      <span className="text-[10px] text-muted-foreground block">Frame Rate</span>
                      <span className="font-medium text-foreground">{selectedCamera.fps || 15} FPS</span>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-muted/20 border border-border">
                    <span className="text-[10px] text-muted-foreground block">Latency & Health</span>
                    <span className="font-mono text-foreground">{selectedCamera.latency_ms || 28} ms</span>
                  </div>
                </div>
              )}

              {/* Real-time Zone / Camera Events */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                  Recent Activity Stream
                </h4>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {activeEvents.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded">
                      No active events in this zone.
                    </div>
                  ) : (
                    activeEvents.slice(0, 5).map((ev) => (
                      <div key={ev.id} className="p-2 rounded border border-border bg-background text-xs">
                        <div className="font-medium text-foreground capitalize">
                          {ev.event_type.replace(/_/g, " ")}
                        </div>
                        <div className="text-[10px] text-muted-foreground tabular-nums">
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
