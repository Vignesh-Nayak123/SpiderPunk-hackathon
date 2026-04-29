// ─────────────────────────────────────────────────────────────────────────────
// ActionQueue.ts — Persistent FIFO queue for offline write actions.
//
// All mutations go through a simple async mutex (promise-chaining) to
// prevent concurrent reads and writes from corrupting the queue array.
// The queue survives app restarts because it is persisted in AsyncStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { QueuedAction, HttpMethod, ActionStatus } from './ActionSchema';
import { StorageUtils } from '../utils/StorageUtils';
import { Logger } from '../utils/Logger';

const QUEUE_KEY = 'ol_action_queue';

// ── Async mutex via promise chaining ─────────────────────────────────────────
let _lock: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = _lock.then(fn);
  // swallow errors on the lock chain — callers handle them
  _lock = next.then(() => {}, () => {});
  return next;
}

// ── ID generation ─────────────────────────────────────────────────────────────
function generateId(): string {
  return `ol_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export const ActionQueue = {
  /** Returns all queued actions (any status) */
  async getAll(): Promise<QueuedAction[]> {
    return (await StorageUtils.getItem<QueuedAction[]>(QUEUE_KEY)) ?? [];
  },

  /** Returns only actions with status 'pending' */
  async getPending(): Promise<QueuedAction[]> {
    const all = await this.getAll();
    return all.filter((a) => a.status === 'pending');
  },

  /**
   * Add a new action to the tail of the queue and persist immediately.
   * Returns the created action so callers can reference its ID.
   */
  async enqueue(
    url: string,
    method: HttpMethod,
    body: unknown,
    headers: Record<string, string> = {}
  ): Promise<QueuedAction> {
    return withLock(async () => {
      const queue = await this.getAll();
      const action: QueuedAction = {
        id:        generateId(),
        url,
        method,
        headers,
        body,
        timestamp: Date.now(),
        retries:   0,
        status:    'pending',
      };
      queue.push(action);
      await StorageUtils.setItem(QUEUE_KEY, queue);
      Logger.info(`Enqueued: ${method} ${url} [id: ${action.id}]`);
      return action;
    });
  },

  /** Remove a successfully synced action from the queue */
  async dequeue(id: string): Promise<void> {
    return withLock(async () => {
      const queue = await this.getAll();
      const next  = queue.filter((a) => a.id !== id);
      await StorageUtils.setItem(QUEUE_KEY, next);
      Logger.debug(`Dequeued: ${id}`);
    });
  },

  /** Increment retry counter. Returns new retry count. */
  async incrementRetry(id: string): Promise<number> {
    return withLock(async () => {
      const queue  = await this.getAll();
      const action = queue.find((a) => a.id === id);
      if (!action) return 0;
      action.retries += 1;
      action.status   = 'pending';
      await StorageUtils.setItem(QUEUE_KEY, queue);
      return action.retries;
    });
  },

  /** Mark an action as permanently failed (won't be retried) */
  async markFailed(id: string): Promise<void> {
    return withLock(async () => {
      const queue  = await this.getAll();
      const action = queue.find((a) => a.id === id);
      if (action) {
        action.status = 'failed';
        await StorageUtils.setItem(QUEUE_KEY, queue);
        Logger.warn(`Action permanently FAILED: ${id} (${action.method} ${action.url})`);
      }
    });
  },

  /** Update status of a specific action (e.g. 'syncing' while flushing) */
  async setStatus(id: string, status: ActionStatus): Promise<void> {
    return withLock(async () => {
      const queue  = await this.getAll();
      const action = queue.find((a) => a.id === id);
      if (action) {
        action.status = status;
        await StorageUtils.setItem(QUEUE_KEY, queue);
      }
    });
  },

  /** Count of pending (not yet synced) actions */
  async pendingCount(): Promise<number> {
    const all = await this.getAll();
    return all.filter((a) => a.status === 'pending').length;
  },

  /** Wipe entire queue — use with caution */
  async clear(): Promise<void> {
    return withLock(async () => {
      await StorageUtils.setItem(QUEUE_KEY, []);
      Logger.info('ActionQueue cleared.');
    });
  },
};
