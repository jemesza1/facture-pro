/* FacturePro — factures récurrentes.

   A rent, a retainer, a monthly service: the merchant retyped the same invoice
   every month. This writes it for them, as a draft, the day it is due — and
   only when they open the application. Nothing is sent, because nothing here
   leaves the device.

   Catch-up is capped at three drafts per rule per session so an unused laptop
   does not dump a year of invoices on first open. Drafts take no stock
   (commerce.js), and a paused rule issues nothing. */
(function(){
  function ensure(){
    if(!Array.isArray(state.recurring)) state.recurring=[];
  }

  function addPeriod(iso, freq){
    var d=new Date((iso||new Date().toISOString().slice(0,10))+'T12:00:00');
    if(isNaN(d.getTime())) d=new Date();
    var day=d.getDate();
    if(freq==='week') d.setDate(d.getDate()+7);
    else if(freq==='year') d.setFullYear(d.getFullYear()+1);
    else {
      d.setMonth(d.getMonth()+1);
      if(d.getDate()!==day) d.setDate(0);
    }
    return d.toISOString().slice(0,10);
  }

  window.addRecurringPeriod=addPeriod;

  function today(){ return new Date().toISOString().slice(0,10); }

  function issueOne(rule, onDate){
    var year=new Date((onDate||today())+'T12:00:00').getFullYear();
    var n=state.nextInvoiceNumber||1, number;
    do { number='FAC-'+year+'-'+String(n).padStart(3,'0'); n++; }
    while((state.invoices||[]).some(function(i){return i.number===number;}));
    state.nextInvoiceNumber=n;
    var inv={
      id:uid(),
      number:number,
      clientId:rule.clientId,
      date:onDate||today(),
      dueDate:rule.dueDays ? addDays(onDate||today(), rule.dueDays) : '',
      status:'brouillon',
      items:JSON.parse(JSON.stringify(rule.items||[])),
      notes:rule.notes||'',
      paymentMode:rule.paymentMode||'virement',
      template:rule.template||'algerie',
      fraisPort:Number(rule.fraisPort)||0,
      recurringId:rule.id
    };
    if(typeof markStockNew==='function') markStockNew(inv);
    state.invoices.push(inv);
    if(typeof reconcileStock==='function') reconcileStock();
    return inv;
  }

  function addDays(iso, n){
    var d=new Date(iso+'T12:00:00');
    d.setDate(d.getDate()+(Number(n)||0));
    return d.toISOString().slice(0,10);
  }

  window.runRecurring=function(){
    ensure();
    var now=today(), issued=0, i, r, guard;
    for(i=0;i<state.recurring.length;i++){
      r=state.recurring[i];
      if(!r||r.active===false) continue;
      if(!r.clientId||!(r.items||[]).length) continue;
      if(!r.nextDate||r.nextDate>now) continue;
      guard=0;
      while(r.nextDate<=now && guard<3){
        issueOne(r, r.nextDate);
        r.lastIssued=r.nextDate;
        r.nextDate=addPeriod(r.nextDate, r.frequency||'month');
        issued++;
        guard++;
      }
    }
    if(issued) saveData();
    return issued;
  };

  window.renderRecurring=function(){
    ensure();
    var list=state.recurring||[];
    var rows=list.map(function(r){
      var cl=getClient(r.clientId)||{};
      var tot=calcInvoiceTotals({items:r.items||[], paymentMode:r.paymentMode||'virement'});
      return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
        '<td class="p-3 font-medium">'+esc(cl.name||'\u2014')+'</td>'+
        '<td class="p-3">'+esc(t('rec.'+(r.frequency||'month')))+'</td>'+
        '<td class="p-3">'+dateUI(r.nextDate)+'</td>'+
        '<td class="p-3">'+moneyUI(tot.ttc)+'</td>'+
        '<td class="p-3"><span class="badge '+(r.active===false?'badge-brouillon':'badge-payee')+'">'+
          esc(r.active===false?t('rec.paused'):t('rec.active'))+'</span></td>'+
        '<td class="p-3 text-end whitespace-nowrap">'+
          '<button type="button" onclick="openRecurringModal(\''+r.id+'\')" class="btn-ghost p-2" aria-label="'+esc(t('actions.edit'))+'"><i data-lucide="pencil" class="w-4 h-4"></i></button>'+
          '<button type="button" onclick="toggleRecurring(\''+r.id+'\')" class="btn-ghost p-2" aria-label="'+(r.active===false?esc(t('rec.active')):esc(t('rec.paused')))+'"><i data-lucide="'+(r.active===false?'play':'pause')+'" class="w-4 h-4"></i></button>'+
          '<button type="button" onclick="deleteRecurring(\''+r.id+'\')" class="btn-ghost p-2 text-red-500" aria-label="'+esc(t('actions.delete'))+'"><i data-lucide="trash-2" class="w-4 h-4"></i></button>'+
        '</td></tr>';
    }).join('');
    return '<div class="flex flex-col sm:flex-row justify-between gap-3 mb-5">'+
      '<div><h3 class="font-semibold text-lg">'+esc(t('rec.title'))+'</h3>'+
        '<p class="text-sm text-slate-500 max-w-xl">'+esc(t('rec.emptyHint'))+'</p></div>'+
      '<button type="button" onclick="openRecurringModal()" class="btn-primary shrink-0">'+
        '<i data-lucide="plus" class="w-4 h-4"></i> '+esc(t('rec.new'))+'</button></div>'+
      (list.length
        ? '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
          '<th class="p-3">'+esc(t('inv.client'))+'</th><th class="p-3">'+esc(t('rec.frequency'))+'</th>'+
          '<th class="p-3">'+esc(t('rec.next'))+'</th><th class="p-3">'+esc(t('inv.amount'))+'</th>'+
          '<th class="p-3">'+esc(t('inv.status'))+'</th><th class="p-3"></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        : '<div class="empty-state"><p class="font-medium">'+esc(t('rec.empty'))+'</p>'+
          '<p class="text-sm text-slate-500 mt-1">'+esc(t('rec.emptyHint'))+'</p></div>');
  };

  window.openRecurringModal=function(id){
    ensure();
    var r=id?(state.recurring||[]).find(function(x){return x.id===id;}):null;
    var items=r&&r.items&&r.items.length?r.items:[{description:'',qty:1,unitPrice:0,tva:19}];
    openModal('<div class="modal max-w-3xl" onclick="event.stopPropagation()">'+
      '<div class="modal-header"><h3 class="font-semibold">'+(r?esc(t('actions.edit')):esc(t('rec.new')))+'</h3>'+
      '<button onclick="closeModal()" class="btn-ghost p-2" aria-label="'+esc(t('ui.close'))+'"><i data-lucide="x" class="w-5 h-5"></i></button></div>'+
      '<div class="modal-body space-y-4">'+
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'+
          '<div><label class="form-label" for="rec-client">'+esc(t('inv.clientReq'))+'</label>'+
            '<select id="rec-client" class="form-select"><option value="">'+esc(t('inv.choose'))+'</option>'+
            (state.clients||[]).map(function(c){
              return '<option value="'+c.id+'" '+(r&&r.clientId===c.id?'selected':'')+'>'+esc(c.name)+'</option>';
            }).join('')+'</select></div>'+
          '<div><label class="form-label" for="rec-freq">'+esc(t('rec.frequency'))+'</label>'+
            '<select id="rec-freq" class="form-select">'+
              ['month','week','year'].map(function(f){
                return '<option value="'+f+'" '+((r&&r.frequency||'month')===f?'selected':'')+'>'+esc(t('rec.'+f))+'</option>';
              }).join('')+'</select></div>'+
          '<div><label class="form-label" for="rec-next">'+esc(t('rec.next'))+'</label>'+
            '<input type="date" id="rec-next" class="form-input" value="'+(r&&r.nextDate||today())+'"/></div>'+
          '<div><label class="form-label" for="rec-pay">'+esc(t('inv.payMode'))+'</label>'+
            '<select id="rec-pay" class="form-select">'+
              ['virement','especes','cheque','carte'].map(function(m){
                return '<option value="'+m+'" '+((r&&r.paymentMode||'virement')===m?'selected':'')+'>'+esc(t('inv.pay.'+m))+'</option>';
              }).join('')+'</select></div>'+
        '</div>'+
        '<div><div class="flex justify-between mb-2"><span class="form-label mb-0">'+esc(t('inv.lines'))+'</span>'+
          '<button type="button" onclick="addRecurringItem()" class="text-sm text-sky-600 font-medium">'+esc(t('actions.add'))+'</button></div>'+
          '<div id="rec-items" class="space-y-2">'+items.map(recItemRow).join('')+'</div></div>'+
        '<div><label class="form-label" for="rec-notes">'+esc(t('inv.notes'))+'</label>'+
          '<textarea id="rec-notes" class="form-input" rows="2">'+esc(r&&r.notes||'')+'</textarea></div>'+
      '</div>'+
      '<div class="modal-footer flex justify-end gap-2">'+
        '<button onclick="closeModal()" class="btn-secondary">'+esc(t('actions.back'))+'</button>'+
        '<button onclick="saveRecurring('+(id?"'"+id+"'":'null')+')" class="btn-primary">'+esc(t('actions.save'))+'</button></div></div>');
    try{lucide.createIcons();}catch(e){}
  };

  function recItemRow(it){
    it=it||{description:'',qty:1,unitPrice:0,tva:19};
    return '<div class="grid grid-cols-12 gap-2 items-end rec-row">'+
      '<div class="col-span-5"><input class="form-input ri-desc" aria-label="'+esc(t('inv.desc'))+'" placeholder="'+esc(t('inv.desc'))+'" value="'+esc(it.description||'')+'"/></div>'+
      '<div class="col-span-2"><input type="number" min="0" class="form-input ltr-code ri-qty" aria-label="'+esc(t('inv.qty'))+'" value="'+(it.qty||1)+'"/></div>'+
      '<div class="col-span-2"><input type="number" min="0" class="form-input ltr-code ri-price" aria-label="'+esc(t('inv.unit'))+'" value="'+(it.unitPrice||0)+'"/></div>'+
      '<div class="col-span-2"><select class="form-select ri-tva" aria-label="'+esc(t('inv.vat'))+'">'+
        '<option value="19" '+(Number(it.tva)===19?'selected':'')+'>19%</option>'+
        '<option value="9" '+(Number(it.tva)===9?'selected':'')+'>9%</option>'+
        '<option value="0" '+(Number(it.tva)===0?'selected':'')+'>0%</option></select></div>'+
      '<div class="col-span-1"><button type="button" onclick="this.closest(\'.rec-row\').remove()" class="btn-ghost p-2 text-red-500" aria-label="'+esc(t('actions.delete'))+'"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>';
  }

  window.addRecurringItem=function(){
    var box=document.getElementById('rec-items'); if(!box) return;
    var wrap=document.createElement('div');
    wrap.innerHTML=recItemRow({});
    box.appendChild(wrap.firstChild);
    try{lucide.createIcons();}catch(e){}
  };

  window.saveRecurring=function(id){
    var clientId=(document.getElementById('rec-client')||{}).value;
    if(!clientId) return toast(t('toast.pickClient'),'err');
    var nextDate=(document.getElementById('rec-next')||{}).value;
    if(!nextDate) return toast(t('rec.errDate'),'err');
    var items=[];
    document.querySelectorAll('#rec-items .rec-row').forEach(function(row){
      var desc=(row.querySelector('.ri-desc').value||'').trim();
      if(!desc) return;
      items.push({
        description:desc,
        qty:parseFloat(row.querySelector('.ri-qty').value)||1,
        unitPrice:parseFloat(row.querySelector('.ri-price').value)||0,
        tva:parseFloat(row.querySelector('.ri-tva').value)||19
      });
    });
    if(!items.length) return toast(t('toast.addLine'),'err');
    ensure();
    var data={
      clientId:clientId,
      frequency:(document.getElementById('rec-freq')||{}).value||'month',
      nextDate:nextDate,
      paymentMode:(document.getElementById('rec-pay')||{}).value||'virement',
      notes:((document.getElementById('rec-notes')||{}).value||'').trim(),
      items:items,
      template:'algerie'
    };
    if(id){
      var i=state.recurring.findIndex(function(x){return x.id===id;});
      if(i>=0){
        delete data.active;
        state.recurring[i]=Object.assign({},state.recurring[i],data);
      }
    } else {
      data.id=uid();
      data.active=true;
      state.recurring.push(data);
    }
    saveData(); closeModal(); toast(t('toast.saved')); renderPage();
  };

  window.toggleRecurring=function(id){
    ensure();
    var r=state.recurring.find(function(x){return x.id===id;});
    if(!r) return;
    r.active=r.active===false;
    saveData(); renderPage();
  };

  window.deleteRecurring=function(id){
    if(!confirm(t('rec.confirmDelete'))) return;
    state.recurring=(state.recurring||[]).filter(function(x){return x.id!==id;});
    saveData(); toast(t('toast.saved')); renderPage();
  };

  var _render=window.renderPage;
  window.renderPage=function(){
    if(state.currentPage==='recurring'){
      var c=document.getElementById('main-content');
      if(!c){ if(typeof _render==='function') return _render.apply(this,arguments); return; }
      try{if(typeof updateOverdue==='function')updateOverdue();}catch(e){}
      c.innerHTML=renderRecurring();
      try{lucide.createIcons();}catch(e){}
      try{if(typeof paintBackupNotice==='function')paintBackupNotice();}catch(e){}
      return;
    }
    if(typeof _render==='function') return _render.apply(this,arguments);
  };

  var _init=window.initApp;
  window.initApp=function(){
    if(typeof _init==='function') _init();
    var n=0;
    try{ n=runRecurring(); }catch(e){}
    if(n){
      try{ toast(t('rec.issued').replace('{n}', String(n))); }catch(e){}
      try{ renderPage(); }catch(e){}
    }
  };

  if(typeof state!=='undefined') ensure();
})();
