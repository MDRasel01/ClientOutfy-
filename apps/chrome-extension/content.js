// LeadOutfy v45 — content.js (FIXED: real website/email, panel-sync wait, dedup, filters)
'use strict';

(function () {

  let scraping = false;
  let stopRequested = false;
  let collected = [];
  let panel = null;
  let isDragging = false, dragOffX = 0, dragOffY = 0;
  let pingInterval = null;

  // Track consecutive duplicate websites (stale panel detection)
  let _lastWebsiteSeen = '';
  let _sameWebsiteCount = 0;
  const MAX_SAME_WEBSITE = 4;

  const COUNTRY_CODES = {
    'Bangladesh':'880','India':'91','Pakistan':'92','USA':'1','UK':'44',
    'UAE':'971','Canada':'1','Australia':'61','Germany':'49',
    'Saudi Arabia':'966','Turkey':'90','Indonesia':'62','Malaysia':'60',
    'Nigeria':'234','Egypt':'20','Philippines':'63','China':'86','Japan':'81',
    'South Korea':'82','Brazil':'55','Mexico':'52','Argentina':'54',
    'South Africa':'27','Kenya':'254','Ghana':'233','Ethiopia':'251',
    'Tanzania':'255','Uganda':'256','France':'33','Italy':'39','Spain':'34',
    'Netherlands':'31','Sweden':'46','Norway':'47','Denmark':'45','Finland':'358',
    'Poland':'48','Romania':'40','Czech Republic':'420','Hungary':'36',
    'Portugal':'351','Greece':'30','Belgium':'32','Switzerland':'41',
    'Austria':'43','Israel':'972','Iran':'98','Iraq':'964','Kuwait':'965',
    'Qatar':'974','Bahrain':'973','Oman':'968','Jordan':'962','Lebanon':'961',
    'Syria':'963','Yemen':'967','Libya':'218','Morocco':'212','Algeria':'213',
    'Tunisia':'216','Sudan':'249','Somalia':'252','Sri Lanka':'94','Nepal':'977',
    'Myanmar':'95','Thailand':'66','Vietnam':'84','Cambodia':'855','Laos':'856',
    'Singapore':'65','Hong Kong':'852','Taiwan':'886','New Zealand':'64',
    'Russia':'7','Ukraine':'380','Kazakhstan':'7','Uzbekistan':'998',
    'Afghanistan':'93','Maldives':'960','Bhutan':'975','Mongolia':'976',
    'Colombia':'57','Chile':'56','Peru':'51','Venezuela':'58','Ecuador':'593',
    'Bolivia':'591','Paraguay':'595','Uruguay':'598','Cuba':'53',
    'Dominican Republic':'1809','Guatemala':'502','Honduras':'504',
    'El Salvador':'503','Nicaragua':'505','Costa Rica':'506','Panama':'507',
    'Jamaica':'1876','Trinidad':'1868','Cameroon':'237','Ivory Coast':'225',
    'Senegal':'221','Mali':'223','Burkina Faso':'226','Guinea':'224',
    'Angola':'244','Mozambique':'258','Zambia':'260','Zimbabwe':'263',
    'Botswana':'267','Namibia':'264','Rwanda':'250','Burundi':'257',
    'DRC Congo':'243','Malawi':'265',
  };

  function isContextAlive() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); } catch(e) { return false; }
  }

  function safeSendMessage(msg, cb) {
    if (!isContextAlive()) { if (cb) cb(null); return; }
    try {
      chrome.runtime.sendMessage(msg, (resp) => {
        try { void chrome.runtime.lastError; } catch(e) {}
        if (cb) cb(resp);
      });
    } catch(e) { stopPing(); if (cb) cb(null); }
  }

  function safeStorageGet(keys, cb) {
    if (!isContextAlive()) { cb({}); return; }
    try { chrome.storage.local.get(keys, cb); } catch(e) { cb({}); }
  }

  function safeStorageSet(obj, cb) {
    if (!isContextAlive()) { if (cb) cb(); return; }
    try { chrome.storage.local.set(obj, cb); } catch(e) { if (cb) cb(); }
  }

  function startPing() {
    if (pingInterval) return;
    pingInterval = setInterval(() => {
      if (!isContextAlive()) { stopPing(); return; }
      safeSendMessage({ action: 'ping' });
    }, 15000);
  }

  function stopPing() {
    if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
  }

  let _keepAliveTimer = null;
  function startKeepAliveWorker() {
    if (_keepAliveTimer) return;
    _keepAliveTimer = setInterval(() => {
      if (isContextAlive() && scraping) {
        try { chrome.runtime.sendMessage({ action: 'ping' }, () => { try { void chrome.runtime.lastError; } catch(e) {} }); } catch(e) {}
      }
    }, 10000);
  }
  function stopKeepAliveWorker() {
    if (_keepAliveTimer) { clearInterval(_keepAliveTimer); _keepAliveTimer = null; }
  }

  try {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'stopScraping') {
        stopRequested = true; scraping = false;
        updateStatus('\u26d4 Stopped by user');
        setPanelScrapingState(false); stopPing(); stopKeepAliveWorker();
        safeStorageSet({ scraping: false, stopRequested: true });
        safeSendMessage({ action: 'stopWebhookQueue' });
      }
      if (msg.action === 'toggleOverlay') {
        if (!panel) { injectPanel(); return; }
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
      if (msg.action === 'keepAlive') {
        try { sendResponse({ ok: true, scraping }); } catch(e) {}
        return true;
      }
      try { sendResponse({ ok: true }); } catch(e) {}
      return true;
    });
  } catch(e) {}

  safeStorageGet(
    ['autoStart','maxResults','fields','leads','panelPos','stopRequested','scraping'],
    (data) => {
      if (data.leads && Array.isArray(data.leads)) collected = data.leads;
      injectPanel(data.panelPos);
      if (data.scraping && !data.stopRequested) {
        setTimeout(() => startScraping(data.maxResults || 100, data.fields || []), 4000);
        return;
      }
      if (data.autoStart) {
        safeStorageSet({ autoStart: false });
        setTimeout(() => startScraping(data.maxResults || 100, data.fields || []), 3000);
      }
    }
  );

  function injectPanel(savedPos) {
    if (document.getElementById('loa-panel')) return;
    panel = document.createElement('div');
    panel.id = 'loa-panel';
    const sx = savedPos ? savedPos.x : Math.max(0, window.innerWidth - 370 - 16);
    const sy = savedPos ? savedPos.y : 70;
    panel.innerHTML = `
      <div id="loa-header">
        <span id="loa-title">\u26a1 LeadOutfy Ai Pro</span>
        <div id="loa-controls">
          <button id="loa-start">\u25b6 Start</button>
          <button id="loa-stop" style="display:none">\u23f9 Stop</button>
          <button id="loa-toggle">\u25bc</button>
        </div>
      </div>
      <div id="loa-body">
        <div id="loa-status">Ready \u2014 click \u25b6 Start or use popup</div>
        <div id="loa-stats">
          <span>Total: <b id="loa-total">0</b></span>
          <span>\ud83d\udcde <b id="loa-phone">0</b></span>
          <span>\ud83c\udf10 <b id="loa-web">0</b></span>
          <span>\u2709\ufe0f <b id="loa-email">0</b></span>
        </div>
      </div>`;
    const style = document.createElement('style');
    style.textContent = `
      #loa-panel{position:fixed;top:${sy}px;left:${sx}px;width:370px;background:#100800;
        border:2.5px solid #ff6b00;border-radius:14px;font-family:'Segoe UI',Arial,sans-serif;
        z-index:2147483647;box-shadow:0 10px 40px rgba(255,107,0,.45);overflow:hidden;user-select:none}
      #loa-header{background:linear-gradient(135deg,#a63a00,#ff6b00,#ff8c00);padding:13px 15px;
        display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:800;
        color:#fff;cursor:grab;text-shadow:0 1px 4px rgba(0,0,0,.35)}
      #loa-header:active{cursor:grabbing}
      #loa-title{flex:1;pointer-events:none}
      #loa-controls{display:flex;gap:7px;flex-shrink:0}
      #loa-controls button{padding:5px 13px;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800}
      #loa-start{background:#fff;color:#a63a00}
      #loa-stop{background:#e74c3c;color:#fff}
      #loa-toggle{background:rgba(255,255,255,.22);color:#fff}
      #loa-body{padding:13px 15px}
      #loa-status{font-size:12.5px;color:#ffccaa;margin-bottom:8px;min-height:20px;word-break:break-word;line-height:1.45}
      #loa-stats{display:flex;gap:14px;font-size:14px;color:#fff;flex-wrap:wrap}
      #loa-stats b{color:#ff6b00;font-size:16px;font-weight:900}`;
    document.head.appendChild(style);
    document.body.appendChild(panel);

    const hdr = panel.querySelector('#loa-header');
    hdr.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      dragOffX = e.clientX - panel.getBoundingClientRect().left;
      dragOffY = e.clientY - panel.getBoundingClientRect().top;
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panel.style.left = Math.max(0, Math.min(e.clientX - dragOffX, window.innerWidth - panel.offsetWidth)) + 'px';
      panel.style.top  = Math.max(0, Math.min(e.clientY - dragOffY, window.innerHeight - panel.offsetHeight)) + 'px';
    });
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        safeStorageSet({ panelPos: { x: parseInt(panel.style.left), y: parseInt(panel.style.top) } });
      }
    });

    panel.querySelector('#loa-start').addEventListener('click', () => {
      safeStorageGet(['maxResults','fields'], d => startScraping(d.maxResults || 100, d.fields || []));
    });
    panel.querySelector('#loa-stop').addEventListener('click', () => {
      stopRequested = true; scraping = false;
      updateStatus('\u26d4 Stopped');
      setPanelScrapingState(false); stopPing();
      safeStorageSet({ scraping: false, stopRequested: true });
    });
    panel.querySelector('#loa-toggle').addEventListener('click', () => {
      const b = panel.querySelector('#loa-body');
      const show = b.style.display === 'none';
      b.style.display = show ? 'block' : 'none';
      panel.querySelector('#loa-toggle').textContent = show ? '\u25bc' : '\u25b2';
    });
    updatePanelStats();
  }

  const sleep = ms => new Promise(r => {
    if (ms <= 200) { setTimeout(r, ms); return; }
    const start = Date.now();
    function tick() {
      const elapsed = Date.now() - start;
      if (elapsed >= ms) { r(); return; }
      setTimeout(tick, Math.min(200, ms - elapsed));
    }
    setTimeout(tick, Math.min(200, ms));
  });

  async function checkStop() {
    return new Promise(r => safeStorageGet(['stopRequested'], d => r(d.stopRequested === true)));
  }

  // ═══════════════════════════════════════════
  // MAIN SCRAPING LOOP
  // ═══════════════════════════════════════════
  async function startScraping(maxResults, fields) {
    if (scraping) return;
    scraping = true;
    stopRequested = false;
    collected = [];
    _lastWebsiteSeen = '';
    _sameWebsiteCount = 0;

    startPing();
    startKeepAliveWorker();

    await new Promise(r => safeStorageSet({ leads: [], scraping: true, stopRequested: false }, r));
    setPanelScrapingState(true);
    updateStatus('\ud83d\udd0d Initializing LeadOutfy Ai...');
    // ✅ FIX P3A: Do NOT cache huntedPhones in memory — always read live from storage
    // This ensures reset button works instantly without restarting the hunt
    const _huntedPhones = null; // placeholder — live storage used below
    await sleep(2500);

    const cfg = await new Promise(r => safeStorageGet([
      'webhookUrl','webhookTimeoutSec','country','whatsappSms','emailSms',
      'scrapeDelay','skipNoPhone','skipNoEmail','skipNoWebsite','skipNoAddress',
      'waToken','gmailSubject','gmailBody','waAutoSend','waDelaySec','emailDelaySec'
    ], r));

    const webhookUrl    = cfg.webhookUrl   || '';
    const webhookSec    = parseInt(cfg.webhookTimeoutSec) || 0;
    const waDelaySec    = parseInt(cfg.waDelaySec)    || 10;
    const emailDelaySec = parseInt(cfg.emailDelaySec) || 5;
    const waAutoSend    = cfg.waAutoSend !== false;
    const countryCode   = COUNTRY_CODES[cfg.country || 'Bangladesh'] || '880';
    const waTemplate    = cfg.whatsappSms  || '';
    const emTemplate    = cfg.emailSms     || '';
    const waToken       = cfg.waToken      || '';
    const gmailSubject  = cfg.gmailSubject || '';
    const gmailBody     = cfg.gmailBody    || '';
    const delay         = parseInt(cfg.scrapeDelay) || 2500;
    const skipPhone     = cfg.skipNoPhone   || false;
    const skipEmail     = cfg.skipNoEmail   || false;
    const skipWebsite   = cfg.skipNoWebsite || false;
    const skipAddress   = cfg.skipNoAddress || false;

    safeSendMessage({
      action: 'startWebhookQueue',
      webhookUrl, webhookSec, waDelaySec, emailDelaySec, waAutoSend,
      waTemplate, emTemplate, waToken, gmailSubject, gmailBody
    });

    const seenKeys     = new Set();
    const seenElements = new WeakSet();
    let scrollRetries  = 0;
    const DASH = '\u2014';
    const noVal = (v) => !v || v === DASH || v.trim() === '';

    mainLoop: while (true) {
      if (collected.length >= maxResults) break mainLoop;
      if (stopRequested || await checkStop()) { updateStatus('\u26d4 Stopped by user'); break mainLoop; }
      if (!isContextAlive()) {
        let _r = 0;
        while (_r < 5) { await sleep(2000); _r++; if (isContextAlive()) break; }
        if (!isContextAlive()) { updateStatus('\u26a0\ufe0f Extension context lost \u2014 reload Maps tab'); break mainLoop; }
      }

      let listings = [];
      try { listings = getListings(); } catch(e) { await sleep(2000); continue; }

      let processedNewThisPass = 0;

      for (let i = 0; i < listings.length; i++) {
        if (collected.length >= maxResults) break;
        if (stopRequested || await checkStop()) break;
        if (!isContextAlive()) { await sleep(1500); if (!isContextAlive()) break mainLoop; }

        const listing = listings[i];
        if (seenElements.has(listing)) continue;

        let rawName = '';
        try { rawName = getListingName(listing); } catch(e) { continue; }
        if (!rawName) continue;

        seenElements.add(listing);
        processedNewThisPass++;

        updateStatus('\u26a1 ' + (collected.length + 1) + '/' + (maxResults === 9999 ? '\u221e' : maxResults) + ': ' + rawName.slice(0,28));

        try {
          listing.click();
          // FIX v45: Wait for panel to load THIS business before extracting
          await waitForPanelToLoad(rawName, delay);

          const lead = await extractLead(rawName, countryCode);

          // Duplicate detection
          const dedupeKey = makeDedupeKey(lead);
          if (seenKeys.has(dedupeKey)) {
            updateStatus('\u23ed Duplicate skip \u2014 continuing...');
            await sleep(150);
            continue;
          }
          seenKeys.add(dedupeKey);

          // ✅ FIX INSTANT-RESET: Always read huntedPhones live from storage (never cache in memory)
          // This ensures Reset Hunt button works instantly during an active hunt session
          const _normPhone = (v) => String(v || '').replace(/[^\d]/g, '').slice(-10);
          const _leadPhoneKey = _normPhone(lead.phone);
          if (_leadPhoneKey && _leadPhoneKey.length >= 6) {
            const _liveHuntedData = await new Promise(r => safeStorageGet(['huntedPhones'], r));
            const _liveHuntedSet = new Set(Array.isArray(_liveHuntedData.huntedPhones) ? _liveHuntedData.huntedPhones : []);
            if (_liveHuntedSet.has(_leadPhoneKey)) {
              updateStatus('\u23ed Already hunted — skip: ' + rawName.slice(0,25));
              await sleep(120);
              continue;
            }
          }

          // Filter: skip if required field missing
          if (skipPhone   && noVal(lead.phone))   { updateStatus('\u23ed Skipped (no phone): ' + rawName.slice(0,25));   await sleep(150); continue; }
          if (skipEmail   && noVal(lead.email))   { updateStatus('\u23ed Skipped (no email): ' + rawName.slice(0,25));   await sleep(150); continue; }
          if (skipWebsite && noVal(lead.website)) { updateStatus('\u23ed Skipped (no website): ' + rawName.slice(0,25)); await sleep(150); continue; }
          if (skipAddress && noVal(lead.address)) { updateStatus('\u23ed Skipped (no address): ' + rawName.slice(0,25)); await sleep(150); continue; }

          // License / credit gate
          const licData = await new Promise(r => safeStorageGet(['licenseKey'], r));
          if (!licData.licenseKey) {
            stopRequested = true; scraping = false;
            updateStatus('\u274c No license key. Scraping stopped.');
            safeStorageSet({ scraping: false, stopRequested: true, statusText: '\u274c No license key found. Please activate your license.' });
            setPanelScrapingState(false);
            break mainLoop;
          }
          const creditResult = await new Promise((resolve) => {
            const gateTimeout = setTimeout(() => resolve({ ok: false, error: 'timeout' }), 3000);
            safeSendMessage(
              { action: 'deductCredit', licenseKey: licData.licenseKey },
              (resp) => { clearTimeout(gateTimeout); resolve(resp || { ok: false, error: 'no_response' }); }
            );
          });
          if (!creditResult.ok) {
            stopRequested = true; scraping = false;
            updateStatus('\u274c Credit verification failed. Disable ad/network blocker.');
            safeStorageSet({ scraping: false, stopRequested: true, statusText: '\u274c Credit verification failed.' });
            setPanelScrapingState(false);
            break mainLoop;
          }

          collected.push(lead);
          const snapshot = collected.map(l => Object.assign({}, l));
          safeStorageSet({ leads: snapshot, statusText: '\u2705 ' + collected.length + ' leads collected' });
          // ✅ FIX INSTANT-RESET: Save phone to storage — read fresh each time to avoid stale cache
          if (_leadPhoneKey && _leadPhoneKey.length >= 6) {
            const _saveHuntData = await new Promise(r => safeStorageGet(['huntedPhones'], r));
            const _saveHuntArr = Array.isArray(_saveHuntData.huntedPhones) ? _saveHuntData.huntedPhones : [];
            if (!_saveHuntArr.includes(_leadPhoneKey)) {
              _saveHuntArr.push(_leadPhoneKey);
              safeStorageSet({ huntedPhones: _saveHuntArr });
            }
          }
          updatePanelStats();

          // Queue for real-time WhatsApp + Email auto-send
          safeSendMessage({
            action: 'queueLead',
            item: { lead: Object.assign({}, lead), index: collected.length, total: maxResults }
          });

        } catch(err) {
          if (stopRequested) break mainLoop;
        }

        await sleep(250);
      }

      if (collected.length >= maxResults) break mainLoop;
      if (stopRequested || await checkStop()) break mainLoop;

      let scrolled = false;
      try { scrolled = await scrollFeed(); } catch(e) { scrolled = false; }

      if (scrolled) {
        scrollRetries = 0;
        await sleep(1800);
      } else {
        if (processedNewThisPass > 0) scrollRetries = 0;
        else scrollRetries++;
        const waitMs = scrollRetries > 30 ? 5000 : scrollRetries > 10 ? 3000 : 2000;
        updateStatus('\u23f3 Loading more... (' + collected.length + ' found)');
        await sleep(waitMs);
        if (scrollRetries > 50) scrollRetries = 0;
      }
    }

    scraping = false;
    stopPing();
    stopKeepAliveWorker();
    safeStorageSet({ scraping: false, stopRequested: false });
    setPanelScrapingState(false);
    const doneMsg = '\u2705 Done! ' + collected.length + ' leads collected.';
    updateStatus(doneMsg);
    safeStorageSet({ statusText: doneMsg });
  }

  // ═══════════════════════════════════════════
  // FIX v45: Poll panel heading until it matches
  // the clicked listing name (or timeout)
  // ═══════════════════════════════════════════
  async function waitForPanelToLoad(expectedName, baseDelay) {
    const maxWait = Math.max(baseDelay, 3500);
    const start = Date.now();
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,20);
    const namePart = norm(expectedName).substring(0,12);

    while (Date.now() - start < maxWait) {
      const heading = getPanelHeading();
      if (heading) {
        const hNorm = norm(heading);
        if (hNorm.includes(namePart) || namePart.includes(hNorm.substring(0,10))) return;
      }
      await sleep(300);
    }
    // Fallback: ensure at least baseDelay has passed
    const elapsed = Date.now() - start;
    if (elapsed < baseDelay) await sleep(baseDelay - elapsed);
  }

  function getPanelHeading() {
    for (const s of ['h1.DUwDvf','h1.fontHeadlineLarge','h1']) {
      const el = document.querySelector(s);
      if (el && el.textContent.trim()) return el.textContent.trim();
    }
    return '';
  }

  // Dedupe by name + phone (not website — same businesses can share hosts)
  function makeDedupeKey(lead) {
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g,'').substring(0,30);
    return norm(lead.name) + '||' + norm(lead.phone).substring(0,15);
  }

  function getListings() {
    const selectors = ['a[href*="/maps/place/"]','[role="article"]','.Nv2PK','.hfpxzc'];
    for (const s of selectors) {
      const els = document.querySelectorAll(s);
      if (els.length > 1) return Array.from(els);
    }
    return [];
  }

  function getListingName(el) {
    const n = el.querySelector('.qBF1Pd, .fontHeadlineSmall, .NrDZNb');
    if (n && n.textContent.trim()) return n.textContent.trim();
    return (el.getAttribute('aria-label') || el.textContent).trim().substring(0,60);
  }

  // ═══════════════════════════════════════════
  // EXTRACT LEAD — v45 fixes applied
  // ═══════════════════════════════════════════
  async function extractLead(fallback, countryCode) {
    await sleep(600);
    const DASH = '\u2014';
    const lead = { name: DASH, phone: DASH, whatsapp: DASH, email: DASH, website: DASH, address: DASH, rating: DASH, category: DASH };

    // Name (panel heading is authoritative after waitForPanelToLoad)
    lead.name = getPanelHeading() || fallback;

    // Rating
    for (const sel of ['.F7nice span[aria-hidden="true"]','.MW4etd','.ceNzKf']) {
      const el = document.querySelector(sel);
      if (el) {
        const m = (el.getAttribute('aria-label') || el.textContent).match(/(\d+\.?\d*)/);
        if (m && +m[1] >= 1 && +m[1] <= 5) { lead.rating = m[1]; break; }
      }
    }

    // Category
    for (const s of ['.DkEaL','.skqShb .fontBodyMedium','.YhemCb']) {
      const el = document.querySelector(s);
      if (el && el.textContent.trim()) { lead.category = el.textContent.trim(); break; }
    }

    // Address
    const ae = document.querySelector('button[data-item-id*="address"] .Io6YTe,[data-tooltip="Copy address"] .Io6YTe');
    if (ae) {
      lead.address = ae.textContent.trim();
    } else {
      for (const el of document.querySelectorAll('.Io6YTe')) {
        const t = el.textContent.trim();
        if (t.length > 12 && /\d/.test(t) && !t.startsWith('+') && !t.startsWith('http') && !t.includes('@')) {
          lead.address = t; break;
        }
      }
    }

    // Phone
    lead.phone = extractPhone();

    // Website (full URL with path, not just origin)
    lead.website = extractWebsite();

    // FIX v45: Stale panel / shared-host detection
    // If 4+ consecutive leads have identical websites, the panel likely
    // hasn't refreshed — clear the website for this lead
    if (lead.website !== DASH && lead.website) {
      if (lead.website === _lastWebsiteSeen) {
        _sameWebsiteCount++;
        if (_sameWebsiteCount >= MAX_SAME_WEBSITE) {
          lead.website = DASH; // likely stale — don't record it
        }
      } else {
        _lastWebsiteSeen = lead.website;
        _sameWebsiteCount = 1;
      }
    } else {
      _lastWebsiteSeen = '';
      _sameWebsiteCount = 0;
    }

    // ── FIX v46: WEBSITE EMAIL IS PRIORITY ──────────────────────────────
    // Google Maps page HTML often has wrong/auto-generated emails embedded
    // in the Business Profile JSON (e.g. support@domain.com that doesn't
    // exist on the real website). We ALWAYS fetch from the actual website
    // first, and only fall back to the Maps page email if website has none.
    //
    // Priority order:
    //   1. Email found by scraping the REAL website (most accurate)
    //   2. Email from Maps page HTML (fallback — may be wrong/auto-generated)
    //   3. '—' (nothing found)
    // ─────────────────────────────────────────────────────────────────────

    let websiteEmail = DASH;
    let mapsEmail    = DASH;

    // Step 1: Fetch from actual business website (homepage + contact pages)
    if (lead.website !== DASH && lead.website) {
      websiteEmail = await fetchEmailFromWebsite(lead.website);
    }

    // Step 2: Extract from Maps page (may be auto-generated — lower trust)
    mapsEmail = extractEmailFromPage();

    // Step 3: Choose — website email wins if found
    if (websiteEmail && websiteEmail !== DASH) {
      lead.email = websiteEmail;         // ✅ Real email from actual website
    } else if (mapsEmail && mapsEmail !== DASH) {
      lead.email = mapsEmail;            // ⚠️ Fallback: Maps listing email
    } else {
      lead.email = DASH;                 // ❌ No email found
    }

    // WhatsApp number
    if (lead.phone !== DASH && lead.phone) {
      let d = lead.phone.replace(/[^\d]/g, '');
      if (d.startsWith('0')) d = d.substring(1);
      if (!d.startsWith(countryCode)) d = countryCode + d;
      lead.whatsapp = d;
    }

    return lead;
  }

  // ═══════════════════════════════════════════
  // PHONE
  // ═══════════════════════════════════════════
  function extractPhone() {
    const DASH = '\u2014';
    for (const s of [
      'button[data-item-id*="phone"] .Io6YTe',
      'button[data-item-id*="phone"] .rogA2c',
      '[data-item-id*="phone:tel"] .Io6YTe'
    ]) {
      const el = document.querySelector(s);
      if (el && isPhone(el.textContent.trim())) return el.textContent.trim();
    }
    const tel = document.querySelector('a[href^="tel:"]');
    if (tel) { const n = tel.href.replace('tel:','').trim(); if (isPhone(n)) return n; }
    for (const el of document.querySelectorAll('.Io6YTe,.rogA2c')) {
      if (isPhone(el.textContent.trim())) return el.textContent.trim();
    }
    for (const m of (document.body.innerText.match(/(?:\+?\d[\d\s\-()+]{7,18}\d)/g) || [])) {
      if (/^\d{7,15}$/.test(m.replace(/[\s\-().+]/g,''))) return m.trim();
    }
    return DASH;
  }

  function isPhone(t) { return !!(t && /^\d{7,15}$/.test(t.replace(/[\s\-().+]/g,''))); }

  // ═══════════════════════════════════════════
  // WEBSITE — FIX v45: full URL with path
  // ═══════════════════════════════════════════
  function extractWebsite() {
    const DASH = '\u2014';
    const auth = document.querySelector('a[data-item-id*="authority"]');
    if (auth && auth.href && isGoodUrl(auth.href)) return cleanUrl(auth.href);
    for (const el of document.querySelectorAll('a[aria-label]')) {
      const lbl = (el.getAttribute('aria-label')||'').toLowerCase();
      if ((lbl.includes('website') || lbl.includes('web site')) && isGoodUrl(el.href)) return cleanUrl(el.href);
    }
    const tw = document.querySelector('[data-tooltip="Open website"],[data-tooltip="Visit website"]');
    if (tw) {
      const a2 = tw.tagName === 'A' ? tw : (tw.closest('a') || tw.querySelector('a'));
      if (a2 && a2.href && isGoodUrl(a2.href)) return cleanUrl(a2.href);
    }
    return DASH;
  }

  // FIX v45: Keep full URL path (not just origin)
  // e.g. https://example.com/bengali-restaurant  (not just https://example.com)
  function cleanUrl(u) {
    try {
      const parsed = new URL(u);
      const path = parsed.pathname.replace(/\/$/, '');
      return parsed.origin + (path || '');
    } catch { return u; }
  }

  // ═══════════════════════════════════════════
  // EMAIL from Maps page
  // ═══════════════════════════════════════════
  function extractEmailFromPage() {
    const DASH = '\u2014';
    for (const el of document.querySelectorAll('a[href^="mailto:"]')) {
      const e = el.href.replace('mailto:','').split('?')[0].trim().toLowerCase();
      if (isGoodEmail(e)) return e;
    }
    const re = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    for (const e of (document.body.innerText.match(re)||[])) { if (isGoodEmail(e)) return e.toLowerCase(); }
    for (const e of (document.body.innerHTML.match(re)||[])) { if (isGoodEmail(e)) return e.toLowerCase(); }
    return DASH;
  }

  // Fetch email from business website via background.js
  async function fetchEmailFromWebsite(url) {
    const DASH = '\u2014';
    return new Promise(resolve => {
      if (!isContextAlive() || !url || url === DASH) { resolve(DASH); return; }
      const timeout = setTimeout(() => resolve(DASH), 9000);
      try {
        chrome.runtime.sendMessage({ action: 'fetchWebsite', url }, resp => {
          clearTimeout(timeout);
          try { void chrome.runtime.lastError; } catch(e) {}
          if (!resp) { resolve(DASH); return; }
          resolve(resp.email || DASH);
        });
      } catch(e) { clearTimeout(timeout); resolve(DASH); }
    });
  }

  // Email validation: allow real business emails (info@, contact@, support@ etc.)
  function isGoodEmail(e) {
    if (!e || e.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return false;
    const bl = [
      'google.com','gmail.com','googlemail.com','sendgrid.com','example.com',
      'noreply@','no-reply@','donotreply@','test@','cdn.','static.','assets.',
      '.png','.jpg','.gif','sentry.io','wixpress.com','squarespace.com',
      'amazonaws.com','cloudflare.com','akamaitech.net',
      '@2x','@3x','notification','webmaster@','postmaster@','abuse@',
      // ✅ FIX: Block placeholder/template emails found in website HTML/source code
      'your@','name@','email@','user@','username@','someone@','person@',
      'yourname@','youremail@','myemail@','myname@','sample@','demo@',
      'placeholder@','dummy@','fake@','account@'
    ];
    return !bl.some(b => e.toLowerCase().includes(b));
  }

  // URL validation: block Google internal/redirect links
  function isGoodUrl(u) {
    if (!u || !u.startsWith('http')) return false;
    const blocked = [
      'google.com','goo.gl','maps.google','googleapis',
      'googleusercontent','google-analytics','facebook.com',
      'twitter.com','instagram.com','youtube.com','linkedin.com'
    ];
    return !blocked.some(b => u.toLowerCase().includes(b));
  }

  // ═══════════════════════════════════════════
  // SCROLL FEED
  // ═══════════════════════════════════════════
  async function scrollFeed() {
    const containers = [
      document.querySelector('[role="feed"]'),
      document.querySelector('.m6QErb[aria-label]'),
      document.querySelector('.DxyBCb'),
      document.querySelector('.m6QErb'),
    ].filter(Boolean);

    for (const fp of containers) {
      const before = fp.scrollTop;
      fp.scrollTop += 1000;
      await sleep(500);
      if (fp.scrollTop > before) return true;
    }
    const winBefore = window.scrollY;
    window.scrollBy(0, 1000);
    await sleep(500);
    if (window.scrollY !== winBefore) return true;
    return false;
  }

  function updateStatus(t) {
    const el = document.getElementById('loa-status');
    if (el) el.textContent = t;
    safeStorageSet({ statusText: t });
  }

  function updatePanelStats() {
    const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const DASH = '\u2014';
    const hasVal = (v) => v && v !== DASH && v !== '';
    s('loa-total', collected.length);
    s('loa-phone', collected.filter(l => hasVal(l.phone)).length);
    s('loa-web',   collected.filter(l => hasVal(l.website)).length);
    s('loa-email', collected.filter(l => hasVal(l.email)).length);
  }

  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.leads && Array.isArray(changes.leads.newValue)) {
        collected = changes.leads.newValue;
        updatePanelStats();
      }
    });
  } catch(e) {}

  function setPanelScrapingState(active) {
    const st = document.getElementById('loa-start');
    const sp = document.getElementById('loa-stop');
    if (st) st.style.display = active ? 'none' : 'inline-block';
    if (sp) sp.style.display = active ? 'inline-block' : 'none';
  }

})();
