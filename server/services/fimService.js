const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const securityEventService = require('./securityEventService');
const realtimeService = require('./realtimeService');

class FileIntegrityMonitorService {
  constructor() {
    this.watchedDirectory = null;
    this.watcher = null;
    this.canaryFiles = new Map(); // filename -> { path, hash, status, lastModified }
    this.recentEvents = [];
    this.debounceTimers = new Map();
  }

  computeHash(filePath) {
    try {
      if (!fs.existsSync(filePath)) return null;
      const data = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (e) {
      return null;
    }
  }

  initCanaryVault(customDir = null) {
    const defaultDir = path.join(process.env.APPDATA || process.cwd(), 'NeuroShield', 'CanaryVault');
    this.watchedDirectory = customDir || defaultDir;

    try {
      fs.mkdirSync(this.watchedDirectory, { recursive: true });

      // Seed Canary Files
      const filesToSeed = [
        {
          name: 'canary_vault_backup.key',
          content: '-----BEGIN ZERO TRUST CANARY KEY-----\nCANARY_HASH=' + crypto.randomBytes(16).toString('hex') + '\nWARNING: UNAUTHORIZED ACCESS RAISES IMMEDIATE CRITICAL ALERT\n-----END ZERO TRUST CANARY KEY-----'
        },
        {
          name: 'decoy_db_passwords.env',
          content: '# PRODUCTION DATABASE BACKUP CONFIG (DECOY)\nDB_HOST=10.0.0.45\nDB_PASS=' + crypto.randomBytes(12).toString('hex') + '\nDB_NAME=corp_vault_decoy\n'
        }
      ];

      for (const item of filesToSeed) {
        const fullPath = path.join(this.watchedDirectory, item.name);
        if (!fs.existsSync(fullPath)) {
          fs.writeFileSync(fullPath, item.content, 'utf8');
        }
        const hash = this.computeHash(fullPath);
        this.canaryFiles.set(item.name, {
          name: item.name,
          path: fullPath,
          hash,
          status: 'ARMED',
          lastChecked: new Date()
        });
      }

      this.startWatching();
      console.log(`[FIM] File Integrity Monitor active on ${this.watchedDirectory}`);
    } catch (err) {
      console.warn('[FIM] Failed to initialize Canary Vault:', err.message);
    }
  }

  startWatching() {
    if (this.watcher || !this.watchedDirectory || !fs.existsSync(this.watchedDirectory)) return;

    this.watcher = fs.watch(this.watchedDirectory, (eventType, filename) => {
      if (!filename) return;

      // Debounce events
      if (this.debounceTimers.has(filename)) {
        clearTimeout(this.debounceTimers.get(filename));
      }

      this.debounceTimers.set(filename, setTimeout(() => {
        this.debounceTimers.delete(filename);
        this._handleFileChange(eventType, filename);
      }, 250));
    });
  }

  _handleFileChange(eventType, filename) {
    const fullPath = path.join(this.watchedDirectory, filename);
    const exists = fs.existsSync(fullPath);
    const newHash = exists ? this.computeHash(fullPath) : null;
    const tracked = this.canaryFiles.get(filename);

    const eventRecord = {
      timestamp: new Date(),
      filename,
      eventType,
      severity: 'CRITICAL',
      status: exists ? 'TAMPERED' : 'DELETED'
    };
    this.recentEvents.unshift(eventRecord);
    if (this.recentEvents.length > 50) this.recentEvents.pop();

    if (tracked) {
      tracked.status = exists ? 'TAMPERED' : 'DELETED';
      tracked.lastChecked = new Date();
      tracked.hash = newHash;
    }

    console.warn(`[FIM ALERT] Canary file modification detected: ${filename} (${eventType})`);

    // Raise zero-trust critical alert and trigger Layer 5 deception event
    securityEventService.processEvent({
      eventType: 'FIM_CANARY_TAMPERED',
      severity: 'CRITICAL',
      sourceLayer: 'INTELLIGENT_DECEPTION',
      description: `File Integrity Monitor triggered! Monitored canary asset '${filename}' was ${exists ? 'modified' : 'deleted'} on host filesystem.`,
      metadata: {
        filename,
        path: fullPath,
        changeType: eventType,
        newHash: newHash || 'DELETED'
      }
    }).catch(err => console.warn('[FIM] Event processing notice:', err.message));

    realtimeService.broadcast('fim:alert', {
      filename,
      eventType,
      severity: 'CRITICAL'
    });
  }

  getStatus() {
    return {
      watchedDirectory: this.watchedDirectory,
      monitoredFilesCount: this.canaryFiles.size,
      canaryFiles: Array.from(this.canaryFiles.values()),
      recentEvents: this.recentEvents
    };
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

module.exports = new FileIntegrityMonitorService();
