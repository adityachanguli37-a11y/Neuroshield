const { evaluateBehavior } = require('../../server/engines/behavior');

describe('Layer 1: Behavioral Identity Engine Tests', () => {
  test('Normal telemetry should produce GENUINE classification and low anomaly score', () => {
    const normalTelemetry = {
      typingSpeed: 60,
      typingInterval: 120,
      mouseVelocity: 450,
      mouseAccel: 80,
      clickDelay: 180,
      scrollVelocity: 300,
      sessionHour: 14
    };

    const result = evaluateBehavior(normalTelemetry);

    expect(result.anomalyScore).toBeLessThan(0.40);
    expect(result.classification).toBe('GENUINE');
    expect(result.behaviorScore).toBeGreaterThan(60);
    expect(result.kmeansDistance).toBeDefined();
    expect(result.svmDistance).toBeDefined();
    expect(result.rfAnomalyScore).toBeDefined();
  });

  test('Anomalous telemetry should produce ANOMALOUS classification and high anomaly score', () => {
    const anomalousTelemetry = {
      typingSpeed: 190,      // Extremely fast
      typingInterval: 20,
      mouseVelocity: 1500,   // Rapid erratic mouse
      mouseAccel: 500,
      clickDelay: 10,
      scrollVelocity: 2000,
      sessionHour: 3         // Off-hours
    };

    const result = evaluateBehavior(anomalousTelemetry);

    expect(result.anomalyScore).toBeGreaterThanOrEqual(0.60);
    expect(result.classification).toBe('ANOMALOUS');
    expect(result.behaviorScore).toBeLessThan(45);
  });
});
