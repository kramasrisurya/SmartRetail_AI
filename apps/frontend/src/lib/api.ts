import {
  Alert,
  AlertActionResponse,
  AlertActionType,
  AssistantMessage,
  AssistantResponse,
  AuditLogEntry,
  BootstrapData,
  Camera,
  EventItem,
  HeatmapResponse,
  LoginResponse,
  TimelineItem,
} from "../types";

const API_BASE = "/api/v1";

export class ApiClient {
  private getToken(): string {
    return sessionStorage.getItem("storesight_token") || "";
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as {
        detail?: string;
        message?: string;
      };
      const message =
        errData.detail || errData.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    return this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async getBootstrap(): Promise<BootstrapData> {
    return this.request<BootstrapData>("/dashboard/bootstrap");
  }

  async getAlerts(status?: string): Promise<Alert[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<Alert[]>(`/dashboard/alerts${query}`);
  }

  async actOnAlert(
    alertId: number,
    action: AlertActionType,
    user: string,
    note?: string
  ): Promise<AlertActionResponse> {
    const query = `action=${encodeURIComponent(action)}&user=${encodeURIComponent(
      user
    )}&note=${encodeURIComponent(note || "")}`;
    return this.request<AlertActionResponse>(`/dashboard/alerts/${alertId}/action?${query}`, {
      method: "POST",
    });
  }

  async getTimeline(subjectKey: string): Promise<TimelineItem[]> {
    return this.request<TimelineItem[]>(`/journeys/${encodeURIComponent(subjectKey)}/timeline`);
  }

  async getHeatmap(): Promise<HeatmapResponse> {
    return this.request<HeatmapResponse>("/analytics/heatmap");
  }

  async getEvents(limit: number = 30): Promise<EventItem[]> {
    return this.request<EventItem[]>(`/events?limit=${limit}`);
  }

  async askAssistant(
    question: string,
    history?: AssistantMessage[]
  ): Promise<AssistantResponse> {
    return this.request<AssistantResponse>("/reports/assistant", {
      method: "POST",
      body: JSON.stringify({ question, history: history || [] }),
    });
  }

  async getAuditLog(limit: number = 50): Promise<AuditLogEntry[]> {
    return this.request<AuditLogEntry[]>(`/audit-log?limit=${limit}`);
  }

  async getCameras(): Promise<Camera[]> {
    interface RawCameraResponse {
      id: number;
      name: string;
      status: "active" | "degraded" | "faulted" | "disabled" | "removed";
      map_x: number | null;
      map_y: number | null;
      facing_direction: number | null;
      field_of_view: number | null;
      fps?: number;
      location?: string | null;
      zone_id?: number | null;
    }

    const data = await this.request<RawCameraResponse[]>("/cameras");
    return data.map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      map_x: c.map_x,
      map_y: c.map_y,
      facing: c.facing_direction,
      fov: c.field_of_view,
      fps: c.fps,
      location: c.location,
      zone_id: c.zone_id,
    }));
  }
}

export const api = new ApiClient();
