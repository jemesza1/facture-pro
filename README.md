# FacturePro Algérie

Static SPA — **Created by CheMs SoUu**

## Deploy (Vercel)
- Framework Preset: **Other**
- Build Command: `npm run build` (or leave default)
- Output Directory: **public**

## Features
- Dashboard, invoices, devis, produits, paiements, créances, clients (DA, NIF, NIN, NIS, RC, AI)
- Droit de timbre (art. 100, barème LF 2025) sur les règlements en espèces
- 29 templates, PDF, dark mode
- Logo upload (Paramètres)
- FR / العربية + RTL
- localStorage only (privacy)

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

The base is the TTC amount — the sum actually collected. The only disputed
point left is the old 10 000 DA ceiling, which is a setting (`timbreCap`,
0 = none), not a constant.

Invoices (`c2.js` renderers) stay French and LTR on purpose, even when the UI is
in Arabic — they are legal documents.

Auto-deploy verified after reconnecting the Vercel Git integration.
