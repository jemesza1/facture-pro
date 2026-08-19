# `international.html` — the public multi-country invoice generator

A standalone page, not a feature of the application. It is the fifth of the
public tool pages — `montant-en-lettres.html`, `droit-de-timbre.html`,
`calcul-tva.html`, `calcul-salaire.html` — and it is built the same way: one
file, in the sitemap, written to be found through a search.

Two drafts exist and are the starting point, not the deliverable. Both were
authored outside the repository and break rules the repository has paid for.

## Why standalone, and not a page inside the app

The first design put the generator inside FacturePro, as a page beside
Factures. That reading was wrong, and the reasons are worth keeping because
they are the reasons this shape is safe.

An in-app page would have collided on four globals — `state` (a.js), `I18N`
(i18n.js), `TEMPLATES` (a.js), `formatMoney` (a.js). It would have needed a
branch in `calcInvoiceTotals`, which ten files sum. It would have raised the
question of whether a EUR invoice belongs in a dashboard total that is in
dinars, and whether it belongs in the Journal du mois, and what happens to
Créances. Every one of those is a way to break a working fiscal product.

A standalone page has none of them. The application never loads it. Nothing in
`a.js`, `c2.js`, `excel.js`, `commerce.js` or `lib-calc.js` changes. The
Algerian invoice — the timbre, the 19/9/0 per line, the G50 recap, the 29
templates — is not touched, and the 198 checks stay the proof of that.

**The invoice this page produces is not saved into anyone's books.** It is
filled in, previewed, exported to PDF, and forgotten. A visitor arriving from
a search has no books here. That is the whole point, and it is what makes the
page free of risk.

## What the drafts get right — keep this

- The `COUNTRIES` table: per-country identifier fields (SIRET and TVA intra for
  France, ICE and IF for Morocco, matricule fiscal for Tunisia, TRN for the
  UAE, VAT + CR for Saudi, EIN for the US), currency, rate, legal sentence,
  invoice title. This is the real work in the drafts.
- Three document languages with `legalEn` / `invoiceTitleEn` alongside the
  French and Arabic. An English invoice is the point: a French invoice sent to
  a British or Emirati client is not usable.
- Defaulting the template, currency, rate and legal text from the country.
- Landing section ahead of the form, with the country chips as entry points.

## What must change before it ships

**1. No CDN.** The drafts load `cdn.tailwindcss.com` and two libraries from
`cdnjs.cloudflare.com`. The repository removed exactly these, and the README
says why: an hour where the CDN was slow or blocked — not rare on an Algerian
connection — left the application an unstyled column of links, and a blocked
`cdnjs` made the PDF button throw `html2canvas is not defined`. Use
`/vendor/tailwind.css`, `/vendor/jspdf.umd.min.js`, `/vendor/html2canvas.min.js`,
which `npm run vendor` already fills.

**2. Add the file to `tailwind/config.js`.** Its `content` array lists
`index.html`, `droit-de-timbre.html`, `montant-en-lettres.html` and `./*.js`.
A class used only in `international.html` generates no rule until the file is
in that list.

**3. Latin digits, always.** `formatMoney` picks `ar-DZ` for Arabic, which can
render `١٢٣`. Rule 4 in the README: money and codes stay latin. Format the
number with a fixed locale and let only the words change.

**4. Do not claim compliance we cannot deliver.** The Saudi entry says
"Compliant with ZATCA requirements". A Saudi tax invoice needs a QR carrying
TLV-encoded fields; this page emits none, so the sentence is false. Say
`Tax Invoice` and stop. The same restraint applies to France: French B2B
invoicing is moving onto certified platforms, and a PDF is not one, so the
page must not describe itself as conforming to it. `International invoice` is
honest and sufficient everywhere.

**5. `canonical` must match what is served.** The draft points at
`/international`; the site serves `.html` files, so it is
`https://facturedz.com/international.html` unless a rewrite is added.

**6. The multi-page PDF loop is wrong.** It re-adds the same rasterised image
at a negative offset, which happens to look right for two pages and cuts text
mid-line on three. Either bound the invoice to one page or paginate properly.

**7. Register the page.** `sitemap.xml`, and the Vercel analytics snippet the
other five pages carry — without it this page's visitors are invisible, which
is the same fault the repository already fixed once for the tool pages.

`c2.js`'s `ok=[...]` page list is deliberately **not** touched: that array
guards SPA routes, and this is a document, not a route.

## Scope — what this page does not do

No G50. No Journal du mois. No droit de timbre. No devis, no avoir, no bon de
livraison. No Créances, no payment status, no client list. One document type,
one page, one PDF.

## Checks to add

The suite cannot reach a page the application never loads, so these are new
and small:

- the page renders with no network beyond this origin (no CDN request)
- choosing a country sets its currency, rate and identifier fields
- a Saudi invoice does not claim ZATCA compliance
- the total carries no droit de timbre for any country, including DZ
- amounts render in latin digits in all three languages
- the 198 existing checks still pass, unchanged — that is what proves the
  Algerian side did not move

## Cost

About a day, most of it in stripping the CDN dependency and the PDF export.
