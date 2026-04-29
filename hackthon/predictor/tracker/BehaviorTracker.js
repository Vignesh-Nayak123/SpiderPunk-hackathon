/**
 * BehaviorTracker — Logs every screen open with context
 * 
 * Records: what screen, what time, what day, session ID
 * Stores locally in IndexedDB for offline-first operation
 */

class BehaviorTracker {
  constructor(config = {}) {
    this.dbName = config.dbName || 'offline-layer-behavior';
    this.storeName = 'logs';
    this.db = null;
    this._ready = false;
    this.maxLogs = config.maxLogs || 1000; // Keep last 1000 logs
  }

  /**
   * Initialize IndexedDB
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('screen', 'screen', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('uploaded', 'uploaded', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this._ready = true;
        console.log('[BehaviorTracker] Initialized');
        resolve();
      };

      request.onerror = (event) => reject(event.target.error);
    });
  }

  /**
   * Log a screen open event
   */
  async log(screenName, metadata = {}) {
    if (!this._ready) await this.init();

    const now = new Date();
    const entry = {
      screen: screenName,
      timestamp: now.getTime(),
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      minute: now.getMinutes(),
      timeSlot: TimeUtils.getTimeSlot(now.getHours()),
      sessionId: metadata.sessionId || null,
      uploaded: false,
      ...metadata
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.add(entry);
      request.onsuccess = () => {
        console.log(`[BehaviorTracker] Logged: ${screenName} at ${TimeUtils.formatTime(now.getTime())}`);
        resolve(entry);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get logs that haven't been uploaded yet
   */
  async getUnuploaded() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const index = store.index('uploaded');
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark logs as uploaded
   */
  async markUploaded(ids) {
    if (!this._ready) await this.init();

    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);

    for (const id of ids) {
      const request = store.get(id);
      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          entry.uploaded = true;
          store.put(entry);
        }
      };
    }

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  }

  /**
   * Get all logs (for demo viewer)
   */
  async getAllLogs() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get logs since a timestamp
   */
  async getLogsSince(timestamp) {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const index = store.index('timestamp');
      const range = IDBKeyRange.lowerBound(timestamp);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear old logs beyond maxLogs limit
   */
  async cleanup() {
    if (!this._ready) await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const count = countReq.result;
        if (count > this.maxLogs) {
          const deleteCount = count - this.maxLogs;
          const cursorReq = store.openCursor();
          let deleted = 0;

          cursorReq.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor && deleted < deleteCount) {
              cursor.delete();
              deleted++;
              cursor.continue();
            } else {
              resolve(deleted);
            }
          };
        } else {
          resolve(0);
        }
      };
      countReq.onerror = () => reject(countReq.error);
    });
  }

  /**
   * Clear all logs
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
}
