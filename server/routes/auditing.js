const express = require('express');
const router = express.Router();
const systemAuditor = require('../services/systemAuditorService');
const fimService = require('../services/fimService');
const networkAuditor = require('../services/networkAuditorService');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/auditing/system - System resource and host telemetry
router.get('/system', (req, res) => {
  const metrics = systemAuditor.getMetrics();
  return res.json({ metrics });
});

// GET /api/auditing/fim - File Integrity Monitor canary status
router.get('/fim', (req, res) => {
  const status = fimService.getStatus();
  return res.json({ fim: status });
});

// GET /api/auditing/network - Network socket & DNS resolution audit
router.get('/network', async (req, res) => {
  const audit = networkAuditor.getAudit();
  return res.json({ audit });
});

// POST /api/auditing/fim/touch-canary - Test canary tripwire trigger
router.post('/fim/touch-canary', authorize('ADMIN', 'SECURITY_ANALYST'), (req, res) => {
  const status = fimService.getStatus();
  if (status.canaryFiles.length > 0) {
    const target = status.canaryFiles[0];
    fimService._handleFileChange('change', target.name);
    return res.json({ message: `Canary tripwire triggered for ${target.name}`, target });
  }
  return res.status(404).json({ message: 'No canary files available to trip.' });
});

module.exports = router;
