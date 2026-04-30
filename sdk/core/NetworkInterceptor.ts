// ─────────────────────────────────────────────────────────────────────────────
// NetworkInterceptor.ts — Monkey-patches global fetch.
//   GET  → cache-first (serve stale, fetch fresh, store result)
//   POST/PUT/PATCH/DELETE offline → enqueue to ActionQueue, return synthetic response
//   POST/PUT/PATCH/DELETE online  → pass through unchanged
// ─────────────────────────────────────────────────────────────────────────────

import { CacheEngine } from '../cache/CacheEngine';
import { CacheKey } from '../cache/CacheKey';
import { ActionQueue } from '../queue/ActionQueue';
import { OfflineDetector } from './OfflineDetector';
import { Logger } from '../utils/Logger';
import { HttpMethod } from '../queue/ActionSchema';

// Keep a reference to the original fetch before we patch it
const _originalFetch: typeof fetch = globalThis.fetch;

const READ_METHODS = new Set(['GET', 'HEAD']);
const WRITE_METHODS = new Set<HttpMethod>(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Parse headers from a Headers object or plain Record to a plain record */
function normalizeHeaders(init?: HeadersInit): Record<string, string> {
  if (!init) return {};
  if (init instanceof Headers) {
    const out: Record<string, string> = {};
    init.forEach((v, k) => { out[k] = v; });
    return out;
  }
  if (Array.isArray(init)) {
    return Object.fromEntries(init);
  }
  return { ...(init as Record<string, string>) };
}

/** Safely parse request body to a plain object (best-effort) */
async function parseBody(body: BodyInit | null | undefined): Promise<unknown> {
  if (!body) return null;
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return body; }
  }
  return null;
}

/** Build a synthetic Response for queued actions (so the app doesn't crash offline) */
function queuedResponse(id: string): Response {
  const payload = JSON.stringify({ queued: true, actionId: id, message: 'Action queued for sync.' });
  return new Response(payload, {
    status: 202,
    headers: { 'Content-Type': 'application/json', 'X-OfflineLayer-Queued': 'true' },
  });
}

async function offlineFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();

  // ── READ path ──────────────────────────────────────────────────────────────
  if (READ_METHODS.has(method)) {
    const key = CacheKey.generate(method, url);

    // NETWORK-FIRST STRATEGY: Try network first for instant real-time chat
    try {
      const response = await _originalFetch(input, init);
      if (response.ok) {
        const clone = response.clone();
        const data = await clone.json().catch(() => null);
        if (data !== null) {
          await CacheEngine.set(key, data);
        }
      }
      return response;
    } catch (err) {
      // NETWORK FAILED (Offline) -> Fallback to Cache
      const cached = await CacheEngine.get(key);
      if (cached !== null) {
        Logger.debug(`Offline Cache Fallback: ${method} ${url}`);
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'X-OfflineLayer-Cache': 'fallback' },
        });
      }

      Logger.warn(`Offline cache MISS and network failed for: ${url}`);
      return new Response(JSON.stringify({ error: 'Offline and no cached data available.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ── WRITE path ─────────────────────────────────────────────────────────────
  if (WRITE_METHODS.has(method as HttpMethod)) {
    const body = await parseBody(init?.body) as Record<string, any>;
    
    let type = 'UNKNOWN';
    if (url.includes('/api/messages')) {
      if (method === 'POST') type = 'SEND_MESSAGE';
      else if (method === 'PUT' || method === 'PATCH') type = 'UPDATE_MESSAGE';
      else if (method === 'DELETE') type = 'DELETE_MESSAGE';
    }

    const action = await ActionQueue.enqueue(type, body || {});
    Logger.info(`Queued action: ${type} [${action.action_id}]`);

    // Always try to trigger background flush immediately so it hits /sync/
    // If it's truly offline, it will fail gracefully inside QueueProcessor.
    import('../queue/QueueProcessor')
      .then(async m => {
        await m.QueueProcessor.flush();
        const { DeltaSyncManager } = await import('../sync/DeltaSyncManager');
        await DeltaSyncManager.sync();
      })
      .catch(err => Logger.error('Immediate flush failed', err));

    return queuedResponse(action.action_id);
  }

  // Fallback for OPTIONS, etc.
  return _originalFetch(input, init);
}

export const NetworkInterceptor = {
  /** Replaces global.fetch with the SDK interceptor. Called once by OfflineLayer.init() */
  install(): void {
    if ((globalThis.fetch as unknown as { __offlineLayer?: boolean }).__offlineLayer) {
      Logger.debug('NetworkInterceptor already installed. Skipping.');
      return;
    }
    globalThis.fetch = offlineFetch as typeof fetch;
    (globalThis.fetch as unknown as { __offlineLayer: boolean }).__offlineLayer = true;
    Logger.info('NetworkInterceptor installed — global fetch is now offline-first.');
  },

  /** Restores the original fetch. Useful for testing. */
  uninstall(): void {
    globalThis.fetch = _originalFetch;
    Logger.info('NetworkInterceptor uninstalled.');
  },

  /** Exposes the original fetch directly (bypasses cache/queue — for SDK internals) */
  rawFetch: _originalFetch,
};
