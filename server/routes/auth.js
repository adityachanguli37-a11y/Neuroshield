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

module.exports = router;
