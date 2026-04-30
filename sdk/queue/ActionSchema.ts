// ─────────────────────────────────────────────────────────────────────────────
// ActionSchema.ts — Shared types for the action queue and sync API contract.
//
// This file defines the canonical wire format between the SDK and the backend.
// Backend developers should implement /sync and /delta to match these types.
export type HttpMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ActionStatus = 'pending' | 'syncing' | 'failed';

// ── Queued Action ─────────────────────────────────────────────────────────────

export interface QueuedAction {
  action_id: string;
  type: string;
  payload: Record<string, any>;
  timestamp: string; // ISO-8601
  retries: number;
  status: ActionStatus;
}

// ── /sync Endpoint Contract ───────────────────────────────────────────────────

export interface SyncPayload {
  user_id: string;
  actions: QueuedAction[];
}

export interface SyncResponse {
  status: string;
  processed: string[];
  failed: Array<{ id: string; reason: string }>;
}

// ── /delta Endpoint Contract ──────────────────────────────────────────────────

export interface DeltaResponse {
  created: Array<{
    id: string;
    chat_id: string;
    content: string;
    updated_at: string;
  }>;
  updated: Array<{
    id: string;
    chat_id: string;
    content: string;
    updated_at: string;
  }>;
  deleted: Array<{ id: string }>;
  server_time: string; // ISO-8601
}
