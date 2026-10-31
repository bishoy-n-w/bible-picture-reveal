/**
 * Core Game Engine for Picture Reveal Bible Trivia
 * Handles:
 *  - 3x3 Tile-to-Difficulty Grid Mapping (Center=Hard, Edges=Medium, Corners=Easy)
 *  - Non-Repeating Random Cycles for Images & Questions (Fair Pool Cycles)
 *  - Modal Flow, Tile Animations, Sound Effects & Confetti Celebration
 *  - Multi-Extension Image Resolver & Procedural Canvas Fallbacks
 *  - Drag & Drop / File Input for Local Image Banks
 */

class PictureRevealGame {
  constructor() {
    this.picsBank = window.PICS_DATA ? [...window.PICS_DATA] : [];
    this.questionsBank = window.QUESTIONS_BANK ? [...window.QUESTIONS_BANK] : [];

    // Cycle Pools (Fair Shuffle: zero repetition until depleted)
    this.imagePool = [];
    this.questionPools = { 1: [], 2: [], 3: [] };

    // Active Game State
    this.currentImage = null;
    this.tileStates = Array(9).fill('covered'); // 'covered' | 'revealed' | 'failed'
    this.activeTileIndex = null;
    this.activeQuestion = null;
    this.isFullRevealed = false;
    this.roundCount = 0;

    // Difficulty mapping for 3x3 grid:
    // [0] [1] [2]   [Easy]   [Medium] [Easy]
    // [3] [4] [5] = [Medium] [Hard]   [Medium]
    // [6] [7] [8]   [Easy]   [Medium] [Easy]
    this.difficultyMap = {
      0: 1, 1: 2, 2: 1,
      3: 2, 4: 3, 5: 2,
      6: 1, 7: 2, 8: 1
    };

    // DOM Elements
    this.dom = {};
  }

  init() {
    this.cacheDom();
    this.populateSceneSelector();
    this.bindEvents();
    
    // Initialize sound engine & confetti
    if (window.confettiEngine && this.dom.confettiCanvas) {
      window.confettiEngine.init(this.dom.confettiCanvas);
    }

    this.updateAudioButtonState();
    this.loadNextImage();
  }

  cacheDom() {
    this.dom.gridLayer = document.getElementById('grid-layer');
    this.dom.bgImage = document.getElementById('bg-image');
    this.dom.fallbackCanvas = document.getElementById('fallback-canvas');
    this.dom.roundDisplay = document.getElementById('round-counter');
    this.dom.remainingDisplay = document.getElementById('remaining-counter');

    // Modal
    this.dom.modalOverlay = document.getElementById('modal-overlay');
    this.dom.modalDiffTag = document.getElementById('modal-diff-tag');
    this.dom.modalTileIndicator = document.getElementById('modal-tile-indicator');
    this.dom.questionText = document.getElementById('question-text');
    this.dom.optionsGrid = document.getElementById('options-grid');
    this.dom.modalCloseBtn = document.getElementById('btn-modal-close');

    // Win Overlay
    this.dom.winOverlay = document.getElementById('win-overlay');
    this.dom.winTitle = document.getElementById('win-title');
    this.dom.winRef = document.getElementById('win-ref');
    this.dom.winVerse = document.getElementById('win-verse');
    this.dom.winNextBtn = document.getElementById('win-next-btn');

    // Moderator Toolbar
    this.dom.btnReveal = document.getElementById('btn-reveal-full');
    this.dom.btnNext = document.getElementById('btn-next-image');
    this.dom.btnResetGrid = document.getElementById('btn-reset-grid');
    this.dom.selectScene = document.getElementById('select-scene');
    this.dom.inputCustomImages = document.getElementById('input-custom-images');
    this.dom.btnAudio = document.getElementById('btn-toggle-audio');
    this.dom.btnFullscreen = document.getElementById('btn-fullscreen');
    this.dom.peekWrapper = document.getElementById('mod-peek-wrapper');
    this.dom.peekAnswer = document.getElementById('mod-peek-answer');
    this.dom.peekRef = document.getElementById('mod-peek-ref');
    this.dom.confettiCanvas = document.getElementById('confetti-canvas');
  }

  populateSceneSelector() {
    if (!this.dom.selectScene) return;
    this.dom.selectScene.innerHTML = '<option value="">-- المشاهد (1-20) --</option>';
    this.picsBank.forEach((scene) => {
      const opt = document.createElement('option');
      opt.value = scene.id;
      opt.textContent = `${scene.id}. ${scene.correct_answer.substring(0, 32)}...`;
      this.dom.selectScene.appendChild(opt);
    });
  }

  bindEvents() {
    // Moderator Controls
    if (this.dom.btnReveal) {
      this.dom.btnReveal.addEventListener('click', () => this.revealFullImage());
    }
    if (this.dom.btnNext) {
      this.dom.btnNext.addEventListener('click', () => this.loadNextImage());
    }
    if (this.dom.winNextBtn) {
      this.dom.winNextBtn.addEventListener('click', () => this.loadNextImage());
    }
    if (this.dom.btnResetGrid) {
      this.dom.btnResetGrid.addEventListener('click', () => this.resetCurrentGrid());
    }
    if (this.dom.btnAudio) {
      this.dom.btnAudio.addEventListener('click', () => this.toggleAudio());
    }
    if (this.dom.btnFullscreen) {
      this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }
    if (this.dom.modalCloseBtn) {
      this.dom.modalCloseBtn.addEventListener('click', () => this.closeModal());
    }

    // Scene Selector Jump
    if (this.dom.selectScene) {
      this.dom.selectScene.addEventListener('change', (e) => {
        const selectedId = parseInt(e.target.value, 10);
        if (!isNaN(selectedId)) {
          this.jumpToScene(selectedId);
        }
      });
    }

    // Custom Image File Picker
    if (this.dom.inputCustomImages) {
      this.dom.inputCustomImages.addEventListener('change', (e) => {
        this.handleUploadedImages(e.target.files);
      });
    }

    // Drag and Drop Images onto Page
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleUploadedImages(e.dataTransfer.files);
      }
    });

    // Secret Peek Click (for touch devices)
    if (this.dom.peekWrapper) {
      this.dom.peekWrapper.addEventListener('click', (e) => {
        if (e.target.closest('#btn-mod-peek')) {
          this.dom.peekWrapper.classList.toggle('active');
        }
      });
      // Close peek when clicking outside
      document.addEventListener('click', (e) => {
        if (!this.dom.peekWrapper.contains(e.target)) {
          this.dom.peekWrapper.classList.remove('active');
        }
      });
    }

    // Keyboard Shortcuts (1-4 for options, Space/Enter to advance win, Escape for modal)
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  handleUploadedImages(fileList) {
    if (!fileList || fileList.length === 0) return;

    let matchedCount = 0;
    Array.from(fileList).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const name = file.name.toLowerCase();

      // Attempt matching filename: e.g. img5.jpg, 5.png, scene-5.webp
      const numMatch = name.match(/(\d+)/);
      if (numMatch) {
        const id = parseInt(numMatch[1], 10);
        const target = this.picsBank.find(p => p.id === id);
        if (target) {
          target.image_url = url;
          matchedCount++;
        }
      }
    });

    if (matchedCount > 0) {
      if (window.soundEngine) window.soundEngine.playReveal();
      this.displayCurrentImage();
    }
  }

  /* ==========================================================================
     POOL MANAGEMENT & RANDOM SHUFFLING (NO REPETITION)
     ========================================================================== */
  shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  getNextImageFromPool() {
    if (this.imagePool.length === 0) {
      this.imagePool = this.shuffleArray(this.picsBank);
    }
    return this.imagePool.pop();
  }

  getNextQuestionFromPool(level) {
    if (!this.questionPools[level] || this.questionPools[level].length === 0) {
      const tierQuestions = this.questionsBank.filter(q => q.level === level);
      this.questionPools[level] = this.shuffleArray(tierQuestions);
    }
    return this.questionPools[level].pop();
  }

  /* ==========================================================================
     ROUND INITIALIZATION & IMAGE RENDERING
     ========================================================================== */
  loadNextImage() {
    if (window.soundEngine) window.soundEngine.playClick();
    if (window.confettiEngine) window.confettiEngine.clear();

    this.roundCount++;
    this.isFullRevealed = false;
    this.tileStates = Array(9).fill('covered');
    this.currentImage = this.getNextImageFromPool();

    this.setupRoundUI();
  }

  jumpToScene(sceneId) {
    const found = this.picsBank.find(p => p.id === sceneId);
    if (!found) return;

    if (window.soundEngine) window.soundEngine.playClick();
    if (window.confettiEngine) window.confettiEngine.clear();

    this.roundCount++;
    this.isFullRevealed = false;
    this.tileStates = Array(9).fill('covered');
    this.currentImage = found;

    // Filter out from active pool if present so it won't repeat right after
    this.imagePool = this.imagePool.filter(p => p.id !== sceneId);

    this.setupRoundUI();
  }

  setupRoundUI() {
    // Close win overlay & modal
    this.dom.winOverlay.classList.remove('active');
    this.dom.modalOverlay.classList.remove('active');

    // Update round status badge
    if (this.dom.roundDisplay) {
      this.dom.roundDisplay.textContent = this.roundCount;
    }
    if (this.dom.remainingDisplay) {
      this.dom.remainingDisplay.textContent = this.imagePool.length;
    }

    // Update Moderator Secret Peek
    if (this.dom.peekAnswer) {
      this.dom.peekAnswer.textContent = this.currentImage.correct_answer;
    }
    if (this.dom.peekRef) {
      this.dom.peekRef.textContent = this.currentImage.reference;
    }

    // Reset scene selector
    if (this.dom.selectScene) {
      this.dom.selectScene.value = this.currentImage.id;
    }

    // Render Grid & Load Image
    this.renderGrid();
    this.displayCurrentImage();
  }

  resetCurrentGrid() {
    if (window.soundEngine) window.soundEngine.playClick();
    if (window.confettiEngine) window.confettiEngine.clear();

    this.isFullRevealed = false;
    this.tileStates = Array(9).fill('covered');
    this.dom.winOverlay.classList.remove('active');
    this.renderGrid();
  }

  displayCurrentImage() {
    const img = this.dom.bgImage;
    const canvas = this.dom.fallbackCanvas;

    img.style.display = 'block';
    canvas.style.display = 'none';

    // Extension cascade handler: .jpg -> .png -> .webp -> .jpeg -> Fallback Canvas
    const extensions = ['.jpg', '.png', '.webp', '.jpeg'];
    let extIndex = 0;
    const originalUrl = this.currentImage.image_url;

    // If custom blob URL or already has explicit path, handle gracefully
    if (originalUrl.startsWith('blob:') || originalUrl.startsWith('data:')) {
      img.onerror = () => this.renderFallbackScene(this.currentImage);
      img.onload = () => { img.style.display = 'block'; canvas.style.display = 'none'; };
      img.src = originalUrl;
      return;
    }

    const basePath = originalUrl.substring(0, originalUrl.lastIndexOf('.')) || `assets/img${this.currentImage.id}`;

    const tryNext = () => {
      if (extIndex < extensions.length) {
        const nextUrl = basePath + extensions[extIndex++];
        img.src = nextUrl;
      } else {
        // All file extensions exhausted -> render dynamic biblical canvas
        this.renderFallbackScene(this.currentImage);
      }
    };

    img.onerror = () => tryNext();
    img.onload = () => {
      img.style.display = 'block';
      canvas.style.display = 'none';
    };

    tryNext();
  }

  renderFallbackScene(sceneData) {
    const img = this.dom.bgImage;
    const canvas = this.dom.fallbackCanvas;

    img.style.display = 'none';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    const width = 1280;
    const height = 720;
    canvas.width = width;
    canvas.height = height;

    // Dramatic biblical canvas artwork (Dark ancient gradient with celestial radiance)
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.4, 50, width * 0.5, height * 0.5, width * 0.7);
    bgGrad.addColorStop(0, '#283747');
    bgGrad.addColorStop(0.4, '#1b2631');
    bgGrad.addColorStop(0.8, '#17202a');
    bgGrad.addColorStop(1, '#0b0f14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ancient mountain / terrain silhouettes
    ctx.fillStyle = '#0f141d';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.65);
    ctx.bezierCurveTo(width * 0.2, height * 0.5, width * 0.4, height * 0.7, width * 0.6, height * 0.58);
    ctx.bezierCurveTo(width * 0.75, height * 0.5, width * 0.85, height * 0.62, width, height * 0.55);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Golden divine rays from heavens
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5, 0);
      const rayX = (width / 11) * i;
      ctx.lineTo(rayX - 30, height);
      ctx.lineTo(rayX + 30, height);
      ctx.closePath();
      ctx.fillStyle = '#ffd700';
      ctx.fill();
    }
    ctx.restore();

    // Floating golden particles / embers
    ctx.fillStyle = '#d4af37';
    for (let i = 0; i < 50; i++) {
      const px = Math.random() * width;
      const py = Math.random() * height;
      const pr = 1 + Math.random() * 3;
      ctx.globalAlpha = 0.2 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Historical Parchment Card in Center of fallback
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = 'rgba(12, 16, 25, 0.82)';
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    const cardW = 760;
    const cardH = 240;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    // Card Text
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';

    ctx.fillStyle = '#f5e08c';
    ctx.font = 'bold 34px Cairo, sans-serif';
    ctx.fillText('مشهد كتابي مخفي #' + sceneData.id, width * 0.5, cardY + 70);

    ctx.fillStyle = '#d4af37';
    ctx.font = '600 24px Cairo, sans-serif';
    ctx.fillText(sceneData.reference, width * 0.5, cardY + 120);

    ctx.fillStyle = '#9aa3b5';
    ctx.font = '20px Cairo, sans-serif';
    ctx.fillText('أجب عن الأسئلة لكشف تفاصيل المشهد', width * 0.5, cardY + 175);
    ctx.restore();
  }

  /* ==========================================================================
     3x3 GRID RENDERING & TILE CLICKS
     ========================================================================== */
  renderGrid() {
    this.dom.gridLayer.innerHTML = '';

    const diffLabels = { 1: 'سهل', 2: 'متوسط', 3: 'صعب' };
    const diffStars = { 1: '✦', 2: '✦✦', 3: '✦✦✦' };

    for (let i = 0; i < 9; i++) {
      const tile = document.createElement('div');
      const diff = this.difficultyMap[i];
      const state = this.tileStates[i];

      tile.className = `tile ${state}`;
      tile.dataset.index = i;
      tile.dataset.difficulty = diff;

      // Inner normal state
      tile.innerHTML = `
        <div class="tile-inner">
          <span class="tile-number">${i + 1}</span>
          <span class="tile-difficulty">${diffStars[diff]}</span>
          <span class="tile-diff-label">${diffLabels[diff]}</span>
        </div>
        <div class="failed-indicator">
          <span class="failed-icon">✕</span>
          <span class="failed-label">مغلق</span>
        </div>
      `;

      tile.addEventListener('click', () => this.handleTileClick(i));
      this.dom.gridLayer.appendChild(tile);
    }
  }

  handleTileClick(index) {
    if (this.isFullRevealed) return;
    if (this.tileStates[index] !== 'covered') return;

    this.activeTileIndex = index;
    const diff = this.difficultyMap[index];
    this.activeQuestion = this.getNextQuestionFromPool(diff);

    if (window.soundEngine) window.soundEngine.playModalOpen();
    this.showQuestionModal(this.activeQuestion, index, diff);
  }

  /* ==========================================================================
     QUESTION MODAL CONTROLLER
     ========================================================================== */
  showQuestionModal(question, tileIndex, difficulty) {
    const diffNames = { 1: 'مستوى سهل ✦', 2: 'مستوى متوسط ✦✦', 3: 'مستوى صعب ✦✦✦' };
    
    // Header tags
    this.dom.modalDiffTag.textContent = diffNames[difficulty];
    this.dom.modalDiffTag.className = `modal-difficulty-tag level-${difficulty}`;
    this.dom.modalTileIndicator.textContent = `مربع رقم (${tileIndex + 1})`;

    // Question
    this.dom.questionText.textContent = question.question;

    // Build shuffled options array with preserved correct reference
    const optionsWithMeta = question.options.map((text, idx) => ({
      text,
      isCorrect: idx === question.correctIndex
    }));
    const shuffledOptions = this.shuffleArray(optionsWithMeta);

    // Arabic Option Badges
    const letters = ['أ', 'ب', 'ج', 'د'];
    this.dom.optionsGrid.innerHTML = '';

    shuffledOptions.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `
        <span>${opt.text}</span>
        <span class="option-badge">${letters[idx] || (idx + 1)}</span>
      `;

      btn.addEventListener('click', () => this.handleOptionSelection(btn, opt.isCorrect));
      this.dom.optionsGrid.appendChild(btn);
    });

    this.dom.modalOverlay.classList.add('active');
  }

  handleOptionSelection(selectedBtn, isCorrect) {
    // Disable all options to prevent spamming
    const allButtons = this.dom.optionsGrid.querySelectorAll('.option-btn');
    allButtons.forEach(btn => btn.style.pointerEvents = 'none');

    const tileElem = this.dom.gridLayer.querySelector(`[data-index="${this.activeTileIndex}"]`);

    if (isCorrect) {
      selectedBtn.classList.add('selected-correct');
      if (window.soundEngine) window.soundEngine.playCorrect();

      setTimeout(() => {
        this.dom.modalOverlay.classList.remove('active');
        this.tileStates[this.activeTileIndex] = 'revealed';
        if (tileElem) {
          tileElem.classList.remove('covered');
          tileElem.classList.add('revealed');
        }
        if (window.soundEngine) window.soundEngine.playReveal();
      }, 750);

    } else {
      selectedBtn.classList.add('selected-incorrect');
      if (window.soundEngine) window.soundEngine.playIncorrect();

      setTimeout(() => {
        this.dom.modalOverlay.classList.remove('active');
        this.tileStates[this.activeTileIndex] = 'failed';
        if (tileElem) {
          tileElem.classList.remove('covered');
          tileElem.classList.add('failed');
        }
      }, 850);
    }
  }

  closeModal() {
    this.dom.modalOverlay.classList.remove('active');
  }

  /* ==========================================================================
     REVEAL FULL IMAGE & WIN STATE
     ========================================================================== */
  revealFullImage() {
    if (this.isFullRevealed) return;
    this.isFullRevealed = true;

    // Reveal all tiles cleanly
    const allTiles = this.dom.gridLayer.querySelectorAll('.tile');
    allTiles.forEach((tile, idx) => {
      this.tileStates[idx] = 'revealed';
      tile.classList.remove('covered', 'failed');
      tile.classList.add('revealed');
    });

    // Sounds & Confetti
    if (window.soundEngine) window.soundEngine.playWinFanfare();
    if (window.confettiEngine) window.confettiEngine.burst(180);

    // Populate Celebration Card
    if (this.dom.winTitle) {
      this.dom.winTitle.textContent = this.currentImage.correct_answer;
    }
    if (this.dom.winRef) {
      this.dom.winRef.textContent = `(المرجع: ${this.currentImage.reference})`;
    }
    if (this.dom.winVerse) {
      this.dom.winVerse.textContent = `«${this.currentImage.verse_text}»`;
    }

    // Activate Win Overlay after brief delay for dramatic effect
    setTimeout(() => {
      this.dom.winOverlay.classList.add('active');
    }, 450);
  }

  /* ==========================================================================
     KEYBOARD NAVIGATION & SHORTCUTS
     ========================================================================== */
  handleKeyboard(e) {
    // If modal is active: 1, 2, 3, 4 map to options
    if (this.dom.modalOverlay.classList.contains('active')) {
      const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, 'KeyA': 0, 'KeyB': 1, 'KeyC': 2, 'KeyD': 3 };
      const optionIndex = keyMap[e.key] !== undefined ? keyMap[e.key] : keyMap[e.code];

      if (optionIndex !== undefined) {
        const btns = this.dom.optionsGrid.querySelectorAll('.option-btn');
        if (btns[optionIndex] && btns[optionIndex].style.pointerEvents !== 'none') {
          btns[optionIndex].click();
        }
      } else if (e.key === 'Escape') {
        this.closeModal();
      }
      return;
    }

    // If win overlay is active: Enter or Space triggers Next Image
    if (this.dom.winOverlay.classList.contains('active')) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.loadNextImage();
      }
      return;
    }

    // Global shortcut: 'R' key reveals full image
    if (e.key === 'r' || e.key === 'R' || e.key === 'ق') {
      this.revealFullImage();
    }
    // Global shortcut: 'N' key loads next image
    if (e.key === 'n' || e.key === 'N' || e.key === 'ى') {
      this.loadNextImage();
    }
  }

  /* ==========================================================================
     AUDIO & FULLSCREEN HELPERS
     ========================================================================== */
  toggleAudio() {
    if (window.soundEngine) {
      window.soundEngine.toggleMute();
      this.updateAudioButtonState();
    }
  }

  updateAudioButtonState() {
    if (!this.dom.btnAudio || !window.soundEngine) return;
    const isMuted = window.soundEngine.isMuted();
    this.dom.btnAudio.innerHTML = isMuted
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    this.dom.btnAudio.title = isMuted ? "تشغيل الصوت" : "كتم الصوت";
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new PictureRevealGame();
  window.gameApp.init();
});
