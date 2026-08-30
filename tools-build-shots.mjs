/* FacturePro — les captures d'ecran de la fiche Google Play.
 *
 *   cd tests && npm install          (une fois : playwright vit la-bas)
 *   npm run build                    (les captures se prennent sur public/)
 *   CHROMIUM_PATH=/opt/pw-browsers/chromium npm run shots
 *
 * Comme tools-build-og.mjs, ce script demande un navigateur et n'entre donc
 * JAMAIS dans `npm run build` : Vercel n'a pas de Chromium, et une etape de
 * build qui en reclame un fait echouer le deploiement entier. Les images
 * partent dans static/, versionnees, et le build les recopie dans public/.
 *
 * Les donnees ci-dessous sont semees dans localStorage avant l'ouverture.
 * Une fiche de magasin qui affiche « ce sont des exemples » et quatre zeros
 * ne vend rien : il faut une entreprise qui a l'air de travailler. Les
 * identifiants fiscaux sont des suites evidentes et ne designent aucune
 * entreprise reelle.
 */
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const BUILT = join(ROOT, 'public');
const OUT = join(ROOT, 'static');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};

function loadPlaywright() {
  const testsPkg = join(ROOT, 'tests', 'package.json');
  if (!existsSync(testsPkg)) return null;
  try { return createRequire(testsPkg)('playwright'); } catch { return null; }
}

const SEED = {
  company: {
    name: 'SARL EL BARAKA DISTRIBUTION',
    address: 'Zone d’activité Oued Smar\n16000 Alger',
    nif: '000916001234567', nis: '000916009876543',
    rc: '16/00-1234567B21', ai: '16350987654',
    phone: '021 45 67 89', email: 'contact@elbaraka.dz',
    rib: '00300112345678901234', banque: 'BNA', logo: '',
  },
  clients: [
    {id: 'k1', name: 'SARL Atlas Services', email: 'contact@atlas.dz', address: '45 Bd Mohamed V\n16000 Alger', nif: '000916007654321', nis: '000916001112223', rc: '16/00-7654321B19', ai: '', phone: '021 00 11 22'},
    {id: 'k2', name: 'EURL Mediterranée Import', email: 'info@medimport.dz', address: '12 Rue Larbi Ben M’hidi\n31000 Oran', nif: '000931004455667', nis: '000931008899001', rc: '31/00-4455667B20', ai: '', phone: '041 33 44 55'},
    {id: 'k3', name: 'SPA Constantine Matériaux', email: 'achat@ctm.dz', address: 'Route de Sétif\n25000 Constantine', nif: '000925003322110', nis: '000925006677889', rc: '25/00-3322110B18', ai: '', phone: '031 92 10 20'},
    {id: 'k4', name: 'SARL Sahara Logistique', email: 'dz@saharalog.dz', address: 'Route de Touggourt\n30000 Ouargla', nif: '000930009988776', nis: '000930001122334', rc: '30/00-9988776B22', ai: '', phone: '029 71 30 40'},
  ],
  invoices: [
    {id: 'f1', number: 'FAC-2026-018', clientId: 'k1', template: 'algerie', date: '2026-08-24', status: 'payee', paymentMode: 'virement', items: [{description: 'Ciment CPJ 42.5 — palette', qty: 24, unitPrice: 9800, tva: 19}, {description: 'Transport Alger — Blida', qty: 1, unitPrice: 18000, tva: 19}]},
    {id: 'f2', number: 'FAC-2026-017', clientId: 'k2', template: 'algerie', date: '2026-08-21', status: 'envoyee', paymentMode: 'virement', items: [{description: 'Rond à béton Ø12 — tonne', qty: 6, unitPrice: 112000, tva: 19}]},
    {id: 'f3', number: 'FAC-2026-016', clientId: 'k3', template: 'algerie', date: '2026-08-11', status: 'enretard', paymentMode: 'cheque', items: [{description: 'Briques 12 trous — millier', qty: 14, unitPrice: 15500, tva: 19}]},
    {id: 'f4', number: 'FAC-2026-015', clientId: 'k4', template: 'algerie', date: '2026-08-07', status: 'payee', paymentMode: 'especes', items: [{description: 'Palettes bois — lot', qty: 40, unitPrice: 1450, tva: 19}]},
    {id: 'f5', number: 'FAC-2026-014', clientId: 'k1', template: 'algerie', date: '2026-08-03', status: 'payee', paymentMode: 'virement', items: [{description: 'Sable concassé 0/4 — m³', qty: 35, unitPrice: 2600, tva: 19}]},
    {id: 'f6', number: 'FAC-2026-013', clientId: 'k2', template: 'algerie', date: '2026-07-29', status: 'envoyee', paymentMode: 'virement', items: [{description: 'Plaques de plâtre BA13', qty: 180, unitPrice: 1180, tva: 19}]},
  ],
  products: [
    {id: 'p1', name: 'Ciment CPJ 42.5 — sac 50 kg', price: 980, tva: 19, stock: 640, minStock: 100},
    {id: 'p2', name: 'Rond à béton Ø12 — tonne', price: 112000, tva: 19, stock: 18, minStock: 5},
    {id: 'p3', name: 'Briques 12 trous — millier', price: 15500, tva: 19, stock: 31, minStock: 8},
    {id: 'p4', name: 'Sable concassé 0/4 — m³', price: 2600, tva: 19, stock: 210, minStock: 40},
    {id: 'p5', name: 'Plaques de plâtre BA13', price: 1180, tva: 19, stock: 920, minStock: 150},
  ],
  devis: [
    {id: 'd1', number: 'DEV-2026-007', clientId: 'k3', date: '2026-08-26', status: 'accepte', template: 'algerie', items: [{description: 'Rond à béton Ø10 — tonne', qty: 4, unitPrice: 108000, tva: 19}]},
    {id: 'd2', number: 'DEV-2026-006', clientId: 'k4', date: '2026-08-19', status: 'brouillon', template: 'algerie', items: [{description: 'Ciment CPJ 42.5 — palette', qty: 12, unitPrice: 9800, tva: 19}]},
  ],
  payments: [
    {id: 'y1', invoiceId: 'f1', amount: 301308, date: '2026-08-27', method: 'virement'},
    {id: 'y2', invoiceId: 'f4', amount: 69020, date: '2026-08-09', method: 'especes'},
    {id: 'y3', invoiceId: 'f5', amount: 108290, date: '2026-08-05', method: 'virement'},
  ],
  expenses: [], recurring: [],
  nextInvoiceNumber: 19, nextAvoirNumber: 1, nextDevisNumber: 8, currentPage: 'dashboard',
};

const pw = loadPlaywright();
if (!pw) {
  console.error('shots: playwright introuvable — lancez `cd tests && npm install`.');
  process.exit(1);
}
if (!existsSync(join(BUILT, 'index.html'))) {
  console.error('shots: public/ est vide — lancez `npm run build` avant.');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/' || url === '') url = '/index.html';
  const p = join(BUILT, normalize(decodeURI(url)).replace(/^(\.\.[/\\])+/, ''));
  try {
    const body = await readFile(p);
    res.writeHead(200, {'Content-Type': TYPES[extname(p)] || 'application/octet-stream'});
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const browser = await pw.chromium.launch({executablePath: process.env.CHROMIUM_PATH});

/* 360x640 a l'echelle 3 fait 1080x1920 : le format que Play attend d'un
   telephone, et la hauteur reelle d'un ecran d'Android milieu de gamme. */
const phoneContext = () => browser.newContext({
  viewport: {width: 360, height: 640}, deviceScaleFactor: 3,
  isMobile: true, hasTouch: true, locale: 'fr-DZ',
});

async function boot(ctx, locale) {
  const page = await ctx.newPage();
  await page.addInitScript(([seed]) => {
    try {
      localStorage.setItem('facturepro_dz_v24', JSON.stringify(seed));
      localStorage.setItem('fp_warn_seen', '1');
      localStorage.setItem('fp_install_hidden_until', String(Date.now() + 9e9));
      localStorage.setItem('fp_last_export', String(Date.now() - 864e5));
    } catch (e) {}
  }, [SEED]);
  await page.goto(`${BASE}/index.html`, {waitUntil: 'networkidle'});
  await page.waitForFunction(() => typeof window.renderOutils === 'function', {timeout: 25000});
  await page.waitForTimeout(800);
  if (locale === 'ar') { await page.evaluate(() => toggleLocale()); await page.waitForTimeout(500); }
  return page;
}

const shot = async (page, name) => {
  await page.screenshot({path: join(OUT, name)});
  console.log('shots:', name);
};

let ctx = await phoneContext();
let page = await boot(ctx, 'fr');
await shot(page, 'shot-dashboard.png');
await ctx.close();

ctx = await phoneContext();
page = await boot(ctx, 'fr');
await page.evaluate(() => navigate('invoices'));
await page.waitForTimeout(600);
await shot(page, 'shot-factures.png');
await ctx.close();

ctx = await phoneContext();
page = await boot(ctx, 'ar');
await page.evaluate(() => navigate('outils'));
await page.waitForTimeout(600);
await shot(page, 'shot-outils.png');
await ctx.close();

/* La facture entiere ne tient pas sur 360 px : le document est au format A4
   et la colonne MONTANT sort du cadre. On la montre donc sur l'ecran large,
   ou elle tient — et le telephone garde les trois ecrans qui y sont chez eux. */
ctx = await browser.newContext({viewport: {width: 1920, height: 1080}, locale: 'fr-DZ'});
page = await boot(ctx, 'fr');
await shot(page, 'shot-wide.png');
await page.evaluate(() => navigate('invoices'));
await page.waitForTimeout(400);
await page.evaluate(() => previewInvoice('f1'));
await page.waitForTimeout(1800);
await shot(page, 'shot-invoice.png');
await ctx.close();

/* L'image de couverture de la fiche Play : 1024x500, imposee, et la premiere
   chose qu'un commercant voit avant meme le nom. Elle est dessinee ici plutot
   qu'a la main pour qu'elle se refasse a l'identique quand la marque bouge, et
   elle n'appelle aucune ressource exterieure — les fontes viennent de
   public/fonts, comme partout ailleurs. */
const FEATURE = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="${BASE}/fonts.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1024px;height:500px;overflow:hidden;
       font-family:Inter,system-ui,sans-serif;
       background:linear-gradient(125deg,#00542C 0%,#006233 45%,#12B36A 100%);
       color:#fff;display:flex;align-items:center;gap:52px;padding:0 68px;position:relative}
  body::after{content:"";position:absolute;inset:0;
       background:radial-gradient(900px 420px at 82% 8%,rgba(255,255,255,.16),transparent 62%)}
  .mark{width:184px;height:184px;flex:0 0 184px;position:relative;z-index:1;
       filter:drop-shadow(0 18px 34px rgba(0,0,0,.32))}
  .txt{position:relative;z-index:1;min-width:0}
  h1{font-size:78px;font-weight:800;letter-spacing:-.035em;line-height:1}
  .dz{display:inline-block;margin-inline-start:18px;padding:7px 18px;border-radius:999px;
      background:rgba(255,255,255,.17);font-size:25px;font-weight:700;letter-spacing:.02em;
      vertical-align:middle}
  .fr{margin-top:20px;font-size:29px;font-weight:500;color:#eafff3;letter-spacing:-.012em;white-space:nowrap}
  /* La ligne arabe se lit de droite a gauche, mais elle appartient a une
     colonne alignee a gauche : direction pour les glyphes, text-align pour le
     bloc — sans quoi elle part seule au bord oppose de l'image. */
  .ar{margin-top:10px;font-size:27px;font-weight:600;color:#c9f5de;
      font-family:Cairo,Tahoma,sans-serif;direction:rtl;text-align:left;white-space:nowrap}
  .tags{margin-top:30px;display:flex;gap:11px}
  .tags span{padding:9px 17px;border-radius:11px;background:rgba(255,255,255,.13);
      border:1px solid rgba(255,255,255,.22);font-size:20px;font-weight:600}
</style>
<svg class="mark" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#12B36A"/><stop offset="1" stop-color="#00542C"/></linearGradient></defs>
  <rect width="512" height="512" rx="124" fill="url(#g)"/>
  <rect x="132" y="88" width="248" height="336" rx="34" fill="#fff"/>
  <g fill="#00542C"><rect x="172" y="150" width="168" height="28" rx="14"/>
  <rect x="172" y="210" width="112" height="28" rx="14"/></g>
  <path d="M180 320l40 40 84-92" fill="none" stroke="#19D179" stroke-width="34"
    stroke-linecap="round" stroke-linejoin="round"/></svg>
<div class="txt">
  <h1>FacturePro<span class="dz">Algérie</span></h1>
  <p class="fr">Vos factures conformes, même sans connexion.</p>
  <p class="ar">فواتيرك مطابقة للقانون، حتى بدون إنترنت.</p>
  <div class="tags"><span>TVA 19 %</span><span>Droit de timbre</span><span>NIF · RC · NIS</span></div>
</div>`;

ctx = await browser.newContext({viewport: {width: 1024, height: 500}, deviceScaleFactor: 1});
page = await ctx.newPage();
await page.setContent(FEATURE, {waitUntil: 'networkidle'});
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);
await shot(page, 'play-feature.png');
await ctx.close();

await browser.close();
server.close();
console.log('shots: 6 images ecrites dans static/');
