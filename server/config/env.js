const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isTest = NODE_ENV === 'test';

function getRuntimeConfigDir() {
  if (process.env.NEUROSHIELD_CONFIG_DIR) {
    return process.env.NEUROSHIELD_CONFIG_DIR;
  }

  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || os.homedir(), 'NeuroShield');
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'NeuroShield');
}

function getRuntimeConfigPath() {
  return path.join(getRuntimeConfigDir(), 'runtime.env');
}

const runtimeConfig = {
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || '',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME || 'neuroshield_session',
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV,
  RUNTIME_CONFIG_PATH: getRuntimeConfigPath()
};

function maskMongoUri(uri) {
  if (!uri || !String(uri).trim()) {
    return '';
  }

  const trimmed = String(uri).trim();
  const protocolMatch = trimmed.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);
  if (!protocolMatch) {
    return trimmed;
  }

  const [, protocol, remainder] = protocolMatch;
  const atIndex = remainder.lastIndexOf('@');
  if (atIndex === -1) {
    return trimmed;
  }

  const credentials = remainder.slice(0, atIndex);
  const hostPart = remainder.slice(atIndex + 1);
  const colonIndex = credentials.indexOf(':');

  if (colonIndex === -1) {
    return `${protocol}${credentials}@${hostPart}`;
  }

  const username = credentials.slice(0, colonIndex);
  return `${protocol}${username}:***@${hostPart}`;
}

function applyRuntimeValues(updates = {}) {
  const applied = {};

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === null) {
      continue;
    }

    const normalized = typeof value === 'string' ? value.trim() : String(value);
    process.env[key] = normalized;
    applied[key] = normalized;

    if (Object.prototype.hasOwnProperty.call(runtimeConfig, key)) {
      if (key === 'PORT') {
        const parsedPort = parseInt(normalized, 10);
        if (!Number.isNaN(parsedPort)) {
          runtimeConfig.PORT = parsedPort;
        }
      } else {
        runtimeConfig[key] = normalized;
      }
    }
  }

  return applied;
}

function readRuntimeConfigFile() {
  const runtimeConfigPath = getRuntimeConfigPath();
  if (!fs.existsSync(runtimeConfigPath)) {
    return {};
  }

  try {
    return dotenv.parse(fs.readFileSync(runtimeConfigPath));
  } catch (err) {
    console.warn('[Env] Failed to read runtime config:', err.message);
    return {};
  }
}

function persistRuntimeConfig(updates = {}) {
  if (isTest) {
    return;
  }

  const runtimeConfigPath = getRuntimeConfigPath();
  const existing = fs.existsSync(runtimeConfigPath)
    ? dotenv.parse(fs.readFileSync(runtimeConfigPath))
    : {};

  const merged = {
    ...existing,
    JWT_SECRET: runtimeConfig.JWT_SECRET || existing.JWT_SECRET || '',
    MONGODB_URI: runtimeConfig.MONGODB_URI || existing.MONGODB_URI || '',
    ...updates
  };

  fs.mkdirSync(path.dirname(runtimeConfigPath), { recursive: true });

  const lines = [
    '# NeuroShield runtime configuration',
    '# This file is created automatically for packaged desktop builds.'
  ];

  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    lines.push(`${key}=${JSON.stringify(String(value))}`);
  }

  fs.writeFileSync(`${runtimeConfigPath}`, `${lines.join(os.EOL)}${os.EOL}`, 'utf8');
}

function getRuntimeConfigSnapshot() {
  return {
    runtimeConfigPath: runtimeConfig.RUNTIME_CONFIG_PATH,
    nodeEnv: runtimeConfig.NODE_ENV,
    port: runtimeConfig.PORT,
    sessionCookieName: runtimeConfig.SESSION_COOKIE_NAME,
    mongoUriConfigured: Boolean(runtimeConfig.MONGODB_URI),
    maskedMongoUri: maskMongoUri(runtimeConfig.MONGODB_URI)
  };
}

function updateRuntimeConfig(updates = {}, { persist = !isTest } = {}) {
  const applied = applyRuntimeValues(updates);
  if (persist) {
    persistRuntimeConfig(applied);
  }
  return getRuntimeConfigSnapshot();
}

if (isTest) {
  require('../utils/inMemoryMongoose').installInMemoryMongoose();
} else {
  const runtimeFileValues = readRuntimeConfigFile();
  applyRuntimeValues(runtimeFileValues);
}

function ensureJwtSecret() {
  if (runtimeConfig.JWT_SECRET && runtimeConfig.JWT_SECRET.trim()) {
    return runtimeConfig.JWT_SECRET;
  }

  if (isTest) {
    applyRuntimeValues({ JWT_SECRET: 'neuroshield_test_jwt_secret' });
    return runtimeConfig.JWT_SECRET;
  }

  const generatedSecret = crypto.randomBytes(48).toString('hex');
  updateRuntimeConfig({ JWT_SECRET: generatedSecret });
  return generatedSecret;
}

runtimeConfig.JWT_SECRET = ensureJwtSecret();

module.exports = Object.assign(runtimeConfig, {
  getRuntimeConfigDir,
  getRuntimeConfigPath,
  readRuntimeConfigFile,
  persistRuntimeConfig,
  updateRuntimeConfig,
  getRuntimeConfigSnapshot,
  maskMongoUri
});
