const mongoose = require('mongoose');

const threatPredictionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  currentState: {
    type: String,
    enum: [
      'NORMAL',
      'SUSPICIOUS',
      'INITIAL_COMPROMISE',
      'COMPROMISED',
      'LATERAL_MOVEMENT',
      'PRIVILEGE_ESCALATION',
      'CRITICAL_COMPROMISE'
    ],
    default: 'NORMAL',
    required: true
  },
  threatProbability: { type: Number, required: true, min: 0, max: 1 },
  compromiseProbability: { type: Number, required: true, min: 0, max: 1 },
  criticalProbability: { type: Number, required: true, min: 0, max: 1 },
  nextStateDistribution: {
    NORMAL: Number,
    SUSPICIOUS: Number,
    INITIAL_COMPROMISE: Number,
    COMPROMISED: Number,
    LATERAL_MOVEMENT: Number,
    PRIVILEGE_ESCALATION: Number,
    CRITICAL_COMPROMISE: Number
  },
  mostLikelyPath: [{
    fromState: String,
    toState: String,
    probability: Number
  }],
  criticalNode: { type: String, default: 'CRITICAL_ASSET' },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  isDemo: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('ThreatPrediction', threatPredictionSchema);
