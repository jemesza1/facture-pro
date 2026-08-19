/* FacturePro — the announcements.

   The other two dialogs carry messages that write themselves: one asks for a
   backup when the dates say it is owed, the other asks for bug reports. This
   one carries what only a person can know — a feature that has just landed,
   or a fault we already know about and are working on. Without it the only
   way to tell a merchant anything is the Facebook page, which most of them
   never see.

   TO PUBLISH AN ANNOUNCEMENT: add an entry at the TOP of NEWS below, with an
   id nobody has used before. That id is what decides who has read it — reuse
   one and the announcement is silently swallowed for everyone who saw the
   first; change the text under a fresh id and everybody gets it again.

     kind: 'feature'  something new, in green
     kind: 'issue'    a known fault, in amber — say what to do meanwhile

   Keep it to a sentence or two. This is the notice people will believe the
   day something is genuinely wrong, and that only holds while it stays rare:
   an announcement for every small change is a dialog people learn to close
   without reading. Announcements stay readable afterwards in Aide. */
var NEWS = [
  {
    id: '2026-08-19-contact',
    date: '2026-08-19',
    kind: 'feature',
    fr: {
      title: 'Un bouton pour nous joindre',
      body: "Le bouton « Un souci ? », en haut de l'écran, ouvre nos deux adresses : la page Facebook et l'email. Signalez-y ce qui ne fonctionne pas, ou ce qui vous manque — c'est ainsi que l'application avance."
    },
    ar: {
      title: 'زرّ للتواصل معنا',
      body: 'زرّ «مشكل؟» في أعلى الشاشة يفتح عنوانَينا: صفحة فايسبوك والبريد الإلكتروني. أبلغنا عمّا لا يعمل، أو عمّا ينقصك — هكذا يتقدّم التطبيق.'
    }
  }
];

var NEWS_KEY = 'fp_news_seen';

function newsSeen() {
  try {
    var v = JSON.parse(localStorage.getItem(NEWS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}

/* Every announcement older than the one being shown is marked read with it.
   A merchant coming back after three releases wants the latest, not three
   dialogs in a row; the others are still in Aide if they want them. */
function markNewsSeen(id) {
  var seen = newsSeen();
  var at = NEWS.findIndex(function (n) { return n.id === id; });
  if (at < 0) return;
  NEWS.slice(at).forEach(function (n) {
    if (seen.indexOf(n.id) < 0) seen.push(n.id);
  });
  try { localStorage.setItem(NEWS_KEY, JSON.stringify(seen.slice(-40))); } catch (e) {}
}

function pendingNews() {
  var seen = newsSeen();
  for (var i = 0; i < NEWS.length; i++) {
    if (seen.indexOf(NEWS[i].id) < 0) return NEWS[i];
  }
  return null;
}

/* The announcement is written once, in both languages, in NEWS above — not in
   i18n.js, which is for the application's own words. */
function newsText(n) {
  return (locale === 'ar' ? n.ar : n.fr) || n.fr;
}

function newsBadge(n) {
  var issue = n.kind === 'issue';
  var tone = issue ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
                   : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
  return '<span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ' + tone + '">' +
           esc(t(issue ? 'news.badgeIssue' : 'news.badgeNew')) +
         '</span>';
}

function newsDialogHtml(n) {
  var issue = n.kind === 'issue';
  var txt = newsText(n);
  return '<div class="modal" onclick="event.stopPropagation()" role="dialog" aria-modal="true" aria-labelledby="nw-title">' +
    '<div class="modal-header flex items-start gap-3">' +
      '<span class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ' +
        (issue ? 'bg-amber-100 dark:bg-amber-500/15' : 'bg-emerald-100 dark:bg-emerald-500/15') + '">' +
        '<i data-lucide="' + (issue ? 'alert-triangle' : 'lightbulb') + '" class="w-5 h-5 ' +
          (issue ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400') + '"></i>' +
      '</span>' +
      '<span class="min-w-0 flex-1">' +
        '<span class="flex items-center gap-2 flex-wrap">' + newsBadge(n) +
          '<span class="text-xs text-slate-500">' + esc(n.date) + '</span>' +
        '</span>' +
        '<h3 id="nw-title" class="font-semibold text-base sm:text-lg leading-tight mt-1">' + esc(txt.title) + '</h3>' +
      '</span>' +
      '<button type="button" onclick="closeNews()" aria-label="' + esc(t('news.close')) + '" class="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">' +
        '<i data-lucide="x" class="w-4 h-4"></i>' +
      '</button>' +
    '</div>' +
    '<div class="modal-body">' +
      '<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">' + esc(txt.body) + '</p>' +
    '</div>' +
    '<div class="modal-footer flex justify-end">' +
      '<button type="button" onclick="closeNews()" class="btn-primary">' + esc(t('news.close')) + '</button>' +
    '</div>' +
  '</div>';
}

function openNews(n) {
  n = n || pendingNews();
  if (!n) return;
  var root = document.getElementById('modal-root');
  if (!root) return;
  window.__fpNewsDialogShown = true;
  markNewsSeen(n.id);
  root.innerHTML = '<div class="modal-backdrop" data-news="1" onclick="if(event.target===this)closeNews()">' +
                     newsDialogHtml(n) +
                   '</div>';
  try { lucide.createIcons(); } catch (e) {}
}

function newsIsOpen() {
  return !!document.querySelector('#modal-root [data-news]');
}

function closeNews() {
  var root = document.getElementById('modal-root');
  if (root && newsIsOpen()) root.innerHTML = '';
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && newsIsOpen()) closeNews();
});

/* Read afterwards in Aide, newest first — an announcement closed in a hurry
   is not an announcement lost. */
function renderNews() {
  if (!NEWS.length) {
    return '<p class="text-sm text-slate-500">' + esc(t('news.none')) + '</p>';
  }
  return '<div class="space-y-3">' + NEWS.slice(0, 8).map(function (n) {
    var txt = newsText(n);
    return '<div class="rounded-xl border border-slate-200 dark:border-slate-700 p-3">' +
             '<div class="flex items-center gap-2 flex-wrap">' + newsBadge(n) +
               '<span class="text-xs text-slate-500">' + esc(n.date) + '</span>' +
             '</div>' +
             '<p class="text-sm font-semibold mt-1">' + esc(txt.title) + '</p>' +
             '<p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">' + esc(txt.body) + '</p>' +
           '</div>';
  }).join('') + '</div>';
}

/* Third in line at the opening. The backup warning is about losing a year of
   invoices and outranks everything; news comes next; the request for feedback
   waits for a quieter day. */
(function () {
  if (!pendingNews()) return;
  setTimeout(function () {
    var n = pendingNews();
    if (!n || window.__fpBackupDialogShown) return;
    var root = document.getElementById('modal-root');
    if (!root || root.innerHTML.trim() !== '') return;
    var preview = document.getElementById('preview-root');
    if (preview && !preview.classList.contains('hidden')) return;
    openNews(n);
  }, 1400);
})();

/* Language switched while it is open: redraw it, like the other dialogs. */
(function () {
  var prev = window.applyLocale;
  if (typeof prev !== 'function') return;
  window.applyLocale = function () {
    var out = prev.apply(this, arguments);
    if (newsIsOpen()) {
      var shown = NEWS.filter(function (n) { return newsSeen().indexOf(n.id) >= 0; })[0] || NEWS[0];
      var back = document.querySelector('#modal-root [data-news]');
      if (back) { back.innerHTML = newsDialogHtml(shown); try { lucide.createIcons(); } catch (e) {} }
    }
    return out;
  };
})();
