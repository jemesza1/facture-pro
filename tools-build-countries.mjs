/* One generator, six addresses.
 *
 * international.html holds the whole thing — the COUNTRIES table, the form,
 * the PDF. Six countries sharing that one address competed for nothing: a
 * search engine indexes URLs, and "facture Maroc" and "UAE tax invoice" are
 * not the same page to it.
 *
 * So the build writes one file per country from that single source, changing
 * only the head and the data-country attribute. Nothing is duplicated in the
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
   title: 'Facture Maroc — modèle gratuit avec ICE, IF et TVA 20 %',
   desc: "Créez une facture marocaine conforme : ICE, identifiant fiscal, RC, TVA 20 % et total en dirhams. Export PDF immédiat, sans inscription et sans compte.",
   og: 'Facture Maroc — modèle gratuit, ICE et TVA 20 %'},
  {file: 'facture-tunisie.html', code: 'TN', lang: 'fr',
   title: 'Facture Tunisie — modèle gratuit avec matricule fiscal et TVA 19 %',
   desc: "Créez une facture tunisienne conforme : matricule fiscal, RC, TVA 19 %, timbre fiscal et total en dinars. Export PDF immédiat, sans inscription.",
   og: 'Facture Tunisie — matricule fiscal, TVA et timbre'},
  {file: 'uae-tax-invoice.html', code: 'AE', lang: 'en',
   title: 'UAE Tax Invoice Template — free, with TRN and 5 % VAT',
   desc: 'Create a UAE tax invoice with the fields the FTA expects: TRN, 5 % VAT and a dirham total. Instant PDF, no signup and no account.',
   og: 'UAE Tax Invoice Template — TRN and 5 % VAT'},
  {file: 'uk-invoice-template.html', code: 'GB', lang: 'en',
   title: 'UK Invoice Template — free, with VAT number and 20 % VAT',
   desc: 'Create a UK invoice with a VAT number, company number and 20 % VAT, totalled in pounds. Instant PDF, no signup and no account.',
   og: 'UK Invoice Template — VAT number and 20 % VAT'},
  {file: 'us-invoice-template.html', code: 'US', lang: 'en',
   title: 'US Invoice Template — free, no signup',
   desc: 'Create a US invoice with your EIN, an optional sales tax line and a dollar total. Instant PDF, no signup and no account.',
   og: 'US Invoice Template — free, no signup'},
  {file: 'free-invoice-generator.html', code: 'INT', lang: 'en',
   title: 'Free Invoice Generator — any country, instant PDF, no signup',
   desc: 'Create and download a professional invoice in seconds: your own currency and tax rate, the identifiers your country expects, and a PDF at the end. No account, nothing stored on our servers.',
   og: 'Free Invoice Generator — instant PDF, no signup'},
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
  return s;
}

const src = readFileSync(SRC, 'utf8');
let n = 0;
for (const page of COUNTRY_PAGES) {
  writeFileSync(join(OUT, page.file), one(src, page));
  n++;
}
console.log(`countries: ${n} pages written from international.html`);
