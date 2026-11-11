// Tab Handler — Standalone tab switching
// Does NOT conflict with popup.js

(function() {
  // Ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTabs);
  } else {
    initTabs();
  }

  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');
        if (!tabName) return;

        // Remove active from all buttons
        tabBtns.forEach(b => b.classList.remove('active'));
        // Remove active from all panels
        tabPanels.forEach(p => p.classList.remove('active'));

        // Add active to clicked button
        this.classList.add('active');
        // Add active to corresponding panel
        const panel = document.getElementById(tabName + '-panel');
        if (panel) {
          panel.classList.add('active');
        }
      });
    });
  }
})();
