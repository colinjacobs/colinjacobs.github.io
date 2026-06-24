(function () {
  const manifest = {
    id: 'settings',
    title: 'Settings',
    defaultSize: { w: 380, h: 280 },
  };

  function mount(contentEl) {
    contentEl.innerHTML = `
      <style>
        .st-wrap { padding: 1rem; font-family: 'Rajdhani', sans-serif; }
        .st-row { display: flex; justify-content: space-between; align-items: center;
                  padding: 10px 0; border-bottom: 1px solid var(--border); }
        .st-label { font-size: 13px; color: var(--text-bright); }
        .st-hint  { font-family: 'Share Tech Mono', monospace; font-size: 9px;
                    letter-spacing: 1px; color: var(--text-dim); }
      </style>
      <div class="st-wrap">
        <div class="st-row">
          <span class="st-label">Raw model output</span>
          <span class="st-hint">PHASE 8</span>
        </div>
        <div class="st-row">
          <span class="st-label">Context bus indicator</span>
          <span class="st-hint">PHASE 4</span>
        </div>
        <div class="st-row">
          <span class="st-label">Scanline overlay</span>
          <span class="st-hint">ON</span>
        </div>
      </div>
    `;
  }

  window.ShellApps = window.ShellApps || {};
  window.ShellApps['settings'] = { manifest, mount };
})();
