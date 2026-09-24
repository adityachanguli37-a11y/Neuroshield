const express = require('express');
const router = express.Router();
const TrustScore = require('../models/TrustScore');
const { calculateTrust } = require('../engines/trust');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/trust/current/:userId
router.get('/current/:userId', async (req, res, next) => {
  try {
    const targetUserId = req.user.role === 'EMPLOYEE' ? req.user._id : req.params.userId;
    let trustDoc = await TrustScore.findOne({ userId: targetUserId }).sort({ timestamp: -1 });

    const BehaviorProfile = require('../models/BehaviorProfile');
    const profile = await BehaviorProfile.findOne({ userId: targetUserId });
    const behaviorScore = (profile && profile.latestBehaviorScore !== undefined) ? profile.latestBehaviorScore : 95;

    if (!trustDoc) {
      const computed = calculateTrust({ behaviorScore });
      trustDoc = {
        userId: targetUserId,
        ...computed,
        timestamp: new Date()
      };
    }
    return res.json({ trustScore: trustDoc, lockedProfile: profile ? { isLocked: profile.isLocked, baselineFeatures: profile.baselineFeatures } : null });
  } catch (err) {
    next(err);
  }
});

// POST /api/trust/evaluate
router.post('/evaluate', async (req, res, next) => {
  try {
    const BehaviorProfile = require('../models/BehaviorProfile');
    const profile = await BehaviorProfile.findOne({ userId: req.user._id });
    const defaultBehaviorScore = (profile && profile.latestBehaviorScore !== undefined) ? profile.latestBehaviorScore : 95;

    const contextScores = {
      behaviorScore: defaultBehaviorScore,
      ...req.body
    };
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
