# Tests

Run these before every deploy.

```
cd tests
npm install
npm test
```

It serves the repository root, opens it in a headless Chromium and calls the
application's own functions — nothing is mocked. If a check fails here, a user
would have hit the same thing.

The suite prints `Safe to deploy.` or lists the failing checks and exits 1.

## What it covers

1. **Data written by a previous version** — the check that lets us ship without
   losing anyone's work. Company, clients, invoices, totals and notes must come
   through an update untouched, and old invoices must keep their amounts.
2. **Totals** — 3000 randomly generated invoices compared against independent
   arithmetic, plus empty, non-numeric and text-typed inputs.
3. **Droit de timbre** — the three bands, both band edges, the 5 DA floor, the
   optional ceiling, and the exemption for transfers, cheques and cards.
4. **Templates** — all 29 must print both NIN, the duty, the net, the payment
   mode, and nothing at all when the invoice is not settled in cash. The amount
   in words must follow the net, not the TTC.
5. **Fields containing quotes** — a straight quote used to close the `value=""`
   attribute and silently truncate the field; a RIB became `007`.
6. **Stock and payments** — a refused invoice must not move the stock, a removed
   payment must reopen the invoice, a deleted invoice must take its payments.
7. **Arabic layout** — the interface flips to RTL while codes stay left-to-right.

The tailwind and lucide CDN scripts fail offline; that is expected and ignored.

## Adding a check

When you fix a bug, add the check that would have caught it, right next to the
group it belongs to. `check(name, condition, detail)` is all there is to it.
