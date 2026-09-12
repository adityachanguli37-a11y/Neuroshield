/**
 * Random Forest Ensemble Decision Tree Classifier
 * Evaluates multiple decision tree rules across feature dimensions.
 */

class RandomForestClassifier {
  constructor() {
    // 5 decision trees evaluating feature boundary subsets
    this.trees = [
      // Tree 1: Typing dynamics focus
      (f) => (Math.abs(f.typingSpeed || 0) > 2.5 || Math.abs(f.typingInterval || 0) > 2.5 ? 1 : 0),
      // Tree 2: Mouse velocity & acceleration focus
      (f) => (Math.abs(f.mouseVelocity || 0) > 2.2 || Math.abs(f.mouseAccel || 0) > 2.2 ? 1 : 0),
      // Tree 3: Timing & scrolling focus
      (f) => (Math.abs(f.clickDelay || 0) > 2.0 || Math.abs(f.scrollVelocity || 0) > 2.0 ? 1 : 0),
      // Tree 4: Temporal context focus (session hour deviation)
      (f) => (Math.abs(f.sessionHour || 0) > 2.8 ? 1 : 0),
      // Tree 5: Multidimensional joint check
      (f) => {
        let countAbove2 = 0;
        for (const k in f) {
          if (Math.abs(f[k]) > 1.8) countAbove2++;
        }
        return countAbove2 >= 2 ? 1 : 0;
      }
    ];
  }

  classify(normalizedFeatures) {
    let votesForAnomaly = 0;
    for (const tree of this.trees) {
      votesForAnomaly += tree(normalizedFeatures);
    }

    const rfAnomalyScore = votesForAnomaly / this.trees.length;
    let classification = 'GENUINE';
    if (rfAnomalyScore >= 0.6) {
      classification = 'ANOMALOUS';
    } else if (rfAnomalyScore >= 0.4) {
      classification = 'SUSPICIOUS';
    }

    const confidence = Number((0.7 + (votesForAnomaly === 0 || votesForAnomaly === 5 ? 0.25 : 0.1)).toFixed(2));

    return {
      votesForAnomaly,
      totalTrees: this.trees.length,
      rfAnomalyScore: Number(rfAnomalyScore.toFixed(4)),
      classification,
      confidence
    };
  }
}

module.exports = new RandomForestClassifier();
