const express = require('express');
const router = express.Router();
const DeceptionAsset = require('../models/DeceptionAsset');
const DeceptionEvent = require('../models/DeceptionEvent');
const { processDeceptionTrigger } = require('../engines/deception');
const securityEventService = require('../services/securityEventService');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/deception/assets
router.get('/assets', async (req, res, next) => {
  try {
    const assets = await DeceptionAsset.find().sort({ createdAt: -1 });
    return res.json({ assets });
  } catch (err) {
    next(err);
  }
});

// POST /api/deception/assets - Create deception asset
router.post('/assets', authorize('ADMIN', 'SECURITY_ANALYST'), async (req, res, next) => {
  try {
    const { name, type, location, metadata } = req.body;
    const assetId = `DEC-${Date.now()}`;

    const asset = new DeceptionAsset({
      assetId,
      name,
      type: type || 'HONEYTOKEN',
      location,
      metadata: metadata || {}
    });

    await asset.save();
    return res.status(201).json({ message: 'Deception asset created', asset });
  } catch (err) {
    next(err);
  }
});

// POST /api/deception/trigger - Trigger deception trap
router.post('/trigger', async (req, res, next) => {
  try {
    const { assetId, ipAddress, userAgent, payloadAttempted } = req.body;

    let asset = await DeceptionAsset.findOne({ assetId });
    if (!asset) {
      asset = { assetId: assetId || 'DEC-001', name: 'Trapped Honeytoken', type: 'HONEYTOKEN', location: '/admin/db_passwords.txt' };
    } else {
      asset.status = 'TRIGGERED';
      asset.triggerCount = (asset.triggerCount || 0) + 1;
      await asset.save();
    }

    const deceptionEval = processDeceptionTrigger(asset, {
      userId: req.user._id,
      ipAddress: ipAddress || req.ip,
      userAgent: userAgent || req.get('User-Agent'),
      payloadAttempted: payloadAttempted || 'Attempted access to decoy asset'
    });

    const dEvent = new DeceptionEvent({
      assetId: asset.assetId,
      userId: req.user._id,
      eventType: deceptionEval.eventType,
      severity: deceptionEval.severity,
      metadata: deceptionEval.metadata
    });
    await dEvent.save();

    // Feedback Loop Execution
    const pipelineResult = await securityEventService.processEvent({
      eventType: deceptionEval.eventType,
      severity: deceptionEval.severity,
      sourceLayer: 'INTELLIGENT_DECEPTION',
      userId: req.user._id,
      description: deceptionEval.description,
      metadata: deceptionEval.metadata
    });

    return res.json({
      message: 'Deception trap triggered',
      deceptionEvent: dEvent,
      feedbackLoopResult: pipelineResult
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/deception/events
router.get('/events', async (req, res, next) => {
  try {
    const events = await DeceptionEvent.find().sort({ timestamp: -1 }).limit(50);
    return res.json({ events });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
