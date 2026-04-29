// ─────────────────────────────────────────────────────────────────────────────
// StorageBudgetManager.ts — LRU eviction enforcing the 50 MB storage cap.
//
// Maintains an in-memory LRU map (also persisted under ol_lru_index).
// On every cache write, if total stored bytes > cap, the oldest-accessed
// entries are evicted until total drops to 80% of the cap (hysteresis).
// ─────────────────────────────────────────────────────────────────────────────

import { SDKConfig } from '../core/SDKConfig';
import { StorageUtils } from '../utils/StorageUtils';
import { Logger } from '../utils/Logger';

const LRU_INDEX_KEY = 'ol_lru_index';

interface LRUEntry {
  key: string;
  size: number;        // bytes
  lastAccessed: number; // ms epoch
}

let _map    = new Map<string, LRUEntry>();
let _total  = 0;          // bytes
let _loaded = false;

async function load(): Promise<void> {
  if (_loaded) return;
  const saved = await StorageUtils.getItem<LRUEntry[]>(LRU_INDEX_KEY);
  if (saved) {
    _map   = new Map(saved.map((e) => [e.key, e]));
    _total = saved.reduce((s, e) => s + e.size, 0);
  }
  _loaded = true;
  Logger.debug(`LRU index loaded. ${_map.size} entries, ${(_total / 1024).toFixed(1)} KB`);
}

async function persist(): Promise<void> {
  await StorageUtils.setItem(LRU_INDEX_KEY, Array.from(_map.values()));
}

export const StorageBudgetManager = {
  /** Must be called once on SDK init to rehydrate the LRU index */
  async load(): Promise<void> {
    return load();
  },

  /**
   * Register a new or updated cache entry.
   * Triggers eviction if over budget.
   */
  async track(key: string, sizeBytes: number): Promise<void> {
    await load();
    const existing = _map.get(key);
    if (existing) _total -= existing.size;

    _map.set(key, { key, size: sizeBytes, lastAccessed: Date.now() });
    _total += sizeBytes;

    await this.evictIfNeeded();
    await persist();
  },

  /** Update the access time for a cache key (called on cache hit) */
  async touch(key: string): Promise<void> {
    await load();
    const e = _map.get(key);
    if (e) {
      e.lastAccessed = Date.now();
      // Persist lazily — don't await to keep read path fast
      persist().catch(() => {});
    }
  },

  /** Remove a specific key from the budget (called on invalidation) */
  async remove(key: string): Promise<void> {
    await load();
    const e = _map.get(key);
    if (e) {
      _total -= e.size;
      _map.delete(key);
      await persist();
    }
  },

  /**
   * Evict LRU entries until total storage is ≤ 80% of cap.
   * The 80% target prevents thrashing on every subsequent write.
   */
  async evictIfNeeded(): Promise<void> {
    const cap = SDKConfig.get().storageCap;
    if (_total <= cap) return;

    Logger.warn(
      `Over budget: ${(_total / 1024 / 1024).toFixed(2)} MB / ${(cap / 1024 / 1024).toFixed(0)} MB. Evicting…`
    );

    const target = cap * 0.8;
    const sorted = Array.from(_map.values()).sort((a, b) => a.lastAccessed - b.lastAccessed);
    const toEvict: string[] = [];

    for (const entry of sorted) {
      if (_total <= target) break;
      toEvict.push(entry.key);
      _total -= entry.size;
      _map.delete(entry.key);
    }

    if (toEvict.length > 0) {
      await StorageUtils.multiRemove(toEvict);
      Logger.info(`Evicted ${toEvict.length} LRU entries. Now ${(_total / 1024 / 1024).toFixed(2)} MB`);
    }
  },

  getTotalSize(): number {
    return _total;
  },

  getStats() {
    const cap = SDKConfig.isInitialized() ? SDKConfig.get().storageCap : 50 * 1024 * 1024;
    return {
      totalBytes:  _total,
      totalMB:     (_total / 1024 / 1024).toFixed(2),
      entryCount:  _map.size,
      capMB:       cap / 1024 / 1024,
      usedPercent: ((_total / cap) * 100).toFixed(1),
    };
  },

  /** Testing only */
  _reset(): void {
    _map    = new Map();
    _total  = 0;
    _loaded = false;
  },
};
