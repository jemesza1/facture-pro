/* FacturePro — les raccourcis clavier.
 *
 * Quatre-vingt-cinq pour cent des visiteurs sont sur telephone et ne verront
 * jamais rien de ce fichier. Il est donc ecrit pour ne rien leur couter : pas
 * de style, pas d'image, un seul ecouteur, et l'aide ne se peint que si on la
 * demande. Ce qu'il apporte va au commercant assis devant un ordinateur, qui
 * saisit vingt factures d'affilee et pour qui chaque aller-retour vers la
 * souris est une seconde perdue.
 *
 * Deux familles, et la difference n'est pas cosmetique :
 *
 *   Ctrl+S, Ctrl+P — des combinaisons que le navigateur nous laisse annuler.
 *   Elles marchent partout, y compris pendant la saisie, ce qui est bien le
 *   moment ou l'on veut enregistrer.
 *
 *   n, / , ? — des lettres seules, qui ne se declenchent que si le curseur
 *   n'est dans aucun champ. Sans cette garde, taper « nom du client »
 *   ouvrirait une facture a la premiere lettre.
 *
 * Ctrl+N est demande et il est lie ici, mais Chrome se reserve la combinaison
 * pour ouvrir une fenetre et ne rend pas la main : la page ne peut pas
 * l'annuler. C'est pour cela que « n » existe, et l'aide le dit plutot que de
 * laisser croire a une panne.
 *
 * Escape n'est pas ici : b2b.js le tient deja pour les modales, avec le piege
 * de focus qui va avec. Le reprendre romprait ce contrat.
 */
(function () {
  /* Un champ de saisie a la priorite sur toute lettre seule. contentEditable
     compte : le pied de page personnalisable en est un. */
  function typing() {
    var el = document.activeElement;
    if (!el) return false;
    if (el.isContentEditable) return true;
    return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
  }

  function modalOpen() {
    return !!document.querySelector('#modal-root .modal');
  }

  function ar() {
    return document.documentElement.lang === 'ar';
  }

  /* Ctrl+S enregistre le formulaire ouvert, quel qu'il soit — facture, client,
     produit, depense. On ne nomme donc aucune fonction : on clique le bouton
     que la modale presente elle-meme, ce qui reste vrai pour les formulaires
     qui n'existent pas encore. */
  function saveOpenForm() {
    var btn = document.querySelector('#modal-root .modal-footer .btn-primary')
           || document.querySelector('#modal-root .modal-footer button.btn-primary');
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
  }

  function focusSearch() {
    if (typeof state !== 'undefined' && state.currentPage !== 'invoices') {
      try { navigate('invoices'); } catch (e) { return false; }
    }
    var el = document.getElementById('inv-search');
    if (!el) return false;
    el.focus();
    try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {}
    return true;
  }

  function newInvoice() {
    if (typeof openNewInvoice !== 'function') return false;
    try { openNewInvoice(); } catch (e) { return false; }
    return true;
  }

  function pdf() {
    if (typeof downloadPDF !== 'function') return false;
    /* downloadPDF dit lui-meme qu'il faut un apercu ouvert ; on le laisse
       parler plutot que de dupliquer le message. */
    try { downloadPDF(); } catch (e) { return false; }
    return true;
  }

  /* L'aide passe par openModal : elle herite ainsi du piege de focus, du
     role="dialog" et de la fermeture par Escape, au lieu d'en refaire trois
     versions approximatives. */
  /* Le nom de la touche change avec la langue, la touche elle-meme non :
     d'ou une quatrieme colonne. « Echap » sur un ecran arabe etait une
     coquille — un ternaire qui rendait la meme chose des deux cotes. */
  var ROWS = [
    ['n', 'n', 'Nouvelle facture', 'فاتورة جديدة'],
    ['/', '/', 'Rechercher une facture', 'البحث في الفواتير'],
    ['Ctrl + S', 'Ctrl + S', 'Enregistrer le formulaire ouvert', 'حفظ الاستمارة المفتوحة'],
    ['Ctrl + P', 'Ctrl + P', "Télécharger le PDF de l'aperçu", 'تحميل PDF من المعاينة'],
    ['Échap', 'Esc', 'Fermer la fenêtre', 'إغلاق النافذة'],
    ['?', '?', 'Afficher cette aide', 'عرض هذه المساعدة']
  ];

  function showHelp() {
    if (typeof openModal !== 'function') return false;
    var a = ar();
    var rows = ROWS.map(function (r) {
      var key = a ? r[1] : r[0];
      return '<tr>' +
        '<td style="padding:7px 0;white-space:nowrap">' +
          '<kbd style="display:inline-block;padding:3px 8px;border-radius:6px;' +
          'border:1px solid var(--border);background:var(--page);font-size:12px;' +
          'font-weight:600;font-family:inherit;direction:ltr">' + esc(key) + '</kbd></td>' +
        '<td style="padding:7px 0;padding-inline-start:16px;font-size:14px">' +
          esc(a ? r[3] : r[2]) + '</td></tr>';
    }).join('');
    /* Le <div class="modal"> vient de l'appelant : openModal n'enveloppe que
       dans le fond, puis cherche .modal pour y poser role="dialog", le piege
       de focus et le lien vers le titre. Sans lui, la fenetre s'affiche et
       n'est plus une fenetre pour personne d'autre que l'oeil. */
    openModal(
      '<div class="modal">' +
      '<div class="modal-header"><h3 class="font-semibold">' +
        esc(t('keys.title')) + '</h3>' +
        '<button type="button" onclick="closeModal()" class="btn-ghost" aria-label="' +
        esc(t('ui.close')) + '">&times;</button></div>' +
      '<div class="modal-body"><table style="width:100%;border-collapse:collapse">' +
        rows + '</table>' +
        '<p class="text-xs text-slate-500 mt-4">' + esc(t('keys.note')) + '</p></div>' +
      '</div>'
    );
    return true;
  }
  window.showShortcuts = showHelp;

  document.addEventListener('keydown', function (e) {
    if (e.altKey) return;
    var combo = e.ctrlKey || e.metaKey;

    if (combo) {
      var k = (e.key || '').toLowerCase();
      if (k === 's') { if (saveOpenForm()) e.preventDefault(); return; }
      if (k === 'p') { e.preventDefault(); pdf(); return; }
      /* Lie par honnetete envers la demande, sans illusion : Chrome garde
         Ctrl+N pour lui et ce preventDefault ne l'atteindra pas. La ou le
         navigateur nous laisse passer, cela marche. */
      if (k === 'n') { if (newInvoice()) e.preventDefault(); return; }
      return;
    }

    if (typing()) return;
    if (e.key === '?') { if (!modalOpen()) { e.preventDefault(); showHelp(); } return; }
    if (modalOpen()) return;
    if (e.key === '/') { e.preventDefault(); focusSearch(); return; }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newInvoice(); }
  });
})();
