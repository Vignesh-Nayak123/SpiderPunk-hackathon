// ─────────────────────────────────────────────────────────────────────────────
// SDKConfig.ts — Singleton config store for the entire SDK
// ─────────────────────────────────────────────────────────────────────────────

export type ConflictStrategy = 'last-write-wins' | 'server-wins' | 'client-wins';

export interface SDKConfigOptions {
  /** Base URL of your backend API (no trailing slash) */
  backendURL: string;
  /** Max local storage budget in MB. Default: 50 */
  storageCap?: number;
  /** Default cache TTL in milliseconds. Default: 300_000 (5 min) */
  defaultTTL?: number;
  /** Path of the sync endpoint. Default: '/sync' */
  syncEndpoint?: string;
  /** Path of the delta endpoint. Default: '/delta' */
  deltaEndpoint?: string;
  /** Enable verbose SDK logging. Default: false */
  debug?: boolean;
  /** Offline conflict resolution strategy. Default: 'last-write-wins' */
  conflictStrategy?: ConflictStrategy;
  /** Current active user ID. Default: 'default_user' */
  userId?: string;
  /** Max retries... */
  maxRetries?: number;
}

export interface ResolvedConfig {
  backendURL: string;
  storageCap: number;      // bytes
  defaultTTL: number;      // ms
  syncEndpoint: string;
  deltaEndpoint: string;
  debug: boolean;
  conflictStrategy: ConflictStrategy;
  maxRetries: number;
  userId: string;
}

const DEFAULTS: Omit<ResolvedConfig, 'backendURL'> = {
  storageCap:        50 * 1024 * 1024,  // 50 MB
  defaultTTL:        5  * 60  * 1000,   // 5 min
  syncEndpoint:      '/sync',
  deltaEndpoint:     '/delta',
  debug:             false,
  conflictStrategy:  'last-write-wins',
  maxRetries:        3,
  userId:            'default_user',
};

let _config: ResolvedConfig | null = null;

export const SDKConfig = {
  init(options: SDKConfigOptions): void {
    _config = {
      ...DEFAULTS,
      ...options,
      // storageCap accepted as MB, stored as bytes
      storageCap: (options.storageCap ?? 50) * 1024 * 1024,
      backendURL: options.backendURL.replace(/\/$/, ''), // strip trailing slash
    };
  },

  get(): ResolvedConfig {
    if (!_config) {
      throw new Error(
        '[OfflineLayer] SDK not initialized. Call OfflineLayer.init({ backendURL }) first.'
      );
    }
    return _config;
  },

  isInitialized(): boolean {
    return _config !== null;
  },

  /** For testing only — resets config to null */
  _reset(): void {
    _config = null;
  },

  setUserId(id: string): void {
    if (_config) _config.userId = id;
  },

  getUserId(): string {
    return _config ? _config.userId : 'default_user';
  }
};
