const { predictThreat, STATES } = require('../../server/engines/threat');
const { buildTransitionMatrix } = require('../../server/engines/threat/markovChain');
const { runMonteCarloSimulation } = require('../../server/engines/threat/monteCarlo');

describe('Layer 4: Threat Simulation Engine Tests', () => {
  test('Markov transition matrix rows must each sum to 1.0', () => {
    const P = buildTransitionMatrix({ behaviorAnomalyScore: 0.5 });
    
    expect(P.length).toBe(7);
    P.forEach(row => {
      const sum = row.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
    });
  });

  test('Monte Carlo simulation respects iteration boundaries (100 to 100,000)', () => {
    const P = buildTransitionMatrix({});
    const res = runMonteCarloSimulation({
      initialState: 'NORMAL',
      transitionMatrix: P,
      iterations: 500
    });

    expect(res.iterations).toBe(500);
    expect(res.compromiseProbability).toBeGreaterThanOrEqual(0);
    expect(res.compromiseProbability).toBeLessThanOrEqual(1);
    expect(res.confidenceInterval.lower).toBeLessThanOrEqual(res.compromiseProbability);
    expect(res.confidenceInterval.upper).toBeGreaterThanOrEqual(res.compromiseProbability);
  });
});
