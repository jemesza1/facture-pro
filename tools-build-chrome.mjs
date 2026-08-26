/* FacturePro — the bar and the footer that every page shares.
 *
 * A visitor arrives on one page. They searched "calcul droit de timbre", they
 * landed on the calculator, and the calculator was a room with no doors: a
 * logo, a language button, and nothing else. Whatever else the site knows how
 * to do was invisible from where they stood.
 *
 * So one bar and one footer, written once here and injected into every page
 * at build time. Build time rather than runtime for two reasons: a link a
 * crawler has to execute JavaScript to find is a link it may not weigh, and a
 * page that paints its own navigation cannot be caught out of step with the
 * others.
 *
 * Self-contained on purpose. These pages do not share a stylesheet — some
 * carry Tailwind, some a dozen hand-written rules — so the markup brings its
 * own, under an fp- prefix that cannot collide with what is already there.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const OUT = join(ROOT, 'public');

/* The application is not a document: it has its own shell, its own menu, and
   a footer under it would be furniture in a workshop. The three mockups are
   design references nothing links to. */
const HOST = 'https://www.facturedz.com';
const SKIP = new Set(['index.html', 'dashboard-facturepro.html',
                      'mobile-facturepro.html', 'design-system.html',
                      'landing-facturepro.html']);

/* The landing page already has a navigation bar with its own calls to action.
   It takes the footer — one site map, not two that drift — and nothing else. */
const NO_BAR = new Set(['accueil.html']);

/* One entry per page the site publishes, grouped the way somebody looks for
   them rather than the way they were built. The footer is the site map; the
   bar is the six that earn a permanent place. */
const GROUPS = [
  ['Calculateurs', 'حاسبات', [
    ['droit-de-timbre.html', 'Droit de timbre', 'حق الطابع'],
    ['calcul-tva.html', 'Calcul TVA', 'حساب TVA'],
    ['calcul-salaire.html', 'Calcul de salaire', 'حساب الأجر'],
    ['montant-en-lettres.html', 'Montant en lettres', 'المبلغ بالحروف'],
  ]],
  ['Modèles', 'نماذج', [
    ['modele-facture-excel.html', 'Facture Excel', 'فاتورة Excel'],
    ['devis.html', 'Devis', 'عرض السعر'],
    ['facture-proforma.html', 'Facture proforma', 'الفاتورة الأولية'],
    ['bon-de-commande.html', 'Bon de commande', 'وصل الطلبية'],
    ['bon-de-livraison.html', 'Bon de livraison', 'وصل التسليم'],
    ['facture-avoir.html', "Facture d'avoir", 'الإشعار الدائن'],
  ]],
  ['Guides', 'أدلة', [
    ['telecharger.html', 'Installer sur PC', 'التثبيت على الحاسوب'],
    ['guide.html', "Guide d'utilisation", 'دليل الاستعمال'],
    ['mentions-obligatoires-facture-algerie.html', 'Mentions obligatoires', 'البيانات الإجبارية'],
    ['remplir-g50.html', 'Remplir le G50', 'ملء G50'],
    ['plan-comptable-scf.html', 'Plan comptable SCF', 'دليل الحسابات SCF'],
    ['conditions.html', 'Conditions et confidentialité', 'الشروط والخصوصية'],
  ]],
  ['International', 'دول أخرى', [
    ['international.html', 'Autres pays', 'بلدان أخرى'],
    ['facture-maroc.html', 'Facture Maroc', 'فاتورة المغرب'],
    ['facture-tunisie.html', 'Facture Tunisie', 'فاتورة تونس'],
    ['uae-tax-invoice.html', 'UAE tax invoice', null],
    ['uk-invoice-template.html', 'UK invoice template', null],
    ['us-invoice-template.html', 'US invoice template', null],
    ['free-invoice-generator.html', 'Free invoice generator', null],
  ]],
];

/* Six links, chosen by what a merchant actually opens twice. Everything else
   is one scroll away in the footer, and the last chip says so. */
const BAR = [
  ['droit-de-timbre.html', 'Droit de timbre', 'حق الطابع'],
  ['calcul-tva.html', 'TVA', 'TVA'],
  ['montant-en-lettres.html', 'Montant en lettres', 'المبلغ بالحروف'],
  ['modele-facture-excel.html', 'Modèles', 'نماذج'],
  ['plan-comptable-scf.html', 'Comptabilité', 'محاسبة'],
  ['international.html', 'International', 'دولي'],
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* A label with no Arabic keeps its own words: "UK invoice template" is the
   search term, and translating it would hide the page from what it answers. */
const label = (fr, ar) => ar
  ? `<span data-fpfr="${esc(fr)}" data-fpar="${esc(ar)}">${esc(fr)}</span>`
  : `<bdi>${esc(fr)}</bdi>`;

const link = ([href, fr, ar]) =>
  `<a href="/${href}">${label(fr, ar)}</a>`;

const STYLE = `<style>
.fp-bar{--fp-g:#006233;--fp-g2:#059669;background:#fff;border-bottom:1px solid #e2e8f0;
  font-family:Inter,system-ui,sans-serif;font-size:13.5px;position:relative;z-index:5}
.fp-bar-in{display:flex;align-items:center;gap:14px;max-width:1120px;margin-inline:auto;
  padding:0 16px;height:46px}
.fp-links{display:flex;gap:2px;overflow-x:auto;flex:1;min-width:0;scrollbar-width:none}
.fp-links::-webkit-scrollbar{display:none}
.fp-links a{color:#475569;text-decoration:none;padding:6px 10px;border-radius:8px;
  white-space:nowrap;font-weight:500}
.fp-links a:hover{background:#f1f5f9;color:#0f172a}
.fp-cta{flex:none;background:var(--fp-g);color:#fff!important;text-decoration:none;
  padding:7px 14px;border-radius:999px;font-weight:650;white-space:nowrap}
.fp-cta:hover{background:#004d29}
.fp-foot{background:#0b1220;color:#94a3b8;font-family:Inter,system-ui,sans-serif;
  font-size:14px;padding:44px 0 24px;margin-top:56px;text-align:start}
.fp-foot a{color:inherit;text-decoration:none}
.fp-foot a:hover{color:#fff}
.fp-foot-in{display:grid;grid-template-columns:1.4fr repeat(4,1fr);gap:26px 22px;
  max-width:1120px;margin-inline:auto;padding:0 16px}
.fp-foot img{width:36px;height:36px;display:block}
.fp-foot h3{color:#e2e8f0;font-size:13px;font-weight:700;letter-spacing:.04em;
  text-transform:uppercase;margin:0 0 10px}
.fp-foot-col a{display:block;padding:3px 0}
.fp-foot b{display:block;color:#fff;font-size:16px;margin:10px 0 8px}
.fp-foot p{margin:0;max-width:22rem;line-height:1.6}
.fp-foot-base{border-top:1px solid #1e293b;margin-top:30px;padding:16px 16px 0;
  max-width:1120px;margin-inline:auto;display:flex;justify-content:space-between;
  gap:14px;flex-wrap:wrap;font-size:13px}
@media (max-width:900px){.fp-foot-in{grid-template-columns:1fr 1fr}}
@media (max-width:560px){.fp-foot-in{grid-template-columns:1fr}}
/* Poser la classe dark ne suffisait pas : ces pages ecrivent text-slate-500
   sans variante dark:, si bien que le texte secondaire restait à 3.93:1 sur le
   fond sombre — sous le seuil de 4.5. On relève les deux gris que Tailwind
   utilise pour le texte atténué, et seulement eux. */
html.dark .text-slate-500,html.dark .text-slate-400,html.dark .text-slate-600{color:#a3b1c2}
html.dark .opacity-70{opacity:.85}
@media (prefers-color-scheme:dark){
  .fp-bar{background:#0f172a;border-bottom-color:#1e293b}
  .fp-links a{color:#94a3b8}
  .fp-links a:hover{background:#1e293b;color:#f1f5f9}
}
</style>`;

const bar = `<nav class="fp-bar" aria-label="Outils du site"><div class="fp-bar-in">
<div class="fp-links">${BAR.map(link).join('')}<a href="#fp-map"><span data-fpfr="Tout voir" data-fpar="عرض الكل">Tout voir</span></a></div>
<a class="fp-cta" href="/index.html?app=1&amp;new=1"><span data-fpfr="Créer une facture" data-fpar="أنشئ فاتورة">Créer une facture</span></a>
</div></nav>`;

const columns = GROUPS.map(([fr, ar, items]) =>
  `<div class="fp-foot-col"><h3 data-fpfr="${esc(fr)}" data-fpar="${esc(ar)}">${esc(fr)}</h3>` +
  items.map(link).join('') + `</div>`).join('');

const footer = `<footer class="fp-foot" id="fp-map"><div class="fp-foot-in">
<div>
<a href="/"><img src="/icon.svg" alt="FacturePro" width="36" height="36" loading="lazy"></a>
<b>FacturePro</b>
<p data-fpfr="Facturation pour l'Algérie. Gratuit, sans inscription — vos données restent sur votre appareil." data-fpar="فوترة للجزائر. مجاني وبلا تسجيل — بياناتك تبقى على جهازك.">Facturation pour l'Algérie. Gratuit, sans inscription — vos données restent sur votre appareil.</p>
<p style="margin-top:10px"><a href="/index.html?app=1" style="color:#34d399;font-weight:600" data-fpfr="Ouvrir l'application" data-fpar="فتح التطبيق">Ouvrir l'application</a></p>
</div>${columns}</div>
<div class="fp-foot-base">
<span data-fpfr="Created by CheMs SoUu" data-fpar="إعداد CheMs SoUu">Created by CheMs SoUu</span>
<span dir="ltr">&copy; 2026 FacturePro</span>
</div></footer>`;

/* The pages disagree about how they switch language — some swap two hidden
   halves, some rewrite text from data attributes — but every one of them
   ends up setting lang on the document. So that is what this watches, and
   the chrome follows whatever the page decided without knowing how. */
const SCRIPT = `<script>
(function(){
  function paint(){
    var ar = (document.documentElement.lang || 'fr').slice(0,2) === 'ar';
    var n = document.querySelectorAll('[data-fpfr]');
    for (var i = 0; i < n.length; i++)
      n[i].textContent = ar ? n[i].getAttribute('data-fpar') : n[i].getAttribute('data-fpfr');
  }
  paint();
  try {
    new MutationObserver(paint).observe(document.documentElement,
      {attributes:true, attributeFilter:['lang']});
  } catch(e){}
})();
</script>`;


/* Les icônes, elles aussi écrites une fois. Google prend le favicon du site
   sur la page d'accueil, alors les résultats de recherche ne dépendaient pas
   des autres — mais treize pages continuaient de ne déclarer qu'un 32 px, et
   une page qui déclare autre chose que ses vingt-quatre sœurs est exactement
   ce que ce fichier existe pour empêcher. */
const ICONS = `<link rel="icon" href="/icon-48.png" sizes="48x48" type="image/png" />
<link rel="icon" href="/icon-96.png" sizes="96x96" type="image/png" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />`;

function icons(html) {
  if (html.indexOf('icon-48.png') !== -1) return html;
  const at = html.search(/<link rel="icon"/i);
  if (at !== -1) return html.slice(0, at) + ICONS + '\n' + html.slice(at);
  const head = html.search(/<\/head>/i);
  return head === -1 ? html : html.slice(0, head) + ICONS + '\n' + html.slice(head);
}


/* Tailwind est configuré en darkMode:'class' parce que l'application pilote
   elle-même la classe. Les pages statiques ne la posaient jamais : leur propre
   CSS passait le fond en sombre sous prefers-color-scheme, mais les utilitaires
   `dark:text-…` restaient inertes, et un texte en text-slate-500 sur un fond
   #0b1220 tombait à 3.93:1 — sous le seuil de 4.5.

   Posée dans le <head>, avant tout rendu, pour qu'aucune page ne clignote. Un
   choix enregistré l'emporte sur la préférence du système : c'est la règle que
   la page d'accueil applique déjà avec sa propre bascule, et deux règles
   différentes sur le même site en seraient une de trop. */
const DARK = `<script>
(function(){try{
  var v = localStorage.getItem('facturepro_dark');
  var on = v === '1' ? true : v === '0' ? false
         : (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', !!on);
}catch(e){}})();
</script>`;

function dark(html) {
  if (html.indexOf("classList.toggle('dark'") !== -1) return html;
  const head = html.search(/<\/head>/i);
  return head === -1 ? html : html.slice(0, head) + DARK + '\n' + html.slice(head);
}

/* hreflang. The site speaks French and Arabic for Algeria, and English on
   the country pages that were published in English. Without these tags a
   crawler treats every language as the same URL and picks one. accueil.html
   is the domain root, so its alternates point at "/" — not at accueil.html,
   which would compete with the address people type.

   Idempotent: index.html and accueil.html already declare their own. */
function hreflang(html, file) {
  if (/rel=["']alternate["'][^>]*hreflang=/i.test(html)) return html;
  if (/hreflang=["'][^"']+["'][^>]*rel=["']alternate["']/i.test(html)) return html;
  const isHome = file === 'accueil.html';
  const path = isHome ? '/' : '/' + file;
  const base = HOST + path;
  const alt = lang => `${base}${isHome ? '?' : '?'}lang=${lang}`;
  const published = ((html.match(/<html[^>]*\blang="([^"]*)"/i) || [])[1] || '').slice(0, 2).toLowerCase();
  const tags = [
    `<link rel="alternate" hreflang="fr-DZ" href="${alt('fr')}" />`,
    `<link rel="alternate" hreflang="ar-DZ" href="${alt('ar')}" />`,
  ];
  if (published === 'en') {
    tags.push(`<link rel="alternate" hreflang="en" href="${alt('en')}" />`);
  }
  tags.push(`<link rel="alternate" hreflang="x-default" href="${base}" />`);
  const head = html.search(/<\/head>/i);
  return head === -1 ? html : html.slice(0, head) + tags.join('\n') + '\n' + html.slice(head);
}

function inject(html, file) {
  /* Hreflang is independent of the bar: a page that already has a footer
     still needs the tags, and a second run must not duplicate them. */
  let out = hreflang(html, file);

  /* Le pied, pas la barre : accueil.html ne prend pas de barre, et un garde
     qui la cherchait lui ajoutait un second pied a chaque execution. */
  if (out.indexOf('class="fp-foot"') !== -1) return dark(icons(out));  /* idempotent */

  /* The bar goes under whatever the page already puts at the top: these
     pages carry their own brand and language button, and a second brand
     three lines above the first reads as a mistake. */
  out = dark(icons(out));
  if (NO_BAR.has(file)) {
    const end0 = out.lastIndexOf('</body>');
    if (end0 === -1) return html;
    return out.slice(0, end0) + STYLE + '\n' + footer + '\n' + SCRIPT + '\n' + out.slice(end0);
  }
  const afterHeader = out.search(/<\/header>/i);
  if (afterHeader !== -1) {
    const at = afterHeader + '</header>'.length;
    out = out.slice(0, at) + '\n' + bar + out.slice(at);
  } else {
    const body = out.search(/<body[^>]*>/i);
    if (body === -1) return html;
    const at = body + out.match(/<body[^>]*>/i)[0].length;
    out = out.slice(0, at) + '\n' + bar + out.slice(at);
  }

  const end = out.lastIndexOf('</body>');
  if (end === -1) return html;
  return out.slice(0, end) + STYLE + '\n' + footer + '\n' + SCRIPT + '\n' + out.slice(end);
}

let n = 0;
for (const f of readdirSync(OUT)) {
  if (!f.endsWith('.html') || SKIP.has(f)) continue;
  const p = join(OUT, f);
  const before = readFileSync(p, 'utf8');
  const after = inject(before, f);
  if (after !== before) { writeFileSync(p, after); n++; }
}
console.log(`chrome: ${n} pages wired`);
