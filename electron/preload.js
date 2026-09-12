const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure Electron Preload Script
 * Exposes ONLY safe desktop helper APIs to the renderer context.
 */

contextBridge.exposeInMainWorld('neuroshield', {
  getAppVersion: () => ipcRenderer.invoke('neuroshield:get-app-version'),
  getPlatform: () => ipcRenderer.invoke('neuroshield:get-platform'),
  getApiBaseUrl: () => ipcRenderer.invoke('neuroshield:get-api-base-url'),
  getStartupState: () => ipcRenderer.invoke('neuroshield:get-startup-state'),
  getOsPointerSpeed: () => ipcRenderer.invoke('neuroshield:get-os-pointer-speed'),
  showNotification: (options) => ipcRenderer.invoke('neuroshield:show-notification', options),
  saveFile: (options) => ipcRenderer.invoke('neuroshield:save-file', options),
  onEmergencyLock: (callback) => {
    ipcRenderer.on('neuroshield:emergency-lock', () => callback());
  },
  getAppStatus: async () => {
    try {
      const baseUrl = await ipcRenderer.invoke('neuroshield:get-api-base-url');
      if (!baseUrl) throw new Error('Local API is not available.');
      const res = await fetch(`${baseUrl}/api/health`, { credentials: 'include' });
      return await res.json();
    } catch (e) {
      return { status: 'offline', error: e.message };
    }
  }
});
