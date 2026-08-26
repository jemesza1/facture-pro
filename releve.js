/* FacturePro — relevé de compte client.

   Créances lists who owes what, as a total. A merchant who has to show a
   client the trail — every invoice, every avoir, every payment, running
   balance — had nowhere to send them. This is that document.

   Drafts, cancelled invoices and delivery notes stay out: they never entered
   the books. An avoir is a credit because calcInvoiceTotals already negated
   it; a payment is a credit because money came in. Status "payée" without a
   payment row does not extinguish the line — the payment is what the statement
   is for. */
(function(){
  function ensure(){
    if(!state.releveClientId) state.releveClientId='';
  }

  window.clientLedger=function(clientId, from, to){
    var lines=[], i, inv, tot, p, owner;
    (state.invoices||[]).forEach(function(inv){
      if(inv.clientId!==clientId) return;
      if(inv.status==='brouillon'||inv.status==='annulee') return;
      if(typeof isBl==='function' && isBl(inv)) return;
      tot=calcInvoiceTotals(inv);
      lines.push({
        date:inv.date||'',
        ref:inv.number||'',
        kind: (typeof isAvoir==='function' && isAvoir(inv)) ? 'avoir' : 'invoice',
        label: (typeof isAvoir==='function' && isAvoir(inv)) ? t('avoir.badge') : t('releve.invoice'),
        debit: tot.net>0 ? tot.net : 0,
        credit: tot.net<0 ? -tot.net : 0,
        id:inv.id
      });
    });
    (state.payments||[]).forEach(function(p){
      inv=(state.invoices||[]).find(function(x){return x.id===p.invoiceId;})||{};
      owner=p.clientId||inv.clientId;
      if(owner!==clientId) return;
      lines.push({
        date:p.date||'',
        ref:inv.number||'',
        kind:'payment',
        label:t('releve.payment'),
        debit:0,
        credit:Number(p.amount)||0,
        id:p.id
      });
    });
    if(from) lines=lines.filter(function(l){return (l.date||'')>=from;});
    if(to) lines=lines.filter(function(l){return (l.date||'')<=to;});
    lines.sort(function(a,b){
      var d=(a.date||'').localeCompare(b.date||'');
      return d!==0 ? d : (a.ref||'').localeCompare(b.ref||'');
    });
    var bal=0;
    for(i=0;i<lines.length;i++){
      bal+=lines[i].debit-lines[i].credit;
      lines[i].balance=bal;
    }
    return {lines:lines, balance:bal};
  };

  window.openReleve=function(clientId){
    state.releveClientId=clientId||'';
    navigate('releve');
  };

  window.renderReleve=function(){
    ensure();
    var clientId=state.releveClientId||'';
    var cl=clientId ? getClient(clientId) : null;
    if(clientId && (!cl || cl.name==='Client inconnu') && !(state.clients||[]).some(function(c){return c.id===clientId;})){
      cl=null; clientId=''; state.releveClientId='';
    }
    var from=(document.getElementById('rel-from')||{}).value||'';
    var to=(document.getElementById('rel-to')||{}).value||'';
    var led=clientId ? clientLedger(clientId, from, to) : {lines:[], balance:0};
    var due=led.balance>0;
    var picker='<div class="mb-4"><label class="form-label" for="rel-client">'+esc(t('inv.client'))+'</label>'+
      '<select id="rel-client" class="form-select max-w-md" onchange="openReleve(this.value)">'+
      '<option value="">'+esc(t('releve.pick'))+'</option>'+
      (state.clients||[]).map(function(c){
        return '<option value="'+esc(c.id)+'" '+(c.id===clientId?'selected':'')+'>'+esc(c.name)+'</option>';
      }).join('')+'</select></div>';

    if(!clientId){
      return '<div class="mb-5"><h3 class="font-semibold text-lg">'+esc(t('releve.title'))+'</h3></div>'+
        picker+
        '<div class="empty-state"><p class="font-medium">'+esc(t('releve.pick'))+'</p></div>';
    }

    var rows=led.lines.map(function(l){
      return '<tr class="border-b border-slate-100 dark:border-slate-800">'+
        '<td class="p-3 whitespace-nowrap">'+dateUI(l.date)+'</td>'+
        '<td class="p-3 ltr-code">'+esc(l.ref||'\u2014')+'</td>'+
        '<td class="p-3">'+esc(l.label)+'</td>'+
        '<td class="p-3 text-end">'+(l.debit?moneyUI(l.debit):'\u2014')+'</td>'+
        '<td class="p-3 text-end">'+(l.credit?moneyUI(l.credit):'\u2014')+'</td>'+
        '<td class="p-3 text-end font-semibold">'+moneyUI(l.balance)+'</td></tr>';
    }).join('');

    var paper=renderRelevePaper(cl, led);

    return '<div class="flex flex-col sm:flex-row justify-between gap-3 mb-4">'+
      '<div><h3 class="font-semibold text-lg">'+esc(t('releve.title'))+'</h3>'+
        '<p class="text-sm text-slate-500">'+esc(cl.name||'')+'</p></div>'+
      '<div class="flex gap-2">'+
        '<button type="button" onclick="downloadRelevePdf()" class="btn-primary" '+(led.lines.length?'':'disabled')+'>'+
          '<i data-lucide="download" class="w-4 h-4"></i> PDF</button></div></div>'+
      picker+
      '<div class="flex flex-wrap gap-3 mb-4">'+
        '<div><label class="form-label" for="rel-from">'+esc(t('releve.period'))+'</label>'+
          '<input type="date" id="rel-from" class="form-input" value="'+esc(from)+'" onchange="renderPage()"/></div>'+
        '<div><label class="form-label" for="rel-to">&nbsp;</label>'+
          '<input type="date" id="rel-to" class="form-input" value="'+esc(to)+'" onchange="renderPage()"/></div>'+
      '</div>'+
      '<div class="stat-card mb-4">'+
        '<p class="text-sm text-slate-500">'+(due?t('releve.due'):t('releve.creditBal'))+'</p>'+
        '<p class="text-xl font-bold mt-1 '+(due?'text-red-600':'text-emerald-600')+'">'+moneyUI(Math.abs(led.balance))+'</p>'+
        '<p class="text-xs text-slate-500 mt-2 leading-relaxed">'+esc(t('releve.hint'))+'</p></div>'+
      (led.lines.length
        ? '<div class="card overflow-x-auto mb-5"><table class="w-full text-sm"><thead><tr class="text-start text-slate-500 border-b border-slate-200 dark:border-slate-700">'+
          '<th class="p-3">'+esc(t('releve.date'))+'</th><th class="p-3">'+esc(t('releve.ref'))+'</th>'+
          '<th class="p-3">'+esc(t('releve.label'))+'</th>'+
          '<th class="p-3 text-end">'+esc(t('releve.debit'))+'</th>'+
          '<th class="p-3 text-end">'+esc(t('releve.credit'))+'</th>'+
          '<th class="p-3 text-end">'+esc(t('releve.balance'))+'</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        : '<div class="empty-state mb-5"><p class="font-medium">'+esc(t('releve.empty'))+'</p>'+
          '<p class="text-sm text-slate-500 mt-1">'+esc(t('releve.emptyHint'))+'</p></div>')+
      paper;
  };

  function renderRelevePaper(cl, led){
    var co=typeof escObj==='function'?escObj(state.company):state.company;
    var rows=led.lines.map(function(l,i){
      return '<tr style="background:'+(i%2?'#f8fafc':'#fff')+'">'+
        '<td style="padding:8px 10px;font-size:11px;border-bottom:1px solid #eef2f7">'+esc(formatDate(l.date))+'</td>'+
        '<td style="padding:8px 10px;font-size:11px;border-bottom:1px solid #eef2f7">'+esc(l.ref||'—')+'</td>'+
        '<td style="padding:8px 10px;font-size:11px;border-bottom:1px solid #eef2f7">'+esc(l.label)+'</td>'+
        '<td style="padding:8px 10px;font-size:11px;text-align:right;border-bottom:1px solid #eef2f7">'+(l.debit?formatMoney(l.debit):'—')+'</td>'+
        '<td style="padding:8px 10px;font-size:11px;text-align:right;border-bottom:1px solid #eef2f7">'+(l.credit?formatMoney(l.credit):'—')+'</td>'+
        '<td style="padding:8px 10px;font-size:11px;text-align:right;font-weight:700;border-bottom:1px solid #eef2f7">'+formatMoney(l.balance)+'</td></tr>';
    }).join('');
    var due=led.balance>0;
    return '<div class="invoice-paper" id="releve-paper" style="padding:28px 32px;font-family:Inter,Arial,sans-serif;color:#0f172a;background:#fff">'+
      '<div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:18px">'+
        '<div><div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#006233;font-weight:700">'+esc(t('releve.title'))+'</div>'+
          '<div style="font-size:18px;font-weight:800;margin-top:4px">'+esc(co.name||'')+'</div>'+
          (typeof legalLines==='function'? '<div style="font-size:10px;color:#64748b;margin-top:4px">'+legalLines(co,false)+'</div>':'')+
        '</div>'+
        '<div style="text-align:right;font-size:11px;color:#475569">'+
          '<div>'+esc(cl.name||'')+'</div>'+
          (cl.nif?'<div>NIF '+esc(cl.nif)+'</div>':'')+
          (cl.rc?'<div>RC '+esc(cl.rc)+'</div>':'')+
        '</div></div>'+
      '<table style="width:100%;border-collapse:collapse">'+
        '<thead><tr style="background:#006233;color:#fff">'+
          '<th style="padding:8px 10px;text-align:left;font-size:10px">'+esc(t('releve.date'))+'</th>'+
          '<th style="padding:8px 10px;text-align:left;font-size:10px">'+esc(t('releve.ref'))+'</th>'+
          '<th style="padding:8px 10px;text-align:left;font-size:10px">'+esc(t('releve.label'))+'</th>'+
          '<th style="padding:8px 10px;text-align:right;font-size:10px">'+esc(t('releve.debit'))+'</th>'+
          '<th style="padding:8px 10px;text-align:right;font-size:10px">'+esc(t('releve.credit'))+'</th>'+
          '<th style="padding:8px 10px;text-align:right;font-size:10px">'+esc(t('releve.balance'))+'</th>'+
        '</tr></thead><tbody>'+(rows||'<tr><td colspan="6" style="padding:16px;text-align:center;color:#94a3b8">'+esc(t('releve.empty'))+'</td></tr>')+'</tbody></table>'+
      '<div style="margin-top:16px;display:flex;justify-content:flex-end">'+
        '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;min-width:220px">'+
          '<div style="font-size:10px;color:#64748b">'+(due?t('releve.due'):t('releve.creditBal'))+'</div>'+
          '<div style="font-size:18px;font-weight:800;color:'+(due?'#dc2626':'#059669')+'">'+formatMoney(Math.abs(led.balance))+'</div>'+
        '</div></div>'+
      '<p style="margin-top:14px;font-size:10px;color:#94a3b8">'+esc(t('releve.hint'))+'</p></div>';
  }

  window.downloadRelevePdf=async function(){
    var paper=document.getElementById('releve-paper');
    if(!paper) return;
    try{
      var canvas=await html2canvas(paper,{scale:2,backgroundColor:'#ffffff',useCORS:true});
      var img=canvas.toDataURL('image/jpeg',0.92);
      var jsPDF=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;
      var pdf=new jsPDF('p','mm','a4');
      var PW=210, PH=297;
      var imgH=canvas.height*PW/canvas.width;
      if(imgH<=PH){ pdf.addImage(img,'JPEG',0,0,PW,imgH); }
      else {
        var pos=0, left=imgH;
        pdf.addImage(img,'JPEG',0,0,PW,imgH);
        left-=PH;
        while(left>0){ pos-=PH; pdf.addPage(); pdf.addImage(img,'JPEG',0,pos,PW,imgH); left-=PH; }
      }
      var cl=getClient(state.releveClientId)||{};
      pdf.save('releve-'+(cl.name||'client').replace(/[^\w]+/g,'_').slice(0,40)+'.pdf');
      toast(t('toast.exportOk'));
    }catch(e){
      toast('PDF : '+(e&&e.message?e.message:'erreur'),'err');
    }
  };

  var _render=window.renderPage;
  window.renderPage=function(){
    if(state.currentPage==='releve'){
      var c=document.getElementById('main-content');
      if(!c){ if(typeof _render==='function') return _render.apply(this,arguments); return; }
      try{if(typeof updateOverdue==='function')updateOverdue();}catch(e){}
      c.innerHTML=renderReleve();
      try{lucide.createIcons();}catch(e){}
      try{if(typeof paintBackupNotice==='function')paintBackupNotice();}catch(e){}
      return;
    }
    if(typeof _render==='function') return _render.apply(this,arguments);
  };

  var _clients=window.renderClients;
  window.renderClients=function(){
    var html=typeof _clients==='function'?_clients():'';
    html=html.replace(/onclick="openClientModal\('([^']+)'\)" class="btn-ghost p-2"/g,
      function(_, id){
        return 'onclick="openReleve(\''+id+'\')" class="btn-ghost p-2" aria-label="'+esc(t('releve.open'))+'" title="'+esc(t('releve.open'))+'">'+
          '<i data-lucide="file-text" class="w-4 h-4"></i></button>'+
          '<button onclick="openClientModal(\''+id+'\')" class="btn-ghost p-2"';
      });
    return html;
  };
})();
