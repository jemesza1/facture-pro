/* FacturePro — facture d'avoir (credit note).

   An issued invoice is not corrected by editing it or by flipping it to
   "Annulée". Once it has gone to the client and into a declaration, the way
   back is a second document that credits it: its own number, its own date,
   the same lines, the opposite sign. That is what an accountant asks for and
   what the application had no way to produce.

   The sign lives in calcInvoiceTotals and nowhere else — see the note there.
   Everything in this file is about identity and numbering, not arithmetic.

   Scope: a full credit of an invoice. Crediting part of one means editing the
   lines of the avoir afterwards, which the ordinary invoice editor already
   does. */

function ensureAvoirState(){
  if(typeof state.nextAvoirNumber!=='number' || !isFinite(state.nextAvoirNumber)){
    /* Recovered from the data rather than assumed: a backup restored from a
       version that never knew about avoirs still has to keep its numbering. */
    var used=(state.invoices||[]).filter(isAvoir).map(function(a){
      var m=/(\d+)\s*$/.exec(a.number||''); return m?parseInt(m[1],10):0;
    });
    state.nextAvoirNumber=used.length?Math.max.apply(null,used)+1:1;
  }
}

function avoirsFor(invoiceId){
  return (state.invoices||[]).filter(function(i){
    return isAvoir(i) && i.refInvoiceId===invoiceId;
  });
}

function createAvoir(invoiceId){
  ensureAvoirState();
  var src=(state.invoices||[]).find(function(i){return i.id===invoiceId;});
  if(!src) return toast(t('toast.invoiceNotFound'),'err');
  if(isAvoir(src)) return toast(t('avoir.notOnAvoir'),'err');
  /* A draft was never issued, so there is nothing to credit — delete it. */
  if(src.status==='brouillon') return toast(t('avoir.notOnDraft'),'err');

  var already=avoirsFor(invoiceId);
  if(already.length && !confirm(t('avoir.confirmAgain').replace('{n}',already[0].number))) return;
  if(!confirm(t('avoir.confirm').replace('{n}',src.number))) return;

  var number=nextSerialNumber('AV','nextAvoirNumber');

  state.invoices.push({
    id:uid(),
    type:'avoir',
    number:number,
    refInvoiceId:src.id,
    refNumber:src.number,
    clientId:src.clientId,
    template:src.template,
    date:todayISO(),
    dueDate:'',
    /* Settled on purpose. An avoir is not a receivable, and this keeps it out
       of Créances and away from the sweep that stamps invoices "en retard". */
    status:'payee',
    /* Carried over so the stamp duty is credited back exactly as it was
       charged: on a cash invoice it was part of what the client paid.

       Le port l'accompagne, et ce n'est pas un detail de forme : le timbre est
       calcule sur ttc + port (a.js, calcInvoiceTotals). Sans le port, l'avoir
       recalcule le timbre sur une base plus petite et ne rend pas ce qui a ete
       pris. Une facture de 77 546 DA entierement avoiree laissait 5 075 DA de
       chiffre d'affaires fantome et 75 DA de timbre au journal du mois — pour
       une operation qui doit se solder a zero. Le port a ete ajoute a
       l'application apres l'avoir, et personne n'est revenu ici. */
    paymentMode:src.paymentMode,
    fraisPort:Number(src.fraisPort)||0,
    items:JSON.parse(JSON.stringify(src.items||[])),
    notes:t('avoir.notes').replace('{n}',src.number)
  });

  /* An avoir is goods coming back. commerce.js owns the shelf and cannot wrap
     this function — it is loaded first — so the new document is declared here
     and reconciled there, by the one rule that governs every other movement. */
  if(typeof markStockNew==='function'){
    markStockNew(state.invoices[state.invoices.length-1]);
    if(typeof reconcileStock==='function') reconcileStock();
  }
  saveData();
  toast(t('avoir.created').replace('{n}',number));
  navigate('invoices');
}

/* The button sits in the preview toolbar: you look at the invoice, then decide
   to credit it. Hidden while the preview is showing an avoir or a draft, so it
   never offers something createAvoir would only refuse. */
function paintAvoirButton(){
  var btn=document.getElementById('btn-avoir');
  if(!btn) return;
  var inv=(state.invoices||[]).find(function(i){return i.id===window._previewInvId;});
  var can=!!inv && !isAvoir(inv) && inv.status!=='brouillon';
  btn.classList.toggle('hidden', !can);
  var label=btn.querySelector('span');
  if(label) label.textContent=t('avoir.action');
}

(function(){
  /* previewInvoice is defined in c2.js and reassigned nowhere else, but wrap
     rather than edit: the same lesson the backup stamp taught. */
  var prev=window.previewInvoice;
  if(typeof prev!=='function') return;
  window.previewInvoice=function(){
    var out=prev.apply(this, arguments);
    try{ paintAvoirButton(); }catch(e){}
    return out;
  };
})();
