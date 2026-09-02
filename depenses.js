/* FacturePro — Dépenses et résultat approximatif.

   The ledger could say what came in and never what went out, so the only
   figure a merchant could read was turnover. Turnover is not what is left,
   and people were treating it as if it were.

   Three decisions carry this file, and none of them is a preference:

   1. **Only a settled invoice is a sale.** An invoice that has been issued is
      a claim, not money — counting it would report a result the merchant
      cannot spend. So the sales side reads `status === 'payee'` and nothing
      else, which is also what keeps a brouillon and an annulée out: a
      document carries one status, and neither of those is that one. An avoir
      is stored as 'payee' and calcInvoiceTotals hands back its lines negated,
      so it subtracts here on its own, once, like everywhere else. A bon de
      livraison totals zero, so it contributes nothing.

   2. **The base is HT, on both sides.** The VAT on a sale is collected for
      the Treasury and handed over; the droit de timbre likewise. Neither is
      revenue, and adding them would inflate the result by roughly a fifth.
      The same reasoning runs the other way on a spend: the VAT on a purchase
      is deducted, not borne, so a dépense is entered and counted HT too.

   3. **It is called a "résultat approximatif" and not a bénéfice.** No
      amortissements, no charges sociales, no variation de stock — a real
      result needs all three and a closing inventory. Saying "bénéfice" would
      put a number on screen an accountant would have to unsay, so the word
      does not appear, and the page carries the sentence that says what is
      missing.

   state.expenses is the only new list. It is written by the whitelist in
   extra.js and carried by the backup in pro-polish.js — a figure this page
   shows must survive an export and a reload, or the page is a toy. */
(function(){
  /* The spend a merchant here actually has. Ordered roughly by how often it
     is entered, not alphabetically, so the common one is near the top of the
     list. 'autre' stays last and is the fallback for anything unmapped. */
  var CATEGORIES=['achats','loyer','salaires','transport','energie','fournitures',
                  'telecom','entretien','honoraires','publicite','impots','banque','autre'];
  var MODES=['especes','virement','cheque','ccp','autre'];

  function ensure(){
    if(!Array.isArray(state.expenses)) state.expenses=[];
  }

  function catLabel(k){
    return t('exp.cat.'+(CATEGORIES.indexOf(k)>-1?k:'autre'));
  }

  /* ---- One dépense ----------------------------------------------------
     Stored HT with its rate, the way a product is, rather than TTC with the
     tax backed out: the supplier invoice states both, and re-deriving one
     from the other loses a centime on every line. */
  window.expenseTotals=function(x){
    var ht=Number(x&&x.amount)||0;
    var tva=vatAmount(ht,Number(x&&x.tva)||0);
    return {ht:ht, tva:tva, ttc:ht+tva};
  };

  /* ---- The period -----------------------------------------------------
     A prefix match on the ISO date, so a month is 'YYYY-MM', a year is
     'YYYY' and everything is ''. Deliberately not persisted: which window a
     merchant is looking at is not data, and state.expenses is the only key
     this feature adds to storage. */
  var period='month';

  function periodPrefix(){
    var now=new Date(), d;
    if(period==='all') return '';
    if(period==='year') return String(now.getFullYear());
    if(period==='prev'){
      d=new Date(now.getFullYear(),now.getMonth()-1,1);
      return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    }
    return now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  }

  function inPeriod(date,prefix){
    return String(date||'').indexOf(prefix)===0;
  }

  function periodLabel(){ return t('exp.period.'+period); }

  /* ---- The figure -----------------------------------------------------
     Exported so the suite can drive it with an explicit prefix instead of
     whatever month the machine running it happens to be in. */
  window.resultatApprox=function(prefix){
    ensure();
    var p=(prefix==null)?periodPrefix():String(prefix);

    var sold=(state.invoices||[]).filter(function(i){
      return i.status==='payee' && inPeriod(i.date,p);
    });
    var ventes=sold.reduce(function(s,i){return s+calcInvoiceTotals(i).ht;},0);

    var spent=(state.expenses||[]).filter(function(x){return inPeriod(x.date,p);});
    var depenses=spent.reduce(function(s,x){return s+expenseTotals(x).ht;},0);

    var parCategorie={};
    spent.forEach(function(x){
      var k=CATEGORIES.indexOf(x.category)>-1?x.category:'autre';
      parCategorie[k]=(parCategorie[k]||0)+expenseTotals(x).ht;
    });

    /* The amount nets an avoir off and a bon de livraison contributes
       nothing, but both are stored as 'payee' and both were being counted as
       "factures payées" underneath the figure. The caption has to describe
       the same documents the figure is made of. */
    var nVentes=sold.filter(function(i){
      var bl=(typeof isBl==='function')&&isBl(i);
      var av=(typeof isAvoir==='function')&&isAvoir(i);
      return !bl && !av;
    }).length;

    return {ventes:ventes, depenses:depenses, resultat:ventes-depenses,
            nVentes:nVentes, nDepenses:spent.length,
            parCategorie:parCategorie, prefix:p};
  };

  window.setExpensePeriod=function(v){ period=v; renderPage(); };

  /* ---- The page ------------------------------------------------------ */
  function periodSelect(){
    var opts=[['month',t('exp.period.month')],['prev',t('exp.period.prev')],
              ['year',t('exp.period.year')],['all',t('exp.period.all')]];
    return '<select id="exp-period" class="form-select w-full sm:w-auto" aria-label="'+esc(t('exp.period.label'))+'" onchange="setExpensePeriod(this.value)">'+
      opts.map(function(o){
        return '<option value="'+o[0]+'"'+(period===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';
      }).join('')+'</select>';
  }

  function summary(r){
    var loss=r.resultat<0;
    return '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">'+
      '<div class="stat-card"><div class="flex items-center justify-between">'+
        '<span class="text-sm text-slate-500">'+esc(t('exp.sales'))+'</span>'+
        '<div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><i data-lucide="trending-up" class="w-5 h-5 text-emerald-600"></i></div>'+
        '</div><p class="text-xl font-bold mt-2">'+moneyUI(r.ventes)+'</p>'+
        '<p class="text-xs text-slate-400 mt-1">'+r.nVentes+' '+esc(t('exp.salesCount'))+'</p></div>'+
      '<div class="stat-card"><div class="flex items-center justify-between">'+
        '<span class="text-sm text-slate-500">'+esc(t('exp.spend'))+'</span>'+
        '<div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><i data-lucide="trending-down" class="w-5 h-5 text-amber-600"></i></div>'+
        '</div><p class="text-xl font-bold mt-2">'+moneyUI(r.depenses)+'</p>'+
        '<p class="text-xs text-slate-400 mt-1">'+r.nDepenses+' '+esc(t('exp.count'))+'</p></div>'+
      '<div class="stat-card"><div class="flex items-center justify-between">'+
        '<span id="exp-result-label" class="text-sm text-slate-500">'+esc(t('exp.result'))+'</span>'+
        '<div class="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><i data-lucide="scale" class="w-5 h-5 text-sky-600"></i></div>'+
        '</div><p id="exp-result" class="text-xl font-bold mt-2'+(loss?' text-red-600':'')+'">'+moneyUI(r.resultat)+'</p>'+
        '<p class="text-xs text-slate-400 mt-1">'+esc(periodLabel())+'</p></div>'+
      '</div>'+
      '<div class="card p-4 mb-5 space-y-1.5">'+
        '<p id="exp-result-hint" class="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">'+esc(t('exp.resultHint'))+'</p>'+
        '<p id="exp-basis-hint" class="text-xs text-slate-500 leading-relaxed">'+esc(t('exp.basisHint'))+'</p>'+
      '</div>';
  }

  function categoryBreakdown(r){
    var keys=Object.keys(r.parCategorie).sort(function(a,b){
      return r.parCategorie[b]-r.parCategorie[a];});
    if(!keys.length) return '';
    var top=r.parCategorie[keys[0]]||1;
    return '<div class="card p-4 mt-4">'+
      '<h3 class="font-semibold text-sm mb-3">'+esc(t('exp.byCategory'))+'</h3>'+
      '<div class="space-y-2">'+keys.map(function(k){
        var v=r.parCategorie[k];
        var pct=Math.max(2,Math.round(v/top*100));
        /* The bar needs a track of its own. Left as a direct flex child its
           percentage was measured against the whole row and then shrunk to
           fit, so 30 000 and 20 000 came out 690px and 631px — a chart that
           reports 0,91 where the figures say 0,67 is worse than no chart. */
        return '<div class="flex items-center gap-3">'+
          '<span class="text-xs w-40 shrink-0 truncate">'+esc(catLabel(k))+'</span>'+
          '<span class="flex-1 min-w-0"><span class="block h-2 rounded-full bg-amber-400/70" style="width:'+pct+'%"></span></span>'+
          '<span class="text-xs font-semibold shrink-0">'+moneyUI(v)+'</span></div>';
      }).join('')+'</div></div>';
  }

  function expensesTable(list){
    if(!list.length){
      return '<div class="empty-state"><p class="font-medium">'+esc(t('exp.empty'))+'</p>'+
        '<p class="text-sm text-slate-500 mt-1">'+esc(t('exp.emptyHint'))+'</p></div>';
    }
    return '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead>'+
      '<tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
        '<th class="p-3">'+esc(t('exp.date'))+'</th>'+
        '<th class="p-3">'+esc(t('exp.label'))+'</th>'+
        '<th class="p-3">'+esc(t('exp.category'))+'</th>'+
        '<th class="p-3">'+esc(t('exp.amountHt'))+'</th>'+
        '<th class="p-3">'+esc(t('exp.ttc'))+'</th>'+
        '<th class="p-3">'+esc(t('exp.mode'))+'</th>'+
        '<th class="p-3"></th></tr></thead><tbody>'+
      list.map(function(x){
        var tot=expenseTotals(x);
        return '<tr class="border-b border-slate-100 dark:border-slate-800" data-exp="'+esc(x.id)+'">'+
          '<td class="p-3">'+dateUI(x.date)+'</td>'+
          '<td class="p-3 font-medium">'+esc(x.label||'')+
            (x.note?'<div class="text-xs text-slate-400">'+esc(x.note)+'</div>':'')+'</td>'+
          '<td class="p-3">'+esc(catLabel(x.category))+'</td>'+
          '<td class="p-3 font-semibold">'+moneyUI(tot.ht)+'</td>'+
          '<td class="p-3 text-slate-500">'+moneyUI(tot.ttc)+'</td>'+
          '<td class="p-3">'+esc(t('payment.method.'+(MODES.indexOf(x.mode)>-1?x.mode:'autre')))+'</td>'+
          '<td class="p-3 text-end whitespace-nowrap">'+
            '<button onclick="openExpenseModal(\''+x.id+'\')" class="btn-ghost p-2" aria-label="'+esc(t('actions.edit'))+'"><i data-lucide="pencil" class="w-4 h-4"></i></button>'+
            '<button onclick="deleteExpense(\''+x.id+'\')" class="btn-ghost p-2 text-red-500" aria-label="'+esc(t('actions.delete'))+'"><i data-lucide="trash-2" class="w-4 h-4"></i></button>'+
          '</td></tr>';
      }).join('')+'</tbody></table></div>';
  }

  window.renderExpenses=function(){
    ensure();
    var r=resultatApprox();
    var list=(state.expenses||[]).filter(function(x){return inPeriod(x.date,r.prefix);})
      .sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
    return '<div class="flex flex-col sm:flex-row justify-between gap-3 mb-4">'+
        periodSelect()+
        '<button onclick="openExpenseModal()" class="btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> '+esc(t('exp.add'))+'</button>'+
      '</div>'+
      summary(r)+
      expensesTable(list)+
      categoryBreakdown(r);
  };

  /* ---- Adding and editing -------------------------------------------- */
  window.openExpenseModal=function(id){
    ensure();
    var x=id?(state.expenses||[]).find(function(e){return e.id===id;}):null;
    openModal('<div class="modal max-w-lg" onclick="event.stopPropagation()">'+
      '<div class="modal-header"><h3 class="font-semibold">'+esc(x?t('exp.edit'):t('exp.add'))+'</h3>'+
      '<button onclick="closeModal()" class="btn-ghost p-2" aria-label="'+esc(t('ui.close'))+'"><i data-lucide="x" class="w-5 h-5"></i></button></div>'+
      '<div class="modal-body space-y-3">'+
        '<div><label class="form-label" for="exp-label">'+esc(t('exp.labelReq'))+'</label>'+
          '<input id="exp-label" class="form-input" value="'+esc(x&&x.label||'')+'"/></div>'+
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">'+
          '<div><label class="form-label" for="exp-date">'+esc(t('exp.date'))+'</label>'+
            '<input id="exp-date" type="date" class="form-input" value="'+esc(x&&x.date||todayISO())+'"/></div>'+
          '<div><label class="form-label" for="exp-cat">'+esc(t('exp.category'))+'</label>'+
            '<select id="exp-cat" class="form-select">'+CATEGORIES.map(function(k){
              return '<option value="'+k+'"'+((x&&x.category||'achats')===k?' selected':'')+'>'+esc(t('exp.cat.'+k))+'</option>';
            }).join('')+'</select></div>'+
        '</div>'+
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">'+
          '<div><label class="form-label" for="exp-amount">'+esc(t('exp.amountReq'))+'</label>'+
            '<input id="exp-amount" type="text" inputmode="decimal" min="0" step="0.01" class="form-input ltr-code" value="'+(x?x.amount:'')+'"/></div>'+
          '<div><label class="form-label" for="exp-tva">'+esc(t('exp.vat'))+'</label>'+
            '<select id="exp-tva" class="form-select">'+[19,9,0].map(function(v){
              return '<option value="'+v+'"'+((x&&x.tva!=null?x.tva:19)===v?' selected':'')+'>'+v+'%</option>';
            }).join('')+'</select></div>'+
          '<div><label class="form-label" for="exp-mode">'+esc(t('exp.mode'))+'</label>'+
            '<select id="exp-mode" class="form-select">'+MODES.map(function(m){
              return '<option value="'+m+'"'+((x&&x.mode||'especes')===m?' selected':'')+'>'+esc(t('payment.method.'+m))+'</option>';
            }).join('')+'</select></div>'+
        '</div>'+
        '<p class="text-xs text-slate-500">'+esc(t('exp.vatHint'))+'</p>'+
        '<div><label class="form-label" for="exp-note">'+esc(t('exp.note'))+'</label>'+
          '<input id="exp-note" class="form-input" value="'+esc(x&&x.note||'')+'"/></div>'+
      '</div>'+
      '<div class="modal-footer flex justify-end gap-2">'+
        '<button onclick="closeModal()" class="btn-secondary">'+esc(t('actions.back'))+'</button>'+
        '<button onclick="saveExpense('+(id?"'"+id+"'":'null')+')" class="btn-primary">'+esc(t('actions.save'))+'</button>'+
      '</div></div>');
    try{lucide.createIcons();}catch(e){}
  };

  window.saveExpense=function(id){
    ensure();
    var label=((document.getElementById('exp-label')||{}).value||'').trim();
    if(!label) return toast(t('exp.errLabel'),'err');
    var amount=parseNum((document.getElementById('exp-amount')||{}).value);
    if(!isFinite(amount)||amount<0) return toast(t('exp.errAmount'),'err');
    var tva=parseNum((document.getElementById('exp-tva')||{}).value);
    if(!isFinite(tva)) tva=19;
    var data={
      label:label,
      date:(document.getElementById('exp-date')||{}).value||todayISO(),
      category:(document.getElementById('exp-cat')||{}).value||'autre',
      amount:amount,
      tva:tva,
      mode:(document.getElementById('exp-mode')||{}).value||'especes',
      note:(((document.getElementById('exp-note')||{}).value)||'').trim()
    };
    if(id){
      var i=(state.expenses||[]).findIndex(function(e){return e.id===id;});
      if(i>=0) state.expenses[i]=Object.assign({},state.expenses[i],data);
    }else{
      state.expenses.push(Object.assign({id:uid()},data));
    }
    /* A dépense dated outside the window on screen would be saved and then
       vanish, which reads as a save that failed. Widen the view rather than
       silently drop it. */
    if(!inPeriod(data.date,periodPrefix())) period='all';
    saveData(); closeModal(); toast(t('toast.saved')); renderPage();
  };

  window.deleteExpense=function(id){
    if(!confirm(t('exp.confirmDelete'))) return;
    ensure();
    state.expenses=(state.expenses||[]).filter(function(e){return e.id!==id;});
    saveData(); toast(t('toast.saved')); renderPage();
  };

  /* Outermost wrapper: this file is last in the core list, so 'expenses' is
     caught before the chain below has a chance to fall through to "page not
     found".

     Returning early here means the base renderPage never runs, and the two
     things it does around its own painting have to be done by hand. Missing
     them is not theoretical: the backup banner writes its text imperatively,
     so on this page alone it kept the language it had been painted in, and a
     French banner sat on an Arabic screen — the same fault the install bar
     already had once. updateOverdue is the other one: an invoice that fell
     due while the merchant was reading this page stayed 'envoyée' until they
     navigated somewhere else. animateCounters is deliberately absent, as
     nothing here carries .count[data-v]. */
  var _render=window.renderPage;
  window.renderPage=function(){
    ensure();
    if(typeof state!=='undefined' && state.currentPage==='expenses'){
      var c=document.getElementById('main-content');
      if(c){
        try{if(typeof updateOverdue==='function')updateOverdue();}catch(e){}
        c.innerHTML=renderExpenses();
        try{lucide.createIcons();}catch(e){}
        try{if(typeof paintBackupNotice==='function')paintBackupNotice();}catch(e){}
        return;
      }
    }
    if(typeof _render==='function') return _render.apply(this,arguments);
  };

  if(typeof state!=='undefined') ensure();
})();
