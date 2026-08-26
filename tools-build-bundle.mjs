/* Production only: concatenate the sequential core into one file.

   Tests serve the repository root and load app.js as written — one script
   after another, the order extra.js and ledger.js wrap against. Production
   serves public/, where eighteen round trips on 3G were the whole page.
   This rewrites public/app.js to fetch core.js once. Source app.js is not
   touched. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const OUT = join(ROOT, 'public');

const srcApp = readFileSync(join(ROOT, 'app.js'), 'utf8');
const V = (srcApp.match(/var\s+V\s*=\s*"([^"]+)"/) || [])[1];
if (!V) throw new Error('bundle: no V in app.js');
const coreMatch = srcApp.match(/var\s+core\s*=\s*(\[[^\]]+\])/);
if (!coreMatch) throw new Error('bundle: no core list in app.js');
const core = JSON.parse(coreMatch[1].replace(/'/g, '"'));

const parts = core.map(f => {
  const body = readFileSync(join(ROOT, f), 'utf8');
  return `/* ---- ${f} ---- */\n${body}`;
});
writeFileSync(join(OUT, 'core.js'), parts.join('\n;\n') + '\n');

let app = readFileSync(join(OUT, 'app.js'), 'utf8');
if (!/var\s+core\s*=/.test(app)) {
  throw new Error('bundle: public/app.js has no core list to rewrite');
}
app = app.replace(/var\s+core\s*=\s*\[[^\]]+\];\s*/, '');
app = app.replace(
  /core\.reduce\(function\(p,f\)\{return p\.then\(function\(\)\{return load\(f\+"\?v="\+V\);\}\);\},Promise\.resolve\(\)\)/,
  'load("core.js?v="+V)'
);
if (/var\s+core\s*=/.test(app) || /core\.reduce/.test(app) || !/core\.js\?v=/.test(app)) {
  throw new Error('bundle: public/app.js rewrite did not take');
}
writeFileSync(join(OUT, 'app.js'), app);
console.log(`bundle: public/core.js (${core.length} files, v=${V})`);
