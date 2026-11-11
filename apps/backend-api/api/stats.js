// LeadOutfy — /api/stats   (Email Tracking · FIXED v3 — date filters work)
// Extension calls this to show the customer their numbers.
// GET  /api/stats?license_key=LOA-XXXX[&from=ISO][&to=ISO]
//  or  POST { license_key, from, to }
// Returns: { ok, total, sent, failed, opened, replied, open_rate, reply_rate }
//
// ✅ FIX: Previous version ignored from/to and always returned all-time totals
//    (that's why Today / Yesterday / Last 7 days all showed the same number,
//     and "today" showed counts even when nothing was sent today).
//    This version queries email_events directly with the date range, so the
//    filters return real per-period numbers.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const q = req.query || {};
  const b = req.body  || {};
  const license_key = q.license_key || b.license_key || '';
  const from = q.from || b.from || null;
  const to   = q.to   || b.to   || null;

  if (!license_key || license_key.length < 8) {
    return res.status(400).json({ ok: false, error: 'Invalid key' });
  }

  // Build a PostgREST query against email_events (service key bypasses RLS).
  // We pull just the columns we need to count, filtered by the date range.
  let url = `${process.env.SUPABASE_URL}/rest/v1/email_events`
    + `?license_key=eq.${encodeURIComponent(license_key)}`
    + `&select=status,opened,replied`
    + `&limit=100000`;
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

    // Count in this date range
    let total = 0, sent = 0, failed = 0, opened = 0, replied = 0;
    for (const row of rows) {
      total++;
      if (row.status === 'failed') {
        failed++;
      } else {
        sent++; // anything not failed counts as sent/delivered
      }
      if (row.opened)  opened++;
      if (row.replied) replied++;
    }

    const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0); // 1 decimal

    return res.status(200).json({
      ok: true,
      total, sent, failed, opened, replied,
      open_rate:  pct(opened,  sent),
      reply_rate: pct(replied, sent),
    });
  } catch (err) {
    console.error('stats error:', err.message);
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
