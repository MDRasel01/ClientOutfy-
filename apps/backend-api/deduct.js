// api/deduct.js — Credit deduct endpoint
// Extension এই URL call করবে: https://your-app.vercel.app/api/deduct

export default async function handler(req, res) {

  // শুধু POST allow
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // CORS — শুধু Chrome extension থেকে allow
  res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { license_key } = req.body;

  if (!license_key || typeof license_key !== 'string' || license_key.length < 8) {
    return res.status(400).json({ ok: false, error: 'Invalid license key' });
  }

  // Rate limiting — একই key থেকে প্রতি সেকেন্ডে max ১টা request
  // (Vercel Edge এ proper rate limit করতে চাইলে Upstash Redis ব্যবহার করো)

  try {
    // Supabase key এখন শুধু server-এ — extension কখনো দেখতে পাবে না
    const SUPA_URL = process.env.SUPABASE_URL;
    const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY; // service key — anon key না!

    const response = await fetch(`${SUPA_URL}/rest/v1/rpc/deduct_credit`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_license_key: license_key,
        p_amount: 1
      })
    });

    const data = await response.json();

    if (!response.ok || (data && data.ok === false)) {
      return res.status(200).json({ ok: false, credits_remaining: 0, stop: true });
    }

    return res.status(200).json({
      ok: true,
      credits_remaining: data?.credits_remaining ?? null
    });

  } catch (err) {
    console.error('Deduct error:', err.message);
    // Server error হলেও scraping বন্ধ করো
    return res.status(200).json({ ok: false, error: 'server_error', stop: true });
  }
}
