/* FacturePro - Stock, Dettes, Export Excel (CSV) */
(function(){
  function ar(){ return typeof locale!=='undefined' && locale==='ar'; }
  function ensure(){
    if(!state.products) state.products=[];
    state.products.forEach(function(p){
      if(p.stock==null) p.stock=0;
      if(p.minStock==null) p.minStock=0;
    });
  }

  window.getClientDebt=function(clientId){
    var invs=(state.invoices||[]).filter(function(i){
      return i.clientId===clientId && i.status!=='annulee' && i.status!=='payee';
    });
    var due=invs.reduce(function(s,i){return s+calcInvoiceTotals(i).net;},0);
    var unpaidIds={};
    invs.forEach(function(i){ unpaidIds[i.id]=1; });
    var paidOnUnpaid=(state.payments||[]).filter(function(p){return unpaidIds[p.invoiceId];})
      .reduce(function(s,p){return s+(Number(p.amount)||0);},0);
    return Math.max(0, due - paidOnUnpaid);
  };

  window.renderDebts=function(){
    ensure();
    var rows=(state.clients||[]).map(function(c){
      var debt=getClientDebt(c.id);
      var unpaid=(state.invoices||[]).filter(function(i){
        return i.clientId===c.id && i.status!=='payee' && i.status!=='annulee';
      }).length;
      return {c:c, debt:debt, unpaid:unpaid};
    }).filter(function(r){return r.debt>0.5 || r.unpaid>0;})
      .sort(function(a,b){return b.debt-a.debt;});
    var total=rows.reduce(function(s,r){return s+r.debt;},0);

    return '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">'+
      '<div class="stat-card"><p class="text-sm text-slate-500">'+(ar()?'\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062f\u064a\u0648\u0646':'Total cr\u00e9ances')+'</p>'+
        '<p class="text-2xl font-bold mt-1 text-amber-600">'+moneyUI(total)+'</p></div>'+
      '<div class="stat-card"><p class="text-sm text-slate-500">'+(ar()?'\u0639\u0645\u0644\u0627\u0621 \u0645\u062f\u064a\u0646\u0648\u0646':'Clients d\u00e9biteurs')+'</p>'+
        '<p class="text-2xl font-bold mt-1">'+rows.length+'</p></div></div>'+
      (rows.length
        ? '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
            '<th class="p-3">'+(ar()?'\u0627\u0644\u0639\u0645\u064a\u0644':'Client')+'</th>'+
            '<th class="p-3">'+(ar()?'\u0641\u0648\u0627\u062a\u064a\u0631 \u063a\u064a\u0631 \u0645\u062f\u0641\u0648\u0639\u0629':'Factures ouvertes')+'</th>'+
            '<th class="p-3">'+(ar()?'\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0633\u062a\u062d\u0642':'Montant d\u00fb')+'</th>'+
            '<th class="p-3"></th></tr></thead><tbody>'+
            rows.map(function(r){
              return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
                '<td class="p-3 font-medium">'+esc(r.c.name)+'</td>'+
                '<td class="p-3">'+r.unpaid+'</td>'+
                '<td class="p-3 font-bold text-amber-600">'+moneyUI(r.debt)+'</td>'+
                '<td class="p-3 text-end"><button onclick="navigate(\'invoices\')" class="btn-secondary text-xs py-1 px-2">'+(ar()?'\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631':'Factures')+'</button></td></tr>';
            }).join('')+'</tbody></table></div>'
        : '<div class="empty-state"><p class="font-medium">'+(ar()?'\u0644\u0627 \u062a\u0648\u062c\u062f \u062f\u064a\u0648\u0646':'Aucune cr\u00e9ance')+'</p></div>');
  };

  window.renderProducts=function(){
    ensure();
    var list=state.products||[];
    var low=list.filter(function(p){return Number(p.stock)<=Number(p.minStock);}).length;
    return '<div class="flex flex-col sm:flex-row justify-between gap-3 mb-4">'+
      '<div><p class="text-slate-500 text-sm">'+list.length+' '+(ar()?'\u0645\u0646\u062a\u062c/\u062e\u062f\u0645\u0629':'produit(s)')+
        (low? ' \u00b7 <span class="text-amber-600 font-medium">'+low+' '+(ar()?'\u0645\u062e\u0632\u0648\u0646 \u0645\u0646\u062e\u0641\u0636':'stock bas')+'</span>':'')+'</p></div>'+
      '<div class="flex flex-wrap gap-2">'+
        '<button onclick="exportExcel(\'products\')" class="btn-secondary"><i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Excel</button>'+
        '<button onclick="openProductModal()" class="btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> '+(ar()?'\u0625\u0636\u0627\u0641\u0629':'Ajouter')+'</button>'+
      '</div></div>'+
      (list.length
        ? '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
            '<th class="p-3">'+(ar()?'\u0627\u0644\u0648\u0635\u0641':'D\u00e9signation')+'</th>'+
            '<th class="p-3">'+(ar()?'\u0627\u0644\u0633\u0639\u0631':'Prix HT')+'</th>'+
            '<th class="p-3">TVA</th>'+
            '<th class="p-3">'+(ar()?'\u0627\u0644\u0645\u062e\u0632\u0648\u0646':'Stock')+'</th>'+
            '<th class="p-3">'+(ar()?'\u062d\u062f \u0623\u062f\u0646\u0649':'Seuil')+'</th>'+
            '<th class="p-3"></th></tr></thead><tbody>'+
            list.map(function(p){
              var stock=Number(p.stock)||0;
              var min=Number(p.minStock)||0;
              var lowStock=stock<=min;
              return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
                '<td class="p-3 font-medium">'+esc(p.name||'')+'</td>'+
                '<td class="p-3 ltr-code">'+moneyUI(Number(p.price)||0)+'</td>'+
                '<td class="p-3">'+(p.tva!=null?p.tva:19)+'%</td>'+
                '<td class="p-3 font-semibold '+(lowStock?'text-amber-600':'')+'">'+stock+(lowStock?' \u26a0':'')+'</td>'+
                '<td class="p-3 text-slate-500">'+min+'</td>'+
                '<td class="p-3 text-end whitespace-nowrap">'+
                  '<button onclick="adjustStock(\''+p.id+'\',1)" class="btn-ghost p-1.5"><i data-lucide="plus" class="w-4 h-4"></i></button>'+
                  '<button onclick="adjustStock(\''+p.id+'\',-1)" class="btn-ghost p-1.5"><i data-lucide="minus" class="w-4 h-4"></i></button>'+
                  '<button onclick="openProductModal(\''+p.id+'\')" class="btn-ghost p-2"><i data-lucide="pencil" class="w-4 h-4"></i></button>'+
                  '<button onclick="deleteProduct(\''+p.id+'\')" class="btn-ghost p-2 text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button>'+
                '</td></tr>';
            }).join('')+'</tbody></table></div>'
        : '<div class="empty-state"><p class="font-medium">'+(ar()?'\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a':'Aucun produit')+'</p></div>');
  };

  window.adjustStock=function(id,delta){
    ensure();
    var p=state.products.find(function(x){return x.id===id;});
    if(!p) return;
    p.stock=Math.max(0,(Number(p.stock)||0)+delta);
    saveData();
    renderPage();
  };

  window.openProductModal=function(id){
    ensure();
    var p=id? state.products.find(function(x){return x.id===id;}):null;
    openModal('<div class="modal max-w-md" onclick="event.stopPropagation()">'+
      '<div class="modal-header"><h3 class="font-semibold">'+(p?(ar()?'\u062a\u0639\u062f\u064a\u0644':'Modifier'):(ar()?'\u0645\u0646\u062a\u062c / \u062e\u062f\u0645\u0629':'Produit / Service'))+'</h3>'+
      '<button onclick="closeModal()" class="btn-ghost p-2"><i data-lucide="x" class="w-5 h-5"></i></button></div>'+
      '<div class="modal-body space-y-3">'+
        '<div><label class="form-label">'+(ar()?'\u0627\u0644\u0648\u0635\u0641 *':'D\u00e9signation *')+'</label><input id="prod-name" class="form-input" value="'+esc(p&&p.name||'')+'"/></div>'+
        '<div class="grid grid-cols-2 gap-3">'+
          '<div><label class="form-label">'+(ar()?'\u0627\u0644\u0633\u0639\u0631 HT':'Prix HT')+'</label><input id="prod-price" type="number" min="0" step="0.01" class="form-input ltr-code" value="'+(p?p.price:0)+'"/></div>'+
          '<div><label class="form-label">TVA %</label><input id="prod-tva" type="number" min="0" max="100" class="form-input ltr-code" value="'+(p&&p.tva!=null?p.tva:19)+'"/></div>'+
        '</div>'+
        '<div class="grid grid-cols-2 gap-3">'+
          '<div><label class="form-label">'+(ar()?'\u0627\u0644\u0645\u062e\u0632\u0648\u0646':'Stock')+'</label><input id="prod-stock" type="number" min="0" step="1" class="form-input ltr-code" value="'+(p&&p.stock!=null?p.stock:0)+'"/></div>'+
          '<div><label class="form-label">'+(ar()?'\u062d\u062f \u0623\u062f\u0646\u0649':'Seuil')+'</label><input id="prod-min" type="number" min="0" step="1" class="form-input ltr-code" value="'+(p&&p.minStock!=null?p.minStock:0)+'"/></div>'+
        '</div></div>'+
      '<div class="modal-footer flex justify-end gap-2">'+
        '<button onclick="closeModal()" class="btn-secondary">'+(ar()?'\u0625\u0644\u063a\u0627\u0621':'Annuler')+'</button>'+
        '<button onclick="saveProduct('+(id?"'"+id+"'":'null')+')" class="btn-primary">'+(ar()?'\u062d\u0641\u0638':'Enregistrer')+'</button></div></div>');
    try{lucide.createIcons();}catch(e){}
  };

  window.saveProduct=function(id){
    var name=(document.getElementById('prod-name').value||'').trim();
    if(!name) return toast(ar()?'\u0627\u0644\u0648\u0635\u0641 \u0645\u0637\u0644\u0648\u0628':'D\u00e9signation requise','err');
    var price=parseFloat(document.getElementById('prod-price').value)||0;
    var tva=parseFloat(document.getElementById('prod-tva').value); if(isNaN(tva)) tva=19;
    var stock=parseFloat(document.getElementById('prod-stock').value)||0;
    var minStock=parseFloat(document.getElementById('prod-min').value)||0;
    ensure();
    if(id){
      var i=state.products.findIndex(function(x){return x.id===id;});
      if(i>=0) state.products[i]=Object.assign({},state.products[i],{name:name,price:price,tva:tva,stock:stock,minStock:minStock});
    } else {
      state.products.push({id:uid(),name:name,price:price,tva:tva,stock:stock,minStock:minStock});
    }
    saveData(); closeModal(); toast(t('toast.saved')); renderPage();
  };

  function deductStockFromItems(items){
    ensure();
    (items||[]).forEach(function(it){
      var qty=Number(it.qty)||0;
      if(qty<=0) return;
      var p=null;
      if(it.productId) p=state.products.find(function(x){return x.id===it.productId;});
      if(!p && it.description){
        var n=String(it.description).trim().toLowerCase();
        p=state.products.find(function(x){return String(x.name||'').trim().toLowerCase()===n;});
      }
      if(p) p.stock=Math.max(0,(Number(p.stock)||0)-qty);
    });
  }

  var _addP=window.addProductToInvoice;
  if(typeof _addP==='function'){
    window.addProductToInvoice=function(pid){
      var p=(state.products||[]).find(function(x){return x.id===pid;});
      if(!p || typeof itemRowHtml!=='function') return;
      var box=document.getElementById('items-container');
      if(!box) return;
      var wrap=document.createElement('div');
      wrap.innerHTML=itemRowHtml({description:p.name,qty:1,unitPrice:Number(p.price)||0,tva:p.tva!=null?p.tva:19});
      var row=wrap.firstChild;
      if(row) row.setAttribute('data-product-id', pid);
      box.appendChild(row);
      try{lucide.createIcons();}catch(e){}
      toast(ar()?'\u062a\u0645\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u0629':'Ajout\u00e9');
    };
  }

  var _saveInv=window.saveInvoice;
  if(typeof _saveInv==='function'){
    window.saveInvoice=function(editId){
      var items=[];
      document.querySelectorAll('#items-container .item-row').forEach(function(row){
        var desc=(row.querySelector('.item-desc')&&row.querySelector('.item-desc').value||'').trim();
        if(!desc) return;
        items.push({
          description:desc,
          qty:parseFloat(row.querySelector('.item-qty')&&row.querySelector('.item-qty').value)||1,
          productId:row.getAttribute('data-product-id')||''
        });
      });
      var wasNew=!editId;
      _saveInv.apply(this,arguments);
      if(wasNew){ deductStockFromItems(items); saveData(); }
    };
  }

  function downloadCSV(filename, rows){
    var bom='\uFEFF';
    var csv=rows.map(function(r){
      return r.map(function(cell){
        var s=cell==null?'':String(cell);
        if(/[",\n;]/.test(s)) s='"'+s.replace(/"/g,'""')+'"';
        return s;
      }).join(';');
    }).join('\n');
    var blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8;'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    a.click();
  }

  window.exportExcel=function(kind){
    ensure();
    var day=new Date().toISOString().slice(0,10);
    if(kind==='products'){
      downloadCSV('produits-'+day+'.csv', [[ar()?'\u0627\u0644\u0648\u0635\u0641':'D\u00e9signation',ar()?'\u0633\u0639\u0631':'Prix HT','TVA',ar()?'\u0645\u062e\u0632\u0648\u0646':'Stock',ar()?'\u062d\u062f':'Seuil']].concat((state.products||[]).map(function(p){return [p.name,p.price,p.tva!=null?p.tva:19,p.stock||0,p.minStock||0];})));
    } else if(kind==='clients'){
      downloadCSV('clients-'+day+'.csv', [[ar()?'\u0627\u0644\u0627\u0633\u0645':'Nom','Email',ar()?'\u0647\u0627\u062a\u0641':'T\u00e9l','NIF','NIS','RC']].concat((state.clients||[]).map(function(c){return [c.name,c.email||'',c.phone||'',c.nif||'',c.nis||'',c.rc||''];})));
    } else if(kind==='debts'){
      downloadCSV('creances-'+day+'.csv', [[ar()?'\u0627\u0644\u0639\u0645\u064a\u0644':'Client',ar()?'\u0627\u0644\u0645\u0633\u062a\u062d\u0642':'D\u00fb']].concat((state.clients||[]).map(function(c){return [c.name,getClientDebt(c.id)];}).filter(function(r){return r[1]>0;})));
    } else {
      downloadCSV('factures-'+day+'.csv', [[ar()?'\u0631\u0642\u0645':'N\u00b0',ar()?'\u062a\u0627\u0631\u064a\u062e':'Date',ar()?'\u0639\u0645\u064a\u0644':'Client',ar()?'\u062d\u0627\u0644\u0629':'Statut','Net']].concat((state.invoices||[]).map(function(inv){var cl=getClient(inv.clientId)||{};return [inv.number,inv.date,cl.name||'',inv.status,calcInvoiceTotals(inv).net];})));
    }
    toast(ar()?'\u062a\u0645 \u062a\u0635\u062f\u064a\u0631 Excel':'Export Excel OK');
  };

  var _render=window.renderPage;
  window.renderPage=function(){
    if(typeof state!=='undefined' && state.currentPage==='debts'){
      var c=document.getElementById('main-content');
      if(c){ c.innerHTML=renderDebts(); try{lucide.createIcons();}catch(e){} return; }
    }
    if(typeof _render==='function') _render.apply(this,arguments);
    setTimeout(function(){
      if(state.currentPage==='invoices' && !document.getElementById('excel-inv-btn')){
        var bar=document.querySelector('#main-content .btn-primary');
        if(bar && bar.parentNode){
          var b=document.createElement('button');
          b.id='excel-inv-btn';
          b.className='btn-secondary';
          b.innerHTML='<i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Excel';
          b.onclick=function(){ exportExcel('invoices'); };
          bar.parentNode.insertBefore(b, bar);
          try{lucide.createIcons();}catch(e){}
        }
      }
    },50);
  };

  var _rd=window.renderDashboard;
  if(typeof _rd==='function'){
    window.renderDashboard=function(){
      ensure();
      var html=_rd.apply(this,arguments);
      var totalDebt=(state.clients||[]).reduce(function(s,c){return s+getClientDebt(c.id);},0);
      var lowStock=(state.products||[]).filter(function(p){return Number(p.stock)<=Number(p.minStock||0);}).length;
      var alert='';
      if(totalDebt>0 || lowStock>0){
        alert='<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">'+
          (totalDebt>0? '<button type="button" onclick="navigate(\'debts\')" class="card p-4 text-start border border-amber-200 dark:border-amber-800/50">'+
            '<p class="text-xs text-amber-700">'+(ar()?'\u062f\u064a\u0648\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621':'Cr\u00e9ances')+'</p>'+
            '<p class="text-xl font-bold text-amber-600 mt-1">'+moneyUI(totalDebt)+'</p></button>':'')+
          (lowStock>0? '<button type="button" onclick="navigate(\'products\')" class="card p-4 text-start border border-red-200">'+
            '<p class="text-xs text-red-600">'+(ar()?'\u062a\u0646\u0628\u064a\u0647 \u0645\u062e\u0632\u0648\u0646':'Alerte stock')+'</p>'+
            '<p class="text-xl font-bold text-red-600 mt-1">'+lowStock+'</p></button>':'')+
          '</div>';
      }
      return alert+html;
    };
  }

  if(typeof state!=='undefined') ensure();
})();
