const express = require('express');
const router = express.Router();
const { getDatabaseStatus } = require('../config/database');
const realtimeService = require('../services/realtimeService');

router.get('/', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const realtimeConnected = realtimeService.isConnected;

  const isHealthy = dbStatus.connected && realtimeConnected;
  const statusString = isHealthy ? 'ONLINE' : 'DEGRADED';
  const httpStatus = dbStatus.connected ? 200 : 503;

  return res.status(httpStatus).json({
    status: statusString,
    timestamp: new Date(),
    services: {
      express: 'online',
      database: dbStatus.connected ? 'connected' : 'offline',
      databaseMode: dbStatus.mode || 'unknown',
      databaseState: dbStatus.state,
      databaseError: dbStatus.error || null,
      realtime: realtimeConnected ? 'connected' : 'disconnected'
    }
  });
});

module.exports = router;
