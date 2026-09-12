/**
 * Decision Tree Human Risk Evaluator
 * Evaluates binary and threshold branches based on historical indicators.
 */

function evaluateDecisionTree(inputs) {
  const {
    behaviorAnomalyScore = 0.1,
    trustScore = 85,
    recentAlertCount = 0,
    deceptionTriggers = 0,
    failedAuthAttempts = 0
  } = inputs;

  let score = 20; // baseline low risk
  const nodesEvaluated = [];

  // Branch 1: Deception trigger check
  if (deceptionTriggers > 0) {
    score += 45 * Math.min(3, deceptionTriggers);
    nodesEvaluated.push('Node_Deception_Triggered');
  }

  // Branch 2: Behavioral Anomaly check
  if (behaviorAnomalyScore > 0.6) {
    score += 30;
    nodesEvaluated.push('Node_High_Behavioral_Anomaly');
  } else if (behaviorAnomalyScore > 0.35) {
    score += 15;
    nodesEvaluated.push('Node_Moderate_Behavioral_Anomaly');
  }

  // Branch 3: Trust score degradation check
  if (trustScore < 40) {
    score += 35;
    nodesEvaluated.push('Node_Critical_Trust_Degradation');
  } else if (trustScore < 65) {
    score += 20;
    nodesEvaluated.push('Node_Moderate_Trust_Degradation');
  }

  // Branch 4: Failed auth & alert accumulation
  if (failedAuthAttempts >= 3) {
    score += 25;
    nodesEvaluated.push('Node_Multiple_Failed_Auths');
  }
  if (recentAlertCount >= 2) {
    score += 20;
    nodesEvaluated.push('Node_Accumulated_Alerts');
  }

  const decisionTreeRisk = Math.min(100, Math.max(0, score));

  return {
    decisionTreeRisk,
    nodesEvaluated
  };
}

module.exports = {
  evaluateDecisionTree
};
