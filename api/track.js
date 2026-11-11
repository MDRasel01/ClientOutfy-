// LeadOutfy — /api/track   (Email Tracking · Phase 2)
// Extension calls this AFTER each email send to log the event.
// Body: { license_key, tracking_id, recipient, channel, subject, status, error }
//   channel = 'gmail' | 'custom' | 'brevo'
//   status  = 'sent'  | 'failed'
// Uses the SAME Supabase env vars already configured on this project.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const {
    license_key, tracking_id, recipient,
    channel, subject, status, error
  } = req.body || {};

  if (!license_key || !tracking_id) {
    return res.status(400).json({ ok: false, error: 'Missing license_key or tracking_id' });
  }

  const row = {
    tracking_id,
    license_key,
    recipient: recipient || null,
    channel:   channel   || null,
    subject:   subject   || null,
    status:    status === 'failed' ? 'failed' : 'sent',
    error:     error || null,
  };

  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/email_events`, {
      method: 'POST',
      headers: {
        'apikey':        process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok && r.status !== 409) {
      const t = await r.text();
      console.error('track insert failed:', r.status, t);
      return res.status(200).json({ ok: false, error: 'insert_failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('track error:', err.message);
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
