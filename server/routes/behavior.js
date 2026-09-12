const express = require('express');
const router = express.Router();
const BehaviorProfile = require('../models/BehaviorProfile');
const BehaviorEvent = require('../models/BehaviorEvent');
const { evaluateBehavior } = require('../engines/behavior');
const securityEventService = require('../services/securityEventService');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// POST /api/behavior/telemetry - Receive telemetry and compute ML anomaly score
router.post('/telemetry', async (req, res, next) => {
  try {
    const { telemetry, deviceMetadata } = req.body;
    const userId = req.user._id;

    const profile = await BehaviorProfile.findOne({ userId });
    const result = evaluateBehavior(telemetry || {}, profile);

    const bEvent = new BehaviorEvent({
      userId,
      sessionId: req.body.sessionId || `SESS-${Date.now()}`,
      features: telemetry || {},
      deviceMetadata: deviceMetadata || {},
      anomalyScore: result.anomalyScore,
      classification: result.classification,
      confidence: result.confidence,
      modelScores: {
        kmeansDistance: result.kmeansDistance,
        svmDistance: result.svmDistance,
        rfAnomalyScore: result.rfAnomalyScore
      }
    });

    await bEvent.save();

    // Trigger feedback loop if suspicious/anomalous
    if (result.classification !== 'GENUINE') {
      await securityEventService.processEvent({
        eventType: 'BEHAVIORAL_ANOMALY_DETECTED',
        severity: result.classification === 'ANOMALOUS' ? 'HIGH' : 'MEDIUM',
        sourceLayer: 'BEHAVIORAL_IDENTITY',
        userId,
        description: `Behavioral anomaly detected (${result.classification}). Anomaly Score: ${result.anomalyScore}, Confidence: ${result.confidence}.`,
        metadata: {
          anomalyScore: result.anomalyScore,
          behaviorScore: result.behaviorScore,
          classification: result.classification
        }
      });
    }

    return res.json({
      message: 'Behavioral telemetry processed',
      evaluation: result
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/behavior/profile - Calibrate and update personal baseline profile
router.post('/profile', async (req, res, next) => {
  try {
    const targetUserId = req.body.userId || req.user._id;
    const { baselineFeatures } = req.body;

    let profile = await BehaviorProfile.findOne({ userId: targetUserId });
    if (!profile) {
      profile = new BehaviorProfile({
        userId: targetUserId,
        baselineFeatures: {
          typingSpeed: (baselineFeatures && baselineFeatures.typingSpeed) || 60,
          typingInterval: (baselineFeatures && baselineFeatures.typingInterval) || 120,
          mouseVelocity: (baselineFeatures && baselineFeatures.mouseVelocity) || 450,
          mouseAccel: (baselineFeatures && baselineFeatures.mouseAccel) || 80,
          clickDelay: (baselineFeatures && baselineFeatures.clickDelay) || 180,
          scrollVelocity: (baselineFeatures && baselineFeatures.scrollVelocity) || 300,
          sessionHour: (baselineFeatures && typeof baselineFeatures.sessionHour === 'number') ? baselineFeatures.sessionHour : new Date().getHours()
        },
        anomalyThreshold: 0.65,
        modelConfidence: 0.90,
        sampleCount: 1
      });
    } else {
      if (baselineFeatures) {
        profile.baselineFeatures = {
          typingSpeed: baselineFeatures.typingSpeed || profile.baselineFeatures.typingSpeed,
          typingInterval: baselineFeatures.typingInterval || profile.baselineFeatures.typingInterval,
          mouseVelocity: baselineFeatures.mouseVelocity || profile.baselineFeatures.mouseVelocity,
          mouseAccel: baselineFeatures.mouseAccel || profile.baselineFeatures.mouseAccel,
          clickDelay: baselineFeatures.clickDelay || profile.baselineFeatures.clickDelay,
          scrollVelocity: baselineFeatures.scrollVelocity || profile.baselineFeatures.scrollVelocity,
          sessionHour: typeof baselineFeatures.sessionHour === 'number' ? baselineFeatures.sessionHour : profile.baselineFeatures.sessionHour
        };
      }
      profile.sampleCount = (profile.sampleCount || 0) + 1;
      profile.modelConfidence = Math.min(0.99, Number(((profile.modelConfidence || 0.85) + 0.02).toFixed(2)));
    }

    await profile.save();

    return res.json({
      message: 'Personal biometric baseline profile calibrated successfully',
      profile
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/behavior/profile - Current user profile
router.get('/profile', async (req, res, next) => {
  try {
    let profile = await BehaviorProfile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = {
        userId: req.user._id,
        baselineFeatures: { typingSpeed: 60, typingInterval: 120, mouseVelocity: 450, mouseAccel: 80, clickDelay: 180, scrollVelocity: 300, sessionHour: 14 },
        anomalyThreshold: 0.65,
        modelConfidence: 0.85,
        sampleCount: 50
      };
    }
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/behavior/profile/:userId
router.get('/profile/:userId', authorize('ADMIN', 'SECURITY_ANALYST', 'EMPLOYEE'), async (req, res, next) => {
  try {
    let profile = await BehaviorProfile.findOne({ userId: req.params.userId });
    if (!profile) {
      profile = {
        userId: req.params.userId,
        baselineFeatures: { typingSpeed: 60, typingInterval: 120, mouseVelocity: 450, mouseAccel: 80, clickDelay: 180, scrollVelocity: 300, sessionHour: 14 },
        anomalyThreshold: 0.65,
        modelConfidence: 0.85,
        sampleCount: 50
      };
    }
    return res.json({ profile });
  } catch (err) {
    next(err);
  }
});

// GET /api/behavior/events
router.get('/events', async (req, res, next) => {
  try {
    const query = req.user.role === 'EMPLOYEE' ? { userId: req.user._id } : {};
    const events = await BehaviorEvent.find(query).sort({ timestamp: -1 }).limit(50);
    return res.json({ events });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
