// Scanner Overlay — Real-time radar animation during scraping
// Monitors popup.js scanning state and animates widget with live feedback

(function() {
  let scannerActive = false;
  let scannerCheckInterval = null;
  let lastLeadCount = 0;

  function initScanner() {
    // Monitor for scanning state changes every 300ms
    scannerCheckInterval = setInterval(checkScanningState, 300);
  }

  function checkScanningState() {
    // Check if Hunt tab status shows active scraping
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const statTotal = document.getElementById('stat-total');
    
    if (!statusDot || !statusText) return;

    const isScanning = statusDot.classList.contains('active');
    
    // Update widget with real-time lead count from Hunt tab
    if (isScanning && statTotal) {
      const currentCount = parseInt(statTotal.textContent) || 0;
      if (currentCount !== lastLeadCount) {
        lastLeadCount = currentCount;
        updateMapWidgetStats(currentCount);
      }
    }
    
    if (isScanning && !scannerActive) {
      // Started scanning
      scannerActive = true;
      activateMapWidgetScanning();
    } else if (!isScanning && scannerActive) {
      // Stopped scanning
      scannerActive = false;
      deactivateMapWidgetScanning();
      lastLeadCount = 0;
    }
  }

  function updateMapWidgetStats(leadCount) {
    // Update map widget status with live count
    const statusEl = document.getElementById('loa-status');
    if (statusEl && leadCount > 0) {
      statusEl.textContent = `🔍 Collecting leads... ${leadCount} found • Scanning Maps`;
    }
  }

  function activateMapWidgetScanning() {
    // Add scanning class to widget when popup.js detects active state
    const panel = document.getElementById('loa-panel');
    if (panel) {
      panel.classList.add('scanning');
      panel.setAttribute('data-scanning', 'true');
      // Add radar effect glow
      panel.style.boxShadow = '0 24px 80px rgba(240,112,32,.85), 0 0 72px rgba(240,112,32,.7), 0 0 40px 8px rgba(240,112,32,.15)';
    }
    
    const header = document.getElementById('loa-header');
    if (header) header.classList.add('scanning');
    
    const title = document.getElementById('loa-title');
    if (title) title.classList.add('scanning');
    
    const status = document.getElementById('loa-status');
    if (status) {
      status.classList.add('scanning');
      status.textContent = '🔍 Initializing scan • Connecting to Maps';
    }
    
    const stats = document.getElementById('loa-stats');
    if (stats) stats.classList.add('scanning');
    
    const body = document.getElementById('loa-body');
    if (body) body.classList.add('scanning');
    
    // Show stop, hide start
    const startBtn = document.getElementById('loa-start');
    const stopBtn = document.getElementById('loa-stop');
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn) {
      stopBtn.style.display = 'flex';
      stopBtn.style.animation = 'loa-stop-pulse 1.2s ease-in-out infinite';
    }
  }

  function deactivateMapWidgetScanning() {
    // Remove scanning class from all elements
    const panel = document.getElementById('loa-panel');
    if (panel) {
      panel.classList.remove('scanning');
      panel.removeAttribute('data-scanning');
    }
    
    const header = document.getElementById('loa-header');
    if (header) header.classList.remove('scanning');
    
    const title = document.getElementById('loa-title');
    if (title) title.classList.remove('scanning');
    
    const status = document.getElementById('loa-status');
    if (status) {
      status.classList.remove('scanning');
      status.textContent = 'Ready — Enter keyword and click Start';
    }
    
    const stats = document.getElementById('loa-stats');
    if (stats) stats.classList.remove('scanning');
    
    const body = document.getElementById('loa-body');
    if (body) body.classList.remove('scanning');
    
    // Show start, hide stop
    const startBtn = document.getElementById('loa-start');
    const stopBtn = document.getElementById('loa-stop');
    if (startBtn) startBtn.style.display = 'flex';
    if (stopBtn) stopBtn.style.display = 'none';
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScanner);
  } else {
    initScanner();
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    if (scannerCheckInterval) clearInterval(scannerCheckInterval);
  });
})();
