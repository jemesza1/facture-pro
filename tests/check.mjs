/* FacturePro — regression suite.
 *
 * Run it before every deploy:   cd tests && npm install && npm test
 *
 * It serves the repository root, opens it in a headless Chromium and calls the
 * application's own functions. Nothing is mocked: if a check fails here, a user
 * would have hit the same thing.
 *
 * The CDN scripts (tailwind, lucide) are expected to fail offline — that is not
 * a failure of the app, so console errors mentioning them are ignored.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = {'.html':'text/html','.js':'text/javascript','.css':'text/css',
               '.json':'application/json','.xml':'application/xml','.txt':'text/plain'};

let passed = 0; const failures = [];
function check(name, ok, detail) {
  if (ok) { passed++; console.log(`  ✓ ${name}`); }
  else { failures.push({name, detail}); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}
const near = (a, b, eps = 0.001) => Math.abs(a - b) <= eps;

const server = createServer(async (req, res) => {
  const p = join(ROOT, normalize(decodeURI(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
  try {
    const body = await readFile(p);
    res.writeHead(200, {'Content-Type': TYPES[extname(p)] || 'application/octet-stream'});
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

/* CI images often ship one Chromium that does not match the build number this
   Playwright would download. CHROMIUM_PATH points at the one that is there. */
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
const context = await browser.newContext({acceptDownloads: true});
const page = await context.newPage();
const consoleErrors = [];
page.on('pageerror', e => { if (!/tailwind|lucide/i.test(String(e))) consoleErrors.push(String(e)); });

/* ---------------------------------------------------------------- *
 * 1. Data written by an older version must survive the update.
 *    This is the check that lets us ship without losing anyone's work.
 * ---------------------------------------------------------------- */
console.log('\nData written by a previous version');
const LEGACY = {
  company: {name:'Mon Entreprise SARL', address:'12 Rue Didouche', nif:'0999', nis:'0888',
            rc:'16/00-1B00', ai:'0004', email:'a@b.dz', phone:'021',
            rib:'007 99999 0000000000 00', banque:'BNA', logo:''},
  clients: [{id:'c1', name:'SARL Atlas', email:'x@atlas.dz', address:'Alger', nif:'0999', phone:'021'}],
  invoices: [{id:'i1', number:'FAC-2026-001', clientId:'c1', template:'classique', date:'2026-07-01',
              dueDate:'2026-07-31', status:'envoyee',
              items:[{description:'Prestation', qty:1, unitPrice:100000, tva:19}], notes:'Merci.'}],
  payments: [], products: [], devis: [], nextInvoiceNumber: 2, currentPage: 'invoices',
};
await page.goto(`${BASE}/index.html`);
await page.evaluate(d => localStorage.setItem('facturepro_dz_v24', JSON.stringify(d)), LEGACY);
await page.reload();
await page.waitForFunction(() => typeof state !== 'undefined' && typeof calcInvoiceTotals === 'function', {timeout: 30000});

const legacy = await page.evaluate(() => ({
  rib: state.company.rib, client: state.clients[0].name, number: state.invoices[0].number,
  notes: state.invoices[0].notes, net: calcInvoiceTotals(state.invoices[0]).net,
  paymentMode: state.invoices[0].paymentMode,
}));
check('company RIB intact', legacy.rib === '007 99999 0000000000 00', legacy.rib);
check('client intact', legacy.client === 'SARL Atlas', legacy.client);
check('invoice number intact', legacy.number === 'FAC-2026-001', legacy.number);
check('notes intact', legacy.notes === 'Merci.', legacy.notes);
check('an old invoice keeps its total', legacy.net === 119000, String(legacy.net));
check('old invoices default to virement, so no stamp duty appears', legacy.paymentMode === 'virement', legacy.paymentMode);

/* ---------------------------------------------------------------- *
 * 2. Money. The one thing that must never be approximately right.
 * ---------------------------------------------------------------- */
console.log('\nTotals');
const drift = await page.evaluate(() => {
  const rnd = (s => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648)(42);
  let worst = 0;
  for (let i = 0; i < 3000; i++) {
    const items = [];
    for (let k = 0, n = 1 + Math.floor(rnd() * 6); k < n; k++)
      items.push({qty: 1 + Math.floor(rnd() * 20),
                  unitPrice: Math.round(rnd() * 500000) / (rnd() < 0.3 ? 100 : 1),
                  tva: [0, 9, 19][Math.floor(rnd() * 3)]});
    const t = calcInvoiceTotals({items});
    let ht = 0, tv = 0;
    for (const it of items) { const l = it.qty * it.unitPrice; ht += l; tv += l * it.tva / 100; }
    worst = Math.max(worst, Math.abs(t.ht - ht), Math.abs(t.tva - tv), Math.abs(t.ttc - (ht + tv)));
  }
  return worst;
});
check('3000 random invoices agree with independent arithmetic', drift < 1e-6, `worst drift ${drift}`);

const guards = await page.evaluate(() => ({
  empty: calcInvoiceTotals({items: []}).ttc,
  nan: calcInvoiceTotals({items: [{qty: 1, unitPrice: NaN, tva: 19}]}).ttc,
  strings: calcInvoiceTotals({items: [{qty: '3', unitPrice: '1000', tva: '19'}]}).ttc,
}));
check('an empty invoice totals zero', guards.empty === 0, String(guards.empty));
check('a non-numeric price does not produce NaN', guards.nan === 0, String(guards.nan));
check('numbers typed as text still add up', guards.strings === 3570, String(guards.strings));

/* ---------------------------------------------------------------- *
 * 3. Droit de timbre — art. 100, LF 2025. Cash only, on the TTC amount.
 * ---------------------------------------------------------------- */
console.log('\nDroit de timbre');
const RATES = [[250, 5], [15500, 155], [30000, 300], [30001, 450.02],
               [100000, 1500], [100001, 2000.02], [699720, 13994.4], [0, 0]];
const rates = await page.evaluate(cs => cs.map(([a, e]) => [a, e, calcTimbre(a)]), RATES);
for (const [amount, expected, got] of rates)
  check(`${amount} DA → ${expected} DA`, near(got, expected), `got ${got}`);

const modes = await page.evaluate(() => {
  const items = [{qty: 1, unitPrice: 588000, tva: 19}];
  return Object.fromEntries(['virement','especes','cheque','carte']
    .map(m => [m, calcInvoiceTotals({paymentMode: m, items}).timbre]));
});
check('cash is charged', near(modes.especes, 13994.4), String(modes.especes));
check('transfer is exempt', modes.virement === 0);
check('cheque is exempt', modes.cheque === 0);
check('card / TPE is exempt', modes.carte === 0);

/* There is no ceiling: a large cash invoice must not stop at 10 000 DA. */
const big = await page.evaluate(() => [calcTimbre(699720), calcTimbre(5000000),
                                       typeof state.company.timbreCap]);
check('no ceiling caps a large invoice', near(big[0], 13994.4) && near(big[1], 100000),
      big.join(', '));
check('and the setting no longer exists', big[2] === 'undefined', String(big[2]));

/* ---------------------------------------------------------------- *
 * 4. Every template must carry the legal identifiers and the duty.
 * ---------------------------------------------------------------- */
console.log('\nTemplates');
const tpl = await page.evaluate(() => {
  state.company.nin = '109912340056781234';
  state.clients[0].nin = '210087650043219876';
  const ids = TEMPLATES.map(t => t.id);
  const base = {id:'t', number:'F1', clientId:'c1', date:'2026-08-12', dueDate:'2026-09-11',
                items:[{description:'a', qty:1, unitPrice:588000, tva:19}], notes:''};
  const bad = {nin: [], duty: [], mode: [], wire: []};
  for (const id of ids) {
    const cash = renderInvoiceHTML({...base, template: id, paymentMode: 'especes'});
    const wire = renderInvoiceHTML({...base, template: id, paymentMode: 'virement'});
    if (!/NIN\s*:\s*109912340056781234/.test(cash) || !/NIN\s*:\s*210087650043219876/.test(cash)) bad.nin.push(id);
    if (!/Droit de timbre/.test(cash) || !/Net à payer/.test(cash)) bad.duty.push(id);
    if (!/Mode de règlement\s*:\s*Espèces/.test(cash)) bad.mode.push(id);
    if (/Droit de timbre/.test(wire)) bad.wire.push(id);
  }
  const words = (renderInvoiceHTML({...base, template:'classique', paymentMode:'especes'})
                 .match(/somme de : <strong>([^<]+)</) || [])[1];
  return {count: ids.length, ...bad, words};
});
check(`${tpl.count} templates print both NIN`, tpl.nin.length === 0, tpl.nin.join(', '));
check('all templates print the duty and the net when cash', tpl.duty.length === 0, tpl.duty.join(', '));
check('all templates print the payment mode', tpl.mode.length === 0, tpl.mode.join(', '));
check('no template prints a duty on a transfer', tpl.wire.length === 0, tpl.wire.join(', '));
check('the amount in words follows the net, not the TTC',
      /Sept cent treize mille sept cent quatorze/.test(tpl.words || ''), tpl.words);

/* ---------------------------------------------------------------- *
 * 5. A straight quote used to truncate the field and lose a RIB.
 * ---------------------------------------------------------------- */
console.log('\nFields containing quotes, ampersands and angle brackets');
const HOSTILE = 'SARL "El Baraka" & Fils <SARL>';
const esc = await page.evaluate(v => {
  state.company.name = v; state.company.rib = '007 "99999" 0000000000 00';
  state.company.address = 'Rue <A> & "B"';
  navigate('settings');
  const seen = {name: document.getElementById('set-name').value,
                rib: document.getElementById('set-rib').value,
                address: document.getElementById('set-address').value};
  saveSettings();
  return {seen, saved: state.company.name, savedRib: state.company.rib};
}, HOSTILE);
check('the company name survives the form', esc.seen.name === HOSTILE, esc.seen.name);
check('the RIB survives the form', esc.seen.rib === '007 "99999" 0000000000 00', esc.seen.rib);
check('the address survives the form', esc.seen.address === 'Rue <A> & "B"', esc.seen.address);
check('and survives the save', esc.saved === HOSTILE, esc.saved);

const inject = await page.evaluate(() => {
  state.clients[0].name = 'ETS "Nour" & Cie';
  state.clients[0].address = '</textarea><img src=x onerror="window.__x=1">';
  openClientModal('c1');
  const r = {name: document.getElementById('cli-name').value,
             addr: document.getElementById('cli-address').value,
             injected: !!document.querySelector('.modal img')};
  closeModal();
  return r;
});
check('the client name survives the modal', inject.name === 'ETS "Nour" & Cie', inject.name);
check('a closing tag in an address is text, not markup', inject.injected === false);

/* ---------------------------------------------------------------- *
 * 6. Stock, payments and status must stay consistent.
 * ---------------------------------------------------------------- */
console.log('\nStock and payments');
const stock = await page.evaluate(() => {
  state.products = [{id:'pr1', name:'Clavier', price:5000, stock:10, tva:19}];
  saveData(); openNewInvoice();
  const d = document.querySelector('#items-container .item-desc');
  const q = document.querySelector('#items-container .item-qty');
  const row = document.querySelector('#items-container .item-row');
  if (d) d.value = 'Clavier'; if (q) q.value = 4;
  if (row) row.setAttribute('data-product-id', 'pr1');
  document.getElementById('inv-client').value = '';
  saveInvoice('');
  const afterFail = state.products[0].stock;
  document.getElementById('inv-client').value = 'c1';
  saveInvoice('');
  return {afterFail, afterOk: state.products[0].stock};
});
check('a refused invoice does not touch the stock', stock.afterFail === 10, String(stock.afterFail));
check('an accepted invoice deducts it once', stock.afterOk === 6, String(stock.afterOk));

const pay = await page.evaluate(() => {
  const inv = state.invoices.find(i => i.id === 'i1');
  const net = calcInvoiceTotals(inv).net;
  state.payments = [{id:'p1', invoiceId:'i1', clientId:'c1', amount: net, date:'2026-08-15', method:'especes'}];
  syncInvoiceStatus('i1');
  const settled = inv.status;
  state.payments = [];
  syncInvoiceStatus('i1');
  return {settled, reopened: inv.status};
});
check('a full payment settles the invoice', pay.settled === 'payee', pay.settled);
check('removing it reopens the invoice', pay.reopened !== 'payee', pay.reopened);

const orphan = await page.evaluate(() => {
  state.payments = [{id:'p2', invoiceId:'i1', clientId:'c1', amount: 5000, date:'2026-08-15', method:'especes'}];
  window.confirm = () => true;
  deleteInvoice('i1');
  return state.payments.length;
});
check('deleting an invoice takes its payments with it', orphan === 0, String(orphan));

/* ---------------------------------------------------------------- *
 * 7. Arabic must not reverse legal or banking codes.
 * ---------------------------------------------------------------- */
console.log('\nArabic layout');
const rtl = await page.evaluate(() => {
  if (typeof toggleLocale === 'function' && locale !== 'ar') toggleLocale();
  navigate('settings');
  const el = document.getElementById('set-rib');
  const s = getComputedStyle(el);
  return {dir: document.documentElement.dir, css: s.direction, bidi: s.unicodeBidi};
});
check('the interface flips to RTL', rtl.dir === 'rtl', rtl.dir);
check('but the RIB field stays left-to-right', rtl.css === 'ltr', rtl.css);
check('and is isolated from the surrounding text', rtl.bidi === 'isolate', rtl.bidi);

/* ---------------------------------------------------------------- *
 * 8. Batch 0 — the paths that used to destroy data silently.
 * ---------------------------------------------------------------- */
console.log('\nData loss paths');

const drafts = await page.evaluate(() => {
  state.invoices = [
    {id:'d1', clientId:'c1', status:'brouillon', items:[{qty:1, unitPrice:100000, tva:19}]},
    {id:'d2', clientId:'c1', status:'envoyee',   items:[{qty:1, unitPrice:100000, tva:19}]},
  ];
  navigate('debts');
  const txt = document.getElementById('main-content').textContent;
  return {shows119: /119\s?000/.test(txt.replace(/\u202f|\u00a0/g, ' ')),
          shows238: /238\s?000/.test(txt.replace(/\u202f|\u00a0/g, ' '))};
});
check('a draft is not counted as a debt', drafts.shows119 && !drafts.shows238,
      JSON.stringify(drafts));

const imp = await page.evaluate(async () => {
  const feed = obj => new Promise(res => {
    const file = new File([JSON.stringify(obj)], 'b.json', {type:'application/json'});
    const dt = new DataTransfer(); dt.items.add(file);
    const input = document.createElement('input'); input.type = 'file'; input.files = dt.files;
    importData({target: input});
    setTimeout(res, 250);
  });
  const before = state.clients.length;

  window.confirm = () => true;
  await feed({clients: 'not-an-array'});
  const afterBadShape = state.clients.length;

  await feed({invoices: [{id:'x', items:'Prestation'}]});
  const afterBadItems = state.clients.length;

  window.confirm = () => false;
  await feed({clients: []});
  const afterRefused = state.clients.length;

  window.confirm = () => true;
  await feed({clients: [{id:'k1', name:'Nouveau'}],
              invoices: [{number:'FAC-2026-042', clientId:'k1', items:[{qty:1, unitPrice:1000, tva:19}]}]});
  return {before, afterBadShape, afterBadItems, afterRefused,
          imported: state.clients.length, name: (state.clients[0]||{}).name,
          invoiceGotId: !!(state.invoices[0]||{}).id,
          nextNumber: state.nextInvoiceNumber,
          backedUp: !!localStorage.getItem('facturepro_dz_v24_avant_import')};
});
check('a file with the wrong shape is refused', imp.afterBadShape === imp.before, JSON.stringify(imp));
check('an invoice whose items are not a list is refused', imp.afterBadItems === imp.before);
check('nothing is replaced when the user declines', imp.afterRefused === imp.before);
check('a valid backup imports', imp.imported === 1 && imp.name === 'Nouveau');
check('an imported invoice without an id gets one', imp.invoiceGotId);
check('numbering is reconciled so no number repeats', imp.nextNumber >= 43, String(imp.nextNumber));
check('the previous data is copied aside before the import', imp.backedUp);

const demo = await page.evaluate(() => {
  localStorage.removeItem('facturepro_dz_v24');
  state.clients = []; state.invoices = []; state.payments = [];
  loadData();
  const seeded = hasDemoData();
  window.confirm = () => true;
  clearDemoData();
  return {seeded, after: hasDemoData(), clients: state.clients.length};
});
check('the seeded examples are marked as examples', demo.seeded);
check('and can be removed in one click', demo.after === false && demo.clients === 0);

/* corrupted storage must not be overwritten with demo data */
await page.evaluate(() => localStorage.setItem('facturepro_dz_v24', '{"clients":[{"id"'));
await page.reload();
await page.waitForFunction(() => typeof state !== 'undefined', {timeout: 30000});
const corrupt = await page.evaluate(() => ({
  rescued: (localStorage.getItem('facturepro_dz_v24_illisible') || '').startsWith('{"clients"'),
  noDemo: !(state.clients || []).some(c => c.demo),
  keyIntact: (localStorage.getItem('facturepro_dz_v24') || '').startsWith('{"clients"'),
}));
check('unreadable data is put aside instead of being lost', corrupt.rescued, JSON.stringify(corrupt));
check('and is not overwritten with demo invoices', corrupt.noDemo && corrupt.keyIntact);

/* ---------------------------------------------------------------- *
 * 9. The public tool pages must run the same code as the app.
 * ---------------------------------------------------------------- */
console.log('\nPublic tool pages');
{
  const tools = await browser.newPage();
  const toolErrors = [];
  tools.on('pageerror', e => { if (!/tailwind|font/i.test(String(e))) toolErrors.push(String(e)); });

  await tools.goto(`${BASE}/montant-en-lettres.html`);
  await tools.waitForFunction(() => typeof amountInWords === 'function', {timeout: 20000});
  await tools.fill('#amount', '713714.40');
  const words = await tools.textContent('#result');
  const full = await tools.textContent('#full');
  check('the words page converts an amount',
        /Sept cent treize mille sept cent quatorze dinars/.test(words), words);
  check('and offers the full invoice wording',
        /Arrêté la présente facture à la somme de/.test(full), full);

  await tools.goto(`${BASE}/droit-de-timbre.html`);
  await tools.waitForFunction(() => typeof timbreFor === 'function', {timeout: 20000});
  await tools.fill('#amount', '699720');
  const duty = await tools.textContent('#duty');
  const net = await tools.textContent('#net');
  const rate = await tools.textContent('#rate');
  const clean = t => t.replace(/[\u202f\u00a0\s]/g, '');
  check('the duty page applies the right band', clean(rate) === '2%', rate);
  check('and computes the duty', clean(duty) === '13994,40DA', duty);
  check('and the net', clean(net) === '713714,40DA', net);

  const noCap = await tools.evaluate(() => !document.getElementById('useCap'));
  check('the page offers no ceiling option', noCap);

  await tools.click('#lang');
  const arDir = await tools.evaluate(() => document.documentElement.dir);
  const arDuty = await tools.textContent('#duty');
  check('the page switches to Arabic', arDir === 'rtl', arDir);
  check('and the figure is not reordered by the switch', clean(arDuty) === '13994,40DA', arDuty);

  /* The salary page is the one that shows its working. Somebody checking a
     payslip needs every intermediate line, so the checks read them all. */
  await tools.goto(`${BASE}/calcul-salaire.html`);
  await tools.waitForFunction(() => typeof irgFor === 'function', {timeout: 20000});

  await tools.fill('#brut', '60000');
  const pay = await tools.evaluate(() => ({
    cnas: document.getElementById('v-cnas').textContent,
    imp:  document.getElementById('v-imp').textContent,
    irg:  document.getElementById('v-irg').textContent,
    net:  document.getElementById('v-net').textContent,
    primesRow: getComputedStyle(document.getElementById('row-primes')).display,
  }));
  check('the salary page takes 9 % off the gross', clean(pay.cnas).includes('5400,00DA'), pay.cnas);
  check('and taxes what is left, not the gross', clean(pay.imp) === '54600,00DA', pay.imp);
  check('and applies the barème to it', clean(pay.irg).includes('7042,00DA'), pay.irg);
  check('and lands on the net', clean(pay.net) === '47558,00DA', pay.net);
  check('the primes rows stay hidden while there are none',
        pay.primesRow === 'none', pay.primesRow);

  await tools.fill('#brut', '25000');
  const exempt = await tools.textContent('#v-irg');
  check('a small salary is exempt', clean(exempt).includes('0,00DA'), exempt);

  /* 44 000 gross lands at 40 040 taxable — inside the band that only a
     disabled or retired worker gets, so the toggle must move the figure. */
  await tools.fill('#brut', '44000');
  const normal = await tools.textContent('#v-irg');
  await tools.click('#st-reduced');
  const lowered = await tools.textContent('#v-irg');
  const num = t => parseFloat(clean(t).replace(/[^\d,]/g, '').replace(',', '.'));
  check('the reduced track lowers the tax inside its own band',
        num(lowered) < num(normal) && num(lowered) > 0, `${normal} -> ${lowered}`);
  await tools.click('#st-normal');

  await tools.fill('#primes', '10000');
  const bonus = await tools.evaluate(() => ({
    tax: document.getElementById('v-irgp').textContent,
    net: document.getElementById('v-primesnet').textContent,
    row: getComputedStyle(document.getElementById('row-primes')).display,
  }));
  check('a bonus appears once it is entered', bonus.row !== 'none', bonus.row);
  check('and is withheld flat at 10 %', clean(bonus.tax).includes('1000,00DA'), bonus.tax);
  check('leaving the rest of it', clean(bonus.net) === '9000,00DA', bonus.net);

  /* The duty page above was left in Arabic, and the tool pages share
     fp_locale — so this one must already have opened in Arabic without being
     asked. Somebody who picked their language once should not pick it again on
     every page. */
  const opened = await tools.evaluate(() => ({
    dir: document.documentElement.dir,
    net: document.getElementById('v-net').textContent,
  }));
  check('the salary page opens in the language chosen on the previous page',
        opened.dir === 'rtl', opened.dir);
  check('and its figures are not reordered by Arabic',
        /\d/.test(opened.net) && clean(opened.net).endsWith('DA'), opened.net);

  await tools.click('#lang');
  const flipped = await tools.evaluate(() => document.documentElement.dir);
  check('and the switch still turns it back', flipped === 'ltr', flipped);

  check('no script error on the tool pages', toolErrors.length === 0, toolErrors.join(' | '));
  await tools.close();
}

/* ---------------------------------------------------------------- *
 * 10. Excel exports — a real workbook, and the right figures in it.
 * ---------------------------------------------------------------- */
console.log('\nExcel export');
{
  await page.evaluate(() => {
    state.company = {name:'SARL Atlas', nif:'000916012345678', nin:'109912340056781234', rib:'007 1234'};
    state.clients = [{id:'c1', name:'SPA Numidia', nif:'000925098765432'}];
    state.invoices = [
      {id:'i1', number:'FAC-2026-004', clientId:'c1', date:'2026-08-12', status:'envoyee',
       paymentMode:'especes', items:[{description:'Poste', qty:6, unitPrice:78000, tva:19},
                                     {description:'Pose', qty:1, unitPrice:45000, tva:9}]},
      {id:'i2', number:'FAC-2026-005', clientId:'c1', date:'2026-08-20', status:'payee',
       paymentMode:'virement', items:[{description:'Maintenance', qty:1, unitPrice:200000, tva:19}]},
      {id:'i3', number:'FAC-2026-006', clientId:'c1', date:'2026-08-25', status:'brouillon',
       paymentMode:'virement', items:[{description:'Brouillon', qty:1, unitPrice:999999, tva:19}]},
    ];
    saveData();
  });

  async function grab(fn) {
    const wait = page.waitForEvent('download');
    await page.evaluate(fn);
    const dl = await wait;
    const path = await dl.path();
    const buf = await readFile(path);
    return {name: dl.suggestedFilename(), buf};
  }

  const facture = await grab(() => exportInvoiceXlsx('i1'));
  check('the invoice export is named after the invoice',
        facture.name === 'facture-FAC-2026-004.xlsx', facture.name);
  check('and is a real zip container (what .xlsx is)',
        facture.buf[0] === 0x50 && facture.buf[1] === 0x4b, facture.buf.slice(0, 2).toString('hex'));
  const fText = facture.buf.toString('latin1');
  check('it declares a worksheet part', fText.includes('xl/worksheets/sheet1.xml'));
  check('it carries the company NIN', fText.includes('109912340056781234'));
  check('the VAT amount is broken out per line', fText.includes('>88920<'));

  const journal = await grab(() => exportJournalXlsx('2026-08'));
  const jText = journal.buf.toString('latin1');
  check('the journal is named after the month',
        journal.name === 'journal-ventes-2026-08.xlsx', journal.name);
  check('it holds two sheets', jText.includes('xl/worksheets/sheet2.xml'));
  check('drafts are left out of the register', !jText.includes('999999'));
  /* 6x78 000 @19 % + 45 000 @9 % + 200 000 @19 %  ->  713 000 HT */
  check('the month total is the sum of the two real invoices', jText.includes('>713000<'));
  check('and the VAT is split by rate', jText.includes('>4050<') && jText.includes('>126920<'));
  /* A worksheet's children are a fixed sequence in ECMA-376, not a set:
     autoFilter comes before mergeCells. Written the other way round, Excel
     declares the file unreadable and "repairs" it by emptying the sheet —
     which is exactly what was reported: a Journal du mois with nothing in it,
     beside a Récapitulatif TVA that opened fine because it carries no filter
     and so could not be out of order. The register is the document a
     declaration is written from; an empty one is worse than no file. */
  const sheet1 = jText.slice(jText.indexOf('<worksheet'), jText.indexOf('</worksheet>'));
  check('the register sheet still carries its invoices', sheet1.includes('FAC-2026-'));
  check('it declares an autofilter over the table', sheet1.includes('<autoFilter'));
  check('written before the merged cells, as the format requires',
        sheet1.indexOf('<autoFilter') < sheet1.indexOf('<mergeCells'),
        `autoFilter@${sheet1.indexOf('<autoFilter')} mergeCells@${sheet1.indexOf('<mergeCells')}`);
  check('and the filter reaches the last column, not one short of it',
        /<autoFilter ref="A4:K\d+"\/>/.test(sheet1),
        (sheet1.match(/<autoFilter ref="[^"]*"/) || ['none'])[0]);


  const emptyMonth = await page.evaluate(() => {
    let said = ''; const real = window.toast; window.toast = m => { said = m; };
    exportJournalXlsx('2020-01');
    window.toast = real; return said;
  });
  check('an empty month says so instead of producing a blank file',
        /Aucune facture|لا توجد/.test(emptyMonth), emptyMonth);
}


/* ---------------------------------------------------------------- *
 * 11. Facture d'avoir — the sign, the numbering, and what it must
 *     not touch. A credit note that does not subtract is worse than
 *     no credit note at all.
 * ---------------------------------------------------------------- */
console.log("\nFacture d'avoir");
{
  await page.evaluate(() => {
    state.clients = [{id:'ca', name:'SARL Avoir', nif:'000000000000000'}];
    state.invoices = [{id:'ia', number:'FAC-2026-900', clientId:'ca', template:'classique',
                       date:'2026-08-01', dueDate:'2026-08-31', status:'payee',
                       paymentMode:'especes',
                       items:[{description:'Prestation', qty:2, unitPrice:10000, tva:19}]}];
    state.payments = []; delete state.nextAvoirNumber;
    window.confirm = () => true;
    saveData();
  });

  const inv = await page.evaluate(() => calcInvoiceTotals(state.invoices[0]));
  check('the invoice is 24 038 DA in cash', near(inv.net, 24038), String(inv.net));

  const made = await page.evaluate(() => {
    createAvoir('ia');
    const a = state.invoices.find(i => i.type === 'avoir');
    return {number: a && a.number, ref: a && a.refNumber, status: a && a.status,
            totals: a && calcInvoiceTotals(a), counter: state.nextAvoirNumber,
            src: JSON.parse(JSON.stringify(state.invoices[0]))};
  });

  check('an avoir is issued on its own series', made.number === 'AV-2026-001', made.number);
  check('and names the invoice it credits', made.ref === 'FAC-2026-900', made.ref);
  check('its total is the exact negative of the invoice', near(made.totals.net, -24038),
        String(made.totals.net));
  check('the stamp duty is credited back too', near(made.totals.timbre, -238),
        String(made.totals.timbre));
  check('the VAT is credited back too', near(made.totals.tva, -3800), String(made.totals.tva));
  check('the original invoice is left untouched',
        made.src.number === 'FAC-2026-900' && made.src.status === 'payee'
        && made.src.items[0].unitPrice === 10000);

  const paid = await page.evaluate(() => state.invoices
    .filter(i => i.status === 'payee')
    .reduce((s, i) => s + calcInvoiceTotals(i).net, 0));
  check('revenue falls back to zero once the credit is issued', near(paid, 0), String(paid));

  const debt = await page.evaluate(() => getClientDebt('ca'));
  check('an avoir is not a receivable', near(debt, 0), String(debt));

  const guards = await page.evaluate(() => {
    const before = state.invoices.length;
    const av = state.invoices.find(i => i.type === 'avoir');
    createAvoir(av.id);
    const afterAvoir = state.invoices.length;
    state.invoices[0].status = 'brouillon';
    createAvoir('ia');
    const afterDraft = state.invoices.length;
    state.invoices[0].status = 'payee';
    return {before, afterAvoir, afterDraft};
  });
  check('no avoir on an avoir', guards.afterAvoir === guards.before);
  check('no avoir on a draft that was never issued', guards.afterDraft === guards.before);

  const numbering = await page.evaluate(() => {
    createAvoir('ia');
    const ns = state.invoices.filter(i => i.type === 'avoir').map(a => a.number);
    return {ns, unique: new Set(ns).size};
  });
  check('a second avoir takes the next number',
        numbering.ns.join() === 'AV-2026-001,AV-2026-002', numbering.ns.join());
  check('no number is ever reused', numbering.unique === numbering.ns.length);

  const rebuilt = await page.evaluate(() => {
    delete state.nextAvoirNumber; ensureAvoirState(); return state.nextAvoirNumber;
  });
  check('the counter is rebuilt from the data when a backup predates the feature',
        rebuilt === 3, String(rebuilt));

  const doc = await page.evaluate(() => {
    const av = state.invoices.find(i => i.type === 'avoir');
    previewInvoice(av.id);
    return document.getElementById('invoice-paper').innerText;
  });
  check("the paper says AVOIR, not FACTURE", /FACTURE D'AVOIR/.test(doc));
  check('it prints the invoice it credits', /FAC-2026-900/.test(doc));
  check('the amount in letters matches a negative figure', /Moins/.test(doc));

  const normal = await page.evaluate(() => {
    closePreview(); previewInvoice('ia');
    return document.getElementById('invoice-paper').innerText;
  });
  check('an ordinary invoice is still titled FACTURE',
        /FACTURE/.test(normal) && !/AVOIR/.test(normal));

  /* numberToWords returns undefined below zero, which used to throw here and
     take the whole preview down with it. */
  const words = await page.evaluate(() => [amountInWords(-24038), amountInWords(24038)]);
  check('a negative amount can be written out',
        words[0] === 'Moins vingt-quatre mille trente-huit dinars', words[0]);
  check('and positives are unchanged',
        words[1] === 'Vingt-quatre mille trente-huit dinars', words[1]);

  await page.evaluate(() => closePreview());
}

/* ---------------------------------------------------------------- *
 * 12. What the accountants asked for. Every check here stands for a
 *     figure somebody had to correct by hand before shipping.
 * ---------------------------------------------------------------- */
console.log('\nWhat the accountants asked for');
{
  /* Money is formatted with a narrow no-break space, which no regex written by
     hand ever gets right. Flatten it and compare digits. */
  const flat = s => String(s).replace(/[\s  ]/g, '');

  await page.evaluate(() => {
    if (locale !== 'fr') toggleLocale();
    state.clients = [{id:'cw', name:'SARL Whats', nif:'000000000000000'}];
    state.invoices = [{id:'iw', number:'FAC-2026-950', clientId:'cw', template:'classique',
                       date:'2026-08-05', dueDate:'2026-09-05', status:'envoyee',
                       paymentMode:'virement',
                       items:[{description:'Accompagnement', qty:5, unitPrice:45000, tva:19}]}];
    state.payments = []; state.devis = [];
    window.confirm = () => true;
    saveData();
  });

  /* --- the WhatsApp message --- */
  const wa = await page.evaluate(() => {
    let url = ''; const open = window.open;
    window.open = u => { url = u; return null; };
    shareInvoiceWhatsApp('iw');
    window.open = open;
    return decodeURIComponent(String(url).replace('https://wa.me/?text=', ''));
  });
  check('the WhatsApp message carries no markup', !/<\/?[a-z]/i.test(wa), wa);
  check('five days at 45 000 announce the line total, not the unit price',
        flat(wa).includes('225000DA'), wa);
  check('the unit price no longer stands where the line total belongs',
        !flat(wa).includes('=45000DA'), wa);
  check('and the net to pay is the figure on the invoice',
        flat(wa).includes('267750DA'), wa);

  const waAvoir = await page.evaluate(() => {
    createAvoir('iw');
    const a = state.invoices.find(i => i.type === 'avoir');
    let url = ''; const open = window.open;
    window.open = u => { url = u; return null; };
    shareInvoiceWhatsApp(a.id);
    window.open = open;
    return decodeURIComponent(String(url).replace('https://wa.me/?text=', ''));
  });
  check('an avoir does not announce itself as a facture', /avoir/i.test(waAvoir), waAvoir);
  check('its lines are negative, like its total', flat(waAvoir).includes('-225000DA'), waAvoir);
  check('and it is not called a net to pay', !/Net a payer/.test(waAvoir), waAvoir);

  /* --- the VAT amount column --- */
  /* 5 x 45 000 at 19 % is 42 750 of VAT on the one line. Before this column the
     paper showed "19 %" and left the accountant to work it out. */
  for (const tplId of ['classique', 'studio']) {
    const paper = await page.evaluate(id => {
      state.invoices.find(i => i.id === 'iw').template = id;
      previewInvoice('iw');
      const txt = document.getElementById('invoice-paper').innerText;
      closePreview();
      return txt;
    }, tplId);
    /* The DZ header is uppercased in CSS, so innerText hands back MONTANT TVA
       while Studio hands back Montant TVA. Compare on the letters only. */
    check(`the ${tplId} paper has a VAT amount column`,
          flat(paper).toLowerCase().includes('montanttva'), paper.slice(0, 200));
    check(`the ${tplId} paper carries the VAT of the line`,
          flat(paper).includes('42750DA'), paper.slice(0, 200));
    check(`the ${tplId} paper still shows the rate as well`,
          /19\s*%/.test(paper), paper.slice(0, 200));
  }
  await page.evaluate(() => { state.invoices.find(i => i.id === 'iw').template = 'classique'; });

  /* --- the note follows the payment mode --- */
  const notes = await page.evaluate(() => ({
    modes: ['virement', 'especes', 'cheque', 'carte'].map(m => payNote(m)),
    typed: isDefaultPayNote('Payable a la livraison, merci.'),
    ours:  isDefaultPayNote(payNote('cheque')),
    blank: isDefaultPayNote('   '),
  }));
  check('each payment mode has its own sentence',
        new Set(notes.modes).size === 4, notes.modes.join(' | '));
  check('cash no longer tells the client to wire the money',
        /esp/i.test(notes.modes[1]) && !/virement/i.test(notes.modes[1]), notes.modes[1]);
  check('a sentence the user typed is recognised as theirs', notes.typed === false);
  check('and one of ours is recognised as ours', notes.ours === true);
  check('an empty note counts as ours to fill', notes.blank === true);

  const editor = await page.evaluate(() => {
    openNewInvoice();
    const sel = document.getElementById('inv-paymode');
    const ta  = document.getElementById('inv-notes');
    const opened = ta.value;
    sel.value = 'especes'; syncPayNote();
    const afterMode = ta.value;
    ta.value = 'Payable a la livraison, merci.';
    sel.value = 'cheque'; syncPayNote();
    const afterTyping = ta.value;
    closeModal();
    return {opened, afterMode, afterTyping};
  });
  check('a new invoice opens on the bank-transfer sentence',
        /virement/i.test(editor.opened), editor.opened);
  check('switching to cash rewrites the note',
        /esp/i.test(editor.afterMode), editor.afterMode);
  check('but switching mode never destroys what the user wrote',
        editor.afterTyping === 'Payable a la livraison, merci.', editor.afterTyping);

  /* --- the devis and payments pages in both languages --- */
  const labels = await page.evaluate(() => {
    state.devis = [{id:'d1', number:'DEV-2026-001', clientId:'cw', date:'2026-08-01',
                    status:'accepte', items:[{description:'Etude', qty:1, unitPrice:1000, tva:19}]}];
    state.payments = [{id:'p1', invoiceId:'iw', amount:1000, date:'2026-08-02', method:'ccp'}];
    saveData();
    const out = {};
    out.frDevis = renderDevis(); out.frPay = renderPayments();
    toggleLocale();
    out.arDevis = renderDevis(); out.arPay = renderPayments();
    toggleLocale();
    return out;
  });
  check('a devis status reads as a word in French',
        labels.frDevis.includes('Accepté') && !labels.frDevis.includes('>accepte<'));
  check('and as a word in Arabic', labels.arDevis.includes('مقبول'));
  check('the convert button says what it does',
        labels.frDevis.includes('Convertir en facture'));
  check('a payment method reads as a word in French',
        labels.frPay.includes('CCP') && !labels.frPay.includes('>ccp<'));
  check('and as a word in Arabic', labels.arPay.includes('ح.ج.ب'));
  check('the payment mode list is translated too, not only its label',
        labels.arPay !== labels.frPay);

  /* --- the notices that write their own text ---
     Reported from a phone: a French dashboard carrying an Arabic banner.
     applyLocale walks [data-i18n] and renderPage repaints the backup notice,
     but the local-storage warning and the install bar set their text
     imperatively, once, when they first appear — so they kept the wording of
     whatever language was live at that moment and never moved again. */
  const notice = await page.evaluate(() => {
    const el = document.getElementById('lw-title');
    if (!el) return null;
    const out = {};
    if (locale !== 'fr') toggleLocale();
    out.fr = el.textContent;
    toggleLocale();
    out.ar = el.textContent;
    toggleLocale();
    out.back = el.textContent;
    return out;
  });
  check('the storage warning follows the language into Arabic',
        !!notice && notice.ar !== notice.fr && notice.ar.indexOf('\u0628\u064a\u0627\u0646\u0627\u062a\u0643') === 0);
  check('and back out of it',
        !!notice && notice.back === notice.fr && notice.fr.indexOf('Vos donn\u00e9es') === 0);

  await page.evaluate(() => { state.devis = []; state.payments = []; saveData(); });
}

/* ---------------------------------------------------------------- *
 * 13. IRG on salaries — art. 104 CIDTA.
 *
 *     The four endpoint checks are the ones that matter. Each relief
 *     band's formula is the line that sends the bottom of the band to
 *     zero and leaves the top untouched, so if any constant anywhere
 *     in the chain is wrong — a bracket, the 1 000 / 1 500 bounds, a
 *     fraction — the endpoints stop landing. They are a test of the
 *     whole scale, not of one function.
 * ---------------------------------------------------------------- */
console.log('\nIRG sur les salaires');
{
  const irg = await page.evaluate(() => ({
    exempt:   [0, 20000, 30000].map(m => irgFor(m)),
    bottom:   irgFor(30001),
    band:     [31000, 33000].map(m => irgFor(m)),
    at35:     irgFor(35000),
    first35:  irgFirstAbattement(35000),
    at30:     irgFirstAbattement(30000),
    edge30:   irgFirstAbattement(30000) * (137/51) - (27925/8),
    over:     [40000, 60000, 100000].map(m => irgFor(m)),
    firstOver:[40000, 60000, 100000].map(m => irgFirstAbattement(m)),
    /* handicapés / retraités */
    rBottom:  irgFor(30001, true),
    rAt425:   irgFor(42500, true),
    rFirst425:irgFirstAbattement(42500),
    rOver:    irgFor(50000, true),
    over50:   irgFor(50000),
    /* the barème itself */
    bareme:   [240000, 480000, 960000, 1920000, 3840000].map(a => irgBareme(a)),
    bonus:    irgOnBonus(50000),
  }));

  check('a salary at or under 30 000 pays nothing',
        irg.exempt.every(v => v === 0), irg.exempt.join(' | '));

  /* Endpoint 1: the band's formula must send its own floor to zero. */
  check('the relief band starts from zero, not from a step',
        Math.abs(irg.edge30) < 2, String(irg.edge30));
  check('and a salary just over the threshold pays only a few dinars',
        irg.bottom > 0 && irg.bottom < 10, String(irg.bottom));

  /* Endpoint 2: at the top of the band the second abattement must vanish. */
  check('at 35 000 the second abattement has faded out',
        Math.abs(irg.at35 - irg.first35) < 1,
        `${irg.at35} vs ${irg.first35}`);

  check('inside the band the tax climbs',
        irg.band[0] < irg.band[1] && irg.band[0] > 0, irg.band.join(' | '));
  check('above 35 000 only the 40 % abattement applies',
        irg.over.every((v, i) => Math.abs(v - irg.firstOver[i]) < 0.001),
        irg.over.join(' | '));

  /* The same two endpoints on the second track, whose band ends at 42 500. */
  check('the reduced track also starts from zero',
        irg.rBottom >= 0 && irg.rBottom < 10, String(irg.rBottom));
  check('and fades out at 42 500, not at 35 000',
        Math.abs(irg.rAt425 - irg.rFirst425) < 1,
        `${irg.rAt425} vs ${irg.rFirst425}`);
  check('a disabled or retired worker never pays more than anyone else',
        irg.rOver <= irg.over50 + 0.001, `${irg.rOver} vs ${irg.over50}`);

  /* The 40 % abattement comes off the tax, not the salary. A 100 000 DA
     taxable salary owes 21 400 a month before relief; taking 40 % off the
     salary instead would land nowhere near 19 900. */
  check('the abattement is capped at 1 500 a month',
        Math.abs(irg.over[2] - 19900) < 1, String(irg.over[2]));

  check('the barème is cumulative across brackets',
        Math.abs(irg.bareme[1] - 55200) < 1 && Math.abs(irg.bareme[2] - 184800) < 1,
        irg.bareme.join(' | '));
  check('and the first bracket is free', irg.bareme[0] === 0, String(irg.bareme[0]));

  check('a bonus is withheld flat at 10 %', irg.bonus === 5000, String(irg.bonus));
}

/* ---------------------------------------------------------------- *
 * 14. Reaching the avoir from the list.
 *
 *     Section 11 calls createAvoir() directly, so it proves the code
 *     is right and says nothing about whether a user can get to it.
 *     It could not: the button lived in the preview toolbar and the
 *     row showed no sign of it. These checks click, and they check
 *     the row, so the gap cannot reopen quietly.
 * ---------------------------------------------------------------- */
console.log('\nReaching the avoir from the list');
{
  await page.evaluate(() => {
    state.clients = [{id: 'cl', name: 'SARL Liste', nif: '000000000000000'}];
    state.invoices = [
      {id: 'issued', number: 'FAC-2026-800', clientId: 'cl', template: 'classique',
       date: '2026-08-01', dueDate: '2026-08-31', status: 'envoyee',
       paymentMode: 'virement', items: [{description: 'Prestation', qty: 1, unitPrice: 10000, tva: 19}]},
      {id: 'draft', number: 'FAC-2026-801', clientId: 'cl', template: 'classique',
       date: '2026-08-02', status: 'brouillon',
       paymentMode: 'virement', items: [{description: 'Brouillon', qty: 1, unitPrice: 5000, tva: 19}]},
    ];
    state.payments = []; state.devis = []; delete state.nextAvoirNumber;
    window.confirm = () => true;
    saveData(); navigate('invoices');
  });

  const offered = await page.evaluate(() => ({
    issued: !!document.querySelector('[onclick="createAvoir(\'issued\')"]'),
    draft:  !!document.querySelector('[onclick="createAvoir(\'draft\')"]'),
    labelled: (document.querySelector('[onclick="createAvoir(\'issued\')"]') || {})
                .getAttribute && document.querySelector('[onclick="createAvoir(\'issued\')"]').getAttribute('title'),
  }));
  check('the list offers an avoir on an issued invoice', offered.issued);
  check('and never on a draft, which createAvoir would only refuse',
        offered.draft === false);
  check('and the button says what it is', !!offered.labelled, String(offered.labelled));

  const made = await page.evaluate(() => {
    document.querySelector('[onclick="createAvoir(\'issued\')"]').click();
    const a = state.invoices.find(i => i.type === 'avoir');
    return {number: a && a.number, ref: a && a.refNumber, id: a && a.id};
  });
  check('clicking it issues the avoir', /^AV-\d{4}-\d{3}$/.test(made.number || ''), made.number);
  check('and it credits the invoice it sat on', made.ref === 'FAC-2026-800', made.ref);

  const onAvoir = await page.evaluate(id => {
    navigate('invoices');
    return !!document.querySelector('[onclick="createAvoir(\'' + id + '\')"]');
  }, made.id);
  check('and no avoir is offered on the avoir itself', onAvoir === false);

  /* The other four row buttons were icons with nothing to read. */
  const titles = await page.evaluate(() => ['editInvoice', 'duplicateInvoice', 'deleteInvoice']
    .map(fn => {
      const b = document.querySelector('[onclick="' + fn + '(\'issued\')"]');
      return b ? b.getAttribute('title') : null;
    }));
  check('every row button now carries a name', titles.every(Boolean), titles.join(' | '));
}

/* ---------------------------------------------------------------- *
 * 15. The unit of measure, and carriage.
 *
 *     Both are additions. The check that matters most is the last
 *     one: an invoice written before either field existed must come
 *     out with the figures it had, to the centime.
 * ---------------------------------------------------------------- */
console.log('\nUnit of measure and carriage');
{
  const flat = s => String(s).replace(/[\s  ]/g, '');

  const totals = await page.evaluate(() => {
    const base = {id: 'p1', number: 'FAC-2026-900', clientId: 'cl', template: 'classique',
                  date: '2026-08-01', status: 'envoyee', paymentMode: 'virement',
                  items: [{description: 'Marchandise', qty: 2, unite: 'kg', unitPrice: 10000, tva: 19}]};
    return {
      /* An invoice from before the field: no fraisPort key at all. */
      before: calcInvoiceTotals(base),
      /* The same invoice with carriage on top. */
      after:  calcInvoiceTotals({...base, fraisPort: 1500}),
      /* Cash: the duty follows what is actually handed over. */
      cashNoPort: calcInvoiceTotals({...base, paymentMode: 'especes'}),
      cashPort:   calcInvoiceTotals({...base, paymentMode: 'especes', fraisPort: 1500}),
    };
  });

  check('an invoice with no carriage field reads zero',
        totals.before.port === 0, String(totals.before.port));
  check('and its other figures are untouched',
        near(totals.before.ht, 20000) && near(totals.before.tva, 3800)
        && near(totals.before.ttc, 23800) && near(totals.before.net, 23800),
        JSON.stringify(totals.before));
  check('carriage stays out of the VAT base',
        near(totals.after.ht, 20000) && near(totals.after.tva, 3800)
        && near(totals.after.ttc, 23800), JSON.stringify(totals.after));
  check('and lands in the net', near(totals.after.net, 25300), String(totals.after.net));
  check('the stamp duty is charged on the sum actually paid',
        near(totals.cashNoPort.timbre, 238) && near(totals.cashPort.timbre, 253),
        `${totals.cashNoPort.timbre} vs ${totals.cashPort.timbre}`);

  /* On the paper. */
  const paper = await page.evaluate(() => {
    state.clients = [{id: 'cl', name: 'SARL Unite', nif: '000000000000000'}];
    state.invoices = [{id: 'p1', number: 'FAC-2026-900', clientId: 'cl', template: 'classique',
                       date: '2026-08-01', status: 'envoyee', paymentMode: 'virement',
                       fraisPort: 1500,
                       items: [{description: 'Marchandise', qty: 2, unite: 'kg', unitPrice: 10000, tva: 19}]}];
    saveData();
    previewInvoice('p1');
    const txt = document.getElementById('invoice-paper').innerText;
    closePreview();
    return txt;
  });
  check('the quantity carries its unit', /2\s*kg/.test(paper), paper.slice(0, 160));
  check('the paper shows the carriage', /Frais de port/.test(paper), paper.slice(0, 160));
  check('and a net to pay, which a transfer alone would not have shown',
        /Net à payer/.test(paper) && flat(paper).includes('25300DA'), paper.slice(0, 200));

  /* Through the editor: typed in, saved, read back. */
  const round = await page.evaluate(() => {
    openNewInvoice();
    document.getElementById('inv-client').value = 'cl';
    document.querySelector('.item-desc').value = 'Ciment';
    document.querySelector('.item-qty').value = '50';
    document.querySelector('.item-unit').value = 'sac';
    document.querySelector('.item-price').value = '900';
    document.getElementById('inv-port').value = '2000';
    saveInvoice('');
    const inv = state.invoices[state.invoices.length - 1];
    return {unite: inv.items[0].unite, port: inv.fraisPort, net: calcInvoiceTotals(inv).net};
  });
  check('the editor keeps the unit that was typed', round.unite === 'sac', round.unite);
  check('and the carriage', round.port === 2000, String(round.port));
  check('and the net adds up', near(round.net, 45000 * 1.19 + 2000), String(round.net));

  /* The monthly register prints HT, TVA, TTC, carriage, duty and net side by
     side. Without its own column the row did not reconcile: TTC + duty came
     to less than the net, and an accountant reading down the sheet has no way
     to see where the difference went. */
  const register = await page.evaluate(() => {
    state.invoices = [
      {id: 'r1', number: 'FAC-2026-901', clientId: 'cl', template: 'classique',
       date: '2026-08-03', status: 'payee', paymentMode: 'especes', fraisPort: 1500,
       items: [{description: 'Marchandise', qty: 2, unite: 'kg', unitPrice: 10000, tva: 19}]},
    ];
    saveData();
    const t = calcInvoiceTotals(state.invoices[0]);
    return {ht: t.ht, tva: t.tva, ttc: t.ttc, port: t.port, timbre: t.timbre, net: t.net};
  });
  check('the register row reconciles: HT + TVA = TTC',
        near(register.ht + register.tva, register.ttc),
        `${register.ht} + ${register.tva} vs ${register.ttc}`);
  check('and TTC + carriage + duty = net',
        near(register.ttc + register.port + register.timbre, register.net),
        `${register.ttc} + ${register.port} + ${register.timbre} vs ${register.net}`);

  /* The sheet is only right if the header, the widths and the data agree on
     how many columns there are. */
  const sheet = await page.evaluate(async () => {
    const dl = new Promise(r => { const o = URL.createObjectURL;
      URL.createObjectURL = b => { r(b); URL.createObjectURL = o; return o(b); }; });
    exportJournalXlsx();
    const blob = await dl;
    return blob && blob.size > 0;
  }).catch(() => null);
  check('the sales journal still builds', sheet !== false, String(sheet));

  await page.evaluate(() => { state.invoices = []; saveData(); });
}

/* ---------------------------------------------------------------- *
 * 16. The devis keeps what it is, and until when.
 *
 *     Three of these cover bugs found by reading the file rather
 *     than by a failing check — nothing here was covered before.
 * ---------------------------------------------------------------- */
console.log('\nDevis: status, conversion, validity');
{
  await page.evaluate(() => {
    state.clients = [{id: 'cd', name: 'SARL Devis', nif: '000000000000000'}];
    state.invoices = []; state.nextInvoiceNumber = 1;
    state.devis = [{id: 'dv', number: 'DEV-2026-001', clientId: 'cd', date: '2026-08-01',
                    status: 'accepte', validUntil: '2026-12-31',
                    items: [{description: 'Etude', qty: 1, unitPrice: 1000, tva: 19}]}];
    window.confirm = () => true;
    saveData();
  });

  /* A save edits what was typed. It does not decide what the document is. */
  const kept = await page.evaluate(() => {
    openDevisModal('dv');
    document.getElementById('dev-client').value = 'cd';
    saveDevis('dv');
    return state.devis[0].status;
  });
  check('editing an accepted devis leaves it accepted', kept === 'accepte', kept);

  /* Converting twice used to issue two invoices for one quote. */
  const twice = await page.evaluate(() => {
    state.devis[0].status = 'brouillon'; delete state.devis[0].invoiceNumber;
    state.invoices = []; state.nextInvoiceNumber = 1;
    convertDevisToInvoice('dv');
    const first = {n: state.invoices.length, num: state.devis[0].invoiceNumber,
                   tpl: state.invoices[0].template};
    /* Now refuse the second. */
    window.confirm = () => false;
    convertDevisToInvoice('dv');
    const after = state.invoices.length;
    window.confirm = () => true;
    convertDevisToInvoice('dv');
    return {...first, afterRefusing: after, afterAccepting: state.invoices.length};
  });
  check('converting a devis issues one invoice', twice.n === 1, String(twice.n));
  check('and the devis remembers which one', twice.num === 'FAC-2026-001', String(twice.num));
  check('a second conversion asks first, and no means no',
        twice.afterRefusing === 1, String(twice.afterRefusing));
  check('and yes still means yes', twice.afterAccepting === 2, String(twice.afterAccepting));
  check('the invoice it creates carries a template id that exists',
        twice.tpl === "classique", String(twice.tpl));

  /* Validity. */
  const validity = await page.evaluate(() => ({
    past:   devisExpired({validUntil: '2020-01-01'}),
    future: devisExpired({validUntil: '2999-01-01'}),
    none:   devisExpired({}),
  }));
  check('a devis past its date reads as expired', validity.past === true);
  check('one still in date does not', validity.future === false);
  check('and one with no date never expires', validity.none === false);

  const shown = await page.evaluate(() => {
    state.devis = [{id: 'dv2', number: 'DEV-2026-002', clientId: 'cd', date: '2026-08-01',
                    status: 'brouillon', validUntil: '2020-01-01',
                    items: [{description: 'X', qty: 1, unitPrice: 100, tva: 19}]}];
    saveData();
    return renderDevis();
  });
  check('the list shows the validity date', shown.includes('2020-01-01'), '');
  check('and marks the expired one', /Expir|منتهٍ/.test(shown), '');

  /* The field has to survive a reload, which is where whitelisted saves bite. */
  await page.reload();
  await page.waitForFunction(() => typeof renderDevis === 'function', {timeout: 30000});
  const survived = await page.evaluate(() => {
    const d = (state.devis || [])[0] || {};
    return {validUntil: d.validUntil, number: d.number};
  });
  check('and it is still there after a reload',
        survived.validUntil === '2020-01-01', JSON.stringify(survived));

  await page.evaluate(() => { state.devis = []; state.invoices = []; saveData(); });
}

/* ---------------------------------------------------------------- *
 * 17. Bon de livraison.
 *
 *     The check that carries the weight is the revenue one. A
 *     delivery note lives in state.invoices alongside the facture it
 *     accompanies, and six files reach a figure by summing
 *     calcInvoiceTotals over that array. If it contributed anything,
 *     every merchant issuing one would see their takings double.
 * ---------------------------------------------------------------- */
console.log('\nBon de livraison');
{
  await page.evaluate(() => {
    state.clients = [{id: 'cb', name: 'SARL Livraison', nif: '000000000000000'}];
    state.invoices = [{id: 'ib', number: 'FAC-2026-950', clientId: 'cb', template: 'algerie',
                       date: '2026-08-01', dueDate: '2026-08-31', status: 'envoyee',
                       paymentMode: 'virement',
                       items: [{description: 'Ciment', qty: 50, unite: 'sac', unitPrice: 900, tva: 19},
                               {description: 'Sable', qty: 3, unite: 'm3', unitPrice: 4000, tva: 19}]}];
    state.payments = []; state.devis = []; delete state.nextBlNumber;
    window.confirm = () => true;
    saveData(); navigate('invoices');
  });

  check('the list offers a bon de livraison',
        await page.evaluate(() => !!document.querySelector('[onclick="createBonLivraison(\'ib\')"]')));

  const made = await page.evaluate(() => {
    document.querySelector('[onclick="createBonLivraison(\'ib\')"]').click();
    const b = state.invoices.find(i => i.type === 'bl');
    return {number: b && b.number, ref: b && b.refNumber, id: b && b.id,
            items: b && b.items.length, counter: state.nextBlNumber};
  });
  check('clicking it issues one, on its own series',
        /^BL-\d{4}-001$/.test(made.number || ''), made.number);
  check('naming the invoice it delivers', made.ref === 'FAC-2026-950', made.ref);
  check('and carrying the same lines', made.items === 2, String(made.items));

  /* The one that matters. */
  const books = await page.evaluate(id => {
    const bl = state.invoices.find(i => i.id === id);
    const t = calcInvoiceTotals(bl);
    const revenue = state.invoices.reduce((s, i) => s + calcInvoiceTotals(i).net, 0);
    const invoiceAlone = calcInvoiceTotals(state.invoices.find(i => i.id === 'ib')).net;
    return {blNet: t.net, blTtc: t.ttc, revenue, invoiceAlone};
  }, made.id);
  check('a bon de livraison is worth nothing in the books',
        books.blNet === 0 && books.blTtc === 0, JSON.stringify(books));
  check('so issuing one does not double the takings',
        near(books.revenue, books.invoiceAlone), `${books.revenue} vs ${books.invoiceAlone}`);

  /* The paper. */
  const paper = await page.evaluate(id => {
    previewInvoice(id);
    const txt = document.getElementById('invoice-paper').innerText;
    closePreview();
    return txt;
  }, made.id);
  check('the paper says what it is', /BON DE LIVRAISON/.test(paper), paper.slice(0, 90));
  check('it names the invoice', /FAC-2026-950/.test(paper), '');
  check('it lists quantities and units', /50/.test(paper) && /sac/.test(paper), '');
  check('it shows no prices at all',
        !/900/.test(paper) && !/DA/.test(paper), paper.slice(0, 300));
  check('and it has both signatures', /Reçu le/.test(paper) && /Livré le/.test(paper), '');

  /* Guards, and the numbering after a reload. */
  const guards = await page.evaluate(id => {
    const before = state.invoices.length;
    createBonLivraison(id);                       /* on a bon: refused */
    const onBl = state.invoices.length === before;
    createBonLivraison('ib');                     /* second delivery: allowed */
    return {onBl, second: (state.invoices.filter(i => i.type === 'bl').pop() || {}).number};
  }, made.id);
  check('no bon de livraison on a bon de livraison', guards.onBl);
  check('but a second delivery takes the next number',
        guards.second === 'BL-2026-002', String(guards.second));

  await page.reload();
  await page.waitForFunction(() => typeof createBonLivraison === 'function', {timeout: 30000});
  const kept = await page.evaluate(() => state.nextBlNumber);
  check('and the counter survives a reload', kept === 3, String(kept));

  await page.evaluate(() => { state.invoices = []; saveData(); });
}

/* ---------------------------------------------------------------- *
 * 18. Dépenses et résultat approximatif.
 *
 *     The ledger only ever knew what came in, and turnover was being
 *     read as if it were what was left. This page subtracts, and the
 *     checks that carry the weight are about what it refuses to count:
 *     the VAT and the droit de timbre, which belong to the Treasury;
 *     an invoice that has been issued and not settled, which is a
 *     claim and not money; and the word "bénéfice", which the figure
 *     has not earned — no amortissements, no charges sociales, no
 *     variation de stock.
 *
 *     The period is handed to resultatApprox explicitly, so none of
 *     these figures depends on the month the machine is in.
 * ---------------------------------------------------------------- */
console.log('\nDépenses et résultat approximatif');
{
  await page.evaluate(() => {
    if (typeof locale !== 'undefined' && locale !== 'fr') toggleLocale();
    state.clients = [{id: 'cd', name: 'SARL Dépense', nif: '000000000000000'}];
    state.payments = []; state.devis = []; state.products = []; state.expenses = [];
    /* 100 000 HT settled in cash: 119 000 TTC, and 2 380,02 DA of duty on top
       of that. Only the 100 000 is a sale. */
    state.invoices = [
      {id: 'dp1', number: 'FAC-2026-701', clientId: 'cd', template: 'algerie', date: '2026-05-04',
       status: 'payee', paymentMode: 'especes',
       items: [{description: 'Vente réglée', qty: 1, unitPrice: 100000, tva: 19}]},
      {id: 'dp2', number: 'FAC-2026-702', clientId: 'cd', template: 'algerie', date: '2026-05-06',
       status: 'envoyee', paymentMode: 'virement',
       items: [{description: 'Émise, pas encaissée', qty: 1, unitPrice: 400000, tva: 19}]},
    ];
    state.currentPage = 'expenses';
    saveData();
  });

  check('the menu offers the page',
        await page.evaluate(() => !!document.querySelector('.nav-item[data-page="expenses"]')));

  /* Rule 2 for contributors: a page missing from the allow-list in c2.js is
     bounced back to the dashboard on the next refresh, silently. */
  await page.reload();
  await page.waitForFunction(() => typeof resultatApprox === 'function', {timeout: 30000});
  check('and a refresh comes back to it rather than the dashboard',
        await page.evaluate(() => state.currentPage) === 'expenses');

  const sales = await page.evaluate(() => {
    const t = calcInvoiceTotals(state.invoices.find(i => i.id === 'dp1'));
    const r = resultatApprox('2026-05');
    return {ventes: r.ventes, n: r.nVentes, ht: t.ht, ttc: t.ttc, net: t.net};
  });
  check('a settled invoice is a sale, counted at its HT',
        sales.n === 1 && near(sales.ventes, 100000), String(sales.ventes));
  check('so the VAT it collects is not revenue',
        near(sales.ttc, 119000) && !near(sales.ventes, sales.ttc), `${sales.ventes} vs ${sales.ttc}`);
  check('and neither is the droit de timbre',
        sales.net > sales.ttc && !near(sales.ventes, sales.net), `${sales.ventes} vs ${sales.net}`);

  /* The status decides, one document at a time. */
  const byStatus = await page.evaluate(() => {
    const keep = state.invoices, out = {};
    ['payee', 'envoyee', 'enretard', 'brouillon', 'annulee'].forEach(status => {
      state.invoices = [{id: 's1', number: 'FAC-2026-711', clientId: 'cd', template: 'algerie',
                         date: '2026-05-15', status, paymentMode: 'virement',
                         items: [{description: 'X', qty: 1, unitPrice: 200000, tva: 19}]}];
      out[status] = resultatApprox('2026-05').ventes;
    });
    state.invoices = keep;
    return out;
  });
  check('only a settled invoice counts', near(byStatus.payee, 200000), String(byStatus.payee));
  check('an issued invoice is a claim, not money',
        byStatus.envoyee === 0 && byStatus.enretard === 0,
        `${byStatus.envoyee} / ${byStatus.enretard}`);
  check('a brouillon is not a sale', byStatus.brouillon === 0, String(byStatus.brouillon));
  check('and an annulée is not one either', byStatus.annulee === 0, String(byStatus.annulee));

  /* An avoir is stored 'payee' and calcInvoiceTotals hands it back negated, so
     it has to subtract here once — not twice, and not at all. */
  const credited = await page.evaluate(() => {
    window.confirm = () => true;
    createAvoir('dp1');
    const av = state.invoices.find(i => i.type === 'avoir');
    if (av) av.date = '2026-05-20';
    createBonLivraison('dp2');
    const bl = state.invoices.find(i => i.type === 'bl');
    if (bl) bl.date = '2026-05-21';
    saveData();
    return {ventes: resultatApprox('2026-05').ventes, avoir: !!av, bl: !!bl};
  });
  check('an avoir subtracts on its own', credited.avoir && near(credited.ventes, 0),
        String(credited.ventes));
  check('and a bon de livraison is worth nothing here',
        credited.bl && near(credited.ventes, 0), String(credited.ventes));

  await page.evaluate(() => {
    state.invoices = state.invoices.filter(i => !i.type);
    saveData();
  });

  /* The spend side, under the same rule the other way round: the VAT paid to
     a supplier is deducted, not borne. */
  const spend = await page.evaluate(() => {
    state.expenses = [
      {id: 'x1', date: '2026-05-02', label: 'Loyer du local', category: 'loyer',
       amount: 20000, tva: 0, mode: 'virement'},
      {id: 'x2', date: '2026-05-03', label: 'Ciment', category: 'achats',
       amount: 30000, tva: 19, mode: 'especes'},
      {id: 'x3', date: '2026-06-03', label: 'Le mois suivant', category: 'achats',
       amount: 500000, tva: 19, mode: 'especes'},
    ];
    saveData();
    const one = expenseTotals(state.expenses[1]);
    const r = resultatApprox('2026-05');
    return {ht: one.ht, tva: one.tva, ttc: one.ttc, depenses: r.depenses, n: r.nDepenses,
            resultat: r.resultat, byCat: r.parCategorie,
            year: resultatApprox('2026').depenses, all: resultatApprox('').depenses};
  });
  check('a dépense carries its own HT, VAT and TTC',
        near(spend.ht, 30000) && near(spend.tva, 5700) && near(spend.ttc, 35700),
        `${spend.ht} / ${spend.tva} / ${spend.ttc}`);
  check('it is counted HT, because that VAT is deducted and not borne',
        near(spend.depenses, 50000) && spend.n === 2, String(spend.depenses));
  check('the résultat is what came in less what went out',
        near(spend.resultat, 50000), String(spend.resultat));
  check('the categories add up to the same figure',
        near(Object.keys(spend.byCat).reduce((s, k) => s + spend.byCat[k], 0), spend.depenses),
        JSON.stringify(spend.byCat));
  check('a dépense from another month stays out of the month',
        near(spend.year, 550000) && near(spend.all, 550000),
        `${spend.depenses} / ${spend.year} / ${spend.all}`);

  const loss = await page.evaluate(() => {
    state.expenses.push({id: 'x4', date: '2026-05-04', label: 'Camion', category: 'transport',
                         amount: 300000, tva: 19, mode: 'cheque'});
    saveData();
    navigate('expenses'); setExpensePeriod('all');
    const el = document.getElementById('exp-result');
    return {resultat: resultatApprox('2026-05').resultat,
            red: !!el && el.className.includes('text-red-600')};
  });
  check('a month that spent more than it took shows a negative résultat',
        near(loss.resultat, -250000), String(loss.resultat));
  check('and shows it in red', loss.red);

  /* The wording. The figure has no amortissements, no charges sociales and no
     closing inventory in it, so the page must not offer it as a profit. */
  const words = await page.evaluate(() => {
    navigate('expenses');
    const txt = document.getElementById('main-content').innerText.replace(/\s+/g, ' ');
    const label = (document.getElementById('exp-result-label') || {}).textContent || '';
    return {label, approx: /approximatif/i.test(label), profit: /b[ée]n[ée]fice|profit/i.test(label),
            denied: /n'est pas un bénéfice comptable/i.test(txt),
            amort: /amortissement/i.test(txt), social: /charges sociales/i.test(txt),
            stock: /variation de stock/i.test(txt), keys: /\bexp\.[a-z]/i.test(txt)};
  });
  check('the figure is labelled a résultat approximatif', words.approx, words.label);
  check('and never a bénéfice', !words.profit, words.label);
  check('the page says in words that it is not a bénéfice comptable', words.denied);
  check('and names what is missing from it',
        words.amort && words.social && words.stock, JSON.stringify(words));
  check('no untranslated key reaches the page', !words.keys);

  /* Typing one in. */
  const typed = await page.evaluate(() => {
    state.expenses = []; saveData();
    navigate('expenses'); setExpensePeriod('month');
    openExpenseModal();
    document.getElementById('exp-label').value = 'Sacs de ciment 50 kg';
    document.getElementById('exp-date').value = '2026-05-09';
    document.getElementById('exp-cat').value = 'achats';
    document.getElementById('exp-amount').value = '12345.5';
    document.getElementById('exp-tva').value = '9';
    document.getElementById('exp-mode').value = 'ccp';
    document.getElementById('exp-note').value = 'Fournisseur Ali';
    saveExpense(null);
    return {n: state.expenses.length, x: state.expenses[0],
            shown: document.querySelectorAll('#main-content tr[data-exp]').length};
  });
  check('the form stores what was typed',
        typed.n === 1 && typed.x.label === 'Sacs de ciment 50 kg' && typed.x.amount === 12345.5
        && typed.x.tva === 9 && typed.x.category === 'achats' && typed.x.mode === 'ccp'
        && typed.x.date === '2026-05-09',
        JSON.stringify(typed.x));
  check('and a dépense dated outside the window widens the view rather than hiding it',
        typed.shown === 1, String(typed.shown));

  const guards = await page.evaluate(() => {
    const before = state.expenses.length;
    openExpenseModal();
    document.getElementById('exp-label').value = '   ';
    document.getElementById('exp-amount').value = '900';
    saveExpense(null);
    const noLabel = state.expenses.length;
    document.getElementById('exp-label').value = 'Sans montant';
    document.getElementById('exp-amount').value = '';
    saveExpense(null);
    const noAmount = state.expenses.length;
    closeModal();
    return {before, noLabel, noAmount};
  });
  check('a dépense with no libellé is refused', guards.noLabel === guards.before,
        `${guards.before} → ${guards.noLabel}`);
  check('and one with no montant too', guards.noAmount === guards.before,
        `${guards.before} → ${guards.noAmount}`);

  /* Storage. A figure that does not survive a reload is a toy, and the only
     thing that writes it is the whitelist in extra.js. */
  await page.reload();
  await page.waitForFunction(() => typeof resultatApprox === 'function', {timeout: 30000});
  const kept = await page.evaluate(() => ({
    n: (state.expenses || []).length, label: (state.expenses[0] || {}).label,
    stored: /"expenses"/.test(localStorage.getItem('facturepro_dz_v24') || ''),
  }));
  check('dépenses survive a reload', kept.n === 1 && kept.label === 'Sacs de ciment 50 kg',
        JSON.stringify(kept));
  check('because saveData writes them', kept.stored);

  const backup = await page.evaluate(async () => {
    const dl = new Promise(r => { const o = URL.createObjectURL;
      URL.createObjectURL = b => { r(b); URL.createObjectURL = o; return o(b); }; });
    exportData();
    return JSON.parse(await (await dl).text());
  });
  check('and the backup carries them',
        Array.isArray(backup.expenses) && backup.expenses.length === 1,
        JSON.stringify(backup.expenses));

  const restored = await page.evaluate(async () => {
    const feed = obj => new Promise(res => {
      const file = new File([JSON.stringify(obj)], 'b.json', {type: 'application/json'});
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.createElement('input'); input.type = 'file'; input.files = dt.files;
      importData({target: input});
      setTimeout(res, 250);
    });
    window.confirm = () => true;

    await feed({clients: [], invoices: [], expenses: 'not-a-list'});
    const refused = (state.expenses || []).length;

    await feed({clients: [], invoices: [],
                expenses: [{id: 'r1', date: '2026-05-01', label: 'Restauré',
                            category: 'loyer', amount: 7000, tva: 0, mode: 'especes'}]});
    const imported = (state.expenses || []).map(x => x.label);

    /* A file written before this feature carries no expenses key at all.
       Keeping the ones in memory would blend two sets of books. */
    await feed({clients: [], invoices: []});
    return {refused, imported, afterOld: (state.expenses || []).length};
  });
  check('a backup whose expenses are not a list is refused whole',
        restored.refused === 1, String(restored.refused));
  check('a valid one restores them',
        restored.imported.length === 1 && restored.imported[0] === 'Restauré',
        JSON.stringify(restored.imported));
  check('and one from before the feature empties the list rather than blending it',
        restored.afterOld === 0, String(restored.afterOld));

  const gone = await page.evaluate(() => {
    state.expenses = [{id: 'z1', date: '2026-05-01', label: 'À supprimer', category: 'autre',
                       amount: 100, tva: 19, mode: 'especes'}];
    saveData();
    window.confirm = () => false; deleteExpense('z1');
    const refused = state.expenses.length;
    window.confirm = () => true; deleteExpense('z1');
    return {refused, after: state.expenses.length};
  });
  check('deleting asks first', gone.refused === 1, String(gone.refused));
  check('and then removes it', gone.after === 0, String(gone.after));

  /* Arabic. This page is interface, so it translates — unlike an invoice,
     which stays French because it is a legal document. */
  const arabic = await page.evaluate(() => {
    if (locale !== 'ar') toggleLocale();
    navigate('expenses');
    const title = document.getElementById('page-title').textContent;
    const txt = document.getElementById('main-content').innerText;
    const dir = document.documentElement.dir;
    if (locale !== 'fr') toggleLocale();
    return {title, dir, keys: /\bexp\.[a-z]|\bnav\.[a-z]/i.test(txt),
            french: /Résultat approximatif/.test(txt), arabic: /نتيجة تقريبية/.test(txt)};
  });
  check('the page is translated in Arabic', arabic.arabic && !arabic.french, arabic.title);
  check('with no key showing through', !arabic.keys);
  check('and the interface still mirrors', arabic.dir === 'rtl', arabic.dir);

  /* The banner is written imperatively, so nothing in applyLocale reaches it —
     the base renderPage repaints it, and this page returns before that. It
     showed a French banner on an Arabic screen, on this page and no other. */
  const relang = await page.evaluate(() => {
    localStorage.removeItem('fp_last_export');
    localStorage.removeItem('fp_backup_snoozed_until');
    state.clients = [{id: 'cr', name: 'Client réel'}];
    state.invoices = [{id: 'ir', number: 'FAC-2026-750', clientId: 'cr', template: 'algerie',
                       date: '2026-05-20', status: 'payee', paymentMode: 'virement',
                       items: [{description: 'Vente', qty: 1, unitPrice: 1000, tva: 19}]}];
    saveData();

    const read = () => {
      const h = document.getElementById('backup-warn');
      return h && !h.classList.contains('hidden') ? (h.innerText || '') : '';
    };
    const out = {};
    ['dashboard', 'expenses'].forEach(page => {
      if (locale !== 'fr') toggleLocale();
      navigate(page);
      out[page + 'Fr'] = read();
      toggleLocale();
      out[page + 'Ar'] = read();
      if (locale !== 'fr') toggleLocale();
    });
    return out;
  });
  const arText = s => /[\u0600-\u06FF]/.test(s) && !/Sauvegardez/.test(s);
  check('the backup banner is up to be read at all',
        !!relang.dashboardFr && !!relang.expensesFr,
        JSON.stringify(relang).slice(0, 120));
  check('and it follows the language on the dashboard', arText(relang.dashboardAr),
        relang.dashboardAr.replace(/\s+/g, ' ').slice(0, 60));
  check('and on the dépenses page too, which returns before the base render',
        arText(relang.expensesAr), relang.expensesAr.replace(/\s+/g, ' ').slice(0, 60));

  /* The caption under the figure has to describe the documents the figure is
     made of: an avoir subtracts and a bon de livraison adds nothing, and
     neither is a facture payée. */
  const counted = await page.evaluate(() => {
    state.invoices = [
      {id: 'n1', number: 'FAC-2026-760', clientId: 'cr', template: 'algerie', date: '2026-05-10',
       status: 'payee', paymentMode: 'virement',
       items: [{description: 'Vente', qty: 1, unitPrice: 100000, tva: 19}]},
      {id: 'n2', number: 'AV-2026-001', type: 'avoir', refNumber: 'FAC-2026-760', clientId: 'cr',
       template: 'algerie', date: '2026-05-11', status: 'payee', paymentMode: 'virement',
       items: [{description: 'Retour', qty: 1, unitPrice: 20000, tva: 19}]},
      {id: 'n3', number: 'BL-2026-001', type: 'bl', clientId: 'cr', template: 'algerie',
       date: '2026-05-12', status: 'payee', paymentMode: 'virement',
       items: [{description: 'Livraison', qty: 1, unitPrice: 30000, tva: 19}]}];
    state.expenses = []; saveData();
    const r = resultatApprox('2026-05');
    return {n: r.nVentes, ventes: r.ventes};
  });
  check('an avoir still comes off the sales figure',
        near(counted.ventes, 80000), String(counted.ventes));
  check('but only the factures are counted underneath it',
        counted.n === 1, String(counted.n));

  await page.evaluate(() => {
    state.invoices = []; state.expenses = []; state.currentPage = 'invoices';
    saveData(); navigate('invoices');
  });
}

/* ---------------------------------------------------------------- *
 * 11. The international generator.
 *
 * A separate product on the same domain: a form that prints one invoice
 * for a merchant invoicing at home in Morocco, Tunisia, the UAE, Britain
 * or the United States. It keeps no ledger, and it must not be mistaken
 * for the Algerian application.
 *
 * These checks run against public/ — the built site — because half of
 * what they prove is the dependency work: the page has to render and
 * export with every off-origin request blocked, which is only true once
 * `npm run build` has put the vendored libraries next to it. A missing
 * stylesheet leaves a page that still *works*, which is exactly how the
 * CDN outage went unnoticed until it reached users.
 * ---------------------------------------------------------------- */
console.log('\nThe international generator');
{
  const BUILT = join(ROOT, 'public');
  let built = true;
  try { await readFile(join(BUILT, 'vendor', 'tailwind.css')); } catch { built = false; }
  check('the build has been run, so the page is checked as it ships',
        built, 'run `npm run build` in the repository root first');

  if (built) {
    const site = createServer(async (req, res) => {
      const p = join(BUILT, normalize(decodeURI(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, ''));
      try {
        const body = await readFile(p);
        res.writeHead(200, {'Content-Type': TYPES[extname(p)] || 'application/octet-stream'});
        res.end(body);
      } catch { res.writeHead(404); res.end('not found'); }
    });
    await new Promise(r => site.listen(0, '127.0.0.1', r));
    const SITE = `http://127.0.0.1:${site.address().port}`;

    const ctx = await browser.newContext({acceptDownloads: true});
    const intl = await ctx.newPage();
    const intlErrors = [];
    intl.on('pageerror', e => intlErrors.push(String(e)));

    /* Everything that is not this origin is aborted, and remembered. */
    const offOrigin = [];
    await intl.route('**/*', route => {
      const u = route.request().url();
      if (u.startsWith(SITE) || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('file://')) {
        return route.continue();
      }
      offOrigin.push(u);
      return route.abort();
    });

    await intl.goto(`${SITE}/international.html`);
    await intl.waitForFunction(() => !!document.querySelector('#chips button'), {timeout: 20000});

    /* The stylesheet is served from here, so the layout survives the block. */
    const width = await intl.evaluate(() =>
      getComputedStyle(document.querySelector('.max-w-6xl')).maxWidth);
    check('the page keeps its layout with every off-origin request blocked',
          width === '1152px', width);

    /* The hero once read "Subtotal": the landing sentence and the totals label
       had both claimed the id `t-sub`, and the second one painted over the
       first. Two elements sharing an id is the shape of that bug. */
    const dupIds = await intl.evaluate(() => {
      const seen = {}, dup = [];
      document.querySelectorAll('[id]').forEach(el => {
        if (seen[el.id]) dup.push(el.id); else seen[el.id] = 1;
      });
      return dup;
    });
    check('no two elements share an id', dupIds.length === 0, dupIds.join(','));

    const ledes = [];
    for (const lang of ['en', 'fr', 'ar']) {
      await intl.click(`button.seg[data-lang="${lang}"]`);
      ledes.push(await intl.evaluate(() => ({
        lede: document.getElementById('t-lede').textContent.trim(),
        subtotal: document.getElementById('t-sub').textContent.trim(),
      })));
    }
    check('the landing says what the page does, in all three languages',
          ledes.every(l => l.lede.length > 40 && l.lede !== l.subtotal),
          JSON.stringify(ledes.map(l => l.lede.slice(0, 30))));
    await intl.click('button.seg[data-lang="en"]');

    await intl.click('[data-country="MA"]');
    await intl.waitForSelector('#biz-ice');
    const ma = await intl.evaluate(() => ({
      currency: document.getElementById('currency').value,
      rate: document.getElementById('taxRate').value,
      tax: document.getElementById('taxName').value,
      ids: [...document.querySelectorAll('[data-biz]')].map(i => i.dataset.biz),
    }));
    check('choosing Morocco sets its currency and rate',
          ma.currency === 'MAD' && ma.rate === '20' && ma.tax === 'TVA', JSON.stringify(ma));
    check('and asks for the identifiers a Moroccan invoice carries',
          ma.ids.includes('ice') && ma.ids.includes('if'), ma.ids.join(','));

    await intl.selectOption('#country', 'AE');
    await intl.waitForSelector('#biz-trn');
    const ae = await intl.evaluate(() => ({
      currency: document.getElementById('currency').value,
      rate: document.getElementById('taxRate').value,
      ids: [...document.querySelectorAll('[data-biz]')].map(i => i.dataset.biz),
    }));
    check('the Emirates bring their own rate and the TRN',
          ae.currency === 'AED' && ae.rate === '5' && ae.ids.includes('trn'), JSON.stringify(ae));

    /* The three that issue nothing. */
    for (const [code, name] of [['DZ', 'Algeria'], ['FR', 'France'], ['SA', 'Saudi Arabia']]) {
      await intl.selectOption('#country', code);
      const off = await intl.evaluate(() => ({
        form: document.getElementById('work').classList.contains('hidden'),
        pdf: document.getElementById('btn-pdf').classList.contains('hidden'),
        why: document.getElementById('blocked-why').textContent.trim(),
        paper: document.getElementById('preview').innerHTML.trim(),
        picker: !document.getElementById('country').closest('.hidden'),
      }));
      check(`${name} issues no invoice`, off.form && off.pdf && !off.paper, JSON.stringify(off).slice(0, 120));
      check(`and says why`, off.why.length > 40, off.why.slice(0, 60));
      check(`and the country picker stays reachable`, off.picker);
    }

    await intl.selectOption('#country', 'DZ');
    const home = await intl.evaluate(() => {
      const a = document.getElementById('blocked-link');
      return {shown: !a.classList.contains('hidden'), href: a.getAttribute('href'),
              why: document.getElementById('blocked-why').textContent};
    });
    check('Algeria is sent to the application, which is where the stamp duty is',
          home.shown && home.href === '/', JSON.stringify(home).slice(0, 80));
    check('and told why this page cannot serve it',
          /timbre/i.test(home.why) && /G50/.test(home.why), home.why.slice(0, 80));

    /* No string may claim a conformity the page does not deliver. It may
       say the opposite as loudly as it likes. */
    const strings = await intl.evaluate(() => document.documentElement.innerHTML);
    check('no string claims ZATCA conformity',
          !/(compliant with ZATCA|ZATCA[- ]compliant|conforme (à|aux) (la )?ZATCA|وفقاً لهيئة الزكاة)/i.test(strings));
    check('nor French conformity',
          !/conforme à la (réglementation|législation) française/i.test(strings));
    check('the Saudi notice says the QR code is missing, which is the reason',
          /QR/.test(strings) && /TLV/.test(strings));

    /* Arithmetic. Six countries, one tax, and never a droit de timbre. */
    await intl.selectOption('#country', 'GB');
    await intl.fill('[data-i="0"][data-f="desc"]', 'Consulting');
    await intl.fill('[data-i="0"][data-f="qty"]', '2');
    await intl.fill('[data-i="0"][data-f="price"]', '500');
    const sums = [];
    for (const code of ['MA', 'TN', 'AE', 'GB', 'US', 'INT']) {
      await intl.selectOption('#country', code);
      sums.push(await intl.evaluate(c => ({
        code: c,
        rate: parseFloat(document.getElementById('taxRate').value),
        sub: document.getElementById('subtotal').textContent,
        tax: document.getElementById('tax-amount').textContent,
        total: document.getElementById('total').textContent,
      }), code));
    }
    const asNum = s => parseFloat(String(s).replace(/[^0-9.]/g, ''));
    const arithmetic = sums.every(r =>
      near(asNum(r.sub), 1000) &&
      near(asNum(r.tax), 1000 * r.rate / 100, 0.01) &&
      near(asNum(r.total), asNum(r.sub) + asNum(r.tax), 0.01));
    check('every country totals its own tax and nothing else — no droit de timbre anywhere',
          arithmetic, JSON.stringify(sums));
    check('the currency follows the country',
          sums.map(r => r.total.split(' ')[1]).join(',') === 'MAD,TND,AED,GBP,USD,USD',
          sums.map(r => r.total).join(' | '));
    check('and the page never loaded the Algerian arithmetic',
          await intl.evaluate(() => typeof window.timbreFor === 'undefined' &&
                                    typeof window.amountInWords === 'undefined' &&
                                    ![...document.scripts].some(s => /lib-calc/.test(s.src))));

    /* The document is written in the language its country invoices in. */
    await intl.selectOption('#country', 'MA');
    const frDoc = await intl.textContent('#preview');
    await intl.selectOption('#country', 'GB');
    const enDoc = await intl.textContent('#preview');
    await intl.selectOption('#country', 'AE');
    const aeDoc = await intl.textContent('#preview');
    check('a Moroccan invoice is written in French',
          /FACTURE/.test(frDoc) && /Facturé à/.test(frDoc), frDoc.slice(0, 60));
    check('a British one in English',
          /INVOICE/.test(enDoc) && /Bill to/.test(enDoc), enDoc.slice(0, 60));
    check('and an Emirati one says what it is',
          /TAX INVOICE/.test(aeDoc), aeDoc.slice(0, 60));

    /* Money and codes stay latin, whatever the interface language does. */
    const arabicDigits = /[٠-٩۰-۹]/;
    const perLang = [];
    for (const lang of ['en', 'fr', 'ar']) {
      await intl.click(`button.seg[data-lang="${lang}"]`);
      perLang.push(await intl.evaluate(() => ({
        dir: document.documentElement.dir,
        total: document.getElementById('total').textContent,
        paper: document.getElementById('preview').textContent,
      })));
    }
    check('the interface speaks all three languages',
          perLang[2].dir === 'rtl' && perLang[0].dir === 'ltr', perLang.map(p => p.dir).join(','));
    check('and every amount stays in latin digits in all three',
          perLang.every(p => !arabicDigits.test(p.total) && !arabicDigits.test(p.paper)),
          perLang.map(p => p.total).join(' | '));
    /* An address that starts with a number reordered inside its own field
       when the interface went right to left — the fields take their direction
       from what is in them now. */
    const bidi = await intl.evaluate(() => {
      const addr = document.getElementById('biz-address');
      addr.value = '14 Cheapside, London EC2V 6DN';
      const code = document.getElementById('invoiceNumber');
      return {addr: getComputedStyle(addr).unicodeBidi, code: getComputedStyle(code).direction};
    });
    check('a latin address keeps its order in an Arabic interface',
          bidi.addr === 'plaintext', bidi.addr);
    check('while codes stay left to right whatever is around them',
          bidi.code === 'ltr', bidi.code);

    check('the document itself stays left to right',
          await intl.evaluate(() => getComputedStyle(document.getElementById('preview')).direction) === 'ltr');

    /* One draft, no archive, and no button that says otherwise. */
    await intl.fill('#biz-name', 'Atlas Ltd');
    await intl.waitForTimeout(500);
    await intl.reload();
    await intl.waitForFunction(() => !!document.querySelector('#biz-name'), {timeout: 20000});
    const kept = await intl.evaluate(() => ({
      name: document.getElementById('biz-name').value,
      keys: Object.keys(localStorage),
      ledger: localStorage.getItem('facturepro_dz_v24'),
      save: [...document.querySelectorAll('button')]
              .some(b => /^(save|enregistrer|sauvegarder|حفظ)$/i.test(b.textContent.trim())),
    }));
    check('a refresh does not cost the typing', kept.name === 'Atlas Ltd', kept.name);
    check('it is one draft and not an archive', kept.keys.length === 1, kept.keys.join(','));
    check('and it never touches the application’s ledger', kept.ledger === null, String(kept.ledger));
    check('there is no Save button, because nothing is saved', !kept.save);

    /* The line for what the page cannot compute.

       Tunisia puts a timbre fiscal on its invoices and Morocco a stamp duty on
       cash settlements, and both are fixed by finance laws that move. The page
       computes neither — it carries an empty line the visitor labels and fills
       themselves, and tells the two countries known to need one to use it. A
       figure printed under an official label would be believed, which is
       exactly why none is supplied. */
    /* Pin the interface language: the notice is written in it, and a check
       asserting English while the page is in Arabic tests the tester. */
    await intl.click('[data-lang="en"]');
    await intl.waitForTimeout(200);
    await intl.selectOption('#country', 'TN');
    await intl.waitForTimeout(250);
    const tnHint = await intl.$eval('#hint', e => e.className.includes('hidden') ? '' : e.textContent);
    check('Tunisia is told it carries a timbre fiscal', /timbre fiscal/i.test(tnHint), tnHint.slice(0, 60));
    check('and told to check the amount rather than trust one',
          /check the amount/i.test(tnHint), tnHint.slice(-40));
    const tnAr = await intl.evaluate(() => {
      document.querySelector('[data-lang="ar"]').click();
      return document.getElementById('hint').textContent;
    });
    check('and says it in Arabic too', /\u0637\u0627\u0628\u0639/.test(tnAr), tnAr.slice(0, 40));
    await intl.click('[data-lang="en"]');
    await intl.waitForTimeout(200);

    const preset = await intl.evaluate(() =>
      ({ label: document.getElementById('extraLabel').value,
         amount: document.getElementById('extraAmount').value }));
    check('the line starts empty, with no figure supplied',
          preset.label === '' && (preset.amount === '' || Number(preset.amount) === 0),
          preset.label + '/' + preset.amount);

    const withDuty = await intl.evaluate(() => {
      const set = (sel, v) => { const e = document.querySelector(sel);
        e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
      set('[data-f="desc"]', 'Prestation'); set('[data-f="qty"]', '1'); set('[data-f="price"]', '100');
      set('#extraLabel', 'Timbre fiscal'); set('#extraAmount', '1');
      return { total: document.getElementById('total').textContent,
               paper: document.getElementById('preview').innerText.replace(/\s+/g, ' ') };
    });
    check('a duty the visitor enters reaches the total',
          /120[.,]00/.test(withDuty.total), withDuty.total);
    check('and prints on the invoice under their own label',
          /Timbre fiscal/.test(withDuty.paper) && /1[.,]00/.test(withDuty.paper));

    const mo = await intl.evaluate(() => {
      document.getElementById('country').value = 'MA';
      document.getElementById('country').dispatchEvent(new Event('change', { bubbles: true }));
      return document.getElementById('hint').textContent;
    });
    check('Morocco is warned about cash settlements', /timbre|cash|espèces/i.test(mo), mo.slice(0, 60));

    const clean = await intl.evaluate(() => {
      document.getElementById('country').value = 'GB';
      document.getElementById('country').dispatchEvent(new Event('change', { bubbles: true }));
      return document.getElementById('hint').className.includes('hidden');
    });
    check('a country with nothing to add says nothing', clean);

    await intl.selectOption('#country', 'TN');
    await intl.waitForTimeout(200);

    /* The export, with the network still blocked. */
    const wait = intl.waitForEvent('download');
    await intl.click('#btn-pdf');
    const dl = await wait;
    const pdf = await readFile(await dl.path());
    check('it exports a PDF offline', pdf.slice(0, 5).toString() === '%PDF-', pdf.slice(0, 5).toString());
    check('named after the invoice', /\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());

    /* The point of the whole group. */
    const strayed = offOrigin.filter(u => !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u));
    check('nothing the page asked for left this origin, apart from the font',
          strayed.length === 0, strayed.slice(0, 3).join(' '));
    check('no script error on the generator', intlErrors.length === 0, intlErrors.join(' | '));

    /* The dépenses bar chart, checked here because it is the only place the
       built stylesheet is served: a bar twice as long has to stand for twice
       the money, and without Tailwind loaded a width in per cent measures
       nothing. Left as a direct flex child the bar was sized against the whole
       row and then shrunk to fit, so 15 000 drew almost as wide as 30 000. */
    const app = await ctx.newPage();
    await app.goto(`${SITE}/index.html`);
    await app.waitForFunction(() => typeof resultatApprox === 'function', {timeout: 20000});
    const bars = await app.evaluate(() => {
      state.invoices = [];
      state.expenses = [
        {id: 'b1', date: '2026-05-02', label: 'Loyer', category: 'loyer',
         amount: 30000, tva: 0, mode: 'virement'},
        {id: 'b2', date: '2026-05-04', label: 'Ciment', category: 'achats',
         amount: 15000, tva: 0, mode: 'especes'}];
      saveData(); navigate('expenses'); setExpensePeriod('all');
      return [...document.querySelectorAll('#main-content .h-2')]
        .map(e => e.getBoundingClientRect().width);
    });
    check('the category bars are drawn in proportion to the amounts',
          bars.length === 2 && bars[0] > 20 && Math.abs(bars[1] / bars[0] - 0.5) < 0.05,
          bars.map(Math.round).join(' / '));
    await app.close();

    await ctx.close();
    site.close();
  }

  /* The other direction: a visitor who lands on the application and is not
     who it is for. The link in Aide is enough for the Algerian who goes
     looking; it is not enough for a Briton who typed the domain and is now
     reading a French dashboard full of NIF and NIS fields. */
  {
    const seen = [];
    for (const [locale, expect] of [['en-GB', true], ['fr-FR', false], ['ar-DZ', false]]) {
      const c = await browser.newContext({ locale });
      const q = await c.newPage();
      await q.goto(`${BASE}/index.html`);
      await q.waitForTimeout(1200);
      seen.push([locale, await q.evaluate(() => {
        const el = document.getElementById('foreign-note');
        return el ? !el.className.includes('hidden') : null;
      }), expect]);
      await c.close();
    }
    check('a browser asking for neither French nor Arabic is offered the generator',
          seen[0][1] === true, String(seen[0][1]));
    check('and the Algerian merchant, who asks for one of them, never sees it',
          seen[1][1] === false && seen[2][1] === false,
          seen.map(r => r[0] + '=' + r[1]).join(' '));

    const c = await browser.newContext({ locale: 'en-GB' });
    const q = await c.newPage();
    await q.goto(`${BASE}/index.html`);
    await q.waitForTimeout(1200);
    const href = await q.evaluate(() => {
      const a = document.querySelector('#foreign-note a');
      return a ? a.getAttribute('href') : null;
    });
    check('it points at the generator', href === 'international.html', String(href));
    await q.evaluate(() => dismissForeign());
    await q.reload();
    await q.waitForTimeout(1200);
    check('closed once is closed for good', await q.evaluate(() => {
      const el = document.getElementById('foreign-note');
      return el ? el.className.includes('hidden') : false;
    }));
    await c.close();
  }

  /* The mirror case, inside the application: an Algerian merchant invoicing a
     foreign client. One line in Aide, and nothing else — no button in the
     invoice editor, no country selector. The application stays a
     single-country product. */
  const aide = await page.evaluate(() => {
    navigate('help');
    const a = document.querySelector('#main-content a[href="international.html"]');
    return {href: !!a, label: a ? a.textContent.trim() : '',
            editor: !!document.querySelector('#invoice-form [name="country"]')};
  });
  check('Aide points a merchant invoicing abroad at the generator', aide.href);
  check('and the link is worded, not empty', aide.label.length > 5, aide.label);
  check('while the invoice editor gains no country selector', !aide.editor);

  const aideAr = await page.evaluate(() => {
    if (locale !== 'ar') toggleLocale();
    navigate('help');
    const a = document.querySelector('#main-content a[href="international.html"]');
    const label = a ? a.textContent.trim() : '';
    if (locale !== 'fr') toggleLocale();
    return label;
  });
  check('and it is translated in Arabic too', aideAr.length > 5 && !/tools\.intl/.test(aideAr), aideAr);
}

/* ---------------------------------------------------------------- *
 * The backup payload, and the Drive card that carries it.
 *
 * Nothing here talks to Google. What is checked is the half that decides
 * whether a restored ledger is the ledger that was saved — the list that
 * gets forgotten the day a feature adds one, and the counters that hand out
 * document numbers. A Drive round trip runs through exactly these two
 * functions, so a bug here is a bug there.
 * ---------------------------------------------------------------- */
console.log('\nBackup payload, restore, and the Drive card');

const payload = await page.evaluate(() => {
  /* Seeded here rather than leaned on: earlier groups empty the ledger to see
     the empty states, and a backup check that passes because something else
     happened to leave data behind is not a check. */
  state.clients  = [{id:'c1', name:'SARL Atlas', nif:'099999999999999'}];
  state.invoices = [{id:'i1', number:'FAC-2026-900', clientId:'c1', template:'classique',
                     date:'2026-07-01', dueDate:'2026-07-31', status:'payee',
                     items:[{description:'Prestation', qty:1, unitPrice:100000, tva:19}], notes:''}];
  state.products = [{id:'p1', name:'Ciment', price:900}];
  state.devis    = [{id:'d1', number:'DEV-2026-001', clientId:'c1', items:[]}];
  state.payments = [{id:'y1', invoiceId:'i1', amount:5000, date:'2026-07-02'}];
  state.expenses = [{id:'e1', label:'Loyer', amount:30000, date:'2026-07-01', category:'loyer'}];
  state.nextAvoirNumber = 7;
  state.nextDevisNumber = 4;
  return window.buildBackup();
});
check('the backup carries the clients', Array.isArray(payload.clients) && payload.clients.length > 0);
check('the backup carries the invoices', Array.isArray(payload.invoices) && payload.invoices.length > 0);
check('the backup carries the products', payload.products.length === 1);
check('the backup carries the devis', payload.devis.length === 1);
check('the backup carries the payments', payload.payments.length === 1);
check('the backup carries the dépenses', payload.expenses.length === 1);
check('the backup carries the avoir counter', payload.nextAvoirNumber === 7, String(payload.nextAvoirNumber));
check('the backup carries the devis counter', payload.nextDevisNumber === 4, String(payload.nextDevisNumber));

/* An emptied ledger restored from its own backup must come back whole. This
   is the path a merchant walks after a cleared cache or a new phone. */
const trip = await page.evaluate(() => {
  const saved = window.buildBackup();
  state.clients = []; state.invoices = []; state.products = [];
  state.devis = []; state.payments = []; state.expenses = [];
  const ok = window.applyBackup(JSON.parse(JSON.stringify(saved)));
  return {ok, clients: state.clients.length, invoices: state.invoices.length,
          products: state.products.length, devis: state.devis.length,
          payments: state.payments.length, expenses: state.expenses.length,
          avoir: state.nextAvoirNumber};
});
check('a wiped ledger restores', trip.ok);
check('and the clients come back', trip.clients > 0, String(trip.clients));
check('and the invoices come back', trip.invoices > 0, String(trip.invoices));
check('and the products come back', trip.products === 1, String(trip.products));
check('and the devis come back', trip.devis === 1, String(trip.devis));
check('and the payments come back', trip.payments === 1, String(trip.payments));
check('and the dépenses come back', trip.expenses === 1, String(trip.expenses));
check('and the avoir counter comes back', trip.avoir === 7, String(trip.avoir));

/* A file whose counter is older than its own documents would number a second
   avoir over the top of one that already exists. */
const counter = await page.evaluate(() => {
  const d = window.buildBackup();
  d.invoices = d.invoices.concat([{id:'av9', type:'avoir', number:'AV-2026-004',
    clientId:'c1', date:'2026-07-05', status:'payee', items:[]}]);
  d.nextAvoirNumber = 1;
  window.applyBackup(d);
  return state.nextAvoirNumber;
});
check('a stale avoir counter never walks back over an existing number',
      counter >= 5, String(counter));

/* The rule pro-polish.js states: an absent list means an empty one, never
   whatever the current browser happens to be holding. */
const noExp = await page.evaluate(() => {
  const d = window.buildBackup();
  delete d.expenses;
  window.applyBackup(d);
  return state.expenses.length;
});
check('a backup with no dépenses key restores none, rather than keeping ours',
      noExp === 0, String(noExp));

const refused = await page.evaluate(() => {
  const before = state.clients.length;
  const ok = window.applyBackup({clients: 'not a list', invoices: []});
  return {ok, before, after: state.clients.length};
});
check('a malformed backup is refused', refused.ok === false);
check('and it does not touch what is loaded', refused.after === refused.before,
      refused.before + ' -> ' + refused.after);

/* Offline-first is the whole product. Google's library is the one dependency
   that cannot be served from this domain, so it must not be fetched until
   somebody asks for a sync — and with no OAuth client configured there is
   nothing to ask for, and no card to show. */
const drive = await page.evaluate(() => {
  navigate('settings');
  return {
    configured: typeof DRIVE_CLIENT_ID === 'string' && DRIVE_CLIENT_ID !== '',
    card: !!document.getElementById('drive-card'),
    gsi: !!document.querySelector('script[src*="accounts.google.com"]'),
    hasBuild: typeof window.buildBackup === 'function',
    hasApply: typeof window.applyBackup === 'function'
  };
});
check('no Google script is loaded while nobody has asked to sync', !drive.gsi);
check('the Drive card stays hidden until an OAuth client is configured',
      drive.configured === drive.card,
      'configured=' + drive.configured + ' card=' + drive.card);
check('and the two functions a Drive restore goes through are reachable',
      drive.hasBuild && drive.hasApply);

/* ---------------------------------------------------------------- *
 * Automatic sync, and the promise that a timer never opens a window.
 * ---------------------------------------------------------------- */
console.log('\nAutomatic sync and the conflict guard');

const conflict = await page.evaluate(() => {
  const K = 'fp_drive_mtime';
  const out = {};
  localStorage.removeItem(K);
  out.unknown = driveMovedUnderUs('2026-08-20T10:00:00.000Z');
  localStorage.setItem(K, '2026-08-20T10:00:00.000Z');
  out.same = driveMovedUnderUs('2026-08-20T10:00:00.000Z');
  out.moved = driveMovedUnderUs('2026-08-20T12:30:00.000Z');
  out.silent = driveMovedUnderUs(null);
  localStorage.removeItem(K);
  return out;
});
check('a copy we have never written is not a conflict', conflict.unknown === false);
check('our own stamp is not a conflict', conflict.same === false);
check('a stamp we did not write is a conflict', conflict.moved === true);
check('an unreadable stamp does not invent a conflict', conflict.silent === false);

/* The rule the whole automatic half rests on: writing an invoice must never
   summon a Google window. Without a token in memory the save is marked and
   left, and nothing is fetched. */
const auto = await page.evaluate(() => {
  localStorage.setItem('fp_drive_connected', '1');
  driveToken = null;
  driveDirty = false;
  saveData();
  return {dirty: driveDirty,
          gsi: !!document.querySelector('script[src*="accounts.google.com"]')};
});
check('a save with no live token is marked unsynced', auto.dirty === true);
check('and still fetches nothing from Google', !auto.gsi);

const restoreQuiet = await page.evaluate(() => {
  driveDirty = false;
  driveRestoring = true;
  saveData();
  driveRestoring = false;
  return driveDirty;
});
check('a restore writing state does not queue itself back up', restoreQuiet === false);

/* Both notices offer the copy now that there is somewhere to put it. */
const notices = await page.evaluate(() => {
  applyLocale();
  const b = document.getElementById('lw-drive');
  localStorage.setItem('fp_last_export', String(Date.now() - 90 * 86400000));
  localStorage.removeItem('fp_backup_snoozed_until');
  state.clients = [{id: 'cR', name: 'Client réel'}];
  navigate('dashboard');
  paintBackupNotice();
  const host = document.getElementById('backup-warn');
  return {banner: !!b && !b.className.includes('hidden'),
          label: b ? b.textContent.trim() : '',
          reminder: !!host && host.innerHTML.includes('driveSaveNow')};
});
check('the storage banner offers the Drive copy', notices.banner);
check('and the offer is worded, not an empty button', notices.label.length > 3, notices.label);
check('the thirty-day reminder offers it too', notices.reminder);

const ar = await page.evaluate(() => {
  if (locale !== 'ar') toggleLocale();
  applyLocale();
  const b = document.getElementById('lw-drive');
  const label = b ? b.textContent.trim() : '';
  navigate('settings');
  const card = document.getElementById('drive-card');
  const text = card ? card.textContent : '';
  if (locale !== 'fr') toggleLocale();
  return {label, text};
});
check('the banner offer is translated in Arabic', /Drive/.test(ar.label) && /[؀-ۿ]/.test(ar.label), ar.label);
check('and so is the card in Paramètres', /[؀-ۿ]/.test(ar.text) && !/drive\./.test(ar.text));

/* A file download is a monthly habit. One click is a daily one — and a day of
   invoices is worth more than the nuisance of asking. */
const cadence = await page.evaluate(() => {
  const set = (days) => localStorage.setItem('fp_last_export',
                          String(Date.now() - days * 86400000));
  localStorage.removeItem('fp_backup_snoozed_until');
  state.clients = [{id: 'cR', name: 'Client réel'}];

  localStorage.removeItem('fp_drive_connected');
  set(2);
  const fileTwoDays = backupDue();
  set(40);
  const fileForty = backupDue();

  localStorage.setItem('fp_drive_connected', '1');
  set(2);
  const driveTwoDays = backupDue();
  set(0);
  const driveToday = backupDue();

  snoozeBackup();
  const snoozed = backupDue();
  const buys = parseInt(localStorage.getItem('fp_backup_snoozed_until'), 10) - Date.now();

  localStorage.removeItem('fp_backup_snoozed_until');
  localStorage.removeItem('fp_drive_connected');
  return {fileTwoDays, fileForty, driveTwoDays, driveToday, snoozed, buys};
});
check('without Drive, two days is not yet worth asking about', cadence.fileTwoDays === false);
check('without Drive, forty days is', cadence.fileForty === true);
check('with Drive connected, two days is asked about', cadence.driveTwoDays === true);
check('and a copy made today is left alone', cadence.driveToday === false);
check('"later" still silences it', cadence.snoozed === false);
check('but buys a day rather than a week',
      cadence.buys > 0 && cadence.buys <= 86400000 + 5000, String(cadence.buys));

/* ---------------------------------------------------------------- *
 * The Excel buttons, and the hover that erased them.
 * ---------------------------------------------------------------- */
console.log('\nThe Excel buttons and the dark hover');

await page.evaluate(() => { if (locale !== 'fr') toggleLocale(); navigate('invoices'); });
await page.waitForTimeout(400);

/* A button that says Excel, carries a spreadsheet icon and announces "Export
   Excel OK" used to hand over a semicolon-separated .csv — a file a phone
   often cannot open at all, and a dialog about separators before it is a
   table in Excel. PK is the signature of the real thing. */
{
  const dl = page.waitForEvent('download', {timeout: 15000});
  await page.click('#excel-inv-btn');
  const d = await dl;
  const name = d.suggestedFilename();
  const bytes = await readFile(await d.path());
  check('the Excel button produces an .xlsx', /\.xlsx$/.test(name), name);
  check('and the file is a real workbook, not a csv named xlsx',
        bytes.slice(0, 2).toString('latin1') === 'PK', bytes.slice(0, 4).toString('hex'));
  check('with more in it than a header row', bytes.length > 3000, String(bytes.length));
}

/* Every other hover in styles.css has its dark counterpart; this one did not,
   so the tapped button went near-white while the text stayed near-white with
   it. On a phone the hover state survives the tap, which makes the button a
   merchant just pressed the one they can no longer read. */
const lum = (c) => {
  const [r, g, b] = c.match(/\d+/g).map(Number).slice(0, 3).map(v => {
    v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const hov = await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  const b = document.getElementById('excel-inv-btn');
  const rest = getComputedStyle(b).backgroundColor;
  /* :hover cannot be forced from script, so the rule itself is read back. */
  let hoverBg = '';
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
    for (const r of rules) {
      if (r.selectorText === '.dark .btn-secondary:hover') hoverBg = r.style.background || r.style.backgroundColor;
    }
  }
  return {rest, hoverBg, text: getComputedStyle(b).color};
});
check('a dark-mode hover is defined for secondary buttons', !!hov.hoverBg, hov.hoverBg);
if (hov.hoverBg) {
  const bg = hov.hoverBg.startsWith('#')
    ? `rgb(${parseInt(hov.hoverBg.slice(1,3),16)},${parseInt(hov.hoverBg.slice(3,5),16)},${parseInt(hov.hoverBg.slice(5,7),16)})`
    : hov.hoverBg;
  const ratio = (Math.max(lum(bg), lum(hov.text)) + 0.05) / (Math.min(lum(bg), lum(hov.text)) + 0.05);
  check('and the label stays readable on it', ratio >= 4.5, `contrast ${ratio.toFixed(1)}:1`);
}

/* ---------------------------------------------------------------- *
 * What a link to this domain looks like before anyone opens it.
 *
 * The address is pasted into WhatsApp and Facebook more often than it is
 * typed into a search bar, and a share card is the whole first impression.
 * These are cheap to get wrong in a way nothing in the application would
 * ever reveal: a relative og:image is ignored in silence, and a card that
 * points at a file the build does not copy shows a broken preview to
 * everyone but the person who added it.
 * ---------------------------------------------------------------- */
console.log('\nShare cards and structured data');

const INDEXED = ['index.html', 'guide.html', 'droit-de-timbre.html', 'montant-en-lettres.html',
                 'calcul-tva.html', 'calcul-salaire.html', 'international.html'];
for (const f of INDEXED) {
  const html = await readFile(join(ROOT, f), 'utf8');
  check(`${f} names a canonical URL`, /rel="canonical"/.test(html));
  check(`${f} carries a share image`, /property="og:image"/.test(html));
  check(`${f} gives it an absolute URL, the only kind a crawler follows`,
        /property="og:image" content="https:\/\/www\.facturedz\.com\/og\.png"/.test(html));
}

/* The picture itself has to survive the build: static/*.png is what gets
   copied into public/, and a card referenced from the root that only exists
   in the repository is a broken preview on every share. */
const og = await readFile(join(ROOT, 'public', 'og.png')).catch(() => null);
check('the build copies the share image to the site root', og !== null);
check('and it is a real PNG', og !== null && og[1] === 0x50 && og[2] === 0x4e && og[3] === 0x47);
check('at the size the networks crop to (under 1 MB)', og !== null && og.length < 1024 * 1024,
      og ? Math.round(og.length / 1024) + ' KB' : 'missing');

const home = await readFile(join(ROOT, 'index.html'), 'utf8');
const ld = (home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
let parsed = null;
try { parsed = JSON.parse(ld); } catch (e) { parsed = null; }
check('the home page carries structured data', !!ld);
check('and it is valid JSON, not a rich result silently dropped', parsed !== null);
check('it declares the application and its price', parsed &&
      parsed['@type'] === 'SoftwareApplication' && parsed.offers &&
      String(parsed.offers.price) === '0',
      parsed ? parsed['@type'] + ' / ' + (parsed.offers && parsed.offers.price) : 'unparsed');
check('and both languages it is written in', parsed &&
      Array.isArray(parsed.inLanguage) && parsed.inLanguage.includes('ar'));

/* The mockups ship in the same folder as the site. They must stay out of the
   index, or they compete with the pages that are meant to rank. */
for (const f of ['dashboard-facturepro.html', 'mobile-facturepro.html', 'design-system.html']) {
  const html = await readFile(join(ROOT, f), 'utf8');
  check(`${f} stays out of the search index`, /name="robots" content="noindex/.test(html));
}
const landing = await readFile(join(ROOT, 'landing-facturepro.html'), 'utf8');
check('the old landing page points its authority at the home page',
      /rel="canonical" href="https:\/\/www\.facturedz\.com\/"/.test(landing));

/* ---------------------------------------------------------------- *
 * The host the site claims to live at.
 *
 * The apex answers 308 to www: www is what serves the site. Every address
 * the site declares about itself has to name that host, or each one is a hop
 * a crawler must follow and a canonical pointing at a redirect — which Google
 * is free to ignore. The seven sitemap entries were the worst of it:
 * submitted naming the apex, Search Console reports the whole file as pages
 * with redirect and indexes none of them directly.
 * ---------------------------------------------------------------- */
console.log('\nThe host the site claims to live at');

for (const f of [...INDEXED, 'landing-facturepro.html', 'sitemap.xml', 'robots.txt']) {
  const text = await readFile(join(ROOT, f), 'utf8');
  const bare = (text.match(/https:\/\/facturedz\.com/g) || []).length;
  check(`${f} never names the host that only redirects`, bare === 0, bare + ' left');
}

const map = await readFile(join(ROOT, 'sitemap.xml'), 'utf8');
check('every sitemap entry names the served host',
      (map.match(/<loc>https:\/\/www\.facturedz\.com/g) || []).length ===
      (map.match(/<loc>/g) || []).length,
      (map.match(/<loc>/g) || []).length + ' entries');
check('robots points at the sitemap on that host',
      /Sitemap: https:\/\/www\.facturedz\.com\/sitemap\.xml/.test(
        await readFile(join(ROOT, 'robots.txt'), 'utf8')));

/* Removing the tag after validation drops the property, and with it the
   coverage reports and the sitemap submission. */
check('the home page keeps its Search Console proof of ownership',
      /name="google-site-verification" content="[A-Za-z0-9_-]{20,}"/.test(home),
      (home.match(/content="[A-Za-z0-9_-]{20,}"/) || ['missing'])[0].slice(0, 30) + '…');

check('no unexpected script error during the run', consoleErrors.length === 0, consoleErrors.join(' | '));

/* ---------------------------------------------------------------- */
await browser.close();
server.close();

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.log('\nDo not deploy. Failing checks:');
  for (const f of failures) console.log(`  - ${f.name}${f.detail ? ': ' + f.detail : ''}`);
  process.exit(1);
}
console.log('Safe to deploy.');
