// LeadOutfy — /api/stats-buckets   (Email Tracking · Phase 6)
// Returns today / yesterday / week / month / all counts in one call.
// GET /api/stats-buckets?license_key=LOA-XXXX
// (Existing /api/stats is left untouched.)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const license_key =
    (req.query && req.query.license_key) ||
    (req.body  && req.body.license_key)  || '';

  if (!license_key || license_key.length < 8) {
    return res.status(400).json({ ok: false, error: 'Invalid key' });
  }

  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/email_stats_buckets`, {
      method: 'POST',
      headers: {
        'apikey':        process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ p_license_key: license_key }),
    });
    const buckets = await r.json();
    if (!buckets || buckets.error) {
      console.error('buckets rpc error:', buckets && buckets.error);
      return res.status(200).json({ ok: false, error: 'rpc_error' });
    }
    return res.status(200).json({ ok: true, buckets });
  } catch (err) {
    console.error('stats-buckets error:', err.message);
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
