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

  await page.evaluate(() => { state.devis = []; state.payments = []; saveData(); });
}

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
