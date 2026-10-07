import React, { useState, useEffect, useMemo } from "react";
import { CanvasOverlayStream, CanvasTrack } from "./CanvasOverlayStream";
import { Camera, OverlayConfig, StreamHudStats } from "../../types";
import { Sliders, Maximize2, Minimize2, Video, Crosshair, Cpu } from "lucide-react";

interface MultiCameraMatrixProps {
  cameras: Camera[];
}

const DEFAULT_OVERLAYS: OverlayConfig = {
  personBoxes: true,
  productBoxes: true,
  cartBoxes: true,
  vectorTrails: true,
  interactionZones: true,
  fpsHud: true,
};

const SAMPLE_TRACKS: Record<number, CanvasTrack[]> = {
  1: [
    { id: "101", label: "Person", confidence: 0.98, bbox: [35, 20, 16, 55], trail: [[25, 22], [28, 21], [32, 20], [35, 20]] },
    { id: "P22", label: "Product", confidence: 0.94, bbox: [46, 32, 7, 10] },
  ],
  2: [
    { id: "104", label: "Person", confidence: 0.96, bbox: [40, 24, 18, 58], trail: [[30, 26], [35, 25], [40, 24]] },
    { id: "C08", label: "Cart", confidence: 0.91, bbox: [58, 48, 14, 22] },
  ],
  3: [
    { id: "109", label: "Person", confidence: 0.97, bbox: [42, 30, 15, 52], trail: [[42, 45], [42, 38], [42, 30]] },
  ],
};

export function MultiCameraMatrix({ cameras }: MultiCameraMatrixProps) {
  const [channels, setChannels] = useState<1 | 4 | 6>(4);
  const [overlays, setOverlays] = useState<OverlayConfig>(DEFAULT_OVERLAYS);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [clock, setClock] = useState<string>("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const visibleCameras = useMemo(() => {
    if (focusedId !== null) return cameras.filter((c) => c.id === focusedId);
    return cameras.slice(0, channels);
  }, [cameras, focusedId, channels]);

  return (
    <div className="space-y-3 font-sans">
      {/* Matrix Controls Dock */}
      <div className="h-10 bg-zinc-900 border border-zinc-800 rounded px-3 flex items-center justify-between text-xs text-zinc-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-mono text-cyan-400 font-bold">
            <Video className="w-3.5 h-3.5" />
            <span>GRID MATRIX</span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="font-mono text-zinc-400 tabular-nums">{clock}</span>
        </div>

        {/* Overlays toggle dock */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOverlays((o) => ({ ...o, personBoxes: !o.personBoxes }))}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
              overlays.personBoxes ? "bg-emerald-950 text-emerald-400 border-emerald-800" : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}
          >
            PERSON
          </button>
          <button
            type="button"
            onClick={() => setOverlays((o) => ({ ...o, productBoxes: !o.productBoxes }))}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
              overlays.productBoxes ? "bg-indigo-950 text-indigo-400 border-indigo-800" : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}
          >
            SKU
          </button>
          <button
            type="button"
            onClick={() => setOverlays((o) => ({ ...o, cartBoxes: !o.cartBoxes }))}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
              overlays.cartBoxes ? "bg-amber-950 text-amber-400 border-amber-800" : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}
          >
            CART
          </button>
          <button
            type="button"
            onClick={() => setOverlays((o) => ({ ...o, vectorTrails: !o.vectorTrails }))}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
              overlays.vectorTrails ? "bg-cyan-950 text-cyan-400 border-cyan-800" : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}
          >
            TRAILS
          </button>
          <button
            type="button"
            onClick={() => setOverlays((o) => ({ ...o, fpsHud: !o.fpsHud }))}
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
              overlays.fpsHud ? "bg-purple-950 text-purple-400 border-purple-800" : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}
          >
            HUD
          </button>

          {/* Grid layout toggles */}
          <div className="flex items-center gap-1 ml-2 border-l border-zinc-700 pl-2">
            {([1, 4, 6] as const).map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => { setFocusedId(null); setChannels(count); }}
                className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                  channels === count && focusedId === null ? "bg-cyan-500 text-black font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                {count}CH
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Canvas Viewports */}
      <div className={`grid gap-3 ${focusedId !== null || channels === 1 ? "grid-cols-1" : channels === 4 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
        {visibleCameras.map((cam, idx) => (
          <div key={cam.id} className="border border-zinc-800 rounded bg-zinc-950 overflow-hidden relative group">
            <CanvasOverlayStream
              imageSrc={`/cameras/store1/cam${Math.min(6, (idx % 6) + 1)}.jpg`}
              cameraName={cam.name}
              zoneName={cam.location || `Zone ${cam.zone_id || 1}`}
              overlayConfig={overlays}
              stats={{ fps: cam.fps || 30, droppedFrames: 0, latencyMs: cam.latency_ms || 22, inferenceMs: 14, activeTrackCount: 2 }}
              tracks={SAMPLE_TRACKS[cam.id] || SAMPLE_TRACKS[1]}
            />
            <button
              type="button"
              onClick={() => setFocusedId(focusedId === cam.id ? null : cam.id)}
              className="absolute bottom-2 right-2 p-1.5 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition"
              title="Toggle channel fullscreen"
            >
              {focusedId === cam.id ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MultiCameraMatrix;
