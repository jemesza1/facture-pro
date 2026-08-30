/* Replica of check.mjs:1605-1617 route interceptor, run against
   both pages and both styles.css variants. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BUILT = join(ROOT, 'public');
const TYPES = {'.html':'text/html','.js':'text/javascript','.css':'text/css',
               '.json':'application/json','.xml':'application/xml','.txt':'text/plain',
               '.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml',
               '.webmanifest':'application/manifest+json','.ico':'image/x-icon'};

const NEW_CSS = await readFile(join(BUILT, 'styles.css'));
// baseline stylesheet, straight out of git, never written to public/
const { execSync } = await import('node:child_process');
const BASE_CSS = execSync('git -C ' + ROOT + ' show a878fb1:styles.css');

let cssVariant = NEW_CSS;
const site = createServer(async (req, res) => {
  const rel = normalize(decodeURI(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const p = join(BUILT, rel);
  try {
    if (/\/styles\.css$/.test(rel)) {
      res.writeHead(200, {'Content-Type': 'text/css'}); return res.end(cssVariant);
    }
    const body = await readFile(p);
    res.writeHead(200, {'Content-Type': TYPES[extname(p)] || 'application/octet-stream'});
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => site.listen(0, '127.0.0.1', r));
const SITE = `http://127.0.0.1:${site.address().port}`;

const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH});

async function probe(page404, label) {
  const ctx = await browser.newContext({acceptDownloads: true});
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  const offOrigin = [];
  await pg.route('**/*', route => {
    const u = route.request().url();
    if (u.startsWith(SITE) || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('file://')) {
      return route.continue();
    }
    offOrigin.push(u);
    return route.abort();
  });
  await pg.goto(`${SITE}${page404}`);
  await pg.waitForTimeout(2500);
  console.log(`${label.padEnd(46)} offOrigin=${JSON.stringify(offOrigin)}`);
  // what the baseline check would have said
  const strayed = offOrigin.filter(u => !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u));
  console.log(`${''.padEnd(46)}  baseline-filter 'strayed'=${JSON.stringify(strayed)}  pageerrors=${errs.length}`);
  await ctx.close();
  return offOrigin;
}

for (const [name, css] of [['BASELINE styles.css', BASE_CSS], ['NEW styles.css', NEW_CSS]]) {
  cssVariant = css;
  console.log('--- ' + name + ' ---');
  await probe('/international.html', name + ' + /international.html');
  await probe('/index.html', name + ' + /index.html');
}

await browser.close();
site.close();
