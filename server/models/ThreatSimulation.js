const mongoose = require('mongoose');

const threatSimulationSchema = new mongoose.Schema({
  simulationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  iterations: {
    type: Number,
    required: true,
    min: 100,
    max: 100000
  },
  initialState: {
    type: String,
    required: true
  },
  transitionMatrix: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  results: {
    compromiseProbability: Number,
    criticalReachabilityRate: Number,
    averageStepsToCompromise: Number,
    expectedTimeToCompromise: Number,
    confidenceInterval: {
      lower: Number,
      upper: Number
    }
  },
  attackPaths: [{
    path: [String],
    frequency: Number,
    probability: Number
  }],
  executionTime: {
    type: Number, // ms
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

module.exports = mongoose.model('ThreatSimulation', threatSimulationSchema);
