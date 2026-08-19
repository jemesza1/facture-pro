# Two products, one domain

`facturedz.com` will serve two things that must never be mistaken for each
other.

|                | The application            | The international generator     |
| -------------- | -------------------------- | ------------------------------- |
| Address        | `/`                        | `/international.html`           |
| For            | Algerian merchants         | a merchant in one of the six, invoicing at home |
| Arrives from   | word of mouth, ads, direct | a web search, in their own language |
| Keeps books    | yes — invoices, clients, payments, debts | no — nothing is stored in the user's ledger |
| Fiscal work    | timbre, G50, Journal du mois, 19/9/0 per line | none |
| Documents      | facture, devis, avoir, bon de livraison | one invoice |
| Storage        | `facturepro_dz_v24`        | one draft, overwritten          |
| UI languages   | FR / AR                    | EN / FR / AR                    |
| Document       | French, LTR, by design     | EN / FR, per country            |

The first is a ledger. The second is a form that prints a page. Everything
below exists to keep that line sharp.

**Who the generator is for.** A Moroccan invoicing a Moroccan client. A Briton
invoicing a British one. Someone in their own country, issuing an ordinary
domestic invoice, who arrived from a search in their own language. It is not
built for the Algerian exporter — that case exists and is served by a single
link in Aide, but it is not the audience, and designing for it would produce a
different and worse page.

That reading is what makes *only where a PDF is accepted* the right rule. A
domestic invoice is a tax document in its own country, held to that country's
rules. It is not an export document travelling with a shipment, where a
commercial invoice would have been enough. This is why France and Saudi are
out: their mandates bite hardest on exactly the domestic invoice this page
would be producing.

The drafts this was specified from are kept at
`docs/international-draft.html` — reference only, not shipped, not linked, not
in the sitemap. The `COUNTRIES` table is the real work in them; the header of
that file lists what makes it unusable as a starting point.

## The boundary

**The application does not change.** Not `a.js`, not `c2.js`, not
`lib-calc.js`, not `excel.js`, not `commerce.js`, not the 29 templates, not
`calcInvoiceTotals`, not the `ok=[...]` route list in `c2.js` — that array
guards SPA routes and this is a document, not a route. The 198 checks pass
unchanged, and that is the proof, not anyone's assurance.

**Shared, and only this:** `/vendor/tailwind.css`, `/vendor/jspdf.umd.min.js`,
`/vendor/html2canvas.min.js`, the Google font link, the Vercel analytics
snippet, and the brand — the green `#006233`, Cairo and Inter.

**Not shared:** state, storage, translations, templates, arithmetic. The
generator is one self-contained file. It defines its own `COUNTRIES`, its own
strings, its own totals. Duplication here is the feature: nothing it does can
reach the ledger.

It does **not** load `lib-calc.js`. The other four tool pages do, so that the
calculator a stranger finds runs the same code as the application — that
reasoning is right for them and wrong here. `lib-calc.js` is Algerian
arithmetic: `timbreFor`, the 19/9/0 rates, `amountInWords` ending in
"dinars". None of it applies to a British invoice, and importing it would
invite exactly the blurring this document exists to prevent.

## One job: making an invoice

The page creates an invoice and prints it. It does not keep them.

There is no list, no history, no archive, no status, no "my invoices". A
visitor fills the form, reads the preview, exports the PDF, and the page has
nothing further to offer them. That is the entire product.

It stores exactly one thing: **the form as it currently stands**, so an
accidental refresh does not destroy ten minutes of typing. One key, one draft,
overwritten by whatever is on screen. It is a crash guard, not an archive.

This has a consequence for the wording. The drafts carry a `Save` button that
reports `Saved locally`, and that sentence is untrue in the way that matters:
it tells the visitor they have a document to come back to, and the next
invoice silently overwrites it. There is no Save button. The draft is kept
continuously, and if anything is said about it at all it says the form is
remembered — never that an invoice was saved.

Anyone who needs a list of invoices needs the application, and the DZ notice
below is where they are told so.

## The confusion that must not happen

### An Algerian using the international page

This is the one real hazard, and the reason the shape of Phase 2 is what it
is. The page has no droit de timbre. An Algerian who finds it, picks Algeria
and issues a cash invoice from it would get a document **short by the stamp
duty and not compliant**.

So it issues nothing. Algeria is in the picker, and selecting it replaces the
form with one sentence and a link back to `/`. France and Saudi work the same
way for their own reasons — see Phase 2.

Deleting the three instead would have been quieter, not safer: the same
visitor picks *International* and prints the same paper with nothing to warn
them. A person in the wrong place should be told so and shown the door.

### An exporter inside the application

The mirror case is benign and worth serving: an Algerian merchant invoicing a
foreign client. One line in Aide, next to the existing tool links, pointing at
`/international.html`. Nothing more — no button in the invoice editor, no
country selector in the app. The application stays a single-country product.

### Telling them apart on sight

The two must not look like the same screen with different fields. The
application is the dark-sidebar workspace it already is. The generator opens
on a landing section — hero, the country chips, the trust strip — and only
then shows the form. A visitor knows within a second which one they are
looking at, and the shared green keeps them recognisably the same house.

## Build order

Each phase is shippable and independently verifiable. Do not start the next
one until the current one's acceptance holds.

### Phase 1 — the page, one country, no CDN

The whole skeleton with `INT` only: landing, form, live preview, PDF.

The point of this phase is the dependency work, which is where the drafts are
furthest from the repository. `cdn.tailwindcss.com` and the two `cdnjs`
scripts come out and `/vendor/` goes in; `international.html` is added to the
`content` array in `tailwind/config.js`, or classes used only here generate no
rule. `npm run build` must produce a page that renders and exports with the
network otherwise blocked.

**Accepted when:** the page loads, previews and exports a correct one-page PDF
with no request leaving this origin, and `npm test` still reports 198.

Prove the second half rather than reading the source for `<script src>`. Drive
the page in Chromium with every off-origin request aborted — `page.route` on
`**/*`, letting through only `localhost` and `file://` — and assert that the
layout still has its styles, that the preview renders, and that the PDF
export produces a file. A stylesheet that silently failed to load leaves a
page that still *works*, which is precisely how the CDN outage went unnoticed
until it reached users.

Google Fonts is the one exception, as it is everywhere else here: a missing
font falls back to the system sans-serif and the page stays readable.

### Phase 2 — the countries

Six countries issue an invoice: **MA, TN, AE, GB, US, INT**. Each carries its
own identifier fields, currency, rate, legal sentence and invoice title;
selecting one sets all of them, and each stays editable.

Three are listed and issue nothing: **DZ, FR, SA**.

That is the decision — the page only produces a document where a PDF is
actually the accepted form. Where a country requires an electronic invoice
through a certified platform, the honest output is not a worse invoice, it is
no invoice.

They stay *in the picker* rather than being deleted, for the reason the DZ
hazard was already settled on: deleting a country does not remove the need for
its invoice. The person picks *International* instead and prints the same
paper with nothing to warn them. Listed, selecting one replaces the form with
a sentence saying why and what to do instead:

- **DZ** — this page computes no droit de timbre and feeds no G50. Use the
  application → `/`. This is the only one with somewhere better to send them.
- **FR** — French B2B invoicing runs through a certified platform (PDP); a PDF
  does not replace it.
- **SA** — a ZATCA tax invoice carries a QR with TLV-encoded fields, which
  this page does not emit.

No `Tax Invoice` title, no legal sentence, no export for these three. There is
nothing to get wrong because nothing is produced.

France is the one worth revisiting. Its B2C, non-VAT and proforma cases are
untouched by the reform, and it is the heaviest search term in the list. It is
out by decision, not because every French invoice is impossible.

**Accepted when:** the six issue invoices with their own fields and rates; the
three issue nothing and say why; no string anywhere claims a compliance the
page cannot deliver.

### Phase 3 — three languages

UI in EN / FR / AR, defaulted from the browser and switchable. The document is
written in the language its country actually invoices in — French for MA and
TN, English for GB, US, AE and INT — and stays editable, because a Moroccan
firm billing in Arabic and a Dubai firm billing in English are both ordinary.

Three languages is not a shortfall here, it is the coverage: Morocco and
Tunisia work in French and Arabic, the Gulf in English and Arabic, Britain and
the United States in English. The six countries that ship are exactly the six
these three serve.

Money is formatted with a fixed locale in every language. The drafts pass
`ar-DZ` to `toLocaleString`, which can render `١٢٣`; rule 4 in the README is
that money and codes stay latin. Only the words change.

No amount-in-words. It is a French and Algerian convention, absent from
British, American and Gulf invoices, and `amountInWords` is French and hard-codes
"dinars". Leaving it out is both cheaper and more correct.

An Arabic **document** — RTL invoice body — is out of scope. The repository
deliberately keeps invoices LTR, and a second direction in the renderer is a
project of its own. Arabic is a UI language here, not a document language.

**Accepted when:** all three UI languages render, the document language
follows the country, and every amount is in latin digits in all three.

### Phase 4 — publishing

`canonical` — the drafts say `/international`, the site serves `.html`, so it
is `https://facturedz.com/international.html` unless a rewrite is added. Then
`sitemap.xml`, and the Vercel analytics snippet the other five pages carry;
without it this page's visitors are invisible, which is a fault the repository
has already fixed once for the tool pages.

**Accepted when:** the page is in the sitemap, reports its own visits, and its
canonical resolves.

## Checks to add

The existing suite drives the application and never loads this page, so these
are new, and small.

- the page makes no request outside this origin
- choosing a country sets its currency, rate and identifier fields
- selecting DZ, FR or SA issues no invoice and explains why
- DZ points at the application
- no country string claims ZATCA or French conformity
- no total carries a droit de timbre, for any country
- amounts are latin digits in all three UI languages
- **the 198 existing checks pass unchanged**

The last one is the important one. Every other check describes the new page;
that one is what says the Algerian product did not move.

## Out of scope

G50. Journal du mois. Droit de timbre. Devis, avoir, bon de livraison.
Créances, payment status, client list. A list of invoices, an archive, a
history, a "my invoices" screen, a Save button, an account. Arabic
document body. Currency conversion — two currencies are never summed, here or
anywhere, because an invented rate inside a fiscal figure is worse than two
lines.

## Cost

About a day. Most of it is Phase 1 — the CDN removal and the PDF export are
the work; the countries and the strings are typing.
