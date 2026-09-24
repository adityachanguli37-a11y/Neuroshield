const express = require('express');
const router = express.Router();
const ThreatSimulation = require('../models/ThreatSimulation');
const TrustScore = require('../models/TrustScore');
const HumanRisk = require('../models/HumanRisk');
const ThreatPrediction = require('../models/ThreatPrediction');
const BehaviorProfile = require('../models/BehaviorProfile');
const Alert = require('../models/Alert');
const simulationService = require('../services/simulationService');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateSimulationParams } = require('../middleware/validation');
const { simulationLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

// GET /api/simulations/live-context - Fetch active platform operational context
router.get('/live-context', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const trustDoc = await TrustScore.findOne({ userId }).sort({ timestamp: -1 });
    const riskDoc = await HumanRisk.findOne({ userId }).sort({ timestamp: -1 });
    const threatDoc = await ThreatPrediction.findOne({ userId }).sort({ timestamp: -1 });
    const profile = await BehaviorProfile.findOne({ userId });
    const openAlerts = await Alert.countDocuments({ status: { $in: ['OPEN', 'INVESTIGATING'] }, isDemo: false });

    return res.json({
      operator: req.user.name || 'SOC Operator',
      role: req.user.role || 'USER',
      trustScore: trustDoc ? trustDoc.overallTrust : 95,
      trustLevel: trustDoc ? trustDoc.trustLevel : 'HIGH TRUST',
      riskScore: riskDoc ? riskDoc.riskScore : 1,
      riskCategory: riskDoc ? riskDoc.category : 'LOW',
      currentState: threatDoc ? threatDoc.currentState : 'NORMAL',
      openAlerts,
      profileConfigured: !!profile
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/simulations/run - Execute complete 10-step NeuroShield simulation on CURRENT system state (Available to all users)
router.post('/run', simulationLimiter, validateSimulationParams, async (req, res, next) => {
  try {
    const { iterations, userId, telemetry } = req.body;

    const result = await simulationService.runCompleteSimulation({
      iterations: iterations || 1000,
      userId: userId || req.user._id,
      telemetry
    });

    return res.json({
      message: 'NeuroShield simulation executed on live system state successfully',
      simulationId: result.simulationId,
      results: result.results
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/simulations/history - Available to all users
router.get('/history', async (req, res, next) => {
  try {
    const simulations = await ThreatSimulation.find().sort({ timestamp: -1 }).limit(20);
    return res.json({ simulations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
