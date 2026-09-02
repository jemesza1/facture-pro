/* FacturePro — downloadable spreadsheet templates.
 *
 * "modèle de facture Excel" is the most searched thing in this domain, and
 * what people want is a file, not an application. Most sites answer it with a
 * screenshot, a dead link, or a .xls that is really an HTML table Excel
 * complains about. We already write real workbooks — lib-xlsx.js — so the
 * honest answer is to hand over a real one.
 *
 * Two things decide whether it gets used twice.
 *
 * The totals are formulas, not numbers. A template whose totals were typed
 * goes wrong the first time somebody changes a quantity, and it goes wrong
 * silently, which is worse than not existing.
 *
 * And it has to look like a document. A grid of labels with a title on top is
 * something a merchant sends once and then rebuilds themselves: a green
 * banner, boxed fields, amounts that say DA and a sheet that prints on one
 * page cost nothing here and are the whole first impression.
 */
(function () {
  var LINES = 12;

  function build(kind) {
    /* L'acompte est une vraie facture : elle porte le droit de timbre si elle
       est reglee en especes, et les mentions du decret comme les autres. Le
       drapeau ne peut donc pas rester attache au seul mot « facture ». */
    var isInvoice  = kind === 'facture' || kind === 'acompte';
    var isProforma = kind === 'proforma';
    var isAvoir    = kind === 'avoir';
    var isDevis    = kind === 'devis';
    var isDelivery = kind === 'livraison';
    /* Le bon de livraison est le seul qui ne porte pas d'argent : il accompagne
       la marchandise, et y inscrire des prix est l'erreur qui fait circuler un
       tarif chez qui n'a pas à le connaitre. Tout le reste en decoule — pas de
       colonnes de prix, pas de bloc de totaux, deux signatures a la place. */
    var priced = !isDelivery;
    var TITLES = {
      facture:   'FACTURE',
      proforma:  'FACTURE PROFORMA',
      commande:  'BON DE COMMANDE',
      avoir:     "FACTURE D'AVOIR",
      acompte:   "FACTURE D'ACOMPTE",
      devis:     'DEVIS',
      livraison: 'BON DE LIVRAISON'
    };
    var SUBS = {
      facture:   'Mentions du décret exécutif 05-468 — complétez vos identifiants',
      proforma:  "Document d'intention — ne vaut pas facture et n'ouvre pas droit à déduction de TVA",
      commande:  'Commande adressée au fournisseur — à confirmer par une facture',
      avoir:     "Annule ou corrige une facture déjà émise — rappelez son numéro et sa date",
      acompte:   "Acompte sur commande — la TVA se découpe par taux, et le solde déduira ce montant",
      devis:     "Proposition de prix — ne vaut pas facture tant qu'elle n'est pas acceptée",
      livraison: 'Accompagne la marchandise — sans prix, à signer par le client à la réception'
    };
    var title = TITLES[kind] || TITLES.commande;
    var sub = SUBS[kind] || SUBS.commande;

    var rows = [], merges = [], heights = {};
    var R = function () { return rows.length; };          /* 1-based row just pushed */

    /* ---- the banner ---- */
    rows.push([{v: title, s: 'banner'}, '', '', '', '', '']);
    merges.push('A1:F1'); heights[1] = 40;
    rows.push([{v: sub, s: 'bannerSub'}, '', '', '', '', '']);
    merges.push('A2:F2'); heights[2] = 22;
    rows.push([{v: 'www.facturedz.com', s: 'bannerSub'}, '', '', '', '', '']);
    merges.push('A3:F3'); heights[3] = 18;
    rows.push([]);

    /* ---- number and date, on one line ---- */
    rows.push([{v: 'N°', s: 'fieldLabel'}, {v: '', s: 'fieldValue'}, '',
               {v: 'Date', s: 'fieldLabel'}, {v: '', s: 'fieldValue'}, {v: '', s: 'fieldValue'}]);
    merges.push('E' + R() + ':F' + R());
    rows.push([]);

    /* ---- the two parties, side by side ---- */
    var buyerFirst = kind === 'commande';        /* seul document écrit par l'acheteur */
    var left  = buyerFirst ? 'ACHETEUR' : 'VENDEUR';
    var right = buyerFirst ? 'FOURNISSEUR' : (isDelivery ? 'LIVRÉ À' : 'CLIENT');
    rows.push([{v: left, s: 'thead'}, '', '', {v: right, s: 'thead'}, '', '']);
    merges.push('A' + R() + ':C' + R()); merges.push('D' + R() + ':F' + R());

    var pairs = [
      ['Raison sociale', 'Raison sociale'],
      ['Adresse', 'Adresse'],
      ['NIF', 'NIF'],
      ['NIS', buyerFirst ? '' : 'NIS'],
      ['RC', buyerFirst ? '' : 'RC'],
      ['AI', '']
    ];
    pairs.forEach(function (pair) {
      rows.push([
        {v: pair[0], s: 'fieldLabel'}, {v: '', s: 'fieldValue'}, {v: '', s: 'fieldValue'},
        pair[1] ? {v: pair[1], s: 'fieldLabel'} : {v: '', s: 'fieldValue'},
        {v: '', s: 'fieldValue'}, {v: '', s: 'fieldValue'}
      ]);
      merges.push('B' + R() + ':C' + R());
      merges.push('E' + R() + ':F' + R());
    });
    rows.push([]);

    /* ---- the lines ---- */
    var HEAD = priced
      ? ['Désignation', 'Quantité', 'Prix unitaire HT', 'Total HT', 'TVA %', 'Montant TVA']
      : ['Désignation', 'Unité', 'Qté commandée', 'Qté livrée', 'Observations', ''];
    rows.push(HEAD.map(function (h) { return {v: h, s: 'thead'}; }));
    var headerRow = R(); heights[headerRow] = 28;
    if (!priced) merges.push('E' + headerRow + ':F' + headerRow);

    var first = headerRow + 1;
    for (var i = 0; i < LINES; i++) {
      var r = first + i;
      if (priced) {
        rows.push([
          {v: '', s: 'cell'}, {v: '', s: 'cell'}, {v: '', s: 'moneyDA'},
          {f: 'IF(B' + r + '="","",B' + r + '*C' + r + ')', s: 'moneyDA'},
          {v: '', s: 'cellPct'},
          {f: 'IF(D' + r + '="","",D' + r + '*E' + r + '/100)', s: 'moneyDA'}
        ]);
      } else {
        rows.push([{v: '', s: 'cell'}, {v: '', s: 'cell'}, {v: '', s: 'cell'},
                   {v: '', s: 'cell'}, {v: '', s: 'cell'}, {v: '', s: 'cell'}]);
        merges.push('E' + r + ':F' + r);
      }
      heights[r] = 19;
    }
    var last = first + LINES - 1;
    rows.push([]);

    /* ---- the totals, boxed on the right ---- */
    function total(label, formula, style) {
      rows.push([null, null, null,
                 {v: label, s: style === 'grandDA' ? 'grand' : 'fieldLabel'},
                 {f: formula, s: style}, {v: '', s: style === 'grandDA' ? 'grandDA' : 'totalDA'}]);
      merges.push('E' + R() + ':F' + R());
      return R();
    }
    if (priced) {
      var ht  = total('Total HT',  'SUM(D' + first + ':D' + last + ')', 'totalDA');
      var tva = total('Total TVA', 'SUM(F' + first + ':F' + last + ')', 'totalDA');
      var ttc = total('Total TTC', 'E' + ht + '+E' + tva, 'totalDA');

      /* Le timbre frappe un encaissement en espèces. Un avoir n'en est pas un :
         il réduit une dette, il ne se paie pas au comptoir. */
      var timbre = 0;
      if (isInvoice) {
        rows.push([null, null, null, {v: 'Droit de timbre', s: 'fieldLabel'},
                   {v: 0, s: 'totalDA'}, {v: '', s: 'totalDA'}]);
        timbre = R(); merges.push('E' + timbre + ':F' + timbre);
      }
      var netLabel = isInvoice ? 'NET À PAYER'
                   : isAvoir   ? "TOTAL DE L'AVOIR"
                   : 'TOTAL';
      var netRow = total(netLabel,
                         isInvoice ? ('E' + ttc + '+E' + timbre) : ('E' + ttc), 'grandDA');
      heights[netRow] = 24;
      rows.push([]);
    } else {
      /* Ce que le bon de livraison a en propre : la preuve que la marchandise
         est arrivée. Sans les deux signatures, le document ne prouve rien. */
      rows.push([{v: 'Le livreur (nom et signature)', s: 'fieldLabel'}, '', '',
                 {v: 'Le client (nom, date et signature)', s: 'fieldLabel'}, '', '']);
      merges.push('A' + R() + ':C' + R()); merges.push('D' + R() + ':F' + R());
      for (var k = 0; k < 3; k++) {
        rows.push([{v: '', s: 'fieldValue'}, '', '', {v: '', s: 'fieldValue'}, '', '']);
        merges.push('A' + R() + ':C' + R()); merges.push('D' + R() + ':F' + R());
        heights[R()] = 20;
      }
      rows.push([]);
    }

    /* ---- the footer the law and the buyer expect ---- */
    function note(text) {
      rows.push([{v: text, s: 'note'}, '', '', '', '', '']);
      merges.push('A' + R() + ':F' + R());
    }
    if (isInvoice) {
      note('Arrêtée la présente facture à la somme de : ………………………………………………………………');
      note('Le droit de timbre ne s’applique qu’aux règlements en espèces (art. 100 du Code du timbre). Vérifiez le barème de la loi de finances en vigueur avant d’inscrire un montant.');
    } else if (isProforma) {
      note('Validité de l’offre : ………… jours.  ·  Ce document ne vaut pas facture et ne doit pas porter un numéro de votre série de factures.');
    } else if (isAvoir) {
      note('Émis en annulation ou correction de la facture n° ………………………… du ………/………/……………');
      note('Arrêté le présent avoir à la somme de : ………………………………………………………………');
      note('L’avoir porte son propre numéro, dans une série distincte de celle des factures. La TVA qu’il annule vient en déduction de la TVA collectée du mois.');
    } else if (isDevis) {
      note('Validité de l’offre : ………… jours.  ·  Délai d’exécution : …………………………………');
      note('Bon pour accord — date, nom et signature du client : ……………………………………………');
    } else if (isDelivery) {
      note('Livraison relative au bon de commande n° ………………………… du ………/………/……………');
      note('Aucun prix ne figure sur un bon de livraison : la facture les portera. Toute réserve à la réception doit être écrite ci-dessus, avant signature.');
    } else {
      note('Délai de livraison : …………………  ·  Lieu de livraison : ……………………………………');
    }
    note(priced
      ? 'Modèle gratuit — www.facturedz.com  ·  Les totaux sont des formules : ne les remplacez pas par des nombres.'
      : 'Modèle gratuit — www.facturedz.com');

    return {
      name: title.slice(0, 28),
      cols: priced ? [32, 10, 15, 19, 9, 17] : [36, 10, 16, 14, 13, 13],
      rows: rows, merges: merges, heights: heights,
      freeze: headerRow,
      fitToPage: true
    };
  }

  window.downloadTemplate = function (kind) {
    if (typeof XLSX === 'undefined' || !XLSX.build) return false;
    var FILES = {
      proforma:  'facture-proforma-modele.xlsx',
      commande:  'bon-de-commande-modele.xlsx',
      avoir:     'facture-avoir-modele.xlsx',
      acompte:   'facture-acompte-modele.xlsx',
      devis:     'devis-modele.xlsx',
      livraison: 'bon-de-livraison-modele.xlsx'
    };
    var file = FILES[kind] || 'modele-facture-algerie.xlsx';
    XLSX.build([build(kind)], file);
    return true;
  };
})();
