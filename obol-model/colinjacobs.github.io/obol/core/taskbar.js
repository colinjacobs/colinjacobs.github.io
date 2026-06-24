/* ============================================================
   TASKBAR
   Renders launcher icons for installed apps, tracks open
   windows for minimize/restore, and shows a clock + system
   status dot (same status-dot convention as the portfolio).
   ============================================================ */
class Taskbar {
  constructor(el, windowManager, registry) {
    this.el = el;
    this.wm = windowManager;
    this.registry = registry; // appId -> { manifest, mount }
    this._openButtons = new Map(); // windowId -> el

    this.el.innerHTML = `
      <div class="taskbar-launchers"></div>
      <div class="taskbar-open-windows"></div>
      <div class="taskbar-status">
        <span class="status-dot ready" id="systemStatusDot"></span>
        <span class="taskbar-clock" id="taskbarClock">--:--:--</span>
      </div>
    `;

    this._renderLaunchers();
    this._tickClock();
    setInterval(() => this._tickClock(), 1000);

    window.ShellBus.on('window:opened', ({ appId, windowId }) => this._addOpenWindow(appId, windowId));
    window.ShellBus.on('window:closed', ({ windowId }) => this._removeOpenWindow(windowId));
  }

  _renderLaunchers() {
    const container = this.el.querySelector('.taskbar-launchers');
    for (const [appId, entry] of this.registry.entries()) {
      const btn = document.createElement('button');
      btn.className = 'taskbar-launch-btn';
      btn.textContent = entry.manifest.title;
      btn.addEventListener('click', () => {
        this.wm.open(entry.manifest, entry.mount);
      });
      container.appendChild(btn);
    }
  }

  _addOpenWindow(appId, windowId) {
    const entry = this.registry.get(appId);
    const container = this.el.querySelector('.taskbar-open-windows');
    const btn = document.createElement('button');
    btn.className = 'taskbar-window-btn';
    btn.textContent = entry ? entry.manifest.title : appId;
    btn.addEventListener('click', () => this.wm.restore(windowId));
    container.appendChild(btn);
    this._openButtons.set(windowId, btn);
  }

  _removeOpenWindow(windowId) {
    const btn = this._openButtons.get(windowId);
    if (btn) btn.remove();
    this._openButtons.delete(windowId);
  }

  _tickClock() {
    const el = this.el.querySelector('#taskbarClock');
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-US', { hour12: false });
  }

  setSystemStatus(status) {
    // status: 'ready' | 'loading' | 'error'  -- matches portfolio's status-dot classes
    const dot = this.el.querySelector('#systemStatusDot');
    dot.className = `status-dot ${status}`;
  }
}

window.Taskbar = Taskbar;
