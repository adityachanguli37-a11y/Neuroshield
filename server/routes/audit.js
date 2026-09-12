const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/audit - List append-only audit trail logs (ADMIN, SECURITY_ANALYST, AUDITOR only)
router.get('/', authorize('ADMIN', 'SECURITY_ANALYST', 'AUDITOR'), async (req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ timestamp: -1 }).limit(100);
    return res.json({ logs });
  } catch (err) {
    next(err);
  }
});

// NOTE: No UPDATE or DELETE endpoints provided to strictly enforce append-only security policy.

module.exports = router;
