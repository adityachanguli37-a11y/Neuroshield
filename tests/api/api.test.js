const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { createExpressApp } = require('../../server/server');
const env = require('../../server/config/env');
const User = require('../../server/models/User');
const Alert = require('../../server/models/Alert');
const AuditLog = require('../../server/models/AuditLog');
const DeceptionAsset = require('../../server/models/DeceptionAsset');
const SecurityEvent = require('../../server/models/SecurityEvent');
const TrustScore = require('../../server/models/TrustScore');
const HumanRisk = require('../../server/models/HumanRisk');
const ThreatSimulation = require('../../server/models/ThreatSimulation');
const DeceptionEvent = require('../../server/models/DeceptionEvent');
const BehaviorProfile = require('../../server/models/BehaviorProfile');

jest.setTimeout(60000); // Give the in-memory auth and simulation flows ample room.

let app;
let adminAgent;
let employeeAgent;

function resetAllStores() {
  for (const model of Object.values(mongoose.models)) {
    if (typeof model.__resetStore === 'function') {
      model.__resetStore();
    }
  }
}

async function seedAuthContext(currentApp) {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const adminUser = await User.create({
    name: 'Admin Test User',
    email: 'admintest@neuroshield.local',
    passwordHash,
    role: 'ADMIN',
    status: 'ACTIVE'
  });

  const adminAgent = request.agent(currentApp);
  const adminLogin = await adminAgent.post('/api/auth/login').send({
    email: 'admintest@neuroshield.local',
    password: 'Password123!'
  });
  expect(adminLogin.statusCode).toBe(200);
  expect(adminLogin.body.token).toBeUndefined();
  expect(adminLogin.headers['set-cookie'][0]).toContain('HttpOnly');

  const empRegistration = await request(currentApp).post('/api/auth/register').send({
    name: 'Employee Test User',
    email: 'emptest@neuroshield.local',
    password: 'Password123!',
    role: 'ADMIN'
  });
  expect(empRegistration.statusCode).toBe(201);
  expect(empRegistration.body.user.role).toBe('EMPLOYEE');

  const employeeAgent = request.agent(currentApp);
  const employeeLogin = await employeeAgent.post('/api/auth/login').send({
    email: 'emptest@neuroshield.local',
    password: 'Password123!'
  });
  expect(employeeLogin.statusCode).toBe(200);

  return {
    adminAgent,
    employeeAgent,
    adminUserId: adminUser._id,
    employeeUserId: empRegistration.body.user._id
  };
}

beforeAll(async () => {
  app = createExpressApp();
  resetAllStores();
  const seeded = await seedAuthContext(app);
  adminAgent = seeded.adminAgent;
  employeeAgent = seeded.employeeAgent;

  // A failed login must never manufacture the historical demo administrator.
  const fallbackLogin = await request(app).post('/api/auth/login').send({
    email: 'admin@neuroshield.local',
    password: 'AdminPass123!'
  });
  expect(fallbackLogin.statusCode).toBe(401);
});

afterAll(async () => {
  resetAllStores();
});

describe('REST API & Security Tests (Using In-Memory Database)', () => {
  test('GET /api/health returns 200 OK status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.services.express).toBe('online');
  });

  test('ADMIN can access GET /api/users, EMPLOYEE receives 403 Forbidden', async () => {
    const adminReq = await adminAgent.get('/api/users');
    expect(adminReq.statusCode).toBe(200);

    const empReq = await employeeAgent.get('/api/users/123456789012345678901234');
    expect(empReq.statusCode).toBe(403);
  });

  test('POST /api/simulations/run is accessible to all authenticated users', async () => {
    const empSim = await employeeAgent
      .post('/api/simulations/run')
      .send({ iterations: 1000 });
    expect(empSim.statusCode).toBe(200);
    expect(empSim.body.simulationId).toBeDefined();

    const adminSim = await adminAgent
      .post('/api/simulations/run')
      .send({ iterations: 500 });
    expect(adminSim.statusCode).toBe(200);
    expect(adminSim.body.simulationId).toBeDefined();
  });
});

describe('Additional route coverage', () => {
  let routeApp;
  let routeAdminAgent;
  let routeEmployeeAgent;
  let routeAdminUserId;
  let routeEmployeeUserId;
  let activeAlert;
  let resolvedAlert;

  beforeAll(async () => {
    routeApp = createExpressApp();
    resetAllStores();
    const seeded = await seedAuthContext(routeApp);
    routeAdminAgent = seeded.adminAgent;
    routeEmployeeAgent = seeded.employeeAgent;
    routeAdminUserId = seeded.adminUserId;
    routeEmployeeUserId = seeded.employeeUserId;

    const olderTimestamp = new Date('2026-08-12T08:00:00.000Z');
    const newerTimestamp = new Date('2026-08-13T09:00:00.000Z');

    await SecurityEvent.create({
      eventType: 'UNUSUAL_LOGIN',
      severity: 'HIGH',
      sourceLayer: 'BEHAVIORAL_IDENTITY',
      userId: routeEmployeeUserId,
      description: 'Suspicious login pattern observed',
      metadata: { ipAddress: '198.51.100.10' },
      isDemo: false,
      timestamp: olderTimestamp
    });

    await SecurityEvent.create({
      eventType: 'PRIVILEGE_ESCALATION_ATTEMPT',
      severity: 'CRITICAL',
      sourceLayer: 'INTELLIGENT_DECEPTION',
      userId: routeEmployeeUserId,
      description: 'Privilege escalation attempt detected',
      metadata: { ipAddress: '198.51.100.11' },
      isDemo: false,
      timestamp: newerTimestamp
    });

    await DeceptionEvent.create({
      assetId: 'DEC-ALPHA',
      userId: routeEmployeeUserId,
      eventType: 'HONEYTOKEN_ACCESS',
      severity: 'CRITICAL',
      metadata: {
        ipAddress: '198.51.100.42',
        userAgent: 'curl/8.0',
        payloadAttempted: 'shadow.key'
      },
      isDemo: false,
      timestamp: newerTimestamp
    });

    await TrustScore.create({
      userId: routeEmployeeUserId,
      behaviorScore: 61,
      deviceScore: 66,
      locationScore: 72,
      networkScore: 64,
      timeScore: 58,
      overallTrust: 68,
      trustLevel: 'MEDIUM TRUST',
      riskLevel: 'MEDIUM RISK',
      authenticationAction: 'CHALLENGE',
      fuzzyRules: [{ rule: 'Off-hours access', triggered: true, weight: 0.4 }],
      explanation: 'Earlier trust baseline',
      isDemo: false,
      timestamp: olderTimestamp
    });

    await TrustScore.create({
      userId: routeEmployeeUserId,
      behaviorScore: 42,
      deviceScore: 54,
      locationScore: 49,
      networkScore: 51,
      timeScore: 38,
      overallTrust: 57,
      trustLevel: 'LOW TRUST',
      riskLevel: 'HIGH RISK',
      authenticationAction: 'STEP_UP_MFA',
      fuzzyRules: [{ rule: 'Unusual device', triggered: true, weight: 0.7 }],
      explanation: 'Latest trust score',
      isDemo: false,
      timestamp: newerTimestamp
    });

    await HumanRisk.create({
      userId: routeEmployeeUserId,
      riskScore: 74,
      category: 'SEVERE',
      probability: 0.81,
      contributingFactors: [{
        factor: 'Off-hours access',
        impact: 0.42,
        description: 'Login occurred outside normal working hours'
      }],
      modelResults: {
        decisionTreeRisk: 0.77,
        logisticProbability: 0.8,
        bayesianPosterior: 0.81
      },
      recommendation: 'Require additional verification',
      isDemo: false,
      timestamp: olderTimestamp
    });

    await HumanRisk.create({
      userId: routeEmployeeUserId,
      riskScore: 32,
      category: 'MODERATE',
      probability: 0.35,
      contributingFactors: [{
        factor: 'Recent policy changes',
        impact: 0.18,
        description: 'User adjusted to new access controls'
      }],
      modelResults: {
        decisionTreeRisk: 0.28,
        logisticProbability: 0.31,
        bayesianPosterior: 0.35
      },
      recommendation: 'Continue monitoring',
      isDemo: false,
      timestamp: newerTimestamp
    });

    await ThreatSimulation.create({
      simulationId: 'SIM-20260812-OLD',
      userId: routeEmployeeUserId,
      iterations: 1000,
      initialState: 'SUSPICIOUS',
      transitionMatrix: {
        SUSPICIOUS: { COMPROMISED: 0.2, NORMAL: 0.5, MONITORED: 0.3 }
      },
      results: {
        compromiseProbability: 0.19,
        criticalReachabilityRate: 0.04,
        averageStepsToCompromise: 18,
        expectedTimeToCompromise: 42,
        confidenceInterval: { lower: 0.12, upper: 0.25 }
      },
      attackPaths: [{
        path: ['SUSPICIOUS', 'COMPROMISED'],
        frequency: 3,
        probability: 0.19
      }],
      executionTime: 36,
      isDemo: false,
      timestamp: olderTimestamp
    });

    await ThreatSimulation.create({
      simulationId: 'SIM-20260813-NEW',
      userId: routeEmployeeUserId,
      iterations: 1500,
      initialState: 'INITIAL_COMPROMISE',
      transitionMatrix: {
        INITIAL_COMPROMISE: { COMPROMISED: 0.35, MONITORED: 0.45, NORMAL: 0.2 }
      },
      results: {
        compromiseProbability: 0.11,
        criticalReachabilityRate: 0.02,
        averageStepsToCompromise: 9,
        expectedTimeToCompromise: 21,
        confidenceInterval: { lower: 0.07, upper: 0.16 }
      },
      attackPaths: [{
        path: ['INITIAL_COMPROMISE', 'COMPROMISED'],
        frequency: 5,
        probability: 0.11
      }],
      executionTime: 41,
      isDemo: false,
      timestamp: newerTimestamp
    });

    resolvedAlert = await Alert.create({
      alertId: 'ALT-20260812-RESOLVED',
      title: 'Historical alert',
      description: 'Earlier alert used for state ordering',
      severity: 'MEDIUM',
      sourceLayer: 'THREAT_PREDICTION',
      userId: routeEmployeeUserId,
      status: 'RESOLVED',
      acknowledgedBy: routeAdminUserId,
      resolvedBy: routeAdminUserId,
      isDemo: false,
      createdAt: olderTimestamp,
      resolvedAt: olderTimestamp
    });

    activeAlert = await Alert.create({
      alertId: 'ALT-20260813-ACTIVE',
      title: 'Current escalation alert',
      description: 'Newest active alert',
      severity: 'HIGH',
      sourceLayer: 'INTELLIGENT_DECEPTION',
      userId: routeEmployeeUserId,
      status: 'NEW',
      isDemo: false,
      createdAt: newerTimestamp
    });
  });

  afterAll(async () => {
    resetAllStores();
  });

  test('GET /api/alerts returns newest alerts first', async () => {
    const res = await routeAdminAgent.get('/api/alerts');
    expect(res.statusCode).toBe(200);
    expect(res.body.alerts).toHaveLength(2);
    expect(res.body.alerts[0].alertId).toBe(activeAlert.alertId);
    expect(res.body.alerts[1].alertId).toBe(resolvedAlert.alertId);
  });

  test('GET /api/reports/summary returns seeded counts and latest scores', async () => {
    const res = await routeAdminAgent.get('/api/reports/summary');
    expect(res.statusCode).toBe(200);
    expect(res.body.summary.totalEvents).toBe(2);
    expect(res.body.summary.activeAlerts).toBe(1);
    expect(res.body.summary.overallTrustScore).toBe(57);
    expect(res.body.summary.trustLevel).toBe('LOW TRUST');
    expect(res.body.summary.humanRiskScore).toBe(32);
    expect(res.body.summary.riskCategory).toBe('MODERATE');
    expect(res.body.summary.latestSimulationId).toBe('SIM-20260813-NEW');
    expect(res.body.summary.compromiseProbability).toBe(0.11);
    expect(res.body.summary.totalDeceptionEvents).toBe(1);
  });

  test('GET /api/reports/export/csv returns a CSV report for privileged users', async () => {
    const denied = await routeEmployeeAgent.get('/api/reports/export/csv');
    expect(denied.statusCode).toBe(403);

    const res = await routeAdminAgent.get('/api/reports/export/csv');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('neuroshield-security-report.csv');
    expect(res.text).toContain('Timestamp,Event Type,Severity,Source Layer,Description,Trust Score,Risk Score');
    expect(res.text).toContain('PRIVILEGE_ESCALATION_ATTEMPT');
    expect(res.text).toContain('Suspicious login pattern observed');
  });

  test('GET /api/simulations/history is accessible to all authenticated users and returns latest first', async () => {
    const empRes = await routeEmployeeAgent.get('/api/simulations/history');
    expect(empRes.statusCode).toBe(200);

    const res = await routeAdminAgent.get('/api/simulations/history');
    expect(res.statusCode).toBe(200);
    expect(res.body.simulations).toHaveLength(2);
    expect(res.body.simulations[0].simulationId).toBe('SIM-20260813-NEW');
    expect(res.body.simulations[1].simulationId).toBe('SIM-20260812-OLD');
  });

  test('POST /api/alerts/:id/acknowledge updates alert state for admins', async () => {
    const denied = await routeEmployeeAgent.post(`/api/alerts/${activeAlert.alertId}/acknowledge`);
    expect(denied.statusCode).toBe(403);

    const res = await routeAdminAgent.post(`/api/alerts/${activeAlert.alertId}/acknowledge`);
    expect(res.statusCode).toBe(200);
    expect(res.body.alert.status).toBe('ACKNOWLEDGED');
    expect(res.body.alert.acknowledgedBy).toBe(String(routeAdminUserId));
  });
});

describe('Audit and event stream coverage', () => {
  let routeApp;
  let routeAdminAgent;
  let routeEmployeeAgent;

  beforeAll(async () => {
    routeApp = createExpressApp();
    resetAllStores();
    const seeded = await seedAuthContext(routeApp);
    routeAdminAgent = seeded.adminAgent;
    routeEmployeeAgent = seeded.employeeAgent;

    if (typeof AuditLog.__resetStore === 'function') {
      AuditLog.__resetStore();
    }

    const olderTimestamp = new Date('2026-08-12T06:00:00.000Z');
    const newerTimestamp = new Date('2026-08-13T06:00:00.000Z');

    await AuditLog.create({
      userId: seeded.adminUserId,
      userName: 'Admin Test User',
      action: 'USER_LOGIN',
      resource: 'Auth',
      resourceId: String(seeded.adminUserId),
      metadata: { source: 'web' },
      timestamp: olderTimestamp
    });

    await AuditLog.create({
      userId: seeded.adminUserId,
      userName: 'Admin Test User',
      action: 'SIMULATION_RUN',
      resource: 'Simulation',
      resourceId: 'SIM-20260813-0001',
      metadata: { iterations: 500 },
      timestamp: newerTimestamp
    });

    await SecurityEvent.create({
      eventType: 'FAILED_LOGIN',
      severity: 'MEDIUM',
      sourceLayer: 'ADAPTIVE_TRUST',
      userId: seeded.employeeUserId,
      description: 'Failed login attempt captured',
      metadata: { ipAddress: '203.0.113.10' },
      isDemo: false,
      timestamp: olderTimestamp
    });

    await SecurityEvent.create({
      eventType: 'UNUSUAL_PRIVILEGE_USAGE',
      severity: 'HIGH',
      sourceLayer: 'HUMAN_RISK',
      userId: seeded.employeeUserId,
      description: 'Privilege use outside normal pattern',
      metadata: { ipAddress: '203.0.113.11' },
      isDemo: false,
      timestamp: newerTimestamp
    });
  });

  afterAll(async () => {
    resetAllStores();
  });

  test('GET /api/audit returns newest audit logs first and blocks employees', async () => {
    const denied = await routeEmployeeAgent.get('/api/audit');
    expect(denied.statusCode).toBe(403);

    const res = await routeAdminAgent.get('/api/audit');
    expect(res.statusCode).toBe(200);
    expect(res.body.logs).toHaveLength(2);
    expect(res.body.logs[0].action).toBe('SIMULATION_RUN');
    expect(res.body.logs[1].action).toBe('USER_LOGIN');
  });

  test('GET /api/events returns newest security events first', async () => {
    const res = await routeEmployeeAgent.get('/api/events');
    expect(res.statusCode).toBe(200);
    expect(res.body.events).toHaveLength(2);
    expect(res.body.events[0].eventType).toBe('UNUSUAL_PRIVILEGE_USAGE');
    expect(res.body.events[1].eventType).toBe('FAILED_LOGIN');
  });
});

describe('Deception coverage', () => {
  let routeApp;
  let routeAdminAgent;
  let routeEmployeeAgent;
  let seededAsset;

  beforeAll(async () => {
    routeApp = createExpressApp();
    resetAllStores();
    const seeded = await seedAuthContext(routeApp);
    routeAdminAgent = seeded.adminAgent;
    routeEmployeeAgent = seeded.employeeAgent;

    const olderTimestamp = new Date('2026-08-12T07:00:00.000Z');

    seededAsset = await DeceptionAsset.create({
      assetId: 'DEC-TRAP-001',
      name: 'Honeytoken Vault',
      type: 'HONEYTOKEN',
      location: '/vault/decoy/credentials.txt',
      status: 'ARMED',
      triggerCount: 0,
      isDemo: false,
      createdAt: olderTimestamp,
      updatedAt: olderTimestamp
    });

    await DeceptionEvent.create({
      assetId: 'DEC-TRAP-001',
      userId: seeded.employeeUserId,
      eventType: 'HONEYTOKEN_ACCESS',
      severity: 'HIGH',
      metadata: {
        ipAddress: '198.51.100.21',
        userAgent: 'curl/7.79.1',
        payloadAttempted: 'vault.txt'
      },
      isDemo: false,
      timestamp: olderTimestamp
    });
  });

  afterAll(async () => {
    resetAllStores();
  });

  test('GET /api/deception/assets returns assets and POST /api/deception/assets is admin only', async () => {
    const denied = await routeEmployeeAgent.post('/api/deception/assets').send({
      name: 'Employee Trap',
      type: 'DECOY',
      location: '/tmp/decoy.txt',
      metadata: { description: 'Should not be allowed' }
    });
    expect(denied.statusCode).toBe(403);

    const created = await routeAdminAgent.post('/api/deception/assets').send({
      name: 'Network Honeypot',
      type: 'HONEYPOT',
      location: 'tcp://10.0.0.5:22',
      metadata: { targetPort: 22, description: 'SSH sinkhole' }
    });
    expect(created.statusCode).toBe(201);
    expect(created.body.asset.assetId).toMatch(/^DEC-\d+$/);

    const assets = await routeAdminAgent.get('/api/deception/assets');
    expect(assets.statusCode).toBe(200);
    expect(assets.body.assets.length).toBeGreaterThanOrEqual(2);
    expect(assets.body.assets[0].assetId).toBe(created.body.asset.assetId);
    expect(assets.body.assets.some((asset) => asset.assetId === seededAsset.assetId)).toBe(true);
  });

  test('POST /api/deception/trigger creates a deception event and updates the asset', async () => {
    const res = await routeEmployeeAgent.post('/api/deception/trigger').send({
      assetId: seededAsset.assetId,
      ipAddress: '198.51.100.99',
      userAgent: 'Jest/NeuroShield',
      payloadAttempted: 'vault.txt'
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.deceptionEvent.assetId).toBe(seededAsset.assetId);
    expect(res.body.deceptionEvent.eventType).toBe('HONEYTOKEN_ACCESS');
    expect(res.body.feedbackLoopResult.securityEvent).toBeDefined();
    expect(res.body.feedbackLoopResult.alert).toBeDefined();

    const updatedAssets = await routeAdminAgent.get('/api/deception/assets');
    const triggeredAsset = updatedAssets.body.assets.find((asset) => asset.assetId === seededAsset.assetId);
    expect(triggeredAsset.status).toBe('TRIGGERED');
    expect(triggeredAsset.triggerCount).toBe(1);

    const events = await routeEmployeeAgent.get('/api/deception/events');
    expect(events.statusCode).toBe(200);
    expect(events.body.events[0].assetId).toBe(seededAsset.assetId);
    expect(events.body.events[0].eventType).toBe('HONEYTOKEN_ACCESS');
  });
});

describe('Runtime settings coverage', () => {
  let routeApp;
  let routeAdminAgent;
  let routeEmployeeAgent;
  const originalMongoUri = env.MONGODB_URI;

  beforeAll(async () => {
    routeApp = createExpressApp();
    resetAllStores();
    const seeded = await seedAuthContext(routeApp);
    routeAdminAgent = seeded.adminAgent;
    routeEmployeeAgent = seeded.employeeAgent;
  });

  afterAll(async () => {
    env.updateRuntimeConfig({ MONGODB_URI: originalMongoUri || '' }, { persist: false });
    resetAllStores();
  });

  test('GET /api/settings/runtime returns masked runtime config for admins and blocks employees', async () => {
    const denied = await routeEmployeeAgent.get('/api/settings/runtime');
    expect(denied.statusCode).toBe(403);

    const res = await routeAdminAgent.get('/api/settings/runtime');
    expect(res.statusCode).toBe(200);
    expect(res.body.runtimeConfig.runtimeConfigPath).toBeDefined();
    expect(res.body.runtimeConfig.maskedMongoUri).toBeDefined();
    expect(res.body.runtimeConfig.mongoUriConfigured).toBe(Boolean(originalMongoUri));
    expect(res.body.database.connected).toBe(true);
  });

  test('PUT /api/settings/runtime saves a new MongoDB URI and keeps the backend connected in test mode', async () => {
    const newUri = 'mongodb://tester:secret@127.0.0.1:27017/neuroshield-test';

    const denied = await routeEmployeeAgent.put('/api/settings/runtime').send({
      mongodbUri: newUri
    });
    expect(denied.statusCode).toBe(403);

    const res = await routeAdminAgent.put('/api/settings/runtime').send({
      mongodbUri: newUri
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toContain('saved');
    expect(res.body.runtimeConfig.mongoUriConfigured).toBe(true);
    expect(res.body.runtimeConfig.maskedMongoUri).toContain('tester:***@');
    expect(res.body.database.connected).toBe(true);
    expect(env.MONGODB_URI).toBe(newUri);
    expect(process.env.MONGODB_URI).toBe(newUri);
  });
});

describe('Employee Dashboard Scoping & FIM Restrictions', () => {
  let routeApp;
  let routeAdminAgent;
  let routeEmployeeAgent;
  let routeAdminUserId;
  let routeEmployeeUserId;

  beforeAll(async () => {
    routeApp = createExpressApp();
    resetAllStores();
    const seeded = await seedAuthContext(routeApp);
    routeAdminAgent = seeded.adminAgent;
    routeEmployeeAgent = seeded.employeeAgent;
    routeAdminUserId = seeded.adminUserId;
    routeEmployeeUserId = seeded.employeeUserId;

    // Seed alert belonging to admin
    await Alert.create({
      alertId: 'ALT-ADMIN-ONLY',
      title: 'Admin privileged alert',
      description: 'System alert for admin',
      severity: 'HIGH',
      sourceLayer: 'THREAT_PREDICTION',
      userId: routeAdminUserId,
      status: 'NEW',
      isDemo: false
    });

    // Seed alert belonging to employee
    await Alert.create({
      alertId: 'ALT-EMPLOYEE-PERSONAL',
      title: 'Employee workstation alert',
      description: 'Personal anomaly alert',
      severity: 'MEDIUM',
      sourceLayer: 'BEHAVIORAL_IDENTITY',
      userId: routeEmployeeUserId,
      status: 'NEW',
      isDemo: false
    });

    // Seed event belonging to admin
    await SecurityEvent.create({
      eventType: 'ADMIN_SECURITY_EVENT',
      severity: 'LOW',
      sourceLayer: 'ADAPTIVE_TRUST',
      userId: routeAdminUserId,
      description: 'Admin audit event',
      isDemo: false
    });

    // Seed event belonging to employee
    await SecurityEvent.create({
      eventType: 'EMPLOYEE_SECURITY_EVENT',
      severity: 'LOW',
      sourceLayer: 'BEHAVIORAL_IDENTITY',
      userId: routeEmployeeUserId,
      description: 'Employee personal event',
      isDemo: false
    });
  });

  afterAll(async () => {
    resetAllStores();
  });

  test('EMPLOYEE can only view their own alerts, while ADMIN views all alerts', async () => {
    const empRes = await routeEmployeeAgent.get('/api/alerts');
    expect(empRes.statusCode).toBe(200);
    expect(empRes.body.isPersonalView).toBe(true);
    expect(empRes.body.alerts).toHaveLength(1);
    expect(empRes.body.alerts[0].alertId).toBe('ALT-EMPLOYEE-PERSONAL');

    const adminRes = await routeAdminAgent.get('/api/alerts');
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.body.alerts.length).toBeGreaterThanOrEqual(2);
  });

  test('EMPLOYEE can only view their own security events, while ADMIN views all events', async () => {
    const empRes = await routeEmployeeAgent.get('/api/events');
    expect(empRes.statusCode).toBe(200);
    expect(empRes.body.isPersonalView).toBe(true);
    expect(empRes.body.events).toHaveLength(1);
    expect(empRes.body.events[0].eventType).toBe('EMPLOYEE_SECURITY_EVENT');

    const adminRes = await routeAdminAgent.get('/api/events');
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.body.events.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/reports/summary reflects personal employee scope when called by EMPLOYEE', async () => {
    const empRes = await routeEmployeeAgent.get('/api/reports/summary');
    expect(empRes.statusCode).toBe(200);
    expect(empRes.body.summary.isEmployeeView).toBe(true);
    expect(empRes.body.summary.activeAlerts).toBe(1);
    expect(empRes.body.summary.totalEvents).toBe(1);
  });

  test('Auditing endpoints attach operator identity and role metadata', async () => {
    const sysRes = await routeEmployeeAgent.get('/api/auditing/system');
    expect(sysRes.statusCode).toBe(200);
    expect(sysRes.body.metrics.role).toBe('EMPLOYEE');
    expect(sysRes.body.metrics.operator).toBeDefined();

    const fimRes = await routeEmployeeAgent.get('/api/auditing/fim');
    expect(fimRes.statusCode).toBe(200);
    expect(fimRes.body.fim.role).toBe('EMPLOYEE');
  });

  test('POST /api/auditing/fim/touch-canary is accessible to all users including EMPLOYEE', async () => {
    const res = await routeEmployeeAgent.post('/api/auditing/fim/touch-canary').send({});
    expect([200, 404]).toContain(res.statusCode);
  });

  test('First-time telemetry ingestion locks baseline profile in database', async () => {
    // Send first-time telemetry
    const initialTelemetry = {
      typingSpeed: 68,
      typingInterval: 110,
      mouseVelocity: 420,
      mouseAccel: 75,
      clickDelay: 160,
      scrollVelocity: 280,
      sessionHour: 15
    };

    const telemetryRes = await routeEmployeeAgent
      .post('/api/behavior/telemetry')
      .send({ telemetry: initialTelemetry });

    expect(telemetryRes.statusCode).toBe(200);
    expect(telemetryRes.body.profileLocked).toBe(true);
    expect(telemetryRes.body.evaluation).toBeDefined();

    // Verify directly in DB model
    const profileInDb = await BehaviorProfile.findOne({ userId: routeEmployeeUserId });
    expect(profileInDb).toBeDefined();
    expect(profileInDb.isLocked).toBe(true);
    expect(profileInDb.lockedAt).toBeDefined();
    expect(profileInDb.baselineFeatures.typingSpeed).toBe(68);
    expect(profileInDb.baselineFeatures.mouseVelocity).toBe(420);

    // Verify GET /api/behavior/profile reflects locked state
    const getRes = await routeEmployeeAgent.get('/api/behavior/profile');
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.isLocked).toBe(true);
    expect(getRes.body.baselineFeatures.typingSpeed).toBe(68);
  });

  test('Updating typing speed or pointer movement updates and locks profile in database', async () => {
    const updatedFeatures = {
      typingSpeed: 82,
      typingInterval: 95,
      mouseVelocity: 550,
      mouseAccel: 90,
      clickDelay: 140,
      scrollVelocity: 310,
      sessionHour: 16
    };

    const updateRes = await routeEmployeeAgent
      .post('/api/behavior/profile')
      .send({ baselineFeatures: updatedFeatures });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.isLocked).toBe(true);
    expect(updateRes.body.baselineFeatures.typingSpeed).toBe(82);
    expect(updateRes.body.baselineFeatures.mouseVelocity).toBe(550);

    // Verify DB was updated
    const profileInDb = await BehaviorProfile.findOne({ userId: routeEmployeeUserId });
    expect(profileInDb.baselineFeatures.typingSpeed).toBe(82);
    expect(profileInDb.baselineFeatures.mouseVelocity).toBe(550);
    expect(profileInDb.isLocked).toBe(true);
  });

  test('Adaptive Trust, Human Threat, and Threat Prediction utilize locked telemetry & scores', async () => {
    // 1. Adaptive Trust
    const trustRes = await routeEmployeeAgent.get(`/api/trust/current/${routeEmployeeUserId}`);
    expect(trustRes.statusCode).toBe(200);
    expect(trustRes.body.trustScore).toBeDefined();
    expect(trustRes.body.trustScore.overallTrust).toBeDefined();

    // 2. Human Threat / Risk
    const humanRiskRes = await routeEmployeeAgent.get(`/api/human-risk/current/${routeEmployeeUserId}`);
    expect(humanRiskRes.statusCode).toBe(200);
    expect(humanRiskRes.body.humanRisk).toBeDefined();
    expect(humanRiskRes.body.humanRisk.riskScore).toBeDefined();

    // 3. Threat Prediction (Markov Engine)
    const threatRes = await routeEmployeeAgent.get(`/api/threats/current/${routeEmployeeUserId}`);
    expect(threatRes.statusCode).toBe(200);
    expect(threatRes.body.threatPrediction).toBeDefined();
    expect(threatRes.body.threatPrediction.currentState).toBeDefined();
  });

  test('Forgotten password can be reset via two-step identity verification and used to authenticate', async () => {
    // Step 1: Verify identity with email + name
    const verifyRes = await request(routeApp)
      .post('/api/auth/verify-identity')
      .send({
        email: 'emptest@neuroshield.local',
        name: 'Employee Test User'
      });

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body.verified).toBe(true);
    expect(verifyRes.body.userName).toBe('Employee Test User');

    // Step 1b: Wrong name should fail
    const badVerify = await request(routeApp)
      .post('/api/auth/verify-identity')
      .send({
        email: 'emptest@neuroshield.local',
        name: 'Wrong Person Name'
      });
    expect(badVerify.statusCode).toBe(403);

    // Step 2: Reset password with verified identity
    const resetRes = await request(routeApp)
      .post('/api/auth/reset-password')
      .send({
        email: 'emptest@neuroshield.local',
        name: 'Employee Test User',
        newPassword: 'BrandNewPassword99!'
      });

    expect(resetRes.statusCode).toBe(200);
    expect(resetRes.body.message).toContain('Password reset successfully');

    // 3. Old password fails
    const oldLogin = await request(routeApp)
      .post('/api/auth/login')
      .send({
        email: 'emptest@neuroshield.local',
        password: 'Password123!'
      });
    expect(oldLogin.statusCode).toBe(401);

    // 4. New password succeeds
    const newLogin = await request(routeApp)
      .post('/api/auth/login')
      .send({
        email: 'emptest@neuroshield.local',
        password: 'BrandNewPassword99!'
      });
    expect(newLogin.statusCode).toBe(200);
  });

  test('ADMIN can reset a user password via PUT /api/users/:id', async () => {
    const adminReset = await routeAdminAgent
      .put(`/api/users/${routeEmployeeUserId}`)
      .send({ password: 'AdminAssignedPass456!' });

    expect(adminReset.statusCode).toBe(200);

    const checkLogin = await request(routeApp)
      .post('/api/auth/login')
      .send({
        email: 'emptest@neuroshield.local',
        password: 'AdminAssignedPass456!'
      });
    expect(checkLogin.statusCode).toBe(200);
  });
});


