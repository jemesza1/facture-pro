/* Un écrivain .xlsx pour Node, en dépendance de rien.
 *
 * lib-xlsx.js fait déjà cela dans le navigateur, mais il écrit des tableaux de
 * valeurs : ce classeur-ci a besoin de formules, de listes déroulantes, de
 * liens internes, de volets figés et d'onglets de couleur, et il est produit
 * hors ligne par un script. Les deux resteront séparés — fusionner un
 * générateur de fichier statique avec le module d'export d'une application web
 * ferait un fichier que ni l'un ni l'autre ne peut lire en entier.
 *
 * Le format : un .xlsx est un zip de parties XML. Les pièges qui coûtent une
 * heure sont tous des pièges d'ordre —
 *
 *   · les enfants de <worksheet> suivent une séquence imposée par ECMA-376,
 *     pas un ensemble : sheetData, puis autoFilter, puis mergeCells, puis
 *     dataValidations, puis hyperlinks, puis pageMargins. Dans le désordre,
 *     Excel déclare le fichier illisible et le « répare » en le vidant ;
 *   · <definedNames> vient après <sheets> dans workbook.xml ;
 *   · calcPr fullCalcOnLoad="1" est indispensable ici : on écrit des formules
 *     sans valeur en cache, et sans ce drapeau le classeur s'ouvre sur une
 *     grille de zéros jusqu'à ce que quelqu'un appuie sur Ctrl+Maj+F9.
 */
import { deflateRawSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

/* ---- zip ------------------------------------------------------------- */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function zip(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8');
    const raw = Buffer.from(f.data, 'utf8');
    const data = deflateRawSync(raw, {level: 9});
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);                       /* deflate */
    local.writeUInt16LE(0, 10); local.writeUInt16LE(0x2821, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    chunks.push(local, name, data);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(8, 10);
    cen.writeUInt16LE(0, 12); cen.writeUInt16LE(0x2821, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(raw.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, name);
    offset += local.length + name.length + data.length;
  }
  const cdir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, cdir, end]);
}

/* ---- XML -------------------------------------------------------------- */
export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function colName(n) {
  let s = '';
  n = n + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

/* Le sérial Excel compte les jours depuis le 30/12/1899 — un décalage qui
   vient du bug de l'an 1900 bissextile de Lotus 1-2-3, conservé depuis. */
export function excelDate(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return '';
  return Math.round((d.getTime() - Date.UTC(1899, 11, 30)) / 86400000);
}

/* ---- styles ------------------------------------------------------------ */
const GREEN = '006233', GREEN_L = 'E7F5EE', DARK = '0F172A';
const GREY = 'F1F5F9', GREY_D = '64748B', YELLOW = 'FFFDE7', LINE = 'CBD5E1';

export const STYLES = [
  'default', 'banner', 'bannerSub', 'h2', 'label', 'input', 'inputMoney',
  'inputDate', 'thead', 'cell', 'cellC', 'money', 'num', 'date', 'pct',
  'total', 'totalMoney', 'grand', 'note', 'section', 'code', 'ar', 'link',
  'rubrique', 'warn', 'ok', 'small'
];
const S = {};
STYLES.forEach((n, i) => { S[n] = i; });
export { S };

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="4">' +
      '<numFmt numFmtId="164" formatCode="#,##0.00"/>' +
      '<numFmt numFmtId="165" formatCode="#,##0.00&quot; DA&quot;"/>' +
      '<numFmt numFmtId="166" formatCode="dd/mm/yyyy"/>' +
      '<numFmt numFmtId="167" formatCode="0.0&quot; %&quot;"/>' +
    '</numFmts>' +
    '<fonts count="11">' +
      `<font><sz val="11"/><name val="Calibri"/></font>` +                                        /* 0 */
      `<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +             /* 1 */
      `<font><sz val="11"/><color rgb="FFD1FAE5"/><name val="Calibri"/></font>` +                 /* 2 */
      `<font><b/><sz val="12"/><color rgb="FF${GREEN}"/><name val="Calibri"/></font>` +           /* 3 */
      `<font><b/><sz val="10"/><color rgb="FF334155"/><name val="Calibri"/></font>` +             /* 4 */
      `<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +             /* 5 */
      `<font><b/><sz val="11"/><name val="Calibri"/></font>` +                                    /* 6 */
      `<font><i/><sz val="10"/><color rgb="FF${GREY_D}"/><name val="Calibri"/></font>` +          /* 7 */
      `<font><u/><sz val="11"/><color rgb="FF0369A1"/><b/><name val="Calibri"/></font>` +         /* 8 */
      `<font><b/><sz val="11"/><color rgb="FFB91C1C"/><name val="Calibri"/></font>` +             /* 9 */
      `<font><sz val="9"/><color rgb="FF${GREY_D}"/><name val="Calibri"/></font>` +               /* 10 */
    '</fonts>' +
    '<fills count="7">' +
      '<fill><patternFill patternType="none"/></fill>' +
      '<fill><patternFill patternType="gray125"/></fill>' +
      `<fill><patternFill patternType="solid"><fgColor rgb="FF${GREEN}"/><bgColor indexed="64"/></patternFill></fill>` +   /* 2 */
      `<fill><patternFill patternType="solid"><fgColor rgb="FF${GREY}"/><bgColor indexed="64"/></patternFill></fill>` +    /* 3 */
      `<fill><patternFill patternType="solid"><fgColor rgb="FF${YELLOW}"/><bgColor indexed="64"/></patternFill></fill>` +  /* 4 */
      `<fill><patternFill patternType="solid"><fgColor rgb="FF${GREEN_L}"/><bgColor indexed="64"/></patternFill></fill>` + /* 5 */
      `<fill><patternFill patternType="solid"><fgColor rgb="FF${DARK}"/><bgColor indexed="64"/></patternFill></fill>` +    /* 6 */
    '</fills>' +
    '<borders count="3">' +
      '<border><left/><right/><top/><bottom/><diagonal/></border>' +
      `<border><left style="thin"><color rgb="FF${LINE}"/></left><right style="thin"><color rgb="FF${LINE}"/></right>` +
      `<top style="thin"><color rgb="FF${LINE}"/></top><bottom style="thin"><color rgb="FF${LINE}"/></bottom><diagonal/></border>` +
      `<border><left/><right/><top/><bottom style="medium"><color rgb="FF${GREEN}"/></bottom><diagonal/></border>` +
    '</borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="27">' +
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +                                                                   /* default */
      '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' + /* banner */
      '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>' + /* bannerSub */
      '<xf numFmtId="0" fontId="3" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1"/>' +                                     /* h2 */
      '<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                                     /* label */
      '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>' +                                     /* input */
      '<xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>' +             /* inputMoney */
      '<xf numFmtId="166" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>' +             /* inputDate */
      '<xf numFmtId="0" fontId="5" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>' + /* thead */
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>' +                                                   /* cell */
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' + /* cellC */
      '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +                           /* money */
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +                           /* num */
      '<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +                           /* date */
      '<xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +                           /* pct */
      '<xf numFmtId="0" fontId="6" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +                       /* total */
      '<xf numFmtId="165" fontId="6" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' + /* totalMoney */
      '<xf numFmtId="165" fontId="5" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' + /* grand */
      '<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' + /* note */
      '<xf numFmtId="0" fontId="6" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +                       /* section */
      '<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left"/></xf>' + /* code */
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" readingOrder="2"/></xf>' + /* ar */
      '<xf numFmtId="0" fontId="8" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                                     /* link */
      '<xf numFmtId="0" fontId="6" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +                       /* rubrique */
      '<xf numFmtId="0" fontId="9" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +                                     /* warn */
      '<xf numFmtId="0" fontId="6" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>' +                       /* ok */
      '<xf numFmtId="0" fontId="10" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +                                                    /* small */
    '</cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '</styleSheet>';

/* ---- worksheet --------------------------------------------------------- */
function sheetXml(sheet) {
  const rows = sheet.rows || [], out = [];
  for (let r = 0; r < rows.length; r++) {
    const cells = rows[r] || [], cs = [];
    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      if (cell === null || cell === undefined || cell === '') continue;
      const obj = (typeof cell === 'object');
      const st = obj && cell.s ? (S[cell.s] || 0) : 0;
      const ref = colName(c) + (r + 1);
      if (obj && cell.f) {
        /* Une formule matricielle doit être déclarée comme telle dans le
           fichier : t="array" avec sa propre plage. Sans cela, SMALL(SI(…))
           et consorts sont évalués en intersection implicite et rendent une
           erreur — ce que l'utilisateur obtiendrait aussi en tapant la
           formule sans Ctrl+Maj+Entrée. */
        const f = cell.array
          ? `<f t="array" ref="${ref}">${esc(cell.f)}</f>`
          : `<f>${esc(cell.f)}</f>`;
        cs.push(`<c r="${ref}" s="${st}">${f}</c>`);
        continue;
      }
      const v = obj ? cell.v : cell;
      if (v === null || v === undefined || v === '') {
        if (st) cs.push(`<c r="${ref}" s="${st}"/>`);
        continue;
      }
      if (typeof v === 'number' && isFinite(v))
        cs.push(`<c r="${ref}" s="${st}"><v>${v}</v></c>`);
      else
        cs.push(`<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`);
    }
    const h = sheet.heights && sheet.heights[r + 1];
    const attrs = h ? ` ht="${h}" customHeight="1"` : '';
    if (cs.length) out.push(`<row r="${r + 1}"${attrs}>${cs.join('')}</row>`);
  }

  const tab = sheet.tabColor ? `<tabColor rgb="FF${sheet.tabColor}"/>` : '';
  const fit = sheet.fitToPage ? '<pageSetUpPr fitToPage="1"/>' : '';
  const sheetPr = (tab || fit) ? `<sheetPr>${tab}${fit}</sheetPr>` : '';

  const pane = sheet.freeze
    ? `<pane ySplit="${sheet.freeze}" topLeftCell="A${sheet.freeze + 1}" activePane="bottomLeft" state="frozen"/>` +
      `<selection pane="bottomLeft" activeCell="A${sheet.freeze + 1}" sqref="A${sheet.freeze + 1}"/>`
    : '';
  const views = `<sheetViews><sheetView${sheet.first ? ' tabSelected="1"' : ''} workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>`;

  const cols = (sheet.cols && sheet.cols.length)
    ? '<cols>' + sheet.cols.map((w, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>'
    : '';
  const filter = sheet.autofilter ? `<autoFilter ref="${sheet.autofilter}"/>` : '';
  const merges = (sheet.merges && sheet.merges.length)
    ? `<mergeCells count="${sheet.merges.length}">` +
      sheet.merges.map(m => `<mergeCell ref="${m}"/>`).join('') + '</mergeCells>'
    : '';
  const dv = (sheet.validations && sheet.validations.length)
    ? `<dataValidations count="${sheet.validations.length}">` +
      sheet.validations.map(v =>
        `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="0" sqref="${v.ref}">` +
        `<formula1>${esc(v.list)}</formula1></dataValidation>`).join('') + '</dataValidations>'
    : '';
  const links = (sheet.hyperlinks && sheet.hyperlinks.length)
    ? '<hyperlinks>' + sheet.hyperlinks.map(h =>
        `<hyperlink ref="${h.ref}" location="${esc(h.location)}" display="${esc(h.display || '')}"/>`).join('') +
      '</hyperlinks>'
    : '';

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    sheetPr + views + '<sheetFormatPr defaultRowHeight="15"/>' + cols +
    '<sheetData>' + out.join('') + '</sheetData>' +
    filter + merges + dv + links +
    '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>' +
    (sheet.fitToPage
      ? `<pageSetup paperSize="9" orientation="${sheet.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>`
      : '') +
    '</worksheet>';
}

export function build(sheets, definedNames, path) {
  const files = [];

  let types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>';
  sheets.forEach((s, i) => {
    types += `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ` +
             'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
  });
  files.push({name: '[Content_Types].xml', data: types + '</Types>'});

  files.push({name: '_rels/.rels', data:
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
    '</Relationships>'});

  let wbSheets = '', wbRels = '';
  sheets.forEach((s, i) => {
    wbSheets += `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`;
    wbRels += `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`;
    files.push({name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s)});
  });
  wbRels += `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;

  const names = (definedNames || []).map(n =>
    `<definedName name="${esc(n.name)}">${esc(n.value)}</definedName>`).join('');

  files.push({name: 'xl/workbook.xml', data:
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' + wbSheets + '</sheets>' +
    (names ? '<definedNames>' + names + '</definedNames>' : '') +
    '<calcPr calcId="0" fullCalcOnLoad="1"/>' +
    '</workbook>'});

  files.push({name: 'xl/_rels/workbook.xml.rels', data:
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    wbRels + '</Relationships>'});

  files.push({name: 'xl/styles.xml', data: STYLES_XML});

  files.push({name: 'docProps/core.xml', data:
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" ' +
    'xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    '<dc:title>Système comptable SCF — Algérie</dc:title>' +
    '<dc:creator>FacturePro</dc:creator><cp:lastModifiedBy>FacturePro</cp:lastModifiedBy>' +
    '</cp:coreProperties>'});

  files.push({name: 'docProps/app.xml', data:
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
    '<Application>FacturePro</Application></Properties>'});

  const bytes = zip(files);
  writeFileSync(path, bytes);
  return bytes.length;
}
