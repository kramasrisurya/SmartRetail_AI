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

export interface AlertSignals {
  rules?: RuleSignal[];
  explanation?: string;
  zone?: string;
  camera?: string;
  product_name?: string;
  sku?: string;
  instance_key?: string;
  action?: string;
  note?: string;
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
  signals?: AlertSignals;
}

export interface EventItem {
  id: number;
  event_type: string;
  event_timestamp: string;
  camera_id?: number | null;
  confidence?: number;
  payload: Record<string, unknown>;
}

export interface TimelineItem {
  position: number;
  ts?: string;
  label: string;
  camera_id?: number | null;
  confidence?: number;
  event_type?: string;
  state?: string;
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

export interface StoreOption {
  id: string;
  name: string;
  address?: string;
  status?: string;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  target_type: string;
  target_id: string | number;
  details?: Record<string, unknown>;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantResponse {
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
}

export interface BootstrapData {
  zones: Zone[];
  cameras: Camera[];
}

export interface HeatmapResponse {
  cells: HeatmapCell[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  role: string;
}

export interface AlertActionResponse {
  alert_id: number;
  status: string;
}

export type AlertActionType = "claim" | "resolve" | "false_positive" | "escalate";

export type ViewTab =
  | "overview"
  | "cameras"
  | "map"
  | "spatial"
  | "risk_pos"
  | "event_graph"
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

export interface OverlayConfig {
  personBoxes: boolean;
  productBoxes: boolean;
  cartBoxes: boolean;
  vectorTrails: boolean;
  interactionZones: boolean;
  fpsHud: boolean;
}

export interface StreamHudStats {
  fps: number;
  droppedFrames: number;
  latencyMs: number;
  inferenceMs: number;
  activeTrackCount: number;
}

export interface ToastNotification {
  id: string;
  text: string;
  type: "success" | "error" | "info" | "warning";
  timestamp: number;
  duration?: number;
}
