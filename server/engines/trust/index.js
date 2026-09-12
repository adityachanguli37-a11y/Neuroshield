const { evaluateFuzzyRules } = require('./fuzzyLogic');
const { determineRBAAction } = require('./rba');

/**
 * Adaptive Trust Engine
 * Calculates weighted trust score and evaluates fuzzy rules & RBA policy.
 */
function calculateTrust(contextScores) {
  const {
    behaviorScore = 85, // 40%
    deviceScore = 90,   // 20%
    locationScore = 80, // 15%
    networkScore = 85,  // 15%
    timeScore = 90      // 10%
  } = contextScores;

  // Weighted Calculation
  const overallTrust = Number(
    (
      behaviorScore * 0.40 +
      deviceScore * 0.20 +
      locationScore * 0.15 +
      networkScore * 0.15 +
      timeScore * 0.10
    ).toFixed(2)
  );

  // Evaluate Fuzzy Rules
  const fuzzyRules = evaluateFuzzyRules({
    behaviorScore,
    deviceScore,
    locationScore,
    networkScore,
    timeScore
  });

  let trustLevel = 'HIGH TRUST';
  let riskLevel = 'LOW RISK';

  if (overallTrust < 40 || fuzzyRules.some(r => r.name === 'R1_CRITICAL_ANOMALY' && r.triggered)) {
    trustLevel = 'CRITICAL RISK';
    riskLevel = 'CRITICAL RISK';
  } else if (overallTrust < 60) {
    trustLevel = 'LOW TRUST';
    riskLevel = 'HIGH RISK';
  } else if (overallTrust < 80) {
    trustLevel = 'MEDIUM TRUST';
    riskLevel = 'MEDIUM RISK';
  } else {
    trustLevel = 'HIGH TRUST';
    riskLevel = 'LOW RISK';
  }

  // RBA Policy
  const rba = determineRBAAction(overallTrust, riskLevel);

  const explanation = `Adaptive Trust computed overall trust score ${overallTrust}/100 [Behavior 40%:${behaviorScore}, Device 20%:${deviceScore}, Location 15%:${locationScore}, Network 15%:${networkScore}, Time 10%:${timeScore}]. Status: ${trustLevel}, Action: ${rba.action}.`;

  return {
    behaviorScore,
    deviceScore,
    locationScore,
    networkScore,
    timeScore,
    overallTrust,
    trustLevel,
    riskLevel,
    authenticationAction: rba.action,
    fuzzyRules: fuzzyRules.map(r => ({ rule: r.description, triggered: r.triggered, weight: r.weight })),
    explanation
  };
}

module.exports = {
  calculateTrust
};
