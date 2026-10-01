import React, { useState } from "react";
import {
  X,
  Sliders,
  Camera as CameraIcon,
  Video,
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

  // Filter events for the side drawer
  const activeEvents = events.filter((e) => {
    if (selectedCamera) return e.camera_id === selectedCamera.id;
    if (selectedZone) {
      const zName = selectedZone.name.toLowerCase();
      const payloadStr = JSON.stringify(e.payload).toLowerCase();
      return payloadStr.includes(zName);
    }
    return false;
  });

  // Calculate FOV cone polygon coordinates for SVG
  const getFovCone = (cx: number, cy: number, facingDeg: number = 0, fovDeg: number = 70, length: number = 18) => {
    const angle1 = ((facingDeg - fovDeg / 2 - 90) * Math.PI) / 180;
    const angle2 = ((facingDeg + fovDeg / 2 - 90) * Math.PI) / 180;
    const x1 = cx + length * Math.cos(angle1);
    const y1 = cy + length * Math.sin(angle1);
    const x2 = cx + length * Math.cos(angle2);
    const y2 = cy + length * Math.sin(angle2);
    return `${cx},${cy} ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  };

  // Convert zone polygon array to SVG polygon string
  const formatPolygon = (poly: Array<{ x: number; y: number }>) => {
    return poly.map((pt) => `${pt.x},${pt.y}`).join(" ");
  };

  // Simulated real-time customer positions on floorplan
  const customerDots = [
    { id: 1, x: 22, y: 72, label: "Shopper #1" },
    { id: 2, x: 48, y: 18, label: "Shopper #2" },
    { id: 3, x: 50, y: 104, label: "Shopper #3" },
    { id: 4, x: 78, y: 40, label: "Shopper #4" },
    { id: 5, x: 18, y: 138, label: "Shopper #5" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header & Map Controls (Sitting directly on the page) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Floor plan & cameras</h1>
          <p className="text-xs text-muted-foreground">
            {zones.length} zones · {cameras.length} cameras · 12 live shoppers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Time range selector */}
          <div className="flex items-center rounded-[4px] border border-border bg-background p-0.5">
            {(["15m", "1h", "24h"] as const).map((r) => (
              <button
                key={r}
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
                className="rounded-[3px] border-border text-foreground focus:ring-0"
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
                className="w-16 h-1 accent-foreground"
                title={`Intensity ${heatmapIntensity}%`}
              />
            )}
          </div>

          {/* FOV Cone toggle */}
          <label className="flex items-center gap-1 px-2 py-1 rounded-[4px] border border-border bg-background cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showFovCones}
              onChange={(e) => setShowFovCones(e.target.checked)}
              className="rounded-[3px] border-border text-foreground focus:ring-0"
            />
            <span className="text-muted-foreground">Camera FOV</span>
          </label>
        </div>
      </div>

      {/* Main Floor Plan SVG Canvas Container with optional right inspection drawer */}
      <div className="flex gap-4">
        {/* Floorplan SVG Container */}
        <div className="flex-1 border border-border rounded-[6px] bg-background p-2 sm:p-4 overflow-hidden relative">
          <svg
            viewBox="0 0 100 155"
            className="w-full h-auto max-h-[70vh] mx-auto select-none"
            style={{ shapeRendering: "geometricPrecision" }}
          >
            <defs>
              {/* Subtle hatched pattern for restricted storage zones */}
              <pattern id="restrictedHatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground/20" />
              </pattern>
            </defs>

            {/* Store Exterior Perimeter boundary */}
            <rect
              x="0"
              y="0"
              width="100"
              height="155"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              className="text-border"
            />

            {/* Zones */}
            {zones.map((zone) => {
              const isSelected = selectedZone?.id === zone.id;
              const isRestricted = zone.type === "restricted" || zone.type === "storage";
              const isCheckout = zone.type === "checkout";
              const isEntrance = zone.type === "entrance" || zone.type === "exit";

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
                    fill={
                      isRestricted
                        ? "url(#restrictedHatch)"
                        : isSelected
                        ? "currentColor"
                        : "currentColor"
                    }
                    className={cn(
                      "transition-colors",
                      isSelected
                        ? "text-muted/80"
                        : isCheckout
                        ? "text-blue-500/5 hover:text-blue-500/10"
                        : isEntrance
                        ? "text-emerald-500/5 hover:text-emerald-500/10"
                        : "text-muted/30 hover:text-muted/60"
                    )}
                    stroke="currentColor"
                    strokeWidth={isSelected ? "0.8" : "0.4"}
                  />

                  {/* Clean, Non-Overlapping Zone Labels positioned at zone top-left */}
                  {zone.polygon[0] && (
                    <text
                      x={zone.polygon[0].x + 1.2}
                      y={zone.polygon[0].y + 3.8}
                      fontSize="2.4"
                      fontWeight="500"
                      className="fill-muted-foreground select-none pointer-events-none"
                    >
                      {zone.name}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Heatmap Layer (Subtle density gradient dots) */}
            {showHeatmap &&
              heatmapCells.map((cell, idx) => (
                <circle
                  key={idx}
                  cx={cell.x}
                  cy={cell.y}
                  r={2.5 + cell.intensity * 2.5}
                  fill={cell.intensity > 0.6 ? "#f59e0b" : cell.intensity > 0.3 ? "#3b82f6" : "#10b981"}
                  opacity={(cell.intensity * 0.4 * (heatmapIntensity / 100)).toFixed(2)}
                  className="pointer-events-none"
                />
              ))}

            {/* Cameras with Field-of-View cones */}
            {cameras.map((cam) => {
              if (cam.map_x === null || cam.map_y === null) return null;
              const isSelected = selectedCamera?.id === cam.id;
              const isHovered = hoveredCam?.id === cam.id;
              const isFaulted = cam.status === "faulted";
              const isDegraded = cam.status === "degraded";

              return (
                <g
                  key={cam.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCamera(cam);
                    setSelectedZone(null);
                  }}
                  onMouseEnter={() => setHoveredCam(cam)}
                  onMouseLeave={() => setHoveredCam(null)}
                  className="cursor-pointer"
                >
                  {/* Field of View Cone */}
                  {showFovCones && (
                    <polygon
                      points={getFovCone(cam.map_x, cam.map_y, cam.facing || 0, cam.fov || 65, 18)}
                      fill={isFaulted ? "#ef4444" : isDegraded ? "#f59e0b" : "#3b82f6"}
                      opacity={isSelected || isHovered ? "0.22" : "0.08"}
                      stroke={isFaulted ? "#ef4444" : isDegraded ? "#f59e0b" : "#3b82f6"}
                      strokeWidth="0.2"
                      className="pointer-events-none transition-opacity"
                    />
                  )}

                  {/* Camera Marker Dot */}
                  <circle
                    cx={cam.map_x}
                    cy={cam.map_y}
                    r={isSelected || isHovered ? "2.2" : "1.6"}
                    className={cn(
                      "transition-all stroke-background",
                      isFaulted ? "fill-red-500" : isDegraded ? "fill-amber-500" : "fill-foreground"
                    )}
                    strokeWidth="0.5"
                  />

                  {/* Camera Label shown strictly on hover or when selected */}
                  {(isHovered || isSelected) && (
                    <g transform={`translate(${cam.map_x}, ${cam.map_y - 3})`}>
                      <rect
                        x="-10"
                        y="-4.5"
                        width="20"
                        height="4"
                        rx="1"
                        className="fill-foreground"
                      />
                      <text
                        x="0"
                        y="-1.8"
                        textAnchor="middle"
                        fontSize="2.1"
                        fontWeight="600"
                        className="fill-background select-none pointer-events-none"
                      >
                        {cam.name}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Live Person Dots */}
            {customerDots.map((dot) => (
              <circle
                key={dot.id}
                cx={dot.x}
                cy={dot.y}
                r="1.2"
                className="fill-foreground opacity-80"
              />
            ))}
          </svg>

          {/* Minimal Map Legend */}
          <div className="absolute bottom-2 left-3 flex items-center gap-3 text-[11px] text-muted-foreground bg-background/90 px-2 py-1 rounded border border-border">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground" /> Camera
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Degraded
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Offline
            </span>
          </div>
        </div>

        {/* Right Inspection Drawer for Selected Camera or Zone */}
        {(selectedCamera || selectedZone) && (
          <aside className="w-72 sm:w-80 border border-border rounded-[6px] bg-background p-4 flex flex-col justify-between shrink-0 animate-in slide-in-from-right-2 duration-150">
            <div className="space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    {selectedCamera ? "Camera Node" : "Store Zone"}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">
                    {selectedCamera?.name || selectedZone?.name}
                  </h3>
                </div>
                <button
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
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-[4px] border border-border bg-muted/20">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDot(selectedCamera.status).dotClass)} />
                      {getStatusDot(selectedCamera.status).label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-[4px] border border-border bg-muted/20">
                      <span className="text-[10px] text-muted-foreground block">Frame rate</span>
                      <span className="font-medium text-foreground font-mono">{selectedCamera.fps || 24} fps</span>
                    </div>
                    <div className="p-2 rounded-[4px] border border-border bg-muted/20">
                      <span className="text-[10px] text-muted-foreground block">Network latency</span>
                      <span className="font-medium text-foreground font-mono">{selectedCamera.latency_ms || 32} ms</span>
                    </div>
                  </div>

                  {/* Feed snapshot thumbnail */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-muted-foreground block">Live camera view</span>
                    <div className="aspect-video rounded-[4px] border border-border bg-zinc-900 flex items-center justify-center text-zinc-500 font-mono text-[11px]">
                      {selectedCamera.name} Feed (1080p)
                    </div>
                  </div>
                </div>
              )}

              {selectedZone && (
                <div className="space-y-3 text-xs">
                  <div className="p-2 rounded-[4px] border border-border bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Zone classification</span>
                    <span className="font-medium text-foreground capitalize">{selectedZone.type}</span>
                  </div>
                  <div className="p-2 rounded-[4px] border border-border bg-muted/20">
                    <span className="text-[10px] text-muted-foreground block">Current dwell average</span>
                    <span className="font-medium text-foreground font-mono">1 min 45 sec</span>
                  </div>
                </div>
              )}

              {/* Recent events in this entity */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-muted-foreground block">Recent detections</span>
                <div className="space-y-1 text-xs max-h-36 overflow-y-auto">
                  {activeEvents.slice(0, 4).map((ev) => (
                    <div key={ev.id} className="p-1.5 rounded-[4px] border border-border bg-muted/20 flex items-center justify-between">
                      <span className="truncate max-w-[150px] text-foreground">{ev.event_type.replace(/_/g, " ")}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{formatTimeAgo(ev.event_timestamp)}</span>
                    </div>
                  ))}
                  {activeEvents.length === 0 && (
                    <span className="text-muted-foreground text-xs block py-2">No recent events recorded.</span>
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
