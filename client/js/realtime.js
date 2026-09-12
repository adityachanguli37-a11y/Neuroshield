/**
 * Socket.IO Realtime Client for NeuroShield
 */

class RealtimeClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  async init() {
    const baseUrl = await window.apiClient.getBaseUrl();
    if (typeof io === 'undefined') {
      await this.loadSocketIo(baseUrl);
    }

    this.socket = io(baseUrl, {
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[RealtimeClient] Socket.IO connected to backend:', this.socket.id);
      this.updateStatusBadge(true);
    });

    this.socket.on('disconnect', () => {
      console.warn('[RealtimeClient] Socket.IO disconnected.');
      this.updateStatusBadge(false);
    });

    // Subscriptions
    this.socket.on('security:event', (data) => this.emit('security:event', data));
    this.socket.on('alert:new', (data) => this.emit('alert:new', data));
    this.socket.on('alert:update', (data) => this.emit('alert:update', data));
    this.socket.on('trust:update', (data) => this.emit('trust:update', data));
    this.socket.on('risk:update', (data) => this.emit('risk:update', data));
    this.socket.on('threat:update', (data) => this.emit('threat:update', data));
    this.socket.on('simulation:complete', (data) => this.emit('simulation:complete', data));
  }

  loadSocketIo(baseUrl) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-neuroshield-socket]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('Socket.IO client failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `${baseUrl}/socket.io/socket.io.js`;
      script.dataset.neuroshieldSocket = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Socket.IO client failed to load.'));
      document.head.appendChild(script);
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data));
    }
  }

  updateStatusBadge(isOnline) {
    const badge = document.getElementById('realtime-status-badge');
    if (badge) {
      if (isOnline) {
        badge.className = 'badge badge-online';
        badge.innerHTML = '<span class="badge-status-dot"></span> Realtime: Connected';
      } else {
        badge.className = 'badge badge-offline';
        badge.innerHTML = '<span class="badge-status-dot"></span> Realtime: Disconnected';
      }
    }
  }
}

window.realtimeClient = new RealtimeClient();
