// dsa.js - Algorithms and Visualizer for EduFlow AI

class DSAVisualizer {
  constructor(canvasId, logContainerId, stateContainerId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.logContainer = document.getElementById(logContainerId);
    this.stateContainer = document.getElementById(stateContainerId);
    
    this.nodes = [];
    this.edges = [];
    this.nodeMap = new Map();
    
    // Animation state
    this.activeGenerator = null;
    this.animationTimer = null;
    this.highlightedNodes = new Set();
    this.visitedNodes = new Set();
    this.currentNode = null;
    this.highlightedEdges = new Set(); // Stores string representation "source-target"
    this.shortestPathEdges = new Set();
    
    this.algorithmQueue = [];
    this.algorithmStack = [];
    this.algorithmDistances = {};
    this.algorithmPredecessors = {};
    this.algorithmIndegrees = {};
    
    this.loadData();
    this.resizeCanvas();
    this.draw();
  }

  loadData() {
    const data = window.EduFlowData.syllabusGraph;
    this.nodes = JSON.parse(JSON.stringify(data.nodes));
    this.edges = JSON.parse(JSON.stringify(data.edges));
    this.nodeMap.clear();
    this.nodes.forEach(n => this.nodeMap.set(n.id, n));
  }

  resizeCanvas() {
    // Set dynamic size based on container
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = 550;
  }

  logMessage(message) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logItem = document.createElement('div');
    logItem.className = 'log-item';
    logItem.innerHTML = `<span class="log-time">[${time}]</span> ${message}`;
    this.logContainer.appendChild(logItem);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  clearLog() {
    this.logContainer.innerHTML = '';
  }

  updateStateView(type, data) {
    if (type === 'bfs' || type === 'dfs') {
      const isQueue = type === 'bfs';
      this.stateContainer.innerHTML = `
        <div class="state-title">${isQueue ? 'Queue (FIFO)' : 'Stack (LIFO)'} Structure:</div>
        <div class="state-items">
          ${data.map((item, idx) => `<span class="state-badge ${idx === 0 && isQueue ? 'active' : ''}">${item}</span>`).join(' ➔ ') || '<span class="empty-state">Empty</span>'}
        </div>
        <div class="state-title">Visited Set:</div>
        <div class="state-visited">
          ${Array.from(this.visitedNodes).map(node => `<span class="visited-badge">${node}</span>`).join(' ')}
        </div>
      `;
    } else if (type === 'dijkstra') {
      const tableRows = this.nodes.map(n => {
        const dist = this.algorithmDistances[n.id];
        const displayDist = dist === Infinity ? '∞' : dist;
        const pred = this.algorithmPredecessors[n.id] || 'None';
        const isVisited = this.visitedNodes.has(n.id) ? '✓ Visited' : 'Unvisited';
        return `
          <tr>
            <td>${n.id}</td>
            <td class="${dist !== Infinity ? 'highlighted-dist' : ''}">${displayDist}</td>
            <td>${pred}</td>
            <td><span class="status-indicator ${this.visitedNodes.has(n.id) ? 'final' : ''}">${isVisited}</span></td>
          </tr>
        `;
      }).join('');
      
      this.stateContainer.innerHTML = `
        <div class="state-title">Dijkstra Shortest Path Matrix:</div>
        <table class="dsa-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Distance</th>
              <th>Predecessor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      `;
    } else if (type === 'toposort') {
      const tableRows = this.nodes.map(n => {
        const indegree = this.algorithmIndegrees[n.id];
        return `
          <tr>
            <td>${n.id}</td>
            <td class="${indegree === 0 ? 'zero-indegree' : ''}">${indegree}</td>
          </tr>
        `;
      }).join('');

      this.stateContainer.innerHTML = `
        <div class="state-title">In-Degrees (Prerequisites Left):</div>
        <table class="dsa-table compact">
          <thead>
            <tr>
              <th>Topic</th>
              <th>In-Degree</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="state-title">Topological Sort Result Order:</div>
        <div class="state-items">
          ${data.map(node => `<span class="topo-badge">${node}</span>`).join(' ➔ ') || '<span class="empty-state">No items processed yet</span>'}
        </div>
      `;
    }
  }

  // Draw Graph
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 1. Draw Edges
    this.edges.forEach(edge => {
      const sourceNode = this.nodeMap.get(edge.source);
      const targetNode = this.nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) return;
      
      const edgeKey = `${edge.source}-${edge.target}`;
      let strokeColor = '#3e3e57';
      let strokeWidth = 2;
      let isShortest = this.shortestPathEdges.has(edgeKey);
      let isHighlighted = this.highlightedEdges.has(edgeKey);
      
      if (isShortest) {
        strokeColor = '#10b981'; // Green for shortest path
        strokeWidth = 4;
      } else if (isHighlighted) {
        strokeColor = '#f59e0b'; // Amber for traversal step
        strokeWidth = 3;
      }

      this.ctx.beginPath();
      this.ctx.moveTo(sourceNode.x, sourceNode.y);
      this.ctx.lineTo(targetNode.x, targetNode.y);
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.stroke();
      
      // Draw directed arrow
      const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
      const arrowLength = 12;
      const arrowWidth = 5;
      
      // Adjust offset so arrow points to node edge rather than center
      const nodeRadius = 25;
      const arrowX = targetNode.x - nodeRadius * Math.cos(angle);
      const arrowY = targetNode.y - nodeRadius * Math.sin(angle);
      
      this.ctx.beginPath();
      this.ctx.moveTo(arrowX, arrowY);
      this.ctx.lineTo(arrowX - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle), arrowY - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle));
      this.ctx.lineTo(arrowX - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle), arrowY - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle));
      this.ctx.fillStyle = strokeColor;
      this.ctx.fill();

      // Draw Edge Weight
      const midX = (sourceNode.x + targetNode.x) / 2;
      const midY = (sourceNode.y + targetNode.y) / 2;
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.font = '11px Outfit, Inter, sans-serif';
      this.ctx.fillText(`w: ${edge.weight}`, midX + 5, midY - 5);
    });

    // 2. Draw Nodes
    this.nodes.forEach(node => {
      let isCurrent = this.currentNode === node.id;
      let isVisited = this.visitedNodes.has(node.id);
      let isHighlighted = this.highlightedNodes.has(node.id);
      
      let fillStyle = '#1e1b4b'; // Deep Indigo (Default)
      let strokeStyle = '#6366f1'; // Indigo
      let shadowColor = '#6366f1';
      let shadowBlur = 0;
      
      if (isCurrent) {
        fillStyle = '#4c1d95'; // Glowing Purple
        strokeStyle = '#a855f7'; // Bright Violet
        shadowColor = '#a855f7';
        shadowBlur = 15;
      } else if (isVisited) {
        fillStyle = '#064e3b'; // Forest Green
        strokeStyle = '#10b981'; // Emerald
        shadowColor = '#10b981';
        shadowBlur = 8;
      } else if (isHighlighted) {
        fillStyle = '#78350f'; // Dark Amber
        strokeStyle = '#f59e0b'; // Amber
        shadowColor = '#f59e0b';
        shadowBlur = 8;
      }
      
      this.ctx.save();
      this.ctx.shadowColor = shadowColor;
      this.ctx.shadowBlur = shadowBlur;
      
      this.ctx.beginPath();
      this.ctx.arc(node.x, node.y, 25, 0, 2 * Math.PI);
      this.ctx.fillStyle = fillStyle;
      this.ctx.fill();
      this.ctx.lineWidth = 3;
      this.ctx.strokeStyle = strokeStyle;
      this.ctx.stroke();
      
      this.ctx.restore();
      
      // Node Label
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = 'bold 11px Outfit, Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Break label into two words if too long
      const label = node.id;
      if (label.includes('&') || label.includes(' ')) {
        const parts = label.split(/(?=\s|&)/);
        this.ctx.fillText(parts[0].trim(), node.x, node.y - 6);
        this.ctx.fillText((parts[1] || '').trim(), node.x, node.y + 6);
      } else {
        this.ctx.fillText(label, node.x, node.y);
      }

      // Small Subtext Category below node
      this.ctx.fillStyle = '#64748b';
      this.ctx.font = '9px sans-serif';
      this.ctx.fillText(node.category, node.x, node.y + 35);
    });
  }

  // Generators for step-by-step algorithms
  *bfsGenerator(startNodeId) {
    this.visitedNodes.clear();
    this.highlightedNodes.clear();
    this.highlightedEdges.clear();
    this.shortestPathEdges.clear();
    this.currentNode = null;
    this.algorithmQueue = [];
    
    this.logMessage(`Initializing BFS from <b>${startNodeId}</b>`);
    this.algorithmQueue.push(startNodeId);
    this.highlightedNodes.add(startNodeId);
    this.updateStateView('bfs', this.algorithmQueue);
    this.draw();
    yield;
    
    while (this.algorithmQueue.length > 0) {
      const curr = this.algorithmQueue.shift();
      this.currentNode = curr;
      this.visitedNodes.add(curr);
      this.highlightedNodes.delete(curr);
      this.logMessage(`Visited Node: <b>${curr}</b>. Exploring its connections.`);
      this.updateStateView('bfs', this.algorithmQueue);
      this.draw();
      yield;
      
      // Get neighbors
      const neighbors = this.edges
        .filter(e => e.source === curr)
        .map(e => e.target);
        
      for (const neighbor of neighbors) {
        if (!this.visitedNodes.has(neighbor) && !this.highlightedNodes.has(neighbor)) {
          this.logMessage(`Discovered unvisited neighbor: <b>${neighbor}</b>. Adding to Queue.`);
          this.algorithmQueue.push(neighbor);
          this.highlightedNodes.add(neighbor);
          this.highlightedEdges.add(`${curr}-${neighbor}`);
          this.updateStateView('bfs', this.algorithmQueue);
          this.draw();
          yield;
        }
      }
      this.currentNode = null;
      this.draw();
    }
    
    this.logMessage(`BFS Complete! Visited all reachable nodes.`);
    this.updateStateView('bfs', this.algorithmQueue);
    this.draw();
  }

  *dfsGenerator(startNodeId) {
    this.visitedNodes.clear();
    this.highlightedNodes.clear();
    this.highlightedEdges.clear();
    this.shortestPathEdges.clear();
    this.currentNode = null;
    this.algorithmStack = [];
    
    this.logMessage(`Initializing DFS from <b>${startNodeId}</b>`);
    this.algorithmStack.push(startNodeId);
    this.highlightedNodes.add(startNodeId);
    this.updateStateView('dfs', this.algorithmStack);
    this.draw();
    yield;
    
    while (this.algorithmStack.length > 0) {
      const curr = this.algorithmStack.pop();
      if (this.visitedNodes.has(curr)) {
        this.logMessage(`Node <b>${curr}</b> was already visited. Skipping.`);
        this.updateStateView('dfs', this.algorithmStack);
        continue;
      }
      
      this.currentNode = curr;
      this.visitedNodes.add(curr);
      this.highlightedNodes.delete(curr);
      this.logMessage(`Visited Node: <b>${curr}</b>. Pushing adjacent unvisited nodes to Stack.`);
      this.updateStateView('dfs', this.algorithmStack);
      this.draw();
      yield;
      
      // Get neighbors (in reverse order so we explore in natural alphabetical or original ordering)
      const neighbors = this.edges
        .filter(e => e.source === curr)
        .map(e => e.target)
        .reverse();
        
      for (const neighbor of neighbors) {
        if (!this.visitedNodes.has(neighbor)) {
          this.logMessage(`Pushing neighbor <b>${neighbor}</b> onto Stack.`);
          this.algorithmStack.push(neighbor);
          this.highlightedNodes.add(neighbor);
          this.highlightedEdges.add(`${curr}-${neighbor}`);
          this.updateStateView('dfs', this.algorithmStack);
          this.draw();
          yield;
        }
      }
      this.currentNode = null;
      this.draw();
    }
    
    this.logMessage(`DFS Complete! Visited all reachable nodes.`);
    this.updateStateView('dfs', this.algorithmStack);
    this.draw();
  }

  *dijkstraGenerator(startNodeId, targetNodeId) {
    this.visitedNodes.clear();
    this.highlightedNodes.clear();
    this.highlightedEdges.clear();
    this.shortestPathEdges.clear();
    this.currentNode = null;
    
    // Initialize distances and predecessors
    this.nodes.forEach(n => {
      this.algorithmDistances[n.id] = Infinity;
      this.algorithmPredecessors[n.id] = null;
    });
    this.algorithmDistances[startNodeId] = 0;
    
    this.logMessage(`Dijkstra: Searching shortest path from <b>${startNodeId}</b> to <b>${targetNodeId}</b>`);
    this.updateStateView('dijkstra');
    this.draw();
    yield;
    
    while (true) {
      // Find unvisited node with minimum distance
      let curr = null;
      let minDist = Infinity;
      
      for (const n of this.nodes) {
        if (!this.visitedNodes.has(n.id) && this.algorithmDistances[n.id] < minDist) {
          minDist = this.algorithmDistances[n.id];
          curr = n.id;
        }
      }
      
      if (curr === null) {
        this.logMessage(`Dijkstra: All reachable nodes analyzed or target unreachable.`);
        break;
      }
      
      this.currentNode = curr;
      this.visitedNodes.add(curr);
      this.logMessage(`Visiting node with shortest tentative distance: <b>${curr}</b> (distance = ${minDist})`);
      this.updateStateView('dijkstra');
      this.draw();
      yield;
      
      if (curr === targetNodeId) {
        this.logMessage(`Dijkstra: Target node <b>${targetNodeId}</b> reached! Constructing shortest path.`);
        break;
      }
      
      // Update distances to neighbors
      const outgoingEdges = this.edges.filter(e => e.source === curr);
      for (const edge of outgoingEdges) {
        const neighbor = edge.target;
        if (this.visitedNodes.has(neighbor)) continue;
        
        const altDist = this.algorithmDistances[curr] + edge.weight;
        this.highlightedEdges.add(`${curr}-${neighbor}`);
        this.logMessage(`Evaluating edge to <b>${neighbor}</b>. Current tent. distance is ${this.algorithmDistances[neighbor]}, path weight through <b>${curr}</b> is ${altDist}.`);
        this.draw();
        yield;
        
        if (altDist < this.algorithmDistances[neighbor]) {
          this.algorithmDistances[neighbor] = altDist;
          this.algorithmPredecessors[neighbor] = curr;
          this.logMessage(`Found shorter path to <b>${neighbor}</b>: distance updated to ${altDist} via ${curr}`);
          this.updateStateView('dijkstra');
        }
        
        this.highlightedEdges.delete(`${curr}-${neighbor}`);
      }
      
      this.currentNode = null;
      this.draw();
    }
    
    // Draw the shortest path back
    if (this.algorithmDistances[targetNodeId] !== Infinity) {
      let curr = targetNodeId;
      const path = [curr];
      while (this.algorithmPredecessors[curr] !== null) {
        const pred = this.algorithmPredecessors[curr];
        this.shortestPathEdges.add(`${pred}-${curr}`);
        path.unshift(pred);
        curr = pred;
      }
      this.logMessage(`<b>Shortest Path found:</b> ${path.join(' ➔ ')} (Total weight: ${this.algorithmDistances[targetNodeId]})`);
      this.currentNode = null;
      this.draw();
    } else {
      this.logMessage(`<b>No path exists</b> from <b>${startNodeId}</b> to <b>${targetNodeId}</b>.`);
    }
  }

  *topologicalSortGenerator() {
    this.visitedNodes.clear();
    this.highlightedNodes.clear();
    this.highlightedEdges.clear();
    this.shortestPathEdges.clear();
    this.currentNode = null;
    
    const sortedOrder = [];
    
    // 1. Calculate Indegrees
    this.nodes.forEach(n => {
      this.algorithmIndegrees[n.id] = 0;
    });
    this.edges.forEach(e => {
      this.algorithmIndegrees[e.target]++;
    });
    
    this.logMessage(`Topological Sort: Calculating starting in-degrees.`);
    this.updateStateView('toposort', sortedOrder);
    this.draw();
    yield;
    
    // 2. Add nodes with 0 in-degree to a queue
    const queue = [];
    this.nodes.forEach(n => {
      if (this.algorithmIndegrees[n.id] === 0) {
        queue.push(n.id);
        this.highlightedNodes.add(n.id);
      }
    });
    
    this.logMessage(`Nodes with 0 dependencies: <b>${queue.join(', ')}</b>. Adding to processing queue.`);
    this.draw();
    yield;
    
    while (queue.length > 0) {
      const curr = queue.shift();
      this.currentNode = curr;
      this.highlightedNodes.delete(curr);
      this.visitedNodes.add(curr);
      sortedOrder.push(curr);
      
      this.logMessage(`Processing topic <b>${curr}</b> (all prerequisites completed).`);
      this.updateStateView('toposort', sortedOrder);
      this.draw();
      yield;
      
      // Decrease indegree of outgoing nodes
      const outgoing = this.edges.filter(e => e.source === curr);
      for (const edge of outgoing) {
        const target = edge.target;
        this.algorithmIndegrees[target]--;
        this.highlightedEdges.add(`${curr}-${target}`);
        this.logMessage(`Decrementing dependency on <b>${target}</b>. New indegree = ${this.algorithmIndegrees[target]}`);
        this.updateStateView('toposort', sortedOrder);
        this.draw();
        yield;
        
        if (this.algorithmIndegrees[target] === 0) {
          queue.push(target);
          this.highlightedNodes.add(target);
          this.logMessage(`Prerequisites for <b>${target}</b> are complete. Adding to queue.`);
          this.draw();
          yield;
        }
        this.highlightedEdges.delete(`${curr}-${target}`);
      }
      this.currentNode = null;
      this.draw();
    }
    
    if (sortedOrder.length !== this.nodes.length) {
      this.logMessage(`<b>Warning:</b> Graph contains a dependency cycle! A valid topological ordering is impossible.`);
    } else {
      this.logMessage(`<b>Topological Order (Syllabus sequence):</b> ${sortedOrder.join(' ➔ ')}`);
    }
  }

  // Animation controller
  startAlgorithm(type, startId, targetId = null) {
    this.stopAnimation();
    this.clearLog();
    this.loadData();
    
    if (type === 'bfs') {
      this.activeGenerator = this.bfsGenerator(startId);
    } else if (type === 'dfs') {
      this.activeGenerator = this.dfsGenerator(startId);
    } else if (type === 'dijkstra') {
      this.activeGenerator = this.dijkstraGenerator(startId, targetId);
    } else if (type === 'toposort') {
      this.activeGenerator = this.topologicalSortGenerator();
    }
    
    this.step();
  }

  step() {
    if (!this.activeGenerator) return;
    const res = this.activeGenerator.next();
    if (res.done) {
      this.activeGenerator = null;
    }
  }

  play(speed = 1000) {
    this.stopAnimation();
    if (!this.activeGenerator) return;
    
    this.animationTimer = setInterval(() => {
      const res = this.activeGenerator.next();
      if (res.done) {
        this.stopAnimation();
      }
    }, speed);
  }

  stopAnimation() {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }
}

// Tree view rendering structure helper
function renderTreeDOM(node, container) {
  const nodeEl = document.createElement('div');
  nodeEl.className = 'tree-node';
  
  const headerEl = document.createElement('div');
  headerEl.className = 'tree-node-header';
  headerEl.innerHTML = `<span class="tree-node-icon">📁</span> <span class="tree-node-name">${node.name}</span>`;
  
  if (node.detail) {
    headerEl.innerHTML = `<span class="tree-node-icon">📄</span> <span class="tree-node-name">${node.name}</span> <span class="tree-node-detail">- ${node.detail}</span>`;
  }
  
  nodeEl.appendChild(headerEl);
  
  if (node.children && node.children.length > 0) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    node.children.forEach(child => renderTreeDOM(child, childrenContainer));
    nodeEl.appendChild(childrenContainer);
    
    headerEl.addEventListener('click', () => {
      childrenContainer.classList.toggle('collapsed');
      headerEl.classList.toggle('collapsed-header');
    });
  }
  
  container.appendChild(nodeEl);
}

// Export modules to window
window.EduFlowDSA = {
  DSAVisualizer,
  renderTreeDOM
};
