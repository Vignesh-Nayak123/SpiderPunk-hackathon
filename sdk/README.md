# Offline Layer SDK

> **Drop-in offline-first SDK for React Native.**  
> Smart cache · Action queue · Auto-sync · Delta sync · Storage budget management.

---

## Quick Start (2 lines)

```javascript
import OfflineLayer from 'offline-layer-sdk'
OfflineLayer.init({ backendURL: 'https://api.yourapp.com', storageCap: 50 })
```

That's it. All `fetch()` calls in your app are now **offline-first** automatically.

---

## How It Works

```
App fetch(url)
      │
      ▼
NetworkInterceptor (monkey-patches global fetch)
      │
 ┌────┴────┐
 │         │
GET    POST/PUT/PATCH/DELETE
 │         │
 │    ┌────┴────┐
 │  online?    offline?
 │    │             │
 │  pass       ActionQueue
 │ through      (persist)
 │    │             │
 ▼    ▼         [on reconnect]
CacheEngine   QueueProcessor.flush()  →  POST /sync
(TTL check)   DeltaSyncManager.sync() →  GET  /delta?since=…
                                              │
                                       CacheEngine.merge()
```

---

## Installation

```bash
npm install offline-layer-sdk
# peer dependencies (if not already installed):
npm install @react-native-async-storage/async-storage @react-native-community/netinfo
```

---

## Configuration

```typescript
OfflineLayer.init({
  backendURL:        'https://api.yourapp.com',  // required — no trailing slash
  storageCap:        50,                          // MB, default 50
  defaultTTL:        300_000,                     // ms, default 5 min
  syncEndpoint:      '/sync',                     // default
  deltaEndpoint:     '/delta',                    // default
  debug:             __DEV__,                     // verbose logging in dev
  conflictStrategy:  'last-write-wins',           // | 'server-wins' | 'client-wins'
  maxRetries:        3,                           // per queued action
})
```

---

## API Reference

### Status

```typescript
OfflineLayer.isOnline()            // → boolean (true for wifi/4G/3G/2G)
OfflineLayer.getConnectionStatus() // → 'online' | 'offline' | 'weak' | 'unknown'
OfflineLayer.onStatusChange((status) => { ... }) // returns unsubscribe fn
```

### Queue

```typescript
await OfflineLayer.pendingActionCount()   // → number
await OfflineLayer.getQueue()             // → QueuedAction[]
OfflineLayer.onSyncProgress(({ processed, total, failed }) => { ... })
await OfflineLayer.forceSync()            // manually trigger flush + delta
```

### Cache

```typescript
await OfflineLayer.clearCache()  // wipes all cached responses
OfflineLayer.getCacheStats()     // → { totalMB, entryCount, capMB, usedPercent }
```

### Delta Sync

```typescript
await OfflineLayer.lastSyncTime()     // → epoch ms of last successful sync
await OfflineLayer.resetSyncCursor()  // force full re-sync on next connect
```

### Teardown

```typescript
OfflineLayer.destroy() // stops listeners, restores original fetch
```

---

## Backend API Contract

### `POST /sync`

**Request body** (`SyncPayload`):
```json
{
  "actions": [
    {
      "id":        "ol_1714392000_a1b2c3",
      "url":       "/api/messages",
      "method":    "POST",
      "headers":   { "Authorization": "Bearer …" },
      "body":      { "text": "Hello from the metro!" },
      "timestamp": 1714392000000,
      "retries":   0,
      "status":    "pending"
    }
  ],
  "clientTime": 1714392001234
}
```

**Response** (`SyncResponse`):
```json
{
  "processed":  ["ol_1714392000_a1b2c3"],
  "failed":     [],
  "serverTime": 1714392002000
}
```

---

### `GET /delta?since={timestamp}`

**Response** (`DeltaResponse`):
```json
{
  "changes": [
    { "url": "/api/messages/42", "data": { "text": "Hi!", "seen": true }, "updatedAt": 1714392050000 }
  ],
  "deletions":  [],
  "serverTime": 1714392100000
}
```

---

## Conflict Resolution

When a user edits data offline and the server has a newer version:

```typescript
import { ConflictHandler } from 'offline-layer-sdk'

const client = { data: { name: 'Rahul' },    updatedAt: 09_00, source: 'client' }
const server = { data: { name: 'Rahul V' },  updatedAt: 09_05, source: 'server' }

const { winner, conflictDetected } = ConflictHandler.resolve(client, server)
// conflictDetected → true  (server is newer)
// winner.source    → 'server'  (last-write-wins default)
```

Configure globally via `conflictStrategy` in `init()`, or override per-call.

---

## Storage Budget

- Default cap: **50 MB**  
- Eviction policy: **LRU** (Least Recently Used)  
- Eviction target: **80% of cap** (hysteresis — prevents thrash)  
- All cache keys are namespaced under `ol_cache_*` to avoid collisions with host app storage.

---

## Running Tests

```bash
cd sdk
npm install
npm test
```

---

## Project Structure

```
sdk/
├── index.ts                        Main export — OfflineLayer singleton
├── core/
│   ├── SDKConfig.ts                Typed config with defaults
│   ├── OfflineDetector.ts          NetInfo listener — online/offline/weak
│   └── NetworkInterceptor.ts       Global fetch monkey-patch
├── cache/
│   ├── CacheKey.ts                 Deterministic key generation (djb2 hash)
│   ├── CacheEngine.ts              TTL-aware read/write
│   └── StorageBudgetManager.ts     LRU index + 50 MB cap enforcement
├── queue/
│   ├── ActionSchema.ts             Type definitions + API contract spec
│   ├── ActionQueue.ts              Mutex-protected persistent queue
│   └── QueueProcessor.ts          Flush queue → POST /sync
├── sync/
│   ├── ConflictHandler.ts          3-strategy conflict resolution
│   └── DeltaSyncManager.ts        Pull /delta, merge into cache
├── utils/
│   ├── StorageUtils.ts             AsyncStorage helpers
│   └── Logger.ts                   Debug-gated SDK logger
└── __tests__/
    ├── CacheEngine.test.ts
    ├── ActionQueue.test.ts
    └── ConflictHandler.test.ts
```
