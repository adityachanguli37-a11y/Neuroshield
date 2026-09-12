const mongoose = require('mongoose');

const trustScoreSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  behaviorScore: { type: Number, required: true, min: 0, max: 100 }, // 40%
  deviceScore: { type: Number, required: true, min: 0, max: 100 },   // 20%
  locationScore: { type: Number, required: true, min: 0, max: 100 }, // 15%
  networkScore: { type: Number, required: true, min: 0, max: 100 },  // 15%
  timeScore: { type: Number, required: true, min: 0, max: 100 },     // 10%
  overallTrust: { type: Number, required: true, min: 0, max: 100 },
  trustLevel: {
    type: String,
    enum: ['HIGH TRUST', 'MEDIUM TRUST', 'LOW TRUST', 'CRITICAL RISK'],
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['LOW RISK', 'MEDIUM RISK', 'HIGH RISK', 'CRITICAL RISK'],
    required: true
  },
  authenticationAction: {
    type: String,
    enum: ['NORMAL', 'CHALLENGE', 'STEP_UP_MFA', 'RESTRICT'],
    required: true
  },
  fuzzyRules: [{
    rule: String,
    triggered: Boolean,
    weight: Number
  }],
  explanation: {
    type: String,
    required: true
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

module.exports = mongoose.model('TrustScore', trustScoreSchema);
