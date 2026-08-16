const STORAGE_KEY='facturepro_dz_v24';
const defaultCompany={name:'Mon Entreprise SARL',address:'12 Rue Didouche Mourad\n16000 Alger',nif:'000000000000000',nin:'',nis:'000000000000000',rc:'16/00-0000000B00',ai:'0000',email:'contact@monentreprise.dz',phone:'+213 21 00 00 00',rib:'007 99999 0000000000 00',banque:'BNA',logo:'',timbreCap:0};
const STATUS={brouillon:{label:'Brouillon',class:'badge-brouillon'},envoyee:{label:'Envoyée',class:'badge-envoyee'},payee:{label:'Payée',class:'badge-payee'},enretard:{label:'En retard',class:'badge-enretard'},annulee:{label:'Annulée',class:'badge-annulee'}};
const TEMPLATES=[{id:'classique',name:'Classique',desc:'Sobre et traditionnel',color:'#0f172a',bg:'#f1f5f9',layout:'classic'},{id:'moderne',name:'Moderne',desc:'Bandeau coloré élégant',color:'#0284c7',bg:'#e0f2fe',layout:'modern'},{id:'minimal',name:'Minimal',desc:'Épuré',color:'#334155',bg:'#f8fafc',layout:'classic'},{id:'premium',name:'Premium',desc:'Header sombre',color:'#0f172a',bg:'#1e293b',layout:'premium'},{id:'corporate',name:'Corporate',desc:'Bleu entreprise',color:'#1e40af',bg:'#dbeafe',layout:'modern'},{id:'elegant',name:'Élégant',desc:'Beige raffiné',color:'#78716c',bg:'#f5f5f4',layout:'classic'},{id:'crea',name:'Créatif',desc:'Violet moderne',color:'#7c3aed',bg:'#ede9fe',layout:'modern'},{id:'nature',name:'Nature',desc:'Vert pro',color:'#059669',bg:'#d1fae5',layout:'modern'},{id:'sunset',name:'Sunset',desc:'Orange énergique',color:'#ea580c',bg:'#ffedd5',layout:'modern'},{id:'ocean',name:'Océan',desc:'Turquoise',color:'#0891b2',bg:'#cffafe',layout:'modern'},{id:'noir',name:'Noir & Blanc',desc:'Monochrome',color:'#171717',bg:'#f5f5f5',layout:'classic'},{id:'rose',name:'Rose Soft',desc:'Rose doux',color:'#db2777',bg:'#fce7f3',layout:'modern'},{id:'indigo',name:'Indigo',desc:'Indigo profond',color:'#4338ca',bg:'#e0e7ff',layout:'modern'},{id:'slate',name:'Slate Pro',desc:'Gris ardoise',color:'#475569',bg:'#f1f5f9',layout:'classic'},{id:'gold',name:'Gold',desc:'Or premium',color:'#a16207',bg:'#fef9c3',layout:'premium'},{id:'forest',name:'Forêt',desc:'Vert forêt',color:'#166534',bg:'#dcfce7',layout:'modern'},{id:'sky',name:'Ciel',desc:'Bleu ciel',color:'#0284c7',bg:'#f0f9ff',layout:'modern'},{id:'coral',name:'Corail',desc:'Corail',color:'#e11d48',bg:'#ffe4e6',layout:'modern'},{id:'mint',name:'Menthe',desc:'Menthe',color:'#0d9488',bg:'#ccfbf1',layout:'modern'},{id:'lavender',name:'Lavande',desc:'Lavande',color:'#8b5cf6',bg:'#f5f3ff',layout:'modern'},{id:'charcoal',name:'Charcoal',desc:'Charbon',color:'#1c1917',bg:'#fafaf9',layout:'premium'},{id:'navy',name:'Navy',desc:'Marine',color:'#1e3a8a',bg:'#eff6ff',layout:'modern'},{id:'emerald',name:'Émeraude',desc:'Émeraude',color:'#047857',bg:'#ecfdf5',layout:'modern'},{id:'amber',name:'Ambre',desc:'Ambre',color:'#d97706',bg:'#fffbeb',layout:'modern'},{id:'studio',name:'Studio',desc:'Bandeau dégradé ciel',color:'#0ea5e9',color2:'#0369a1',bg:'#e0f2fe',layout:'studio'},{id:'onyx',name:'Onyx',desc:'Dégradé graphite',color:'#334155',color2:'#0f172a',bg:'#f1f5f9',layout:'studio'},{id:'royal',name:'Royal',desc:'Dégradé indigo',color:'#6366f1',color2:'#4338ca',bg:'#e0e7ff',layout:'studio'},{id:'carmin',name:'Carmin',desc:'Dégradé carmin',color:'#f43f5e',color2:'#be123c',bg:'#ffe4e6',layout:'studio'},{id:'algerie',name:'Algérie',desc:'Bandeau vert officiel',color:'#006233',color2:'#059669',bg:'#d1fae5',layout:'dz'}];
let state={company:{...defaultCompany},clients:[],invoices:[],nextInvoiceNumber:1,currentPage:'dashboard',dark:false,search:'',statusFilter:'all',sidebarOpen:false};
/* A parse failure used to be swallowed, and seedDemoData() then wrote demo
   invoices over the user's own key — destroying the last recoverable copy.
   Now the unreadable text is put aside under a rescue key and nothing is
   seeded, so the data can still be recovered by hand. */
var loadFailed=false;
function loadData(){var raw=null;try{raw=localStorage.getItem(STORAGE_KEY);if(raw){const d=JSON.parse(raw);if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('shape');state={...state,...d};}}catch(e){loadFailed=true;try{localStorage.setItem(STORAGE_KEY+'_illisible',raw||'');}catch(e2){}}state.clients=(state.clients||[]).map(function(c){return Object.assign({nin:'',nis:'',rc:'',ai:'',email:'',address:'',nif:'',phone:''},c);});state.invoices=(state.invoices||[]).map(function(i){return Object.assign({paymentMode:'virement'},i);});state.company=Object.assign({},defaultCompany,state.company||{});if(!loadFailed&&!state.clients.length&&!state.invoices.length)seedDemoData();if(loadFailed)setTimeout(function(){try{toast(t('toast.dataUnreadable'),'err');}catch(e){}},900);}
function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify({company:state.company,clients:state.clients,invoices:state.invoices,nextInvoiceNumber:state.nextInvoiceNumber,currentPage:state.currentPage}));}
function seedDemoData(){state.clients=[{demo:true,id:'c1',name:'SARL Atlas Services',email:'contact@atlas.dz',address:'45 Bd Mohamed V\n16000 Alger',nif:'099999999999999',nis:'099888777666555',rc:'16/00-1234567B21',phone:'021 00 00 01'},{demo:true,id:'c2',name:'EURL Sahara Tech',email:'info@sahara.dz',address:'8 Rue de la Liberté\n31000 Oran',nif:'088888888888888',nis:'088777666555444',rc:'31/00-7654321B19',phone:'041 00 00 02'},{demo:true,id:'c3',name:'SPA Numidia Trading',email:'admin@numidia.dz',address:'22 Av de l\'Indépendance\n25000 Constantine',nif:'077777777777777',nis:'077666555444333',rc:'25/00-2468013B20',phone:'031 00 00 03'}];const today=new Date();const d=o=>{const dt=new Date(today);dt.setDate(dt.getDate()+o);return dt.toISOString().slice(0,10);};state.invoices=[{demo:true,id:'inv1',number:'FAC-2026-001',clientId:'c1',template:'moderne',date:d(-25),dueDate:d(-10),status:'enretard',items:[{description:'Audit stratégique Q1',qty:1,unitPrice:250000,tva:19},{description:'Accompagnement (5 jours)',qty:5,unitPrice:45000,tva:19}],notes:'Paiement par virement sous 15 jours.'},{demo:true,id:'inv2',number:'FAC-2026-002',clientId:'c2',template:'premium',date:d(-12),dueDate:d(3),status:'envoyee',items:[{description:'Développement module facturation',qty:1,unitPrice:480000,tva:19}],notes:''},{demo:true,id:'inv3',number:'FAC-2026-003',clientId:'c3',template:'classique',date:d(-5),dueDate:d(25),status:'payee',items:[{description:'Création identité visuelle',qty:1,unitPrice:180000,tva:19}],notes:'Merci.'},{demo:true,id:'inv4',number:'FAC-2026-004',clientId:'c1',template:'nature',date:d(-2),dueDate:d(28),status:'brouillon',items:[{description:'Conseil en organisation',qty:3,unitPrice:55000,tva:19}],notes:''}];state.nextInvoiceNumber=5;saveData();}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ltrCodes(s){return String(s==null?'':s).replace(/(\d{2}-\d{3})/g,'<span class="ltr-code">$1</span>');}
function escObj(o,skip){o=o||{};skip=skip||['logo'];var r={},k;for(k in o){r[k]=(skip.indexOf(k)>-1||typeof o[k]!=='string')?o[k]:esc(o[k]);}return r;}
function uid(){return 'id_'+Math.random().toString(36).slice(2,11);}
function formatMoney(a){return new Intl.NumberFormat('fr-DZ',{style:'currency',currency:'DZD',maximumFractionDigits:0}).format(a||0).replace('DZD','DA');}
function moneyUI(a){var s=new Intl.NumberFormat('fr-DZ',{style:'decimal',maximumFractionDigits:0}).format(a||0);var c=(typeof t==='function')?t('currency'):' DA';return '<bdi>'+s+c+'</bdi>';}
function dateUI(iso){if(!iso)return'\u2014';var L=(typeof locale!=='undefined'&&locale==='ar')?'ar-DZ':'fr-DZ';try{return '<bdi>'+new Date(iso).toLocaleDateString(L,{day:'2-digit',month:'short',year:'numeric'})+'</bdi>';}catch(e){return '<bdi>'+formatDate(iso)+'</bdi>';}}
function formatDate(iso){if(!iso)return'—';return new Date(iso).toLocaleDateString('fr-DZ',{day:'2-digit',month:'short',year:'numeric'});}
/* ---- Droit de timbre (timbre de quittance) ----
   Article 100 du Code du timbre, bareme de la LF 2025. Il n'est du que sur
   les reglements en ESPECES : les virements, versements bancaires ou postaux
   et les paiements par TPE en sont exoneres.
   Taux appliques directement au montant :
       jusqu'a  30 000 DA  ->  1   %
       30 000 a 100 000 DA ->  1,5 %
       au-dela de 100 000  ->  2   %
   Minimum : 5 DA.
   L'article parle de tranches de 100 DA ; sur un montant multiple de 100 les
   deux lectures donnent le meme resultat, et la profession retient le taux
   direct. C'est donc celui-ci qui est applique.
   La base est le montant TTC de la facture, c'est-a-dire la somme
   effectivement encaissee.
   Seul l'ancien plafond de 10 000 DA reste interprete differemment d'un
   service a l'autre : il est donc parametrable (0 = aucun plafond). */
function timbreRate(a){return a<=30000?1:(a<=100000?1.5:2);}
function calcTimbre(amount){
  var a=Math.round(Number(amount)||0);
  if(a<=0)return 0;
  var d=a*timbreRate(a)/100;
  if(d<5)d=5;
  var cap=0;try{cap=Number(state.company&&state.company.timbreCap)||0;}catch(e){}
  if(cap>0&&d>cap)d=cap;
  return Math.round(d*100)/100;
}
function isCash(inv){return !!(inv&&inv.paymentMode==='especes');}
function calcInvoiceTotals(inv){let ht=0,tva=0;(inv.items||[]).forEach(it=>{const l=(it.qty||0)*(it.unitPrice||0);ht+=l;tva+=l*((it.tva||0)/100);});const ttc=ht+tva;const timbre=isCash(inv)?calcTimbre(ttc):0;return{ht,tva,ttc,timbre,net:ttc+timbre};}

/* The dashboard opened on invoices that were not the user's. Some people
   assumed the app was broken, others that it held someone else's books.
   The examples now say what they are and can be removed in one click. */
function hasDemoData(){
  try{return (state.clients||[]).some(function(c){return c.demo;})
          ||(state.invoices||[]).some(function(i){return i.demo;});}catch(e){return false;}
}
function clearDemoData(){
  if(!confirm(t('confirm.clearDemo')))return;
  state.clients=(state.clients||[]).filter(function(c){return !c.demo;});
  state.invoices=(state.invoices||[]).filter(function(i){return !i.demo;});
  state.payments=(state.payments||[]).filter(function(p){
    return (state.invoices||[]).some(function(i){return i.id===p.invoiceId;});});
  saveData();toast(t('toast.demoCleared'));renderPage();
}
function getClient(id){return state.clients.find(c=>c.id===id)||{name:'Client inconnu',address:'',nif:'',nin:'',nis:'',rc:'',ai:'',email:''};}
function updateOverdue(){const t=new Date().toISOString().slice(0,10);let ch=false;state.invoices.forEach(i=>{if(i.status==='envoyee'&&i.dueDate&&i.dueDate<t){i.status='enretard';ch=true;}});if(ch)saveData();}
function numberToWords(n){if(n===0)return'zéro';const units=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];const tens=['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];function under1000(num){if(num<20)return units[num];if(num<100){const t=Math.floor(num/10),u=num%10;if(t===7||t===9)return tens[t]+(u===1&&t===7?' et ':'-')+under1000(10+u);return tens[t]+(u===1&&t!==8?' et ':(u?'-':''))+(t===8&&u===0?'s':units[u]);}const h=Math.floor(num/100),r=num%100;return(h>1?units[h]+' ':'')+'cent'+(h>1&&r===0?'s':'')+(r?' '+under1000(r):'');}if(n<1000)return under1000(n);if(n<1000000){const th=Math.floor(n/1000),r=n%1000;return(th>1?under1000(th)+' ':'')+'mille'+(r?' '+under1000(r):'');}if(n<1e9){const m=Math.floor(n/1e6),r=n%1e6;return under1000(m)+' million'+(m>1?'s':'')+(r?' '+numberToWords(r):'');}return String(n);}
function amountInWords(amount){const n=Math.round(amount||0);if(n===0)return'Zéro dinar';const w=numberToWords(n);return w.charAt(0).toUpperCase()+w.slice(1)+' dinars';}
function toast(msg,type='ok'){const e=document.querySelector('.toast-msg');if(e)e.remove();const el=document.createElement('div');el.className=`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-600':'bg-red-600'}`;el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2800);}
function navigate(page){state.currentPage=page;state.search='';state.sidebarOpen=false;document.querySelectorAll('.nav-item').forEach(el=>el.classList.toggle('active',el.dataset.page===page));setPageTitle();const sidebar=document.getElementById('sidebar');if(sidebar){sidebar.classList.add('-translate-x-full');sidebar.classList.remove('translate-x-0');}const overlay=document.getElementById('sidebar-overlay');if(overlay)overlay.classList.add('hidden');renderPage();try{lucide.createIcons();}catch(e){}animateCounters();}
function toggleDark(){state.dark=!state.dark;document.documentElement.classList.toggle('dark',state.dark);localStorage.setItem('facturepro_dark',state.dark?'1':'0');}
function toggleSidebar(){state.sidebarOpen=!state.sidebarOpen;const sidebar=document.getElementById('sidebar');const overlay=document.getElementById('sidebar-overlay');if(sidebar){if(state.sidebarOpen){sidebar.classList.remove('-translate-x-full');sidebar.classList.add('translate-x-0');if(overlay)overlay.classList.remove('hidden');}else{sidebar.classList.add('-translate-x-full');sidebar.classList.remove('translate-x-0');if(overlay)overlay.classList.add('hidden');}}}

function animateCounters(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  document.querySelectorAll('.count[data-v]').forEach(el=>{
    const target=parseFloat(el.dataset.v)||0; if(!target){return;}
    const dur=850, t0=performance.now();
    const step=now=>{
      const k=Math.min(1,(now-t0)/dur);
      const e=1-Math.pow(1-k,3);
      el.textContent=formatMoney(Math.round(target*e));
      if(k<1)requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
function fireConfetti(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cv=document.getElementById('confetti'); if(!cv)return;
  cv.removeAttribute('hidden');
  const dpr=devicePixelRatio||1, W=cv.width=innerWidth*dpr, H=cv.height=innerHeight*dpr;
  cv.style.width=innerWidth+'px'; cv.style.height=innerHeight+'px';
  const ctx=cv.getContext('2d');
  const cols=['#006233','#10b981','#f59e0b','#ef4444','#ffffff'];
  const P=Array.from({length:90},()=>({
    x:W/2,y:H*0.42,
    vx:(Math.random()-0.5)*18*dpr, vy:(Math.random()*-15-5)*dpr,
    s:(Math.random()*5+3)*dpr, c:cols[(Math.random()*cols.length)|0],
    r:Math.random()*Math.PI, vr:(Math.random()-0.5)*0.3, life:1
  }));
  let raf;
  const draw=()=>{
    ctx.clearRect(0,0,W,H); let alive=false;
    P.forEach(p=>{
      if(p.life<=0)return; alive=true;
      p.vy+=0.55*dpr; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr; p.life-=0.011;
      ctx.save(); ctx.globalAlpha=Math.max(0,p.life);
      ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c;
      ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6); ctx.restore();
    });
    if(alive){raf=requestAnimationFrame(draw);}
    else{cancelAnimationFrame(raf);ctx.clearRect(0,0,W,H);cv.setAttribute('hidden','');}
  };
  draw();
}
function renderPage(){const c=document.getElementById('main-content');if(!c)return;updateOverdue();if(state.currentPage==='dashboard')c.innerHTML=renderDashboard();else if(state.currentPage==='invoices')c.innerHTML=renderInvoices();else if(state.currentPage==='clients')c.innerHTML=renderClients();else if(state.currentPage==='templates')c.innerHTML=renderTemplates();else if(state.currentPage==='settings')c.innerHTML=renderSettings();else if(state.currentPage==='help')c.innerHTML=renderHelp();else if(state.currentPage==='terms')c.innerHTML=renderTerms();else c.innerHTML='<p class="text-slate-500">'+esc(t('ui.notFound'))+'</p>';try{lucide.createIcons();}catch(e){}animateCounters();}
function renderDashboard(){const invs=state.invoices.filter(i=>i.status!=='annulee');const paid=invs.filter(i=>i.status==='payee');const unpaid=invs.filter(i=>['envoyee','enretard'].includes(i.status));const overdue=invs.filter(i=>i.status==='enretard');const totalPaid=paid.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const totalUnpaid=unpaid.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const totalOverdue=overdue.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const thisMonth=invs.filter(i=>i.date&&i.date.startsWith(new Date().toISOString().slice(0,7))).reduce((s,i)=>s+calcInvoiceTotals(i).net,0);return `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><div class="stat-card"><div class="flex items-center justify-between"><span class="text-sm text-slate-500">${t('stats.paid')}</span><div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><i data-lucide="trending-up" class="w-5 h-5 text-emerald-600"></i></div></div><p class="text-xl font-bold mt-2">${moneyUI(totalPaid)}</p></div><div class="stat-card"><div class="flex items-center justify-between"><span class="text-sm text-slate-500">${t('stats.pending')}</span><div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><i data-lucide="clock" class="w-5 h-5 text-blue-600"></i></div></div><p class="text-xl font-bold mt-2">${moneyUI(totalUnpaid)}</p></div><div class="stat-card"><div class="flex items-center justify-between"><span class="text-sm text-slate-500">${t('stats.overdue')}</span><div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i></div></div><p class="text-xl font-bold mt-2 text-red-600">${moneyUI(totalOverdue)}</p></div><div class="stat-card"><div class="flex items-center justify-between"><span class="text-sm text-slate-500">${t('stats.month')}</span><div class="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><i data-lucide="calendar" class="w-5 h-5 text-sky-600"></i></div></div><p class="text-xl font-bold mt-2">${moneyUI(thisMonth)}</p></div></div><div class="card p-4"><div class="flex justify-between mb-4"><h3 class="font-semibold">${t('inv.recent')}</h3><button onclick="navigate('invoices')" class="text-sm text-sky-600 font-medium">${t('actions.seeAll')}</button></div><div class="overflow-x-auto">${renderInvoicesTable(state.invoices.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5),true)}</div></div>`;}
function setInvSearch(v){state.search=v;renderPage();var el=document.getElementById('inv-search');if(el){el.focus();try{el.setSelectionRange(el.value.length,el.value.length);}catch(e){}}}
function setStatusFilter(k){state.statusFilter=k;renderPage();}
function filteredInvoices(){var list=[...state.invoices].sort(function(a,b){return (b.date||'').localeCompare(a.date||'');});
  if(state.statusFilter&&state.statusFilter!=='all'){list=list.filter(function(inv){return inv.status===state.statusFilter;});}
  if(state.search){var q=state.search.toLowerCase();list=list.filter(function(inv){var cl=getClient(inv.clientId);return (inv.number||'').toLowerCase().includes(q)||(cl.name||'').toLowerCase().includes(q);});}
  return list;}
function renderFilterChips(){var counts={all:state.invoices.length};Object.keys(STATUS).forEach(function(k){counts[k]=state.invoices.filter(function(i){return i.status===k;}).length;});
  var chips=[{k:'all',label:t('status.all')}].concat(Object.keys(STATUS).map(function(k){return {k:k,label:STATUS[k].label};}));
  return '<div class="filter-chips" role="tablist" aria-label="'+esc(t('actions.filterByStatus'))+'">'+chips.map(function(c){
    var on=(state.statusFilter||'all')===c.k;
    return '<button type="button" role="tab" aria-selected="'+on+'" class="chip'+(on?' chip-on':'')+'" onclick="setStatusFilter(\''+c.k+'\')">'+esc(c.label)+'<span class="chip-n">'+(counts[c.k]||0)+'</span></button>';
  }).join('')+'</div>';}
function renderInvoices(){var list=filteredInvoices();
  return '<div class="flex flex-col sm:flex-row justify-between gap-3 mb-3"><div class="relative flex-1 max-w-sm"><i data-lucide="search" class="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i><input id="inv-search" type="text" placeholder="'+esc(t('ui.search'))+'" class="form-input ps-10" value="'+esc(state.search)+'" oninput="setInvSearch(this.value)" /></div><div class="flex gap-2"><button onclick="exportData()" class="btn-secondary" title="'+esc(t('actions.export'))+'"><i data-lucide="download" class="w-4 h-4"></i></button><button onclick="openNewInvoice()" class="btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> '+esc(t('actions.newInvoice'))+'</button></div></div>'
  + renderFilterChips()
  + '<div class="card"><div class="overflow-x-auto">'+renderInvoicesTable(list)+'</div></div>';}
function renderInvoicesTable(list,compact=false){if(!list.length)return`<div class="empty-state">
    <svg viewBox="0 0 160 128" fill="none" aria-hidden="true">
      <ellipse cx="80" cy="116" rx="48" ry="7" fill="#e2e8f0"/>
      <path d="M34 44h38l8 10h46a6 6 0 0 1 6 6v44a6 6 0 0 1-6 6H34a6 6 0 0 1-6-6V50a6 6 0 0 1 6-6z" fill="#d1fae5" stroke="#6ee7b7" stroke-width="2"/>
      <rect x="52" y="16" width="56" height="46" rx="5" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
      <rect x="61" y="28" width="30" height="4" rx="2" fill="#cbd5e1"/>
      <rect x="61" y="38" width="38" height="4" rx="2" fill="#e2e8f0"/>
      <rect x="61" y="48" width="22" height="4" rx="2" fill="#e2e8f0"/>
      <circle cx="118" cy="30" r="15" fill="#006233"/>
      <path d="M118 23v14M111 30h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <h3>${t('inv.empty')}</h3>
    <p>${t('inv.emptyHint')}</p>
    <button onclick="openNewInvoice()" class="btn-primary"><i data-lucide="plus" class="w-4 h-4"></i> ${t('actions.createInvoice')}</button>
  </div>`;return`<table class="data-table"><thead><tr><th>${t('inv.number')}</th><th>${t('inv.client')}</th><th class="hidden sm:table-cell">${t('inv.date')}</th><th>${t('inv.amount')}</th><th>${t('inv.status')}</th><th class="text-right">${t('inv.actions')}</th></tr></thead><tbody>${list.map(inv=>{const client=getClient(inv.clientId);const totals=calcInvoiceTotals(inv);const st=STATUS[inv.status]||STATUS.brouillon;return`<tr><td class="font-medium">${esc(inv.number)}</td><td class="truncate max-w-[120px]">${esc(client.name)}</td><td class="hidden sm:table-cell">${dateUI(inv.date)}</td><td class="font-semibold">${moneyUI(totals.net)}</td><td><select onchange="setStatus('${inv.id}',this.value)" class="text-xs font-medium py-1 px-2 rounded-full border-0 cursor-pointer ${st.class}">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${inv.status===k?'selected':''}>${v.label}</option>`).join('')}</select></td><td class="text-right"><button onclick="previewInvoice('${inv.id}')" class="btn-ghost p-1.5" title="${t('actions.preview')}"><i data-lucide="eye" class="w-4 h-4"></i></button><button onclick="editInvoice('${inv.id}')" class="btn-ghost p-1.5"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="duplicateInvoice('${inv.id}')" class="btn-ghost p-1.5 hidden sm:inline-flex"><i data-lucide="copy" class="w-4 h-4"></i></button><button onclick="deleteInvoice('${inv.id}')" class="btn-ghost p-1.5 text-red-500"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;}).join('')}</tbody></table><div class="invoice-cards">${list.map(inv=>{const client=getClient(inv.clientId);const totals=calcInvoiceTotals(inv);const st=STATUS[inv.status]||STATUS.brouillon;return`<div class="inv-card"><div class="l1"><span class="no">${esc(inv.number)}</span><span class="badge-wrap"><select aria-label="${t('actions.changeStatus')}" onchange="setStatus('${inv.id}',this.value)" class="card-status ${st.class}">${Object.entries(STATUS).map(function(e){return `<option value="${e[0]}" ${inv.status===e[0]?"selected":""}>${e[1].label}</option>`;}).join("")}</select></span></div><div class="l2">${esc(client.name)}</div><div class="l3"><span>${dateUI(inv.date)}</span><span class="amt">${moneyUI(totals.net)}</span></div><div class="l4"><button onclick="previewInvoice('${inv.id}')" class="btn-ghost p-2" aria-label="${t('actions.preview')}"><i data-lucide="eye" class="w-4 h-4"></i></button><button onclick="editInvoice('${inv.id}')" class="btn-ghost p-2" aria-label="${t('actions.edit')}"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="duplicateInvoice('${inv.id}')" class="btn-ghost p-2" aria-label="${t('actions.duplicate')}"><i data-lucide="copy" class="w-4 h-4"></i></button><button onclick="deleteInvoice('${inv.id}')" class="btn-ghost p-2 text-red-500" aria-label="${t('actions.delete')}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`;}).join('')}</div>`;}
