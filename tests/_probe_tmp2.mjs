/* Does the TIGHTENED assertion (check.mjs:1887) fail when the defect it
   claims to have caught is put back? And does anything else in the suite? */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BUILT = join(ROOT, 'public');
const TYPES = {'.html':'text/html','.js':'text/javascript','.css':'text/css',
               '.json':'application/json','.woff2':'font/woff2','.png':'image/png',
               '.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};

const BASE_CSS = execSync(`git -C ${ROOT} show a878fb1:styles.css`);           // defect present
const FONTS_POISON = Buffer.concat([
  Buffer.from("@import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');\n"),
  await readFile(join(BUILT, 'fonts.css'))]);                                   // defect in a file the regex never reads

const over = {};
const site = createServer(async (req, res) => {
  const rel = normalize(decodeURI(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  try {
    if (over[rel]) { res.writeHead(200, {'Content-Type':'text/css'}); return res.end(over[rel]); }
    const body = await readFile(join(BUILT, rel));
    res.writeHead(200, {'Content-Type': TYPES[extname(rel)] || 'application/octet-stream'});
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => site.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${site.address().port}`;
const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH});

async function intlAssertion(label) {
  const ctx = await browser.newContext({acceptDownloads: true});
  const intl = await ctx.newPage();
  const offOrigin = [];
  await intl.route('**/*', route => {                       // verbatim check.mjs:1610
    const u = route.request().url();
    if (u.startsWith(SITE) || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('file://'))
      return route.continue();
    offOrigin.push(u); return route.abort();
  });
  await intl.goto(`${SITE}/international.html`);
  await intl.waitForFunction(() => !!document.querySelector('#chips button'), {timeout: 20000});
  await intl.waitForTimeout(1500);
  const ok = offOrigin.length === 0;                         // verbatim check.mjs:1888
  console.log(`  [${ok ? 'PASS' : 'FAIL'}] "nothing the page asked for left this origin at all"  <-- ${label}`);
  await ctx.close();
}

// what index.html really does, unguarded by any interceptor in the suite
async function indexReality(label) {
  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  const seen = [];
  pg.on('request', r => { if (!r.url().startsWith(SITE) && !/^(data|blob):/.test(r.url())) seen.push(r.url()); });
  await pg.goto(`${SITE}/index.html`);
  await pg.waitForTimeout(2500);
  console.log(`      index.html actually requested off-origin: ${JSON.stringify(seen)}   (${label})`);
  await ctx.close();
}

const cssSrc = await readFile(join(ROOT, 'styles.css'), 'utf8');
const srcCheck = s => !/@import\s+url\(\s*['"]?https?:/i.test(s) && !/fonts\.(googleapis|gstatic)/.test(s);

console.log('A. defect restored in styles.css (the file the comment names):');
over['/styles.css'] = BASE_CSS;
await intlAssertion('styles.css has the Google @import back');
await indexReality('styles.css poisoned');
console.log(`      source-text check (check.mjs:4352) on that stylesheet: ${srcCheck(BASE_CSS.toString()) ? 'PASS (blind)' : 'FAIL (catches it)'}`);

console.log('\nB. defect moved to fonts.css (also loaded by index.html, never read by the regex):');
delete over['/styles.css']; over['/fonts.css'] = FONTS_POISON;
await intlAssertion('fonts.css has a Google @import');
await indexReality('fonts.css poisoned');
console.log(`      source-text check (check.mjs:4352) reads only styles.css: ${srcCheck(cssSrc) ? 'PASS (blind to fonts.css)' : 'FAIL'}`);

await browser.close(); site.close();
