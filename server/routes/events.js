const express = require('express');
const router = express.Router();
const SecurityEvent = require('../models/SecurityEvent');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/events - Unified Security Event Stream
router.get('/', async (req, res, next) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    const filter = isEmployee ? { userId: req.user._id } : {};
    const events = await SecurityEvent.find(filter).sort({ timestamp: -1 }).limit(100);
    return res.json({ events, isPersonalView: isEmployee });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
