/* One generator, six addresses.
 *
 * international.html holds the whole thing — the COUNTRIES table, the form,
 * the PDF. Six countries sharing that one address competed for nothing: a
 * search engine indexes URLs, and "facture Maroc" and "UAE tax invoice" are
 * not the same page to it.
 *
 * So the build writes one file per country from that single source, changing
 * the head, the data-country attribute, and the #country-copy article — the
 * one block setLang never rewrites. Nothing else is duplicated in the
 * repository: edit international.html and every country page follows on the
 * next build. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const SRC = join(ROOT, 'international.html');
const OUT = join(ROOT, 'public');
const HOST = 'https://www.facturedz.com';

export const COUNTRY_PAGES = [
  {file: 'facture-maroc.html', code: 'MA', lang: 'fr',
   title: 'Facture Maroc — modèle gratuit, ICE et TVA 20 % | نموذج فاتورة المغرب',
   desc: "Créez une facture marocaine conforme : ICE, identifiant fiscal, RC, TVA 20 % et total en dirhams. Export PDF immédiat, sans inscription et sans compte. أنشئ فاتورة مغربية مطابقة: ICE والمعرّف الجبائي والسجلّ التجاري والرسم 20٪ بالدرهم، وتصدير PDF فوري بلا تسجيل.",
   og: 'Facture Maroc — modèle gratuit, ICE et TVA 20 %',
   copy: `<h1>Facture Maroc — ICE, identifiant fiscal et TVA 20 %</h1>
<p>Un modèle de facture marocaine n'est pas une facture algérienne avec le dinar remplacé par le dirham. L'<strong>ICE</strong> (identifiant commun de l'entreprise, 15 chiffres), l'<strong>identifiant fiscal</strong>, le registre du commerce et la <strong>TVA 20 %</strong> sont les mentions qu'un client, un expert-comptable ou l'administration fiscale au Maroc cherchent sur la pièce. Cette page les pose pour vous : MAD, 20 %, champs ICE et IF, et un PDF A4 tout de suite.</p>
<p>Rien n'est envoyé nulle part. Vous remplissez, vous exportez, le brouillon reste dans ce navigateur. Pas de compte, pas d'essai, pas de filigrane. النموذج مجاني: ICE والمعرّف الجبائي والسجل التجاري والدرهم، وتصدير PDF بلا تسجيل.</p>
<h2>Ce que la page remplit à votre place</h2>
<ul>
<li>ICE (15 chiffres) et identifiant fiscal de l'émetteur et du client</li>
<li>Registre du commerce marocain, pas le RC algérien</li>
<li>TVA au taux marocain de 20 %, total en dirhams (MAD)</li>
<li>Export PDF immédiat, français ou anglais sur le document</li>
</ul>
<p>Pour un autre pays, le générateur international et les adresses Tunisie, Émirats, Royaume-Uni et États-Unis sont en bas de page. L'application algérienne — NIF, NIS, droit de timbre, décret 05-468 — reste sur <a href="/">facturedz.com</a>.</p>`},
  {file: 'facture-tunisie.html', code: 'TN', lang: 'fr',
   title: 'Facture Tunisie — modèle gratuit, TVA 19 % | نموذج فاتورة تونس',
   desc: "Créez une facture tunisienne conforme : matricule fiscal, RC, TVA 19 %, timbre fiscal et total en dinars. Export PDF immédiat, sans inscription. أنشئ فاتورة تونسية مطابقة: المعرّف الجبائي والسجلّ التجاري والرسم 19٪ والطابع الجبائي بالدينار، وتصدير PDF فوري بلا تسجيل.",
   og: 'Facture Tunisie — matricule fiscal, TVA et timbre',
   copy: `<h1>Facture Tunisie — matricule fiscal, TVA 19 % et timbre fiscal</h1>
<p>Une facture tunisienne porte un <strong>matricule fiscal</strong>, un registre du commerce, la <strong>TVA 19 %</strong> et, selon le mode de règlement, le <strong>timbre fiscal</strong> tunisien — ce n'est pas le droit de timbre algérien, ni la TVA marocaine. Le total est en dinars tunisiens (TND). Cette page ouvre le formulaire déjà calé sur la Tunisie : vous n'avez pas à choisir le pays une seconde fois.</p>
<p>Le PDF se télécharge sans créer de compte. Les données restent sur l'appareil. أنشئ فاتورة تونسية بالمعرّف الجبائي (matricule fiscal) والدينار التونسي والطابع الجبائي، بلا حساب.</p>
<h2>Mentions posées pour la Tunisie</h2>
<ul>
<li>Matricule fiscal de l'émetteur et du client</li>
<li>Registre du commerce tunisien</li>
<li>TVA 19 % et ligne optionnelle pour le timbre fiscal</li>
<li>Total en dinars tunisiens (TND), export PDF A4</li>
</ul>
<p>Le générateur marocain, émirati, britannique et américain, ainsi que l'application algérienne, sont liés en pied de page.</p>`},
  {file: 'uae-tax-invoice.html', code: 'AE', lang: 'en',
   title: 'UAE Tax Invoice Template — TRN and 5 % VAT | نموذج فاتورة ضريبية الإمارات',
   desc: 'Create a UAE tax invoice with the fields the FTA expects: TRN, 5 % VAT and a dirham total. Instant PDF, no signup and no account. أنشئ فاتورة ضريبية إماراتية بالحقول التي تطلبها الهيئة: رقم التسجيل الضريبي والضريبة 5٪ بالدرهم، وPDF فوري بلا تسجيل.',
   og: 'UAE Tax Invoice Template — TRN and 5 % VAT',
   copy: `<h1>UAE tax invoice — TRN, 5 % VAT, FTA fields</h1>
<p>A tax invoice in the United Arab Emirates is the document the Federal Tax Authority (FTA) expects to see a <strong>TRN</strong> (Tax Registration Number) on, with <strong>5 % VAT</strong> and a total in UAE dirhams (AED). This page is that form: TRN fields for supplier and customer, the Emirati rate, and a PDF you can hand over or file. It is not a Moroccan ICE invoice and not an Algerian NIF invoice with the currency swapped.</p>
<p>Nothing is stored on our servers. Fill it in, export, done. أنشئ فاتورة ضريبية إماراتية برقم التسجيل الضريبي (TRN) وضريبة 5٪ بالدرهم، وPDF فوري بلا تسجيل.</p>
<h2>What this template fills in</h2>
<ul>
<li>TRN for the business and for the customer, as the FTA asks</li>
<li>5 % VAT, the standard UAE rate, on each line</li>
<li>Totals in AED (UAE dirham), not MAD and not DZD</li>
<li>Instant A4 PDF, no account and no watermark</li>
</ul>
<p>Invoices for Morocco, Tunisia, the UK and the US have their own addresses. Algerian merchants invoicing under décret 05-468 stay on <a href="/">the main application</a>.</p>`},
  {file: 'uk-invoice-template.html', code: 'GB', lang: 'en',
   title: 'UK Invoice Template — free, with VAT number and 20 % VAT',
   desc: 'Create a UK invoice with a VAT number, company number and 20 % VAT, totalled in pounds. Instant PDF, no signup and no account.',
   og: 'UK Invoice Template — VAT number and 20 % VAT',
   copy: `<h1>UK invoice template — VAT number, company number, 20 % VAT</h1>
<p>A British invoice names a <strong>VAT number</strong> (the GB VAT registration) and, for a limited company, the <strong>Companies House</strong> company number. The standard rate is <strong>20 % VAT</strong>, and the total is in pounds sterling (GBP). This page opens already set to the United Kingdom: those fields, that rate, that currency. It will not ask you for an ICE, a TRN or a NIF.</p>
<p>Export a PDF in one click. The draft lives in this browser only — no signup, no account, nothing sent to us.</p>
<h2>What a UK invoice on this page carries</h2>
<ul>
<li>VAT number of the supplier and, where you have it, of the customer</li>
<li>Companies House company number</li>
<li>20 % VAT, the UK standard rate, line by line</li>
<li>Totals in GBP, A4 PDF ready to send</li>
</ul>
<p>Need a US invoice, a UAE tax invoice, or a Moroccan one? Each has its own page, linked below. Algerian invoicing stays on the home application.</p>`},
  {file: 'us-invoice-template.html', code: 'US', lang: 'en',
   title: 'US Invoice Template — free, no signup',
   desc: 'Create a US invoice with your EIN, an optional sales tax line and a dollar total. Instant PDF, no signup and no account.',
   og: 'US Invoice Template — free, no signup',
   copy: `<h1>US invoice template — EIN, sales tax, dollar total</h1>
<p>A United States invoice is not a VAT document. It carries an <strong>EIN</strong> (Employer Identification Number) for the business, an optional <strong>sales tax</strong> line whose rate you set (there is no federal VAT), and a total in US dollars (USD). This page is that template: EIN fields, a tax rate you control, dollars, and a PDF. It will not print a TRN, an ICE or a NIF.</p>
<p>No account. Nothing leaves the device. Fill the form, download the PDF, send it.</p>
<h2>What this US template gives you</h2>
<ul>
<li>EIN of the issuer, and a field for the customer's tax id if you need it</li>
<li>Optional sales tax at the rate you type — not a 20 % VAT baked in</li>
<li>Totals in USD</li>
<li>Instant A4 PDF, no signup and no watermark</li>
</ul>
<p>UK, UAE, Moroccan and Tunisian invoices live on their own addresses. The Algerian application — NIF, NIS, droit de timbre — is on the home page.</p>`},
  {file: 'free-invoice-generator.html', code: 'INT', lang: 'en',
   title: 'Free Invoice Generator — any country, instant PDF, no signup',
   desc: 'Create and download a professional invoice in seconds: your own currency and tax rate, the identifiers your country expects, and a PDF at the end. No account, nothing stored on our servers.',
   og: 'Free Invoice Generator — instant PDF, no signup',
   copy: `<h1>Free invoice generator — any country, your own currency, instant PDF</h1>
<p>Not every invoice is Moroccan, Tunisian, Emirati, British or American. This generator lets you pick the country, type the identifiers that country actually uses, set <strong>your own currency</strong> and <strong>your own tax rate</strong>, and download a professional PDF. No account, nothing stored on our servers, no watermark.</p>
<p>Use it when you invoice from a country we have not given its own address, or when you just need a clean invoice in a hurry. The specialised pages (ICE, matricule fiscal, TRN, VAT number, EIN) stay better if that is where you are.</p>
<h2>What you control here</h2>
<ul>
<li>Country, currency and tax name — you type them, we do not guess a wrong rate</li>
<li>The identifier labels your jurisdiction expects</li>
<li>Line items, dates, notes, PDF export</li>
<li>French, English or Arabic for the interface; the document stays left-to-right</li>
</ul>
<p>Algerian merchants who need NIF, NIS, RC and the droit de timbre should use <a href="/">the FacturePro application</a> instead — that is the product built for décret 05-468.</p>`},
];

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
  /* Its own address, so the six do not point a share card at each other. */
  if (/<meta property="og:url"/.test(s)) {
    s = s.replace(/<meta property="og:url" content="[^"]*"/,
                  `<meta property="og:url" content="${HOST}/${page.file}"`);
  }
  if (!page.copy) throw new Error(`${page.file}: missing unique country copy`);
  swap(/<article id="country-copy"[^>]*>[\s\S]*?<\/article>/,
       `<article id="country-copy">${page.copy}</article>`, 'country-copy');
  return s;
}

const src = readFileSync(SRC, 'utf8');
let n = 0;
for (const page of COUNTRY_PAGES) {
  writeFileSync(join(OUT, page.file), one(src, page));
  n++;
}
console.log(`countries: ${n} pages written from international.html`);
