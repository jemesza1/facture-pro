function openNewInvoice(editId){
  const inv=editId?state.invoices.find(i=>i.id===editId):null;
  const items=inv&&inv.items&&inv.items.length?inv.items:[{description:'',qty:1,unitPrice:0,tva:19}];
  openModal(`<div class="modal max-w-3xl" onclick="event.stopPropagation()">
    <div class="modal-header"><h3 class="font-semibold">${editId?t('actions.edit'):t('actions.newInvoice')}</h3>
    <button onclick="closeModal()" class="btn-ghost p-2"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="modal-body space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="form-label">${t('inv.clientReq')}</label>
          <select id="inv-client" class="form-select"><option value="">${t('inv.choose')}</option>
          ${state.clients.map(c=>`<option value="${c.id}" ${inv&&inv.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select></div>
        <div><label class="form-label">${t('inv.template')}</label>
          <select id="inv-template" class="form-select">
          ${TEMPLATES.map(t=>`<option value="${t.id}" ${inv&&inv.template===t.id?'selected':''}>${t.name}</option>`).join('')}
          </select></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div><label class="form-label">${t('inv.date')}</label><input type="date" id="inv-date" class="form-input" value="${inv&&inv.date||new Date().toISOString().slice(0,10)}"/></div>
        <div><label class="form-label">${t('inv.due')}</label><input type="date" id="inv-due" class="form-input" value="${inv&&inv.dueDate||''}"/></div>
        <div><label class="form-label">${t('inv.status')}</label><select id="inv-status" class="form-select">
          ${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${inv&&inv.status===k?'selected':''}>${v.label}</option>`).join('')}
        </select></div>
        <div><label class="form-label">${t('inv.payMode')}</label><select id="inv-paymode" class="form-select" onchange="renderTimbreHint()">
          ${['virement','especes','cheque','carte'].map(m=>`<option value="${m}" ${((inv&&inv.paymentMode)||'virement')===m?'selected':''}>${t('inv.pay.'+m)}</option>`).join('')}
        </select></div>
      </div>
      <p id="timbre-hint" class="text-xs opacity-70"></p>
      <div>
        <div class="flex justify-between mb-2"><label class="form-label mb-0">${t('inv.lines')}</label>
          <button type="button" onclick="addInvoiceItem()" class="text-sm text-sky-600 font-medium">${t('actions.add')}</button></div>
        <div id="items-container" class="space-y-2">${items.map(item=>itemRowHtml(item)).join('')}</div>
      </div>
      <div><label class="form-label">${t('inv.notes')}</label>
        <textarea id="inv-notes" class="form-input" rows="2">${esc(inv&&inv.notes||'Paiement par virement bancaire.')}</textarea></div>
    </div>
    <div class="modal-footer">
      <button onclick="closeModal()" class="btn-secondary">${t('actions.back')}</button>
      <button onclick="saveInvoice('${editId||''}')" class="btn-primary">${editId?t('actions.save'):t('actions.createInvoice')}</button>
    </div>
  </div>`);
  try{lucide.createIcons();}catch(e){}
  try{renderTimbreHint();}catch(e){}
}
function itemRowHtml(item){
  item=item||{};
  return `<div class="grid grid-cols-12 gap-1.5 items-end item-row">
    <div class="col-span-12 sm:col-span-5"><label class="form-label text-xs">${t('inv.desc')}</label>
      <input class="form-input item-desc" value="${esc(item.description)}"/></div>
    <div class="col-span-3 sm:col-span-2"><label class="form-label text-xs">${t('inv.qty')}</label>
      <input type="number" min="0" class="form-input item-qty" value="${item.qty!=null?item.qty:1}"/></div>
    <div class="col-span-4 sm:col-span-2"><label class="form-label text-xs">${t('inv.unit')}</label>
      <input type="number" min="0" class="form-input item-price" value="${item.unitPrice!=null?item.unitPrice:0}"/></div>
    <div class="col-span-3 sm:col-span-2"><label class="form-label text-xs">${t('inv.vat')}</label>
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
  if(!clientId)return toast(t('toast.pickClient'),'err');
  const items=[];
  document.querySelectorAll('.item-row').forEach(row=>{
    const desc=row.querySelector('.item-desc').value.trim();
    if(!desc)return;
    items.push({description:desc,qty:parseFloat(row.querySelector('.item-qty').value)||0,unitPrice:parseFloat(row.querySelector('.item-price').value)||0,tva:parseFloat(row.querySelector('.item-tva').value)||0});
  });
  if(!items.length)return toast(t('toast.addLine'),'err');
  const data={clientId,template:document.getElementById('inv-template').value,date:document.getElementById('inv-date').value,dueDate:document.getElementById('inv-due').value,status:document.getElementById('inv-status').value,paymentMode:(document.getElementById('inv-paymode')||{}).value||'virement',items,notes:document.getElementById('inv-notes').value.trim()};
  if(editId){const idx=state.invoices.findIndex(i=>i.id===editId);
    if(idx<0)return toast(t('toast.invoiceNotFound'),'err');
    state.invoices[idx]={...state.invoices[idx],...data};toast(t('toast.updated'));}
  else{const year=new Date().getFullYear();const number='FAC-'+year+'-'+String(state.nextInvoiceNumber).padStart(3,'0');state.invoices.push({id:uid(),number,...data});state.nextInvoiceNumber++;toast(t('toast.created'));}
  saveData();closeModal();navigate('invoices');
}
function editInvoice(id){openNewInvoice(id);}
function getTpl(id){return TEMPLATES.find(t=>t.id===id)||TEMPLATES[0];}

/* Explains, inside the editor, why a total is about to grow. */
function renderTimbreHint(){
  var el=document.getElementById('timbre-hint');if(!el)return;
  var sel=document.getElementById('inv-paymode');
  el.textContent=(sel&&sel.value==='especes')?t('inv.timbreHint'):'';
}
