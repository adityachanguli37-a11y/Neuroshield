const express = require('express');
const router = express.Router();
const ThreatSimulation = require('../models/ThreatSimulation');
const simulationService = require('../services/simulationService');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validateSimulationParams } = require('../middleware/validation');
const { simulationLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

// POST /api/simulations/run - Execute complete 10-step NeuroShield simulation
router.post('/run', authorize('ADMIN', 'SECURITY_ANALYST'), simulationLimiter, validateSimulationParams, async (req, res, next) => {
  try {
    const { iterations, userId } = req.body;

    const result = await simulationService.runCompleteSimulation({
      iterations: iterations || 1000,
      userId: userId || req.user._id
    });

    return res.json({
      message: 'Complete NeuroShield simulation executed successfully',
      simulationId: result.simulationId,
      results: result.results
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/simulations/history
router.get('/history', authorize('ADMIN', 'SECURITY_ANALYST', 'AUDITOR'), async (req, res, next) => {
  try {
    const simulations = await ThreatSimulation.find().sort({ timestamp: -1 }).limit(20);
    return res.json({ simulations });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
