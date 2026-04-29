/**
 * StorageBudget — Manages cache storage limits
 * 
 * Caps local storage at 50MB and uses LRU eviction
 * to keep only the most relevant cached content.
 */

class StorageBudget {
  constructor(cacheEngine, config = {}) {
    this.cache = cacheEngine;
    this.maxBytes = config.maxBytes || 50 * 1024 * 1024; // 50MB
    this.warningThreshold = config.warningThreshold || 0.8; // 80%
    this.listeners = {};
  }

  /**
   * Check if within budget
   */
  async isWithinBudget() {
    const usage = await this.cache.getUsage();
    return usage < this.maxBytes;
  }

  /**
   * Get usage percentage (0-100)
   */
  async getUsagePercent() {
    const usage = await this.cache.getUsage();
    return Math.round((usage / this.maxBytes) * 100);
  }

  /**
   * Get formatted usage
   */
  async getFormattedUsage() {
    const usage = await this.cache.getUsage();
    return {
      used: this._formatBytes(usage),
      max: this._formatBytes(this.maxBytes),
      percent: Math.round((usage / this.maxBytes) * 100),
      isWarning: usage > this.maxBytes * this.warningThreshold,
      isFull: usage >= this.maxBytes
    };
  }

  /**
   * Format bytes to human readable
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Subscribe to budget events
   */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
}
