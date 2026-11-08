import { MOCK_ALERTS } from '../_data.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const statusFilter = req.query?.status;
  const filtered = statusFilter ? MOCK_ALERTS.filter(a => a.status === statusFilter) : MOCK_ALERTS;

  return res.status(200).json(filtered);
}
