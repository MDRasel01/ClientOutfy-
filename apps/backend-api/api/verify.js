export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { license_key } = req.body;
  if (!license_key || license_key.length < 8) return res.status(400).json({ ok: false, error: 'Invalid key' });
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(license_key)}&select=*`, {
      headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
    });
    const data = await response.json();
    if (!data || !data[0]) return res.status(200).json({ ok: false, error: 'invalid_license' });
    const lic = data[0];
    if (lic.status === 'blocked') return res.status(200).json({ ok: false, error: 'License blocked.' });
    if (lic.status === 'expired') return res.status(200).json({ ok: false, error: 'License expired.' });
    return res.status(200).json({ ok: true, license: lic });
  } catch (err) {
    return res.status(200).json({ ok: false, error: 'server_error' });
  }
}
