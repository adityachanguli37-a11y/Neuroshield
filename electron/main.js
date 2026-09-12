const { app, BrowserWindow, Menu, ipcMain, Notification, globalShortcut, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { startServer, stopServer } = require('../server/server');
const { initLifecycleHooks } = require('./app-lifecycle');

let mainWindow = null;
let serverInfo = null;
let startupError = null;

// Real-time OS-wide mouse pointer speed tracking
let lastPointerPos = null;
let lastPointerTime = null;
let currentOsPointerSpeed = 0; // px/s
let pointerSpeedHistory = [];

function startOsPointerTracking() {
  setInterval(() => {
    try {
      if (!screen) return;
      const pt = screen.getCursorScreenPoint();
      const now = Date.now();
      if (lastPointerPos && lastPointerTime) {
        const dt = (now - lastPointerTime) / 1000;
        if (dt >= 0.04) {
          const dx = pt.x - lastPointerPos.x;
          const dy = pt.y - lastPointerPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // If cursor moved less than 2px (resting or jitter) or dt too large, speed is 0
          if (dist < 2 || dt > 0.6) {
            currentOsPointerSpeed = 0;
          } else {
            currentOsPointerSpeed = Math.round(dist / dt);
          }
          pointerSpeedHistory.push(currentOsPointerSpeed);
          if (pointerSpeedHistory.length > 20) pointerSpeedHistory.shift();
        }
      } else {
        currentOsPointerSpeed = 0;
      }
      lastPointerPos = pt;
      lastPointerTime = now;
    } catch (e) {}
  }, 100);
}

ipcMain.handle('neuroshield:get-api-base-url', () => serverInfo ? serverInfo.url : null);
ipcMain.handle('neuroshield:get-app-version', () => app.getVersion());
ipcMain.handle('neuroshield:get-platform', () => process.platform);
ipcMain.handle('neuroshield:get-startup-state', () => ({
  apiBaseUrl: serverInfo ? serverInfo.url : null,
  error: startupError
}));
ipcMain.handle('neuroshield:get-os-pointer-speed', () => {
  const avg = pointerSpeedHistory.length
    ? Math.round(pointerSpeedHistory.reduce((a, b) => a + b, 0) / pointerSpeedHistory.length)
    : 0;
  return {
    instantSpeed: currentOsPointerSpeed,
    avgSpeed: currentOsPointerSpeed === 0 ? 0 : avg,
    cursor: lastPointerPos || { x: 0, y: 0 }
  };
});
ipcMain.handle('neuroshield:show-notification', (event, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      const iconPath = path.join(__dirname, '../assets/icons/icon.ico');
      new Notification({ title: title || 'NeuroShield Alert', body: body || '', icon: iconPath }).show();
      return true;
    }
  } catch (e) {}
  return false;
});
ipcMain.handle('neuroshield:save-file', async (event, { defaultFilename, content, filters }) => {
  try {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save Security Audit Export',
      defaultPath: path.join(app.getPath('downloads'), defaultFilename),
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    fs.writeFileSync(filePath, content, 'utf8');
    return { success: true, filePath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

async function checkBackendHealth(apiUrl) {
  return new Promise((resolve) => {
    http.get(`${apiUrl}/api/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0d14',
    title: 'NeuroShield - Continuous Adaptive Defense System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Load client startup entry point
  mainWindow.loadFile(path.join(__dirname, '../client/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  const allowed = initLifecycleHooks();
  if (!allowed) return;

  try {
    // 1. Start Express server on available port & initialize MongoDB Atlas connection
    serverInfo = await startServer(5000);
    console.log(`[Main] Express server initialized at ${serverInfo.url}`);

    // 2. Poll & verify backend readiness
    let healthy = false;
    for (let attempts = 0; attempts < 10; attempts++) {
      const health = await checkBackendHealth(serverInfo.url);
      if (health) {
        healthy = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    if (!healthy) {
      console.warn('[Main] Backend health check timed out, launching UI in degraded state...');
    }

    // 3. Setup Minimal App Menu
    Menu.setApplicationMenu(null);

    // 4. Create BrowserWindow
    await createMainWindow();

    // 5. Start real-time OS pointer velocity tracking
    startOsPointerTracking();

    // 6. Register Emergency Lockdown Shortcut (Ctrl+Shift+L)
    try {
      globalShortcut.register('CommandOrControl+Shift+L', () => {
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('neuroshield:emergency-lock');
        }
      });
    } catch (scErr) {
      console.warn('[Main] Could not register emergency hotkey:', scErr.message);
    }

  } catch (err) {
    startupError = err.message;
    console.error('[Main] Failed during Electron app ready lifecycle:', err);
    Menu.setApplicationMenu(null);
    await createMainWindow();
  }
});

app.on('will-quit', () => {
  try {
    globalShortcut.unregisterAll();
  } catch (e) {}
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    await stopServer();
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});
