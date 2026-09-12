const mongoose = require('mongoose');

const behaviorEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true
  },
  features: {
    typingSpeed: Number,
    typingInterval: Number,
    mouseVelocity: Number,
    mouseAccel: Number,
    clickDelay: Number,
    scrollVelocity: Number,
    sessionHour: Number
  },
  deviceMetadata: {
    userAgent: String,
    screenResolution: String,
    platform: String,
    timezone: String
  },
  anomalyScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  classification: {
    type: String,
    enum: ['GENUINE', 'SUSPICIOUS', 'ANOMALOUS'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  modelScores: {
    kmeansDistance: Number,
    svmDistance: Number,
    rfAnomalyScore: Number
  },
  isDemo: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('BehaviorEvent', behaviorEventSchema);
