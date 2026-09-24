/**
 * K-Means Clustering Anomaly Detector
 * Computes Euclidean distance in normalized feature space to centroid.
 */

class KMeansAnomalyDetector {
  /**
   * Calculates Euclidean distance of normalized feature vector from origin (baseline centroid)
   */
  calculateDistance(normalizedFeatures) {
    let sumSquared = 0;
    let count = 0;

    for (const key in normalizedFeatures) {
      const val = normalizedFeatures[key];
      sumSquared += val * val;
      count++;
    }

    const distance = Math.sqrt(sumSquared);
    // In a 7-dimensional normalized feature space, expected distance for normal variation is ~1.5 - 2.5.
    // Sigmoid is centered at 3.2 (with slope 1.2) so that genuine human cadences yield low anomaly scores.
    const anomalyScore = 1 / (1 + Math.exp(-1.2 * (distance - 3.2)));
    return {
      distance: Number(distance.toFixed(4)),
      anomalyScore: Number(anomalyScore.toFixed(4))
    };
  }
}

module.exports = new KMeansAnomalyDetector();
