// ─────────────────────────────────────────────────────────────────────────────
// QueueProcessor.ts — Flushes the ActionQueue to the /sync endpoint
// when connectivity is restored. Handles retries and progress events.
// ─────────────────────────────────────────────────────────────────────────────

import { ActionQueue } from './ActionQueue';
import { SDKConfig } from '../core/SDKConfig';
import { NetworkInterceptor } from '../core/NetworkInterceptor';
import { Logger } from '../utils/Logger';
import { SyncPayload, SyncResponse } from './ActionSchema';

export type ProgressListener = (opts: {
  processed: number;
  total: number;
  failed: number;
}) => void;

const _progressListeners = new Set<ProgressListener>();
let _isFlushing = false;

export const QueueProcessor = {
  /** Subscribe to flush progress. Returns unsubscribe fn. */
  onProgress(listener: ProgressListener): () => void {
    _progressListeners.add(listener);
    return () => _progressListeners.delete(listener);
  },

  isFlushing(): boolean {
    return _isFlushing;
  },

  /**
   * Flush all pending actions to POST /sync.
   * - Uses rawFetch (bypasses the NetworkInterceptor cache layer)
   * - Successfully processed actions are dequeued
   * - Failed actions are retried up to maxRetries, then marked 'failed'
   */
  async flush(): Promise<void> {
    if (_isFlushing) {
      Logger.debug('Flush already in progress — skipping.');
      return;
    }

    const pending = await ActionQueue.getPending();
    if (pending.length === 0) {
      Logger.info('Queue empty — nothing to flush.');
      return;
    }

    _isFlushing = true;
    Logger.info(`Flushing ${pending.length} action(s) to /sync…`);

    const config  = SDKConfig.get();
    const syncURL = `${config.backendURL}${config.syncEndpoint}`;

    // Mark all as 'syncing' so new offline actions that arrive mid-flush
    // don't get included in this batch
    for (const a of pending) {
      await ActionQueue.setStatus(a.id, 'syncing');
    }

    let processedCount = 0;
    let failedCount    = 0;

    const emitProgress = () =>
      _progressListeners.forEach((fn) =>
        fn({ processed: processedCount, total: pending.length, failed: failedCount })
      );

    try {
      const payload: SyncPayload = { actions: pending, clientTime: Date.now() };

      const response = await NetworkInterceptor.rawFetch(syncURL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`/sync responded ${response.status} ${response.statusText}`);
      }

      const result: SyncResponse = await response.json();

      // ── Successes ────────────────────────────────────────────────────────
      for (const id of result.processed) {
        await ActionQueue.dequeue(id);
        processedCount++;
        emitProgress();
      }

      // ── Failures reported by server ───────────────────────────────────────
      for (const { id, reason } of result.failed) {
        const retries = await ActionQueue.incrementRetry(id);
        Logger.warn(`Server rejected action ${id}: "${reason}" (attempt ${retries}/${config.maxRetries})`);
        if (retries >= config.maxRetries) {
          await ActionQueue.markFailed(id);
        }
        failedCount++;
        emitProgress();
      }

      Logger.info(
        `Flush complete — ${processedCount} synced, ${failedCount} failed, ` +
        `${result.failed.length} server-rejected.`
      );
    } catch (err) {
      Logger.error('Flush error — will retry on next reconnect:', err);
      // Revert 'syncing' → 'pending' so they're eligible next time
      for (const a of pending) {
        const retries = await ActionQueue.incrementRetry(a.id);
        if (retries >= config.maxRetries) {
          await ActionQueue.markFailed(a.id);
        }
      }
    } finally {
      _isFlushing = false;
    }
  },
};
