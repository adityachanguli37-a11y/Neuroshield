const { buildTransitionMatrix, computeStateDistribution, STATES } = require('./markovChain');
const { runMonteCarloSimulation } = require('./monteCarlo');

/**
 * Predictive Threat Simulation Engine
 */
function predictThreat(context = {}, simulationOptions = {}) {
  const {
    currentState = 'NORMAL',
    behaviorAnomalyScore = 0.1,
    trustScore = 85,
    humanRiskScore = 20,
    deceptionHit = false
  } = context;

  // 1. Build context-adjusted Markov transition matrix
  const transitionMatrix = buildTransitionMatrix({
    behaviorAnomalyScore,
    trustScore,
    humanRiskScore,
    deceptionHit
  });

  // 2. Compute 5-step Markov State Distribution
  const nextStateDistribution = computeStateDistribution(currentState, transitionMatrix, 5);

  // 3. Run Monte Carlo Simulation
  const monteCarloResult = runMonteCarloSimulation({
    initialState: currentState,
    transitionMatrix,
    iterations: simulationOptions.iterations || 1000
  });

  // Probability calculations
  const threatProbability = Number((nextStateDistribution.SUSPICIOUS + nextStateDistribution.INITIAL_COMPROMISE).toFixed(4));
  const compromiseProbability = monteCarloResult.compromiseProbability;
  const criticalProbability = nextStateDistribution.CRITICAL_COMPROMISE;

  // Most likely transition path
  const mostLikelyPath = (monteCarloResult.topAttackPaths[0] && monteCarloResult.topAttackPaths[0].path)
    ? monteCarloResult.topAttackPaths[0].path.map((state, idx, arr) => {
        if (idx === arr.length - 1) return null;
        return { fromState: state, toState: arr[idx + 1], probability: 0.75 };
      }).filter(Boolean)
    : [];

  const confidence = Number((1.0 - (monteCarloResult.confidenceInterval.upper - monteCarloResult.confidenceInterval.lower)).toFixed(2));

  return {
    currentState,
    threatProbability,
    compromiseProbability,
    criticalProbability,
    nextStateDistribution,
    mostLikelyPath,
    criticalNode: monteCarloResult.criticalNode,
    confidence,
    monteCarlo: monteCarloResult,
    transitionMatrix
  };
}

module.exports = {
  predictThreat,
  STATES
};
