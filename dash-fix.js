function renderDashboard(){const invs=state.invoices.filter(i=>i.status!=='annulee');const paid=invs.filter(i=>i.status==='payee');const unpaid=invs.filter(i=>['envoyee','enretard','brouillon'].includes(i.status));const overdue=invs.filter(i=>i.status==='enretard');const totalPaid=paid.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const totalUnpaid=unpaid.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const totalOverdue=overdue.reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const thisMonth=invs.filter(i=>i.date&&i.date.startsWith(new Date().toISOString().slice(0,7))).reduce((s,i)=>s+calcInvoiceTotals(i).net,0);const recent=[...state.invoices].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);return `
<div class="space-y-6">
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
