/**
 * CacheEngine — IndexedDB-based cache for offline content storage
 * 
 * Features:
 * - Key-value storage with metadata (timestamps, access count)
 * - LRU eviction when storage budget is exceeded
 * - Namespace support (messages, feed, content)
 * - Size tracking
 */

class CacheEngine {
  constructor(config = {}) {
    this.dbName = config.dbName || 'offline-layer-cache';
    this.dbVersion = 1;
    this.maxSize = config.maxSize || 50 * 1024 * 1024; // 50MB default
    this.db = null;
    this.storeName = 'cache';
    this.metaStore = 'meta';
    this._ready = false;
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Main cache store
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('namespace', 'namespace', { unique: false });
          store.createIndex('lastAccessed', 'lastAccessed', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(this.metaStore)) {
          db.createObjectStore(this.metaStore, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this._ready = true;
        console.log('[CacheEngine] IndexedDB initialized');
        resolve();
      };

      request.onerror = (event) => {
        console.error('[CacheEngine] IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Store data in cache
   */
  async put(key, data, namespace = 'default') {
    if (!this._ready) await this.init();

    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;

    // Check budget before storing
    const usage = await this.getUsage();
    if (usage + size > this.maxSize) {
      await this._evictLRU(size);
    }

    const entry = {
      key,
      namespace,
      data,
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(entry);
      request.onsuccess = () => resolve(entry);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data from cache
   */
  async get(key) {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          // Update access metadata
          entry.lastAccessed = Date.now();
          entry.accessCount = (entry.accessCount || 0) + 1;
          store.put(entry);
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Check if key exists in cache
   */
  async has(key) {
    const result = await this.get(key);
    return result !== null;
  }

  /**
   * Delete a key from cache
   */
  async delete(key) {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all entries in a namespace
   */
  async getByNamespace(namespace) {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const index = store.index('namespace');
      const request = index.getAll(namespace);
      request.onsuccess = () => resolve(request.result.map(e => e.data));
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get total cache size in bytes
   */
  async getUsage() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const total = request.result.reduce((sum, entry) => sum + (entry.size || 0), 0);
        resolve(total);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get usage stats
   */
  async getStats() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        const totalSize = entries.reduce((sum, e) => sum + (e.size || 0), 0);
        const namespaces = {};
        entries.forEach(e => {
          if (!namespaces[e.namespace]) namespaces[e.namespace] = { count: 0, size: 0 };
          namespaces[e.namespace].count++;
          namespaces[e.namespace].size += (e.size || 0);
        });

        resolve({
          totalEntries: entries.length,
          totalSize,
          maxSize: this.maxSize,
          usagePercent: Math.round((totalSize / this.maxSize) * 100),
          namespaces
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * LRU eviction — remove least recently accessed items until space is freed
   */
  async _evictLRU(spaceNeeded) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const index = store.index('lastAccessed');
      const request = index.openCursor(); // Oldest first

      let freedSpace = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && freedSpace < spaceNeeded) {
          freedSpace += cursor.value.size || 0;
          cursor.delete();
          console.log(`[CacheEngine] Evicted: ${cursor.value.key} (${cursor.value.size}B)`);
          cursor.continue();
        } else {
          resolve(freedSpace);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached data
   */
  async clear() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => {
        console.log('[CacheEngine] Cache cleared');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }
}
