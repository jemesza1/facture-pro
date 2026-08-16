/* FacturePro — the backup reminder.

   Everything is in localStorage. A cleared cache is an emptied ledger, and the
   people using this keep their fiscal records in it. The application already
   said so once, in a banner dismissed forever on the first visit — which is
   the visit where there is nothing to lose yet.

   This watches instead: it records when an export actually happened, and asks
   again when the answer gets old.

   It is deliberately quiet. Nothing is said while the only invoices on screen
   are the seeded examples, "later" buys a week of silence, and a merchant who
   exports every month never sees it at all. A reminder that fires when there
   is nothing to save is a reminder people learn to close without reading. */
var BACKUP_KEY = 'fp_last_export';
var BACKUP_SNOOZE = 'fp_backup_snoozed_until';
var BACKUP_AFTER_DAYS = 30;
var DAY = 86400000;

function markBackup() {
  try {
    localStorage.setItem(BACKUP_KEY, String(Date.now()));
    localStorage.removeItem(BACKUP_SNOOZE);
  } catch (e) {}
  try { paintBackupNotice(); } catch (e) {}
}

function lastBackupAt() {
  try {
    var v = parseInt(localStorage.getItem(BACKUP_KEY) || '0', 10);
    return v > 0 ? v : null;
  } catch (e) { return null; }
}

function daysSinceBackup() {
  var at = lastBackupAt();
  return at === null ? null : Math.floor((Date.now() - at) / DAY);
}

/* Only what the user typed counts. The seeded examples are ours to lose. */
function hasRealData() {
  try {
    var cli = (state.clients || []).some(function (c) { return !c.demo; });
    var inv = (state.invoices || []).some(function (i) { return !i.demo; });
    return cli || inv;
  } catch (e) { return false; }
}

function backupSnoozed() {
  try {
    return parseInt(localStorage.getItem(BACKUP_SNOOZE) || '0', 10) > Date.now();
  } catch (e) { return false; }
}

function snoozeBackup() {
  try { localStorage.setItem(BACKUP_SNOOZE, String(Date.now() + 7 * DAY)); } catch (e) {}
  paintBackupNotice();
}

function backupDue() {
  if (!hasRealData() || backupSnoozed()) return false;
  var d = daysSinceBackup();
  return d === null || d >= BACKUP_AFTER_DAYS;
}

/* "il y a 3 jours" — the figure stays latin in Arabic, like every other
   number in this application. */
function backupAgeLabel() {
  var d = daysSinceBackup();
  if (d === null) return t('backup.lastNever');
  var when = d === 0 ? t('backup.today')
           : d === 1 ? t('backup.yesterday')
           : t('backup.daysAgo').replace('{n}', String(d));
  return t('backup.lastOn').replace('{d}', when);
}

function paintBackupNotice() {
  var host = document.getElementById('backup-warn');
  if (!host) return;
  if (!backupDue()) { host.classList.add('hidden'); host.innerHTML = ''; return; }

  var d = daysSinceBackup();
  var line = d === null ? t('backup.never')
                        : t('backup.overdue').replace('{n}', String(d));

  host.innerHTML =
    '<div class="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 sm:p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">' +
      '<i data-lucide="shield-alert" class="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5"></i>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="text-sm font-semibold text-amber-900 dark:text-amber-200">' + esc(t('backup.title')) + '</p>' +
        '<p class="text-xs sm:text-[13px] leading-relaxed text-amber-800 dark:text-amber-200/80 mt-0.5">' +
          esc(line) + ' ' + esc(t('backup.body')) +
        '</p>' +
        '<div class="mt-2 flex flex-wrap gap-2">' +
          '<button type="button" onclick="exportData()" class="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">' +
            '<i data-lucide="download" class="w-3.5 h-3.5"></i>' + esc(t('backup.cta')) +
          '</button>' +
          '<button type="button" onclick="snoozeBackup()" class="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-500/10">' +
            esc(t('backup.snooze')) +
          '</button>' +
        '</div>' +
      '</div>' +
      '<button type="button" onclick="snoozeBackup()" aria-label="' + esc(t('backup.snooze')) + '" class="shrink-0 rounded-lg p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/10">' +
        '<i data-lucide="x" class="w-4 h-4"></i>' +
      '</button>' +
    '</div>';

  host.classList.remove('hidden');
  /* The generic "your data lives in this browser" banner says the same thing
     in the abstract. Two amber boxes with one message is a message people
     stop reading, and this one carries the date. */
  var generic = document.getElementById('local-warn');
  if (generic) generic.classList.add('hidden');
  try { lucide.createIcons(); } catch (e) {}
}

/* The stamp is set by wrapping exportData rather than by editing it, because
   there is no single exportData to edit: b2a.js declares one and pro-polish.js
   replaces it wholesale at load time. backup.js is last in the chain in
   app.js, so whatever it finds here is what the Export button actually runs —
   a hook placed in b2a.js is dead code, which is exactly what the first
   attempt at this turned out to be. */
(function () {
  var prev = window.exportData;
  if (typeof prev !== 'function') return;
  window.exportData = function () {
    var out = prev.apply(this, arguments);
    markBackup();
    return out;
  };
})();

/* The line under Export/Import in Paramètres, so the state is legible before
   the reminder ever has to appear. */
function renderBackupStatus() {
  var due = daysSinceBackup() === null || daysSinceBackup() >= BACKUP_AFTER_DAYS;
  var tone = due ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400';
  var badge = due ? t('backup.statusDue') : t('backup.statusOk');
  return '<p class="text-xs mt-3 flex items-center gap-1.5 ' + tone + '">' +
           '<i data-lucide="' + (due ? 'alert-circle' : 'check-circle') + '" class="w-3.5 h-3.5"></i>' +
           esc(backupAgeLabel()) + ' · ' + esc(badge) +
         '</p>';
}
