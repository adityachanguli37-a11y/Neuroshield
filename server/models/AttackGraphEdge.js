const mongoose = require('mongoose');

const attackGraphEdgeSchema = new mongoose.Schema({
  edgeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    ref: 'AttackGraphNode'
  },
  target: {
    type: String,
    required: true,
    ref: 'AttackGraphNode'
  },
  probability: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  conditions: {
    type: [String],
    default: []
  },
  vulnerability: {
    type: String,
    default: 'Default Vulnerability Path'
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AttackGraphEdge', attackGraphEdgeSchema);
