// LeadOutfy — /api/send-email  (FIXED v2)
// Brevo API key is stored securely in Vercel Environment Variables
// Extension sends: { fromName, fromEmail, toEmail, toName, subject, textContent/body, trackingId }
//
// ✅ FIXES in this version:
//   1. Accept BOTH "textContent" and "body" (extension sends textContent — was being ignored)
//   2. Brevo API call now has a 12-second timeout (no more hanging requests)
//   3. Auto-retry once if Brevo is slow/unreachable
//   4. Clearer error messages so the extension knows what failed

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-ext-id, x-nonce');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // ✅ FIX 1: Accept body sent as either "textContent" (extension) or "body" (legacy)
  const b = req.body || {};
  const fromName    = b.fromName;
  const fromEmail   = b.fromEmail;
  const toEmail     = b.toEmail;
  const toName      = b.toName;
  const subject     = b.subject;
  const body        = b.textContent || b.body || '';   // ← THE KEY FIX
  const trackingId  = b.trackingId;

  // Validate required fields
  if (!fromEmail || !toEmail || !subject || !body) {
    return res.status(400).json({
      ok: false,
      error: 'Missing required fields',
      missing: {
        fromEmail: !fromEmail,
        toEmail:   !toEmail,
        subject:   !subject,
        body:      !body
      }
    });
  }

  // Brevo API key is stored in Vercel Environment Variable: BREVO_API_KEY
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Email service not configured' });
  }

  // ── LeadOutfy tracking pixel (only when trackingId is provided) ──
  const TRACK_BASE = 'https://lead-outfy-backend-vercel.vercel.app/api/t/open';
  const pixel = trackingId
    ? `<img src="${TRACK_BASE}?id=${encodeURIComponent(trackingId)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0"/>`
    : '';
  const htmlContent =
    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222">` +
    `${String(body).replace(/\n/g, '<br/>')}${pixel}</div>`;

  // ✅ FIX 2 + 3: Brevo call with timeout + one retry
  let lastError = 'Send failed';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

    try {
      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender:      { name: fromName || fromEmail, email: fromEmail },
          to:          [{ email: toEmail, name: toName || toEmail }],
          subject:     subject,
          textContent: body,
          htmlContent: htmlContent,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await brevoRes.json().catch(() => ({}));

      if (data.messageId) {
        return res.status(200).json({ ok: true, messageId: data.messageId });
      }

      // Brevo replied but no messageId — this is a real error (bad email, blocked, etc.)
      // Don't retry these; return the actual Brevo error.
      lastError = data.message || 'Send failed';
      console.error('Brevo error (attempt ' + attempt + '):', JSON.stringify(data));
      return res.status(502).json({ ok: false, error: lastError });

    } catch (err) {
      clearTimeout(timeoutId);
      // Timeout or network error — safe to retry once
      lastError = (err.name === 'AbortError') ? 'Brevo timeout (12s)' : err.message;
      console.error('Send-email attempt ' + attempt + ' failed:', lastError);
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1500)); // wait 1.5s then retry
      }
    }
  }

  // Both attempts failed
  return res.status(504).json({ ok: false, error: lastError + ' (retry later)' });
}
