/* FacturePro — a small .xlsx writer.
 *
 * An .xlsx file is a zip of XML parts. Writing it here rather than pulling in a
 * spreadsheet library keeps the app a few kilobytes heavier instead of a
 * megabyte, and — more importantly — keeps it working offline, which a CDN
 * would not. Everything is stored uncompressed: the files are small, and it
 * removes the need for a deflate implementation.
 *
 * Public API:
 *   XLSX.build([{name, cols, rows, merges}], filename)  -> triggers a download
 * A cell is a value, or {v, s} where s is a style name from STYLES below.
 * A cell may also carry {f} — an Excel formula, written without the leading
 * "=". A downloadable template lives or dies on this: a sheet where the
 * totals are numbers somebody typed is a sheet that goes wrong the first time
 * a quantity changes.
 */
(function(global){
  'use strict';

  /* ---------- CRC32, needed by the zip container ---------- */
  var CRC = (function(){
    var t = new Uint32Array(256), c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes){
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  var enc = new TextEncoder();

  /* ---------- zip, stored (method 0) ---------- */
  function zip(files){
    var local = [], central = [], offset = 0, i;
    for (i = 0; i < files.length; i++) {
      var name = enc.encode(files[i].name);
      var data = enc.encode(files[i].data);
      var sum  = crc32(data);

      var lh = new Uint8Array(30 + name.length);
      var lv = new DataView(lh.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);          // version needed
      lv.setUint16(6, 0x0800, true);      // UTF-8 names
      lv.setUint16(8, 0, true);           // stored
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
    var centralSize = central.reduce(function(s, b){ return s + b.length; }, 0);
    var end = new Uint8Array(22);
    var ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);

    var parts = local.concat(central, [end]);
    var total = parts.reduce(function(s, b){ return s + b.length; }, 0);
    var out = new Uint8Array(total), at = 0;
    for (i = 0; i < parts.length; i++) { out.set(parts[i], at); at += parts[i].length; }
    return out;
  }

  /* ---------- styles ----------
     Index order matters: it is the order they are written into styles.xml. */
  var GREEN = '006233', LIGHT = 'F1F5F9', SOFT = 'F8FAFC', DARK = '004321';
  var STYLES = [
    'default',      // 0
    'title',        // 1  company name
    'subtitle',     // 2  grey line under the title
    'label',        // 3  bold small label
    'value',        // 4
    'thead',        // 5  white on green, table header
    'cell',         // 6  bordered body cell
    'cellNum',      // 7  bordered, thousands + 2 decimals
    'cellPct',      // 8  bordered, percentage
    'totalLabel',   // 9  bold, right aligned
    'totalNum',     // 10 bold number
    'grand',        // 11 white on green, big number
    'note',         // 12 italic grey, wrapped
    'date',         // 13 dd/mm/yyyy
    'sectionTitle', // 14
    /* A downloadable template is judged in the first second, before anybody
       types in it: these are the styles that make it look like a document
       rather than a grid. */
    'banner',       // 15 white on dark green, the document title
    'bannerSub',    // 16 white on dark green, the line under it
    'fieldLabel',   // 17 bold small on grey, bordered — the left of a form row
    'fieldValue',   // 18 bordered, empty, waiting to be filled
    'moneyDA',      // 19 bordered amount suffixed DA
    'totalDA',      // 20 bold amount on grey, suffixed DA
    'grandDA'       // 21 white on green, suffixed DA
  ];
  var S = {};
  STYLES.forEach(function(n, i){ S[n] = i; });

  var STYLES_XML =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<numFmts count="4">' +
        '<numFmt numFmtId="167" formatCode="#,##0.00&quot; DA&quot;"/>' +
        '<numFmt numFmtId="164" formatCode="#,##0.00"/>' +
        '<numFmt numFmtId="165" formatCode="0.0&quot; %&quot;"/>' +
        /* numFmtId 14 renders as mm-dd-yy on an English Excel. Spell it out. */
        '<numFmt numFmtId="166" formatCode="dd/mm/yyyy"/>' +
      '</numFmts>' +
      '<fonts count="10">' +
        '<font><sz val="11"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="18"/><color rgb="FF' + GREEN + '"/><name val="Calibri"/></font>' +
        '<font><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="10"/><color rgb="FF334155"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
        '<font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="20"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
        '<font><sz val="10"/><color rgb="FFD7E8DE"/><name val="Calibri"/></font>' +
        '<font><b/><sz val="9"/><color rgb="FF475569"/><name val="Calibri"/></font>' +
      '</fonts>' +
      '<fills count="6">' +
        '<fill><patternFill patternType="none"/></fill>' +
        '<fill><patternFill patternType="gray125"/></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF' + GREEN + '"/><bgColor indexed="64"/></patternFill></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF' + LIGHT + '"/><bgColor indexed="64"/></patternFill></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF' + SOFT + '"/><bgColor indexed="64"/></patternFill></fill>' +
        '<fill><patternFill patternType="solid"><fgColor rgb="FF' + DARK + '"/><bgColor indexed="64"/></patternFill></fill>' +
      '</fills>' +
      '<borders count="2">' +
        '<border><left/><right/><top/><bottom/><diagonal/></border>' +
        '<border>' +
          '<left style="thin"><color rgb="FFE2E8F0"/></left>' +
          '<right style="thin"><color rgb="FFE2E8F0"/></right>' +
          '<top style="thin"><color rgb="FFE2E8F0"/></top>' +
          '<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>' +
          '<diagonal/></border>' +
      '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="22">' +
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +                                                   // default
        '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                    // title
        '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                    // subtitle
        '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                    // label
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +                                                  // value
        '<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' + // thead
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>' + // cell
        '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' + // cellNum
        '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // cellPct
        '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="right"/></xf>' + // totalLabel
        '<xf numFmtId="164" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' + // totalNum
        '<xf numFmtId="164" fontId="4" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' + // grand
        '<xf numFmtId="0" fontId="6" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1"/></xf>' + // note
        '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // date
        '<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                    // sectionTitle
        '<xf numFmtId="0" fontId="7" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' + // banner
        '<xf numFmtId="0" fontId="8" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' + // bannerSub
        '<xf numFmtId="0" fontId="9" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' + // fieldLabel
        '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' + // fieldValue
        '<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>' + // moneyDA
        '<xf numFmtId="167" fontId="5" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' + // totalDA
        '<xf numFmtId="167" fontId="4" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' + // grandDA
      '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  /* ---------- helpers ---------- */
  function esc(s){
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  }
  function colName(n){                 // 0 -> A
    var s = '';
    n += 1;
    while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - r - 1) / 26; }
    return s;
  }
  /* Excel counts days from 1899-12-30. */
  function excelDate(iso){
    var d = new Date(iso + 'T00:00:00Z');
    if (isNaN(d)) return null;
    return Math.floor(d.getTime() / 86400000) + 25569;
  }

  function sheetXml(sheet){
    var rows = sheet.rows || [], out = [], r, c;
    for (r = 0; r < rows.length; r++) {
      var cells = rows[r] || [], cs = [];
      for (c = 0; c < cells.length; c++) {
        var cell = cells[c];
        if (cell === null || cell === undefined || cell === '') continue;
        var v = (typeof cell === 'object' && 'v' in cell) ? cell.v : cell;
        var st = (typeof cell === 'object' && cell.s) ? (S[cell.s] || 0) : 0;
        var ref = colName(c) + (r + 1);

        /* A formula cell carries no cached value on purpose: Excel and
           LibreOffice both compute one on open, and a stale number written
           beside a formula is the thing that makes a template distrusted. */
        if (typeof cell === 'object' && cell.f) {
          cs.push('<c r="' + ref + '" s="' + st + '"><f>' + esc(cell.f) + '</f></c>');
          continue;
        }

        if (v === null || v === undefined || v === '') {
          if (st) cs.push('<c r="' + ref + '" s="' + st + '"/>');
          continue;
        }
        if (typeof v === 'number' && isFinite(v))
          cs.push('<c r="' + ref + '" s="' + st + '"><v>' + v + '</v></c>');
        else
          cs.push('<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t xml:space="preserve">' + esc(v) + '</t></is></c>');
      }
      var h = sheet.heights && sheet.heights[r + 1];
      var attrs = h ? ' ht="' + h + '" customHeight="1"' : '';
      if (cs.length) out.push('<row r="' + (r + 1) + '"' + attrs + '>' + cs.join('') + '</row>');
    }
    var cols = '';
    if (sheet.cols && sheet.cols.length) {
      cols = '<cols>' + sheet.cols.map(function(w, i){
        return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>';
      }).join('') + '</cols>';
    }
    var merges = '';
    if (sheet.merges && sheet.merges.length) {
      merges = '<mergeCells count="' + sheet.merges.length + '">' +
        sheet.merges.map(function(m){ return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>';
    }
    var views = '';
    if (sheet.freeze) {
      views = '<sheetViews><sheetView workbookViewId="0" showGridLines="0">' +
        '<pane ySplit="' + sheet.freeze + '" topLeftCell="A' + (sheet.freeze + 1) + '" activePane="bottomLeft" state="frozen"/>' +
        '<selection pane="bottomLeft" activeCell="A' + (sheet.freeze + 1) + '" sqref="A' + (sheet.freeze + 1) + '"/>' +
        '</sheetView></sheetViews>';
    } else {
      views = '<sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>';
    }
    var filter = sheet.autofilter ? '<autoFilter ref="' + sheet.autofilter + '"/>' : '';
    /* autoFilter before mergeCells, and not the other way round. A worksheet's
       children are a fixed sequence in ECMA-376, not a set: written in the
       wrong order Excel calls the file unreadable and "repairs" it by emptying
       the sheet. That is what a merchant saw — a Journal du mois with nothing
       in it, next to a Récapitulatif TVA that opened fine because it carries no
       filter and so could not be out of order. */
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      (sheet.fitToPage ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : '') + views +
      '<sheetFormatPr defaultRowHeight="15"/>' + cols +
      '<sheetData>' + out.join('') + '</sheetData>' + filter + merges +
      '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' +
      (sheet.fitToPage ? '<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>' : '') +
      '</worksheet>';
  }

  function build(sheets, filename){
    var files = [], i;

    var types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    for (i = 0; i < sheets.length; i++)
      types += '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    types += '</Types>';

    files.push({name: '[Content_Types].xml', data: types});
    files.push({name: '_rels/.rels', data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>'});

    var wbSheets = '', wbRels = '';
    for (i = 0; i < sheets.length; i++) {
      wbSheets += '<sheet name="' + esc(sheets[i].name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>';
      wbRels += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>';
      files.push({name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: sheetXml(sheets[i])});
    }
    wbRels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>';

    files.push({name: 'xl/workbook.xml', data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' + wbSheets + '</sheets></workbook>'});
    files.push({name: 'xl/_rels/workbook.xml.rels', data:
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + wbRels + '</Relationships>'});
    files.push({name: 'xl/styles.xml', data: STYLES_XML});

    var bytes = zip(files);
    var blob = new Blob([bytes], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    return bytes.length;
  }

  global.XLSX = {build: build, excelDate: excelDate, colName: colName};
})(this);
