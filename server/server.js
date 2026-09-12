const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const net = require('net');

const env = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const realtimeService = require('./services/realtimeService');
const models = {
  SecurityEvent: require('./models/SecurityEvent'),
  Alert: require('./models/Alert')
};

// Route imports
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const behaviorRoutes = require('./routes/behavior');
const trustRoutes = require('./routes/trust');
const humanRiskRoutes = require('./routes/humanRisk');
const threatsRoutes = require('./routes/threats');
const simulationsRoutes = require('./routes/simulations');
const deceptionRoutes = require('./routes/deception');
const attackGraphRoutes = require('./routes/attackGraph');
const alertsRoutes = require('./routes/alerts');
const eventsRoutes = require('./routes/events');
const reportsRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const settingsRoutes = require('./routes/settings');
const healthRoutes = require('./routes/health');
const auditingRoutes = require('./routes/auditing');

let app = null;
let server = null;

function validateRuntimeConfiguration() {
  if (!env.JWT_SECRET) {
    throw new Error(`NeuroShield could not create a local runtime secret. Check write access to ${env.RUNTIME_CONFIG_PATH} or set JWT_SECRET explicitly.`);
  }
}

function createExpressApp() {
  const expressApp = express();

  expressApp.use(helmet({
    contentSecurityPolicy: false // Disabled for desktop renderer script embedding
  }));
  expressApp.use(cors({
    credentials: true,
    origin(origin, callback) {
      const isLocalDesktop = !origin || origin === 'null' || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
      callback(null, isLocalDesktop);
    }
  }));
  expressApp.use(express.json());
  expressApp.use(express.urlencoded({ extended: true }));

  // API Routes
  expressApp.use('/api/health', healthRoutes);
  expressApp.use('/api/auth', authRoutes);
  expressApp.use('/api/users', usersRoutes);
  expressApp.use('/api/behavior', behaviorRoutes);
  expressApp.use('/api/trust', trustRoutes);
  expressApp.use('/api/human-risk', humanRiskRoutes);
  expressApp.use('/api/threats', threatsRoutes);
  expressApp.use('/api/simulations', simulationsRoutes);
  expressApp.use('/api/deception', deceptionRoutes);
  expressApp.use('/api/attack-graph', attackGraphRoutes);
  expressApp.use('/api/alerts', alertsRoutes);
  expressApp.use('/api/events', eventsRoutes);
  expressApp.use('/api/reports', reportsRoutes);
  expressApp.use('/api/audit', auditRoutes);
  expressApp.use('/api/settings', settingsRoutes);
  expressApp.use('/api/auditing', auditingRoutes);

  // Serve static client web application
  const clientPath = path.join(__dirname, '../client');
  expressApp.use(express.static(clientPath));

  // Root route redirects to login page
  expressApp.get('/', (req, res) => {
    res.redirect('/login.html');
  });

  expressApp.use(errorHandler);
  return expressApp;
}

function checkPortAvailable(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => {
      s.close(() => resolve(true));
    });
    s.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort = 5000) {
  let port = startPort;
  while (port < startPort + 100) {
    const available = await checkPortAvailable(port);
    if (available) return port;
    port++;
  }
  return 0; // Random port fallback
}

const systemAuditor = require('./services/systemAuditorService');
const fimService = require('./services/fimService');
const networkAuditor = require('./services/networkAuditorService');

async function startServer(desiredPort = env.PORT) {
  validateRuntimeConfiguration();
  app = createExpressApp();
  server = http.createServer(app);

  // Initialize Socket.IO
  realtimeService.initialize(server);

  // Initialize Database connection
  const dbResult = await connectDatabase();
  if (dbResult.connected) {
    realtimeService.attachChangeStreams(models);
  }

  // Initialize Auditing Subsystems
  systemAuditor.start();
  fimService.initCanaryVault();
  networkAuditor.start();

  // Determine port
  const actualPort = await findAvailablePort(desiredPort);

  return new Promise((resolve, reject) => {
    server.listen(actualPort, '127.0.0.1', () => {
      const address = server.address();
      const listeningPort = address && typeof address === 'object' ? address.port : actualPort;
      console.log(`[Server] Express server running on http://127.0.0.1:${listeningPort}`);
      resolve({
        server,
        port: listeningPort,
        url: `http://127.0.0.1:${listeningPort}`
      });
    });

    server.on('error', (err) => {
      console.error('[Server] Express server startup error:', err);
      reject(err);
    });
  });
}

async function stopServer() {
  systemAuditor.stop();
  fimService.stop();
  networkAuditor.stop();
  realtimeService.close();
  await disconnectDatabase();

  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('[Server] Express server stopped cleanly.');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Standalone execution if started via CLI (node server/server.js)
if (require.main === module) {
  startServer(env.PORT).then(({ url }) => {
    console.log(`NeuroShield backend standalone ready at ${url}`);
  }).catch((err) => {
    console.error('Failed to start server:', err);
  });
}

module.exports = {
  createExpressApp,
  startServer,
  stopServer,
  validateRuntimeConfiguration
};
