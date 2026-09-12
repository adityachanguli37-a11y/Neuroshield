/**
 * Behavioral Feature Preprocessor
 * Normalizes input behavioral telemetry against baseline means and standard deviations.
 */

function normalizeFeatures(inputFeatures, baselineMeans, baselineVariances) {
  const normalized = {};
  const featureKeys = [
    'typingSpeed',
    'typingInterval',
    'mouseVelocity',
    'mouseAccel',
    'clickDelay',
    'scrollVelocity',
    'sessionHour'
  ];

  for (const key of featureKeys) {
    const rawVal = inputFeatures[key] !== undefined ? Number(inputFeatures[key]) : baselineMeans[key];
    const mean = baselineMeans[key] !== undefined ? Number(baselineMeans[key]) : 50;
    const stdDev = Math.sqrt(baselineVariances[key] || 15) || 1;

    // Calculate z-score
    const zScore = (rawVal - mean) / stdDev;
    normalized[key] = zScore;
  }

  return normalized;
}

module.exports = {
  normalizeFeatures
};
