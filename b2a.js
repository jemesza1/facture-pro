function renderSettings(){
  /* Les autres champs vont dans des value="…" que le navigateur relit tel
     quel : les échapper ici les ferait ressortir échappés à l'enregistrement.
     Seul le logo pose problème — il atterrit dans src="…", où une chaîne
     fabriquée referme l'attribut et ouvre un onerror — et un logo venu d'un
     fichier de sauvegarde importé n'est pas forcément un logo. */
  const c=Object.assign({},state.company,{logo:safeLogo(state.company&&state.company.logo),signature:safeLogo(state.company&&state.company.signature)});return`<div class="max-w-2xl space-y-5"><div class="card p-5 space-y-4"><h3 class="font-semibold text-lg">${t('company.title')}</h3>
<div class="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
${c.logo?`<img src="${c.logo}" alt="${t('company.logo')}" class="h-14 w-auto max-w-[120px] object-contain rounded-lg"/>`:`<div class="h-14 w-14 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs">${t('company.logo')}</div>`}
<div class="flex flex-col gap-1">
<label class="btn-secondary cursor-pointer text-sm py-1.5 px-3"><i data-lucide="image" class="w-4 h-4"></i> ${t('actions.addLogo')}<input type="file" accept="image/*" class="hidden" onchange="onLogoUpload(event)"/></label>
${c.logo?`<button type="button" onclick="removeLogo()" class="text-xs text-red-500 hover:underline text-start">${t('actions.delete')}</button>`:''}
</div></div><div><label class="form-label" for="set-name">${t('company.name')}</label><input id="set-name" class="form-input" value="${esc(c.name||'')}" /></div><div><label class="form-label" for="set-address">${t('company.address')}</label><textarea id="set-address" class="form-input" rows="2">${esc(c.address||'')}</textarea></div><div class="grid grid-cols-2 gap-3"><div><label class="form-label" for="set-nif">${t('company.nif')}</label><input id="set-nif" class="form-input ltr-code" value="${esc(c.nif||'')}" /></div><div><label class="form-label" for="set-nis">${t('company.nis')}</label><input id="set-nis" class="form-input ltr-code" value="${esc(c.nis||'')}" /></div></div><div><label class="form-label" for="set-nin">${t('company.nin')}</label><input id="set-nin" class="form-input ltr-code" value="${esc(c.nin||'')}" /><p class="text-xs opacity-60 mt-1">${t('company.ninHint')}</p></div><div class="grid grid-cols-2 gap-3"><div><label class="form-label" for="set-rc">${t('company.rc')}</label><input id="set-rc" class="form-input ltr-code" value="${esc(c.rc||'')}" /></div><div><label class="form-label" for="set-ai">${t('company.ai')}</label><input id="set-ai" class="form-input ltr-code" value="${esc(c.ai||'')}" /></div></div><div class="grid grid-cols-2 gap-3"><div><label class="form-label" for="set-email">${t('company.email')}</label><input id="set-email" class="form-input" value="${esc(c.email||'')}" /></div><div><label class="form-label" for="set-phone">${t('company.phone')}</label><input id="set-phone" class="form-input ltr-code" value="${esc(c.phone||'')}" /></div></div><div class="grid grid-cols-2 gap-3"><div><label class="form-label" for="set-rib">${t('company.rib')}</label><input id="set-rib" class="form-input ltr-code" value="${esc(c.rib||'')}" /></div><div><label class="form-label" for="set-banque">${t('company.bank')}</label><input id="set-banque" class="form-input" value="${esc(c.banque||'')}" /></div></div><p class="text-xs opacity-60">${t('company.timbreHint')}</p><div class="pt-3 border-t border-slate-200 dark:border-slate-700"><label class="flex items-start gap-3 cursor-pointer"><input type="checkbox" id="set-exempt" class="mt-1" ${c.tvaExempt?'checked':''} onchange="toggleExemptNote()"/><span><span class="font-medium text-sm">${t('company.exempt')}</span><span class="block text-xs opacity-60 mt-0.5">${t('company.exemptHint')}</span></span></label><div id="exempt-note-row" class="${c.tvaExempt?'':'hidden'} mt-2"><label class="form-label" for="set-exempt-note">${t('company.exemptNote')}</label><input id="set-exempt-note" class="form-input" value="${esc(c.tvaExemptNote||'')}" placeholder="TVA non applicable — art. 8 du Code des taxes sur le chiffre d’affaires" /></div></div><div class="pt-3 border-t border-slate-200 dark:border-slate-700"><p class="font-medium text-sm mb-1">${t('company.signature')}</p><p class="text-xs opacity-60 mb-2">${t('company.signatureHint')}</p><div class="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">${c.signature?`<img src="${c.signature}" alt="${t('company.signature')}" class="h-14 w-auto max-w-[160px] object-contain"/>`:`<div class="h-14 w-24 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 text-xs">${t('company.signature')}</div>`}<div class="flex flex-col gap-1"><button type="button" onclick="openSignaturePad()" class="btn-secondary text-sm py-1.5 px-3"><i data-lucide="pen-line" class="w-4 h-4"></i> ${t('actions.drawSignature')}</button><label class="btn-secondary cursor-pointer text-sm py-1.5 px-3"><i data-lucide="image" class="w-4 h-4"></i> ${t('actions.uploadSignature')}<input type="file" accept="image/*" class="hidden" onchange="onSignatureUpload(event)"/></label>${c.signature?`<button type="button" onclick="removeSignature()" class="text-xs text-red-500 hover:underline text-start">${t('actions.delete')}</button>`:''}</div></div><div class="mt-2"><label class="form-label" for="set-signataire">${t('company.signataire')}</label><input id="set-signataire" class="form-input" value="${esc(c.signataire||'')}" placeholder="${t('company.signatairePh')}" /></div></div><button onclick="saveSettings()" class="btn-primary"><i data-lucide="save" class="w-4 h-4"></i> ${t('actions.save')}</button></div><div class="card p-5"><h3 class="font-semibold mb-2">${t('company.data')}</h3><div class="flex gap-2"><button onclick="exportData()" class="btn-secondary"><i data-lucide="download" class="w-4 h-4"></i> ${t('actions.export')}</button><label class="btn-secondary cursor-pointer"><i data-lucide="upload" class="w-4 h-4"></i> ${t('actions.import')}<input type="file" accept=".json" class="hidden" onchange="importData(event)" /></label></div>${typeof renderBackupStatus==='function'?renderBackupStatus():''}</div>${typeof renderDriveCard==='function'?renderDriveCard():''}<div class="card p-5"><button onclick="if(confirm(t('confirm.resetAll'))){localStorage.removeItem(STORAGE_KEY);location.reload()}" class="btn-danger">${t('actions.reset')}</button></div></div>`;}
function onLogoUpload(e){const f=e.target.files&&e.target.files[0];if(!f)return;if(!f.type.startsWith('image/')){toast(t('toast.imageOnly'));return;}if(f.size>1500000){toast(t('toast.maxSize'));return;}const r=new FileReader();r.onload=()=>{state.company.logo=r.result;saveData();toast(t('toast.logoSaved'));renderPage();try{lucide.createIcons();}catch(err){}};r.readAsDataURL(f);}
function removeLogo(){state.company.logo='';saveData();toast(t('toast.logoDeleted'));renderPage();}
function saveSettings(){state.company={name:document.getElementById('set-name').value.trim(),address:document.getElementById('set-address').value.trim(),nif:document.getElementById('set-nif').value.trim(),nin:document.getElementById('set-nin').value.trim(),nis:document.getElementById('set-nis').value.trim(),rc:document.getElementById('set-rc').value.trim(),ai:document.getElementById('set-ai').value.trim(),email:document.getElementById('set-email').value.trim(),phone:document.getElementById('set-phone').value.trim(),rib:document.getElementById('set-rib').value.trim(),banque:document.getElementById('set-banque').value.trim(),logo:state.company.logo||'',signature:state.company.signature||'',signataire:(document.getElementById('set-signataire')||{value:''}).value.trim(),tvaExempt:!!(document.getElementById('set-exempt')||{}).checked,tvaExemptNote:(document.getElementById('set-exempt-note')||{value:''}).value.trim()};saveData();toast(t('toast.saved'));}
function exportData(){const data={company:state.company,clients:state.clients,invoices:state.invoices,nextInvoiceNumber:state.nextInvoiceNumber,exportedAt:new Date().toISOString()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`facturepro-${todayISO()}.json`;a.click();toast(t('toast.exportOk'));}

/* La case cochee revele la phrase, qui reste modifiable : aucun texte algerien
   n'impose une formulation au mot pres. */
function toggleExemptNote(){
  var row=document.getElementById('exempt-note-row');
  var box=document.getElementById('set-exempt');
  if(row&&box) row.classList.toggle('hidden', !box.checked);
}

/* Meme garde que le logo — c'est une image qui atterrit dans un src="…" — et
   meme plafond de taille : le tout vit dans localStorage, ou la place est
   comptee. Une signature depasse rarement quelques dizaines de kilo-octets. */
function onSignatureUpload(e){
  const f=e.target.files&&e.target.files[0]; if(!f)return;
  if(!f.type.startsWith('image/')){toast(t('toast.imageOnly'));return;}
  if(f.size>500000){toast(t('toast.maxSizeSign'));return;}
  const r=new FileReader();
  r.onload=()=>{ state.company.signature=safeLogo(r.result);
    if(!state.company.signature){toast(t('toast.imageOnly'),'err');return;}
    saveData();toast(t('toast.saved'));renderPage();try{lucide.createIcons();}catch(err){} };
  r.readAsDataURL(f);
}
function removeSignature(){state.company.signature='';saveData();toast(t('toast.signDeleted'));renderPage();}

/* Signer au doigt.
 *
 * Le telephone est l'appareil de quatre-vingt-cinq pour cent des visiteurs, et
 * c'est la que dessiner a un sens : on signe une fois, dans les reglages, et
 * chaque facture la porte ensuite. Les evenements pointeur couvrent le doigt,
 * le stylet et la souris d'un seul jeu ; touch-action:none empeche la page de
 * defiler sous le trait.
 *
 * Le trace est rogne a son encre avant d'etre garde : une toile pleine
 * enregistree telle quelle donne une bande transparente large comme la boite,
 * qui se retrouve minuscule au milieu du papier. */
function openSignaturePad(){
  if(typeof openModal!=='function')return;
  openModal('<div class="modal">'+
    '<div class="modal-header"><h3 class="font-semibold">'+esc(t('company.signature'))+'</h3>'+
    '<button type="button" onclick="closeModal()" class="btn-ghost" aria-label="'+esc(t('ui.close'))+'">&times;</button></div>'+
    '<div class="modal-body"><p class="text-xs opacity-60 mb-2">'+esc(t('company.padHint'))+'</p>'+
    '<canvas id="sig-pad" style="touch-action:none;width:100%;height:180px;background:#fff;border:1px dashed #94a3b8;border-radius:12px;display:block"></canvas></div>'+
    '<div class="modal-footer"><button type="button" onclick="clearSignaturePad()" class="btn-secondary">'+esc(t('actions.clear'))+'</button>'+
    '<button type="button" onclick="saveSignaturePad()" class="btn-primary">'+esc(t('actions.save'))+'</button></div></div>');
  setTimeout(initSignaturePad,60);
}
var _sigCtx=null,_sigInk=false;
function initSignaturePad(){
  var cv=document.getElementById('sig-pad'); if(!cv)return;
  var dpr=window.devicePixelRatio||1, r=cv.getBoundingClientRect();
  cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr);
  var ctx=cv.getContext('2d'); ctx.scale(dpr,dpr);
  ctx.lineWidth=2.2; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.strokeStyle='#0f172a';
  _sigCtx=ctx; _sigInk=false;
  var drawing=false;
  var pos=function(e){var b=cv.getBoundingClientRect();return [e.clientX-b.left,e.clientY-b.top];};
  cv.addEventListener('pointerdown',function(e){drawing=true;cv.setPointerCapture(e.pointerId);
    var p=pos(e);ctx.beginPath();ctx.moveTo(p[0],p[1]);e.preventDefault();});
  cv.addEventListener('pointermove',function(e){if(!drawing)return;
    var p=pos(e);ctx.lineTo(p[0],p[1]);ctx.stroke();_sigInk=true;e.preventDefault();});
  ['pointerup','pointercancel','pointerleave'].forEach(function(ev){
    cv.addEventListener(ev,function(){drawing=false;});
  });
}
function clearSignaturePad(){
  var cv=document.getElementById('sig-pad'); if(!cv||!_sigCtx)return;
  _sigCtx.clearRect(0,0,cv.width,cv.height); _sigInk=false;
}
function saveSignaturePad(){
  var cv=document.getElementById('sig-pad');
  if(!cv||!_sigInk){toast(t('toast.signEmpty'),'err');return;}
  var out=trimCanvas(cv);
  if(!out){toast(t('toast.signEmpty'),'err');return;}
  state.company.signature=safeLogo(out);
  saveData(); closeModal(); toast(t('toast.saved')); renderPage();
  try{lucide.createIcons();}catch(e){}
}
/* Rogne la toile a son encre. Renvoie une chaine vide si elle est vide. */
function trimCanvas(cv){
  try{
    var ctx=cv.getContext('2d'), d=ctx.getImageData(0,0,cv.width,cv.height).data;
    var x0=cv.width,y0=cv.height,x1=-1,y1=-1,x,y,i;
    for(y=0;y<cv.height;y++)for(x=0;x<cv.width;x++){
      i=(y*cv.width+x)*4+3;
      if(d[i]>8){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    }
    if(x1<0)return '';
    var pad=6;
    x0=Math.max(0,x0-pad); y0=Math.max(0,y0-pad);
    x1=Math.min(cv.width-1,x1+pad); y1=Math.min(cv.height-1,y1+pad);
    var out=document.createElement('canvas');
    out.width=x1-x0+1; out.height=y1-y0+1;
    out.getContext('2d').drawImage(cv,x0,y0,out.width,out.height,0,0,out.width,out.height);
    return out.toDataURL('image/png');
  }catch(e){ return cv.toDataURL('image/png'); }
}
