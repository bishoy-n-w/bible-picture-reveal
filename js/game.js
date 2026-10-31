/**
 * Temple Codex Edition - Picture Reveal Bible Trivia Engine
 * Handles:
 *  - 3D Basalt Tile-to-Difficulty Grid Mapping (Center=Hard/Seal, Edges=Medium, Corners=Easy)
 *  - Non-Blocking Bottom Question Altar
 *  - Fair Cycle Pools for Scenes & Questions (No Repetition)
 *  - Carnival Team Scoring System (Team 1 vs Team 2)
 *  - Tension Countdown Timer (with audio ticks and SVG radial progress)
 *  - Full Theater Keyboard Shortcuts (1-9 for tiles, 1-4 for answers, Space, N, P, T, M, Esc)
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

    // Team Scores
    this.team1Score = 0;
    this.team2Score = 0;

    // Timer State
    this.timerDuration = 20; // 20 seconds
    this.timerRemaining = 20;
    this.timerInterval = null;
    this.timerActive = false;

    // 3x3 Difficulty Map (Center is hardest / greatest reward)
    this.difficultyMap = {
      0: 1, 1: 2, 2: 1,
      3: 2, 4: 3, 5: 2,
      6: 1, 7: 2, 8: 1
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
    this.loadNextImage();
  }

  cacheDom() {
    this.dom.gridLayer = document.getElementById('grid-layer');
    this.dom.bgImage = document.getElementById('bg-image');
    this.dom.fallbackCanvas = document.getElementById('fallback-canvas');
    this.dom.roundDisplay = document.getElementById('round-counter');
    this.dom.remainingDisplay = document.getElementById('remaining-counter');

    // Scoreboard
    this.dom.scoreboard = document.getElementById('scoreboard');
    this.dom.team1Score = document.getElementById('team1-score');
    this.dom.team2Score = document.getElementById('team2-score');

    // Timer Elements
    this.dom.timerBox = document.getElementById('timer-box');
    this.dom.timerCircle = document.getElementById('timer-circle');
    this.dom.timerDigits = document.getElementById('timer-digits');
    this.dom.altarTimerLine = document.getElementById('altar-timer-line');

    // Non-Blocking Question Altar
    this.dom.questionAltar = document.getElementById('question-altar');
    this.dom.modalDiffTag = document.getElementById('modal-diff-tag');
    this.dom.modalTileIndicator = document.getElementById('modal-tile-indicator');
    this.dom.questionText = document.getElementById('question-text');
    this.dom.optionsGrid = document.getElementById('options-grid');
    this.dom.modalCloseBtn = document.getElementById('btn-modal-close');

    // Grand Win Overlay
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
    this.dom.inputCustomImages = document.getElementById('input-custom-images');
    this.dom.btnAudio = document.getElementById('btn-toggle-audio');
    this.dom.btnFullscreen = document.getElementById('btn-fullscreen');
    this.dom.btnToggleTimer = document.getElementById('btn-toggle-timer');
    this.dom.btnToggleScores = document.getElementById('btn-toggle-scores');
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
    // Reveal Full Image
    if (this.dom.btnReveal) {
      this.dom.btnReveal.addEventListener('click', () => this.revealFullImage());
    }
    // Next Image
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
    // Audio Toggle
    if (this.dom.btnAudio) {
      this.dom.btnAudio.addEventListener('click', () => this.toggleAudio());
    }
    // Fullscreen Toggle
    if (this.dom.btnFullscreen) {
      this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }
    // Question Altar Close
    if (this.dom.modalCloseBtn) {
      this.dom.modalCloseBtn.addEventListener('click', () => this.closeQuestionAltar());
    }

    // Timer Box Click
    if (this.dom.timerBox) {
      this.dom.timerBox.addEventListener('click', () => this.toggleTimer());
    }
    if (this.dom.btnToggleTimer) {
      this.dom.btnToggleTimer.addEventListener('click', () => this.toggleTimer());
    }

    // Scoreboard Toggle
    if (this.dom.btnToggleScores) {
      this.dom.btnToggleScores.addEventListener('click', () => {
        this.dom.scoreboard.classList.toggle('hidden');
      });
    }

    // Team Score Buttons (+10 / -10)
    document.querySelectorAll('.score-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const team = e.target.dataset.team;
        const val = parseInt(e.target.dataset.val, 10);
        this.adjustTeamScore(team, val);
      });
    });

    // Win Bonus Buttons (+50 for picture guess)
    document.querySelectorAll('.bonus-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const team = e.target.dataset.team;
        this.adjustTeamScore(team, 50);
        btn.disabled = true;
        btn.style.opacity = '0.5';
      });
    });

    // Scene Selector Jump
    if (this.dom.selectScene) {
      this.dom.selectScene.addEventListener('change', (e) => {
        const selectedId = parseInt(e.target.value, 10);
        if (!isNaN(selectedId)) {
          this.jumpToScene(selectedId);
        }
      });
    }

    // Custom Images File Picker
    if (this.dom.inputCustomImages) {
      this.dom.inputCustomImages.addEventListener('change', (e) => {
        this.handleUploadedImages(e.target.files);
      });
    }

    // Drag and Drop Images
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.handleUploadedImages(e.dataTransfer.files);
      }
    });

    // Secret Peek Click (touch devices)
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

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  /* ==========================================================================
     TEAM SCORING
     ========================================================================== */
  adjustTeamScore(team, delta) {
    if (window.soundEngine) window.soundEngine.playClick();
    if (team === '1') {
      this.team1Score = Math.max(0, this.team1Score + delta);
      if (this.dom.team1Score) this.dom.team1Score.textContent = this.team1Score;
    } else if (team === '2') {
      this.team2Score = Math.max(0, this.team2Score + delta);
      if (this.dom.team2Score) this.dom.team2Score.textContent = this.team2Score;
    }
  }

  /* ==========================================================================
     TENSION COUNTDOWN TIMER
     ========================================================================== */
  startTimer() {
    this.stopTimer();
    this.timerRemaining = this.timerDuration;
    this.timerActive = true;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.timerRemaining--;
      this.updateTimerDisplay();

      // Play tick sound (urgent in last 5 seconds)
      const isUrgent = this.timerRemaining <= 5;
      if (window.soundEngine) window.soundEngine.playTick(isUrgent);

      if (this.timerRemaining <= 0) {
        this.stopTimer();
        if (window.soundEngine) window.soundEngine.playTimeout();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerActive = false;
    if (this.dom.timerBox) this.dom.timerBox.classList.remove('urgent');
  }

  toggleTimer() {
    if (this.timerActive) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  updateTimerDisplay() {
    if (this.dom.timerDigits) {
      this.dom.timerDigits.textContent = this.timerRemaining;
    }
    // Radial SVG stroke offset (circumference ~ 100)
    if (this.dom.timerCircle) {
      const pct = (this.timerDuration - this.timerRemaining) / this.timerDuration;
      this.dom.timerCircle.style.strokeDashoffset = pct * 100;
    }
    // Altar top line
    if (this.dom.altarTimerLine) {
      const scalePct = this.timerRemaining / this.timerDuration;
      this.dom.altarTimerLine.style.transform = `scaleX(${scalePct})`;
    }
    // Urgent indicator
    if (this.dom.timerBox) {
      if (this.timerRemaining <= 5 && this.timerRemaining > 0) {
        this.dom.timerBox.classList.add('urgent');
      } else {
        this.dom.timerBox.classList.remove('urgent');
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

    // Reset win bonus buttons
    document.querySelectorAll('.bonus-btn').forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
    });

    if (this.dom.roundDisplay) {
      this.dom.roundDisplay.textContent = this.roundCount;
    }
    if (this.dom.remainingDisplay) {
      this.dom.remainingDisplay.textContent = this.imagePool.length;
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

    // Atmospheric Basalt & Celestial Gradient
    const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.35, 60, width * 0.5, height * 0.5, width * 0.7);
    bgGrad.addColorStop(0, '#2c3e50');
    bgGrad.addColorStop(0.4, '#1a252f');
    bgGrad.addColorStop(0.8, '#11171d');
    bgGrad.addColorStop(1, '#06080b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Mountain silhouettes
    ctx.fillStyle = '#0b0f14';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.65);
    ctx.bezierCurveTo(width * 0.2, height * 0.52, width * 0.4, height * 0.72, width * 0.6, height * 0.58);
    ctx.bezierCurveTo(width * 0.75, height * 0.48, width * 0.85, height * 0.64, width, height * 0.55);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Divine golden beams
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

    // Temple Parchment Slab in Center
    ctx.save();
    ctx.fillStyle = 'rgba(12, 16, 26, 0.88)';
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
    ctx.fillText('لوح المشهد الكتابي #' + sceneData.id, width * 0.5, cardY + 70);

    ctx.fillStyle = '#d4af37';
    ctx.font = '700 24px Cairo, sans-serif';
    ctx.fillText(sceneData.reference, width * 0.5, cardY + 120);

    ctx.fillStyle = '#9aa6bc';
    ctx.font = '600 20px Cairo, sans-serif';
    ctx.fillText('اكشف الألواح للإجابة وتخمين المشهد المقدس', width * 0.5, cardY + 175);
    ctx.restore();
  }

  /* ==========================================================================
     3x3 BASALT TILE GRID
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

      tile.innerHTML = `
        <div class="tile-inner">
          <span class="tile-number">${i + 1}</span>
          <span class="tile-difficulty">${diffStars[diff]}</span>
          <span class="tile-diff-label">${diffLabels[diff]}</span>
        </div>
        <div class="failed-indicator">
          <span class="failed-icon">✕</span>
          <span class="failed-chains">⛓️ 🔒</span>
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

    // Deep Stone Slam Sound
    if (window.soundEngine) window.soundEngine.playStoneSlam();

    this.showQuestionAltar(this.activeQuestion, index, diff);
  }

  /* ==========================================================================
     NON-BLOCKING QUESTION ALTAR
     ========================================================================== */
  showQuestionAltar(question, tileIndex, difficulty) {
    const diffNames = { 1: 'مستوى سهل ✦', 2: 'مستوى متوسط ✦✦', 3: 'الختم الأعظم (صعب) ✦✦✦' };

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
    this.startTimer();
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
     KEYBOARD NAVIGATION (BOOTH CONTROLLER)
     ========================================================================== */
  handleKeyboard(e) {
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

    // If Win Overlay is active: Space or Enter moves to next image
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

    // T: Toggle Countdown Timer
    if (e.key === 't' || e.key === 'T' || e.key === 'ف') {
      this.toggleTimer();
      return;
    }
  }

  /* ==========================================================================
     CUSTOM IMAGES UPLOADER
     ========================================================================== */
  handleUploadedImages(fileList) {
    if (!fileList || fileList.length === 0) return;

    let matched = 0;
    Array.from(fileList).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      const name = file.name.toLowerCase();

      const numMatch = name.match(/(\d+)/);
      if (numMatch) {
        const id = parseInt(numMatch[1], 10);
        const target = this.picsBank.find(p => p.id === id);
        if (target) {
          target.image_url = url;
          matched++;
        }
      }
    });

    if (matched > 0) {
      if (window.soundEngine) window.soundEngine.playReveal();
      this.displayCurrentImage();
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
