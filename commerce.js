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
      /* A draft was never sent, so nobody owes it yet. */
      return i.clientId===clientId && i.status!=='annulee' && i.status!=='payee' && i.status!=='brouillon';
    });
    var due=invs.reduce(function(s,i){return s+calcInvoiceTotals(i).net;},0);
    var unpaidIds={};
    invs.forEach(function(i){ unpaidIds[i.id]=1; });
    var paidOnUnpaid=(state.payments||[]).filter(function(p){return unpaidIds[p.invoiceId];})
      .reduce(function(s,p){return s+(Number(p.amount)||0);},0);
    return Math.max(0, due - paidOnUnpaid);
  };

  /* The message is plain text and nothing else: formatMoney, not moneyUI —
     the latter wraps its result in <bdi> so the interface can mirror it, and
     those tags arrived at the client as literal characters in the middle of
     the total. The same mistake was already made once, in shareInvoiceWhatsApp.

     No button without a number. A wa.me link built on a blank field opens
     WhatsApp on "this number does not exist", which reads as a broken
     application rather than as a missing field. */
  function relanceButton(c, debt, unpaid){
    if(!waNumber(c.phone)) return '';
    var co=(state.company&&state.company.name)||'';
    var msg=ar()
      ? '\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u064a\u0643\u0645 '+(c.name||'')+'\u060c\n'+
        '\u062a\u0630\u0643\u064a\u0631 \u0648\u062f\u0651\u064a: \u0644\u062f\u064a\u0643\u0645 '+unpaid+' \u0641\u0627\u062a\u0648\u0631\u0629 \u063a\u064a\u0631 \u0645\u062f\u0641\u0648\u0639\u0629 \u0628\u0645\u062c\u0645\u0648\u0639 '+formatMoney(debt)+'.\n'+
        '\u0634\u0643\u0631\u064b\u0627 \u0644\u0643\u0645.'+(co?'\n'+co:'')
      : 'Bonjour '+(c.name||'')+',\n'+
        'Rappel amical : '+unpaid+' facture(s) en attente, pour un total de '+formatMoney(debt)+'.\n'+
        'Merci.'+(co?'\n'+co:'');
    return '<a href="'+waLink(c.phone, msg)+'" target="_blank" rel="noopener" '+
      'class="btn-secondary text-xs py-1 px-2 me-2" title="WhatsApp">'+
      '<i data-lucide="message-circle" class="w-3.5 h-3.5"></i>'+
      (ar()?'\u062a\u0630\u0643\u064a\u0631':'Relancer')+'</a>';
  }

  window.renderDebts=function(){
    ensure();
    var rows=(state.clients||[]).map(function(c){
      var debt=getClientDebt(c.id);
      var unpaid=(state.invoices||[]).filter(function(i){
        return i.clientId===c.id && i.status!=='payee' && i.status!=='annulee' && i.status!=='brouillon';
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
        ? '<div class="flex justify-end mb-3"><button onclick="exportExcel(\'debts\')" class="btn-secondary">'+
            '<i data-lucide="file-spreadsheet" class="w-4 h-4"></i> Excel</button></div>'+
          '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
            '<th class="p-3">'+(ar()?'\u0627\u0644\u0639\u0645\u064a\u0644':'Client')+'</th>'+
            '<th class="p-3">'+(ar()?'\u0641\u0648\u0627\u062a\u064a\u0631 \u063a\u064a\u0631 \u0645\u062f\u0641\u0648\u0639\u0629':'Factures ouvertes')+'</th>'+
            '<th class="p-3">'+(ar()?'\u0627\u0644\u0645\u0628\u0644\u063a \u0627\u0644\u0645\u0633\u062a\u062d\u0642':'Montant d\u00fb')+'</th>'+
            '<th class="p-3"></th></tr></thead><tbody>'+
            rows.map(function(r){
              return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
                '<td class="p-3 font-medium">'+esc(r.c.name)+'</td>'+
                '<td class="p-3">'+r.unpaid+'</td>'+
                '<td class="p-3 font-bold text-amber-600">'+moneyUI(r.debt)+'</td>'+
                '<td class="p-3 text-end whitespace-nowrap">'+relanceButton(r.c, r.debt, r.unpaid)+
                '<button onclick="navigate(\'invoices\')" class="btn-secondary text-xs py-1 px-2">'+(ar()?'\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631':'Factures')+'</button></td></tr>';
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
      '<button onclick="closeModal()" class="btn-ghost p-2" aria-label="'+esc(t('ui.close'))+'"><i data-lucide="x" class="w-5 h-5"></i></button></div>'+
      '<div class="modal-body space-y-3">'+
        '<div><label class="form-label" for="prod-name">'+(ar()?'\u0627\u0644\u0648\u0635\u0641 *':'D\u00e9signation *')+'</label><input id="prod-name" class="form-input" value="'+esc(p&&p.name||'')+'"/></div>'+
        '<div class="grid grid-cols-2 gap-3">'+
          '<div><label class="form-label" for="prod-price">'+(ar()?'\u0627\u0644\u0633\u0639\u0631 HT':'Prix HT')+'</label><input id="prod-price" type="text" inputmode="decimal" min="0" step="0.01" class="form-input ltr-code" value="'+(p?p.price:0)+'"/></div>'+
          '<div><label class="form-label" for="prod-tva">TVA %</label><input id="prod-tva" type="text" inputmode="decimal" min="0" max="100" class="form-input ltr-code" value="'+(p&&p.tva!=null?p.tva:19)+'"/></div>'+
        '</div>'+
        '<div class="grid grid-cols-2 gap-3">'+
          '<div><label class="form-label" for="prod-stock">'+(ar()?'\u0627\u0644\u0645\u062e\u0632\u0648\u0646':'Stock')+'</label><input id="prod-stock" type="text" inputmode="decimal" min="0" step="1" class="form-input ltr-code" value="'+(p&&p.stock!=null?p.stock:0)+'"/></div>'+
          '<div><label class="form-label" for="prod-min">'+(ar()?'\u062d\u062f \u0623\u062f\u0646\u0649':'Seuil')+'</label><input id="prod-min" type="text" inputmode="decimal" min="0" step="1" class="form-input ltr-code" value="'+(p&&p.minStock!=null?p.minStock:0)+'"/></div>'+
        '</div></div>'+
      '<div class="modal-footer flex justify-end gap-2">'+
        '<button onclick="closeModal()" class="btn-secondary">'+(ar()?'\u0625\u0644\u063a\u0627\u0621':'Annuler')+'</button>'+
        '<button onclick="saveProduct('+(id?"'"+id+"'":'null')+')" class="btn-primary">'+(ar()?'\u062d\u0641\u0638':'Enregistrer')+'</button></div></div>');
    try{lucide.createIcons();}catch(e){}
  };

  window.saveProduct=function(id){
    var name=(document.getElementById('prod-name').value||'').trim();
    if(!name) return toast(ar()?'\u0627\u0644\u0648\u0635\u0641 \u0645\u0637\u0644\u0648\u0628':'D\u00e9signation requise','err');
    var price=parseNum(document.getElementById('prod-price').value)||0;
    var tva=parseNum(document.getElementById('prod-tva').value); if(isNaN(tva)) tva=19;
    var stock=parseNum(document.getElementById('prod-stock').value)||0;
    var minStock=parseNum(document.getElementById('prod-min').value)||0;
    ensure();
    if(id){
      var i=state.products.findIndex(function(x){return x.id===id;});
      if(i>=0) state.products[i]=Object.assign({},state.products[i],{name:name,price:price,tva:tva,stock:stock,minStock:minStock});
    } else {
      state.products.push({id:uid(),name:name,price:price,tva:tva,stock:stock,minStock:minStock});
    }
    saveData(); closeModal(); toast(t('toast.saved')); renderPage();
  };

  /* ---------------------------------------------------------------- *
   * Stock is a promise about a shelf.
   *
   * It went down when an invoice was written and never came back up — not
   * when the invoice was cancelled, not when it was deleted, not when an
   * avoir sent the goods back. The products page shows the figure, the
   * threshold warning is drawn from it and the Excel sheet carries it, so a
   * merchant orders against a number that drifts further from the shelf every
   * month, and nothing ever says so.
   *
   * A movement is not an event here, it is a consequence: a document holds
   * stock while it is a live commitment, and releases it when it stops being
   * one. Every path — save, status change, delete, avoir — reconciles instead
   * of adding a movement of its own, so no path can be forgotten and none can
   * apply twice.
   *
   * The sign follows the document, exactly as it does in calcInvoiceTotals: an
   * avoir is goods coming back, so holding one adds to the shelf.
   * ---------------------------------------------------------------- */
  function stockHeldBy(inv){
    /* A draft was never issued and a cancelled invoice has no effect: neither
       has taken anything off a shelf. Same rule as everywhere else. */
    return !!inv && inv.status !== 'brouillon' && inv.status !== 'annulee';
  }

  function isCredit(inv){
    return (typeof isAvoir === 'function') && isAvoir(inv);
  }

  function moveStock(items, dir){
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
      if(p) p.stock=Math.max(0,(Number(p.stock)||0)+dir*qty);
    });
  }

  /* Ce que le document retient reellement : de quoi rendre exactement ce
     qui a ete pris, meme si les lignes ont change depuis. */
  function heldLines(inv){
    return (inv.items||[]).map(function(it){
      return {productId:it.productId||'', description:it.description||'',
              qty:Number(it.qty)||0};
    });
  }
  function linesKey(lines){
    return JSON.stringify((lines||[]).map(function(it){
      return [it.productId||'', String(it.description||'').trim().toLowerCase(),
              Number(it.qty)||0];
    }));
  }

  /* Idempotent by construction: an invoice records whether its lines are
     currently applied, so reconciling twice changes nothing.

     « Si » ne suffisait pas, il fallait « lesquelles ». Le drapeau etait un
     booleen, alors modifier une facture deja emise ne bougeait rien : passer
     une ligne de 2 a 9 laissait l'etagere a -2 pour toujours, et remplacer la
     designation par un article qui n'existe pas ne rendait jamais les deux
     unites que la facture ne vend plus. On garde donc les lignes appliquees a
     cote du drapeau : on rend celles-la, puis on prend les nouvelles. */
  function syncStock(inv, want){
    if(!inv) return false;
    if(want === undefined) want = stockHeldBy(inv);
    var dir = isCredit(inv) ? 1 : -1;

    /* A document written before this existed carries no flag, and its stock
       was already taken at the time. Adopting it as settled — without moving
       anything — is the whole migration: reconciling a ledger of two hundred
       invoices on first load would otherwise deduct every one of them a
       second time. Les factures d'avant ce correctif n'ont pas non plus la
       liste : elles adoptent leurs lignes actuelles, ce qui revient au
       comportement precedent et ne bouge rien. */
    if(inv.stockTaken === undefined) inv.stockTaken = stockHeldBy(inv);
    if(inv.stockTaken && !inv.stockLines) inv.stockLines = heldLines(inv);
    if(!inv.stockTaken) inv.stockLines = null;

    var now = heldLines(inv);

    if(!want){
      if(!inv.stockTaken) return false;
      moveStock(inv.stockLines || now, -dir);
      inv.stockTaken = false; inv.stockLines = null;
      return true;
    }
    if(inv.stockTaken && linesKey(inv.stockLines) === linesKey(now)) return false;
    if(inv.stockTaken) moveStock(inv.stockLines, -dir);
    moveStock(now, dir);
    inv.stockTaken = true; inv.stockLines = now;
    return true;
  }

  window.reconcileStock=function(){
    var moved=false;
    (state.invoices||[]).forEach(function(i){ if(syncStock(i)) moved=true; });
    return moved;
  };

  /* A document about to be removed releases what it holds first. */
  function releaseStock(id){
    var inv=(state.invoices||[]).find(function(i){return i.id===id;});
    if(inv) syncStock(inv, false);
  }

  /* Anything that creates a document declares it as holding nothing yet, so
     the reconcile that follows applies its lines exactly once. */
  window.markStockNew=function(inv){ if(inv) inv.stockTaken=false; };
  var markNew=window.markStockNew;

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
          qty:parseNum(row.querySelector('.item-qty')&&row.querySelector('.item-qty').value)||1,
          productId:row.getAttribute('data-product-id')||''
        });
      });
      var wasNew=!editId, before=(state.invoices||[]).length;
      _saveInv.apply(this,arguments);
      /* saveInvoice returns early when no client is chosen. Deducting before
         checking that meant a validation mistake ate the stock — twice, since
         the user then fixed it and saved again. */
      if(wasNew && (state.invoices||[]).length>before) markNew(state.invoices[state.invoices.length-1]);
      /* An edit can change the lines or the status of a document that already
         holds stock, so both cases end in the same reconcile. */
      if(reconcileStock()) saveData();
    };
  }

  /* Every other door onto the shelf. Each one reconciles; none of them
     computes a movement itself. */
  var _setStatus=window.setStatus;
  if(typeof _setStatus==='function'){
    window.setStatus=function(){
      _setStatus.apply(this,arguments);
      if(reconcileStock()){ saveData(); renderPage(); }
    };
  }

  var _delInv=window.deleteInvoice;
  if(typeof _delInv==='function'){
    window.deleteInvoice=function(id){
      var before=(state.invoices||[]).length;
      /* Released before the call, not after: afterwards the document is gone
         and there is nothing left to read the lines from. If the merchant
         answers no to the confirmation, the count is unchanged and we put it
         back exactly as it was. */
      releaseStock(id);
      _delInv.apply(this,arguments);
      if((state.invoices||[]).length===before) reconcileStock();
      saveData();
    };
  }

  var _dup=window.duplicateInvoice;
  if(typeof _dup==='function'){
    window.duplicateInvoice=function(){
      var before=(state.invoices||[]).length;
      _dup.apply(this,arguments);
      if((state.invoices||[]).length>before) markNew(state.invoices[state.invoices.length-1]);
      if(reconcileStock()) saveData();
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

  /* The four "Excel" buttons produce a real workbook when excel.js is loaded,
     which in the application it always is — the CSV below stays as the floor
     for a page that loads commerce.js alone. */
  window.exportExcel=function(kind){
    ensure();
    if(typeof exportListXlsx==='function' && typeof XLSX!=='undefined'){
      return exportListXlsx(kind);
    }
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
          /* The monthly register is what an accountant actually opens: it is the
             sheet the declaration is filled from, not a dump of every invoice. */
          if(typeof exportJournalXlsx==='function'){
            var j=document.createElement('button');
            j.id='journal-inv-btn';
            j.className='btn-secondary';
            j.innerHTML='<i data-lucide="calendar-range" class="w-4 h-4"></i> '+
              (ar()?'\u0633\u062c\u0644\u0651 \u0627\u0644\u0634\u0647\u0631':'Journal du mois');
            j.onclick=function(){ exportJournalXlsx(); };
            bar.parentNode.insertBefore(j, bar);
          }
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
        alert='<div class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4 items-start">'+
          (totalDebt>0? '<button type="button" onclick="navigate(\'debts\')" class="stat-card text-start w-full border border-amber-200 dark:border-amber-800/50">'+
            '<p class="stat-label text-amber-700 dark:text-amber-400">'+(ar()?'\u062f\u064a\u0648\u0646 \u0627\u0644\u0639\u0645\u0644\u0627\u0621':'Cr\u00e9ances')+'</p>'+
            '<p class="stat-value text-amber-600">'+moneyUI(totalDebt)+'</p></button>':'')+
          (lowStock>0? '<button type="button" onclick="navigate(\'products\')" class="stat-card text-start w-full border border-red-200 dark:border-red-800/50">'+
            '<p class="stat-label text-red-600">'+(ar()?'\u062a\u0646\u0628\u064a\u0647 \u0645\u062e\u0632\u0648\u0646':'Alerte stock')+'</p>'+
            '<p class="stat-value text-red-600">'+lowStock+'</p></button>':'')+
          '</div>';
      }
      return alert+html;
    };
  }

  if(typeof state!=='undefined') ensure();
})();
