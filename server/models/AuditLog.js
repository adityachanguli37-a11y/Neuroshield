const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  userName: {
    type: String,
    default: 'System'
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  resource: {
    type: String,
    required: true
  },
  resourceId: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: '127.0.0.1'
  },
  userAgent: {
    type: String,
    default: 'NeuroShield-Desktop-App'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true
  }
});

// Enforce immutable entries
auditLogSchema.pre('updateOne', function() {
  throw new Error('AuditLog entries are append-only and cannot be modified.');
});
auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('AuditLog entries are append-only and cannot be modified.');
});
auditLogSchema.pre('deleteOne', function() {
  throw new Error('AuditLog entries are append-only and cannot be deleted.');
});
auditLogSchema.pre('findOneAndDelete', function() {
  throw new Error('AuditLog entries are append-only and cannot be deleted.');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
