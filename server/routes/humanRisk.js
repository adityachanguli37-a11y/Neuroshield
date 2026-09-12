const express = require('express');
const router = express.Router();
const HumanRisk = require('../models/HumanRisk');
const { evaluateHumanRisk } = require('../engines/humanRisk');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/human-risk/current/:userId
router.get('/current/:userId', async (req, res, next) => {
  try {
    let riskDoc = await HumanRisk.findOne({ userId: req.params.userId }).sort({ timestamp: -1 });
    if (!riskDoc) {
      const computed = evaluateHumanRisk({});
      riskDoc = {
        userId: req.params.userId,
        ...computed,
        timestamp: new Date()
      };
    }
    return res.json({ humanRisk: riskDoc });
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
