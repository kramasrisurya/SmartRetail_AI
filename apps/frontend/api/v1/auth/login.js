export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { username = 'store_manager' } = req.body || {};

  return res.status(200).json({
    token: 'mock-storesight-jwt-token-99882233',
    user: {
      id: 1,
      username,
      role: 'admin',
      storeId: 'store-flagship-01',
      storeName: 'Aegis Flagship Store 01'
    }
  });
}
