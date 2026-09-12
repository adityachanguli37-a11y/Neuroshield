const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  role: {
    type: String,
    enum: ['ADMIN', 'SECURITY_ANALYST', 'EMPLOYEE', 'AUDITOR'],
    default: 'EMPLOYEE',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'LOCKED'],
    default: 'ACTIVE'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
