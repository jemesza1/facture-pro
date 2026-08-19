/* FacturePro — the "tell us" dialog.

   The application has no account, no server and no error reporting: when
   something breaks on a merchant's phone, nobody here ever hears about it.
   The two channels that do work — the Facebook page and the mailbox — were
   only written on the landing page and at the bottom of Aide, which is the
   one screen a person in the middle of a problem does not think to open.

   So it is said once, plainly, at the start: here is where to write, and
   here is what to put in the message. Then it gets out of the way.

   Deliberately quiet: shown on the first opening, silent for the next two
   months after it is closed, and never on top of a preview or another
   dialog. The header button and the Aide card keep it reachable in between,
   which is the point — the dialog is a reminder, not the only door. */

var FEEDBACK_FB = 'https://www.facebook.com/share/18MFPVTn2V/';
var FEEDBACK_MAIL = 'mrkorichi.a@gmail.com';
var FEEDBACK_KEY = 'fp_feedback_seen';
var FEEDBACK_AGAIN_DAYS = 60;
var FEEDBACK_DAY = 86400000;

function feedbackDue() {
  try {
    var at = parseInt(localStorage.getItem(FEEDBACK_KEY) || '0', 10);
    if (!(at > 0)) return true;
    return (Date.now() - at) >= FEEDBACK_AGAIN_DAYS * FEEDBACK_DAY;
  } catch (e) { return false; }
}

function markFeedbackSeen() {
  try { localStorage.setItem(FEEDBACK_KEY, String(Date.now())); } catch (e) {}
}

/* Subject and skeleton prefilled, because "ça ne marche pas" costs an
   exchange of mails before anything can be looked at. */
function feedbackMailto() {
  return 'mailto:' + FEEDBACK_MAIL +
         '?subject=' + encodeURIComponent(t('feedback.mailSubject')) +
         '&body=' + encodeURIComponent(t('feedback.mailBody'));
}

function feedbackChannel(icon, href, label, hint, external) {
  return '<a href="' + href + '"' +
           (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
           ' class="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 hover:border-brand-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">' +
           '<span class="w-9 h-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">' +
             '<i data-lucide="' + icon + '" class="w-4 h-4"></i>' +
           '</span>' +
           '<span class="min-w-0">' +
             '<span class="block text-sm font-semibold">' + esc(label) + '</span>' +
             '<span class="block text-xs text-slate-500 dark:text-slate-400 leading-relaxed break-words">' + esc(hint) + '</span>' +
           '</span>' +
         '</a>';
}

function feedbackHtml() {
  return '<div class="modal" onclick="event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="fb-title">' +
    '<div class="modal-header flex items-start gap-3">' +
      '<span class="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg">' +
        '<i data-lucide="message-circle" class="w-5 h-5 text-white"></i>' +
      '</span>' +
      '<span class="min-w-0 flex-1">' +
        '<h3 id="fb-title" class="font-semibold text-base sm:text-lg leading-tight">' + esc(t('feedback.title')) + '</h3>' +
        '<p class="text-xs text-slate-500 mt-0.5">' + esc(t('feedback.sub')) + '</p>' +
      '</span>' +
      '<button type="button" onclick="closeFeedback()" aria-label="' + esc(t('feedback.close')) + '" class="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">' +
        '<i data-lucide="x" class="w-4 h-4"></i>' +
      '</button>' +
    '</div>' +
    '<div class="modal-body space-y-3">' +
      '<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">' + esc(t('feedback.body')) + '</p>' +
      '<p class="text-xs font-semibold uppercase tracking-wide text-slate-400">' + esc(t('feedback.where')) + '</p>' +
      '<div class="grid gap-2 sm:grid-cols-2">' +
        feedbackChannel('facebook', FEEDBACK_FB, t('feedback.fbLabel'), t('feedback.fbHint'), true) +
        feedbackChannel('mail', feedbackMailto(), t('feedback.mailLabel'), FEEDBACK_MAIL, false) +
      '</div>' +
      '<div class="flex items-start gap-2 rounded-xl bg-sky-50 border border-sky-200 p-3 dark:bg-sky-500/10 dark:border-sky-500/30">' +
        '<i data-lucide="lightbulb" class="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5"></i>' +
        '<p class="text-xs leading-relaxed text-sky-900 dark:text-sky-200">' + esc(t('feedback.tip')) + '</p>' +
      '</div>' +
      '<p class="text-xs text-slate-500 dark:text-slate-400">' + esc(t('feedback.again')) + '</p>' +
    '</div>' +
    '<div class="modal-footer flex justify-end">' +
      '<button type="button" onclick="closeFeedback()" class="btn-primary">' + esc(t('feedback.close')) + '</button>' +
    '</div>' +
  '</div>';
}

function openFeedback() {
  var root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = '<div class="modal-backdrop" data-feedback="1" onclick="if(event.target===this)closeFeedback()">' +
                     feedbackHtml() +
                   '</div>';
  markFeedbackSeen();
  try { lucide.createIcons(); } catch (e) {}
}

function closeFeedback() {
  markFeedbackSeen();
  var root = document.getElementById('modal-root');
  if (root) root.innerHTML = '';
}

function feedbackIsOpen() {
  return !!document.querySelector('#modal-root [data-feedback]');
}

/* Escape closes it, like every other dialog people have used. */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && feedbackIsOpen()) closeFeedback();
});

/* On a phone the header button is an icon with no visible word, so the label
   a screen reader announces is the only one there is — it has to follow the
   language like everything else. */
function paintFeedbackButton() {
  var btn = document.getElementById('feedback-btn');
  if (!btn) return;
  btn.setAttribute('aria-label', t('feedback.title'));
  btn.setAttribute('title', t('feedback.title'));
}

/* Switching FR/AR redraws the page but not what is already in modal-root, and
   a French dialog left standing over an Arabic app reads as a bug. */
(function () {
  var prev = window.applyLocale;
  if (typeof prev !== 'function') { paintFeedbackButton(); return; }
  window.applyLocale = function () {
    var out = prev.apply(this, arguments);
    paintFeedbackButton();
    if (feedbackIsOpen()) {
      var back = document.querySelector('#modal-root [data-feedback]');
      if (back) { back.innerHTML = feedbackHtml(); try { lucide.createIcons(); } catch (e) {} }
    }
    return out;
  };
})();

/* The opening. Late enough that the dashboard is drawn and read first, and
   skipped entirely if the visitor already has something else on screen —
   an invoice preview, the install prompt, any other dialog. */
(function () {
  if (!feedbackDue()) return;
  setTimeout(function () {
    if (!feedbackDue()) return;
    var root = document.getElementById('modal-root');
    if (!root || root.innerHTML.trim() !== '') return;
    var preview = document.getElementById('preview-root');
    if (preview && !preview.classList.contains('hidden')) return;
    openFeedback();
  }, 1800);
})();
