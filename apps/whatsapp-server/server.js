// =============================================
// LeadOutfy WhatsApp Server v4.0
// Features: Typing Effect, Voice, Always Online,
//           Auto-Read, Account Protection, Message Logging
// =============================================

import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import pino from 'pino';
import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { existsSync, mkdirSync, appendFileSync } from 'fs';

const app  = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({ limit: '10mb' }));
const logger = pino({ level: 'silent' });
const sessions = {};

function generateToken(phone) {
  const rand = Math.random().toString(36).substr(2,10).toUpperCase();
  const ts   = Date.now().toString(36).toUpperCase();
  return `LOA-WA-${rand}-${ts}`;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getAuthDir(sid) {
  const dir = `/tmp/wa_sessions/${sid}`;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}
function formatPhone(phone) {
  let num = String(phone).replace(/\D/g,'');
  if (num.startsWith('0') && num.length===11) num = '880' + num.slice(1);
  return num + '@s.whatsapp.net';
}
function getToken(req) {
  return req.headers.authorization?.replace('Bearer ','') || req.body?.token || req.query?.token;
}
function logMessage(sess, direction, phone, content) {
  if (!sess.settings?.messageLogging) return;
  if (!sess.msgLog) sess.msgLog = [];
  sess.msgLog.push({ ts: new Date().toISOString(), direction, phone, content });
  if (sess.msgLog.length > 200) sess.msgLog.shift();
}
function _applyAlwaysOnline(sess) {
  _clearAlwaysOnline(sess);
  if (!sess.settings?.alwaysOnline || !sess.sock) return;
  sess.alwaysOnlineInterval = setInterval(async () => {
    try { await sess.sock.sendPresenceUpdate('available'); } catch(e){}
  }, 25000);
}
function _clearAlwaysOnline(sess) {
  if (sess.alwaysOnlineInterval) { clearInterval(sess.alwaysOnlineInterval); sess.alwaysOnlineInterval = null; }
}

app.get('/', (req, res) => res.json({ ok:true, service:'LeadOutfy WhatsApp API', version:'4.0' }));

// ── START SESSION ──
app.post('/session/start', async (req, res) => {
  const sessionId = 'SID-' + Math.random().toString(36).substr(2,8).toUpperCase();
  sessions[sessionId] = {
    sock:null, status:'initializing', qrBase64:null, phone:null, token:null, sessionId,
    settings: { typingEffect:true, accountProtection:true, messageLogging:false, alwaysOnline:false, autoReadIncoming:false },
    msgLog: [], alwaysOnlineInterval: null,
  };
  res.json({ ok:true, sessionId });
  _startSession(sessionId);
});

async function _startSession(sessionId) {
  const sess = sessions[sessionId];
  if (!sess) return;
  try {
    const { state, saveCreds } = await useMultiFileAuthState(getAuthDir(sessionId));
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      version, logger, auth: state,
      printQRInTerminal: false,
      browser: ['LeadOutfy','Chrome','120.0'],
      connectTimeoutMs: 60000, defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 15000, generateHighQualityLinkPreview: false, syncFullHistory: false,
    });
    sess.sock = sock;
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        sess.qrBase64 = await qrcode.toDataURL(qr);
        sess.status   = 'qr_ready';
        console.log(`[${sessionId}] QR ready`);
      }
      if (connection === 'open') {
        const phone = sock.user?.id?.split(':')[0] || 'unknown';
        sess.status = 'connected'; sess.phone = phone; sess.qrBase64 = null;
        if (!sess.token) { sess.token = generateToken(phone); sessions[sess.token] = sess; }
        console.log(`[${sessionId}] Connected: ${phone} | Token: ${sess.token}`);
        _applyAlwaysOnline(sess);
      }
      if (connection === 'close') {
        _clearAlwaysOnline(sess);
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          sess.status = 'disconnected';
          console.log(`[${sessionId}] Logged out — needs new QR`);
        } else {
          // ✅ FIX: Faster reconnect (2s instead of 4s) so messages aren't lost as long
          sess.status = 'reconnecting';
          console.log(`[${sessionId}] Disconnected (code ${code}) — reconnecting in 2s...`);
          setTimeout(() => _startSession(sessionId), 2000);
        }
      }
    });
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe) continue;
        const from = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '[media]';
        logMessage(sess, 'IN', from, text);
        if (sess.settings?.autoReadIncoming) {
          try { await sock.readMessages([msg.key]); } catch(e){}
        }
      }
    });
    sock.ev.on('creds.update', saveCreds);
  } catch(e) {
    console.error(`[${sessionId}] Error:`, e.message);
    if (sess) { sess.status='error'; sess.error=e.message; }
  }
}

// ── STATUS ──
app.get('/session/status/:sessionId', (req, res) => {
  const sess = sessions[req.params.sessionId];
  if (!sess || sess.token === req.params.sessionId) return res.json({ ok:false, error:'Session not found' });
  res.json({ ok:true, status:sess.status, qr:sess.qrBase64||null, token:sess.status==='connected'?sess.token:null, phone:sess.phone||null, error:sess.error||null, settings:sess.settings||null });
});

// ── VERIFY TOKEN ──
app.get('/me', (req, res) => {
  const token = getToken(req);
  if (!token) return res.json({ ok:false, error:'No token' });
  const sess = sessions[token];
  if (!sess || sess.status!=='connected') return res.json({ ok:false, error:'Invalid or disconnected token' });
  res.json({ ok:true, phone:sess.phone, status:sess.status, token, settings:sess.settings });
});

// ── UPDATE SETTINGS ──
app.post('/session/settings', (req, res) => {
  const token = getToken(req);
  const sess = sessions[token];
  if (!sess || sess.status!=='connected') return res.json({ ok:false, error:'Invalid or disconnected token' });
  const allowed = ['typingEffect','accountProtection','messageLogging','alwaysOnline','autoReadIncoming'];
  for (const key of allowed) { if (req.body[key] !== undefined) sess.settings[key] = !!req.body[key]; }
  _applyAlwaysOnline(sess);
  console.log(`[${sess.sessionId}] Settings updated:`, sess.settings);
  res.json({ ok:true, settings:sess.settings });
});

// ── GET SETTINGS ──
app.get('/session/settings', (req, res) => {
  const token = getToken(req);
  const sess = sessions[token];
  if (!sess || sess.status!=='connected') return res.json({ ok:false, error:'Invalid or disconnected token' });
  res.json({ ok:true, settings:sess.settings });
});

// ── MESSAGE LOGS ──
app.get('/session/logs', (req, res) => {
  const token = getToken(req);
  const sess = sessions[token];
  if (!sess || sess.status!=='connected') return res.json({ ok:false, error:'Invalid or disconnected token' });
  res.json({ ok:true, logs: sess.msgLog || [] });
});

// ── SEND TEXT ──
app.post('/send', async (req, res) => {
  const { token, phone, message } = req.body;
  if (!token||!phone||!message) return res.json({ ok:false, error:'Missing: token, phone, message' });
  const sess = sessions[token];
  if (!sess) return res.json({ ok:false, error:'Invalid token' });

  // ✅ FIX: If session is reconnecting, wait briefly for it to come back (up to 8s)
  // This prevents lost messages during temporary disconnects while hunting.
  if (sess.status !== 'connected') {
    let waited = 0;
    while (sess.status !== 'connected' && waited < 8000) {
      await sleep(1000);
      waited += 1000;
    }
    if (sess.status !== 'connected') {
      return res.json({ ok:false, error:'Not connected: '+sess.status });
    }
  }

  // ✅ FIX: Retry the actual send up to 2 times (handles transient WhatsApp socket errors)
  let lastErr = 'send failed';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const jid = formatPhone(phone);
      if (sess.settings?.typingEffect) {
        await sess.sock.sendPresenceUpdate('composing', jid);
        const d = sess.settings?.accountProtection ? 1000+Math.random()*1500 : 500+Math.random()*500;
        await sleep(d);
        await sess.sock.sendPresenceUpdate('paused', jid);
      }
      const result = await sess.sock.sendMessage(jid, { text: message });
      logMessage(sess, 'OUT', phone, message);
      return res.json({ ok:true, messageId:result?.key?.id||null, phone:jid.replace('@s.whatsapp.net',''), status:'sent' });
    } catch(e) {
      lastErr = e.message;
      console.warn(`[send] attempt ${attempt}/2 failed for ${phone}: ${e.message}`);
      if (attempt < 2) await sleep(1500); // wait then retry
    }
  }
  return res.json({ ok:false, error:lastErr });
});

// ── SEND VOICE (audio URL → Voice Note PTT) ──
app.post('/send-voice', async (req, res) => {
  const { token, phone, audioUrl } = req.body;
  if (!token||!phone||!audioUrl) return res.json({ ok:false, error:'Missing: token, phone, audioUrl' });
  const sess = sessions[token];
  if (!sess) return res.json({ ok:false, error:'Invalid token' });
  if (sess.status!=='connected') return res.json({ ok:false, error:'Not connected: '+sess.status });
  try {
    const jid = formatPhone(phone);
    // Recording indicator
    if (sess.settings?.typingEffect) {
      await sess.sock.sendPresenceUpdate('recording', jid);
      await sleep(1200 + Math.random()*1000);
      await sess.sock.sendPresenceUpdate('paused', jid);
    }
    // Fetch audio from public URL
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) return res.json({ ok:false, error:`Audio URL fetch failed: ${audioResp.status}` });
    const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
    const isOgg = audioUrl.toLowerCase().includes('.ogg');
    const result = await sess.sock.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: isOgg ? 'audio/ogg; codecs=opus' : 'audio/mp4',
      ptt: true,
    });
    logMessage(sess, 'OUT-VOICE', phone, audioUrl);
    res.json({ ok:true, messageId:result?.key?.id||null, phone:jid.replace('@s.whatsapp.net',''), status:'sent', type:'voice' });
  } catch(e) { res.json({ ok:false, error:e.message }); }
});

// ── BULK SEND ──
app.post('/send-bulk', async (req, res) => {
  const { token, leads, delayMs=3000 } = req.body;
  if (!token||!leads?.length) return res.json({ ok:false, error:'Missing params' });
  const sess = sessions[token];
  if (!sess||sess.status!=='connected') return res.json({ ok:false, error:'Invalid or disconnected token' });
  res.json({ ok:true, total:leads.length, status:'queued' });
  (async()=>{
    let sent=0,failed=0;
    for (const lead of leads) {
      try {
        if (!lead.phone){failed++;continue;}
        const jid = formatPhone(lead.phone);
        if (sess.settings?.typingEffect) {
          await sess.sock.sendPresenceUpdate('composing',jid);
          await sleep(800+Math.random()*1000);
          await sess.sock.sendPresenceUpdate('paused',jid);
        }
        await sess.sock.sendMessage(jid,{text:lead.message});
        logMessage(sess,'OUT',lead.phone,lead.message);
        sent++;
      } catch(e) { failed++; }
      const d = sess.settings?.accountProtection ? Math.max(delayMs,3000) : delayMs;
      if (d>0) await sleep(d);
    }
    console.log(`Bulk done. Sent:${sent} Failed:${failed}`);
  })();
});

// ── DISCONNECT ──
app.post('/session/disconnect', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ ok:false, error:'No token' });
  const sess = sessions[token];
  if (!sess) return res.json({ ok:false, error:'Not found' });
  _clearAlwaysOnline(sess);
  try { await sess.sock?.logout(); } catch(e){}
  const sid = sess.sessionId;
  delete sessions[token];
  if (sid) delete sessions[sid];
  res.json({ ok:true });
});

app.listen(PORT, () => {
  console.log(`LeadOutfy WhatsApp API v4.0 on port ${PORT}`);
  console.log(`Typing ✅ | Voice ✅ | AlwaysOnline ✅ | AutoRead ✅ | Protection ✅`);
});
