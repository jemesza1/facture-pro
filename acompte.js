/* FacturePro — la facture d'acompte et la facture de solde.
 *
 * « 30 % à la commande, le reste à la livraison » se dit dans tous les
 * ateliers du pays, et aucun modèle gratuit ne sait l'écrire correctement.
 * Deux pièges, et les deux coûtent de l'argent :
 *
 *   La TVA. Un acompte de trente pour cent sur une commande qui mélange du
 *   19 % et du 9 % n'est pas « trente pour cent à 19 % ». Il se découpe par
 *   taux : trente pour cent de la base à 19, trente pour cent de la base à 9.
 *   Une seule ligne au taux le plus haut fait payer au client une taxe qu'il
 *   ne doit pas, et la déclaration ne tombe plus.
 *
 *   Le double comptage. Facturer l'acompte puis facturer la totalité, c'est
 *   déclarer deux fois le même chiffre d'affaires et la même taxe. Le solde
 *   doit donc porter la commande entière ET la déduction de ce qui a déjà été
 *   facturé, ligne à ligne, taux par taux.
 *
 * D'où la règle que cette page impose : les deux se tirent d'un BROUILLON.
 * Le brouillon est la commande — il n'est jamais entré dans les comptes, c'est
 * ce que dit le reste de l'application — et l'acompte et le solde sont les
 * deux seules factures émises. Tirer un acompte d'une facture déjà envoyée
 * reviendrait à facturer la commande deux fois et demie.
 *
 * Rien de tout cela ne touche calcInvoiceTotals : ce sont de vraies factures,
 * du chiffre d'affaires et de la TVA comme les autres. Seuls le titre imprimé
 * et la ligne de référence changent. Le journal du mois, le récapitulatif du
 * G50 et le relevé de compte les comptent sans savoir qu'elles existent — et
 * la déduction du solde, qui est une ligne à prix négatif, s'y soustrait
 * d'elle-même.
 */
(function(){
  function ar(){ return (typeof locale!=='undefined' && locale==='ar'); }

  window.acomptesFor=function(invoiceId){
    return (state.invoices||[]).filter(function(i){
      return isAcompte(i) && i.refInvoiceId===invoiceId;
    });
  };
  window.soldesFor=function(invoiceId){
    return (state.invoices||[]).filter(function(i){
      return isSolde(i) && i.refInvoiceId===invoiceId;
    });
  };

  /* La commande, découpée par taux. Même arrondi que calcInvoiceTotals — par
     ligne, avant la somme — pour que la part et le solde retombent ensemble
     sur le total de la commande, au centime. */
  function basesByRate(inv){
    var map={};
    (inv.items||[]).forEach(function(it){
      var rate=Number(it.tva)||0;
      var line=round2((Number(it.qty)||0)*(Number(it.unitPrice)||0));
      map[rate]=round2((map[rate]||0)+line);
    });
    return map;
  }
  function rates(map){
    return Object.keys(map).map(Number).sort(function(a,b){return a-b;});
  }

  function eligible(inv){
    return !!inv && !isAvoir(inv) && !isBl(inv) && !isAcompte(inv) && !isSolde(inv);
  }

  /* --------------------------------------------------------------- *
   * L'acompte
   * --------------------------------------------------------------- */
  window.createAcompte=function(invoiceId, pct){
    var src=(state.invoices||[]).find(function(i){return i.id===invoiceId;});
    if(!src) return toast(t('toast.invoiceNotFound'),'err');
    if(!eligible(src)) return toast(t('acompte.notOnThis'),'err');
    if(src.status!=='brouillon') return toast(t('acompte.draftOnly'),'err');

    if(pct===undefined){
      var typed=prompt(t('acompte.ask'), '30');
      if(typed===null) return;
      pct=parseNum(typed);
    }
    pct=Number(pct);
    if(!isFinite(pct) || pct<=0 || pct>=100) return toast(t('acompte.badPct'),'err');

    var map=basesByRate(src), rs=rates(map);
    if(!rs.length) return toast(t('toast.addLine'),'err');

    var already=acomptesFor(src.id);
    if(already.length && !confirm(t('acompte.confirmAgain').replace('{n}',already[0].number))) return;

    var label=t('acompte.lineLabel');
    var items=rs.map(function(r){
      return {description:label.replace('{p}',String(pct)).replace('{n}',src.number||'—').replace('{t}',String(r)),
              qty:1,
              unitPrice:round2(map[r]*pct/100),
              tva:r};
    }).filter(function(it){ return it.unitPrice!==0; });
    if(!items.length) return toast(t('acompte.badPct'),'err');

    state.invoices.push({
      id:uid(),
      type:'acompte',
      number:nextSerialNumber('FAC','nextInvoiceNumber'),
      refInvoiceId:src.id,
      refNumber:src.number,
      acomptePct:pct,
      clientId:src.clientId,
      template:src.template,
      date:todayISO(),
      dueDate:'',
      /* Émise pour être payée, pas encore encaissée : le commerçant la relit
         et l'envoie. Un statut « payée » posé d'office ferait entrer au
         chiffre d'affaires de l'argent que personne n'a versé. */
      status:'brouillon',
      paymentMode:src.paymentMode,
      /* Le port se facture à la livraison, donc sur le solde. Le mettre ici
         le ferait payer avant que rien n'ait bougé — et deux fois, puisque le
         solde le porte aussi. */
      fraisPort:0,
      items:items,
      notes:t('acompte.notes').replace('{n}',src.number||'')
    });
    saveData();
    toast(t('acompte.created').replace('{p}',String(pct)));
    navigate('invoices');
  };

  /* --------------------------------------------------------------- *
   * Le solde
   * --------------------------------------------------------------- */
  window.createSolde=function(invoiceId){
    var src=(state.invoices||[]).find(function(i){return i.id===invoiceId;});
    if(!src) return toast(t('toast.invoiceNotFound'),'err');
    if(!eligible(src)) return toast(t('acompte.notOnThis'),'err');
    if(src.status!=='brouillon') return toast(t('acompte.draftOnly'),'err');

    var acs=acomptesFor(src.id).filter(function(a){ return a.status!=='annulee'; });
    if(!acs.length) return toast(t('acompte.noneYet'),'err');

    var already=soldesFor(src.id);
    if(already.length && !confirm(t('acompte.soldeAgain').replace('{n}',already[0].number))) return;

    /* La commande entière, puis la déduction de ce qui a déjà été facturé.
       Ligne à ligne et taux par taux : une déduction globale au taux le plus
       haut rendrait au client une taxe qu'il n'a pas payée. */
    var items=JSON.parse(JSON.stringify(src.items||[]));
    var label=t('acompte.deductLabel');
    acs.forEach(function(a){
      var map=basesByRate(a);
      rates(map).forEach(function(r){
        if(!map[r]) return;
        items.push({description:label.replace('{n}',a.number||'').replace('{t}',String(r)),
                    qty:1, unitPrice:round2(-map[r]), tva:r});
      });
    });

    state.invoices.push({
      id:uid(),
      type:'solde',
      number:nextSerialNumber('FAC','nextInvoiceNumber'),
      refInvoiceId:src.id,
      refNumber:src.number,
      clientId:src.clientId,
      template:src.template,
      date:todayISO(),
      dueDate:src.dueDate||'',
      status:'brouillon',
      paymentMode:src.paymentMode,
      fraisPort:Number(src.fraisPort)||0,
      items:items,
      notes:t('acompte.soldeNotes').replace('{n}',acs.map(function(a){return a.number;}).join(', '))
    });

    /* La marchandise part avec le solde, pas avec l'acompte : c'est lui qui
       sort le stock, par la règle qui gouverne tout autre mouvement. */
    if(typeof markStockNew==='function'){
      markStockNew(state.invoices[state.invoices.length-1]);
      if(typeof reconcileStock==='function') reconcileStock();
    }
    saveData();
    toast(t('acompte.soldeCreated'));
    navigate('invoices');
  };

  /* --------------------------------------------------------------- *
   * Les deux boutons de la barre d'aperçu
   * --------------------------------------------------------------- */
  function paint(){
    var inv=(state.invoices||[]).find(function(i){return i.id===window._previewInvId;});
    var can=eligible(inv) && inv.status==='brouillon';
    var a=document.getElementById('btn-acompte');
    if(a){
      a.classList.toggle('hidden', !can);
      var la=a.querySelector('span'); if(la) la.textContent=t('acompte.action');
    }
    var s=document.getElementById('btn-solde');
    if(s){
      s.classList.toggle('hidden', !(can && acomptesFor(inv.id).length));
      var ls=s.querySelector('span'); if(ls) ls.textContent=t('acompte.soldeAction');
    }
  }
  window.paintAcompteButtons=paint;

  (function(){
    var prev=window.previewInvoice;
    if(typeof prev!=='function') return;
    window.previewInvoice=function(){
      var out=prev.apply(this, arguments);
      try{ paint(); }catch(e){}
      return out;
    };
  })();
})();
