/* FacturePro - Produits, Devis, Paiements (localStorage) */
(function(){
  function ensure(){
    if(!state.products) state.products=[];
    if(!state.devis) state.devis=[];
    if(!state.payments) state.payments=[];
    if(!state.nextDevisNumber) state.nextDevisNumber=1;
  }

  var _save=window.saveData;
  window.saveData=function(){
    ensure();
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify({
        company:state.company,
        clients:state.clients,
        invoices:state.invoices,
        nextInvoiceNumber:state.nextInvoiceNumber,
        currentPage:state.currentPage,
        products:state.products,
        devis:state.devis,
        payments:state.payments,
        nextDevisNumber:state.nextDevisNumber
      }));
    }catch(e){ if(typeof _save==='function') _save(); }
  };

  var _load=window.loadData;
  window.loadData=function(){
    if(typeof _load==='function') _load();
    ensure();
    try{
      var r=localStorage.getItem(STORAGE_KEY);
      if(!r) return;
      var d=JSON.parse(r);
      if(Array.isArray(d.products)) state.products=d.products;
      if(Array.isArray(d.devis)) state.devis=d.devis;
      if(Array.isArray(d.payments)) state.payments=d.payments;
      if(d.nextDevisNumber) state.nextDevisNumber=d.nextDevisNumber;
    }catch(e){}
  };

  var _render=window.renderPage;
  window.renderPage=function(){
    ensure();
    var c=document.getElementById('main-content');
    if(!c){ if(typeof _render==='function') return _render(); return; }
    if(state.currentPage==='products'){ c.innerHTML=renderProducts(); try{lucide.createIcons();}catch(e){} return; }
    if(state.currentPage==='devis'){ c.innerHTML=renderDevis(); try{lucide.createIcons();}catch(e){} return; }
    if(state.currentPage==='payments'){ c.innerHTML=renderPayments(); try{lucide.createIcons();}catch(e){} return; }
    if(typeof _render==='function') return _render();
  };

  window.renderProducts=function(){
    var ar=locale==='ar';
    var list=state.products||[];
    return '<div class="flex flex-col sm:flex-row justify-between gap-3 mb-5">'+
      '<p class="text-slate-500 text-sm">'+list.length+' '+(ar?'\u0645\u0646\u062a\u062c/\u062e\u062f\u0645\u0629':'produit(s) / service(s)')+'</p>'+
      '<button onclick="openProductModal()" class="btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> '+(ar?'\u0625\u0636\u0627\u0641\u0629':'Ajouter')+'</button></div>'+
      (list.length? '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
        '<th class="p-3">'+ (ar?'\u0627\u0644\u0648\u0635\u0641':'D\u00e9signation')+'</th><th class="p-3">'+ (ar?'\u0627\u0644\u0633\u0639\u0631':'Prix HT')+'</th><th class="p-3">TVA</th><th class="p-3"></th></tr></thead><tbody>'+
        list.map(function(p){
          return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
            '<td class="p-3 font-medium">'+esc(p.name||'')+'</td>'+
            '<td class="p-3 ltr-code">'+moneyUI(Number(p.price)||0)+'</td>'+
            '<td class="p-3">'+(p.tva!=null?p.tva:19)+'%</td>'+
            '<td class="p-3 text-end whitespace-nowrap">'+
              '<button onclick="openProductModal(\''+p.id+'\')" class="btn-ghost p-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>'+
              '<button onclick="deleteProduct(\''+p.id+'\')" class="btn-ghost p-2 text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>'+
            '</td></tr>';
        }).join('')+'</tbody></table></div>'
        : '<div class="empty-state"><p class="font-medium">'+(ar?'\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a':'Aucun produit')+'</p><p class="text-sm text-slate-500 mt-1">'+(ar?'\u0623\u0636\u0641 \u062e\u062f\u0645\u0627\u062a\u0643 \u0623\u0648 \u0645\u0646\u062a\u062c\u0627\u062a\u0643':'Ajoutez vos services/produits pour les r\u00e9utiliser')+'</p></div>');
  };

  window.openProductModal=function(id){
    ensure();
    var p=id? state.products.find(function(x){return x.id===id;}):null;
    var ar=locale==='ar';
    openModal('<div class="modal max-w-md" onclick="event.stopPropagation()">'+
      '<div class="modal-header"><h3 class="font-semibold">'+(p?(ar?'\u062a\u0639\u062f\u064a\u0644':'Modifier'):(ar?'\u0645\u0646\u062a\u062c / \u062e\u062f\u0645\u0629':'Produit / Service'))+'</h3>'+
      '<button onclick="closeModal()" class="btn-ghost p-2"><i data-lucide="x" class="w-5 h-5"></i></button></div>'+
      '<div class="modal-body space-y-3">'+
        '<div><label class="form-label">'+(ar?'\u0627\u0644\u0648\u0635\u0641 *':'D\u00e9signation *')+'</label><input id="prod-name" class="form-input" value="'+esc(p&&p.name||'')+'"/></div>'+
        '<div class="grid grid-cols-2 gap-3">'+
          '<div><label class="form-label">'+(ar?'\u0627\u0644\u0633\u0639\u0631 HT':'Prix HT')+'</label><input id="prod-price" type="number" min="0" step="0.01" class="form-input ltr-code" value="'+(p?p.price:0)+'"/></div>'+
          '<div><label class="form-label">TVA %</label><input id="prod-tva" type="number" min="0" max="100" class="form-input ltr-code" value="'+(p&&p.tva!=null?p.tva:19)+'"/></div>'+
        '</div></div>'+
      '<div class="modal-footer flex justify-end gap-2">'+
        '<button onclick="closeModal()" class="btn-secondary">'+(ar?'\u0625\u0644\u063a\u0627\u0621':'Annuler')+'</button>'+
        '<button onclick="saveProduct('+(id?"'"+id+"'":'null')+')" class="btn-primary">'+(ar?'\u062d\u0641\u0638':'Enregistrer')+'</button></div></div>');
    try{lucide.createIcons();}catch(e){}
  };

  window.saveProduct=function(id){
    var name=(document.getElementById('prod-name').value||'').trim();
    if(!name) return toast(locale==='ar'?'\u0627\u0644\u0648\u0635\u0641 \u0645\u0637\u0644\u0648\u0628':'D\u00e9signation requise','err');
    var price=parseFloat(document.getElementById('prod-price').value)||0;
    var tva=parseFloat(document.getElementById('prod-tva').value); if(isNaN(tva)) tva=19;
    ensure();
    if(id){
      var i=state.products.findIndex(function(x){return x.id===id;});
      if(i>=0) state.products[i]=Object.assign({},state.products[i],{name:name,price:price,tva:tva});
    } else {
      state.products.push({id:uid(),name:name,price:price,tva:tva});
    }
    saveData(); closeModal(); toast(t('toast.saved')); renderPage();
  };

  window.deleteProduct=function(id){
    if(!confirm(locale==='ar'?'\u062d\u0630\u0641 \u0647\u0630\u0627 \u0627\u0644\u0645\u0646\u062a\u062c\u061f':'Supprimer ce produit ?')) return;
    state.products=state.products.filter(function(x){return x.id!==id;});
    saveData(); toast(t('toast.saved')); renderPage();
  };

  window.renderDevis=function(){
    var ar=locale==='ar';
    var list=(state.devis||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
    return '<div class="flex flex-col sm:flex-row justify-between gap-3 mb-5">'+
      '<p class="text-slate-500 text-sm">'+list.length+' '+(ar?'\u0639\u0631\u0636 \u0633\u0639\u0631':'devis')+'</p>'+
      '<button onclick="openDevisModal()" class="btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> '+(ar?'\u0639\u0631\u0636 \u062c\u062f\u064a\u062f':'Nouveau devis')+'</button></div>'+
      (list.length? '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
        '<th class="p-3">N\u00b0</th><th class="p-3">'+(ar?'\u0627\u0644\u0639\u0645\u064a\u0644':'Client')+'</th><th class="p-3">'+(ar?'\u0627\u0644\u062a\u0627\u0631\u064a\u062e':'Date')+'</th><th class="p-3">'+(ar?'\u0627\u0644\u0645\u0628\u0644\u063a':'Montant')+'</th><th class="p-3">'+(ar?'\u0627\u0644\u062d\u0627\u0644\u0629':'Statut')+'</th><th class="p-3"></th></tr></thead><tbody>'+
        list.map(function(d){
          var cl=getClient(d.clientId)||{};
          var tot=calcInvoiceTotals(d);
          return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
            '<td class="p-3 font-medium ltr-code">'+esc(d.number||'')+'</td>'+
            '<td class="p-3">'+esc(cl.name||'\u2014')+'</td>'+
            '<td class="p-3">'+esc(d.date||'')+'</td>'+
            '<td class="p-3 font-semibold">'+moneyUI(tot.ttc)+'</td>'+
            '<td class="p-3"><span class="badge '+(d.status==='accepte'?'badge-payee':d.status==='refuse'?'badge-enretard':'badge-brouillon')+'">'+(d.status||'brouillon')+'</span></td>'+
            '<td class="p-3 text-end whitespace-nowrap">'+
              '<button onclick="openDevisModal(\''+d.id+'\')" class="btn-ghost p-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>'+
              '<button onclick="convertDevisToInvoice(\''+d.id+'\')" class="btn-ghost p-2 text-emerald-600" title="Facture"><i data-lucide="file-input" class="w-4 h-4"></i></button>'+
              '<button onclick="deleteDevis(\''+d.id+'\')" class="btn-ghost p-2 text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>'+
            '</td></tr>';
        }).join('')+'</tbody></table></div>'
        : '<div class="empty-state"><p class="font-medium">'+(ar?'\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0631\u0648\u0636':'Aucun devis')+'</p><p class="text-sm text-slate-500 mt-1">'+(ar?'\u0623\u0646\u0634\u0626 \u0639\u0631\u0636 \u0633\u0639\u0631 \u062b\u0645 \u062d\u0648\u0651\u0644\u0647 \u0625\u0644\u0649 \u0641\u0627\u062a\u0648\u0631\u0629':'Cr\u00e9ez un devis puis convertissez-le en facture')+'</p></div>');
  };

  window.openDevisModal=function(id){
    ensure();
    var d=id? state.devis.find(function(x){return x.id===id;}):null;
    var items=d&&d.items&&d.items.length? d.items:[{description:'',qty:1,unitPrice:0,tva:19}];
    var ar=locale==='ar';
    openModal('<div class="modal max-w-3xl" onclick="event.stopPropagation()">'+
      '<div class="modal-header"><h3 class="font-semibold">'+(d?(ar?'\u062a\u0639\u062f\u064a\u0644 \u0639\u0631\u0636':'Modifier devis'):(ar?'\u0639\u0631\u0636 \u0633\u0639\u0631 \u062c\u062f\u064a\u062f':'Nouveau devis'))+'</h3>'+
      '<button onclick="closeModal()" class="btn-ghost p-2"><i data-lucide="x" class="w-5 h-5"></i></button></div>'+
      '<div class="modal-body space-y-4">'+
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'+
          '<div><label class="form-label">'+(ar?'\u0627\u0644\u0639\u0645\u064a\u0644 *':'Client *')+'</label><select id="dev-client" class="form-select"><option value="">\u2014</option>'+
            state.clients.map(function(c){return '<option value="'+c.id+'" '+(d&&d.clientId===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('')+
          '</select></div>'+
          '<div><label class="form-label">'+(ar?'\u0627\u0644\u062a\u0627\u0631\u064a\u062e':'Date')+'</label><input type="date" id="dev-date" class="form-input" value="'+(d&&d.date||new Date().toISOString().slice(0,10))+'"/></div>'+
        '</div>'+
        '<div><div class="flex justify-between mb-2"><label class="form-label mb-0">'+(ar?'\u0627\u0644\u0628\u0646\u0648\u062f':'Lignes')+'</label>'+
          '<button type="button" onclick="addDevisItem()" class="text-sm text-sky-600 font-medium">+ '+(ar?'\u0625\u0636\u0627\u0641\u0629':'Ajouter')+'</button></div>'+
          '<div id="dev-items" class="space-y-2">'+items.map(function(it){return devisItemRow(it);}).join('')+'</div></div>'+
        '<div><label class="form-label">'+(ar?'\u0645\u0644\u0627\u062d\u0638\u0627\u062a':'Notes')+'</label><textarea id="dev-notes" class="form-input" rows="2">'+(d&&d.notes||'')+'</textarea></div>'+
      '</div>'+
      '<div class="modal-footer flex justify-end gap-2">'+
        '<button onclick="closeModal()" class="btn-secondary">'+(ar?'\u0625\u0644\u063a\u0627\u0621':'Annuler')+'</button>'+
        '<button onclick="saveDevis('+(id?"'"+id+"'":'null')+')" class="btn-primary">'+(ar?'\u062d\u0641\u0638':'Enregistrer')+'</button></div></div>');
    try{lucide.createIcons();}catch(e){}
  };

  function devisItemRow(it){
    it=it||{description:'',qty:1,unitPrice:0,tva:19};
    return '<div class="grid grid-cols-12 gap-2 items-end devis-row">'+
      '<div class="col-span-5"><input class="form-input di-desc" placeholder="D\u00e9signation" value="'+esc(it.description||'')+'"/></div>'+
      '<div class="col-span-2"><input type="number" min="0" step="any" class="form-input ltr-code di-qty" value="'+(it.qty||1)+'"/></div>'+
      '<div class="col-span-2"><input type="number" min="0" step="any" class="form-input ltr-code di-price" value="'+(it.unitPrice||0)+'"/></div>'+
      '<div class="col-span-2"><input type="number" min="0" class="form-input ltr-code di-tva" value="'+(it.tva!=null?it.tva:19)+'"/></div>'+
      '<div class="col-span-1"><button type="button" onclick="this.closest(\'.devis-row\').remove()" class="btn-ghost p-2 text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>';
  }

  window.addDevisItem=function(){
    var box=document.getElementById('dev-items');
    if(!box) return;
    var wrap=document.createElement('div');
    wrap.innerHTML=devisItemRow({description:'',qty:1,unitPrice:0,tva:19});
    box.appendChild(wrap.firstChild);
    try{lucide.createIcons();}catch(e){}
  };

  window.saveDevis=function(id){
    var clientId=document.getElementById('dev-client').value;
    if(!clientId) return toast(locale==='ar'?'\u0627\u062e\u062a\u0631 \u0639\u0645\u064a\u0644\u0627\u064b':'Choisissez un client','err');
    var items=[];
    document.querySelectorAll('#dev-items .devis-row').forEach(function(row){
      var desc=(row.querySelector('.di-desc').value||'').trim();
      if(!desc) return;
      items.push({
        description:desc,
        qty:parseFloat(row.querySelector('.di-qty').value)||1,
        unitPrice:parseFloat(row.querySelector('.di-price').value)||0,
        tva:parseFloat(row.querySelector('.di-tva').value)||19
      });
    });
    if(!items.length) return toast(locale==='ar'?'\u0623\u0636\u0641 \u0628\u0646\u062f\u0627\u064b':'Ajoutez une ligne','err');
    ensure();
    var data={
      clientId:clientId,
      date:document.getElementById('dev-date').value,
      notes:(document.getElementById('dev-notes').value||'').trim(),
      items:items,
      status:'brouillon'
    };
    if(id){
      var i=state.devis.findIndex(function(x){return x.id===id;});
      if(i>=0) state.devis[i]=Object.assign({},state.devis[i],data);
    } else {
      var year=new Date().getFullYear();
      var number='DEV-'+year+'-'+String(state.nextDevisNumber).padStart(3,'0');
      state.devis.push(Object.assign({id:uid(),number:number},data));
      state.nextDevisNumber++;
    }
    saveData(); closeModal(); toast(t('toast.saved')); renderPage();
  };

  window.deleteDevis=function(id){
    if(!confirm(locale==='ar'?'\u062d\u0630\u0641 \u0639\u0631\u0636 \u0627\u0644\u0633\u0639\u0631\u061f':'Supprimer ce devis ?')) return;
    state.devis=state.devis.filter(function(x){return x.id!==id;});
    saveData(); toast(t('toast.saved')); renderPage();
  };

  window.convertDevisToInvoice=function(id){
    ensure();
    var d=state.devis.find(function(x){return x.id===id;});
    if(!d) return;
    var year=new Date().getFullYear();
    var number='FAC-'+year+'-'+String(state.nextInvoiceNumber).padStart(3,'0');
    state.invoices.push({
      id:uid(),
      number:number,
      clientId:d.clientId,
      date:new Date().toISOString().slice(0,10),
      dueDate:'',
      status:'brouillon',
      items:JSON.parse(JSON.stringify(d.items||[])),
      notes:d.notes||'',
      template:(state.invoices[0]&&state.invoices[0].template)||'classic'
    });
    state.nextInvoiceNumber++;
    d.status='accepte';
    saveData();
    toast(locale==='ar'?'\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629':'Facture cr\u00e9\u00e9e depuis le devis');
    navigate('invoices');
  };

  window.renderPayments=function(){
    var ar=locale==='ar';
    var list=(state.payments||[]).slice().sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
    var total=list.reduce(function(s,p){return s+(Number(p.amount)||0);},0);
    return '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">'+
      '<div class="stat-card"><p class="text-sm text-slate-500">'+(ar?'\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0642\u0628\u0648\u0636\u0627\u062a':'Total encaiss\u00e9')+'</p><p class="text-xl font-bold mt-1">'+moneyUI(total)+'</p></div>'+
      '<div class="stat-card sm:col-span-2 flex items-center justify-between gap-3">'+
        '<p class="text-sm text-slate-500">'+(ar?'\u0633\u062c\u0651\u0644 \u062f\u0641\u0639\u0629 \u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0641\u0627\u062a\u0648\u0631\u0629':'Enregistrez un paiement li\u00e9 \u00e0 une facture')+'</p>'+
        '<button onclick="openPaymentModal()" class="btn-primary shrink-0"><i data-lucide="plus" class="w-4 h-4"></i> '+(ar?'\u062f\u0641\u0639\u0629':'Paiement')+'</button></div></div>'+
      (list.length? '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
        '<th class="p-3">'+(ar?'\u0627\u0644\u062a\u0627\u0631\u064a\u062e':'Date')+'</th><th class="p-3">'+(ar?'\u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629':'Facture')+'</th><th class="p-3">'+(ar?'\u0627\u0644\u0639\u0645\u064a\u0644':'Client')+'</th><th class="p-3">'+(ar?'\u0627\u0644\u0645\u0628\u0644\u063a':'Montant')+'</th><th class="p-3">'+(ar?'\u0627\u0644\u0637\u0631\u064a\u0642\u0629':'Mode')+'</th><th class="p-3"></th></tr></thead><tbody>'+
        list.map(function(p){
          var inv=state.invoices.find(function(i){return i.id===p.invoiceId;})||{};
          var cl=getClient(inv.clientId||p.clientId)||{};
          return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
            '<td class="p-3">'+esc(p.date||'')+'</td>'+
            '<td class="p-3 ltr-code">'+esc(inv.number||'\u2014')+'</td>'+
            '<td class="p-3">'+esc(cl.name||'\u2014')+'</td>'+
            '<td class="p-3 font-semibold text-emerald-600">'+moneyUI(Number(p.amount)||0)+'</td>'+
            '<td class="p-3">'+esc(p.method||'\u2014')+'</td>'+
            '<td class="p-3 text-end"><button onclick="deletePayment(\''+p.id+'\')" class="btn-ghost p-2 text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>';
        }).join('')+'</tbody></table></div>'
        : '<div class="empty-state"><p class="font-medium">'+(ar?'\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u0641\u0639\u0627\u062a':'Aucun paiement')+'</p></div>');
  };

  window.openPaymentModal=function(){
    ensure();
    var ar=locale==='ar';
    var invs=state.invoices.filter(function(i){return i.status!=='annulee';});
    openModal('<div class="modal max-w-md" onclick="event.stopPropagation()">'+
      '<div class="modal-header"><h3 class="font-semibold">'+(ar?'\u062a\u0633\u062c\u064a\u0644 \u062f\u0641\u0639\u0629':'Enregistrer un paiement')+'</h3>'+
      '<button onclick="closeModal()" class="btn-ghost p-2"><i data-lucide="x" class="w-5 h-5"></i></button></div>'+
      '<div class="modal-body space-y-3">'+
        '<div><label class="form-label">'+(ar?'\u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 *':'Facture *')+'</label><select id="pay-inv" class="form-select"><option value="">\u2014</option>'+
          invs.map(function(i){ var cl=getClient(i.clientId)||{}; return '<option value="'+i.id+'">'+esc(i.number)+' \u2014 '+esc(cl.name||'')+'</option>'; }).join('')+
        '</select></div>'+
        '<div><label class="form-label">'+(ar?'\u0627\u0644\u0645\u0628\u0644\u063a *':'Montant *')+'</label><input id="pay-amount" type="number" min="0" step="0.01" class="form-input ltr-code"/></div>'+
        '<div><label class="form-label">'+(ar?'\u0627\u0644\u062a\u0627\u0631\u064a\u062e':'Date')+'</label><input id="pay-date" type="date" class="form-input" value="'+new Date().toISOString().slice(0,10)+'"/></div>'+
        '<div><label class="form-label">'+(ar?'\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639':'Mode')+'</label><select id="pay-method" class="form-select">'+
          '<option value="virement">Virement</option><option value="especes">Esp\u00e8ces</option><option value="cheque">Ch\u00e8que</option><option value="ccp">CCP</option><option value="autre">Autre</option>'+
        '</select></div>'+
        '<div><label class="form-label">'+(ar?'\u0645\u0644\u0627\u062d\u0638\u0629':'Note')+'</label><input id="pay-note" class="form-input"/></div>'+
      '</div>'+
      '<div class="modal-footer flex justify-end gap-2">'+
        '<button onclick="closeModal()" class="btn-secondary">'+(ar?'\u0625\u0644\u063a\u0627\u0621':'Annuler')+'</button>'+
        '<button onclick="savePayment()" class="btn-primary">'+(ar?'\u062d\u0641\u0638':'Enregistrer')+'</button></div></div>');
    try{lucide.createIcons();}catch(e){}
  };

  window.savePayment=function(){
    var invoiceId=document.getElementById('pay-inv').value;
    var amount=parseFloat(document.getElementById('pay-amount').value)||0;
    if(!invoiceId) return toast(locale==='ar'?'\u0627\u062e\u062a\u0631 \u0641\u0627\u062a\u0648\u0631\u0629':'Choisissez une facture','err');
    if(amount<=0) return toast(locale==='ar'?'\u0623\u062f\u062e\u0644 \u0645\u0628\u0644\u063a\u0627\u064b':'Montant invalide','err');
    ensure();
    var inv=state.invoices.find(function(i){return i.id===invoiceId;});
    state.payments.push({
      id:uid(),
      invoiceId:invoiceId,
      clientId:inv?inv.clientId:'',
      amount:amount,
      date:document.getElementById('pay-date').value,
      method:document.getElementById('pay-method').value,
      note:(document.getElementById('pay-note').value||'').trim()
    });
    if(inv){
      var tot=calcInvoiceTotals(inv).net;
      var paid=state.payments.filter(function(p){return p.invoiceId===invoiceId;}).reduce(function(s,p){return s+(Number(p.amount)||0);},0);
      if(paid>=tot-0.5) inv.status='payee';
      else if(inv.status==='brouillon') inv.status='envoyee';
    }
    saveData(); closeModal(); toast(t('toast.saved')); renderPage();
  };

  window.deletePayment=function(id){
    if(!confirm(locale==='ar'?'\u062d\u0630\u0641 \u0627\u0644\u062f\u0641\u0639\u0629\u061f':'Supprimer ce paiement ?')) return;
    state.payments=state.payments.filter(function(x){return x.id!==id;});
    saveData(); toast(t('toast.saved')); renderPage();
  };

  if(typeof state!=='undefined') ensure();
})();
