/* FacturePro — relevé de compte client + factures récurrentes.

   Two things the ledger did not do, and that an accountant asks for.

   A relevé is not the créances page. Créances answers "who owes what now".
   A relevé answers "what happened with this client, in order, and where the
   balance comes from": issued invoices (debit), avoirs (credit), payments
   (credit). Drafts, cancelled invoices and bons de livraison do not enter
   it — they were never a claim. The running balance is what the client
   owes after each line; the same figure getClientDebt would report at that
   date, rebuilt from the documents instead of stored.

   Recurring invoices have no server and no cron. They fire when the
   application opens, at most three drafts per template per session, so a
   merchant who comes back after six months is not handed a year of numbered
   invoices they did not look at. Status is brouillon: the merchant issues
   them. nextDate advances whether they look or not, so the series does not
   pile up behind a closed tab.

   recurrences lives on the extra.js whitelist and in buildBackup — the same
   two places every new list has to be added, or a Drive restore ships a
   hole. */

(function(){
  function ar(){ return typeof locale!=='undefined' && locale==='ar'; }
  function today(){ return new Date().toISOString().slice(0,10); }
  function iso(d){
    if(!(d instanceof Date) || isNaN(d.getTime())) return today();
    return d.toISOString().slice(0,10);
  }
  function addMonths(dateStr, n){
    var p=(dateStr||today()).split('-');
    var y=parseInt(p[0],10), m=parseInt(p[1],10)-1, day=parseInt(p[2],10)||1;
    var dt=new Date(Date.UTC(y, m+n, 1));
    var last=new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth()+1, 0)).getUTCDate();
    dt.setUTCDate(Math.min(day, last));
    return iso(dt);
  }
  function inRange(d, from, to){
    if(!d) return false;
    if(from && d<from) return false;
    if(to && d>to) return false;
    return true;
  }
  function isLiveInvoice(inv){
    if(!inv) return false;
    if(typeof isBl==='function' && isBl(inv)) return false;
    if(inv.status==='brouillon' || inv.status==='annulee') return false;
    return true;
  }

  /* ---------------------------------------------------------------- *
   * Relevé
   * ---------------------------------------------------------------- */

  window.buildStatementLines=function(clientId, from, to){
    var lines=[], i, inv, p, net;
    (state.invoices||[]).forEach(function(inv){
      if(inv.clientId!==clientId || !isLiveInvoice(inv)) return;
      if(!inRange(inv.date, from, to)) return;
      net=calcInvoiceTotals(inv).net;
      var avoir=typeof isAvoir==='function' && isAvoir(inv);
      lines.push({
        date:inv.date||'',
        kind:avoir?'avoir':'invoice',
        ref:inv.number||'',
        invoiceId:inv.id,
        debit:net>0?net:0,
        credit:net<0?-net:0,
        label:avoir
          ? (ar()?'إشعار دائن':'Avoir')+' '+inv.number
          : (ar()?'فاتورة':'Facture')+' '+inv.number
      });
    });
    (state.payments||[]).forEach(function(p){
      inv=(state.invoices||[]).find(function(x){return x.id===p.invoiceId;})||{};
      if((p.clientId||inv.clientId)!==clientId) return;
      if(!inRange(p.date, from, to)) return;
      var amt=Number(p.amount)||0;
      if(amt<=0) return;
      lines.push({
        date:p.date||'',
        kind:'payment',
        ref:inv.number||'',
        invoiceId:p.invoiceId||'',
        debit:0,
        credit:amt,
        label:(ar()?'دفع':'Paiement')+(inv.number?(' · '+inv.number):'')
      });
    });
    lines.sort(function(a,b){
      var c=(a.date||'').localeCompare(b.date||'');
      if(c) return c;
      var rank={invoice:0,avoir:1,payment:2};
      return (rank[a.kind]||9)-(rank[b.kind]||9);
    });
    var bal=0;
    for(i=0;i<lines.length;i++){
      bal+=lines[i].debit-lines[i].credit;
      lines[i].balance=bal;
    }
    return lines;
  };

  window.statementOpening=function(clientId, from){
    if(!from) return 0;
    var L=buildStatementLines(clientId, '1970-01-01', '9999-12-31');
    var bal=0, i;
    for(i=0;i<L.length;i++){
      if((L[i].date||'')>=from) break;
      bal=L[i].balance;
    }
    return bal;
  };

  function stmtFrom(){
    var el=document.getElementById('stmt-from');
    return (el&&el.value)|| (today().slice(0,4)+'-01-01');
  }
  function stmtTo(){
    var el=document.getElementById('stmt-to');
    return (el&&el.value)||today();
  }
  function stmtClient(){
    var el=document.getElementById('stmt-client');
    return (el&&el.value)||state.statementClientId||'';
  }

  window.openClientStatement=function(clientId){
    state.statementClientId=clientId||'';
    navigate('statement');
  };

  function statementPaper(clientId, from, to){
    var c=getClient(clientId);
    var co=state.company||{};
    var lines=buildStatementLines(clientId, from, to);
    var opening=window.statementOpening(clientId, from);
    var debit=lines.reduce(function(s,l){return s+l.debit;},0);
    var credit=lines.reduce(function(s,l){return s+l.credit;},0);
    var closing=opening+debit-credit;
    var rows=lines.map(function(l){
      return '<tr>'+
        '<td class="p-2 ltr-code">'+esc(l.date)+'</td>'+
        '<td class="p-2">'+esc(l.label)+'</td>'+
        '<td class="p-2 text-end num">'+(l.debit?formatMoney(l.debit):'—')+'</td>'+
        '<td class="p-2 text-end num">'+(l.credit?formatMoney(l.credit):'—')+'</td>'+
        '<td class="p-2 text-end num font-medium">'+formatMoney(l.balance+opening)+'</td>'+
      '</tr>';
    }).join('');
    return '<div class="bg-white text-slate-900 p-6 sm:p-8 max-w-3xl mx-auto" id="stmt-paper" dir="ltr">'+
      '<div class="flex justify-between gap-4 mb-6">'+
        '<div>'+
          (co.logo&&typeof safeLogo==='function'&&safeLogo(co.logo)
            ? '<img src="'+safeLogo(co.logo)+'" alt="" class="h-12 mb-2"/>' : '')+
          '<p class="font-bold">'+esc(co.name||'')+'</p>'+
          '<p class="text-xs whitespace-pre-line">'+esc(co.address||'')+'</p>'+
          (co.nif?'<p class="text-xs ltr-code">NIF '+esc(co.nif)+'</p>':'')+
        '</div>'+
        '<div class="text-end">'+
          '<p class="text-xs uppercase tracking-wide text-slate-500">'+esc(t('stmt.doc'))+'</p>'+
          '<p class="font-bold text-lg">'+esc(c.name||'')+'</p>'+
          (c.nif?'<p class="text-xs ltr-code">NIF '+esc(c.nif)+'</p>':'')+
          '<p class="text-xs mt-2">'+esc(from)+' → '+esc(to)+'</p>'+
        '</div>'+
      '</div>'+
      '<table class="w-full text-sm">'+
        '<thead><tr class="border-b text-slate-500">'+
          '<th class="p-2 text-start">'+esc(t('stmt.date'))+'</th>'+
          '<th class="p-2 text-start">'+esc(t('stmt.libelle'))+'</th>'+
          '<th class="p-2 text-end">'+esc(t('stmt.debit'))+'</th>'+
          '<th class="p-2 text-end">'+esc(t('stmt.credit'))+'</th>'+
          '<th class="p-2 text-end">'+esc(t('stmt.solde'))+'</th>'+
        '</tr></thead>'+
        '<tbody>'+
          '<tr class="border-b">'+
            '<td class="p-2 ltr-code">'+esc(from)+'</td>'+
            '<td class="p-2">'+esc(t('stmt.opening'))+'</td>'+
            '<td class="p-2"></td><td class="p-2"></td>'+
            '<td class="p-2 text-end num font-medium">'+formatMoney(opening)+'</td>'+
          '</tr>'+
          (rows||'<tr><td colspan="5" class="p-4 text-center text-slate-400">'+esc(t('stmt.empty'))+'</td></tr>')+
        '</tbody>'+
        '<tfoot><tr class="border-t font-bold">'+
          '<td class="p-2" colspan="2">'+esc(t('stmt.closing'))+'</td>'+
          '<td class="p-2 text-end num">'+formatMoney(debit)+'</td>'+
          '<td class="p-2 text-end num">'+formatMoney(credit)+'</td>'+
          '<td class="p-2 text-end num">'+formatMoney(closing)+'</td>'+
        '</tr></tfoot>'+
      '</table>'+
      '<p class="text-xs text-slate-500 mt-6">'+esc(t('stmt.footnote'))+'</p>'+
    '</div>';
  }

  window.renderStatement=function(){
    var clients=state.clients||[];
    var cid=state.statementClientId||(clients[0]&&clients[0].id)||'';
    if(cid && !clients.some(function(c){return c.id===cid;})) cid=clients[0]&&clients[0].id||'';
    state.statementClientId=cid;
    var from=state.statementFrom||(today().slice(0,4)+'-01-01');
    var to=state.statementTo||today();
    var body=cid?statementPaper(cid, from, to)
      :'<p class="text-slate-500">'+esc(t('stmt.pick'))+'</p>';
    return '<div class="flex flex-col sm:flex-row sm:flex-wrap justify-between gap-3 mb-5">'+
      '<div class="flex flex-wrap gap-2 items-end">'+
        '<div><label class="form-label" for="stmt-client">'+esc(t('inv.client'))+'</label>'+
          '<select id="stmt-client" class="form-select min-w-[12rem]" onchange="state.statementClientId=this.value;renderPage()">'+
            '<option value="">'+esc(t('inv.choose'))+'</option>'+
            clients.map(function(c){
              return '<option value="'+esc(c.id)+'"'+(c.id===cid?' selected':'')+'>'+esc(c.name)+'</option>';
            }).join('')+
          '</select></div>'+
        '<div><label class="form-label" for="stmt-from">'+esc(t('stmt.from'))+'</label>'+
          '<input type="date" id="stmt-from" class="form-input" value="'+esc(from)+'" onchange="state.statementFrom=this.value;renderPage()"/></div>'+
        '<div><label class="form-label" for="stmt-to">'+esc(t('stmt.to'))+'</label>'+
          '<input type="date" id="stmt-to" class="form-input" value="'+esc(to)+'" onchange="state.statementTo=this.value;renderPage()"/></div>'+
      '</div>'+
      (cid
        ? '<div class="flex gap-2">'+
            '<button type="button" class="btn-secondary" onclick="printStatement()">'+
              '<i data-lucide="printer" class="w-4 h-4"></i> '+esc(t('actions.print'))+'</button>'+
            '<button type="button" class="btn-primary" onclick="pdfStatement()">'+
              '<i data-lucide="download" class="w-4 h-4"></i> PDF</button>'+
          '</div>'
        : '')+
      '</div>'+body;
  };

  window.printStatement=function(){
    var cid=state.statementClientId;
    if(!cid) return;
    previewStatement();
    setTimeout(function(){ window.print(); }, 50);
  };
  window.pdfStatement=function(){
    var cid=state.statementClientId;
    if(!cid) return;
    previewStatement();
    setTimeout(function(){ if(typeof downloadPdf==='function') downloadPdf(); }, 80);
  };
  function previewStatement(){
    var cid=state.statementClientId;
    var from=state.statementFrom||(today().slice(0,4)+'-01-01');
    var to=state.statementTo||today();
    var root=document.getElementById('preview-root');
    var body=document.getElementById('preview-body');
    if(!root||!body||!cid) return;
    window._previewInvId=null;
    body.innerHTML=statementPaper(cid, from, to);
    root.classList.remove('hidden');
    var av=document.getElementById('btn-avoir');
    if(av) av.classList.add('hidden');
    try{ lucide.createIcons(); }catch(e){}
  }

  /* ---------------------------------------------------------------- *
   * Recurring invoices
   * ---------------------------------------------------------------- */

  function ensureRec(){
    if(!Array.isArray(state.recurrences)) state.recurrences=[];
  }

  function nextAfter(dateStr, freq){
    if(freq==='quarter') return addMonths(dateStr, 3);
    if(freq==='year') return addMonths(dateStr, 12);
    return addMonths(dateStr, 1);
  }

  function issueOne(rec, onDate){
    var client=(state.clients||[]).find(function(c){return c.id===rec.clientId;});
    if(!client) return null;
    var items=JSON.parse(JSON.stringify(rec.items||[])).filter(function(it){
      return it && (it.description||'').trim();
    });
    if(!items.length) return null;
    var year=parseInt((onDate||today()).slice(0,4),10)||new Date().getFullYear();
    var n=state.nextInvoiceNumber||1, number;
    do{
      number='FAC-'+year+'-'+String(n).padStart(3,'0');
      n++;
    }while((state.invoices||[]).some(function(i){return i.number===number;}));
    state.nextInvoiceNumber=n;
    var due=addMonths(onDate, 1);
    var inv={
      id:uid(),
      number:number,
      clientId:rec.clientId,
      date:onDate,
      dueDate:due,
      status:'brouillon',
      paymentMode:rec.paymentMode||'virement',
      template:rec.template||'classique',
      items:items,
      fraisPort:Number(rec.fraisPort)||0,
      notes:(rec.notes?rec.notes+'\n':'')+t('rec.autoNote'),
      recurrenceId:rec.id
    };
    state.invoices.push(inv);
    rec.lastInvoiceId=inv.id;
    rec.lastDate=onDate;
    if(typeof markStockNew==='function') markStockNew(inv);
    return inv;
  }

  window.generateDueRecurring=function(){
    ensureRec();
    var now=today(), made=0, i, rec, guard;
    for(i=0;i<state.recurrences.length;i++){
      rec=state.recurrences[i];
      if(!rec || rec.active===false) continue;
      if(!rec.nextDate) rec.nextDate=now;
      guard=0;
      while(rec.nextDate<=now && guard<3){
        if(!issueOne(rec, rec.nextDate)) break;
        rec.nextDate=nextAfter(rec.nextDate, rec.freq||'month');
        made++;
        guard++;
      }
    }
    if(made) saveData();
    return made;
  };

  window.renderRecurring=function(){
    ensureRec();
    var list=state.recurrences;
    var rows=list.map(function(r){
      var c=getClient(r.clientId);
      var freq=t('rec.freq.'+(r.freq||'month'));
      return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
        '<td class="p-3 font-medium">'+esc(c.name||'—')+'</td>'+
        '<td class="p-3">'+(r.items&&r.items[0]?esc(r.items[0].description):'—')+
          ((r.items&&r.items.length>1)?' +'+(r.items.length-1):'')+'</td>'+
        '<td class="p-3">'+esc(freq)+'</td>'+
        '<td class="p-3 ltr-code">'+esc(r.nextDate||'')+'</td>'+
        '<td class="p-3">'+(r.active===false
          ? '<span class="text-slate-500">'+esc(t('rec.paused'))+'</span>'
          : '<span class="text-emerald-700 dark:text-emerald-400">'+esc(t('rec.active'))+'</span>')+'</td>'+
        '<td class="p-3 text-end whitespace-nowrap">'+
          '<button type="button" class="btn-ghost p-2" onclick="runRecurrenceNow(\''+r.id+'\')" aria-label="'+esc(t('rec.runNow'))+'">'+
            '<i data-lucide="play" class="w-4 h-4"></i></button>'+
          '<button type="button" class="btn-ghost p-2" onclick="toggleRecurrence(\''+r.id+'\')" aria-label="'+esc(t('rec.pause'))+'">'+
            '<i data-lucide="'+(r.active===false?'play-circle':'pause')+'" class="w-4 h-4"></i></button>'+
          '<button type="button" class="btn-ghost p-2 text-red-500" onclick="deleteRecurrence(\''+r.id+'\')" aria-label="'+esc(t('actions.delete'))+'">'+
            '<i data-lucide="trash-2" class="w-4 h-4"></i></button>'+
        '</td></tr>';
    }).join('');
    return '<div class="flex flex-col sm:flex-row justify-between gap-3 mb-5">'+
      '<p class="text-slate-500 text-sm">'+esc(t('rec.hint'))+'</p>'+
      '<button type="button" class="btn-primary" onclick="openRecurrenceModal()">'+
        '<i data-lucide="repeat" class="w-4 h-4"></i> '+esc(t('rec.add'))+'</button></div>'+
      (list.length
        ? '<div class="card overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
            '<th class="p-3">'+esc(t('inv.client'))+'</th>'+
            '<th class="p-3">'+esc(t('inv.desc'))+'</th>'+
            '<th class="p-3">'+esc(t('rec.period'))+'</th>'+
            '<th class="p-3">'+esc(t('rec.next'))+'</th>'+
            '<th class="p-3">'+esc(t('inv.status'))+'</th>'+
            '<th class="p-3"></th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        : '<div class="card p-8 text-center text-slate-500">'+
            '<p class="font-medium text-slate-700 dark:text-slate-200">'+esc(t('rec.empty'))+'</p>'+
            '<p class="text-sm mt-1">'+esc(t('rec.emptyHint'))+'</p></div>');
  };

  window.openRecurrenceModal=function(fromInvoiceId){
    ensureRec();
    var inv=fromInvoiceId&&(state.invoices||[]).find(function(i){return i.id===fromInvoiceId;});
    var clientId=inv?inv.clientId:'';
    var next=today();
    openModal('<div class="modal" onclick="event.stopPropagation()">'+
      '<div class="modal-header"><h3 class="font-semibold">'+esc(t('rec.add'))+'</h3>'+
        '<button type="button" onclick="closeModal()" class="btn-ghost p-2" aria-label="'+esc(t('ui.close'))+'">'+
          '<i data-lucide="x" class="w-5 h-5"></i></button></div>'+
      '<div class="modal-body space-y-3">'+
        '<div><label class="form-label" for="rec-client">'+esc(t('inv.clientReq'))+'</label>'+
          '<select id="rec-client" class="form-select" '+(inv?'disabled':'')+'>'+
            '<option value="">'+esc(t('inv.choose'))+'</option>'+
            (state.clients||[]).map(function(c){
              return '<option value="'+esc(c.id)+'"'+(c.id===clientId?' selected':'')+'>'+esc(c.name)+'</option>';
            }).join('')+
          '</select></div>'+
        '<div class="grid grid-cols-2 gap-3">'+
          '<div><label class="form-label" for="rec-freq">'+esc(t('rec.period'))+'</label>'+
            '<select id="rec-freq" class="form-select">'+
              '<option value="month">'+esc(t('rec.freq.month'))+'</option>'+
              '<option value="quarter">'+esc(t('rec.freq.quarter'))+'</option>'+
              '<option value="year">'+esc(t('rec.freq.year'))+'</option>'+
            '</select></div>'+
          '<div><label class="form-label" for="rec-next">'+esc(t('rec.next'))+'</label>'+
            '<input type="date" id="rec-next" class="form-input" value="'+esc(next)+'"/></div>'+
        '</div>'+
        (inv
          ? '<p class="text-xs text-slate-500">'+esc(t('rec.fromInv').replace('{n}', inv.number||''))+'</p>'
          : '<p class="text-xs text-slate-500">'+esc(t('rec.needInv'))+'</p>')+
      '</div>'+
      '<div class="modal-footer">'+
        '<button type="button" class="btn-secondary" onclick="closeModal()">'+esc(t('actions.back'))+'</button>'+
        '<button type="button" class="btn-primary" onclick="saveRecurrence(\''+(fromInvoiceId||'')+'\')">'+esc(t('actions.save'))+'</button>'+
      '</div></div>');
    try{ lucide.createIcons(); }catch(e){}
  };

  window.saveRecurrence=function(fromInvoiceId){
    ensureRec();
    var inv=fromInvoiceId&&(state.invoices||[]).find(function(i){return i.id===fromInvoiceId;});
    var clientId=(document.getElementById('rec-client')||{}).value||(inv&&inv.clientId)||'';
    if(!clientId) return toast(t('toast.pickClient'),'err');
    var items;
    if(inv){
      items=JSON.parse(JSON.stringify(inv.items||[]));
    }else{
      /* Without a source invoice there is nothing to repeat. The merchant
         creates the first one, then makes it recurring. */
      return toast(t('rec.needInv'),'err');
    }
    if(!items.length) return toast(t('toast.addLine'),'err');
    var rec={
      id:uid(),
      clientId:clientId,
      items:items,
      paymentMode:inv.paymentMode||'virement',
      template:inv.template||'classique',
      notes:inv.notes||'',
      fraisPort:Number(inv.fraisPort)||0,
      freq:(document.getElementById('rec-freq')||{}).value||'month',
      nextDate:(document.getElementById('rec-next')||{}).value||today(),
      active:true
    };
    state.recurrences.push(rec);
    saveData();
    closeModal();
    toast(t('rec.saved'));
    navigate('recurring');
  };

  window.toggleRecurrence=function(id){
    ensureRec();
    var r=state.recurrences.find(function(x){return x.id===id;});
    if(!r) return;
    r.active=r.active===false;
    saveData(); renderPage();
  };
  window.deleteRecurrence=function(id){
    if(!confirm(t('rec.confirmDelete'))) return;
    ensureRec();
    state.recurrences=state.recurrences.filter(function(x){return x.id!==id;});
    saveData(); toast(t('toast.saved')); renderPage();
  };
  window.runRecurrenceNow=function(id){
    ensureRec();
    var r=state.recurrences.find(function(x){return x.id===id;});
    if(!r) return;
    var inv=issueOne(r, today());
    if(!inv) return toast(t('toast.pickClient'),'err');
    r.nextDate=nextAfter(today(), r.freq||'month');
    saveData();
    toast(t('rec.issued').replace('{n}', inv.number));
    navigate('invoices');
  };

  /* ---------------------------------------------------------------- *
   * Wiring — wrap, never replace wholesale. extra.js owns renderPage for
   * products/devis/payments; depenses.js owns expenses; we take statement
   * and recurring the same way, and fall through otherwise.
   * ---------------------------------------------------------------- */

  var _render=window.renderPage;
  window.renderPage=function(){
    var c=document.getElementById('main-content');
    if(c && state.currentPage==='statement'){
      c.innerHTML=renderStatement();
      try{ lucide.createIcons(); }catch(e){}
      return;
    }
    if(c && state.currentPage==='recurring'){
      c.innerHTML=renderRecurring();
      try{ lucide.createIcons(); }catch(e){}
      return;
    }
    if(typeof _render==='function') _render();
  };

  var _load=window.loadData;
  window.loadData=function(){
    if(typeof _load==='function') _load();
    ensureRec();
    try{ generateDueRecurring(); }catch(e){}
  };

  var _open=window.openNewInvoice;
  if(typeof _open==='function'){
    window.openNewInvoice=function(editId){
      _open.apply(this, arguments);
      if(!editId) return;
      var foot=document.querySelector('#modal-root .modal-footer');
      if(!foot) return;
      var b=document.createElement('button');
      b.type='button';
      b.className='btn-secondary';
      b.textContent=t('rec.make');
      b.addEventListener('click', function(){
        closeModal();
        openRecurrenceModal(editId);
      });
      foot.insertBefore(b, foot.firstChild);
    };
  }

  var _clients=window.renderClients;
  if(typeof _clients==='function'){
    window.renderClients=function(){
      var html=_clients.apply(this, arguments);
      return html.replace(
        'onclick="openClientModal()"',
        'onclick="navigate(\'statement\')" class="btn-secondary"><i data-lucide="scroll-text" class="w-4 h-4"></i> '+
          esc(t('stmt.short'))+'</button><button onclick="openClientModal()"'
      );
    };
  }
})();