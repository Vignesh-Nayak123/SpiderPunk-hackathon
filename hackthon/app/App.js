/**
 * App — Main application controller
 * Initializes SDK, Predictor, and all screens.
 */
class App {
  static sdk = null;
  static predictor = null;
  static screens = {};
  static activeTab = 'chat';

  static async init() {
    console.log('🚀 Initializing Offline Layer Demo...');

    // ── Initialize SDK (2 lines of code!) ──────────────────────
    App.sdk = new OfflineLayer({ serverUrl: 'http://localhost:3001' });
    await App.sdk.init();

    // ── Initialize AI Predictor ─────────────────────────────────
    App.predictor = new Predictor({ 
      serverUrl: 'http://localhost:3001',
      sdk: App.sdk 
    });
    await App.predictor.init();

    // ── Initialize UI Components ────────────────────────────────
    const banner = new NetworkBannerComponent(App.sdk.network);

    App.screens.chat = new ChatScreen(App.sdk, App.predictor);
    App.screens.feed = new FeedScreen(App.sdk, App.predictor);
    App.screens.demo = new DemoControlScreen(App.sdk, App.predictor);

    // ── Tab Navigation ──────────────────────────────────────────
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        App.switchTab(tab);
      });
    });

    // ── Initial Render ──────────────────────────────────────────
    App.screens.chat.render();
    App.screens.feed.render();
    App.screens.demo.render();

    // ── Cache initial data ──────────────────────────────────────
    try {
      await App.sdk.cache.put('messages_data', SeedData.messages, 'messages');
      await App.sdk.cache.put('feed_data', SeedData.feedItems, 'feed');
    } catch (e) { console.log('Cache seed skipped:', e); }

    console.log('✅ Offline Layer Demo ready!');
    App.showToast('⚡ Offline Layer SDK initialized', 'success');
  }

  static switchTab(tab) {
    App.activeTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(`screen-${tab}`).classList.add('active');

    // Re-render active screen
    if (App.screens[tab]) App.screens[tab].render();
  }

  static showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }
}

// ── Boot ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
