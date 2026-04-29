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
const _originalFetch: typeof fetch = global.fetch;

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
    const cached = await CacheEngine.get(key);

    if (cached !== null) {
      Logger.debug(`Cache HIT: ${method} ${url}`);
      const payload = JSON.stringify(cached);
      return new Response(payload, {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'X-OfflineLayer-Cache': 'hit' },
      });
    }

    // Cache miss — try network if available, else return 503
    if (OfflineDetector.isOnline()) {
      Logger.debug(`Cache MISS — fetching: ${url}`);
      const response = await _originalFetch(input, init);
      if (response.ok) {
        const clone = response.clone();
        const data = await clone.json().catch(() => null);
        if (data !== null) {
          await CacheEngine.set(key, data);
        }
      }
      return response;
    }

    Logger.warn(`Offline cache MISS for: ${url} — returning 503`);
    return new Response(JSON.stringify({ error: 'Offline and no cached data available.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── WRITE path ─────────────────────────────────────────────────────────────
  if (WRITE_METHODS.has(method as HttpMethod)) {
    if (!OfflineDetector.isOnline()) {
      const body = await parseBody(init?.body);
      const headers = normalizeHeaders(init?.headers);
      const action = await ActionQueue.enqueue(url, method as HttpMethod, body, headers);
      Logger.info(`Queued offline action: ${method} ${url} [${action.id}]`);
      return queuedResponse(action.id);
    }
    // Online — pass through
    return _originalFetch(input, init);
  }

  // Fallback for OPTIONS, etc.
  return _originalFetch(input, init);
}

export const NetworkInterceptor = {
  /** Replaces global.fetch with the SDK interceptor. Called once by OfflineLayer.init() */
  install(): void {
    if ((global.fetch as unknown as { __offlineLayer?: boolean }).__offlineLayer) {
      Logger.debug('NetworkInterceptor already installed. Skipping.');
      return;
    }
    global.fetch = offlineFetch as typeof fetch;
    (global.fetch as unknown as { __offlineLayer: boolean }).__offlineLayer = true;
    Logger.info('NetworkInterceptor installed — global fetch is now offline-first.');
  },

  /** Restores the original fetch. Useful for testing. */
  uninstall(): void {
    global.fetch = _originalFetch;
    Logger.info('NetworkInterceptor uninstalled.');
  },

  /** Exposes the original fetch directly (bypasses cache/queue — for SDK internals) */
  rawFetch: _originalFetch,
};
