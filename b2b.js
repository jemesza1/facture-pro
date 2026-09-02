function importData(e){
  const file=e.target.files?.[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(!data||typeof data!=='object')throw new Error('format');
      // validate before touching saved data — a bad file must not destroy it
      if('clients' in data && !Array.isArray(data.clients))throw new Error('clients');
      if('invoices' in data && !Array.isArray(data.invoices))throw new Error('invoices');
      if('company' in data && (typeof data.company!=='object'||!data.company))throw new Error('company');
      const clients=(data.clients||[]).filter(c=>c&&typeof c==='object'&&c.name).map(c=>({...c,id:c.id||uid()}));
      const invoices=(data.invoices||[]).filter(i=>i&&typeof i==='object'&&i.number)
        .map(i=>({...i,id:i.id||uid(),items:Array.isArray(i.items)?i.items:[]}));
      if(!clients.length&&!invoices.length)throw new Error('vide');
      state.clients=clients;
      state.invoices=invoices;
      if(data.company)state.company={...defaultCompany,...data.company};
      const n=Number(data.nextInvoiceNumber);
      state.nextInvoiceNumber=Number.isFinite(n)&&n>0?n:(invoices.length+1);
      saveData();toast(`Import OK — ${invoices.length} facture(s), ${clients.length} client(s)`);renderPage();
    }catch(err){console.error('import',err);toast(t('toast.badFile'),'err');}
  };
  reader.onerror=()=>toast(t('toast.unreadable'),'err');
  reader.readAsText(file);
}
function renderHelp(){return`<div class="max-w-3xl space-y-5"><div class="card p-5"><h3 class="font-semibold text-lg mb-3">${t('help.title')}</h3><ol class="space-y-3 text-sm list-decimal list-inside"><li><strong>${t('help.settings')}</strong> ${t('help.s1')}</li><li><strong>${t('help.clients')}</strong> ${t('help.s2')}</li><li><strong>${t('help.newInvoice')}</strong> ${t('help.s3')}</li><li><strong>${t('help.follow')}</strong> ${t('help.s5')}</li><li><strong>${t('help.pdf')}</strong> ${t('help.s4')}</li><li><strong>${t('help.exportK')}</strong> ${t('help.s6')}</li></ol></div><div class="card p-5"><h3 class="font-semibold mb-1">${t('guide.title')}</h3><p class="text-sm text-slate-500 mb-3">${t('guide.sub')}</p><a href="guide.html" class="btn-primary inline-flex"><i data-lucide="book-open" class="w-4 h-4"></i> ${t('guide.cta')}</a></div><div class="card p-5"><h3 class="font-semibold mb-1">${t('install.title')}</h3><p class="text-sm text-slate-500 mb-3">${t('install.sub')}</p><button type="button" onclick="fpInstall()" class="btn-secondary"><i data-lucide="download" class="w-4 h-4"></i> ${t('install.cta')}</button></div><div class="card p-5"><h3 class="font-semibold mb-3">${t('tools.title')}</h3><div class="flex flex-wrap gap-2"><a href="montant-en-lettres.html" class="btn-secondary">${t('tools.words')}</a><a href="droit-de-timbre.html" class="btn-secondary">${t('tools.timbre')}</a><a href="calcul-tva.html" class="btn-secondary">${t('tools.tva')}</a><a href="calcul-salaire.html" class="btn-secondary">${t('tools.salaire')}</a><a href="international.html" class="btn-secondary">${t('tools.intl')}</a><button type="button" onclick="navigate('outils')" class="btn-primary">${t('tools.all')}</button></div><p class="text-xs text-slate-500 mt-2">${t('tools.sub')}</p></div><div class="card p-5"><h3 class="font-semibold mb-1">${t('contact.title')}</h3><p class="text-sm text-slate-500 mb-3">${t('contact.sub')}</p><div class="flex flex-wrap gap-2"><a href="https://www.facebook.com/share/18MFPVTn2V/" target="_blank" rel="noopener noreferrer" class="btn-primary inline-flex" style="background:#1877f2"><i data-lucide="facebook" class="w-4 h-4"></i> ${t('contact.fb')}</a><a href="mailto:mrkorichi.a@gmail.com" class="btn-secondary"><i data-lucide="mail" class="w-4 h-4"></i> ${t('contact.mail')}</a></div></div><div class="card p-5 bg-sky-50 border border-sky-200"><p class="text-sm"><strong>${t('help.tip')}</strong> ${t('help.tipStart')} <button onclick="navigate('settings')" class="text-sky-600 underline font-medium">${t('nav.settings')}</button>${t('help.tipEnd')}</p></div></div>`;}
function renderTerms(){return`<div class="max-w-3xl"><div class="card p-5 space-y-3 text-sm"><h3 class="font-semibold text-lg">${t('terms.title')}</h3><p>${t('terms.intro')}</p><p><strong>${t('terms.h1')}</strong> — ${ltrCodes(t('terms.p1'))}</p><p><strong>${t('terms.h2')}</strong> — ${t('terms.p2')}</p><p><strong>${t('terms.h3')}</strong> — ${ltrCodes(t('terms.p3'))}</p><p><strong>${t('terms.h4')}</strong> — ${t('terms.p4')}</p><p class="text-xs text-slate-400 mt-4">Created by CheMs SoUu</p></div></div>`;}
/* Une modale qui ne prend pas le clavier n'est une modale que pour la souris.
   Sans role="dialog" un lecteur d'ecran annonce un groupe de champs sans dire
   qu'une fenetre s'est ouverte ; sans piege a focus, Tab continue de parcourir
   la page en dessous, qui est pourtant inaccessible ; et Echap, que tout le
   monde essaie en premier, ne rend rien. Tout passe par openModal, donc les
   trois se posent ici une seule fois et valent pour chaque fenetre de
   l'application — facture, client, produit, depense, recurrente. */
var _modalReturn = null;

function _modalFocusables(box){
  var sel = 'a[href],button:not([disabled]),input:not([disabled]),' +
            'select:not([disabled]),textarea:not([disabled]),' +
            '[tabindex]:not([tabindex="-1"])';
  /* getClientRects plutot que offsetParent : un champ cache par un onglet ne
     doit pas capturer le focus, mais offsetParent ment des qu'un ancetre est
     positionne en fixed, ce qu'est justement le fond de la modale. */
  return [].slice.call(box.querySelectorAll(sel)).filter(function(el){
    return el.getClientRects().length > 0;
  });
}

function _modalKey(e){
  var box = document.querySelector('#modal-root .modal');
  if(!box) return;
  if(e.key === 'Escape'){ e.preventDefault(); closeModal(); return; }
  if(e.key !== 'Tab') return;
  var f = _modalFocusables(box);
  if(!f.length){ e.preventDefault(); return; }
  var first = f[0], last = f[f.length-1], here = document.activeElement;
  var inside = box.contains(here);
  if(e.shiftKey ? (here === first || !inside) : (here === last || !inside)){
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }
}

function openModal(html){
  /* Ne l'ecrase pas si une modale en ouvre une autre : c'est au bouton qui a
     ouvert la premiere que le focus doit revenir a la fin. */
  if(!document.querySelector('#modal-root .modal')) _modalReturn = document.activeElement;
  document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()">${html}</div>`;
  try{lucide.createIcons();}catch(e){}
  var box = document.querySelector('#modal-root .modal');
  if(box){
    box.setAttribute('role','dialog');
    box.setAttribute('aria-modal','true');
    var h = box.querySelector('.modal-header h3') || box.querySelector('h3');
    if(h){ if(!h.id) h.id = 'fp-modal-title'; box.setAttribute('aria-labelledby', h.id); }
    /* Le premier champ, pas la croix de fermeture : on ouvre une modale pour
       la remplir, et arriver sur « fermer » invite a la refermer. */
    var target = _modalFocusables(box).filter(function(el){
      return /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    })[0] || _modalFocusables(box)[0];
    if(target){ try{ target.focus(); }catch(e){} }
  }
  /* En capture, pour passer avant les champs qui mangent la touche. Meme
     reference a chaque fois : le navigateur ne l'inscrit pas deux fois. */
  document.addEventListener('keydown', _modalKey, true);
}

function closeModal(){
  document.removeEventListener('keydown', _modalKey, true);
  document.getElementById('modal-root').innerHTML='';
  if(_modalReturn && document.contains(_modalReturn)){
    try{ _modalReturn.focus(); }catch(e){}
  }
  _modalReturn = null;
}
function openClientModal(id=null){const client=id?state.clients.find(c=>c.id===id):{name:'',email:'',address:'',nif:'',nin:'',nis:'',rc:'',ai:'',phone:''};openModal(`<div class="modal" onclick="event.stopPropagation()"><div class="modal-header"><h3 class="font-semibold">${id?t('actions.edit'):t('actions.newClient')}</h3><button onclick="closeModal()" class="btn-ghost p-2" aria-label="${t('ui.close')}"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="modal-body space-y-3"><div><label class="form-label" for="cli-name">${t('clients.nameReq')}</label><input id="cli-name" class="form-input" value="${esc(client.name||'')}" /></div><div class="grid grid-cols-2 gap-3"><div><label class="form-label" for="cli-nif">${t('clients.nif')}</label><input id="cli-nif" class="form-input ltr-code" value="${esc(client.nif||'')}" /></div><div><label class="form-label" for="cli-nin">${t('clients.nin')}</label><input id="cli-nin" class="form-input ltr-code" value="${esc(client.nin||'')}" /></div></div><div class="grid grid-cols-2 gap-3"><div><label class="form-label" for="cli-nis">${t('clients.nis')}</label><input id="cli-nis" class="form-input ltr-code" value="${esc(client.nis||'')}" /></div><div><label class="form-label" for="cli-rc">${t('clients.rc')}</label><input id="cli-rc" class="form-input ltr-code" placeholder="16/00-0000000B00" value="${esc(client.rc||'')}" /></div></div><div><label class="form-label" for="cli-ai">${t('clients.ai')}</label><input id="cli-ai" class="form-input ltr-code" value="${esc(client.ai||'')}" /></div><div><label class="form-label" for="cli-email">${t('clients.email')}</label><input id="cli-email" class="form-input" value="${esc(client.email||'')}" /></div><div><label class="form-label" for="cli-address">${t('clients.address')}</label><textarea id="cli-address" class="form-input" rows="2">${esc(client.address||'')}</textarea></div><div><label class="form-label" for="cli-phone">${t('clients.phone')}</label><input id="cli-phone" class="form-input ltr-code" value="${esc(client.phone||'')}" /></div></div><div class="modal-footer"><button onclick="closeModal()" class="btn-secondary">${t('actions.back')}</button><button onclick="saveClient('${id||''}')" class="btn-primary">${t('actions.save')}</button></div></div>`);}
function saveClient(id){const data={name:document.getElementById('cli-name').value.trim(),nif:document.getElementById('cli-nif').value.trim(),nin:document.getElementById('cli-nin').value.trim(),nis:document.getElementById('cli-nis').value.trim(),rc:document.getElementById('cli-rc').value.trim(),ai:document.getElementById('cli-ai').value.trim(),email:document.getElementById('cli-email').value.trim(),address:document.getElementById('cli-address').value.trim(),phone:document.getElementById('cli-phone').value.trim()};if(!data.name)return toast(t('toast.nameRequired'),'err');if(id){const idx=state.clients.findIndex(c=>c.id===id);if(idx<0)return toast(t('toast.clientNotFound'),'err');state.clients[idx]={...state.clients[idx],...data};}else state.clients.push({id:uid(),...data});saveData();closeModal();toast(id?'Modifié':'Ajouté');renderPage();}

/* ------------------------------------------------------------------ *
 * Les outils, depuis l'application.
 *
 * Deux mille deux cents visiteurs ouvrent « / » chaque mois et repartent a
 * 1,35 page : les vingt-six pages que le site publie n'existaient, pour eux,
 * que dans une carte au bas de l'Aide qui en citait cinq. Quatre-vingt-cinq
 * pour cent arrivent par telephone, ou la barre laterale dort derriere un
 * hamburger — c'est donc le tableau de bord qui porte la decouverte, et le
 * menu qui la rend permanente pour ceux qui reviennent.
 *
 * Ce tableau recopie GROUPS (tools-build-chrome.mjs) : memes groupes, meme
 * ordre, memes libelles. Un script de build ne se charge pas dans le
 * navigateur, alors la copie est faite a la main et une verification du
 * harnais relit GROUPS et echoue si les deux divergent, sur le nom du fichier
 * comme sur le libelle francais et le libelle arabe — c'est elle qui rend la
 * copie sure. Ne reformulez pas un libelle ici sans le reformuler la-bas,
 * sinon l'application et les vingt-sept pages du site cessent de dire le
 * meme mot.
 *
 * conditions.html n'y figure pas : le menu y mene deja, par navigate('terms').
 * Les quatre pages anglaises n'ont pas d'arabe, exactement comme dans GROUPS —
 * « UK invoice template » est le mot que l'on cherche, le traduire le perd.
 * ------------------------------------------------------------------ */
const OUTILS=[
  ['tools.gCalc','calculator',[
    ['droit-de-timbre.html','Droit de timbre','حق الطابع'],
    ['calcul-tva.html','Calcul TVA','حساب TVA'],
    ['calcul-marge.html','Marge et prix de vente','الربح وسعر البيع'],
    ['calcul-pourcentage.html','Pourcentage et remise','النسبة والتخفيض'],
    ['calcul-salaire.html','Calcul de salaire','حساب الأجر'],
    ['montant-en-lettres.html','Montant en lettres','المبلغ بالحروف']]],
  ['tools.gModeles','layout-template',[
    ['modele-facture-excel.html','Facture Excel','فاتورة Excel'],
    ['devis.html','Devis','عرض السعر'],
    ['facture-proforma.html','Facture proforma','الفاتورة الأولية'],
    ['bon-de-commande.html','Bon de commande','وصل الطلبية'],
    ['bon-de-livraison.html','Bon de livraison','وصل التسليم'],
    ['facture-avoir.html',"Facture d'avoir",'الإشعار الدائن']]],
  ['tools.gGuides','book-open',[
    ['telecharger.html','Installer sur PC','التثبيت على الحاسوب'],
    ['guide.html',"Guide d'utilisation",'دليل الاستعمال'],
    ['mentions-obligatoires-facture-algerie.html','Mentions obligatoires','البيانات الإجبارية'],
    ['facture-non-assujetti-tva.html','Non assujetti TVA','غير خاضع للرسم'],
    ['auto-entrepreneur-algerie.html','Auto-entrepreneur','صاحب مشروع ذاتي'],
    ['facture-acompte.html',"Facture d'acompte",'فاتورة التسبيق'],
    ['remplir-g50.html','Remplir le G50','ملء G50'],
    ['plan-comptable-scf.html','Plan comptable SCF','دليل الحسابات SCF']]],
  ['tools.gIntl','globe',[
    ['international.html','Autres pays','بلدان أخرى'],
    ['facture-maroc.html','Facture Maroc','فاتورة المغرب'],
    ['facture-tunisie.html','Facture Tunisie','فاتورة تونس'],
    ['uae-tax-invoice.html','UAE tax invoice',null],
    ['uk-invoice-template.html','UK invoice template',null],
    ['us-invoice-template.html','US invoice template',null],
    ['free-invoice-generator.html','Free invoice generator',null]]]
];

/* Les six que l'on ouvre en travaillant, pas les vingt-six. La marge vient en
   tete : elle sert par article tarife, la ou les autres servent par document
   emis — plusieurs fois par jour contre plusieurs fois par mois. Le G50 tient
   la derniere place non par frequence mais par enjeu : c'est le seul rendez-
   vous que l'administration fixe au commercant, et le seul qu'il ne choisit
   pas d'oublier. */
const OUTILS_DASH=[
  ['calcul-marge.html','tag'],['droit-de-timbre.html','stamp'],
  ['calcul-tva.html','calculator'],['montant-en-lettres.html','spell-check'],
  ['calcul-pourcentage.html','percent'],['remplir-g50.html','landmark']];

/* La langue est relue sur <html lang>, ecrit par applyLocale, plutot que sur
   la variable locale : le meme resultat, sans dependre de l'ordre de
   chargement des fichiers. */
function outilAr(){return document.documentElement.lang==='ar';}

/* Un libelle qui n'existe qu'en anglais entre dans une page dir="rtl" : sans
   <bdi>, le navigateur retourne sa ponctuation et « UK invoice template »
   s'affiche a l'envers. Le generateur du site fait deja exactement cela. */
function outilLabel(e){
  return (outilAr()&&e[2])?esc(e[2]):'<bdi>'+esc(e[1])+'</bdi>';
}

/* La classe outil-link n'est pas stylee : elle n'existe que pour que le
   harnais compte et suive ces liens sans deviner. La mise en forme vient de
   btn-secondary, qui porte deja sa cible de 44 px et sa variante sombre — un
   lien nu ferait une cible de 20 px sur un telephone. */
function renderOutils(){
  return `<div class="space-y-5">
  <p class="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">${esc(t('tools.lead'))}</p>
  ${OUTILS.map(g=>`<div class="card overflow-hidden">
    <div class="flex items-center gap-2 px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800">
      <i data-lucide="${g[1]}" class="w-4 h-4 shrink-0 text-emerald-700 dark:text-emerald-400"></i>
      <h3 class="section-title">${esc(t(g[0]))}</h3>
    </div>
    <div class="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
      ${g[2].map(e=>`<a href="/${e[0]}" class="outil-link btn-secondary w-full justify-start text-start">${outilLabel(e)}</a>`).join('')}
    </div>
  </div>`).join('')}
</div>`;}

/* Appelee depuis le litteral de renderDashboard (dash-fix.js), au-dessus des
   quatre chiffres — voir le commentaire la-bas pour la mesure qui l'y a mise.
   Elle reste courte pour cela : un titre, une ligne, une rangee de puces qui
   se replie. Les libelles sont relus dans OUTILS par leur nom de fichier, si
   bien que le tableau de bord ne peut pas nommer un outil autrement que la
   page Outils. */
function outilsCard(){
  const flat={};
  OUTILS.forEach(g=>g[2].forEach(e=>{flat[e[0]]=e;}));
  return `<div id="dash-outils" class="card p-4 sm:p-5">
  <div class="flex items-center justify-between gap-3">
    <h3 class="section-title">${esc(t('tools.title'))}</h3>
    <button type="button" onclick="navigate('outils')" class="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline shrink-0 -my-3 -me-2 px-2 py-3">${esc(t('tools.all'))}</button>
  </div>
  <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">${esc(t('tools.dashLead'))}</p>
  <div class="flex flex-wrap gap-2">
    ${OUTILS_DASH.map(d=>{const e=flat[d[0]];return e?`<a href="/${e[0]}" class="outil-link btn-secondary"><i data-lucide="${d[1]}" class="w-4 h-4 shrink-0"></i> ${outilLabel(e)}</a>`:'';}).join('')}
  </div>
</div>`;}
