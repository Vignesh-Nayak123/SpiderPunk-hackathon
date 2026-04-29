# 📦 What is `CacheKey.ts`? — Plain English

## The Problem It Solves

When your app goes offline, the SDK saves API responses locally so the user can still read their messages and feed.

Storage is basically a giant key-value dictionary:

```
"some_key"  →  { the actual data }
```

You need a **name (key)** for every saved response. That name has to be:
- **Always the same** for the same request (so you can find it again later)
- **Different** from every other request (so things don't overwrite each other)

`CacheKey.ts` is the factory that makes those names. That's its entire job.

---

## The Three Building Blocks

### 1. `djb2()` — The Fingerprinting Machine

```
"GET:/api/messages:"  →  "2kx9f3z"
```

This is a **hash function** — it takes any string and squashes it into a short, fixed-length code. Think of it like a fingerprint: every unique input gets a unique fingerprint, and the same input always gives the same fingerprint.

**Why?**  
Raw URLs are long and ugly as storage keys:
```
❌  ol_cache_GET:https://api.example.com/messages?since=1714392000000:
✅  ol_cache_2kx9f3z
```

**The math (you don't need to memorise this):**  
It starts at `5381` and for every character in the string, it does:
```
hash = (hash × 33) XOR charCode
```
This is the classic **djb2** algorithm — invented in the 1990s, still used everywhere because it's fast and has almost zero collisions.

---

### 2. `normalize()` — The Equalizer

Before generating a key, the URL gets cleaned up. The problem: the same URL can be written in slightly different ways:

| These URLs are identical | But look different |
|---|---|
| `/api/feed` | `/api/feed/` (trailing slash) |
| `?a=1&b=2` | `?b=2&a=1` (different param order) |

Without normalization, these produce **different cache keys** even though they return the exact same data — so you'd cache the same thing twice and often get a miss.

`normalize()` fixes this by:
1. **Sorting query parameters** alphabetically (`?b=2&a=1` → `?a=1&b=2`)
2. **Stripping trailing slashes** (`/feed/` → `/feed`)

It uses the browser's built-in `URL` class to do this safely. If the URL is relative (like `/api/messages` with no domain), it falls back to just stripping slashes.

---

### 3. `CacheKey.generate()` — The Key Builder

This is the main function everything else calls:

```
method  =  "GET"
url     =  "https://api.example.com/feed?b=2&a=1"
body    =  (none)

   ↓  normalize url  →  "https://api.example.com/feed?a=1&b=2"
   ↓  join string   →  "GET:https://api.example.com/feed?a=1&b=2:"
   ↓  djb2 hash     →  "2kx9f3z"
   ↓  prepend prefix

result  =  "ol_cache_2kx9f3z"
```

The **body is included** for POST requests used as reads (e.g. GraphQL). Two queries to the same endpoint asking for different data have different bodies → different keys → separate cache entries. ✅

---

### 4. `CacheKey.isSDKKey()` — The Bouncer

Every key the SDK creates starts with `ol_cache_`. This prefix is a **namespace** — it separates the SDK's storage from anything else the app stores (user settings, auth tokens, etc.).

`isSDKKey()` just checks for that prefix. Used when the SDK needs to wipe its own cache without accidentally deleting the app's unrelated data.

---

## Full Flow — Real Example

```
User opens the app
     ↓
App fetches: GET https://api.myapp.com/messages?since=0
     ↓
NetworkInterceptor intercepts fetch()
     ↓
CacheKey.generate("GET", "https://api.myapp.com/messages?since=0")
     → normalize → sort params, strip slash
     → djb2("GET:https://api.myapp.com/messages?since=0:") → "3zqm8p1"
     → prefix

key = "ol_cache_3zqm8p1"
     ↓
Store in AsyncStorage: "ol_cache_3zqm8p1" → { messages: [...] }

User goes offline
     ↓
Same fetch() fires → intercepted → cache hit on "ol_cache_3zqm8p1"
     ↓
User sees messages instantly, even with no internet ✅
```

---

## Test Results

All **14 tests** for `CacheKey.ts` pass ✅  
Overall suite: **33/33 tests passing** across all 4 test files.

| What was tested | Result |
|---|---|
| Same input always gives same key | ✅ |
| Different URLs give different keys | ✅ |
| Trailing slash doesn't change the key | ✅ |
| Param order doesn't change the key | ✅ |
| Different param *values* → different keys | ✅ |
| Relative URLs work without crashing | ✅ |
| Request body is included in the key | ✅ |
| Same body content (different JS object) = same key | ✅ |
| `isSDKKey()` correctly identifies SDK keys | ✅ |
| `isSDKKey()` rejects unrelated keys | ✅ |
