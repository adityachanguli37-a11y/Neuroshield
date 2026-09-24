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

  const defaultStdDevs = {
    typingSpeed: 15,
    typingInterval: 30,
    mouseVelocity: 100,
    mouseAccel: 25,
    clickDelay: 40,
    scrollVelocity: 80,
    sessionHour: 4
  };

  for (const key of featureKeys) {
    const rawVal = inputFeatures[key] !== undefined ? Number(inputFeatures[key]) : baselineMeans[key];
    const mean = baselineMeans[key] !== undefined ? Number(baselineMeans[key]) : 50;

    let stdDev = defaultStdDevs[key] || 15;
    if (baselineVariances && baselineVariances[key] !== undefined && baselineVariances[key] > 0) {
      const val = Number(baselineVariances[key]);
      stdDev = val >= 500 ? Math.sqrt(val) : val;
    }

    // Calculate z-score
    const zScore = (rawVal - mean) / Math.max(1, stdDev);
    normalized[key] = Number(zScore.toFixed(4));
  }

  return normalized;
}

module.exports = {
  normalizeFeatures
};
