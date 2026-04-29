// ─────────────────────────────────────────────────────────────────────────────
// Logger.ts — SDK-internal debug/info/warn/error logger
// Completely silent in production when debug: false
// ─────────────────────────────────────────────────────────────────────────────

import { SDKConfig } from '../core/SDKConfig';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[OfflineLayer]';

function formatMessage(level: LogLevel, msg: string): string {
  const ts = new Date().toISOString();
  return `${PREFIX} [${level.toUpperCase()}] ${ts} — ${msg}`;
}

function log(level: LogLevel, msg: string, ...args: unknown[]): void {
  // Always show errors regardless of debug flag
  if (level !== 'error' && !SDKConfig.isInitialized()) return;
  if (level === 'debug' && SDKConfig.isInitialized() && !SDKConfig.get().debug) return;

  const formatted = formatMessage(level, msg);
  switch (level) {
    case 'error':
      console.error(formatted, ...args);
      break;
    case 'warn':
      console.warn(formatted, ...args);
      break;
    default:
      console.log(formatted, ...args);
  }
}

export const Logger = {
  debug: (msg: string, ...args: unknown[]) => log('debug', msg, ...args),
  info:  (msg: string, ...args: unknown[]) => log('info',  msg, ...args),
  warn:  (msg: string, ...args: unknown[]) => log('warn',  msg, ...args),
  error: (msg: string, ...args: unknown[]) => log('error', msg, ...args),
};
