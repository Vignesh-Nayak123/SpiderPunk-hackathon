/**
 * PrefetchLogger — Logs all prefetch events for the demo UI
 */
class PrefetchLogger {
  constructor() {
    this.logs = [];
  }

  logPrefetch(item) {
    const entry = {
      contentId: item.contentId,
      title: item.title,
      prefetchedAt: Date.now(),
      confidence: item.confidence,
      reason: item.reason,
      size: item.size || 'N/A',
      used: false,
      usedAt: null
    };
    this.logs.push(entry);
    console.log(`[PrefetchLogger] Logged: ${item.title} (${Math.round(item.confidence * 100)}%)`);
    return entry;
  }

  markUsed(contentId) {
    const entry = this.logs.find(l => l.contentId === contentId);
    if (entry) {
      entry.used = true;
      entry.usedAt = Date.now();
    }
  }

  getLog() { return [...this.logs].reverse(); }

  getHitRate() {
    if (this.logs.length === 0) return 0;
    const hits = this.logs.filter(l => l.used).length;
    return Math.round((hits / this.logs.length) * 100);
  }

  clear() { this.logs = []; }

  seedFromData(seedLogs) {
    this.logs = seedLogs.map(l => ({
      contentId: l.contentId,
      title: l.title,
      prefetchedAt: l.prefetchedAt,
      confidence: 0.87,
      reason: l.reason,
      used: l.used,
      usedAt: l.usedAt || null,
      size: 'N/A'
    }));
  }
}
