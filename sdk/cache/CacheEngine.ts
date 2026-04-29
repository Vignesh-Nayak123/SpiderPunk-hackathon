// ─────────────────────────────────────────────────────────────────────────────
// CacheEngine.ts — TTL-aware read/write layer on top of AsyncStorage.
//
// Every cached entry is wrapped in a CacheEntry envelope that carries:
//   - the actual data
//   - expiresAt timestamp (TTL)
//   - cachedAt timestamp (for debugging)
// ─────────────────────────────────────────────────────────────────────────────

import { StorageUtils } from '../utils/StorageUtils';
import { StorageBudgetManager } from './StorageBudgetManager';
import { SDKConfig } from '../core/SDKConfig';
import { Logger } from '../utils/Logger';
import { CACHE_KEY_PREFIX } from './CacheKey';

interface CacheEntry<T = unknown> {
  data: T;
  expiresAt: number;  // ms epoch
  cachedAt:  number;  // ms epoch
}

export const CacheEngine = {
  /**
   * Reads a cached value. Returns null on miss or TTL expiry.
   * On expiry, automatically invalidates the stale entry.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = await StorageUtils.getItem<CacheEntry<T>>(key);
    if (!entry) {
      Logger.debug(`Cache MISS: ${key}`);
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      Logger.debug(`Cache EXPIRED: ${key}`);
      await this.invalidate(key);
      return null;
    }
    Logger.debug(`Cache HIT: ${key}`);
    await StorageBudgetManager.touch(key);
    return entry.data;
  },

  /**
   * Writes data to cache with TTL.
   * @param key    Storage key (from CacheKey.generate)
   * @param data   Any JSON-serializable value
   * @param ttl    TTL override in ms. Falls back to SDKConfig.defaultTTL
   */
  async set<T = unknown>(key: string, data: T, ttl?: number): Promise<void> {
    const resolvedTTL = ttl ?? SDKConfig.get().defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + resolvedTTL,
      cachedAt:  Date.now(),
    };
    const serialized = JSON.stringify(entry);
    const sizeBytes  = serialized.length * 2; // UTF-16 approximation

    await StorageUtils.setItem(key, entry);
    await StorageBudgetManager.track(key, sizeBytes);
    Logger.debug(`Cache SET: ${key} (TTL: ${resolvedTTL}ms, ~${(sizeBytes / 1024).toFixed(1)} KB)`);
  },

  /** Deletes a single cache entry and removes it from the budget tracker */
  async invalidate(key: string): Promise<void> {
    await StorageUtils.removeItem(key);
    await StorageBudgetManager.remove(key);
    Logger.debug(`Cache INVALIDATED: ${key}`);
  },

  /** Wipes all SDK cache entries (does not touch the action queue) */
  async clear(): Promise<void> {
    const keys = await StorageUtils.getAllKeys(CACHE_KEY_PREFIX);
    await StorageUtils.multiRemove(keys);
    Logger.info(`Cache CLEARED — removed ${keys.length} entries.`);
  },

  /**
   * Upserts a cache entry from a delta sync response.
   * Resets TTL to default so freshly-synced data lives its full lifetime.
   */
  async updateFromDelta<T = unknown>(key: string, data: T): Promise<void> {
    await this.set(key, data);
    Logger.debug(`Cache UPDATED via delta sync: ${key}`);
  },
};
