/* Le plan comptable du SCF algérien — données pures.
 *
 * Le référentiel est le Système Comptable Financier (loi 07-11 du 25 novembre
 * 2007, arrêté du 26 juillet 2008). Ce module ne contient que la nomenclature
 * et de quoi classer un compte ; il est importé par tools-build-compta.mjs,
 * qui en fait un classeur Excel.
 *
 * Cinq champs par compte, et ils servent tous :
 *
 *   c  le code. C'est lui l'identité — un libellé se traduit et se renomme,
 *      un code se retrouve dans le logiciel du comptable.
 *   f  le libellé français, celui de l'arrêté. Il n'est pas reformulé : une
 *      liasse fiscale se lit avec les mots de la nomenclature.
 *   a  le libellé arabe. Il n'est pas optionnel — la moitié des utilisateurs
 *      lisent l'arabe, et une balance à moitié française est illisible.
 *   b  la ligne du bilan où le solde du compte se range. Elle est portée par
 *      le compte et non déduite du préfixe, parce que la classe 4 se répartit
 *      des deux côtés du bilan : 44566 est une créance sur le Trésor, 4457 est
 *      une dette envers lui, et les deux commencent par 44.
 *   h  compte de regroupement (une rubrique). On ne passe pas d'écriture
 *      dessus : il titre une section du plan.
 *
 * Le compte de résultat, lui, se déduit du préfixe : les classes 6 et 7 du SCF
 * sont rangées par nature, et c'est exactement le découpage que demande le
 * compte de résultat par nature. Voir resultLine().
 */

export const BILAN = {
    actif: [
      {k:'AN_GW',   f:'Écart d\'acquisition (goodwill)',                 a:'فارق الشراء'},
      {k:'AN_INC',  f:'Immobilisations incorporelles',                   a:'التثبيتات المعنوية'},
      {k:'AN_TER',  f:'Terrains',                                        a:'الأراضي'},
      {k:'AN_BAT',  f:'Bâtiments',                                       a:'المباني'},
      {k:'AN_AUT',  f:'Autres immobilisations corporelles',              a:'تثبيتات عينية أخرى'},
      {k:'AN_CONC', f:'Immobilisations en concession',                   a:'تثبيتات في شكل امتياز'},
      {k:'AN_ENC',  f:'Immobilisations en cours',                        a:'تثبيتات جاري إنجازها'},
      {k:'AN_FIN',  f:'Titres et participations',                        a:'السندات والمساهمات'},
      {k:'AN_PRET', f:'Prêts et autres actifs financiers non courants',  a:'قروض وأصول مالية أخرى غير جارية'},
      {k:'AN_IDA',  f:'Impôts différés actif',                           a:'الضرائب المؤجلة على الأصول'},
      {k:'AC_STK',  f:'Stocks et en-cours',                              a:'المخزونات والمنتجات قيد التنفيذ'},
      {k:'AC_CLI',  f:'Clients',                                         a:'الزبائن'},
      {k:'AC_DEB',  f:'Autres débiteurs',                                a:'المدينون الآخرون'},
      {k:'AC_IMP',  f:'Impôts et assimilés',                             a:'الضرائب وما شابهها'},
      {k:'AC_AUT',  f:'Autres actifs courants',                          a:'أصول جارية أخرى'},
      {k:'AC_PLA',  f:'Placements et autres actifs financiers courants', a:'التوظيفات والأصول المالية الجارية الأخرى'},
      {k:'AC_TRE',  f:'Trésorerie',                                      a:'الخزينة'}
    ],
    passif: [
      {k:'CP_CAP',  f:'Capital émis',                                    a:'رأس المال الصادر'},
      {k:'CP_NAP',  f:'Capital non appelé',                              a:'رأس المال غير المستدعى'},
      {k:'CP_PRI',  f:'Primes et réserves — réserves consolidées',       a:'العلاوات والاحتياطات'},
      {k:'CP_REE',  f:'Écarts de réévaluation',                          a:'فوارق إعادة التقييم'},
      {k:'CP_EQU',  f:'Écart d\'équivalence',                            a:'فارق المعادلة'},
      {k:'CP_RES',  f:'Résultat net (résultat de l\'exercice)',          a:'النتيجة الصافية (نتيجة السنة المالية)'},
      {k:'CP_ART',  f:'Autres capitaux propres — report à nouveau',      a:'رؤوس أموال خاصة أخرى — الترحيل من جديد'},
      {k:'PN_EMP',  f:'Emprunts et dettes financières',                  a:'القروض والديون المالية'},
      {k:'PN_IDP',  f:'Impôts (différés et provisionnés)',               a:'الضرائب (المؤجلة والمرصود لها)'},
      {k:'PN_AUT',  f:'Autres dettes non courantes',                     a:'ديون أخرى غير جارية'},
      {k:'PN_PRO',  f:'Provisions et produits constatés d\'avance',      a:'المؤونات والمنتوجات المثبتة مسبقا'},
      {k:'PC_FRN',  f:'Fournisseurs et comptes rattachés',               a:'الموردون والحسابات الملحقة'},
      {k:'PC_IMP',  f:'Impôts',                                          a:'الضرائب'},
      {k:'PC_AUT',  f:'Autres dettes',                                   a:'ديون أخرى'},
      {k:'PC_TRE',  f:'Trésorerie passif',                               a:'خزينة الخصوم'}
    ]
  };

export const PLAN = [
    /* ---- Classe 1 — Comptes de capitaux ---------------------------- */
    {c:'10',  f:'Capital, réserves et assimilés', a:'رأس المال والاحتياطات وما شابهها', h:1},
    {c:'101', f:'Capital émis (capital social, fonds de dotation)', a:'رأس المال الصادر (رأس المال الاجتماعي)', b:'CP_CAP'},
    {c:'103', f:'Primes liées au capital social', a:'العلاوات المرتبطة برأس المال', b:'CP_PRI'},
    {c:'104', f:'Écart d\'évaluation', a:'فارق التقييم', b:'CP_PRI'},
    {c:'105', f:'Écart de réévaluation', a:'فارق إعادة التقييم', b:'CP_REE'},
    {c:'106', f:'Réserves (légale, statutaire, ordinaire, réglementée)', a:'الاحتياطات (قانونية، نظامية، عادية، منظمة)', b:'CP_PRI'},
    {c:'107', f:'Écart d\'équivalence', a:'فارق المعادلة', b:'CP_EQU'},
    {c:'108', f:'Compte de l\'exploitant', a:'حساب المستغل', b:'CP_ART'},
    {c:'109', f:'Capital souscrit non appelé', a:'رأس المال المكتتب غير المستدعى', b:'CP_NAP'},
    {c:'11',  f:'Report à nouveau', a:'الترحيل من جديد', h:1},
    {c:'110', f:'Report à nouveau (solde créditeur)', a:'الترحيل من جديد (رصيد دائن)', b:'CP_ART'},
    {c:'119', f:'Report à nouveau (solde débiteur)', a:'الترحيل من جديد (رصيد مدين)', b:'CP_ART'},
    {c:'12',  f:'Résultat de l\'exercice', a:'نتيجة السنة المالية', h:1},
    {c:'120', f:'Résultat de l\'exercice (bénéfice)', a:'نتيجة السنة المالية (ربح)', b:'CP_RES'},
    {c:'129', f:'Résultat de l\'exercice (perte)', a:'نتيجة السنة المالية (خسارة)', b:'CP_RES'},
    {c:'13',  f:'Produits et charges différés', a:'المنتوجات والأعباء المؤجلة', h:1},
    {c:'131', f:'Subventions d\'équipement', a:'إعانات التجهيز', b:'PN_AUT'},
    {c:'133', f:'Impôts différés actif', a:'الضرائب المؤجلة على الأصول', b:'AN_IDA'},
    {c:'134', f:'Impôts différés passif', a:'الضرائب المؤجلة على الخصوم', b:'PN_IDP'},
    {c:'138', f:'Autres produits et charges différés', a:'منتوجات وأعباء مؤجلة أخرى', b:'PN_AUT'},
    {c:'15',  f:'Provisions pour charges — passifs non courants', a:'مؤونات الأعباء — خصوم غير جارية', h:1},
    {c:'153', f:'Provisions pour pensions et obligations similaires', a:'مؤونات المعاشات والالتزامات المماثلة', b:'PN_PRO'},
    {c:'155', f:'Provisions pour impôts', a:'مؤونات الضرائب', b:'PN_IDP'},
    {c:'156', f:'Provisions pour renouvellement des immobilisations', a:'مؤونات تجديد التثبيتات', b:'PN_PRO'},
    {c:'158', f:'Autres provisions pour charges', a:'مؤونات أخرى للأعباء', b:'PN_PRO'},
    {c:'16',  f:'Emprunts et dettes assimilées', a:'الاقتراضات والديون المماثلة', h:1},
    {c:'161', f:'Titres participatifs', a:'سندات المساهمة', b:'PN_EMP'},
    {c:'163', f:'Autres emprunts obligataires', a:'اقتراضات سندية أخرى', b:'PN_EMP'},
    {c:'164', f:'Emprunts auprès des établissements de crédit', a:'الاقتراضات لدى مؤسسات القرض', b:'PN_EMP'},
    {c:'165', f:'Dépôts et cautionnements reçus', a:'الودائع والكفالات المقبوضة', b:'PN_AUT'},
    {c:'167', f:'Dettes sur contrat de location-financement', a:'ديون عقد الإيجار التمويلي', b:'PN_EMP'},
    {c:'168', f:'Autres emprunts et dettes assimilées', a:'اقتراضات وديون مماثلة أخرى', b:'PN_EMP'},
    {c:'17',  f:'Dettes rattachées à des participations', a:'الديون الملحقة بمساهمات', b:'PN_EMP'},

    /* ---- Classe 2 — Immobilisations -------------------------------- */
    {c:'20',  f:'Immobilisations incorporelles', a:'التثبيتات المعنوية', h:1},
    {c:'203', f:'Frais de développement immobilisables', a:'مصاريف التطوير القابلة للتثبيت', b:'AN_INC'},
    {c:'204', f:'Logiciels informatiques et assimilés', a:'برمجيات المعلوماتية وما شابهها', b:'AN_INC'},
    {c:'205', f:'Concessions, brevets, licences, marques', a:'الامتيازات وبراءات الاختراع والرخص والعلامات', b:'AN_INC'},
    {c:'207', f:'Écart d\'acquisition (goodwill)', a:'فارق الشراء', b:'AN_GW'},
    {c:'208', f:'Autres immobilisations incorporelles', a:'تثبيتات معنوية أخرى', b:'AN_INC'},
    {c:'21',  f:'Immobilisations corporelles', a:'التثبيتات العينية', h:1},
    {c:'211', f:'Terrains', a:'الأراضي', b:'AN_TER'},
    {c:'212', f:'Agencements et aménagements de terrain', a:'تهيئة وترتيب الأراضي', b:'AN_AUT'},
    {c:'213', f:'Constructions', a:'المباني', b:'AN_BAT'},
    {c:'215', f:'Installations techniques, matériel et outillage', a:'المنشآت التقنية والمعدات والأدوات', b:'AN_AUT'},
    {c:'218', f:'Autres immobilisations corporelles', a:'تثبيتات عينية أخرى', b:'AN_AUT'},
    {c:'2182',f:'Matériel de transport', a:'معدات النقل', b:'AN_AUT'},
    {c:'2183',f:'Matériel de bureau et informatique', a:'معدات المكتب والإعلام الآلي', b:'AN_AUT'},
    {c:'2184',f:'Mobilier', a:'الأثاث', b:'AN_AUT'},
    {c:'22',  f:'Immobilisations en concession', a:'التثبيتات الممنوحة في شكل امتياز', b:'AN_CONC'},
    {c:'23',  f:'Immobilisations en cours', a:'التثبيتات الجاري إنجازها', h:1},
    {c:'232', f:'Immobilisations corporelles en cours', a:'تثبيتات عينية جاري إنجازها', b:'AN_ENC'},
    {c:'237', f:'Immobilisations incorporelles en cours', a:'تثبيتات معنوية جاري إنجازها', b:'AN_ENC'},
    {c:'26',  f:'Participations et créances rattachées', a:'المساهمات والديون الملحقة بها', h:1},
    {c:'261', f:'Titres de filiales', a:'سندات الفروع', b:'AN_FIN'},
    {c:'265', f:'Titres mis en équivalence', a:'السندات الموضوعة موضع المعادلة', b:'AN_FIN'},
    {c:'27',  f:'Autres immobilisations financières', a:'تثبيتات مالية أخرى', h:1},
    {c:'274', f:'Prêts et créances sur contrat de location-financement', a:'القروض والديون على عقد الإيجار التمويلي', b:'AN_PRET'},
    {c:'275', f:'Dépôts et cautionnements versés', a:'الودائع والكفالات المدفوعة', b:'AN_PRET'},
    {c:'28',  f:'Amortissement des immobilisations', a:'اهتلاك التثبيتات', h:1},
    {c:'280', f:'Amortissement des immobilisations incorporelles', a:'اهتلاك التثبيتات المعنوية', b:'AN_INC'},
    {c:'281', f:'Amortissement des immobilisations corporelles', a:'اهتلاك التثبيتات العينية', b:'AN_AUT'},
    {c:'2813',f:'Amortissement des constructions', a:'اهتلاك المباني', b:'AN_BAT'},
    {c:'2818',f:'Amortissement des autres immobilisations corporelles', a:'اهتلاك التثبيتات العينية الأخرى', b:'AN_AUT'},
    {c:'29',  f:'Pertes de valeur sur immobilisations', a:'خسائر القيمة عن التثبيتات', b:'AN_AUT'},

    /* ---- Classe 3 — Stocks ----------------------------------------- */
    {c:'30',  f:'Stocks de marchandises', a:'مخزونات البضائع', b:'AC_STK'},
    {c:'31',  f:'Matières premières et fournitures', a:'المواد الأولية واللوازم', b:'AC_STK'},
    {c:'32',  f:'Autres approvisionnements', a:'تموينات أخرى', b:'AC_STK'},
    {c:'33',  f:'En-cours de production de biens', a:'منتجات قيد التنفيذ — سلع', b:'AC_STK'},
    {c:'34',  f:'En-cours de production de services', a:'منتجات قيد التنفيذ — خدمات', b:'AC_STK'},
    {c:'35',  f:'Stocks de produits finis', a:'مخزونات المنتجات التامة', b:'AC_STK'},
    {c:'36',  f:'Stocks provenant d\'immobilisations', a:'مخزونات متأتية من التثبيتات', b:'AC_STK'},
    {c:'37',  f:'Stocks à l\'extérieur (en consignation, en dépôt)', a:'مخزونات في الخارج (أمانة أو إيداع)', b:'AC_STK'},
    {c:'38',  f:'Achats stockés', a:'المشتريات المخزنة', b:'AC_STK'},
    {c:'39',  f:'Pertes de valeur sur stocks et en-cours', a:'خسائر القيمة عن المخزونات', b:'AC_STK'},

    /* ---- Classe 4 — Tiers ------------------------------------------ */
    {c:'40',  f:'Fournisseurs et comptes rattachés', a:'الموردون والحسابات الملحقة', h:1},
    {c:'401', f:'Fournisseurs de stocks et services', a:'موردو المخزونات والخدمات', b:'PC_FRN'},
    {c:'403', f:'Fournisseurs, effets à payer', a:'الموردون، أوراق الدفع', b:'PC_FRN'},
    {c:'404', f:'Fournisseurs d\'immobilisations', a:'موردو التثبيتات', b:'PC_FRN'},
    {c:'408', f:'Fournisseurs, factures non parvenues', a:'الموردون، فواتير لم تصل بعد', b:'PC_FRN'},
    {c:'409', f:'Fournisseurs débiteurs (avances, acomptes)', a:'الموردون المدينون (تسبيقات ودفعات)', b:'AC_DEB'},
    {c:'41',  f:'Clients et comptes rattachés', a:'الزبائن والحسابات الملحقة', h:1},
    {c:'411', f:'Clients', a:'الزبائن', b:'AC_CLI'},
    {c:'413', f:'Clients, effets à recevoir', a:'الزبائن، أوراق القبض', b:'AC_CLI'},
    {c:'416', f:'Clients douteux ou litigieux', a:'الزبائن المشكوك فيهم', b:'AC_CLI'},
    {c:'417', f:'Créances sur travaux ou prestations en cours', a:'ديون على أشغال أو خدمات قيد التنفيذ', b:'AC_CLI'},
    {c:'418', f:'Clients, produits non encore facturés', a:'الزبائن، منتوجات لم تفوتر بعد', b:'AC_CLI'},
    {c:'419', f:'Clients créditeurs (avances reçues)', a:'الزبائن الدائنون (تسبيقات مقبوضة)', b:'PC_AUT'},
    {c:'42',  f:'Personnel et comptes rattachés', a:'المستخدمون والحسابات الملحقة', h:1},
    {c:'421', f:'Personnel, rémunérations dues', a:'المستخدمون، الأجور المستحقة', b:'PC_AUT'},
    {c:'422', f:'Fonds des œuvres sociales', a:'صندوق الخدمات الاجتماعية', b:'PC_AUT'},
    {c:'425', f:'Personnel, avances et acomptes accordés', a:'المستخدمون، تسبيقات ودفعات ممنوحة', b:'AC_DEB'},
    {c:'428', f:'Personnel, charges à payer', a:'المستخدمون، أعباء واجبة الدفع', b:'PC_AUT'},
    {c:'43',  f:'Organismes sociaux et comptes rattachés', a:'الهيئات الاجتماعية والحسابات الملحقة', h:1},
    {c:'431', f:'Sécurité sociale (CNAS)', a:'الضمان الاجتماعي (CNAS)', b:'PC_AUT'},
    {c:'432', f:'Autres organismes sociaux (CASNOS, CACOBATPH)', a:'هيئات اجتماعية أخرى (CASNOS)', b:'PC_AUT'},
    {c:'438', f:'Organismes sociaux, charges à payer', a:'الهيئات الاجتماعية، أعباء واجبة الدفع', b:'PC_AUT'},
    {c:'44',  f:'État, collectivités publiques et organismes internationaux', a:'الدولة والجماعات المحلية والهيئات الدولية', h:1},
    {c:'441', f:'État, subventions à recevoir', a:'الدولة، إعانات مستحقة القبض', b:'AC_DEB'},
    {c:'442', f:'État, impôts et taxes recouvrables sur des tiers', a:'الدولة، ضرائب ورسوم قابلة للتحصيل على الغير', b:'PC_IMP'},
    {c:'444', f:'État, impôts sur les résultats (IBS, IRG)', a:'الدولة، الضرائب على النتائج', b:'PC_IMP'},
    {c:'445', f:'État, taxes sur le chiffre d\'affaires', a:'الدولة، الرسوم على رقم الأعمال', h:1},
    {c:'44562',f:'TVA déductible sur immobilisations', a:'الرسم على القيمة المضافة القابل للخصم على التثبيتات', b:'AC_IMP'},
    {c:'44566',f:'TVA déductible sur biens et services', a:'الرسم على القيمة المضافة القابل للخصم على السلع والخدمات', b:'AC_IMP'},
    {c:'4457',f:'TVA collectée', a:'الرسم على القيمة المضافة المحصل', b:'PC_IMP'},
    {c:'4458',f:'TVA à régulariser ou en attente', a:'الرسم على القيمة المضافة قيد التسوية', b:'PC_IMP'},
    {c:'4459',f:'TVA à décaisser', a:'الرسم على القيمة المضافة الواجب دفعه', b:'PC_IMP'},
    {c:'447', f:'Autres impôts, taxes et versements assimilés (TAP)', a:'ضرائب ورسوم أخرى ومدفوعات مماثلة (الرسم على النشاط المهني)', b:'PC_IMP'},
    {c:'448', f:'État, charges à payer et produits à recevoir', a:'الدولة، أعباء واجبة الدفع ومنتوجات مستحقة', b:'PC_IMP'},
    {c:'45',  f:'Groupe et associés', a:'المجمع والشركاء', b:'PC_AUT'},
    {c:'46',  f:'Débiteurs divers et créditeurs divers', a:'مدينون ودائنون متنوعون', h:1},
    {c:'462', f:'Créances sur cessions d\'immobilisations', a:'ديون على التنازل عن التثبيتات', b:'AC_DEB'},
    {c:'467', f:'Autres comptes débiteurs ou créditeurs', a:'حسابات مدينة أو دائنة أخرى', b:'AC_DEB'},
    {c:'468', f:'Créditeurs divers', a:'دائنون متنوعون', b:'PC_AUT'},
    {c:'47',  f:'Comptes transitoires ou d\'attente', a:'حسابات انتقالية أو قيد التسوية', b:'AC_AUT'},
    {c:'486', f:'Charges constatées d\'avance', a:'أعباء مثبتة مسبقا', b:'AC_AUT'},
    {c:'487', f:'Produits constatés d\'avance', a:'منتوجات مثبتة مسبقا', b:'PN_PRO'},
    {c:'489', f:'Provisions — passifs courants', a:'مؤونات — خصوم جارية', b:'PC_AUT'},
    {c:'491', f:'Pertes de valeur sur comptes de clients', a:'خسائر القيمة عن حسابات الزبائن', b:'AC_CLI'},

    /* ---- Classe 5 — Comptes financiers ----------------------------- */
    {c:'50',  f:'Valeurs mobilières de placement', a:'القيم المنقولة للتوظيف', b:'AC_PLA'},
    {c:'51',  f:'Banques, établissements financiers et assimilés', a:'البنوك والمؤسسات المالية وما شابهها', h:1},
    {c:'511', f:'Valeurs à l\'encaissement', a:'قيم قيد التحصيل', b:'AC_TRE'},
    {c:'512', f:'Banques comptes courants', a:'البنوك، الحسابات الجارية', b:'AC_TRE'},
    {c:'515', f:'Trésor public et établissements publics (CCP)', a:'الخزينة العمومية والمؤسسات العمومية (الحساب الجاري البريدي)', b:'AC_TRE'},
    {c:'517', f:'Autres organismes financiers', a:'هيئات مالية أخرى', b:'AC_TRE'},
    {c:'518', f:'Intérêts courus', a:'الفوائد الجارية', b:'AC_TRE'},
    {c:'519', f:'Concours bancaires courants (découverts)', a:'التسهيلات البنكية الجارية (السحب على المكشوف)', b:'PC_TRE'},
    {c:'52',  f:'Instruments financiers dérivés', a:'الأدوات المالية المشتقة', b:'AC_PLA'},
    {c:'53',  f:'Caisse', a:'الصندوق', h:1},
    {c:'530', f:'Caisse', a:'الصندوق', b:'AC_TRE'},
    {c:'54',  f:'Régies d\'avances et accréditifs', a:'وكالات التسبيقات والاعتمادات', b:'AC_TRE'},
    {c:'58',  f:'Virements internes', a:'التحويلات الداخلية', b:'AC_TRE'},
    {c:'59',  f:'Pertes de valeur sur actifs financiers courants', a:'خسائر القيمة عن الأصول المالية الجارية', b:'AC_PLA'},

    /* ---- Classe 6 — Charges ---------------------------------------- */
    {c:'60',  f:'Achats consommés', a:'المشتريات المستهلكة', h:1},
    {c:'600', f:'Achats de marchandises vendues', a:'مشتريات البضائع المبيعة', b:''},
    {c:'601', f:'Matières premières', a:'المواد الأولية', b:''},
    {c:'602', f:'Autres approvisionnements', a:'تموينات أخرى', b:''},
    {c:'603', f:'Variation des stocks', a:'تغيرات المخزونات', b:''},
    {c:'604', f:'Achats d\'études et de prestations de services', a:'شراء الدراسات والخدمات', b:''},
    {c:'605', f:'Achats de matériels, équipements et travaux', a:'شراء العتاد والتجهيزات والأشغال', b:''},
    {c:'607', f:'Achats non stockés de matières et fournitures', a:'المشتريات غير المخزنة من المواد واللوازم', b:''},
    {c:'608', f:'Frais accessoires d\'achat', a:'المصاريف الملحقة بالشراء', b:''},
    {c:'609', f:'Rabais, remises et ristournes obtenus sur achats', a:'التخفيضات المحصل عليها على المشتريات', b:''},
    {c:'61',  f:'Services extérieurs', a:'الخدمات الخارجية', h:1},
    {c:'611', f:'Sous-traitance générale', a:'المناولة العامة', b:''},
    {c:'613', f:'Locations', a:'الإيجارات', b:''},
    {c:'614', f:'Charges locatives et de copropriété', a:'أعباء الإيجار والملكية المشتركة', b:''},
    {c:'615', f:'Entretien, réparations et maintenance', a:'الصيانة والإصلاحات', b:''},
    {c:'616', f:'Primes d\'assurances', a:'أقساط التأمين', b:''},
    {c:'617', f:'Études et recherches', a:'الدراسات والأبحاث', b:''},
    {c:'618', f:'Documentation et divers', a:'الوثائق ومصاريف متنوعة', b:''},
    {c:'62',  f:'Autres services extérieurs', a:'الخدمات الخارجية الأخرى', h:1},
    {c:'621', f:'Personnel extérieur à l\'entreprise', a:'المستخدمون من خارج المؤسسة', b:''},
    {c:'622', f:'Rémunérations d\'intermédiaires et honoraires', a:'أجور الوسطاء والأتعاب', b:''},
    {c:'623', f:'Publicité, publications, relations publiques', a:'الإشهار والنشر والعلاقات العامة', b:''},
    {c:'624', f:'Transports de biens et du personnel', a:'نقل السلع والمستخدمين', b:''},
    {c:'625', f:'Déplacements, missions et réceptions', a:'التنقلات والمهمات والاستقبالات', b:''},
    {c:'626', f:'Frais postaux et de télécommunications', a:'المصاريف البريدية والاتصالات', b:''},
    {c:'627', f:'Services bancaires et assimilés', a:'الخدمات المصرفية وما شابهها', b:''},
    {c:'628', f:'Cotisations et divers', a:'الاشتراكات ومصاريف متنوعة', b:''},
    {c:'63',  f:'Charges de personnel', a:'أعباء المستخدمين', h:1},
    {c:'631', f:'Rémunérations du personnel', a:'أجور المستخدمين', b:''},
    {c:'634', f:'Rémunération de l\'exploitant individuel', a:'أجر المستغل الفردي', b:''},
    {c:'635', f:'Cotisations aux organismes sociaux', a:'الاشتراكات لدى الهيئات الاجتماعية', b:''},
    {c:'636', f:'Charges sociales de l\'exploitant individuel', a:'الأعباء الاجتماعية للمستغل الفردي', b:''},
    {c:'638', f:'Autres charges sociales', a:'أعباء اجتماعية أخرى', b:''},
    {c:'64',  f:'Impôts, taxes et versements assimilés', a:'الضرائب والرسوم والمدفوعات المماثلة', h:1},
    {c:'641', f:'Impôts et taxes non récupérables sur le chiffre d\'affaires (TAP)', a:'الضرائب والرسوم غير القابلة للاسترجاع على رقم الأعمال (الرسم على النشاط المهني)', b:''},
    {c:'642', f:'Impôts et taxes non récupérables sur rémunérations', a:'الضرائب والرسوم غير القابلة للاسترجاع على الأجور', b:''},
    {c:'645', f:'Autres impôts et taxes (droit de timbre supporté)', a:'ضرائب ورسوم أخرى (رسم الطابع المتحمل)', b:''},
    {c:'65',  f:'Autres charges opérationnelles', a:'الأعباء العملياتية الأخرى', h:1},
    {c:'651', f:'Redevances pour concessions, brevets, licences', a:'إتاوات الامتيازات وبراءات الاختراع والرخص', b:''},
    {c:'654', f:'Pertes sur créances irrécouvrables', a:'خسائر عن ديون غير قابلة للتحصيل', b:''},
    {c:'656', f:'Amendes et pénalités', a:'الغرامات والعقوبات المالية', b:''},
    {c:'657', f:'Charges exceptionnelles de gestion courante', a:'أعباء استثنائية للتسيير الجاري', b:''},
    {c:'658', f:'Autres charges de gestion courante', a:'أعباء أخرى للتسيير الجاري', b:''},
    {c:'66',  f:'Charges financières', a:'الأعباء المالية', h:1},
    {c:'661', f:'Charges d\'intérêts', a:'أعباء الفوائد', b:''},
    {c:'666', f:'Pertes de change', a:'خسائر الصرف', b:''},
    {c:'668', f:'Autres charges financières', a:'أعباء مالية أخرى', b:''},
    {c:'67',  f:'Éléments extraordinaires — charges', a:'العناصر غير العادية — أعباء', b:''},
    {c:'68',  f:'Dotations aux amortissements, provisions et pertes de valeur', a:'مخصصات الاهتلاكات والمؤونات وخسائر القيمة', h:1},
    {c:'681', f:'Dotations — actifs non courants', a:'المخصصات — الأصول غير الجارية', b:''},
    {c:'685', f:'Dotations — actifs courants', a:'المخصصات — الأصول الجارية', b:''},
    {c:'686', f:'Dotations — éléments financiers', a:'المخصصات — العناصر المالية', b:''},
    {c:'69',  f:'Impôts sur les résultats et assimilés', a:'الضرائب على النتائج وما شابهها', h:1},
    {c:'692', f:'Imposition différée actif', a:'الضريبة المؤجلة على الأصول', b:''},
    {c:'693', f:'Imposition différée passif', a:'الضريبة المؤجلة على الخصوم', b:''},
    {c:'695', f:'Impôts sur les bénéfices basés sur le résultat ordinaire', a:'الضرائب على الأرباح المبنية على النتيجة العادية', b:''},
    {c:'698', f:'Autres impôts sur les résultats', a:'ضرائب أخرى على النتائج', b:''},

    /* ---- Classe 7 — Produits --------------------------------------- */
    {c:'70',  f:'Ventes de marchandises et produits fabriqués, prestations de services', a:'المبيعات من البضائع والمنتجات المصنعة وأداءات الخدمات', h:1},
    {c:'700', f:'Ventes de marchandises', a:'مبيعات البضائع', b:''},
    {c:'701', f:'Ventes de produits finis', a:'مبيعات المنتجات التامة', b:''},
    {c:'702', f:'Ventes de produits intermédiaires', a:'مبيعات المنتجات الوسيطة', b:''},
    {c:'704', f:'Ventes de travaux', a:'مبيعات الأشغال', b:''},
    {c:'705', f:'Ventes d\'études', a:'مبيعات الدراسات', b:''},
    {c:'706', f:'Autres prestations de services', a:'أداءات الخدمات الأخرى', b:''},
    {c:'708', f:'Produits des activités annexes', a:'منتوجات الأنشطة الملحقة', b:''},
    {c:'709', f:'Rabais, remises et ristournes accordés', a:'التخفيضات الممنوحة', b:''},
    {c:'72',  f:'Production stockée ou déstockée', a:'الإنتاج المخزن أو المسحوب من المخزون', h:1},
    {c:'723', f:'Variation des stocks d\'en-cours', a:'تغيرات مخزونات المنتجات قيد التنفيذ', b:''},
    {c:'724', f:'Variation des stocks de produits finis', a:'تغيرات مخزونات المنتجات التامة', b:''},
    {c:'73',  f:'Production immobilisée', a:'الإنتاج المثبت', b:''},
    {c:'74',  f:'Subventions d\'exploitation', a:'إعانات الاستغلال', b:''},
    {c:'75',  f:'Autres produits opérationnels', a:'المنتوجات العملياتية الأخرى', h:1},
    {c:'751', f:'Redevances pour concessions, brevets, licences', a:'إتاوات الامتيازات وبراءات الاختراع', b:''},
    {c:'752', f:'Plus-values sur sortie d\'actifs immobilisés', a:'فوائض القيمة عن خروج الأصول المثبتة', b:''},
    {c:'754', f:'Quote-part de subvention d\'investissement virée au résultat', a:'حصة إعانة الاستثمار المحولة إلى النتيجة', b:''},
    {c:'756', f:'Rentrées sur créances amorties', a:'مبالغ محصلة عن ديون مهتلكة', b:''},
    {c:'757', f:'Produits exceptionnels sur opérations de gestion', a:'منتوجات استثنائية عن عمليات التسيير', b:''},
    {c:'758', f:'Autres produits de gestion courante', a:'منتوجات أخرى للتسيير الجاري', b:''},
    {c:'76',  f:'Produits financiers', a:'المنتوجات المالية', h:1},
    {c:'761', f:'Produits des participations', a:'منتوجات المساهمات', b:''},
    {c:'763', f:'Revenus de créances', a:'إيرادات الديون', b:''},
    {c:'766', f:'Gains de change', a:'أرباح الصرف', b:''},
    {c:'768', f:'Autres produits financiers', a:'منتوجات مالية أخرى', b:''},
    {c:'77',  f:'Éléments extraordinaires — produits', a:'العناصر غير العادية — منتوجات', b:''},
    {c:'78',  f:'Reprises sur pertes de valeur et provisions', a:'استئنافات عن خسائر القيمة والمؤونات', h:1},
    {c:'781', f:'Reprises — actifs non courants', a:'الاستئنافات — الأصول غير الجارية', b:''},
    {c:'785', f:'Reprises — actifs courants', a:'الاستئنافات — الأصول الجارية', b:''},
    {c:'786', f:'Reprises — éléments financiers', a:'الاستئنافات — العناصر المالية', b:''}
  ];

export function resultLine(code) {
    var c = String(code || '');
    var p2 = c.slice(0, 2), p3 = c.slice(0, 3);
    if (p2 === '70') return 'VENTES';
    if (p2 === '72') return 'VARSTK';
    if (p2 === '73') return 'IMMOB';
    if (p2 === '74') return 'SUBV';
    if (p2 === '75') return 'AUTPRO';
    if (p2 === '76') return 'PROFIN';
    if (p2 === '77') return 'EXTPRO';
    if (p2 === '78') return 'REPRIS';
    if (p2 === '60') return 'ACHATS';
    if (p2 === '61' || p2 === '62') return 'SERVEX';
    if (p2 === '63') return 'PERSON';
    if (p2 === '64') return 'IMPOTS';
    if (p2 === '65') return 'AUTCHG';
    if (p2 === '66') return 'CHGFIN';
    if (p2 === '67') return 'EXTCHG';
    if (p2 === '68') return 'DOTATI';
    if (p3 === '692' || p3 === '693') return 'IMPDIF';
    if (p2 === '69') return 'IMPEXI';
    return '';
  }

export function bilanLine(code) {
    var a = findAccount(code);
    if (a && a.b) return a.b;
    var c = String(code || '');
    switch (c.charAt(0)) {
      case '1': return 'CP_ART';
      case '2': return 'AN_AUT';
      case '3': return 'AC_STK';
      case '4': return 'AC_DEB';
      case '5': return 'AC_TRE';
      default:  return '';
    }
  }

export function isDebitNature(code) {
    var c = String(code || '').charAt(0);
    return c === '2' || c === '3' || c === '5' || c === '6';
  }

const INDEX = {};
for (const a of PLAN) INDEX[a.c] = a;

/* Un compte inconnu ne fait pas tomber une balance : il se comporte comme un
   compte de sa classe. C'est ce qui permet d'écrire 4111 — un client
   individualisé — sans avoir eu à le déclarer d'abord. */
export function findAccount(code) {
  code = String(code == null ? '' : code).trim();
  if (INDEX[code]) return INDEX[code];
  for (let n = code.length - 1; n >= 2; n--) {
    const hit = INDEX[code.slice(0, n)];
    if (hit && !hit.h) return {c: code, f: hit.f, a: hit.a, b: hit.b, derived: hit.c};
  }
  return null;
}

/* Les comptes sur lesquels on passe une écriture : le plan moins ses titres.
   C'est cette liste-là que le classeur utilise pour la validation de saisie,
   pour la recherche d'intitulé et pour la balance. */
export function postable() { return PLAN.filter(a => !a.h); }

export function classOf(code) { return String(code || '').charAt(0); }

/* Les comptes qui se retranchent d'une rubrique de l'actif au lieu d'en
   former une : amortissements, pertes de valeur. C'est la colonne du milieu
   du bilan actif. */
export function isDeduction(code) {
  const p = String(code || '').slice(0, 2);
  return p === '28' || p === '29' || p === '39' || p === '49' || p === '59';
}

export const JOURNAUX = [
  {c: 'AN', f: 'À-nouveaux',          a: 'الأرصدة الافتتاحية'},
  {c: 'VE', f: 'Ventes',              a: 'المبيعات'},
  {c: 'AC', f: 'Achats',              a: 'المشتريات'},
  {c: 'BQ', f: 'Banque',              a: 'البنك'},
  {c: 'CA', f: 'Caisse',              a: 'الصندوق'},
  {c: 'OD', f: 'Opérations diverses', a: 'عمليات متنوعة'}
];
