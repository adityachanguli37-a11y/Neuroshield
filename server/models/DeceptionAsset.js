const mongoose = require('mongoose');

const deceptionAssetSchema = new mongoose.Schema({
  assetId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['HONEYPOT', 'HONEYTOKEN', 'DECOY'],
    required: true
  },
  location: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ARMED', 'TRIGGERED', 'DISABLED'],
    default: 'ARMED'
  },
  metadata: {
    targetPort: Number,
    fakeCredentialType: String,
    decoyUrl: String,
    description: String
  },
  triggerCount: {
    type: Number,
    default: 0
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DeceptionAsset', deceptionAssetSchema);
