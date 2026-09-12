const mongoose = require('mongoose');
const env = require('./env');
const { installInMemoryMongoose } = require('../utils/inMemoryMongoose');
const { autoSeedDatabase } = require('../utils/autoSeed');

let connectionError = null;
let databaseMode = 'disconnected';

async function connectDatabase(customUri = null) {
  if (env.NODE_ENV === 'test') {
    connectionError = null;
    databaseMode = 'test';
    return { connected: true, inMemory: true, mode: 'test' };
  }

  const uri = customUri || env.MONGODB_URI;

  if (uri && !uri.startsWith('memory://')) {
    try {
      mongoose.set('strictQuery', true);
      console.log('[Database] Attempting connection to MongoDB Atlas...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 5000
      });

      connectionError = null;
      databaseMode = 'atlas';
      console.log('[Database] MongoDB Atlas connected successfully.');

      mongoose.connection.on('error', (err) => {
        console.error('[Database] MongoDB connection error:', err.message);
        connectionError = err.message;
      });

      // Auto-seed Atlas if first time setup
      await autoSeedDatabase(false);

      return { connected: true, mode: 'atlas' };
    } catch (err) {
      console.warn(`[Database] MongoDB Atlas connection failed (${err.message}). Activating Embedded Local Database mode for standalone execution.`);
      connectionError = null;
    }
  } else {
    console.log('[Database] No external MONGODB_URI provided. Initializing Embedded Local Database mode.');
  }

  // Fallback to Embedded Local In-Memory Datastore
  installInMemoryMongoose();
  databaseMode = 'embedded';
  connectionError = null;

  try {
    await autoSeedDatabase(false);
  } catch (seedErr) {
    console.warn('[Database] Embedded auto-seed notice:', seedErr.message);
  }

  console.log('[Database] NeuroShield Embedded Local Database active and ready.');
  return { connected: true, inMemory: true, mode: 'embedded' };
}

async function disconnectDatabase() {
  if (env.NODE_ENV === 'test' || databaseMode === 'embedded') {
    connectionError = null;
    return;
  }

  if (mongoose.connection && mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed cleanly.');
  }
}

async function reconnectDatabase(customUri = null) {
  await disconnectDatabase();
  return connectDatabase(customUri);
}

function getDatabaseStatus() {
  if (env.NODE_ENV === 'test') {
    return {
      connected: true,
      state: 'connected',
      mode: 'test',
      error: null
    };
  }

  if (databaseMode === 'embedded') {
    return {
      connected: true,
      state: 'connected',
      mode: 'embedded',
      error: null
    };
  }

  const state = mongoose.connection.readyState;
  const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const isConnected = state === 1;

  return {
    connected: isConnected,
    state: stateNames[state] || 'unknown',
    mode: databaseMode,
    error: isConnected ? null : (connectionError || 'Disconnected')
  };
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  reconnectDatabase,
  getDatabaseStatus
};
