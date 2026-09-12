/**
 * Fuzzy Logic Trust Engine
 * Translates continuous scores into Fuzzy sets (LOW, MEDIUM, HIGH)
 * and evaluates fuzzy rule base to derive overall trust level and risk.
 */

function fuzzifyScore(score) {
  // Score is 0 to 100
  let low = 0, medium = 0, high = 0;

  if (score <= 40) {
    low = 1.0;
  } else if (score < 60) {
    low = (60 - score) / 20;
    medium = (score - 40) / 20;
  } else if (score <= 80) {
    medium = (80 - score) / 20;
    high = (score - 60) / 20;
  } else {
    high = 1.0;
  }

  return { low, medium, high };
}

function evaluateFuzzyRules(scores) {
  const behaviorFuzzy = fuzzifyScore(scores.behaviorScore);
  const deviceFuzzy = fuzzifyScore(scores.deviceScore);
  const locationFuzzy = fuzzifyScore(scores.locationScore);
  const networkFuzzy = fuzzifyScore(scores.networkScore);
  const timeFuzzy = fuzzifyScore(scores.timeScore);

  const rules = [
    {
      name: 'R1_CRITICAL_ANOMALY',
      description: 'If Behavior is Low and Network is Low -> CRITICAL RISK',
      triggered: behaviorFuzzy.low > 0.5 && networkFuzzy.low > 0.5,
      weight: 0.95
    },
    {
      name: 'R2_UNTRUSTED_DEVICE_LOCATION',
      description: 'If Device is Low and Location is Low -> LOW TRUST',
      triggered: deviceFuzzy.low > 0.5 && locationFuzzy.low > 0.5,
      weight: 0.85
    },
    {
      name: 'R3_HIGH_BEHAVIORAL_TRUST',
      description: 'If Behavior is High and Device is High -> HIGH TRUST',
      triggered: behaviorFuzzy.high > 0.6 && deviceFuzzy.high > 0.6,
      weight: 0.90
    },
    {
      name: 'R4_MODERATE_CONTEXT',
      description: 'If Behavior is Medium or Network is Medium -> MEDIUM TRUST',
      triggered: behaviorFuzzy.medium > 0.4 || networkFuzzy.medium > 0.4,
      weight: 0.70
    },
    {
      name: 'R5_OFF_HOURS_LOCATION_SHIFT',
      description: 'If Time is Low and Location is Low -> ELEVATED RISK',
      triggered: timeFuzzy.low > 0.6 && locationFuzzy.low > 0.6,
      weight: 0.80
    }
  ];

  return rules;
}

module.exports = {
  fuzzifyScore,
  evaluateFuzzyRules
};
