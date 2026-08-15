/* FacturePro — professional polish layer */
(function(){
  function ar(){ return (typeof locale!=='undefined' && locale==='ar'); }

  var _export = window.exportData;
  window.exportData = function(){
    try{
      var data={
        company:state.company,
        clients:state.clients,
        invoices:state.invoices,
        nextInvoiceNumber:state.nextInvoiceNumber,
        products:state.products||[],
        devis:state.devis||[],
        payments:state.payments||[],
        nextDevisNumber:state.nextDevisNumber||1,
        exportedAt:new Date().toISOString(),
        version:'facturepro-dz-v25'
      };
      var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='facturepro-'+new Date().toISOString().slice(0,10)+'.json';
      a.click();
      toast(t('toast.exportOk'));
    }catch(e){
      if(typeof _export==='function') _export();
    }
  };

  window.importData = function(ev){
    var f=ev&&ev.target&&ev.target.files&&ev.target.files[0];
    if(!f) return;
    var reader=new FileReader();
    reader.onload=function(){
      try{
        var d=JSON.parse(reader.result);
        if(!d || typeof d!=='object') throw new Error('bad');
        if(d.company) state.company=Object.assign({},state.company,d.company);
        if(Array.isArray(d.clients)) state.clients=d.clients;
        if(Array.isArray(d.invoices)) state.invoices=d.invoices;
        if(d.nextInvoiceNumber) state.nextInvoiceNumber=d.nextInvoiceNumber;
        if(Array.isArray(d.products)) state.products=d.products;
        if(Array.isArray(d.devis)) state.devis=d.devis;
        if(Array.isArray(d.payments)) state.payments=d.payments;
        if(d.nextDevisNumber) state.nextDevisNumber=d.nextDevisNumber;
        saveData();
        toast(t('toast.exportOk'));
        renderPage();
      }catch(err){
        toast(t('toast.badFile'),'err');
      }
    };
    reader.onerror=function(){ toast(t('toast.unreadable'),'err'); };
    reader.readAsText(f);
  };

  window.shareInvoiceWhatsApp=function(id){
    var inv=state.invoices.find(function(i){return i.id===id;});
    if(!inv) return;
    var cl=getClient(inv.clientId)||{};
    var tot=calcInvoiceTotals(inv);
    var lines=(inv.items||[]).map(function(it,i){
      return (i+1)+'. '+(it.description||'')+' \u00d7 '+(it.qty||1)+' = '+(Number(it.unitPrice)||0);
    }).join('\n');
    var msg=(ar()
      ? '\u0641\u0627\u062a\u0648\u0631\u0629 '+(inv.number||'')+'\n\u0627\u0644\u0639\u0645\u064a\u0644: '+(cl.name||'')+'\n\u0627\u0644\u062a\u0627\u0631\u064a\u062e: '+(inv.date||'')+'\n\n'+lines+'\n\n\u0627\u0644\u0635\u0627\u0641\u064a \u0644\u0644\u062f\u0641\u0639: '+moneyUI(tot.net)+'\n'+(state.company&&state.company.name?state.company.name:'')
      : 'Facture '+(inv.number||'')+'\nClient: '+(cl.name||'')+'\nDate: '+(inv.date||'')+'\n\n'+lines+'\n\nNet a payer: '+moneyUI(tot.net)+'\n'+(state.company&&state.company.name?state.company.name:''));
    window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
  };

  var _rit = window.renderInvoicesTable;
  if(typeof _rit==='function'){
    window.renderInvoicesTable=function(list,compact){
      var html=_rit.apply(this,arguments);
      html=html.replace(/onclick="deleteInvoice\('([^']+)'\)" class="btn-ghost p-1\.5 text-red-500"/g, function(_,id){
        return 'onclick="shareInvoiceWhatsApp(\''+id+'\')" class="btn-ghost p-1.5 text-emerald-600" title="WhatsApp"><i data-lucide="message-circle" class="w-4 h-4"></i></button><button onclick="deleteInvoice(\''+id+'\')" class="btn-ghost p-1.5 text-red-500"';
      });
      html=html.replace(/onclick="deleteInvoice\('([^']+)'\)" class="btn-ghost p-2 text-red-500"/g, function(_,id){
        return 'onclick="shareInvoiceWhatsApp(\''+id+'\')" class="btn-ghost p-2 text-emerald-600" title="WhatsApp"><i data-lucide="message-circle" class="w-4 h-4"></i></button><button onclick="deleteInvoice(\''+id+'\')" class="btn-ghost p-2 text-red-500"';
      });
      return html;
    };
  }

  function catalogBar(){
    var products=state.products||[];
    if(!products.length) return '';
    return '<div class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2">'+
      '<div class="text-xs font-semibold text-slate-500 uppercase tracking-wide">'+(ar()?'\u0645\u0646 \u0627\u0644\u0643\u062a\u0627\u0644\u0648\u062c':'Depuis le catalogue')+'</div>'+
      '<div class="flex flex-wrap gap-2">'+
      products.slice(0,12).map(function(p){
        return '<button type="button" onclick="addProductToInvoice(\''+p.id+'\')" class="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition">'+
          esc(p.name)+' \u00b7 '+moneyUI(Number(p.price)||0)+'</button>';
      }).join('')+
      '</div></div>';
  }

  window.addProductToInvoice=function(pid){
    var p=(state.products||[]).find(function(x){return x.id===pid;});
    if(!p || typeof itemRowHtml!=='function') return;
    var box=document.getElementById('items-container');
    if(!box) return;
    var wrap=document.createElement('div');
    wrap.innerHTML=itemRowHtml({description:p.name,qty:1,unitPrice:Number(p.price)||0,tva:p.tva!=null?p.tva:19});
    box.appendChild(wrap.firstChild);
    try{lucide.createIcons();}catch(e){}
    toast(ar()?'\u062a\u0645\u062a \u0627\u0644\u0625\u0636\u0627\u0641\u0629':'Ajout\u00e9');
  };

  var _oni=window.openNewInvoice;
  if(typeof _oni==='function'){
    window.openNewInvoice=function(editId){
      _oni.apply(this,arguments);
      setTimeout(function(){
        var body=document.querySelector('#modal-root .modal-body');
        if(!body || document.getElementById('catalog-injected')) return;
        var bar=catalogBar();
        if(!bar) return;
        var div=document.createElement('div');
        div.id='catalog-injected';
        div.innerHTML=bar;
        var itemsLabel=body.querySelector('#items-container');
        if(itemsLabel && itemsLabel.parentNode){
          itemsLabel.parentNode.insertBefore(div, itemsLabel);
        } else {
          body.appendChild(div);
        }
        try{lucide.createIcons();}catch(e){}
      },40);
    };
  }

  var _rd=window.renderDashboard;
  if(typeof _rd==='function'){
    window.renderDashboard=function(){
      var html=_rd.apply(this,arguments);
      var nDev=(state.devis||[]).length;
      var nProd=(state.products||[]).length;
      var nPay=(state.payments||[]).length;
      var paySum=(state.payments||[]).reduce(function(s,p){return s+(Number(p.amount)||0);},0);
      var strip='<div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">'+
        '<button type="button" onclick="navigate(\'devis\')" class="card p-4 text-start hover:ring-2 hover:ring-emerald-500/30 transition">'+
          '<p class="text-xs text-slate-500">'+(ar()?'\u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631':'Devis')+'</p>'+
          '<p class="text-lg font-bold mt-1">'+nDev+'</p></button>'+
        '<button type="button" onclick="navigate(\'products\')" class="card p-4 text-start hover:ring-2 hover:ring-emerald-500/30 transition">'+
          '<p class="text-xs text-slate-500">'+(ar()?'\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a':'Produits')+'</p>'+
          '<p class="text-lg font-bold mt-1">'+nProd+'</p></button>'+
        '<button type="button" onclick="navigate(\'payments\')" class="card p-4 text-start hover:ring-2 hover:ring-emerald-500/30 transition">'+
          '<p class="text-xs text-slate-500">'+(ar()?'\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a':'Paiements')+'</p>'+
          '<p class="text-lg font-bold mt-1">'+moneyUI(paySum)+' <span class="text-xs font-normal text-slate-400">('+nPay+')</span></p></button>'+
        '</div>';
      return strip+html;
    };
  }

  window.devisStatusLabel=function(s){
    var map={
      fr:{brouillon:'Brouillon',accepte:'Accept\u00e9',refuse:'Refus\u00e9',envoye:'Envoy\u00e9'},
      ar:{brouillon:'\u0645\u0633\u0648\u062f\u0629',accepte:'\u0645\u0642\u0628\u0648\u0644',refuse:'\u0645\u0631\u0641\u0648\u0636',envoye:'\u0645\u064f\u0631\u0633\u0644'}
    };
    var m=map[ar()?'ar':'fr'];
    return m[s]||s||m.brouillon;
  };
})();
