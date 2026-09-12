const BehaviorProfile = require('../models/BehaviorProfile');
const BehaviorEvent = require('../models/BehaviorEvent');
const TrustScore = require('../models/TrustScore');
const HumanRisk = require('../models/HumanRisk');
const ThreatPrediction = require('../models/ThreatPrediction');
const ThreatSimulation = require('../models/ThreatSimulation');
const DeceptionAsset = require('../models/DeceptionAsset');
const DeceptionEvent = require('../models/DeceptionEvent');
const User = require('../models/User');

const { evaluateBehavior } = require('../engines/behavior');
const { calculateTrust } = require('../engines/trust');
const { evaluateHumanRisk } = require('../engines/humanRisk');
const { predictThreat } = require('../engines/threat');
const { runMonteCarloSimulation } = require('../engines/threat/monteCarlo');
const { processDeceptionTrigger } = require('../engines/deception');

const securityEventService = require('./securityEventService');
const alertService = require('./alertService');
const realtimeService = require('./realtimeService');

class SimulationService {
  async runCompleteSimulation(options = {}) {
    const simulationId = `SIM-${Date.now()}`;
    const iterations = options.iterations || 1000;
    const isDemo = options.isDemo !== undefined ? options.isDemo : true;

    // Find or target user
    let targetUser = null;
    if (options.userId) {
      targetUser = await User.findById(options.userId);
    }
    if (!targetUser) {
      targetUser = await User.findOne({ role: 'EMPLOYEE' }) || await User.findOne({});
    }

    const userId = targetUser ? targetUser._id : null;
    const results = {};

    // -------------------------------------------------------------
    // Step 1: Behavioral telemetry collection
    // -------------------------------------------------------------
    const rawTelemetry = options.telemetry || {
      typingSpeed: 38,       // Anomalous typing speed (baseline 60)
      typingInterval: 240,   // Anomalous delay
      mouseVelocity: 890,    // Erratic fast mouse
      mouseAccel: 195,
      clickDelay: 60,
      scrollVelocity: 750,
      sessionHour: 3         // Off-hours 3 AM login
    };
    results.step1_telemetry = rawTelemetry;

    // -------------------------------------------------------------
    // Step 2: Feature extraction & normalization
    // Step 3: Behavioral ML analysis (K-Means, SVM, Random Forest)
    // -------------------------------------------------------------
    let profile = null;
    if (userId) {
      profile = await BehaviorProfile.findOne({ userId });
    }

    const behaviorEval = evaluateBehavior(rawTelemetry, profile);
    results.step2_features = behaviorEval.normalizedFeatures;
    results.step3_behaviorML = {
      kmeansDistance: behaviorEval.kmeansDistance,
      svmDistance: behaviorEval.svmDistance,
      rfAnomalyScore: behaviorEval.rfAnomalyScore,
      anomalyScore: behaviorEval.anomalyScore,
      behaviorScore: behaviorEval.behaviorScore,
      classification: behaviorEval.classification,
      confidence: behaviorEval.confidence
    };

    if (userId) {
      const bEvent = new BehaviorEvent({
        userId,
        sessionId: `SESS-${Date.now()}`,
        features: rawTelemetry,
        deviceMetadata: { userAgent: 'NeuroShield Simulation Engine', platform: 'Win32' },
        anomalyScore: behaviorEval.anomalyScore,
        classification: behaviorEval.classification,
        confidence: behaviorEval.confidence,
        modelScores: {
          kmeansDistance: behaviorEval.kmeansDistance,
          svmDistance: behaviorEval.svmDistance,
          rfAnomalyScore: behaviorEval.rfAnomalyScore
        },
        isDemo
      });
      await bEvent.save();
    }

    // -------------------------------------------------------------
    // Step 4: Adaptive Trust Calculation & Fuzzy Rules
    // -------------------------------------------------------------
    const trustEval = calculateTrust({
      behaviorScore: behaviorEval.behaviorScore,
      deviceScore: 65,   // Unrecognized device
      locationScore: 50, // Unusual IP location
      networkScore: 55,  // Untrusted VPN
      timeScore: 30      // 3 AM off-hours
    });
    results.step4_adaptiveTrust = trustEval;

    // -------------------------------------------------------------
    // Step 5: Human Risk Prediction (Decision Tree, LR, Bayes)
    // -------------------------------------------------------------
    const humanRiskEval = evaluateHumanRisk({
      behaviorAnomalyScore: behaviorEval.anomalyScore,
      trustScore: trustEval.overallTrust,
      recentAlertCount: 2,
      deceptionTriggers: 1,
      failedAuthAttempts: 2,
      offHours: true
    });
    results.step5_humanRisk = humanRiskEval;

    // -------------------------------------------------------------
    // Step 6: Markov Threat-State calculation
    // -------------------------------------------------------------
    const threatEval = predictThreat({
      currentState: 'SUSPICIOUS',
      behaviorAnomalyScore: behaviorEval.anomalyScore,
      trustScore: trustEval.overallTrust,
      humanRiskScore: humanRiskEval.riskScore,
      deceptionHit: true
    });
    results.step6_markovThreat = {
      currentState: threatEval.currentState,
      threatProbability: threatEval.threatProbability,
      nextStateDistribution: threatEval.nextStateDistribution
    };

    // -------------------------------------------------------------
    // Step 7: Monte Carlo Threat Simulation
    // -------------------------------------------------------------
    const monteCarloEval = runMonteCarloSimulation({
      initialState: threatEval.currentState,
      transitionMatrix: threatEval.transitionMatrix,
      iterations
    });
    results.step7_monteCarlo = monteCarloEval;

    if (userId) {
      const simDoc = new ThreatSimulation({
        simulationId,
        userId,
        iterations,
        initialState: threatEval.currentState,
        transitionMatrix: threatEval.transitionMatrix,
        results: {
          compromiseProbability: monteCarloEval.compromiseProbability,
          criticalReachabilityRate: monteCarloEval.criticalReachabilityRate,
          averageStepsToCompromise: monteCarloEval.averageStepsToCompromise,
          expectedTimeToCompromise: monteCarloEval.expectedTimeToCompromise,
          confidenceInterval: monteCarloEval.confidenceInterval
        },
        attackPaths: monteCarloEval.topAttackPaths,
        executionTime: monteCarloEval.executionTime,
        isDemo
      });
      await simDoc.save();
    }

    // -------------------------------------------------------------
    // Step 8: Intelligent Deception Evaluation
    // -------------------------------------------------------------
    let decoyAsset = await DeceptionAsset.findOne({ type: 'HONEYTOKEN' });
    if (!decoyAsset) {
      decoyAsset = {
        assetId: 'DEC-SIM-001',
        name: 'Simulated Admin Credentials Honeytoken',
        type: 'HONEYTOKEN',
        location: '/etc/shadow_backup.key'
      };
    }

    const deceptionEval = processDeceptionTrigger(decoyAsset, {
      userId,
      ipAddress: '198.51.100.42',
      userAgent: 'Unauthorized Script / Simulation',
      payloadAttempted: 'Accessed decoy shadow key file'
    });
    results.step8_deception = deceptionEval;

    if (userId && decoyAsset._id) {
      const dEvent = new DeceptionEvent({
        assetId: decoyAsset.assetId,
        userId,
        eventType: deceptionEval.eventType,
        severity: deceptionEval.severity,
        metadata: deceptionEval.metadata,
        isDemo
      });
      await dEvent.save();
    }

    // -------------------------------------------------------------
    // Step 9: Security Event + Alert Generation
    // Step 10: Feedback Loop + MongoDB Persistence + Realtime Broadcast
    // -------------------------------------------------------------
    const feedbackResult = await securityEventService.processEvent({
      eventType: 'SIMULATION_ANOMALOUS_BEHAVIOR_AND_DECEPTION',
      severity: 'CRITICAL',
      sourceLayer: 'INTELLIGENT_DECEPTION',
      userId,
      description: `Complete NeuroShield 10-Step Simulation executed. Anomaly Score: ${behaviorEval.anomalyScore}, Trust: ${trustEval.overallTrust}, Human Risk: ${humanRiskEval.riskScore}, Compromise Prob: ${monteCarloEval.compromiseProbability}.`,
      metadata: {
        simulationId,
        behaviorScore: behaviorEval.behaviorScore,
        anomalyScore: behaviorEval.anomalyScore,
        trustScore: trustEval.overallTrust,
        humanRiskScore: humanRiskEval.riskScore,
        threatState: threatEval.currentState
      },
      isDemo
    });

    results.step9_securityEvent = feedbackResult.securityEvent;
    results.step10_feedbackLoop = {
      persistedTrustScore: feedbackResult.trustScore ? feedbackResult.trustScore.overallTrust : trustEval.overallTrust,
      persistedHumanRisk: feedbackResult.humanRisk ? feedbackResult.humanRisk.riskScore : humanRiskEval.riskScore,
      generatedAlert: feedbackResult.alert
    };

    realtimeService.broadcast('simulation:complete', {
      simulationId,
      results
    });

    return {
      simulationId,
      userId,
      results
    };
  }
}

module.exports = new SimulationService();
