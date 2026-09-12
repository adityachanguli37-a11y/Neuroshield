const { evaluateDecisionTree } = require('./decisionTree');
const { calculateLogisticProbability } = require('./logisticRegression');
const { calculateBayesianPosterior } = require('./bayesian');

/**
 * Human Risk Prediction Engine
 * Combines Decision Tree, Logistic Regression, and Bayesian probabilities into a unified risk model.
 */
function evaluateHumanRisk(inputs) {
  const {
    behaviorAnomalyScore = 0.1,
    trustScore = 85,
    recentAlertCount = 0,
    deceptionTriggers = 0,
    failedAuthAttempts = 0,
    offHours = false
  } = inputs;

  // 1. Decision Tree calculation
  const dtResult = evaluateDecisionTree({
    behaviorAnomalyScore,
    trustScore,
    recentAlertCount,
    deceptionTriggers,
    failedAuthAttempts
  });

  // 2. Logistic Regression calculation
  const lrResult = calculateLogisticProbability({
    behaviorAnomalyScore,
    trustScore,
    recentAlertCount,
    deceptionTriggers,
    failedAuthAttempts
  });

  // 3. Bayesian update calculation
  const bayesResult = calculateBayesianPosterior(lrResult.probability, {
    anomalyHigh: behaviorAnomalyScore > 0.5,
    deceptionHit: deceptionTriggers > 0,
    trustLow: trustScore < 60,
    offHours
  });

  // Unified Human Risk Probability (weighted blend of LR & Bayesian)
  const probability = Number((lrResult.probability * 0.4 + bayesResult.posteriorProbability * 0.6).toFixed(4));
  const riskScore = Math.round(probability * 100);

  let category = 'LOW';
  let recommendation = 'Standard user monitoring active. No heightened risk interventions required.';

  if (riskScore >= 75) {
    category = 'SEVERE';
    recommendation = 'IMMEDIATE INTERVENTION REQUIRED: Revoke privileged credentials, enforce mandatory security training, and isolate sensitive endpoint access.';
  } else if (riskScore >= 50) {
    category = 'ELEVATED';
    recommendation = 'ELEVATED RISK: Enable enhanced audit logging, restrict sensitive data export, and require manager approval for privilege escalation.';
  } else if (riskScore >= 30) {
    category = 'MODERATE';
    recommendation = 'MODERATE RISK: Apply additional authentication challenges and notify Security Operations Center.';
  }

  // Contributing factors identification
  const contributingFactors = [];
  if (behaviorAnomalyScore > 0.4) {
    contributingFactors.push({
      factor: 'Behavioral Anomaly',
      impact: Math.round(behaviorAnomalyScore * 40),
      description: `Behavioral anomaly score elevated (${(behaviorAnomalyScore * 100).toFixed(0)}%).`
    });
  }
  if (trustScore < 70) {
    contributingFactors.push({
      factor: 'Trust Score Degradation',
      impact: Math.round((100 - trustScore) * 0.35),
      description: `Adaptive trust score degraded to ${trustScore}/100.`
    });
  }
  if (deceptionTriggers > 0) {
    contributingFactors.push({
      factor: 'Deception Trap Interaction',
      impact: 50,
      description: `${deceptionTriggers} deception trap interaction(s) registered.`
    });
  }
  if (recentAlertCount > 0) {
    contributingFactors.push({
      factor: 'Active Alerts',
      impact: recentAlertCount * 15,
      description: `${recentAlertCount} recent alert(s) logged for user.`
    });
  }
  if (contributingFactors.length === 0) {
    contributingFactors.push({
      factor: 'Baseline Normal Activity',
      impact: 0,
      description: 'Activity matches safe historical profile.'
    });
  }

  return {
    riskScore,
    category,
    probability,
    contributingFactors,
    modelResults: {
      decisionTreeRisk: dtResult.decisionTreeRisk,
      logisticProbability: lrResult.probability,
      bayesianPosterior: bayesResult.posteriorProbability
    },
    recommendation
  };
}

module.exports = {
  evaluateHumanRisk
};
