/**
 * Offline Layer — Backend API Server
 * 
 * Endpoints:
 *   POST /behavior  — Receive behavior logs from client
 *   GET  /predict   — Return predicted content based on behavior patterns
 *   POST /sync      — Process queued offline actions (delta sync)
 *   GET  /api/messages — Return chat messages
 *   GET  /api/feed    — Return news feed items
 *   GET  /api/content/:id — Return specific content item
 *   GET  /api/status  — Server health check
 * 
 * Runs on port 3001 (separate from frontend on port 3000)
 */

const express = require('express');
const cors = require('cors');
const AIEngine = require('./ai-engine');
const SeedData = require('../demo/seed-data');

const app = express();
const PORT = 3001;
const aiEngine = new AIEngine();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ── Seed the AI engine with demo behavior data ─────────────────
aiEngine.ingestLogs(SeedData.behaviorLogs);
console.log('[Server] Seeded AI engine with demo behavior data');

// In-memory stores
let messages = [...SeedData.messages];
let feedItems = [...SeedData.feedItems];
let syncQueue = [];

// ── POST /behavior — Receive behavior logs ─────────────────────
app.post('/behavior', (req, res) => {
  const { logs } = req.body;
  
  if (!logs || !Array.isArray(logs)) {
    return res.status(400).json({ error: 'Expected { logs: [...] }' });
  }

  aiEngine.ingestLogs(logs);
  
  res.json({
    success: true,
    message: `Ingested ${logs.length} behavior logs`,
    totalPatterns: Object.keys(aiEngine.patterns).length
  });
});

// ── GET /predict — Get predicted content ───────────────────────
app.get('/predict', (req, res) => {
  const currentHour = parseInt(req.query.hour) || new Date().getHours();
  const currentDay = parseInt(req.query.day) || new Date().getDay();

  const predictions = aiEngine.predict(currentHour, currentDay);
  const contentToPrefetch = aiEngine.getContentToPrefetch(predictions);

  res.json({
    success: true,
    timestamp: Date.now(),
    predictions,
    contentToPrefetch,
    summary: {
      totalPredictions: predictions.length,
      totalContent: contentToPrefetch.length,
      avgConfidence: predictions.length > 0 
        ? Math.round(predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length * 100) / 100
        : 0
    }
  });
});

// ── GET /predict/summary — Get AI engine summary ───────────────
app.get('/predict/summary', (req, res) => {
  res.json({
    success: true,
    summary: aiEngine.getSummary()
  });
});

// ── POST /sync — Process offline action queue ──────────────────
app.post('/sync', (req, res) => {
  const { actions, lastSyncTimestamp } = req.body;
  
  if (!actions || !Array.isArray(actions)) {
    return res.status(400).json({ error: 'Expected { actions: [...] }' });
  }

  const results = [];
  
  actions.forEach(action => {
    switch (action.type) {
      case 'send_message':
        const newMsg = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          sender: 'You',
          avatar: '🧑‍💻',
          text: action.payload.text,
          timestamp: action.payload.timestamp || Date.now(),
          status: 'delivered',
          isMe: true,
          syncedAt: Date.now()
        };
        messages.push(newMsg);
        results.push({ 
          actionId: action.id, 
          status: 'synced', 
          result: newMsg 
        });
        break;
        
      case 'read_receipt':
        results.push({ 
          actionId: action.id, 
          status: 'synced', 
          result: { acknowledged: true } 
        });
        break;
        
      default:
        results.push({ 
          actionId: action.id, 
          status: 'unknown_action', 
          result: null 
        });
    }
  });

  // Delta: return only items changed since lastSyncTimestamp
  const deltaMessages = lastSyncTimestamp 
    ? messages.filter(m => (m.syncedAt || m.timestamp) > lastSyncTimestamp)
    : [];

  res.json({
    success: true,
    synced: results.length,
    results,
    delta: {
      messages: deltaMessages,
      feedItems: [] // Feed doesn't change in demo
    },
    serverTimestamp: Date.now()
  });
});

// ── GET /api/messages — Return chat messages ───────────────────
app.get('/api/messages', (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const filtered = since ? messages.filter(m => m.timestamp > since) : messages;
  
  res.json({
    success: true,
    messages: filtered,
    total: filtered.length,
    serverTimestamp: Date.now()
  });
});

// ── GET /api/feed — Return news feed ───────────────────────────
app.get('/api/feed', (req, res) => {
  const since = parseInt(req.query.since) || 0;
  const filtered = since ? feedItems.filter(f => f.timestamp > since) : feedItems;
  
  res.json({
    success: true,
    items: filtered,
    total: filtered.length,
    serverTimestamp: Date.now()
  });
});

// ── GET /api/content/:id — Return specific content ─────────────
app.get('/api/content/:id', (req, res) => {
  const { id } = req.params;
  
  // Check feed items
  const feedItem = feedItems.find(f => f.id === id);
  if (feedItem) {
    return res.json({ success: true, content: feedItem, type: 'feed' });
  }
  
  // Check messages
  const message = messages.find(m => m.id === id);
  if (message) {
    return res.json({ success: true, content: message, type: 'message' });
  }
  
  res.status(404).json({ success: false, error: 'Content not found' });
});

// ── GET /api/status — Health check ─────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    uptime: process.uptime(),
    timestamp: Date.now(),
    aiEngine: {
      patterns: Object.keys(aiEngine.patterns).length,
      logs: aiEngine.rawLogs.length
    }
  });
});

// ── POST /api/reset — Reset demo state ─────────────────────────
app.post('/api/reset', (req, res) => {
  messages = [...SeedData.messages];
  feedItems = [...SeedData.feedItems];
  syncQueue = [];
  aiEngine.reset();
  aiEngine.ingestLogs(SeedData.behaviorLogs);
  
  res.json({
    success: true,
    message: 'Demo state reset to defaults'
  });
});

// ── Start Server ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║          🔌 Offline Layer — API Server          ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Server:    http://localhost:${PORT}               ║`);
  console.log('║  Frontend:  http://localhost:3000               ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                     ║');
  console.log('║    POST /behavior   — Log user behavior         ║');
  console.log('║    GET  /predict    — Get AI predictions        ║');
  console.log('║    POST /sync       — Sync offline actions      ║');
  console.log('║    GET  /api/messages — Chat messages           ║');
  console.log('║    GET  /api/feed     — News feed               ║');
  console.log('║    GET  /api/status   — Health check            ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
});
