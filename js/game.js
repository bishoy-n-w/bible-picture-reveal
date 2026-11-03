/**
 * Picture Reveal Bible Trivia - Bilingual Servants Edition v4.0.0
 * Handles:
 *  - Multilingual Engine (Arabic Smith & Van Dyck & English NKJV)
 *  - Independent Language Activation (Arabic-only, English-only, Bilingual)
 *  - Welcome Attractor Screen & Return-to-Home Flow
 *  - 3D Luxury Mystery Vault Grid (3-3-3 Difficulty Distribution)
 *  - Fullscreen Servant Question Screen with Full Biblical Verses (No Auto-Dismiss)
 *  - 60-Second Countdown Timer with Fading Timeout State
 *  - Number-Only Anti-Spoiler Dropdown & Full Keyboard Controller
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
    this.activeShuffledOptions = null;
    this.isFullRevealed = false;
    this.roundCount = 0;
    this.isGameActive = false;
    this.pendingOutcome = null; // { isCorrect: boolean, tileIndex: number }

    // Integrated Question Timer (Adjustable via slider)
    this.timerDuration = parseInt(localStorage.getItem('picture_reveal_timer_duration'), 10) || 60;
    this.timerRemaining = this.timerDuration;
    this.timerInterval = null;
    this.timerEndTime = null;

    // Asynchronous image loading guard
    this.imageLoadSequence = 0;

    // Dynamic 3x3 Difficulty Map (Randomized Fair 3-3-3 Allocation):
    // Shuffles exactly 3 Level 1 (Advanced), 3 Level 2 (Deep), and 3 Level 3 (Mastery) tiles across the 9 positions
    this.difficultyMap = this.generateRandomDifficultyMap();

    this.dom = {};
  }

  init() {
    this.cacheDom();
    if (window.i18n) {
      window.i18n.applyDocumentDirection();
    }
    this.populateSceneSelector();
    this.bindEvents();

    if (window.confettiEngine && this.dom.confettiCanvas) {
      window.confettiEngine.init(this.dom.confettiCanvas);
    }

    this.updateAudioButtonState();
    this.updateAllLocalizedUI();

    // Start attractor visual engine if welcome screen is active
    if (this.dom.welcomeScreen && this.dom.welcomeScreen.classList.contains('active')) {
      if (window.attractorEngine) window.attractorEngine.start();
    }

    // Auto-unlock audio on first user gesture
    const unlockAudio = () => {
      if (window.soundEngine) {
        window.soundEngine.init();
        if (!this.isGameActive && this.dom.welcomeScreen && this.dom.welcomeScreen.classList.contains('active')) {
          window.soundEngine.startWelcomeAmbience();
        }
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
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

    // Fullscreen Question Screen & Timer
    this.dom.questionScreen = document.getElementById('question-screen');
    this.dom.questionAltar = this.dom.questionScreen; // for backward compatibility
    this.dom.modalDiffTag = document.getElementById('modal-diff-tag');
    this.dom.modalTileIndicator = document.getElementById('modal-tile-indicator');
    this.dom.altarTimerBadge = document.getElementById('altar-timer-badge');
    this.dom.timerText = document.getElementById('timer-text');
    this.dom.questionText = document.getElementById('question-text');
    this.dom.optionsGrid = document.getElementById('options-grid');
    this.dom.modalCloseBtn = document.getElementById('btn-modal-close');

    // Answer Revelation Card Elements
    this.dom.answerRevelationCard = document.getElementById('answer-revelation-card');
    this.dom.revelationStatus = document.getElementById('revelation-status');
    this.dom.revelationCorrectAnswer = document.getElementById('revelation-correct-answer');
    this.dom.revelationVerse = document.getElementById('revelation-verse');
    this.dom.revelationReference = document.getElementById('revelation-reference');
    this.dom.btnReturnBoard = document.getElementById('btn-return-board');

    // Win Overlay
    this.dom.winOverlay = document.getElementById('win-overlay');
    this.dom.winTitle = document.getElementById('win-title');
    this.dom.winRef = document.getElementById('win-ref');
    this.dom.winVerse = document.getElementById('win-verse');
    this.dom.winNextBtn = document.getElementById('win-next-btn');
    this.dom.winImagePreview = document.getElementById('win-image-preview');
    this.dom.winFallbackCanvas = document.getElementById('win-fallback-canvas');
    this.dom.winCloseBtn = document.getElementById('win-close-btn');
    this.dom.winViewBoardBtn = document.getElementById('win-view-board-btn');
    this.dom.btnRestoreWinCard = document.getElementById('btn-restore-win-card');
    this.dom.appVersionBadge = document.getElementById('app-version-badge');
    this.dom.welcomeAudioToggle = document.getElementById('welcome-audio-toggle');
    this.dom.qscreenContainer = this.dom.questionScreen ? this.dom.questionScreen.querySelector('.qscreen-container') : null;
    this.dom.inputTimerSlider = document.getElementById('input-timer-slider');
    this.dom.timerSliderVal = document.getElementById('timer-slider-val');
    this.dom.inputVolumeSlider = document.getElementById('input-volume-slider');
    this.dom.volumeSliderVal = document.getElementById('volume-slider-val');
    this.dom.btnTimerSettings = document.getElementById('btn-timer-settings');
    this.dom.btnVolumeSettings = document.getElementById('btn-volume-settings');
    this.dom.volumeSettingsWrapper = document.getElementById('volume-settings-wrapper');
    this.dom.timerSettingsWrapper = document.getElementById('timer-settings-wrapper');
    this.dom.btnCloseVolumePopover = document.getElementById('btn-close-volume-popover');
    this.dom.btnCloseTimerPopover = document.getElementById('btn-close-timer-popover');
    this.dom.btnTimerInfinity = document.getElementById('btn-timer-infinity');
    this.dom.btnTimer60s = document.getElementById('btn-timer-60s');
    this.dom.btnTimer30s = document.getElementById('btn-timer-30s');
    this.dom.btnVolPreset20 = document.getElementById('btn-vol-preset-20');
    this.dom.btnVolPreset50 = document.getElementById('btn-vol-preset-50');
    this.dom.btnVolPreset80 = document.getElementById('btn-vol-preset-80');

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

  // Populate Dropdown with Numbers Only (Anti-Spoiler)
  populateSceneSelector() {
    if (!this.dom.selectScene) return;
    const prefix = window.i18n ? window.i18n.t('sceneItemPrefix') : 'صورة رقم';
    const chooseTxt = window.i18n ? window.i18n.t('chooseScene') : '-- اختر صورة (1-20) --';
    const currentVal = this.dom.selectScene.value;

    this.dom.selectScene.innerHTML = `<option value="">${chooseTxt}</option>`;
    for (let i = 1; i <= this.picsBank.length; i++) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = `${prefix} ${i}`;
      this.dom.selectScene.appendChild(opt);
    }
    if (currentVal) this.dom.selectScene.value = currentVal;
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

    // Language Toggle Buttons (Independent activation: AR / EN / Both)
    document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const lang = btn.dataset.lang;
        if (window.i18n) {
          window.i18n.toggleLanguage(lang);
          if (window.soundEngine) window.soundEngine.playClick();
          this.updateAllLocalizedUI();
        }
      });
    });

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
    if (this.dom.welcomeAudioToggle) {
      this.dom.welcomeAudioToggle.addEventListener('click', () => this.toggleAudio());
    }
    if (this.dom.btnFullscreen) {
      this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    }

    // Toggle Volume Settings Popover (Click / Touch)
    if (this.dom.btnVolumeSettings && this.dom.volumeSettingsWrapper) {
      this.dom.btnVolumeSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.dom.timerSettingsWrapper) this.dom.timerSettingsWrapper.classList.remove('active');
        this.dom.volumeSettingsWrapper.classList.toggle('active');
      });
    }

    // Toggle Timer Settings Popover (Click / Touch)
    if (this.dom.btnTimerSettings && this.dom.timerSettingsWrapper) {
      this.dom.btnTimerSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.dom.volumeSettingsWrapper) this.dom.volumeSettingsWrapper.classList.remove('active');
        this.dom.timerSettingsWrapper.classList.toggle('active');
      });
    }

    // Close buttons on popovers
    if (this.dom.btnCloseVolumePopover && this.dom.volumeSettingsWrapper) {
      this.dom.btnCloseVolumePopover.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.volumeSettingsWrapper.classList.remove('active');
      });
    }
    if (this.dom.btnCloseTimerPopover && this.dom.timerSettingsWrapper) {
      this.dom.btnCloseTimerPopover.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.timerSettingsWrapper.classList.remove('active');
      });
    }

    // Prevent clicks inside popovers from bubbling to document and closing
    document.querySelectorAll('.header-mini-popover').forEach(el => {
      el.addEventListener('click', (e) => e.stopPropagation());
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.header-popover-wrapper')) {
        if (this.dom.volumeSettingsWrapper) this.dom.volumeSettingsWrapper.classList.remove('active');
        if (this.dom.timerSettingsWrapper) this.dom.timerSettingsWrapper.classList.remove('active');
      }
    });

    // Helper to update timer duration and text (Supports Infinity at 0 or >= 125)
    const updateTimerDuration = (val) => {
      if (val >= 125 || val === 0) {
        this.timerDuration = 0; // 0 represents Infinity
        if (this.dom.inputTimerSlider) this.dom.inputTimerSlider.value = 125;
        if (this.dom.timerSliderVal) {
          this.dom.timerSliderVal.textContent = window.i18n ? window.i18n.t('timerInfinite') : 'بدون وقت (∞)';
        }
      } else {
        this.timerDuration = val;
        if (this.dom.inputTimerSlider) this.dom.inputTimerSlider.value = val;
        if (this.dom.timerSliderVal) {
          const sfx = window.i18n ? window.i18n.t('secondsSuffix') : 'ثانية';
          this.dom.timerSliderVal.textContent = `${val} ${sfx}`;
        }
      }
      localStorage.setItem('picture_reveal_timer_duration', this.timerDuration);
      if (this.dom.questionScreen && this.dom.questionScreen.classList.contains('active')) {
        this.updateTimerDisplay();
      }
    };

    // Initialize Timer Slider
    if (this.dom.inputTimerSlider) {
      updateTimerDuration(this.timerDuration);
      this.dom.inputTimerSlider.addEventListener('input', (e) => {
        updateTimerDuration(parseInt(e.target.value, 10));
      });
    }

    // Timer Preset Buttons
    if (this.dom.btnTimerInfinity) {
      this.dom.btnTimerInfinity.addEventListener('click', (e) => {
        e.stopPropagation();
        updateTimerDuration(0);
      });
    }
    if (this.dom.btnTimer60s) {
      this.dom.btnTimer60s.addEventListener('click', (e) => {
        e.stopPropagation();
        updateTimerDuration(60);
      });
    }
    if (this.dom.btnTimer30s) {
      this.dom.btnTimer30s.addEventListener('click', (e) => {
        e.stopPropagation();
        updateTimerDuration(30);
      });
    }

    // Helper to update volume
    const updateVolume = (pct) => {
      const vol = pct / 100;
      if (window.soundEngine) {
        window.soundEngine.setGameVolume(vol);
      }
      if (this.dom.inputVolumeSlider) this.dom.inputVolumeSlider.value = pct;
      if (this.dom.volumeSliderVal) this.dom.volumeSliderVal.textContent = `${pct}%`;
    };

    // Initialize Volume Slider
    if (this.dom.inputVolumeSlider && window.soundEngine) {
      const initialVol = Math.round(window.soundEngine.getGameVolume() * 100);
      updateVolume(initialVol);
      this.dom.inputVolumeSlider.addEventListener('input', (e) => {
        updateVolume(parseInt(e.target.value, 10));
      });
    }

    // Volume Preset Buttons
    if (this.dom.btnVolPreset20) {
      this.dom.btnVolPreset20.addEventListener('click', (e) => {
        e.stopPropagation();
        updateVolume(20);
      });
    }
    if (this.dom.btnVolPreset50) {
      this.dom.btnVolPreset50.addEventListener('click', (e) => {
        e.stopPropagation();
        updateVolume(50);
      });
    }
    if (this.dom.btnVolPreset80) {
      this.dom.btnVolPreset80.addEventListener('click', (e) => {
        e.stopPropagation();
        updateVolume(80);
      });
    }

    // Question Screen Cancel/Close
    if (this.dom.modalCloseBtn) {
      this.dom.modalCloseBtn.addEventListener('click', () => this.closeQuestionAltar());
    }

    // Return to board button on Revelation Card (Manual Continue)
    if (this.dom.btnReturnBoard) {
      this.dom.btnReturnBoard.addEventListener('click', () => this.applyOutcomeAndReturnToBoard());
    }

    // Win Overlay Close & View Board Minimization
    if (this.dom.winCloseBtn) {
      this.dom.winCloseBtn.addEventListener('click', () => this.minimizeWinCardToBoard());
    }
    if (this.dom.winViewBoardBtn) {
      this.dom.winViewBoardBtn.addEventListener('click', () => this.minimizeWinCardToBoard());
    }
    if (this.dom.btnRestoreWinCard) {
      this.dom.btnRestoreWinCard.addEventListener('click', () => this.restoreWinCard());
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
     LOCALIZATION RE-RENDER CONTROLLER
     ========================================================================== */
  updateAllLocalizedUI() {
    if (!window.i18n) return;
    window.i18n.applyDocumentDirection();

    // 1. Update all static [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.innerHTML = window.i18n.t(key);
    });

    // 2. Update active states on language buttons
    document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
      const lang = btn.dataset.lang;
      btn.classList.toggle('active', window.i18n.isLanguageActive(lang));
    });

    // 3. Update scene dropdown
    this.populateSceneSelector();

    // 4. Update grid tiles difficulty labels
    if (this.currentImage) {
      this.renderGrid();
    }

    // 5. Update Secret Peek text
    if (this.currentImage) {
      if (this.dom.peekAnswer) {
        this.dom.peekAnswer.innerHTML = window.i18n.formatField(this.currentImage.correct_answer);
      }
      if (this.dom.peekRef) {
        this.dom.peekRef.innerHTML = window.i18n.formatField(this.currentImage.reference);
      }
    }

    // 6. If Question Screen is currently open, re-render its text and options
    if (this.dom.questionScreen && this.dom.questionScreen.classList.contains('active') && this.activeQuestion) {
      this.reRenderActiveQuestionScreen();
    }

    // 7. If Win Overlay is active, re-render
    if (this.dom.winOverlay && this.dom.winOverlay.classList.contains('active') && this.currentImage) {
      this.renderWinContent();
    }

    // 8. Update version display across all badges
    if (window.APP_VERSION) {
      document.querySelectorAll('#app-version-badge, #welcome-version-badge, #floating-version-badge').forEach(el => {
        el.textContent = window.APP_VERSION;
      });
    }
  }

  /* ==========================================================================
     WELCOME SCREEN & GAME ROUTING
     ========================================================================== */
  startGame() {
    if (window.soundEngine) {
      window.soundEngine.playClick();
      window.soundEngine.duckToGameVolume();
    }
    if (window.attractorEngine) {
      window.attractorEngine.stop();
    }
    this.isGameActive = true;
    this.dom.welcomeScreen.classList.remove('active');

    if (!this.currentImage) {
      this.loadNextImage();
    }
  }

  showWelcomeScreen() {
    if (window.soundEngine) {
      window.soundEngine.playClick();
      window.soundEngine.unduckToWelcomeVolume();
    }
    if (window.attractorEngine) {
      window.attractorEngine.start();
    }
    this.stopTimer();
    if (window.confettiEngine) window.confettiEngine.clear();

    this.isGameActive = false;
    this.dom.winOverlay.classList.remove('active');
    this.dom.questionScreen.classList.remove('active');
    if (this.dom.btnRestoreWinCard) this.dom.btnRestoreWinCard.classList.remove('active');
    this.dom.welcomeScreen.classList.add('active');
  }

  /* ==========================================================================
     INTEGRATED QUESTION COUNTDOWN TIMER (Adjustable Duration)
     ========================================================================== */
  startQuestionTimer() {
    this.stopTimer();

    // Check for Infinity / No Timeout (0 or >= 125)
    if (this.timerDuration === 0 || this.timerDuration >= 125) {
      this.timerRemaining = Infinity;
      if (this.dom.altarTimerBadge) {
        this.dom.altarTimerBadge.className = 'altar-timer-badge infinity';
        this.dom.timerText.textContent = window.i18n ? window.i18n.t('timerInfinite') : 'بدون وقت (∞)';
      }
      return;
    }

    this.timerRemaining = this.timerDuration;
    this.timerEndTime = Date.now() + (this.timerDuration * 1000);
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      const remainingMs = this.timerEndTime - Date.now();
      const newRemaining = Math.max(0, Math.ceil(remainingMs / 1000));

      if (newRemaining !== this.timerRemaining) {
        this.timerRemaining = newRemaining;
        this.updateTimerDisplay();

        // Audio ticks
        if (this.timerRemaining > 0) {
          const isUrgent = this.timerRemaining <= 5;
          if (window.soundEngine) window.soundEngine.playTick(isUrgent);
        }
      }

      if (this.timerRemaining <= 0) {
        // Timed out: show alert, play timeout gong, but DO NOT dismiss the question!
        this.stopTimer();
        if (window.soundEngine) window.soundEngine.playTimeout();
        if (this.dom.altarTimerBadge) {
          this.dom.altarTimerBadge.className = 'altar-timer-badge timed-out';
          this.dom.timerText.textContent = window.i18n ? window.i18n.t('timeUp') : 'انتهى الوقت! ⏰';
        }
        if (this.dom.questionText) {
          this.dom.questionText.classList.add('timed-out');
        }
        // One-shot dramatic box shake (options remain stationary and clickable)
        if (this.dom.qscreenContainer) {
          this.dom.qscreenContainer.classList.remove('timed-out-shake');
          void this.dom.qscreenContainer.offsetWidth; // Force reflow
          this.dom.qscreenContainer.classList.add('timed-out-shake');
        }
      }
    }, 250);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timerEndTime = null;
  }

  updateTimerDisplay() {
    if (!this.dom.timerText || !this.dom.altarTimerBadge) return;

    if (this.timerDuration === 0 || this.timerDuration >= 125) {
      this.dom.altarTimerBadge.className = 'altar-timer-badge infinity';
      this.dom.timerText.textContent = window.i18n ? window.i18n.t('timerInfinite') : 'بدون وقت (∞)';
      return;
    }

    if (this.timerRemaining > 0 && this.timerRemaining !== Infinity) {
      if (window.i18n && window.i18n.isBilingual()) {
        this.dom.timerText.textContent = `${this.timerRemaining} ثانية / sec`;
      } else if (window.i18n && window.i18n.activeLanguages.length === 1 && window.i18n.activeLanguages[0] === 'en') {
        this.dom.timerText.textContent = `${this.timerRemaining}s`;
      } else {
        this.dom.timerText.textContent = `${this.timerRemaining} ثانية`;
      }
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
  generateRandomDifficultyMap() {
    // Fair 3-3-3 distribution: 3 Level 1 (Advanced ✦), 3 Level 2 (Deep ✦✦), 3 Level 3 (Mastery ✦✦✦)
    const baseLevels = [1, 1, 1, 2, 2, 2, 3, 3, 3];
    const shuffled = this.shuffleArray(baseLevels);
    const map = {};
    for (let i = 0; i < 9; i++) {
      map[i] = shuffled[i];
    }
    return map;
  }

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
      this.imagePool = this.shuffleArray(this.picsBank.length > 0 ? this.picsBank : [{ id: 1, image_url: 'assets/img1.jpg', correct_answer: { ar: 'مشهد كتابي', en: 'Biblical Scene' }, reference: { ar: '', en: '' }, verse_text: { ar: '', en: '' } }]);
    }
    return this.imagePool.pop();
  }

  getNextQuestionFromPool(level) {
    if (!this.questionPools[level] || this.questionPools[level].length === 0) {
      const tierQuestions = this.questionsBank.filter(q => q.level === level);
      this.questionPools[level] = this.shuffleArray(tierQuestions.length > 0 ? tierQuestions : this.questionsBank);
    }
    const picked = this.questionPools[level].pop();
    if (!picked) {
      return this.questionsBank[0] || {
        id: 999,
        level: level || 1,
        question: { ar: 'سؤال كتابي', en: 'Biblical Question' },
        options: { ar: ['أ', 'ب', 'ج', 'د'], en: ['A', 'B', 'C', 'D'] },
        correctIndex: 0,
        reference: { ar: '', en: '' },
        verse: { ar: '', en: '' }
      };
    }
    return picked;
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
    this.dom.questionScreen.classList.remove('active');
    if (this.dom.btnRestoreWinCard) this.dom.btnRestoreWinCard.classList.remove('active');

    if (this.dom.roundDisplay) {
      this.dom.roundDisplay.textContent = this.currentImage.id;
    }
    if (this.dom.remainingDisplay) {
      this.dom.remainingDisplay.textContent = this.picsBank.length;
    }

    if (this.dom.peekAnswer) {
      this.dom.peekAnswer.innerHTML = window.i18n ? window.i18n.formatField(this.currentImage.correct_answer) : this.currentImage.correct_answer.ar;
    }
    if (this.dom.peekRef) {
      this.dom.peekRef.innerHTML = window.i18n ? window.i18n.formatField(this.currentImage.reference) : this.currentImage.reference.ar;
    }
    if (this.dom.selectScene) {
      this.dom.selectScene.value = this.currentImage.id;
    }

    // Dynamic fair 3-3-3 difficulty randomization for each new round
    this.difficultyMap = this.generateRandomDifficultyMap();

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
    this.dom.questionScreen.classList.remove('active');
    if (this.dom.btnRestoreWinCard) this.dom.btnRestoreWinCard.classList.remove('active');

    // Fresh randomized allocation on reset
    this.difficultyMap = this.generateRandomDifficultyMap();
    this.renderGrid();
  }

  displayCurrentImage() {
    const img = this.dom.bgImage;
    const canvas = this.dom.fallbackCanvas;
    if (!img || !canvas || !this.currentImage) return;

    const currentSequence = ++this.imageLoadSequence;
    img.style.display = 'block';
    canvas.style.display = 'none';

    const extensions = ['.jpg', '.png', '.webp', '.jpeg'];
    let extIndex = 0;
    const originalUrl = this.currentImage.image_url;

    if (originalUrl.startsWith('blob:') || originalUrl.startsWith('data:')) {
      img.onerror = () => {
        if (currentSequence === this.imageLoadSequence) this.renderFallbackScene(this.currentImage);
      };
      img.onload = () => {
        if (currentSequence === this.imageLoadSequence) {
          img.style.display = 'block';
          canvas.style.display = 'none';
        }
      };
      img.src = originalUrl;
      return;
    }

    const basePath = originalUrl.substring(0, originalUrl.lastIndexOf('.')) || `assets/img${this.currentImage.id}`;

    const tryNext = () => {
      if (currentSequence !== this.imageLoadSequence) return;
      if (extIndex < extensions.length) {
        const nextUrl = basePath + extensions[extIndex++];
        img.src = nextUrl;
      } else {
        this.renderFallbackScene(this.currentImage);
      }
    };

    img.onerror = () => tryNext();
    img.onload = () => {
      if (currentSequence === this.imageLoadSequence) {
        img.style.display = 'block';
        canvas.style.display = 'none';
      }
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
    const refText = window.i18n ? window.i18n.getPlainText(sceneData.reference) : sceneData.reference.ar;
    ctx.fillText(refText, width * 0.5, cardY + 120);

    ctx.fillStyle = '#9aa6bc';
    ctx.font = '600 20px Cairo, sans-serif';
    ctx.fillText('اكشف المربعات للإجابة وتخمين المشهد المبارك', width * 0.5, cardY + 175);
    ctx.restore();
  }

  /* ==========================================================================
     3x3 LUXURY MYSTERY GRID (3-3-3 DISTRIBUTION)
     ========================================================================== */
  renderGrid() {
    this.dom.gridLayer.innerHTML = '';
    const diffLabels = {
      1: window.i18n ? window.i18n.t('diffEasy') : 'متقدم',
      2: window.i18n ? window.i18n.t('diffMedium') : 'عميق',
      3: window.i18n ? window.i18n.t('diffHard') : 'فائق'
    };
    const diffStars = { 1: '✦', 2: '✦✦', 3: '✦✦✦' };
    const lockedTxt = window.i18n ? window.i18n.t('lockedLabel') : 'مغلق';

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
          <span class="failed-label">${lockedTxt}</span>
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
     FULLSCREEN QUESTION SCREEN & ANSWER REVELATION
     ========================================================================== */
  showQuestionAltar(question, tileIndex, difficulty) {
    this.activeTileIndex = tileIndex;
    this.activeDifficulty = difficulty;
    this.activeQuestion = question;
    this.pendingOutcome = null;

    // Build shuffled options array preserving bilingual references
    const optionsWithMeta = question.options.ar.map((textAr, idx) => ({
      ar: textAr,
      en: (question.options.en && question.options.en[idx]) || textAr,
      isCorrect: idx === question.correctIndex
    }));
    this.activeShuffledOptions = this.shuffleArray(optionsWithMeta);

    this.reRenderActiveQuestionScreen();

    if (this.dom.questionScreen) {
      this.dom.questionScreen.classList.add('active');
    }

    // Auto-start 60s countdown timer
    this.startQuestionTimer();
  }

  reRenderActiveQuestionScreen() {
    if (!this.activeQuestion) return;

    const diffNames = {
      1: window.i18n ? window.i18n.t('level1Name') : 'مستوى متقدم ✦',
      2: window.i18n ? window.i18n.t('level2Name') : 'مستوى عميق ✦✦',
      3: window.i18n ? window.i18n.t('level3Name') : 'مستوى فائق الصعوبة ✦✦✦'
    };

    if (this.dom.questionText) this.dom.questionText.classList.remove('timed-out');
    if (this.dom.qscreenContainer) this.dom.qscreenContainer.classList.remove('timed-out-shake');
    if (this.dom.answerRevelationCard && !this.pendingOutcome) {
      this.dom.answerRevelationCard.classList.remove('active');
    }

    const tileTxt = window.i18n ? window.i18n.t('tileLabel') : 'المربع رقم';
    if (this.dom.modalDiffTag) {
      this.dom.modalDiffTag.textContent = diffNames[this.activeDifficulty || 1];
      this.dom.modalDiffTag.className = `altar-diff-tag level-${this.activeDifficulty || 1}`;
    }
    this.dom.modalTileIndicator.textContent = `${tileTxt} (${(this.activeTileIndex || 0) + 1})`;

    this.dom.questionText.innerHTML = window.i18n
      ? window.i18n.formatField(this.activeQuestion.question)
      : this.activeQuestion.question.ar;

    const optionBadges = ['1', '2', '3', '4'];

    this.dom.optionsGrid.innerHTML = '';

    if (this.activeShuffledOptions) {
      this.activeShuffledOptions.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'altar-option-btn';
        btn.dataset.isCorrect = String(opt.isCorrect);

        const localizedOption = window.i18n ? window.i18n.formatField({ ar: opt.ar, en: opt.en }) : opt.ar;
        btn.innerHTML = `
          <div class="option-text-wrapper">${localizedOption}</div>
          <span class="altar-seal-badge">${optionBadges[idx]}</span>
        `;

        if (this.pendingOutcome) {
          btn.style.pointerEvents = 'none';
          if (opt.isCorrect) btn.classList.add(this.pendingOutcome.isCorrect ? 'selected-correct' : 'show-correct');
        } else {
          btn.addEventListener('click', () => this.handleOptionSelection(btn, opt.isCorrect));
        }

        this.dom.optionsGrid.appendChild(btn);
      });
    }

    // If revelation card is active, re-render its content
    if (this.pendingOutcome && this.dom.answerRevelationCard) {
      this.renderRevelationContent(this.pendingOutcome.isCorrect);
    }
  }

  handleOptionSelection(selectedBtn, isCorrect) {
    this.stopTimer();

    const allButtons = this.dom.optionsGrid.querySelectorAll('.altar-option-btn');
    allButtons.forEach(btn => btn.style.pointerEvents = 'none');

    // Save outcome for manual return
    this.pendingOutcome = { isCorrect, tileIndex: this.activeTileIndex };

    if (isCorrect) {
      selectedBtn.classList.add('selected-correct');
      if (window.soundEngine) window.soundEngine.playCorrect();
    } else {
      selectedBtn.classList.add('selected-incorrect');
      if (window.soundEngine) window.soundEngine.playIncorrect();

      // Highlight the correct option
      allButtons.forEach(btn => {
        if (btn.dataset.isCorrect === 'true') {
          btn.classList.add('show-correct');
        }
      });
    }

    this.renderRevelationContent(isCorrect);

    // Display Revelation Card (NO AUTOMATIC DISMISSAL!)
    if (this.dom.answerRevelationCard) {
      this.dom.answerRevelationCard.classList.add('active');
      try {
        if (typeof this.dom.answerRevelationCard.scrollIntoView === 'function') {
          this.dom.answerRevelationCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      } catch (e) {
        // Safe fallback for mock environments
      }
    }
  }

  renderRevelationContent(isCorrect) {
    if (this.dom.revelationStatus) {
      this.dom.revelationStatus.className = `revelation-status-badge ${isCorrect ? 'correct' : 'incorrect'}`;
      this.dom.revelationStatus.textContent = isCorrect
        ? (window.i18n ? window.i18n.t('correctStatus') : '✦ إجابة صحيحة! أحسنت ✦')
        : (window.i18n ? window.i18n.t('incorrectStatus') : '✕ إجابة غير صحيحة! ✕');
    }

    const cIdx = this.activeQuestion.correctIndex;
    const correctOpt = {
      ar: this.activeQuestion.options.ar[cIdx],
      en: this.activeQuestion.options.en[cIdx]
    };

    if (this.dom.revelationCorrectAnswer) {
      this.dom.revelationCorrectAnswer.innerHTML = window.i18n
        ? window.i18n.formatField(correctOpt)
        : correctOpt.ar;
    }
    if (this.dom.revelationVerse) {
      this.dom.revelationVerse.innerHTML = window.i18n
        ? window.i18n.formatVerse(this.activeQuestion.verse)
        : `«${this.activeQuestion.verse.ar || this.activeQuestion.verse}»`;
    }
    if (this.dom.revelationReference) {
      const refLabel = window.i18n ? window.i18n.t('referenceLabel') : 'الشاهد:';
      const refFormatted = window.i18n
        ? window.i18n.formatReference(this.activeQuestion.reference)
        : (this.activeQuestion.reference.ar || this.activeQuestion.reference);
      this.dom.revelationReference.innerHTML = `<span class="ref-label-tag">${refLabel}</span> <span class="ref-value-tag">${refFormatted}</span>`;
    }
  }

  // Manual return to picture board when user clicks "متابعة إلى لوحة الصورة"
  applyOutcomeAndReturnToBoard() {
    if (!this.pendingOutcome) return;
    const { isCorrect, tileIndex } = this.pendingOutcome;

    // Close fullscreen question screen
    if (this.dom.questionScreen) this.dom.questionScreen.classList.remove('active');
    if (this.dom.answerRevelationCard) this.dom.answerRevelationCard.classList.remove('active');

    const tileElem = this.dom.gridLayer.querySelector(`[data-index="${tileIndex}"]`);
    if (isCorrect) {
      this.tileStates[tileIndex] = 'revealed';
      if (tileElem) {
        tileElem.classList.remove('covered');
        tileElem.classList.add('revealed');
      }
      if (window.soundEngine) window.soundEngine.playReveal();
    } else {
      this.tileStates[tileIndex] = 'failed';
      if (tileElem) {
        tileElem.classList.remove('covered');
        tileElem.classList.add('failed');
      }
    }

    this.pendingOutcome = null;
  }

  closeQuestionAltar() {
    this.stopTimer();
    if (this.pendingOutcome) {
      this.applyOutcomeAndReturnToBoard();
      return;
    }
    if (this.dom.questionScreen) this.dom.questionScreen.classList.remove('active');
    if (this.dom.answerRevelationCard) this.dom.answerRevelationCard.classList.remove('active');
  }

  /* ==========================================================================
     REVEAL FULL IMAGE & WIN STATE
     ========================================================================== */
  revealFullImage() {
    if (this.isFullRevealed) return;
    this.isFullRevealed = true;
    this.stopTimer();
    if (this.dom.questionScreen) this.dom.questionScreen.classList.remove('active');
    if (this.dom.answerRevelationCard) this.dom.answerRevelationCard.classList.remove('active');

    const allTiles = this.dom.gridLayer.querySelectorAll('.tile');
    allTiles.forEach((tile, idx) => {
      this.tileStates[idx] = 'revealed';
      tile.classList.remove('covered', 'failed');
      tile.classList.add('revealed');
    });

    if (window.soundEngine) window.soundEngine.playWinFanfare();
    if (window.confettiEngine) window.confettiEngine.burst(200);

    this.renderWinContent();

    setTimeout(() => {
      this.dom.winOverlay.classList.add('active');
    }, 450);
  }

  renderWinContent() {
    if (!this.currentImage) return;

    if (this.dom.winTitle) {
      this.dom.winTitle.innerHTML = window.i18n ? window.i18n.formatField(this.currentImage.correct_answer) : this.currentImage.correct_answer.ar;
    }
    if (this.dom.winRef) {
      this.dom.winRef.innerHTML = window.i18n ? window.i18n.formatReference(this.currentImage.reference) : this.currentImage.reference.ar;
    }
    if (this.dom.winVerse) {
      this.dom.winVerse.innerHTML = window.i18n ? window.i18n.formatVerse(this.currentImage.verse_text) : `«${this.currentImage.verse_text.ar}»`;
    }

    // Synchronize image preview with the revealed board image or canvas
    if (this.dom.winImagePreview) {
      const bgImg = this.dom.bgImage;
      const canvas = this.dom.fallbackCanvas;

      if (bgImg && bgImg.style.display !== 'none' && bgImg.src) {
        this.dom.winImagePreview.src = bgImg.src;
        this.dom.winImagePreview.style.display = 'block';
        if (this.dom.winFallbackCanvas) this.dom.winFallbackCanvas.style.display = 'none';
      } else if (canvas && canvas.style.display !== 'none') {
        if (this.dom.winFallbackCanvas) {
          const wCtx = this.dom.winFallbackCanvas.getContext('2d');
          this.dom.winFallbackCanvas.width = canvas.width;
          this.dom.winFallbackCanvas.height = canvas.height;
          wCtx.drawImage(canvas, 0, 0);
          this.dom.winFallbackCanvas.style.display = 'block';
        }
        this.dom.winImagePreview.style.display = 'none';
      } else {
        this.dom.winImagePreview.src = this.currentImage.image_url;
        this.dom.winImagePreview.style.display = 'block';
        if (this.dom.winFallbackCanvas) this.dom.winFallbackCanvas.style.display = 'none';
      }
    }
  }

  minimizeWinCardToBoard() {
    if (window.soundEngine) window.soundEngine.playClick();
    if (this.dom.winOverlay) this.dom.winOverlay.classList.remove('active');
    if (this.dom.btnRestoreWinCard) this.dom.btnRestoreWinCard.classList.add('active');
  }

  restoreWinCard() {
    if (window.soundEngine) window.soundEngine.playClick();
    if (this.dom.btnRestoreWinCard) this.dom.btnRestoreWinCard.classList.remove('active');
    if (this.dom.winOverlay) this.dom.winOverlay.classList.add('active');
  }

  /* ==========================================================================
     KEYBOARD NAVIGATION
     ========================================================================== */
  handleKeyboard(e) {
    // Ignore global shortcuts when user is interacting with form controls or sliders
    const activeEl = document.activeElement;
    if (activeEl) {
      const tag = activeEl.tagName ? activeEl.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'select' || tag === 'textarea') {
        if (e.key === 'Escape') activeEl.blur();
        return;
      }
    }

    // If Welcome Screen is active, Space or Enter starts game
    if (this.dom.welcomeScreen && this.dom.welcomeScreen.classList.contains('active')) {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    // If Question Screen is active:
    if (this.dom.questionScreen && this.dom.questionScreen.classList.contains('active')) {
      // If Revelation Card is showing, Enter or Space proceeds back to board
      if (this.dom.answerRevelationCard && this.dom.answerRevelationCard.classList.contains('active')) {
        if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          this.applyOutcomeAndReturnToBoard();
          return;
        }
      }

      const optionKeys = { '1': 0, '2': 1, '3': 2, '4': 3, 'KeyA': 0, 'KeyB': 1, 'KeyC': 2, 'KeyD': 3 };
      const idx = optionKeys[e.key] !== undefined ? optionKeys[e.key] : optionKeys[e.code];

      if (idx !== undefined && (!this.dom.answerRevelationCard || !this.dom.answerRevelationCard.classList.contains('active'))) {
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
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'n' || e.key === 'N' || e.key === 'ى') {
        e.preventDefault();
        this.loadNextImage();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.minimizeWinCardToBoard();
        return;
      }
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
    if (!window.soundEngine) return;
    const isMuted = window.soundEngine.isMuted();
    const mutedIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
    const soundIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
    const titleText = isMuted ? (window.i18n ? window.i18n.t('unmute') : "تشغيل الصوت") : (window.i18n ? window.i18n.t('mute') : "كتم الصوت");

    if (this.dom.btnAudio) {
      this.dom.btnAudio.innerHTML = isMuted ? mutedIcon : soundIcon;
      this.dom.btnAudio.title = titleText;
    }
    if (this.dom.welcomeAudioToggle) {
      this.dom.welcomeAudioToggle.innerHTML = isMuted ? mutedIcon : soundIcon;
      this.dom.welcomeAudioToggle.title = titleText;
    }
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
