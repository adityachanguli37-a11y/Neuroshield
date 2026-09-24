const express = require('express');
const router = express.Router();
const HumanRisk = require('../models/HumanRisk');
const TrustScore = require('../models/TrustScore');
const BehaviorEvent = require('../models/BehaviorEvent');
const SecurityEvent = require('../models/SecurityEvent');
const Alert = require('../models/Alert');
const { evaluateHumanRisk } = require('../engines/humanRisk');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

async function computeLiveHumanRisk(userId) {
  // 1. Fetch latest trust score
  const latestTrust = await TrustScore.findOne({ userId }).sort({ timestamp: -1 });
  const trustScore = latestTrust ? latestTrust.overallTrust : 85;

  // 2. Fetch locked Behavior Profile & latest behavior event
  const BehaviorProfile = require('../models/BehaviorProfile');
  const profile = await BehaviorProfile.findOne({ userId });
  const latestBehavior = await BehaviorEvent.findOne({ userId }).sort({ timestamp: -1 });

  let behaviorAnomalyScore = 0.05;
  if (profile && profile.latestAnomalyScore !== undefined) {
    behaviorAnomalyScore = profile.latestAnomalyScore;
  } else if (latestBehavior && latestBehavior.anomalyScore !== undefined) {
    behaviorAnomalyScore = latestBehavior.anomalyScore;
  }

  // 3. Count non-demo high/critical security alerts
  const alertQuery = {
    status: { $in: ['OPEN', 'INVESTIGATING', 'NEW', 'ACKNOWLEDGED'] },
    severity: { $in: ['HIGH', 'CRITICAL'] },
    isDemo: false
  };
  if (userId) alertQuery.userId = userId;
  const activeAlertCount = await Alert.countDocuments(alertQuery);

  // 4. Count recent non-demo deception trap triggers in the last 2 hours
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const deceptionCount = await SecurityEvent.countDocuments({
    userId,
    sourceLayer: 'INTELLIGENT_DECEPTION',
    isDemo: false,
    timestamp: { $gte: twoHoursAgo }
  });

  const inputs = {
    behaviorAnomalyScore,
    trustScore,
    recentAlertCount: activeAlertCount,
    deceptionTriggers: deceptionCount,
    failedAuthAttempts: 0,
    offHours: false
  };

  const computed = evaluateHumanRisk(inputs);
  const riskDoc = new HumanRisk({
    userId,
    ...computed,
    timestamp: new Date()
  });
  await riskDoc.save();
  return riskDoc;
}

// GET /api/human-risk/current/:userId
router.get('/current/:userId', async (req, res, next) => {
  try {
    const userId = req.user.role === 'EMPLOYEE' ? req.user._id : req.params.userId;
    if (req.query.recalculate === 'true') {
      const liveDoc = await computeLiveHumanRisk(userId);
      return res.json({ humanRisk: liveDoc });
    }

    let riskDoc = await HumanRisk.findOne({ userId }).sort({ timestamp: -1 });
    if (!riskDoc) {
      riskDoc = await computeLiveHumanRisk(userId);
    }
    return res.json({ humanRisk: riskDoc });
  } catch (err) {
    next(err);
  }
});

// POST /api/human-risk/recalculate
router.post('/recalculate', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const riskDoc = await computeLiveHumanRisk(userId);
    return res.json({ message: 'Human risk re-evaluated successfully', humanRisk: riskDoc });
  } catch (err) {
    next(err);
  }
});

// POST /api/human-risk/reset
router.post('/reset', async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Resolve open alerts
    await Alert.updateMany(
      { status: { $in: ['OPEN', 'INVESTIGATING'] } },
      { $set: { status: 'RESOLVED', resolutionNotes: 'Incidents resolved and human risk reset by SOC Admin.' } }
    );

    // Reset TrustScore back to high baseline
    const { calculateTrust } = require('../engines/trust');
    const trustEval = calculateTrust({ behaviorScore: 95, deviceScore: 90, locationScore: 90, networkScore: 90, timeScore: 95 });
    const resetTrust = new TrustScore({
      userId,
      ...trustEval,
      timestamp: new Date()
    });
    await resetTrust.save();

    // Reset HumanRisk back to low baseline
    const cleanRisk = evaluateHumanRisk({
      behaviorAnomalyScore: 0.02,
      trustScore: 92.5,
      recentAlertCount: 0,
      deceptionTriggers: 0,
      failedAuthAttempts: 0
    });

    const resetRiskDoc = new HumanRisk({
      userId,
      ...cleanRisk,
      timestamp: new Date()
    });
    await resetRiskDoc.save();

    return res.json({
      message: 'Security incident state reset and human risk restored to baseline.',
      humanRisk: resetRiskDoc,
      trustScore: resetTrust
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/human-risk/evaluate
router.post('/evaluate', async (req, res, next) => {
  try {
    const inputs = req.body;
    const computed = evaluateHumanRisk(inputs);

    const riskDoc = new HumanRisk({
      userId: req.user._id,
      ...computed,
      timestamp: new Date()
    });
    await riskDoc.save();

    return res.json({ humanRisk: riskDoc });
  } catch (err) {
    next(err);
  }
});

// GET /api/human-risk/factors
router.get('/factors', async (req, res, next) => {
  try {
    const latest = await HumanRisk.findOne({ userId: req.user._id }).sort({ timestamp: -1 });
    return res.json({
      contributingFactors: latest ? latest.contributingFactors : [],
      recommendation: latest ? latest.recommendation : 'No risk factors logged.'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
