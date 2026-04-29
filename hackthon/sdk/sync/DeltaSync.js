/**
 * DeltaSync — Only syncs the "diff" on reconnect
 * 
 * Instead of re-downloading everything, DeltaSync tracks the last
 * sync timestamp per resource and only fetches what changed.
 */

class DeltaSync {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.cacheEngine = config.cacheEngine;
  }

  /**
   * Sync a specific resource type, fetching only changes since last sync
   */
  async sync(resourceType) {
    const lastSync = this._getLastSync(resourceType);
    console.log(`[DeltaSync] Syncing ${resourceType} since ${lastSync ? new Date(lastSync).toLocaleTimeString() : 'beginning'}`);

    try {
      const url = `${this.serverUrl}/api/${resourceType}?since=${lastSync || 0}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Cache the delta
        const items = data.messages || data.items || [];
        
        if (items.length > 0 && this.cacheEngine) {
          // Merge with existing cache
          const existing = await this.cacheEngine.get(`${resourceType}_data`) || [];
          const merged = this._mergeData(existing, items);
          await this.cacheEngine.put(`${resourceType}_data`, merged, resourceType);
        }

        // Update last sync timestamp
        this._setLastSync(resourceType, data.serverTimestamp);

        console.log(`[DeltaSync] Synced ${items.length} ${resourceType} items (delta only)`);
        return {
          added: items.length,
          resourceType,
          timestamp: data.serverTimestamp
        };
      }
    } catch (error) {
      console.error(`[DeltaSync] Failed to sync ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Sync all resource types
   */
  async syncAll() {
    const results = [];
    const types = ['messages', 'feed'];

    for (const type of types) {
      try {
        const result = await this.sync(type);
        results.push(result);
      } catch (e) {
        results.push({ resourceType: type, error: e.message });
      }
    }

    return results;
  }

  /**
   * Merge new data with existing, avoiding duplicates
   */
  _mergeData(existing, incoming) {
    const map = new Map();
    existing.forEach(item => map.set(item.id, item));
    incoming.forEach(item => map.set(item.id, item)); // New overwrites old
    return Array.from(map.values());
  }

  /**
   * Get last sync timestamp for a resource
   */
  _getLastSync(resourceType) {
    const ts = localStorage.getItem(`deltaSync_${resourceType}`);
    return ts ? parseInt(ts) : null;
  }

  /**
   * Set last sync timestamp
   */
  _setLastSync(resourceType, timestamp) {
    localStorage.setItem(`deltaSync_${resourceType}`, timestamp.toString());
  }

  /**
   * Reset sync state
   */
  reset() {
    localStorage.removeItem('deltaSync_messages');
    localStorage.removeItem('deltaSync_feed');
    console.log('[DeltaSync] Reset complete');
  }
}
