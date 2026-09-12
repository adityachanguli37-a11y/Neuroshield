const express = require('express');
const router = express.Router();
const ThreatPrediction = require('../models/ThreatPrediction');
const { predictThreat, STATES } = require('../engines/threat');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/threats/current/:userId
router.get('/current/:userId', async (req, res, next) => {
  try {
    let threatDoc = await ThreatPrediction.findOne({ userId: req.params.userId }).sort({ timestamp: -1 });
    if (!threatDoc) {
      const computed = predictThreat({ currentState: 'NORMAL' });
      threatDoc = {
        userId: req.params.userId,
        ...computed,
        timestamp: new Date()
      };
    }
    return res.json({ threatPrediction: threatDoc, states: STATES });
  } catch (err) {
    next(err);
  }
});

// POST /api/threats/predict
router.post('/predict', async (req, res, next) => {
  try {
    const context = req.body;
    const computed = predictThreat(context);

    const threatDoc = new ThreatPrediction({
      userId: req.user._id,
      currentState: computed.currentState,
      threatProbability: computed.threatProbability,
      compromiseProbability: computed.compromiseProbability,
      criticalProbability: computed.criticalProbability,
      nextStateDistribution: computed.nextStateDistribution,
      mostLikelyPath: computed.mostLikelyPath,
      criticalNode: computed.criticalNode,
      confidence: computed.confidence,
      timestamp: new Date()
    });
    await threatDoc.save();

    return res.json({ threatPrediction: threatDoc });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
