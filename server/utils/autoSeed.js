const bcrypt = require('bcryptjs');
const User = require('../models/User');
const BehaviorProfile = require('../models/BehaviorProfile');
const AttackGraphNode = require('../models/AttackGraphNode');
const AttackGraphEdge = require('../models/AttackGraphEdge');
const DeceptionAsset = require('../models/DeceptionAsset');
const SecurityEvent = require('../models/SecurityEvent');
const Alert = require('../models/Alert');

/**
 * Auto-seeds demo data into the active store (embedded in-memory or Atlas)
 * if no demo users exist.
 */
async function autoSeedDatabase(force = false) {
  try {
    const cisoUser = await User.findOne({ email: 'ciso@neuroshield.local' });
    if (cisoUser && !force) {
      return { seeded: false, reason: 'Database already contains demo user records.' };
    }

    console.log('[AutoSeed] Populating initial NeuroShield security data & demo accounts...');

    // 1. Create Default Users (Password: Password123!)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    const demoAccounts = [
      {
        name: 'Marcus Vance (SOC Admin)',
        email: 'admin@neuroshield.local',
        role: 'ADMIN',
        status: 'ACTIVE',
        isDemo: true
      },
      {
        name: 'Elena Rostova (Lead Threat Analyst)',
        email: 'analyst@neuroshield.local',
        role: 'SECURITY_ANALYST',
        status: 'ACTIVE',
        isDemo: true
      },
      {
        name: 'Dr. Arthur Pendelton (CISO)',
        email: 'ciso@neuroshield.local',
        role: 'ADMIN',
        status: 'ACTIVE',
        isDemo: true
      },
      {
        name: 'Alex Chen (DevOps Lead)',
        email: 'devops@neuroshield.local',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        isDemo: true
      },
      {
        name: 'Sarah Jenkins (Finance Director)',
        email: 'finance@neuroshield.local',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        isDemo: true
      },
      {
        name: 'David Miller (Suspicious Insider - Flagged)',
        email: 'insider@neuroshield.local',
        role: 'EMPLOYEE',
        status: 'SUSPENDED',
        isDemo: true
      },
      {
        name: 'Rachel Adams (Compliance Auditor)',
        email: 'auditor@neuroshield.local',
        role: 'AUDITOR',
        status: 'ACTIVE',
        isDemo: true
      },
      {
        name: 'Jane Doe (Corporate Employee)',
        email: 'employee@neuroshield.local',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        isDemo: true
      }
    ];

    const seededUsers = {};
    for (const acc of demoAccounts) {
      let user = await User.findOne({ email: acc.email });
      if (!user) {
        user = await User.create({
          ...acc,
          passwordHash
        });
      } else if (force) {
        user.name = acc.name;
        user.role = acc.role;
        user.status = acc.status;
        user.passwordHash = passwordHash;
        await user.save();
      }
      seededUsers[acc.email] = user;
    }

    const adminUser = seededUsers['admin@neuroshield.local'];
    const employeeUser = seededUsers['employee@neuroshield.local'];
    const insiderUser = seededUsers['insider@neuroshield.local'];
    const devopsUser = seededUsers['devops@neuroshield.local'];

    // 2. Behavioral Baseline Profiles for Demo Roles
    if (employeeUser) {
      const existingProf = await BehaviorProfile.findOne({ userId: employeeUser._id });
      if (!existingProf) {
        await BehaviorProfile.create({
          userId: employeeUser._id,
          baselineFeatures: {
            typingSpeed: 60,
            typingInterval: 120,
            mouseVelocity: 450,
            mouseAccel: 80,
            clickDelay: 180,
            scrollVelocity: 300,
            sessionHour: 14
          },
          featureVariances: {
            typingSpeed: 15,
            typingInterval: 30,
            mouseVelocity: 100,
            mouseAccel: 25,
            clickDelay: 40,
            scrollVelocity: 80,
            sessionHour: 4
          },
          anomalyThreshold: 0.65,
          modelConfidence: 0.92,
          sampleCount: 200,
          isDemo: true
        });
      }
    }

    // Suspicious Insider with anomalous baseline
    if (insiderUser) {
      const existingInsiderProf = await BehaviorProfile.findOne({ userId: insiderUser._id });
      if (!existingInsiderProf) {
        await BehaviorProfile.create({
          userId: insiderUser._id,
          baselineFeatures: {
            typingSpeed: 175,
            typingInterval: 25,
            mouseVelocity: 1450,
            mouseAccel: 450,
            clickDelay: 20,
            scrollVelocity: 1800,
            sessionHour: 3
          },
          featureVariances: {
            typingSpeed: 40,
            typingInterval: 15,
            mouseVelocity: 350,
            mouseAccel: 150,
            clickDelay: 20,
            scrollVelocity: 400,
            sessionHour: 2
          },
          anomalyThreshold: 0.40,
          modelConfidence: 0.95,
          sampleCount: 350,
          isDemo: true
        });
      }
    }

    // DevOps Fast-Paced Technical Profile
    if (devopsUser) {
      const existingDevOpsProf = await BehaviorProfile.findOne({ userId: devopsUser._id });
      if (!existingDevOpsProf) {
        await BehaviorProfile.create({
          userId: devopsUser._id,
          baselineFeatures: {
            typingSpeed: 95,
            typingInterval: 85,
            mouseVelocity: 680,
            mouseAccel: 140,
            clickDelay: 120,
            scrollVelocity: 650,
            sessionHour: 16
          },
          featureVariances: {
            typingSpeed: 20,
            typingInterval: 20,
            mouseVelocity: 150,
            mouseAccel: 35,
            clickDelay: 30,
            scrollVelocity: 120,
            sessionHour: 3
          },
          anomalyThreshold: 0.60,
          modelConfidence: 0.90,
          sampleCount: 280,
          isDemo: true
        });
      }
    }

    // 3. Attack Graph Nodes & Edges
    const nodes = [
      { nodeId: 'N-USER', nodeType: 'USER', name: 'Employee Identity', risk: 25, status: 'SAFE', isDemo: true },
      { nodeId: 'N-INIT', nodeType: 'INITIAL_ACCESS', name: 'Workstation Gateway', risk: 35, status: 'SAFE', isDemo: true },
      { nodeId: 'N-END', nodeType: 'ENDPOINT', name: 'Local Desktop Endpoint', risk: 45, status: 'SUSPICIOUS', isDemo: true },
      { nodeId: 'N-CRED', nodeType: 'CREDENTIAL', name: 'Domain Cache Credentials', risk: 65, status: 'SUSPICIOUS', isDemo: true },
      { nodeId: 'N-LAT', nodeType: 'LATERAL_ASSET', name: 'Internal App Server', risk: 75, status: 'SAFE', isDemo: true },
      { nodeId: 'N-PRIV', nodeType: 'PRIVILEGE_ASSET', name: 'Domain Controller Admin', risk: 85, status: 'SAFE', isDemo: true },
      { nodeId: 'N-CRIT', nodeType: 'CRITICAL_ASSET', name: 'Production Database Vault', risk: 95, status: 'SAFE', isDemo: true }
    ];
    for (const node of nodes) {
      const exists = await AttackGraphNode.findOne({ nodeId: node.nodeId });
      if (!exists) await AttackGraphNode.create(node);
    }

    const edges = [
      { edgeId: 'E1', source: 'N-USER', target: 'N-INIT', probability: 0.85, vulnerability: 'Phishing [T1566]', isDemo: true },
      { edgeId: 'E2', source: 'N-INIT', target: 'N-END', probability: 0.70, vulnerability: 'Remote Code Exec [T1059]', isDemo: true },
      { edgeId: 'E3', source: 'N-END', target: 'N-CRED', probability: 0.65, vulnerability: 'LSASS Memory Dump [T1003]', isDemo: true },
      { edgeId: 'E4', source: 'N-CRED', target: 'N-LAT', probability: 0.50, vulnerability: 'Pass-the-Hash [T1550]', isDemo: true },
      { edgeId: 'E5', source: 'N-LAT', target: 'N-PRIV', probability: 0.40, vulnerability: 'Kerberoasting [T1558]', isDemo: true },
      { edgeId: 'E6', source: 'N-PRIV', target: 'N-CRIT', probability: 0.30, vulnerability: 'Admin Exfiltration [T1048]', isDemo: true }
    ];
    for (const edge of edges) {
      const exists = await AttackGraphEdge.findOne({ edgeId: edge.edgeId });
      if (!exists) await AttackGraphEdge.create(edge);
    }

    // 4. Deception Assets
    const decoys = [
      { assetId: 'DEC-001', name: 'Admin SSH Key Honeytoken', type: 'HONEYTOKEN', location: '/etc/security/id_rsa_backup', status: 'ARMED', isDemo: true },
      { assetId: 'DEC-002', name: 'Decoy SQL Database Port', type: 'HONEYPOT', location: 'Port 54322 (Internal Decoy)', status: 'ARMED', isDemo: true },
      { assetId: 'DEC-003', name: 'Canary Cloud API Token', type: 'DECOY', location: 'env/aws_dev_credentials.json', status: 'ARMED', isDemo: true }
    ];
    for (const decoy of decoys) {
      const exists = await DeceptionAsset.findOne({ assetId: decoy.assetId });
      if (!exists) await DeceptionAsset.create(decoy);
    }

    // 5. Initial Security Event & Low Baseline Alert
    if (adminUser) {
      const existingEv = await SecurityEvent.findOne({ eventType: 'SYSTEM_INITIALIZATION' });
      if (!existingEv) {
        await SecurityEvent.create({
          eventType: 'SYSTEM_INITIALIZATION',
          severity: 'LOW',
          sourceLayer: 'ADAPTIVE_TRUST',
          userId: adminUser._id,
          description: 'NeuroShield 5-Layer Security Grid initialized in active defense state.',
          isDemo: true
        });
      }
    }

    console.log('[AutoSeed] Auto-seed complete. Demo credentials ready (Password123!).');
    return { seeded: true };
  } catch (err) {
    console.error('[AutoSeed] Error during auto-seeding:', err.message);
    return { seeded: false, error: err.message };
  }
}

module.exports = {
  autoSeedDatabase
};
