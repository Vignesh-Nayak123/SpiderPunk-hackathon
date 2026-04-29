/**
 * DemoControlScreen — Offline toggle, sync, prediction log, storage
 */
class DemoControlScreen {
  constructor(sdk, predictor) {
    this.sdk = sdk;
    this.predictor = predictor;
    this._bind();
  }

  _bind() {
    // Offline Toggle
    const toggle = document.getElementById('offline-toggle');
    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        this.sdk.network.forceOffline();
        document.getElementById('toggle-label').textContent = 'Offline';
        document.getElementById('toggle-label').classList.add('offline');
        document.getElementById('toggle-status').textContent = 'No Signal';
        App.showToast('📡 Network disconnected', 'warning');
      } else {
        this.sdk.network.forceOnline();
        document.getElementById('toggle-label').textContent = 'Online';
        document.getElementById('toggle-label').classList.remove('offline');
        document.getElementById('toggle-status').textContent = 'WiFi';
        App.showToast('🌐 Back online!', 'success');

        // Auto-sync after coming online
        setTimeout(() => this._triggerSync(), 500);
      }
    });

    // Sync Button
    document.getElementById('sync-btn').addEventListener('click', () => this._triggerSync());

    // Predict Button
    document.getElementById('predict-btn').addEventListener('click', () => this._triggerPredict());

    // Reset Button
    document.getElementById('reset-btn').addEventListener('click', () => this._reset());

    // Update pending count when actions are queued
    if (this.sdk.queue) {
      this.sdk.queue.on('enqueued', () => this._updatePendingCount());
      this.sdk.queue.on('flush-complete', () => this._updatePendingCount());
    }
  }

  render() {
    this._renderPredictionLog();
    this._updatePendingCount();
    this._updateStorage();

    if (this.predictor) this.predictor.log('demo_controls');
  }

  _renderPredictionLog() {
    const logEl = document.getElementById('prediction-log');
    logEl.innerHTML = '';

    const logs = this.predictor ? this.predictor.getPrefetchLog() : SeedData.prefetchLogs;
    const hitRate = this.predictor ? this.predictor.getHitRate() : 100;

    document.getElementById('hit-rate-value').textContent = hitRate + '%';

    logs.forEach(entry => {
      const el = document.createElement('div');
      el.className = 'prediction-entry';
      el.innerHTML = `
        <span class="prediction-icon">${entry.used ? '✅' : '📥'}</span>
        <div class="prediction-info">
          <div class="prediction-title">${entry.title}</div>
          <div class="prediction-reason">${entry.reason}</div>
        </div>
        <div class="prediction-time">${TimeUtils.formatTime(entry.prefetchedAt)}</div>
      `;
      logEl.appendChild(el);
    });
  }

  async _triggerSync() {
    if (!this.sdk.network.isOnline()) {
      App.showToast('Cannot sync — you\'re offline!', 'error');
      return;
    }

    const btn = document.getElementById('sync-btn');
    btn.innerHTML = '<span class="btn-icon spin">🔄</span> Syncing...';
    btn.disabled = true;

    try {
      const result = await this.sdk.sync();
      App.showToast(`✅ Synced ${result.actionsSynced} actions`, 'success');
    } catch (e) {
      App.showToast('Sync failed: ' + e.message, 'error');
    }

    btn.innerHTML = '<span class="btn-icon">🔄</span> Force Sync';
    btn.disabled = false;
    this._updatePendingCount();
  }

  async _triggerPredict() {
    if (!this.sdk.network.isOnline()) {
      App.showToast('Need internet for AI predictions', 'warning');
      return;
    }

    const btn = document.getElementById('predict-btn');
    btn.innerHTML = '<span class="btn-icon spin">🔮</span> Predicting...';
    btn.disabled = true;

    try {
      const result = await this.predictor.predict();
      App.showToast(`🧠 Predicted ${result.predictions.length} items (${result.summary.avgConfidence * 100}% avg confidence)`, 'info');
      this._renderPredictionLog();
    } catch (e) {
      App.showToast('Prediction failed: ' + e.message, 'error');
    }

    btn.innerHTML = '<span class="btn-icon">🔮</span> Run Prediction';
    btn.disabled = false;
  }

  async _updatePendingCount() {
    try {
      const count = await this.sdk.queue.getCount();
      document.getElementById('sync-count').textContent = count;
      
      const badge = document.getElementById('chat-badge');
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }

  async _updateStorage() {
    try {
      const stats = await this.sdk.cache.getStats();
      const usedMB = (stats.totalSize / (1024 * 1024)).toFixed(1);
      const pct = stats.usagePercent;

      document.getElementById('storage-used').textContent = usedMB + ' MB';
      document.getElementById('storage-percent').textContent = pct + '%';
      document.getElementById('storage-fill').style.width = Math.max(pct, 2) + '%';
      document.getElementById('storage-mini-fill').style.width = Math.max(pct, 2) + '%';
      document.getElementById('storage-mini-text').textContent = usedMB + ' MB';
    } catch (e) { /* ignore */ }
  }

  async _reset() {
    if (this.sdk) await this.sdk.reset();
    if (this.predictor) await this.predictor.reset();

    // Reset server
    try {
      await fetch(this.sdk.config.serverUrl + '/api/reset', { method: 'POST' });
    } catch (e) { /* ignore */ }

    App.showToast('♻️ Demo reset complete', 'info');
    this.render();
  }
}
