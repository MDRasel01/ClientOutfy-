// api/settings.js — Global settings endpoint
// Extension এই URL call করবে: https://your-app.vercel.app/api/settings

export default async function handler(req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://*');

  try {
    const SUPA_URL = process.env.SUPABASE_URL;
    const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

    const response = await fetch(
      `${SUPA_URL}/rest/v1/settings?id=eq.global&select=*`,
      {
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`
        }
      }
    );

    const data = await response.json();
    return res.status(200).json({ ok: true, settings: data?.[0] || {} });

  } catch (err) {
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
