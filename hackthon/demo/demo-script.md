# 🎬 Offline Layer — 60 Second Demo Script

> **Memorize this. Practice 5 times. Own it.**

---

## Setup Before Demo
1. Run `npm run dev` (both servers running)
2. Open http://localhost:3000 in Chrome
3. Open http://localhost:3002 in another tab (slides)
4. Clear browser cache if needed: Controls → Reset Everything
5. Make sure you're on the **Chat tab** to start

---

## The Script (60 seconds)

### 🟢 Beat 1: Online (0-8s)
> *"Here's a chat app running normally on WiFi."*

- Show the green "Connected via WiFi" banner at the top
- Scroll through the chat messages — they load instantly
- Quick tap on Feed tab — show news cards loading

### 🔴 Beat 2: Go Offline (8-15s)
> *"Now watch what happens when I go offline."*

- Tap **Controls** tab
- **Flip the offline toggle** ← dramatic pause as you flip it
- Point at the banner: "See? Red. You're Offline."

### 📱 Beat 3: Cached Content (15-25s)
> *"But I can still read everything."*

- Tap **Chat** tab — scroll through messages
- Tap **Feed** tab — all articles still there
- *"Everything is cached locally by our SDK."*

### ⏱ Beat 4: Send While Offline (25-35s)
> *"I'll send a message right now — while completely offline."*

- Tap **Chat** tab
- Type: **"Hello from the dead zone! 🚇"**
- Hit send
- Point at the clock icon ⏱: *"See that clock? It's queued. Waiting."*
- Point at the "Queued offline" badge

### ✅ Beat 5: Back Online + Sync (35-45s)
> *"Now let's come back online."*

- Tap **Controls** tab
- **Flip toggle back to Online**
- Watch banner: Yellow "Syncing..." → Green "Connected"
- Toast appears: "1 message(s) delivered! ✓"
- Tap **Chat** — clock icon has flipped to ✓

### 🧠 Beat 6: AI Prediction (45-55s)
> *"And here's the magic — our AI already knew what you'd need."*

- Tap **Controls** tab
- Point at **AI Prediction Log**:
  - *"The SDK analyzed this user's habits..."*
  - *"It saw they open news every morning at 8am..."*
  - *"So it pre-fetched these 3 articles at 8:55am — BEFORE they even opened the app."*
- Point at **100% hit rate** badge

### ⚡ Beat 7: The Close (55-60s)
> *"This is Offline Layer."*
> *"Two lines of code."*
> *"Any app."*
> *"Offline-first."*

- Optional: Show the 2-line code on slides

---

## 🚨 Backup Plans

### If server crashes:
- The demo still works — cached content is in IndexedDB
- Skip the sync step, focus on cache + AI log

### If browser freezes:
- Refresh and go to Controls → the AI Prediction Log persists from seed data
- Jump straight to Beat 6

### If toggle doesn't respond:
- Use Chrome DevTools → Network tab → check "Offline" as backup

---

## 🎤 Panelist Q&A Prep

**Q: How is this different from service workers?**
> "Service workers handle static assets. We handle dynamic data — messages, feeds, user actions. Plus we add AI prediction, which service workers don't do."

**Q: What about data conflicts?**
> "Our delta sync engine tracks timestamps per resource. On conflict, server timestamp wins — last-write-wins with conflict detection."

**Q: How does the AI prediction actually work?**
> "Frequency-based pattern matching. We log screen opens by hour and day of week. After 5+ observations, the pattern confidence exceeds 80%. On WiFi connect, we call our prediction API which returns ranked content to prefetch."

**Q: Why not just use PouchDB or similar?**
> "PouchDB solves storage. We solve the full offline experience — caching, queuing, syncing, AND predicting. It's an SDK, not just a database."

**Q: What's the storage limit?**
> "50MB hard cap with LRU eviction. The least recently used content gets evicted first. We track access frequency and recency."
