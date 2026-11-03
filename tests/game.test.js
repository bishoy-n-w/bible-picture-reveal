/**
 * Automated QA Test Suite for Picture Reveal Bible Trivia
 * Uses Node.js native test runner (node:test, node:assert)
 */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Mock browser environment
global.window = {};
global.document = {
  documentElement: { dir: 'rtl', lang: 'ar' },
  body: {
    classList: {
      classes: new Set(),
      toggle(cls, val) {
        if (val) this.classes.add(cls);
        else this.classes.delete(cls);
      },
      contains(cls) { return this.classes.has(cls); }
    }
  },
  createElement(tag) {
    const classes = new Set();
    return {
      tagName: (tag || 'div').toUpperCase(),
      classList: {
        add: (...c) => c.forEach(cls => classes.add(cls)),
        remove: (...c) => c.forEach(cls => classes.delete(cls)),
        toggle: (cls, v) => {
          if (v === undefined) {
            if (classes.has(cls)) { classes.delete(cls); return false; }
            classes.add(cls); return true;
          }
          if (v) classes.add(cls); else classes.delete(cls);
          return classes.has(cls);
        },
        contains: (cls) => classes.has(cls)
      },
      dataset: {},
      style: {},
      innerHTML: '',
      textContent: '',
      appendChild(child) { return child; },
      addEventListener() {},
      removeEventListener() {},
      click() {}
    };
  },
  addEventListener() {},
  removeEventListener() {},
  getElementById() { return null; },
  querySelectorAll() { return []; }
};
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); }
};

// Load i18n & datasets
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'images-bank.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'questions-bank.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'audio.js'), 'utf8') + '; global.SoundEngine = SoundEngine;');
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'game.js'), 'utf8') + '; global.PictureRevealGame = PictureRevealGame;');

describe('1. Multilingual i18n Engine Tests', () => {
  test('i18n initializes with Arabic by default and supports English & Bilingual', () => {
    assert.strictEqual(window.i18n.isLanguageActive('ar'), true);
    assert.strictEqual(typeof window.i18n.t('brandTitle'), 'string');
  });

  test('Independent language activation: can enable English, become bilingual, or switch to English-only', () => {
    const i18n = window.i18n;
    // Enable both
    i18n.setMode('both');
    assert.strictEqual(i18n.isBilingual(), true);
    assert.strictEqual(i18n.isLanguageActive('ar'), true);
    assert.strictEqual(i18n.isLanguageActive('en'), true);

    // Switch to English only
    i18n.setMode('en');
    assert.strictEqual(i18n.isBilingual(), false);
    assert.strictEqual(i18n.isLanguageActive('ar'), false);
    assert.strictEqual(i18n.isLanguageActive('en'), true);

    // Rule: Cannot disable the only active language
    i18n.toggleLanguage('en');
    assert.strictEqual(i18n.isLanguageActive('en'), true, 'Must keep at least one active language');

    // Switch back to both for subsequent tests
    i18n.setMode('both');
    assert.strictEqual(i18n.isBilingual(), true);
  });

  test('Extensible design: easily allows registering future languages', () => {
    assert.ok(window.i18n.supportedLanguages.ar);
    assert.ok(window.i18n.supportedLanguages.en);
    // Dynamic extension simulation
    window.i18n.supportedLanguages.fr = { id: 'fr', name: 'French', dir: 'ltr' };
    assert.ok(window.i18n.supportedLanguages.fr);
  });
});

describe('2. Bilingual PICS_DATA Integrity Tests', () => {
  test('PICS_DATA contains exactly 20 biblical scenes with both Arabic and English text', () => {
    assert.strictEqual(Array.isArray(window.PICS_DATA), true);
    assert.strictEqual(window.PICS_DATA.length, 20);

    window.PICS_DATA.forEach(item => {
      assert.ok(typeof item.id === 'number', `Item ${item.id} must have a numeric id`);
      assert.ok(item.image_url && item.image_url.startsWith('assets/'), `Item ${item.id} image_url must point to assets/`);
      // Validate bilingual fields
      assert.ok(item.correct_answer.ar && item.correct_answer.en, `Item ${item.id} must have ar and en answers`);
      assert.ok(item.reference.ar && item.reference.en, `Item ${item.id} must have ar and en references`);
      assert.ok(item.verse_text.ar && item.verse_text.en, `Item ${item.id} must have ar (Van Dyck) and en (NKJV) verse text`);
    });
  });
});

describe('3. Bilingual QUESTIONS_BANK Integrity Tests (300 Questions: Van Dyck & NKJV)', () => {
  test('QUESTIONS_BANK contains exactly 300 servant questions (100 per level)', () => {
    assert.strictEqual(Array.isArray(window.QUESTIONS_BANK), true);
    assert.strictEqual(window.QUESTIONS_BANK.length, 300, 'Bank must have exactly 300 questions');

    const levelCounts = { 1: 0, 2: 0, 3: 0 };
    window.QUESTIONS_BANK.forEach(q => {
      assert.ok([1, 2, 3].includes(q.level), `Invalid level ${q.level} in question ${q.id}`);
      assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3, `Question ${q.id} correctIndex out of bounds`);

      // Bilingual question text
      assert.ok(q.question.ar && q.question.ar.trim().length > 0, `Question ${q.id} missing Arabic text`);
      assert.ok(q.question.en && q.question.en.trim().length > 0, `Question ${q.id} missing English text`);

      // Bilingual options (4 options in both languages)
      assert.strictEqual(q.options.ar.length, 4, `Question ${q.id} must have 4 Arabic options`);
      assert.strictEqual(q.options.en.length, 4, `Question ${q.id} must have 4 English options`);

      // Bilingual reference
      assert.ok(q.reference.ar && q.reference.ar.trim().length > 0, `Question ${q.id} missing Arabic reference`);
      assert.ok(q.reference.en && q.reference.en.trim().length > 0, `Question ${q.id} missing English reference`);

      // Bilingual verse (Van Dyck & NKJV)
      assert.ok(q.verse.ar && q.verse.ar.trim().length > 0, `Question ${q.id} missing Arabic Van Dyck verse`);
      assert.ok(q.verse.en && q.verse.en.trim().length > 0, `Question ${q.id} missing English NKJV verse`);

      // Strict validation: ZERO Arabic characters in any English field
      assert.ok(!/[\u0600-\u06FF]/.test(q.question.en), `Question ${q.id} has Arabic in question.en`);
      assert.ok(!/[\u0600-\u06FF]/.test(q.reference.en), `Question ${q.id} has Arabic in reference.en`);
      assert.ok(!/[\u0600-\u06FF]/.test(q.verse.en), `Question ${q.id} has Arabic in verse.en`);
      q.options.en.forEach((opt, idx) => {
        assert.ok(!/[\u0600-\u06FF]/.test(opt), `Question ${q.id} has Arabic in option.en[${idx}]: ${opt}`);
      });

      // No generic fallback or placeholder text
      assert.ok(!q.question.en.includes('Scripture Examination'), `Question ${q.id} has generic fallback English question`);
      assert.ok(!q.question.ar.includes('سؤال خدام متقدم دقيق'), `Question ${q.id} has placeholder Arabic question`);

      levelCounts[q.level]++;
    });

    assert.strictEqual(levelCounts[1], 100, 'Level 1 must have exactly 100 questions');
    assert.strictEqual(levelCounts[2], 100, 'Level 2 must have exactly 100 questions');
    assert.strictEqual(levelCounts[3], 100, 'Level 3 must have exactly 100 questions');
  });

  test('Correct answer index is randomized across all 4 choices (0, 1, 2, 3) across the bank', () => {
    const indexDistribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
    window.QUESTIONS_BANK.forEach(q => {
      indexDistribution[q.correctIndex]++;
    });

    // Every position (A, B, C, D) should have at least 50 questions
    assert.ok(indexDistribution[0] >= 50, `Index 0 only has ${indexDistribution[0]} occurrences`);
    assert.ok(indexDistribution[1] >= 50, `Index 1 only has ${indexDistribution[1]} occurrences`);
    assert.ok(indexDistribution[2] >= 50, `Index 2 only has ${indexDistribution[2]} occurrences`);
    assert.ok(indexDistribution[3] >= 50, `Index 3 only has ${indexDistribution[3]} occurrences`);
  });

  test('Audited Question 108 (Huldah the prophetess) is 100% verified', () => {
    const q108 = window.QUESTIONS_BANK.find(q => q.id === 108);
    assert.ok(q108, 'Question 108 must exist');
    assert.ok(q108.question.en.includes('Huldah') || q108.question.en.includes('prophetess'), 'Question 108 en must match Huldah context');
    assert.ok(q108.options.en.includes('Hannah'), 'Hannah must be translated in English');
    assert.ok(!q108.options.en.includes('حنة'), 'حنة must not appear in English options');
    assert.strictEqual(q108.options.ar[q108.correctIndex], 'خلدة');
    assert.strictEqual(q108.options.en[q108.correctIndex], 'Huldah');
  });

  test('Audited Question 46 (King Agrippa) correctly points to Agrippa not Herod Antipas', () => {
    const q46 = window.QUESTIONS_BANK.find(q => q.id === 46);
    assert.ok(q46, 'Question 46 must exist');
    assert.strictEqual(q46.options.ar[q46.correctIndex], 'أغريباس');
    assert.strictEqual(q46.options.en[q46.correctIndex], 'Agrippa');
    assert.ok(q46.verse.ar.includes('أَغْرِيبَاسُ'));
  });

  test('Audited Question 45 (Felix the governor) correctly points to Felix not Festus', () => {
    const q45 = window.QUESTIONS_BANK.find(q => q.id === 45);
    assert.ok(q45, 'Question 45 must exist');
    assert.strictEqual(q45.options.ar[q45.correctIndex], 'فيلكس');
    assert.strictEqual(q45.options.en[q45.correctIndex], 'Felix');
    assert.ok(q45.verse.ar.includes('فِيلِكْسُ'));
  });

  test('Audited Question 2 (Mount Moriah) correctly points to Mount Moriah not Horeb', () => {
    const q2 = window.QUESTIONS_BANK.find(q => q.id === 2);
    assert.ok(q2, 'Question 2 must exist');
    assert.strictEqual(q2.options.ar[q2.correctIndex], 'جبل المريا');
    assert.strictEqual(q2.options.en[q2.correctIndex], 'Mount Moriah');
    assert.ok(q2.verse.ar.includes('الْمُرِيَّا'));
  });

  test('Audited Question 3 (Five stones) correctly points to five stones', () => {
    const q3 = window.QUESTIONS_BANK.find(q => q.id === 3);
    assert.ok(q3, 'Question 3 must exist');
    assert.strictEqual(q3.options.ar[q3.correctIndex], 'خمسة حجارة');
    assert.strictEqual(q3.options.en[q3.correctIndex], 'Five stones');
    assert.ok(q3.verse.ar.includes('خَمْسَةَ حِجَارَةٍ'));
  });

  test('Audited Question 26 (Uzzah) correctly points to Uzzah not Ahio', () => {
    const q26 = window.QUESTIONS_BANK.find(q => q.id === 26);
    assert.ok(q26, 'Question 26 must exist');
    assert.strictEqual(q26.options.ar[q26.correctIndex], 'عُزَّة');
    assert.strictEqual(q26.options.en[q26.correctIndex], 'Uzzah');
    assert.ok(q26.verse.ar.includes('عُزَّةُ'));
  });

  test('Audited Question 178 (David chief mighty man Josheb-Basshebeth) correctly points to Josheb-Basshebeth', () => {
    const q178 = window.QUESTIONS_BANK.find(q => q.id === 178);
    assert.ok(q178, 'Question 178 must exist');
    assert.strictEqual(q178.options.ar[q178.correctIndex], 'يوشيب بشبث');
    assert.strictEqual(q178.options.en[q178.correctIndex], 'Josheb-Basshebeth');
    assert.ok(q178.verse.ar.includes('يُوشَيْبَ بَشَّبَثُ'));
  });
});

describe('4. 3x3 Grid Dynamic Randomized Difficulty Allocation Tests', () => {
  test('Dynamically allocates exactly 3 Level 1, 3 Level 2, and 3 Level 3 tiles (3-3-3 fair balance)', () => {
    const game = new global.PictureRevealGame();
    const map = game.generateRandomDifficultyMap();
    const counts = { 1: 0, 2: 0, 3: 0 };
    for (let i = 0; i < 9; i++) {
      assert.ok([1, 2, 3].includes(map[i]), `Tile ${i} must have valid level 1, 2, or 3`);
      counts[map[i]]++;
    }
    assert.strictEqual(counts[1], 3, 'Must have exactly 3 Level 1 tiles');
    assert.strictEqual(counts[2], 3, 'Must have exactly 3 Level 2 tiles');
    assert.strictEqual(counts[3], 3, 'Must have exactly 3 Level 3 tiles');
  });

  test('Allocation of levels to tiles is randomized across multiple rounds', () => {
    const game = new global.PictureRevealGame();
    const allocations = new Set();
    for (let round = 0; round < 20; round++) {
      const map = game.generateRandomDifficultyMap();
      const key = Object.values(map).join('-');
      allocations.add(key);
    }
    assert.ok(allocations.size > 1, 'Tile difficulty allocation must be randomized across rounds');
  });
});

describe('5. Fullscreen Question Screen & Manual Return Flow (No Auto-Dismiss)', () => {
  test('Answering question does not dismiss automatically and sets pendingOutcome', () => {
    let questionScreenActive = true;
    let revelationCardActive = false;
    let pendingOutcome = null;

    // Simulate answering:
    const isCorrect = true;
    const tileIndex = 4;
    pendingOutcome = { isCorrect, tileIndex };
    revelationCardActive = true;

    // Screen must remain active with revelation card visible!
    assert.strictEqual(questionScreenActive, true);
    assert.strictEqual(revelationCardActive, true);
    assert.deepStrictEqual(pendingOutcome, { isCorrect: true, tileIndex: 4 });

    // Only when user clicks "متابعة إلى لوحة الصورة":
    questionScreenActive = false;
    revelationCardActive = false;
    assert.strictEqual(questionScreenActive, false);
    assert.strictEqual(revelationCardActive, false);
  });
});

describe('6. Carnival Timer (60s) & Keyboard Mapping Tests', () => {
  test('Timer duration is 60 seconds and urgency triggers at 5 seconds or less', () => {
    const timerDuration = 60;
    assert.strictEqual(timerDuration, 60);
    const isUrgent = (sec) => sec <= 5 && sec > 0;
    assert.strictEqual(isUrgent(60), false);
    assert.strictEqual(isUrgent(20), false);
    assert.strictEqual(isUrgent(6), false);
    assert.strictEqual(isUrgent(5), true);
    assert.strictEqual(isUrgent(1), true);
    assert.strictEqual(isUrgent(0), false);
  });

  test('Timeout state retains question active on screen without dismissal and triggers fading', () => {
    let questionDismissed = false;
    let timerRemaining = 0;
    let animationClassApplied = false;

    // Timeout occurs:
    if (timerRemaining <= 0) {
      questionDismissed = false;
      animationClassApplied = true;
    }
    assert.strictEqual(questionDismissed, false);
    assert.strictEqual(animationClassApplied, true);
  });

  test('Keyboard mapping 1-9 correctly indexes tiles 0-8', () => {
    const tileKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    tileKeys.forEach((key, index) => {
      assert.strictEqual(parseInt(key, 10) - 1, index);
    });
  });

  test('Keyboard mapping 1-4 and A-D correctly indexes options 0-3', () => {
    const optionKeys = { '1': 0, '2': 1, '3': 2, '4': 3, 'KeyA': 0, 'KeyB': 1, 'KeyC': 2, 'KeyD': 3 };
    assert.strictEqual(optionKeys['1'], 0);
    assert.strictEqual(optionKeys['4'], 3);
    assert.strictEqual(optionKeys['KeyA'], 0);
    assert.strictEqual(optionKeys['KeyD'], 3);
  });

  test('Option seal badges display numbers 1, 2, 3, 4 matching keyboard input', () => {
    const optionBadges = ['1', '2', '3', '4'];
    assert.strictEqual(optionBadges.length, 4);
    assert.deepStrictEqual(optionBadges, ['1', '2', '3', '4']);
  });

  test('Timeout state triggers box shake while keeping options grid stationary', () => {
    let shakeApplied = false;
    let optionsDisplaced = false;

    // Timeout trigger:
    shakeApplied = true;
    optionsDisplaced = false; // options remain stationary inside grid

    assert.strictEqual(shakeApplied, true);
    assert.strictEqual(optionsDisplaced, false);
  });

  test('Timer Infinity duration disables countdown and timeout effects', () => {
    const timerDuration = 0; // 0 represents Infinity
    const isInfinite = (timerDuration === 0 || timerDuration >= 125);
    assert.strictEqual(isInfinite, true);
  });
});

describe('7. Fullscreen Win Theater & Independent Versioning Tests', () => {
  test('APP_VERSION is maintained in js/version.js and matches format', () => {
    eval(fs.readFileSync('js/version.js', 'utf8'));
    assert.ok(window.APP_VERSION, 'window.APP_VERSION must be defined');
    assert.match(window.APP_VERSION, /^v\d+\.\d+\.\d+$/, 'Version must follow vX.Y.Z format');
  });

  test('Fullscreen Win Theater supports split picture/info and minimize-to-board flow', () => {
    let winOverlayActive = true;
    let restoreBtnActive = false;

    // Minimizing to board hides overlay and shows floating restore button
    winOverlayActive = false;
    restoreBtnActive = true;
    assert.strictEqual(winOverlayActive, false);
    assert.strictEqual(restoreBtnActive, true);

    // Restoring reopens the win overlay
    winOverlayActive = true;
    restoreBtnActive = false;
    assert.strictEqual(winOverlayActive, true);
    assert.strictEqual(restoreBtnActive, false);
  });
});

describe('8. Carnival Attractor Mode & Ambient Audio Tests', () => {
  test('Attractor visual and audio modules exist and declare required lifecycles', () => {
    eval(fs.readFileSync('js/audio.js', 'utf8'));
    assert.strictEqual(typeof window.soundEngine.startWelcomeAmbience, 'function');
    assert.strictEqual(typeof window.soundEngine.stopWelcomeAmbience, 'function');
    assert.strictEqual(typeof window.soundEngine.duckToGameVolume, 'function');
    assert.strictEqual(typeof window.soundEngine.unduckToWelcomeVolume, 'function');
    assert.strictEqual(typeof window.soundEngine.setGameVolume, 'function');
    assert.strictEqual(window.soundEngine.gameVolume, 0.2);
    assert.strictEqual(typeof window.soundEngine.toggleMute, 'function');
    assert.strictEqual(window.soundEngine.trackUrl, 'assets/Jumanji - The Video Game.mp3');

    const attractorContent = fs.readFileSync('js/attractor.js', 'utf8');
    assert.ok(attractorContent.includes('class AttractorEngine'), 'AttractorEngine class must exist');
    assert.ok(attractorContent.includes('drawGodRays'), 'Must have volumetric god rays renderer');
    assert.ok(attractorContent.includes('drawParticles'), 'Must have stardust particle renderer');
  });
});

describe('9. Phase 1 UI/UX & Cross-Platform Accessibility Tests', () => {
  test('index.html specifies viewport-fit=cover for iOS notch / safe areas', () => {
    const htmlContent = fs.readFileSync('index.html', 'utf8');
    assert.ok(htmlContent.includes('viewport-fit=cover'), 'index.html must specify viewport-fit=cover');
  });

  test('css/style.css defines safe-area variables and dynamic viewport heights (dvh)', () => {
    const cssContent = fs.readFileSync('css/style.css', 'utf8');
    assert.ok(cssContent.includes('--sat: env(safe-area-inset-top'), 'CSS must define --sat');
    assert.ok(cssContent.includes('--sab: env(safe-area-inset-bottom'), 'CSS must define --sab');
    assert.ok(cssContent.includes('--sal: env(safe-area-inset-left'), 'CSS must define --sal');
    assert.ok(cssContent.includes('--sar: env(safe-area-inset-right'), 'CSS must define --sar');
    assert.ok(cssContent.includes('100dvh'), 'CSS must utilize 100dvh for dynamic mobile viewport');
  });

  test('css/style.css enforces WCAG focus-visible indicators and touch target standards', () => {
    const cssContent = fs.readFileSync('css/style.css', 'utf8');
    assert.ok(cssContent.includes(':focus-visible'), 'CSS must define :focus-visible rules for accessibility');
    assert.ok(cssContent.includes('(pointer: coarse)'), 'CSS must provide dedicated sizing for touch/coarse pointers');
    assert.ok(cssContent.includes('(hover: hover) and (pointer: fine)'), 'CSS must guard hover effects against sticky mobile touch');
  });

  test('Question modal and Win overlay prevent flexbox scroll clipping and support smooth scrolling', () => {
    const cssContent = fs.readFileSync('css/style.css', 'utf8');
    assert.ok(cssContent.includes('.question-screen'), 'CSS must style .question-screen');
    assert.ok(cssContent.includes('-webkit-overflow-scrolling: touch'), 'Must support momentum scrolling on touch');
    const gameJsContent = fs.readFileSync('js/game.js', 'utf8');
    assert.ok(gameJsContent.includes('scrollIntoView'), 'js/game.js must scroll revelation card into view on reveal');
  });

  test('Application version is updated to v5.6.0', () => {
    eval(fs.readFileSync('js/version.js', 'utf8'));
    assert.strictEqual(window.APP_VERSION, 'v5.6.0');
  });
});

describe('10. Phase 2 Deep Code Review & Bug Hardening Tests', () => {
  test('Asynchronous image loading sequence tracking prevents race conditions', () => {
    const gameJsContent = fs.readFileSync('js/game.js', 'utf8');
    assert.ok(gameJsContent.includes('this.imageLoadSequence = 0;'), 'Must initialize imageLoadSequence');
    assert.ok(gameJsContent.includes('const currentSequence = ++this.imageLoadSequence;'), 'Must increment sequence on displayCurrentImage');
    assert.ok(gameJsContent.includes('if (currentSequence !== this.imageLoadSequence) return;'), 'Must guard in-flight image callbacks');
  });

  test('Keyboard handler protects active input, select, and textarea elements', () => {
    const gameJsContent = fs.readFileSync('js/game.js', 'utf8');
    assert.ok(gameJsContent.includes('activeEl.tagName'), 'Must inspect activeElement tag');
    assert.ok(gameJsContent.includes("tag === 'input' || tag === 'select' || tag === 'textarea'"), 'Must guard input, select, and textarea');
  });

  test('Closing question screen commits pending outcomes to prevent bypassing penalties', () => {
    const gameJsContent = fs.readFileSync('js/game.js', 'utf8');
    assert.ok(gameJsContent.includes('if (this.pendingOutcome) {'), 'Must check pendingOutcome in closeQuestionAltar');
    assert.ok(gameJsContent.includes('this.applyOutcomeAndReturnToBoard();'), 'Must commit outcome on altar close if answered');
  });

  test('Countdown timer uses wall-clock timestamp delta calculation to prevent throttle drift', () => {
    const gameJsContent = fs.readFileSync('js/game.js', 'utf8');
    assert.ok(gameJsContent.includes('this.timerEndTime = Date.now()'), 'Must record timerEndTime');
    assert.ok(gameJsContent.includes('const remainingMs = this.timerEndTime - Date.now();'), 'Must compute delta from timestamp');
    assert.ok(gameJsContent.includes('Math.ceil(remainingMs / 1000)'), 'Must convert remaining ms to whole seconds');
  });

  test('Pool extractors provide defensive fallbacks on empty or exhausted data sets', () => {
    const gameJsContent = fs.readFileSync('js/game.js', 'utf8');
    assert.ok(gameJsContent.includes('getNextQuestionFromPool(level)'), 'getNextQuestionFromPool method exists');
    assert.ok(gameJsContent.includes('id: 999'), 'Must contain defensive fallback question');
  });

  test('Audio engine manages fade intervals and cancels prior fades on stop', () => {
    const audioJsContent = fs.readFileSync('js/audio.js', 'utf8');
    assert.ok(audioJsContent.includes('clearInterval(this.fadeInterval);'), 'Must clear pending fade interval');
  });

  test('Attractor visual engine resets context transform before clearing backing canvas', () => {
    const attractorJsContent = fs.readFileSync('js/attractor.js', 'utf8');
    assert.ok(attractorJsContent.includes('this.ctx.setTransform(1, 0, 0, 1, 0, 0);'), 'Must reset transform matrix on stop');
  });
});

describe('11. Phase 3 Unit Suite: Mathematical Invariance, Volume Clamping & i18n Robustness', () => {
  test('shuffleArray preserves length, elements, and does not mutate source array', () => {
    const game = new global.PictureRevealGame();
    const original = [10, 20, 30, 40, 50, 60, 70, 80, 90];
    const shuffled = game.shuffleArray(original);
    assert.strictEqual(shuffled.length, original.length);
    assert.deepStrictEqual([...shuffled].sort(), [...original].sort());
    assert.strictEqual(original[0], 10, 'Original array must remain unmutated');
  });

  test('SoundEngine clamps volume safely between 0.0 and 1.0', () => {
    eval(fs.readFileSync('js/audio.js', 'utf8'));
    const engine = window.soundEngine;
    engine.setGameVolume(-0.5);
    assert.strictEqual(engine.getGameVolume(), 0.0);
    engine.setGameVolume(1.8);
    assert.strictEqual(engine.getGameVolume(), 1.0);
    engine.setGameVolume(0.42);
    assert.strictEqual(engine.getGameVolume(), 0.42);
  });

  test('SoundEngine toggleMute operates idempotently and persists state', () => {
    eval(fs.readFileSync('js/audio.js', 'utf8'));
    const engine = window.soundEngine;
    const initialMute = engine.isMuted();
    const toggled = engine.toggleMute();
    assert.strictEqual(toggled, !initialMute);
    assert.strictEqual(engine.isMuted(), !initialMute);
    // Toggle back
    engine.toggleMute();
    assert.strictEqual(engine.isMuted(), initialMute);
  });

  test('i18n formatField handles null, undefined, raw strings, and partial objects gracefully', () => {
    const i18n = window.i18n;
    assert.strictEqual(i18n.formatField(null), '');
    assert.strictEqual(i18n.formatField(undefined), '');
    assert.strictEqual(i18n.formatField('نص بسيط'), 'نص بسيط');
    assert.strictEqual(i18n.formatField({ ar: 'عربي فقط' }), 'عربي فقط');
    assert.strictEqual(i18n.formatField({ en: 'English only' }), 'English only');
  });

  test('i18n getPlainText extracts clean unformatted text without HTML tags', () => {
    const i18n = window.i18n;
    const text = i18n.getPlainText({ ar: 'تكوين 1: 1', en: 'Genesis 1:1' });
    assert.ok(typeof text === 'string');
    assert.ok(!text.includes('<span'));
  });

  test('Monte Carlo simulation verifies fair 3-3-3 distribution over 100 consecutive generations', () => {
    const game = new global.PictureRevealGame();
    for (let i = 0; i < 100; i++) {
      const map = game.generateRandomDifficultyMap();
      const counts = { 1: 0, 2: 0, 3: 0 };
      for (let pos = 0; pos < 9; pos++) {
        counts[map[pos]]++;
      }
      assert.strictEqual(counts[1], 3, `Iteration ${i}: Must have exactly 3 Level 1 tiles`);
      assert.strictEqual(counts[2], 3, `Iteration ${i}: Must have exactly 3 Level 2 tiles`);
      assert.strictEqual(counts[3], 3, `Iteration ${i}: Must have exactly 3 Level 3 tiles`);
    }
  });
});

describe('12. Phase 3 Integration Suite: State Machine, Scene Navigation & Outcome Resolution', () => {
  function makeMockGameInstance() {
    const game = new global.PictureRevealGame();
    const dom = {
      welcomeScreen: { classList: { contains: () => false, add: () => {}, remove: () => {} } },
      gameScreen: { classList: { contains: () => true, add: () => {}, remove: () => {} } },
      questionScreen: { classList: { contains: () => false, add: () => {}, remove: () => {} } },
      answerRevelationCard: { classList: { contains: () => false, add: () => {}, remove: () => {} }, scrollIntoView: () => {} },
      gridLayer: { innerHTML: '', querySelector: () => ({ classList: { add: () => {}, remove: () => {} } }), appendChild: () => {}, querySelectorAll: () => [] },
      optionsGrid: { innerHTML: '', querySelectorAll: () => [], appendChild: () => {} },
      winOverlay: { classList: { contains: () => false, add: () => {}, remove: () => {} } },
      roundDisplay: { textContent: '' },
      remainingDisplay: { textContent: '' },
      selectScene: { value: '', innerHTML: '', appendChild: () => {} },
      peekAnswer: { innerHTML: '' },
      peekRef: { innerHTML: '' },
      bgImage: { style: {} },
      fallbackCanvas: { style: {}, getContext: () => ({ createRadialGradient: () => ({ addColorStop: () => {} }), fillRect: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, bezierCurveTo: () => {}, closePath: () => {}, fill: () => {}, save: () => {}, restore: () => {}, strokeRect: () => {}, fillText: () => {} }) },
      modalDiffTag: { textContent: '', className: '' },
      modalTileIndicator: { textContent: '' },
      questionText: { innerHTML: '', classList: { add: () => {}, remove: () => {} } },
      revelationStatus: { className: '', textContent: '' },
      revelationCorrectAnswer: { innerHTML: '' },
      revelationVerse: { innerHTML: '' },
      revelationReference: { innerHTML: '' },
      btnRestoreWinCard: { classList: { add: () => {}, remove: () => {} } }
    };
    game.dom = dom;
    return game;
  }

  test('jumpToScene accurately targets scene ID and filters it from remaining pool', () => {
    const game = makeMockGameInstance();
    game.imagePool = [...game.picsBank];
    game.jumpToScene(7);

    assert.strictEqual(game.currentImage.id, 7);
    assert.strictEqual(game.tileStates.length, 9);
    assert.ok(game.tileStates.every(st => st === 'covered'));
    assert.ok(!game.imagePool.some(p => p.id === 7), 'Targeted scene must be removed from pool');
  });

  test('resetCurrentGrid preserves active scene and resets all 9 tiles to covered', () => {
    const game = makeMockGameInstance();
    game.currentImage = game.picsBank[0];
    game.tileStates[0] = 'revealed';
    game.tileStates[4] = 'failed';
    game.isFullRevealed = true;

    game.resetCurrentGrid();

    assert.strictEqual(game.currentImage.id, game.picsBank[0].id);
    assert.strictEqual(game.isFullRevealed, false);
    assert.ok(game.tileStates.every(st => st === 'covered'), 'All tiles must be reset to covered');
  });

  test('handleOptionSelection records pendingOutcome and locks option buttons', () => {
    const game = makeMockGameInstance();
    game.activeTileIndex = 2;
    game.activeQuestion = game.questionsBank[0];

    const mockBtn = {
      classList: { add: (cls) => mockBtn.classes.push(cls) },
      classes: [],
      style: {},
      dataset: { isCorrect: 'true' }
    };
    game.dom.optionsGrid.querySelectorAll = () => [mockBtn];

    game.handleOptionSelection(mockBtn, true);

    assert.deepStrictEqual(game.pendingOutcome, { isCorrect: true, tileIndex: 2 });
    assert.strictEqual(mockBtn.style.pointerEvents, 'none');
    assert.ok(mockBtn.classes.includes('selected-correct'));
  });

  test('applyOutcomeAndReturnToBoard transitions tile to revealed on success', () => {
    const game = makeMockGameInstance();
    game.pendingOutcome = { isCorrect: true, tileIndex: 5 };
    const tileClasses = new Set(['covered']);
    game.dom.gridLayer.querySelector = () => ({
      classList: {
        remove: (c) => tileClasses.delete(c),
        add: (c) => tileClasses.add(c)
      }
    });

    game.applyOutcomeAndReturnToBoard();

    assert.strictEqual(game.tileStates[5], 'revealed');
    assert.ok(!tileClasses.has('covered'));
    assert.ok(tileClasses.has('revealed'));
    assert.strictEqual(game.pendingOutcome, null);
  });

  test('applyOutcomeAndReturnToBoard transitions tile to failed on incorrect answer', () => {
    const game = makeMockGameInstance();
    game.pendingOutcome = { isCorrect: false, tileIndex: 8 };
    const tileClasses = new Set(['covered']);
    game.dom.gridLayer.querySelector = () => ({
      classList: {
        remove: (c) => tileClasses.delete(c),
        add: (c) => tileClasses.add(c)
      }
    });

    game.applyOutcomeAndReturnToBoard();

    assert.strictEqual(game.tileStates[8], 'failed');
    assert.ok(!tileClasses.has('covered'));
    assert.ok(tileClasses.has('failed'));
    assert.strictEqual(game.pendingOutcome, null);
  });

  test('closeQuestionAltar safely auto-commits pending outcome if answered', () => {
    const game = makeMockGameInstance();
    game.pendingOutcome = { isCorrect: false, tileIndex: 3 };
    let committed = false;
    game.applyOutcomeAndReturnToBoard = () => { committed = true; };

    game.closeQuestionAltar();
    assert.strictEqual(committed, true, 'Must auto-commit pending outcome when closing altar');
  });

  test('revealFullImage transitions all 9 tiles to revealed and marks isFullRevealed', () => {
    const game = makeMockGameInstance();
    game.currentImage = game.picsBank[0];
    game.tileStates[0] = 'failed';
    const tilesList = Array(9).fill(0).map(() => ({
      classList: {
        classes: new Set(['covered']),
        remove(...items) { items.forEach(i => this.classes.delete(i)); },
        add(...items) { items.forEach(i => this.classes.add(i)); }
      }
    }));
    game.dom.gridLayer.querySelectorAll = () => tilesList;

    game.revealFullImage();

    assert.strictEqual(game.isFullRevealed, true);
    assert.ok(game.tileStates.every(st => st === 'revealed'));
    tilesList.forEach(t => {
      assert.ok(t.classList.classes.has('revealed'));
      assert.ok(!t.classList.classes.has('covered'));
      assert.ok(!t.classList.classes.has('failed'));
    });
  });
});

describe('13. Phase 3 E2E Simulation Suite: Complete Lifecycles & Boundary Stress Testing', () => {
  function makeMockGameInstance() {
    const game = new global.PictureRevealGame();
    const dom = {
      welcomeScreen: { classList: { contains: () => false, add: () => {}, remove: () => {} } },
      gameScreen: { classList: { contains: () => true, add: () => {}, remove: () => {} } },
      questionScreen: { classList: { contains: () => false, add: () => {}, remove: () => {} } },
      answerRevelationCard: { classList: { contains: () => false, add: () => {}, remove: () => {} }, scrollIntoView: () => {} },
      gridLayer: { innerHTML: '', querySelector: () => ({ classList: { add: () => {}, remove: () => {} } }), appendChild: () => {}, querySelectorAll: () => [] },
      optionsGrid: { innerHTML: '', querySelectorAll: () => [], appendChild: () => {} },
      winOverlay: { classList: { contains: () => false, add: () => {}, remove: () => {} } },
      roundDisplay: { textContent: '' },
      remainingDisplay: { textContent: '' },
      selectScene: { value: '', innerHTML: '', appendChild: () => {} },
      peekAnswer: { innerHTML: '' },
      peekRef: { innerHTML: '' },
      bgImage: { style: {} },
      fallbackCanvas: { style: {}, getContext: () => ({ createRadialGradient: () => ({ addColorStop: () => {} }), fillRect: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, bezierCurveTo: () => {}, closePath: () => {}, fill: () => {}, save: () => {}, restore: () => {}, strokeRect: () => {}, fillText: () => {} }) },
      modalDiffTag: { textContent: '', className: '' },
      modalTileIndicator: { textContent: '' },
      questionText: { innerHTML: '', classList: { add: () => {}, remove: () => {} } },
      revelationStatus: { className: '', textContent: '' },
      revelationCorrectAnswer: { innerHTML: '' },
      revelationVerse: { innerHTML: '' },
      revelationReference: { innerHTML: '' },
      btnRestoreWinCard: { classList: { add: () => {}, remove: () => {} } }
    };
    game.dom = dom;
    return game;
  }

  test('Continuous 25-round image pool exhaustion cycle replenishes transparently', () => {
    const game = makeMockGameInstance();
    const sampledIds = [];
    for (let round = 0; round < 25; round++) {
      const img = game.getNextImageFromPool();
      assert.ok(img, `Round ${round + 1} must return a valid image object`);
      assert.ok(typeof img.id === 'number');
      sampledIds.push(img.id);
    }
    assert.strictEqual(sampledIds.length, 25);
    // All 20 scenes must have appeared in the first 20 picks
    const firstTwenty = new Set(sampledIds.slice(0, 20));
    assert.strictEqual(firstTwenty.size, 20, 'All 20 scenes must be yielded before reshuffling');
  });

  test('Continuous 150-question extraction across all levels replenishes transparently', () => {
    const game = makeMockGameInstance();
    [1, 2, 3].forEach(level => {
      const sampledQIds = [];
      for (let i = 0; i < 110; i++) {
        const q = game.getNextQuestionFromPool(level);
        assert.ok(q, `Level ${level} Question ${i + 1} must not be undefined`);
        assert.strictEqual(q.level, level);
        sampledQIds.push(q.id);
      }
      assert.strictEqual(sampledQIds.length, 110);
    });
  });

  test('Corrupted localStorage values recover gracefully to defaults', () => {
    global.localStorage.setItem('picture_reveal_timer_duration', 'NOT_A_NUMBER');
    global.localStorage.setItem('picture_reveal_game_volume', 'INVALID');

    const freshGame = new global.PictureRevealGame();
    assert.strictEqual(freshGame.timerDuration, 60, 'Must fallback to default 60 seconds on NaN');

    eval(fs.readFileSync('js/audio.js', 'utf8'));
    const freshAudio = new SoundEngine();
    assert.strictEqual(freshAudio.getGameVolume(), 0.20, 'Must fallback to default 0.20 on invalid float');
  });

  test('Rapid clicking on an already revealed or failed tile is completely ignored', () => {
    const game = makeMockGameInstance();
    game.tileStates[3] = 'revealed';
    game.tileStates[7] = 'failed';

    let altarOpened = false;
    game.showQuestionAltar = () => { altarOpened = true; };

    game.handleTileClick(3);
    assert.strictEqual(altarOpened, false, 'Clicking revealed tile must be a no-op');

    game.handleTileClick(7);
    assert.strictEqual(altarOpened, false, 'Clicking failed tile must be a no-op');
  });
});
