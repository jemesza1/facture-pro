import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = '/home/user/facture-pro/public';
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon','.woff2':'font/woff2'};
const srv = http.createServer((req,res)=>{
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/index.html';
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
  fs.createReadStream(f).pipe(res);
});
await new Promise(r=>srv.listen(0,r));
const port = srv.address().port;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
const errs = [];
ctx.on('weberror', e => errs.push(String(e.error())));
await ctx.addInitScript(() => {
  localStorage.setItem('fp_warn_seen','1');
  localStorage.setItem('fp_last_export', String(Date.now()-864e5));
  localStorage.setItem('fp_locale','ar');
  localStorage.setItem('facturepro_dz_v24', JSON.stringify({
    company:{name:'شركة',nif:'',nis:'',rc:'',ai:'',rib:'',address:'',phone:'',email:''},
    clients:[],invoices:[],products:[],devis:[],payments:[],expenses:[],recurring:[],
    nextInvoiceNumber:1,nextAvoirNumber:1,nextDevisNumber:1,currentPage:'dashboard'}));
});
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const info = await page.evaluate(() => ({
  lang: document.documentElement.lang, dir: document.documentElement.dir,
  hasShow: typeof window.showShortcuts
}));
console.log('doc:', JSON.stringify(info));

// Press "?" as a real user would
await page.keyboard.press('?');
await page.waitForTimeout(500);
let out = await page.evaluate(() => ({
  kbds: [...document.querySelectorAll('#modal-root kbd')].map(k=>k.textContent),
  descs: [...document.querySelectorAll('#modal-root td:nth-child(2)')].map(k=>k.textContent),
  title: document.querySelector('#modal-root h3')?.textContent,
  note: document.querySelector('#modal-root .modal-body p')?.textContent,
  kbdDir: getComputedStyle(document.querySelector('#modal-root kbd')||document.body).direction
}));
console.log('AR press-? ->', JSON.stringify(out, null, 1));

// now FR
await page.evaluate(()=>{ try{closeModal()}catch(e){} });
await page.evaluate(()=>{ localStorage.setItem('fp_locale','fr'); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.keyboard.press('?');
await page.waitForTimeout(400);
const fr = await page.evaluate(() => ({
  kbds: [...document.querySelectorAll('#modal-root kbd')].map(k=>k.textContent),
  descs: [...document.querySelectorAll('#modal-root td:nth-child(2)')].map(k=>k.textContent)
}));
console.log('FR press-? ->', JSON.stringify(fr, null, 1));
console.log('errors:', errs);
await browser.close(); srv.close();
