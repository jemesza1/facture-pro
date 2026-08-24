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
  ['telecharger.html', 'Installer sur PC', 'التثبيت على الحاسوب'],
  ['plan-comptable-scf.html', 'Plan comptable SCF', 'دليل الحسابات SCF'],
  ['devis.html', 'Devis', 'عرض السعر'],
  ['bon-de-livraison.html', 'Bon de livraison', 'وصل التسليم'],
  ['facture-avoir.html', "Facture d'avoir", 'الإشعار الدائن'],
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

/* dl() fabrique le classeur dans le navigateur ; celui-ci pointe un fichier
   que le build a deja copie. Le systeme comptable fait huit feuilles et trois
   mille formules — l'ecrire a la volee couterait plus que de le livrer. */
const dlfile = (href, fr, ar, note_fr, note_ar) =>
  `<p class="mt-4"><a href="${href}" download class="dlbtn">` +
  `<span data-fr="${fr}" data-ar="${ar}">${fr}</span></a></p>` +
  `<p class="mt-2 text-xs opacity-70" data-fr="${note_fr}" data-ar="${note_ar}">${note_fr}</p>`;

const PAGES = [
  {
    file: 'bon-de-livraison.html', kind: 'livraison',
    title: 'Bon de livraison — modèle Excel gratuit, sans prix | وصل التسليم',
    desc: "Modèle de bon de livraison au format Excel : désignation, quantité commandée et livrée, réserves et signatures. Sans prix, comme il se doit. Gratuit, sans inscription. نموذج وصل التسليم بصيغة Excel: البيان والكمّية المطلوبة والمسلَّمة والملاحظات والتوقيعان. بلا أسعار، كما يجب. مجاني وبلا تسجيل.",
    og: 'Bon de livraison — modèle Excel gratuit',
    h1fr: 'Le bon de livraison',
    h1ar: 'وصل التسليم',
    leadfr: "Il accompagne la marchandise et prouve qu'elle est arrivée. C'est le seul des trois documents qui ne porte pas de prix — et c'est exactement à cela qu'il sert.",
    leadar: 'يرافق البضاعة ويُثبت أنّها وصلت. وهو الوحيد من الوثائق الثلاث الذي لا يحمل أسعاراً — وهذا بالضبط ما يخدم فيه.',
    body: [
      {h: ['Pourquoi il ne porte pas de prix', 'لماذا لا يحمل أسعاراً'],
       p: [['Le bon de livraison passe entre beaucoup de mains : le chauffeur, le magasinier, le gardien. Y inscrire vos prix, c\u2019est les faire circuler chez des gens qui n\u2019ont pas à les connaître — et parfois chez un concurrent. La facture porte les prix ; le bon de livraison porte les quantités.',
            'وصل التسليم يمرّ بأيدٍ كثيرة: السائق، وأمين المخزن، والحارس. وكتابة أسعارك فيه تعني تسريبها لمن لا شأن له بها — وأحياناً لمنافس. الفاتورة تحمل الأسعار، ووصل التسليم يحمل الكمّيات.']]},
      {h: ['Ce qu\u2019il doit porter', 'ما يجب أن يحمله'],
       ul: [
         ['Un numéro et une date, et le numéro du bon de commande auquel il répond', 'رقماً وتاريخاً، ورقم وصل الطلبية الذي يجيب عنه'],
         ['Les identifiants des deux parties, et l\u2019adresse exacte de livraison', 'معرّفات الطرفين، والعنوان الدقيق للتسليم'],
         ['La désignation, l\u2019unité, la quantité commandée et la quantité réellement livrée', 'البيان، والوحدة، والكمّية المطلوبة، والكمّية المسلَّمة فعلاً'],
         ['Une colonne « observations » : c\u2019est là que s\u2019écrivent les réserves', 'خانة «ملاحظات»: وفيها تُكتب التحفّظات'],
         ['Deux signatures : le livreur et le client, à la réception', 'توقيعان: المُسلِّم والزبون، عند الاستلام'],
       ]},
      {h: ['Les réserves, et pourquoi elles comptent', 'التحفّظات، ولماذا تهمّ'],
       p: [['Un client qui signe sans réserve reconnaît avoir tout reçu, en bon état. S\u2019il manque un carton ou qu\u2019un article est abîmé, cela s\u2019écrit sur le bon avant la signature, pas au téléphone le lendemain. Sans cette ligne écrite, la discussion se fait sans preuve.',
            'الزبون الذي يوقّع بلا تحفّظ يقرّ أنّه استلم كل شيء وبحالة سليمة. وإن نقص كرتون أو تلف صنف، يُكتب ذلك على الوصل قبل التوقيع، لا في الهاتف غداً. وبلا هذا السطر المكتوب، يصير النقاش بلا دليل.']]},
      {h: ['Commande, livraison, facture', 'الطلبية، التسليم، الفاتورة'],
       p: [['Trois documents, trois moments : on commande, on livre, on facture. Chacun rappelle le numéro du précédent, et c\u2019est cette chaîne qui rend un dossier défendable — devant un client qui conteste comme devant un contrôle. L\u2019application émet les trois, et reprend automatiquement les lignes de la facture.',
            'ثلاث وثائق، وثلاث لحظات: تُطلَب، ثم تُسلَّم، ثم تُفوتَر. كلّ واحدة تذكّر برقم سابقتها، وهذه السلسلة هي ما يجعل الملفّ قابلاً للدفاع عنه — أمام زبون ينازع وأمام مراقبة. والتطبيق يُصدر الثلاثة، ويأخذ سطور الفاتورة تلقائياً.']]},
    ],
    extra: dl('livraison', 'Télécharger le modèle de bon de livraison', 'حمّل نموذج وصل التسليم'),
  },
  {
    file: 'facture-avoir.html', kind: 'avoir',
    title: "Facture d'avoir — modèle Excel gratuit et mode d'emploi | فاتورة إشعار دائن",
    desc: "Qu'est-ce qu'une facture d'avoir, quand l'émettre, comment la numéroter et ce qu'elle change pour la TVA du mois. Avec un modèle Excel gratuit à télécharger. ما هي فاتورة الإشعار الدائن، ومتى تُصدَر، وكيف تُرقَّم، وماذا تغيّر في تصريح G50. مع نموذج Excel مجاني.",
    og: "Facture d'avoir — modèle et mode d'emploi",
    h1fr: "La facture d'avoir",
    h1ar: 'فاتورة الإشعار الدائن',
    leadfr: "Une facture émise ne se corrige pas et ne se déchire pas : elle s'annule par un autre document, l'avoir. C'est la seule manière propre de revenir sur une vente.",
    leadar: 'الفاتورة الصادرة لا تُصحَّح ولا تُمزَّق: تُلغى بوثيقة أخرى هي الإشعار الدائن. وهذه هي الطريقة النظيفة الوحيدة للرجوع عن بيعة.',
    body: [
      {h: ['Quand l\u2019émettre', 'متى يُصدَر'],
       ul: [
         ['Un retour de marchandise, total ou partiel', 'إرجاع بضاعة، كلّياً أو جزئياً'],
         ['Une erreur de prix, de quantité ou de taux de TVA sur une facture déjà remise', 'خطأ في السعر أو الكمّية أو نسبة الرسم في فاتورة سُلّمت'],
         ['Une remise accordée après coup', 'تخفيض مُنح بعد الإصدار'],
         ['Une annulation de vente', 'إلغاء بيعة'],
       ]},
      {h: ['Ce qu\u2019il ne faut pas faire', 'ما لا يجب فعله'],
       p: [['Ne modifiez pas la facture d\u2019origine et ne la supprimez pas. Elle a été remise au client, elle est peut-être déjà déclarée, et une série de numéros avec un trou est la première chose qu\u2019un contrôle remarque. La facture reste ; l\u2019avoir la corrige.',
            'لا تعدّل الفاتورة الأصلية ولا تحذفها. فقد سُلّمت للزبون، وربّما صُرّح بها، وسلسلة أرقام فيها فراغ هي أوّل ما تلاحظه المراقبة. الفاتورة تبقى، والإشعار الدائن يصحّحها.'],
           ['L\u2019avoir porte son propre numéro, dans une série qui lui est propre — pas un numéro repris de vos factures. Et il rappelle le numéro et la date de la facture qu\u2019il corrige : sans ce lien, c\u2019est un document isolé qui ne prouve rien.',
            'الإشعار الدائن يحمل رقمه الخاص في سلسلة مستقلّة — لا رقماً مأخوذاً من سلسلة فواتيرك. ويذكّر برقم وتاريخ الفاتورة التي يصحّحها: وبلا هذا الرابط يصير وثيقة معزولة لا تُثبت شيئاً.']]},
      {h: ['Ce qu\u2019il change pour le G50', 'ما يغيّره في تصريح G50'],
       p: [['La TVA que l\u2019avoir annule vient en déduction de la TVA collectée du mois où il est émis. Autrement dit : votre chiffre d\u2019affaires du mois baisse du montant de l\u2019avoir, et la TVA à reverser aussi. C\u2019est pour cela que le journal du mois de l\u2019application soustrait les avoirs au lieu de les ignorer.',
            'الرسم الذي يلغيه الإشعار يُخصَم من الرسم المحصَّل في الشهر الذي صدر فيه. بعبارة أخرى: رقم أعمال الشهر ينقص بمبلغ الإشعار، والرسم الواجب دفعه كذلك. ولهذا يطرح سجلّ الشهر في التطبيق الإشعارات بدل أن يتجاهلها.'],
           ['Et le droit de timbre ne s\u2019y applique pas : il frappe un encaissement en espèces, et un avoir n\u2019encaisse rien.',
            'وحقّ الطابع لا يُطبَّق عليه: فهو يمسّ تحصيلاً نقدياً، والإشعار الدائن لا يحصّل شيئاً.']]},
      {h: ['Dans l\u2019application', 'في التطبيق'],
       p: [['Ouvrez la facture concernée et choisissez « Facture d\u2019avoir » : les mêmes lignes sont reprises en négatif, un numéro de la série des avoirs est attribué, et la facture d\u2019origine n\u2019est pas touchée. Le journal du mois en tient compte tout seul.',
            'افتح الفاتورة المعنيّة واختر «فاتورة إشعار دائن»: تُؤخذ السطور نفسها بالسالب، ويُعطى رقم من سلسلة الإشعارات، والفاتورة الأصلية لا تُمسّ. وسجلّ الشهر يحسبها وحده.']]},
    ],
    extra: dl('avoir', "Télécharger le modèle d'avoir", 'حمّل نموذج الإشعار الدائن'),
  },
  {
    file: 'devis.html', kind: 'devis',
    title: 'Devis — modèle Excel gratuit pour l’Algérie | نموذج عرض السعر',
    desc: "Modèle de devis au format Excel : identifiants, lignes, totaux calculés, durée de validité et bon pour accord. Et comment le transformer en facture. Gratuit, sans inscription. نموذج عرض سعر بصيغة Excel: المعرّفات والسطور والمجاميع ومدّة الصلاحية وسطر الموافقة. وكيف يتحوّل إلى فاتورة. مجاني وبلا تسجيل.",
    og: 'Devis — modèle Excel gratuit',
    h1fr: 'Le devis',
    h1ar: 'عرض السعر (devis)',
    leadfr: "Un prix annoncé avant le travail, et tenu pendant une durée que vous fixez. Accepté et signé, il devient un engagement — le vôtre autant que celui du client.",
    leadar: 'سعر يُعلَن قبل العمل، ويُحترَم مدّةً تحدّدها أنت. وإذا قُبل ووُقّع صار التزاماً — التزامك أنت كما التزام الزبون.',
    body: [
      {h: ['Ce qui le rend utile', 'ما يجعله نافعاً'],
       ul: [
         ['Une durée de validité écrite : sans elle, un prix donné il y a six mois vous est opposé aujourd\u2019hui', 'مدّة صلاحية مكتوبة: وبدونها يُحتجّ عليك اليوم بسعر أعطيته قبل ستّة أشهر'],
         ['Le détail des lignes : ce qui est compris, et donc ce qui ne l\u2019est pas', 'تفصيل السطور: ما هو مشمول، وبالتالي ما ليس مشمولاً'],
         ['Un délai d\u2019exécution', 'أجل التنفيذ'],
         ['Une ligne « bon pour accord » avec date et signature', 'سطر «موافَق عليه» بالتاريخ والتوقيع'],
       ]},
      {h: ['Devis, proforma : la différence', 'عرض السعر والفاتورة الأولية: الفرق'],
       p: [['Les deux annoncent un prix sans être des factures. Le devis s\u2019adresse au client et attend sa signature ; la proforma s\u2019adresse le plus souvent à une banque ou à la douane, qui veulent voir un montant sur un document à en-tête. En pratique : si vous attendez un accord, faites un devis ; si on vous demande une pièce pour un dossier, faites une proforma.',
            'كلاهما يعلن سعراً دون أن يكون فاتورة. عرض السعر موجَّه للزبون وينتظر توقيعه؛ أمّا الفاتورة الأولية فتُوجَّه غالباً لبنك أو للجمارك، يريدان رؤية مبلغ على وثيقة رسمية. عملياً: إن كنت تنتظر موافقة فاعمل عرض سعر، وإن طُلبت منك وثيقة لملفّ فاعمل فاتورة أولية.']]},
      {h: ['Ne lui donnez pas un numéro de facture', 'لا تعطه رقم فاتورة'],
       p: [['Un devis ne se comptabilise pas, n\u2019enregistre aucune vente et n\u2019ouvre aucun droit à déduction de TVA. Il doit donc porter sa propre série — DEV-2026-001, par exemple — et jamais un numéro pris dans celle de vos factures. Quand le client accepte, vous émettez une facture, avec son numéro à elle.',
            'عرض السعر لا يُقيَّد محاسبياً، ولا يسجّل بيعاً، ولا يفتح حقّ خصم الرسم. فليحمل سلسلته الخاصة — DEV-2026-001 مثلاً — ولا يحمل أبداً رقماً من سلسلة فواتيرك. وكي يقبل الزبون تُصدر فاتورة برقمها الخاص.']]},
      {h: ['Le transformer en facture', 'تحويله إلى فاتورة'],
       p: [['Dans l\u2019application, un devis accepté se convertit en facture sans retaper les lignes : le client, les articles, les quantités et les taux sont repris tels quels, et la facture reçoit un numéro de la série des factures. C\u2019est le moment où la recopie manuelle fait le plus d\u2019erreurs, et celui qu\u2019on supprime.',
            'في التطبيق، عرض السعر المقبول يتحوّل إلى فاتورة بلا إعادة كتابة السطور: الزبون والأصناف والكمّيات والنسب تُؤخذ كما هي، وتأخذ الفاتورة رقماً من سلسلة الفواتير. وهذه هي اللحظة التي يكثر فيها خطأ النسخ اليدوي، وهي التي نُلغيها.']]},
    ],
    extra: dl('devis', 'Télécharger le modèle de devis', 'حمّل نموذج عرض السعر'),
  },
  {
    file: 'telecharger.html',
    title: 'Télécharger FacturePro — logiciel de facturation | تحميل برنامج الفوترة',
    desc: "Installez FacturePro sur votre ordinateur ou votre téléphone : icône sur le bureau, fenêtre à part, fonctionne sans connexion. Gratuit, sans inscription et sans fichier à télécharger. ثبّت برنامج الفوترة في حاسوبك أو هاتفك: أيقونة على سطح المكتب، ويعمل بلا أنترنت. مجاني وبلا تسجيل.",
    og: 'Télécharger et installer FacturePro',
    h1fr: 'Installer FacturePro sur votre ordinateur',
    h1ar: 'ثبّت FacturePro في حاسوبك',
    leadfr: "Une icône sur le bureau, une fenêtre à part sans barre de navigateur, et vos factures même sans connexion. L'installation prend deux clics et ne télécharge aucun fichier.",
    leadar: 'أيقونة على سطح المكتب، ونافذة خاصة بلا شريط متصفّح، وفواتيرك حتى بلا أنترنت. التثبيت نقرتان، وما ينزّل حتى ملف.',
    body: [
      {h: ['Ce que vous obtenez', 'ما تتحصّل عليه'],
       ul: [
         ['Une icône sur le bureau et dans le menu Démarrer, comme un logiciel installé', 'أيقونة على سطح المكتب وفي قائمة ابدأ، كأي برنامج مثبَّت'],
         ['Une fenêtre à elle, sans barre d\u2019adresse ni onglets', 'نافذة خاصة بها، بلا شريط عنوان ولا تبويبات'],
         ['Le fonctionnement hors connexion : vos factures s\u2019ouvrent sans internet', 'العمل بلا اتّصال: فواتيرك تُفتح بلا أنترنت'],
         ['Les mises à jour toutes seules, sans rien réinstaller', 'التحديثات وحدها، بلا إعادة تثبيت'],
         ['Une désinstallation normale, depuis les paramètres de Windows', 'إزالة عادية من إعدادات Windows'],
       ]},
      {h: ['Pourquoi il n\u2019y a pas de fichier .exe', 'لماذا لا يوجد ملف .exe'],
       p: [['Un .exe non signé fait afficher « Windows a protégé votre PC » au premier lancement, et cet écran fait plus peur qu\u2019il ne rassure. L\u2019installation depuis le navigateur donne le même résultat — icône, fenêtre propre, hors connexion — sans avertissement, sans droits d\u2019administrateur et sans place sur le disque.',
            'ملفّ .exe غير موقّع يُظهر «Windows حمى جهازك» عند أوّل تشغيل، وهذه الشاشة تُخوّف أكثر ممّا تطمئن. والتثبيت من المتصفّح يعطي النتيجة نفسها — أيقونة ونافذة نظيفة وعمل بلا اتّصال — بلا تحذير وبلا صلاحيات مسؤول وبلا مساحة على القرص.'],
           ['Et une mise à jour arrive toute seule : personne n\u2019a à retélécharger quoi que ce soit quand une règle fiscale change.',
            'والتحديث يصل وحده: لا أحد يعيد التنزيل كي تتغيّر قاعدة جبائية.']]},
      {h: ['Les étapes, selon votre appareil', 'الخطوات، حسب جهازك'],
       ul: [
         ['Windows ou Mac, avec Chrome ou Edge : cliquez le bouton ci-dessus, ou l\u2019icône d\u2019installation à droite de la barre d\u2019adresse', 'ويندوز أو ماك، بـChrome أو Edge: اضغط الزرّ فوق، أو أيقونة التثبيت على يمين شريط العنوان'],
         ['Android, avec Chrome : menu ⋮ puis « Installer l\u2019application »', 'أندرويد بـChrome: قائمة ⋮ ثمّ «تثبيت التطبيق»'],
         ['iPhone ou iPad, avec Safari : Partager puis « Sur l\u2019écran d\u2019accueil »', 'آيفون أو آيباد بـSafari: مشاركة ثمّ «إضافة إلى الشاشة الرئيسية»'],
         ['Firefox ne sait pas installer une page : utilisez Chrome ou Edge pour cette étape', 'فايرفوكس لا يعرف تثبيت صفحة: استعمل Chrome أو Edge لهذه الخطوة'],
       ]},
      {h: ['Vos données restent chez vous', 'بياناتك تبقى عندك'],
       p: [['Installée ou non, l\u2019application garde vos factures dans le navigateur de cet appareil. Rien ne part sur un serveur — nous n\u2019en avons pas. Pensez à exporter une sauvegarde de temps en temps, ou activez la copie dans votre propre Google Drive.',
            'مثبَّتاً أو لا، يحفظ التطبيق فواتيرك في متصفّح هذا الجهاز. ولا شيء يذهب إلى خادم — فنحن لا نملك خوادم. تذكّر أن تصدّر نسخة احتياطية من حين لآخر، أو فعّل النسخة في Drive الخاص بك.']]},
    ],
    top: '<p class="mb-6"><button type="button" class="dlbtn fp-install">Installer maintenant</button>'
       + '<span class="block mt-2 text-xs opacity-70" data-fr="Gratuit, sans compte et sans fichier à télécharger."'
       + ' data-ar="مجاني، بلا حساب وبلا ملف يُنزَّل.">Gratuit, sans compte et sans fichier à télécharger.</span></p>',
    script: `<script>
(function(){
  /* Chrome et Edge annoncent qu'ils savent installer la page ; on garde
     l'evenement et on le rejoue au clic. Safari et Firefox n'annoncent rien,
     alors on ne fait pas semblant : le bouton devient un lien vers les gestes
     a faire a la main, qui sont les seuls qui marchent la-bas. */
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault(); deferred = e; paint();
  });
  function installed(){
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches)
        || navigator.standalone === true;
  }
  function paint(){
    var btn = document.querySelectorAll('.fp-install');
    for (var i = 0; i < btn.length; i++){
      var b = btn[i], ar = document.body.classList.contains('ar');
      if (installed()) {
        b.textContent = ar ? 'التطبيق مثبَّت ✓' : 'Application installée ✓';
        b.disabled = true;
      } else if (deferred) {
        b.textContent = ar ? 'ثبّت الآن' : 'Installer maintenant';
        b.disabled = false;
      } else {
        b.textContent = ar ? 'اتبع الخطوات تحت' : 'Suivez les étapes ci-dessous';
        b.disabled = false;
      }
    }
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.fp-install');
    if (!b) return;
    if (deferred) { deferred.prompt(); deferred.userChoice.then(function(){ deferred = null; paint(); }); }
    else {
      /* Pas de prompt : ce navigateur ne sait pas installer une page. On
         emmene le visiteur aux gestes manuels plutot que de ne rien faire. */
      var half = document.getElementById(document.body.classList.contains('ar') ? 'ar' : 'fr');
      var lists = half ? half.querySelectorAll('ul') : [];
      var steps = lists.length >= 3 ? lists[2] : lists[lists.length - 1];
      if (steps) steps.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  });
  window.addEventListener('appinstalled', function(){ deferred = null; paint(); });
  paint();
  document.getElementById('lang').addEventListener('click', function(){ setTimeout(paint, 30); });
})();
</script>`,
  },
  {
    file: 'plan-comptable-scf.html',
    title: 'Plan comptable SCF Algérie + classeur Excel gratuit | دليل الحسابات',
    desc: "Le plan comptable algérien (Système Comptable Financier) expliqué : les sept classes, les comptes qu'un commerçant utilise vraiment, et un classeur Excel gratuit — journal, grand livre, balance, compte de résultat et bilan, calculés par formules. دليل الحسابات الجزائري SCF مشروحاً، مع ملفّ Excel مجاني: اليومية ودفتر الأستاذ وميزان المراجعة وحساب النتائج والميزانية.",
    og: 'Plan comptable SCF — les comptes, et un classeur Excel gratuit',
    h1fr: 'Le plan comptable algérien (SCF)',
    h1ar: 'دليل الحسابات الجزائري (SCF)',
    leadfr: "Le Système Comptable Financier remplace l'ancien PCN depuis 2010. Sept classes, des comptes numérotés, et une règle : chaque opération s'écrit deux fois, au débit d'un compte et au crédit d'un autre, pour le même montant.",
    leadar: 'النظام المحاسبي المالي حلّ محلّ المخطّط الوطني القديم منذ 2010. سبعة أصناف، وحسابات مرقّمة، وقاعدة واحدة: كلّ عملية تُكتب مرّتين، في مدين حساب وفي دائن حساب آخر، وبنفس المبلغ.',
    body: [
      {h: ['Les sept classes', 'الأصناف السبعة'],
       ul: [
         ['Classe 1 — les capitaux : ce que l\u2019entreprise doit à ses propriétaires et à ses prêteurs', 'الصنف 1 — الأموال: ما تدين به المؤسسة لمُلّاكها ومُقرضيها'],
         ['Classe 2 — les immobilisations : ce qui sert plusieurs années (local, véhicule, matériel)', 'الصنف 2 — التثبيتات: ما يخدم سنوات (محلّ، سيارة، عتاد)'],
         ['Classe 3 — les stocks : la marchandise qui n\u2019est pas encore vendue', 'الصنف 3 — المخزونات: البضاعة التي لم تُبَع بعد'],
         ['Classe 4 — les tiers : les clients qui doivent, les fournisseurs à payer, l\u2019État, le personnel', 'الصنف 4 — الغير: الزبائن المدينون، والموردون، والدولة، والمستخدمون'],
         ['Classe 5 — la trésorerie : la banque et la caisse', 'الصنف 5 — الخزينة: البنك والصندوق'],
         ['Classe 6 — les charges : ce qui sort et ne revient pas', 'الصنف 6 — الأعباء: ما يخرج ولا يعود'],
         ['Classe 7 — les produits : ce qui entre — d\u2019abord les ventes', 'الصنف 7 — المنتجات: ما يدخل — وأوّله المبيعات'],
       ]},
      {h: ['Les comptes qu\u2019un commerçant utilise vraiment', 'الحسابات التي يستعملها التاجر فعلاً'],
       p: [['La nomenclature complète tient dans un arrêté. En pratique, une petite affaire tourne avec une dizaine de comptes : 411 clients, 401 fournisseurs, 512 banque, 530 caisse, 4456 TVA déductible, 4457 TVA collectée, 600 achats de marchandises, 631 rémunérations du personnel, 700 ventes de marchandises, 706 prestations de services.',
            'التسمية الكاملة تسع مرسوماً كاملاً. أمّا عملياً فالمحلّ الصغير يدور بعشرة حسابات: 411 الزبائن، 401 الموردون، 512 البنك، 530 الصندوق، 4456 الرسم القابل للخصم، 4457 الرسم المحصّل، 600 مشتريات البضائع، 631 أجور المستخدمين، 700 مبيعات البضائع، 706 تقديم الخدمات.']]},
      {h: ['Comment se lit une écriture', 'كيف يُقرأ القيد'],
       p: [['Une vente de 100 000 DA hors taxe à 19 % s\u2019écrit sur trois lignes : le client doit 119 000 (débit 411), la vente vaut 100 000 (crédit 700), et la TVA de 19 000 appartient à l\u2019État (crédit 4457). Les débits font 119 000, les crédits aussi : l\u2019écriture est équilibrée.',
            'بيع بـ100 000 دج خارج الرسم بنسبة 19٪ يُكتب في ثلاثة سطور: الزبون مدين بـ119 000 (مدين 411)، والبيع 100 000 (دائن 700)، والرسم 19 000 للدولة (دائن 4457). المدين 119 000 والدائن مثله: القيد متوازن.'],
           ['Quand le client paie par virement, une deuxième écriture solde sa dette : débit 512 banque, crédit 411 client. Le compte 411 revient à zéro, et c\u2019est ainsi qu\u2019on sait qui doit encore.',
            'وكي يدفع الزبون بتحويل، قيد ثانٍ يصفّي دينه: مدين 512 البنك، دائن 411 الزبون. فيعود الحساب 411 إلى الصفر، وبهذا يُعرف من بقي مديناً.']]},
      {h: ['Le classeur Excel : ce qu\u2019il fait', 'ملفّ Excel: ماذا يفعل'],
       ul: [
         ['Vous ne remplissez qu\u2019une feuille : le journal', 'لا تملأ إلا ورقة واحدة: اليومية'],
         ['Le grand livre, la balance, le compte de résultat et le bilan se calculent seuls', 'دفتر الأستاذ والميزان وحساب النتائج والميزانية تُحسب وحدها'],
         ['Le compte se choisit dans une liste : son libellé s\u2019écrit tout seul', 'الحساب يُختار من قائمة: وتسميته تُكتب وحدها'],
         ['Trois contrôles d\u2019équilibre : le journal, la balance et le bilan se vérifient eux-mêmes', 'ثلاثة فحوص للتوازن: اليومية والميزان والميزانية تتحقّق من نفسها'],
         ['Une analyse par centre de coût : magasin, chantier, administration', 'تحليل حسب مركز التكلفة: محلّ، ورشة، إدارة'],
         ['Aucune macro : il s\u2019ouvre dans Excel, LibreOffice, WPS et Google Sheets', 'بلا ماكرو: يفتح في Excel وLibreOffice وWPS وGoogle Sheets'],
       ]},
      {h: ['À vérifier avec votre comptable', 'ما يُراجَع مع محاسبك'],
       p: [['Le plan livré dans le classeur est le sous-ensemble courant, pas la nomenclature entière : complétez-le selon votre activité. Et les taux — TVA, TAP, IBS — sont fixés par la loi de finances et changent : le fichier n\u2019en écrit aucun d\u2019avance, pour ne pas figer un chiffre périmé dans vos comptes.',
            'الدليل المرفق بالملف هو الجزء الشائع، لا التسمية كاملة: أكمله حسب نشاطك. أمّا النسب — الرسم على القيمة المضافة، والرسم على النشاط المهني، والضريبة على الأرباح — فيحدّدها قانون المالية وتتغيّر: والملف لا يكتب أياً منها مسبقاً، حتى لا يجمّد رقماً قديماً في حساباتك.']]},
    ],
    extra: dlfile('comptabilite-scf-algerie.xlsx',
      'Télécharger le classeur comptable (.xlsx)', 'حمّل الملفّ المحاسبي (.xlsx)',
      'Huit feuilles, plus de trois mille formules, aucune macro. Gratuit et sans inscription.',
      'ثماني أوراق، وأكثر من ثلاثة آلاف صيغة، وبلا ماكرو. مجاني وبلا تسجيل.'),
  },
  {
    file: 'modele-facture-excel.html', kind: 'facture',
    title: 'Modèle de facture Excel Algérie — gratuit, avec formules | نموذج فاتورة',
    desc: "Téléchargez un modèle de facture algérienne au format Excel (.xlsx), avec NIF, NIS, RC, AI, TVA 19 % et 9 %, droit de timbre et totaux calculés par formules. Gratuit, sans inscription. حمّل نموذج فاتورة جزائرية بصيغة Excel، فيه NIF وNIS وRC وAI والرسم 19٪ و9٪ وحقّ الطابع ومجاميع بصيغ حيّة. مجاني وبلا تسجيل.",
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
    desc: "Qu’est-ce qu’une facture proforma, à quoi elle sert (banque, douane, devis ferme), ce qui la distingue d’une facture, et un modèle Excel gratuit à télécharger. ما هي الفاتورة الأولية، وفيمَ تُستعمل (البنك، الجمارك، عرض سعر ثابت)، وما يميّزها عن الفاتورة. مع نموذج Excel مجاني.",
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
    desc: "Modèle de bon de commande au format Excel, avec les identifiants, les lignes, les totaux calculés et le délai de livraison. Gratuit, sans inscription. نموذج وصل الطلبية بصيغة Excel، بالمعرّفات والسطور والمجاميع المحسوبة وأجل التسليم. مجاني وبلا تسجيل.",
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
    title: 'Mentions obligatoires d’une facture en Algérie | البيانات الإجبارية',
    desc: "La liste des mentions qu’une facture doit porter en Algérie : identité et identifiants du vendeur et du client (NIF, NIS, RC, AI), désignation, prix, TVA, montant en lettres et droit de timbre. قائمة البيانات التي يجب أن تحملها الفاتورة في الجزائر: هويّة ومعرّفات البائع والزبون (NIF وNIS وRC وAI)، والبيان والسعر والرسم والمبلغ بالحروف وحقّ الطابع.",
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
    desc: "Le G50 est la déclaration mensuelle. Voici quels chiffres il demande, d’où ils sortent dans vos factures, et comment obtenir le récapitulatif TVA du mois en un clic. تصريح G50 هو التصريح الشهري. إليك ما يطلبه من أرقام، ومن أين تخرج من فواتيرك، وكيف تحصل على ملخّص الرسم للشهر بنقرة.",
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
<link rel="icon" href="/icon-48.png" sizes="48x48" type="image/png" />
<link rel="icon" href="/icon-96.png" sizes="96x96" type="image/png" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"/>

<link rel="stylesheet" href="vendor/tailwind.css?v=20260817h" />
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
    ${page.top || ''}
    <div class="card p-5 sm:p-6">${fr}${page.extra || ''}</div>
    <p class="text-center text-sm mt-8 opacity-70">${sibs('fr')}</p>
    <p class="text-center text-sm mt-3"><a href="/" class="underline">Ouvrir l’application de facturation</a></p>
  </div>
  <div id="ar" dir="rtl" hidden>
    <h1 class="text-2xl sm:text-3xl font-bold mb-2">${page.h1ar}</h1>
    <p class="opacity-80 mb-5">${page.leadar}</p>
    ${page.top || ''}
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
<!-- Apres le script de langue, jamais avant : une page qui se peint selon
     body.ar doit trouver la classe deja posee. -->
${page.script || ''}
<!-- Vercel Web Analytics — counts page views only. Never touches invoice
     or client data, which stay in the visitor's own browser. -->
<script>
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
</script>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`;
};

let n = 0;
for (const page of PAGES) { writeFileSync(join(OUT, page.file), shell(page)); n++; }
console.log(`pages: ${n} written`);
export { PAGES };
