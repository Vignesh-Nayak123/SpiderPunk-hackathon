// ─────────────────────────────────────────────────────────────────────────────
// DeltaSyncManager.ts — Pulls only the changed records from /delta
// and merges them into the local cache after a queue flush.
//
// Flow:
//   1. Read lastSyncTimestamp from AsyncStorage (0 if first run)
//   2. GET /delta?since={lastSyncTimestamp}
//   3. For each change → update matching cache entry
//   4. For each deletion → invalidate matching cache entry
//   5. Persist serverTime as new lastSyncTimestamp
// ─────────────────────────────────────────────────────────────────────────────

import { CacheEngine } from '../cache/CacheEngine';
import { CacheKey } from '../cache/CacheKey';
import { SDKConfig } from '../core/SDKConfig';
import { NetworkInterceptor } from '../core/NetworkInterceptor';
import { StorageUtils } from '../utils/StorageUtils';
import { Logger } from '../utils/Logger';
import { DeltaResponse } from '../queue/ActionSchema';

const LAST_SYNC_KEY = 'ol_last_sync';

export const DeltaSyncManager = {
  async getLastSyncTime(): Promise<number> {
    return (await StorageUtils.getItem<number>(LAST_SYNC_KEY)) ?? 0;
  },

  async setLastSyncTime(ts: number): Promise<void> {
    await StorageUtils.setItem(LAST_SYNC_KEY, ts);
  },

  /**
   * Pull changes from the backend and merge into the cache.
   * Called automatically after QueueProcessor.flush() completes.
   */
  async sync(): Promise<void> {
    const config    = SDKConfig.get();
    const lastSync  = await this.getLastSyncTime();
    const deltaURL  = `${config.backendURL}${config.deltaEndpoint}`;

    const lastSyncedISO = lastSync > 0 ? new Date(lastSync).toISOString() : new Date(0).toISOString();
    Logger.info(
      `Delta sync starting. last_synced_at=${lastSyncedISO}`
    );

    try {
      // Use rawFetch so we don't hit our own cache for a sync request
      const response = await NetworkInterceptor.rawFetch(deltaURL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: SDKConfig.get().userId,
          last_synced_at: lastSyncedISO
        })
      });

      if (!response.ok) {
        throw new Error(`/delta responded ${response.status} ${response.statusText}`);
      }

      const delta: DeltaResponse = await response.json();
      const { created, updated, deleted, server_time } = delta;

      const changes = [...created, ...updated];
      const deletions = deleted;

      Logger.info(
        `Delta received — ${changes.length} change(s), ${deletions.length} deletion(s).`
      );

      // ── Apply changes ────────────────────────────────────────────────────
      if (changes.length > 0 || deletions.length > 0) {
        // Invalidate the main messages list so the UI fetches fresh data
        const messagesKey = CacheKey.generate('GET', `${config.backendURL}/api/messages`);
        await CacheEngine.invalidate(messagesKey);
        Logger.debug(`Delta invalidated cache for: /api/messages`);
      }

      // ── Advance the sync cursor ───────────────────────────────────────────
      const newCursorTime = new Date(server_time).getTime();
      await this.setLastSyncTime(newCursorTime);
      Logger.info(`Delta sync complete. Next sync cursor: ${server_time}`);
    } catch (err) {
      Logger.error('Delta sync failed — will retry on next reconnect:', err);
      // Don't update lastSyncTime so we re-pull the same window next time
    }
  },

  /** Reset the sync cursor (useful for full re-sync or logout) */
  async reset(): Promise<void> {
    await StorageUtils.removeItem(LAST_SYNC_KEY);
    Logger.info('Delta sync cursor reset.');
  },
};
