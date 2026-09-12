const express = require('express');
const router = express.Router();
const TrustScore = require('../models/TrustScore');
const { calculateTrust } = require('../engines/trust');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/trust/current/:userId
router.get('/current/:userId', async (req, res, next) => {
  try {
    let trustDoc = await TrustScore.findOne({ userId: req.params.userId }).sort({ timestamp: -1 });
    if (!trustDoc) {
      const computed = calculateTrust({});
      trustDoc = {
        userId: req.params.userId,
        ...computed,
        timestamp: new Date()
      };
    }
    return res.json({ trustScore: trustDoc });
  } catch (err) {
    next(err);
  }
});

// POST /api/trust/evaluate
router.post('/evaluate', async (req, res, next) => {
  try {
    const contextScores = req.body;
    const computed = calculateTrust(contextScores);
    
    const trustDoc = new TrustScore({
      userId: req.user._id,
      ...computed,
      timestamp: new Date()
    });
    await trustDoc.save();

    return res.json({ trustScore: trustDoc });
  } catch (err) {
    next(err);
  }
});

// GET /api/trust/history
router.get('/history', async (req, res, next) => {
  try {
    const query = req.user.role === 'EMPLOYEE' ? { userId: req.user._id } : {};
    const history = await TrustScore.find(query).sort({ timestamp: -1 }).limit(50);
    return res.json({ history });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
