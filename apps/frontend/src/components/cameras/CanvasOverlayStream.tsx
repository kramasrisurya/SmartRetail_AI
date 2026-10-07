import React, { useEffect, useRef } from "react";
import { OverlayConfig, StreamHudStats } from "../../types";

export interface CanvasTrack {
  id: string;
  label: "Person" | "Product" | "Cart";
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, w, h] in percentages (0-100)
  trail?: Array<[number, number]>; // history points [x, y] in percentages
}

interface CanvasOverlayStreamProps {
  imageSrc: string;
  cameraName: string;
  zoneName: string;
  overlayConfig: OverlayConfig;
  stats: StreamHudStats;
  tracks: CanvasTrack[];
}

export function CanvasOverlayStream({
  imageSrc,
  cameraName,
  zoneName,
  overlayConfig,
  stats,
  tracks,
}: CanvasOverlayStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageRef.current = img;
    };
  }, [imageSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      if (imageRef.current) {
        ctx.drawImage(imageRef.current, 0, 0, w, h);
      } else {
        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, 0, w, h);
      }

      // Draw subtle CCTV grid scanlines
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, w, h);

      // 1. Vector Trails
      if (overlayConfig.vectorTrails) {
        tracks.forEach((t) => {
          if (!t.trail || t.trail.length < 2) return;
          ctx.beginPath();
          ctx.strokeStyle = t.label === "Cart" ? "#f59e0b" : "#06b6d4";
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          t.trail.forEach(([tx, ty], i) => {
            const px = (tx / 100) * w;
            const py = (ty / 100) * h;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // 2. Bounding Boxes
      tracks.forEach((t) => {
        const isPerson = t.label === "Person" && overlayConfig.personBoxes;
        const isProduct = t.label === "Product" && overlayConfig.productBoxes;
        const isCart = t.label === "Cart" && overlayConfig.cartBoxes;
        if (!isPerson && !isProduct && !isCart) return;

        const color = t.label === "Cart" ? "#f59e0b" : t.label === "Product" ? "#818cf8" : "#10b981";
        const bx = (t.bbox[0] / 100) * w;
        const by = (t.bbox[1] / 100) * h;
        const bw = (t.bbox[2] / 100) * w;
        const bh = (t.bbox[3] / 100) * h;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);

        // Corner accents
        const cLen = Math.min(8, bw / 4);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(bx, by + cLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cLen, by);
        ctx.moveTo(bx + bw - cLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cLen);
        ctx.moveTo(bx, by + bh - cLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cLen, by + bh);
        ctx.moveTo(bx + bw - cLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cLen);
        ctx.stroke();

        // Label pill
        ctx.fillStyle = color;
        ctx.fillRect(bx, by - 16, Math.max(70, ctx.measureText(`${t.label} #${t.id}`).width + 8), 16);
        ctx.fillStyle = "#000000";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`${t.label} #${t.id} ${Math.round(t.confidence * 100)}%`, bx + 3, by - 4);
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [overlayConfig, tracks]);

  return (
    <div className="relative w-full aspect-video bg-zinc-950 overflow-hidden select-none">
      <canvas ref={canvasRef} width={640} height={360} className="w-full h-full object-cover" />

      {/* Floating HUD per stream */}
      {overlayConfig.fpsHud && (
        <div className="absolute top-2 right-2 bg-zinc-950/80 backdrop-blur-xs border border-zinc-800 rounded px-2 py-1 font-mono text-[10px] text-zinc-300 pointer-events-none flex items-center gap-2">
          <span className="text-emerald-400 font-bold">{stats.fps} FPS</span>
          <span className="text-zinc-600">|</span>
          <span className="text-cyan-400">{stats.inferenceMs}ms inf</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">drop: {stats.droppedFrames}</span>
        </div>
      )}

      {/* Camera identification header */}
      <div className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur-xs border border-zinc-800 rounded px-2 py-1 font-mono text-[10px] text-zinc-300 pointer-events-none flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold text-white">{cameraName}</span>
        <span className="text-zinc-500 truncate max-w-[120px]">[{zoneName}]</span>
      </div>
    </div>
  );
}

export default CanvasOverlayStream;
