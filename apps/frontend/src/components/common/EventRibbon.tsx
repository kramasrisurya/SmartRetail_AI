import React, { useMemo } from "react";
import { ShieldAlert, Activity, ChevronRight, BellRing } from "lucide-react";
import { useAlertsQuery, useEventsQuery } from "../../hooks/useDashboardQueries";
import { ViewTab } from "../../types";
import { formatTimeAgo } from "../../lib/utils";

interface EventRibbonProps {
  onNavigate: (tab: ViewTab) => void;
}

export function EventRibbon({ onNavigate }: EventRibbonProps) {
  const { data: alerts = [] } = useAlertsQuery();
  const { data: events = [] } = useEventsQuery(10);

  const urgentAlert = useMemo(() => {
    return alerts.find((a) => a.status === "open" && (a.priority === "urgent" || a.priority === "high"));
  }, [alerts]);

  const latestEvent = useMemo(() => events[0], [events]);

  return (
    <div className="h-8 min-h-[32px] bg-zinc-900/90 border-b border-zinc-800 px-3 sm:px-4 flex items-center justify-between text-[11px] font-mono tracking-tight text-zinc-300 overflow-hidden">
      <div className="flex items-center gap-3 overflow-hidden truncate">
        {urgentAlert ? (
          <div
            onClick={() => onNavigate("alerts")}
            className="flex items-center gap-2 text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded cursor-pointer hover:bg-rose-900/50 transition-colors"
          >
            <ShieldAlert className="w-3 h-3 text-rose-400 animate-pulse shrink-0" />
            <span className="font-bold uppercase tracking-wider text-[10px]">CRITICAL FLAG</span>
            <span className="truncate max-w-[280px] sm:max-w-md font-sans text-rose-200">
              {urgentAlert.title || urgentAlert.summary || `Alert #${urgentAlert.id}`}
            </span>
            <span className="text-rose-400 font-mono tabular-nums">
              [{Math.round(urgentAlert.confidence * 100)}%]
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-[10px] text-zinc-400 uppercase">SYS TELEMETRY</span>
          </div>
        )}

        {latestEvent && (
          <div className="hidden md:flex items-center gap-2 text-zinc-400 truncate">
            <span className="text-zinc-600">|</span>
            <Activity className="w-3 h-3 text-zinc-500 shrink-0" />
            <span className="text-zinc-300">{latestEvent.event_type.replace("_", " ")}</span>
            <span className="text-zinc-500 tabular-nums">CAM-{String(latestEvent.camera_id || 1).padStart(2, "0")}</span>
            <span className="text-zinc-500">{formatTimeAgo(latestEvent.event_timestamp)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => onNavigate("alerts")}
          className="flex items-center gap-1 text-zinc-400 hover:text-cyan-400 transition-colors"
        >
          <BellRing className="w-3 h-3" />
          <span className="hidden sm:inline">Review Queue</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default EventRibbon;
