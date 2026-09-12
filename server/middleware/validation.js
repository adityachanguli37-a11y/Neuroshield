const mongoose = require('mongoose');

function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (id && !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid ObjectId format for parameter '${paramName}'.`
      });
    }
    next();
  };
}

function validateSimulationParams(req, res, next) {
  const { iterations } = req.body;
  if (iterations !== undefined) {
    const num = Number(iterations);
    if (isNaN(num) || num < 100 || num > 100000) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Simulation iterations must be a number between 100 and 100,000.'
      });
    }
  }
  next();
}

function validateUserPayload(req, res, next) {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Name, email, and password are required fields.'
    });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid email address format.'
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Password must be at least 6 characters long.'
    });
  }
  next();
}

module.exports = {
  validateObjectId,
  validateSimulationParams,
  validateUserPayload
};
