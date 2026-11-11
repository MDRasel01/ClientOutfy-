export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { customer_name, customer_phone, plan_id, plan_name, amount, credits, payment_method, transaction_id } = req.body;
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: { 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ customer_name, customer_phone, plan_id, plan_name, amount, credits, payment_method, transaction_id, status: 'pending' })
    });
    if (response.ok) return res.status(200).json({ ok: true });
    const t = await response.text();
    return res.status(200).json({ ok: false, error: t });
  } catch (err) {
    return res.status(200).json({ ok: false, error: err.message });
  }
}
