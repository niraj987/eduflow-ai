// tutor.js - GenAI Tutor, Quiz Engine, Summarizer, and Voice Synthesis

class AetherGenAITutor {
  constructor(ragSystem) {
    this.rag = ragSystem;
    this.voiceActive = false;
    this.currentLanguage = 'en-US';
    this.synthesis = window.speechSynthesis;
    
    // Check speech recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = this.currentLanguage;
    }
  }

  // Set tutor voice language
  setLanguage(langCode) {
    this.currentLanguage = langCode;
    if (this.recognition) {
      this.recognition.lang = langCode;
    }
  }

  // Speech-to-Text handler
  startListening(onResult, onError) {
    if (!this.recognition) {
      if (onError) onError("Speech Recognition not supported in this browser.");
      return;
    }
    
    this.recognition.start();
    
    this.recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      if (onResult) onResult(text);
    };

    this.recognition.onerror = (event) => {
      if (onError) onError(event.error);
    };
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  // Text-to-Speech handler
  speak(text) {
    if (!this.synthesis) return;
    
    // Stop any ongoing speech
    this.synthesis.cancel();
    
    if (!this.voiceActive) return;

    // Split text by sentence to read cleanly
    const sentences = text.replace(/<[^>]*>/g, '').split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      if (sentence.trim().length === 0) return;
      const utterance = new SpeechSynthesisUtterance(sentence.trim());
      utterance.lang = this.currentLanguage;
      
      // Select appropriate voice based on language code
      const voices = this.synthesis.getVoices();
      let selectedVoice = null;
      
      if (this.currentLanguage.startsWith('hi')) {
        selectedVoice = voices.find(v => v.lang.startsWith('hi'));
      } else if (this.currentLanguage.startsWith('pa')) {
        selectedVoice = voices.find(v => v.lang.startsWith('pa'));
      }
      
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      this.synthesis.speak(utterance);
    });
  }

  toggleVoice(active) {
    this.voiceActive = active;
    if (!active && this.synthesis) {
      this.synthesis.cancel();
    }
  }

  // Generate answer based on query, RAG context, and simulated Prompt
  async generateAnswer(queryText) {
    // 1. Query the vector database (RAG)
    const ragResult = this.rag.query(queryText, 2);
    let prompt = "";
    let systemResponse = "";
    
    const matchedChunks = ragResult.topMatches.filter(m => m.score > 0.05);
    const context = matchedChunks.length > 0
      ? matchedChunks.map(m => `[Source: ${m.chunk.chapter}]\n"${m.chunk.text}"`).join("\n\n")
      : "No specific textbook section matches found.";

    prompt = `You are a friendly AI study tutor. Answer the student's question using the retrieved context from their textbook.
    Provide your response in clean HTML format (using <h3>, <p>, <ul>, <li>, and <div class="code-box"> where appropriate).
    Keep your explanations brief and educational.
    
    Retrieved Context:
    ${context}
    
    Student Question:
    ${queryText}`;

    // Check if Gemini API key is available
    const apiKey = localStorage.getItem('AETHER_GEMINI_KEY');
    
    if (apiKey && apiKey.trim().length > 0) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Gemini API Error: Status ${response.status}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
          systemResponse = data.candidates[0].content.parts[0].text;
          
          // Clean up HTML wraps if LLM returns them as fenced code blocks
          if (systemResponse.includes('```html')) {
            systemResponse = systemResponse.split('```html')[1].split('```')[0].trim();
          } else if (systemResponse.includes('```')) {
            systemResponse = systemResponse.split('```')[1].split('```')[0].trim();
          }
        } else {
          throw new Error("Invalid response format received from Gemini.");
        }
      } catch (err) {
        console.error(err);
        systemResponse = `<div style="color: var(--color-danger); border: 1px solid var(--color-danger); padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; font-size: 0.8rem;">
          <strong>Live API Connection Failed:</strong> ${err.message}<br>
          <em>Falling back to local simulated response:</em>
        </div>` + this.getSimulatedResponse(queryText, matchedChunks);
      }
    } else {
      // Fallback to simulated response
      systemResponse = this.getSimulatedResponse(queryText, matchedChunks);
    }

    return {
      prompt,
      response: systemResponse,
      sources: matchedChunks.map(m => m.chunk)
    };
  }

  // Local simulated fallback response generator
  getSimulatedResponse(queryText, matchedChunks) {
    let systemResponse = "";
    
    if (matchedChunks.length > 0) {
      // Generate highly structured responses based on topic keywords found
      const lowerQuery = queryText.toLowerCase();
      if (lowerQuery.includes("overfitting")) {
        systemResponse = `<h3>What is Overfitting?</h3>
        <p>Based on our Machine Learning course syllabus (Chapter 2), <strong>overfitting</strong> occurs when a machine learning model matches the training dataset too closely, learning its noise and random details rather than general patterns.</p>
        
        <div class="code-box">
        <strong>Visual Concept:</strong>
        Training Error: 0.01 (Very Low) ➔ Test Error: 0.45 (High Variance)
        </div>

        <h4>Key Signs:</h4>
        <ul>
          <li>Excellent performance (99%+) on training data, but poor accuracy on testing/validation data.</li>
          <li>Low bias, but high variance.</li>
        </ul>

        <h4>How to prevent Overfitting:</h4>
        <ol>
          <li><strong>Regularization:</strong> Use L1 (Lasso) and L2 (Ridge) penalties.</li>
          <li><strong>Cross-Validation:</strong> Train on multiple subsets to verify generalization.</li>
          <li><strong>Simplify:</strong> Reduce model complexity (e.g. limit decision tree depth).</li>
          <li><strong>Data Augmentation:</strong> Acquire more training details or add noise.</li>
        </ol>`;
      } else if (lowerQuery.includes("k-means") || lowerQuery.includes("clustering")) {
        systemResponse = `<h3>Understanding K-Means Clustering</h3>
        <p>According to our syllabus (Chapter 3), <strong>K-Means clustering</strong> is an unsupervised learning algorithm that partitions a dataset into <em>K</em> distinct clusters based on data density.</p>
        
        <div class="concept-diagram">
        <strong>Algorithm Flow:</strong><br>
        [Start] ➔ Select K Centroids ➔ Assign Points (Euclidean Dist) ➔ Recalculate Means ➔ [Loop until stable]
        </div>

        <h4>Step-by-Step Mechanism:</h4>
        <ol>
          <li><strong>Initialization:</strong> Randomly place K centroids in the data field.</li>
          <li><strong>Assignment:</strong> Measure distance from each data point to every centroid. Assign the point to the closest one.</li>
          <li><strong>Update:</strong> Find the mathematical average position (mean) of all points in each cluster. Reposition centroids to this new average.</li>
          <li><strong>Convergence:</strong> Repeat until centroids no longer move.</li>
        </ol>
        <p><em>Elbow Method</em> is typically used to identify the optimal value for <em>K</em> by plotting variance against clusters.</p>`;
      } else if (lowerQuery.includes("neural") || lowerQuery.includes("deep learning")) {
        systemResponse = `<h3>Neural Networks and Deep Learning</h3>
        <p>In our advanced module (Chapter 4), <strong>Neural Networks</strong> are computational nodes modeled after biology. They are composed of layers of artificial neurons.</p>
        
        <div class="code-box">
        <strong>Neuron Calculation:</strong><br>
        Output = ActivationFunction( ∑(Input * Weight) + Bias )
        </div>

        <h4>Structural Layers:</h4>
        <ul>
          <li><strong>Input Layer:</strong> Receives feature inputs (e.g., pixel intensities).</li>
          <li><strong>Hidden Layers:</strong> Extends deep learning capabilities by extracting feature abstractions.</li>
          <li><strong>Output Layer:</strong> Renders classification probabilities or numerical regression output.</li>
        </ul>
        <p><strong>Training Details:</strong> Activations are calculated in <em>forward propagation</em>, errors calculated by a <em>loss function</em>, and weights optimized via <em>backpropagation</em> and gradient descent.</p>`;
      } else if (lowerQuery.includes("dijkstra") || lowerQuery.includes("shortest path")) {
        systemResponse = `<h3>Dijkstra's Shortest Path Algorithm</h3>
        <p>Based on our DSA curriculum (Chapter 5), <strong>Dijkstra's algorithm</strong> finds the shortest path from a starting node to all other nodes in a weighted graph with non-negative edge weights.</p>
        
        <div class="concept-diagram">
        Source Dist = 0 | Unvisited Dist = ∞ ➔ Select Min Node ➔ Relax Edges ➔ Visited
        </div>

        <h4>Working Mechanics:</h4>
        <ol>
          <li>Initialize all distances to infinity, source node distance to 0.</li>
          <li>Put nodes in a priority queue.</li>
          <li>Extract the node with the smallest tentative distance.</li>
          <li>Evaluate all outgoing edges: if (dist[curr] + weight &lt; dist[neighbor]), update neighbor distance.</li>
          <li>Mark node as visited. Repeat until the queue is empty.</li>
        </ol>`;
      } else {
        // Generic response using retrieved context
        systemResponse = `<h3>Tutor Explanation</h3>
        <p>Here is what the syllabus textbooks say about your query:</p>
        <blockquote>${matchedChunks[0].chunk.text}</blockquote>
        <p>This falls under <strong>${matchedChunks[0].chunk.chapter}</strong>. Let me know if you want a detailed quiz on this topic!</p>`;
      }
    } else {
      systemResponse = `<h3>Tutor Assistance</h3>
      <p>I couldn't find a direct match for that topic in our current textbook chapters (Basics, Overfitting, K-Means, Neural Networks, or Dijkstra). However, I can help explain computer science and statistics topics generally! Or you can try asking:</p>
      <ul>
        <li>"What is Overfitting and how do we prevent it?"</li>
        <li>"Explain the steps in K-Means clustering"</li>
        <li>"How do Neural Networks learn?"</li>
        <li>"Explain Dijkstra's shortest path algorithm"</li>
      </ul>`;
    }
    return systemResponse;
  }

  // Generate automated summaries
  generateSummary(text) {
    if (!text || text.trim().length === 0) return null;
    
    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // 1. Simple heuristic summarizer (score sentences by word density & length)
    const scoredSentences = sentences.map((sentence, idx) => {
      const tokens = this.rag.tokenize(sentence);
      let score = tokens.length;
      
      // Boost sentences containing core terms
      const lower = sentence.toLowerCase();
      if (lower.includes("algorithm") || lower.includes("learn") || lower.includes("important") || lower.includes("prevent")) {
        score += 5;
      }
      return { sentence: sentence.trim(), score, idx };
    });

    // Sort by score
    const topSentences = [...scoredSentences]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
      
    // Sort back to chronological order
    topSentences.sort((a, b) => a.idx - b.idx);
    
    const summaryText = topSentences.map(s => s.sentence).join(" ");
    
    // 2. Generate flashcards (Find nouns/keywords to create term cards)
    const keywords = ["Overfitting", "K-Means", "Entropy", "Regularization", "Neural Network", "Heuristic", "Regression"];
    const flashcards = [];
    
    keywords.forEach(word => {
      if (text.toLowerCase().includes(word.toLowerCase())) {
        // Find the sentence containing word
        const sentenceWithWord = sentences.find(s => s.toLowerCase().includes(word.toLowerCase()));
        if (sentenceWithWord) {
          flashcards.push({
            front: word,
            back: sentenceWithWord.trim()
          });
        }
      }
    });

    // Fallback card if empty
    if (flashcards.length === 0) {
      flashcards.push({
        front: "Key Concept",
        back: sentences[0]
      });
    }

    return {
      summary: summaryText,
      flashcards
    };
  }

  // Quiz Builder
  generateQuiz(topicName) {
    // Return custom mock quizzes containing MCQ, T/F and fill-in-blanks
    const lowerTopic = topicName.toLowerCase();
    
    if (lowerTopic.includes("overfit")) {
      return [
        {
          type: "mcq",
          question: "When a model learns details and noise in the training data too closely, it results in:",
          options: ["High bias and low variance", "Poor generalization and high variance", "Lasso compression", "Underfitting"],
          answer: 1, // Option Index 1
          explanation: "Overfitting means the model captures training set noise (low bias) but fails to generalize, causing high test variance."
        },
        {
          type: "tf",
          question: "L2 Regularization (Ridge) adds a penalty equivalent to the absolute values of the weights.",
          answer: false,
          explanation: "L2 regularization adds a squared weight penalty (L2 norm). L1 regularization adds absolute weight penalties."
        },
        {
          type: "fill",
          question: "Reducing overfitting by stopping model training early is called ____________ stopping.",
          answer: "early",
          explanation: "Early stopping monitors validation loss and stops training before the model overfits to the training set."
        }
      ];
    } else if (lowerTopic.includes("k-means") || lowerTopic.includes("cluster")) {
      return [
        {
          type: "mcq",
          question: "What metric is standard for K-Means to measure the proximity of data points to centroids?",
          options: ["Manhattan Distance", "Cosine Similarity", "Euclidean Distance", "Pearson Coefficient"],
          answer: 2,
          explanation: "Euclidean distance is the default geometric metric used to measure distance to cluster centroids."
        },
        {
          type: "tf",
          question: "K-Means clustering is a supervised learning algorithm.",
          answer: false,
          explanation: "K-Means is unsupervised because it clusters unlabeled datasets without target responses."
        },
        {
          type: "fill",
          question: "The method of selecting K by plotting variances and locating the inflection point is the ____________ method.",
          answer: "elbow",
          explanation: "The elbow method plots the sum of squared distances against K and identifies the 'elbow' inflection point."
        }
      ];
    } else {
      // Default: Neural Networks and general concepts
      return [
        {
          type: "mcq",
          question: "Which algorithm computes gradients of the loss function starting from the output layer back to inputs?",
          options: ["Linear Regression", "Backpropagation", "Heuristics", "BFS"],
          answer: 1,
          explanation: "Backpropagation works backwards through a neural network to calculate weight gradient updates."
        },
        {
          type: "tf",
          question: "Dijkstra's shortest path algorithm can work correctly with negative edge weights.",
          answer: false,
          explanation: "No, Dijkstra can loop infinitely or settle on incorrect minimums if edge weights are negative."
        },
        {
          type: "fill",
          question: "A neural network node processes input sum through an ____________ function to add non-linearity.",
          answer: "activation",
          explanation: "Activation functions (such as ReLU or Sigmoid) introduce non-linear mapping capabilities to neural network neurons."
        }
      ];
    }
  }
}

// Global scope
window.AetherTutor = AetherGenAITutor;
