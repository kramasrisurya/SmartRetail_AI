import { MOCK_ZONES, MOCK_CAMERAS } from '../_data.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    zones: MOCK_ZONES,
    cameras: MOCK_CAMERAS.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status,
      map_x: c.map_x,
      map_y: c.map_y,
      facing: c.facing_direction,
      fov: c.field_of_view,
      fps: c.fps,
      latency_ms: c.latency_ms,
      location: c.location,
      zone_id: c.zone_id
    }))
  });
}
