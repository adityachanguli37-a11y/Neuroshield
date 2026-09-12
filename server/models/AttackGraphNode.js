const mongoose = require('mongoose');

const attackGraphNodeSchema = new mongoose.Schema({
  nodeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  nodeType: {
    type: String,
    enum: [
      'USER',
      'INITIAL_ACCESS',
      'ENDPOINT',
      'CREDENTIAL',
      'LATERAL_ASSET',
      'PRIVILEGE_ASSET',
      'CRITICAL_ASSET'
    ],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  risk: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['SAFE', 'SUSPICIOUS', 'COMPROMISED'],
    default: 'SAFE'
  },
  metadata: {
    ip: String,
    os: String,
    importance: String,
    description: String
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AttackGraphNode', attackGraphNodeSchema);
