const { evaluateHumanRisk } = require('../../server/engines/humanRisk');

describe('Layer 3: Human Risk Prediction Engine Tests', () => {
  test('Low anomaly and high trust should produce LOW risk classification', () => {
    const inputs = {
      behaviorAnomalyScore: 0.1,
      trustScore: 90,
      recentAlertCount: 0,
      deceptionTriggers: 0,
      failedAuthAttempts: 0
    };

    const hr = evaluateHumanRisk(inputs);

    expect(hr.riskScore).toBeLessThan(35);
    expect(hr.category).toBe('LOW');
    expect(hr.probability).toBeLessThan(0.35);
  });

  test('Deception trigger and high anomaly should produce SEVERE human risk', () => {
    const inputs = {
      behaviorAnomalyScore: 0.8,
      trustScore: 30,
      recentAlertCount: 3,
      deceptionTriggers: 1,
      failedAuthAttempts: 3,
      offHours: true
    };

    const hr = evaluateHumanRisk(inputs);

    expect(hr.riskScore).toBeGreaterThanOrEqual(75);
    expect(hr.category).toBe('SEVERE');
    expect(hr.recommendation).toContain('IMMEDIATE INTERVENTION');
  });
});
