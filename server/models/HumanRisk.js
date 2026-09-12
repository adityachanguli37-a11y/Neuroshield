const mongoose = require('mongoose');

const humanRiskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  category: {
    type: String,
    enum: ['LOW', 'MODERATE', 'ELEVATED', 'SEVERE'],
    required: true
  },
  probability: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  contributingFactors: [{
    factor: String,
    impact: Number,
    description: String
  }],
  modelResults: {
    decisionTreeRisk: Number,
    logisticProbability: Number,
    bayesianPosterior: Number
  },
  recommendation: {
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

module.exports = mongoose.model('HumanRisk', humanRiskSchema);
