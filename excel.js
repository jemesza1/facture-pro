/* FacturePro — Excel exports.
 *
 * Two workbooks, both written by lib-xlsx.js:
 *
 *   exportInvoiceXlsx(id)   the invoice as a sheet the accountant can rework
 *   exportJournalXlsx(ym)   every invoice of a month, with the VAT split out
 *
 * The journal is the one that matters. Nobody wants a facture in Excel; they
 * want the lines they will copy into their monthly declaration. So it carries
 * the base and the VAT per rate, the stamp duty, and a totals row — the same
 * columns the G50 asks for.
 *
 * Everything is in French, like the printed invoice: these are fiscal
 * documents, and mixing the interface language into them would make two users
 * produce two different-looking declarations from the same figures.
 */
(function(){
  'use strict';

  var MONTHS = ['janvier','février','mars','avril','mai','juin',
                'juillet','août','septembre','octobre','novembre','décembre'];

  function ar(){ try { return locale === 'ar'; } catch(e) { return false; } }
  function say(fr, arText){ return ar() ? arText : fr; }
  function payLabelFr(inv){
    var m = (inv && inv.paymentMode) || 'virement';
    return {virement:'Virement bancaire', especes:'Espèces', cheque:'Chèque', carte:'Carte / TPE'}[m] || 'Virement bancaire';
  }
  function safeName(s){ return String(s || '').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 60); }

  /* Group an invoice's lines by VAT rate — this is what a declaration needs. */
  function byRate(invoices){
    var map = {};
    invoices.forEach(function(inv){
      (inv.items || []).forEach(function(it){
        var rate = Number(it.tva) || 0;
        var base = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
        if (!map[rate]) map[rate] = {base: 0, tva: 0};
        map[rate].base += base;
        map[rate].tva  += base * rate / 100;
      });
    });
    return map;
  }

  /* ---------------------------------------------------------------- *
   * One invoice
   * ---------------------------------------------------------------- */
  window.exportInvoiceXlsx = function(id){
    var inv = (state.invoices || []).find(function(i){ return i.id === id; });
    if (!inv) return toast(t('toast.invoiceNotFound'), 'err');

    var co = state.company || {}, cl = getClient(inv.clientId) || {};
    var tot = calcInvoiceTotals(inv);
    var rows = [], merges = [];

    function push(cells){ rows.push(cells); return rows.length; }
    function blank(){ rows.push([]); }

    push([{v: co.name || '', s: 'title'}]);
    merges.push('A1:F1');
    push([{v: String(co.address || '').replace(/\n/g, ', '), s: 'subtitle'}]);
    merges.push('A2:F2');
    push([{v: [co.email, co.phone].filter(Boolean).join('   ·   '), s: 'subtitle'}]);
    merges.push('A3:F3');

    /* One identifier per column rather than a single crammed line: an
       accountant reads down a column, not along a sentence. */
    var IDS = ['nif', 'nin', 'nis', 'rc', 'ai'];
    push(IDS.map(function(k){ return {v: k.toUpperCase(), s: 'label'}; }));
    push(IDS.map(function(k){ return {v: co[k] || '—', s: 'value'}; }));
    blank();

    push([{v: 'FACTURE ' + (inv.number || ''), s: 'sectionTitle'}]);
    push([{v: 'Date', s: 'label'}, {v: inv.date ? XLSX.excelDate(inv.date) : '', s: 'date'},
          null, {v: 'Échéance', s: 'label'}, {v: inv.dueDate ? XLSX.excelDate(inv.dueDate) : '', s: 'date'}]);
    push([{v: 'Règlement', s: 'label'}, {v: payLabelFr(inv), s: 'value'}]);
    blank();

    push([{v: 'CLIENT', s: 'sectionTitle'}]);
    push([{v: cl.name || '', s: 'value'}]);
    if (cl.address) push([{v: String(cl.address).replace(/\n/g, ', '), s: 'subtitle'}]);
    push(IDS.map(function(k){ return {v: k.toUpperCase(), s: 'label'}; }));
    push(IDS.map(function(k){ return {v: cl[k] || '—', s: 'value'}; }));
    blank();

    push([{v: 'Désignation', s: 'thead'}, {v: 'Qté', s: 'thead'}, {v: 'P.U. HT', s: 'thead'},
          {v: 'TVA', s: 'thead'}, {v: 'Montant TVA', s: 'thead'}, {v: 'Total HT', s: 'thead'}]);

    (inv.items || []).forEach(function(it){
      var qty = Number(it.qty) || 0, pu = Number(it.unitPrice) || 0, rate = Number(it.tva) || 0;
      var line = qty * pu;
      push([{v: it.description || '', s: 'cell'}, {v: qty, s: 'cellNum'}, {v: pu, s: 'cellNum'},
            {v: rate, s: 'cellPct'}, {v: line * rate / 100, s: 'cellNum'}, {v: line, s: 'cellNum'}]);
    });

    blank();
    var totalsAt = rows.length;
    push([null, null, null, null, {v: 'Sous-total HT', s: 'totalLabel'}, {v: tot.ht, s: 'totalNum'}]);
    push([null, null, null, null, {v: 'TVA', s: 'totalLabel'}, {v: tot.tva, s: 'totalNum'}]);
    push([null, null, null, null, {v: 'Total TTC', s: 'totalLabel'}, {v: tot.ttc, s: 'totalNum'}]);
    if (tot.port) {
      push([null, null, null, null, {v: 'Frais de port', s: 'totalLabel'}, {v: tot.port, s: 'totalNum'}]);
    }
    if (tot.timbre || tot.port) {
      if (tot.timbre) push([null, null, null, null, {v: 'Droit de timbre', s: 'totalLabel'}, {v: tot.timbre, s: 'totalNum'}]);
      push([null, null, null, null, {v: 'Net à payer', s: 'totalLabel'}, {v: tot.net, s: 'grand'}]);
    } else {
      push([null, null, null, null, {v: 'Net à payer', s: 'totalLabel'}, {v: tot.net, s: 'grand'}]);
    }
    blank();
    push([{v: 'Arrêté la présente facture à la somme de : ' + amountInWords(tot.net), s: 'note'}]);
    merges.push('A' + rows.length + ':F' + rows.length);
    if (inv.notes) {
      push([{v: String(inv.notes).replace(/\n/g, ' '), s: 'note'}]);
      merges.push('A' + rows.length + ':F' + rows.length);
    }
    if (co.rib) push([{v: 'RIB : ' + co.rib + (co.banque ? ' — ' + co.banque : ''), s: 'subtitle'}]);

    void totalsAt;
    /* Merged cells do not grow to fit their text, so the wrapped lines get an
       explicit height. Without this the wording looked cut off. */
    var heights = {1: 26};
    heights[rows.length] = 30;
    XLSX.build([{name: 'Facture', cols: [40, 16, 16, 16, 16, 16], rows: rows,
                 merges: merges, heights: heights}],
               'facture-' + safeName(inv.number || 'sans-numero') + '.xlsx');
    toast(say('Export Excel OK', 'تم تصدير Excel'));
  };

  /* ---------------------------------------------------------------- *
   * A month of invoices — the sheet a declaration is filled from
   * ---------------------------------------------------------------- */
  window.exportJournalXlsx = function(ym){
    ym = ym || new Date().toISOString().slice(0, 7);
    var all = (state.invoices || []).filter(function(i){
      return i.status !== 'annulee' && i.status !== 'brouillon' && (i.date || '').slice(0, 7) === ym;
    }).sort(function(a, b){ return (a.date || '').localeCompare(b.date || ''); });

    if (!all.length) return toast(say('Aucune facture ce mois-ci', 'لا توجد فواتير هذا الشهر'), 'err');

    var y = ym.slice(0, 4), m = parseInt(ym.slice(5, 7), 10) - 1;
    var co = state.company || {};

    /* --- sheet 1: the register --- */
    var rows = [], merges = [];
    rows.push([{v: 'Journal des ventes — ' + MONTHS[m] + ' ' + y, s: 'title'}]);
    merges.push('A1:K1');
    rows.push([{v: (co.name || '') + (co.nif ? '   NIF : ' + co.nif : '') + (co.nin ? '   NIN : ' + co.nin : ''), s: 'subtitle'}]);
    merges.push('A2:K2');
    rows.push([]);

    rows.push([{v: 'N° facture', s: 'thead'}, {v: 'Date', s: 'thead'}, {v: 'Client', s: 'thead'},
               {v: 'NIF client', s: 'thead'}, {v: 'Base HT', s: 'thead'}, {v: 'TVA', s: 'thead'},
               {v: 'Total TTC', s: 'thead'}, {v: 'Frais de port', s: 'thead'}, {v: 'Droit de timbre', s: 'thead'},
               {v: 'Net à payer', s: 'thead'}, {v: 'Règlement', s: 'thead'}]);

    var sum = {ht: 0, tva: 0, ttc: 0, port: 0, timbre: 0, net: 0};
    all.forEach(function(inv){
      var cl = getClient(inv.clientId) || {}, tt = calcInvoiceTotals(inv);
      sum.ht += tt.ht; sum.tva += tt.tva; sum.ttc += tt.ttc; sum.port += tt.port; sum.timbre += tt.timbre; sum.net += tt.net;
      rows.push([
        {v: inv.number || '', s: 'cell'},
        {v: inv.date ? XLSX.excelDate(inv.date) : '', s: 'date'},
        {v: cl.name || '', s: 'cell'},
        {v: cl.nif || '', s: 'cell'},
        {v: tt.ht, s: 'cellNum'}, {v: tt.tva, s: 'cellNum'}, {v: tt.ttc, s: 'cellNum'},
        {v: tt.port, s: 'cellNum'}, {v: tt.timbre, s: 'cellNum'}, {v: tt.net, s: 'cellNum'},
        {v: payLabelFr(inv), s: 'cell'}
      ]);
    });

    rows.push([{v: 'TOTAL', s: 'grand'}, {v: '', s: 'grand'}, {v: '', s: 'grand'}, {v: '', s: 'grand'},
               {v: sum.ht, s: 'grand'}, {v: sum.tva, s: 'grand'}, {v: sum.ttc, s: 'grand'},
               {v: sum.port, s: 'grand'}, {v: sum.timbre, s: 'grand'}, {v: sum.net, s: 'grand'}, {v: '', s: 'grand'}]);

    /* --- sheet 2: the figures a G50 asks for --- */
    var rec = [], recMerges = [];
    rec.push([{v: 'Récapitulatif TVA — ' + MONTHS[m] + ' ' + y, s: 'title'}]);
    recMerges.push('A1:C1');
    rec.push([{v: 'À reporter sur la déclaration mensuelle.', s: 'subtitle'}]);
    recMerges.push('A2:C2');
    rec.push([]);
    rec.push([{v: 'Taux', s: 'thead'}, {v: 'Base HT', s: 'thead'}, {v: 'TVA collectée', s: 'thead'}]);

    var map = byRate(all), rates = Object.keys(map).map(Number).sort(function(a, b){ return a - b; });
    var tb = 0, tt2 = 0;
    rates.forEach(function(r){
      tb += map[r].base; tt2 += map[r].tva;
      rec.push([{v: r, s: 'cellPct'}, {v: map[r].base, s: 'cellNum'}, {v: map[r].tva, s: 'cellNum'}]);
    });
    rec.push([{v: 'TOTAL', s: 'grand'}, {v: tb, s: 'grand'}, {v: tt2, s: 'grand'}]);
    rec.push([]);
    rec.push([{v: 'Chiffre d’affaires HT', s: 'totalLabel'}, {v: sum.ht, s: 'totalNum'}]);
    rec.push([{v: 'TVA collectée', s: 'totalLabel'}, {v: sum.tva, s: 'totalNum'}]);
    rec.push([{v: 'Droit de timbre encaissé', s: 'totalLabel'}, {v: sum.timbre, s: 'totalNum'}]);
    rec.push([{v: 'Nombre de factures', s: 'totalLabel'}, {v: all.length, s: 'totalNum'}]);
    rec.push([]);
    rec.push([{v: 'Les brouillons et les factures annulées ne sont pas repris. Le droit de timbre ne figure que sur les règlements en espèces.', s: 'note'}]);
    recMerges.push('A' + rec.length + ':C' + rec.length);

    XLSX.build([
      {name: 'Journal des ventes', cols: [16, 12, 30, 20, 14, 13, 14, 14, 15, 14, 18],
       rows: rows, merges: merges, freeze: 4, autofilter: 'A4:J' + rows.length,
       heights: {1: 26, 4: 30}},
      {name: 'Récapitulatif TVA',  cols: [26, 16, 16], rows: rec, merges: recMerges,
       heights: {1: 26}}
    ], 'journal-ventes-' + ym + '.xlsx');

    toast(say('Journal exporté', 'تم تصدير السجلّ'));
  };
})();
