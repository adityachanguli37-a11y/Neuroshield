const express = require('express');
const router = express.Router();
const ThreatPrediction = require('../models/ThreatPrediction');
const TrustScore = require('../models/TrustScore');
const HumanRisk = require('../models/HumanRisk');
const BehaviorEvent = require('../models/BehaviorEvent');
const SecurityEvent = require('../models/SecurityEvent');
const Alert = require('../models/Alert');
const { predictThreat, STATES } = require('../engines/threat');
const { authenticate } = require('../middleware/auth');
const realtimeService = require('../services/realtimeService');

router.use(authenticate);

async function computeLiveThreatState(userId) {
  // 1. Fetch latest trust score
  const latestTrust = await TrustScore.findOne({ userId }).sort({ timestamp: -1 });
  const trustScore = latestTrust ? latestTrust.overallTrust : 90;

  // 2. Fetch latest human risk
  const latestRisk = await HumanRisk.findOne({ userId }).sort({ timestamp: -1 });
  const humanRiskScore = latestRisk ? latestRisk.riskScore : 10;

  // 3. Fetch locked Behavior Profile & latest behavior event
  const BehaviorProfile = require('../models/BehaviorProfile');
  const profile = await BehaviorProfile.findOne({ userId });
  const latestBehavior = await BehaviorEvent.findOne({ userId }).sort({ timestamp: -1 });

  let behaviorAnomalyScore = 0.05;
  if (profile && profile.latestAnomalyScore !== undefined) {
    behaviorAnomalyScore = profile.latestAnomalyScore;
  } else if (latestBehavior && latestBehavior.anomalyScore !== undefined) {
    behaviorAnomalyScore = latestBehavior.anomalyScore;
  }

  // 4. Count recent non-demo deception trap triggers in the last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const deceptionCount = await SecurityEvent.countDocuments({
    userId,
    sourceLayer: 'INTELLIGENT_DECEPTION',
    isDemo: false,
    timestamp: { $gte: twoHoursAgo }
  });

  // 5. Determine current state
  const currentState = deceptionCount > 0
    ? 'COMPROMISED'
    : (humanRiskScore > 65 ? 'INITIAL_COMPROMISE' : (trustScore < 60 ? 'SUSPICIOUS' : 'NORMAL'));

  const computed = predictThreat({
    currentState,
    behaviorAnomalyScore,
    trustScore,
    humanRiskScore,
    deceptionHit: deceptionCount > 0
  });

  const threatDoc = new ThreatPrediction({
    userId,
    currentState: computed.currentState,
    threatProbability: computed.threatProbability,
    compromiseProbability: computed.compromiseProbability,
    criticalProbability: computed.criticalProbability,
    nextStateDistribution: computed.nextStateDistribution,
    mostLikelyPath: computed.mostLikelyPath,
    criticalNode: computed.criticalNode,
    confidence: computed.confidence,
    isDemo: false,
    timestamp: new Date()
  });

  await threatDoc.save();
  realtimeService.broadcast('threat:update', threatDoc);
  return threatDoc;
}

// GET /api/threats/current/:userId
router.get('/current/:userId', async (req, res, next) => {
  try {
    const userId = req.user.role === 'EMPLOYEE' ? req.user._id : req.params.userId;
    if (req.query.recalculate === 'true') {
      const liveDoc = await computeLiveThreatState(userId);
      return res.json({ threatPrediction: liveDoc, states: STATES });
    }

    let threatDoc = await ThreatPrediction.findOne({ userId }).sort({ timestamp: -1 });
    if (!threatDoc) {
      threatDoc = await computeLiveThreatState(userId);
    }
    return res.json({ threatPrediction: threatDoc, states: STATES });
  } catch (err) {
    next(err);
  }
});

// POST /api/threats/recalculate
router.post('/recalculate', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const threatDoc = await computeLiveThreatState(userId);
    return res.json({ message: 'Threat prediction recomputed successfully', threatPrediction: threatDoc });
  } catch (err) {
    next(err);
  }
});

// POST /api/threats/reset
router.post('/reset', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Flag old simulated deception events so they don't corrupt the operational baseline
    await SecurityEvent.updateMany(
      { userId, sourceLayer: 'INTELLIGENT_DECEPTION' },
      { $set: { isDemo: true } }
    );

    const computed = predictThreat({
      currentState: 'NORMAL',
      behaviorAnomalyScore: 0.05,
      trustScore: 92,
      humanRiskScore: 10,
      deceptionHit: false
    });

    const resetDoc = new ThreatPrediction({
      userId,
      currentState: 'NORMAL',
      threatProbability: computed.threatProbability,
      compromiseProbability: computed.compromiseProbability,
      criticalProbability: computed.criticalProbability,
      nextStateDistribution: computed.nextStateDistribution,
      mostLikelyPath: computed.mostLikelyPath,
      criticalNode: computed.criticalNode,
      confidence: computed.confidence,
      isDemo: false,
      timestamp: new Date()
    });

    await resetDoc.save();
    realtimeService.broadcast('threat:update', resetDoc);

    return res.json({
      message: 'Threat simulation reset to NORMAL (SAFE) operational baseline.',
      threatPrediction: resetDoc
    });
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
