export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.global&select=*`, {
      headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
    });
    const data = await response.json();
    return res.status(200).json({ ok: true, settings: data?.[0] || {} });
  } catch (err) {
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
