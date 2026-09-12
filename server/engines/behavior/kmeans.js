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
    // Convert distance to anomaly score (0 to 1) using sigmoid scaling
    const anomalyScore = 1 / (1 + Math.exp(-(distance - 2.0)));
    return {
      distance: Number(distance.toFixed(4)),
      anomalyScore: Number(anomalyScore.toFixed(4))
    };
  }
}

module.exports = new KMeansAnomalyDetector();
