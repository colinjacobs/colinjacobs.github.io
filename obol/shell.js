/* ============================================================
   SHELL BOOT
   Builds the app registry from window.ShellApps (populated by
   each app's index.js), then mounts the window manager and
   taskbar. Adding a new app later means adding a new
   apps/<name>/index.js and a <script> tag — nothing here changes.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const desktopEl = document.getElementById('desktop');
  const taskbarEl = document.getElementById('taskbar');

  const wm = new WindowManager(desktopEl);

  // registry: appId -> { manifest, mount }
  const registry = new Map(Object.entries(window.ShellApps || {}));

  const taskbar = new Taskbar(taskbarEl, wm, registry);

  // Open the AI Assistant by default so OBOL is visible on boot.
  const aiEntry = registry.get('ai-assistant');
  if (aiEntry) wm.open(aiEntry.manifest, aiEntry.mount);

  // Exposed for debugging in the console during development.
  window._shell = { wm, taskbar, registry };
});
