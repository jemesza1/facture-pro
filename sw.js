/* FacturePro — service worker.

   The point is not speed, it is that a merchant can write an invoice with no
   signal. That only became possible once the libraries stopped coming from
   four foreign CDNs; a service worker cannot cache what it is not allowed to
   fetch.

   Strategy is network-first for everything, cache as the fallback. The usual
   service-worker disaster is a cache-first shell that pins an old build on
   people's phones for weeks with no way to push a fix. Network-first cannot
   do that: online, the visitor always gets what was just deployed, and the
   cache only answers when the network does not.

   Bump CACHE whenever the shell changes — keep it in step with V in app.js. */
var CACHE = 'facturepro-20260817f';

/* Cached without their ?v= query, and read back with ignoreSearch, so bumping
   an asset version does not orphan every entry. */
var SHELL = [
  '/', '/index.html', '/styles.css',
  '/i18n.js', '/app.js', '/lib-calc.js', '/a.js', '/dash-fix.js',
  '/b1.js', '/b2a.js', '/b2b.js', '/c1.js', '/c2.js',
  '/extra.js', '/pro-polish.js', '/commerce.js', '/lib-xlsx.js', '/excel.js', '/backup.js', '/avoir.js',
  '/vendor/tailwind.css', '/vendor/lucide.min.js',
  '/vendor/jspdf.umd.min.js', '/vendor/html2canvas.min.js',
  '/droit-de-timbre.html', '/montant-en-lettres.html', '/calcul-tva.html', '/calcul-salaire.html',
  '/guide.html', '/install.js',
  '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'
];

function bare(url) {
  var u = new URL(url);
  u.search = '';
  u.hash = '';
  return u.toString();
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      // One 404 must not fail the whole install, so each entry stands alone.
      .then(function (c) {
        return Promise.all(SHELL.map(function (u) {
          return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  // Other origins (fonts) and the analytics beacon are left alone: caching an
  // opaque response buys nothing, and page counts are not worth replaying.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/_vercel/') === 0) return;

  var key = bare(req.url);

  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(key, copy); }).catch(function () {});
        }
        return res;
      })
      .catch(function () {
        return caches.match(key, { ignoreSearch: true }).then(function (hit) {
          if (hit) return hit;
          // A deep link opened offline still deserves the application.
          if (req.mode === 'navigate') return caches.match('/index.html');
          return Response.error();
        });
      })
  );
});
