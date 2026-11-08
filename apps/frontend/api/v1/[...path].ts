const MOCK_ZONES = [
  { id: 1, name: "Checkout & POS Lane 1-4", type: "checkout", polygon: [{ x: 50, y: 50 }, { x: 250, y: 50 }, { x: 250, y: 180 }, { x: 50, y: 180 }] },
  { id: 2, name: "Electronics & High-Value Displays", type: "high_risk", polygon: [{ x: 300, y: 50 }, { x: 550, y: 50 }, { x: 550, y: 250 }, { x: 300, y: 250 }] },
  { id: 3, name: "Fresh Produce & Grocery Aisle A", type: "grocery", polygon: [{ x: 50, y: 220 }, { x: 250, y: 220 }, { x: 250, y: 450 }, { x: 50, y: 450 }] },
  { id: 4, name: "Apparel & Fitting Room Entrance", type: "apparel", polygon: [{ x: 300, y: 280 }, { x: 550, y: 280 }, { x: 550, y: 450 }, { x: 300, y: 450 }] },
  { id: 5, name: "Main Entrance & Security Sensor Portal", type: "entrance", polygon: [{ x: 200, y: 470 }, { x: 400, y: 470 }, { x: 400, y: 550 }, { x: 200, y: 550 }] },
];

const MOCK_CAMERAS = [
  { id: 101, name: "CAM-01-POS-A", status: "active", map_x: 150, map_y: 115, facing: 90, fov: 110, fps: 30, latency_ms: 18, location: "Checkout Register 1", zone_id: 1 },
  { id: 102, name: "CAM-02-ELEC-OVERHEAD", status: "active", map_x: 425, map_y: 150, facing: 180, fov: 120, fps: 30, latency_ms: 22, location: "Electronics Vault", zone_id: 2 },
  { id: 103, name: "CAM-03-AISLE-GROCERY", status: "active", map_x: 150, map_y: 335, facing: 0, fov: 95, fps: 30, latency_ms: 15, location: "Aisle A Central", zone_id: 3 },
  { id: 104, name: "CAM-04-ENTRANCE-DOOR", status: "active", map_x: 300, map_y: 510, facing: 270, fov: 130, fps: 30, latency_ms: 19, location: "Main Glass Portal", zone_id: 5 },
  { id: 105, name: "CAM-05-FITTING-CORRIDOR", status: "active", map_x: 425, map_y: 365, facing: 90, fov: 100, fps: 30, latency_ms: 24, location: "Apparel Walkway", zone_id: 4 },
];

let mockAlerts = [
  {
    id: 1001,
    status: "open",
    priority: "high",
    instance_key: "inst_electronics_9021",
    confidence: 0.94,
    rules: ["Sweethearting Detection", "Unscanned Item Concealment"],
    title: "Unscanned Premium Item Detected at POS 2",
    summary: "Vision model detected a high-value audio headset passed around scanner barcode sensor without scan beep event.",
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
    zone: "Checkout & POS Lane 1-4",
    camera: "CAM-01-POS-A",
    score_value: 0.94,
    signals: {
      explanation: "Optical bounding box tracked product across conveyor to bagger without corresponding POS register transaction tick.",
      zone: "Checkout & POS Lane 1-4",
      camera: "CAM-01-POS-A",
      product_name: "Sony WH-1000XM5",
      sku: "ELEC-AUDIO-9921",
      instance_key: "inst_electronics_9021"
    }
  },
  {
    id: 1002,
    status: "reviewing",
    priority: "medium",
    instance_key: "inst_loiter_4412",
    confidence: 0.82,
    rules: ["Extended Dwell Time", "High-Value Aisle Loitering"],
    title: "Suspicious Dwell in Electronics Section",
    summary: "Subject has remained in blind corner of high-value display case for over 7 minutes with repetitive shelf reach maneuvers.",
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    zone: "Electronics & High-Value Displays",
    camera: "CAM-02-ELEC-OVERHEAD",
    score_value: 0.82,
    signals: {
      explanation: "Heatmap dwell exceeds 3.5x store median for category aisle.",
      zone: "Electronics & High-Value Displays",
      camera: "CAM-02-ELEC-OVERHEAD",
      instance_key: "inst_loiter_4412"
    }
  },
  {
    id: 1003,
    status: "resolved",
    priority: "urgent",
    instance_key: "inst_entrance_exit_881",
    confidence: 0.97,
    rules: ["Exit Bypass Without Checkout"],
    title: "Rapid Exit via Fire Door Attempted",
    summary: "Security staff dispatched; merchandise recovered at exit portal vestibule.",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    zone: "Main Entrance & Security Sensor Portal",
    camera: "CAM-04-ENTRANCE-DOOR",
    score_value: 0.97,
    signals: {
      action: "Security intercepted",
      zone: "Main Entrance & Security Sensor Portal",
      camera: "CAM-04-ENTRANCE-DOOR"
    }
  }
];

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path } = req.query;
  const route = Array.isArray(path) ? path.join("/") : (path || "");

  // 1. Auth: /auth/login
  if (route === "auth/login" && req.method === "POST") {
    const { username = "manager" } = req.body || {};
    return res.status(200).json({
      token: "mock-storesight-jwt-token-99882233",
      user: {
        id: 1,
        username,
        role: "admin",
        storeId: "store-flagship-01",
        storeName: "Aegis Flagship Store 01"
      }
    });
  }

  // 2. Dashboard Bootstrap: /dashboard/bootstrap
  if (route === "dashboard/bootstrap") {
    return res.status(200).json({
      zones: MOCK_ZONES,
      cameras: MOCK_CAMERAS
    });
  }

  // 3. Alerts: /dashboard/alerts
  if (route === "dashboard/alerts") {
    const statusFilter = req.query.status;
    const filtered = statusFilter ? mockAlerts.filter(a => a.status === statusFilter) : mockAlerts;
    return res.status(200).json(filtered);
  }

  // 4. Alert Action: /dashboard/alerts/:id/action
  if (route.startsWith("dashboard/alerts/") && route.endsWith("/action") && req.method === "POST") {
    const parts = route.split("/");
    const alertId = parseInt(parts[2], 10);
    const action = req.query.action || "resolved";
    const user = req.query.user || "auditor";
    const note = req.query.note || "Handled via operator console";

    const target = mockAlerts.find(a => a.id === alertId);
    if (target) {
      target.status = action === "false_positive" ? "false_positive" : "resolved";
      if (!target.signals) target.signals = {};
      target.signals.action = action;
      target.signals.note = note;
    }

    return res.status(200).json({
      success: true,
      alert_id: alertId,
      action,
      user,
      updated_at: new Date().toISOString()
    });
  }

  // 5. Cameras: /cameras
  if (route === "cameras") {
    return res.status(200).json(
      MOCK_CAMERAS.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        map_x: c.map_x,
        map_y: c.map_y,
        facing_direction: c.facing,
        field_of_view: c.fov,
        fps: c.fps,
        location: c.location,
        zone_id: c.zone_id
      }))
    );
  }

  // 6. Events: /events
  if (route === "events") {
    const events = [
      { id: 1, event_type: "customer_dwell_anomaly", event_timestamp: new Date().toISOString(), camera_id: 102, confidence: 0.91, payload: { zone: "Electronics", duration_seconds: 420 } },
      { id: 2, event_type: "unscanned_item_slip", event_timestamp: new Date(Date.now() - 90000).toISOString(), camera_id: 101, confidence: 0.94, payload: { lane: 2, item_hint: "Audio" } },
      { id: 3, event_type: "customer_entrance", event_timestamp: new Date(Date.now() - 180000).toISOString(), camera_id: 104, confidence: 0.98, payload: { group_size: 2 } },
      { id: 4, event_type: "cash_drawer_open", event_timestamp: new Date(Date.now() - 300000).toISOString(), camera_id: 101, confidence: 0.99, payload: { cashier_id: "EMP-401" } },
      { id: 5, event_type: "zone_density_warning", event_timestamp: new Date(Date.now() - 420000).toISOString(), camera_id: 103, confidence: 0.88, payload: { zone: "Produce", occupants: 16 } }
    ];
    return res.status(200).json(events);
  }

  // 7. Heatmap: /analytics/heatmap
  if (route === "analytics/heatmap") {
    const cells = [];
    for (let x = 50; x <= 550; x += 35) {
      for (let y = 50; y <= 550; y += 35) {
        const isHotspot = (x > 80 && x < 220 && y > 70 && y < 160) || (x > 320 && x < 500 && y > 80 && y < 220);
        const intensity = isHotspot ? Math.min(1.0, 0.65 + Math.random() * 0.35) : Math.random() * 0.35;
        cells.push({ x, y, intensity: parseFloat(intensity.toFixed(2)) });
      }
    }
    return res.status(200).json({ cells, timestamp: new Date().toISOString() });
  }

  // 8. Shopper Journeys Timeline: /journeys/:key/timeline
  if (route.startsWith("journeys/") && route.endsWith("/timeline")) {
    const timeline = [
      { position: 1, ts: new Date(Date.now() - 15 * 60000).toISOString(), label: "Entered Store via South Turnstile", camera_id: 104, confidence: 0.99, event_type: "entrance", state: "normal" },
      { position: 2, ts: new Date(Date.now() - 11 * 60000).toISOString(), label: "Browsed Fresh Produce Aisle A", camera_id: 103, confidence: 0.92, event_type: "browse", state: "normal" },
      { position: 3, ts: new Date(Date.now() - 6 * 60000).toISOString(), label: "Extended Dwell in Electronics Section", camera_id: 102, confidence: 0.85, event_type: "dwell_anomaly", state: "warning" },
      { position: 4, ts: new Date(Date.now() - 2 * 60000).toISOString(), label: "Approached Self-Checkout Register 2", camera_id: 101, confidence: 0.96, event_type: "pos_scan", state: "alert" }
    ];
    return res.status(200).json(timeline);
  }

  // 9. AI Assistant: /reports/assistant
  if (route === "reports/assistant" && req.method === "POST") {
    const { question = "" } = req.body || {};
    return res.status(200).json({
      answer: `SmartRetail Vision AI Analysis for: "${question}"\n\n- **Store Operations:** Store 01 is currently tracking 5 active cameras with 99.8% uptime.\n- **Loss Prevention:** 3 active anomalies detected in the last hour with 94% confidence.\n- **Foot Traffic & Dwell:** Peak density observed in Electronics & Checkout aisles. All automated edge models operating at 30 FPS.`,
      sources: ["Edge Camera Telemetry", "Loss Prevention Inference Model v3.2", "Floorplan Sensor Matrix"]
    });
  }

  // 10. Audit Log: /audit-log
  if (route === "audit-log") {
    return res.status(200).json([
      { id: "aud_01", timestamp: new Date().toISOString(), user: "admin", action: "ACK_ALERT", details: "Investigated POS 2 Sweethearting Alert" },
      { id: "aud_02", timestamp: new Date(Date.now() - 3600000).toISOString(), user: "system", action: "CALIBRATE_CAM", details: "Recalibrated CAM-02-ELEC camera matrix" }
    ]);
  }

  // Fallback for any other path
  return res.status(200).json({
    message: "SmartRetail Enterprise API v1",
    path: route,
    status: "online"
  });
}
