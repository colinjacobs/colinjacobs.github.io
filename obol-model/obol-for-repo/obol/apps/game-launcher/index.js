(function () {
  const manifest = {
    id: 'game-launcher',
    title: 'Game Launcher',
    defaultSize: { w: 520, h: 380 },
  };

  // Placeholder catalog — swap for real Scary Salad entries in phase 9.
  const GAMES = [
    { name: 'Halcyon Lab', tag: 'IN DEV' },
    { name: 'Untitled Lattice Project', tag: 'LOCKED' },
  ];

  function mount(contentEl) {
    contentEl.innerHTML = `
      <style>
        .gl-wrap { padding: 1rem; font-family: 'Rajdhani', sans-serif; }
        .gl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
        .gl-tile {
          border: 1px solid var(--border-bright);
          background: var(--surface2);
          padding: 14px 10px;
          text-align: center;
          cursor: pointer;
        }
        .gl-tile:hover { background: var(--surface3); border-color: var(--amber-dim); }
        .gl-tile-name { font-size: 13px; color: var(--text-bright); margin-bottom: 6px; }
        .gl-tile-tag {
          font-family: 'Share Tech Mono', monospace;
          font-size: 8px; letter-spacing: 2px;
          color: var(--amber-dim);
        }
      </style>
      <div class="gl-wrap">
        <div class="gl-grid">
          ${GAMES.map(g => `
            <div class="gl-tile">
              <div class="gl-tile-name">${g.name}</div>
              <div class="gl-tile-tag">${g.tag}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  window.ShellApps = window.ShellApps || {};
  window.ShellApps['game-launcher'] = { manifest, mount };
})();
