/* FacturePro — professional polish layer */
(function(){
  function ar(){ return (typeof locale!=='undefined' && locale==='ar'); }

  /* One backup, two carriers. The file a merchant downloads and the copy
     drive.js writes to their Google Drive must be the same object, or the day
     a list is added it gets added to one of them and the other quietly ships a
     backup with a hole in it. Both call this. */
  window.buildBackup = function(){
    return {
      company:state.company,
      clients:state.clients,
      invoices:state.invoices,
      nextInvoiceNumber:state.nextInvoiceNumber,
      /* Absent until now. ensureAvoirState rebuilt the counter from the
         documents on restore, which works, so nothing was visibly broken —
         but it guessed what the file could have carried. */
      nextAvoirNumber:state.nextAvoirNumber||1,
      products:state.products||[],
      devis:state.devis||[],
      payments:state.payments||[],
      expenses:state.expenses||[],
      nextDevisNumber:state.nextDevisNumber||1,
      exportedAt:new Date().toISOString(),
      version:'facturepro-dz-v25'
    };
  };

  var _export = window.exportData;
  window.exportData = function(){
    try{
      var blob=new Blob([JSON.stringify(window.buildBackup(),null,2)],{type:'application/json'});
      var a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='facturepro-'+new Date().toISOString().slice(0,10)+'.json';
      a.click();
      toast(t('toast.exportOk'));
    }catch(e){
      if(typeof _export==='function') _export();
    }
  };

  /* This override had replaced the validating version in b2b.js. A file with
     "clients": [] wiped every client and reported success; one with a string
     where items should be broke the app on every boot with a blank screen.
     Now the file is checked first, the user is told what will be replaced, and
     the current data is copied aside before anything is touched. */
  function validBackup(d){
    if(!d||typeof d!=='object'||Array.isArray(d))return 'format';
    var lists=['clients','invoices','products','devis','payments','expenses'],i,k,r;
    for(i=0;i<lists.length;i++){k=lists[i];
      if(d[k]!==undefined&&!Array.isArray(d[k]))return k;}
    if(Array.isArray(d.invoices)){
      for(i=0;i<d.invoices.length;i++){r=d.invoices[i];
        if(!r||typeof r!=='object')return 'invoices';
        if(r.items!==undefined&&!Array.isArray(r.items))return 'invoices';}}
    if(Array.isArray(d.clients)){
      for(i=0;i<d.clients.length;i++){if(!d.clients[i]||typeof d.clients[i]!=='object')return 'clients';}}
    return '';
  }

  window.validBackup = validBackup;

  /* The half of an import that touches state. importData reads the file and
     asks the questions; this applies what was read. drive.js restores through
     it too, so a file coming back from Drive lands on the path the file import
     has already proven — including the avoir counter and the empty-expenses
     rule below.

     It returns false instead of throwing. A half-applied backup is worse than
     a refused one, and the caller owns the toast. */
  window.applyBackup = function(d){
    if(validBackup(d)) return false;
    try{
      if(d.company) state.company=Object.assign({},state.company,d.company);
      if(Array.isArray(d.clients)) state.clients=d.clients.map(function(c){
        return Object.assign({},c,{id:c.id||uid()});});
      if(Array.isArray(d.invoices)) state.invoices=d.invoices.map(function(i){
        return Object.assign({},i,{id:i.id||uid(),items:Array.isArray(i.items)?i.items:[],
                                   paymentMode:i.paymentMode||'virement'});});
      if(Array.isArray(d.products)) state.products=d.products;
      if(Array.isArray(d.devis)) state.devis=d.devis;
      if(Array.isArray(d.payments)) state.payments=d.payments;
      /* A backup written before this feature has no expenses key. Leaving
         what is in memory would blend the importer's dépenses into somebody
         else's books, so the absent list means an empty one. */
      state.expenses=Array.isArray(d.expenses)?d.expenses:[];
      if(d.nextDevisNumber) state.nextDevisNumber=d.nextDevisNumber;

      /* an imported set must never hand out a number that already exists */
      var maxNo=0;
      (state.invoices||[]).forEach(function(i){
        var m=/(\d+)\s*$/.exec(i.number||''); if(m) maxNo=Math.max(maxNo,parseInt(m[1],10)||0);});
      state.nextInvoiceNumber=Math.max(Number(d.nextInvoiceNumber)||1,maxNo+1);

      /* Same rule one series over: the file's counter is taken, but never
         below what the restored documents already use. A counter that walks
         backwards hands two avoirs the same number. */
      var fromFile=Number(d.nextAvoirNumber)||0;
      delete state.nextAvoirNumber;
      if(typeof ensureAvoirState==='function') ensureAvoirState();
      state.nextAvoirNumber=Math.max(Number(state.nextAvoirNumber)||1,fromFile);

      saveData();
      return true;
    }catch(err){ return false; }
  };

  window.importData = function(ev){
    var f=ev&&ev.target&&ev.target.files&&ev.target.files[0];
    if(!f) return;
    var input=ev.target;
    var reader=new FileReader();
    reader.onload=function(){
      var d;
      try{ d=JSON.parse(reader.result); }
      catch(err){ toast(t('toast.badFile'),'err'); input.value=''; return; }

      var bad=validBackup(d);
      if(bad){ toast(t('toast.badFile'),'err'); input.value=''; return; }

      var n=function(x){return Array.isArray(x)?x.length:0;};
      var msg=t('confirm.import')
        .replace('{cli}',n(d.clients)).replace('{inv}',n(d.invoices))
        .replace('{oldCli}',n(state.clients)).replace('{oldInv}',n(state.invoices));
      if(!confirm(msg)){ input.value=''; return; }

      /* keep a copy of what is about to be replaced */
      try{ localStorage.setItem(STORAGE_KEY+'_avant_import',
             localStorage.getItem(STORAGE_KEY)||''); }catch(e){}

      if(!window.applyBackup(d)) toast(t('toast.badFile'),'err');
      else { toast(t('toast.importOk')); renderPage(); }
      input.value='';
    };
    reader.onerror=function(){ toast(t('toast.unreadable'),'err'); input.value=''; };
    reader.readAsText(f);
  };

  /* WhatsApp carries plain text and nothing else. moneyUI wraps its result in
     <bdi> so the interface can mirror it, and those tags were arriving at the
     client as literal characters in the middle of the total. formatMoney is the
     plain-text formatter, and that is the one that belongs in a message.

     The line read `qty = unitPrice`, which is the unit price standing where the
     line total belongs: five days at 45 000 announced 45 000 and the total
     underneath said 225 000. Accountants read that as an invoice that does not
     add up. The line now carries its own total, signed with the document so an
     avoir does not list positive lines under a negative total. */
  window.shareInvoiceWhatsApp=function(id){
    var inv=state.invoices.find(function(i){return i.id===id;});
    if(!inv) return;
    var cl=getClient(inv.clientId)||{};
    var tot=calcInvoiceTotals(inv);
    var sign=isAvoir(inv)?-1:1;
    var lines=(inv.items||[]).map(function(it,i){
      var qty=Number(it.qty)||0;
      var line=qty*(Number(it.unitPrice)||0)*sign;
      return (i+1)+'. '+(it.description||'')+' \u00d7 '+qty+' = '+formatMoney(line);
    }).join('\n');
    /* An avoir gives money back: calling its total "net to pay" would be a
       second wrong figure on the same message. */
    var head=ar()
      ? (isAvoir(inv)?'\u0625\u0634\u0639\u0627\u0631 \u062f\u0627\u0626\u0646 ':'\u0641\u0627\u062a\u0648\u0631\u0629 ')
      : (isAvoir(inv)?"Facture d'avoir ":'Facture ');
    var totalLabel=ar()
      ? (isAvoir(inv)?'\u0627\u0644\u0645\u0628\u0644\u063a':'\u0627\u0644\u0635\u0627\u0641\u064a \u0644\u0644\u062f\u0641\u0639')
      : (isAvoir(inv)?'Montant':'Net a payer');
    var msg=(ar()
      ? head+(inv.number||'')+'\n\u0627\u0644\u0639\u0645\u064a\u0644: '+(cl.name||'')+'\n\u0627\u0644\u062a\u0627\u0631\u064a\u062e: '+(inv.date||'')+'\n\n'+lines+'\n\n'+totalLabel+': '+formatMoney(tot.net)+'\n'+(state.company&&state.company.name?state.company.name:'')
      : head+(inv.number||'')+'\nClient: '+(cl.name||'')+'\nDate: '+(inv.date||'')+'\n\n'+lines+'\n\n'+totalLabel+': '+formatMoney(tot.net)+'\n'+(state.company&&state.company.name?state.company.name:''));
    /* With the client's number the chat opens on them; without it, WhatsApp
       asks the merchant to choose, which is what it always did. */
    var direct=(typeof waLink==='function')&&waLink(cl.phone,msg);
    window.open(direct||('https://wa.me/?text='+encodeURIComponent(msg)),'_blank');
  };

  /* Buttons the list did not have, injected in front of the delete button.
     Written as a replacement rather than an edit to renderInvoicesTable so the
     two files stay independent — the same reason the backup stamp wraps
     exportData instead of editing it.

     The avoir button was reachable only from inside the preview: you had to
     open the eye first, and nothing on the row said so. The person who asked
     for the feature could not find it, which is the clearest possible verdict
     on where it was. It is offered only where createAvoir would accept it —
     never on a draft, never on an avoir — so it does not put a button on
     screen whose only answer is no. */
  function extraRowButtons(id, pad){
    var inv=(state.invoices||[]).find(function(i){return i.id===id;});
    var out='onclick="shareInvoiceWhatsApp(\''+id+'\')" class="btn-ghost '+pad
          +' text-emerald-600" title="WhatsApp" aria-label="WhatsApp">'
          +'<i data-lucide="message-circle" class="w-4 h-4"></i></button>';
    if(inv && !isAvoir(inv) && !isBl(inv) && inv.status!=='brouillon'){
      var lbl=esc(t('avoir.action'));
      out+='<button onclick="createAvoir(\''+id+'\')" class="btn-ghost '+pad
        +' text-amber-600" title="'+lbl+'" aria-label="'+lbl+'">'
        +'<i data-lucide="file-minus" class="w-4 h-4"></i></button>';
    }
    /* A delivery note is offered on a draft too: goods often leave before the
       invoice is finalised, and the bon is what the client signs on the spot. */
    if(inv && !isAvoir(inv) && !isBl(inv)){
      var blb=esc(t('bl.action'));
      out+='<button onclick="createBonLivraison(\''+id+'\')" class="btn-ghost '+pad
        +' text-sky-600" title="'+blb+'" aria-label="'+blb+'">'
        +'<i data-lucide="truck" class="w-4 h-4"></i></button>';
    }
    return out+'<button ';
  }

  var _rit = window.renderInvoicesTable;
  if(typeof _rit==='function'){
    window.renderInvoicesTable=function(list,compact){
      var html=_rit.apply(this,arguments);
      [['p-1.5','p-1\\.5'],['p-2','p-2']].forEach(function(p){
        var re=new RegExp('onclick="deleteInvoice\\(\'([^\']+)\'\\)" class="btn-ghost '+p[1]+' text-red-500"','g');
        html=html.replace(re, function(_,id){
          return extraRowButtons(id, p[0])
               + 'onclick="deleteInvoice(\''+id+'\')" class="btn-ghost '+p[0]+' text-red-500"';
        });
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
      var strip='<div class="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4 items-start">'+
        '<button type="button" onclick="navigate(\'devis\')" class="stat-card text-start w-full hover:ring-2 hover:ring-emerald-500/30 transition">'+
          '<p class="stat-label">'+(ar()?'\u0639\u0631\u0648\u0636 \u0627\u0644\u0623\u0633\u0639\u0627\u0631':'Devis')+'</p>'+
          '<p class="stat-value">'+nDev+'</p></button>'+
        '<button type="button" onclick="navigate(\'products\')" class="stat-card text-start w-full hover:ring-2 hover:ring-emerald-500/30 transition">'+
          '<p class="stat-label">'+(ar()?'\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a':'Produits')+'</p>'+
          '<p class="stat-value">'+nProd+'</p></button>'+
        '<button type="button" onclick="navigate(\'payments\')" class="stat-card text-start w-full hover:ring-2 hover:ring-emerald-500/30 transition">'+
          '<p class="stat-label">'+(ar()?'\u0627\u0644\u0645\u062f\u0641\u0648\u0639\u0627\u062a':'Paiements')+'</p>'+
          '<p class="stat-value">'+moneyUI(paySum)+' <span class="text-xs font-normal text-slate-400">('+nPay+')</span></p></button>'+
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
