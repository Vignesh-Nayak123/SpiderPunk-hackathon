/**
 * Predictor — Main entry point for the AI prediction module
 */
class Predictor {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3001';
    this.sdk = config.sdk;
    this.tracker = new BehaviorTracker();
    this.session = new SessionManager();
    this.prefetchLogger = new PrefetchLogger();
    this.uploader = null;
    this.prefetchManager = null;
    this.scheduler = null;
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;
    await this.tracker.init();

    this.prefetchManager = new PrefetchManager({
      serverUrl: this.serverUrl,
      cacheEngine: this.sdk ? this.sdk.cache : null,
      logger: this.prefetchLogger
    });

    this.uploader = new BehaviorUploader({
      serverUrl: this.serverUrl,
      tracker: this.tracker,
      networkMonitor: this.sdk ? this.sdk.network : null
    });

    this.scheduler = new PrefetchScheduler({
      prefetchManager: this.prefetchManager,
      networkMonitor: this.sdk ? this.sdk.network : null
    });

    this.session.startSession();
    this.uploader.start();
    this.scheduler.start();

    // Seed prefetch logs with demo data
    this.prefetchLogger.seedFromData(SeedData.prefetchLogs);

    this._initialized = true;
    console.log('[Predictor] ✅ AI Prediction module initialized');
  }

  async log(screenName) {
    this.session.logScreen(screenName);
    await this.tracker.log(screenName, {
      sessionId: this.session.getCurrentSession()?.id
    });
  }

  async predict() {
    return await this.prefetchManager.predict();
  }

  getPrefetchLog() { return this.prefetchLogger.getLog(); }
  getHitRate() { return this.prefetchLogger.getHitRate(); }
  getSession() { return this.session.getCurrentSession(); }

  async reset() {
    await this.tracker.clear();
    this.prefetchLogger.clear();
    this.prefetchLogger.seedFromData(SeedData.prefetchLogs);
  }
}
