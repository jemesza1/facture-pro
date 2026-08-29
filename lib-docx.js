/* FacturePro — a small .docx writer.

 * An Office Open XML .docx is a zip of XML parts, the same idea as
 * lib-xlsx.js. Writing it here rather than pulling in a document library
 * keeps the download working offline, which a CDN would not. Everything
 * is stored uncompressed: the files are small, and it removes the need
 * for a deflate implementation.

 * Public API:
 *   DOCX.build(filename, bodyXml)     -> triggers a download
 *   downloadTemplateDocx(kind)        -> the six models, same legal text
 *                                       as template-xlsx.js
 */
(function (global) {
  'use strict';

  /* ---------- CRC32, needed by the zip container ---------- */
  var CRC = (function () {
    var t = new Uint32Array(256), c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  var enc = new TextEncoder();

  /* ---------- zip, stored (method 0) ---------- */
  function zip(files) {
    var local = [], central = [], offset = 0, i;
    for (i = 0; i < files.length; i++) {
      var name = enc.encode(files[i].name);
      var data = enc.encode(files[i].data);
      var sum = crc32(data);

      var lh = new Uint8Array(30 + name.length);
      var lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint32(14, sum, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, name.length, true);
      lh.set(name, 30);
      local.push(lh, data);

      var ch = new Uint8Array(46 + name.length);
      var cv = new DataView(ch.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint32(16, sum, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset, true);
      ch.set(name, 46);
      central.push(ch);

      offset += lh.length + data.length;
    }
    var centralSize = central.reduce(function (s, b) { return s + b.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    var parts = local.concat(central, [end]);
    var total = parts.reduce(function (s, b) { return s + b.length; }, 0);
    var out = new Uint8Array(total), at = 0;
    for (i = 0; i < parts.length; i++) { out.set(parts[i], at); at += parts[i].length; }
    return out;
  }

  var GREEN = '006233', LIGHT = 'F1F5F9', DARK = '004321';
  var NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  function esc(s) {
    var amp = String.fromCharCode(38);
    return String(s)
      .replace(/&/g, amp + 'amp;')
      .replace(/</g, amp + 'lt;')
      .replace(/>/g, amp + 'gt;')
      .replace(/"/g, amp + 'quot;')
      .replace(/'/g, amp + 'apos;')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }

  function rPr(opt) {
    opt = opt || {};
    var x = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>';
    if (opt.bold) x += '<w:b/>';
    if (opt.italic) x += '<w:i/>';
    x += '<w:sz w:val="' + (opt.sz || 22) + '"/><w:szCs w:val="' + (opt.sz || 22) + '"/>';
    if (opt.color) x += '<w:color w:val="' + opt.color + '"/>';
    return '<w:rPr>' + x + '</w:rPr>';
  }
  function run(text, opt) {
    return '<w:r>' + rPr(opt) + '<w:t xml:space="preserve">' + esc(text == null ? '' : text) + '</w:t></w:r>';
  }
  function pPr(opt) {
    opt = opt || {};
    var x = '';
    if (opt.align) x += '<w:jc w:val="' + opt.align + '"/>';
    if (opt.after) x += '<w:spacing w:after="' + opt.after + '"/>';
    if (opt.before) x += '<w:spacing w:before="' + opt.before + '"/>';
    return x ? '<w:pPr>' + x + '</w:pPr>' : '';
  }
  function para(text, opt) {
    opt = opt || {};
    return '<w:p>' + pPr(opt) + run(text, opt) + '</w:p>';
  }
  function emptyP() { return '<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>'; }

  function shd(fill) {
    return fill ? '<w:shd w:val="clear" w:color="auto" w:fill="' + fill + '"/>' : '';
  }
  function borders(color) {
    color = color || 'E2E8F0';
    var s = function (side) {
      return '<w:' + side + ' w:val="single" w:sz="4" w:space="0" w:color="' + color + '"/>';
    };
    return '<w:tcBorders>' + s('top') + s('left') + s('bottom') + s('right') + '</w:tcBorders>';
  }

  /* widths: array of twips. A cell may carry {text, span, fill, color, bold,
     sz, align, vAlign} — the same vocabulary the Excel template uses, just
     rendered as Word cells instead of spreadsheet ones. */
  function cell(spec, widths, from) {
    spec = spec || {text: ''};
    var span = spec.span || 1;
    var w = 0, i;
    for (i = 0; i < span; i++) w += widths[from + i] || 0;
    var fill = spec.fill || '';
    var tcPr = '<w:tcW w:w="' + w + '" w:type="dxa"/>' +
      (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '') +
      borders(spec.border || 'E2E8F0') + shd(fill) +
      '<w:vAlign w:val="' + (spec.vAlign || 'center') + '"/>';
    var opt = {
      bold: !!spec.bold, italic: !!spec.italic,
      sz: spec.sz || 21, color: spec.color || '0F172A',
      align: spec.align || 'left'
    };
    var body = '<w:p>' + pPr(opt) + run(spec.text == null ? '' : spec.text, opt) + '</w:p>';
    return '<w:tc><w:tcPr>' + tcPr + '</w:tcPr>' + body + '</w:tc>';
  }

  function row(cells, widths, h) {
    var trPr = h ? '<w:trPr><w:trHeight w:val="' + h + '" w:hRule="atLeast"/></w:trPr>' : '';
    var xml = '', i = 0, c = 0;
    while (c < cells.length && i < widths.length) {
      var spec = cells[c] || {text: ''};
      var span = spec.span || 1;
      xml += cell(spec, widths, i);
      i += span;
      c++;
    }
    return '<w:tr>' + trPr + xml + '</w:tr>';
  }

  function table(rows, widths) {
    var grid = widths.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('');
    var tblPr =
      '<w:tblPr>' +
        '<w:tblW w:w="' + widths.reduce(function (s, w) { return s + w; }, 0) + '" w:type="dxa"/>' +
        '<w:tblLayout w:type="fixed"/>' +
        '<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>' +
      '</w:tblPr>';
    return '<w:tbl>' + tblPr + '<w:tblGrid>' + grid + '</w:tblGrid>' + rows.join('') + '</w:tbl>';
  }

  var W6 = [3284, 1026, 1539, 1949, 923, 1745]; /* 10466 twips, same 6-col split as Excel */

  function banner(title, sub) {
    var w = W6;
    return table([
      row([{text: title, span: 6, fill: DARK, color: 'FFFFFF', bold: 1, sz: 40, align: 'center'}], w, 560),
      row([{text: sub, span: 6, fill: DARK, color: 'D7E8DE', sz: 18, align: 'center'}], w, 280),
      row([{text: 'www.facturedz.com', span: 6, fill: DARK, color: 'D7E8DE', sz: 16, align: 'center'}], w, 240)
    ], w);
  }

  function labelVal(l, rLabel) {
    var w = W6;
    return row([
      {text: l, fill: LIGHT, bold: 1, sz: 18, color: '475569'},
      {text: '', span: 2},
      {text: rLabel || '', fill: rLabel ? LIGHT : undefined, bold: 1, sz: 18, color: '475569'},
      {text: '', span: 2}
    ], w, 280);
  }

  function headRow(cells) {
    return row(cells.map(function (t) {
      return {text: t, fill: GREEN, color: 'FFFFFF', bold: 1, sz: 18, align: 'center'};
    }), W6, 360);
  }

  /* Same kinds, same legal sentences as template-xlsx.js. Word cannot host
     spreadsheet formulas, so the amount cells stay empty for the merchant
     to fill — the mentions the law and the buyer expect are copied verbatim. */
  function documentXml(kind) {
    var isInvoice  = kind === 'facture';
    var isProforma = kind === 'proforma';
    var isAvoir    = kind === 'avoir';
    var isDevis    = kind === 'devis';
    var isDelivery = kind === 'livraison';
    var priced = !isDelivery;
    var TITLES = {
      facture:   'FACTURE',
      proforma:  'FACTURE PROFORMA',
      commande:  'BON DE COMMANDE',
      avoir:     "FACTURE D'AVOIR",
      devis:     'DEVIS',
      livraison: 'BON DE LIVRAISON'
    };
    var SUBS = {
      facture:   'Mentions du décret exécutif 05-468 — complétez vos identifiants',
      proforma:  "Document d'intention — ne vaut pas facture et n'ouvre pas droit à déduction de TVA",
      commande:  'Commande adressée au fournisseur — à confirmer par une facture',
      avoir:     "Annule ou corrige une facture déjà émise — rappelez son numéro et sa date",
      devis:     "Proposition de prix — ne vaut pas facture tant qu'elle n'est pas acceptée",
      livraison: 'Accompagne la marchandise — sans prix, à signer par le client à la réception'
    };
    var title = TITLES[kind] || TITLES.commande;
    var sub = SUBS[kind] || SUBS.commande;
    var buyerFirst = kind === 'commande';
    var left  = buyerFirst ? 'ACHETEUR' : 'VENDEUR';
    var right = buyerFirst ? 'FOURNISSEUR' : (isDelivery ? 'LIVRÉ À' : 'CLIENT');
    var parts = [];

    parts.push(banner(title, sub));
    parts.push(emptyP());

    parts.push(table([
      row([
        {text: 'N°', fill: LIGHT, bold: 1, sz: 18, color: '475569'},
        {text: '', span: 2},
        {text: 'Date', fill: LIGHT, bold: 1, sz: 18, color: '475569'},
        {text: '', span: 2}
      ], W6, 280)
    ], W6));
    parts.push(emptyP());

    var party = [row([
      {text: left,  span: 3, fill: GREEN, color: 'FFFFFF', bold: 1, sz: 18, align: 'center'},
      {text: right, span: 3, fill: GREEN, color: 'FFFFFF', bold: 1, sz: 18, align: 'center'}
    ], W6, 320)];
    var pairs = [
      ['Raison sociale', 'Raison sociale'],
      ['Adresse', 'Adresse'],
      ['NIF', 'NIF'],
      ['NIS', buyerFirst ? '' : 'NIS'],
      ['RC', buyerFirst ? '' : 'RC'],
      ['AI', '']
    ];
    pairs.forEach(function (pair) {
      party.push(labelVal(pair[0], pair[1]));
    });
    parts.push(table(party, W6));
    parts.push(emptyP());

    var HEAD = priced
      ? ['Désignation', 'Quantité', 'Prix unitaire HT', 'Total HT', 'TVA %', 'Montant TVA']
      : ['Désignation', 'Unité', 'Qté commandée', 'Qté livrée', 'Observations', ''];
    var lines = [];
    if (priced) {
      lines.push(headRow(HEAD));
    } else {
      lines.push(row([
        {text: 'Désignation', fill: GREEN, color: 'FFFFFF', bold: 1, sz: 18, align: 'center'},
        {text: 'Unité', fill: GREEN, color: 'FFFFFF', bold: 1, sz: 18, align: 'center'},
        {text: 'Qté commandée', fill: GREEN, color: 'FFFFFF', bold: 1, sz: 18, align: 'center'},
        {text: 'Qté livrée', fill: GREEN, color: 'FFFFFF', bold: 1, sz: 18, align: 'center'},
        {text: 'Observations', span: 2, fill: GREEN, color: 'FFFFFF', bold: 1, sz: 18, align: 'center'}
      ], W6, 360));
    }
    var i;
    for (i = 0; i < 12; i++) {
      if (priced) {
        lines.push(row([
          {text: ''}, {text: '', align: 'center'}, {text: '', align: 'right'},
          {text: '', align: 'right'}, {text: '', align: 'center'}, {text: '', align: 'right'}
        ], W6, 280));
      } else {
        lines.push(row([
          {text: ''}, {text: ''}, {text: ''}, {text: ''}, {text: '', span: 2}
        ], W6, 280));
      }
    }
    parts.push(table(lines, W6));
    parts.push(emptyP());

    if (priced) {
      function totalRow(label, grand) {
        return row([
          {text: '', span: 3, border: 'FFFFFF'},
          {text: label, fill: grand ? GREEN : LIGHT, color: grand ? 'FFFFFF' : '0F172A',
           bold: 1, sz: grand ? 22 : 18, align: 'right'},
          {text: '', span: 2, fill: grand ? GREEN : LIGHT, color: grand ? 'FFFFFF' : '0F172A',
           bold: 1, sz: grand ? 22 : 20, align: 'right'}
        ], W6, grand ? 360 : 280);
      }
      var totals = [
        totalRow('Total HT', false),
        totalRow('Total TVA', false),
        totalRow('Total TTC', false)
      ];
      if (isInvoice) totals.push(totalRow('Droit de timbre', false));
      var netLabel = isInvoice ? 'NET À PAYER'
                   : isAvoir   ? "TOTAL DE L'AVOIR"
                   : 'TOTAL';
      totals.push(totalRow(netLabel, true));
      parts.push(table(totals, W6));
      parts.push(emptyP());
    } else {
      parts.push(table([
        row([
          {text: 'Le livreur (nom et signature)', span: 3, fill: LIGHT, bold: 1, sz: 18, color: '475569'},
          {text: 'Le client (nom, date et signature)', span: 3, fill: LIGHT, bold: 1, sz: 18, color: '475569'}
        ], W6, 280),
        row([{text: '', span: 3}, {text: '', span: 3}], W6, 400),
        row([{text: '', span: 3}, {text: '', span: 3}], W6, 400),
        row([{text: '', span: 3}, {text: '', span: 3}], W6, 400)
      ], W6));
      parts.push(emptyP());
    }

    function note(text) {
      parts.push(para(text, {italic: 1, sz: 18, color: '64748B', after: 80}));
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
    note('Modèle gratuit — www.facturedz.com');

    var sect =
      '<w:sectPr>' +
        '<w:pgSz w:w="11906" w:h="16838"/>' +
        '<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="284" w:footer="284"/>' +
      '</w:sectPr>';

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="' + NS + '">' +
        '<w:body>' + parts.join('') + sect + '</w:body>' +
      '</w:document>';
  }

  var STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:styles xmlns:w="' + NS + '">' +
      '<w:docDefaults><w:rPrDefault><w:rPr>' +
        '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/>' +
      '</w:rPr></w:rPrDefault></w:docDefaults>' +
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">' +
        '<w:name w:val="Normal"/><w:qFormat/>' +
      '</w:style>' +
    '</w:styles>';

  function packageDoc(bodyXml) {
    return [
      {name: '[Content_Types].xml', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
          '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
          '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
        '</Types>'},
      {name: '_rels/.rels', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
          '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
        '</Relationships>'},
      {name: 'word/_rels/document.xml.rels', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
        '</Relationships>'},
      {name: 'word/document.xml', data: bodyXml},
      {name: 'word/styles.xml', data: STYLES_XML},
      {name: 'docProps/core.xml', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" ' +
        'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
          '<dc:title>Modèle FacturePro</dc:title>' +
          '<dc:creator>FacturePro</dc:creator>' +
          '<cp:lastModifiedBy>FacturePro</cp:lastModifiedBy>' +
        '</cp:coreProperties>'},
      {name: 'docProps/app.xml', data:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
          '<Application>FacturePro</Application>' +
        '</Properties>'}
    ];
  }

  function download(bytes, filename) {
    var blob = new Blob([bytes], {type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    return bytes.length;
  }

  function build(filename, bodyXml) {
    var bytes = zip(packageDoc(bodyXml));
    download(bytes, filename);
    return bytes.length;
  }

  function downloadTemplateDocx(kind) {
    var FILES = {
      proforma:  'facture-proforma-modele.docx',
      commande:  'bon-de-commande-modele.docx',
      avoir:     'facture-avoir-modele.docx',
      devis:     'devis-modele.docx',
      livraison: 'bon-de-livraison-modele.docx'
    };
    var file = FILES[kind] || 'modele-facture-algerie.docx';
    build(file, documentXml(kind));
    return true;
  }

  global.DOCX = {build: build, zip: zip, documentXml: documentXml};
  global.downloadTemplateDocx = downloadTemplateDocx;
})(this);
