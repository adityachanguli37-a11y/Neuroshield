const express = require('express');
const router = express.Router();
const SecurityEvent = require('../models/SecurityEvent');
const Alert = require('../models/Alert');
const TrustScore = require('../models/TrustScore');
const HumanRisk = require('../models/HumanRisk');
const ThreatSimulation = require('../models/ThreatSimulation');
const DeceptionEvent = require('../models/DeceptionEvent');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// GET /api/reports/summary
router.get('/summary', async (req, res, next) => {
  try {
    const isEmployee = req.user.role === 'EMPLOYEE';
    const filter = isEmployee ? { userId: req.user._id } : {};

    const totalEvents = await SecurityEvent.countDocuments(filter);
    const activeAlerts = await Alert.countDocuments({
      ...filter,
      status: { $in: ['NEW', 'ACKNOWLEDGED'] }
    });
    const latestTrust = await TrustScore.findOne(filter).sort({ timestamp: -1 })
      || (!isEmployee ? await TrustScore.findOne().sort({ timestamp: -1 }) : null);
    const latestRisk = await HumanRisk.findOne(filter).sort({ timestamp: -1 })
      || (!isEmployee ? await HumanRisk.findOne().sort({ timestamp: -1 }) : null);
    const latestSim = await ThreatSimulation.findOne(filter).sort({ timestamp: -1 })
      || await ThreatSimulation.findOne().sort({ timestamp: -1 });
    const totalDeceptions = await DeceptionEvent.countDocuments(filter);

    return res.json({
      summary: {
        totalEvents,
        activeAlerts,
        overallTrustScore: latestTrust ? latestTrust.overallTrust : 85,
        trustLevel: latestTrust ? latestTrust.trustLevel : 'HIGH TRUST',
        humanRiskScore: latestRisk ? latestRisk.riskScore : 20,
        riskCategory: latestRisk ? latestRisk.category : 'LOW',
        latestSimulationId: latestSim ? latestSim.simulationId : 'N/A',
        compromiseProbability: latestSim ? latestSim.results.compromiseProbability : 0.05,
        totalDeceptionEvents: totalDeceptions,
        isEmployeeView: isEmployee
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/export/csv - Download security audit CSV
router.get('/export/csv', authorize('ADMIN', 'SECURITY_ANALYST', 'AUDITOR'), async (req, res, next) => {
  try {
    const events = await SecurityEvent.find().sort({ timestamp: -1 }).limit(200);

    let csvContent = 'Timestamp,Event Type,Severity,Source Layer,Description,Trust Score,Risk Score\n';

    events.forEach(e => {
      const ts = new Date(e.timestamp).toISOString();
      const desc = `"${(e.description || '').replace(/"/g, '""')}"`;
      csvContent += `${ts},${e.eventType},${e.severity},${e.sourceLayer},${desc},${e.trustScore || 'N/A'},${e.riskScore || 'N/A'}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="neuroshield-security-report.csv"');
    return res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/export/json - Complete Zero-Trust System Audit Snapshot
router.get('/export/json', authorize('ADMIN', 'SECURITY_ANALYST', 'AUDITOR'), async (req, res, next) => {
  try {
    const events = await SecurityEvent.find().sort({ timestamp: -1 }).limit(100);
    const alerts = await Alert.find().sort({ createdAt: -1 }).limit(50);
    const latestTrust = await TrustScore.findOne().sort({ timestamp: -1 });
    const latestRisk = await HumanRisk.findOne().sort({ timestamp: -1 });
    const latestSim = await ThreatSimulation.findOne().sort({ timestamp: -1 });

    const auditSnapshot = {
      system: 'NeuroShield Continuous Adaptive Security System',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      complianceStandard: 'NIST SP 800-207 Zero Trust Architecture (ZTA)',
      layers: {
        layer1_behavioral: { active: true, algorithm: 'K-Means + One-Class SVM + Random Forest' },
        layer2_adaptiveTrust: { active: true, currentTrust: latestTrust ? latestTrust.overallTrust : 85, level: latestTrust ? latestTrust.trustLevel : 'HIGH' },
        layer3_humanRisk: { active: true, riskScore: latestRisk ? latestRisk.riskScore : 20, category: latestRisk ? latestRisk.category : 'LOW' },
        layer4_threatSimulation: { active: true, compromiseProb: latestSim ? latestSim.results.compromiseProbability : 0.05 },
        layer5_intelligentDeception: { active: true, status: 'ARMED' }
      },
      metricsSummary: {
        totalSecurityEvents: events.length,
        totalAlerts: alerts.length
      },
      securityEvents: events,
      priorityAlerts: alerts
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="neuroshield-zta-audit.json"');
    return res.json(auditSnapshot);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
