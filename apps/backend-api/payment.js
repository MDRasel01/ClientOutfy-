// api/payment.js — Payment submission endpoint
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://*');

  const { customer_name, customer_phone, plan_id, plan_name, amount, credits, payment_method, transaction_id } = req.body;

  try {
    const SUPA_URL = process.env.SUPABASE_URL;
    const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

    const response = await fetch(`${SUPA_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ customer_name, customer_phone, plan_id, plan_name, amount, credits, payment_method, transaction_id, status: 'pending' })
    });

    if (response.ok) return res.status(200).json({ ok: true });
    const t = await response.text();
    return res.status(200).json({ ok: false, error: t });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
