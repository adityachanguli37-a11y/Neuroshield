const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  sourceLayer: {
    type: String,
    enum: [
      'BEHAVIORAL_IDENTITY',
      'ADAPTIVE_TRUST',
      'HUMAN_RISK',
      'THREAT_PREDICTION',
      'INTELLIGENT_DECEPTION'
    ],
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  trustScore: { type: Number, min: 0, max: 100 },
  riskScore: { type: Number, min: 0, max: 100 },
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  isDemo: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('SecurityEvent', securityEventSchema);
