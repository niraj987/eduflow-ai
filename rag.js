// rag.js - Live Client-Side RAG Simulator & Vector DB Visualizer

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cant', 'cannot',
  'co', 'con', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he',
  'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isnt', 'it',
  'its', 'itself', 'just', 'll', 'm', 'me', 'might', 'must', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 're', 's', 'same',
  'she', 'shes', 'should', 'shouldnt', 'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'very', 'was', 'wasnt', 'we', 'were', 'werent', 'what', 'when', 'where', 'which', 'while',
  'who', 'whom', 'why', 'with', 'wont', 'would', 'wouldnt', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

class AetherRAGSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }
    
    this.chunks = [];         // Array of { text, id, chapter }
    this.vocabulary = [];     // List of terms
    this.chunkVectors = [];   // Array of frequency arrays
    
    this.initializeDB();
  }

  // Segment textbooks into clean chunks
  initializeDB() {
    const chapters = window.AetherData.textbookChapters;
    let chunkId = 1;
    this.chunks = [];
    
    chapters.forEach(ch => {
      // Split into sentences (approximate chunking)
      const sentences = ch.content.match(/[^.!?]+[.!?]+/g) || [ch.content];
      
      // Merge sentences into chunks of approx 2 sentences
      for (let i = 0; i < sentences.length; i += 2) {
        const sentenceGroup = sentences.slice(i, i + 2).join(' ').trim();
        if (sentenceGroup.length > 10) {
          this.chunks.push({
            id: `chunk_${chunkId++}`,
            chapter: ch.chapter,
            text: sentenceGroup
          });
        }
      }
    });

    this.buildVectorSpace();
  }

  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOP_WORDS.has(word));
  }

  // Extract vocabulary and build Term Frequency vectors
  buildVectorSpace() {
    const termSet = new Set();
    
    // Gather all tokens
    this.chunks.forEach(chunk => {
      const tokens = this.tokenize(chunk.text);
      tokens.forEach(t => termSet.add(t));
    });
    
    this.vocabulary = Array.from(termSet);
    
    // Create TF vectors
    this.chunkVectors = this.chunks.map(chunk => {
      return this.vectorizeText(chunk.text);
    });

    // Assign coordinate positions (simulated PCA projection on 2D)
    this.chunks.forEach((chunk, index) => {
      // Generate deterministic points based on vector hash to scatter them beautifully
      const hash1 = this.hashString(chunk.id + 'x');
      const hash2 = this.hashString(chunk.id + 'y');
      
      chunk.x = 80 + (Math.abs(hash1) % (this.canvas ? this.canvas.width - 160 : 400));
      chunk.y = 80 + (Math.abs(hash2) % (this.canvas ? this.canvas.height - 160 : 300));
    });
  }

  vectorizeText(text) {
    const tokens = this.tokenize(text);
    const vector = new Array(this.vocabulary.length).fill(0);
    
    tokens.forEach(token => {
      const idx = this.vocabulary.indexOf(token);
      if (idx !== -1) {
        vector[idx]++;
      }
    });
    
    return vector;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Retrieve matches
  query(queryString, limit = 2) {
    const queryVec = this.vectorizeText(queryString);
    const results = [];
    
    this.chunks.forEach((chunk, index) => {
      const score = this.cosineSimilarity(queryVec, this.chunkVectors[index]);
      results.push({
        chunk,
        score: parseFloat(score.toFixed(3)),
        index
      });
    });
    
    // Sort by descending score
    results.sort((a, b) => b.score - a.score);
    return {
      queryVec,
      topMatches: results.slice(0, limit),
      allResults: results
    };
  }

  // Draw 2D Vector Space Projection
  drawVectorSpace(queryResult = null) {
    if (!this.canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw Grid Lines
    this.ctx.strokeStyle = '#222235';
    this.ctx.lineWidth = 1;
    for (let i = 0; i < this.canvas.width; i += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.stroke();
    }
    for (let j = 0; j < this.canvas.height; j += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, j);
      this.ctx.lineTo(this.canvas.width, j);
      this.ctx.stroke();
    }
    
    // Check match items list
    const topMatchIndices = new Set();
    let queryX = this.canvas.width / 2;
    let queryY = this.canvas.height / 2;
    
    if (queryResult) {
      queryResult.topMatches.forEach(m => {
        if (m.score > 0) {
          topMatchIndices.add(m.index);
        }
      });
    }
    
    // Draw connections from query to matches
    if (queryResult && queryResult.topMatches.length > 0 && queryResult.topMatches[0].score > 0) {
      queryResult.topMatches.forEach(m => {
        if (m.score === 0) return;
        const matchedChunk = m.chunk;
        
        this.ctx.beginPath();
        this.ctx.moveTo(queryX, queryY);
        this.ctx.lineTo(matchedChunk.x, matchedChunk.y);
        this.ctx.strokeStyle = `rgba(16, 185, 129, ${m.score})`; // Dynamic opacity
        this.ctx.lineWidth = 3 * m.score;
        this.ctx.stroke();
        
        // Draw distance tag
        const midX = (queryX + matchedChunk.x) / 2;
        const midY = (queryY + matchedChunk.y) / 2;
        this.ctx.fillStyle = '#10b981';
        this.ctx.font = '10px Courier New';
        this.ctx.fillText(`cos: ${m.score}`, midX + 5, midY - 5);
      });
    }

    // Draw Chunk Nodes
    this.chunks.forEach((chunk, index) => {
      const isMatched = topMatchIndices.has(index);
      
      this.ctx.beginPath();
      this.ctx.arc(chunk.x, chunk.y, 8, 0, 2 * Math.PI);
      
      if (isMatched) {
        this.ctx.fillStyle = '#10b981'; // Green for retrieved
        this.ctx.shadowColor = '#10b981';
        this.ctx.shadowBlur = 12;
      } else {
        this.ctx.fillStyle = '#475569'; // Grey for un-retrieved
        this.ctx.shadowBlur = 0;
      }
      this.ctx.fill();
      
      // Node label
      this.ctx.fillStyle = '#64748b';
      this.ctx.font = '9px Outfit, sans-serif';
      this.ctx.fillText(chunk.id, chunk.x - 15, chunk.y - 12);
    });
    this.ctx.shadowBlur = 0; // Reset

    // Draw Query Node (if active)
    if (queryResult) {
      this.ctx.beginPath();
      this.ctx.arc(queryX, queryY, 12, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#f59e0b'; // Amber for query
      this.ctx.shadowColor = '#f59e0b';
      this.ctx.shadowBlur = 15;
      this.ctx.fill();
      
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = 'bold 9px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("QUERY", queryX, queryY + 2);
      this.ctx.shadowBlur = 0;
    }
  }
}

// Export modules to window
window.AetherRAG = AetherRAGSystem;
