function openNewInvoice(editId){
  const inv=editId?state.invoices.find(i=>i.id===editId):null;
  const items=inv&&inv.items&&inv.items.length?inv.items:[{description:'',qty:1,unitPrice:0,tva:19}];
  openModal(`<div class="modal max-w-3xl" onclick="event.stopPropagation()">
    <div class="modal-header"><h3 class="font-semibold">${editId?t('actions.edit'):t('actions.newInvoice')}</h3>
    <button onclick="closeModal()" class="btn-ghost p-2" aria-label="${t('ui.close')}"><i data-lucide="x" class="w-5 h-5"></i></button></div>
    <div class="modal-body space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label class="form-label" for="inv-client">${t('inv.clientReq')}</label>
          <select id="inv-client" class="form-select"><option value="">${t('inv.choose')}</option>
          ${state.clients.map(c=>`<option value="${c.id}" ${inv&&inv.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}
          </select></div>
        <div><label class="form-label" for="inv-template">${t('inv.template')}</label>
          <select id="inv-template" class="form-select">
          ${(()=>{var opt=function(x){return `<option value="${x.id}" ${inv&&inv.template===x.id?'selected':''}>${x.name}</option>`;};
             var top=TEMPLATES.filter(function(x){return TEMPLATES_TOP.indexOf(x.id)>=0;})
                              .sort(function(a,b){return TEMPLATES_TOP.indexOf(a.id)-TEMPLATES_TOP.indexOf(b.id);});
             var rest=TEMPLATES.filter(function(x){return TEMPLATES_TOP.indexOf(x.id)<0;});
             /* Deux groupes plutot qu'une liste de vingt-neuf : le commercant
                emet une facture, il ne visite pas une galerie. Aucun modele
                n'est retire — celui d'une ancienne facture reste choisissable
                dans le second groupe. */
             return `<optgroup label="${esc(t('tpl.recommended'))}">${top.map(opt).join('')}</optgroup>`+
                    `<optgroup label="${esc(t('tpl.others'))}">${rest.map(opt).join('')}</optgroup>`;})()}
          </select></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div><label class="form-label" for="inv-date">${t('inv.date')}</label><input type="date" id="inv-date" class="form-input" value="${inv&&inv.date||new Date().toISOString().slice(0,10)}"/></div>
        <div><label class="form-label" for="inv-due">${t('inv.due')}</label><input type="date" id="inv-due" class="form-input" value="${inv&&inv.dueDate||''}"/></div>
        <div><label class="form-label" for="inv-status">${t('inv.status')}</label><select id="inv-status" class="form-select">
          ${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${inv&&inv.status===k?'selected':''}>${v.label}</option>`).join('')}
        </select></div>
        <div><label class="form-label" for="inv-paymode">${t('inv.payMode')}</label><select id="inv-paymode" class="form-select" onchange="renderTimbreHint();syncPayNote()">
          ${['virement','especes','cheque','carte'].map(m=>`<option value="${m}" ${((inv&&inv.paymentMode)||'virement')===m?'selected':''}>${t('inv.pay.'+m)}</option>`).join('')}
        </select></div>
      </div>
      <p id="timbre-hint" class="text-xs opacity-70"></p>
      <div>
        <div class="flex justify-between mb-2"><span class="form-label mb-0">${t('inv.lines')}</span>
          <button type="button" onclick="addInvoiceItem()" class="text-sm text-sky-600 font-medium">${t('actions.add')}</button></div>
        <div id="items-container" class="space-y-2">${items.map(item=>itemRowHtml(item)).join('')}</div>
      </div>
      <div><label class="form-label" for="inv-port">${t('inv.port')}</label>
        <input type="text" inputmode="decimal" min="0" step="0.01" id="inv-port" class="form-input ltr-code"
               placeholder="0" value="${inv&&inv.fraisPort||''}"/>
        <p class="text-xs text-slate-500 mt-1">${t('inv.portHint')}</p></div>
      <div><label class="form-label" for="inv-notes">${t('inv.notes')}</label>
        <textarea id="inv-notes" class="form-input" rows="2">${esc(inv&&inv.notes||payNote((inv&&inv.paymentMode)||'virement'))}</textarea></div>
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
    <div class="col-span-12 sm:col-span-5"><span class="form-label text-xs">${t('inv.desc')}</span>
      <input class="form-input item-desc" aria-label="${t('inv.desc')}" value="${esc(item.description)}"/></div>
    <div class="col-span-3 sm:col-span-2"><span class="form-label text-xs">${t('inv.qty')}</span>
      <div class="flex gap-1">
        <input type="text" inputmode="decimal" min="0" class="form-input item-qty min-w-0" aria-label="${t('inv.qty')}" value="${item.qty!=null?item.qty:1}"/>
        <input class="form-input item-unit min-w-0 w-16" aria-label="${t('inv.unit2')}" list="fp-units" placeholder="${t('inv.unit2')}"
               title="${t('inv.unit2')}" value="${esc(item.unite||'')}"/>
      </div></div>
    <div class="col-span-4 sm:col-span-2"><span class="form-label text-xs">${t('inv.unit')}</span>
      <input type="text" inputmode="decimal" min="0" class="form-input item-price" aria-label="${t('inv.unit')}" value="${item.unitPrice!=null?item.unitPrice:0}"/></div>
    <div class="col-span-3 sm:col-span-2"><span class="form-label text-xs">${t('inv.vat')}</span>
      <select class="form-select item-tva" aria-label="${t('inv.vat')}">
        <option value="19" ${(item.tva!=null?item.tva:19)===19?'selected':''}>19%</option>
        <option value="9" ${item.tva===9?'selected':''}>9%</option>
        <option value="0" ${item.tva===0?'selected':''}>0%</option>
      </select></div>
    <div class="col-span-2 sm:col-span-1">
      <button type="button" onclick="this.closest('.item-row').remove()" class="btn-ghost p-2 text-red-500" aria-label="${t('actions.delete')}">
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
  /* Une ligne sans designation est ignoree — c'est voulu, la derniere ligne
     vide du formulaire ne doit pas entrer dans la facture. Mais une ligne qui
     porte un prix ou une quantite et pas de mot n'est pas une ligne vide :
     c'est une ligne qu'on a oublie de nommer, et la faire disparaitre en
     annoncant « facture enregistree » retire de l'argent du document sans
     le dire. On la compte, et on refuse d'enregistrer. */
  let nommees=0, muettes=0;
  document.querySelectorAll('.item-row').forEach(row=>{
    const desc=row.querySelector('.item-desc').value.trim();
    if(!desc){
      const q=parseNum(row.querySelector('.item-qty').value);
      const p=parseNum(row.querySelector('.item-price').value);
      if((isFinite(q)&&q!==0)||(isFinite(p)&&p!==0)) muettes++;
      return;
    }
    nommees++;
    items.push({description:desc,qty:parseNum(row.querySelector('.item-qty').value)||0,unite:(row.querySelector('.item-unit').value||'').trim(),unitPrice:parseNum(row.querySelector('.item-price').value)||0,tva:parseNum(row.querySelector('.item-tva').value)||0});
  });
  if(muettes)return toast(t('toast.lineNoDesc'),'err');
  if(!items.length)return toast(t('toast.addLine'),'err');
  const data={clientId,template:document.getElementById('inv-template').value,date:document.getElementById('inv-date').value,dueDate:document.getElementById('inv-due').value,status:document.getElementById('inv-status').value,paymentMode:(document.getElementById('inv-paymode')||{}).value||'virement',fraisPort:parseNum((document.getElementById('inv-port')||{}).value)||0,items,notes:document.getElementById('inv-notes').value.trim()};
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
/* Keeps the note in step with the payment mode, and stops the moment the user
   has written their own sentence. */
function syncPayNote(){
  var sel=document.getElementById('inv-paymode'), ta=document.getElementById('inv-notes');
  if(!sel||!ta)return;
  if(isDefaultPayNote(ta.value))ta.value=payNote(sel.value);
}
