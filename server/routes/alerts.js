const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const alertService = require('../services/alertService');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/alerts
router.get('/', async (req, res, next) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(100);
    return res.json({ alerts });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/acknowledge
router.post('/:id/acknowledge', authorize('ADMIN', 'SECURITY_ANALYST'), async (req, res, next) => {
  try {
    const updated = await alertService.acknowledgeAlert(req.params.id, req.user._id);

    try {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'ALERT_ACKNOWLEDGED',
        resource: 'Alert',
        resourceId: req.params.id
      });
    } catch (e) {}

    return res.json({ message: 'Alert acknowledged', alert: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts/:id/resolve
router.post('/:id/resolve', authorize('ADMIN', 'SECURITY_ANALYST'), async (req, res, next) => {
  try {
    const updated = await alertService.resolveAlert(req.params.id, req.user._id);

    try {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'ALERT_RESOLVED',
        resource: 'Alert',
        resourceId: req.params.id
      });
    } catch (e) {}

    return res.json({ message: 'Alert resolved', alert: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
