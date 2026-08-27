/**
 * Build the Open Graph share cards.
 *
 * static/og.png is a 319 KB French-only screenshot with no source.
 * Twenty-five pages point at it. This script draws the card in HTML,
 * opens Chromium, and writes two small files into static/:
 *
 *   static/og.png     French
 *   static/og-ar.png  Arabic
 *
 * Chromium is the one the test suite already knows:
 *   CHROMIUM_PATH=/opt/pw-browsers/chromium
 *   playwright lives in tests/node_modules
 *
 * Fonts stay on disk. Nothing is fetched.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync,
  rmSync, statSync, writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
/* static/, pas public/ : public/ est reconstruit a chaque `npm run build` et
   n'est pas versionne, si bien qu'une carte ecrite la disparait au deploiement
   suivant. Les cartes vivent donc dans static/, versionnees comme le classeur
   SCF, et le build les copie — il le fait deja avec `cp -f static/*.png`. */
const OUT = join(ROOT, 'static');
const ICON = join(ROOT, 'static', 'icon.svg');

const FR_LINE = 'Facture Algérie gratuite — NIF, RC, TVA 19 %';
const AR_LINE = 'فاتورة الجزائر مجانًا — <span dir="ltr">NIF, RC, TVA 19 %</span>';
const SITE = 'www.facturedz.com';
const MAX_BYTES = 90 * 1024;

const FONT_INTER = firstExisting([
  '/usr/share/fonts/SlidesCarnival/google/Inter/static/Inter_18pt-Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
]);
const FONT_CAIRO = firstExisting([
  '/usr/share/fonts/SlidesCarnival/google/Cairo/static/Cairo-Bold.ttf',
  '/usr/share/fonts/SlidesCarnival/google/Cairo/static/Cairo-SemiBold.ttf',
  FONT_INTER,
]);

function firstExisting(paths) {
  return paths.find((p) => p && existsSync(p)) || null;
}

function fontFace(family, file) {
  if (!file) return '';
  const url = pathToFileURL(file).href;
  return `@font-face{font-family:"${family}";src:url("${url}") format("truetype");font-weight:700;font-style:normal;font-display:block;}`;
}

function cardHtml({ rtl, line, font }) {
  const icon = existsSync(ICON) ? readFileSync(ICON, 'utf8') : '';
  const dir = rtl ? 'rtl' : 'ltr';
  const faces = fontFace('OgInter', FONT_INTER) + fontFace('OgCairo', FONT_CAIRO);
  return `<!DOCTYPE html>
<html lang="${rtl ? 'ar' : 'fr'}" dir="${dir}">
<head>
<meta charset="utf-8"/>
<style>
  ${faces}
  html,body{margin:0;padding:0;width:1200px;height:630px;overflow:hidden;background:#006233;}
  body{
    font-family:${font},system-ui,sans-serif;
    color:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
  }
  .wrap{width:1080px;display:flex;flex-direction:column;gap:28px;}
  .brand{display:flex;align-items:center;gap:28px;}
  .icon{width:112px;height:112px;flex:0 0 auto;filter:drop-shadow(0 8px 18px rgba(0,0,0,.18));}
  .icon svg{width:112px;height:112px;display:block;}
  h1{margin:0;font-size:84px;line-height:1;font-weight:700;letter-spacing:-.02em;}
  .line{margin:0;font-size:34px;line-height:1.35;font-weight:700;color:#e8fff3;max-width:1080px;}
  .url{margin:8px 0 0;font-size:26px;font-weight:700;color:#b6ebc9;letter-spacing:.02em;}
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <div class="icon">${icon}</div>
      <h1>FacturePro</h1>
    </div>
    <p class="line">${line}</p>
    <p class="url">${SITE}</p>
  </div>
</body>
</html>`;
}

function chromeCandidates() {
  const env = process.env.CHROMIUM_PATH;
  const list = [];
  if (env) {
    list.push(
      env,
      join(env, 'chrome'),
      join(env, 'chromium'),
      join(env, 'chrome-linux', 'chrome'),
      join(env, 'chrome-linux64', 'chrome'),
      join(env, 'chrome-headless-shell'),
    );
  }
  list.push(
    '/opt/pw-browsers/chromium/chrome-linux/chrome',
    '/opt/pw-browsers/chromium/chrome-linux64/chrome',
    '/opt/google/chrome/chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  );
  return list.filter((p) => existsSync(p) && statSync(p).isFile());
}

function loadPlaywright() {
  const testsPkg = join(ROOT, 'tests', 'package.json');
  if (!existsSync(testsPkg)) return null;
  try {
    const require = createRequire(testsPkg);
    return require('playwright');
  } catch {
    return null;
  }
}

async function shotPlaywright(htmlFile, pngFile) {
  const pw = loadPlaywright();
  if (!pw) return false;
  const exec = chromeCandidates()[0];
  const browser = await pw.chromium.launch({
    executablePath: exec,
    headless: true,
    args: ['--hide-scrollbars', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'networkidle' });
    await page.screenshot({ path: pngFile, type: 'png' });
  } finally {
    await browser.close();
  }
  return true;
}

function shotChrome(htmlFile, pngFile) {
  const bin = chromeCandidates()[0];
  if (!bin) throw new Error('og: no Chromium (set CHROMIUM_PATH or install Playwright in tests/)');
  const dir = mkdtempSync(join(tmpdir(), 'fp-og-'));
  try {
    execFileSync(bin, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-sandbox',
      '--force-device-scale-factor=1',
      '--window-size=1200,630',
      `--screenshot=${join(dir, 'shot.png')}`,
      pathToFileURL(htmlFile).href,
    ], { stdio: 'pipe', timeout: 30000 });
    writeFileSync(pngFile, readFileSync(join(dir, 'shot.png')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function quantize(pngFile) {
  /* Palette PNG keeps the card under 90 KB without leaving the machine. */
  try {
    execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open(${JSON.stringify(pngFile)}).convert("RGBA")
bg = Image.new("RGB", im.size, (0, 98, 51))
bg.paste(im, mask=im.split()[-1])
bg = bg.resize((1200, 630))
pal = bg.quantize(colors=48, method=Image.Quantize.MEDIANCUT)
pal.save(${JSON.stringify(pngFile)}, optimize=True)
`], { stdio: 'pipe', timeout: 15000 });
  } catch {
    /* Pillow missing: leave the raw screenshot. */
  }
}

async function renderOne({ name, rtl, line, font }) {
  mkdirSync(OUT, { recursive: true });
  const dir = mkdtempSync(join(tmpdir(), 'fp-og-html-'));
  const htmlFile = join(dir, 'card.html');
  const dest = join(OUT, name);
  writeFileSync(htmlFile, cardHtml({ rtl, line, font }));
  try {
    let usedPw = false;
    try { usedPw = await shotPlaywright(htmlFile, dest); } catch { usedPw = false; }
    if (!usedPw) shotChrome(htmlFile, dest);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  quantize(dest);
  const bytes = statSync(dest).size;
  if (bytes > MAX_BYTES) {
    throw new Error(`og: ${name} is ${bytes} bytes (limit ${MAX_BYTES})`);
  }
  console.log(`og: wrote static/${name} (${Math.round(bytes / 1024)} KB)`);
}

const fr = renderOne({ name: 'og.png', rtl: false, line: FR_LINE, font: 'OgInter' });
const ar = renderOne({ name: 'og-ar.png', rtl: true, line: AR_LINE, font: 'OgCairo' });
await Promise.all([fr, ar]);
