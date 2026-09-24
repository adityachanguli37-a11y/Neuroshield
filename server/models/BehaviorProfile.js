const mongoose = require('mongoose');

const behaviorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  baselineFeatures: {
    typingSpeed: { type: Number, default: 60 },      // words per minute / chars per sec normalized
    typingInterval: { type: Number, default: 120 },  // ms between keystrokes
    mouseVelocity: { type: Number, default: 450 },   // px/sec
    mouseAccel: { type: Number, default: 80 },       // px/sec^2
    clickDelay: { type: Number, default: 180 },      // ms between down and up
    scrollVelocity: { type: Number, default: 300 },  // px/sec
    sessionHour: { type: Number, default: 14 }       // 0-23 typical hour
  },
  featureVariances: {
    typingSpeed: { type: Number, default: 15 },
    typingInterval: { type: Number, default: 30 },
    mouseVelocity: { type: Number, default: 100 },
    mouseAccel: { type: Number, default: 25 },
    clickDelay: { type: Number, default: 40 },
    scrollVelocity: { type: Number, default: 80 },
    sessionHour: { type: Number, default: 4 }
  },
  anomalyThreshold: {
    type: Number,
    default: 0.65
  },
  modelConfidence: {
    type: Number,
    default: 0.85
  },
  sampleCount: {
    type: Number,
    default: 50
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lockedAt: {
    type: Date,
    default: null
  },
  latestTelemetry: {
    typingSpeed: { type: Number },
    typingInterval: { type: Number },
    mouseVelocity: { type: Number },
    mouseAccel: { type: Number },
    clickDelay: { type: Number },
    scrollVelocity: { type: Number },
    sessionHour: { type: Number }
  },
  latestBehaviorScore: {
    type: Number,
    default: 95
  },
  latestAnomalyScore: {
    type: Number,
    default: 0.05
  },
  latestClassification: {
    type: String,
    enum: ['GENUINE', 'SUSPICIOUS', 'ANOMALOUS'],
    default: 'GENUINE'
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('BehaviorProfile', behaviorProfileSchema);
