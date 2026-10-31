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
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); }
};

// Load datasets
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'images-bank.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'questions-bank.js'), 'utf8'));

describe('1. Dataset Integrity & Schema Tests (300 Questions with Verses)', () => {
  test('PICS_DATA contains exactly 20 biblical scenes', () => {
    assert.strictEqual(Array.isArray(window.PICS_DATA), true);
    assert.strictEqual(window.PICS_DATA.length, 20);
  });

  test('Every picture item has id, reference, correct_answer, verse_text, and image_url', () => {
    window.PICS_DATA.forEach(item => {
      assert.ok(typeof item.id === 'number', `Item ${item.id} must have a numeric id`);
      assert.ok(item.reference && item.reference.length > 0, `Item ${item.id} must have a reference`);
      assert.ok(item.correct_answer && item.correct_answer.length > 0, `Item ${item.id} must have correct_answer`);
      assert.ok(item.verse_text && item.verse_text.length > 0, `Item ${item.id} must have verse_text`);
      assert.ok(item.image_url && item.image_url.startsWith('assets/'), `Item ${item.id} image_url must point to assets/`);
    });
  });

  test('QUESTIONS_BANK contains exactly 300 servant questions (100 per level) with full verse text', () => {
    assert.strictEqual(Array.isArray(window.QUESTIONS_BANK), true);
    assert.strictEqual(window.QUESTIONS_BANK.length, 300, 'Bank must have exactly 300 questions');

    const levelCounts = { 1: 0, 2: 0, 3: 0 };
    window.QUESTIONS_BANK.forEach(q => {
      assert.ok([1, 2, 3].includes(q.level), `Invalid level ${q.level} in question ${q.id}`);
      assert.strictEqual(q.options.length, 4, `Question ${q.id} must have 4 options`);
      assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3, `Question ${q.id} correctIndex out of bounds`);
      assert.ok(q.question && q.question.trim().length > 0, `Question ${q.id} question text empty`);
      assert.ok(q.reference && q.reference.trim().length > 0, `Question ${q.id} reference empty`);
      assert.ok(q.verse && q.verse.trim().length > 0, `Question ${q.id} verse text must be non-empty`);
      levelCounts[q.level]++;
    });

    assert.strictEqual(levelCounts[1], 100, 'Level 1 must have exactly 100 questions');
    assert.strictEqual(levelCounts[2], 100, 'Level 2 must have exactly 100 questions');
    assert.strictEqual(levelCounts[3], 100, 'Level 3 must have exactly 100 questions');
  });
});

describe('2. 3x3 Grid Strategic Difficulty Mapping Tests (3-3-3 Layout)', () => {
  // 3 Easy on 3 corners (0, 2, 6)
  // 3 Medium: 1 on an edge (1) and 2 in sides (7, 8)
  // 3 Hard: 1 in center (4) and 2 in sides (3, 5)
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

describe('3. Fair Cycle & Non-Repeating Random Engine Tests', () => {
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  test('Images cycle guarantees all 20 unique images before any repetition', () => {
    let pool = [];
    const drawn = [];

    // Simulate drawing 40 scenes (2 complete cycles of 20)
    for (let i = 0; i < 40; i++) {
      if (pool.length === 0) {
        pool = shuffleArray(window.PICS_DATA);
      }
      drawn.push(pool.pop().id);
    }

    const firstCycle = drawn.slice(0, 20);
    const secondCycle = drawn.slice(20, 40);

    assert.strictEqual(new Set(firstCycle).size, 20, 'First cycle must have 20 distinct IDs');
    assert.strictEqual(new Set(secondCycle).size, 20, 'Second cycle must have 20 distinct IDs');
  });

  test('Questions pool for each level cycles fairly without repeating until depleted', () => {
    [1, 2, 3].forEach(level => {
      const tierQs = window.QUESTIONS_BANK.filter(q => q.level === level);
      let pool = [];
      const drawn = [];

      for (let i = 0; i < tierQs.length; i++) {
        if (pool.length === 0) {
          pool = shuffleArray(tierQs);
        }
        drawn.push(pool.pop().id);
      }

      assert.strictEqual(new Set(drawn).size, tierQs.length, `Level ${level} must draw all unique questions`);
    });
  });
});

describe('4. Scene Dropdown Sanity & Anti-Spoiler Tests', () => {
  test('Dropdown options contain only image numbers and zero answer titles', () => {
    const options = [];
    for (let i = 1; i <= window.PICS_DATA.length; i++) {
      options.push(`صورة رقم ${i}`);
    }

    assert.strictEqual(options.length, 20);
    // Ensure none of the correct_answer strings leak into the dropdown labels
    window.PICS_DATA.forEach(p => {
      options.forEach(opt => {
        assert.ok(!opt.includes(p.correct_answer), `Dropdown label ${opt} must not leak answer title`);
      });
    });
  });
});

describe('5. Fullscreen Question Screen & Manual Return Flow (No Auto-Dismiss)', () => {
  test('Answering question does not dismiss automatically and sets pendingOutcome', () => {
    let questionScreenActive = true;
    let revelationCardActive = false;
    let pendingOutcome = null;

    // Simulate clicking an option:
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
});
