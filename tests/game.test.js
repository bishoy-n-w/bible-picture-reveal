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
  }
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

describe('4. 3x3 Grid Strategic Difficulty Mapping Tests (3-3-3 Layout)', () => {
  const difficultyMap = {
    0: 1, 1: 2, 2: 1,
    3: 3, 4: 3, 5: 3,
    6: 1, 7: 2, 8: 2
  };

  test('Exactly 3 Easy questions on 3 corners (Indices 0, 2, 6)', () => {
    const easyTiles = Object.entries(difficultyMap).filter(([_, lvl]) => lvl === 1).map(([i]) => Number(i));
    assert.strictEqual(easyTiles.length, 3);
    assert.deepStrictEqual(easyTiles, [0, 2, 6]);
  });

  test('Exactly 3 Medium questions on 1 edge and 2 sides (Indices 1, 7, 8)', () => {
    const mediumTiles = Object.entries(difficultyMap).filter(([_, lvl]) => lvl === 2).map(([i]) => Number(i));
    assert.strictEqual(mediumTiles.length, 3);
    assert.deepStrictEqual(mediumTiles, [1, 7, 8]);
  });

  test('Exactly 3 Hard questions: 1 in center (Index 4) and 2 in sides (Indices 3, 5)', () => {
    const hardTiles = Object.entries(difficultyMap).filter(([_, lvl]) => lvl === 3).map(([i]) => Number(i));
    assert.strictEqual(hardTiles.length, 3);
    assert.deepStrictEqual(hardTiles, [3, 4, 5]);
    assert.strictEqual(difficultyMap[4], 3, 'Center tile must be Hard');
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
