export interface Point {
  x: number;
  y: number;
}

export interface Zone {
  id: number;
  name: string;
  type: string;
  polygon: Point[];
}

export interface Camera {
  id: number;
  name: string;
  status: "active" | "degraded" | "faulted" | "disabled" | "removed";
  map_x: number | null;
  map_y: number | null;
  facing: number | null;
  fov: number | null;
  fps?: number;
  latency_ms?: number;
  last_heartbeat_at?: string | null;
  location?: string | null;
  zone_id?: number | null;
}

export interface RuleSignal {
  rule_name?: string;
  confidence?: number;
  justification?: string;
}

export interface Alert {
  id: number;
  status: "open" | "reviewing" | "resolved" | "false_positive" | "escalated";
  priority: "urgent" | "high" | "medium" | "low";
  instance_key?: string | null;
  confidence: number;
  rules: string[];
  title?: string;
  summary?: string;
  created_at?: string;
  zone?: string;
  camera?: string;
  score_value?: number;
  signals?: {
    rules?: RuleSignal[];
    explanation?: string;
    zone?: string;
    camera?: string;
    product_name?: string;
    sku?: string;
  };
}

export interface EventItem {
  id: number;
  event_type: string;
  event_timestamp: string;
  camera_id?: number | null;
  confidence?: number;
  payload: Record<string, any>;
}

export interface TimelineItem {
  position: number;
  ts?: string;
  label: string;
  camera_id?: number | null;
  confidence?: number;
}

export interface HeatmapCell {
  x: number;
  y: number;
  intensity: number;
}

export interface UserSession {
  token: string;
  user: string;
  role: string;
  storeId: string;
  storeName: string;
}

export type ViewTab =
  | "overview"
  | "cameras"
  | "map"
  | "alerts"
  | "journeys"
  | "review_queue"
  | "analytics"
  | "inventory"
  | "assistant"
  | "admin_cameras"
  | "admin_users"
  | "admin_settings"
  | "privacy"
  | "terms"
  | "not_found";
