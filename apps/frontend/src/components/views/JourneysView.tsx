import React, { useState, useEffect, useMemo } from "react";
import { Play, Pause, RotateCcw, Footprints, ShieldAlert, Clock, Video } from "lucide-react";
import { useTimelineQuery } from "../../hooks/useDashboardQueries";
import { cn, formatTimeAgo } from "../../lib/utils";
import { EmptyState } from "../common/EmptyState";
import { Skeleton } from "../common/Skeleton";

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
  const [scrubberIndex, setScrubberIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const { data: timeline = [], isLoading } = useTimelineQuery(selectedKey);

  useEffect(() => {
    setScrubberIndex(0);
    setIsPlaying(false);
  }, [selectedKey]);

  useEffect(() => {
    let timer: number | undefined;
    if (isPlaying && timeline.length > 0) {
      timer = window.setInterval(() => {
        setScrubberIndex((prev) => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timeline.length]);

  const activeStep = useMemo(() => {
    return timeline[scrubberIndex] || timeline[0];
  }, [timeline, scrubberIndex]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header & Journey Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h1 className="text-base font-semibold text-foreground tracking-tight">Customer Journeys</h1>
          <p className="text-xs text-muted-foreground">
            Multi-camera spatial path tracking & temporal reconstruction
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="subject-select" className="text-muted-foreground">Subject Journey:</label>
          <select
            id="subject-select"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="px-2.5 py-1.5 rounded-[4px] border border-border bg-background text-foreground text-xs focus:outline-none focus:border-foreground"
          >
            {SAMPLE_JOURNEYS.map((j) => (
              <option key={j.key} value={j.key}>
                {j.title} · {j.risk}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ) : timeline.length === 0 ? (
        <EmptyState
          icon={Footprints}
          title="No Sequence Records Found"
          description="There are currently no recorded multi-camera steps for the selected subject key."
        />
      ) : (
        <div className="space-y-6">
          {/* Playback Controls & Timeline Scrubber Bar */}
          <div className="p-4 rounded-lg border border-border bg-card shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? "Pause timeline playback" : "Play timeline playback"}
                  className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setScrubberIndex(0)}
                  aria-label="Restart timeline to beginning"
                  className="p-2 rounded-md border border-border hover:bg-muted text-foreground transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="text-xs">
                  <span className="font-semibold text-foreground">
                    Step {scrubberIndex + 1} of {timeline.length}:
                  </span>{" "}
                  <span className="text-muted-foreground">{activeStep?.label}</span>
                </div>
              </div>

              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                {activeStep?.ts ? formatTimeAgo(activeStep.ts) : "Recorded Step"}
              </span>
            </div>

            {/* Scrubber slider */}
            <input
              type="range"
              min="0"
              max={Math.max(0, timeline.length - 1)}
              value={scrubberIndex}
              onChange={(e) => {
                setScrubberIndex(Number(e.target.value));
                setIsPlaying(false);
              }}
              aria-label="Timeline scrubber position"
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Sequential Step Timeline */}
          <div className="relative border-l-2 border-border ml-4 pl-6 space-y-6">
            {timeline.map((step, idx) => {
              const isActive = idx === scrubberIndex;
              const isPast = idx < scrubberIndex;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setScrubberIndex(idx);
                    setIsPlaying(false);
                  }}
                  className={cn(
                    "relative p-4 rounded-lg border transition-all cursor-pointer",
                    isActive
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                      : isPast
                      ? "border-border/60 bg-card/40 opacity-80"
                      : "border-border bg-card hover:border-border/80"
                  )}
                >
                  {/* Step dot on vertical line */}
                  <span
                    className={cn(
                      "absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full border-2 border-background transition-colors",
                      isActive ? "bg-primary" : isPast ? "bg-muted-foreground" : "bg-border"
                    )}
                    aria-hidden="true"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="font-medium text-xs text-foreground flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground">#{idx + 1}</span>
                      <span>{step.label}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                      {step.camera_id && (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" /> CAM-0{step.camera_id}
                        </span>
                      )}
                      {step.confidence && (
                        <span>({Math.round(step.confidence * 100)}% conf)</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default JourneysView;
