import { useQuery, useMutation, queryClient } from "../lib/queryClient";
import { api } from "../lib/api";
import { Alert, AlertActionType, BootstrapData, Camera, EventItem, HeatmapResponse, TimelineItem, Zone } from "../types";
import { useAppStore } from "../store/useAppStore";
import { toast } from "../store/useToastStore";

export function useBootstrapQuery() {
  return useQuery<BootstrapData>(
    "bootstrap",
    async () => {
      return api.getBootstrap().catch(() => ({ zones: [], cameras: [] }));
    },
    {
      staleTime: 60000, // Static floorplan/cameras change rarely
      refetchInterval: 30000,
    }
  );
}

export function useAlertsQuery() {
  const token = useAppStore((s) => s.session?.token);

  return useQuery<Alert[]>(
    ["alerts", token],
    async () => {
      if (!token) return [];
      return api.getAlerts().catch(() => []);
    },
    {
      enabled: !!token,
      staleTime: 4000,
      refetchInterval: 8000, // Live poll alerts every 8s
    }
  );
}

export function useEventsQuery(limit: number = 50) {
  return useQuery<EventItem[]>(
    ["events", limit],
    async () => {
      return api.getEvents(limit).catch(() => []);
    },
    {
      staleTime: 4000,
      refetchInterval: 8000,
    }
  );
}

export function useHeatmapQuery() {
  return useQuery<HeatmapResponse>(
    "heatmap",
    async () => {
      return api.getHeatmap().catch(() => ({ cells: [] }));
    },
    {
      staleTime: 10000,
      refetchInterval: 15000,
    }
  );
}

export function useTimelineQuery(subjectKey: string | null) {
  return useQuery<TimelineItem[]>(
    ["timeline", subjectKey],
    async () => {
      if (!subjectKey) return [];
      return api.getTimeline(subjectKey).catch(() => []);
    },
    {
      enabled: !!subjectKey,
      staleTime: 5000,
    }
  );
}

export function useAlertActionMutation() {
  const user = useAppStore((s) => s.session?.user) || "admin";

  return useMutation(
    async ({
      alertId,
      action,
      note,
    }: {
      alertId: number;
      action: AlertActionType;
      note?: string;
    }) => {
      return api.actOnAlert(alertId, action, user, note);
    },
    {
      onSuccess: (data, variables) => {
        toast.success(`Incident #${variables.alertId} marked as ${variables.action.replace("_", " ")}`);
        // Invalidate alerts query for fresh refetch
        queryClient.invalidateQueries("alerts");
      },
      onError: (err, variables) => {
        toast.error(`Failed to update Incident #${variables.alertId}: ${err.message}`);
      },
    }
  );
}
