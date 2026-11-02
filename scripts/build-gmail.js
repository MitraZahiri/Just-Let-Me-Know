// Copies the shared core into the Apps Script project (Apps Script has no imports).
// `--check` fails if the copy is out of date (used in CI).
const fs = require('node:fs');
const path = require('node:path');

const src = path.join(__dirname, '..', 'core', 'jlmk-core.js');
const dest = path.join(__dirname, '..', 'gmail', 'src', 'Core.js');
const banner = '// GENERATED from core/jlmk-core.js by `npm run build:gmail` — do not edit here.\n';
const expected = banner + fs.readFileSync(src, 'utf8');

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
