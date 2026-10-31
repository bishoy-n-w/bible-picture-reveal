/**
 * Zero-dependency Static Linter & Validator
 * Validates syntax, HTML integrity, CSS rules, and data structures.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Running project linter and sanity check...');

// 1. Validate JS syntax with node -c
const jsFiles = [
  'js/i18n.js',
  'js/images-bank.js',
  'js/questions-bank.js',
  'js/audio.js',
  'js/confetti.js',
  'js/game.js'
];

let hasError = false;

jsFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  try {
    execSync(`node -c "${fullPath}"`);
    console.log(`  ✓ ${file} syntax valid`);
  } catch (err) {
    console.error(`  ✗ ${file} syntax error:`, err.message);
    hasError = true;
  }
});

// 2. Validate HTML file exists and has essential tags
const htmlPath = path.join(__dirname, '..', 'index.html');
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const requiredTags = ['<!DOCTYPE html>', '<html', '<head>', '<body', 'id="grid-layer"', 'id="confetti-canvas"'];
  requiredTags.forEach(tag => {
    if (!html.includes(tag)) {
      console.error(`  ✗ index.html missing required tag: ${tag}`);
      hasError = true;
    }
  });
  console.log('  ✓ index.html structure verified');
} else {
  console.error('  ✗ index.html not found');
  hasError = true;
}

// 3. Validate CSS file exists and has root definitions
const cssPath = path.join(__dirname, '..', 'css', 'style.css');
if (fs.existsSync(cssPath)) {
  const css = fs.readFileSync(cssPath, 'utf8');
  if (css.includes(':root') && css.includes('.tile')) {
    console.log('  ✓ css/style.css verified');
  } else {
    console.error('  ✗ css/style.css missing required rules');
    hasError = true;
  }
} else {
  console.error('  ✗ css/style.css not found');
  hasError = true;
}

// 4. Validate pics.json and questions-bank
try {
  global.window = {};
  eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'images-bank.js'), 'utf8'));
  eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'questions-bank.js'), 'utf8'));

  if (!Array.isArray(window.PICS_DATA) || window.PICS_DATA.length !== 20) {
    console.error('  ✗ PICS_DATA must contain exactly 20 items');
    hasError = true;
  } else {
    console.log(`  ✓ PICS_DATA verified (${window.PICS_DATA.length} scenes)`);
  }

  if (!Array.isArray(window.QUESTIONS_BANK) || window.QUESTIONS_BANK.length !== 300) {
    console.error(`  ✗ QUESTIONS_BANK must contain exactly 300 items (found ${window.QUESTIONS_BANK ? window.QUESTIONS_BANK.length : 0})`);
    hasError = true;
  } else {
    // Check verse presence (supports both string and bilingual object)
    const missingVerse = window.QUESTIONS_BANK.filter(q => {
      if (!q.verse) return true;
      if (typeof q.verse === 'object') {
        return !q.verse.ar || !q.verse.en || q.verse.ar.trim().length === 0 || q.verse.en.trim().length === 0;
      }
      return q.verse.trim().length === 0;
    });
    if (missingVerse.length > 0) {
      console.error(`  ✗ Found ${missingVerse.length} questions missing complete verse text`);
      hasError = true;
    } else {
      console.log(`  ✓ QUESTIONS_BANK verified (exactly ${window.QUESTIONS_BANK.length} bilingual servant questions with Van Dyck & NKJV verses)`);
    }
  }
} catch (e) {
  console.error('  ✗ Data evaluation error:', e.message);
  hasError = true;
}

if (hasError) {
  console.error('\n❌ Linting failed with errors.');
  process.exit(1);
} else {
  console.log('\n✅ All linting checks passed successfully!\n');
}
