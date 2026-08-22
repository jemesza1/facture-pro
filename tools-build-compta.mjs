/* Construit « Système comptable SCF — Algérie », un classeur Excel autonome.
 *
 *   node tools-build-compta.mjs        →  comptabilite-scf-dz.xlsx
 *
 * Ce n'est pas un export de l'application : le fichier ne dépend de rien, ne
 * se connecte à rien, et tout ce qu'il calcule, il le calcule avec des
 * formules Excel. On y saisit ses écritures dans une seule feuille — le
 * Journal — et les neuf autres s'en déduisent : grand livre, balance, coût des
 * ventes, compte de résultat, bilan, états analytiques.
 *
 * Deux principes ont décidé de la forme du classeur.
 *
 * 1. **Une seule feuille de saisie.** Un tableur comptable meurt le jour où il
 *    faut recopier le même montant à deux endroits, parce qu'un jour on ne le
 *    recopie pas. Le Journal est la seule feuille où l'on écrit des écritures ;
 *    partout ailleurs les cellules sont des formules. Les rares cellules
 *    modifiables hors Journal — l'identité de l'entreprise, l'exercice, les
 *    stocks initial et final, la table des produits — sont sur fond jaune, et
 *    c'est la seule chose que la couleur jaune signifie dans ce fichier.
 *
 * 2. **Le fichier se contrôle lui-même.** Un total débit qui n'égale pas le
 *    total crédit, un actif qui n'égale pas le passif, un compte qui n'existe
 *    pas au plan : ces trois erreurs sont invisibles à l'œil et fatales au
 *    dossier. Elles sont affichées en clair, sur la page d'accueil et au-dessus
 *    des tableaux concernés, plutôt que laissées à découvrir.
 *
 * Le référentiel est le SCF (arrêté du 26 juillet 2008) : c'est tools-scf-plan
 * qui le porte, et la nomenclature n'est pas reformulée.
 */
import { build, excelDate, colName } from './tools-xlsx-writer.mjs';
import { PLAN, BILAN, JOURNAUX, postable, bilanLine, isDeduction } from './tools-scf-plan.mjs';

/* ---- Repères ---------------------------------------------------------- */
const SH = {
  accueil: 'Accueil', plan: 'Plan comptable', centres: 'Centres de coûts',
  journal: 'Journal', gl: 'Grand livre', balance: 'Balance',
  cogs: 'Coût des ventes', resultat: 'Compte de résultat', bilan: 'Bilan',
  rapports: 'Rapports'
};
const q = n => `'${n}'`;                       /* un nom de feuille en formule */

const JR0 = 8, JR1 = 2007;                     /* les lignes de saisie du journal */
const GL0 = 8, GL1 = 407;                      /* les lignes du grand livre */
const CE0 = 8, CE1 = 57;                       /* les centres de coûts */
const POST = postable();
const BAL0 = 8, BAL1 = BAL0 + POST.length - 1;
const PLAN0 = 8;

const J = q(SH.journal), B = q(SH.balance), P = q(SH.plan), C = q(SH.centres);
const jD = `${J}!$D$${JR0}:$D$${JR1}`, jH = `${J}!$H$${JR0}:$H$${JR1}`;
const jI = `${J}!$I$${JR0}:$I$${JR1}`, jG = `${J}!$G$${JR0}:$G$${JR1}`;
const bG = `${B}!$G$${BAL0}:$G$${BAL1}`, bK = `${B}!$K$${BAL0}:$K$${BAL1}`;
const bL = `${B}!$L$${BAL0}:$L$${BAL1}`, bA = `${B}!$A$${BAL0}:$A$${BAL1}`;
const bH = `${B}!$H$${BAL0}:$H$${BAL1}`, bI = `${B}!$I$${BAL0}:$I$${BAL1}`;

/* Les produits sont créditeurs, les charges débitrices. La colonne G de la
   balance porte débit − crédit ; un produit en sort donc négatif, et se lit en
   inversant le signe. Ces deux fonctions existent pour qu'aucune ligne du
   compte de résultat n'ait à se souvenir de laquelle des deux elle est. */
const produit = (col, val) => `-SUMIF(${col},"${val}",${bG})`;
const charge = (col, val) => `SUMIF(${col},"${val}",${bG})`;

/* ---- Ossature commune -------------------------------------------------- */
function banner(rows, merges, width, fr, ar) {
  const last = colName(width - 1);
  rows.push([{v: fr, s: 'banner'}]);
  merges.push(`A1:${last}1`);
  rows.push([{v: ar, s: 'bannerSub'}]);
  merges.push(`A2:${last}2`);
  rows.push([{f: 'Societe&"   ·   Exercice "&Exercice', s: 'note'}]);
  merges.push(`A3:${last}3`);
  rows.push([]);
  return rows;
}

function money(f) { return {f, s: 'money'}; }

/* ====================================================================== *
 * 1. Accueil
 * ====================================================================== */
function sheetAccueil() {
  const rows = [], merges = [], hyperlinks = [];
  rows.push([{v: 'SYSTÈME COMPTABLE — SCF ALGÉRIE', s: 'banner'}]);
  merges.push('A1:F1');
  rows.push([{v: 'نظام محاسبي — النظام المحاسبي المالي الجزائري', s: 'bannerSub'}]);
  merges.push('A2:F2');
  rows.push([{v: 'Plan comptable · Journal · Grand livre · Balance · Coût des ventes · Compte de résultat · Bilan', s: 'note'}]);
  merges.push('A3:F3');
  rows.push([]);

  rows.push([null, {v: 'IDENTIFICATION DE L\'ENTREPRISE  —  تعريف المؤسسة', s: 'h2'}]);
  merges.push('B5:F5');
  const ident = [
    ['Raison sociale', 'التسمية الاجتماعية', 'Mon Entreprise SARL'],
    ['NIF', 'رقم التعريف الجبائي', ''],
    ['NIS', 'رقم التعريف الإحصائي', ''],
    ['Registre de commerce', 'السجل التجاري', ''],
    ['Article d\'imposition', 'المادة الجبائية', ''],
    ['Adresse', 'العنوان', '']
  ];
  ACC_SOCIETE_ROW = rows.length + 1;
  ident.forEach(([fr, ar, val]) => {
    rows.push([null, {v: fr, s: 'label'}, {v: val, s: 'input'}, null, {v: ar, s: 'small'}]);
  });
  ACC_EXERCICE_ROW = rows.length + 1;
  rows.push([null, {v: 'Exercice', s: 'label'}, {v: new Date().getFullYear(), s: 'input'},
             null, {v: 'السنة المالية', s: 'small'}]);
  rows.push([null, {v: 'Début d\'exercice', s: 'label'}, {f: 'DATE(Exercice,1,1)', s: 'date'},
             null, {v: 'بداية السنة', s: 'small'}]);
  rows.push([null, {v: 'Fin d\'exercice', s: 'label'}, {f: 'DATE(Exercice,12,31)', s: 'date'},
             null, {v: 'نهاية السنة', s: 'small'}]);
  /* Societe et Exercice sont les deux cellules que tout le classeur cite : le
     bandeau de chaque feuille, et le contrôle « hors exercice » du journal.
     Leur adresse est relevée ici et publiée sous forme de nom, pour que les
     autres feuilles n'aient pas à connaître une position qui bougerait à la
     première ligne insérée dans ce bloc. */
  rows.push([]);

  rows.push([null, {v: 'LES FEUILLES  —  أوراق العمل', s: 'h2'}]);
  merges.push(`B${rows.length}:F${rows.length}`);
  const menu = [
    [SH.plan,     'دليل الحسابات',  'La nomenclature du SCF, classes 1 à 7, et vos propres subdivisions.'],
    [SH.centres,  'مراكز التكلفة',  'Magasin, chantier, véhicule : ce que vous voulez suivre à part.'],
    [SH.journal,  'اليومية',        'La seule feuille où l\'on saisit. Une ligne par compte mouvementé.'],
    [SH.gl,       'الأستاذ العام',  'Le détail d\'un compte, avec son solde qui court.'],
    [SH.balance,  'ميزان المراجعة', 'Mouvements et soldes de tous les comptes. Le contrôle d\'équilibre.'],
    [SH.cogs,     'تكلفة المبيعات', 'Ce que les ventes ont coûté, et ce qu\'elles ont laissé.'],
    [SH.resultat, 'حساب النتائج',   'Le compte de résultat par nature, avec ses soldes intermédiaires.'],
    [SH.bilan,    'الميزانية',      'Actif et passif à la clôture, présentation de l\'arrêté de 2008.'],
    [SH.rapports, 'التقارير',       'TVA, trésorerie, tiers, charges par nature, résultat par centre.']
  ];
  menu.forEach(([name, ar, desc]) => {
    const r = rows.length + 1;
    rows.push([null, {v: '→  ' + name, s: 'link'}, null, {v: ar, s: 'small'}, {v: desc, s: 'small'}]);
    merges.push(`B${r}:C${r}`);
    merges.push(`E${r}:F${r}`);
    hyperlinks.push({ref: `B${r}`, location: `${q(name)}!A1`, display: name});
  });
  rows.push([]);

  rows.push([null, {v: 'CONTRÔLES  —  المراقبة', s: 'h2'}]);
  merges.push(`B${rows.length}:F${rows.length}`);
  const ctrl = [
    ['Total débit du journal', `SUM(${jH})`],
    ['Total crédit du journal', `SUM(${jI})`],
    ['Écart débit / crédit', `SUM(${jH})-SUM(${jI})`],
    ['Résultat net de l\'exercice', `${q(SH.resultat)}!$D$${RESULTAT_NET_ROW}`],
    ['Total actif', `${q(SH.bilan)}!$E$${BILAN_ACTIF_ROW}`],
    ['Total passif', `${q(SH.bilan)}!$E$${BILAN_PASSIF_ROW}`],
    ['Écart actif / passif', `${q(SH.bilan)}!$E$${BILAN_ACTIF_ROW}-${q(SH.bilan)}!$E$${BILAN_PASSIF_ROW}`]
  ];
  ctrl.forEach(([label, f]) => {
    rows.push([null, {v: label, s: 'label'}, {f, s: 'money'}]);
  });
  const eq = rows.length + 1;
  rows.push([null, {v: 'Le classeur est-il cohérent ?', s: 'label'},
             {f: `IF(AND(ROUND(C${eq - 5},2)=0,ROUND(C${eq - 1},2)=0),"OUI — débit = crédit et actif = passif",` +
                 `"NON — corrigez les écarts ci-dessus")`, s: 'ok'}]);
  merges.push(`C${eq}:F${eq}`);
  rows.push([]);

  rows.push([null, {v: 'MODE D\'EMPLOI  —  طريقة الاستعمال', s: 'h2'}]);
  merges.push(`B${rows.length}:F${rows.length}`);
  [
    '1. Renseignez l\'entreprise et l\'exercice ci-dessus. Tout le classeur en reprend le nom et l\'année.',
    '2. Ouvrez le Journal et saisissez vos écritures : une ligne par compte mouvementé, le débit à gauche, le crédit à droite. Le compte se choisit dans la liste déroulante.',
    '3. Une écriture est équilibrée quand son débit égale son crédit. Le total du journal, en haut de la feuille, le dit à chaque instant.',
    '4. Les dix lignes marquées EXEMPLE montrent une ouverture, une vente, un achat, un salaire, un amortissement et une déclaration de TVA. Supprimez-les avant de commencer.',
    '5. Tout le reste se calcule seul. Aucune autre feuille n\'attend de saisie, sauf les cellules jaunes du Coût des ventes.',
    '6. Le plan comptable est modifiable : ajoutez vos subdivisions à la suite du tableau (4111 pour un client suivi à part, 6131 pour un local précis) et recopiez la formule des colonnes de droite.'
  ].forEach(line => {
    const r = rows.length + 1;
    rows.push([null, {v: line, s: 'note'}]);
    merges.push(`B${r}:F${r}`);
  });

  return {
    name: SH.accueil, first: true, tabColor: '006233',
    cols: [3, 26, 26, 22, 34, 34], rows, merges, hyperlinks,
    heights: {1: 30, 2: 22}
  };
}

/* ====================================================================== *
 * 2. Plan comptable
 * ====================================================================== */
function sheetPlan() {
  const rows = [], merges = [];
  banner(rows, merges, 6, 'PLAN COMPTABLE — SCF', 'دليل الحسابات — النظام المحاسبي المالي');
  rows.push([{v: 'Arrêté du 26 juillet 2008. Les lignes grises sont des rubriques : on n\'y passe pas d\'écriture.', s: 'note'}]);
  merges.push('A5:F5');
  rows.push([]);
  rows.push([
    {v: 'Compte', s: 'thead'}, {v: 'Intitulé', s: 'thead'}, {v: 'التسمية', s: 'thead'},
    {v: 'Classe', s: 'thead'}, {v: 'Type', s: 'thead'}, {v: 'Rubrique du bilan', s: 'thead'}
  ]);
  PLAN.forEach(a => {
    rows.push([
      {v: a.c, s: a.h ? 'rubrique' : 'code'},
      {v: a.f, s: a.h ? 'rubrique' : 'cell'},
      {v: a.a, s: a.h ? 'rubrique' : 'ar'},
      {v: a.c.charAt(0), s: 'cellC'},
      {v: a.h ? 'Rubrique' : 'Compte', s: 'cellC'},
      {v: a.h ? '' : (bilanLine(a.c) || '—'), s: 'cellC'}
    ]);
  });

  /* Le bloc de droite est la liste de saisie : les comptes mouvementables,
     d'un seul tenant. Les listes déroulantes du journal, la recherche
     d'intitulé et la balance s'appuient toutes dessus, et c'est pour cela
     qu'il ne doit pas être trié ni troué. */
  const head = 7;
  rows[head - 1][7] = {v: 'Compte', s: 'thead'};
  rows[head - 1][8] = {v: 'Intitulé', s: 'thead'};
  rows[head - 1][9] = {v: 'Rubrique', s: 'thead'};
  rows[head - 1][10] = {v: 'Déd.', s: 'thead'};
  rows[head - 1][12] = {v: 'Journal', s: 'thead'};
  rows[head - 1][13] = {v: 'Libellé', s: 'thead'};
  rows[5] = rows[5] || [];
  rows[5][7] = {v: 'Liste de saisie — ne pas trier ni supprimer', s: 'label'};

  POST.forEach((a, i) => {
    const r = rows[PLAN0 - 1 + i];
    r[7] = {v: a.c, s: 'code'};
    r[8] = {v: a.f, s: 'cell'};
    r[9] = {v: bilanLine(a.c) || '', s: 'cellC'};
    r[10] = {v: isDeduction(a.c) ? 1 : 0, s: 'cellC'};
  });
  JOURNAUX.forEach((jr, i) => {
    const r = rows[PLAN0 - 1 + i];
    r[12] = {v: jr.c, s: 'cellC'};
    r[13] = {v: jr.f, s: 'cell'};
  });

  return {
    name: SH.plan, tabColor: '0284C7', freeze: 7,
    cols: [11, 56, 40, 8, 11, 16, 3, 11, 46, 12, 7, 3, 10, 24],
    rows, merges, autofilter: `A7:F7`, heights: {1: 30, 2: 22}
  };
}

/* ====================================================================== *
 * 3. Centres de coûts
 * ====================================================================== */
function sheetCentres() {
  const rows = [], merges = [];
  banner(rows, merges, 4, 'CENTRES DE COÛTS', 'مراكز التكلفة');
  rows.push([{v: 'Un centre s\'affecte sur une ligne du journal, colonne G. Les charges et les produits qui le portent se retrouvent dans Rapports.', s: 'note'}]);
  merges.push('A5:D5');
  rows.push([]);
  rows.push([{v: 'Code', s: 'thead'}, {v: 'Libellé', s: 'thead'},
             {v: 'التسمية', s: 'thead'}, {v: 'Note', s: 'thead'}]);
  const demo = [
    ['MAG1', 'Magasin centre', 'المحل المركزي', 'EXEMPLE'],
    ['CH01', 'Chantier Alger', 'ورشة الجزائر', 'EXEMPLE'],
    ['VEH1', 'Véhicule utilitaire', 'سيارة النفعية', 'EXEMPLE']
  ];
  for (let i = 0; i < CE1 - CE0 + 1; i++) {
    const d = demo[i];
    rows.push([{v: d ? d[0] : '', s: 'input'}, {v: d ? d[1] : '', s: 'input'},
               {v: d ? d[2] : '', s: 'ar'}, {v: d ? d[3] : '', s: 'cell'}]);
  }
  return {name: SH.centres, tabColor: '7C3AED', freeze: 7,
          cols: [14, 40, 34, 16], rows, merges, heights: {1: 30, 2: 22}};
}

/* ====================================================================== *
 * 4. Journal — la seule feuille de saisie
 * ====================================================================== */
function sheetJournal() {
  const rows = [], merges = [];
  banner(rows, merges, 10, 'JOURNAL GÉNÉRAL', 'اليومية العامة');
  rows.push([{v: 'Une ligne par compte mouvementé. Un montant en débit OU en crédit, jamais les deux. La colonne Contrôle signale ce qui cloche.', s: 'note'}]);
  merges.push('A5:J5');
  rows.push([
    {v: 'TOTAUX', s: 'total'}, {v: '', s: 'total'}, {v: '', s: 'total'},
    {v: '', s: 'total'}, {v: '', s: 'total'}, {v: '', s: 'total'}, {v: '', s: 'total'},
    {f: `SUM(H${JR0}:H${JR1})`, s: 'totalMoney'},
    {f: `SUM(I${JR0}:I${JR1})`, s: 'totalMoney'},
    {f: `IF(ROUND($H$6-$I$6,2)=0,"Équilibré","Écart : "&TEXT($H$6-$I$6,"#,##0.00"))`, s: 'ok'}
  ]);
  rows.push([
    {v: 'Date', s: 'thead'}, {v: 'Journal', s: 'thead'}, {v: 'N° pièce', s: 'thead'},
    {v: 'Compte', s: 'thead'}, {v: 'Intitulé du compte', s: 'thead'},
    {v: 'Libellé de l\'opération', s: 'thead'}, {v: 'Centre', s: 'thead'},
    {v: 'Débit', s: 'thead'}, {v: 'Crédit', s: 'thead'}, {v: 'Contrôle', s: 'thead'}
  ]);

  /* Dix écritures d'exemple : une ouverture, une vente à crédit et son
     encaissement, un achat et son règlement, un loyer, une paie, une vente au
     comptant, une dotation, une déclaration de TVA. Elles ne sont pas là pour
     décorer — ce sont les dix formes qu'un petit dossier prend, et les copier
     est plus rapide que les inventer. */
  const DEMO = [
    ['2026-01-01', 'AN', 'AN-2026', '2183', 'Matériel informatique', '', 80000, 0],
    ['2026-01-01', 'AN', 'AN-2026', '30', 'Stock de marchandises au 01/01', '', 300000, 0],
    ['2026-01-01', 'AN', 'AN-2026', '512', 'Solde bancaire au 01/01', '', 120000, 0],
    ['2026-01-01', 'AN', 'AN-2026', '101', 'Capital', '', 0, 500000],

    ['2026-01-05', 'VE', 'FAC-2026-001', '411', 'SARL Atlas — facture 001', 'MAG1', 119000, 0],
    ['2026-01-05', 'VE', 'FAC-2026-001', '700', 'Vente de marchandises', 'MAG1', 0, 100000],
    ['2026-01-05', 'VE', 'FAC-2026-001', '4457', 'TVA collectée 19 %', 'MAG1', 0, 19000],

    ['2026-01-20', 'BQ', 'REG-001', '512', 'Virement reçu — facture 001', '', 119000, 0],
    ['2026-01-20', 'BQ', 'REG-001', '411', 'SARL Atlas', '', 0, 119000],

    ['2026-01-07', 'AC', 'FA-FRS-014', '600', 'Achat de marchandises', 'MAG1', 60000, 0],
    ['2026-01-07', 'AC', 'FA-FRS-014', '44566', 'TVA déductible 19 %', 'MAG1', 11400, 0],
    ['2026-01-07', 'AC', 'FA-FRS-014', '401', 'Fournisseur Sahara', 'MAG1', 0, 71400],

    ['2026-01-25', 'BQ', 'REG-002', '401', 'Règlement fournisseur Sahara', '', 71400, 0],
    ['2026-01-25', 'BQ', 'REG-002', '512', 'Virement émis', '', 0, 71400],

    ['2026-01-31', 'AC', 'LOY-01', '613', 'Loyer du local — janvier', 'MAG1', 25000, 0],
    ['2026-01-31', 'AC', 'LOY-01', '512', 'Loyer du local — janvier', 'MAG1', 0, 25000],

    ['2026-01-31', 'OD', 'PAIE-01', '631', 'Salaires de janvier', 'MAG1', 45000, 0],
    ['2026-01-31', 'OD', 'PAIE-01', '431', 'CNAS part salariale', 'MAG1', 0, 9000],
    ['2026-01-31', 'OD', 'PAIE-01', '421', 'Net à payer au personnel', 'MAG1', 0, 36000],

    ['2026-02-03', 'CA', 'TICKET-02', '530', 'Vente au comptant', 'MAG1', 23800, 0],
    ['2026-02-03', 'CA', 'TICKET-02', '700', 'Vente de marchandises', 'MAG1', 0, 20000],
    ['2026-02-03', 'CA', 'TICKET-02', '4457', 'TVA collectée 19 %', 'MAG1', 0, 3800],

    ['2026-02-28', 'OD', 'AMORT-02', '681', 'Dotation aux amortissements', '', 1600, 0],
    ['2026-02-28', 'OD', 'AMORT-02', '281', 'Amortissement du matériel', '', 0, 1600],

    ['2026-03-31', 'OD', 'TVA-03', '4457', 'TVA collectée du trimestre', '', 22800, 0],
    ['2026-03-31', 'OD', 'TVA-03', '44566', 'TVA déductible du trimestre', '', 0, 11400],
    ['2026-03-31', 'OD', 'TVA-03', '4459', 'TVA à décaisser', '', 0, 11400]
  ];

  /* Les exemples sont écrits à la main, et une écriture d'exemple qui ne se
     boucle pas ferait mentir le contrôle d'équilibre dès l'ouverture — le
     premier chiffre que le classeur montre de lui-même. Vérifié à la
     construction plutôt qu'à la relecture. */
  const parPiece = {};
  DEMO.forEach(d => {
    parPiece[d[2]] = (parPiece[d[2]] || 0) + d[6] - d[7];
  });
  for (const [piece, ecart] of Object.entries(parPiece)) {
    if (Math.round(ecart * 100) !== 0)
      throw new Error(`écriture d'exemple déséquilibrée : ${piece}, écart ${ecart}`);
  }

  for (let r = JR0; r <= JR1; r++) {
    const d = DEMO[r - JR0];
    const row = [
      d ? {v: excelDate(d[0]), s: 'date'} : {v: '', s: 'date'},
      d ? {v: d[1], s: 'cellC'} : {v: '', s: 'cellC'},
      d ? {v: d[2], s: 'cell'} : {v: '', s: 'cell'},
      d ? {v: d[3], s: 'code'} : {v: '', s: 'code'},
      {f: `IF($D${r}="","",IFERROR(VLOOKUP($D${r},${P}!$H:$I,2,FALSE),"compte hors plan"))`, s: 'cell'},
      d ? {v: (d[4] || '') + (d ? '   ·   EXEMPLE' : ''), s: 'cell'} : {v: '', s: 'cell'},
      d ? {v: d[5] || '', s: 'cellC'} : {v: '', s: 'cellC'},
      d && d[6] ? {v: d[6], s: 'money'} : {v: '', s: 'money'},
      d && d[7] ? {v: d[7], s: 'money'} : {v: '', s: 'money'},
      {f: `IF($D${r}="","",IF(AND($H${r}<>"",$I${r}<>""),"débit ET crédit",` +
          `IF(AND($H${r}="",$I${r}=""),"montant manquant",` +
          `IF(ISNA(MATCH($D${r},${P}!$H:$H,0)),"compte hors plan",` +
          `IF(AND($A${r}<>"",YEAR($A${r})<>Exercice),"hors exercice","")))))`, s: 'cellC'}
    ];
    rows.push(row);
  }

  return {
    name: SH.journal, tabColor: '059669', freeze: 7,
    cols: [12, 9, 16, 11, 34, 40, 10, 16, 16, 18],
    rows, merges,
    autofilter: `A7:J7`,
    validations: [
      {ref: `B${JR0}:B${JR1}`, list: 'Journaux'},
      {ref: `D${JR0}:D${JR1}`, list: 'Comptes'},
      {ref: `G${JR0}:G${JR1}`, list: 'Centres'}
    ],
    heights: {1: 30, 2: 22}
  };
}

/* ====================================================================== *
 * 5. Grand livre
 * ====================================================================== */
function sheetGrandLivre() {
  const rows = [], merges = [];
  banner(rows, merges, 8, 'GRAND LIVRE', 'الأستاذ العام');
  rows.push([
    {v: 'Compte :', s: 'label'}, null,
    {v: '411', s: 'input'},
    {f: `IFERROR(VLOOKUP($C$5,${P}!$H:$I,2,FALSE),"—")`, s: 'cell'},
    null, null, null,
    {v: 'choisissez un compte en C5', s: 'small'}
  ]);
  merges.push('D5:G5');
  rows.push([
    {v: '', s: 'total'}, {v: '', s: 'total'}, {v: '', s: 'total'},
    {v: 'Totaux du compte', s: 'total'},
    {f: `SUMIF(${jD},$C$5,${jH})`, s: 'totalMoney'},
    {f: `SUMIF(${jD},$C$5,${jI})`, s: 'totalMoney'},
    {f: '$E$6-$F$6', s: 'totalMoney'},
    {v: '', s: 'total'}
  ]);
  rows.push([
    {v: 'Date', s: 'thead'}, {v: 'Journal', s: 'thead'}, {v: 'N° pièce', s: 'thead'},
    {v: 'Libellé', s: 'thead'}, {v: 'Débit', s: 'thead'}, {v: 'Crédit', s: 'thead'},
    {v: 'Solde cumulé', s: 'thead'}, {v: 'réf. (technique)', s: 'thead'}
  ]);

  /* SMALL(SI(…)) rend la k-ième ligne du journal qui porte le compte demandé.
     C'est une formule matricielle, et elle est déclarée comme telle dans le
     fichier : sans cela le tableur l'évalue en intersection implicite et rend
     #VALEUR!, exactement comme si on l'avait tapée sans Ctrl+Maj+Entrée.
     AGGREGATE(15;6;…) ferait la même chose sans être matriciel, mais c'est une
     fonction postérieure à 2007 : elle doit s'écrire _xlfn.AGGREGATE dans le
     format de fichier, et tous les tableurs ne la retrouvent pas. SMALL et SI
     existent partout depuis toujours.
     La position est calculée une fois par ligne, en colonne H, et les six
     colonnes de gauche la réutilisent — la calculer six fois multiplierait par
     six le temps de recalcul de la feuille. */
  for (let r = GL0; r <= GL1; r++) {
    const k = r - GL0 + 1;
    const idx = `$H${r}`;
    rows.push([
      {f: `IF(${idx}="","",INDEX(${J}!$A$${JR0}:$A$${JR1},${idx}))`, s: 'date'},
      {f: `IF(${idx}="","",INDEX(${J}!$B$${JR0}:$B$${JR1},${idx}))`, s: 'cellC'},
      {f: `IF(${idx}="","",INDEX(${J}!$C$${JR0}:$C$${JR1},${idx}))`, s: 'cell'},
      {f: `IF(${idx}="","",INDEX(${J}!$F$${JR0}:$F$${JR1},${idx}))`, s: 'cell'},
      {f: `IF(${idx}="","",INDEX(${jH},${idx}))`, s: 'money'},
      {f: `IF(${idx}="","",INDEX(${jI},${idx}))`, s: 'money'},
      {f: `IF(${idx}="","",N(G${r - 1})+N(E${r})-N(F${r}))`, s: 'money'},
      {f: `IFERROR(SMALL(IF(${jD}=$C$5,ROW(${jD})-${JR0 - 1}),${k}),"")`, array: true, s: 'cellC'}
    ]);
  }

  return {
    name: SH.gl, tabColor: 'D97706', freeze: 7,
    cols: [12, 9, 16, 44, 16, 16, 18, 14],
    rows, merges,
    validations: [{ref: 'C5', list: 'Comptes'}],
    heights: {1: 30, 2: 22}
  };
}

/* ====================================================================== *
 * 6. Balance
 * ====================================================================== */
function sheetBalance() {
  const rows = [], merges = [];
  banner(rows, merges, 12, 'BALANCE GÉNÉRALE', 'ميزان المراجعة');
  rows.push([{f: `IF(ROUND(SUM(C${BAL0}:C${BAL1})-SUM(D${BAL0}:D${BAL1}),2)=0,` +
                 `"Balance équilibrée : total débit = total crédit.",` +
                 `"Balance déséquilibrée — écart de "&TEXT(SUM(C${BAL0}:C${BAL1})-SUM(D${BAL0}:D${BAL1}),"#,##0.00")&" DA. Une écriture du journal ne se boucle pas.")`,
              s: 'note'}]);
  merges.push('A5:F5');
  rows.push([]);
  rows.push([
    {v: 'Compte', s: 'thead'}, {v: 'Intitulé', s: 'thead'},
    {v: 'Mouvement débit', s: 'thead'}, {v: 'Mouvement crédit', s: 'thead'},
    {v: 'Solde débiteur', s: 'thead'}, {v: 'Solde créditeur', s: 'thead'},
    {v: 'Solde signé', s: 'thead'}, {v: 'Rubrique', s: 'thead'},
    {v: 'Déd.', s: 'thead'}, {v: 'Cl.', s: 'thead'},
    {v: 'Préf. 2', s: 'thead'}, {v: 'Préf. 3', s: 'thead'}
  ]);
  POST.forEach((a, i) => {
    const r = BAL0 + i;
    rows.push([
      {v: a.c, s: 'code'},
      {v: a.f, s: 'cell'},
      {f: `SUMIF(${jD},$A${r},${jH})`, s: 'money'},
      {f: `SUMIF(${jD},$A${r},${jI})`, s: 'money'},
      {f: `IF($C${r}-$D${r}>0,$C${r}-$D${r},0)`, s: 'money'},
      {f: `IF($D${r}-$C${r}>0,$D${r}-$C${r},0)`, s: 'money'},
      {f: `$C${r}-$D${r}`, s: 'money'},
      {v: bilanLine(a.c) || '', s: 'cellC'},
      {v: isDeduction(a.c) ? 1 : 0, s: 'cellC'},
      {v: a.c.charAt(0), s: 'cellC'},
      {v: a.c.slice(0, 2), s: 'cellC'},
      {v: a.c.slice(0, 3), s: 'cellC'}
    ]);
  });
  rows.push([
    {v: 'TOTAUX', s: 'total'}, {v: '', s: 'total'},
    {f: `SUM(C${BAL0}:C${BAL1})`, s: 'totalMoney'},
    {f: `SUM(D${BAL0}:D${BAL1})`, s: 'totalMoney'},
    {f: `SUM(E${BAL0}:E${BAL1})`, s: 'totalMoney'},
    {f: `SUM(F${BAL0}:F${BAL1})`, s: 'totalMoney'},
    {f: `SUM(G${BAL0}:G${BAL1})`, s: 'totalMoney'}
  ]);
  rows.push([{v: 'Les six colonnes de droite servent au bilan et au compte de résultat. Elles ne se saisissent pas et ne se suppriment pas.', s: 'note'}]);
  merges.push(`A${rows.length}:L${rows.length}`);

  return {
    name: SH.balance, tabColor: '475569', freeze: 7,
    cols: [11, 52, 17, 17, 17, 17, 17, 12, 7, 6, 9, 9],
    rows, merges, autofilter: `A7:L7`, heights: {1: 30, 2: 22}
  };
}

/* ====================================================================== *
 * 7. Coût des ventes
 * ====================================================================== */
const COGS0 = 9, COGS1 = 38;

function sheetCogs() {
  const rows = [], merges = [];
  banner(rows, merges, 8, 'COÛT DES VENTES ET MARGE', 'تكلفة المبيعات والهامش');
  rows.push([{v: 'Deux lectures de la même chose. En haut, produit par produit, à partir de ce que vous saisissez ici. En bas, ce que disent les comptes du journal.', s: 'note'}]);
  merges.push('A5:H5');
  rows.push([]);
  rows.push([{v: 'PAR PRODUIT  —  حسب المنتج   (cellules jaunes : à saisir)', s: 'h2'}]);
  merges.push('A7:H7');
  rows.push([
    {v: 'Désignation', s: 'thead'}, {v: 'Quantité vendue', s: 'thead'},
    {v: 'Prix de vente HT', s: 'thead'}, {v: 'Prix d\'achat HT', s: 'thead'},
    {v: 'Ventes HT', s: 'thead'}, {v: 'Coût d\'achat', s: 'thead'},
    {v: 'Marge', s: 'thead'}, {v: 'Taux', s: 'thead'}
  ]);
  const demo = [
    ['Ciment CPJ 42.5 — sac 50 kg', 400, 850, 620],
    ['Rond à béton Ø10 — barre', 120, 1250, 980],
    ['Peinture intérieure — 20 L', 35, 4200, 2950]
  ];
  for (let r = COGS0; r <= COGS1; r++) {
    const d = demo[r - COGS0];
    rows.push([
      {v: d ? d[0] : '', s: 'input'},
      {v: d ? d[1] : '', s: 'input'},
      {v: d ? d[2] : '', s: 'inputMoney'},
      {v: d ? d[3] : '', s: 'inputMoney'},
      {f: `IF($A${r}="","",N($B${r})*N($C${r}))`, s: 'money'},
      {f: `IF($A${r}="","",N($B${r})*N($D${r}))`, s: 'money'},
      {f: `IF($A${r}="","",N($E${r})-N($F${r}))`, s: 'money'},
      {f: `IF(N($E${r})=0,"",N($G${r})/N($E${r})*100)`, s: 'pct'}
    ]);
  }
  const tr = rows.length + 1;
  rows.push([
    {v: 'TOTAL', s: 'total'}, {v: '', s: 'total'}, {v: '', s: 'total'}, {v: '', s: 'total'},
    {f: `SUM(E${COGS0}:E${COGS1})`, s: 'totalMoney'},
    {f: `SUM(F${COGS0}:F${COGS1})`, s: 'totalMoney'},
    {f: `SUM(G${COGS0}:G${COGS1})`, s: 'totalMoney'},
    {f: `IF($E${tr}=0,"",$G${tr}/$E${tr}*100)`, s: 'pct'}
  ]);
  rows.push([]);

  const accHead = rows.length + 1;
  rows.push([{v: 'CE QUE DISENT LES COMPTES  —  ما تقوله الحسابات', s: 'h2'}]);
  merges.push(`A${accHead}:H${accHead}`);
  const lines = [
    ['Ventes de l\'exercice (comptes 70)', produit(bK, '70'), 'money'],
    ['Stock initial de marchandises', null, 'inputMoney'],
    ['Achats consommés (comptes 60)', charge(bK, '60'), 'money'],
    ['Stock final de marchandises', null, 'inputMoney'],
    ['Coût des marchandises vendues', null, 'money'],
    ['Marge brute', null, 'totalMoney'],
    ['Taux de marge', null, 'pct']
  ];
  const base = rows.length + 1;
  lines.forEach(([label, f, s], i) => {
    const r = base + i;
    let formula = f;
    if (i === 4) formula = `N($C${base + 1})+N($C${base + 2})-N($C${base + 3})`;
    if (i === 5) formula = `N($C${base})-N($C${base + 4})`;
    if (i === 6) formula = `IF(N($C${base})=0,"",N($C${base + 5})/N($C${base})*100)`;
    rows.push([{v: label, s: i >= 5 ? 'total' : 'label'}, null,
               formula ? {f: formula, s} : {v: i === 1 ? 300000 : 260000, s}]);
    merges.push(`A${r}:B${r}`);
  });
  rows.push([]);
  const nr = rows.length + 1;
  rows.push([{v: 'Le SCF tient l\'inventaire intermittent : le coût des marchandises vendues ne se constate pas vente par vente, il se déduit en fin d\'exercice du stock initial, des achats et du stock final. Le tableau du haut est une estimation de gestion, celui du bas est le chiffre comptable. Les deux ne coïncident que si tout ce qui a été acheté a été vendu.', s: 'note'}]);
  merges.push(`A${nr}:H${nr}`);

  return {name: SH.cogs, tabColor: 'EA580C', freeze: 8,
          cols: [42, 15, 17, 17, 17, 17, 17, 10], rows, merges, heights: {1: 30, 2: 22}};
}

/* ====================================================================== *
 * 8. Compte de résultat
 * ====================================================================== */
/* Les trois lignes que les autres feuilles citent. Elles sont relevées à la
   construction plutôt qu'écrites en dur : une rubrique ajoutée au bilan
   décalerait un total, et un renvoi périmé donnerait un contrôle d'équilibre
   qui rassure sur la mauvaise cellule. */
let RESULTAT_NET_ROW = 0, BILAN_ACTIF_ROW = 0, BILAN_PASSIF_ROW = 0;
let ACC_SOCIETE_ROW = 0, ACC_EXERCICE_ROW = 0;

function sheetResultat() {
  const rows = [], merges = [];
  banner(rows, merges, 4, 'COMPTE DE RÉSULTAT PAR NATURE', 'حساب النتائج حسب الطبيعة');
  rows.push([{v: 'Présentation de l\'arrêté du 26 juillet 2008, avec ses soldes intermédiaires de gestion.', s: 'note'}]);
  merges.push('A5:D5');
  rows.push([]);
  rows.push([{v: '', s: 'thead'}, {v: 'Rubrique', s: 'thead'},
             {v: 'التسمية', s: 'thead'}, {v: 'Exercice', s: 'thead'}]);

  /* L'ordre, les numéros romains et les mots sont ceux de l'arrêté : c'est un
     état qu'un comptable compare ligne à ligne avec la liasse. */
  const L = [
    ['',     'Ventes et produits annexes', 'المبيعات والمنتوجات الملحقة', produit(bK, '70')],
    ['',     'Variation stocks produits finis et en cours', 'تغير مخزونات المنتجات التامة وقيد التنفيذ', produit(bK, '72')],
    ['',     'Production immobilisée', 'الإنتاج المثبت', produit(bK, '73')],
    ['',     'Subventions d\'exploitation', 'إعانات الاستغلال', produit(bK, '74')],
    ['I',    'PRODUCTION DE L\'EXERCICE', 'إنتاج السنة المالية', 'SUM($D$8:$D$11)', 1],
    ['',     'Achats consommés', 'المشتريات المستهلكة', charge(bK, '60')],
    ['',     'Services extérieurs et autres consommations', 'الخدمات الخارجية والاستهلاكات الأخرى', `${charge(bK, '61')}+${charge(bK, '62')}`],
    ['II',   'CONSOMMATION DE L\'EXERCICE', 'استهلاكات السنة المالية', '$D$13+$D$14', 1],
    ['III',  'VALEUR AJOUTÉE D\'EXPLOITATION', 'القيمة المضافة للاستغلال', '$D$12-$D$15', 1],
    ['',     'Charges de personnel', 'أعباء المستخدمين', charge(bK, '63')],
    ['',     'Impôts, taxes et versements assimilés', 'الضرائب والرسوم والمدفوعات المماثلة', charge(bK, '64')],
    ['IV',   'EXCÉDENT BRUT D\'EXPLOITATION', 'الفائض الإجمالي عن الاستغلال', '$D$16-$D$17-$D$18', 1],
    ['',     'Autres produits opérationnels', 'المنتوجات العملياتية الأخرى', produit(bK, '75')],
    ['',     'Autres charges opérationnelles', 'الأعباء العملياتية الأخرى', charge(bK, '65')],
    ['',     'Dotations aux amortissements, provisions et pertes de valeur', 'مخصصات الاهتلاكات والمؤونات وخسائر القيمة', charge(bK, '68')],
    ['',     'Reprise sur pertes de valeur et provisions', 'استئناف خسائر القيمة والمؤونات', produit(bK, '78')],
    ['V',    'RÉSULTAT OPÉRATIONNEL', 'النتيجة العملياتية', '$D$19+$D$20-$D$21-$D$22+$D$23', 1],
    ['',     'Produits financiers', 'المنتوجات المالية', produit(bK, '76')],
    ['',     'Charges financières', 'الأعباء المالية', charge(bK, '66')],
    ['VI',   'RÉSULTAT FINANCIER', 'النتيجة المالية', '$D$25-$D$26', 1],
    ['VII',  'RÉSULTAT ORDINAIRE AVANT IMPÔTS', 'النتيجة العادية قبل الضرائب', '$D$24+$D$27', 1],
    ['',     'Impôts exigibles sur résultats ordinaires', 'الضرائب الواجبة على النتائج العادية', `${charge(bL, '695')}+${charge(bL, '698')}`],
    ['',     'Impôts différés sur résultats ordinaires', 'الضرائب المؤجلة على النتائج العادية', `${charge(bL, '692')}+${charge(bL, '693')}`],
    ['',     'TOTAL DES PRODUITS DES ACTIVITÉS ORDINAIRES', 'مجموع منتوجات الأنشطة العادية', '$D$8+$D$9+$D$10+$D$11+$D$20+$D$23+$D$25'],
    ['',     'TOTAL DES CHARGES DES ACTIVITÉS ORDINAIRES', 'مجموع أعباء الأنشطة العادية', '$D$13+$D$14+$D$17+$D$18+$D$21+$D$22+$D$26+$D$29+$D$30'],
    ['VIII', 'RÉSULTAT NET DES ACTIVITÉS ORDINAIRES', 'النتيجة الصافية للأنشطة العادية', '$D$31-$D$32', 1],
    ['',     'Éléments extraordinaires — produits', 'العناصر غير العادية — منتوجات', produit(bK, '77')],
    ['',     'Éléments extraordinaires — charges', 'العناصر غير العادية — أعباء', charge(bK, '67')],
    ['IX',   'RÉSULTAT NET DE L\'EXERCICE', 'النتيجة الصافية للسنة المالية', '$D$33+$D$34-$D$35', 1]
  ];
  L.forEach(([roman, fr, ar, f, strong]) => {
    rows.push([
      {v: roman, s: strong ? 'total' : 'cellC'},
      {v: fr, s: strong ? 'total' : 'cell'},
      {v: ar, s: strong ? 'total' : 'ar'},
      {f, s: strong ? 'totalMoney' : 'money'}
    ]);
  });
  const nr = rows.length + 2;
  rows.push([]);
  rows.push([{v: 'Les amortissements, les charges sociales et la variation de stock n\'apparaissent que si vous les avez passés en écriture : ce document restitue le journal, il ne le complète pas.', s: 'note'}]);
  merges.push(`A${nr}:D${nr}`);

  RESULTAT_NET_ROW = 7 + L.length;
  return {name: SH.resultat, tabColor: '0D9488', fitToPage: true,
          cols: [7, 58, 46, 20], rows, merges, heights: {1: 30, 2: 22}};
}

/* ====================================================================== *
 * 9. Bilan
 * ====================================================================== */
function sheetBilan() {
  const rows = [], merges = [];
  banner(rows, merges, 5, 'BILAN', 'الميزانية');
  rows.push([{v: 'Actif au brut, diminué des amortissements et des pertes de valeur. Passif au net. Le résultat de l\'exercice vient du compte de résultat : aucune écriture de clôture n\'est passée par ce classeur.', s: 'note'}]);
  merges.push('A5:E5');
  rows.push([]);

  const A = {}, PAS = {};
  BILAN.actif.forEach(l => { A[l.k] = l; });
  BILAN.passif.forEach(l => { PAS[l.k] = l; });

  rows.push([{v: 'ACTIF', s: 'thead'}, {v: 'الأصول', s: 'thead'},
             {v: 'Brut', s: 'thead'}, {v: 'Amort. / Prov.', s: 'thead'}, {v: 'Net', s: 'thead'}]);

  const NC = ['AN_GW','AN_INC','AN_TER','AN_BAT','AN_AUT','AN_CONC','AN_ENC','AN_FIN','AN_PRET','AN_IDA'];
  const CO = ['AC_STK','AC_CLI','AC_DEB','AC_IMP','AC_AUT','AC_PLA','AC_TRE'];
  const CP = ['CP_CAP','CP_NAP','CP_PRI','CP_REE','CP_EQU','CP_RES','CP_ART'];
  const PNC = ['PN_EMP','PN_IDP','PN_AUT','PN_PRO'];
  const PC = ['PC_FRN','PC_IMP','PC_AUT','PC_TRE'];

  function actifRow(k) {
    const r = rows.length + 1;
    rows.push([
      {v: A[k].f, s: 'cell'}, {v: A[k].a, s: 'ar'},
      {f: `SUMIFS(${bG},${bH},"${k}",${bI},0)`, s: 'money'},
      {f: `-SUMIFS(${bG},${bH},"${k}",${bI},1)`, s: 'money'},
      {f: `$C${r}-$D${r}`, s: 'money'}
    ]);
  }
  function section(fr, ar, width) {
    const r = rows.length + 1;
    rows.push([{v: fr, s: 'section'}, {v: ar, s: 'section'},
               {v: '', s: 'section'}, {v: '', s: 'section'}, {v: '', s: 'section'}]);
    void width; void r;
  }
  function totalRow(fr, a, b) {
    const r = rows.length + 1;
    rows.push([{v: fr, s: 'total'}, {v: '', s: 'total'},
               {f: `SUM(C${a}:C${b})`, s: 'totalMoney'},
               {f: `SUM(D${a}:D${b})`, s: 'totalMoney'},
               {f: `SUM(E${a}:E${b})`, s: 'totalMoney'}]);
    return r;
  }

  section('ACTIF NON COURANT', 'الأصول غير الجارية');
  const nc0 = rows.length + 1;
  NC.forEach(actifRow);
  const ncT = totalRow('Total actif non courant', nc0, rows.length);
  section('ACTIF COURANT', 'الأصول الجارية');
  const co0 = rows.length + 1;
  CO.forEach(actifRow);
  const coT = totalRow('Total actif courant', co0, rows.length);
  const actifT = rows.length + 1;
  rows.push([{v: 'TOTAL ACTIF', s: 'total'}, {v: 'مجموع الأصول', s: 'total'},
             {f: `C${ncT}+C${coT}`, s: 'grand'},
             {f: `D${ncT}+D${coT}`, s: 'grand'},
             {f: `E${ncT}+E${coT}`, s: 'grand'}]);
  rows.push([]);

  rows.push([{v: 'PASSIF', s: 'thead'}, {v: 'الخصوم', s: 'thead'},
             {v: '', s: 'thead'}, {v: '', s: 'thead'}, {v: 'Net', s: 'thead'}]);
  function passifRow(k) {
    /* Le résultat de l'exercice n'est pas dans les comptes : aucune écriture
       ne l'y a mis. Il est repris du compte de résultat, et c'est ce qui rend
       les deux colonnes égales — la somme de tous les soldes valant zéro,
       l'écart entre l'actif et le passif est exactement le résultat. */
    const extra = (k === 'CP_RES') ? `+${q(SH.resultat)}!$D$${RESULTAT_NET_ROW}` : '';
    rows.push([
      {v: PAS[k].f, s: 'cell'}, {v: PAS[k].a, s: 'ar'},
      {v: '', s: 'cell'}, {v: '', s: 'cell'},
      {f: `-SUMIFS(${bG},${bH},"${k}")${extra}`, s: 'money'}
    ]);
  }
  function passifTotal(fr, a, b) {
    const r = rows.length + 1;
    rows.push([{v: fr, s: 'total'}, {v: '', s: 'total'}, {v: '', s: 'total'},
               {v: '', s: 'total'}, {f: `SUM(E${a}:E${b})`, s: 'totalMoney'}]);
    return r;
  }
  section('CAPITAUX PROPRES', 'رؤوس الأموال الخاصة');
  const cp0 = rows.length + 1;
  CP.forEach(passifRow);
  const cpT = passifTotal('Total capitaux propres', cp0, rows.length);
  section('PASSIFS NON COURANTS', 'الخصوم غير الجارية');
  const pnc0 = rows.length + 1;
  PNC.forEach(passifRow);
  const pncT = passifTotal('Total passifs non courants', pnc0, rows.length);
  section('PASSIFS COURANTS', 'الخصوم الجارية');
  const pc0 = rows.length + 1;
  PC.forEach(passifRow);
  const pcT = passifTotal('Total passifs courants', pc0, rows.length);
  const passifT = rows.length + 1;
  rows.push([{v: 'TOTAL PASSIF', s: 'total'}, {v: 'مجموع الخصوم', s: 'total'},
             {v: '', s: 'total'}, {v: '', s: 'total'},
             {f: `E${cpT}+E${pncT}+E${pcT}`, s: 'grand'}]);
  rows.push([]);
  const ck = rows.length + 1;
  rows.push([{f: `IF(ROUND($E$${actifT}-$E$${passifT},2)=0,"Bilan équilibré : total actif = total passif.",` +
                 `"Écart de "&TEXT($E$${actifT}-$E$${passifT},"#,##0.00")&" DA entre l'actif et le passif — vérifiez le journal.")`,
              s: 'ok'}]);
  merges.push(`A${ck}:E${ck}`);

  BILAN_ACTIF_ROW = actifT;
  BILAN_PASSIF_ROW = passifT;

  return {name: SH.bilan, tabColor: '4338CA', fitToPage: true,
          cols: [54, 40, 18, 18, 18], rows, merges, heights: {1: 30, 2: 22}};
}

/* ====================================================================== *
 * 10. Rapports
 * ====================================================================== */
function sheetRapports() {
  const rows = [], merges = [];
  banner(rows, merges, 5, 'RAPPORTS', 'التقارير');
  rows.push([{v: 'TVA, trésorerie, tiers, charges par nature, résultat par centre de coût. Tout est déduit du journal.', s: 'note'}]);
  merges.push('A5:E5');
  rows.push([]);

  const solde = code => `SUMIF(${bA},"${code}",${bG})`;

  function block(titleFr, titleAr, lines) {
    const h = rows.length + 1;
    rows.push([{v: titleFr, s: 'h2'}, {v: titleAr, s: 'h2'}, {v: '', s: 'h2'}]);
    merges.push(`A${h}:C${h}`);
    lines.forEach(([fr, ar, f, strong]) => {
      rows.push([{v: fr, s: strong ? 'total' : 'cell'},
                 {v: ar, s: strong ? 'total' : 'ar'},
                 {f, s: strong ? 'totalMoney' : 'money'}]);
    });
    rows.push([]);
    return h;
  }

  const tvaTop = rows.length + 2;
  block('TVA  —  الرسم على القيمة المضافة', '', [
    ['TVA collectée (4457)', 'الرسم المحصل', `-${solde('4457')}`],
    ['TVA déductible sur biens et services (44566)', 'الرسم القابل للخصم — سلع وخدمات', solde('44566')],
    ['TVA déductible sur immobilisations (44562)', 'الرسم القابل للخصم — تثبيتات', solde('44562')],
    ['TVA à décaisser', 'الرسم الواجب دفعه', `MAX(0,C${tvaTop}-C${tvaTop + 1}-C${tvaTop + 2})`, 1],
    ['Précompte TVA reporté', 'الرصيد المرحل', `MAX(0,C${tvaTop + 1}+C${tvaTop + 2}-C${tvaTop})`],
    ['Droit de timbre encaissé (442)', 'رسم الطابع المحصل', `-${solde('442')}`]
  ]);

  const trTop = rows.length + 2;
  block('TRÉSORERIE  —  الخزينة', '', [
    ['Caisse (530)', 'الصندوق', solde('530')],
    ['Banque (512)', 'البنك', solde('512')],
    ['CCP (515)', 'الحساب الجاري البريدي', solde('515')],
    ['Total disponible', 'مجموع المتاح', `SUM(C${trTop}:C${trTop + 2})`, 1]
  ]);

  block('TIERS  —  الأغيار', '', [
    ['Clients (411) — solde débiteur', 'الزبائن', solde('411')],
    ['Fournisseurs (401) — solde créditeur', 'الموردون', `-${solde('401')}`],
    ['Personnel (421)', 'المستخدمون', `-${solde('421')}`],
    ['Organismes sociaux (431)', 'الهيئات الاجتماعية', `-${solde('431')}`]
  ]);

  const chTop = rows.length + 2;
  block('CHARGES PAR NATURE  —  الأعباء حسب الطبيعة', '', [
    ['60 — Achats consommés', 'المشتريات المستهلكة', charge(bK, '60')],
    ['61 — Services extérieurs', 'الخدمات الخارجية', charge(bK, '61')],
    ['62 — Autres services extérieurs', 'الخدمات الخارجية الأخرى', charge(bK, '62')],
    ['63 — Charges de personnel', 'أعباء المستخدمين', charge(bK, '63')],
    ['64 — Impôts et taxes', 'الضرائب والرسوم', charge(bK, '64')],
    ['65 — Autres charges opérationnelles', 'الأعباء العملياتية الأخرى', charge(bK, '65')],
    ['66 — Charges financières', 'الأعباء المالية', charge(bK, '66')],
    ['68 — Dotations', 'المخصصات', charge(bK, '68')],
    ['Total des charges', 'مجموع الأعباء', `SUM(C${chTop}:C${chTop + 7})`, 1]
  ]);

  const anH = rows.length + 1;
  rows.push([{v: 'RÉSULTAT PAR CENTRE DE COÛT  —  النتيجة حسب مركز التكلفة', s: 'h2'},
             {v: '', s: 'h2'}, {v: '', s: 'h2'}, {v: '', s: 'h2'}]);
  merges.push(`A${anH}:D${anH}`);
  rows.push([{v: 'Centre', s: 'thead'}, {v: 'Produits', s: 'thead'},
             {v: 'Charges', s: 'thead'}, {v: 'Résultat', s: 'thead'}]);
  /* Un centre ne porte pas de compte : il porte des lignes. La classe du
     compte de la ligne décide si elle est un produit ou une charge, d'où le
     LEFT(...,1) — SUMIFS ne sait pas filtrer sur un préfixe d'une autre
     colonne, SUMPRODUCT si. */
  for (let i = 0; i < 20; i++) {
    const cr = CE0 + i, r = rows.length + 1;
    rows.push([
      {f: `IF(${C}!$A$${cr}="","",${C}!$A$${cr}&"  "&${C}!$B$${cr})`, s: 'cell'},
      {f: `IF(${C}!$A$${cr}="","",-SUMPRODUCT((${jG}=${C}!$A$${cr})*(LEFT(${jD},1)="7")*(${jH}-${jI})))`, s: 'money'},
      {f: `IF(${C}!$A$${cr}="","",SUMPRODUCT((${jG}=${C}!$A$${cr})*(LEFT(${jD},1)="6")*(${jH}-${jI})))`, s: 'money'},
      {f: `IF(${C}!$A$${cr}="","",N($B${r})-N($C${r}))`, s: 'money'}
    ]);
  }
  const na = rows.length + 2;
  rows.push([]);
  rows.push([{v: 'Une ligne du journal sans centre n\'apparaît dans aucune de ces lignes : la somme des centres est inférieure au résultat de l\'exercice tant que tout n\'est pas affecté.', s: 'note'}]);
  merges.push(`A${na}:D${na}`);

  return {name: SH.rapports, tabColor: 'BE123C',
          cols: [46, 34, 20, 20, 20], rows, merges, heights: {1: 30, 2: 22}};
}

/* ====================================================================== */
/* L'accueil est construit en dernier et rangé en premier : ses contrôles
   citent des lignes que le compte de résultat et le bilan ne connaissent
   qu'une fois assemblés. */
const resultat = sheetResultat();
const bilan = sheetBilan();
const sheets = [
  sheetAccueil(), sheetPlan(), sheetCentres(), sheetJournal(), sheetGrandLivre(),
  sheetBalance(), sheetCogs(), resultat, bilan, sheetRapports()
];

const definedNames = [
  {name: 'Societe',  value: `${q(SH.accueil)}!$C$${ACC_SOCIETE_ROW}`},
  {name: 'Exercice', value: `${q(SH.accueil)}!$C$${ACC_EXERCICE_ROW}`},
  {name: 'Comptes',  value: `${P}!$H$${PLAN0}:$H$${PLAN0 + POST.length - 1}`},
  {name: 'Journaux', value: `${P}!$M$${PLAN0}:$M$${PLAN0 + JOURNAUX.length - 1}`},
  {name: 'Centres',  value: `${C}!$A$${CE0}:$A$${CE1}`}
];

const out = process.argv[2] || 'comptabilite-scf-dz.xlsx';
const size = build(sheets, definedNames, out);
console.log(`${out} — ${sheets.length} feuilles, ${POST.length} comptes mouvementables, ` +
            `${JR1 - JR0 + 1} lignes de journal, ${(size / 1024).toFixed(0)} Ko`);
