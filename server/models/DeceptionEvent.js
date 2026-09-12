const mongoose = require('mongoose');

const deceptionEventSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  eventType: {
    type: String,
    enum: ['HONEYTOKEN_ACCESS', 'HONEYPOT_CONNECTION', 'DECOY_INTERACTION'],
    required: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'HIGH',
    required: true
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    payloadAttempted: String,
    trapDetails: String
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

module.exports = mongoose.model('DeceptionEvent', deceptionEventSchema);
