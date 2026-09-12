/**
 * API Fetch Client for NeuroShield
 */

class ApiClient {
  constructor() {
    this.baseUrl = null;
  }

  async getBaseUrl() {
    if (this.baseUrl) return this.baseUrl;

    if (window.neuroshield && typeof window.neuroshield.getApiBaseUrl === 'function') {
      this.baseUrl = await window.neuroshield.getApiBaseUrl();
    }

    if (!this.baseUrl) {
      // Supports a browser-based development session without exposing an
      // Electron-injected global to the renderer.
      this.baseUrl = 'http://127.0.0.1:5000';
    }

    return this.baseUrl;
  }

  getHeaders(customHeaders = {}) {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('neuroshield_token') : null;
    return {
      'Content-Type': 'application/json',
      'X-NeuroShield-Client': 'desktop',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...customHeaders
    };
  }

  async request(endpoint, options = {}) {
    const baseUrl = await this.getBaseUrl();
    const url = `${baseUrl}${endpoint}`;

    const config = {
      method: options.method || 'GET',
      headers: this.getHeaders(options.headers),
      credentials: 'include',
      ...options
    };

    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const text = await response.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }
        throw parseErr;
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP error ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err.message);
      throw err;
    }
  }

  get(endpoint) { return this.request(endpoint, { method: 'GET' }); }
  post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); }
  put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); }
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
}

window.apiClient = new ApiClient();
