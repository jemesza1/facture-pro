/* One generator, six addresses.

 * international.html holds the whole thing — the COUNTRIES table, the form,
 * the PDF. Six countries sharing that one address competed for nothing: a
 * search engine indexes URLs, and "facture Maroc" and "UAE tax invoice" are
 * not the same page to it.
 *
 * The head is unique per file. The body used to be word-for-word the same,
 * which is duplicate content. Each generated page now carries a crawler-visible
 * intro written for that country, and a hreflang cluster so the six point at
 * each other rather than competing. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const SRC = join(ROOT, 'international.html');
const OUT = join(ROOT, 'public');
const HOST = 'https://www.facturedz.com';

export const COUNTRY_PAGES = [
  {file: 'facture-maroc.html', code: 'MA', lang: 'fr', hreflang: 'fr-MA',
   title: 'Facture Maroc — modèle gratuit, ICE et TVA 20 % | نموذج فاتورة المغرب',
   desc: "Créez une facture marocaine conforme : ICE, identifiant fiscal, RC, TVA 20 % et total en dirhams. Export PDF immédiat, sans inscription et sans compte. أنشئ فاتورة مغربية مطابقة: ICE والمعرّف الجبائي والسجلّ التجاري والرسم 20٪ بالدرهم، وتصدير PDF فوري بلا تسجيل.",
   og: 'Facture Maroc — modèle gratuit, ICE et TVA 20 %',
   h1: 'Une facture marocaine avec ICE, IF et TVA 20 %.',
   lede: 'Le modèle porte l’identifiant commun de l’entreprise, l’identifiant fiscal, le registre de commerce, la TVA à 20 % et le total en dirhams. PDF immédiat, sans compte.',
   intro: `<section id="country-copy" data-country-copy="MA" class="max-w-3xl mx-auto px-4 py-10">
<h2 class="text-xl font-bold mb-3">Facture Maroc : ICE, identifiant fiscal et TVA 20 %</h2>
<p>Au Maroc, une facture professionnelle mentionne l’ICE (Identifiant Commun de l’Entreprise), l’identifiant fiscal (IF) et le numéro RC. Le taux normal de TVA est de 20 %, le total s’exprime en dirhams (MAD). Ce générateur préremplit ces champs — il ne calcule pas le droit de timbre marocain : s’il s’applique, ajoutez-le en « autre frais ».</p>
<p lang="ar" dir="rtl" class="mt-4">فاتورة المغرب تتطلب ICE والمعرّف الجبائي والسجل التجاري، والرسم 20٪ بالدرهم. هذه الصفحة تملأ الحقول ولا تحسب رسم الطابع المغربي.</p>
<ul class="mt-4 list-disc ps-5 space-y-1 text-sm">
<li>ICE — Identifiant Commun de l’Entreprise (15 chiffres)</li>
<li>Identifiant fiscal (IF) et registre de commerce (RC)</li>
<li>TVA marocaine 20 % · total en MAD</li>
</ul>
</section>`},
  {file: 'facture-tunisie.html', code: 'TN', lang: 'fr', hreflang: 'fr-TN',
   title: 'Facture Tunisie — modèle gratuit, TVA 19 % | نموذج فاتورة تونس',
   desc: "Créez une facture tunisienne conforme : matricule fiscal, RC, TVA 19 %, timbre fiscal et total en dinars. Export PDF immédiat, sans inscription. أنشئ فاتورة تونسية مطابقة: المعرّف الجبائي والسجلّ التجاري والرسم 19٪ والطابع الجبائي بالدينار، وتصدير PDF فوري بلا تسجيل.",
   og: 'Facture Tunisie — matricule fiscal, TVA et timbre',
   h1: 'Une facture tunisienne : matricule fiscal, TVA 19 %, timbre.',
   lede: 'Le document porte le matricule fiscal, le RC, la TVA à 19 % et un total en dinars tunisiens. Le timbre fiscal n’est pas calculé ici : ajoutez-le en autre frais après avoir vérifié le montant en vigueur.',
   intro: `<section id="country-copy" data-country-copy="TN" class="max-w-3xl mx-auto px-4 py-10">
<h2 class="text-xl font-bold mb-3">Facture Tunisie : matricule fiscal et timbre</h2>
<p>Une facture tunisienne identifie le vendeur par son matricule fiscal. Le taux normal de TVA est de 19 %. Le timbre fiscal (droit de timbre sur certaines quittances) n’est pas calculé par cette page : vérifiez le barème en vigueur et portez-le en « autre frais » pour qu’il apparaisse sur le PDF, en dinars tunisiens (TND).</p>
<p lang="ar" dir="rtl" class="mt-4">الفاتورة التونسية تحمل المعرّف الجبائي والرسم 19٪ بالدينار التونسي. الطابع الجبائي يُضاف يدوياً حسب السعر الجاري.</p>
<ul class="mt-4 list-disc ps-5 space-y-1 text-sm">
<li>Matricule fiscal du vendeur</li>
<li>TVA tunisienne 19 % · total en TND</li>
<li>Timbre fiscal à saisir, pas à inventer</li>
</ul>
</section>`},
  {file: 'uae-tax-invoice.html', code: 'AE', lang: 'en', hreflang: 'en-AE',
   title: 'UAE Tax Invoice Template — TRN and 5 % VAT | نموذج فاتورة ضريبية الإمارات',
   desc: 'Create a UAE tax invoice with the fields the FTA expects: TRN, 5 % VAT and a dirham total. Instant PDF, no signup and no account. أنشئ فاتورة ضريبية إماراتية بالحقول التي تطلبها الهيئة: رقم التسجيل الضريبي والضريبة 5٪ بالدرهم، وPDF فوري بلا تسجيل.',
   og: 'UAE Tax Invoice Template — TRN and 5 % VAT',
   h1: 'A UAE tax invoice with TRN and 5 % VAT.',
   lede: 'The Federal Tax Authority asks for a Tax Registration Number on a tax invoice. This page puts TRN, 5 % VAT and an AED total on the PDF. No account.',
   intro: `<section id="country-copy" data-country-copy="AE" class="max-w-3xl mx-auto px-4 py-10">
<h2 class="text-xl font-bold mb-3">UAE tax invoice: TRN and 5 % VAT</h2>
<p>A UAE tax invoice names the supplier by its Tax Registration Number (TRN). Standard VAT is 5 %. Amounts are in UAE dirhams (AED). This generator fills those fields and exports a PDF; it is not a replacement for FTA filing or e-invoicing mandates that may apply to your licence.</p>
<p lang="ar" dir="rtl" class="mt-4">الفاتورة الضريبية في الإمارات تحمل رقم التسجيل الضريبي (TRN) وضريبة 5٪ بالدرهم الإماراتي.</p>
<ul class="mt-4 list-disc ps-5 space-y-1 text-sm">
<li>TRN — Tax Registration Number</li>
<li>5 % VAT · total in AED</li>
<li>PDF export, nothing stored on our servers</li>
</ul>
</section>`},
  {file: 'uk-invoice-template.html', code: 'GB', lang: 'en', hreflang: 'en-GB',
   title: 'UK Invoice Template — free, with VAT number and 20 % VAT',
   desc: 'Create a UK invoice with a VAT number, company number and 20 % VAT, totalled in pounds. Instant PDF, no signup and no account.',
   og: 'UK Invoice Template — VAT number and 20 % VAT',
   h1: 'A UK invoice with VAT number, company number and 20 % VAT.',
   lede: 'VAT-registered businesses put their VAT number on the invoice. Companies House numbers sit beside it. Standard VAT is 20 %, the total is in pounds sterling.',
   intro: `<section id="country-copy" data-country-copy="GB" class="max-w-3xl mx-auto px-4 py-10">
<h2 class="text-xl font-bold mb-3">UK invoice template: VAT number and 20 % VAT</h2>
<p>A British VAT invoice shows the supplier’s VAT registration number and, for a limited company, the Companies House number. The standard rate is 20 %. Totals are in pounds sterling (GBP). This page is a PDF template — it does not submit a VAT return to HMRC and it does not replace Making Tax Digital.</p>
<ul class="mt-4 list-disc ps-5 space-y-1 text-sm">
<li>VAT registration number</li>
<li>Company number (Companies House)</li>
<li>20 % VAT · total in GBP</li>
</ul>
</section>`},
  {file: 'us-invoice-template.html', code: 'US', lang: 'en', hreflang: 'en-US',
   title: 'US Invoice Template — free, no signup',
   desc: 'Create a US invoice with your EIN, an optional sales tax line and a dollar total. Instant PDF, no signup and no account.',
   og: 'US Invoice Template — free, no signup',
   h1: 'A US invoice with EIN, optional sales tax, dollar total.',
   lede: 'There is no federal invoice layout. This page puts your Employer Identification Number on the paper, lets you add a sales-tax line where a state requires one, and totals in US dollars.',
   intro: `<section id="country-copy" data-country-copy="US" class="max-w-3xl mx-auto px-4 py-10">
<h2 class="text-xl font-bold mb-3">US invoice template: EIN and sales tax</h2>
<p>The United States has no single federal invoice form. What most buyers ask for is an Employer Identification Number (EIN) and, where the state charges sales tax, a line that says so. This generator defaults the tax rate to 0 % — you type the rate that applies to that sale — and totals in US dollars (USD). It does not file with any state department of revenue.</p>
<ul class="mt-4 list-disc ps-5 space-y-1 text-sm">
<li>EIN — Employer Identification Number</li>
<li>Optional sales-tax line, rate left to you</li>
<li>Total in USD · instant PDF</li>
</ul>
</section>`},
  {file: 'free-invoice-generator.html', code: 'INT', lang: 'en', hreflang: 'en',
   title: 'Free Invoice Generator — any country, instant PDF, no signup',
   desc: 'Create and download a professional invoice in seconds: your own currency and tax rate, the identifiers your country expects, and a PDF at the end. No account, nothing stored on our servers.',
   og: 'Free Invoice Generator — instant PDF, no signup',
   h1: 'A free invoice generator for any country.',
   lede: 'Pick a currency, a tax rate and the identifier your country prints on an invoice. The PDF is yours. Nothing is stored on our servers, and there is no account to create.',
   intro: `<section id="country-copy" data-country-copy="INT" class="max-w-3xl mx-auto px-4 py-10">
<h2 class="text-xl font-bold mb-3">Free invoice generator — any currency, any tax rate</h2>
<p>This page is the generic invoice: you choose the currency, the tax name and the rate, and you type the tax number your country uses. It is the right door when none of the country addresses (Morocco, Tunisia, UAE, UK, US) matches. It still does not compute Algerian droit de timbre or a G50 — those live in the Algerian application on this same domain.</p>
<ul class="mt-4 list-disc ps-5 space-y-1 text-sm">
<li>Your currency and your tax rate</li>
<li>A tax-number field you label yourself</li>
<li>No signup · PDF in one click · nothing stored here</li>
</ul>
</section>`},
];

const HREFLANG = COUNTRY_PAGES.map(p =>
  `<link rel="alternate" hreflang="${p.hreflang}" href="${HOST}/${p.file}" />`
).join('\n') +
  `\n<link rel="alternate" hreflang="x-default" href="${HOST}/free-invoice-generator.html" />`;

function one(src, page) {
  let s = src;
  const swap = (re, to, what) => {
    if (!re.test(s)) { throw new Error(`${page.file}: no ${what} to replace`); }
    s = s.replace(re, to);
  };
  swap(/<html lang="[^"]*"/, `<html lang="${page.lang}" data-country="${page.code}"`, 'html tag');
  swap(/<title>[\s\S]*?<\/title>/, `<title>${page.title}</title>`, 'title');
  swap(/<meta name="description" content="[^"]*"/,
       `<meta name="description" content="${page.desc}"`, 'description');
  swap(/<link rel="canonical" href="[^"]*"/,
       `<link rel="canonical" href="${HOST}/${page.file}"`, 'canonical');
  swap(/<meta property="og:title" content="[^"]*"/,
       `<meta property="og:title" content="${page.og}"`, 'og:title');
  swap(/<meta property="og:description" content="[^"]*"/,
       `<meta property="og:description" content="${page.desc}"`, 'og:description');
  if (/<meta property="og:url"/.test(s)) {
    s = s.replace(/<meta property="og:url" content="[^"]*"/,
                  `<meta property="og:url" content="${HOST}/${page.file}"`);
  }
  /* Visible copy the six used to share. A crawler that never runs JS still
     reads a different H1, lede and body on each address. */
  swap(/<h1 id="t-h1"[^>]*>[\s\S]*?<\/h1>/,
       `<h1 id="t-h1" class="text-3xl sm:text-4xl font-bold text-white leading-tight">${page.h1}</h1>`,
       'h1');
  swap(/<p id="t-lede"[^>]*>[\s\S]*?<\/p>/,
       `<p id="t-lede" class="mt-4 text-slate-300 leading-relaxed">${page.lede}</p>`,
       'lede');
  if (s.indexOf('<!--COUNTRY_INTRO-->') === -1) {
    throw new Error(`${page.file}: no COUNTRY_INTRO marker`);
  }
  s = s.replace('<!--COUNTRY_INTRO-->', page.intro);
  if (s.indexOf('hreflang') === -1) {
    const head = s.search(/<\/head>/i);
    if (head === -1) throw new Error(`${page.file}: no </head>`);
    s = s.slice(0, head) + HREFLANG + '\n' + s.slice(head);
  }
  return s;
}

const src = readFileSync(SRC, 'utf8');
let n = 0;
for (const page of COUNTRY_PAGES) {
  writeFileSync(join(OUT, page.file), one(src, page));
  n++;
}
console.log(`countries: ${n} pages written from international.html`);
