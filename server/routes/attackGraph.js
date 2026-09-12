const express = require('express');
const router = express.Router();
const AttackGraphNode = require('../models/AttackGraphNode');
const AttackGraphEdge = require('../models/AttackGraphEdge');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/attack-graph/nodes
router.get('/nodes', async (req, res, next) => {
  try {
    let nodes = await AttackGraphNode.find();
    if (nodes.length === 0) {
      // Default fallback graph nodes if empty
      nodes = [
        { nodeId: 'N-USER', nodeType: 'USER', name: 'Employee Identity', risk: 25, status: 'SAFE' },
        { nodeId: 'N-INIT', nodeType: 'INITIAL_ACCESS', name: 'Workstation Gateway', risk: 35, status: 'SAFE' },
        { nodeId: 'N-END', nodeType: 'ENDPOINT', name: 'Local Desktop Endpoint', risk: 45, status: 'SUSPICIOUS' },
        { nodeId: 'N-CRED', nodeType: 'CREDENTIAL', name: 'Domain Cache Credentials', risk: 65, status: 'SUSPICIOUS' },
        { nodeId: 'N-LAT', nodeType: 'LATERAL_ASSET', name: 'Internal App Server', risk: 75, status: 'SAFE' },
        { nodeId: 'N-PRIV', nodeType: 'PRIVILEGE_ASSET', name: 'Domain Controller Admin', risk: 85, status: 'SAFE' },
        { nodeId: 'N-CRIT', nodeType: 'CRITICAL_ASSET', name: 'Production Database Vault', risk: 95, status: 'SAFE' }
      ];
    }
    return res.json({ nodes });
  } catch (err) {
    next(err);
  }
});

// GET /api/attack-graph/edges
router.get('/edges', async (req, res, next) => {
  try {
    let edges = await AttackGraphEdge.find();
    if (edges.length === 0) {
      edges = [
        { edgeId: 'E1', source: 'N-USER', target: 'N-INIT', probability: 0.85, vulnerability: 'Phishing / Weak Credential' },
        { edgeId: 'E2', source: 'N-INIT', target: 'N-END', probability: 0.70, vulnerability: 'Endpoint Execution' },
        { edgeId: 'E3', source: 'N-END', target: 'N-CRED', probability: 0.65, vulnerability: 'LSASS Memory Dump' },
        { edgeId: 'E4', source: 'N-CRED', target: 'N-LAT', probability: 0.50, vulnerability: 'Pass-the-Hash Lateral Movement' },
        { edgeId: 'E5', source: 'N-LAT', target: 'N-PRIV', probability: 0.40, vulnerability: 'Kerberoasting Privilege Escalation' },
        { edgeId: 'E6', source: 'N-PRIV', target: 'N-CRIT', probability: 0.30, vulnerability: 'Domain Admin Data Exfiltration' }
      ];
    }
    return res.json({ edges });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
