// LeadOutfy — /api/events   (Email Tracking · Phase 7)
// Returns the recent per-recipient email rows for the double-tick list.
// GET /api/events?license_key=LOA-XXXX[&from=ISO][&to=ISO][&limit=80]
// Returns: { ok, events: [ { recipient, channel, status, opened, sent_at, last_opened_at } ] }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query || {};
  const b = req.body  || {};
  const license_key = q.license_key || b.license_key || '';
  const from  = q.from || b.from || null;
  const to    = q.to   || b.to   || null;
  let   limit = parseInt(q.limit || b.limit || '80', 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 80;
  if (limit > 200) limit = 200;

  if (!license_key || license_key.length < 8) {
    return res.status(400).json({ ok: false, error: 'Invalid key' });
  }

  // Build a PostgREST query (service key bypasses RLS)
  let url = `${process.env.SUPABASE_URL}/rest/v1/email_events`
    + `?license_key=eq.${encodeURIComponent(license_key)}`
    + `&select=recipient,channel,status,opened,sent_at,last_opened_at`
    + `&order=sent_at.desc`
    + `&limit=${limit}`;
  if (from) url += `&sent_at=gte.${encodeURIComponent(from)}`;
  if (to)   url += `&sent_at=lt.${encodeURIComponent(to)}`;

  try {
    const r = await fetch(url, {
      headers: {
        'apikey':        process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
    });
    const rows = await r.json();
    if (!Array.isArray(rows)) {
      return res.status(200).json({ ok: false, error: 'bad_response' });
    }
    return res.status(200).json({ ok: true, events: rows });
  } catch (err) {
    console.error('events error:', err.message);
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
