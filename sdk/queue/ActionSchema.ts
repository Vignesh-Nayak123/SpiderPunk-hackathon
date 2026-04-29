// ─────────────────────────────────────────────────────────────────────────────
// ActionSchema.ts — Shared types for the action queue and sync API contract.
//
// This file defines the canonical wire format between the SDK and the backend.
// Backend developers should implement /sync and /delta to match these types.
// ─────────────────────────────────────────────────────────────────────────────

export type HttpMethod   = 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ActionStatus = 'pending' | 'syncing' | 'failed';

// ── Queued Action ─────────────────────────────────────────────────────────────

/**
 * A single offline write action stored in the local queue.
 * Created when a POST/PUT/PATCH/DELETE is made while offline.
 */
export interface QueuedAction {
  /** Unique SDK-generated ID: "ol_{timestamp}_{random}" */
  id: string;
  /** Full URL the request was targeting */
  url: string;
  /** HTTP method */
  method: HttpMethod;
  /** Request headers (e.g. Authorization, Content-Type) */
  headers: Record<string, string>;
  /** Parsed request body */
  body: unknown;
  /** Unix epoch ms — when the action was created locally */
  timestamp: number;
  /** Number of sync attempts so far */
  retries: number;
  /** Current state of the action */
  status: ActionStatus;
}

// ── /sync Endpoint Contract ───────────────────────────────────────────────────

/**
 * Body sent by the SDK to POST /sync.
 * Backend receives the entire pending queue in one batch.
 *
 * @example
 * POST /sync
 * {
 *   "actions": [
 *     { "id": "ol_1714392000_a1b2c3d", "url": "/api/messages", "method": "POST",
 *       "headers": { "Authorization": "Bearer …" },
 *       "body": { "text": "Hello!" }, "timestamp": 1714392000000,
 *       "retries": 0, "status": "pending" }
 *   ],
 *   "clientTime": 1714392001234
 * }
 */
export interface SyncPayload {
  actions: QueuedAction[];
  /** Client's current epoch ms — allows server to detect large clock skew */
  clientTime: number;
}

/**
 * Response from POST /sync.
 * Backend must report which action IDs succeeded and which failed.
 *
 * @example
 * {
 *   "processed": ["ol_1714392000_a1b2c3d"],
 *   "failed": [],
 *   "serverTime": 1714392002000
 * }
 */
export interface SyncResponse {
  /** IDs of actions successfully applied on the server */
  processed: string[];
  /** Actions the server could not apply, with reasons */
  failed: Array<{ id: string; reason: string }>;
  /** Server's epoch ms at the time of processing */
  serverTime: number;
}

// ── /delta Endpoint Contract ──────────────────────────────────────────────────

/**
 * Response from GET /delta?since={lastSyncTimestamp}
 *
 * The backend returns only the records that changed after `since`.
 * The SDK merges `changes` into the cache and removes `deletions`.
 *
 * @example
 * GET /delta?since=1714392000000
 * {
 *   "changes": [
 *     { "url": "/api/messages/42", "data": { "text": "Hello!", "seen": true },
 *       "updatedAt": 1714392050000 }
 *   ],
 *   "deletions": [],
 *   "serverTime": 1714392100000
 * }
 */
export interface DeltaResponse {
  /** Records updated since `since` */
  changes: Array<{
    /** The canonical API URL this data belongs to */
    url: string;
    /** Latest server data for this resource */
    data: unknown;
    /** Server epoch ms of the update */
    updatedAt: number;
  }>;
  /** Resources deleted on the server since `since` */
  deletions: Array<{ url: string }>;
  /** Server's current epoch ms — becomes the next `lastSyncTimestamp` */
  serverTime: number;
}
