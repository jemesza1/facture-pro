# FacturePro Algérie

Static SPA — **Created by CheMs SoUu**

## Deploy (Vercel)
- Framework Preset: **Other**
- Build Command: `npm run build` (or leave default)
- Output Directory: **public**

`public/` is build output and is not tracked. `npm run build` regenerates it:
the stylesheet first, then a copy of the site into it.

## No CDN

Every library the pages need is served from this domain, out of `/vendor/`.

That is not a preference. `cdn.tailwindcss.com` compiled the stylesheet in the
visitor's browser, so an hour where the CDN was slow or blocked — not rare on
an Algerian connection — left the application an unstyled column of links, and
a blocked `cdnjs` left the PDF button throwing `html2canvas is not defined`.
The icons came from `unpkg.com/lucide@latest`, which is to say from whatever
lucide happened to publish that morning.

Nothing is committed. `npm run build` fills `public/vendor/` from packages
pinned in `package.json`, so the versions live in the lockfile where they can
be read and bumped:

- `tailwind.css` — compiled by `npm run css` from `tailwind/config.js` and
  `tailwind/input.css`. 21 KB of the utilities these pages actually use,
  instead of a compiler shipped to every visitor.
- `lucide.min.js`, `jspdf.umd.min.js`, `html2canvas.min.js` — copied out of
  `node_modules`.

Two things to know before editing:

- **A new class needs `npm run build`**, or nothing generates the rule behind
  it. `tailwind/config.js` lists the scanned files; a new source file has to
  be added there.
- **`vendor/tailwind.css` is linked last in every `<head>`.** The Play CDN
  appended its `<style>` there and the design was drawn against that cascade,
  so the utilities win the ties. Move the link above `styles.css` and the
  overdue total stops being red and the example card loses its accent border.

Google Fonts is still loaded from Google. It is the one dependency that fails
softly — a missing font falls back to the system sans-serif and everything
stays readable.

## Offline

`sw.js` and `static/manifest.webmanifest` make the site installable and let it
run with no signal — a merchant can write and export an invoice in a shop with
no coverage. This only became possible once the libraries stopped coming from
foreign CDNs; a service worker cannot cache what it is not allowed to fetch.

The strategy is **network-first, cache as fallback**. The usual service-worker
disaster is a cache-first shell that pins an old build on people's phones for
weeks with no way to push a fix. Network-first cannot do that: online, the
visitor always gets what was just deployed.

**Bump `CACHE` in `sw.js` when the shell changes**, in step with `V` in
`app.js`. A new file belongs in that file's `SHELL` list too, or it will be
missing offline.

Verified with the network switched off in a real browser: the dashboard
renders, all 69 icons draw, the PDF export produces a valid file, and the
stamp-duty page still computes.

## Excel export

`lib-xlsx.js` writes real `.xlsx` files — a zip of XML parts, stored
uncompressed so no deflate implementation is needed. A few kilobytes instead of
a megabyte of library, and it keeps working offline, which a CDN would not.

`excel.js` builds two workbooks. The invoice sheet is the lesser one. The
**Journal du mois** is the point: every invoice of a month with the base and VAT
split per rate, the stamp duty, and a Récapitulatif TVA sheet holding the
figures a G50 asks for. Drafts and cancelled invoices are excluded.

Both workbooks are French whatever the interface language: they are fiscal
documents, and two users must not produce two different-looking declarations
from the same figures.

## Backups

`backup.js` stamps `fp_last_export` when an export actually runs, and asks
again after 30 days. It stays quiet while the only invoices are the seeded
examples, and "Plus tard" buys a week.

The stamp is set by **wrapping** `window.exportData`, not by editing it:
`b2a.js` declares one and `pro-polish.js` replaces it wholesale at load, so a
hook written into `b2a.js` is dead code. `backup.js` is last in the `core`
list in `app.js`, which is what makes the wrapper land on the function the
button really calls. Keep it last.

## Guide

`guide.html` is the manual: eight steps from the fiscal identifiers to the
backup habit, in French and Arabic, switched by the same `fp_locale` key the
application uses so a visitor keeps the language they already chose.

It is written against what the code actually does — the three VAT rates, the
five statuses, the stamp-duty bands, the 29 templates. When one of those
changes, the guide is wrong until it is edited too.

Section 7 is the one that matters. Everything lives in `localStorage`, and a
cleared cache is an emptied ledger; the guide asks for a monthly export in the
plainest words available.

## Public tools

Two standalone pages, linked from Aide and listed in the sitemap:

- `montant-en-lettres.html` — an amount converted to the wording a facture needs
- `droit-de-timbre.html` — the stamp duty on a cash-settled invoice

They load `lib-calc.js`, which `app.js` also loads first, so the page a stranger
finds through a search runs exactly the code the application runs. Put shared
arithmetic there and nowhere else — it must stay free of `state`, the DOM and
the translations.

## Features
- Dashboard, invoices, devis, produits, paiements, créances, clients (DA, NIF, NIN, NIS, RC, AI)
- Droit de timbre (art. 100, barème LF 2025) sur les règlements en espèces
- 29 templates, PDF, dark mode
- Logo upload (Paramètres)
- FR / العربية + RTL
- localStorage only (privacy)

## Tests

`cd tests && npm install && npm test` — 76 checks against a real headless
browser. Run them before every deploy; the suite prints `Safe to deploy.` or
lists what broke. The first group verifies that data written by the *previous*
version survives the update, which is what lets us ship without losing anyone's
work. When you fix a bug, add the check that would have caught it.

Playwright lives in `tests/package.json`, not the root one, so the Vercel build
never installs it.

## Notes for contributors

Four rules that have each caused a production outage before. Please keep them.

**1. The build copies every root asset — do not go back to a hand-written list.**
`npm run build` runs `cp -f *.html *.css *.js *.txt *.xml public/`. A new module
is shipped automatically. When the list was maintained by hand, adding a file and
forgetting the list meant a 404, and because modules load in sequence a single
404 blanked the whole app.

**2. Adding a page? Update the allow-list in `c2.js`.**
`initApp()` restores the last page after a refresh and validates it against `ok=[...]`.
A page missing from that array silently bounces the user back to the dashboard.
There is a second list in `app.js`, but it is only a fallback — `c2.js` is the one
that runs.

**3. Bump `V` in `app.js` when you change a module — and the three `?v=` in `index.html`.**
Modules load as `a.js?v=<V>`; `index.html` carries its own `?v=` for `styles.css`,
`i18n.js` and `app.js`. Both must move together. Without a bump, browsers keep
serving the old file and your fix never reaches users, no matter how many times
you redeploy. The `must-revalidate` header in `vercel.json` currently hides this
mistake — do not rely on it, it is a safety net, not the mechanism.

**4. Codes must not be reordered in Arabic.**
Decree numbers, RC, phone and RIB reverse under RTL bidi (`05-468` renders as
`468-05`; the RIB's digit groups flip, which is a wrong bank account). Wrap them
in `.ltr-code`, or `ltrCodes()` for text. Money and dates use `.num` / `moneyUI()`
/ `dateUI()`.

Legal identifiers (NIF / NIN / NIS / RC / AI) are printed by a single function,
`legalLines()` in `c2.js`. Add a new identifier there once and all 29 templates
pick it up — do not edit the renderers individually.

**5. `calcInvoiceTotals()` in `a.js` returns `net`, not just `ttc`.**
`net` is `ttc + timbre`. The stamp duty is only due on cash payments, so for
every other mode `net === ttc` and the distinction is invisible. Anything that
shows or compares *what the client owes* (dashboard, invoice list, créances,
payment settlement, CSV export) must read `net`. `ttc` stays for the TTC row of
the templates only. Devis have no payment mode, so they keep `ttc`.

The base is the TTC amount — the sum actually collected — and the rate is
applied directly (1 / 1,5 / 2 %), not by rounding up to whole 100 DA brackets.
On a multiple of 100 both readings agree; the direct rate is what the
profession uses. There is **no ceiling**: the 10 000 DA cap that older guides
still describe was abolished. Both points were settled by an accountant, so
neither is a setting any more — do not reintroduce either as an option.

Invoices (`c2.js` renderers) stay French and LTR on purpose, even when the UI is
in Arabic — they are legal documents.

Auto-deploy verified after reconnecting the Vercel Git integration.
