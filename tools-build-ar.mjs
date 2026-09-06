/* FacturePro — dedoubler les pages ecrites a la main : francais et arabe.
 *
 * Le probleme, et il est grave. Chaque page portait ses deux langues dans un
 * seul document, et l'adresse annoncee a Google pour la version arabe etait
 * « page.html?lang=ar ». Cette adresse sert les memes octets, donc le meme
 * <link rel=canonical>, qui pointe la version francaise. Google la classe sous
 * « autre page avec balise canonique correcte » et ne l'indexe jamais. Le site
 * declarait donc des versions arabes qui, par construction, ne pouvaient pas
 * paraitre dans les resultats — pour un public dont une grande part cherche en
 * arabe.
 *
 * Les onze pages de contenu generees ont deja ete dedoublees par
 * tools-build-pages.mjs. Celles-ci sont ecrites a la main : on ne les reecrit
 * pas, on les coupe. Le depot garde une seule source bilingue, lisible et
 * modifiable d'un seul endroit ; la construction en tire deux documents, un
 * par langue, chacun canonique de lui-meme.
 *
 * Trois familles, parce que les trois mecanismes bilingues du site different :
 *
 *   « blocs »      un <div id="fr"> et un <div id="ar" hidden>, un script
 *                  bascule l'un et l'autre. On supprime le bloc de l'autre
 *                  langue et le script qui les basculait.
 *
 *   « attributs »  data-fr / data-ar sur chaque element, un script repeint.
 *                  On fige le texte dans la bonne langue et on retire le
 *                  script.
 *
 *   « outil »      un tableau T={fr,ar} qui peint l'interface du calculateur,
 *                  plus des <section> de prose statique dans chaque langue. On
 *                  supprime les sections de l'autre langue et on force la
 *                  locale — le calculateur, lui, continue de tourner.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const OUT = join(ROOT, 'public');
const AR = join(OUT, 'ar');
const HOST = 'https://www.facturedz.com';
const V = (readFileSync(join(ROOT, 'app.js'), 'utf8').match(/var V="([^"]+)"/) || [])[1] || '1';

/* ---------------------------------------------------------------- *
 * Couper un element en comptant sa profondeur.
 *
 * Une recherche de chaine s'arreterait au premier </div> venu, qui appartient
 * presque toujours a un enfant. On compte donc les ouvertures et les
 * fermetures jusqu'a revenir a zero.
 * ---------------------------------------------------------------- */
function cutElement(html, openMarker, tag, first) {
  const start = html.indexOf(openMarker);
  if (start === -1) throw new Error(`marqueur introuvable : ${openMarker.slice(0, 60)}`);
  /* Un marqueur ambigu coupe au mauvais endroit sans rien dire, sauf quand
     l'appelant boucle exprès sur des sections identiques — montant-en-lettres
     en porte trois. */
  if (!first && html.indexOf(openMarker, start + 1) !== -1)
    throw new Error(`marqueur ambigu, present deux fois : ${openMarker.slice(0, 60)}`);
  const open = new RegExp(`<${tag}\\b`, 'gi');
  const close = new RegExp(`</${tag}\\s*>`, 'gi');
  let depth = 0, i = start;
  while (i < html.length) {
    open.lastIndex = i; close.lastIndex = i;
    const o = open.exec(html), c = close.exec(html);
    if (!c) throw new Error(`element non ferme : ${openMarker.slice(0, 60)}`);
    if (o && o.index < c.index) { depth++; i = o.index + 1; continue; }
    depth--; i = c.index + c[0].length;
    if (depth === 0) return html.slice(0, start) + html.slice(i);
  }
  throw new Error(`element non ferme : ${openMarker.slice(0, 60)}`);
}

/* Retirer un <script> entier a partir d'une chaine qu'il contient. */
function cutScriptContaining(html, needle) {
  const at = html.indexOf(needle);
  if (at === -1) throw new Error(`script introuvable : ${needle.slice(0, 50)}`);
  const start = html.lastIndexOf('<script', at);
  const end = html.indexOf('</script>', at);
  if (start === -1 || end === -1) throw new Error(`script mal ferme : ${needle.slice(0, 50)}`);
  return html.slice(0, start) + html.slice(end + '</script>'.length);
}

function replaceOnce(html, from, to, what) {
  const at = html.indexOf(from);
  if (at === -1) throw new Error(`${what} : motif introuvable`);
  if (html.indexOf(from, at + 1) !== -1) throw new Error(`${what} : motif present deux fois`);
  return html.slice(0, at) + to + html.slice(at + from.length);
}

/* Sous /ar/, « styles.css » designe /ar/styles.css. Tout ce qui est relatif
   doit remonter a la racine. */
function absolutise(html) {
  return html.replace(/\b(src|href)="(?!https?:|\/\/|\/|#|data:|mailto:|tel:)([^"]+)"/g,
    (m, attr, path) => `${attr}="/${path}"`);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------------------------------------------------------- *
 * La tete : ce qui doit changer dans les deux documents.
 * ---------------------------------------------------------------- */
function headFr(html, file, canonicalFr) {
  const url = canonicalFr || `${HOST}/${file}`;
  const arUrl = `${HOST}/ar/${file}`;
  /* Le lien de langue de la page francaise mene a la jumelle arabe, et le
     harnais du site verifie que hreflang et ce lien se repondent. */
  let out = html;
  const already = /<link rel="alternate" hreflang/.test(out);
  if (!already) {
    const tags =
      `<link rel="alternate" hreflang="fr" href="${url}" />\n` +
      `<link rel="alternate" hreflang="ar" href="${arUrl}" />\n` +
      `<link rel="alternate" hreflang="x-default" href="${url}" />\n`;
    out = out.replace(/<\/head>/i, tags + '</head>');
  } else {
    out = out.replace(/<link rel="alternate" hreflang="ar" href="[^"]*" \/>/,
      `<link rel="alternate" hreflang="ar" href="${arUrl}" />`);
  }
  return out;
}

function headAr(html, file, titleAr, descAr, canonicalFr) {
  const url = canonicalFr || `${HOST}/${file}`;
  const arUrl = `${HOST}/ar/${file}`;
  let out = html;

  out = out.replace(/<html[^>]*>/i, '<html lang="ar" dir="rtl">');
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(titleAr)}</title>`);
  out = out.replace(/<meta name="description" content="[\s\S]*?" \/>/i,
    `<meta name="description" content="${esc(descAr)}" />`);
  out = out.replace(/<link rel="canonical" href="[^"]*" \/>/i,
    `<link rel="canonical" href="${arUrl}" />`);

  /* Les partages sociaux suivent la langue de la page, sans quoi une adresse
     arabe se presente en francais dans un fil de discussion. */
  out = out.replace(/<meta property="og:url" content="[^"]*" \/>/i,
    `<meta property="og:url" content="${arUrl}" />`);
  out = out.replace(/<meta property="og:title" content="[\s\S]*?" \/>/i,
    `<meta property="og:title" content="${esc(titleAr)}" />`);
  out = out.replace(/<meta property="og:description" content="[\s\S]*?" \/>/i,
    `<meta property="og:description" content="${esc(descAr)}" />`);
  /* Les remplacements ci-dessus sont des String.replace : ils echouent en
     silence quand la balise n'existe pas, et plusieurs de ces pages n'ont ni
     og:url ni og:locale. Une adresse arabe partagee se presentait alors en
     francais. On pose ce qui manque plutot que de le supposer present. */
  const ensure = (html, tag, re) => re.test(html) ? html
    : html.replace(/<\/head>/i, tag + '\n</head>');
  out = out.replace(/<meta property="og:locale" content="[^"]*" \/>/i,
    `<meta property="og:locale" content="ar_DZ" />`);
  out = ensure(out, `<meta property="og:locale" content="ar_DZ" />`, /property="og:locale"/);
  out = ensure(out, `<meta property="og:url" content="${arUrl}" />`, /property="og:url"/);
  out = ensure(out, `<meta property="og:title" content="${esc(titleAr)}" />`, /property="og:title"/);
  out = ensure(out, `<meta property="og:description" content="${esc(descAr)}" />`, /property="og:description"/);
  out = out.replace(/<meta name="twitter:title" content="[\s\S]*?" \/>/i,
    `<meta name="twitter:title" content="${esc(titleAr)}" />`);
  out = out.replace(/<meta name="twitter:description" content="[\s\S]*?" \/>/i,
    `<meta name="twitter:description" content="${esc(descAr)}" />`);

  /* hreflang : les deux se nomment l'une l'autre, sinon le canonique ne sert
     a rien. */
  out = out.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*" \/>\n?/g, '');
  const tags =
    `<link rel="alternate" hreflang="fr" href="${url}" />\n` +
    `<link rel="alternate" hreflang="ar" href="${arUrl}" />\n` +
    `<link rel="alternate" hreflang="x-default" href="${url}" />\n`;
  out = out.replace(/<\/head>/i, tags + '</head>');

  /* La police arabe est choisie par body.ar sur ces pages. */
  out = out.replace(/<body([^>]*)class="([^"]*)"/i, (m, pre, cls) =>
    `<body${pre}class="${cls} ar"`);
  if (!/<body[^>]*class=/i.test(out)) out = out.replace(/<body([^>]*)>/i, '<body$1 class="ar">');

  return absolutise(out);
}

/* Le bouton devient un lien : les deux langues sont deux adresses, et un
   moteur doit pouvoir suivre celui-ci. */
function langLink(html, href, hreflang, label, id) {
  id = id || 'lang';
  const m = html.match(new RegExp(`<button[^>]*id="${id}"[^>]*>[\\s\\S]*?</button>`, 'i'));
  if (!m) throw new Error(`bouton de langue introuvable : #${id}`);
  const cls = (m[0].match(/class="([^"]*)"/) || [])[1] || '';
  return html.replace(m[0],
    `<a id="${id}" href="${href}" hreflang="${hreflang}" class="${cls}">${label}</a>`);
}

const REMEMBER = (loc) =>
  `<script>try{localStorage.setItem('fp_locale','${loc}');}catch(e){}</script>`;

/* ---------------------------------------------------------------- *
 * Les pages, et leur mecanisme.
 * ---------------------------------------------------------------- */
const PAGES = [
  { file: 'guide.html', kind: 'blocks',
    frBlock: '<div id="fr">', arBlock: '<div id="ar" hidden>',
    script: "$('lang').addEventListener('click'",
    titleAr: 'دليل استعمال FacturePro — إنشاء فاتورة جزائرية',
    descAr: 'دليل مصوَّر لإنشاء فاتورة مطابقة للتنظيم الجزائري: العميل، البنود، الرسم 19% و9%، حق الطابع، والتصدير إلى PDF وExcel. مجاني وبلا تسجيل.' },

  { file: 'facture-non-assujetti-tva.html', kind: 'blocks',
    frBlock: '<div id="fr">', arBlock: '<div id="ar" dir="rtl" hidden>',
    script: "btn.addEventListener('click'",
    titleAr: 'فاتورة غير الخاضع للرسم في الجزائر — العبارة وسندها',
    descAr: 'من هو غير الخاضع للرسم في الجزائر، وعبارة TVA non applicable وسندها القانوني، والفرق بين غير خاضع ومعفى ونسبة صفر. مع نموذج مجاني بلا تسجيل.' },

  { file: 'auto-entrepreneur-algerie.html', kind: 'blocks',
    frBlock: '<div id="fr">', arBlock: '<div id="ar" dir="rtl" hidden>',
    script: "btn.addEventListener('click'",
    titleAr: 'فاتورة صاحب المشروع الذاتي في الجزائر — ماذا تحمل',
    descAr: 'ما يجب أن تحمله فاتورة صاحب المشروع الذاتي في الجزائر: البطاقة، الضريبة الجزافية، عبارة عدم الخضوع للرسم، وحق الطابع. مجاني وبلا تسجيل.' },

  /* Les six calculateurs. Leur interface est peinte a l'execution depuis un
     tableau T={fr,ar} — elle parle donc deja les deux langues — et seule la
     prose est ecrite en dur, dans une <section> par langue. Les tableaux de
     bareme ne portent ni dir ni lang : leurs libelles ont un identifiant et
     sont peints comme le reste, donc ils restent des deux cotes. On ne coupe
     que ce que les auteurs ont explicitement marque. */
  { file: 'calcul-tva.html', kind: 'tool',
    titleAr: 'حساب الرسم على القيمة المضافة 19% و9% — الجزائر',
    descAr: 'احسب الرسم على القيمة المضافة في الجزائر بنسبة 19% أو 9%: من خارج الرسم إلى داخله وبالعكس. حاسبة مجانية وفورية، بلا تسجيل.' },
  { file: 'droit-de-timbre.html', kind: 'tool',
    titleAr: 'حساب حق الطابع على الدفع نقداً — الجزائر',
    descAr: 'احسب حق الطابع على فاتورة تُدفع نقداً في الجزائر حسب السلّم القانوني، واعرف الصافي المستحقّ. حاسبة مجانية وفورية، بلا تسجيل.' },
  { file: 'montant-en-lettres.html', kind: 'tool',
    titleAr: 'تحويل المبلغ إلى حروف بالدينار — بالعربية والفرنسية',
    descAr: 'حوّل أي مبلغ بالدينار الجزائري إلى حروف، بالعربية وبالفرنسية، للعبارة الإجبارية في الفاتورة. مجاني وفوري وبلا تسجيل.' },
  { file: 'calcul-marge.html', kind: 'tool',
    titleAr: 'حساب الربح وسعر البيع — الجزائر',
    descAr: 'احسب سعر البيع من سعر الشراء ونسبة الربح، أو الربح من السعرين، مع الرسم على القيمة المضافة. حاسبة تاجر مجانية، بلا تسجيل.' },
  { file: 'calcul-pourcentage.html', kind: 'tool',
    titleAr: 'حساب النسبة المئوية والتخفيض — الجزائر',
    descAr: 'احسب نسبة مئوية من مبلغ، أو تخفيضاً، أو زيادة، أو الفرق بين رقمين، بالدينار الجزائري. حاسبة مجانية وفورية، بلا تسجيل.' },
  { file: 'calcul-salaire.html', kind: 'tool',
    titleAr: 'حساب الأجر الصافي والضريبة IRG — الجزائر',
    descAr: 'احسب الأجر الصافي من الأجر الخام في الجزائر: اقتطاع الضمان الاجتماعي والضريبة على الدخل حسب السلّم. حاسبة مجانية، بلا تسجيل.' },

  /* Les deux pages a attributs. accueil.html est la page d'atterrissage
     francaise : son canonique est la racine, parce que « / » sert la meme
     chose avec l'application par-dessus. Sa jumelle arabe, elle, est une vraie
     adresse a elle — c'est la premiere page en arabe que le site ait jamais
     pu faire indexer. */
  { file: 'conditions.html', kind: 'attributes', langId: 'lang',
    /* On epingle la lecture, pas l'initialisation : `var saved='fr'` est
       ecrase deux lignes plus bas par `saved = localStorage.getItem(...)`.
       Fige au mauvais endroit, la page arabe se rendait en lang="fr" et
       dir="ltr" des que le stockage etait vide ou bloque — c'est-a-dire pour
       un robot. */
    locale: { from: "saved = localStorage.getItem('fp_locale') || 'fr';",
              to: (l) => `saved = '${l}';` },
    titleAr: 'شروط الاستعمال وحماية البيانات — FacturePro الجزائر',
    descAr: 'شروط استعمال FacturePro وحماية بياناتك: لا حساب، ولا خادم، وفواتيرك تبقى في جهازك ولا تغادره. مجاني وبلا تسجيل.' },

  { file: 'accueil.html', kind: 'attributes', langId: 'langBtn',
    canonicalFr: 'https://www.facturedz.com/',
    locale: { from: "try { return localStorage.getItem(KEY) || 'fr'; } catch (e) { return 'fr'; }",
              to: (l) => `return '${l}';` },
    titleAr: 'برنامج فوترة مجاني للجزائر — TVA 19% وحق الطابع وNIF',
    descAr: 'أنشئ فواتير مطابقة للتنظيم الجزائري: الرسم 19% و9%، NIF وNIS وRC، حق الطابع، والمبلغ بالحروف. مجاني بلا تسجيل، وبياناتك تبقى في جهازك.' },
];



/* ---------------------------------------------------------------- *
 * La coupe.
 * ---------------------------------------------------------------- */
function splitBlocks(src, page) {
  const { file, frBlock, arBlock, script, titleAr, descAr } = page;

  /* Le francais : on retire le bloc arabe et le script qui basculait les
     deux, puis le bouton devient un lien vers la jumelle. */
  let fr = cutElement(src, arBlock, 'div');
  fr = cutScriptContaining(fr, script);
  fr = langLink(fr, `/ar/${file}`, 'ar', 'العربية');
  fr = headFr(fr, file);
  fr = fr.replace('</head>', REMEMBER('fr') + '\n</head>');

  /* L'arabe : le bloc francais s'en va, le bloc arabe cesse d'etre cache. */
  let ar = cutElement(src, frBlock, 'div');
  ar = cutScriptContaining(ar, script);
  ar = replaceOnce(ar, arBlock, arBlock.replace(' hidden', ''), 'attribut hidden');
  ar = langLink(ar, `/${file}`, 'fr', 'Français');
  ar = headAr(ar, file, titleAr, descAr);
  ar = ar.replace('</head>', REMEMBER('ar') + '\n</head>');

  return { fr, ar };
}


/* Les calculateurs : on ne touche ni au script ni au calcul, on retire la
   prose de l'autre langue et on fixe la locale. Le tableau T fait le reste —
   c'est deja lui qui peignait l'interface quand on cliquait sur le bouton. */
function splitTool(src, page) {
  const { file, titleAr, descAr } = page;
  const FR_SECTION = /<section[^>]*\sdir="ltr"\s+lang="fr"[^>]*>/g;
  const AR_SECTION = '<section class="card p-5 sm:p-6 mt-5" dir="rtl" lang="ar">';

  /* Deux corrections que la page ne pouvait pas faire elle-meme tant qu'elle
     servait les deux langues.

     La locale ne se lit plus dans le stockage : elle est celle de l'adresse.
     Ecrite en dur, elle ne depend plus ni d'une preference ancienne ni d'un
     navigateur qui refuse le stockage — et localStorage.getItem, ici, n'est
     pas dans un try : la ou les donnees de site sont bloquees, il levait et
     emportait tout le calculateur.

     Et le titre n'est plus reecrit a l'execution. apply() finissait par
     document.title = T[loc].title, qui effacait le titre de la page une
     fraction de seconde apres son affichage : ce que voyait un moteur n'etait
     pas ce que la construction avait ecrit. */
  const setLoc = (html, loc) => html.replace(
    /var loc\s*=\s*\(localStorage\.getItem\('fp_locale'\)\s*===\s*'ar'\)\s*\?\s*'ar'\s*:\s*'fr';/,
    `var loc='${loc}';`);
  const dropTitle = (html) => html.replace(/\s*document\.title\s*=\s*[a-z]+\.title;/g, '');

  let fr = setLoc(dropTitle(src), 'fr');
  const arOpen = (src.match(/<section[^>]*\sdir="rtl"\s+lang="ar"[^>]*>/) || [])[0];
  if (!arOpen) throw new Error('section arabe introuvable');
  fr = cutElement(fr, arOpen, 'section');
  fr = langLink(fr, `/ar/${file}`, 'ar', 'العربية');
  fr = headFr(fr, file);
  fr = fr.replace('</head>', REMEMBER('fr') + '\n</head>');

  let ar = setLoc(dropTitle(src), 'ar');
  /* Autant de sections francaises qu'il y en a : montant-en-lettres en porte
     trois. On recommence tant qu'il en reste une. */
  let guard = 0;
  while (guard++ < 12) {
    const m = ar.match(/<section[^>]*\sdir="ltr"\s+lang="fr"[^>]*>/);
    if (!m) break;
    ar = cutElement(ar, m[0], 'section', true);
  }
  ar = langLink(ar, `/${file}`, 'fr', 'Français');
  ar = headAr(ar, file, titleAr, descAr);
  ar = ar.replace('</head>', REMEMBER('ar') + '\n</head>');
  return { fr, ar };
}


/* Les pages a attributs : chaque element porte son texte dans les deux
   langues, data-fr et data-ar, et un script repeint au chargement. On fige le
   texte dans la langue de l'adresse et on retire les deux attributs — le
   script ne trouve plus rien a repeindre, ce qui est exactement ce qu'on veut,
   et il continue de poser lang, dir et le libelle du lien.
   La locale, elle, cesse d'etre une preference : elle est celle de l'URL. */
function bake(html, lang) {
  return html.replace(
    /<(\w+)((?=[^>]*\sdata-fr=)(?=[^>]*\sdata-ar=)[^>]*)>([^<]*)<\/\1>/g,
    (m, tag, attrs, _txt) => {
      const fr = (attrs.match(/\sdata-fr="([^"]*)"/) || [])[1];
      const ar = (attrs.match(/\sdata-ar="([^"]*)"/) || [])[1];
      if (fr === undefined || ar === undefined) return m;
      const rest = attrs.replace(/\sdata-(fr|ar)="[^"]*"/g, '');
      return `<${tag}${rest}>${lang === 'ar' ? ar : fr}</${tag}>`;
    });
}

function splitAttributes(src, page) {
  const { file, titleAr, descAr, locale, canonicalFr } = page;
  const mk = (lang) => {
    let out = bake(src, lang);
    out = replaceOnce(out, locale.from, locale.to(lang), 'locale figée');
    return out;
  };

  let fr = mk('fr');
  fr = langLink(fr, `/ar/${file}`, 'ar', 'العربية', page.langId);
  fr = headFr(fr, file, canonicalFr);
  /* Comme les deux autres familles : la langue de la page est celle qu'on
     retient, sans quoi un visiteur venu de l'arabe recevait du francais mis
     en page de droite a gauche. */
  fr = fr.replace('</head>', REMEMBER('fr') + '\n</head>');

  let ar = mk('ar');
  ar = langLink(ar, canonicalFr ? canonicalFr.replace(HOST, '') || '/' : `/${file}`,
                'fr', 'Français', page.langId);
  ar = headAr(ar, file, titleAr, descAr, canonicalFr);
  ar = ar.replace('</head>', REMEMBER('ar') + '\n</head>');
  return { fr, ar };
}

let n = 0;
mkdirSync(AR, { recursive: true });
for (const page of PAGES) {
  /* La source est le fichier bilingue du depot, jamais la sortie : relancer la
     construction sur un public/ deja coupe ne trouverait plus le bloc a
     couper, et l'etape echouerait un jour sur deux. */
  const p = join(OUT, page.file);
  const srcPath = join(ROOT, page.file);
  if (!existsSync(srcPath)) { console.error(`ar: ${page.file} absent du depot`); continue; }
  const src = readFileSync(srcPath, 'utf8');
  let out;
  try {
    if (page.kind === 'blocks') out = splitBlocks(src, page);
    else if (page.kind === 'tool') out = splitTool(src, page);
    else if (page.kind === 'attributes') out = splitAttributes(src, page);
    else throw new Error(`mecanisme inconnu : ${page.kind}`);
  } catch (e) {
    console.error(`ar: ${page.file} — ${e.message}`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(p, out.fr);
  writeFileSync(join(AR, page.file), out.ar);
  n += 2;
}
/* ---------------------------------------------------------------- *
 * Le plan du site.
 *
 * Les adresses arabes ne peuvent pas etre tenues a la main : elles viennent
 * de deux generateurs, et une liste ecrite a cote vieillirait au premier ajout.
 * On la reconstruit ici, apres que les deux ont ecrit, a partir de ce qui
 * existe reellement sur le disque.
 * ---------------------------------------------------------------- */
const SITEMAP = join(OUT, 'sitemap.xml');
const twins = readdirSync(AR).filter((f) => f.endsWith('.html')).sort();
let map = readFileSync(SITEMAP, 'utf8');
map = map.replace(/  <url>\n    <loc>https:\/\/www\.facturedz\.com\/ar\/[^<]*<\/loc>[\s\S]*?<\/url>\n/g, '');
const entries = twins.map((f) =>
  `  <url>\n    <loc>${HOST}/ar/${f}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`).join('');
writeFileSync(SITEMAP, map.replace('</urlset>', entries + '</urlset>'));

console.log(`ar: ${n} pages écrites (${PAGES.length} sources dédoublées), ${twins.length} adresses arabes au sitemap`);
