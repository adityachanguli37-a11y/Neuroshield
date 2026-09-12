const { STATES } = require('./markovChain');

/**
 * Monte Carlo Threat Simulator
 * Runs stochastic Markov random-walk simulations.
 */

function runMonteCarloSimulation(options = {}) {
  const {
    initialState = 'NORMAL',
    transitionMatrix,
    iterations = 1000,
    maxStepsPerRun = 50
  } = options;

  // Enforce server-side iteration boundaries
  const validIterations = Math.max(100, Math.min(100000, Number(iterations) || 1000));
  const startTime = Date.now();

  const startIndex = STATES.indexOf(initialState) !== -1 ? STATES.indexOf(initialState) : 0;
  const criticalIndex = STATES.indexOf('CRITICAL_COMPROMISE');

  let criticalReachedCount = 0;
  let totalStepsToCritical = 0;
  const pathFrequency = {};
  const nodeVisits = new Array(STATES.length).fill(0);

  for (let iter = 0; iter < validIterations; iter++) {
    let currentStateIdx = startIndex;
    const pathTrace = [STATES[currentStateIdx]];
    let stepCount = 0;
    let reachedCritical = false;

    nodeVisits[currentStateIdx]++;

    while (stepCount < maxStepsPerRun) {
      if (currentStateIdx === criticalIndex) {
        reachedCritical = true;
        break;
      }

      // Draw random transition based on CDF of current state row in transition matrix
      const rowProbabilities = transitionMatrix[currentStateIdx];
      const r = Math.random();
      let cumulative = 0;
      let nextStateIdx = currentStateIdx;

      for (let j = 0; j < rowProbabilities.length; j++) {
        cumulative += rowProbabilities[j];
        if (r <= cumulative) {
          nextStateIdx = j;
          break;
        }
      }

      currentStateIdx = nextStateIdx;
      nodeVisits[currentStateIdx]++;
      stepCount++;
      pathTrace.push(STATES[currentStateIdx]);
    }

    if (reachedCritical) {
      criticalReachedCount++;
      totalStepsToCritical += stepCount;
    }

    const pathKey = pathTrace.slice(0, 6).join(' -> ');
    pathFrequency[pathKey] = (pathFrequency[pathKey] || 0) + 1;
  }

  const compromiseProbability = Number((criticalReachedCount / validIterations).toFixed(4));
  const averageStepsToCompromise = criticalReachedCount > 0
    ? Number((totalStepsToCritical / criticalReachedCount).toFixed(2))
    : maxStepsPerRun;

  // 1 step = ~15 minutes simulated time
  const expectedTimeToCompromise = Number((averageStepsToCompromise * 15).toFixed(1));

  // Sort paths by frequency
  const sortedPaths = Object.entries(pathFrequency)
    .map(([p, count]) => ({
      path: p.split(' -> '),
      frequency: count,
      probability: Number((count / validIterations).toFixed(4))
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  // Identify bottleneck node (most frequently visited intermediate node)
  let maxVisitIdx = 1;
  for (let k = 1; k < STATES.length - 1; k++) {
    if (nodeVisits[k] > nodeVisits[maxVisitIdx]) {
      maxVisitIdx = k;
    }
  }

  const executionTime = Date.now() - startTime;

  // 95% Confidence Interval for proportion: p +/- 1.96 * sqrt(p*(1-p)/n)
  const z95 = 1.96;
  const p = compromiseProbability;
  const marginOfError = z95 * Math.sqrt((p * (1 - p)) / validIterations);
  const confidenceLower = Number(Math.max(0, p - marginOfError).toFixed(4));
  const confidenceUpper = Number(Math.min(1, p + marginOfError).toFixed(4));

  return {
    iterations: validIterations,
    initialState,
    compromiseProbability,
    criticalReachabilityRate: compromiseProbability,
    averageStepsToCompromise,
    expectedTimeToCompromise, // minutes
    confidenceInterval: {
      lower: confidenceLower,
      upper: confidenceUpper
    },
    topAttackPaths: sortedPaths,
    criticalNode: STATES[maxVisitIdx],
    executionTime
  };
}

module.exports = {
  runMonteCarloSimulation
};
