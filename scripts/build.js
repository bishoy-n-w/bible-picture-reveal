/**
 * Zero-dependency Build / Package Verification Script
 * Validates production assets and ensures zero missing references.
 */
const fs = require('fs');
const path = require('path');

console.log('📦 Running build verification...');

const distDir = path.join(__dirname, '..');
const requiredFiles = [
  'index.html',
  'css/style.css',
  'js/version.js',
  'js/i18n.js',
  'js/images-bank.js',
  'js/questions-bank.js',
  'js/audio.js',
  'js/confetti.js',
  'js/attractor.js',
  'js/game.js',
  'pics.json',
  'README.md'
];

let missing = 0;
requiredFiles.forEach(file => {
  const p = path.join(distDir, file);
  if (!fs.existsSync(p)) {
    console.error(`  ✗ Missing artifact: ${file}`);
    missing++;
  } else {
    const stat = fs.statSync(p);
    console.log(`  ✓ ${file} (${stat.size} bytes)`);
  }
});

if (missing > 0) {
  console.error(`\n❌ Build check failed: ${missing} missing files.`);
  process.exit(1);
} else {
  console.log('\n🚀 Build check successful! Production bundle is ready for direct local execution.\n');
}
