/* ============================================================
   WINDOW MANAGER
   Owns window DOM creation, drag, resize, focus stacking, and
   lifecycle. Apps don't touch any of this directly — they get
   a content container and a few lifecycle callbacks.
   ============================================================ */
class WindowManager {
  constructor(desktopEl) {
    this.desktopEl = desktopEl;
    this.windows = new Map();   // windowId -> { el, appId, state }
    this._zCounter = 100;
    this._idCounter = 0;
  }

  /**
   * Open a new window for an app.
   * @param {object} manifest - parsed manifest.json for the app
   * @param {function} mount - (contentEl, windowApi) => void, called once content div exists
   * @returns {string} windowId
   */
  open(manifest, mount) {
    const windowId = `win-${++this._idCounter}`;
    const size = manifest.defaultSize || { w: 480, h: 360 };
    const pos = this._nextSpawnPosition();

    const el = document.createElement('div');
    el.className = 'os-window';
    el.style.width = size.w + 'px';
    el.style.height = size.h + 'px';
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';

    el.innerHTML = `
      <div class="os-window-titlebar">
        <span class="os-window-title">${manifest.title}</span>
        <div class="os-window-controls">
          <button class="os-window-btn minimize" title="Minimize">_</button>
          <button class="os-window-btn close" title="Close">×</button>
        </div>
      </div>
      <div class="os-window-content"></div>
      <div class="os-window-resize-handle"></div>
    `;

    this.desktopEl.appendChild(el);

    const contentEl = el.querySelector('.os-window-content');
    const titlebar = el.querySelector('.os-window-titlebar');
    const minimizeBtn = el.querySelector('.minimize');
    const closeBtn = el.querySelector('.close');
    const resizeHandle = el.querySelector('.os-window-resize-handle');

    const windowApi = {
      id: windowId,
      setTitle: (t) => { el.querySelector('.os-window-title').textContent = t; },
      close: () => this.close(windowId),
    };

    this.windows.set(windowId, { el, appId: manifest.id, manifest, minimized: false });

    this._bringToFront(el);
    this._makeDraggable(el, titlebar);
    this._makeResizable(el, resizeHandle);

    el.addEventListener('mousedown', () => this._bringToFront(el));
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.minimize(windowId);
    });
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close(windowId);
    });

    window.ShellBus.emit('window:opened', { appId: manifest.id, windowId });
    this._bringToFront(el); // also fires window:focused

    // mount app content last, so it can rely on the window already existing
    mount(contentEl, windowApi);

    return windowId;
  }

  close(windowId) {
    const win = this.windows.get(windowId);
    if (!win) return;
    win.el.remove();
    this.windows.delete(windowId);
    window.ShellBus.emit('window:closed', { appId: win.appId, windowId });
  }

  minimize(windowId) {
    const win = this.windows.get(windowId);
    if (!win) return;
    win.minimized = !win.minimized;
    win.el.style.display = win.minimized ? 'none' : 'flex';
  }

  restore(windowId) {
    const win = this.windows.get(windowId);
    if (!win) return;
    win.minimized = false;
    win.el.style.display = 'flex';
    this._bringToFront(win.el);
  }

  _bringToFront(el) {
    el.style.zIndex = ++this._zCounter;
    document.querySelectorAll('.os-window').forEach(w => w.classList.remove('focused'));
    el.classList.add('focused');
    const win = [...this.windows.entries()].find(([, v]) => v.el === el);
    if (win) window.ShellBus.emit('window:focused', { appId: win[1].appId, windowId: win[0] });
  }

  _nextSpawnPosition() {
    // Simple cascade so successive windows don't stack exactly on top of each other.
    const n = this.windows.size;
    const offset = (n % 8) * 28;
    return { x: 60 + offset, y: 60 + offset };
  }

  _makeDraggable(el, handle) {
    let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
    handle.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX; startY = e.clientY;
      startLeft = el.offsetLeft; startTop = el.offsetTop;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const desktopRect = this.desktopEl.getBoundingClientRect();
      let newLeft = startLeft + (e.clientX - startX);
      let newTop = startTop + (e.clientY - startY);
      // keep titlebar reachable within the desktop bounds
      newLeft = Math.max(-el.offsetWidth + 80, Math.min(newLeft, desktopRect.width - 40));
      newTop = Math.max(0, Math.min(newTop, desktopRect.height - 40));
      el.style.left = newLeft + 'px';
      el.style.top = newTop + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  }

  _makeResizable(el, handle) {
    let resizing = false, startX = 0, startY = 0, startW = 0, startH = 0;
    handle.addEventListener('mousedown', (e) => {
      resizing = true;
      startX = e.clientX; startY = e.clientY;
      startW = el.offsetWidth; startH = el.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });
    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const newW = Math.max(280, startW + (e.clientX - startX));
      const newH = Math.max(180, startH + (e.clientY - startY));
      el.style.width = newW + 'px';
      el.style.height = newH + 'px';
    });
    document.addEventListener('mouseup', () => { resizing = false; });
  }
}

window.WindowManager = WindowManager;
