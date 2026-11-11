// LeadOutfy — /api/t/open   (Email Tracking · Phase 2)
// The 1x1 invisible pixel. When a recipient opens the email, their mail
// client loads this image → we mark the email as "opened" → then return
// a tiny transparent GIF so nothing is visible.
// URL used inside emails:  /api/t/open?id=<tracking_id>

// 1x1 transparent GIF (43 bytes)
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export default async function handler(req, res) {
  const id = (req.query && req.query.id) ? String(req.query.id) : '';

  // Mark opened (best-effort — never block the pixel on a DB hiccup)
  if (id) {
    try {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/track_open`, {
        method: 'POST',
        headers: {
          'apikey':        process.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ p_tracking_id: id }),
      });
    } catch (err) {
      console.error('track_open error:', err.message);
    }
  }

  // Always return the pixel, never cached (so re-opens can re-count)
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).send(PIXEL);
}
