/**
 * PrefetchScheduler — Triggers prefetch at optimal times
 */
class PrefetchScheduler {
  constructor(config = {}) {
    this.prefetchManager = config.prefetchManager;
    this.networkMonitor = config.networkMonitor;
    this._scheduledTimers = [];
  }

  start() {
    if (this.networkMonitor) {
      this.networkMonitor.on('online', async () => {
        console.log('[PrefetchScheduler] Online — triggering prefetch');
        await this.triggerPrefetch();
      });
    }
    console.log('[PrefetchScheduler] Started');
  }

  scheduleAt(hour, minute = 0) {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    const delay = target.getTime() - now.getTime();
    const timer = setTimeout(() => this.triggerPrefetch(), delay);
    this._scheduledTimers.push(timer);
  }

  async triggerPrefetch() {
    if (!this.prefetchManager) return;
    try {
      return await this.prefetchManager.predict();
    } catch (error) {
      console.error('[PrefetchScheduler] Failed:', error);
    }
  }

  stop() {
    this._scheduledTimers.forEach(t => clearTimeout(t));
    this._scheduledTimers = [];
  }
}
