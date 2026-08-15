# FacturePro Algérie

Static SPA — **Created by CheMs SoUu**

## Deploy (Vercel)
- Framework Preset: **Other**
- Build Command: `npm run build` (or leave default)
- Output Directory: **public**

## Features
- Dashboard, invoices, devis, produits, paiements, créances, clients (DA, NIF, NIS, RC, AI)
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

**3. Bump `V` in `app.js` when you change a module.**
Assets load as `a.js?v=<V>`. Without a bump, browsers keep serving the old file
and your fix never reaches users, no matter how many times you redeploy.

**4. Codes must not be reordered in Arabic.**
Decree numbers, RC, phone and RIB reverse under RTL bidi (`05-468` renders as
`468-05`; the RIB's digit groups flip, which is a wrong bank account). Wrap them
in `.ltr-code`, or `ltrCodes()` for text. Money and dates use `.num` / `moneyUI()`
/ `dateUI()`.

Invoices (`c2.js` renderers) stay French and LTR on purpose, even when the UI is
in Arabic — they are legal documents.

Auto-deploy verified after reconnecting the Vercel Git integration.
