/**
 * One-Class Support Vector Machine (RBF Kernel) Anomaly Detector
 * Evaluates decision boundary margin using radial basis function.
 */

class SVMAnomalyDetector {
  calculateMargin(normalizedFeatures, gamma = 0.1) {
    // RBF kernel function distance K(x, 0) = exp(-gamma * ||x||^2)
    let squaredNorm = 0;
    for (const key in normalizedFeatures) {
      squaredNorm += Math.pow(normalizedFeatures[key], 2);
    }

    const rbfDistance = Math.exp(-gamma * squaredNorm);
    // Margin threshold: smaller RBF value means farther from hyperplane center
    const margin = rbfDistance;
    const anomalyScore = Math.max(0, Math.min(1, 1 - rbfDistance));

    return {
      rbfDistance: Number(rbfDistance.toFixed(4)),
      margin: Number(margin.toFixed(4)),
      anomalyScore: Number(anomalyScore.toFixed(4))
    };
  }
}

module.exports = new SVMAnomalyDetector();
