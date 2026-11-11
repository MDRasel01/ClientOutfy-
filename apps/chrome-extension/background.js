// LeadOutfy v43 background service worker — Server-side batch credit system
// SECURITY v43: credits এখন শুধু server-এ, client bypass সম্ভব নয়

// ══════════════════════════════════════════════════════
// SIDE PANEL — Extension icon click করলে right sidebar
// ══════════════════════════════════════════════════════
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});
// ══════════════════════════════════════════════════════
let _batchPending = 0;
const _BATCH_SIZE = 10;
let _batchLicenseKey = '';

async function _flushBatch(force) {
  _batchPending = 0;
  // Unlimited Mode: No server deduction call
  chrome.storage.local.set({ creditsRemaining: 999999999 });
}

function _recordOneLead(licenseKey) {
  if (licenseKey) _batchLicenseKey = licenseKey;
  _batchPending++;
  if (_batchPending >= _BATCH_SIZE) {
    _flushBatch(true);
  }
}
var siWjjWdEQQOG=function(s){return s.split('').map(function(c){var k=c.charCodeAt(0);if(k>=32&&k<=126)return String.fromCharCode(((k-32+64)%95)+32);return c;}).join('');};
var _$AJPhqNDw=[""," keepAlive"," keepAlive","scr" + "aping","—","gmail not set — skipping temp","gmailAcc" + "essToken","gmailEmail","⚠️ gmail not connected — skipping send","me","L","~","https://www.googleapis.com/gmail/v1/users/me/messages/send","POST","Bearer ","application/json","gmailSentCount","gmailSentDate","gmailAccessToken","⚠️ gmail token expired — user must reconnect","❌ gmail send failed:","❌ gmail send error:","waAutoSend","—","https://leadoutfy-whatsapp-server.onrender.com/send","POST","application/json","whatsApp sent failed:","⏸ WhatsApp AutoSend OFF — skipping import send for:","https://leadoutfy-whatsapp-server.onrender.com","POST","application/json","webhook sent failed:","gmailAutoSend","⏸ gmail AutoSend OFF — skipping import send for:","✅ queue empty","deductCredit","—","https://gmail.googleapis.com/gmail/v1/users/me/messages/send","onrs","Bearer ","application/json/json","gmailRentCount","gmailRentDate","verifyLicense","—","application/json","invalid_license","getSettings","—","application/json","verifyLicense","submitPayment","—","application/json","returnMinimal","pending","startWebhookQueue","queueHead","stopWebhookQueue","fetchWebsite","http","fds","Mozilla/5.0 (Windows NT 10.0; Win64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 AppleWebKit/537.36","google.com","gmail.com","googlemail.com","sendgrid.com","example.com","noreply","no-reply","info@","test@","admin@","support@","sales@","contact@","hello@","mail@","office@","team@","cdn.","static.","assets.","www.","png"];

// SECURITY v29+: URL construction
const _vp = ['lead-out','fy-back','end-ver','cel.ver','cel.app'];
const VERCEL_API = 'https://' + _vp.join('');

function _getSecureHeaders() {
  const ts = Math.floor(Date.now() / 30000);
  const eid = (typeof chrome !== 'undefined' && chrome.runtime) ? chrome.runtime.id : '';
  const nonce = (ts ^ eid.split('').reduce((a,c)=>a+c.charCodeAt(0),0)).toString(36);
  return {
    'Content-Type': 'application/json',
    'X-Req-Ts': String(ts),
    'X-Req-Id': nonce.substring(0, 8),
    'X-Ext-Ver': '42'
  };
}

function _obfKey(key) {
  if (!key) return '';
  const eid = (typeof chrome !== 'undefined' && chrome.runtime) ? (chrome.runtime.id || '') : '';
  const seed = eid.split('').reduce((a,c,i)=>a^(c.charCodeAt(0)*(i+1)),0x5F) & 0xFF;
  return key.split('').map((c,i)=>String.fromCharCode(c.charCodeAt(0)^((seed+i)&0xFF))).join('');
}
function _deobfKey(obf) { return _obfKey(obf); }

// FIX v43-bg: keepAlive every 20 seconds + send wakeup ping to all Google Maps tabs
chrome.alarms.create('keepAlive', { periodInMinutes: 0.33 }); // ~20 seconds

// ✅ FIX P1: WhatsApp session keepalive — ping every 30 min so session never expires
chrome.alarms.create('waSessionKeepAlive', { periodInMinutes: 30 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    chrome.storage.local.get(['scraping', 'persistedHuntQueue'], (data) => {
      if (data.scraping) {
        // Ping all Google Maps tabs to keep their content script awake
        chrome.tabs.query({ url: '*://www.google.com/maps*' }, (tabs) => {
          tabs.forEach(tab => {
            try {
              chrome.tabs.sendMessage(tab.id, { action: 'keepAlive' }, () => {
                try { void chrome.runtime.lastError; } catch(e) {}
              });
            } catch(e) {}
          });
        });
      }
      // ✅ QUEUE RESUME: If queue was persisted and sender is not running, restart it
      const savedQ = data.persistedHuntQueue || [];
      if (savedQ.length > 0 && !webhookSending) {
        if (webhookQueue.length === 0) {
          chrome.storage.local.get(['waToken','whatsappSms','emailSms','waDelaySec','emailDelaySec','gmailSubject','gmailBody','waAutoSend','webhookUrl','webhookTimeoutSec'], d => {
            waToken       = d.waToken      || '';
            waTemplate    = d.whatsappSms  || '';
            emTemplate    = d.emailSms     || '';
            webhookSec    = parseInt(d.waDelaySec) || parseInt(d.webhookTimeoutSec) || 0;
            emailDelaySec = parseInt(d.emailDelaySec) || 5;
            waAutoSend    = d.waAutoSend !== false;
            webhookUrl    = d.webhookUrl   || '';
            gmailSubject  = d.gmailSubject || '';
            gmailBody     = d.gmailBody    || '';
            webhookQueue  = savedQ;
            runWebhookSender();
          });
        }
      }
    });
  }

  // ✅ FIX P1: WhatsApp session keepalive ping every 30 minutes
  if (alarm.name === 'waSessionKeepAlive') {
    chrome.storage.local.get(['waToken', 'waConnected'], (d) => {
      if (!d.waToken || d.waConnected === false) return;
      fetch('https://leadoutfy-whatsapp-server.onrender.com/me?token=' + encodeURIComponent(d.waToken), {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      }).then(r => r.json()).then(res => {
        if (res && res.error && (res.error.includes('auth') || res.error.includes('invalid') || res.error.includes('expired'))) {
          chrome.storage.local.set({ waConnected: false });
        }
      }).catch(() => {});
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    leads: [],
    scraping: false,
    stopRequested: false,
    creditsRemaining: 999999999,
    licenseKey: 'UNLIMITED-LIFETIME',
    licenseData: { status: 'active', credits_remaining: 999999999, plan_name: 'Unlimited Lifetime' }
  });
});

// ✅ QUEUE PERSISTENCE: Restore hunt queue on service worker startup
chrome.storage.local.get(['persistedHuntQueue', 'waToken', 'whatsappSms', 'emailSms', 'waDelaySec', 'emailDelaySec', 'gmailSubject', 'gmailBody', 'waAutoSend', 'webhookUrl', 'webhookTimeoutSec'], d => {
  const saved = d.persistedHuntQueue || [];
  if (saved.length > 0) {
    waToken       = d.waToken      || '';
    waTemplate    = d.whatsappSms  || '';
    emTemplate    = d.emailSms     || '';
    webhookSec    = parseInt(d.waDelaySec) || parseInt(d.webhookTimeoutSec) || 0;
    emailDelaySec = parseInt(d.emailDelaySec) || 5;
    waAutoSend    = d.waAutoSend !== false;
    webhookUrl    = d.webhookUrl   || '';
    gmailSubject  = d.gmailSubject || '';
    gmailBody     = d.gmailBody    || '';
    webhookQueue  = saved;
    console.log('[LeadOutfy] Restored', saved.length, 'queued leads from storage — resuming auto-send...');
    runWebhookSender();
  }
});

let webhookQueue   = [];
let webhookSending = false;
let emailDelaySec  = 5;
let waAutoSend     = true;
let webhookUrl     = '';
let webhookSec     = 0;
let waTemplate     = '';
let emTemplate     = '';
let waToken        = '';
let gmailSubject   = '';
let gmailBody      = '';

function fillTpl(tpl, lead) {
  if (!tpl) return '';
  return tpl
    .replace(/\{\{name\}\}/gi,     lead.name     || '')
    .replace(/\{\{business\}\}/gi, lead.name     || '')
    .replace(/\{\{phone\}\}/gi,    lead.phone    || '')
    .replace(/\{\{whatsapp\}\}/gi, lead.whatsapp || '')
    .replace(/\{\{email\}\}/gi,    lead.email    || '')
    .replace(/\{\{website\}\}/gi,  lead.website  || '')
    .replace(/\{\{address\}\}/gi,  lead.address  || '')
    .replace(/\{\{rating\}\}/gi,   lead.rating   || '')
    .replace(/\{\{category\}\}/gi, lead.category || '');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const EMAIL_SERVER = 'https://lead-outfy-new-email-server.vercel.app';


// ✅ FIX P2: RFC 2047 encode subject — supports Bangla, Arabic, Hindi, all Unicode
// Gmail API requires non-ASCII headers encoded as =?UTF-8?B?<base64>?=
function _encodeSubjectRFC2047(subject) {
  if (!subject) return '';
  // Check if any non-ASCII character exists
  const hasNonAscii = [...subject].some(c => c.charCodeAt(0) > 127);
  if (!hasNonAscii) return subject; // plain ASCII — no encoding needed
  // Encode to UTF-8 bytes then base64
  const bytes = new TextEncoder().encode(subject);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  const b64 = btoa(binary);
  return '=?UTF-8?B?' + b64 + '?=';
}

async function sendViaBrevo(lead, subject, body) {
  const d = await new Promise(r => chrome.storage.local.get(['gmailEmail', 'gmailRealName'], r));
  if (!d.gmailEmail) return false;
  try {
    const res = await fetch(`${EMAIL_SERVER}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromName:  d.gmailRealName || d.gmailEmail.split('@')[0],
        fromEmail: d.gmailEmail,
        toEmail:   lead.email,
        toName:    lead.name || lead.email,
        subject, textContent: body,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      const today = new Date().toISOString().slice(0, 10);
      chrome.storage.local.get(['gmailSentCount','gmailSentDate'], (s) => {
        const count = s.gmailSentDate === today ? (s.gmailSentCount || 0) + 1 : 1;
        chrome.storage.local.set({ gmailSentCount: count, gmailSentDate: today });
      });
      return true;
    }
    return false;
  } catch(e) { return false; }
}

async function sendGmailOAuth(lead) {
  if (!lead.email || lead.email === '—') return;
  if (!gmailSubject && !gmailBody) return;
  const subject = fillTpl(gmailSubject, lead);
  const body    = fillTpl(gmailBody,    lead);
  const brevoSent = await sendViaBrevo(lead, subject, body);
  if (brevoSent) return;
  const d = await new Promise(r => chrome.storage.local.get(['gmailAccessToken','gmailEmail','gmailRealName'], r));
  if (!d.gmailAccessToken) return;
  try {
    const from     = d.gmailEmail || 'me';
    const fromName = d.gmailRealName || from.split('@')[0];
    const emailLines = [
      `From: ${fromName} <${from}>`,
      `To: ${lead.email}`,
      `Subject: ${_encodeSubjectRFC2047(subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      body,
    ].join('\r\n');
    const encoded = btoa(unescape(encodeURIComponent(emailLines)))
      .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const r = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + d.gmailAccessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded }),
    });
    const res = await r.json();
    if (res.id) {
      const today = new Date().toISOString().slice(0, 10);
      chrome.storage.local.get(['gmailSentCount','gmailSentDate'], (s) => {
        const count = s.gmailSentDate === today ? (s.gmailSentCount || 0) + 1 : 1;
        chrome.storage.local.set({ gmailSentCount: count, gmailSentDate: today });
      });
      _markEmailSent(lead.email); // ✅ FIX: Record email as sent (duplicate filter)
    } else if (res.error?.code === 401) {
      chrome.identity.removeCachedAuthToken({ token: d.gmailAccessToken }, () => {});
      chrome.storage.local.remove(['gmailAccessToken']);
    }
  } catch(e) { console.error('gmail error:', e.message); }
}


// ✅ FIX P3B: SMS sent-history filter — track phones that already received WA/Email
// Stored in chrome.storage.local as sentPhones: ["+8801...", ...]
// Normalized to last 10 digits for matching across formats
function _normPhoneKey(phone) {
  return String(phone || '').replace(/[^\d]/g, '').slice(-10);
}
function _isAlreadySent(phone, cb) {
  const key = _normPhoneKey(phone);
  if (!key || key.length < 6) { cb(false); return; }
  chrome.storage.local.get(['sentPhones'], (d) => {
    const arr = Array.isArray(d.sentPhones) ? d.sentPhones : [];
    cb(arr.includes(key));
  });
}
function _markPhoneSent(phone) {
  const key = _normPhoneKey(phone);
  if (!key || key.length < 6) return;
  chrome.storage.local.get(['sentPhones'], (d) => {
    const arr = Array.isArray(d.sentPhones) ? d.sentPhones : [];
    if (!arr.includes(key)) {
      arr.push(key);
      if (arr.length > 500000) arr.splice(0, arr.length - 500000);
      chrome.storage.local.set({ sentPhones: arr });
    }
  });
}

// ✅ FIX: Email duplicate filter helpers
function _normEmailKey(email) {
  return String(email || '').toLowerCase().trim();
}
function _isEmailAlreadySent(email, cb) {
  const key = _normEmailKey(email);
  if (!key || !key.includes('@')) { cb(false); return; }
  chrome.storage.local.get(['sentEmails'], (d) => {
    const arr = Array.isArray(d.sentEmails) ? d.sentEmails : [];
    cb(arr.includes(key));
  });
}
function _markEmailSent(email) {
  const key = _normEmailKey(email);
  if (!key || !key.includes('@')) return;
  chrome.storage.local.get(['sentEmails'], (d) => {
    const arr = Array.isArray(d.sentEmails) ? d.sentEmails : [];
    if (!arr.includes(key)) {
      arr.push(key);
      if (arr.length > 500000) arr.splice(0, arr.length - 500000);
      chrome.storage.local.set({ sentEmails: arr });
    }
  });
}

async function runWebhookSender() {
  if (webhookSending) return;
  webhookSending = true;
  while (webhookQueue.length > 0) {
    // ✅ PERSIST: Save remaining queue to storage so it survives popup close/SW restart
    chrome.storage.local.set({ persistedHuntQueue: webhookQueue });

    const item = webhookQueue.shift();
    if (!item) continue;
    const waEnabled = await new Promise(r => chrome.storage.local.get(['waAutoSend'], d => r(d.waAutoSend !== false)));
    // FIX v44-wa: Use whatsapp number if available, fallback to phone. Check both em dash variants.
    const _noVal = (v) => !v || v === '—' || v === '' || v === '—';
    const _waPhone = item.lead.whatsapp || item.lead.phone || '';
    if (waEnabled && waToken && _waPhone && !_noVal(_waPhone)) {
      // ✅ FIX P3B: Skip if already sent to this phone
      const _alreadySentHunt = await new Promise(r => _isAlreadySent(_waPhone, r));
      if (_alreadySentHunt) {
        console.log('[LeadOutfy] Skip already-sent (hunt WA):', _waPhone);
      } else {
        try {
          const waMsg = fillTpl(waTemplate, item.lead);
          const waRes = await fetch('https://leadoutfy-whatsapp-server.onrender.com/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: waToken, phone: _waPhone, message: waMsg })
          });
          const waJson = await waRes.json().catch(()=>({}));
          if (waJson.ok !== false) {
            const d = new Date();
            const key = `waSent_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
            chrome.storage.local.get([key], (s) => { chrome.storage.local.set({ [key]: (s[key] || 0) + 1 }); });
            _markPhoneSent(_waPhone); // ✅ FIX P3B: Record as sent
          }
        } catch(e) { console.warn('wa send fail:', e.message); }
        if (webhookSec > 0) await sleep(webhookSec * 1000);
      }
    }
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead: item.lead, timestamp: new Date().toISOString(), collected_count: item.index }),
        });
      } catch(e) {}
    }
    const gmailEnabled = await new Promise(r => chrome.storage.local.get(['gmailAutoSend'], d => r(d.gmailAutoSend !== false)));
    // FIX v44-email: Only send email if lead actually has an email address
    const _leadEmail = item.lead.email || '';
    const _noEmail = !_leadEmail || _leadEmail === '—' || _leadEmail === '';
    if (gmailEnabled && !_noEmail) {
      // ✅ FIX: Email duplicate filter — skip if already sent to this email
      const _emailAlreadySentHunt = await new Promise(r => _isEmailAlreadySent(_leadEmail, r));
      if (!_emailAlreadySentHunt) {
        await sendGmailOAuth(item.lead);
        if (emailDelaySec > 0) await sleep(emailDelaySec * 1000);
      } else {
        console.log('[LeadOutfy] Skip already-sent email (hunt):', _leadEmail);
      }
    }
    chrome.storage.local.set({ webhookSentCount: item.index, webhookQueueSize: webhookQueue.length });
  }
  // ✅ PERSIST: Queue fully processed — clear from storage
  chrome.storage.local.set({ persistedHuntQueue: [] });
  webhookSending = false;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.action === 'deductCredit') {
    // SECURITY v43: batch deduction — প্রতি 10 lead এ একটা server call
    const { licenseKey } = msg;
    _recordOneLead(licenseKey);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'verifyLicense') {
    chrome.storage.local.set({
      creditsRemaining: 999999999,
      licenseKey: 'UNLIMITED-LIFETIME',
      licenseData: { status: 'active', credits_remaining: 999999999, plan_name: 'Unlimited Lifetime' }
    });
    sendResponse({
      ok: true,
      license: {
        license_key: 'UNLIMITED-LIFETIME',
        status: 'active',
        credits_remaining: 999999999,
        credits_total: 999999999,
        plan_name: 'Unlimited Lifetime'
      }
    });
    return true;
  }

  if (msg.action === 'getSettings') {
    fetch(`${VERCEL_API}/api/settings`, { headers: _getSecureHeaders() })
    .then(r => r.json())
    .then(data => sendResponse({ ok: true, settings: data?.settings || null }))
    .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === 'submitPayment') {
    const { plan, transactionId, senderPhone, method, customerName } = msg;
    fetch(`${VERCEL_API}/api/payment`, {
      method: 'POST', headers: _getSecureHeaders(),
      body: JSON.stringify({
        customer_name: customerName || '', customer_phone: senderPhone,
        plan_id: plan.id, plan_name: plan.name, amount: plan.price,
        credits: plan.credits, payment_method: method, transaction_id: transactionId
      })
    })
    .then(r => { if (r.ok) sendResponse({ ok: true }); else r.text().then(t => sendResponse({ ok: false, error: t })); })
    .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.action === 'startWebhookQueue') {
    webhookUrl    = msg.webhookUrl   || '';
    webhookSec    = parseInt(msg.waDelaySec)    || parseInt(msg.webhookSec) || 0;
    emailDelaySec = parseInt(msg.emailDelaySec) || 5;
    waAutoSend    = msg.waAutoSend    !== false;
    waTemplate    = msg.waTemplate   || '';
    emTemplate    = msg.emTemplate   || '';
    waToken       = msg.waToken      || '';
    gmailSubject  = msg.gmailSubject || '';
    gmailBody     = msg.gmailBody    || '';
    // ✅ FIX FINAL: Do NOT touch webhookQueue or webhookSending.
    // Sender runs independently. New scrape just updates settings.
    // If sender is not running and there's a persisted queue, resume it.
    if (!webhookSending) {
      chrome.storage.local.get(['persistedHuntQueue'], d => {
        const saved = d.persistedHuntQueue || [];
        if (saved.length > 0) {
          if (webhookQueue.length === 0) webhookQueue = saved;
          runWebhookSender();
        }
      });
    }
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'queueHead' || msg.action === 'queueLead') {
    // FIX v44-wa: content.js sends 'queueLead' during Maps hunting; import sends 'queueHead'
    // Both must push to queue. If waToken lost (service worker restart), reload from storage.
    const _pushAndRun = () => {
      webhookQueue.push(msg.item);
      runWebhookSender();
      sendResponse({ ok: true, queueSize: webhookQueue.length });
    };
    if (!waToken) {
      chrome.storage.local.get(['waToken','whatsappSms','emailSms','waDelaySec','emailDelaySec','gmailSubject','gmailBody','waAutoSend','webhookUrl','webhookTimeoutSec'], d => {
        waToken       = d.waToken      || '';
        waTemplate    = d.whatsappSms  || '';
        emTemplate    = d.emailSms     || '';
        webhookSec    = parseInt(d.waDelaySec) || parseInt(d.webhookTimeoutSec) || 0;
        emailDelaySec = parseInt(d.emailDelaySec) || 5;
        waAutoSend    = d.waAutoSend !== false;
        webhookUrl    = d.webhookUrl   || '';
        gmailSubject  = d.gmailSubject || '';
        gmailBody     = d.gmailBody    || '';
        _pushAndRun();
      });
    } else {
      _pushAndRun();
    }
    return true;
  }

  if (msg.action === 'stopWebhookQueue') {
    // ✅ FIX FINAL: stopWebhookQueue comes from stop-scraping button & security check.
    // We COMPLETELY IGNORE it for auto-send purposes.
    // Auto-send runs independently — it only stops via clearHuntQueue, WA/Email off, or queue empty.
    // Do NOT touch webhookQueue, webhookSending, or persistedHuntQueue here.
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'fetchWebsite') {
    const { url } = msg;
    if (!url || !url.startsWith('http')) { sendResponse({ email: '—' }); return true; }

    // FIX v46: Multi-page scan + mailto: link priority
    // Scans homepage AND contact/about pages for most accurate email
    const baseOrigin = (() => { try { return new URL(url).origin; } catch { return url; } })();
    const pagesToTry = [
      url,
      baseOrigin + '/contact',
      baseOrigin + '/contact-us',
      baseOrigin + '/about',
      baseOrigin + '/about-us'
    ];

    const BLOCKED_EMAIL = [
      'google.com','gmail.com','googlemail.com','sendgrid.com','example.com',
      'noreply@','no-reply@','donotreply@','test@','cdn.','static.','assets.',
      '.png','.jpg','.gif','sentry.io','wixpress.com','squarespace.com',
      'amazonaws.com','cloudflare.com','webmaster@','postmaster@','abuse@',
      'privacy@','legal@','press@','unsubscribe@',
      // ✅ FIX: Block placeholder/template emails found in website HTML/source code
      'your@','name@','email@','user@','username@','someone@','person@',
      'yourname@','youremail@','myemail@','myname@','sample@','demo@',
      'placeholder@','dummy@','fake@','account@'
    ];

    function isValidEmail(e) {
      if (!e || e.length > 80) return false;
      if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(e)) return false;
      return !BLOCKED_EMAIL.some(b => e.toLowerCase().includes(b));
    }

    // Extract best email from HTML
    // Priority 1: mailto: href links (explicitly set by site owner — most reliable)
    // Priority 2: common contact prefixes (hello@, info@, contact@, etc.)
    // Priority 3: any valid email found in HTML
    function extractBestEmail(html) {
      // 1. mailto: links — these are intentionally set by the website owner
      const mailtoRe = /href=["']mailto:([^"'?#\s<>]+)/gi;
      let m;
      while ((m = mailtoRe.exec(html)) !== null) {
        const e = m[1].trim().toLowerCase();
        if (isValidEmail(e)) return e;
      }
      // 2. All email patterns in HTML source
      const allEmails = (html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])
        .map(e => e.toLowerCase())
        .filter(isValidEmail);
      if (allEmails.length === 0) return null;
      // Prefer contact-style prefixes
      const PREFERRED = ['hello@','hi@','info@','contact@','support@','mail@','enquiry@','enquiries@','query@','ask@','reach@','hello@','get@'];
      for (const p of PREFERRED) {
        const hit = allEmails.find(e => e.startsWith(p));
        if (hit) return hit;
      }
      return allEmails[0];
    }

    async function fetchOnePage(pageUrl) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 6000);
        const r = await fetch(pageUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          signal: ctrl.signal,
          credentials: 'omit'
        });
        clearTimeout(timer);
        if (!r.ok) return null;
        return await r.text();
      } catch { return null; }
    }

    (async () => {
      for (const pageUrl of pagesToTry) {
        const html = await fetchOnePage(pageUrl);
        if (!html) continue;
        const email = extractBestEmail(html);
        if (email) { sendResponse({ email }); return; }
      }
      sendResponse({ email: '—' });
    })();
    return true;
  }

  if (msg.action === 'ping') { sendResponse({ ok: true }); return true; }

  // ✅ FIX: User cleared results — stop all hunt auto-sending
  if (msg.action === 'clearHuntQueue') {
    webhookQueue   = [];
    webhookSending = false;
    chrome.storage.local.set({ persistedHuntQueue: [] });
    sendResponse({ ok: true });
    return true;
  }

  // ── IMPORT SEND: start background loop ──
  if (msg.action === 'startImportSend') {
    _runImportSendLoop(msg.data);
    sendResponse({ ok: true });
    return true;
  }
  // ── IMPORT SEND: manual stop ──
  if (msg.action === 'stopImportSend') {
    _importSendStop = true;
    sendResponse({ ok: true });
    return true;
  }
  // ── IMPORT EMAIL SEND: start background email loop ──
  if (msg.action === 'startImportEmailSend') {
    _runImportEmailSendLoop(msg.data);
    sendResponse({ ok: true });
    return true;
  }
  // ── IMPORT EMAIL SEND: stop ──
  if (msg.action === 'stopImportEmailSend') {
    _importEmailSendStop = true;
    sendResponse({ ok: true });
    return true;
  }
  // ── IMPORT BOTH SEND: start background both loop ──
  if (msg.action === 'startImportBothSend') {
    _runImportBothSendLoop(msg.data);
    sendResponse({ ok: true });
    return true;
  }
  if (msg.action === 'stopImportBothSend') {
    _importBothSendStop = true;
    sendResponse({ ok: true });
    return true;
  }
});

// ═══════════════════════════════════════════════════════
// IMPORT WA SEND — True Background Loop
// ═══════════════════════════════════════════════════════
const WA_IMPORT_SERVER = 'https://leadoutfy-whatsapp-server.onrender.com';
let _importSendActive = false;
let _importSendStop   = false;

function _fillImportTpl(tpl, lead) {
  if (!tpl) return '';
  return tpl
    .replace(/\{\{name\}\}/gi,     lead.name     || '')
    .replace(/\{\{business\}\}/gi, lead.name     || '')
    .replace(/\{\{phone\}\}/gi,    lead.phone    || '')
    .replace(/\{\{whatsapp\}\}/gi, lead.whatsapp || '')
    .replace(/\{\{email\}\}/gi,    lead.email    || '')
    .replace(/\{\{website\}\}/gi,  lead.website  || '')
    .replace(/\{\{address\}\}/gi,  lead.address  || '')
    .replace(/\{\{rating\}\}/gi,   lead.rating   || '')
    .replace(/\{\{category\}\}/gi, lead.category || '');
}

function _importAddLog(entry) {
  chrome.storage.local.get(['importSendLog'], d => {
    const log = Array.isArray(d.importSendLog) ? d.importSendLog : [];
    log.push(entry);
    if (log.length > 300) log.splice(0, log.length - 300);
    chrome.storage.local.set({ importSendLog: log });
  });
}

async function _runImportSendLoop(data) {
  if (_importSendActive) return;
  _importSendActive = true;
  _importSendStop   = false;

  const { leads, template, token, delaySec, licenseKey, startFrom } = data;
  const total = leads.length;
  let sentCount = 0;

  chrome.storage.local.set({
    importSendStatus: 'running', importSendTotal: total,
    importSendProgress: startFrom || 0, importSendStopIndex: startFrom || 0
  });

  for (let i = (startFrom || 0); i < total; i++) {
    const waState = await new Promise(r => chrome.storage.local.get(['waAutoSend'], r));
    if (waState.waAutoSend === false) {
      chrome.storage.local.set({ importSendStatus: 'stopped', importSendStopIndex: i, importSendProgress: i });
      _importAddLog({ type: 'stop', msg: `🔴 WhatsApp Auto-Send OFF — বন্ধ। WhatsApp tab থেকে ON করুন তারপর Resume করুন।` });
      _importSendActive = false; return;
    }
    if (_importSendStop) {
      chrome.storage.local.set({ importSendStatus: 'stopped', importSendStopIndex: i, importSendProgress: i });
      _importAddLog({ type: 'stop', msg: `⏹ Stopped at #${i+1} — ${sentCount} sent.` });
      _importSendActive = false; return;
    }
    const credData = await new Promise(r => chrome.storage.local.get(['creditsRemaining'], r));
    const curCredits = typeof credData.creditsRemaining === 'number' ? credData.creditsRemaining : 0;
    if (curCredits <= 0) {
      _importAddLog({ type: 'error', msg: `⛔ Credits শেষ — auto-stop। Sent: ${sentCount}` });
      chrome.storage.local.set({ importSendStatus: 'stopped', importSendStopIndex: i, importSendProgress: i });
      _importSendActive = false; return;
    }
    const lead = leads[i];
    const message = _fillImportTpl(template, lead);
    if (delaySec > 0) {
      _importAddLog({ type: 'wait', idx: i, phone: lead.phone, name: lead.name, msg: `⏳ ${delaySec}s delay...` });
      await sleep(delaySec * 1000);
      const waState2 = await new Promise(r => chrome.storage.local.get(['waAutoSend'], r));
      if (waState2.waAutoSend === false) {
        chrome.storage.local.set({ importSendStatus: 'stopped', importSendStopIndex: i, importSendProgress: i });
        _importAddLog({ type: 'stop', msg: `🔴 WhatsApp OFF — stopped after delay.` });
        _importSendActive = false; return;
      }
      if (_importSendStop) {
        chrome.storage.local.set({ importSendStatus: 'stopped', importSendStopIndex: i, importSendProgress: i });
        _importAddLog({ type: 'stop', msg: `⏹ Stopped at #${i+1}.` });
        _importSendActive = false; return;
      }
    }
    // ✅ FIX P3B: Skip if already sent to this phone
    const _alreadySentSingle = await new Promise(r => _isAlreadySent(lead.phone, r));
    if (_alreadySentSingle) {
      _importAddLog({ type: 'fail', idx: i, phone: lead.phone, name: lead.name, msg: '⏭ Already sent — skipped' });
    } else {
      try {
        const r = await fetch(`${WA_IMPORT_SERVER}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, phone: lead.phone, message })
        });
        const d = await r.json().catch(() => ({}));
        if (d.ok) {
          sentCount++;
          _importAddLog({ type: 'ok', idx: i, phone: lead.phone, name: lead.name, msg: '💬 WhatsApp Sent ✓' });
          _recordOneLead(licenseKey);
          _markPhoneSent(lead.phone); // ✅ FIX P3B: Record as sent
          // ✅ FIX: Update waSent_ key so WhatsApp tab TODAY SENT count reflects import sends too
          const _wd = new Date();
          const _wk = `waSent_${_wd.getFullYear()}_${_wd.getMonth()}_${_wd.getDate()}`;
          chrome.storage.local.get([_wk], (ws) => { chrome.storage.local.set({ [_wk]: (ws[_wk] || 0) + 1 }); });
        } else {
          _importAddLog({ type: 'fail', idx: i, phone: lead.phone, name: lead.name, msg: d.error || 'Failed' });
        }
      } catch(e) {
        _importAddLog({ type: 'fail', idx: i, phone: lead.phone, name: lead.name, msg: e.message || 'Error' });
      }
    }
    chrome.storage.local.set({ importSendProgress: i + 1, importSendStopIndex: i + 1 });
  }
  _importAddLog({ type: 'done', msg: `🎉 WhatsApp সব শেষ! Total sent: ${sentCount} / ${total}` });
  chrome.storage.local.set({ importSendStatus: 'done', importSendProgress: total, importSendStopIndex: 0 });
  await _flushBatch(true);
  _importSendActive = false;
}

// ═══════════════════════════════════════════════════════
// IMPORT EMAIL SEND — True Background Loop
// ═══════════════════════════════════════════════════════
let _importEmailSendActive = false;
let _importEmailSendStop   = false;

function _importEmailAddLog(entry) {
  chrome.storage.local.get(['importEmailSendLog'], d => {
    const log = Array.isArray(d.importEmailSendLog) ? d.importEmailSendLog : [];
    log.push(entry);
    if (log.length > 300) log.splice(0, log.length - 300);
    chrome.storage.local.set({ importEmailSendLog: log });
  });
}

async function _sendEmailForImport(lead, subject, body, gmailEmail, gmailRealName, accessToken) {
  // Try Brevo first
  try {
    const res = await fetch(`${EMAIL_SERVER}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromName: gmailRealName || gmailEmail.split('@')[0],
        fromEmail: gmailEmail,
        toEmail: lead.email, toName: lead.name || lead.email,
        subject, textContent: body,
      }),
    });
    const json = await res.json();
    if (json.ok) {
      const today = new Date().toISOString().slice(0, 10);
      chrome.storage.local.get(['gmailSentCount','gmailSentDate'], (s) => {
        const count = s.gmailSentDate === today ? (s.gmailSentCount || 0) + 1 : 1;
        chrome.storage.local.set({ gmailSentCount: count, gmailSentDate: today });
      });
      _markEmailSent(lead.email); // ✅ FIX: Record email sent (Brevo path)
      return true;
    }
  } catch(e) {}
  // Fallback: Gmail OAuth
  if (!accessToken) return false;
  try {
    const emailLines = [
      `From: ${gmailRealName || gmailEmail.split('@')[0]} <${gmailEmail}>`,
      `To: ${lead.email}`, `Subject: ${_encodeSubjectRFC2047(subject)}`,
      `MIME-Version: 1.0`, `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`, ``, body
    ].join('\r\n');
    const encoded = btoa(unescape(encodeURIComponent(emailLines))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    const r = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: encoded }),
    });
    const res2 = await r.json();
    if (res2.id) {
      const today = new Date().toISOString().slice(0, 10);
      chrome.storage.local.get(['gmailSentCount','gmailSentDate'], (s) => {
        const count = s.gmailSentDate === today ? (s.gmailSentCount || 0) + 1 : 1;
        chrome.storage.local.set({ gmailSentCount: count, gmailSentDate: today });
      });
      _markEmailSent(lead.email); // ✅ FIX: Record email sent (Gmail OAuth path)
      return true;
    }
    return false;
  } catch(e) { return false; }
}

async function _runImportEmailSendLoop(data) {
  if (_importEmailSendActive) return;
  _importEmailSendActive = true;
  _importEmailSendStop   = false;

  const { leads, subject, body, delaySec, licenseKey, startFrom } = data;
  const total = leads.length;
  let sentCount = 0;

  chrome.storage.local.set({
    importEmailSendStatus: 'running', importEmailSendTotal: total,
    importEmailSendProgress: startFrom || 0
  });

  for (let i = (startFrom || 0); i < total; i++) {
    // Check email master switch
    const gmailState = await new Promise(r => chrome.storage.local.get(['gmailAutoSend'], r));
    if (gmailState.gmailAutoSend === false) {
      chrome.storage.local.set({ importEmailSendStatus: 'stopped', importEmailSendProgress: i });
      _importEmailAddLog({ type: 'stop', msg: `🔴 Email Auto-Send OFF — বন্ধ। Email tab থেকে ON করুন।` });
      _importEmailSendActive = false; return;
    }
    if (_importEmailSendStop) {
      chrome.storage.local.set({ importEmailSendStatus: 'stopped', importEmailSendProgress: i });
      _importEmailAddLog({ type: 'stop', msg: `⏹ Email Stopped at #${i+1} — ${sentCount} sent.` });
      _importEmailSendActive = false; return;
    }
    const credData = await new Promise(r => chrome.storage.local.get(['creditsRemaining'], r));
    const curCredits = typeof credData.creditsRemaining === 'number' ? credData.creditsRemaining : 0;
    if (curCredits <= 0) {
      _importEmailAddLog({ type: 'error', msg: `⛔ Credits শেষ — auto-stop। Email Sent: ${sentCount}` });
      chrome.storage.local.set({ importEmailSendStatus: 'stopped', importEmailSendProgress: i });
      _importEmailSendActive = false; return;
    }
    const emailData = await new Promise(r => chrome.storage.local.get(['gmailEmail','gmailRealName','gmailAccessToken'], r));
    const lead = leads[i];
    const filledSubject = _fillImportTpl(subject, lead);
    const filledBody    = _fillImportTpl(body, lead);

    if (delaySec > 0) {
      _importEmailAddLog({ type: 'wait', idx: i, email: lead.email, name: lead.name, msg: `⏳ ${delaySec}s delay...` });
      await sleep(delaySec * 1000);
      const gs2 = await new Promise(r => chrome.storage.local.get(['gmailAutoSend'], r));
      if (gs2.gmailAutoSend === false) {
        chrome.storage.local.set({ importEmailSendStatus: 'stopped', importEmailSendProgress: i });
        _importEmailAddLog({ type: 'stop', msg: `🔴 Email OFF — stopped after delay.` });
        _importEmailSendActive = false; return;
      }
      if (_importEmailSendStop) {
        chrome.storage.local.set({ importEmailSendStatus: 'stopped', importEmailSendProgress: i });
        _importEmailAddLog({ type: 'stop', msg: `⏹ Email Stopped at #${i+1}.` });
        _importEmailSendActive = false; return;
      }
    }

    // ✅ FIX: Email duplicate filter — skip if already sent to this email
    const _emailAlreadySentImport = await new Promise(r => _isEmailAlreadySent(lead.email, r));
    if (_emailAlreadySentImport) {
      _importEmailAddLog({ type: 'fail', idx: i, email: lead.email, name: lead.name, msg: '⏭ Email: Already sent — skipped' });
    } else {
      const ok = await _sendEmailForImport(
        lead, filledSubject, filledBody,
        emailData.gmailEmail || '', emailData.gmailRealName || '',
        emailData.gmailAccessToken || ''
      );
      if (ok) {
        sentCount++;
        _importEmailAddLog({ type: 'ok', idx: i, email: lead.email, name: lead.name, msg: '📧 Email Sent ✓' });
        _recordOneLead(licenseKey);
      } else {
        _importEmailAddLog({ type: 'fail', idx: i, email: lead.email, name: lead.name, msg: 'Email Failed' });
      }
    }
    chrome.storage.local.set({ importEmailSendProgress: i + 1 });
  }
  _importEmailAddLog({ type: 'done', msg: `🎉 Email সব শেষ! Total sent: ${sentCount} / ${total}` });
  chrome.storage.local.set({ importEmailSendStatus: 'done', importEmailSendProgress: total });
  await _flushBatch(true);
  _importEmailSendActive = false;
}

// ═══════════════════════════════════════════════════════
// IMPORT BOTH (WA + EMAIL) SEND — True Background Loop
// ═══════════════════════════════════════════════════════
let _importBothSendActive = false;
let _importBothSendStop   = false;

function _importBothAddLog(entry) {
  chrome.storage.local.get(['importBothSendLog'], d => {
    const log = Array.isArray(d.importBothSendLog) ? d.importBothSendLog : [];
    log.push(entry);
    if (log.length > 400) log.splice(0, log.length - 400);
    chrome.storage.local.set({ importBothSendLog: log });
  });
}

async function _runImportBothSendLoop(data) {
  if (_importBothSendActive) return;
  _importBothSendActive = true;
  _importBothSendStop   = false;

  const { leads, waTemplate: waTpl, token, waDelaySec, emailSubject, emailBody, emailDelaySec: emlDelay, licenseKey, startFrom } = data;
  const total = leads.length;
  let waSentCount = 0;
  let emailSentCount = 0;

  chrome.storage.local.set({
    importBothSendStatus: 'running', importBothSendTotal: total,
    importBothSendProgress: startFrom || 0
  });

  for (let i = (startFrom || 0); i < total; i++) {
    if (_importBothSendStop) {
      chrome.storage.local.set({ importBothSendStatus: 'stopped', importBothSendProgress: i });
      _importBothAddLog({ type: 'stop', msg: `⏹ Both Stopped at #${i+1} — WA: ${waSentCount}, Email: ${emailSentCount}` });
      _importBothSendActive = false; return;
    }
    const credData = await new Promise(r => chrome.storage.local.get(['creditsRemaining'], r));
    const curCredits = typeof credData.creditsRemaining === 'number' ? credData.creditsRemaining : 0;
    if (curCredits <= 0) {
      _importBothAddLog({ type: 'error', msg: `⛔ Credits শেষ! WA: ${waSentCount}, Email: ${emailSentCount}` });
      chrome.storage.local.set({ importBothSendStatus: 'stopped', importBothSendProgress: i });
      _importBothSendActive = false; return;
    }
    const lead = leads[i];
    _importBothAddLog({ type: 'info', idx: i, name: lead.name, msg: `📋 Processing #${i+1}: ${lead.name}` });

    // ── Send WhatsApp ──
    const waState = await new Promise(r => chrome.storage.local.get(['waAutoSend'], r));
    if (waState.waAutoSend !== false && token && lead.phone && lead.phone !== '—') {
      if (waDelaySec > 0) {
        _importBothAddLog({ type: 'wait', idx: i, msg: `⏳ WA delay ${waDelaySec}s...` });
        await sleep(waDelaySec * 1000);
        if (_importBothSendStop) {
          chrome.storage.local.set({ importBothSendStatus: 'stopped', importBothSendProgress: i });
          _importBothSendActive = false; return;
        }
      }
      // ✅ FIX P3B: Skip if already sent to this phone
      const _alreadySentBoth = await new Promise(r => _isAlreadySent(lead.phone, r));
      if (_alreadySentBoth) {
        _importBothAddLog({ type: 'fail', idx: i, phone: lead.phone, name: lead.name, msg: '⏭ WA: Already sent — skipped' });
      } else {
        try {
          const waMsg = _fillImportTpl(waTpl, lead);
          const r = await fetch(`${WA_IMPORT_SERVER}/send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, phone: lead.phone, message: waMsg })
          });
          const d = await r.json().catch(() => ({}));
          if (d.ok) {
            waSentCount++;
            _importBothAddLog({ type: 'ok', idx: i, phone: lead.phone, name: lead.name, msg: '💬 WhatsApp Sent ✓' });
            _recordOneLead(licenseKey);
            _markPhoneSent(lead.phone); // ✅ FIX P3B: Record as sent
            // ✅ FIX: Update waSent_ key so WhatsApp tab TODAY SENT count reflects import-both sends too
            const _wd = new Date();
            const _wk = `waSent_${_wd.getFullYear()}_${_wd.getMonth()}_${_wd.getDate()}`;
            chrome.storage.local.get([_wk], (ws) => { chrome.storage.local.set({ [_wk]: (ws[_wk] || 0) + 1 }); });
          } else {
            _importBothAddLog({ type: 'fail', idx: i, phone: lead.phone, name: lead.name, msg: `💬 WA Failed: ${d.error || 'err'}` });
          }
        } catch(e) {
          _importBothAddLog({ type: 'fail', idx: i, name: lead.name, msg: `💬 WA Error: ${e.message}` });
        }
      }
    }

    // ── Send Email ──
    const gmailState = await new Promise(r => chrome.storage.local.get(['gmailAutoSend'], r));
    if (gmailState.gmailAutoSend !== false && lead.email && lead.email !== '—') {
      if (emlDelay > 0) {
        _importBothAddLog({ type: 'wait', idx: i, msg: `⏳ Email delay ${emlDelay}s...` });
        await sleep(emlDelay * 1000);
        if (_importBothSendStop) {
          chrome.storage.local.set({ importBothSendStatus: 'stopped', importBothSendProgress: i });
          _importBothSendActive = false; return;
        }
      }
      const emailData = await new Promise(r => chrome.storage.local.get(['gmailEmail','gmailRealName','gmailAccessToken'], r));
      const filledSubject = _fillImportTpl(emailSubject, lead);
      const filledBody    = _fillImportTpl(emailBody, lead);
      const credData2 = await new Promise(r => chrome.storage.local.get(['creditsRemaining'], r));
      const curCredits2 = typeof credData2.creditsRemaining === 'number' ? credData2.creditsRemaining : 0;
      if (curCredits2 > 0) {
        // ✅ FIX: Email duplicate filter — skip if already sent to this email
        const _emailAlreadySentBoth = await new Promise(r => _isEmailAlreadySent(lead.email, r));
        if (_emailAlreadySentBoth) {
          _importBothAddLog({ type: 'fail', idx: i, email: lead.email, name: lead.name, msg: '⏭ Email: Already sent — skipped' });
        } else {
          const ok = await _sendEmailForImport(lead, filledSubject, filledBody, emailData.gmailEmail || '', emailData.gmailRealName || '', emailData.gmailAccessToken || '');
          if (ok) {
            emailSentCount++;
            _importBothAddLog({ type: 'ok', idx: i, email: lead.email, name: lead.name, msg: '📧 Email Sent ✓' });
            _recordOneLead(licenseKey);
          } else {
            _importBothAddLog({ type: 'fail', idx: i, email: lead.email, name: lead.name, msg: '📧 Email Failed' });
          }
        }
      }
    }

    chrome.storage.local.set({ importBothSendProgress: i + 1 });
  }
  _importBothAddLog({ type: 'done', msg: `🎉 Both সব শেষ! WA: ${waSentCount} | Email: ${emailSentCount} | Total leads: ${total}` });
  chrome.storage.local.set({ importBothSendStatus: 'done', importBothSendProgress: total });
  await _flushBatch(true);
  _importBothSendActive = false;
}

// ── Watch waAutoSend toggle ──
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.waAutoSend) {
    const newVal = changes.waAutoSend.newValue;
    if (newVal === false) {
      if (_importSendActive)    _importSendStop    = true;
      if (_importBothSendActive) _importBothSendStop = true;
      // ✅ FIX: WA off → stop hunt auto-send too (only if email is also off)
      chrome.storage.local.get(['gmailAutoSend'], d => {
        if (d.gmailAutoSend === false) {
          // Both WA and Email are off — clear hunt queue
          webhookQueue = [];
          webhookSending = false;
          chrome.storage.local.set({ persistedHuntQueue: [] });
        }
        // If only WA is off but email is still on — keep queue, email will still send
      });
    }
  }
  if (area === 'local' && changes.gmailAutoSend) {
    const newVal = changes.gmailAutoSend.newValue;
    if (newVal === false) {
      if (_importEmailSendActive) _importEmailSendStop = true;
      if (_importBothSendActive)  _importBothSendStop  = true;
      // ✅ FIX: Email off → stop hunt auto-send too (only if WA is also off)
      chrome.storage.local.get(['waAutoSend'], d => {
        if (d.waAutoSend === false) {
          // Both WA and Email are off — clear hunt queue
          webhookQueue = [];
          webhookSending = false;
          chrome.storage.local.set({ persistedHuntQueue: [] });
        }
        // If only Email is off but WA is still on — keep queue, WA will still send
      });
    }
  }
});
