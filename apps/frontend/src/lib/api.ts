import { Alert, Camera, EventItem, HeatmapCell, TimelineItem, Zone } from "../types";

const API_BASE = "/api/v1";

class ApiClient {
  private getToken(): string {
    return sessionStorage.getItem("storesight_token") || "";
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = errData.detail || errData.message || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return response.json();
  }

  async login(username: string, password: string) {
    return this.request<{ access_token: string; refresh_token: string; role: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async getBootstrap(): Promise<{ zones: Zone[]; cameras: Camera[] }> {
    return this.request<{ zones: Zone[]; cameras: Camera[] }>("/dashboard/bootstrap");
  }

  async getAlerts(status?: string): Promise<Alert[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return this.request<Alert[]>(`/dashboard/alerts${query}`);
  }

  async actOnAlert(alertId: number, action: "claim" | "resolve" | "false_positive" | "escalate", user: string, note?: string) {
    const query = `action=${action}&user=${encodeURIComponent(user)}&note=${encodeURIComponent(note || "")}`;
    return this.request(`/dashboard/alerts/${alertId}/action?${query}`, {
      method: "POST",
    });
  }

  async getTimeline(subjectKey: string): Promise<TimelineItem[]> {
    return this.request<TimelineItem[]>(`/journeys/${encodeURIComponent(subjectKey)}/timeline`);
  }

  async getHeatmap(): Promise<{ cells: HeatmapCell[] }> {
    return this.request<{ cells: HeatmapCell[] }>("/analytics/heatmap");
  }

  async getEvents(limit: number = 30): Promise<EventItem[]> {
    return this.request<EventItem[]>(`/events?limit=${limit}`);
  }

  async askAssistant(
    question: string,
    history?: { role: string; content: string }[]
  ): Promise<{
    answer?: string;
    declined?: boolean;
    reason?: string;
    note?: string;
    suggestions?: string[];
    fallback?: boolean;
    mode?: string;
    ai_mode?: boolean;
    ai_notice?: string;
    refs?: (number | string)[];
  }> {
    return this.request("/reports/assistant", {
      method: "POST",
      body: JSON.stringify({ question, history: history || [] }),
    });
  }

  async getAuditLog(limit: number = 50): Promise<any[]> {
    return this.request<any[]>(`/audit-log?limit=${limit}`);
  }

  async getCameras(): Promise<Camera[]> {
    const data = await this.request<any[]>("/cameras");
    return data.map((c: any) => ({
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
