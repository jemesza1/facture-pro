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
function renderHelp(){return`<div class="max-w-3xl space-y-5"><div class="card p-5"><h3 class="font-semibold text-lg mb-3">${t('help.title')}</h3><ol class="space-y-3 text-sm list-decimal list-inside"><li><strong>${t('help.settings')}</strong> ${t('help.s1')}</li><li><strong>${t('help.clients')}</strong> ${t('help.s2')}</li><li><strong>${t('help.newInvoice')}</strong> ${t('help.s3')}</li><li><strong>${t('help.follow')}</strong> ${t('help.s5')}</li><li><strong>${t('help.pdf')}</strong> ${t('help.s4')}</li><li><strong>${t('help.exportK')}</strong> ${t('help.s6')}</li></ol></div><div class="card p-5"><h3 class="font-semibold mb-1">${t('guide.title')}</h3><p class="text-sm text-slate-500 mb-3">${t('guide.sub')}</p><a href="guide.html" class="btn-primary inline-flex"><i data-lucide="book-open" class="w-4 h-4"></i> ${t('guide.cta')}</a></div><div class="card p-5"><h3 class="font-semibold mb-1">${t('install.title')}</h3><p class="text-sm text-slate-500 mb-3">${t('install.sub')}</p><button type="button" onclick="fpInstall()" class="btn-secondary"><i data-lucide="download" class="w-4 h-4"></i> ${t('install.cta')}</button></div><div class="card p-5"><h3 class="font-semibold mb-3">${t('tools.title')}</h3><div class="flex flex-wrap gap-2"><a href="montant-en-lettres.html" class="btn-secondary">${t('tools.words')}</a><a href="droit-de-timbre.html" class="btn-secondary">${t('tools.timbre')}</a><a href="calcul-tva.html" class="btn-secondary">${t('tools.tva')}</a><a href="calcul-salaire.html" class="btn-secondary">${t('tools.salaire')}</a><a href="international.html" class="btn-secondary">${t('tools.intl')}</a></div><p class="text-xs text-slate-500 mt-2">${t('tools.sub')}</p></div><div class="card p-5"><h3 class="font-semibold mb-1">${t('contact.title')}</h3><p class="text-sm text-slate-500 mb-3">${t('contact.sub')}</p><div class="flex flex-wrap gap-2"><a href="https://www.facebook.com/share/18MFPVTn2V/" target="_blank" rel="noopener noreferrer" class="btn-primary inline-flex" style="background:#1877f2"><i data-lucide="facebook" class="w-4 h-4"></i> ${t('contact.fb')}</a><a href="mailto:mrkorichi.a@gmail.com" class="btn-secondary"><i data-lucide="mail" class="w-4 h-4"></i> ${t('contact.mail')}</a></div></div><div class="card p-5 bg-sky-50 border border-sky-200"><p class="text-sm"><strong>${t('help.tip')}</strong> ${t('help.tipStart')} <button onclick="navigate('settings')" class="text-sky-600 underline font-medium">${t('nav.settings')}</button>${t('help.tipEnd')}</p></div></div>`;}
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
