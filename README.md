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

## Facture d'avoir

An issued invoice is not corrected by editing it or by flipping it to
"Annulée". Once it has left for the client and entered a declaration, the way
back is a second document that credits it. `avoir.js` issues one from the
preview toolbar: its own `AV-YYYY-NNN` series, the same lines, the opposite
sign.

**The sign lives in `calcInvoiceTotals` and nowhere else.** The dashboard, the
debts page, the client totals and the Excel journal all reach their figures by
summing `calcInvoiceTotals(...).net` over `state.invoices`, across six files.
Negate once at the source and every one of them subtracts correctly; negate in
each of them and the first one anybody forgets reports revenue that was given
back.

Two consequences worth knowing before editing:

- An avoir is stored with `status:'payee'`. That is deliberate — it keeps the
  document out of Créances and away from the sweep that stamps invoices
  "en retard".
- `state.nextAvoirNumber` must stay in the `saveData` whitelist in `extra.js`,
  or the counter resets on reload and two avoirs share a number.
  `ensureAvoirState` rebuilds it from the existing documents, so a backup taken
  before this feature still numbers correctly.

Scope is a full credit. To credit part of an invoice, issue the avoir and edit
its lines in the ordinary invoice editor.

## Dépenses et résultat approximatif

The ledger knew what came in and never what went out, so the only figure a
merchant could read was turnover — and turnover was being read as if it were
what was left. `depenses.js` adds a page that subtracts.

Three decisions settle what that figure means, and none of them is a setting:

- **Only a settled invoice is a sale.** The sales side reads `status ===
  'payee'` and nothing else. An invoice that has been issued is a claim, not
  money; a brouillon and an annulée carry a different status and so never
  reach it. An avoir is stored `payee` and `calcInvoiceTotals` hands it back
  negated, so it subtracts once, on its own, exactly as it does everywhere
  else. A bon de livraison totals zero and is worth nothing here.
- **The base is HT, on both sides.** The VAT collected on a sale belongs to
  the Treasury, and so does the droit de timbre: counting either would inflate
  the result by about a fifth. The same reasoning runs the other way on a
  spend — the VAT paid to a supplier is deducted, not borne — so a dépense is
  entered and counted HT too.
- **It is a "résultat approximatif" and never a bénéfice.** There are no
  amortissements in it, no charges sociales and no variation de stock. The
  page carries the sentence that says so; do not shorten it to "bénéfice" or
  "profit", which would put a number on screen an accountant has to unsay.

`state.expenses` is the only new list. It must stay in the `saveData`
whitelist in `extra.js` and in the export and the import in `pro-polish.js`,
or the page shows a figure that does not survive a reload. A backup written
before this feature carries no `expenses` key, and the import reads that as an
empty list rather than keeping what is in memory: the alternative is one
merchant's dépenses standing against another's invoices.

The period is a prefix match on the ISO date — a month, a year, or
everything — and is deliberately not stored. Which window somebody is looking
at is not data.

## Backups

`backup.js` stamps `fp_last_export` when an export actually runs, and asks
again after 30 days. It stays quiet while the only invoices are the seeded
examples, and "Plus tard" buys a week.

The stamp is set by **wrapping** `window.exportData`, not by editing it:
`b2a.js` declares one and `pro-polish.js` replaces it wholesale at load, so a
hook written into `b2a.js` is dead code. `backup.js` comes after
`pro-polish.js` in the `core` list in `app.js`, which is what makes the wrapper
land on the function the button really calls. Keep it after — and nothing that
loads later may replace `exportData` wholesale, or the stamp is lost again.

## Google Drive

`backup.js` asks for an export every thirty days, and `guide.html` spends its
seventh section explaining that a cleared cache is an emptied ledger. Both put
the same job on the same person. `drive.js` does it instead — and the file does
not come to us. It goes into the merchant's own Drive, under their own account.

There is no server, no user table, no password to reset and no fiscal data of
somebody else's to be responsible for. "Sign in with Google" is the whole
registration, and the copy lands where its owner can see it, download it and
send it to their accountant.

Three decisions hold it up:

- **`localStorage` stays the source.** The application reads and writes there
  exactly as before and works with no signal exactly as before. Drive is a copy
  that follows. Nothing in this file sits on the path of an invoice being
  written.
- **Google's library is fetched on the click, never at boot.** It is the one
  dependency that cannot be served from `/vendor/` — Google forbids
  self-hosting `gsi/client`. Loaded at startup it would turn an offline-first
  application into one that waits for Google; loaded on the click it concerns
  only the person who asked to sync. The regression suite fails if a
  `accounts.google.com` script is present before anybody asked.
- **The access token never reaches `localStorage`.** It lives an hour in a
  variable and dies with the tab.

The scope is `drive.file` and nothing wider: it reaches only the files this
application created, so the rest of the merchant's Drive stays invisible to it.
One file, `facturepro-sauvegarde.json`, rewritten in place — a folder of three
hundred dated files is not a backup, it is one more question to answer on the
day one of them has to be picked.

**`buildBackup()` and `applyBackup()` in `pro-polish.js` are the only way in
and out.** The downloaded file and the Drive copy are the same object, restored
through the same code, so a list added to `state` is added in one place instead
of two — and a Drive restore lands on the path the file import has already
proven. A restore keeps the same confirmation and the same
`_avant_import` snapshot the file import takes.

The feature is dark until `DRIVE_CLIENT_ID` is filled in at the top of
`drive.js`: no client, no card, nothing changed anywhere in the application.
It is created on `console.cloud.google.com` — Drive API enabled, external
consent screen, `drive.file` scope, a Web application OAuth client with this
domain in the authorized JavaScript origins. **The client ID is public** and
belongs in the file where every visitor can read it; the client secret shown
on the same page is not used by browser applications and must never be pasted
here.

Once the merchant has connected in a session, every write goes up on its own
about five seconds after the last keystroke — a ten-line invoice is one copy,
not ten. **The timer never asks Google for anything.** It writes only while a
token is already in memory, and gives up quietly when it is not, marking the
work unsynced instead. A timer that can open a consent window opens it with no
click behind it: the browser blocks it, and the merchant reads it as the
application doing something on its own.

That leaves the sessions where nobody clicked, and it is why the two notices
that already tell people their data lives in this browser now offer the copy
as well — the storage banner and the thirty-day reminder. And once the Drive
is connected the reminder switches to asking **daily**, because the protection
it is asking for costs one click rather than a download, a filename and
somewhere to keep it. "Later" buys a day instead of a week.

One file per account, and no merge. So the stamp Drive reports for the copy we
wrote is kept, and compared before writing again: if the file no longer carries
it, another device did. On the button, that asks. On the timer, it **stops** —
nothing silent ever overwrites a copy it does not recognise, and the card says
so until somebody decides.


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

## The international generator

`international.html` is the second product on this domain, and it is not the
application. The application is a ledger for Algerian merchants; the generator
is a form that prints one invoice for a merchant invoicing at home in Morocco,
Tunisia, the UAE, Britain or the United States, who arrived from a search in
their own language. `docs/international.md` is the specification it was built
from and the place to read before changing it.

The line between the two is the whole design:

- **Shared:** `/vendor/`, the Google font, the analytics snippet, the green.
- **Not shared:** state, storage, translations, templates, arithmetic. The page
  is one self-contained file with its own `COUNTRIES`, its own strings and its
  own totals. Duplication here is the feature — nothing it does can reach the
  ledger.
- It does **not** load `lib-calc.js`. That file is Algerian arithmetic —
  `timbreFor`, the 19/9/0 rates, an amount in words ending in "dinars" — and
  none of it applies to a British invoice.

It stores one thing: the form as it currently stands, under one key,
overwritten. That is a crash guard, not an archive, so there is no Save button
and no string that tells a visitor an invoice was kept. Anyone who needs a list
of invoices needs the application.

**Six countries issue an invoice** — MA, TN, AE, GB, US and a generic
International — each with its own identifier fields, currency, rate, legal
sentence and title, all editable. **Three are listed and issue nothing:**

- **DZ** — the page computes no droit de timbre and feeds no G50, so the
  invoice would be short by the stamp duty. It is sent to the application.
- **FR** — French B2B invoicing runs through a certified platform (PDP); a PDF
  does not replace it.
- **SA** — a ZATCA tax invoice carries a QR code with TLV-encoded fields, which
  this page does not emit.

They stay in the picker rather than being deleted, because deleting a country
does not remove the need for its invoice: the same visitor would pick
*International* and print the same paper with nothing to warn them.

The UI is EN / FR / AR, defaulted from the browser. The document is written in
the language its country invoices in — French for MA and TN, English for the
rest — and stays LTR, like every other invoice here. Money is formatted with
one fixed locale in all three languages, so a total never renders as `١٢٣`.
Arabic is a UI language here, not a document language.

The generator used to be reachable by one link in Aide and, for a browser
asking for neither French nor Arabic, one sentence at the top of the page.
That was right while it was a courtesy. It is now a second front door: the
presentation page offers it to everybody, in all three languages, because an
Algerian merchant invoicing a client in Casablanca needs it as much as the
Moroccan does and neither was going to find it behind a word in a navigation
bar.

**The application still does not move.** What changed is who is told the
generator exists, not what either product is: no country selector in the
invoice editor, no foreign currency in a dashboard counted in dinars, no
shared state. The line in "The international generator" above is the line.

## Features
- Dashboard, invoices, devis, produits, paiements, dépenses, créances, clients (DA, NIF, NIN, NIS, RC, AI)
- Résultat approximatif : ventes encaissées HT moins dépenses HT
- Droit de timbre (art. 100, barème LF 2025) sur les règlements en espèces
- 29 templates, PDF, dark mode
- Logo upload (Paramètres)
- Sauvegarde dans le Google Drive du commerçant (optionnelle, hors ligne intacte)
- FR / العربية + RTL
- localStorage only (privacy)

## Tests

`cd tests && npm install && npm test` — 380 checks against a real headless
browser. Run `npm run build` in the root first: the last group drives
`public/`, the built site, because what it proves is that the international
generator renders and exports with every off-origin request blocked. Run them before every deploy; the suite prints `Safe to deploy.` or
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

**3. Bump `V` in `app.js` when you change a module — and every `?v=` in `index.html`.**
Modules load as `a.js?v=<V>`; `index.html` carries its own `?v=` on `styles.css`,
`vendor/tailwind.css`, `i18n.js`, `app.js` and `install.js` — five of them, and
they move together with `V` and with `CACHE` in `sw.js`. Without a bump, browsers keep
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
