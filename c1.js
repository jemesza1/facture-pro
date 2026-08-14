function openNewInvoice(editId){
  const inv=editId?state.invoices.find(i=>i.id===editId):null;
  const items=inv&&inv.items&&inv.items.length?inv.items:[{description:'',qty:1,unitPrice:0,tva:19}];
  openModal(`<div class="modal max-w-3xl" onclick="event.stopPropagation()">
    <div class="modal-header"><h3 class="font-semibold">${editId?'Modifier':'Nouvelle'} facture</h3>
    <button onclick="closeModal()" class="btn-ghost p-2"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="modal-body space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="form-label">Client *</label>
          <select id="inv-client" class="form-select"><option value="">— Choisir —</option>
          ${state.clients.map(c=>`<option value="${c.id}" ${inv&&inv.clientId===c.id?'selected':''}>${c.name}</option>`).join('')}
          </select></div>
        <div><label class="form-label">Modèle</label>
          <select id="inv-template" class="form-select">
          ${TEMPLATES.map(t=>`<option value="${t.id}" ${inv&&inv.template===t.id?'selected':''}>${t.name}</option>`).join('')}
          </select></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div><label class="form-label">Date</label><input type="date" id="inv-date" class="form-input" value="${inv&&inv.date||new Date().toISOString().slice(0,10)}"/></div>
        <div><label class="form-label">Échéance</label><input type="date" id="inv-due" class="form-input" value="${inv&&inv.dueDate||''}"/></div>
        <div><label class="form-label">Statut</label><select id="inv-status" class="form-select">
          ${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${inv&&inv.status===k?'selected':''}>${v.label}</option>`).join('')}
        </select></div>
      </div>
      <div>
        <div class="flex justify-between mb-2"><label class="form-label mb-0">Lignes</label>
          <button type="button" onclick="addInvoiceItem()" class="text-sm text-sky-600 font-medium">+ Ajouter</button></div>
        <div id="items-container" class="space-y-2">${items.map(item=>itemRowHtml(item)).join('')}</div>
      </div>
      <div><label class="form-label">Notes</label>
        <textarea id="inv-notes" class="form-input" rows="2">${inv&&inv.notes||'Paiement par virement bancaire.'}</textarea></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeModal()" class="btn-secondary">Retour</button>
      <button onclick="saveInvoice('${editId||''}')" class="btn-primary">${editId?'Mettre à jour':'Créer'}</button>
    </div>
  </div>`);
  try{lucide.createIcons();}catch(e){}
}
function itemRowHtml(item){
  item=item||{};
  return `<div class="grid grid-cols-12 gap-1.5 items-end item-row">
    <div class="col-span-12 sm:col-span-5"><label class="form-label text-xs">Désignation</label>
      <input class="form-input item-desc" value="${(item.description||'').replace(/"/g,'&quot;')}"/></div>
    <div class="col-span-3 sm:col-span-2"><label class="form-label text-xs">Qté</label>
      <input type="number" min="0" class="form-input item-qty" value="${item.qty!=null?item.qty:1}"/></div>
    <div class="col-span-4 sm:col-span-2"><label class="form-label text-xs">P.U. HT</label>
      <input type="number" min="0" class="form-input item-price" value="${item.unitPrice!=null?item.unitPrice:0}"/></div>
    <div class="col-span-3 sm:col-span-2"><label class="form-label text-xs">TVA</label>
      <select class="form-select item-tva">
        <option value="19" ${(item.tva!=null?item.tva:19)===19?'selected':''}>19%</option>
        <option value="9" ${item.tva===9?'selected':''}>9%</option>
        <option value="0" ${item.tva===0?'selected':''}>0%</option>
      </select></div>
    <div class="col-span-2 sm:col-span-1">
      <button type="button" onclick="this.closest('.item-row').remove()" class="btn-ghost p-2 text-red-500">
        <i data-lucide="trash-2" class="w-4 h-4"></i></button></div>
  </div>`;
}
function addInvoiceItem(){
  const c=document.getElementById('items-container');
  const d=document.createElement('div');
  d.innerHTML=itemRowHtml({});
  c.appendChild(d.firstElementChild);
  try{lucide.createIcons();}catch(e){}
}
function saveInvoice(editId){
  const clientId=document.getElementById('inv-client').value;
  if(!clientId)return toast('Choisissez un client','err');
  const items=[];
  document.querySelectorAll('.item-row').forEach(row=>{
    const desc=row.querySelector('.item-desc').value.trim();
    if(!desc)return;
    items.push({description:desc,qty:parseFloat(row.querySelector('.item-qty').value)||0,unitPrice:parseFloat(row.querySelector('.item-price').value)||0,tva:parseFloat(row.querySelector('.item-tva').value)||0});
  });
  if(!items.length)return toast('Ajoutez une ligne','err');
  const data={clientId,template:document.getElementById('inv-template').value,date:document.getElementById('inv-date').value,dueDate:document.getElementById('inv-due').value,status:document.getElementById('inv-status').value,items,notes:document.getElementById('inv-notes').value.trim()};
  if(editId){const idx=state.invoices.findIndex(i=>i.id===editId);state.invoices[idx]={...state.invoices[idx],...data};toast('Mise à jour');}
  else{const year=new Date().getFullYear();const number='FAC-'+year+'-'+String(state.nextInvoiceNumber).padStart(3,'0');state.invoices.push({id:uid(),number,...data});state.nextInvoiceNumber++;toast('Créée');}
  saveData();closeModal();navigate('invoices');
}
function editInvoice(id){openNewInvoice(id);}
function getTpl(id){return TEMPLATES.find(t=>t.id===id)||TEMPLATES[0];}
