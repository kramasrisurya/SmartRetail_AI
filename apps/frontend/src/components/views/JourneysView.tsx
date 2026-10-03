import React, { useState, useEffect, useMemo } from "react";
import { Play, Pause, RotateCcw, Footprints, ShieldAlert, Clock, Video, Sparkles } from "lucide-react";
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
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-up">
      {/* Header & Journey Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Customer Journey Reconstruction</h1>
          <p className="text-[14px] text-text-secondary">
            Multi-camera cross-zone spatial path tracking & temporal playback
          </p>
        </div>

        <div className="flex items-center gap-3 text-[13px]">
          <label htmlFor="subject-select" className="text-text-secondary font-medium">Subject Journey:</label>
          <select
            id="subject-select"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="px-3 py-1.5 rounded-[8px] border border-border bg-card text-foreground text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
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
          <Skeleton className="h-28 w-full rounded-[10px]" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-[10px]" />
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
          <div className="p-5 rounded-[10px] border border-border bg-card shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  aria-label={isPlaying ? "Pause timeline playback" : "Play timeline playback"}
                  className="p-2.5 rounded-[8px] bg-primary text-primary-foreground hover:bg-primary-hover transition shadow-xs"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setScrubberIndex(0)}
                  aria-label="Restart timeline to beginning"
                  className="p-2.5 rounded-[8px] border border-border bg-surface-elevated hover:bg-muted text-foreground transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <div className="text-[13px]">
                  <span className="font-semibold text-foreground">
                    Step {scrubberIndex + 1} of {timeline.length}:
                  </span>{" "}
                  <span className="text-text-secondary">{activeStep?.label}</span>
                </div>
              </div>

              <span className="text-[12px] font-mono text-text-tertiary tabular-nums">
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
              className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Sequential Step Timeline */}
          <div className="relative border-l-2 border-border ml-5 pl-7 space-y-6">
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
                    "relative p-4 rounded-[10px] border transition-all duration-200 cursor-pointer shadow-card",
                    isActive
                      ? "border-primary bg-primary/[0.06] ring-2 ring-primary/30 shadow-card-hover"
                      : isPast
                      ? "border-border/60 bg-card/60 opacity-80"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  {/* Step dot on vertical line */}
                  <span
                    className={cn(
                      "absolute -left-[37px] top-5 w-4 h-4 rounded-full border-2 border-background transition-colors",
                      isActive ? "bg-primary animate-pulse-dot" : isPast ? "bg-text-tertiary" : "bg-border"
                    )}
                    aria-hidden="true"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1.5">
                    <div className="font-semibold text-[14px] text-foreground flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text-tertiary font-bold">#{idx + 1}</span>
                      <span>{step.label}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[12px] text-text-tertiary font-mono">
                      {step.camera_id && (
                        <span className="flex items-center gap-1.5 text-text-secondary">
                          <Video className="w-3.5 h-3.5 text-primary" /> CAM-0{step.camera_id}
                        </span>
                      )}
                      {step.confidence && (
                        <span className="font-medium text-text-secondary">
                          ({Math.round(step.confidence * 100)}% conf)
                        </span>
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
