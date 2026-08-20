/* FacturePro — sauvegarde dans le Google Drive du commerçant.

   Le guide dit, section 7, que tout vit dans localStorage et qu'un cache vidé
   est un livre de comptes effacé. backup.js le répète tous les trente jours.
   Les deux demandent la même chose à la même personne : pense à exporter.

   Ceci le fait à sa place, et le fichier ne part pas chez nous. Il part dans
   le Drive du commerçant, sous son compte à lui. Nous ne le voyons jamais, il
   n'y a pas de serveur à payer, et le jour où il change de téléphone ses
   factures sont là où il sait les retrouver.

   Trois décisions tiennent le reste :

   - localStorage reste la source. L'application lit et écrit là comme avant,
     fonctionne sans réseau comme avant, et Drive n'est qu'une copie qui suit.
     Rien ici n'est sur le chemin d'une facture qu'on saisit.
   - La bibliothèque Google n'est chargée qu'au clic. C'est la seule dépendance
     externe du projet après la police, et elle ne peut pas être servie depuis
     ce domaine — Google l'interdit. Chargée au démarrage, elle ferait d'une
     application hors-ligne une application qui attend Google. Chargée au clic,
     elle ne concerne que celui qui a demandé la synchronisation.
   - Le jeton d'accès ne va jamais dans localStorage. Il vit une heure dans une
     variable et meurt avec l'onglet. Un jeton écrit sur le disque est un jeton
     qu'un autre script de la page peut lire.

   Il manque une chose pour que tout ceci s'allume : DRIVE_CLIENT_ID. Il se
   crée en cinq minutes sur console.cloud.google.com (Drive API activée, écran
   de consentement externe, portée drive.file, identifiant OAuth « Application
   Web » avec ce domaine dans les origines autorisées). Il est public — il est
   lisible dans ce fichier par n'importe quel visiteur, c'est prévu ainsi ; le
   « client secret » de la même page, lui, ne sert pas ici et ne doit jamais y
   être collé. Tant que la ligne est vide, la carte ne s'affiche pas et rien
   dans l'application ne change. */

var DRIVE_CLIENT_ID = '95064197490-jg254go0f9qqb15m0d20kh10k1aomgb9.apps.googleusercontent.com';

/* drive.file, et rien d'autre. Cette portée ne donne accès qu'aux fichiers que
   cette application a créés : le reste du Drive du commerçant lui reste
   invisible, ce qui est à la fois la bonne limite et la portée que Google
   valide sans examen de sécurité. */
var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
var DRIVE_GSI = 'https://accounts.google.com/gsi/client';

/* Un fichier, réécrit. Pas un par jour : un dossier de trois cents fichiers
   n'est pas une sauvegarde, c'est une question de plus à poser le jour où il
   faut en choisir un. Visible dans le Drive, et non caché dans appDataFolder,
   parce qu'une sauvegarde qu'on peut voir et envoyer à son comptable rassure
   plus qu'une sauvegarde dont il faut nous croire sur parole. */
var DRIVE_FILE_NAME = 'facturepro-sauvegarde.json';

var DRIVE_FILE_KEY = 'fp_drive_file_id';
var DRIVE_SYNC_KEY = 'fp_drive_last_sync';
var DRIVE_SEEN_KEY = 'fp_drive_connected';
/* The modifiedTime Drive reported for the copy we ourselves last wrote. What
   makes a second device detectable: if the file up there no longer carries
   this stamp, somebody else wrote it. */
var DRIVE_MTIME_KEY = 'fp_drive_mtime';

var driveToken = null;      /* en mémoire seulement, une heure */
var driveClient = null;
var driveGsiLoading = null;
var driveBusy = false;
var driveDirty = false;      /* edited since the last copy went up */
var driveConflict = false;   /* the copy up there moved under us */
var driveTimer = null;
var driveRestoring = false;  /* a restore writes state; that write is not news */

function driveConfigured() { return !!DRIVE_CLIENT_ID; }

function driveLocal(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function driveStore(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function driveForget(k) { try { localStorage.removeItem(k); } catch (e) {} }

function driveFileId() { return driveLocal(DRIVE_FILE_KEY) || ''; }
function driveConnected() { return !!driveLocal(DRIVE_SEEN_KEY); }

function driveLastSync() {
  var v = parseInt(driveLocal(DRIVE_SYNC_KEY) || '0', 10);
  return v > 0 ? v : null;
}

/* ------------------------------------------------------------------ *
 * Chargement paresseux et connexion
 * ------------------------------------------------------------------ */

function driveLoadGsi() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    return Promise.resolve();
  }
  if (driveGsiLoading) return driveGsiLoading;
  driveGsiLoading = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = DRIVE_GSI;
    s.async = true;
    s.onload = function () { res(); };
    s.onerror = function () { driveGsiLoading = null; rej(new Error('gsi')); };
    document.head.appendChild(s);
  });
  return driveGsiLoading;
}

/* prompt:'' ne redemande le consentement que s'il n'a jamais été donné sur cet
   appareil. Une deuxième sauvegarde dans la même journée ne doit pas rouvrir
   la fenêtre Google. */
function driveAuth() {
  if (driveToken) return Promise.resolve(driveToken);
  return driveLoadGsi().then(function () {
    return new Promise(function (res, rej) {
      if (!driveClient) {
        driveClient = google.accounts.oauth2.initTokenClient({
          client_id: DRIVE_CLIENT_ID,
          scope: DRIVE_SCOPE,
          callback: function (r) {
            if (r && r.access_token) {
              driveToken = r.access_token;
              driveStore(DRIVE_SEEN_KEY, '1');
              driveResolve(r.access_token);
            } else {
              driveReject(new Error('denied'));
            }
          },
          error_callback: function () { driveReject(new Error('denied')); }
        });
      }
      driveResolve = res;
      driveReject = rej;
      driveClient.requestAccessToken(driveConnected() ? {prompt: ''} : {});
    });
  });
}
var driveResolve = function () {};
var driveReject = function () {};

/* ------------------------------------------------------------------ *
 * Appels Drive
 * ------------------------------------------------------------------ */

/* Un jeton dure une heure et l'onglet d'un commerçant reste ouvert la journée.
   Le 401 n'est donc pas une erreur : c'est l'heure passée. On le jette, on en
   redemande un, et on rejoue l'appel une fois. */
function driveCall(url, opts, o) {
  o = o || {};
  /* A silent call never asks Google for anything. The automatic sync runs on a
     timer, and a timer that can open a consent window opens it with no click
     behind it — which browsers block and merchants read as the application
     doing something on its own. Without a live token the silent path simply
     does not run. */
  var tok = o.silent
    ? (driveToken ? Promise.resolve(driveToken) : Promise.reject(new Error('silent')))
    : driveAuth();
  return tok.then(function (t) {
    opts = opts || {};
    opts.headers = Object.assign({}, opts.headers || {}, {Authorization: 'Bearer ' + t});
    return fetch(url, opts);
  }).then(function (res) {
    if (res.status === 401 && !o.retried) {
      driveToken = null;
      return driveCall(url, opts, {silent: o.silent, retried: true});
    }
    return res;
  });
}

function driveUpload(payload, o) {
  var id = driveFileId();
  var meta = {name: DRIVE_FILE_NAME, mimeType: 'application/json'};
  var b = 'fp' + String(Date.now()) + 'x';
  /* multipart/related, la forme que l'API attend — et non le multipart/form-data
     qu'un FormData produirait. */
  var body =
    '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(meta) + '\r\n' +
    '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(payload) + '\r\n' +
    '--' + b + '--';
  var url = 'https://www.googleapis.com/upload/drive/v3/files' +
            (id ? '/' + encodeURIComponent(id) : '') +
            '?uploadType=multipart&fields=id,modifiedTime';

  return driveCall(url, {
    method: id ? 'PATCH' : 'POST',
    headers: {'Content-Type': 'multipart/related; boundary=' + b},
    body: body
  }, o).then(function (res) {
    /* L'identifiant mémorisé peut désigner un fichier supprimé du Drive, ou le
       fichier d'un autre compte Google si le commerçant en a changé. Dans les
       deux cas on ne le retrouve pas : on l'oublie et on en écrit un neuf. */
    if ((res.status === 404 || res.status === 403) && id) {
      driveForget(DRIVE_FILE_KEY);
      driveForget(DRIVE_MTIME_KEY);
      return driveUpload(payload, o);
    }
    if (!res.ok) throw new Error('upload ' + res.status);
    return res.json();
  });
}

function driveFind() {
  var q = "name='" + DRIVE_FILE_NAME + "' and trashed=false";
  var url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) +
            '&fields=' + encodeURIComponent('files(id,name,modifiedTime)') +
            '&orderBy=modifiedTime desc&pageSize=10';
  return driveCall(url, {}).then(function (res) {
    if (!res.ok) throw new Error('find ' + res.status);
    return res.json();
  }).then(function (j) {
    return (j.files || [])[0] || null;
  });
}

/* Reads the stamp on the copy in the Drive without downloading it. */
function driveRemoteMtime(o) {
  var id = driveFileId();
  if (!id) return Promise.resolve(null);
  var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) +
            '?fields=modifiedTime';
  return driveCall(url, {}, o).then(function (res) {
    if (!res.ok) return null;      /* a file we cannot read is handled by the upload */
    return res.json();
  }).then(function (j) { return j ? j.modifiedTime : null; });
}

/* Two devices, one file, and no merge: the second save would carry away the
   first one's day of work. So the stamp we wrote is compared with the stamp up
   there, and a difference stops the write rather than resolving it. Nothing is
   guessed and nothing is lost — the merchant is told, and decides. */
function driveMovedUnderUs(remote) {
  var mine = driveLocal(DRIVE_MTIME_KEY);
  if (!mine || !remote) return false;
  return remote !== mine;
}

function driveDownload(id) {
  var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(id) + '?alt=media';
  return driveCall(url, {}).then(function (res) {
    if (!res.ok) throw new Error('download ' + res.status);
    return res.json();
  });
}

/* ------------------------------------------------------------------ *
 * Les deux boutons
 * ------------------------------------------------------------------ */

function driveFail(e) {
  var msg = String(e && e.message || e);
  if (msg === 'denied') return t('drive.denied');
  if (msg === 'gsi') return t('drive.offline');
  return t('drive.failed');
}

/* One writer, two callers. explicit is the button: it may open Google's
   window, it may ask a question, and it says what happened. The silent caller
   is the timer: it writes only when everything is already in place, and gives
   up quietly the moment it is not — leaving the work marked as unsynced rather
   than interrupting somebody who is writing an invoice. */
function drivePush(explicit) {
  if (!driveConfigured() || driveBusy) return Promise.resolve(false);
  if (!navigator.onLine) {
    driveDirty = true;
    if (explicit) toast(t('drive.offline'), 'err');
    return Promise.resolve(false);
  }
  var o = explicit ? {} : {silent: true};
  driveBusy = true;
  if (explicit) drivePaint();

  return driveRemoteMtime(o).then(function (remote) {
    if (driveMovedUnderUs(remote)) {
      driveConflict = true;
      if (!explicit) return false;          /* never overwrite on a timer */
      var when = String(remote).slice(0, 10);
      if (!confirm(t('drive.conflictAsk').replace('{d}', when))) return false;
    }
    return driveUpload(window.buildBackup(), o).then(function (f) {
      if (f && f.id) driveStore(DRIVE_FILE_KEY, f.id);
      if (f && f.modifiedTime) driveStore(DRIVE_MTIME_KEY, f.modifiedTime);
      driveStore(DRIVE_SYNC_KEY, String(Date.now()));
      driveDirty = false;
      driveConflict = false;
      /* A copy laid down in the Drive is a backup. backup.js counts the days
         since the last one, and this is one of them — otherwise it would ask
         for an export from somebody who just saved. */
      if (typeof markBackup === 'function') markBackup();
      if (explicit) toast(t('drive.saved'));
      return true;
    });
  }).catch(function (e) {
    driveDirty = true;
    if (explicit) toast(driveFail(e), 'err');
    return false;
  }).then(function (ok) {
    driveBusy = false;
    if (explicit && state.currentPage === 'settings') renderPage(); else drivePaint();
    return ok;
  });
}

function driveSaveNow() { drivePush(true); }

function driveRestoreNow() {
  if (!driveConfigured() || driveBusy) return;
  if (!navigator.onLine) return toast(t('drive.offline'), 'err');
  driveBusy = true;
  drivePaint();
  driveFind().then(function (f) {
    if (!f) { toast(t('drive.none'), 'err'); return; }
    driveStore(DRIVE_FILE_KEY, f.id);
    /* The copy we just read is now the one we know about. Without this the
       first save after a restore reports a conflict with itself. */
    if (f.modifiedTime) driveStore(DRIVE_MTIME_KEY, f.modifiedTime);
    return driveDownload(f.id).then(function (d) {
      if (window.validBackup(d)) { toast(t('toast.badFile'), 'err'); return; }

      /* La même question que pour un fichier importé du disque, avec les mêmes
         chiffres : ce qui arrive, et ce que cela remplace. */
      var n = function (x) { return Array.isArray(x) ? x.length : 0; };
      var msg = t('confirm.import')
        .replace('{cli}', n(d.clients)).replace('{inv}', n(d.invoices))
        .replace('{oldCli}', n(state.clients)).replace('{oldInv}', n(state.invoices));
      if (!confirm(msg)) return;

      /* et la même copie de côté avant de toucher à quoi que ce soit */
      try {
        localStorage.setItem(STORAGE_KEY + '_avant_import',
                             localStorage.getItem(STORAGE_KEY) || '');
      } catch (e) {}

      driveRestoring = true;
      var applied = window.applyBackup(d);
      driveRestoring = false;
      if (!applied) { toast(t('toast.badFile'), 'err'); return; }
      driveStore(DRIVE_SYNC_KEY, String(Date.now()));
      driveDirty = false;
      driveConflict = false;
      toast(t('toast.importOk'));
    });
  }).catch(function (e) {
    toast(driveFail(e), 'err');
  }).then(function () {
    driveBusy = false;
    renderPage();
  });
}

function driveDisconnect() {
  driveToken = null;
  driveDirty = false;
  driveConflict = false;
  clearTimeout(driveTimer);
  driveForget(DRIVE_SEEN_KEY);
  /* L'identifiant du fichier survit : se déconnecter d'un appareil ne veut pas
     dire jeter la sauvegarde, et la retrouver au prochain clic vaut mieux que
     d'en écrire une deuxième à côté. */
  driveStore(DRIVE_SYNC_KEY, driveLocal(DRIVE_SYNC_KEY) || '0');
  toast(t('drive.disconnected'));
  renderPage();
}

/* ------------------------------------------------------------------ *
 * La carte dans Paramètres
 * ------------------------------------------------------------------ */

function driveSyncLabel() {
  var at = driveLastSync();
  if (!at) return t('drive.never');
  var d = Math.floor((Date.now() - at) / 86400000);
  var when = d === 0 ? t('backup.today')
           : d === 1 ? t('backup.yesterday')
           : t('backup.daysAgo').replace('{n}', String(d));
  return t('drive.lastOn').replace('{d}', when);
}

function renderDriveCard() {
  /* Sans identifiant OAuth, il n'y a rien à proposer : une carte qui explique
     pourquoi le bouton ne marche pas est pire que pas de carte. */
  if (!driveConfigured()) return '';

  var busy = driveBusy ? ' disabled style="opacity:.5;pointer-events:none"' : '';
  var on = driveConnected();

  return '<div class="card p-5" id="drive-card">' +
      '<h3 class="font-semibold mb-1 flex items-center gap-2">' +
        '<i data-lucide="cloud" class="w-4 h-4"></i>' + esc(t('drive.title')) +
      '</h3>' +
      '<p class="text-xs opacity-70 leading-relaxed mb-3">' + esc(t('drive.body')) + '</p>' +
      '<div class="flex flex-wrap gap-2">' +
        '<button type="button" onclick="driveSaveNow()" class="btn-primary"' + busy + '>' +
          '<i data-lucide="cloud-upload" class="w-4 h-4"></i> ' + esc(t('drive.save')) +
        '</button>' +
        '<button type="button" onclick="driveRestoreNow()" class="btn-secondary"' + busy + '>' +
          '<i data-lucide="cloud-download" class="w-4 h-4"></i> ' + esc(t('drive.restore')) +
        '</button>' +
        (on ? '<button type="button" onclick="driveDisconnect()" class="btn-ghost text-xs">' +
                esc(t('drive.disconnect')) + '</button>' : '') +
      '</div>' +
      '<p class="text-xs mt-3 ' +
        (driveConflict ? 'text-amber-700 dark:text-amber-400'
       : driveDirty ? 'opacity-90' : 'opacity-70') + '">' +
        esc(driveConflict ? t('drive.conflict')
          : driveDirty ? t('drive.pending')
          : driveSyncLabel()) +
      '</p>' +
    '</div>';
}

/* Repeindre la carte seule quand la page n'est pas rendue à nouveau. */
function drivePaint() {
  var host = document.getElementById('drive-card');
  if (!host || !driveConfigured()) return;
  var wrap = document.createElement('div');
  wrap.innerHTML = renderDriveCard();
  if (wrap.firstChild) host.replaceWith(wrap.firstChild);
  try { lucide.createIcons(); } catch (e) {}
}

/* ------------------------------------------------------------------ *
 * La synchronisation automatique
 *
 * Elle ne s'arme que dans une session où le commerçant a lui-même cliqué,
 * parce que c'est là — et seulement là — qu'un jeton vit en mémoire. Sans
 * jeton, une écriture est notée comme non synchronisée et attend le prochain
 * clic. C'est le prix à payer pour qu'aucune minuterie n'ouvre jamais une
 * fenêtre Google toute seule.
 * ------------------------------------------------------------------ */
(function () {
  var prev = window.saveData;
  if (typeof prev !== 'function') return;
  window.saveData = function () {
    var out = prev.apply(this, arguments);
    try {
      if (driveRestoring || !driveConfigured() || !driveConnected()) return out;
      driveDirty = true;
      if (!driveToken) { drivePaint(); return out; }
      /* Cinq secondes après la dernière frappe, pas à chaque ligne saisie :
         une facture de dix lignes est une sauvegarde, pas dix. */
      clearTimeout(driveTimer);
      driveTimer = setTimeout(function () { drivePush(false); }, 5000);
    } catch (e) {}
    return out;
  };
})();

/* Ce qui n'est pas parti attend le réseau, et non le prochain clic. */
window.addEventListener('online', function () {
  if (driveConfigured() && driveToken && driveDirty && !driveConflict) drivePush(false);
});
