/* FacturePro — downloadable spreadsheet templates.
 *
 * "modèle de facture Excel" is the most searched thing in this domain, and
 * what people want is a file, not an application. Most sites answer it with a
 * screenshot, a dead link, or a .xls that is really an HTML table Excel
 * complains about. We already write real workbooks — lib-xlsx.js — so the
 * honest answer is to hand over a real one.
 *
 * The totals are formulas, not numbers. A template whose totals were typed
 * goes wrong the first time somebody changes a quantity, and it goes wrong
 * silently, which is worse than not existing.
 */
(function () {
  var LINES = 12;                 /* blank lines the merchant fills in */
  var FIRST = 13;                 /* 1-based row of the first line */

  function head(rows, merges, title, sub) {
    rows.push([{v: title, s: 'title'}]);        merges.push('A1:F1');
    rows.push([{v: sub, s: 'subtitle'}]);       merges.push('A2:F2');
    rows.push([]);
  }

  function party(rows, label, fields) {
    rows.push([{v: label, s: 'thead'}]);
    fields.forEach(function (f) {
      rows.push([{v: f, s: 'totalLabel'}, {v: '', s: 'cell'}]);
    });
  }

  /* One shape for the three documents: only the wording and the tax line
     differ, so there is one place to correct if the law moves. */
  function build(kind) {
    var isInvoice  = kind === 'facture';
    var isProforma = kind === 'proforma';
    var title = isInvoice  ? 'FACTURE'
              : isProforma ? 'FACTURE PROFORMA'
              : 'BON DE COMMANDE';
    var sub = isProforma
      ? "Document d'intention — ne vaut pas facture et n'ouvre pas droit à déduction de TVA."
      : (isInvoice
          ? 'Mentions du décret exécutif 05-468 — à compléter avec vos identifiants.'
          : 'Commande adressée au fournisseur — à confirmer par une facture.');

    var rows = [], merges = [];
    head(rows, merges, title, sub);

    rows.push([{v: 'Numéro', s: 'totalLabel'}, {v: '', s: 'cell'},
               null, {v: 'Date', s: 'totalLabel'}, {v: '', s: 'cell'}]);
    rows.push([]);

    party(rows, isInvoice || isProforma ? 'VENDEUR' : 'ACHETEUR',
          ['Raison sociale', 'Adresse', 'NIF', 'NIS', 'RC', 'AI']);
    rows.push([]);
    party(rows, isInvoice || isProforma ? 'CLIENT' : 'FOURNISSEUR',
          ['Raison sociale', 'Adresse', 'NIF']);
    rows.push([]);

    /* the line table */
    var headerRow = rows.length + 1;
    rows.push([{v: 'Désignation', s: 'thead'}, {v: 'Quantité', s: 'thead'},
               {v: 'Prix unitaire HT', s: 'thead'}, {v: 'Total HT', s: 'thead'},
               {v: 'TVA %', s: 'thead'}, {v: 'Montant TVA', s: 'thead'}]);

    var first = headerRow + 1;
    for (var i = 0; i < LINES; i++) {
      var r = first + i;
      rows.push([
        {v: '', s: 'cell'}, {v: '', s: 'cell'}, {v: '', s: 'cellNum'},
        {f: 'IF(B' + r + '="","",B' + r + '*C' + r + ')', s: 'cellNum'},
        {v: '', s: 'cellPct'},
        {f: 'IF(D' + r + '="","",D' + r + '*E' + r + '/100)', s: 'cellNum'}
      ]);
    }
    var last = first + LINES - 1;

    rows.push([]);
    var ht = rows.length + 1;
    rows.push([null, null, {v: 'Total HT', s: 'totalLabel'},
               {f: 'SUM(D' + first + ':D' + last + ')', s: 'totalNum'}]);
    var tva = rows.length + 1;
    rows.push([null, null, {v: 'Total TVA', s: 'totalLabel'},
               {f: 'SUM(F' + first + ':F' + last + ')', s: 'totalNum'}]);
    var ttc = rows.length + 1;
    rows.push([null, null, {v: 'Total TTC', s: 'totalLabel'},
               {f: 'D' + ht + '+D' + tva, s: 'totalNum'}]);

    var timbre = 0;
    if (isInvoice) {
      timbre = rows.length + 1;
      rows.push([null, null, {v: 'Droit de timbre (espèces)', s: 'totalLabel'},
                 {v: 0, s: 'totalNum'}]);
    }
    rows.push([null, null, {v: isInvoice ? 'Net à payer' : 'Total', s: 'grand'},
               {f: isInvoice ? ('D' + ttc + '+D' + timbre) : ('D' + ttc), s: 'grand'}]);

    rows.push([]);
    if (isInvoice) {
      rows.push([{v: 'Arrêtée la présente facture à la somme de : ……………………………………', s: 'note'}]);
      merges.push('A' + rows.length + ':F' + rows.length);
      rows.push([{v: 'Le droit de timbre ne s’applique qu’aux règlements en espèces (art. 100 du Code du timbre). Vérifiez le barème en vigueur.', s: 'note'}]);
      merges.push('A' + rows.length + ':F' + rows.length);
    } else if (isProforma) {
      rows.push([{v: 'Validité de l’offre : ………… jours. Ce document ne remplace pas une facture.', s: 'note'}]);
      merges.push('A' + rows.length + ':F' + rows.length);
    } else {
      rows.push([{v: 'Délai de livraison : …………  ·  Lieu de livraison : …………………………', s: 'note'}]);
      merges.push('A' + rows.length + ':F' + rows.length);
    }
    rows.push([{v: 'Modèle gratuit — www.facturedz.com', s: 'note'}]);
    merges.push('A' + rows.length + ':F' + rows.length);

    return {
      name: title.slice(0, 28),
      cols: [40, 11, 17, 15, 9, 15],
      rows: rows, merges: merges,
      heights: {1: 26, 2: 18}
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
