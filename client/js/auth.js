/**
 * Authentication Module for NeuroShield Desktop
 */

class AuthManager {
  constructor() {
    this.currentUser = null;
  }

  getCurrentUser() {
    if (!this.currentUser) {
      const stored = localStorage.getItem('neuroshield_user_info');
      if (stored) {
        try { this.currentUser = JSON.parse(stored); } catch (e) {}
      }
    }
    return this.currentUser;
  }

  async login(email, password) {
    const data = await window.apiClient.post('/api/auth/login', { email, password });
    if (data.user) {
      this.currentUser = data.user;
      localStorage.setItem('neuroshield_user_info', JSON.stringify(data.user));
    }
    const token = data.desktopToken || data.token;
    if (token) {
      localStorage.setItem('neuroshield_token', token);
    }
    return data;
  }

  async logout() {
    try {
      await window.apiClient.post('/api/auth/logout', {});
    } catch (e) {}
    localStorage.removeItem('neuroshield_user_info');
    localStorage.removeItem('neuroshield_token');
    this.currentUser = null;
    window.location.href = 'login.html';
  }

  async verifyAuth() {
    // 1. Check local session
    const localUser = this.getCurrentUser();

    // 2. Validate against /api/auth/me
    try {
      const data = await window.apiClient.get('/api/auth/me');
      if (data && data.user) {
        this.currentUser = data.user;
        localStorage.setItem('neuroshield_user_info', JSON.stringify(data.user));
        return true;
      }
    } catch (err) {
      // If network check temporarily fails but local session exists, allow access
      if (localUser && localUser._id) {
        return true;
      }
      localStorage.removeItem('neuroshield_user_info');
      localStorage.removeItem('neuroshield_token');
      this.currentUser = null;
      return false;
    }

    return Boolean(localUser && localUser._id);
  }

  hasRole(...allowedRoles) {
    const user = this.getCurrentUser();
    return user && allowedRoles.includes(user.role);
  }
}

window.authManager = new AuthManager();
