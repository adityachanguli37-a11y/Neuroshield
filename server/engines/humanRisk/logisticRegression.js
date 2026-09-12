/**
 * Logistic Regression Human Risk Classifier
 * Calculates log-odds probability using weighted security coefficients.
 */

function calculateLogisticProbability(inputs) {
  const {
    behaviorAnomalyScore = 0.1, // weight 3.5
    trustScore = 85,            // weight -0.04 (higher trust lowers risk)
    recentAlertCount = 0,       // weight 0.8
    deceptionTriggers = 0,      // weight 2.5
    failedAuthAttempts = 0      // weight 0.6
  } = inputs;

  const intercept = -2.5; // base logit for normal safe user

  const z = intercept +
    (behaviorAnomalyScore * 3.5) +
    (trustScore * -0.04) +
    (recentAlertCount * 0.8) +
    (deceptionTriggers * 2.5) +
    (failedAuthAttempts * 0.6);

  // Sigmoid formula: P(Risk=1) = 1 / (1 + exp(-z))
  const probability = 1 / (1 + Math.exp(-z));

  return {
    logitZ: Number(z.toFixed(4)),
    probability: Number(probability.toFixed(4))
  };
}

module.exports = {
  calculateLogisticProbability
};
