export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { license_key, count } = req.body;
  if (!license_key || license_key.length < 8) {
    return res.status(400).json({ ok: false, error: 'Invalid key' });
  }

  const amount = (typeof count === 'number' && count > 0 && count <= 50) ? count : 1;

  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/deduct_credit`, {
      method: 'POST',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_license_key: license_key, p_amount: amount })
    });
    const data = await response.json();
    if (!data || data.ok === false) {
      return res.status(200).json({ ok: false, credits_remaining: 0, stop: true });
    }
    return res.status(200).json({ ok: true, credits_remaining: data?.credits_remaining ?? null });
  } catch (err) {
    return res.status(200).json({ ok: false, error: 'server_error', stop: true });
  }
}
