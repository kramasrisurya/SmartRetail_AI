export const MOCK_ZONES = [
  { id: 1, name: "Checkout & POS Lane 1-4", type: "checkout", polygon: [{ x: 50, y: 50 }, { x: 250, y: 50 }, { x: 250, y: 180 }, { x: 50, y: 180 }] },
  { id: 2, name: "Electronics & High-Value Displays", type: "high_risk", polygon: [{ x: 300, y: 50 }, { x: 550, y: 50 }, { x: 550, y: 250 }, { x: 300, y: 250 }] },
  { id: 3, name: "Fresh Produce & Grocery Aisle A", type: "grocery", polygon: [{ x: 50, y: 220 }, { x: 250, y: 220 }, { x: 250, y: 450 }, { x: 50, y: 450 }] },
  { id: 4, name: "Apparel & Fitting Room Entrance", type: "apparel", polygon: [{ x: 300, y: 280 }, { x: 550, y: 280 }, { x: 550, y: 450 }, { x: 300, y: 450 }] },
  { id: 5, name: "Main Entrance & Security Sensor Portal", type: "entrance", polygon: [{ x: 200, y: 470 }, { x: 400, y: 470 }, { x: 400, y: 550 }, { x: 200, y: 550 }] },
];

export const MOCK_CAMERAS = [
  { id: 101, name: "CAM-01-POS-A", status: "active", map_x: 150, map_y: 115, facing_direction: 90, field_of_view: 110, fps: 30, latency_ms: 18, location: "Checkout Register 1", zone_id: 1 },
  { id: 102, name: "CAM-02-ELEC-OVERHEAD", status: "active", map_x: 425, map_y: 150, facing_direction: 180, field_of_view: 120, fps: 30, latency_ms: 22, location: "Electronics Vault", zone_id: 2 },
  { id: 103, name: "CAM-03-AISLE-GROCERY", status: "active", map_x: 150, map_y: 335, facing_direction: 0, field_of_view: 95, fps: 30, latency_ms: 15, location: "Aisle A Central", zone_id: 3 },
  { id: 104, name: "CAM-04-ENTRANCE-DOOR", status: "active", map_x: 300, map_y: 510, facing_direction: 270, field_of_view: 130, fps: 30, latency_ms: 19, location: "Main Glass Portal", zone_id: 5 },
  { id: 105, name: "CAM-05-FITTING-CORRIDOR", status: "active", map_x: 425, map_y: 365, facing_direction: 90, field_of_view: 100, fps: 30, latency_ms: 24, location: "Apparel Walkway", zone_id: 4 },
];

export const MOCK_ALERTS = [
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
  }
];
