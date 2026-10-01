import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
} from "lucide-react";
import { TimelineItem } from "../../types";
import { api } from "../../lib/api";
import { cn } from "../../lib/utils";

const SAMPLE_JOURNEYS = [
  {
    key: "shopper-17:B222",
    title: "Shopper #17 (Milk 1L Concealment)",
    risk: "Urgent",
    duration: "25 min dwell",
  },
  {
    key: "shopper-23:E005",
    title: "Shopper #23 (Self-Checkout Skip)",
    risk: "High",
    duration: "18 min dwell",
  },
  {
    key: "shopper-31:RESTRICTED",
    title: "Shopper #31 (Staff Office Entry)",
    risk: "Medium",
    duration: "12 min dwell",
  },
  {
    key: "shopper-42:G702",
    title: "Shopper #42 (Cosmetics Quick Sweep)",
    risk: "Urgent",
    duration: "8 min dwell",
  },
];

export function JourneysView() {
  const [selectedKey, setSelectedKey] = useState(SAMPLE_JOURNEYS[0].key);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scrubberIndex, setScrubberIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchTimeline() {
      setLoading(true);
      try {
        const data = await api.getTimeline(selectedKey);
        if (isMounted) {
          setTimeline(data);
          setScrubberIndex(0);
          setIsPlaying(false);
        }
      } catch (err) {
        console.error("Failed to load timeline", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchTimeline();
    return () => {
      isMounted = false;
    };
  }, [selectedKey]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeline.length > 0) {
      timer = setInterval(() => {
        setScrubberIndex((prev) => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeline.length]);

  const activeStep = timeline[scrubberIndex] || timeline[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Journey Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Customer journeys</h1>
          <p className="text-xs text-muted-foreground">
            Multi-camera tracking and sequence reconstruction
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Subject:</span>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="px-2.5 py-1 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none"
          >
            {SAMPLE_JOURNEYS.map((j) => (
              <option key={j.key} value={j.key}>
                {j.title} ({j.risk})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Scrubber and Trajectory Player */}
      <div className="border border-border rounded-[6px] bg-background p-4 space-y-5">
        {/* Playback bar & Timecode */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-[4px] border border-border hover:bg-muted text-foreground transition text-xs flex items-center gap-1.5"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause" : "Play sequence"}</span>
            </button>
            <button
              onClick={() => {
                setScrubberIndex(0);
                setIsPlaying(false);
              }}
              className="p-1.5 rounded-[4px] border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs text-muted-foreground font-mono tabular-nums">
            Step {scrubberIndex + 1} of {Math.max(1, timeline.length)}
          </div>
        </div>

        {/* Horizontal Timeline Scrubber */}
        <div className="relative py-4">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
          <div className="relative flex justify-between items-center">
            {timeline.map((step, idx) => {
              const isActive = idx === scrubberIndex;
              const isPast = idx < scrubberIndex;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setScrubberIndex(idx);
                    setIsPlaying(false);
                  }}
                  className="group flex flex-col items-center focus:outline-none"
                >
                  <div
                    className={cn(
                      "w-3 h-3 rounded-full border transition-all z-10",
                      isActive
                        ? "bg-foreground border-foreground scale-125 ring-2 ring-background"
                        : isPast
                        ? "bg-muted-foreground/60 border-muted-foreground"
                        : "bg-background border-border group-hover:border-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "mt-2 text-[11px] max-w-[90px] text-center truncate transition",
                      isActive ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Step Evidence Preview */}
        {activeStep && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border text-xs">
            <div className="aspect-video rounded-[4px] border border-border bg-zinc-950 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-8 border border-sky-400/80 bg-sky-500/5 rounded-sm" />
              <span className="font-mono text-xs text-zinc-400 z-10">
                Camera {activeStep.camera_id || 1} · {activeStep.label}
              </span>
            </div>

            <div className="p-3 rounded-[4px] border border-border bg-muted/20 space-y-2">
              <span className="text-[11px] font-medium text-muted-foreground block">Event details</span>
              <div className="font-medium text-foreground text-sm">{activeStep.label}</div>
              <div className="text-muted-foreground text-xs leading-relaxed">
                Sequence node captured on Camera {activeStep.camera_id || 1}. Track position vector verified across handoff boundary.
              </div>
              <div className="pt-2 text-[11px] text-muted-foreground font-mono">
                Relative position: #{activeStep.position}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default JourneysView;
