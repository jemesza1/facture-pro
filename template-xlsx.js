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
    var isInvoice  = kind === 'facture';
    var isProforma = kind === 'proforma';
    var title = isInvoice  ? 'FACTURE'
              : isProforma ? 'FACTURE PROFORMA'
              : 'BON DE COMMANDE';
    var sub = isProforma
      ? "Document d'intention — ne vaut pas facture et n'ouvre pas droit à déduction de TVA"
      : (isInvoice
          ? 'Mentions du décret exécutif 05-468 — complétez vos identifiants'
          : 'Commande adressée au fournisseur — à confirmer par une facture');

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
    var left  = isInvoice || isProforma ? 'VENDEUR' : 'ACHETEUR';
    var right = isInvoice || isProforma ? 'CLIENT'  : 'FOURNISSEUR';
    rows.push([{v: left, s: 'thead'}, '', '', {v: right, s: 'thead'}, '', '']);
    merges.push('A' + R() + ':C' + R()); merges.push('D' + R() + ':F' + R());

    var pairs = [
      ['Raison sociale', 'Raison sociale'],
      ['Adresse', 'Adresse'],
      ['NIF', 'NIF'],
      ['NIS', isInvoice || isProforma ? 'NIS' : ''],
      ['RC', isInvoice || isProforma ? 'RC' : ''],
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
    rows.push([{v: 'Désignation', s: 'thead'}, {v: 'Quantité', s: 'thead'},
               {v: 'Prix unitaire HT', s: 'thead'}, {v: 'Total HT', s: 'thead'},
               {v: 'TVA %', s: 'thead'}, {v: 'Montant TVA', s: 'thead'}]);
    var headerRow = R(); heights[headerRow] = 28;

    var first = headerRow + 1;
    for (var i = 0; i < LINES; i++) {
      var r = first + i;
      rows.push([
        {v: '', s: 'cell'}, {v: '', s: 'cell'}, {v: '', s: 'moneyDA'},
        {f: 'IF(B' + r + '="","",B' + r + '*C' + r + ')', s: 'moneyDA'},
        {v: '', s: 'cellPct'},
        {f: 'IF(D' + r + '="","",D' + r + '*E' + r + '/100)', s: 'moneyDA'}
      ]);
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
    var ht  = total('Total HT',  'SUM(D' + first + ':D' + last + ')', 'totalDA');
    var tva = total('Total TVA', 'SUM(F' + first + ':F' + last + ')', 'totalDA');
    var ttc = total('Total TTC', 'E' + ht + '+E' + tva, 'totalDA');

    var timbre = 0;
    if (isInvoice) {
      rows.push([null, null, null, {v: 'Droit de timbre', s: 'fieldLabel'},
                 {v: 0, s: 'totalDA'}, {v: '', s: 'totalDA'}]);
      timbre = R(); merges.push('E' + timbre + ':F' + timbre);
    }
    var netRow = total(isInvoice ? 'NET À PAYER' : 'TOTAL',
                       isInvoice ? ('E' + ttc + '+E' + timbre) : ('E' + ttc), 'grandDA');
    heights[netRow] = 24;
    rows.push([]);

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
    } else {
      note('Délai de livraison : …………………  ·  Lieu de livraison : ……………………………………');
    }
    note('Modèle gratuit — www.facturedz.com  ·  Les totaux sont des formules : ne les remplacez pas par des nombres.');

    return {
      name: title.slice(0, 28),
      cols: [32, 10, 15, 19, 9, 17],
      rows: rows, merges: merges, heights: heights,
      freeze: headerRow,
      fitToPage: true
    };
  }

  window.downloadTemplate = function (kind) {
    if (typeof XLSX === 'undefined' || !XLSX.build) return false;
    var file = kind === 'proforma' ? 'facture-proforma-modele.xlsx'
             : kind === 'commande' ? 'bon-de-commande-modele.xlsx'
             : 'modele-facture-algerie.xlsx';
    XLSX.build([build(kind)], file);
    return true;
  };
})();
