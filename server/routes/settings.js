const express = require('express');

const router = express.Router();

const env = require('../config/env');
const { reconnectDatabase, getDatabaseStatus } = require('../config/database');
const realtimeService = require('../services/realtimeService');
const SecurityEvent = require('../models/SecurityEvent');
const Alert = require('../models/Alert');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

function isValidMongoUri(uri) {
  return /^mongodb(\+srv)?:\/\/.+/i.test(uri);
}

router.use(authenticate);

router.get('/runtime', authorize('ADMIN'), (req, res) => {
  return res.json({
    runtimeConfig: env.getRuntimeConfigSnapshot(),
    database: getDatabaseStatus(),
    realtime: {
      connected: realtimeService.isConnected
    }
  });
});

router.put('/runtime', authorize('ADMIN'), async (req, res, next) => {
  try {
    const rawUri = req.body ? req.body.mongodbUri : '';
    const mongodbUri = typeof rawUri === 'string' ? rawUri.trim() : '';

    if (!mongodbUri) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'MONGODB_URI is required.'
      });
    }

    if (!isValidMongoUri(mongodbUri)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'MONGODB_URI must start with mongodb:// or mongodb+srv://.'
      });
    }

    env.updateRuntimeConfig({ MONGODB_URI: mongodbUri });

    const databaseResult = await reconnectDatabase(mongodbUri);
    if (databaseResult.connected) {
      realtimeService.attachChangeStreams({
        SecurityEvent,
        Alert
      });
    }

    return res.json({
      message: databaseResult.connected
        ? 'MongoDB URI saved and the backend reconnected successfully.'
        : `MongoDB URI saved, but MongoDB is still offline: ${databaseResult.error || 'Unknown connection error.'}`,
      runtimeConfig: env.getRuntimeConfigSnapshot(),
      database: getDatabaseStatus()
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
