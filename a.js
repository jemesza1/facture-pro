const STORAGE_KEY='facturepro_dz_v24';
const defaultCompany={name:'Mon Entreprise SARL',address:'12 Rue Didouche Mourad\n16000 Alger',nif:'000000000000000',nin:'',nis:'000000000000000',rc:'16/00-0000000B00',ai:'0000',email:'contact@monentreprise.dz',phone:'+213 21 00 00 00',rib:'007 99999 0000000000 00',banque:'BNA',logo:''};
const STATUS={brouillon:{label:'Brouillon',class:'badge-brouillon'},envoyee:{label:'Envoyée',class:'badge-envoyee'},payee:{label:'Payée',class:'badge-payee'},enretard:{label:'En retard',class:'badge-enretard'},annulee:{label:'Annulée',class:'badge-annulee'}};
const TEMPLATES=[{id:'classique',name:'Classique',desc:'Sobre et traditionnel',nameAr:'كلاسيكي',descAr:'بسيط وتقليدي',color:'#0f172a',bg:'#f1f5f9',layout:'classic'},{id:'moderne',name:'Moderne',desc:'Bandeau coloré élégant',nameAr:'عصري',descAr:'شريط ملوّن أنيق',color:'#0284c7',bg:'#e0f2fe',layout:'modern'},{id:'minimal',name:'Minimal',desc:'Épuré',nameAr:'مبسّط',descAr:'مجرّد',color:'#334155',bg:'#f8fafc',layout:'classic'},{id:'premium',name:'Premium',desc:'Header sombre',nameAr:'ممتاز',descAr:'ترويسة داكنة',color:'#0f172a',bg:'#1e293b',layout:'premium'},{id:'corporate',name:'Corporate',desc:'Bleu entreprise',nameAr:'مؤسّسي',descAr:'أزرق الشركات',color:'#1e40af',bg:'#dbeafe',layout:'modern'},{id:'elegant',name:'Élégant',desc:'Beige raffiné',nameAr:'أنيق',descAr:'بيج راقٍ',color:'#78716c',bg:'#f5f5f4',layout:'classic'},{id:'crea',name:'Créatif',desc:'Violet moderne',nameAr:'إبداعي',descAr:'بنفسجي عصري',color:'#7c3aed',bg:'#ede9fe',layout:'modern'},{id:'nature',name:'Nature',desc:'Vert pro',nameAr:'طبيعة',descAr:'أخضر احترافي',color:'#059669',bg:'#d1fae5',layout:'modern'},{id:'sunset',name:'Sunset',desc:'Orange énergique',nameAr:'غروب',descAr:'برتقالي حيوي',color:'#ea580c',bg:'#ffedd5',layout:'modern'},{id:'ocean',name:'Océan',desc:'Turquoise',nameAr:'محيط',descAr:'أزرق بحري',color:'#0891b2',bg:'#cffafe',layout:'modern'},{id:'noir',name:'Noir & Blanc',desc:'Monochrome',nameAr:'أبيض وأسود',descAr:'للطابعة بلا ألوان',color:'#171717',bg:'#f5f5f5',layout:'classic'},{id:'rose',name:'Rose Soft',desc:'Rose doux',nameAr:'وردي',descAr:'وردي هادئ',color:'#db2777',bg:'#fce7f3',layout:'modern'},{id:'indigo',name:'Indigo',desc:'Indigo profond',nameAr:'نيلي',descAr:'أزرق نيلي',color:'#4338ca',bg:'#e0e7ff',layout:'modern'},{id:'slate',name:'Slate Pro',desc:'Gris ardoise',nameAr:'رمادي',descAr:'رمادي احترافي',color:'#475569',bg:'#f1f5f9',layout:'classic'},{id:'gold',name:'Gold',desc:'Or premium',nameAr:'ذهبي',descAr:'ذهبي فاخر',color:'#a16207',bg:'#fef9c3',layout:'premium'},{id:'forest',name:'Forêt',desc:'Vert forêt',nameAr:'غابة',descAr:'أخضر داكن',color:'#166534',bg:'#dcfce7',layout:'modern'},{id:'sky',name:'Ciel',desc:'Bleu ciel',nameAr:'سماء',descAr:'أزرق فاتح',color:'#0284c7',bg:'#f0f9ff',layout:'modern'},{id:'coral',name:'Corail',desc:'Corail',nameAr:'مرجاني',descAr:'مرجاني دافئ',color:'#e11d48',bg:'#ffe4e6',layout:'modern'},{id:'mint',name:'Menthe',desc:'Menthe',nameAr:'نعناع',descAr:'أخضر نعناعي',color:'#0d9488',bg:'#ccfbf1',layout:'modern'},{id:'lavender',name:'Lavande',desc:'Lavande',nameAr:'خزامى',descAr:'بنفسجي فاتح',color:'#8b5cf6',bg:'#f5f3ff',layout:'modern'},{id:'charcoal',name:'Charcoal',desc:'Charbon',nameAr:'فحمي',descAr:'رمادي داكن',color:'#1c1917',bg:'#fafaf9',layout:'premium'},{id:'navy',name:'Navy',desc:'Marine',nameAr:'كحلي',descAr:'أزرق كحلي',color:'#1e3a8a',bg:'#eff6ff',layout:'modern'},{id:'emerald',name:'Émeraude',desc:'Émeraude',nameAr:'زمرّد',descAr:'أخضر زمرّدي',color:'#047857',bg:'#ecfdf5',layout:'modern'},{id:'amber',name:'Ambre',desc:'Ambre',nameAr:'كهرماني',descAr:'أصفر كهرماني',color:'#d97706',bg:'#fffbeb',layout:'modern'},{id:'studio',name:'Studio',desc:'Bandeau dégradé ciel',nameAr:'ستوديو',descAr:'شريط متدرّج',color:'#0ea5e9',color2:'#0369a1',bg:'#e0f2fe',layout:'studio'},{id:'onyx',name:'Onyx',desc:'Dégradé graphite',nameAr:'عقيق',descAr:'أسود عميق',color:'#334155',color2:'#0f172a',bg:'#f1f5f9',layout:'studio'},{id:'royal',name:'Royal',desc:'Dégradé indigo',nameAr:'ملكي',descAr:'بنفسجي ملكي',color:'#6366f1',color2:'#4338ca',bg:'#e0e7ff',layout:'studio'},{id:'carmin',name:'Carmin',desc:'Dégradé carmin',nameAr:'قرمزي',descAr:'أحمر قرمزي',color:'#f43f5e',color2:'#be123c',bg:'#ffe4e6',layout:'studio'},{id:'algerie',name:'Algérie',desc:'Bandeau vert officiel',nameAr:'الجزائر',descAr:'شريط أخضر رسمي',color:'#006233',color2:'#059669',bg:'#d1fae5',layout:'dz'}];

/* Huit modeles mis devant. Vingt-neuf ne sont pas vingt-neuf mises en page :
   ce sont cinq mises en page — classic, modern, premium, studio, dz — dont
   seize declinaisons du meme «modern» en couleurs differentes. Un commercant
   qui ouvre la liste pour emettre une facture ne choisit pas entre vingt-neuf
   propositions, il renonce.

   Ces huit-la couvrent les cinq mises en page, plus trois couleurs qui
   repondent a un besoin et non a un gout : corporate pour le bleu d'usage
   commercial, nature pour le vert de la marque, noir pour l'imprimante qui
   n'a plus de cartouche couleur — et c'est un cas frequent ici.

   Les vingt et un autres restent dans TEMPLATES et restent choisissables :
   une facture deja emise porte l'identifiant de son modele, et c1.js retombe
   sur TEMPLATES[0] quand elle ne le trouve plus. En supprimer un changerait
   l'apparence d'anciennes factures sans le dire. On range, on ne jette pas. */
/* nameAr / descAr : les vingt-neuf modeles portaient un nom et une
   description francais, et l'ecran arabe les affichait tels quels — trente
   pour cent de la page en francais pour un lecteur qui a choisi l'arabe.
   « Noir & Blanc » devient « ابيض واسود », et sa description dit ce qu'elle
   sert vraiment : l imprimante qui n'a plus d'encre couleur. */
const TEMPLATES_TOP=['algerie','classique','moderne','premium','studio','corporate','nature','noir'];
let state={company:{...defaultCompany},clients:[],invoices:[],nextInvoiceNumber:1,currentPage:'dashboard',dark:false,search:'',statusFilter:'all',sidebarOpen:false};
/* A parse failure used to be swallowed, and seedDemoData() then wrote demo
   invoices over the user's own key — destroying the last recoverable copy.
   Now the unreadable text is put aside under a rescue key and nothing is
   seeded, so the data can still be recovered by hand. */
var loadFailed=false;
function loadData(){var raw=null;try{raw=localStorage.getItem(STORAGE_KEY);if(raw){const d=JSON.parse(raw);if(!d||typeof d!=='object'||Array.isArray(d))throw new Error('shape');state={...state,...d};}}catch(e){loadFailed=true;try{localStorage.setItem(STORAGE_KEY+'_illisible',raw||'');}catch(e2){}}state.clients=(state.clients||[]).map(function(c){return Object.assign({nin:'',nis:'',rc:'',ai:'',email:'',address:'',nif:'',phone:''},c);});state.invoices=(state.invoices||[]).map(function(i){return Object.assign({paymentMode:'virement'},i);});state.company=Object.assign({},defaultCompany,state.company||{});/* Semees a la premiere visite seulement, sur l'absence d'enregistrement et non sur deux listes vides : un registre qu'on vide est une decision. Le re-semer remettait quatre factures inventees dans le journal du mois et faisait reculer nextInvoiceNumber sur des numeros deja emis. */if(!loadFailed&&!raw)seedDemoData();if(loadFailed)setTimeout(function(){try{toast(t('toast.dataUnreadable'),'err');}catch(e){}},900);}
function saveData(){localStorage.setItem(STORAGE_KEY,JSON.stringify({company:state.company,clients:state.clients,invoices:state.invoices,nextInvoiceNumber:state.nextInvoiceNumber,nextAvoirNumber:state.nextAvoirNumber,currentPage:state.currentPage}));}
function seedDemoData(){state.clients=[{demo:true,id:'c1',name:'SARL Atlas Services',email:'contact@atlas.dz',address:'45 Bd Mohamed V\n16000 Alger',nif:'099999999999999',nis:'099888777666555',rc:'16/00-1234567B21',phone:'021 00 00 01'},{demo:true,id:'c2',name:'EURL Sahara Tech',email:'info@sahara.dz',address:'8 Rue de la Liberté\n31000 Oran',nif:'088888888888888',nis:'088777666555444',rc:'31/00-7654321B19',phone:'041 00 00 02'},{demo:true,id:'c3',name:'SPA Numidia Trading',email:'admin@numidia.dz',address:'22 Av de l\'Indépendance\n25000 Constantine',nif:'077777777777777',nis:'077666555444333',rc:'25/00-2468013B20',phone:'031 00 00 03'}];const today=new Date();const d=o=>{const dt=new Date(today);dt.setDate(dt.getDate()+o);return todayISO(dt);};state.invoices=[{demo:true,id:'inv1',number:'FAC-2026-001',clientId:'c1',template:'moderne',date:d(-25),dueDate:d(-10),status:'enretard',items:[{description:'Audit stratégique Q1',qty:1,unitPrice:250000,tva:19},{description:'Accompagnement (5 jours)',qty:5,unitPrice:45000,tva:19}],notes:'Paiement par virement sous 15 jours.'},{demo:true,id:'inv2',number:'FAC-2026-002',clientId:'c2',template:'premium',date:d(-12),dueDate:d(3),status:'envoyee',items:[{description:'Développement module facturation',qty:1,unitPrice:480000,tva:19}],notes:''},{demo:true,id:'inv3',number:'FAC-2026-003',clientId:'c3',template:'classique',date:d(-5),dueDate:d(25),status:'payee',items:[{description:'Création identité visuelle',qty:1,unitPrice:180000,tva:19}],notes:'Merci.'},{demo:true,id:'inv4',number:'FAC-2026-004',clientId:'c1',template:'nature',date:d(-2),dueDate:d(28),status:'brouillon',items:[{description:'Conseil en organisation',qty:3,unitPrice:55000,tva:19}],notes:''}];state.nextInvoiceNumber=5;saveData();}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function ltrCodes(s){return String(s==null?'':s).replace(/(\d{2}-\d{3})/g,'<span class="ltr-code">$1</span>');}
/* The logo is the one field that must not be escaped — it is a data: URI and
   escaping would not break it, but neither would it help: the value lands in
   src="..." and a crafted string closes the attribute and opens an onerror.
   It always arrives from FileReader.readAsDataURL on an image/* file, so the
   shape is known exactly. Anything that is not that shape is not a logo, and
   a backup file is a place a stranger's string can arrive from. SVG is left
   out on purpose: it is an image that can carry script. */
function safeLogo(v){
  return /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[A-Za-z0-9+/=\s]+$/.test(String(v||''))
    ? v : '';
}
function escObj(o,skip){o=o||{};skip=skip||[];var r={},k;for(k in o){r[k]=(k==='logo')?safeLogo(o[k]):((skip.indexOf(k)>-1||typeof o[k]!=='string')?o[k]:esc(o[k]));}return r;}
function uid(){return 'id_'+Math.random().toString(36).slice(2,11);}
/* Le document imprimait des dinars entiers. Tant que tout est rond, cela se
   lit mieux et rien ne se perd ; des qu'un prix porte des centimes, arrondir
   chaque figure separement donne un papier qui ne s'additionne plus. Le
   document choisit donc : centimes partout, ou nulle part. La grande majorite
   des factures algeriennes sont en dinars ronds et gardent l'aspect qu'elles
   avaient. */
var _moneyDec=0;
function setMoneyDecimals(n){_moneyDec=n?2:0;}
function formatMoney(a){return new Intl.NumberFormat('fr-DZ',{style:'currency',currency:'DZD',minimumFractionDigits:_moneyDec,maximumFractionDigits:_moneyDec}).format(a||0).replace('DZD','DA');}
function moneyUI(a){var s=new Intl.NumberFormat('fr-DZ',{style:'decimal',maximumFractionDigits:0}).format(a||0);var c=(typeof t==='function')?t('currency'):' DA';return '<bdi>'+s+c+'</bdi>';}
/* <bdi> seul prend sa direction du premier caractere fort, qui est arabe dans
   « 02 أوت 2026 » : le jour partait alors a gauche et l'annee au milieu, si
   bien qu'on lisait « أوت 2026 02 ». Une date se lit dans l'ordre ou le
   formateur l'a ecrite — jour, mois, annee — quel que soit le texte autour,
   d'ou la direction posee explicitement plutot que devinee. */
function dateUI(iso){if(!iso)return'\u2014';
  var ar=(typeof locale!=='undefined'&&locale==='ar');
  /* En arabe, un nom de mois suivi de chiffres les transforme en chiffres
     arabes au sens de l'algorithme bidi : ils rejoignent le mot dans le meme
     segment droite-a-gauche, et « 02 أوت 2026 » se peignait « 02 2026 أوت ».
     Poser une direction ne suffit pas, c'est la juxtaposition qui l'entraine.
     Une date toute en chiffres n'a pas de lettre pour l'entrainer : elle se
     lit pareil dans les deux sens, et c'est la forme des documents ici. */
  var opt=ar?{day:'2-digit',month:'2-digit',year:'numeric'}
            :{day:'2-digit',month:'short',year:'numeric'};
  try{return '<bdi dir="ltr">'+new Date(iso).toLocaleDateString('fr-DZ',opt)+'</bdi>';}
  catch(e){return '<bdi dir="ltr">'+formatDate(iso)+'</bdi>';}}
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
/* Kept as a name the rest of the app already calls; the arithmetic lives in
   lib-calc.js so the public tool page shares it. */
function calcTimbre(amount){return timbreFor(amount);}
function isCash(inv){return !!(inv&&inv.paymentMode==='especes');}
/* A credit note is an invoice with the sign turned round. Negating here and
   nowhere else is deliberate: the dashboard, the debts page, the client
   totals and the Excel journal all reach a figure by summing
   calcInvoiceTotals(...).net over state.invoices, in six different files. Do
   it once at the source and every one of them subtracts an avoir correctly;
   do it in each of them and the first one anybody forgets reports revenue
   that was credited back. */
function isAvoir(inv){return !!(inv&&inv.type==='avoir');}
/* A delivery note carries goods, not money. The invoice it accompanies has
   already been counted, so a bon de livraison must contribute nothing to
   revenue, to receivables or to the journal — see calcInvoiceTotals. */
function isBl(inv){return !!(inv&&inv.type==='bl');}
function docTitle(inv){
  if(isAvoir(inv))return "FACTURE D'AVOIR";
  if(isBl(inv))return 'BON DE LIVRAISON';
  return 'FACTURE';
}
/* The sentence that precedes the amount in letters names the document, so it
   has to follow the document. Falls back to the French wording if a locale is
   missing the key, never to `undefined` on a printed page. */
function wordsLead(inv){
  var k=isAvoir(inv) ? 'inv.wordsAvoir' : 'inv.words';
  var v=t(k);
  return (v && v!==k) ? v : 'Arrêté la présente facture à la somme de';
}

/* Printed under the number, so the paper says which invoice it cancels. */
function refLine(inv){
  if(!inv || !inv.refNumber) return '';
  if(isAvoir(inv)) return '<div style="font-size:11px;color:#64748b">Avoir sur facture '+esc(inv.refNumber)+'</div>';
  if(isBl(inv)) return '<div style="font-size:11px;color:#64748b">Facture '+esc(inv.refNumber)+'</div>';
  return '';
}
/* Carriage sits outside the VAT base and on top of the TTC — the layout every
   supplier invoice uses. It is still part of what the client actually hands
   over, so the stamp duty is charged on the sum including it.

   ttc keeps its old meaning, goods and their VAT and nothing else, because the
   Excel journal and the VAT breakdown read it. The carriage appears as its own
   figure and lands in net.

   An invoice written before the field existed has no fraisPort, reads 0, and
   comes out with exactly the numbers it had. */
/* Chaque ligne et sa TVA sont arrondies au centime avant d'entrer dans la
   somme : le total devient la somme de ce que le papier imprime, et non un
   nombre exact a cote de lignes arrondies. Avec des prix a centimes le
   document ne tombait pas juste — « 1 151 + 174 = 1 324 » — et un client qui
   verifie a raison de ne pas payer un document qui ne s'additionne pas. */
function calcInvoiceTotals(inv){if(isBl(inv))return{ht:0,tva:0,ttc:0,port:0,timbre:0,net:0};let ht=0,tva=0;(inv.items||[]).forEach(it=>{const l=round2((it.qty||0)*(it.unitPrice||0));ht+=l;tva+=round2(vatAmount(l,it.tva||0));});ht=round2(ht);tva=round2(tva);const ttc=round2(ht+tva);const port=Number(inv.fraisPort)||0;const timbre=isCash(inv)?calcTimbre(ttc+port):0;const sign=isAvoir(inv)?-1:1;return{ht:ht*sign,tva:tva*sign,ttc:ttc*sign,port:port*sign,timbre:timbre*sign,net:round2(ttc+port+timbre)*sign};}

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
function updateOverdue(){const t=todayISO();let ch=false;state.invoices.forEach(i=>{if(i.status==='envoyee'&&i.dueDate&&i.dueDate<t){i.status='enretard';ch=true;}});if(ch)saveData();}
/* The first line has always looked for .toast-msg and nothing has ever
   carried it, so the removal never fired: three messages in a row landed
   on the same spot and only the last one could be read. end-6 rather than
   right-6 so the message mirrors with the rest of the interface in Arabic. */
function toast(msg,type='ok'){const e=document.querySelector('.toast-msg');if(e)e.remove();const el=document.createElement('div');el.className=`toast-msg fixed bottom-6 end-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${type==='ok'?'bg-emerald-600':'bg-red-600'}`;el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2800);}
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
function renderPage(){const c=document.getElementById('main-content');if(!c)return;updateOverdue();if(state.currentPage==='dashboard')c.innerHTML=renderDashboard();else if(state.currentPage==='invoices')c.innerHTML=renderInvoices();else if(state.currentPage==='clients')c.innerHTML=renderClients();else if(state.currentPage==='templates')c.innerHTML=renderTemplates();else if(state.currentPage==='settings')c.innerHTML=renderSettings();else if(state.currentPage==='help')c.innerHTML=renderHelp();else if(state.currentPage==='outils')c.innerHTML=renderOutils();else if(state.currentPage==='terms')c.innerHTML=renderTerms();else c.innerHTML='<p class="text-slate-500">'+esc(t('ui.notFound'))+'</p>';try{lucide.createIcons();}catch(e){}try{if(typeof paintBackupNotice==='function')paintBackupNotice();}catch(e){}animateCounters();}
function renderDashboard(){const invs=state.invoices.filter(i=>i.status!=='annulee');const paid=invs.filter(i=>i.status==='payee');const unpaid=invs.filter(i=>['envoyee','enretard'].includes(i.status));const overdue=invs.filter(i=>i.status==='enretard');const totalPaid=paid.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const totalUnpaid=unpaid.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const totalOverdue=overdue.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const thisMonth=invs.filter(i=>i.date&&i.date.startsWith(todayISO().slice(0,7))).reduce((s,i)=>s+calcInvoiceTotals(i).net,0);return `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"><div class="stat-card"><div class="flex items-center justify-between"><span class="text-sm text-slate-500">${t('stats.paid')}</span><div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><i data-lucide="trending-up" class="w-5 h-5 text-emerald-600"></i></div></div><p class="text-xl font-bold mt-2">${moneyUI(totalPaid)}</p></div><div class="stat-card"><div class="flex items-center justify-between"><span class="text-sm text-slate-500">${t('stats.pending')}</span><div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><i data-lucide="clock" class="w-5 h-5 text-blue-600"></i></div></div><p class="text-xl font-bold mt-2">${moneyUI(totalUnpaid)}</p></div><div class="stat-card"><div class="flex items-center justify-between"><span class="text-sm text-slate-500">${t('stats.overdue')}</span><div class="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i></div></div><p class="text-xl font-bold mt-2 text-red-600">${moneyUI(totalOverdue)}</p></div><div class="stat-card"><div class="flex items-center justify-between"><span class="text-sm text-slate-500">${t('stats.month')}</span><div class="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center"><i data-lucide="calendar" class="w-5 h-5 text-sky-600"></i></div></div><p class="text-xl font-bold mt-2">${moneyUI(thisMonth)}</p></div></div><div class="card p-4"><div class="flex justify-between mb-4"><h3 class="font-semibold">${t('inv.recent')}</h3><button onclick="navigate('invoices')" class="text-sm text-sky-600 font-medium">${t('actions.seeAll')}</button></div><div class="overflow-x-auto">${renderInvoicesTable(state.invoices.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,5),true)}</div></div>`;}
/* La recherche repeint toute la page a chaque touche, et le champ fait partie
   de ce qui est repeint : il faut donc lui rendre le focus apres. Le curseur,
   lui, etait replace en fin de chaine — corriger une faute au milieu d'un mot
   etait impossible, chaque lettre sautait a la fin. On retient la position et
   on la rend telle quelle.

   Le repeint est aussi differe de quelques centieme de seconde. Sur deux cents
   factures il ne se voit pas ; sur cinq cents, chaque frappe redessinait la
   liste entiere et le champ prenait un demi-seconde de retard sur les doigts.
   Le delai est court : quelqu'un qui tape s'arrete plus longtemps que cela
   entre deux mots. */
var _searchTimer=null;
function setInvSearch(v){
  state.search=v;
  var el=document.getElementById('inv-search');
  var pos=el?el.selectionStart:null;
  var paint=function(){
    _searchTimer=null;
    renderPage();
    var f=document.getElementById('inv-search');
    if(!f)return;
    f.focus();
    try{ var p=(pos==null)?f.value.length:Math.min(pos,f.value.length);
         f.setSelectionRange(p,p); }catch(e){}
  };
  if(_searchTimer) clearTimeout(_searchTimer);
  /* Peu de factures : on repeint tout de suite, le differe ne servirait qu'a
     rendre l'application molle. */
  if((state.invoices||[]).length<200){ paint(); return; }
  _searchTimer=setTimeout(paint,90);
}
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
  </div>`;return`<table class="data-table"><thead><tr><th>${t('inv.number')}</th><th>${t('inv.client')}</th><th class="hidden sm:table-cell">${t('inv.date')}</th><th>${t('inv.amount')}</th><th>${t('inv.status')}</th><th class="text-right">${t('inv.actions')}</th></tr></thead><tbody>${list.map(inv=>{const client=getClient(inv.clientId);const totals=calcInvoiceTotals(inv);const st=STATUS[inv.status]||STATUS.brouillon;return`<tr><td class="font-medium">${esc(inv.number)}</td><td class="truncate max-w-[120px]">${esc(client.name)}</td><td class="hidden sm:table-cell">${dateUI(inv.date)}</td><td class="font-semibold">${moneyUI(totals.net)}</td><td><select aria-label="${esc(t('inv.status'))}" onchange="setStatus('${inv.id}',this.value)" class="text-xs font-medium py-1 px-2 rounded-full border-0 cursor-pointer ${st.class}">${Object.entries(STATUS).map(([k,v])=>`<option value="${k}" ${inv.status===k?'selected':''}>${v.label}</option>`).join('')}</select></td><td class="text-right"><button onclick="previewInvoice('${inv.id}')" class="btn-ghost p-1.5" title="${t('actions.preview')}"><i data-lucide="eye" class="w-4 h-4"></i></button><button onclick="editInvoice('${inv.id}')" class="btn-ghost p-1.5" title="${t('actions.edit')}" aria-label="${t('actions.edit')}"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="duplicateInvoice('${inv.id}')" class="btn-ghost p-1.5 hidden sm:inline-flex" title="${t('actions.duplicate')}" aria-label="${t('actions.duplicate')}"><i data-lucide="copy" class="w-4 h-4"></i></button><button onclick="deleteInvoice('${inv.id}')" class="btn-ghost p-1.5 text-red-500" title="${t('actions.delete')}" aria-label="${t('actions.delete')}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td></tr>`;}).join('')}</tbody></table><div class="invoice-cards">${list.map(inv=>{const client=getClient(inv.clientId);const totals=calcInvoiceTotals(inv);const st=STATUS[inv.status]||STATUS.brouillon;return`<div class="inv-card"><div class="l1"><span class="no">${esc(inv.number)}</span><span class="badge-wrap"><select aria-label="${t('actions.changeStatus')}" onchange="setStatus('${inv.id}',this.value)" class="card-status ${st.class}">${Object.entries(STATUS).map(function(e){return `<option value="${e[0]}" ${inv.status===e[0]?"selected":""}>${e[1].label}</option>`;}).join("")}</select></span></div><div class="l2">${esc(client.name)}</div><div class="l3"><span>${dateUI(inv.date)}</span><span class="amt">${moneyUI(totals.net)}</span></div><div class="l4"><button onclick="previewInvoice('${inv.id}')" class="btn-ghost p-2" aria-label="${t('actions.preview')}"><i data-lucide="eye" class="w-4 h-4"></i></button><button onclick="editInvoice('${inv.id}')" class="btn-ghost p-2" aria-label="${t('actions.edit')}"><i data-lucide="pencil" class="w-4 h-4"></i></button><button onclick="duplicateInvoice('${inv.id}')" class="btn-ghost p-2" aria-label="${t('actions.duplicate')}"><i data-lucide="copy" class="w-4 h-4"></i></button><button onclick="deleteInvoice('${inv.id}')" class="btn-ghost p-2 text-red-500" aria-label="${t('actions.delete')}"><i data-lucide="trash-2" class="w-4 h-4"></i></button></div></div>`;}).join('')}</div>`;}
