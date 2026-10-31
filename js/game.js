/**
 * Picture Reveal Bible Trivia - Carnival Edition v2.1.0
 * Handles:
 *  - Welcome Attractor Screen & Return-to-Home Flow
 *  - 3D Luxury Mystery Vault Grid (Center=Hard/Seal, Edges=Medium, Corners=Easy)
 *  - Non-Blocking Bottom Question Altar with Integrated Auto-Start Timer
 *  - Timeout Notification (Preserves Question without Auto-Dismissal)
 *  - Fair Cycle Pools for Scenes & Questions (No Repetition)
 *  - Number-Only Scene Selector (Zero Spoilers)
 *  - Full Theater Keyboard Navigation (1-9 tiles, 1-4 answers, Space, N, P, Esc)
 */

class PictureRevealGame {
  constructor() {
    this.picsBank = window.PICS_DATA ? [...window.PICS_DATA] : [];
    this.questionsBank = window.QUESTIONS_BANK ? [...window.QUESTIONS_BANK] : [];

    // Cycle Pools (Fair Shuffle)
    this.imagePool = [];
    this.questionPools = { 1: [], 2: [], 3: [] };

    // Active Round State
    this.currentImage = null;
    this.tileStates = Array(9).fill('covered'); // 'covered' | 'revealed' | 'failed'
    this.activeTileIndex = null;
    this.activeQuestion = null;
    this.isFullRevealed = false;
    this.roundCount = 0;
    this.isGameActive = false;

    // Integrated Question Timer (60 Seconds)
    this.timerDuration = 60;
    this.timerRemaining = 60;
    this.timerInterval = null;

    // 3x3 Difficulty Map:
    // 3 Easy on 3 corners (0, 2, 6)
    // 3 Medium: 1 on an edge (1) and 2 in sides (7, 8)
    // 3 Hard: 1 in center (4) and 2 in sides (3, 5)
    this.difficultyMap = {
      0: 1, // Corner: Easy
      1: 2, // Edge: Medium
      2: 1, // Corner: Easy
      3: 3, // Side: Hard
      4: 3, // Center: Hard (Golden Seal)
      5: 3, // Side: Hard
      6: 1, // Corner: Easy
      7: 2, // Side: Medium
      8: 2  // Side: Medium
    };

    this.dom = {};
  }

  init() {
    this.cacheDom();
    this.populateSceneSelector();
    this.bindEvents();

    if (window.confettiEngine && this.dom.confettiCanvas) {
      window.confettiEngine.init(this.dom.confettiCanvas);
    }

    this.updateAudioButtonState();
  }

  cacheDom() {
    // Screens
    this.dom.welcomeScreen = document.getElementById('welcome-screen');
    this.dom.gameScreen = document.getElementById('game-screen');
    this.dom.btnStartGame = document.getElementById('btn-start-game');
    this.dom.btnGoHome = document.getElementById('btn-go-home');
    this.dom.winHomeBtn = document.getElementById('win-home-btn');

    // Stage
    this.dom.gridLayer = document.getElementById('grid-layer');
    this.dom.bgImage = document.getElementById('bg-image');
    this.dom.fallbackCanvas = document.getElementById('fallback-canvas');
    this.dom.roundDisplay = document.getElementById('round-counter');
    this.dom.remainingDisplay = document.getElementById('remaining-counter');

    // Question Altar & Timer
    this.dom.questionAltar = document.getElementById('question-altar');
    this.dom.altarParchment = this.dom.questionAltar ? this.dom.questionAltar.querySelector('.altar-parchment') : null;
    this.dom.modalDiffTag = document.getElementById('modal-diff-tag');
    this.dom.modalTileIndicator = document.getElementById('modal-tile-indicator');
    this.dom.altarTimerBadge = document.getElementById('altar-timer-badge');
    this.dom.timerText = document.getElementById('timer-text');
    this.dom.questionText = document.getElementById('question-text');
    this.dom.optionsGrid = document.getElementById('options-grid');
    this.dom.modalCloseBtn = document.getElementById('btn-modal-close');

    // Win Overlay
    this.dom.winOverlay = document.getElementById('win-overlay');
    this.dom.winTitle = document.getElementById('win-title');
    this.dom.winRef = document.getElementById('win-ref');
    this.dom.winVerse = document.getElementById('win-verse');
    this.dom.winNextBtn = document.getElementById('win-next-btn');

    // Moderator Controls
    this.dom.btnReveal = document.getElementById('btn-reveal-full');
    this.dom.btnNext = document.getElementById('btn-next-image');
    this.dom.btnResetGrid = document.getElementById('btn-reset-grid');
    this.dom.selectScene = document.getElementById('select-scene');
    this.dom.btnAudio = document.getElementById('btn-toggle-audio');
    this.dom.btnFullscreen = document.getElementById('btn-fullscreen');
    this.dom.peekWrapper = document.getElementById('mod-peek-wrapper');
    this.dom.peekAnswer = document.getElementById('mod-peek-answer');
    this.dom.peekRef = document.getElementById('mod-peek-ref');
    this.dom.confettiCanvas = document.getElementById('confetti-canvas');
  }

  // Populate Dropdown with Numbers Only (No Titles to Avoid Spoilers)
  populateSceneSelector() {
    if (!this.dom.selectScene) return;
    this.dom.selectScene.innerHTML = '<option value="">-- اختر صورة (1-20) --</option>';
    for (let i = 1; i <= this.picsBank.length; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `صورة رقم ${i}`;
      this.dom.selectScene.appendChild(opt);
    }
  }

  bindEvents() {
    // Welcome Screen Navigation
    if (this.dom.btnStartGame) {
      this.dom.btnStartGame.addEventListener('click', () => this.startGame());
    }
    if (this.dom.btnGoHome) {
      this.dom.btnGoHome.addEventListener('click', () => this.showWelcomeScreen());
    }
    if (this.dom.winHomeBtn) {
      this.dom.winHomeBtn.addEventListener('click', () => this.showWelcomeScreen());
    }

    // Full Reveal & Next Scene
    if (this.dom.btnReveal) {
      this.dom.btnReveal.addEventListener('click', () => this.revealFullImage());
    }
    if (this.dom.btnNext) {
      this.dom.btnNext.addEventListener('click', () => this.loadNextImage());
    }
    if (this.dom.winNextBtn) {
      this.dom.winNextBtn.addEventListener('click', () => this.loadNextImage());
    }

    // Reset Grid
    if (this.dom.btnResetGrid) {
      this.dom.btnResetGrid.addEventListener('click', () => this.resetCurrentGrid());
    }

    // Audio & Fullscreen
    if (this.dom.btnAudio) {
      this.dom.btnAudio.addEventListener('click', () => this.toggleAudio());
    }
    if (this.dom.btnFullscreen) {
      this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    // Question Altar Cancel/Close
    if (this.dom.modalCloseBtn) {
      this.dom.modalCloseBtn.addEventListener('click', () => this.closeQuestionAltar());
    }

    // Scene Selector Jump (Number Only)
    if (this.dom.selectScene) {
      this.dom.selectScene.addEventListener('change', (e) => {
        const selectedId = parseInt(e.target.value, 10);
        if (!isNaN(selectedId)) {
          this.jumpToScene(selectedId);
        }
      });
    }

    // Secret Peek Click (Touch Support)
    if (this.dom.peekWrapper) {
      this.dom.peekWrapper.addEventListener('click', (e) => {
        if (e.target.closest('#btn-mod-peek')) {
          this.dom.peekWrapper.classList.toggle('active');
        }
      });
      document.addEventListener('click', (e) => {
        if (!this.dom.peekWrapper.contains(e.target)) {
          this.dom.peekWrapper.classList.remove('active');
        }
      });
    }

    // Global Keyboard Navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  /* ==========================================================================
     WELCOME SCREEN & GAME ROUTING
     ========================================================================== */
  startGame() {
    if (window.soundEngine) window.soundEngine.playClick();
    this.isGameActive = true;
    this.dom.welcomeScreen.classList.remove('active');

    if (!this.currentImage) {
      this.loadNextImage();
    }
  }

  showWelcomeScreen() {
    if (window.soundEngine) window.soundEngine.playClick();
    this.stopTimer();
    if (window.confettiEngine) window.confettiEngine.clear();

    this.isGameActive = false;
    this.dom.winOverlay.classList.remove('active');
    this.dom.questionAltar.classList.remove('active');
    this.dom.welcomeScreen.classList.add('active');
  }

  /* ==========================================================================
     INTEGRATED QUESTION COUNTDOWN TIMER (AUTO-STARTS ON QUESTION OPEN)
     ========================================================================== */
  startQuestionTimer() {
    this.stopTimer();
    this.timerRemaining = this.timerDuration;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.timerRemaining--;
      this.updateTimerDisplay();

      // Audio ticks
      if (this.timerRemaining > 0) {
        const isUrgent = this.timerRemaining <= 5;
        if (window.soundEngine) window.soundEngine.playTick(isUrgent);
      } else {
        // Timed out: show alert, play timeout gong, but DO NOT dismiss the question!
        this.stopTimer();
        if (window.soundEngine) window.soundEngine.playTimeout();
        if (this.dom.altarTimerBadge) {
          this.dom.altarTimerBadge.className = 'altar-timer-badge timed-out';
          this.dom.timerText.textContent = 'انتهى الوقت! ⏰';
        }
        if (this.dom.questionText) {
          this.dom.questionText.classList.add('timed-out');
        }
        if (this.dom.altarParchment) {
          this.dom.altarParchment.classList.add('timed-out');
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    if (!this.dom.timerText || !this.dom.altarTimerBadge) return;

    if (this.timerRemaining > 0) {
      this.dom.timerText.textContent = `${this.timerRemaining} ثانية`;
      if (this.timerRemaining <= 5) {
        this.dom.altarTimerBadge.className = 'altar-timer-badge urgent';
      } else {
        this.dom.altarTimerBadge.className = 'altar-timer-badge';
      }
    }
  }

  /* ==========================================================================
     POOL MANAGEMENT & RANDOM SHUFFLING
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
     ROUND INITIALIZATION & RENDERING
     ========================================================================== */
  loadNextImage() {
    if (window.soundEngine) window.soundEngine.playClick();
    if (window.confettiEngine) window.confettiEngine.clear();
    this.stopTimer();

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
    this.stopTimer();

    this.roundCount++;
    this.isFullRevealed = false;
    this.tileStates = Array(9).fill('covered');
    this.currentImage = found;
    this.imagePool = this.imagePool.filter(p => p.id !== sceneId);

    this.setupRoundUI();
  }

  setupRoundUI() {
    this.dom.winOverlay.classList.remove('active');
    this.dom.questionAltar.classList.remove('active');

    if (this.dom.roundDisplay) {
      this.dom.roundDisplay.textContent = this.currentImage.id;
    }
    if (this.dom.remainingDisplay) {
      this.dom.remainingDisplay.textContent = this.picsBank.length;
    }

    if (this.dom.peekAnswer) {
      this.dom.peekAnswer.textContent = this.currentImage.correct_answer;
    }
    if (this.dom.peekRef) {
      this.dom.peekRef.textContent = this.currentImage.reference;
    }
    if (this.dom.selectScene) {
      this.dom.selectScene.value = this.currentImage.id;
    }

    this.renderGrid();
    this.displayCurrentImage();
  }

  resetCurrentGrid() {
    if (window.soundEngine) window.soundEngine.playClick();
    if (window.confettiEngine) window.confettiEngine.clear();
    this.stopTimer();

    this.isFullRevealed = false;
    this.tileStates = Array(9).fill('covered');
    this.dom.winOverlay.classList.remove('active');
    this.dom.questionAltar.classList.remove('active');
    this.renderGrid();
  }

  displayCurrentImage() {
    const img = this.dom.bgImage;
    const canvas = this.dom.fallbackCanvas;

    img.style.display = 'block';
    canvas.style.display = 'none';

    const extensions = ['.jpg', '.png', '.webp', '.jpeg'];
    let extIndex = 0;
    const originalUrl = this.currentImage.image_url;

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

    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.35, 60, width * 0.5, height * 0.5, width * 0.7);
    bgGrad.addColorStop(0, '#263445');
    bgGrad.addColorStop(0.4, '#18212c');
    bgGrad.addColorStop(0.8, '#0f151c');
    bgGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#0b0f14';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.65);
    ctx.bezierCurveTo(width * 0.2, height * 0.52, width * 0.4, height * 0.72, width * 0.6, height * 0.58);
    ctx.bezierCurveTo(width * 0.75, height * 0.48, width * 0.85, height * 0.64, width, height * 0.55);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5, 0);
      const rx = (width / 13) * i;
      ctx.lineTo(rx - 25, height);
      ctx.lineTo(rx + 25, height);
      ctx.closePath();
      ctx.fillStyle = '#ffd700';
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(12, 16, 26, 0.9)';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    const cardW = 760;
    const cardH = 240;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.strokeRect(cardX, cardY, cardW, cardH);

    ctx.textAlign = 'center';
    ctx.direction = 'rtl';

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px Cairo, sans-serif';
    ctx.fillText('مشهد كتابي مخفي #' + sceneData.id, width * 0.5, cardY + 70);

    ctx.fillStyle = '#d4af37';
    ctx.font = '700 24px Cairo, sans-serif';
    ctx.fillText(sceneData.reference, width * 0.5, cardY + 120);

    ctx.fillStyle = '#9aa6bc';
    ctx.font = '600 20px Cairo, sans-serif';
    ctx.fillText('اكشف المربعات للإجابة وتخمين المشهد المبارك', width * 0.5, cardY + 175);
    ctx.restore();
  }

  /* ==========================================================================
     3x3 LUXURY MYSTERY GRID
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

      // Note: failed-indicator is hidden by default in CSS!
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

    if (window.soundEngine) window.soundEngine.playStoneSlam();
    this.showQuestionAltar(this.activeQuestion, index, diff);
  }

  /* ==========================================================================
     QUESTION ALTAR & TIMEOUT HANDLING
     ========================================================================== */
  showQuestionAltar(question, tileIndex, difficulty) {
    const diffNames = { 1: 'مستوى سهل ✦', 2: 'مستوى متوسط ✦✦', 3: 'مستوى صعب ✦✦✦' };

    // Reset any previous timeout animations
    if (this.dom.questionText) this.dom.questionText.classList.remove('timed-out');
    if (this.dom.altarParchment) this.dom.altarParchment.classList.remove('timed-out');

    this.dom.modalDiffTag.textContent = diffNames[difficulty];
    this.dom.modalDiffTag.className = `altar-diff-tag level-${difficulty}`;
    this.dom.modalTileIndicator.textContent = `المربع رقم (${tileIndex + 1})`;
    this.dom.questionText.textContent = question.question;

    const optionsWithMeta = question.options.map((text, idx) => ({
      text,
      isCorrect: idx === question.correctIndex
    }));
    const shuffledOptions = this.shuffleArray(optionsWithMeta);

    const letters = ['أ', 'ب', 'ج', 'د'];
    this.dom.optionsGrid.innerHTML = '';

    shuffledOptions.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'altar-option-btn';
      btn.innerHTML = `
        <span>${opt.text}</span>
        <span class="altar-seal-badge">${letters[idx]}</span>
      `;

      btn.addEventListener('click', () => this.handleOptionSelection(btn, opt.isCorrect));
      this.dom.optionsGrid.appendChild(btn);
    });

    this.dom.questionAltar.classList.add('active');

    // Auto-start countdown timer
    this.startQuestionTimer();
  }

  handleOptionSelection(selectedBtn, isCorrect) {
    this.stopTimer();

    const allButtons = this.dom.optionsGrid.querySelectorAll('.altar-option-btn');
    allButtons.forEach(btn => btn.style.pointerEvents = 'none');

    const tileElem = this.dom.gridLayer.querySelector(`[data-index="${this.activeTileIndex}"]`);

    if (isCorrect) {
      selectedBtn.classList.add('selected-correct');
      if (window.soundEngine) window.soundEngine.playCorrect();

      setTimeout(() => {
        this.dom.questionAltar.classList.remove('active');
        this.tileStates[this.activeTileIndex] = 'revealed';
        if (tileElem) {
          tileElem.classList.remove('covered');
          tileElem.classList.add('revealed');
        }
        if (window.soundEngine) window.soundEngine.playReveal();
      }, 700);

    } else {
      selectedBtn.classList.add('selected-incorrect');
      if (window.soundEngine) window.soundEngine.playIncorrect();

      setTimeout(() => {
        this.dom.questionAltar.classList.remove('active');
        this.tileStates[this.activeTileIndex] = 'failed';
        if (tileElem) {
          tileElem.classList.remove('covered');
          tileElem.classList.add('failed');
        }
      }, 850);
    }
  }

  closeQuestionAltar() {
    this.stopTimer();
    this.dom.questionAltar.classList.remove('active');
  }

  /* ==========================================================================
     REVEAL FULL IMAGE & WIN STATE
     ========================================================================== */
  revealFullImage() {
    if (this.isFullRevealed) return;
    this.isFullRevealed = true;
    this.stopTimer();
    this.dom.questionAltar.classList.remove('active');

    const allTiles = this.dom.gridLayer.querySelectorAll('.tile');
    allTiles.forEach((tile, idx) => {
      this.tileStates[idx] = 'revealed';
      tile.classList.remove('covered', 'failed');
      tile.classList.add('revealed');
    });

    if (window.soundEngine) window.soundEngine.playWinFanfare();
    if (window.confettiEngine) window.confettiEngine.burst(200);

    if (this.dom.winTitle) {
      this.dom.winTitle.textContent = this.currentImage.correct_answer;
    }
    if (this.dom.winRef) {
      this.dom.winRef.textContent = `(المرجع: ${this.currentImage.reference})`;
    }
    if (this.dom.winVerse) {
      this.dom.winVerse.textContent = `«${this.currentImage.verse_text}»`;
    }

    setTimeout(() => {
      this.dom.winOverlay.classList.add('active');
    }, 450);
  }

  /* ==========================================================================
     KEYBOARD NAVIGATION
     ========================================================================== */
  handleKeyboard(e) {
    // If Welcome Screen is active, Space or Enter starts game
    if (this.dom.welcomeScreen.classList.contains('active')) {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    // If Question Altar is active:
    if (this.dom.questionAltar.classList.contains('active')) {
      const optionKeys = { '1': 0, '2': 1, '3': 2, '4': 3, 'KeyA': 0, 'KeyB': 1, 'KeyC': 2, 'KeyD': 3 };
      const idx = optionKeys[e.key] !== undefined ? optionKeys[e.key] : optionKeys[e.code];

      if (idx !== undefined) {
        const btns = this.dom.optionsGrid.querySelectorAll('.altar-option-btn');
        if (btns[idx] && btns[idx].style.pointerEvents !== 'none') {
          btns[idx].click();
        }
      } else if (e.key === 'Escape') {
        this.closeQuestionAltar();
      }
      return;
    }

    // If Win Overlay is active:
    if (this.dom.winOverlay.classList.contains('active')) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        this.loadNextImage();
      }
      return;
    }

    // 1-9: Select Tile 1 to 9 directly
    if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)) {
      const tileIndex = parseInt(e.key, 10) - 1;
      this.handleTileClick(tileIndex);
      return;
    }

    // Space: Reveal Full Image
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      this.revealFullImage();
      return;
    }

    // N: Next Scene
    if (e.key === 'n' || e.key === 'N' || e.key === 'ى') {
      this.loadNextImage();
      return;
    }

    // P: Toggle Secret Peek
    if (e.key === 'p' || e.key === 'P' || e.key === 'ح') {
      if (this.dom.peekWrapper) {
        this.dom.peekWrapper.classList.toggle('active');
      }
      return;
    }
  }

  /* ==========================================================================
     AUDIO & FULLSCREEN
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

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new PictureRevealGame();
  window.gameApp.init();
});
