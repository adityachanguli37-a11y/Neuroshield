const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const env = require('../config/env');
const { authenticate } = require('../middleware/auth');
const { validateUserPayload } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/api',
  maxAge: SESSION_MAX_AGE_MS
};

function createSessionToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function setSessionCookie(res, user) {
  res.cookie(env.SESSION_COOKIE_NAME, createSessionToken(user), sessionCookieOptions);
}

// POST /api/auth/register
router.post('/register', authLimiter, validateUserPayload, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'A user with this email address already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      // Public registration cannot grant privileged roles. Administrators may
      // change roles through the protected user-management endpoint.
      role: 'EMPLOYEE'
    });

    await user.save();

    setSessionCookie(res, user);

    try {
      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        action: 'USER_REGISTERED',
        resource: 'User',
        resourceId: user._id.toString()
      });
    } catch (e) {}

    return res.status(201).json({
      message: 'User registered successfully',
      user,
      desktopToken: createSessionToken(user)
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid credentials.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Account is ${user.status}. Access suspended.`
      });
    }

    user.lastLogin = new Date();
    await user.save();

    setSessionCookie(res, user);

    try {
      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        action: 'USER_LOGIN',
        resource: 'Auth',
        resourceId: user._id.toString()
      });
    } catch (e) {}

    return res.json({
      message: 'Login successful',
      user,
      desktopToken: createSessionToken(user)
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  return res.json({ user: req.user });
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name || 'User',
      action: 'USER_LOGOUT',
      resource: 'Auth'
    });
  } catch (e) {}

  res.clearCookie(env.SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/api'
  });

  return res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/verify-identity - Step 1: Verify email + name before reset
router.post('/verify-identity', authLimiter, async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Corporate email and full name are required for identity verification.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No account associated with that corporate email address.'
      });
    }

    // Case-insensitive name comparison
    if (user.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Identity verification failed. The name does not match the registered identity.'
      });
    }

    try {
      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        action: 'IDENTITY_VERIFIED_FOR_RESET',
        resource: 'Auth',
        resourceId: user._id.toString()
      });
    } catch (e) {}

    return res.json({
      message: 'Identity verified successfully. You may now set a new password.',
      verified: true,
      userName: user.name
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password - Step 2: Set new password after identity verification
router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { email, name, newPassword } = req.body;

    if (!email || !name || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Corporate email, full name, and new password are all required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters long.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No account associated with that corporate email address.'
      });
    }

    // Re-verify identity before allowing password change
    if (user.name.toLowerCase().trim() !== name.toLowerCase().trim()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Identity verification failed. Password reset denied.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    try {
      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        action: 'PASSWORD_RESET',
        resource: 'Auth',
        resourceId: user._id.toString()
      });
    } catch (e) {}

    return res.json({
      message: 'Password reset successfully. You can now log in with your new credentials.'
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password - Authenticated password change
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'New password must be at least 6 characters long.'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password does not match.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    try {
      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        action: 'PASSWORD_CHANGED',
        resource: 'Auth',
        resourceId: user._id.toString()
      });
    } catch (e) {}

    return res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
