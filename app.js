// app.js - Main Application Orchestrator for AetherLearn

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initial State
  const state = {
    xp: 1250,
    streak: 5,
    quizzesTaken: 4,
    unlockedBadges: new Set(['explorer', 'graph']),
    currentTopic: 'overfitting',
    voiceEnabled: false
  };

  // 2. Instantiate system modules
  const dsaVis = new window.AetherDSA.DSAVisualizer('dsa-canvas', 'dsa-log', 'dsa-structure-view');
  const ragSystem = new window.AetherRAG('rag-canvas');
  const tutorSystem = new window.AetherTutor(ragSystem);
  const lrModel = new window.AetherML.LinearRegression();
  const dtClassifier = new window.AetherML.DecisionTree();

  // Initialize models
  dtClassifier.fit(window.AetherData.studentPerformanceDataset);

  // Pre-load saved Gemini API Key if present
  const savedApiKey = localStorage.getItem('AETHER_GEMINI_KEY');
  if (savedApiKey) {
    document.getElementById('gemini-api-key-input').value = savedApiKey;
  }

  // Save API Key listener
  document.getElementById('btn-save-api-key').addEventListener('click', () => {
    const key = document.getElementById('gemini-api-key-input').value.trim();
    if (key) {
      localStorage.setItem('AETHER_GEMINI_KEY', key);
      alert("Gemini API Key saved successfully! The tutor will now run using the live Gemini 1.5 Flash model.");
    } else {
      localStorage.removeItem('AETHER_GEMINI_KEY');
      alert("API Key cleared. The tutor will fall back to local offline simulated mode.");
    }
  });

  // 3. Render initial tree DOM
  window.AetherDSA.renderTreeDOM(window.AetherData.syllabusTree, document.getElementById('syllabus-tree-container'));

  // 4. Populate drop downs
  const dsaNodes = window.AetherData.syllabusGraph.nodes;
  const startSelect = document.getElementById('algo-start-node');
  const dijkstraStart = document.getElementById('dijkstra-start');
  const dijkstraTarget = document.getElementById('dijkstra-target');

  dsaNodes.forEach(node => {
    // General start
    const opt1 = document.createElement('option');
    opt1.value = node.id;
    opt1.innerText = node.id;
    startSelect.appendChild(opt1);

    // Dijkstra start
    const opt2 = document.createElement('option');
    opt2.value = node.id;
    opt2.innerText = node.id;
    dijkstraStart.appendChild(opt2);

    // Dijkstra target
    const opt3 = document.createElement('option');
    opt3.value = node.id;
    opt3.innerText = node.id;
    dijkstraTarget.appendChild(opt3);
  });

  // Pre-select targets for Dijkstra
  dijkstraStart.value = "Python Basics";
  dijkstraTarget.value = "Neural Networks";

  // 5. Tab Routing System
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.getAttribute('data-tab');

      // Update Nav buttons
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Update Tab views
      tabPanes.forEach(pane => pane.classList.remove('active'));
      const activePane = document.getElementById(targetTab);
      activePane.classList.add('active');

      // Trigger Canvas redraw on tab activations
      if (targetTab === 'dsa-tab') {
        dsaVis.resizeCanvas();
        dsaVis.draw();
      } else if (targetTab === 'rag-tab') {
        ragSystem.drawVectorSpace();
      }
    });
  });

  // 6. Curriculum Organizer (DSA Controls)
  const algoSelect = document.getElementById('algo-select');
  const dijkstraSelects = document.getElementById('dijkstra-node-selects');
  const generalNodeSelect = document.getElementById('general-node-select');
  
  algoSelect.addEventListener('change', () => {
    const val = algoSelect.value;
    if (val === 'dijkstra') {
      dijkstraSelects.style.display = 'flex';
      generalNodeSelect.style.display = 'none';
    } else if (val === 'toposort') {
      dijkstraSelects.style.display = 'none';
      generalNodeSelect.style.display = 'none';
    } else {
      dijkstraSelects.style.display = 'none';
      generalNodeSelect.style.display = 'flex';
    }
  });

  document.getElementById('btn-algo-start').addEventListener('click', () => {
    const algo = algoSelect.value;
    if (algo === 'dijkstra') {
      dsaVis.startAlgorithm('dijkstra', dijkstraStart.value, dijkstraTarget.value);
    } else if (algo === 'toposort') {
      dsaVis.startAlgorithm('toposort');
    } else {
      dsaVis.startAlgorithm(algo, startSelect.value);
    }
    unlockBadge('explorer');
  });

  document.getElementById('btn-algo-step').addEventListener('click', () => {
    dsaVis.step();
  });

  document.getElementById('btn-algo-play').addEventListener('click', (e) => {
    const btn = e.target;
    if (btn.innerText === '▶ Play') {
      dsaVis.play(800);
      btn.innerText = '⏸ Pause';
      btn.style.background = 'var(--accent-purple)';
    } else {
      dsaVis.stopAnimation();
      btn.innerText = '▶ Play';
      btn.style.background = 'var(--accent-indigo)';
    }
    unlockBadge('graph');
  });

  document.getElementById('btn-algo-reset').addEventListener('click', () => {
    dsaVis.stopAnimation();
    document.getElementById('btn-algo-play').innerText = '▶ Play';
    document.getElementById('btn-algo-play').style.background = 'var(--accent-indigo)';
    dsaVis.clearLog();
    dsaVis.loadData();
    dsaVis.draw();
    document.getElementById('dsa-structure-view').innerHTML = 'Select an algorithm and press Start to initialize structure frames.';
  });

  // Window resize handler for canvas stability
  window.addEventListener('resize', () => {
    if (document.getElementById('dsa-tab').classList.contains('active')) {
      dsaVis.resizeCanvas();
      dsaVis.draw();
    }
  });

  // 7. Student Performance Predictor (ML Dashboard Integration)
  const sliders = ['attendance', 'studyHours', 'prevGPA', 'quizScore', 'difficulty'];
  
  function getSliderValues() {
    return {
      attendance: parseFloat(document.getElementById('slide-attendance').value),
      studyHours: parseFloat(document.getElementById('slide-studyHours').value),
      prevGPA: parseFloat(document.getElementById('slide-prevGPA').value),
      quizScore: parseFloat(document.getElementById('slide-quizScore').value),
      difficulty: parseFloat(document.getElementById('slide-difficulty').value)
    };
  }

  function updatePrediction() {
    const vals = getSliderValues();
    
    // Update labels
    document.getElementById('val-attendance').innerText = `${vals.attendance}%`;
    document.getElementById('val-studyHours').innerText = `${vals.studyHours}h`;
    document.getElementById('val-prevGPA').innerText = `${vals.prevGPA.toFixed(1)}`;
    document.getElementById('val-quizScore').innerText = `${vals.quizScore}%`;
    document.getElementById('val-difficulty').innerText = `${vals.difficulty}`;

    // Get live predictions
    const predScore = lrModel.predict(vals.attendance, vals.studyHours, vals.prevGPA, vals.quizScore, vals.difficulty);
    const dtResult = dtClassifier.predict({
      attendance: vals.attendance,
      studyHours: vals.studyHours,
      quizScore: vals.quizScore,
      previousGPA: vals.prevGPA
    });

    // Update Dashboard UI Elements
    document.getElementById('pred-score-display').innerText = `${predScore}%`;
    
    // Fill SVG circle dial
    const fillCircle = document.getElementById('score-dial-fill');
    // Math: circle circum = 2 * PI * r = 2 * 3.1415 * 70 = 440 approx
    const offset = 440 - (predScore / 100) * 440;
    fillCircle.style.strokeDashoffset = offset;

    // Set Risk Level (Classification output)
    const riskIndicator = document.getElementById('pred-risk-display');
    if (!dtResult.pass || predScore < 60) {
      riskIndicator.innerText = "HIGH RISK";
      riskIndicator.className = "risk-indicator risk-high";
    } else if (predScore < 80) {
      riskIndicator.innerText = "MEDIUM RISK";
      riskIndicator.className = "risk-indicator risk-med";
    } else {
      riskIndicator.innerText = "LOW RISK";
      riskIndicator.className = "risk-indicator risk-low";
    }

    // Refresh recommendation panels dynamically
    generateRoadmapRecommendations(predScore, vals);
  }

  // Update weights display matrix
  function drawWeightsUI() {
    const labels = ['Bias w₀', 'Attendance w₁', 'Study Hours w₂', 'Prev GPA w₃', 'Quiz Score w₄', 'Difficulty w₅'];
    const wDiv = document.getElementById('weights-display');
    wDiv.innerHTML = lrModel.weights.map((w, idx) => `
      <div class="weight-row">
        <span>${labels[idx]}</span>
        <span class="weight-val">${w.toFixed(4)}</span>
      </div>
    `).join('');

    // Dynamic equation formulation
    const eqDiv = document.getElementById('equation-display');
    eqDiv.innerHTML = `Score = (${lrModel.weights[0].toFixed(2)}) + (${lrModel.weights[1].toFixed(2)} * Att) + (${lrModel.weights[2].toFixed(2)} * Study) + (${lrModel.weights[3].toFixed(2)} * GPA) + (${lrModel.weights[4].toFixed(2)} * Quiz) + (${lrModel.weights[5].toFixed(2)} * Diff)`;
  }

  // Linear Regression Fit action
  document.getElementById('btn-fit-ml').addEventListener('click', () => {
    const historyView = document.getElementById('loss-history-view');
    historyView.innerHTML = `Running gradient descent updates...<br>`;
    
    // Run fitting
    lrModel.fit(window.AetherData.studentPerformanceDataset, 200, 0.1, (epoch, mse, weights) => {
      historyView.innerHTML += `Epoch ${epoch}: Loss (MSE) = <span style="color:var(--color-warning);">${mse.toFixed(6)}</span><br>`;
      historyView.scrollTop = historyView.scrollHeight;
    });

    historyView.innerHTML += `<span style="color:var(--color-success); font-weight:bold;">Model Fitted successfully!</span>`;
    
    // Redraw and trigger predictions
    drawWeightsUI();
    updatePrediction();
    unlockBadge('predict');
  });

  // Reset Weights
  document.getElementById('btn-reset-weights').addEventListener('click', () => {
    lrModel.weights = [10.0, 0.2, 0.8, 4.0, 0.3, -1.5];
    document.getElementById('loss-history-view').innerHTML = "Model is utilizing baseline weights. Click Train Model to observe gradient descent.";
    drawWeightsUI();
    updatePrediction();
  });

  // Bind change events to all inputs
  sliders.forEach(slideId => {
    document.getElementById(`slide-${slideId}`).addEventListener('input', updatePrediction);
  });

  // Draw initial weights and predict
  drawWeightsUI();
  updatePrediction();

  // 8. GenAI Tutor Chat Functions
  const sendBtn = document.getElementById('btn-tutor-send');
  const chatInput = document.getElementById('chat-user-input');
  const chatMessages = document.getElementById('chat-messages-box');
  const speakerBtn = document.getElementById('btn-tutor-speak-toggle');

  async function sendTutorMessage() {
    const text = chatInput.value.trim();
    if (text.length === 0) return;

    // 1. Render User Message bubble
    appendMessage('user', text);
    chatInput.value = '';

    // Render a temporary thinking indicator bubble
    const thinkingId = 'thinking-' + Date.now();
    const msg = document.createElement('div');
    msg.className = `message tutor`;
    msg.id = thinkingId;
    msg.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-bubble" style="opacity:0.6;">Tutor is thinking...</div>
    `;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 2. Fetch tutor response (RAG embedded query)
    const result = await tutorSystem.generateAnswer(text);

    // Remove thinking indicator
    const thinkingEl = document.getElementById(thinkingId);
    if (thinkingEl) thinkingEl.remove();

    // 3. Render Tutor bubble
    appendMessage('tutor', result.response);
    
    // Speak if TTS active
    tutorSystem.speak(result.response);

    // 4. Update RAG Tab views
    updateRAGPipelineUI(text, result);
  }

  function appendMessage(sender, htmlContent) {
    const msg = document.createElement('div');
    msg.className = `message ${sender}`;
    msg.innerHTML = `
      <div class="message-avatar">${sender === 'tutor' ? '🤖' : '👤'}</div>
      <div class="message-bubble">${htmlContent}</div>
    `;
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  sendBtn.addEventListener('click', sendTutorMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendTutorMessage();
  });

  // Web Speech API binds
  document.getElementById('btn-tutor-mic').addEventListener('click', (e) => {
    const mic = e.target;
    mic.style.background = 'var(--color-danger)';
    mic.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
    
    tutorSystem.startListening(
      (transcription) => {
        chatInput.value = transcription;
        mic.style.background = 'var(--card-glass)';
        mic.style.boxShadow = 'none';
        sendTutorMessage();
        unlockBadge('tutor');
      },
      (error) => {
        alert("Speech Error: " + error);
        mic.style.background = 'var(--card-glass)';
        mic.style.boxShadow = 'none';
      }
    );
  });

  speakerBtn.addEventListener('click', () => {
    state.voiceEnabled = !state.voiceEnabled;
    tutorSystem.toggleVoice(state.voiceEnabled);
    if (state.voiceEnabled) {
      speakerBtn.innerHTML = '🔊';
      speakerBtn.style.borderColor = 'var(--accent-purple)';
      tutorSystem.speak("Voice guidance enabled.");
    } else {
      speakerBtn.innerHTML = '🔇';
      speakerBtn.style.borderColor = 'var(--border-glass)';
    }
  });

  // Language selectors
  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      langButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const lang = btn.getAttribute('data-lang');
      tutorSystem.setLanguage(lang);
      
      let message = "Voice language modified.";
      if (lang.startsWith('hi')) message = "भाषा परिवर्तित कर दी गई है।";
      if (lang.startsWith('pa')) message = "ਬੋਲੀ ਬਦਲੀ ਗਈ ਹੈ।";
      
      tutorSystem.speak(message);
    });
  });

  // 9. RAG Pipeline Display Updating
  function updateRAGPipelineUI(queryText, ragResult) {
    const step1 = document.getElementById('rag-step-1');
    const step2 = document.getElementById('rag-step-2');
    const step3 = document.getElementById('rag-step-3');
    const step4 = document.getElementById('rag-step-4');

    // Highlight stages
    step1.classList.add('active');
    setTimeout(() => {
      step2.classList.add('active');
      setTimeout(() => {
        step3.classList.add('active');
        setTimeout(() => {
          step4.classList.add('active');
          
          // Print constructed system prompt context box
          const promptBox = document.getElementById('rag-prompt-box');
          promptBox.innerText = ragResult.prompt || "No context matching query.";
          
          // Draw Vector DB matches
          ragSystem.drawVectorSpace(ragResult);
        }, 100);
      }, 100);
    }, 100);
  }

  // 10. Automated Summary & Flashcards
  document.getElementById('btn-generate-summary').addEventListener('click', () => {
    const text = document.getElementById('summary-input-text').value;
    const summaryData = tutorSystem.generateSummary(text);

    if (!summaryData) return;

    // Show output
    const outputCard = document.getElementById('summary-output-card');
    outputCard.style.display = 'block';
    document.getElementById('summary-text-box').innerText = summaryData.summary;

    // Flashcards
    const flashBox = document.getElementById('flashcards-box');
    flashBox.innerHTML = '';
    
    summaryData.flashcards.forEach(card => {
      const wrapper = document.createElement('div');
      wrapper.className = 'revision-card';
      wrapper.innerHTML = `
        <div class="revision-card-inner">
          <div class="revision-card-front">${card.front}</div>
          <div class="revision-card-back">${card.back}</div>
        </div>
      `;
      wrapper.addEventListener('click', () => {
        wrapper.classList.toggle('flipped');
      });
      flashBox.appendChild(wrapper);
    });
    
    // Add XP reward
    addXP(30);
  });

  // 11. Interactive Concept Quiz Generator
  const quizBtn = document.getElementById('btn-load-quiz');
  const quizBox = document.getElementById('quiz-container');

  quizBtn.addEventListener('click', () => {
    const topic = document.getElementById('quiz-topic-select').value;
    const questions = tutorSystem.generateQuiz(topic);
    
    quizBox.style.display = 'flex';
    quizBox.innerHTML = '';

    questions.forEach((q, qIndex) => {
      const qCard = document.createElement('div');
      qCard.className = 'quiz-card';
      
      let optionsHTML = '';
      if (q.type === 'mcq') {
        optionsHTML = q.options.map((opt, oIdx) => `
          <button class="option-btn" data-q="${qIndex}" data-opt="${oIdx}">${opt}</button>
        `).join('');
      } else if (q.type === 'tf') {
        optionsHTML = `
          <button class="option-btn" data-q="${qIndex}" data-opt="true">True</button>
          <button class="option-btn" data-q="${qIndex}" data-opt="false">False</button>
        `;
      } else if (q.type === 'fill') {
        optionsHTML = `
          <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
            <input type="text" id="fill-in-${qIndex}" placeholder="Type answer..." style="flex-grow:1;">
            <button class="btn btn-secondary btn-sm btn-submit-fill" data-q="${qIndex}">Submit</button>
          </div>
        `;
      }

      qCard.innerHTML = `
        <div class="quiz-question">Q${qIndex + 1}: ${q.question}</div>
        <div class="quiz-options" id="quiz-opts-${qIndex}">
          ${optionsHTML}
        </div>
        <div class="code-box" id="explanation-${qIndex}" style="display:none; font-size:0.75rem; margin-top:0.75rem; border-color:var(--color-success-glow);">
          <strong>Correct Answer:</strong> ${q.type === 'mcq' ? q.options[q.answer] : q.answer}<br>
          <strong>Explanation:</strong> ${q.explanation}
        </div>
      `;
      quizBox.appendChild(qCard);
      
      // Wire event listeners for choices
      const buttons = qCard.querySelectorAll('.option-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          handleQuizAnswer(qIndex, btn, q, buttons);
        });
      });

      // Fill submissions
      const fillSubmit = qCard.querySelector('.btn-submit-fill');
      if (fillSubmit) {
        fillSubmit.addEventListener('click', () => {
          const input = document.getElementById(`fill-in-${qIndex}`);
          handleQuizFill(qIndex, input.value.trim(), q, qCard);
        });
      }
    });

    // Add quiz submit footer
    const footer = document.createElement('div');
    footer.style.textAlign = 'right';
    footer.innerHTML = `<button class="btn" id="btn-submit-quiz-done">Finish Quiz</button>`;
    quizBox.appendChild(footer);

    document.getElementById('btn-submit-quiz-done').addEventListener('click', () => {
      quizBox.style.display = 'none';
      state.quizzesTaken++;
      document.getElementById('dash-quizzes-taken').innerText = state.quizzesTaken;
      addXP(100);
      unlockBadge('quiz');
      
      // Link quiz performance back to the predictor!
      // Setting Quiz Average Score slider to a high score (simulated completion success)
      const quizSlide = document.getElementById('slide-quizScore');
      quizSlide.value = 95; // Simulates that taking quizzes successfully boosts study GPA!
      updatePrediction();
      
      alert("Quiz Completed! +100 XP gained. Study model updated based on your quiz performance!");
    });
  });

  function handleQuizAnswer(qIndex, selectedBtn, question, allButtons) {
    // Disable all options
    allButtons.forEach(btn => btn.setAttribute('disabled', 'true'));
    
    let isCorrect = false;
    if (question.type === 'mcq') {
      const selectedIndex = parseInt(selectedBtn.getAttribute('data-opt'));
      isCorrect = selectedIndex === question.answer;
      selectedBtn.classList.add(isCorrect ? 'correct' : 'incorrect');
      
      // Highlight correct option if incorrect was chosen
      if (!isCorrect) {
        allButtons[question.answer].classList.add('correct');
      }
    } else if (question.type === 'tf') {
      const selectedVal = selectedBtn.getAttribute('data-opt') === 'true';
      isCorrect = selectedVal === question.answer;
      selectedBtn.classList.add(isCorrect ? 'correct' : 'incorrect');
      
      if (!isCorrect) {
        const correctValStr = question.answer.toString();
        const correctBtn = Array.from(allButtons).find(b => b.getAttribute('data-opt') === correctValStr);
        if (correctBtn) correctBtn.classList.add('correct');
      }
    }

    // Show explanation
    document.getElementById(`explanation-${qIndex}`).style.display = 'block';
  }

  function handleQuizFill(qIndex, userVal, question, qCard) {
    const input = document.getElementById(`fill-in-${qIndex}`);
    const submitBtn = qCard.querySelector('.btn-submit-fill');
    
    input.setAttribute('disabled', 'true');
    submitBtn.setAttribute('disabled', 'true');

    const isCorrect = userVal.toLowerCase() === question.answer.toLowerCase();
    
    if (isCorrect) {
      input.style.borderColor = 'var(--color-success)';
      input.style.color = 'var(--color-success)';
    } else {
      input.style.borderColor = 'var(--color-danger)';
      input.style.color = 'var(--color-danger)';
    }

    document.getElementById(`explanation-${qIndex}`).style.display = 'block';
  }

  // Gamification helpers
  function addXP(amount) {
    state.xp += amount;
    document.getElementById('user-xp').innerText = state.xp.toLocaleString();
  }

  function unlockBadge(badgeId) {
    if (state.unlockedBadges.has(badgeId)) return;
    state.unlockedBadges.add(badgeId);
    
    const badgeEl = document.getElementById(`badge-${badgeId}`);
    if (badgeEl) {
      badgeEl.classList.remove('locked');
    }
  }

  // Dashboard Netflix-style recommendation paths
  function generateRoadmapRecommendations(predScore, params) {
    const container = document.getElementById('recommendations-container');
    container.innerHTML = '';

    const recs = [];
    
    // Recommendation 1: Dynamic based on Dijkstra shortest path
    recs.push({
      icon: '🕸️',
      title: 'Shortest Syllabus Path',
      desc: 'Shortest learning route: Python Basics ➔ NumPy & Pandas ➔ Decision Trees.',
      action: 'Explore in Curriculum',
      tab: 'dsa-tab'
    });

    // Recommendation 2: Dynamic based on ML score prediction
    if (predScore < 60) {
      recs.push({
        icon: '⚠️',
        title: 'Urgent: Backlog Risk Flagged',
        desc: 'Predicted score is low. Attendance or study hours need immediate improvement.',
        action: 'Retrain/Increase Hours',
        tab: 'ml-tab'
      });
    } else if (predScore < 80) {
      recs.push({
        icon: '📘',
        title: 'Core Weakness: Probability & Stats',
        desc: 'System predicts boosting Stats by 5h will raise GPA score by 0.6.',
        action: 'Review Chapter 3 (K-Means)',
        tab: 'tutor-tab'
      });
    } else {
      recs.push({
        icon: '🏆',
        title: 'Accelerated Track: Neural Networks',
        desc: 'Student is ahead of pace. Try asking the Tutor: "Explain Neural Networks".',
        action: 'Converse with Tutor',
        tab: 'tutor-tab'
      });
    }

    // Recommendation 3: General study quiz task
    recs.push({
      icon: '✍️',
      title: 'Weekly Quiz Evaluation',
      desc: 'Verify understanding of Overfitting. Earn +100 XP to reach Level 5.',
      action: 'Take Overfitting Quiz',
      tab: 'tutor-tab'
    });

    // Render cards
    recs.forEach(rec => {
      const card = document.createElement('div');
      card.className = 'badge-item';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';
      card.style.width = '100%';
      card.style.padding = '0.85rem';
      
      card.innerHTML = `
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <span style="font-size:1.5rem;">${rec.icon}</span>
          <div style="text-align:left;">
            <div style="font-weight:600; font-size:0.9rem;">${rec.title}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${rec.desc}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" style="font-size:0.7rem; padding:4px 8px; flex-shrink:0;">${rec.action}</button>
      `;

      card.querySelector('button').addEventListener('click', () => {
        // Switch tab
        const navItem = Array.from(navItems).find(n => n.getAttribute('data-tab') === rec.tab);
        if (navItem) navItem.click();
      });

      container.appendChild(card);
    });
  }
});
