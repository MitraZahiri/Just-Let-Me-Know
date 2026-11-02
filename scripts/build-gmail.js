// Joins the shared core into one Apps Script file (Apps Script has no imports,
// and a single file keeps the load order fixed).
// `--check` fails if the copy is out of date (used in CI).
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sources = [
  'core/i18n/en.js',
  'core/i18n/tr.js',
  'core/i18n/de.js',
  'core/i18n/ar.js',
  'core/jlmk-core.js',
  'core/candidate.js',
];
const dest = path.join(root, 'gmail', 'src', 'Core.js');
const banner = '// GENERATED from core/ by `npm run build:gmail` — do not edit here.\n';
const expected = banner + sources
  .map((f) => `\n// ===== ${f} =====\n` + fs.readFileSync(path.join(root, f), 'utf8'))
  .join('');

if (process.argv.includes('--check')) {
  const actual = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  if (actual !== expected) {
    console.error('gmail/src/Core.js is out of date. Run: npm run build:gmail');
    process.exit(1);
  }
  console.log('gmail/src/Core.js is up to date.');
} else {
  fs.writeFileSync(dest, expected);
  console.log('Wrote gmail/src/Core.js');
}
