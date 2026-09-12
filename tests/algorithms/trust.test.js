const { calculateTrust } = require('../../server/engines/trust');

describe('Layer 2: Adaptive Trust Engine Tests', () => {
  test('High contextual scores should produce HIGH TRUST and NORMAL action', () => {
    const context = {
      behaviorScore: 90,
      deviceScore: 95,
      locationScore: 90,
      networkScore: 85,
      timeScore: 90
    };

    const trust = calculateTrust(context);

    expect(trust.overallTrust).toBeGreaterThanOrEqual(80);
    expect(trust.trustLevel).toBe('HIGH TRUST');
    expect(trust.riskLevel).toBe('LOW RISK');
    expect(trust.authenticationAction).toBe('NORMAL');
  });

  test('Low behavioral and device trust should trigger fuzzy rules and STEP_UP_MFA or RESTRICT', () => {
    const context = {
      behaviorScore: 30,
      deviceScore: 20,
      locationScore: 40,
      networkScore: 30,
      timeScore: 20
    };

    const trust = calculateTrust(context);

    expect(trust.overallTrust).toBeLessThan(50);
    expect(['STEP_UP_MFA', 'RESTRICT']).toContain(trust.authenticationAction);
    expect(trust.fuzzyRules.some(r => r.triggered)).toBe(true);
  });
});
