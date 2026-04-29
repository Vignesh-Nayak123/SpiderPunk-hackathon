/**
 * NetworkBanner — Reactive network status indicator
 */
class NetworkBannerComponent {
  constructor(networkMonitor) {
    this.network = networkMonitor;
    this.el = document.getElementById('network-banner');
    this.textEl = this.el.querySelector('.banner-text');
    this.latencyEl = this.el.querySelector('.banner-latency');
    this._bind();
  }

  _bind() {
    this.network.on('online', () => this.update('online'));
    this.network.on('offline', () => this.update('offline'));
    this.network.on('syncing', () => this.update('syncing'));
    this.network.on('synced', () => this.update('online'));
  }

  update(state) {
    this.el.className = 'network-banner ' + state;
    switch (state) {
      case 'online':
        this.textEl.textContent = 'Connected via WiFi';
        this.latencyEl.textContent = '12ms';
        this.latencyEl.style.display = '';
        break;
      case 'offline':
        this.textEl.textContent = "You're Offline";
        this.latencyEl.style.display = 'none';
        break;
      case 'syncing':
        this.textEl.textContent = 'Syncing...';
        this.latencyEl.style.display = 'none';
        break;
    }
  }
}
