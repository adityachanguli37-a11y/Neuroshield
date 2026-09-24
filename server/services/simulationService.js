const BehaviorProfile = require('../models/BehaviorProfile');
const BehaviorEvent = require('../models/BehaviorEvent');
const TrustScore = require('../models/TrustScore');
const HumanRisk = require('../models/HumanRisk');
const ThreatPrediction = require('../models/ThreatPrediction');
const ThreatSimulation = require('../models/ThreatSimulation');
const DeceptionAsset = require('../models/DeceptionAsset');
const DeceptionEvent = require('../models/DeceptionEvent');
const Alert = require('../models/Alert');
const User = require('../models/User');

const { evaluateBehavior } = require('../engines/behavior');
const { calculateTrust } = require('../engines/trust');
const { evaluateHumanRisk } = require('../engines/humanRisk');
const { predictThreat } = require('../engines/threat');
const { runMonteCarloSimulation } = require('../engines/threat/monteCarlo');

const securityEventService = require('./securityEventService');
const alertService = require('./alertService');
const realtimeService = require('./realtimeService');

class SimulationService {
  /**
   * Execute 10-Step NeuroShield Pipeline & Monte Carlo Simulation on the CURRENT SYSTEM STATE.
   * Uses real database records, actual operator biometric profile, live trust/risk metrics,
   * and current Markov threat propagation state.
   */
  async runCompleteSimulation(options = {}) {
    const simulationId = `SIM-${Date.now()}`;
    const iterations = options.iterations || 1000;
    const isDemo = options.isDemo !== undefined ? options.isDemo : false;

    // 1. Identify active user
    let targetUser = null;
    if (options.userId) {
      targetUser = await User.findById(options.userId);
    }
    if (!targetUser) {
      targetUser = await User.findOne({ email: 'admin@neuroshield.local' }) || await User.findOne({});
    }

    const userId = targetUser ? targetUser._id : null;
    const results = {};

    // -------------------------------------------------------------
    // Step 1: Current Behavioral Telemetry Collection
    // -------------------------------------------------------------
    let profile = null;
    if (userId) {
      profile = await BehaviorProfile.findOne({ userId });
    }

    const latestBehaviorEvent = userId
      ? await BehaviorEvent.findOne({ userId }).sort({ timestamp: -1 })
      : null;

    // Use live telemetry passed from client or latest recorded telemetry or locked profile baseline
    const currentTelemetry = options.telemetry || (latestBehaviorEvent ? latestBehaviorEvent.features : null) || {
      typingSpeed: (profile && profile.baselineFeatures) ? profile.baselineFeatures.typingSpeed : 60,
      typingInterval: (profile && profile.baselineFeatures) ? profile.baselineFeatures.typingInterval : 130,
      mouseVelocity: (profile && profile.baselineFeatures) ? profile.baselineFeatures.mouseVelocity : 420,
      mouseAccel: (profile && profile.baselineFeatures) ? profile.baselineFeatures.mouseAccel : 65,
      clickDelay: (profile && profile.baselineFeatures) ? profile.baselineFeatures.clickDelay : 175,
      scrollVelocity: (profile && profile.baselineFeatures) ? profile.baselineFeatures.scrollVelocity : 280,
      sessionHour: new Date().getHours()
    };

    results.step1_telemetry = currentTelemetry;

    // -------------------------------------------------------------
    // Step 2: Feature Extraction & Normalization
    // Step 3: Behavioral ML Analysis (K-Means, SVM, Random Forest)
    // -------------------------------------------------------------
    const behaviorEval = evaluateBehavior(currentTelemetry, profile);
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

    // -------------------------------------------------------------
    // Step 4: Current Adaptive Trust Calculation
    // -------------------------------------------------------------
    const latestTrustDoc = userId
      ? await TrustScore.findOne({ userId }).sort({ timestamp: -1 })
      : null;

    const currentHour = new Date().getHours();
    const isBusinessHour = (currentHour >= 7 && currentHour <= 21);

    const trustInputs = {
      behaviorScore: behaviorEval.behaviorScore,
      deviceScore: latestTrustDoc ? latestTrustDoc.deviceScore : 95,
      locationScore: latestTrustDoc ? latestTrustDoc.locationScore : 92,
      networkScore: latestTrustDoc ? latestTrustDoc.networkScore : 95,
      timeScore: isBusinessHour ? 95 : (latestTrustDoc ? latestTrustDoc.timeScore : 75)
    };

    const trustEval = calculateTrust(trustInputs);
    results.step4_adaptiveTrust = trustEval;

    // -------------------------------------------------------------
    // Step 5: Current Human Risk Prediction
    // -------------------------------------------------------------
    const activeAlertCount = await Alert.countDocuments({
      status: { $in: ['OPEN', 'INVESTIGATING'] },
      severity: { $in: ['HIGH', 'CRITICAL'] },
      isDemo: false
    });

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const deceptionCount = await DeceptionEvent.countDocuments({
      userId,
      isDemo: false,
      timestamp: { $gte: twoHoursAgo }
    });

    const humanRiskInputs = {
      behaviorAnomalyScore: behaviorEval.anomalyScore,
      trustScore: trustEval.overallTrust,
      recentAlertCount: activeAlertCount,
      deceptionTriggers: deceptionCount,
      failedAuthAttempts: 0,
      offHours: !isBusinessHour
    };

    const humanRiskEval = evaluateHumanRisk(humanRiskInputs);
    results.step5_humanRisk = humanRiskEval;

    // -------------------------------------------------------------
    // Step 6: Current Markov Threat-State Calculation
    // -------------------------------------------------------------
    const currentState = deceptionCount > 0
      ? 'COMPROMISED'
      : (humanRiskEval.riskScore > 65 ? 'INITIAL_COMPROMISE' : (trustEval.overallTrust < 60 ? 'SUSPICIOUS' : 'NORMAL'));

    const threatEval = predictThreat({
      currentState,
      behaviorAnomalyScore: behaviorEval.anomalyScore,
      trustScore: trustEval.overallTrust,
      humanRiskScore: humanRiskEval.riskScore,
      deceptionHit: deceptionCount > 0
    });

    results.step6_markovThreat = {
      currentState: threatEval.currentState,
      threatProbability: threatEval.threatProbability,
      nextStateDistribution: threatEval.nextStateDistribution
    };

    // -------------------------------------------------------------
    // Step 7: Monte Carlo Threat Simulation on Current State
    // -------------------------------------------------------------
    const monteCarloEval = runMonteCarloSimulation({
      initialState: threatEval.currentState,
      transitionMatrix: threatEval.transitionMatrix,
      iterations
    });
    results.step7_monteCarlo = monteCarloEval;

    // -------------------------------------------------------------
    // Step 8: Intelligent Deception Status
    // -------------------------------------------------------------
    const activeTrapCount = await DeceptionAsset.countDocuments({ status: 'ACTIVE' });
    results.step8_deception = {
      activeTraps: activeTrapCount,
      recentTriggers: deceptionCount,
      status: deceptionCount > 0 ? 'TRIPWIRE_TRIGGERED' : 'INTACT_MONITORING'
    };

    // -------------------------------------------------------------
    // Step 9 & 10: Feedback Loop + MongoDB Persistence + Broadcast
    // -------------------------------------------------------------
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

    const eventSeverity = (currentState === 'NORMAL') ? 'LOW' : ((currentState === 'SUSPICIOUS') ? 'MEDIUM' : 'HIGH');
    const feedbackResult = await securityEventService.processEvent({
      eventType: 'SIMULATION_CURRENT_STATE_EVALUATED',
      severity: eventSeverity,
      sourceLayer: 'THREAT_PREDICTION',
      userId,
      description: `Monte Carlo simulation evaluated on CURRENT live system state. Markov State: ${threatEval.currentState}, Compromise Reachability: ${(monteCarloEval.compromiseProbability * 100).toFixed(1)}%, Trust: ${trustEval.overallTrust}/100, Human Risk: ${humanRiskEval.riskScore}/100.`,
      metadata: {
        simulationId,
        behaviorScore: behaviorEval.behaviorScore,
        anomalyScore: behaviorEval.anomalyScore,
        trustScore: trustEval.overallTrust,
        humanRiskScore: humanRiskEval.riskScore,
        threatState: threatEval.currentState,
        iterations
      },
      isDemo
    });

    results.step9_securityEvent = feedbackResult.securityEvent;
    results.step10_feedbackLoop = {
      persistedTrustScore: trustEval.overallTrust,
      persistedHumanRisk: humanRiskEval.riskScore,
      currentState: threatEval.currentState
    };

    realtimeService.broadcast('simulation:complete', {
      simulationId,
      results
    });

    return {
      simulationId,
      results
    };
  }
}

module.exports = new SimulationService();
