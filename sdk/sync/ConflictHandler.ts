// ─────────────────────────────────────────────────────────────────────────────
// ConflictHandler.ts — Client-side conflict resolution before sync.
//
// Scenario this solves:
//   A user edits their profile name offline at 09:00 (clientRecord).
//   While offline, the server processes another device's avatar change at 09:05
//   (serverRecord). When connectivity returns, we have a conflict.
//
// The SDK's job is to decide: should we SEND the client action or DROP it?
// True field-level merging is delegated to the backend, but we give it
// a "winner" recommendation via the conflict metadata header.
//
// Three strategies (configurable via SDKConfig.conflictStrategy):
//   last-write-wins — most-recent timestamp wins (default)
//   server-wins     — always prefer server version (safe/conservative)
//   client-wins     — always prefer client version (optimistic)
// ─────────────────────────────────────────────────────────────────────────────

import { SDKConfig, ConflictStrategy } from '../core/SDKConfig';
import { Logger } from '../utils/Logger';

export interface VersionedRecord {
  /** The actual data payload */
  data: Record<string, unknown>;
  /** Epoch ms when this version was last written */
  updatedAt: number;
  /** Which side produced this version */
  source: 'client' | 'server';
}

export interface ConflictResolution {
  winner: VersionedRecord;
  loser:  VersionedRecord;
  strategy: ConflictStrategy;
  /** true when the server version was newer than the client version */
  conflictDetected: boolean;
}

export const ConflictHandler = {
  /**
   * Decides which version wins when a queued action conflicts with the
   * server's current state of the same resource.
   *
   * Example (Last-Write-Wins):
   *   client = { name: 'Rahul',   updatedAt: 09:00, source: 'client' }
   *   server = { name: 'Rahul V', updatedAt: 09:05, source: 'server' }
   *   → server wins (09:05 > 09:00)
   *   → SDK drops the queued action; cache is refreshed from delta
   *
   * Example (Client-Wins override):
   *   Same data as above with conflictStrategy: 'client-wins'
   *   → client wins regardless of timestamp
   *   → SDK sends the action; server is expected to honour it
   */
  resolve(
    clientRecord: VersionedRecord,
    serverRecord:  VersionedRecord,
    strategyOverride?: ConflictStrategy
  ): ConflictResolution {
    const strategy         = strategyOverride ?? SDKConfig.get().conflictStrategy;
    const conflictDetected = serverRecord.updatedAt > clientRecord.updatedAt;

    if (!conflictDetected) {
      // Client action was created AFTER the last known server update — no conflict.
      Logger.debug('No conflict detected — client action is newer than server record.');
      return { winner: clientRecord, loser: serverRecord, strategy, conflictDetected: false };
    }

    Logger.warn(
      `Conflict detected!\n` +
      `  Client version : ${new Date(clientRecord.updatedAt).toISOString()} (${JSON.stringify(clientRecord.data)})\n` +
      `  Server version : ${new Date(serverRecord.updatedAt).toISOString()} (${JSON.stringify(serverRecord.data)})\n` +
      `  Strategy       : ${strategy}`
    );

    let winner: VersionedRecord;
    let loser:  VersionedRecord;

    switch (strategy) {
      case 'server-wins':
        winner = serverRecord;
        loser  = clientRecord;
        break;

      case 'client-wins':
        winner = clientRecord;
        loser  = serverRecord;
        break;

      case 'last-write-wins':
      default:
        // The more recent timestamp wins
        if (serverRecord.updatedAt >= clientRecord.updatedAt) {
          winner = serverRecord;
          loser  = clientRecord;
        } else {
          winner = clientRecord;
          loser  = serverRecord;
        }
    }

    Logger.info(`Conflict resolved — ${winner.source} wins via "${strategy}" strategy.`);
    return { winner, loser, strategy, conflictDetected: true };
  },

  /**
   * Shallow field-level merge — the newer record's fields take precedence.
   *
   * Useful for partial updates where each side only changed different fields:
   *
   *   client = { name: 'Rahul',    avatar: 'old.png' }  ← edited name offline
   *   server = { name: 'Rahul V',  avatar: 'new.png' }  ← edited avatar on another device
   *
   * Note: In a real app this would use per-field timestamps (CRDTs).
   * Here we do a simple "newer record's top-level fields win" merge,
   * and let the backend perform authoritative field-level resolution.
   */
  mergeFields(
    clientRecord: VersionedRecord,
    serverRecord:  VersionedRecord
  ): Record<string, unknown> {
    const [newer, older] =
      serverRecord.updatedAt >= clientRecord.updatedAt
        ? [serverRecord.data, clientRecord.data]
        : [clientRecord.data, serverRecord.data];
    // Start with older as the base, overlay with newer — newer fields win
    return { ...older, ...newer };
  },
};
