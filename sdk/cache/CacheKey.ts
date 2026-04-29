// ─────────────────────────────────────────────────────────────────────────────
// CacheKey.ts — Generates deterministic, collision-resistant cache keys
// ─────────────────────────────────────────────────────────────────────────────

/** djb2 hash — fast, good distribution for URL strings */
function djb2(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(36); // unsigned, base36 string
}

/** Normalize a URL so that param order and trailing slashes don't create duplicate keys */
function normalize(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.sort();
    u.pathname = u.pathname.replace(/\/+$/, '') || '/';
    return u.toString();
  } catch {
    // Relative URL — just strip trailing slash
    return url.replace(/\/+$/, '') || '/';
  }
}

export const CACHE_KEY_PREFIX = 'ol_cache_';

export const CacheKey = {
  /**
   * Generate a stable storage key for a given request.
   * Body is included in the hash for POST-as-read patterns.
   */
  generate(method: string, url: string, body?: unknown): string {
    const bodyStr = body ? JSON.stringify(body) : '';
    const raw = `${method.toUpperCase()}:${normalize(url)}:${bodyStr}`;
    return `${CACHE_KEY_PREFIX}${djb2(raw)}`;
  },

  /** Check if a storage key belongs to the SDK cache namespace */
  isSDKKey(key: string): boolean {
    return key.startsWith(CACHE_KEY_PREFIX);
  },
};
