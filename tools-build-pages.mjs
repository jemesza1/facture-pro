/* FacturePro — the content and template pages.
 *
 * Written from one template rather than by hand: five pages that must share a
 * head, a language switch and a footer are five chances to get one of them
 * subtly wrong. The prose lives in the table below; the shell is written once.
 *
 * Each page answers a search somebody actually types — "modèle facture Excel",
 * "facture proforma", "mentions obligatoires facture Algérie" — and answers it
 * with the thing they came for: a real workbook, or a straight answer.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const OUT = join(ROOT, 'public');
const HOST = 'https://www.facturedz.com';
const V = (readFileSync(join(ROOT, 'app.js'), 'utf8').match(/var V="([^"]+)"/) || [])[1] || '1';

const SIBLINGS = [
  ['modele-facture-excel.html', 'Modèle de facture Excel', 'نموذج فاتورة Excel'],
  ['facture-proforma.html', 'Facture proforma', 'الفاتورة الأولية'],
  ['bon-de-commande.html', 'Bon de commande', 'وصل الطلبية'],
  ['mentions-obligatoires-facture-algerie.html', 'Mentions obligatoires', 'البيانات الإجبارية'],
  ['remplir-g50.html', 'Remplir le G50', 'ملء G50'],
];

const dl = (kind, fr, ar) =>
  `<p class="mt-4"><button type="button" onclick="grab('${kind}')" class="dlbtn">` +
  `<span data-fr="${fr}" data-ar="${ar}">${fr}</span></button></p>` +
  `<p class="mt-2 text-xs opacity-70" data-fr="Fichier .xlsx — s'ouvre dans Excel, LibreOffice, WPS et Google Sheets. Les totaux sont des formules."` +
  ` data-ar="ملف .xlsx — يفتح في Excel وLibreOffice وWPS وGoogle Sheets. والمجاميع صيغ حيّة.">` +
  `Fichier .xlsx — s'ouvre dans Excel, LibreOffice, WPS et Google Sheets. Les totaux sont des formules.</p>`;

const PAGES = [
  {
    file: 'modele-facture-excel.html', kind: 'facture',
    title: 'Modèle de facture Excel Algérie — gratuit, avec formules | نموذج فاتورة',
    desc: "Téléchargez un modèle de facture algérienne au format Excel (.xlsx), avec NIF, NIS, RC, AI, TVA 19 % et 9 %, droit de timbre et totaux calculés par formules. Gratuit, sans inscription.",
    og: 'Modèle de facture Excel pour l’Algérie — gratuit',
    h1fr: 'Modèle de facture Excel pour l’Algérie',
    h1ar: 'نموذج فاتورة Excel للجزائر',
    leadfr: "Un vrai fichier .xlsx, pas une image ni un .xls déguisé. Les totaux sont des formules : changez une quantité et la ligne, la TVA et le net suivent.",
    leadar: 'ملف .xlsx حقيقي، لا صورة ولا ملف مموّه. المجاميع صيغ حيّة: غيّر الكمّية فيتبعها السطر والرسم والصافي.',
    body: [
      {h: ['Ce que contient le fichier', 'واش فيه الملف'],
       ul: [
         ['Le bloc vendeur : raison sociale, adresse, NIF, NIS, RC et AI', 'خانة البائع: التسمية والعنوان والرقم الجبائي والإحصائي والسجل التجاري والمادة الضريبية'],
         ['Le bloc client, avec son NIF pour une vente à un professionnel', 'خانة العميل، ومعها رقمه الجبائي في البيع لمهني'],
         ['Douze lignes avec Total HT = quantité × prix, et la TVA calculée par ligne', 'اثنا عشر سطراً: المجموع = الكمّية × السعر، والرسم يُحسب لكل سطر'],
         ['Total HT, total TVA, total TTC, droit de timbre et net à payer', 'المجموع خارج الرسم، والرسم، والإجمالي، وحقّ الطابع، والصافي للدفع'],
         ['La ligne « Arrêtée la présente facture à la somme de »', 'سطر «أُوقفت هذه الفاتورة على مبلغ»'],
       ]},
      {h: ['Deux choses à vérifier avant d’envoyer', 'شيئان تتأكّد منهما قبل الإرسال'],
       p: [['Le droit de timbre ne s’applique qu’aux règlements en espèces, et son barème est fixé par la loi de finances : la case est laissée à remplir plutôt que pré-calculée, pour ne pas imprimer un chiffre périmé sur un document fiscal.',
            'حقّ الطابع لا يُطبَّق إلا على الدفع نقداً، وسلّمه يحدّده قانون المالية: تُركت الخانة لتملأها بدل حسابها مسبقاً، حتى لا يُطبع رقم قديم على وثيقة جبائية.'],
           ['Le montant en lettres est exigé. Si vous ne voulez pas l’écrire à la main, la page « montant en lettres » le fait pour vous.',
            'المبلغ بالحروف مطلوب. وإن لم ترد كتابته بيدك، صفحة «المبلغ بالحروف» تفعلها عنك.']]},
      {h: ['Excel ou l’application ?', 'Excel أم التطبيق؟'],
       p: [['Le fichier convient pour une facture de temps en temps. Dès qu’il y a un suivi à tenir — qui a payé, qui est en retard, ce que dit le journal du mois pour le G50 — un tableur devient un travail de recopie. L’application fait cette partie, gratuitement et sans compte.',
            'الملف يكفي لفاتورة من حين لآخر. أمّا كي يصير فيه متابعة — من دفع، ومن تأخّر، وماذا يقول سجلّ الشهر لـG50 — فالجدول يتحوّل إلى نسخ يدوي. التطبيق يتكفّل بذلك، مجاناً وبلا حساب.']]},
    ],
    extra: dl('facture', 'Télécharger le modèle Excel', 'حمّل نموذج Excel'),
  },
  {
    file: 'facture-proforma.html', kind: 'proforma',
    title: 'Facture proforma — modèle Excel gratuit et définition | الفاتورة الأولية',
    desc: "Qu’est-ce qu’une facture proforma, à quoi elle sert (banque, douane, devis ferme), ce qui la distingue d’une facture, et un modèle Excel gratuit à télécharger.",
    og: 'Facture proforma — modèle gratuit et définition',
    h1fr: 'La facture proforma',
    h1ar: 'الفاتورة الأولية (proforma)',
    leadfr: "Un document d’intention : il annonce ce qu’une facture dira si la vente se fait. Il n’est pas une facture, et c’est toute la différence.",
    leadar: 'وثيقة نيّة: تعلن ما ستقوله الفاتورة إن تمّت البيعة. وهي ليست فاتورة، وهذا هو الفرق كلّه.',
    body: [
      {h: ['À quoi elle sert', 'فيما تُستعمل'],
       ul: [
         ['Obtenir un accord ou un financement : la banque veut voir le montant avant de le débloquer', 'الحصول على موافقة أو تمويل: البنك يريد رؤية المبلغ قبل تحريره'],
         ['Une importation : la douane et la domiciliation bancaire la demandent', 'الاستيراد: الجمارك والتوطين البنكي يطلبانها'],
         ['Un engagement de prix ferme avant commande', 'التزام بسعر ثابت قبل الطلبية'],
       ]},
      {h: ['Ce qu’elle n’est pas', 'وما هي ليست'],
       p: [['Elle n’enregistre aucune vente, n’ouvre pas droit à déduction de TVA et ne se comptabilise pas. Elle ne doit donc pas porter de numéro de votre série de factures : quand la vente se fait, vous émettez une vraie facture, avec son propre numéro.',
            'لا تسجّل أي بيع، ولا تفتح حقّ خصم الرسم، ولا تُقيَّد محاسبياً. فلا تحمل رقماً من سلسلة فواتيرك: وكي تتمّ البيعة تُصدر فاتورة حقيقية برقمها الخاص.'],
           ['Portez la mention « proforma » en évidence. Un document qui ressemble à une facture sans en être une est un malentendu qui se paie.',
            'اكتب كلمة «proforma» بوضوح. وثيقة تشبه الفاتورة بلا أن تكونها سوء فهم يُدفع ثمنه.']]},
    ],
    extra: dl('proforma', 'Télécharger le modèle proforma', 'حمّل نموذج proforma'),
  },
  {
    file: 'bon-de-commande.html', kind: 'commande',
    title: 'Bon de commande — modèle Excel gratuit à télécharger | وصل الطلبية',
    desc: "Modèle de bon de commande au format Excel, avec les identifiants, les lignes, les totaux calculés et le délai de livraison. Gratuit, sans inscription.",
    og: 'Bon de commande — modèle Excel gratuit',
    h1fr: 'Le bon de commande',
    h1ar: 'وصل الطلبية',
    leadfr: "Ce que l’acheteur envoie au fournisseur : ce qu’il commande, en quelle quantité, à quel prix et pour quand. La facture vient après, et doit lui correspondre.",
    leadar: 'ما يرسله المشتري إلى المورّد: ماذا يطلب، وبأي كمّية، وبأي سعر، ومتى. والفاتورة تأتي بعده، ويجب أن تطابقه.',
    body: [
      {h: ['Ce qu’il doit porter', 'واش يحمل'],
       ul: [
         ['Un numéro et une date : c’est la référence que la facture rappellera', 'رقماً وتاريخاً: وهو المرجع الذي ستذكّر به الفاتورة'],
         ['Les identifiants des deux parties', 'معرّفات الطرفين'],
         ['Les lignes avec quantités et prix convenus', 'السطور بالكمّيات والأسعار المتّفق عليها'],
         ['Le délai et le lieu de livraison', 'أجل التسليم ومكانه'],
       ]},
      {h: ['Bon de commande, bon de livraison, facture', 'وصل الطلبية، وصل التسليم، الفاتورة'],
       p: [['Trois documents, trois moments : on commande, on livre, on facture. Le bon de livraison accompagne la marchandise et ne porte pas de prix ; la facture porte les prix et la TVA. L’application émet les trois.',
            'ثلاث وثائق، ثلاث لحظات: تُطلَب، ثم تُسلَّم، ثم تُفوتَر. وصل التسليم يرافق البضاعة ولا يحمل أسعاراً؛ والفاتورة تحمل الأسعار والرسم. والتطبيق يُصدر الثلاثة.']]},
    ],
    extra: dl('commande', 'Télécharger le modèle', 'حمّل النموذج'),
  },
  {
    file: 'mentions-obligatoires-facture-algerie.html',
    title: 'Mentions obligatoires d’une facture en Algérie — la liste | البيانات الإجبارية',
    desc: "La liste des mentions qu’une facture doit porter en Algérie : identité et identifiants du vendeur et du client (NIF, NIS, RC, AI), désignation, prix, TVA, montant en lettres et droit de timbre.",
    og: 'Mentions obligatoires d’une facture en Algérie',
    h1fr: 'Ce qu’une facture doit porter, en Algérie',
    h1ar: 'ما يجب أن تحمله الفاتورة في الجزائر',
    leadfr: "Une facture incomplète est refusée par le client professionnel, et peut être écartée en cas de contrôle. La liste tient en une page.",
    leadar: 'الفاتورة الناقصة يرفضها الزبون المهني، وقد تُستبعد عند المراقبة. والقائمة تسع صفحة واحدة.',
    body: [
      {h: ['Le vendeur', 'البائع'],
       ul: [['Raison sociale et adresse complète', 'التسمية الاجتماعية والعنوان الكامل'],
            ['NIF — numéro d’identification fiscale', 'الرقم الجبائي NIF'],
            ['NIS — numéro d’identification statistique', 'الرقم الإحصائي NIS'],
            ['RC — registre du commerce', 'رقم السجل التجاري RC'],
            ['AI — article d’imposition', 'المادة الضريبية AI'],
            ['NIN quand il est exigé, notamment pour l’état des fournisseurs (série G n° 9)', 'رقم التعريف الوطني NIN عند طلبه، خاصّة لكشف المورّدين (السلسلة G رقم 9)']]},
      {h: ['Le client', 'العميل'],
       p: [['Nom ou raison sociale et adresse. Pour une vente à un professionnel, son NIF : c’est lui qui permet au client de déduire la TVA, et son absence est la première raison pour laquelle une facture revient.',
            'الاسم أو التسمية والعنوان. وفي البيع لمهني، رقمه الجبائي: هو الذي يسمح للزبون بخصم الرسم، وغيابه أول سبب لرجوع الفاتورة.']]},
      {h: ['Le document', 'الوثيقة'],
       ul: [['Un numéro d’une série continue, et la date', 'رقم من سلسلة متّصلة، والتاريخ'],
            ['La désignation précise, la quantité et le prix unitaire', 'الوصف الدقيق والكمّية وسعر الوحدة'],
            ['Le taux et le montant de TVA — 19 % en régime normal, 9 % en taux réduit', 'نسبة الرسم ومبلغه — 19% في النظام العادي، 9% في النسبة المخفّضة'],
            ['Le total hors taxe, le total TTC et le net à payer', 'المجموع خارج الرسم، والإجمالي، والصافي للدفع'],
            ['Le montant total en toutes lettres', 'المبلغ الإجمالي بالحروف'],
            ['Le droit de timbre, uniquement si le règlement est en espèces', 'حقّ الطابع، فقط إذا كان الدفع نقداً']]},
      {h: ['Deux erreurs fréquentes', 'خطآن شائعان'],
       p: [['Facturer le droit de timbre sur un virement. Il ne concerne que les règlements en espèces ; l’ajouter ailleurs fait payer au client une taxe qu’il ne doit pas.',
            'فرض حقّ الطابع على تحويل بنكي. هو للدفع النقدي فقط؛ وإضافته في غيره تُحمّل الزبون رسماً لا يجب عليه.'],
           ['Corriger une facture partie chez le client en la modifiant. Une fois émise et entrée dans une déclaration, la seule correction est une facture d’avoir.',
            'تصحيح فاتورة وصلت الزبون بتعديلها. فبعد إصدارها ودخولها في تصريح، التصحيح الوحيد هو إشعار دائن.']]},
    ],
  },
  {
    file: 'remplir-g50.html',
    title: 'Remplir le G50 — d’où viennent les chiffres | ملء تصريح G50',
    desc: "Le G50 est la déclaration mensuelle. Voici quels chiffres il demande, d’où ils sortent dans vos factures, et comment obtenir le récapitulatif TVA du mois en un clic.",
    og: 'Remplir le G50 — d’où viennent les chiffres',
    h1fr: 'Le G50, et d’où sortent ses chiffres',
    h1ar: 'تصريح G50، ومن أين تأتي أرقامه',
    leadfr: "Le G50 est la déclaration mensuelle déposée auprès de l’administration fiscale. Le remplir est surtout un travail de report : les chiffres existent déjà dans vos factures du mois.",
    leadar: 'G50 هو التصريح الشهري الذي يُودَع لدى الإدارة الجبائية. وملؤه في جوهره نقل أرقام: فهي موجودة أصلاً في فواتير الشهر.',
    body: [
      {h: ['Ce qu’il demande, côté ventes', 'ما يطلبه في جانب المبيعات'],
       ul: [['Le chiffre d’affaires hors taxe du mois, ventilé par taux', 'رقم الأعمال خارج الرسم للشهر، موزّعاً حسب النسبة'],
            ['La TVA collectée correspondant à chaque taux', 'الرسم المحصَّل المقابل لكل نسبة'],
            ['Les autres droits et taxes selon votre activité', 'الحقوق والرسوم الأخرى حسب نشاطك']]},
      {h: ['D’où sortent ces chiffres', 'من أين تأتي هذه الأرقام'],
       p: [['De vos factures du mois, en excluant les brouillons et les factures annulées, et en soustrayant les avoirs. C’est exactement ce que fait le « Journal du mois » de l’application : une feuille par mois avec la base et la TVA séparées par taux, et une feuille « Récapitulatif TVA » qui ne contient que les totaux à reporter.',
            'من فواتير الشهر، باستثناء المسوّدات والملغاة، وبطرح الإشعارات الدائنة. وهذا بالضبط ما يفعله «سجلّ الشهر» في التطبيق: ورقة لكل شهر بالأساس والرسم مفصولين حسب النسبة، وورقة «ملخّص الرسم» لا تحمل إلا المجاميع التي تُنقل.'],
           ['Le droit de timbre y figure à part : il est encaissé pour le Trésor, il n’est ni un produit ni de la TVA.',
            'وحقّ الطابع يظهر على حدة: يُحصَّل لحساب الخزينة، وهو ليس إيراداً ولا رسماً على القيمة المضافة.']]},
      {h: ['À vérifier auprès de l’administration', 'ما يُتأكَّد منه لدى الإدارة'],
       p: [['Les taux, les rubriques et la date limite de dépôt sont fixés par la réglementation et peuvent changer d’une loi de finances à l’autre. Cette page explique d’où viennent vos chiffres ; elle ne remplace pas l’imprimé officiel ni votre comptable.',
            'النسب والأبواب وأجل الإيداع تحدّدها التنظيمات وقد تتغيّر من قانون مالية إلى آخر. هذه الصفحة تشرح من أين تأتي أرقامك؛ ولا تحلّ محلّ الاستمارة الرسمية ولا محاسبك.']]},
    ],
  },
];

function section(s) {
  let fr = `<h2>${s.h[0]}</h2>`, ar = `<h2>${s.h[1]}</h2>`;
  if (s.ul) {
    fr += '<ul>' + s.ul.map(x => `<li>${x[0]}</li>`).join('') + '</ul>';
    ar += '<ul>' + s.ul.map(x => `<li>${x[1]}</li>`).join('') + '</ul>';
  }
  if (s.p) {
    fr += s.p.map(x => `<p>${x[0]}</p>`).join('');
    ar += s.p.map(x => `<p>${x[1]}</p>`).join('');
  }
  return [fr, ar];
}

const shell = (page) => {
  const parts = page.body.map(section);
  const fr = parts.map(x => x[0]).join('');
  const ar = parts.map(x => x[1]).join('');
  const sibs = (lang) => SIBLINGS.filter(s => s[0] !== page.file)
    .map(s => `<a class="underline mx-1" href="/${s[0]}">${lang === 'ar' ? s[2] : s[1]}</a>`).join(' · ');
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#006233" />
<title>${page.title}</title>
<meta name="description" content="${page.desc}" />
<meta name="author" content="CheMs SoUu" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${HOST}/${page.file}" />
<meta property="og:title" content="${page.og}" />
<meta property="og:description" content="${page.desc}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="${HOST}/${page.file}" />
<meta property="og:image" content="${HOST}/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${HOST}/og.png" />
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>
<style>
  :root{--brand:#006233;--brand2:#059669}
  body{font-family:Inter,system-ui,sans-serif;background:#f8fafc;color:#0f172a}
  body.ar{font-family:Cairo,system-ui,sans-serif}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px}
  h2{font-size:1.05rem;font-weight:700;margin:1.5rem 0 .5rem}
  p,li{font-size:.92rem;line-height:1.8}
  ul{padding-inline-start:1.15rem;list-style:disc}
  li{margin:.3rem 0}
  .dlbtn{display:inline-flex;align-items:center;gap:.5rem;background:var(--brand);color:#fff;
    border:0;border-radius:.75rem;padding:.7rem 1.2rem;font-size:.92rem;font-weight:600;cursor:pointer}
  .dlbtn:hover{background:#00512a}
  @media (prefers-color-scheme: dark){
    body{background:#0b1220;color:#e2e8f0}
    .card{background:#111b2e;border-color:#1e293b}
  }
</style>
<link rel="stylesheet" href="vendor/tailwind.css?v=20260817h" />
</head>
<body class="min-h-screen">

<header class="max-w-2xl mx-auto px-4 pt-8 pb-4 flex items-center justify-between gap-3">
  <a href="/" class="flex items-center gap-2 min-w-0">
    <img src="/icon.svg" alt="" width="36" height="36" class="w-9 h-9 rounded-xl shrink-0" />
    <span class="font-bold truncate">FacturePro</span>
  </a>
  <button id="lang" class="text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700">العربية</button>
</header>

<main class="max-w-2xl mx-auto px-4 pb-16">
  <div id="fr">
    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${page.h1fr}</h1>
    <p class="opacity-80 mb-5">${page.leadfr}</p>
    <div class="card p-5 sm:p-6">${fr}${page.extra || ''}</div>
    <p class="text-center text-sm mt-8 opacity-70">${sibs('fr')}</p>
    <p class="text-center text-sm mt-3"><a href="/" class="underline">Ouvrir l’application de facturation</a></p>
  </div>
  <div id="ar" dir="rtl" hidden>
    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${page.h1ar}</h1>
    <p class="opacity-80 mb-5">${page.leadar}</p>
    <div class="card p-5 sm:p-6">${ar}${page.extra || ''}</div>
    <p class="text-center text-sm mt-8 opacity-70">${sibs('ar')}</p>
    <p class="text-center text-sm mt-3"><a href="/" class="underline">افتح تطبيق الفوترة</a></p>
  </div>
</main>
${page.kind ? `<script src="lib-xlsx.js?v=${V}"></script>
<script src="template-xlsx.js?v=${V}"></script>
<script>
  function grab(kind){
    if (!window.downloadTemplate || !downloadTemplate(kind)) {
      alert(document.body.classList.contains('ar')
        ? 'تعذّر إنشاء الملف. أعد تحميل الصفحة.'
        : 'Le fichier n’a pas pu être créé. Rechargez la page.');
    }
  }
</script>` : ''}
<script>
  (function(){
    var btn=document.getElementById('lang'), fr=document.getElementById('fr'), ar=document.getElementById('ar');
    function apply(isAr){
      document.documentElement.lang = isAr ? 'ar' : 'fr';
      document.documentElement.dir  = isAr ? 'rtl' : 'ltr';
      document.body.classList.toggle('ar', isAr);
      fr.hidden = isAr; ar.hidden = !isAr;
      btn.textContent = isAr ? 'Français' : 'العربية';
      try{ localStorage.setItem('fp_locale', isAr ? 'ar' : 'fr'); }catch(e){}
    }
    var saved='fr'; try{ saved=localStorage.getItem('fp_locale')||'fr'; }catch(e){}
    apply(saved==='ar');
    btn.addEventListener('click', function(){ apply(!document.body.classList.contains('ar')); });
  })();
</script>
</body>
</html>`;
};

let n = 0;
for (const page of PAGES) { writeFileSync(join(OUT, page.file), shell(page)); n++; }
console.log(`pages: ${n} written`);
export { PAGES };
