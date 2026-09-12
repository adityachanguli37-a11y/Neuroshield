/**
 * 7-State Markov Chain Threat Model
 * States:
 * 0: NORMAL
 * 1: SUSPICIOUS
 * 2: INITIAL_COMPROMISE
 * 3: COMPROMISED
 * 4: LATERAL_MOVEMENT
 * 5: PRIVILEGE_ESCALATION
 * 6: CRITICAL_COMPROMISE
 */

const STATES = [
  'NORMAL',
  'SUSPICIOUS',
  'INITIAL_COMPROMISE',
  'COMPROMISED',
  'LATERAL_MOVEMENT',
  'PRIVILEGE_ESCALATION',
  'CRITICAL_COMPROMISE'
];

function buildTransitionMatrix(context = {}) {
  const {
    behaviorAnomalyScore = 0.1,
    trustScore = 85,
    humanRiskScore = 20,
    deceptionHit = false
  } = context;

  // Base baseline transition matrix (each row must sum to 1.0)
  // Rows: current state [NORMAL, SUSPICIOUS, INITIAL_COMPROMISE, COMPROMISED, LATERAL_MOVEMENT, PRIVILEGE_ESCALATION, CRITICAL_COMPROMISE]
  let P = [
    // NORMAL -> [NORMAL, SUSPICIOUS, INIT_COMP, COMP, LATERAL, PRIV_ESC, CRIT_COMP]
    [0.85, 0.10, 0.04, 0.01, 0.00, 0.00, 0.00],
    // SUSPICIOUS
    [0.30, 0.45, 0.15, 0.07, 0.02, 0.01, 0.00],
    // INITIAL_COMPROMISE
    [0.10, 0.20, 0.40, 0.20, 0.07, 0.02, 0.01],
    // COMPROMISED
    [0.05, 0.10, 0.15, 0.40, 0.20, 0.07, 0.03],
    // LATERAL_MOVEMENT
    [0.02, 0.05, 0.08, 0.15, 0.40, 0.20, 0.10],
    // PRIVILEGE_ESCALATION
    [0.01, 0.02, 0.05, 0.07, 0.15, 0.45, 0.25],
    // CRITICAL_COMPROMISE (Absorbing state / persistent)
    [0.00, 0.00, 0.00, 0.00, 0.00, 0.10, 0.90]
  ];

  // Dynamic adjustments based on current security context
  const threatFactor = (behaviorAnomalyScore * 0.4) + ((100 - trustScore) / 100 * 0.3) + (humanRiskScore / 100 * 0.3) + (deceptionHit ? 0.35 : 0);

  if (threatFactor > 0.2) {
    // Increase forward transition probabilities for higher threat
    for (let r = 0; r < STATES.length - 1; r++) {
      const shift = Math.min(0.25, threatFactor * 0.3);
      // Decrease self-loop or backward recovery probability
      if (P[r][r] > shift) P[r][r] -= shift;
      // Increase transition to next states
      if (r + 1 < STATES.length) P[r][r + 1] += shift * 0.6;
      if (r + 2 < STATES.length) P[r][r + 2] += shift * 0.4;
    }
  }

  // Normalize matrix rows so each row sums to exactly 1.0
  const normalizedP = P.map(row => {
    const sum = row.reduce((a, b) => a + b, 0);
    return row.map(v => Number((v / sum).toFixed(4)));
  });

  return normalizedP;
}

function computeStateDistribution(initialState, transitionMatrix, steps = 5) {
  let startIndex = STATES.indexOf(initialState);
  if (startIndex === -1) startIndex = 0;

  // Initial state vector v_0
  let v = STATES.map((_, i) => (i === startIndex ? 1.0 : 0.0));

  // Perform matrix-vector multiplications: v_{k+1} = v_k * P
  for (let s = 0; s < steps; s++) {
    const nextV = new Array(STATES.length).fill(0.0);
    for (let j = 0; j < STATES.length; j++) {
      for (let i = 0; i < STATES.length; i++) {
        nextV[j] += v[i] * transitionMatrix[i][j];
      }
    }
    v = nextV;
  }

  const distribution = {};
  STATES.forEach((stateName, idx) => {
    distribution[stateName] = Number(v[idx].toFixed(4));
  });

  return distribution;
}

module.exports = {
  STATES,
  buildTransitionMatrix,
  computeStateDistribution
};
