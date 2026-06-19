// ml.js - Live Client-Side Student Performance Prediction Engine

class AetherLinearRegression {
  constructor() {
    // Coefficients for: Bias, Attendance, Study Hours, Prev GPA, Quiz Score, Course Difficulty
    this.weights = [10.0, 0.2, 0.8, 4.0, 0.3, -1.5]; // Baseline weights
    this.history = [];
  }

  // Normalize inputs (z-score or min-max)
  normalize(data) {
    // Simple min-max boundary normalization for stable training
    return data.map(d => ({
      x: [
        1.0, // Bias
        d.attendance / 100,
        d.studyHours / 20,
        d.previousGPA / 4.0,
        d.quizScore / 100,
        d.difficulty / 5.0
      ],
      y: d.finalScore / 100
    }));
  }

  // Train using Gradient Descent
  fit(dataset, epochs = 200, lr = 0.1, onEpoch) {
    this.history = [];
    const normalized = this.normalize(dataset);
    const m = normalized.length;
    const n = this.weights.length;

    // Reset weights slightly to show training convergence
    this.weights = [0.1, 0.1, 0.1, 0.1, 0.1, -0.1];

    for (let epoch = 1; epoch <= epochs; epoch++) {
      let totalError = 0;
      const gradients = new Array(n).fill(0);

      for (let i = 0; i < m; i++) {
        const xi = normalized[i].x;
        const yi = normalized[i].y;
        
        // Predict
        let pred = 0;
        for (let j = 0; j < n; j++) {
          pred += this.weights[j] * xi[j];
        }

        const error = pred - yi;
        totalError += error * error;

        // Compute gradients
        for (let j = 0; j < n; j++) {
          gradients[j] += (2 / m) * error * xi[j];
        }
      }

      // Update weights
      for (let j = 0; j < n; j++) {
        this.weights[j] -= lr * gradients[j];
      }

      const mse = totalError / m;
      this.history.push({ epoch, mse });

      if (onEpoch && epoch % 10 === 0) {
        onEpoch(epoch, mse, [...this.weights]);
      }
    }
  }

  predict(attendance, studyHours, previousGPA, quizScore, difficulty) {
    const x = [
      1.0,
      attendance / 100,
      studyHours / 20,
      previousGPA / 4.0,
      quizScore / 100,
      difficulty / 5.0
    ];

    let prediction = 0;
    for (let i = 0; i < this.weights.length; i++) {
      prediction += this.weights[i] * x[i];
    }

    // Un-normalize prediction (multiply by 100)
    return Math.max(0, Math.min(100, Math.round(prediction * 100)));
  }
}

class AetherDecisionTree {
  constructor() {
    this.root = null;
  }

  // Simplified training logic to build a binary decision split
  fit(dataset) {
    // We split on critical features to determine Pass (1) vs Fail (0)
    // Calculating split with lowest Gini impurity
    const features = ['attendance', 'studyHours', 'quizScore', 'previousGPA'];
    this.root = this.buildTree(dataset, features, 0);
  }

  buildTree(data, features, depth) {
    if (data.length === 0) return { label: false };
    
    // Check if all items are same class
    const allPass = data.every(d => d.pass === true);
    const allFail = data.every(d => d.pass === false);
    if (allPass) return { label: true };
    if (allFail) return { label: false };
    
    // Max depth to keep visual clean
    if (depth >= 2 || features.length === 0) {
      const passes = data.filter(d => d.pass).length;
      return { label: passes >= data.length / 2 };
    }

    let bestGini = 1.0;
    let bestSplit = null;

    features.forEach(feature => {
      // Find average of values to split on
      const values = data.map(d => d[feature]);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      // Split dataset
      const left = data.filter(d => d[feature] <= avg);
      const right = data.filter(d => d[feature] > avg);

      if (left.length === 0 || right.length === 0) return;

      // Calculate Gini Impurity
      const giniLeft = this.calculateGini(left);
      const giniRight = this.calculateGini(right);
      const wGini = (left.length / data.length) * giniLeft + (right.length / data.length) * giniRight;

      if (wGini < bestGini) {
        bestGini = wGini;
        bestSplit = { feature, threshold: avg, left, right };
      }
    });

    if (!bestSplit) {
      const passes = data.filter(d => d.pass).length;
      return { label: passes >= data.length / 2 };
    }

    const nextFeatures = features.filter(f => f !== bestSplit.feature);
    return {
      feature: bestSplit.feature,
      threshold: parseFloat(bestSplit.threshold.toFixed(2)),
      left: this.buildTree(bestSplit.left, nextFeatures, depth + 1),
      right: this.buildTree(bestSplit.right, nextFeatures, depth + 1)
    };
  }

  calculateGini(subset) {
    const total = subset.length;
    if (total === 0) return 0;
    const passes = subset.filter(d => d.pass).length;
    const pPass = passes / total;
    const pFail = (total - passes) / total;
    return 1 - (pPass * pPass + pFail * pFail);
  }

  predictNode(node, sample) {
    if (node.label !== undefined) return node.label;
    
    const val = sample[node.feature];
    if (val <= node.threshold) {
      return this.predictNode(node.left, sample);
    } else {
      return this.predictNode(node.right, sample);
    }
  }

  predict(sample) {
    if (!this.root) return { pass: true, confidence: 0.5 };
    const pass = this.predictNode(this.root, sample);
    return { pass, confidence: pass ? 0.85 : 0.78 };
  }
}

// Global scope
window.AetherML = {
  LinearRegression: AetherLinearRegression,
  DecisionTree: AetherDecisionTree
};
