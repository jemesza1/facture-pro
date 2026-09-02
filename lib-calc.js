/* FacturePro — shared calculations.
 *
 * Loaded first by app.js and directly by the public tool pages, so the
 * calculator someone finds through a search runs the same code as the one
 * inside the application. It must stay free of any dependency on `state`,
 * the DOM or the translations — everything it needs arrives as an argument.
 */

/* ---- Amount in words (French) ---- */
function numberToWords(n){if(n===0)return'zéro';const units=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];const tens=['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];function under1000(num){if(num<20)return units[num];if(num<100){const t=Math.floor(num/10),u=num%10;if(t===7||t===9)return tens[t]+(u===1&&t===7?' et ':'-')+under1000(10+u);return tens[t]+(u===1&&t!==8?' et ':(u?'-':''))+(t===8&&u===0?'s':units[u]);}const h=Math.floor(num/100),r=num%100;return(h>1?units[h]+' ':'')+'cent'+(h>1&&r===0?'s':'')+(r?' '+under1000(r):'');}if(n<1000)return under1000(n);if(n<1000000){const th=Math.floor(n/1000),r=n%1000;/* Vingt et cent ne prennent leur s que s'ils terminent le nombre, et mille ne compte pas pour une fin : « quatre-vingt mille », « deux cent mille ». Devant million et milliard, qui sont des noms, l'accord revient — « quatre-vingts millions ». La page enseignait la regle et la violait dans son propre tableau. Seuls ces deux mots prennent un s, d'ou la coupe ciblee : un .replace(/s$/) generique ferait « troi mille ». */return(th>1?under1000(th).replace(/(vingt|cent)s$/,'$1')+' ':'')+'mille'+(r?' '+under1000(r):'');}if(n<1e9){const m=Math.floor(n/1e6),r=n%1e6;return under1000(m)+' million'+(m>1?'s':'')+(r?' '+numberToWords(r):'');}if(n<1e12){const b=Math.floor(n/1e9),r=n%1e9;
    /* Au-dela du milliard, la fonction rendait les chiffres tels quels : la
       mention obligatoire imprimait « 1428000000 dinars » au lieu de la
       somme en toutes lettres, sur la facture comme sur la page dont c'est
       le seul objet. Un marche public depasse le milliard de dinars. */
    return numberToWords(b)+' milliard'+(b>1?'s':'')+(r?' '+numberToWords(r):'');}
  return String(n);}
/* Negative amounts arrive from a credit note. numberToWords walks the digits
   and returns undefined below zero, which used to throw here and take the
   whole preview down with it. The wording is spelt out rather than made
   positive because the law asks the letters to match the figures, and the
   figures on an avoir are negative. */
/* Les centimes etaient arrondis et disparaissaient : 506,30 s'arretait a
   « cinq cent six dinars ». C'est precisement ce que la mention doit empecher
   — les lettres et les chiffres d'une facture doivent nommer la meme somme, et
   ici la facture disait 506,30 pendant que les lettres disaient 506. Les
   centimes s'ecrivent apres le dinar, et un montant rond n'en porte pas. */
function amountInWords(amount){
  const cents=Math.round(Math.abs(Number(amount)||0)*100);
  if(cents===0)return'Zéro dinar';
  const d=Math.floor(cents/100), c=cents%100;
  /* Million et milliard sont des noms : ils appellent « de » — un million de
     dinars, deux milliards de dinars — la ou mille n'appelle rien. Le « de »
     ne vient que si le nombre s'y arrete : « un million cinq cent mille
     dinars » n'en veut pas. */
  const w=numberToWords(d);
  let s=d===0 ? 'zéro dinar'
      : w+(/(million|milliard)s?$/.test(w) ? ' de dinars' : (d>1?' dinars':' dinar'));
  if(c) s+=' et '+numberToWords(c)+(c>1?' centimes':' centime');
  s=s.charAt(0).toUpperCase()+s.slice(1);
  return (Number(amount)||0)<0 ? 'Moins '+s.charAt(0).toLowerCase()+s.slice(1) : s;
}

/* ---- TVA ----
   Algeria applies 19 % as the standard rate and 9 % as the reduced one; 0 %
   covers exempt lines. Nothing is rounded here: calcInvoiceTotals sums many
   lines and must round once at the end, not once per line. The display layer
   rounds. */
/* Written as ht * (rate/100), not ht * rate / 100. The two differ in the
   thirteenth decimal — 13333.33 at 9 % gives 1199.9996999999998 one way and
   1199.9997 the other — and calcInvoiceTotals has always used the first. This
   helper exists to unify the expression, not to quietly re-derive totals on
   invoices that are already issued. */
function vatAmount(ht, rate){ return (Number(ht) || 0) * ((Number(rate) || 0) / 100); }
function ttcFromHt(ht, rate){ return (Number(ht) || 0) + vatAmount(ht, rate); }
/* The one people actually need: a shelf price is TTC, the declaration wants HT. */
function htFromTtc(ttc, rate){ return (Number(ttc) || 0) / (1 + (Number(rate) || 0) / 100); }

/* ---- Droit de timbre — art. 100 du Code du timbre, barème LF 2025 ----
   Due on cash settlements only. Applied to the TTC amount:
       up to  30 000 DA  ->  1   %
       30 000 to 100 000 ->  1,5 %
       above 100 000     ->  2   %
   Minimum 5 DA, and no ceiling. The 10 000 DA cap that older guides still
   mention was abolished; do not reintroduce it, whatever a search result says. */
function timbreRate(a){return a<=30000?1:(a<=100000?1.5:2);}
function timbreFor(amount){
  var a=Math.round(Number(amount)||0);
  if(a<=0)return 0;
  var d=a*timbreRate(a)/100;
  if(d<5)d=5;
  return Math.round(d*100)/100;
}

/* ---- IRG sur les traitements et salaires — art. 104 du CIDTA ----
   Source: Direction Générale des Impôts, "IRG — Traitements et salaires",
   barème issu de l'art. 31 de la LF 2022. Consulté le 17/08/2026.

   Everything here takes the MONTHLY TAXABLE salary, not the gross one. The
   DGI lists what comes off first — retenues pour pensions ou retraites, and
   the cotisation ouvrière aux assurances sociales (9 % CNAS) — and the barème
   applies to what is left. Feeding this function a gross salary overstates the
   tax by thousands of dinars, so the caller does the subtraction.

   The brackets are stated annually; the retenue is "calculée par
   mensualisation", so a month is the annual tax on twelve months, divided by
   twelve. That is not the same as taxing one month against annual brackets.

   The 40 % abattement comes off the TAX, not off the salary, and is bounded
   at 1 000 and 1 500 DA a month.

   Two bands then get a second abattement, each with its own formula. The
   formulas look arbitrary and are not: each one is the straight line that
   sends the bottom of its band to zero and leaves the top of its band
   untouched. That is what makes them worth trusting, and it is what the tests
   assert — every constant below is wrong if those four endpoints do not land.
*/
var IRG_BRACKETS=[[240000,0],[480000,0.23],[960000,0.27],[1920000,0.30],[3840000,0.33],[Infinity,0.35]];

/* Tax on a full year of taxable income, before any abattement. */
function irgBareme(annual){
  var a=Number(annual)||0, tax=0, low=0, i;
  for(i=0;i<IRG_BRACKETS.length;i++){
    if(a<=low)break;
    tax+=(Math.min(a,IRG_BRACKETS[i][0])-low)*IRG_BRACKETS[i][1];
    low=IRG_BRACKETS[i][0];
  }
  return tax;
}

/* One month, after the 40 % abattement and nothing else. */
function irgFirstAbattement(monthly){
  var brut=irgBareme((Number(monthly)||0)*12)/12;
  if(brut<=0)return 0;
  return Math.max(0, brut-Math.min(1500, Math.max(1000, brut*0.40)));
}

/* The monthly retenue à la source.
   `reduced` selects the track for travailleurs handicapés et retraités, whose
   relief band runs to 42 500 instead of 35 000. */
function irgFor(monthly, reduced){
  var m=Number(monthly)||0;
  if(m<=30000)return 0;                                  /* exonération totale */
  var first=irgFirstAbattement(m);
  if(reduced)return m<=42500 ? Math.max(0, first*(93/61)-(81213/41)) : first;
  return m<=35000 ? Math.max(0, first*(137/51)-(27925/8)) : first;
}

/* Primes, rappels, gratifications: treated as a separate month and withheld
   flat, so they never push the salary into a higher bracket. */
function irgOnBonus(amount){ return (Number(amount)||0)*0.10; }

/* ---- WhatsApp ----
 *
 * A relance costs a stamp, an envelope and a week by post, and a merchant who
 * has to look up the number, open WhatsApp and type the figures does it once.
 * wa.me turns it into a tap: the chat opens on the right contact with the
 * message already written, and the merchant presses send. No API, no server,
 * no per-message fee — and nothing is sent without a human doing it.
 *
 * An Algerian number as a merchant writes it — 0555 12 34 56, 05.55.12.34.56,
 * +213 555…, 00213 555… — reduced to the one form wa.me accepts: country code,
 * digits, nothing else. Anything too short to be a number comes back empty, so
 * the caller hides the button rather than opening a chat with nobody. */
function waNumber(phone){
  var n = String(phone == null ? '' : phone).replace(/[^\d+]/g, '');
  if (n.charAt(0) === '+') n = n.slice(1);
  else if (n.slice(0, 2) === '00') n = n.slice(2);
  else if (n.charAt(0) === '0') n = '213' + n.slice(1);
  else if (n.length && n.slice(0, 3) !== '213') n = '213' + n;
  /* 213 followed by nine digits is the shortest real one. */
  return /^\d{11,15}$/.test(n) ? n : '';
}

function waLink(phone, text){
  var n = waNumber(phone);
  return n ? 'https://wa.me/' + n + '?text=' + encodeURIComponent(text) : '';
}

/* Lire un nombre tel qu'un commercant algerien l'ecrit.
 *
 * Il tape « 1,5 » pour un metre et demi, et « 1 000 » avec une espace. Les
 * champs etaient en type="number" : Chromium n'y rejette pas la virgule, il
 * la SUPPRIME. « 1,5 » devenait « 15 » dans le champ lui-meme, avant que le
 * moindre code ne le lise — un metre et demi de tissu factures quinze, sur
 * le document remis au client et a l'administration. Aucune validation
 * cote JavaScript ne pouvait le voir : la virgule n'arrivait jamais.
 *
 * Les champs sont donc passes en type="text" inputmode="decimal" — le pave
 * numerique reste sur le telephone, ce qui etait tout l'interet de
 * type="number" — et la virgule est lue ici.
 *
 * « 1.234,56 » : quand les deux signes sont presents, le point separe les
 * milliers et la virgule les decimales, comme l'ecrit un francophone. */
/* Arrondir au centime, en corrigeant la derive du flottant : 0.1+0.2 vaut
   0.30000000000000004, et une facture de cent lignes accumule ces miettes
   jusqu'a decaler un dinar. On arrondit chaque ligne AVANT de sommer, pour
   que le total soit la somme de ce qui est imprime et non l'inverse. */
window.round2 = function (n) {
  var v = Number(n) || 0;
  if (!isFinite(v)) return 0;
  /* On recale sur la decimale avant d'arrondir, et ce n'est pas un detail de
     style. Le binaire rend 1.005*100 = 100.49999999999999, qui s'arrondit a
     100 au lieu de 101 ; et surtout l'ORDRE des operations change le
     resultat — ht*(taux/100) et (ht*taux)/100 ne donnent pas le meme binaire,
     donc pas toujours le meme centime. Une facture dont le total depend de la
     facon dont on a ecrit la multiplication n'est pas une facture.
     On arrondit aussi la valeur absolue : Math.round(-100.5) rend -100 et
     Math.round(100.5) rend 101, si bien qu'un avoir et sa facture n'auraient
     pas rendu le meme centime. */
  var neg = v < 0;
  var scaled = Number((Math.abs(v) * 100).toPrecision(12));
  var out = Math.round(scaled) / 100;
  return neg ? -out : out;
};

window.parseNum = function (v) {
  if (typeof v === 'number') return v;
  var s = String(v == null ? '' : v).trim();
  if (!s) return NaN;
  s = s.replace(/[\s\u00a0\u202f]/g, '');
  var dot = s.lastIndexOf('.'), comma = s.lastIndexOf(',');
  if (dot >= 0 && comma >= 0) {
    if (comma > dot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (comma >= 0) {
    s = s.replace(',', '.');
  }
  return parseFloat(s);
};

/* Lire un nombre saisi, avec un defaut — sans confondre « zero » et « vide ».
   Trois editeurs ecrivaient parseFloat(v)||19 pour le taux de TVA : un
   commercant qui tapait 0 sur une ligne exoneree se retrouvait avec 19 %,
   sur le devis, sur la facture recurrente, puis sur la facture emise et son
   papier. Le ou-logique ne distingue pas 0 de NaN ; isFinite, si. */
window.numOr = function (v, fallback) {
  var n = parseNum(v);
  return isFinite(n) ? n : fallback;
};

/* ---- Le montant en lettres, en arabe ----
 *
 * « montant en lettre arabe » est la requete qui amene le plus de monde sur
 * l'outil, et jusqu'ici la page repondait en francais en s'en excusant. Ce
 * qui suit ecrit reellement le nombre en arabe, dans la forme des cheques et
 * des factures.
 *
 * Trois regles font tout le travail, et ce sont elles qui expliquent la
 * longueur du code :
 *
 *   L'ordre. L'arabe dit l'unite avant la dizaine — « خمسة وعشرون », cinq et
 *   vingt — mais la centaine avant l'unite. On ne peut donc pas se contenter
 *   d'inverser la lecture francaise.
 *
 *   Le tamyiz. Le mot compte s'accorde avec le dernier element du nombre, pas
 *   avec le nombre entier : trois mille donne « آلاف » au pluriel, cinquante
 *   mille donne « ألفاً » au singulier accusatif, cent mille « ألف » nu.
 *
 *   L'annexion. Des qu'un nom suit — ici « دينار » — le duel et le tanwin
 *   tombent : « ألفان » seul, mais « ألفا دينار » ; « خمسون ألفاً » seul, mais
 *   « خمسون ألف دينار ». D'ou le drapeau `construct` : la meme somme ne
 *   s'ecrit pas pareil selon qu'elle est suivie de la monnaie ou non.
 */
(function () {
  var ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  var TEENS = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
               'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  var TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  var HUND = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
              'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  /* ألف / مليون / مليار : quatre formes chacun, choisies par le dernier
     element du groupe, plus une cinquieme quand un nom suit. */
  var SCALES = [
    null,
    { one: 'ألف',   two: 'ألفان',   dual: 'ألفا',   few: 'آلاف',    many: 'ألفاً',   bare: 'ألف' },
    { one: 'مليون', two: 'مليونان', dual: 'مليونا', few: 'ملايين',  many: 'مليوناً', bare: 'مليون' },
    { one: 'مليار', two: 'ملياران', dual: 'مليارا', few: 'مليارات', many: 'ملياراً', bare: 'مليار' }
  ];

  function under100(n) {
    if (n < 10) return ONES[n];
    if (n < 20) return TEENS[n - 10];
    var u = n % 10, t = Math.floor(n / 10);
    return u ? ONES[u] + ' و' + TENS[t] : TENS[t];
  }

  /* `construct` ne concerne que deux cents : « مائتان » isole, « مائتا ألف »
     annexe. */
  function under1000(n, construct) {
    var h = Math.floor(n / 100), r = n % 100;
    var head = h ? (construct && h === 2 ? 'مائتا' : HUND[h]) : '';
    if (!r) return head;
    return head ? head + ' و' + under100(r) : under100(r);
  }

  /* Un groupe de trois chiffres suivi de son ordre de grandeur. `construct`
     vaut vrai quand la monnaie viendra juste apres. */
  function group(g, level, construct) {
    /* Deux cents dinars sont « مائتا دينار » et non « مائتان دينار » : la
       centaine aussi tombe en annexion, mais seulement quand elle finit le
       nombre — « مائتان وخمسة دنانير » garde son noun. */
    if (!level) return under1000(g, construct && g % 100 === 0);
    var s = SCALES[level], rem = g % 100;
    if (g === 1) return s.one;
    if (g === 2) return construct ? s.dual : s.two;
    if (g <= 10) return under1000(g) + ' ' + s.few;
    if (rem === 0) return under1000(g, true) + ' ' + s.bare;
    if (rem >= 3 && rem <= 10) return under1000(g) + ' ' + s.few;
    return under1000(g) + ' ' + (construct ? s.bare : s.many);
  }

  /* construct : le nombre sera suivi d'un nom. Seul le dernier groupe change. */
  function words(n, construct) {
    n = Math.floor(Math.abs(Number(n) || 0));
    if (n === 0) return 'صفر';
    if (n >= 1e12) return String(n);
    var parts = [], levels = [], g = [];
    for (var i = 0; n > 0 && i < 4; i++) { g.push(n % 1000); n = Math.floor(n / 1000); }
    var last = 0;
    for (var j = 0; j < g.length; j++) if (g[j]) { last = j; break; }
    for (var k = g.length - 1; k >= 0; k--) {
      if (!g[k]) continue;
      parts.push(group(g[k], k, construct && k === last));
      levels.push(k);
    }
    return parts.join(' و');
  }

  /* Le dinar s'accorde lui aussi, et sur le meme dernier element : deux
     dinars sont un duel, trois a dix un pluriel brise, onze a
     quatre-vingt-dix-neuf un singulier accusatif, et apres « ألف » un
     singulier nu. */
  function currency(n) {
    if (n % 1000 === 0 && n >= 1000) return 'دينار جزائري';
    if (n === 1) return 'دينار جزائري واحد';
    if (n === 2) return 'ديناران جزائريان';
    var rem = n % 100;
    if (rem >= 3 && rem <= 10) return 'دنانير جزائرية';
    if (rem === 0) return 'دينار جزائري';
    return 'ديناراً جزائرياً';
  }

  /* Le centime a son propre accord, sur le meme principe que le dinar. */
  function centimes(c) {
    if (c === 1) return 'سنتيم واحد';
    if (c === 2) return 'سنتيمان اثنان';
    if (c <= 10) return words(c, false) + ' سنتيمات';
    return words(c, false) + ' سنتيماً';
  }

  window.numberToWordsAr = function (n) { return words(n, false); };
  /* Les deux lignes de la meme page doivent nommer la meme somme, centimes
     compris : elles s'arretent donc au meme endroit que amountInWords. */
  window.amountInWordsAr = function (amount) {
    var cents = Math.round(Math.abs(Number(amount) || 0) * 100);
    if (cents === 0) return 'صفر دينار جزائري';
    var a = Math.floor(cents / 100), c = cents % 100, v = (Number(amount) || 0) < 0 ? -1 : 1, s;
    if (a === 0) { s = 'صفر دينار جزائري و' + centimes(c); return v < 0 ? 'ناقص ' + s : s; }
    if (a === 1 || a === 2) s = currency(a);
    /* Cent un dinars ne se dit pas « مائة وواحد ديناراً » : l'unite isolee
       s'efface devant la monnaie, qui se met au singulier et prend le nombre
       apres elle — « مائة ودينار جزائري واحد ». Le cas ne se presente que
       quand la dizaine est nulle : vingt et un reste « واحد وعشرون ديناراً ». */
    else if (a % 100 === 1 || a % 100 === 2) s = words(a - (a % 100), false) + ' و' + currency(a % 100);
    else s = words(a, true) + ' ' + currency(a);
    if (c) s += ' و' + centimes(c);
    return v < 0 ? 'ناقص ' + s : s;
  };
})();


/* ---- La date d'aujourd'hui, telle que la voit celui qui tape ----
 *
 * Vingt et un endroits ecrivaient new Date().toISOString().slice(0,10). C'est
 * la date UTC, et l'Algerie vit une heure devant : entre minuit et une heure
 * du matin, une facture etablie aujourd'hui portait la date d'hier. Le
 * commercant qui ferme boutique et fait ses papiers dans la foulee est
 * exactement celui a qui cela arrive, et la date d'une facture n'est pas un
 * detail d'affichage — c'est elle qui la rattache a un exercice et a un G50.
 *
 * On lit donc le calendrier local, pas le meridien de Greenwich. L'argument
 * optionnel sert aux dates calculees (echeances, series de demonstration),
 * qui souffraient du meme decalage. */
window.todayISO = function (d) {
  d = d || new Date();
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};


/* ---- Chercher un nom tel qu'on le tape ----
 *
 * La recherche comparait les chaines telles quelles. « societe » ne trouvait
 * donc pas « Societe » ecrit avec son accent, et le clavier d'un telephone
 * algerien met des accents que personne ne retape en cherchant. Cote arabe,
 * le meme mot s'ecrit avec ou sans hamza et se termine par ة ou ه selon la
 * main : « احمد » ne trouvait pas « أحمد ».
 *
 * On ramene donc les deux cotes a une forme commune avant de comparer : sans
 * accents latins, sans signes diacritiques arabes, alif et ya et ta marbouta
 * unifies. Ce qui est affiche ne change pas — seule la comparaison. */
window.searchKey = function (v) {
  return String(v == null ? '' : v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')     /* accents latins */
    /* NFD decompose aussi l'arabe : أ devient ا suivi d'une hamza combinante.
       La plage doit donc aller jusqu'a U+065F, sans quoi « احمد » ne trouve
       pas « أحمد » — le nom cherche est alors plus court d'un caractere
       invisible que celui qui est stocke. */
    .replace(/[\u064b-\u065f\u0670]/g, '') /* voyelles, sukun, hamza combinante */
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') /* آ أ إ ٱ -> ا */
    .replace(/\u0629/g, '\u0647')          /* ة -> ه */
    .replace(/[\u0649\u064a]/g, '\u064a')  /* ى -> ي */
    .replace(/\u0640/g, '')                /* tatweel */
    .trim();
};
