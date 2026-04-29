/**
 * OfflineLayer SDK — Main Entry Point
 * 
 * Two lines of code. Any app. Offline-first.
 * 
 * Usage:
 *   const sdk = new OfflineLayer({ serverUrl: 'http://localhost:3001' });
 *   await sdk.init();
 * 
 * That's it. Your app now works offline.
 */

class OfflineLayer {
  constructor(config = {}) {
    this.config = {
      serverUrl: config.serverUrl || 'http://localhost:3001',
      maxCacheSize: config.maxCacheSize || 50 * 1024 * 1024,
      pingInterval: config.pingInterval || 5000,
      ...config
    };

    // Core modules
    this.network = new NetworkMonitor(this.config);
    this.cache = new CacheEngine({ maxSize: this.config.maxCacheSize });
    this.budget = new StorageBudget(this.cache);
    this.queue = new ActionQueue({ serverUrl: this.config.serverUrl });
    this.deltaSync = new DeltaSync({ 
      serverUrl: this.config.serverUrl, 
      cacheEngine: this.cache 
    });

    this._initialized = false;
  }

  /**
   * Initialize the SDK — call this once at app startup
   */
  async init() {
    if (this._initialized) return;

    console.log('[OfflineLayer] Initializing SDK...');

    // Initialize all modules
    await this.cache.init();
    await this.queue.init();
    this.network.init();

    // Auto-sync when coming back online
    this.network.on('online', async () => {
      console.log('[OfflineLayer] Back online — triggering auto-sync');
      await this.sync();
    });

    this._initialized = true;
    console.log('[OfflineLayer] ✅ SDK initialized');
    return this;
  }

  /**
   * Smart fetch — tries network first, falls back to cache
   */
  async fetch(endpoint, options = {}) {
    const cacheKey = `fetch_${endpoint}`;

    if (this.network.isOnline()) {
      try {
        const response = await fetch(`${this.config.serverUrl}${endpoint}`, options);
        const data = await response.json();
        
        // Cache the response
        await this.cache.put(cacheKey, data, 'api');
        return data;
      } catch (error) {
        console.log(`[OfflineLayer] Network fetch failed, trying cache: ${endpoint}`);
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;
        throw error;
      }
    } else {
      // Offline — use cache
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        console.log(`[OfflineLayer] Served from cache: ${endpoint}`);
        return cached;
      }
      throw new Error(`Offline and no cached data for: ${endpoint}`);
    }
  }

  /**
   * Queue an action for when back online
   */
  async queueAction(type, payload) {
    const action = await this.queue.enqueue({ type, payload });
    
    // If online, try to sync immediately
    if (this.network.isOnline()) {
      try {
        await this.queue.flush();
      } catch (e) {
        console.log('[OfflineLayer] Immediate sync failed, will retry later');
      }
    }
    
    return action;
  }

  /**
   * Full sync — flush queue + delta sync all resources
   */
  async sync() {
    if (!this.network.isOnline()) {
      console.log('[OfflineLayer] Cannot sync — offline');
      return null;
    }

    this.network.setSyncing(true);

    try {
      // Step 1: Flush offline action queue
      let flushResult = null;
      const pendingCount = await this.queue.getCount();
      if (pendingCount > 0) {
        flushResult = await this.queue.flush();
      }

      // Step 2: Delta sync all resources
      const deltaResults = await this.deltaSync.syncAll();

      this.network.setSyncing(false);
      
      const result = {
        actionsSynced: flushResult?.synced || 0,
        deltaResults,
        timestamp: Date.now()
      };

      console.log('[OfflineLayer] ✅ Sync complete:', result);
      return result;
    } catch (error) {
      this.network.setSyncing(false);
      console.error('[OfflineLayer] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Get current SDK status
   */
  async getStatus() {
    const cacheStats = await this.cache.getStats();
    const pendingActions = await this.queue.getCount();
    const networkState = this.network.getState();

    return {
      network: networkState,
      cache: cacheStats,
      pendingActions,
      initialized: this._initialized
    };
  }

  /**
   * Reset SDK (for demo)
   */
  async reset() {
    await this.cache.clear();
    await this.queue.clear();
    this.deltaSync.reset();
    localStorage.removeItem('lastSyncTimestamp');
    console.log('[OfflineLayer] SDK reset complete');
  }
}
