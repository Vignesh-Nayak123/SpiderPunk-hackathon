// ─────────────────────────────────────────────────────────────────────────────
// index.ts — OfflineLayer public API
//
// Usage (2 lines):
//   import OfflineLayer from 'offline-layer-sdk'
//   OfflineLayer.init({ backendURL: 'https://api.example.com', storageCap: 50 })
//
// After init(), all fetch() calls in the app are automatically offline-first.
// ─────────────────────────────────────────────────────────────────────────────

import { SDKConfig, SDKConfigOptions } from './core/SDKConfig';
import { OfflineDetector, ConnectionStatus, StatusListener } from './core/OfflineDetector';
import { NetworkInterceptor } from './core/NetworkInterceptor';
import { CacheEngine } from './cache/CacheEngine';
import { StorageBudgetManager } from './cache/StorageBudgetManager';
import { ActionQueue } from './queue/ActionQueue';
import { QueueProcessor, ProgressListener } from './queue/QueueProcessor';
import { DeltaSyncManager } from './sync/DeltaSyncManager';
import { Logger } from './utils/Logger';

// Re-export useful types so host apps can import them from one place
export type { SDKConfigOptions } from './core/SDKConfig';
export type { ConnectionStatus, StatusListener } from './core/OfflineDetector';
export type { QueuedAction, SyncPayload, SyncResponse, DeltaResponse } from './queue/ActionSchema';
export type { VersionedRecord, ConflictResolution } from './sync/ConflictHandler';
export { ConflictHandler } from './sync/ConflictHandler';
export { ProgressListener } from './queue/QueueProcessor';

// ─────────────────────────────────────────────────────────────────────────────

/** Called once on connectivity restored: flush queue → delta sync */
async function onReconnect(): Promise<void> {
  Logger.info('Reconnected — starting sync pipeline…');
  await QueueProcessor.flush();
  await DeltaSyncManager.sync();
}

// ─────────────────────────────────────────────────────────────────────────────

const OfflineLayer = {
  /**
   * Initialize the SDK. Call once at app startup before any fetch() calls.
   *
   * @example
   *   OfflineLayer.init({
   *     backendURL: 'https://api.myapp.com',
   *     storageCap: 50,          // MB (default)
   *     defaultTTL: 300_000,     // 5 min (default)
   *     debug: __DEV__,
   *   });
   */
  async init(options: SDKConfigOptions): Promise<void> {
    SDKConfig.init(options);
    Logger.info(`SDK initializing — backend: ${options.backendURL}`);

    // Rehydrate LRU index from storage
    await StorageBudgetManager.load();

    // Patch global fetch (idempotent — safe to call multiple times)
    NetworkInterceptor.install();

    // Start network listener; trigger sync pipeline on reconnect
    OfflineDetector.start(onReconnect);

    Logger.info('SDK ready ✓');
  },

  // ── Status ─────────────────────────────────────────────────────────────────

  /** Returns true when the device has any working connectivity (including 2G/3G) */
  isOnline(): boolean {
    return OfflineDetector.isOnline();
  },

  /** Returns the fine-grained connection status */
  getConnectionStatus(): ConnectionStatus {
    return OfflineDetector.getStatus();
  },

  /**
   * Subscribe to network status changes.
   * Returns an unsubscribe function — call it in componentWillUnmount / useEffect cleanup.
   *
   * @example
   *   const unsub = OfflineLayer.onStatusChange((s) => setIsOnline(s !== 'offline'));
   *   return () => unsub();
   */
  onStatusChange(listener: StatusListener): () => void {
    return OfflineDetector.on(listener);
  },

  // ── Queue ──────────────────────────────────────────────────────────────────

  /** Number of write actions waiting to be synced */
  async pendingActionCount(): Promise<number> {
    return ActionQueue.pendingCount();
  },

  /** All actions in the queue (any status) — for debugging / UI display */
  async getQueue() {
    return ActionQueue.getAll();
  },

  /**
   * Subscribe to queue flush progress.
   * @example
   *   OfflineLayer.onSyncProgress(({ processed, total }) =>
   *     setSyncProgress(Math.round((processed / total) * 100))
   *   );
   */
  onSyncProgress(listener: ProgressListener): () => void {
    return QueueProcessor.onProgress(listener);
  },

  /** Manually trigger a queue flush + delta sync (normally automatic on reconnect) */
  async forceSync(): Promise<void> {
    await QueueProcessor.flush();
    await DeltaSyncManager.sync();
  },

  // ── Cache ──────────────────────────────────────────────────────────────────

  /** Clear all cached data (does not affect the action queue) */
  async clearCache(): Promise<void> {
    await CacheEngine.clear();
  },

  /** Storage usage stats */
  getCacheStats() {
    return StorageBudgetManager.getStats();
  },

  // ── Delta sync ─────────────────────────────────────────────────────────────

  /** Reset the delta sync cursor — next sync will pull all data */
  async resetSyncCursor(): Promise<void> {
    await DeltaSyncManager.reset();
  },

  /** Timestamp of the last successful delta sync (0 if never synced) */
  async lastSyncTime(): Promise<number> {
    return DeltaSyncManager.getLastSyncTime();
  },

  // ── Teardown ───────────────────────────────────────────────────────────────

  /** Stop the SDK — remove the fetch patch and disconnect listeners */
  destroy(): void {
    OfflineDetector.stop();
    NetworkInterceptor.uninstall();
    Logger.info('SDK destroyed.');
  },
};

export default OfflineLayer;
