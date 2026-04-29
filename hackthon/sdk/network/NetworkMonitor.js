/**
 * NetworkMonitor — Detects online/offline state and emits events
 * 
 * Features:
 * - Real online/offline detection via navigator.onLine + server ping
 * - forceOffline() / forceOnline() for demo mode
 * - Event system: 'online', 'offline', 'syncing'
 * - Connection quality estimation
 */

class NetworkMonitor {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.pingInterval = config.pingInterval || 5000;
    this.listeners = {};
    this.state = {
      isOnline: navigator.onLine,
      isForcedOffline: false,
      connectionType: 'wifi',
      isSyncing: false,
      lastOnlineAt: Date.now(),
      lastOfflineAt: null
    };
    this._pingTimer = null;
    this._initialized = false;
  }

  /**
   * Initialize monitoring
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    // Browser online/offline events
    window.addEventListener('online', () => this._handleConnectivityChange(true));
    window.addEventListener('offline', () => this._handleConnectivityChange(false));

    // Periodic server ping
    this._startPing();

    console.log('[NetworkMonitor] Initialized. Online:', this.isOnline());
  }

  /**
   * Check if currently online (considering forced state)
   */
  isOnline() {
    if (this.state.isForcedOffline) return false;
    return this.state.isOnline;
  }

  /**
   * Force offline mode (for demo)
   */
  forceOffline() {
    this.state.isForcedOffline = true;
    this.state.lastOfflineAt = Date.now();
    this._emit('offline', { forced: true, timestamp: Date.now() });
    console.log('[NetworkMonitor] ⛔ Forced OFFLINE');
  }

  /**
   * Restore online mode (for demo)
   */
  forceOnline() {
    this.state.isForcedOffline = false;
    this.state.lastOnlineAt = Date.now();
    this._emit('online', { forced: true, timestamp: Date.now() });
    console.log('[NetworkMonitor] ✅ Forced ONLINE');
  }

  /**
   * Set syncing state
   */
  setSyncing(isSyncing) {
    this.state.isSyncing = isSyncing;
    this._emit(isSyncing ? 'syncing' : 'synced', { timestamp: Date.now() });
  }

  /**
   * Set connection type (for demo: wifi, 4g, 3g, 2g)
   */
  setConnectionType(type) {
    this.state.connectionType = type;
    this._emit('connection-change', { type, timestamp: Date.now() });
  }

  /**
   * Get full state
   */
  getState() {
    return {
      ...this.state,
      isOnline: this.isOnline(),
      displayStatus: this._getDisplayStatus()
    };
  }

  /**
   * Subscribe to events
   */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  /**
   * Unsubscribe from events
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Get human-readable status
   */
  _getDisplayStatus() {
    if (this.state.isSyncing) return { text: 'Syncing...', color: 'yellow', icon: '🟡' };
    if (!this.isOnline()) return { text: "You're Offline", color: 'red', icon: '🔴' };
    return { 
      text: `Connected via ${this.state.connectionType.toUpperCase()}`, 
      color: 'green', 
      icon: '🟢' 
    };
  }

  /**
   * Handle browser connectivity change
   */
  _handleConnectivityChange(online) {
    if (this.state.isForcedOffline) return; // Ignore if forced

    const wasOnline = this.state.isOnline;
    this.state.isOnline = online;

    if (online && !wasOnline) {
      this.state.lastOnlineAt = Date.now();
      this._emit('online', { forced: false, timestamp: Date.now() });
    } else if (!online && wasOnline) {
      this.state.lastOfflineAt = Date.now();
      this._emit('offline', { forced: false, timestamp: Date.now() });
    }
  }

  /**
   * Periodic server ping to verify actual connectivity
   */
  _startPing() {
    this._pingTimer = setInterval(async () => {
      if (this.state.isForcedOffline) return;

      try {
        const start = Date.now();
        const response = await fetch(`${this.serverUrl}/api/status`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });
        const latency = Date.now() - start;

        if (response.ok && !this.state.isOnline) {
          this._handleConnectivityChange(true);
        }
      } catch (e) {
        // Ping failed — might be offline
        if (this.state.isOnline && !navigator.onLine) {
          this._handleConnectivityChange(false);
        }
      }
    }, this.pingInterval);
  }

  /**
   * Emit event to all listeners
   */
  _emit(event, data) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(cb => {
      try { cb(data); } catch(e) { console.error(`[NetworkMonitor] Event handler error:`, e); }
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this._pingTimer) clearInterval(this._pingTimer);
    this.listeners = {};
    this._initialized = false;
  }
}
