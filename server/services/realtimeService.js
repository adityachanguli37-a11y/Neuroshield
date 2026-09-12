const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const { getCookieValue } = require('../middleware/auth');

function isLocalDesktopOrigin(origin) {
  return !origin || origin === 'null' || /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
}

class RealtimeService {
  constructor() {
    this.io = null;
    this.changeStreams = [];
    this.isConnected = process.env.NODE_ENV === 'test';
  }

  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        credentials: true,
        methods: ['GET', 'POST'],
        origin(origin, callback) {
          callback(null, isLocalDesktopOrigin(origin));
        }
      }
    });

    // Realtime data has the same access boundary as REST data. The renderer
    // never receives the session token; Socket.IO validates its cookie here.
    this.io.use(async (socket, next) => {
      try {
        const token = getCookieValue(socket.handshake.headers.cookie, env.SESSION_COOKIE_NAME);
        if (!token) return next(new Error('Authentication required.'));

        const decoded = jwt.verify(token, env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-passwordHash');
        if (!user || user.status !== 'ACTIVE') return next(new Error('Authentication required.'));

        socket.data.userId = user._id.toString();
        return next();
      } catch (err) {
        return next(new Error('Authentication required.'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`[RealtimeService] Socket client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`[RealtimeService] Socket client disconnected: ${socket.id}`);
      });
    });

    this.isConnected = true;
    console.log('[RealtimeService] Socket.IO server initialized successfully.');
  }

  detachChangeStreams() {
    for (const stream of this.changeStreams) {
      try {
        if (typeof stream.close === 'function') {
          stream.close();
        }
      } catch (e) {
        // ignore stream close error
      }
    }

    this.changeStreams = [];
  }

  attachChangeStreams(models = {}) {
    if (!models || Object.keys(models).length === 0) return;

    try {
      this.detachChangeStreams();

      // Setup MongoDB Change Streams on SecurityEvent and Alert models if replica set/Atlas supports it
      if (models.SecurityEvent && typeof models.SecurityEvent.watch === 'function') {
        const eventStream = models.SecurityEvent.watch();
        eventStream.on('change', (change) => {
          if (change.operationType === 'insert') {
            this.broadcast('security:event', change.fullDocument);
          }
        });
        this.changeStreams.push(eventStream);
      }

      if (models.Alert && typeof models.Alert.watch === 'function') {
        const alertStream = models.Alert.watch();
        alertStream.on('change', (change) => {
          if (change.operationType === 'insert' || change.operationType === 'update') {
            this.broadcast('alert:update', change.fullDocument || change.documentKey);
          }
        });
        this.changeStreams.push(alertStream);
      }
      console.log('[RealtimeService] MongoDB Change Streams attached.');
    } catch (err) {
      console.warn('[RealtimeService] Change streams note:', err.message);
    }
  }

  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  close() {
    this.detachChangeStreams();
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    this.isConnected = false;
    console.log('[RealtimeService] Socket.IO server shut down.');
  }
}

module.exports = new RealtimeService();
