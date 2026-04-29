// ─────────────────────────────────────────────────────────────────────────────
// CacheEngine.test.ts — Unit tests for TTL cache + LRU budget integration
// ─────────────────────────────────────────────────────────────────────────────

import { SDKConfig } from '../core/SDKConfig';
import { StorageBudgetManager } from '../cache/StorageBudgetManager';
import { CacheEngine } from '../cache/CacheEngine';

// Seed config before each test
beforeEach(() => {
  SDKConfig.init({ backendURL: 'https://api.test.com', storageCap: 50, debug: false });
  StorageBudgetManager._reset();
});

describe('CacheEngine.get / set', () => {
  it('returns null on cache miss', async () => {
    const result = await CacheEngine.get('ol_cache_missing');
    expect(result).toBeNull();
  });

  it('stores and retrieves data within TTL', async () => {
    await CacheEngine.set('ol_cache_test1', { hello: 'world' }, 60_000);
    const result = await CacheEngine.get<{ hello: string }>('ol_cache_test1');
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns null and invalidates an expired entry', async () => {
    await CacheEngine.set('ol_cache_expired', { stale: true }, -1); // TTL already expired
    const result = await CacheEngine.get('ol_cache_expired');
    expect(result).toBeNull();
  });

  it('invalidates a specific key', async () => {
    await CacheEngine.set('ol_cache_todelete', { data: 1 }, 60_000);
    await CacheEngine.invalidate('ol_cache_todelete');
    expect(await CacheEngine.get('ol_cache_todelete')).toBeNull();
  });
});

describe('CacheEngine.clear', () => {
  it('removes all ol_cache_ prefixed keys', async () => {
    await CacheEngine.set('ol_cache_a', { x: 1 }, 60_000);
    await CacheEngine.set('ol_cache_b', { x: 2 }, 60_000);
    await CacheEngine.clear();
    expect(await CacheEngine.get('ol_cache_a')).toBeNull();
    expect(await CacheEngine.get('ol_cache_b')).toBeNull();
  });
});
