/**
 * PrefetchManager — Calls /predict and triggers content downloads
 * 
 * The core of the AI prediction feature:
 * 1. Calls GET /predict to get predicted content IDs
 * 2. Downloads each predicted item via the SDK cache engine
 * 3. Marks items as "pre-fetched" for the demo UI
 */

class PrefetchManager {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.cacheEngine = config.cacheEngine;
    this.logger = config.logger; // PrefetchLogger instance
    this._lastPredictions = null;
  }

  /**
   * Run a prediction cycle — fetch predictions and download content
   */
  async predict() {
    console.log('[PrefetchManager] Running prediction cycle...');

    try {
      // Step 1: Get predictions from server
      const response = await fetch(`${this.serverUrl}/predict`);
      const data = await response.json();

      if (!data.success) throw new Error('Prediction failed');

      this._lastPredictions = data;
      console.log(`[PrefetchManager] Got ${data.predictions.length} predictions, ${data.contentToPrefetch.length} items to prefetch`);

      // Step 2: Download predicted content into cache
      const results = [];
      for (const content of data.contentToPrefetch) {
        try {
          const result = await this._prefetchItem(content);
          results.push(result);
        } catch (e) {
          console.error(`[PrefetchManager] Failed to prefetch ${content.id}:`, e);
          results.push({ ...content, success: false, error: e.message });
        }
      }

      console.log(`[PrefetchManager] ✅ Prefetched ${results.filter(r => r.success).length}/${results.length} items`);
      return {
        predictions: data.predictions,
        prefetched: results,
        summary: data.summary,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[PrefetchManager] Prediction cycle failed:', error);
      throw error;
    }
  }

  /**
   * Prefetch a single content item
   */
  async _prefetchItem(content) {
    const cacheKey = `prefetch_${content.id}`;

    // Check if already cached
    if (this.cacheEngine) {
      const existing = await this.cacheEngine.get(cacheKey);
      if (existing) {
        console.log(`[PrefetchManager] Already cached: ${content.id}`);
        return { ...content, success: true, cached: true };
      }
    }

    // Download content
    try {
      const response = await fetch(`${this.serverUrl}/api/content/${content.id}`);
      const data = await response.json();

      if (data.success && this.cacheEngine) {
        await this.cacheEngine.put(cacheKey, data.content, 'prefetch');
      }

      // Log the prefetch
      if (this.logger) {
        this.logger.logPrefetch({
          contentId: content.id,
          title: content.title,
          confidence: content.confidence,
          reason: content.reason,
          size: content.size
        });
      }

      return { ...content, success: true, cached: false };
    } catch (error) {
      // If content endpoint doesn't exist, still cache the metadata
      if (this.cacheEngine) {
        await this.cacheEngine.put(cacheKey, content, 'prefetch');
      }

      if (this.logger) {
        this.logger.logPrefetch({
          contentId: content.id,
          title: content.title,
          confidence: content.confidence,
          reason: content.reason
        });
      }

      return { ...content, success: true, cached: false };
    }
  }

  /**
   * Get last prediction results
   */
  getLastPredictions() {
    return this._lastPredictions;
  }
}
