/**
 * Bayesian Analysis Human Risk Updater
 * Calculates P(Risk | Evidence) using Bayes' Theorem: P(E|R)*P(R) / P(E)
 */

function calculateBayesianPosterior(priorRiskProb, evidenceIndicators) {
  // Prior risk probability P(R)
  const prior = Math.max(0.01, Math.min(0.99, priorRiskProb));

  // Likelihood ratio calculation L = P(Evidence | HighRisk) / P(Evidence | LowRisk)
  let likelihoodRatio = 1.0;

  if (evidenceIndicators.anomalyHigh) {
    likelihoodRatio *= 4.5;
  }
  if (evidenceIndicators.deceptionHit) {
    likelihoodRatio *= 8.0;
  }
  if (evidenceIndicators.trustLow) {
    likelihoodRatio *= 3.2;
  }
  if (evidenceIndicators.offHours) {
    likelihoodRatio *= 1.8;
  }

  // Posterior Odds = Prior Odds * Likelihood Ratio
  const priorOdds = prior / (1 - prior);
  const posteriorOdds = priorOdds * likelihoodRatio;
  const posteriorProb = posteriorOdds / (1 + posteriorOdds);

  return {
    priorProbability: Number(prior.toFixed(4)),
    likelihoodRatio: Number(likelihoodRatio.toFixed(4)),
    posteriorProbability: Number(posteriorProb.toFixed(4))
  };
}

module.exports = {
  calculateBayesianPosterior
};
