/* FacturePro — bon de livraison (delivery note).

   Goods moving in Algeria travel with a document naming what is in the load
   and who received it. The application could bill for merchandise and had no
   way to say it had been handed over.

   Built on the same pattern as the avoir: a type, its own numbering series, a
   reference back to the invoice it belongs to, and nothing else. What makes it
   safe lives elsewhere — calcInvoiceTotals returns zeros for a bon de
   livraison, so the six places that sum revenue, receivables and the journal
   over state.invoices cannot count the same goods a second time.

   It is deliberately not editable as an invoice: the lines are copied from the
   facture at the moment of issue, and a partial delivery is a second bon with
   the quantities changed, which the ordinary editor already does. */

function ensureBlState(){
  if(typeof state.nextBlNumber!=='number' || !isFinite(state.nextBlNumber)){
    /* Rebuilt from the documents rather than assumed, so a backup taken before
       this feature existed still numbers correctly on the next issue. */
    var used=(state.invoices||[]).filter(isBl).map(function(b){
      var m=/(\d+)\s*$/.exec(b.number||''); return m?parseInt(m[1],10):0;
    });
    state.nextBlNumber=used.length?Math.max.apply(null,used)+1:1;
  }
}

function blsFor(invoiceId){
  return (state.invoices||[]).filter(function(i){
    return isBl(i) && i.refInvoiceId===invoiceId;
  });
}

function createBonLivraison(invoiceId){
  ensureBlState();
  var src=(state.invoices||[]).find(function(i){return i.id===invoiceId;});
  if(!src) return toast(t('toast.invoiceNotFound'),'err');
  if(isBl(src)) return toast(t('bl.notOnBl'),'err');
  if(isAvoir(src)) return toast(t('bl.notOnAvoir'),'err');

  /* A second bon is legitimate — a delivery in two loads — so this asks
     rather than refuses, unlike the guards above. */
  var already=blsFor(invoiceId);
  if(already.length && !confirm(t('bl.confirmAgain').replace('{n}',already[0].number))) return;

  var year=new Date().getFullYear();
  var number='BL-'+year+'-'+String(state.nextBlNumber).padStart(3,'0');

  state.invoices.push({
    id:uid(),
    type:'bl',
    number:number,
    refInvoiceId:src.id,
    refNumber:src.number,
    clientId:src.clientId,
    template:src.template,
    date:todayISO(),
    dueDate:'',
    /* Settled on purpose. A bon de livraison is not owed and not owing: this
       keeps it out of Créances and away from the sweep that stamps documents
       "en retard". */
    status:'payee',
    items:JSON.parse(JSON.stringify(src.items||[])),
    notes:''
  });

  state.nextBlNumber++;
  saveData();
  toast(t('bl.created').replace('{n}',number));
  navigate('invoices');
}
