/* Concatenate the application's core scripts into one file for production.

   Eighteen sequential <script> loads is eighteen round-trips on a 3G stall.
   The source files stay the source of truth — tests load them one by one from
   the repository root — and the build writes a single public/core.bundle.js
   that public/app.js then loads. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const app = readFileSync(join(ROOT, 'app.js'), 'utf8');
const m = /var core=(\[[^\]]+\])/.exec(app);
if (!m) throw new Error('app.js: no core[] array to bundle');
const files = Function('return ' + m[1])();
const parts = files.map(function (f) {
  return '/* ---- ' + f + ' ---- */\n' + readFileSync(join(ROOT, f), 'utf8');
});
writeFileSync(join(ROOT, 'public', 'core.bundle.js'), parts.join('\n;\n'));
const patched = app.replace(/var core=\[[^\]]+\]/, 'var core=["core.bundle.js"]');
writeFileSync(join(ROOT, 'public', 'app.js'), patched);
console.log('bundle: ' + files.length + ' files → public/core.bundle.js (' +
            Math.round(parts.join('').length / 1024) + ' KB), public/app.js loads one script');
