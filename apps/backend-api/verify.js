// api/verify.js — License verify endpoint
// Extension এই URL call করবে: https://your-app.vercel.app/api/verify

export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { license_key } = req.body;

  if (!license_key || typeof license_key !== 'string' || license_key.length < 8) {
    return res.status(400).json({ ok: false, error: 'Invalid license key' });
  }

  try {
    const SUPA_URL = process.env.SUPABASE_URL;
    const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

    const response = await fetch(
      `${SUPA_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(license_key)}&select=*`,
      {
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`
        }
      }
    );

    const data = await response.json();

    if (!data || !data[0]) {
      return res.status(200).json({ ok: false, error: 'invalid_license' });
    }

    const lic = data[0];

    if (lic.status === 'blocked') {
      return res.status(200).json({ ok: false, error: 'License is blocked. Contact support.' });
    }

    if (lic.status === 'expired') {
      return res.status(200).json({ ok: false, error: 'License expired. Buy new credits.' });
    }

    return res.status(200).json({ ok: true, license: lic });

  } catch (err) {
    console.error('Verify error:', err.message);
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
