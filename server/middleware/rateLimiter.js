const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 20, // limit to 20 auth attempts per IP (higher in tests)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down.'
  }
});

const simulationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30, // 30 simulation triggers per minute max
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Simulation request limit reached.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter,
  simulationLimiter
};
