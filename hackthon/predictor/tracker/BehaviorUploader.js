/**
 * BehaviorUploader — Batches and sends behavior logs to backend
 * 
 * Collects logs from BehaviorTracker, batches them,
 * and uploads to POST /behavior when online.
 */

class BehaviorUploader {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.tracker = config.tracker;
    this.batchSize = config.batchSize || 50;
    this.uploadInterval = config.uploadInterval || 5 * 60 * 1000; // 5 minutes
    this._timer = null;
    this._networkMonitor = config.networkMonitor;
  }

  /**
   * Start automatic uploading
   */
  start() {
    // Upload on interval
    this._timer = setInterval(() => this.upload(), this.uploadInterval);

    // Upload when coming online
    if (this._networkMonitor) {
      this._networkMonitor.on('online', () => {
        console.log('[BehaviorUploader] Online — triggering upload');
        this.upload();
      });
    }

    console.log('[BehaviorUploader] Started (interval: ' + (this.uploadInterval / 1000) + 's)');
  }

  /**
   * Upload unuploaded logs to server
   */
  async upload() {
    if (this._networkMonitor && !this._networkMonitor.isOnline()) {
      console.log('[BehaviorUploader] Offline — skipping upload');
      return;
    }

    try {
      const logs = await this.tracker.getUnuploaded();
      if (logs.length === 0) {
        console.log('[BehaviorUploader] No new logs to upload');
        return;
      }

      // Batch the logs
      const batches = [];
      for (let i = 0; i < logs.length; i += this.batchSize) {
        batches.push(logs.slice(i, i + this.batchSize));
      }

      for (const batch of batches) {
        const response = await fetch(`${this.serverUrl}/behavior`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            logs: batch.map(l => ({
              screen: l.screen,
              hour: l.hour,
              dayOfWeek: l.dayOfWeek,
              timestamp: l.timestamp
            }))
          })
        });

        if (response.ok) {
          const ids = batch.map(l => l.id);
          await this.tracker.markUploaded(ids);
          console.log(`[BehaviorUploader] Uploaded batch of ${batch.length} logs`);
        }
      }
    } catch (error) {
      console.error('[BehaviorUploader] Upload failed:', error);
    }
  }

  /**
   * Stop automatic uploading
   */
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}
