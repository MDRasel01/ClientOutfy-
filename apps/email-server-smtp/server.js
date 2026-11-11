// =============================================
// LeadOutfy Email Server v3.0
// Gmail SMTP + Custom SMTP (cPanel, Hostinger, Zoho, Outlook, etc.)
// nodemailer
// =============================================
// v3.0 changes (NON-BREAKING):
//   • Added POST /test-connection  — verify any SMTP login
//   • Added POST /send-custom      — send via ANY SMTP provider
//   • Old routes /send /webhook-send /send-bulk UNCHANGED
// =============================================

import express    from 'express';
import cors       from 'cors';
import nodemailer from 'nodemailer';

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── friendly error messages ──
function friendlyError(msg) {
  msg = msg || 'Unknown error';
  if (/Invalid login|Username and Password|credentials|535|534/i.test(msg))
    return 'Login failed — email or password is wrong. (For Gmail/Yahoo/iCloud use an App Password.)';
  if (/ETIMEDOUT|timeout|ECONNECTION|ECONNREFUSED/i.test(msg))
    return 'Could not reach the mail server — check SMTP host and port.';
  if (/ENOTFOUND|getaddrinfo/i.test(msg))
    return 'SMTP host not found — check the host name spelling.';
  if (/self.signed|certificate/i.test(msg))
    return 'SSL certificate problem on the mail server.';
  return msg;
}

// ── build a transporter from any SMTP config ──
function buildTransporter({ host, port, secure, user, pass, pool }) {
  const p = parseInt(port, 10) || 587;
  return nodemailer.createTransport({
    host:   String(host).trim(),
    port:   p,
    // secure=true for 465, false for 587/25 (STARTTLS)
    secure: (typeof secure === 'boolean') ? secure : (p === 465),
    auth:   { user: String(user).trim(), pass: String(pass).trim() },
    tls:    { rejectUnauthorized: false },
    ...(pool ? { pool: true, maxConnections: 2, maxMessages: 50 } : {}),
  });
}

// ── Root / health ──
app.get('/',       (req, res) => res.json({ ok: true, service: 'LeadOutfy Email Server', version: '3.0' }));
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ── DEBUG ──
app.post('/debug', (req, res) => {
  console.log('DEBUG body:', JSON.stringify(req.body, null, 2));
  res.json({ ok: true, received: req.body });
});

// ════════════════════════════════════════════════════════════
// NEW v3.0 — TEST CONNECTION
// POST /test-connection
// Body: { host, port, secure, user, pass }
// Just verifies the SMTP login — sends NO email.
// ════════════════════════════════════════════════════════════
app.post('/test-connection', async (req, res) => {
  console.log('🔌 /test-connection:', JSON.stringify({ ...req.body, pass: '***' }));

  const { host, port, secure, user, pass } = req.body || {};
  if (!host) return res.json({ ok: false, error: 'Missing: host' });
  if (!user) return res.json({ ok: false, error: 'Missing: user (email)' });
  if (!pass) return res.json({ ok: false, error: 'Missing: pass (password)' });

  try {
    const transporter = buildTransporter({ host, port, secure, user, pass });
    await transporter.verify();
    transporter.close();
    console.log(`✅ Connection OK: ${user} @ ${host}`);
    res.json({ ok: true, message: 'Connection successful' });
  } catch (e) {
    console.error(`❌ test-connection failed: ${e.message}`);
    res.json({ ok: false, error: friendlyError(e.message) });
  }
});

// ════════════════════════════════════════════════════════════
// NEW v3.0 — SEND VIA CUSTOM SMTP
// POST /send-custom
// Body: { host, port, secure, user, pass, fromName, to, subject, body }
// Works with cPanel, Hostinger, Zoho, Outlook, Yahoo, iCloud, Yandex,
// Fastmail, Gmail/Workspace, or any manual SMTP.
// ════════════════════════════════════════════════════════════
app.post('/send-custom', async (req, res) => {
  console.log('📧 /send-custom:', JSON.stringify({ ...req.body, pass: '***' }));

  const { host, port, secure, user, pass, fromName, to, subject, body, trackingId } = req.body || {};

  if (!host) return res.json({ ok: false, error: 'Missing: host' });
  if (!user) return res.json({ ok: false, error: 'Missing: user (email)' });
  if (!pass) return res.json({ ok: false, error: 'Missing: pass (password)' });
  if (!to)   return res.json({ ok: false, error: 'Missing: to (recipient)' });

  if (!user.includes('@')) return res.json({ ok: false, error: 'Invalid sender email' });
  if (!to.includes('@'))   return res.json({ ok: false, error: 'Invalid recipient email' });

  try {
    const transporter = buildTransporter({ host, port, secure, user, pass });
    await transporter.verify();

    const senderName = (fromName && fromName.trim()) || user.trim().split('@')[0];

    // ── LeadOutfy tracking pixel (only when trackingId is provided) ──
    const _TRACK_BASE = 'https://lead-outfy-backend-vercel.vercel.app/api/t/open';
    const _pixel = trackingId
      ? `<img src="${_TRACK_BASE}?id=${encodeURIComponent(trackingId)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0"/>`
      : '';

    const info = await transporter.sendMail({
      from:    `"${senderName}" <${user.trim()}>`,
      to:      to.trim(),
      subject: subject || 'Hello from LeadOutfy',
      text:    body    || '',
      html:    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222">
                  ${(body||'').replace(/\n/g,'<br/>')}
                  <br/><br/>
                  <hr style="border:none;border-top:1px solid #eee"/>
                  <small style="color:#999">Sent via LeadOutfy</small>
                  ${_pixel}
                </div>`,
      headers: {
        'X-Mailer':         'LeadOutfy v3.0',
        'X-Priority':       '3',
        'List-Unsubscribe': `<mailto:${user.trim()}?subject=unsubscribe>`,
      },
    });

    transporter.close();
    console.log(`✅ Sent (custom): ${user} → ${to} | ID: ${info.messageId}`);
    res.json({ ok: true, messageId: info.messageId, from: user, to });

  } catch (e) {
    console.error(`❌ /send-custom failed: ${e.message}`);
    res.json({ ok: false, error: friendlyError(e.message) });
  }
});

// ════════════════════════════════════════
// SIMPLE SEND — n8n থেকে direct call  (UNCHANGED)
// POST /send
// Body: { from, pass, to, subject, body }
// ════════════════════════════════════════
app.post('/send', async (req, res) => {
  console.log('📧 /send called:', JSON.stringify(req.body));

  const { from, pass, to, subject, body } = req.body;

  if (!from) return res.json({ ok: false, error: 'Missing: from (gmail address)' });
  if (!pass) return res.json({ ok: false, error: 'Missing: pass (app password)' });
  if (!to)   return res.json({ ok: false, error: 'Missing: to (recipient)' });

  if (!from.includes('@'))  return res.json({ ok: false, error: 'Invalid from email' });
  if (!to.includes('@'))    return res.json({ ok: false, error: 'Invalid to email' });

  try {
    const transporter = nodemailer.createTransport({
      host:   'smtp.gmail.com',
      port:   587,
      secure: false,
      auth:   { user: from.trim(), pass: pass.trim() },
      tls:    { rejectUnauthorized: false },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from:    `"LeadOutfy" <${from.trim()}>`,
      to:      to.trim(),
      subject: subject || 'Hello from LeadOutfy',
      text:    body    || '',
      html:    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222">
                  ${(body||'').replace(/\n/g,'<br/>')}
                  <br/><br/>
                  <hr style="border:none;border-top:1px solid #eee"/>
                  <small style="color:#999">Sent via LeadOutfy</small>
                </div>`,
      headers: {
        'X-Mailer':        'LeadOutfy v2.0',
        'X-Priority':      '3',
        'List-Unsubscribe': `<mailto:${from.trim()}?subject=unsubscribe>`,
      },
    });

    console.log(`✅ Sent: ${from} → ${to} | ID: ${info.messageId}`);
    res.json({ ok: true, messageId: info.messageId, from, to });

  } catch(e) {
    console.error(`❌ Failed: ${e.message}`);
    let msg = e.message;
    if (msg.includes('Invalid login') || msg.includes('Username and Password') || msg.includes('credentials')) {
      msg = 'Gmail credentials invalid. Check App Password.';
    } else if (msg.includes('ETIMEDOUT') || msg.includes('timeout')) {
      msg = 'SMTP connection timeout. Try again.';
    }
    res.json({ ok: false, error: msg });
  }
});

// ════════════════════════════════════════
// WEBHOOK FORMAT — extension payload  (UNCHANGED)
// POST /webhook-send
// ════════════════════════════════════════
app.post('/webhook-send', async (req, res) => {
  console.log('📧 /webhook-send called:', JSON.stringify(req.body));

  const b = req.body;

  const gmail = b.gmail       || b.body?.gmail;
  const lead  = b.lead        || b.body?.lead;
  const emailMsg = b.email_message || b.body?.email_message || '';

  if (!gmail?.from || !gmail?.pass) {
    return res.json({ ok: false, error: 'Missing gmail.from or gmail.pass', received_keys: Object.keys(b) });
  }

  const to      = gmail.to || lead?.email || '';
  const subject = gmail.subject || 'Hello from LeadOutfy';
  const body    = gmail.body    || emailMsg || '';

  if (!to || !to.includes('@')) {
    return res.json({ ok: false, error: 'No valid recipient email. Lead has no email?', to });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 587, secure: false,
      auth: { user: gmail.from.trim(), pass: gmail.pass.trim() },
      tls:  { rejectUnauthorized: false },
    });

    await transporter.verify();

    const info = await transporter.sendMail({
      from:    `"LeadOutfy" <${gmail.from.trim()}>`,
      to:      to.trim(),
      subject: subject,
      text:    body,
      html:    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7;color:#222">
                  ${body.replace(/\n/g,'<br/>')}
                  <br/><br/>
                  <hr style="border:none;border-top:1px solid #eee"/>
                  <small style="color:#999">Sent via LeadOutfy</small>
                </div>`,
      headers: {
        'X-Mailer':        'LeadOutfy v2.0',
        'X-Priority':      '3',
        'List-Unsubscribe': `<mailto:${gmail.from.trim()}?subject=unsubscribe>`,
      },
    });

    console.log(`✅ Sent: ${gmail.from} → ${to}`);
    res.json({ ok: true, messageId: info.messageId, from: gmail.from, to });

  } catch(e) {
    console.error(`❌ Failed: ${e.message}`);
    let msg = e.message;
    if (msg.includes('Invalid login') || msg.includes('credentials')) msg = 'Gmail credentials invalid. Check App Password.';
    res.json({ ok: false, error: msg });
  }
});

// ════════════════════════════════════════
// BULK SEND  (UNCHANGED)
// POST /send-bulk
// ════════════════════════════════════════
app.post('/send-bulk', async (req, res) => {
  const { from, pass, leads, delayMs = 3000 } = req.body;
  if (!from || !pass || !leads?.length) return res.json({ ok: false, error: 'Missing: from, pass, leads' });

  res.json({ ok: true, total: leads.length, status: 'queued' });

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: from.trim(), pass: pass.trim() },
    tls:  { rejectUnauthorized: false },
    pool: true, maxConnections: 2, maxMessages: 50,
  });

  (async () => {
    let sent = 0, failed = 0;
    for (const lead of leads) {
      if (!lead.to?.includes('@')) { failed++; continue; }
      try {
        await transporter.sendMail({
          from: `"LeadOutfy" <${from.trim()}>`,
          to:   lead.to.trim(),
          subject: lead.subject || 'Hello',
          text:    lead.body    || '',
          html:    `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.7">
                      ${(lead.body||'').replace(/\n/g,'<br/>')}
                    </div>`,
        });
        sent++;
        console.log(`Bulk ${sent}/${leads.length} → ${lead.to}`);
      } catch(e) { failed++; console.error(`Bulk fail: ${lead.to} — ${e.message}`); }
      if (delayMs > 0) await sleep(delayMs);
    }
    console.log(`✅ Bulk done. Sent:${sent} Failed:${failed}`);
    transporter.close();
  })();
});

app.listen(PORT, () => {
  console.log(`LeadOutfy Email Server v3.0 on port ${PORT}`);
  console.log(`Routes: GET /health | POST /send | POST /webhook-send | POST /send-bulk | POST /send-custom | POST /test-connection`);
});
