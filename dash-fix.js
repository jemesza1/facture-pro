/* Un brouillon n'a ete envoye a personne, donc personne ne le doit — c'est la
   regle que l'ecran des creances applique et que le releve de compte redit
   dans son propre texte. Le tableau de bord, lui, comptait les brouillons
   dans « En attente » et dans « Ce mois » : dix factures preparees pour le
   mois prochain gonflaient l'argent annonce comme a venir, et les deux
   ecrans donnaient deux chiffres pour la meme question. La regle doit etre
   la meme partout.

   Les quatre totaux sont par ailleurs arrondis : ils additionnent des sommes
   a deux decimales et affichaient un centime qui n'etait dans aucune. */
function renderDashboard(){const r2=(typeof round2==='function')?round2:(x=>x);const invs=state.invoices.filter(i=>i.status!=='annulee'&&i.status!=='brouillon');const paid=invs.filter(i=>i.status==='payee');const unpaid=invs.filter(i=>['envoyee','enretard'].includes(i.status));const overdue=invs.filter(i=>i.status==='enretard');const totalPaid=r2(paid.reduce((s,i)=>s+calcInvoiceTotals(i).net,0));const totalUnpaid=r2(unpaid.reduce((s,i)=>s+calcInvoiceTotals(i).net,0));const totalOverdue=r2(overdue.reduce((s,i)=>s+calcInvoiceTotals(i).net,0));const thisMonth=r2(invs.filter(i=>i.date&&i.date.startsWith(todayISO().slice(0,7))).reduce((s,i)=>s+calcInvoiceTotals(i).net,0));const isDemo=(typeof hasDemoData==='function')&&hasDemoData();const empty=!state.invoices.length;const recent=[...state.invoices].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);return `
<div class="space-y-6">
  ${empty?`<div class="card p-8 text-center">
    <div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mb-4">
      <i data-lucide="file-plus" class="w-7 h-7 text-emerald-600"></i></div>
    <h2 class="text-lg font-bold mb-1">${t('start.title')}</h2>
    <p class="text-sm text-slate-500 mb-5">${t('start.sub')}</p>
    <button onclick="openNewInvoice()" class="btn-primary mx-auto"><i data-lucide="plus" class="w-4 h-4"></i> ${t('start.cta')}</button>
  </div>`:''}
  ${isDemo?`<div class="card p-4 flex flex-wrap items-center justify-between gap-3 border-s-4 border-amber-400">
    <div class="min-w-0"><p class="font-semibold text-sm">${t('demo.title')}</p>
    <p class="text-xs text-slate-500">${t('demo.sub')}</p></div>
    <button onclick="clearDemoData()" class="btn-secondary shrink-0"><i data-lucide="eraser" class="w-4 h-4"></i> ${t('demo.clear')}</button>
  </div>`:''}
  <!-- Au-dessus des quatre chiffres, et non en dessous. Elle etait en dessous,
       et la mesure a dit non : 412x915 est l'ecran d'un Pixel, pas la place
       qu'il donne a la page — une fois la barre d'adresse et les barres
       systeme retirees il reste environ 732 pixels, et sur un 360x640 il en
       reste 640. Posee sous les quatre chiffres, la carte commencait a 775 et
       aucun de ces telephones n'en montrait un seul pixel. Quatre-vingt-cinq
       pour cent des visiteurs arrivent par telephone, ou la barre laterale
       dort derriere un hamburger : si cette carte ne se voit pas, rien ne se
       voit. Le harnais la mesure maintenant sur les hauteurs que les
       telephones donnent vraiment, et compte les puces entieres, pas le bord
       superieur de la carte.

       Rien quand le commercant n'a aucune facture : cet ecran-la porte deja
       « creez votre premiere facture », et lui opposer six liens qui sortent
       de l'application serait lui prendre le seul geste qui compte. -->
  ${empty?'':(typeof outilsCard==='function'?outilsCard():'')}
  <div class="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
    <div class="stat-card">
      <div class="flex items-center justify-between gap-2">
        <span class="stat-label">${t('stats.paid')}</span>
        <div class="stat-icon bg-emerald-50 dark:bg-emerald-950/50"><i data-lucide="trending-up" class="w-5 h-5 text-emerald-600"></i></div>
      </div>
      <p class="stat-value"><span class="count" data-v="totalPaid">${moneyUI(totalPaid)}</span></p>
    </div>
    <div class="stat-card">
      <div class="flex items-center justify-between gap-2">
        <span class="stat-label">${t('stats.pending')}</span>
        <div class="stat-icon bg-amber-50 dark:bg-amber-950/50"><i data-lucide="clock" class="w-5 h-5 text-amber-600"></i></div>
      </div>
      <p class="stat-value"><span class="count" data-v="totalUnpaid">${moneyUI(totalUnpaid)}</span></p>
    </div>
    <div class="stat-card">
      <div class="flex items-center justify-between gap-2">
        <span class="stat-label">${t('stats.overdue')}</span>
        <div class="stat-icon bg-red-50 dark:bg-red-950/50"><i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i></div>
      </div>
      <p class="stat-value text-red-600"><span class="count" data-v="totalOverdue">${moneyUI(totalOverdue)}</span></p>
    </div>
    <div class="stat-card">
      <div class="flex items-center justify-between gap-2">
        <span class="stat-label">${t('stats.month')}</span>
        <div class="stat-icon bg-indigo-50 dark:bg-indigo-950/50"><i data-lucide="calendar" class="w-5 h-5 text-indigo-600"></i></div>
      </div>
      <p class="stat-value"><span class="count" data-v="thisMonth">${moneyUI(thisMonth)}</span></p>
    </div>
  </div>
  <div class="card overflow-hidden">
    <div class="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-slate-800">
      <h3 class="section-title">${t('inv.recent')}</h3>
      <button onclick="navigate('invoices')" class="text-sm font-medium text-indigo-600 hover:text-indigo-700">${t('actions.seeAll')}</button>
    </div>
    <div class="overflow-x-auto">${renderInvoicesTable(recent,true)}</div>
  </div>
</div>`;}
