// LeadOutfy — /api/daily   (Email Tracking · Phase 8)
// Per-day sent/opened counts for the trend chart.
// GET /api/daily?license_key=LOA-XXXX[&days=7][&offset=-360]
//   offset = client's new Date().getTimezoneOffset() so days bucket in LOCAL time.
// Returns: { ok, days: [ { day:'YYYY-MM-DD', sent, opened } ] }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query || {};
  const b = req.body  || {};
  const license_key = q.license_key || b.license_key || '';
  let days   = parseInt(q.days   ?? b.days   ?? '7',  10);
  let offset = parseInt(q.offset ?? b.offset ?? '0',  10);
  if (!Number.isFinite(days)   || days < 1)  days = 7;
  if (days > 31) days = 31;
  if (!Number.isFinite(offset)) offset = 0;

  if (!license_key || license_key.length < 8) {
    return res.status(400).json({ ok: false, error: 'Invalid key' });
  }

  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/email_daily`, {
      method: 'POST',
      headers: {
        'apikey':        process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ p_license_key: license_key, p_days: days, p_offset_min: offset }),
    });
    const rows = await r.json();
    return res.status(200).json({ ok: true, days: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    console.error('daily error:', err.message);
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
