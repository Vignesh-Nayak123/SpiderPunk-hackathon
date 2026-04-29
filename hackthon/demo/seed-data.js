/**
 * Seed Data for Offline Layer Demo
 * Pre-populated realistic data to ensure the demo works flawlessly every time.
 */

const SeedData = {
  // ── Chat Messages ──────────────────────────────────────────────
  messages: [
    {
      id: 'msg-001',
      sender: 'Priya Sharma',
      avatar: '👩‍💻',
      text: 'Hey! Did you push the latest commit?',
      timestamp: Date.now() - 3600000 * 3,
      status: 'read',
      isMe: false
    },
    {
      id: 'msg-002',
      sender: 'You',
      avatar: '🧑‍💻',
      text: 'Yes! Just pushed to main. The offline sync is working perfectly now 🎉',
      timestamp: Date.now() - 3600000 * 2.5,
      status: 'read',
      isMe: true
    },
    {
      id: 'msg-003',
      sender: 'Priya Sharma',
      avatar: '👩‍💻',
      text: 'Amazing! Can you test it on the metro tomorrow? That Rajiv Chowk dead zone is perfect for testing 😂',
      timestamp: Date.now() - 3600000 * 2,
      status: 'read',
      isMe: false
    },
    {
      id: 'msg-004',
      sender: 'You',
      avatar: '🧑‍💻',
      text: 'Haha sure! I\'ll toggle airplane mode and send you messages from underground 📱',
      timestamp: Date.now() - 3600000 * 1.5,
      status: 'delivered',
      isMe: true
    },
    {
      id: 'msg-005',
      sender: 'Rahul Dev',
      avatar: '👨‍🔬',
      text: 'Team — the prediction model is showing 87% accuracy on my test data. It correctly predicted I\'d open the news app at 8am!',
      timestamp: Date.now() - 3600000,
      status: 'read',
      isMe: false
    },
    {
      id: 'msg-006',
      sender: 'You',
      avatar: '🧑‍💻',
      text: 'That\'s insane! We should pre-fetch the top 5 articles before 8am then. The cache engine can handle it.',
      timestamp: Date.now() - 1800000,
      status: 'delivered',
      isMe: true
    },
    {
      id: 'msg-007',
      sender: 'Ananya Gupta',
      avatar: '👩‍🎨',
      text: 'UI is looking 🔥! Added glassmorphism to the network banner. Check the latest build.',
      timestamp: Date.now() - 900000,
      status: 'read',
      isMe: false
    }
  ],

  // ── News Feed Items ────────────────────────────────────────────
  feedItems: [
    {
      id: 'feed-001',
      title: 'India\'s 5G Rollout Reaches 500 Cities — But 2G Dead Zones Persist',
      description: 'Despite massive 5G infrastructure investment, an estimated 300 million users in rural and semi-urban India still rely on 2G/3G networks. Offline-first solutions are more critical than ever.',
      source: 'TechCrunch India',
      category: 'Technology',
      imageUrl: null,
      timestamp: Date.now() - 7200000,
      prefetched: true,
      prefetchedAt: Date.now() - 7200000 - 300000
    },
    {
      id: 'feed-002',
      title: 'How Jio and Airtel Are Tackling Network Dead Zones in Delhi Metro',
      description: 'Telecom giants deploy micro-towers at metro stations, but underground tunnels remain connectivity black holes. Third-party SDKs bridging the gap.',
      source: 'Economic Times',
      category: 'Telecom',
      imageUrl: null,
      timestamp: Date.now() - 5400000,
      prefetched: true,
      prefetchedAt: Date.now() - 5400000 - 300000
    },
    {
      id: 'feed-003',
      title: 'WhatsApp Tests Offline Messaging for Indian Market',
      description: 'Meta confirms pilot program allowing WhatsApp messages to queue and send when connectivity resumes, targeting Indian railway corridors.',
      source: 'Reuters',
      category: 'Apps',
      imageUrl: null,
      timestamp: Date.now() - 3600000,
      prefetched: true,
      prefetchedAt: Date.now() - 3600000 - 300000
    },
    {
      id: 'feed-004',
      title: 'Building Offline-First Apps: A Technical Deep Dive',
      description: 'IndexedDB, Service Workers, and smart caching strategies — everything you need to know about making web apps work without internet.',
      source: 'Dev.to',
      category: 'Engineering',
      imageUrl: null,
      timestamp: Date.now() - 1800000,
      prefetched: false,
      prefetchedAt: null
    },
    {
      id: 'feed-005',
      title: 'UPI Payments Now Work Offline — Here\'s How',
      description: 'NPCI launches UPI Lite X with offline transaction support. Users can make payments up to ₹500 without internet. Revolutionary for rural commerce.',
      source: 'Mint',
      category: 'Fintech',
      imageUrl: null,
      timestamp: Date.now() - 900000,
      prefetched: false,
      prefetchedAt: null
    },
    {
      id: 'feed-006',
      title: 'Indian Railways WiFi: 6,000 Stations Connected but Speed Remains an Issue',
      description: 'Google-backed RailTel WiFi covers thousands of stations, but train-in-motion connectivity remains the biggest challenge for commuters.',
      source: 'NDTV',
      category: 'Infrastructure',
      imageUrl: null,
      timestamp: Date.now() - 300000,
      prefetched: false,
      prefetchedAt: null
    }
  ],

  // ── Behavior Logs (simulated past behavior) ───────────────────
  behaviorLogs: [
    { screen: 'news_feed', hour: 8, dayOfWeek: 1, timestamp: Date.now() - 86400000 * 7 },
    { screen: 'news_feed', hour: 8, dayOfWeek: 2, timestamp: Date.now() - 86400000 * 6 },
    { screen: 'chat', hour: 9, dayOfWeek: 1, timestamp: Date.now() - 86400000 * 7 },
    { screen: 'chat', hour: 9, dayOfWeek: 2, timestamp: Date.now() - 86400000 * 6 },
    { screen: 'news_feed', hour: 8, dayOfWeek: 3, timestamp: Date.now() - 86400000 * 5 },
    { screen: 'chat', hour: 9, dayOfWeek: 3, timestamp: Date.now() - 86400000 * 5 },
    { screen: 'news_feed', hour: 8, dayOfWeek: 4, timestamp: Date.now() - 86400000 * 4 },
    { screen: 'chat', hour: 9, dayOfWeek: 4, timestamp: Date.now() - 86400000 * 4 },
    { screen: 'news_feed', hour: 8, dayOfWeek: 5, timestamp: Date.now() - 86400000 * 3 },
    { screen: 'chat', hour: 12, dayOfWeek: 5, timestamp: Date.now() - 86400000 * 3 },
    { screen: 'news_feed', hour: 10, dayOfWeek: 6, timestamp: Date.now() - 86400000 * 2 },
    { screen: 'chat', hour: 14, dayOfWeek: 0, timestamp: Date.now() - 86400000 },
    { screen: 'news_feed', hour: 8, dayOfWeek: 1, timestamp: Date.now() - 3600000 }
  ],

  // ── Prefetch Logs (simulated predictions) ─────────────────────
  prefetchLogs: [
    {
      contentId: 'feed-001',
      title: 'India\'s 5G Rollout Reaches 500 Cities',
      prefetchedAt: Date.now() - 7200000 - 300000,
      reason: 'User opens news_feed at 8am on weekdays (87% confidence)',
      used: true,
      usedAt: Date.now() - 7200000
    },
    {
      contentId: 'feed-002',
      title: 'How Jio and Airtel Are Tackling Network Dead Zones',
      prefetchedAt: Date.now() - 5400000 - 300000,
      reason: 'Related to previously read telecom articles',
      used: true,
      usedAt: Date.now() - 5400000
    },
    {
      contentId: 'feed-003',
      title: 'WhatsApp Tests Offline Messaging',
      prefetchedAt: Date.now() - 3600000 - 300000,
      reason: 'Trending in user\'s interest category',
      used: true,
      usedAt: Date.now() - 3600000
    }
  ],

  // ── Content for prefetch ───────────────────────────────────────
  prefetchableContent: [
    { id: 'content-news-morning', type: 'news_feed', priority: 0.95 },
    { id: 'content-chat-history', type: 'chat', priority: 0.88 },
    { id: 'content-feed-tech', type: 'news_feed', priority: 0.72 },
    { id: 'content-feed-local', type: 'news_feed', priority: 0.65 },
    { id: 'content-chat-media', type: 'chat', priority: 0.45 }
  ]
};

// Export for both Node.js and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SeedData;
}
