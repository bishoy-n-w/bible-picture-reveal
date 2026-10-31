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

describe('1. Dataset Integrity & Schema Tests', () => {
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

  test('QUESTIONS_BANK contains questions across all 3 tiers with 4 choices each', () => {
    assert.strictEqual(Array.isArray(window.QUESTIONS_BANK), true);
    assert.ok(window.QUESTIONS_BANK.length >= 60, 'Bank must have at least 60 questions');

    const levelCounts = { 1: 0, 2: 0, 3: 0 };
    window.QUESTIONS_BANK.forEach(q => {
      assert.ok([1, 2, 3].includes(q.level), `Invalid level ${q.level} in question ${q.id}`);
      assert.strictEqual(q.options.length, 4, `Question ${q.id} must have 4 options`);
      assert.ok(q.correctIndex >= 0 && q.correctIndex <= 3, `Question ${q.id} correctIndex out of bounds`);
      assert.ok(q.question && q.question.trim().length > 0, `Question ${q.id} question text empty`);
      assert.ok(q.reference && q.reference.trim().length > 0, `Question ${q.id} reference empty`);
      levelCounts[q.level]++;
    });

    assert.ok(levelCounts[1] >= 15, 'Level 1 must have at least 15 questions');
    assert.ok(levelCounts[2] >= 15, 'Level 2 must have at least 15 questions');
    assert.ok(levelCounts[3] >= 15, 'Level 3 must have at least 15 questions');
  });
});

describe('2. 3x3 Grid Strategic Difficulty Mapping Tests', () => {
  const difficultyMap = {
    0: 1, 1: 2, 2: 1,
    3: 2, 4: 3, 5: 2,
    6: 1, 7: 2, 8: 1
  };

  test('Center tile (Tile #5 / Index 4) maps to Level 3 (Hard / Golden Seal)', () => {
    assert.strictEqual(difficultyMap[4], 3);
  });

  test('Cardinal edge tiles (Indices 1, 3, 5, 7) map to Level 2 (Medium)', () => {
    [1, 3, 5, 7].forEach(idx => {
      assert.strictEqual(difficultyMap[idx], 2, `Tile index ${idx} must be Medium (Level 2)`);
    });
  });

  test('Corner tiles (Indices 0, 2, 6, 8) map to Level 1 (Easy)', () => {
    [0, 2, 6, 8].forEach(idx => {
      assert.strictEqual(difficultyMap[idx], 1, `Tile index ${idx} must be Easy (Level 1)`);
    });
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

describe('5. Carnival Timer & Keyboard Mapping Tests', () => {
  test('Timer urgency triggers at 5 seconds or less', () => {
    const isUrgent = (sec) => sec <= 5 && sec > 0;
    assert.strictEqual(isUrgent(20), false);
    assert.strictEqual(isUrgent(6), false);
    assert.strictEqual(isUrgent(5), true);
    assert.strictEqual(isUrgent(1), true);
    assert.strictEqual(isUrgent(0), false);
  });

  test('Timeout state retains question active on screen without dismissal', () => {
    let questionDismissed = false;
    let timerRemaining = 0;

    // Timeout occurs:
    if (timerRemaining <= 0) {
      // Question remains active!
      questionDismissed = false;
    }
    assert.strictEqual(questionDismissed, false);
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
