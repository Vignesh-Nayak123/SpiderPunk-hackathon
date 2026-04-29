// ─────────────────────────────────────────────────────────────────────────────
// OfflineDetector.ts — Listens to NetInfo and classifies connection state.
// Emits 'online', 'offline', 'weak' events and triggers sync on reconnect.
// ─────────────────────────────────────────────────────────────────────────────

import NetInfo, { NetInfoState, NetInfoCellularGeneration } from '@react-native-community/netinfo';
import { Logger } from '../utils/Logger';

export type ConnectionStatus = 'online' | 'offline' | 'weak' | 'unknown';
export type StatusListener = (status: ConnectionStatus) => void;

const _listeners = new Set<StatusListener>();
let _currentStatus: ConnectionStatus = 'unknown';
let _unsubscribe: (() => void) | null = null;

/** Map NetInfo state → our 3-tier status */
function classify(state: NetInfoState): ConnectionStatus {
  if (!state.isConnected) return 'offline';
  if (state.type === 'none' || state.type === 'unknown') return 'offline';

  // Check cellular generation for 2G/3G weak signal
  const gen: NetInfoCellularGeneration | undefined | null =
    (state.details as { cellularGeneration?: NetInfoCellularGeneration | null })
      ?.cellularGeneration;

  if (gen === '2g' || gen === '3g') return 'weak';
  return 'online';
}

function emit(next: ConnectionStatus): void {
  if (next === _currentStatus) return;
  const prev = _currentStatus;
  _currentStatus = next;
  Logger.info(`Network: ${prev} → ${next}`);
  _listeners.forEach((fn) => fn(next));
}

export const OfflineDetector = {
  /**
   * Start listening. Safe to call multiple times (idempotent).
   * @param onOnline  Called when connection is restored (triggers sync externally)
   */
  start(onOnline?: () => void): void {
    if (_unsubscribe) return;

    // Seed with current state
    NetInfo.fetch().then((state) => {
      _currentStatus = classify(state);
      Logger.debug(`Initial network status: ${_currentStatus}`);
    });

    _unsubscribe = NetInfo.addEventListener((state) => {
      const next = classify(state);
      const wasOffline = !OfflineDetector.isOnline();
      emit(next);
      if (wasOffline && OfflineDetector.isOnline() && onOnline) {
        onOnline();
      }
    });

    Logger.info('OfflineDetector started.');
  },

  stop(): void {
    _unsubscribe?.();
    _unsubscribe = null;
    _listeners.clear();
    Logger.info('OfflineDetector stopped.');
  },

  /** Returns true for 'online' or 'weak' (2G/3G — degraded but connected) */
  isOnline(): boolean {
    return _currentStatus === 'online' || _currentStatus === 'weak';
  },

  getStatus(): ConnectionStatus {
    return _currentStatus;
  },

  /**
   * Subscribe to status changes. Returns an unsubscribe function.
   * @example
   *   const unsub = OfflineDetector.on(status => console.log(status));
   *   unsub(); // cleanup
   */
  on(listener: StatusListener): () => void {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  },

  /** For testing only */
  _setStatus(status: ConnectionStatus): void {
    _currentStatus = status;
  },
};
