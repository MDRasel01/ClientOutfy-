// ══════════════════════════════════════════════════════════════
// LeadOutfy — Extras: Target sync + City dropdown
// CSP-safe (external file, no inline script)
// ══════════════════════════════════════════════════════════════
(function () {
  function init() {
    var maxSel  = document.getElementById('max-results');
    var mirror  = document.getElementById('hunt-max-mirror');
    var country = document.getElementById('country');
    var city    = document.getElementById('city');

    // ── TARGET NUMBER SYNC ──────────────────────────────────
    function syncTarget() {
      if (!maxSel || !mirror) return;
      var val = parseInt(maxSel.value, 10) || 0;
      var txt;
      if (val >= 1000) {
        txt = (val % 1000 === 0) ? (val / 1000) + 'K' : (val / 1000).toFixed(1) + 'K';
      } else {
        txt = String(val);
      }
      mirror.textContent = txt;
    }

    if (maxSel) {
      syncTarget();                                  // sync on load
      maxSel.addEventListener('change', syncTarget); // sync on change
      maxSel.addEventListener('input',  syncTarget); // instant
    }

    // ── CITY DROPDOWN ───────────────────────────────────────
    function fillCities() {
      if (!country || !city) return;
      var cc = country.value;
      var list = (typeof LEADOUTFY_CITIES !== 'undefined' && LEADOUTFY_CITIES[cc]) || [];

      // reset
      city.innerHTML = '';

      // "All Cities" default option
      var allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = 'All Cities';
      city.appendChild(allOpt);

      // add each city
      for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i];
        o.textContent = list[i];
        city.appendChild(o);
      }
    }

    if (country) {
      fillCities();                                  // fill on load
      country.addEventListener('change', function () {
        fillCities();
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ selectedCity: '' });
        }
      });
    }

    if (city) {
      city.addEventListener('change', function () {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          chrome.storage.local.set({ selectedCity: city.value });
        }
      });
    }

    // ── MERGE CITY INTO KEYWORD ON START ────────────────────
    // Capture phase = runs BEFORE popup.js builds the search URL,
    // so the chosen city gets appended to the keyword automatically.
    var startBtn = document.getElementById('open-maps-btn');
    var keywordEl = document.getElementById('keyword');
    if (startBtn && keywordEl && city) {
      startBtn.addEventListener('click', function () {
        var c = city.value && city.value.trim();
        if (!c) return; // "All Cities" -> leave keyword as-is
        var kw = keywordEl.value.trim();
        // only append if the city name isn't already in the keyword
        if (kw && kw.toLowerCase().indexOf(c.toLowerCase()) === -1) {
          keywordEl.value = kw + ' ' + c;
        }
      }, true); // <-- capture phase
    }

    // ── RESTORE FROM STORAGE ────────────────────────────────
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['maxResults', 'selectedCountry', 'selectedCity'], function (d) {
        if (d.maxResults && maxSel) {
          maxSel.value = d.maxResults;
          syncTarget();
        }
        if (d.selectedCountry && country) {
          country.value = d.selectedCountry;
          fillCities();
        }
        if (d.selectedCity && city) {
          city.value = d.selectedCity;
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
