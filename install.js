/* FacturePro — the install invitation.

   Self-contained on purpose: it paints its own styles and reads its own
   language, so the same file works on the application, the landing page and
   the guide, which do not share a stylesheet.

   Two paths, because the platforms differ. Chrome and Edge hand us a
   beforeinstallprompt event we can fire on a click. Safari on iPhone hands us
   nothing at all, so there the bar explains the two taps instead of pretending
   it can do them.

   It never nags: dismissed once, it stays quiet for 30 days, and it never
   appears at all to someone already running the installed app. */
(function () {
  var KEY = 'fp_install_hidden_until';
  var T = {
    fr: {
      title: 'Installer FacturePro',
      body: 'Vos factures depuis l’écran d’accueil, et même sans connexion.',
      cta: 'Installer',
      later: 'Plus tard',
      iosBody: 'Touchez Partager puis « Sur l’écran d’accueil ».',
      close: 'Fermer'
    },
    ar: {
      title: 'ثبّت تطبيق FacturePro',
      body: 'فواتيرك من الشاشة الرئيسية، وحتى بدون إنترنت.',
      cta: 'ثبّت الآن',
      later: 'لاحقاً',
      iosBody: 'اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية».',
      close: 'إغلاق'
    }
  };

  function lang() {
    try { if (localStorage.getItem('fp_locale') === 'ar') return 'ar'; } catch (e) {}
    return (document.documentElement.lang || 'fr').indexOf('ar') === 0 ? 'ar' : 'fr';
  }

  function installed() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) ||
           navigator.standalone === true;
  }

  function muted() {
    try {
      var until = parseInt(localStorage.getItem(KEY) || '0', 10);
      return until > Date.now();
    } catch (e) { return false; }
  }

  function mute() {
    try { localStorage.setItem(KEY, String(Date.now() + 30 * 24 * 3600 * 1000)); } catch (e) {}
  }

  function styles() {
    if (document.getElementById('fp-install-css')) return;
    var el = document.createElement('style');
    el.id = 'fp-install-css';
    el.textContent =
      '#fp-install{position:fixed;z-index:9999;left:12px;right:12px;bottom:12px;' +
      'max-width:520px;margin-inline:auto;background:#fff;color:#0f172a;' +
      'border:1px solid #e2e8f0;border-radius:16px;padding:14px 16px;' +
      'box-shadow:0 12px 32px rgba(15,23,42,.18);display:flex;gap:13px;' +
      'align-items:flex-start;font-family:inherit;' +
      'animation:fp-inst-up .28s cubic-bezier(.34,1.3,.64,1)}' +
      '@keyframes fp-inst-up{from{opacity:0;transform:translateY(14px)}}' +
      '@media(prefers-reduced-motion:reduce){#fp-install{animation:none}}' +
      '#fp-install .ic{width:42px;height:42px;border-radius:12px;flex:none;' +
      'background:linear-gradient(135deg,#059669,#00512a);display:grid;place-items:center}' +
      '#fp-install .ic svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2.1;' +
      'stroke-linecap:round;stroke-linejoin:round}' +
      '#fp-install .tx{flex:1;min-width:0}' +
      '#fp-install .tt{font-weight:700;font-size:14.5px;line-height:1.3}' +
      '#fp-install .bd{font-size:12.8px;color:#475569;margin-top:3px;line-height:1.45}' +
      '#fp-install .row{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}' +
      '#fp-install button{font:inherit;font-size:13px;font-weight:600;border:0;' +
      'border-radius:10px;padding:9px 16px;cursor:pointer;min-height:38px}' +
      '#fp-install .go{background:#006233;color:#fff}' +
      '#fp-install .go:hover{background:#00512a}' +
      '#fp-install .no{background:transparent;color:#64748b}' +
      '#fp-install .no:hover{background:#f1f5f9}' +
      '#fp-install .x{position:absolute;inset-inline-end:8px;top:8px;background:none;' +
      'border:0;color:#94a3b8;cursor:pointer;padding:5px;line-height:0;border-radius:8px}' +
      '#fp-install .x:hover{background:#f1f5f9;color:#0f172a}' +
      '@media(prefers-color-scheme:dark){' +
      '#fp-install{background:#0f172a;color:#f1f5f9;border-color:#1e293b}' +
      '#fp-install .bd{color:#94a3b8}' +
      '#fp-install .no:hover,#fp-install .x:hover{background:#1e293b;color:#f1f5f9}}';
    document.head.appendChild(el);
  }

  var bar = null;

  function hide() {
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
    bar = null;
  }

  function show(d, onInstall) {
    if (bar) return;
    shownWith = onInstall;
    styles();
    bar = document.createElement('div');
    bar.id = 'fp-install';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', d.title);
    bar.style.position = 'fixed';
    bar.innerHTML =
      '<span class="ic"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>' +
      '<path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg></span>' +
      '<div class="tx"><div class="tt"></div><div class="bd"></div><div class="row"></div></div>' +
      '<button class="x" type="button"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" ' +
      'stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';

    bar.querySelector('.tt').textContent = d.title;
    bar.querySelector('.bd').textContent = onInstall ? d.body : d.iosBody;

    var row = bar.querySelector('.row');
    if (onInstall) {
      var go = document.createElement('button');
      go.type = 'button'; go.className = 'go'; go.textContent = d.cta;
      go.addEventListener('click', onInstall);
      row.appendChild(go);
    }
    var no = document.createElement('button');
    no.type = 'button'; no.className = 'no'; no.textContent = onInstall ? d.later : d.close;
    no.addEventListener('click', function () { mute(); hide(); });
    row.appendChild(no);

    bar.querySelector('.x').addEventListener('click', function () { mute(); hide(); });
    bar.querySelector('.x').setAttribute('aria-label', d.close);
    document.body.appendChild(bar);
  }

  /* What show() was last called with, so the bar can be rebuilt verbatim when
     the language changes under it. The strings are written into the DOM once,
     at the moment the bar appears; without this it keeps the wording of
     whatever language was active then, in a page that has moved on. */
  var shownWith = null;

  window.fpInstallRelang = function () {
    if (!bar) return;
    var h = shownWith;
    hide();
    show(T[lang()], h);
  };

  var deferred = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (installed() || muted()) return;
    show(T[lang()], function () {
      hide();
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; }).catch(function () {});
    });
  });

  window.addEventListener('appinstalled', function () { mute(); hide(); });

  /* Called from a button in the page — always shows something, even when the
     browser has not offered a prompt, so the button is never a dead end. */
  window.fpInstall = function () {
    var d = T[lang()];
    if (installed()) return;
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () { deferred = null; }).catch(function () {});
      return;
    }
    hide();
    show(d, null);
  };

  /* iPhone gets no beforeinstallprompt, so offer the instructions instead. */
  addEventListener('load', function () {
    var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var safari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    if (iOS && safari && !installed() && !muted()) {
      setTimeout(function () { show(T[lang()], null); }, 2500);
    }
  });
})();
