const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;

  const prefix = `${name}=`;
  const cookie = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.substring(prefix.length)) : null;
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : getCookieValue(req.headers.cookie, env.SESSION_COOKIE_NAME);

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token required.'
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'The authenticated user no longer exists.'
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Account is ${user.status}. Access suspended.`
      });
    }

    req.user = user;
    return next();
  } catch (err) {
    if (err.name !== 'JsonWebTokenError' && err.name !== 'TokenExpiredError') {
      return next(err);
    }

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token.'
    });
  }
}

module.exports = {
  authenticate,
  getCookieValue
};
