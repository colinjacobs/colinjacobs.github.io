/* ============================================================
   EVENT BUS
   Minimal pub/sub. Any app or core module can publish or
   subscribe. This is intentionally generic — it has no idea
   that "context:changed" will eventually matter to the AI
   Assistant. That coupling happens in phase 4, in the
   ai-assistant app itself, not here.
   ============================================================ */
class EventBus {
  constructor() {
    this._listeners = new Map(); // eventName -> Set<fn>
  }

  on(eventName, fn) {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(fn);
    return () => this.off(eventName, fn); // returns unsubscribe fn
  }

  off(eventName, fn) {
    const set = this._listeners.get(eventName);
    if (set) set.delete(fn);
  }

  emit(eventName, payload) {
    const set = this._listeners.get(eventName);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[event-bus] listener for "${eventName}" threw`, err);
      }
    }
  }
}

// Single shared instance across the whole shell.
window.ShellBus = new EventBus();

/* ── Known event names (documentation, not enforcement) ──
   "window:opened"      { appId, windowId }
   "window:closed"      { appId, windowId }
   "window:focused"     { appId, windowId }
   "context:changed"    { sourceAppId, kind, data }  -- phase 4
*/
