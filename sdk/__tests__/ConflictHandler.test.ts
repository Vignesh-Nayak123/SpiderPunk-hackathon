// ─────────────────────────────────────────────────────────────────────────────
// ConflictHandler.test.ts — Tests for all three conflict resolution strategies
//
// This also demonstrates the scenario asked in the design review:
//   "Show how ConflictHandler resolves a scenario where a user edited a
//    profile offline while another change happened on the server."
// ─────────────────────────────────────────────────────────────────────────────

import { ConflictHandler, VersionedRecord } from '../sync/ConflictHandler';
import { SDKConfig } from '../core/SDKConfig';

beforeEach(() => {
  SDKConfig.init({ backendURL: 'https://api.test.com', conflictStrategy: 'last-write-wins' });
});

// ── Scenario Setup ────────────────────────────────────────────────────────────
//
//  User edits their profile name to "Rahul" while offline at 09:00.
//  Meanwhile, another device changes the avatar to "new.png" on the server at 09:05.
//  When connectivity returns, the SDK detects a conflict.

const CLIENT: VersionedRecord = {
  data:      { name: 'Rahul', avatar: 'old.png' },
  updatedAt: new Date('2024-04-29T09:00:00Z').getTime(),
  source:    'client',
};

const SERVER: VersionedRecord = {
  data:      { name: 'Rahul V', avatar: 'new.png' },
  updatedAt: new Date('2024-04-29T09:05:00Z').getTime(),
  source:    'server',
};

// ─────────────────────────────────────────────────────────────────────────────

describe('ConflictHandler — last-write-wins (default)', () => {
  it('detects a conflict when server is newer', () => {
    const result = ConflictHandler.resolve(CLIENT, SERVER);
    expect(result.conflictDetected).toBe(true);
  });

  it('server wins because its timestamp is more recent (09:05 > 09:00)', () => {
    const result = ConflictHandler.resolve(CLIENT, SERVER);
    expect(result.winner.source).toBe('server');
    expect(result.winner.data.name).toBe('Rahul V');
  });

  it('no conflict when client is newer than server', () => {
    const newerClient: VersionedRecord = { ...CLIENT, updatedAt: SERVER.updatedAt + 1000 };
    const result = ConflictHandler.resolve(newerClient, SERVER);
    expect(result.conflictDetected).toBe(false);
    expect(result.winner.source).toBe('client');
  });
});

describe('ConflictHandler — server-wins', () => {
  it('always picks server regardless of timestamps', () => {
    const result = ConflictHandler.resolve(CLIENT, SERVER, 'server-wins');
    expect(result.winner.source).toBe('server');
  });
});

describe('ConflictHandler — client-wins', () => {
  it('always picks client regardless of timestamps', () => {
    const result = ConflictHandler.resolve(CLIENT, SERVER, 'client-wins');
    expect(result.winner.source).toBe('client');
    expect(result.winner.data.name).toBe('Rahul');
  });
});

describe('ConflictHandler.mergeFields', () => {
  it('newer record fields take precedence in a field-level merge', () => {
    const merged = ConflictHandler.mergeFields(CLIENT, SERVER);
    // SERVER is newer (09:05) so its fields win
    expect(merged.name).toBe('Rahul V');
    expect(merged.avatar).toBe('new.png');
  });
});
