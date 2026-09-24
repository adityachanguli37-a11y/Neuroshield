const SecurityEvent = require('../models/SecurityEvent');
const TrustScore = require('../models/TrustScore');
const HumanRisk = require('../models/HumanRisk');
const ThreatPrediction = require('../models/ThreatPrediction');
const Alert = require('../models/Alert');
const AuditLog = require('../models/AuditLog');

const { calculateTrust } = require('../engines/trust');
const { evaluateHumanRisk } = require('../engines/humanRisk');
const { predictThreat } = require('../engines/threat');
const alertService = require('./alertService');
const realtimeService = require('./realtimeService');

class SecurityEventService {
  async processEvent(eventData) {
    const {
      eventType,
      severity,
      sourceLayer,
      userId,
      description,
      metadata = {},
      isDemo = false
    } = eventData;

    // 1. Create and save SecurityEvent document
    const securityEvent = new SecurityEvent({
      eventType,
      severity,
      sourceLayer,
      userId,
      description,
      metadata,
      isDemo,
      timestamp: new Date()
    });
    const savedEvent = await securityEvent.save();

    // Broadcast live event
    realtimeService.broadcast('security:event', savedEvent);

    if (!userId) {
      return { securityEvent: savedEvent };
    }

    // 2. Feedback Loop: Fetch historical state and recalculate across 5 layers
    let recentEvents = [];
    try {
      recentEvents = await SecurityEvent.find({ userId }).sort({ timestamp: -1 }).limit(10);
    } catch (e) {
      console.warn('Unable to query recent events for user:', e.message);
    }

    const highSeverityCount = recentEvents.filter(e => (e.severity === 'HIGH' || e.severity === 'CRITICAL') && !e.isDemo).length;
    const deceptionCount = recentEvents.filter(e => e.sourceLayer === 'INTELLIGENT_DECEPTION' && !e.isDemo).length;

    // A. Recalculate Adaptive Trust
    const behaviorScore = metadata.behaviorScore !== undefined
      ? metadata.behaviorScore
      : (sourceLayer === 'BEHAVIORAL_IDENTITY' && (severity === 'HIGH' || severity === 'CRITICAL') ? 40 : 88);
    const deviceScore = metadata.deviceScore !== undefined ? metadata.deviceScore : 88;
    const locationScore = metadata.locationScore !== undefined ? metadata.locationScore : 85;
    const networkScore = metadata.networkScore !== undefined ? metadata.networkScore : 85;
    const timeScore = metadata.timeScore !== undefined ? metadata.timeScore : 90;

    const trustResult = calculateTrust({
      behaviorScore,
      deviceScore,
      locationScore,
      networkScore,
      timeScore
    });

    const newTrustDoc = new TrustScore({
      userId,
      ...trustResult,
      isDemo,
      timestamp: new Date()
    });
    const savedTrust = await newTrustDoc.save();
    realtimeService.broadcast('trust:update', savedTrust);

    // B. Recalculate Human Risk Prediction
    const humanRiskResult = evaluateHumanRisk({
      behaviorAnomalyScore: metadata.anomalyScore || (100 - behaviorScore) / 100,
      trustScore: trustResult.overallTrust,
      recentAlertCount: highSeverityCount,
      deceptionTriggers: deceptionCount,
      failedAuthAttempts: metadata.failedAuthAttempts || 0,
      offHours: timeScore < 60
    });

    const newHumanRiskDoc = new HumanRisk({
      userId,
      ...humanRiskResult,
      isDemo,
      timestamp: new Date()
    });
    const savedHumanRisk = await newHumanRiskDoc.save();
    realtimeService.broadcast('risk:update', savedHumanRisk);

    // C. Recalculate Predictive Threat State & Simulation
    const currentState = deceptionCount > 0
      ? 'COMPROMISED'
      : (humanRiskResult.riskScore > 65 ? 'INITIAL_COMPROMISE' : (trustResult.overallTrust < 60 ? 'SUSPICIOUS' : 'NORMAL'));

    const threatResult = predictThreat({
      currentState,
      behaviorAnomalyScore: metadata.anomalyScore || (100 - behaviorScore) / 100,
      trustScore: trustResult.overallTrust,
      humanRiskScore: humanRiskResult.riskScore,
      deceptionHit: deceptionCount > 0
    });

    const newThreatDoc = new ThreatPrediction({
      userId,
      currentState: threatResult.currentState,
      threatProbability: threatResult.threatProbability,
      compromiseProbability: threatResult.compromiseProbability,
      criticalProbability: threatResult.criticalProbability,
      nextStateDistribution: threatResult.nextStateDistribution,
      mostLikelyPath: threatResult.mostLikelyPath,
      criticalNode: threatResult.criticalNode,
      confidence: threatResult.confidence,
      isDemo,
      timestamp: new Date()
    });
    const savedThreat = await newThreatDoc.save();
    realtimeService.broadcast('threat:update', savedThreat);

    // D. Trigger Alert if severity is HIGH or CRITICAL or risk is elevated
    let generatedAlert = null;
    if (severity === 'HIGH' || severity === 'CRITICAL' || humanRiskResult.riskScore >= 60) {
      generatedAlert = await alertService.createAlert({
        title: `Security Alert: ${eventType} (${sourceLayer})`,
        description: `${description} - Trust: ${trustResult.overallTrust}/100, Human Risk: ${humanRiskResult.riskScore}/100.`,
        severity,
        sourceLayer,
        userId,
        isDemo
      });
    }

    // E. Record Audit Log
    try {
      await AuditLog.create({
        userId,
        action: 'SECURITY_EVENT_PROCESSED',
        resource: 'SecurityPipeline',
        resourceId: savedEvent._id.toString(),
        metadata: {
          eventType,
          sourceLayer,
          severity,
          trustScore: trustResult.overallTrust,
          humanRiskScore: humanRiskResult.riskScore,
          threatState: threatResult.currentState
        }
      });
    } catch (e) {
      // audit log failure catch
    }

    return {
      securityEvent: savedEvent,
      trustScore: savedTrust,
      humanRisk: savedHumanRisk,
      threatPrediction: savedThreat,
      alert: generatedAlert
    };
  }
}

module.exports = new SecurityEventService();
