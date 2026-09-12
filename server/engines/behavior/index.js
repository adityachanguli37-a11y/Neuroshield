const { normalizeFeatures } = require('./preprocessor');
const kmeansDetector = require('./kmeans');
const svmDetector = require('./svm');
const rfClassifier = require('./randomForest');

/**
 * Main Behavioral Identity Engine
 */
function evaluateBehavior(inputFeatures, baselineProfile) {
  const baselineMeans = (baselineProfile && baselineProfile.baselineFeatures) || {
    typingSpeed: 60,
    typingInterval: 120,
    mouseVelocity: 450,
    mouseAccel: 80,
    clickDelay: 180,
    scrollVelocity: 300,
    sessionHour: 14
  };

  const baselineVariances = (baselineProfile && baselineProfile.featureVariances) || {
    typingSpeed: 15,
    typingInterval: 30,
    mouseVelocity: 100,
    mouseAccel: 25,
    clickDelay: 40,
    scrollVelocity: 80,
    sessionHour: 4
  };

  // 1. Feature normalization
  const normalized = normalizeFeatures(inputFeatures, baselineMeans, baselineVariances);

  // 2. K-Means evaluation
  const kmeansResult = kmeansDetector.calculateDistance(normalized);

  // 3. SVM evaluation
  const svmResult = svmDetector.calculateMargin(normalized);

  // 4. Random Forest evaluation
  const rfResult = rfClassifier.classify(normalized);

  // Ensemble Anomaly Score: Weighted combination (K-Means 30%, SVM 30%, Random Forest 40%)
  const ensembleAnomalyScore = Number(
    (kmeansResult.anomalyScore * 0.3 + svmResult.anomalyScore * 0.3 + rfResult.rfAnomalyScore * 0.4).toFixed(4)
  );

  let classification = 'GENUINE';
  if (ensembleAnomalyScore >= 0.65) {
    classification = 'ANOMALOUS';
  } else if (ensembleAnomalyScore >= 0.40) {
    classification = 'SUSPICIOUS';
  }

  const confidence = Number(((rfResult.confidence + (1 - Math.abs(ensembleAnomalyScore - 0.5))) / 2).toFixed(2));
  const behaviorScore = Math.max(0, Math.min(100, Math.round((1 - ensembleAnomalyScore) * 100)));

  return {
    normalizedFeatures: normalized,
    kmeansDistance: kmeansResult.distance,
    svmDistance: svmResult.rbfDistance,
    rfAnomalyScore: rfResult.rfAnomalyScore,
    anomalyScore: ensembleAnomalyScore,
    behaviorScore,
    classification,
    confidence,
    explanation: `Behavioral evaluation completed. K-Means dist: ${kmeansResult.distance}, SVM dist: ${svmResult.rbfDistance}, RF anomaly vote: ${rfResult.votesForAnomaly}/${rfResult.totalTrees}. Result: ${classification}.`
  };
}

module.exports = {
  evaluateBehavior
};
