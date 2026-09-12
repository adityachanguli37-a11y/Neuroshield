const env = require('../config/env');

function errorHandler(err, req, res, next) {
  console.error('[Error] Middleware trapped exception:', err);

  const statusCode = err.status || err.statusCode || 500;
  const response = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred.'
  };

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
