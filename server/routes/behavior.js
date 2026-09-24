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
    const { telemetry, deviceMetadata, lockProfile } = req.body;
    const userId = req.user._id;

    let profile = await BehaviorProfile.findOne({ userId });

    // For the first time, take the telemetry and lock it in the database unless the user changes it
    const isFirstTime = !profile || !profile.isLocked;

    if (!profile) {
      profile = new BehaviorProfile({
        userId,
        baselineFeatures: {
          typingSpeed: (telemetry && telemetry.typingSpeed) || 60,
          typingInterval: (telemetry && telemetry.typingInterval) || 120,
          mouseVelocity: (telemetry && telemetry.mouseVelocity) || 450,
          mouseAccel: (telemetry && telemetry.mouseAccel) || 80,
          clickDelay: (telemetry && telemetry.clickDelay) || 180,
          scrollVelocity: (telemetry && telemetry.scrollVelocity) || 300,
          sessionHour: (telemetry && typeof telemetry.sessionHour === 'number') ? telemetry.sessionHour : new Date().getHours()
        },
        isLocked: true,
        lockedAt: new Date(),
        anomalyThreshold: 0.65,
        modelConfidence: 0.90,
        sampleCount: 1
      });
    } else if (isFirstTime || lockProfile) {
      if (telemetry) {
        if (telemetry.typingSpeed) profile.baselineFeatures.typingSpeed = telemetry.typingSpeed;
        if (telemetry.typingInterval) profile.baselineFeatures.typingInterval = telemetry.typingInterval;
        if (telemetry.mouseVelocity) profile.baselineFeatures.mouseVelocity = telemetry.mouseVelocity;
        if (telemetry.mouseAccel) profile.baselineFeatures.mouseAccel = telemetry.mouseAccel;
        if (telemetry.clickDelay) profile.baselineFeatures.clickDelay = telemetry.clickDelay;
        if (telemetry.scrollVelocity) profile.baselineFeatures.scrollVelocity = telemetry.scrollVelocity;
        if (typeof telemetry.sessionHour === 'number') profile.baselineFeatures.sessionHour = telemetry.sessionHour;
      }
      profile.isLocked = true;
      profile.lockedAt = new Date();
    }

    const result = evaluateBehavior(telemetry || {}, profile);

    // Save latest telemetry and evaluation in locked profile
    profile.latestTelemetry = telemetry || {};
    profile.latestBehaviorScore = result.behaviorScore;
    profile.latestAnomalyScore = result.anomalyScore;
    profile.latestClassification = result.classification;
    await profile.save();

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

    // Trigger feedback loop
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
          classification: result.classification,
          isLocked: profile.isLocked
        }
      });
    } else {
      // Affirm genuine identity in feedback loop to restore Adaptive Trust and lower Human Risk
      await securityEventService.processEvent({
        eventType: 'BEHAVIORAL_IDENTITY_VERIFIED',
        severity: 'LOW',
        sourceLayer: 'BEHAVIORAL_IDENTITY',
        userId,
        description: `Behavioral identity verified against locked baseline (Score: ${result.behaviorScore}/100, Anomaly: ${result.anomalyScore}).`,
        metadata: {
          anomalyScore: result.anomalyScore,
          behaviorScore: result.behaviorScore,
          classification: 'GENUINE',
          isLocked: profile.isLocked
        }
      });
    }

    return res.json({
      message: 'Behavioral telemetry processed against locked baseline profile',
      evaluation: result,
      profileLocked: profile.isLocked,
      isLocked: profile.isLocked,
      profile: {
        baselineFeatures: profile.baselineFeatures,
        isLocked: profile.isLocked,
        lockedAt: profile.lockedAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/behavior/profile - Calibrate and lock personal baseline profile
router.post('/profile', async (req, res, next) => {
  try {
    const targetUserId = (req.user.role === 'EMPLOYEE') ? req.user._id : (req.body.userId || req.user._id);
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
        isLocked: true,
        lockedAt: new Date(),
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
      // If typing speed or pointer movement changes, lock the profile in database
      profile.isLocked = true;
      profile.lockedAt = new Date();
      profile.sampleCount = (profile.sampleCount || 0) + 1;
      profile.modelConfidence = Math.min(0.99, Number(((profile.modelConfidence || 0.85) + 0.02).toFixed(2)));
    }

    await profile.save();

    return res.json({
      message: 'Personal biometric baseline profile calibrated and locked successfully',
      isLocked: profile.isLocked,
      baselineFeatures: profile.baselineFeatures,
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
        sampleCount: 50,
        isLocked: false,
        lockedAt: null
      };
    }
    return res.json({
      profile,
      isLocked: profile.isLocked,
      baselineFeatures: profile.baselineFeatures
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/behavior/profile/:userId
router.get('/profile/:userId', authorize('ADMIN', 'SECURITY_ANALYST', 'EMPLOYEE'), async (req, res, next) => {
  try {
    const targetUserId = req.user.role === 'EMPLOYEE' ? req.user._id : req.params.userId;
    let profile = await BehaviorProfile.findOne({ userId: targetUserId });
    if (!profile) {
      profile = {
        userId: targetUserId,
        baselineFeatures: { typingSpeed: 60, typingInterval: 120, mouseVelocity: 450, mouseAccel: 80, clickDelay: 180, scrollVelocity: 300, sessionHour: 14 },
        anomalyThreshold: 0.65,
        modelConfidence: 0.85,
        sampleCount: 50,
        isLocked: false,
        lockedAt: null
      };
    }
    return res.json({
      profile,
      isLocked: profile.isLocked,
      baselineFeatures: profile.baselineFeatures
    });
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
