// Syllabus Tree structure representing subjects and topics hierarchy
const syllabusTree = {
  name: "Personalized Learning Path",
  children: [
    {
      name: "Programming & Data Prep",
      children: [
        { name: "Python Basics", detail: "Syntax, data structures, control flow" },
        { name: "NumPy & Pandas", detail: "Array manipulation, DataFrames, cleaning" },
        { name: "Data Visualization", detail: "Matplotlib, Seaborn, plotting" }
      ]
    },
    {
      name: "Mathematics & Statistics",
      children: [
        { name: "Descriptive Statistics", detail: "Mean, median, mode, variance, standard deviation" },
        { name: "Probability Basics", detail: "Bayes theorem, distributions, random variables" },
        { name: "Linear Algebra", detail: "Vectors, matrices, eigenvalues" }
      ]
    },
    {
      name: "Machine Learning Foundations",
      children: [
        { name: "Linear Regression", detail: "Cost functions, gradient descent, line fitting" },
        { name: "Decision Trees", detail: "Entropy, Information Gain, classification" },
        { name: "K-Means Clustering", detail: "Unsupervised learning, centroids, distance metrics" }
      ]
    },
    {
      name: "Advanced Machine Learning",
      children: [
        { name: "Random Forests", detail: "Ensemble learning, bagging, bootstrap sampling" },
        { name: "Neural Networks", detail: "Activation functions, layers, backpropagation" },
        { name: "Model Evaluation", detail: "Precision, recall, F1-score, ROC curves" }
      ]
    }
  ]
};

// Curriculum Graph with nodes (topics) and weighted edges (dependencies)
const syllabusGraph = {
  nodes: [
    { id: "Python Basics", x: 120, y: 100, category: "Programming" },
    { id: "NumPy & Pandas", x: 120, y: 250, category: "Programming" },
    { id: "Data Visualization", x: 280, y: 100, category: "Programming" },
    { id: "Descriptive Statistics", x: 440, y: 100, category: "Math & Stats" },
    { id: "Probability Basics", x: 600, y: 100, category: "Math & Stats" },
    { id: "Linear Algebra", x: 440, y: 250, category: "Math & Stats" },
    { id: "Linear Regression", x: 280, y: 380, category: "ML Foundations" },
    { id: "Decision Trees", x: 120, y: 380, category: "ML Foundations" },
    { id: "K-Means Clustering", x: 440, y: 380, category: "ML Foundations" },
    { id: "Random Forests", x: 200, y: 500, category: "Advanced ML" },
    { id: "Neural Networks", x: 500, y: 500, category: "Advanced ML" }
  ],
  edges: [
    { source: "Python Basics", target: "NumPy & Pandas", weight: 1 },
    { source: "Python Basics", target: "Data Visualization", weight: 2 },
    { source: "NumPy & Pandas", target: "Linear Regression", weight: 3 },
    { source: "NumPy & Pandas", target: "Decision Trees", weight: 2 },
    { source: "Descriptive Statistics", target: "Probability Basics", weight: 1 },
    { source: "Descriptive Statistics", target: "Linear Regression", weight: 2 },
    { source: "Descriptive Statistics", target: "K-Means Clustering", weight: 2 },
    { source: "Linear Algebra", target: "Neural Networks", weight: 4 },
    { source: "Probability Basics", target: "Neural Networks", weight: 3 },
    { source: "Linear Regression", target: "Neural Networks", weight: 3 },
    { source: "Decision Trees", target: "Random Forests", weight: 1 }
  ]
};

// Mock educational dataset inspired by UCI Student Performance dataset.
// Used for showing training data and training the client-side Linear Regression / Decision Tree model.
const studentPerformanceDataset = [
  { studentId: 1, attendance: 95, studyHours: 15, previousGPA: 3.8, quizScore: 92, difficulty: 2, finalScore: 94, pass: true },
  { studentId: 2, attendance: 80, studyHours: 8, previousGPA: 2.7, quizScore: 65, difficulty: 4, finalScore: 68, pass: true },
  { studentId: 3, attendance: 65, studyHours: 4, previousGPA: 2.1, quizScore: 48, difficulty: 5, finalScore: 45, pass: false },
  { studentId: 4, attendance: 90, studyHours: 12, previousGPA: 3.4, quizScore: 85, difficulty: 3, finalScore: 87, pass: true },
  { studentId: 5, attendance: 88, studyHours: 10, previousGPA: 3.1, quizScore: 78, difficulty: 3, finalScore: 80, pass: true },
  { studentId: 6, attendance: 70, studyHours: 6, previousGPA: 2.5, quizScore: 58, difficulty: 4, finalScore: 55, pass: false },
  { studentId: 7, attendance: 98, studyHours: 18, previousGPA: 3.9, quizScore: 96, difficulty: 2, finalScore: 97, pass: true },
  { studentId: 8, attendance: 75, studyHours: 7, previousGPA: 2.8, quizScore: 70, difficulty: 3, finalScore: 71, pass: true },
  { studentId: 9, attendance: 60, studyHours: 3, previousGPA: 2.0, quizScore: 40, difficulty: 5, finalScore: 38, pass: false },
  { studentId: 10, attendance: 85, studyHours: 11, previousGPA: 3.2, quizScore: 80, difficulty: 3, finalScore: 82, pass: true },
  { studentId: 11, attendance: 92, studyHours: 14, previousGPA: 3.6, quizScore: 88, difficulty: 2, finalScore: 90, pass: true },
  { studentId: 12, attendance: 72, studyHours: 5, previousGPA: 2.4, quizScore: 50, difficulty: 4, finalScore: 52, pass: false },
  { studentId: 13, attendance: 96, studyHours: 16, previousGPA: 3.85, quizScore: 94, difficulty: 1, finalScore: 96, pass: true },
  { studentId: 14, attendance: 82, studyHours: 9, previousGPA: 2.9, quizScore: 72, difficulty: 3, finalScore: 74, pass: true },
  { studentId: 15, attendance: 68, studyHours: 4.5, previousGPA: 2.3, quizScore: 52, difficulty: 4, finalScore: 49, pass: false }
];

// Textbook content loaded by the Retrieval Augmented Generation (RAG) system
const textbookChapters = [
  {
    chapter: "Chapter 1: Machine Learning Basics",
    content: "Machine learning is a field of artificial intelligence focused on building systems that learn from data. Supervised learning models train on labeled data where each sample has an associated ground-truth target. Unsupervised learning models train on unlabeled data, finding hidden patterns or structures. Key challenges in machine learning include data quality, feature selection, and the bias-variance tradeoff. When models learn noise instead of general patterns, it is called overfitting."
  },
  {
    chapter: "Chapter 2: Overfitting and Regularization",
    content: "Overfitting occurs when a machine learning model matches the training dataset too closely, resulting in poor generalization on unseen data. Signs of overfitting include high training accuracy but low test accuracy. It usually indicates low bias and high variance. To prevent overfitting, practitioners use techniques like L1 (Lasso) and L2 (Ridge) regularization to penalize complex models. Other methods include cross-validation, dropout in neural networks, early stopping, and acquiring more training data."
  },
  {
    chapter: "Chapter 3: Unsupervised Learning & K-Means",
    content: "K-Means clustering is an unsupervised learning algorithm that partitions a dataset into K clusters. The algorithm starts by randomly placing K centroids in the data space. Next, each data point is assigned to its nearest centroid based on Euclidean distance. Centroids are then recomputed as the mathematical mean of all points assigned to that cluster. This process repeats until centroids stabilize. A major drawback of K-Means is that the user must choose the value of K beforehand, often using the elbow method."
  },
  {
    chapter: "Chapter 4: Neural Networks and Deep Learning",
    content: "Neural Networks are computational models inspired by the biology of the brain. They consist of input, hidden, and output layers filled with artificial neurons. Each neuron calculates a weighted sum of inputs, adds a bias term, and feeds the result into an activation function like ReLU, Sigmoid, or Tanh. Training neural networks involves forward propagation to calculate predicted outputs, a loss function to measure errors, and backpropagation using gradient descent to iteratively adjust weights and minimize errors."
  },
  {
    chapter: "Chapter 5: Dijkstra's Algorithm for Graphs",
    content: "Dijkstra's algorithm is a greedy search method that solves the single-source shortest path problem on a weighted graph with non-negative edge weights. It starts at a source node, setting its distance to zero and all other distances to infinity. Using a priority queue, it repeatedly selects the unvisited node with the smallest cumulative distance, evaluates its edges, and updates neighbor distances if a shorter path is found. Once marked visited, a node's shortest path is finalized. Dijkstra's is widely used in network routing and GPS navigation."
  }
];

// Export datasets to global scope for browser files
window.EduFlowData = {
  syllabusTree,
  syllabusGraph,
  studentPerformanceDataset,
  textbookChapters
};
