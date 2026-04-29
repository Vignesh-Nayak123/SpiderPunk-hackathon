/**
 * ActionQueue — Queues offline actions for later sync
 * 
 * When user performs actions while offline (send message, fill form),
 * they're stored in IndexedDB and auto-synced when internet returns.
 */

class ActionQueue {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.dbName = config.dbName || 'offline-layer-queue';
    this.storeName = 'actions';
    this.db = null;
    this._ready = false;
    this.listeners = {};
  }

  /**
   * Initialize IndexedDB store
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this._ready = true;
        console.log('[ActionQueue] Initialized');
        resolve();
      };

      request.onerror = (event) => reject(event.target.error);
    });
  }

  /**
   * Add an action to the queue
   */
  async enqueue(action) {
    if (!this._ready) await this.init();

    const entry = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: action.type,
      payload: action.payload,
      status: 'pending',
      createdAt: Date.now(),
      attempts: 0,
      lastAttempt: null
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.add(entry);
      request.onsuccess = () => {
        console.log(`[ActionQueue] Enqueued: ${entry.type} (${entry.id})`);
        this._emit('enqueued', entry);
        resolve(entry);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending actions
   */
  async getPending() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const index = store.index('status');
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Flush all pending actions to server
   */
  async flush() {
    const pending = await this.getPending();
    if (pending.length === 0) {
      console.log('[ActionQueue] Nothing to sync');
      return { synced: 0, results: [] };
    }

    console.log(`[ActionQueue] Flushing ${pending.length} actions...`);
    this._emit('flush-start', { count: pending.length });

    try {
      const response = await fetch(`${this.serverUrl}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actions: pending,
          lastSyncTimestamp: parseInt(localStorage.getItem('lastSyncTimestamp') || '0')
        })
      });

      const data = await response.json();

      if (data.success) {
        // Mark all as synced
        for (const action of pending) {
          await this._updateStatus(action.id, 'synced');
        }

        // Update last sync timestamp
        localStorage.setItem('lastSyncTimestamp', data.serverTimestamp.toString());

        console.log(`[ActionQueue] Synced ${data.synced} actions`);
        this._emit('flush-complete', { 
          synced: data.synced, 
          results: data.results,
          delta: data.delta 
        });

        return data;
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('[ActionQueue] Flush failed:', error);
      // Increment attempt count
      for (const action of pending) {
        await this._incrementAttempt(action.id);
      }
      this._emit('flush-error', { error, count: pending.length });
      throw error;
    }
  }

  /**
   * Get queue count
   */
  async getCount() {
    const pending = await this.getPending();
    return pending.length;
  }

  /**
   * Update action status
   */
  async _updateStatus(id, status) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          entry.status = status;
          entry.syncedAt = Date.now();
          store.put(entry);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Increment attempt count
   */
  async _incrementAttempt(id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          entry.attempts = (entry.attempts || 0) + 1;
          entry.lastAttempt = Date.now();
          store.put(entry);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear synced actions
   */
  async clearSynced() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const index = store.index('status');
      const request = index.openCursor('synced');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all actions
   */
  async clear() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  _emit(event, data) {
    (this.listeners[event] || []).forEach(cb => {
      try { cb(data); } catch(e) { console.error(e); }
    });
  }
}
