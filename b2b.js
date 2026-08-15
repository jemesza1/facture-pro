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
function renderHelp(){return`<div class="max-w-3xl space-y-5"><div class="card p-5"><h3 class="font-semibold text-lg mb-3">${t('help.title')}</h3><ol class="space-y-3 text-sm list-decimal list-inside"><li><strong>${t('help.settings')}</strong> ${t('help.s1')}</li><li><strong>${t('help.clients')}</strong> ${t('help.s2')}</li><li><strong>${t('help.newInvoice')}</strong> ${t('help.s3')}</li><li><strong>${t('help.follow')}</strong> ${t('help.s5')}</li><li><strong>${t('help.pdf')}</strong> ${t('help.s4')}</li><li><strong>${t('help.exportK')}</strong> ${t('help.s6')}</li></ol></div><div class="card p-5 bg-sky-50 border border-sky-200"><p class="text-sm"><strong>${t('help.tip')}</strong> ${t('help.tipStart')} <button onclick="navigate('settings')" class="text-sky-600 underline font-medium">${t('nav.settings')}</button>${t('help.tipEnd')}</p></div></div>`;}
function renderTerms(){return`<div class="max-w-3xl"><div class="card p-5 space-y-3 text-sm"><h3 class="font-semibold text-lg">${t('terms.title')}</h3><p>${t('terms.intro')}</p><p><strong>${t('terms.h1')}</strong> — ${t('terms.p1')}</p><p><strong>${t('terms.h2')}</strong> — ${t('terms.p2')}</p><p><strong>${t('terms.h3')}</strong> — ${t('terms.p3')}</p><p><strong>${t('terms.h4')}</strong> — ${t('terms.p4')}</p><p class="text-xs text-slate-400 mt-4">Created by CheMs SoUu</p></div></div>`;}
function openModal(html){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()">${html}</div>`;try{lucide.createIcons();}catch(e){}}
function closeModal(){document.getElementById('modal-root').innerHTML='';}
function openClientModal(id=null){const client=id?state.clients.find(c=>c.id===id):{name:'',email:'',address:'',nif:'',nis:'',rc:'',ai:'',phone:''};openModal(`<div class="modal" onclick="event.stopPropagation()"><div class="modal-header"><h3 class="font-semibold">${id?t('actions.edit'):t('actions.newClient')}</h3><button onclick="closeModal()" class="btn-ghost p-2"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="modal-body space-y-3"><div><label class="form-label">${t('clients.nameReq')}</label><input id="cli-name" class="form-input" value="${client.name||''}" /></div><div><label class="form-label">${t('clients.nif')}</label><input id="cli-nif" class="form-input" value="${client.nif||''}" /></div><div class="grid grid-cols-2 gap-3"><div><label class="form-label">${t('clients.nis')}</label><input id="cli-nis" class="form-input" value="${client.nis||''}" /></div><div><label class="form-label">${t('clients.rc')}</label><input id="cli-rc" class="form-input" placeholder="16/00-0000000B00" value="${client.rc||''}" /></div></div><div><label class="form-label">${t('clients.ai')}</label><input id="cli-ai" class="form-input" value="${client.ai||''}" /></div><div><label class="form-label">${t('clients.email')}</label><input id="cli-email" class="form-input" value="${client.email||''}" /></div><div><label class="form-label">${t('clients.address')}</label><textarea id="cli-address" class="form-input" rows="2">${client.address||''}</textarea></div><div><label class="form-label">${t('clients.phone')}</label><input id="cli-phone" class="form-input" value="${client.phone||''}" /></div></div><div class="modal-footer"><button onclick="closeModal()" class="btn-secondary">${t('actions.back')}</button><button onclick="saveClient('${id||''}')" class="btn-primary">${t('actions.save')}</button></div></div>`);}
function saveClient(id){const data={name:document.getElementById('cli-name').value.trim(),nif:document.getElementById('cli-nif').value.trim(),nis:document.getElementById('cli-nis').value.trim(),rc:document.getElementById('cli-rc').value.trim(),ai:document.getElementById('cli-ai').value.trim(),email:document.getElementById('cli-email').value.trim(),address:document.getElementById('cli-address').value.trim(),phone:document.getElementById('cli-phone').value.trim()};if(!data.name)return toast(t('toast.nameRequired'),'err');if(id){const idx=state.clients.findIndex(c=>c.id===id);if(idx<0)return toast(t('toast.clientNotFound'),'err');state.clients[idx]={...state.clients[idx],...data};}else state.clients.push({id:uid(),...data});saveData();closeModal();toast(id?'Modifié':'Ajouté');renderPage();}
