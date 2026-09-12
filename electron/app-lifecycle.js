const { app } = require('electron');
const { stopServer } = require('../server/server');

function initLifecycleHooks() {
  // Enforce single instance lock
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    console.warn('[Lifecycle] Another instance of NeuroShield is already running. Exiting.');
    app.quit();
    return false;
  }

  process.on('uncaughtException', (err) => {
    console.error('[Lifecycle] Uncaught Exception in Main Process:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Lifecycle] Unhandled Rejection in Main Process:', reason);
  });

  app.on('before-quit', async (event) => {
    console.log('[Lifecycle] App before-quit event. Shutting down Express server and DB connections...');
    try {
      await stopServer();
    } catch (e) {
      console.error('[Lifecycle] Error during backend shutdown:', e);
    }
  });

  return true;
}

module.exports = {
  initLifecycleHooks
};
