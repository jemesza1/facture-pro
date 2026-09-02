/* FacturePro — cinq mises en page de facture reprises sur des modeles reels.
 *
 * Les cinq qui existaient jusqu'ici sortaient de la meme idee : un bandeau, un
 * tableau, un bloc de totaux. Ce que les commercants montrent quand on leur
 * demande a quoi ressemble une facture, ce sont d'autres papiers — celui du
 * comptable francais avec son encadre et ses conditions de reglement, le
 * modele bleu de tableur qu'on trouve partout, la facture sobre a
 * l'allemande avec son recapitulatif de TVA par taux, la facture epuree au
 * titre centre. Les voici.
 *
 * Aucune n'ecrase les anciennes. Une facture deja emise porte l'identifiant
 * de son modele et doit continuer de s'imprimer comme elle a ete envoyee ;
 * celles-ci s'ajoutent et passent devant dans la galerie.
 *
 * Deux regles traversent les cinq :
 *
 *   La colonne TVA disparait quand l'entreprise n'est pas assujettie et que le
 *   document ne porte effectivement aucune taxe (hideTva). Une colonne a zero
 *   laisse croire a un taux zero, qui est autre chose qu'un hors-champ. La
 *   mention et son fondement prennent sa place.
 *
 *   La signature deposee dans les reglages est imprimee la ou le papier la
 *   demande. Faute de signature, le trait a signer a la main reste.
 */

/* Une ligne, signee avec le document : un avoir affiche -20 000 sur la ligne
   comme dans le total, sans quoi le papier ne s'additionne pas. */
function proLine(inv, it){
  return (it.qty||0)*(it.unitPrice||0)*(isAvoir(inv)?-1:1);
}

/* Le recapitulatif par taux qu'attend une declaration. Meme arrondi que
   calcInvoiceTotals — par ligne, avant la somme — sinon le tableau ne tombe
   pas sur le total imprime a cote de lui. */
function proVatRecap(inv){
  var map={}, sign=isAvoir(inv)?-1:1;
  (inv.items||[]).forEach(function(it){
    var rate=Number(it.tva)||0;
    var line=round2((Number(it.qty)||0)*(Number(it.unitPrice)||0));
    if(!map[rate]) map[rate]={base:0,tva:0};
    map[rate].base+=line*sign;
    map[rate].tva+=round2(vatAmount(line,rate))*sign;
  });
  return Object.keys(map).map(Number).sort(function(a,b){return a-b;})
    .map(function(r){ return {rate:r, base:round2(map[r].base), tva:round2(map[r].tva)}; });
}

/* Les identifiants que l'administration exige, sur une ligne. */
function proIds(e){
  var L=[];
  if(e.nif)L.push('NIF : '+e.nif);
  /* Le NIN identifie la personne physique. Il manquait, et le harnais l'a
     dit : c'est une mention que l'administration attend, pas une decoration. */
  if(e.nin)L.push('NIN : '+e.nin);
  if(e.nis)L.push('NIS : '+e.nis);
  if(e.rc)L.push('RC : '+e.rc);
  if(e.ai)L.push('AI : '+e.ai);
  return L.join(' &nbsp;·&nbsp; ');
}

/* Les lignes de bas de page communes : mode de reglement, somme en lettres,
   notes libres, mention de non-assujettissement. */
function proFooterNotes(inv, opts){
  opts=opts||{};
  return '<div style="margin-top:10px;font-size:10.5px;color:#64748b">Mode de règlement : '+payLabel(inv)+'</div>'+
    '<div style="margin-top:6px;font-size:11px;font-style:italic">'+wordsLead(inv)+' : <strong>'+amountInWords(calcInvoiceTotals(inv).net)+'</strong></div>'+
    exemptNote(inv)+
    /* Les mises en page qui reservent deja un encadre aux remarques ne les
       reprennent pas ici : imprimees deux fois sur la meme page, elles
       donnent l'air d'un document mal relu. */
    ((inv.notes && opts.notes!==false)?'<div style="white-space:pre-line;margin-top:8px;font-size:11px;color:#64748b">'+esc(inv.notes)+'</div>':'');
}

/* ---------------------------------------------------------------- *
 * 1. Classique FR — l'encadre lavande et les conditions de reglement
 * ---------------------------------------------------------------- */
function renderInvoiceFrBox(inv,tpl){
  var company=escObj(state.company), client=escObj(getClient(inv.clientId));
  var totals=calcInvoiceTotals(inv), c=tpl.color||'#3730a3', bg=tpl.bg||'#e8eaf6';
  var noTva=hideTva(inv);
  var recap=proVatRecap(inv).filter(function(r){return r.rate>0;});
  var rows=(inv.items||[]).map(function(it){
    var line=proLine(inv,it);
    return '<tr>'+
      '<td style="border:1px solid #cbd5e1;padding:7px;text-align:center;font-size:11.5px;vertical-align:top">'+esc(String(it.qty||0))+(it.unite?' '+esc(it.unite):'')+'</td>'+
      '<td style="border:1px solid #cbd5e1;padding:7px;font-size:11.5px;vertical-align:top">'+esc(it.description)+'</td>'+
      (noTva?'':'<td style="border:1px solid #cbd5e1;padding:7px;text-align:center;font-size:11.5px;vertical-align:top">'+esc(String(it.tva||0))+'</td>')+
      '<td style="border:1px solid #cbd5e1;padding:7px;text-align:right;font-size:11.5px;vertical-align:top">'+formatMoney(it.unitPrice)+'</td>'+
      '<td style="border:1px solid #cbd5e1;padding:7px;text-align:right;font-size:11.5px;vertical-align:top">'+formatMoney(line)+'</td></tr>';
  }).join('');
  var cols=noTva?4:5;
  return '<div class="invoice-paper" id="invoice-paper" style="padding:34px 38px;font-family:Inter,Arial,sans-serif;color:#0f172a">'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">'+
      '<div style="min-width:0">'+
        (company.logo?'<img src="'+company.logo+'" style="max-height:44px;max-width:120px;object-fit:contain;margin-bottom:6px"/>':'')+
        '<div style="font-size:17px;font-weight:800;letter-spacing:-.01em">'+(company.name||'')+'</div>'+
        '<div style="font-size:11.5px;font-weight:700;color:#475569;margin-bottom:8px">'+(company.activite||'')+'</div>'+
        '<div style="font-size:11px;color:#475569;white-space:pre-line;line-height:1.7">'+(company.address||'')+'</div>'+
        (company.phone?'<div style="font-size:11px;color:#475569">'+company.phone+'</div>':'')+
        (company.email?'<div style="font-size:11px;color:#475569">'+company.email+'</div>':'')+
      '</div>'+
      '<div style="background:'+bg+';border:1px solid '+c+';padding:14px 20px;min-width:230px">'+
        '<div style="font-size:19px;font-weight:800;letter-spacing:.22em;color:'+c+'">'+docTitle(inv)+
          '<span style="font-size:11px;font-weight:600;letter-spacing:0;color:#334155"> n°: '+esc(inv.number)+'</span></div>'+
        '<div style="font-size:11.5px;font-weight:700;margin-top:8px">Date&nbsp;: <span style="font-weight:500">'+formatDate(inv.date)+'</span></div>'+
        (inv.dueDate?'<div style="font-size:11.5px;font-weight:700">Échéance&nbsp;: <span style="font-weight:500">'+formatDate(inv.dueDate)+'</span></div>':'')+
        refLine(inv)+
      '</div>'+
    '</div>'+
    '<div style="margin-top:26px;text-align:right">'+
      '<div style="font-weight:700;font-size:13px">'+client.name+'</div>'+
      '<div style="font-size:11px;color:#475569;white-space:pre-line;line-height:1.7">'+(client.address||'')+'</div>'+
      (proIds(client)?'<div style="font-size:9.5px;color:#64748b;margin-top:3px">'+proIds(client)+'</div>':'')+
    '</div>'+
    (inv.objet?'<div style="margin-top:26px;font-size:13px;font-weight:700">intitulé : '+esc(inv.objet)+'</div>':'<div style="margin-top:22px"></div>')+
    '<table style="width:100%;border-collapse:collapse;margin-top:12px">'+
      '<thead><tr style="background:#f1f5f9">'+
        '<th style="border:1px solid #94a3b8;padding:7px;font-size:11px;width:52px">Qté</th>'+
        '<th style="border:1px solid #94a3b8;padding:7px;font-size:11px">Désignation</th>'+
        (noTva?'':'<th style="border:1px solid #94a3b8;padding:7px;font-size:11px;width:44px">Tva</th>')+
        '<th style="border:1px solid #94a3b8;padding:7px;font-size:11px;width:82px">Prix Unit.</th>'+
        '<th style="border:1px solid #94a3b8;padding:7px;font-size:11px;width:88px">Total HT</th>'+
      '</tr></thead><tbody>'+rows+
      '<tr><td colspan="'+cols+'" style="border:1px solid #cbd5e1;border-top:0;height:90px"></td></tr>'+
      '</tbody></table>'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-top:14px">'+
      '<div style="font-size:11.5px;color:#334155;padding-top:2px">Facture en dinars algériens</div>'+
      '<div style="width:250px;font-size:11.5px">'+
        '<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="font-weight:600">Total HT</span><span>'+formatMoney(totals.ht)+'</span></div>'+
        (noTva?'':recap.map(function(r){
          return '<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Tva '+r.rate+',00&nbsp;%</span><span>'+formatMoney(r.tva)+'</span></div>';
        }).join(''))+
        (totals.port?'<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Frais de port</span><span>'+formatMoney(totals.port)+'</span></div>':'')+
        (totals.timbre?'<div style="display:flex;justify-content:space-between;padding:3px 0"><span>Droit de timbre</span><span>'+formatMoney(totals.timbre)+'</span></div>':'')+
        '<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:1px solid #334155;font-weight:800;font-size:13px"><span>'+((totals.port||totals.timbre)?'Net à payer':'Total TTC')+'</span><span>'+formatMoney(totals.net)+'</span></div>'+
      '</div>'+
    '</div>'+
    '<div style="margin-top:16px;font-size:11.5px">En votre aimable règlement<br/>Cordialement,</div>'+
    proFooterNotes(inv)+
    '<div style="margin-top:14px;font-size:10px;color:#334155;line-height:1.85">'+
      '<div>Conditions de règlement : '+payLabel(inv)+', à réception de facture.</div>'+
      '<div>Aucun escompte consenti pour règlement anticipé.</div>'+
      '<div>Tout incident de paiement est passible d’intérêts de retard au taux légal en vigueur au moment de l’incident.</div>'+
    '</div>'+
    '<div style="display:flex;justify-content:flex-end;margin-top:18px">'+signatureBlock({})+'</div>'+
    '<div style="margin-top:22px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:9px;color:#64748b;line-height:1.8">'+
      (proIds(company)?'<div>'+proIds(company)+'</div>':'')+
      (company.rib?'<div>'+(company.banque||'')+(company.banque?' — ':'')+'RIB : '+company.rib+'</div>':'')+
    '</div>'+
  '</div>';
}

/* ---------------------------------------------------------------- *
 * 2 et 3. Bleu — le modele de tableur, avec ou sans quantites
 * ---------------------------------------------------------------- */
function renderInvoiceBleu(inv,tpl,withQty){
  var company=escObj(state.company), client=escObj(getClient(inv.clientId));
  var totals=calcInvoiceTotals(inv), b=tpl.color||'#1f7ac4', b2=tpl.color2||'#2f8fd8';
  var noTva=hideTva(inv);
  var span=withQty?(noTva?3:4):(noTva?1:2);
  var rows=(inv.items||[]).map(function(it,i){
    var line=proLine(inv,it), bgc=i%2?'#f5f9fd':'#ffffff';
    return '<tr style="background:'+bgc+'">'+
      '<td style="border:1px solid #cfe0f0;padding:6px 8px;font-size:11.5px">'+esc(it.description)+'</td>'+
      (withQty?'<td style="border:1px solid #cfe0f0;padding:6px 8px;text-align:center;font-size:11.5px">'+esc(String(it.qty||0))+(it.unite?' '+esc(it.unite):'')+'</td>'+
               '<td style="border:1px solid #cfe0f0;padding:6px 8px;text-align:right;font-size:11.5px">'+formatMoney(it.unitPrice)+'</td>':'')+
      (noTva?'':'<td style="border:1px solid #cfe0f0;padding:6px 8px;text-align:center;font-size:11.5px">'+esc(String(it.tva||0))+'&nbsp;%</td>')+
      '<td style="border:1px solid #cfe0f0;padding:6px 8px;text-align:right;font-size:11.5px">'+formatMoney(line)+'</td></tr>';
  }).join('');
  /* Les capitales sont une affaire de style, pas de texte : ecrites en dur
     elles rendraient « NET À PAYER » illisible pour tout ce qui lit le
     document — le harnais, un lecteur d'ecran, une recherche dans le PDF. */
  var box=function(label,value,strong){
    return '<tr>'+
      '<td style="background:'+(strong?b:'#eaf2fb')+';color:'+(strong?'#fff':'#1e3a5f')+';border:1px solid #cfe0f0;padding:7px 10px;font-size:11.5px;font-weight:700;text-transform:uppercase">'+label+'</td>'+
      '<td style="background:'+(strong?b:'#f5f9fd')+';color:'+(strong?'#fff':'#0f172a')+';border:1px solid #cfe0f0;padding:7px 10px;font-size:'+(strong?'13px':'11.5px')+';font-weight:'+(strong?'800':'600')+';text-align:right">'+value+'</td></tr>';
  };
  var recap=proVatRecap(inv).filter(function(r){return r.rate>0;});
  var party=function(title,name,addr,ids){
    return '<div style="flex:1;min-width:0">'+
      '<div style="background:'+b+';color:#fff;font-weight:700;font-size:11.5px;padding:5px 10px">'+title+'</div>'+
      '<div style="padding:8px 10px 0;font-size:11.5px;color:#1e3a5f;line-height:1.75">'+
        '<div style="font-weight:700">'+name+'</div>'+
        '<div style="white-space:pre-line">'+(addr||'')+'</div>'+
        (ids?'<div style="font-size:9.5px;color:#64748b;margin-top:3px">'+ids+'</div>':'')+
      '</div></div>';
  };
  return '<div class="invoice-paper" id="invoice-paper" style="padding:30px 34px;font-family:Inter,Arial,sans-serif;color:#0f172a">'+
    '<div style="font-size:27px;font-weight:800;color:'+b+';letter-spacing:-.02em;text-transform:uppercase;margin-bottom:16px">'+docTitle(inv)+'</div>'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:22px">'+
      '<div style="min-width:0">'+
        (company.logo?'<img src="'+company.logo+'" style="max-height:50px;max-width:150px;object-fit:contain;margin-bottom:8px"/>':'')+
        '<div style="font-size:12.5px;color:'+b+';font-weight:700;line-height:1.8">'+(company.name||'')+'</div>'+
        '<div style="font-size:11.5px;color:'+b2+';white-space:pre-line;line-height:1.8">'+(company.address||'')+'</div>'+
        (company.phone?'<div style="font-size:11.5px;color:'+b2+'">'+company.phone+'</div>':'')+
        (company.email?'<div style="font-size:11.5px;color:'+b2+'">'+company.email+'</div>':'')+
      '</div>'+
      '<table style="border-collapse:collapse;min-width:250px">'+
        '<tr><td style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:5px 10px;font-size:10.5px;font-weight:700">N° DE '+docTitle(inv)+'</td>'+
            '<td style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:5px 10px;font-size:10.5px;font-weight:700">DATE</td></tr>'+
        '<tr><td style="border:1px solid #cfe0f0;padding:5px 10px;font-size:11.5px;text-align:center">'+esc(inv.number)+'</td>'+
            '<td style="border:1px solid #cfe0f0;padding:5px 10px;font-size:11.5px;text-align:center">'+formatDate(inv.date)+'</td></tr>'+
        '<tr><td style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:5px 10px;font-size:10.5px;font-weight:700">MODALITÉS</td>'+
            '<td style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:5px 10px;font-size:10.5px;font-weight:700">ÉCHÉANCE</td></tr>'+
        '<tr><td style="border:1px solid #cfe0f0;padding:5px 10px;font-size:11.5px;text-align:center">'+payLabel(inv)+'</td>'+
            '<td style="border:1px solid #cfe0f0;padding:5px 10px;font-size:11.5px;text-align:center">'+(inv.dueDate?formatDate(inv.dueDate):'—')+'</td></tr>'+
      '</table>'+
    '</div>'+
    '<div style="display:flex;gap:18px;margin-top:20px">'+
      party('FACTURÉ À :', client.name, client.address, proIds(client))+
      party('ÉMIS PAR :', company.name, company.address, proIds(company))+
    '</div>'+
    (inv.objet?'<div style="margin-top:16px;font-size:12px;font-weight:700;color:#1e3a5f">Objet : <span style="font-weight:500">'+esc(inv.objet)+'</span></div>':'')+
    '<table style="width:100%;border-collapse:collapse;margin-top:'+(inv.objet?'10px':'20px')+'">'+
      '<thead><tr>'+
        '<th style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:7px 8px;font-size:11px;text-align:left">DESCRIPTION</th>'+
        (withQty?'<th style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:7px 8px;font-size:11px;width:58px">QTÉ</th>'+
                 '<th style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:7px 8px;font-size:11px;width:100px">PRIX UNITAIRE</th>':'')+
        (noTva?'':'<th style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:7px 8px;font-size:11px;width:56px">TVA</th>')+
        '<th style="background:'+b+';color:#fff;border:1px solid #cfe0f0;padding:7px 8px;font-size:11px;width:100px">MONTANT</th>'+
      '</tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-top:16px">'+
      '<div style="flex:1;min-width:0;font-size:11px;color:#475569">'+
        (inv.notes?'<div style="font-weight:700;margin-bottom:3px">Remarques / instructions :</div><div style="white-space:pre-line">'+esc(inv.notes)+'</div>':'')+
      '</div>'+
      '<table style="border-collapse:collapse;min-width:265px">'+
        box('Sous-total HT', formatMoney(totals.ht))+
        (noTva?'':recap.map(function(r){return box('Taxe ('+r.rate+'&nbsp;%)', formatMoney(r.tva));}).join(''))+
        (totals.port?box('Expédition', formatMoney(totals.port)):'')+
        (totals.timbre?box('Droit de timbre', formatMoney(totals.timbre)):'')+
        box((totals.port||totals.timbre)?'Net à payer':'Total', formatMoney(totals.net), true)+
      '</table>'+
    '</div>'+
    proFooterNotes(inv,{notes:false})+
    '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:22px">'+
      '<div style="font-size:20px;font-weight:800;color:'+b+'">MERCI</div>'+
      signatureBlock({})+
    '</div>'+
    '<div style="margin-top:16px;text-align:center;font-size:10px;color:'+b2+';font-style:italic;line-height:1.8">'+
      'Pour toute question concernant cette facture, contactez '+(company.name||'')+
      (company.phone?', '+company.phone:'')+(company.email?', '+company.email:'')+
      (company.rib?'<div style="font-style:normal;color:#64748b">'+(company.banque||'')+(company.banque?' — ':'')+'RIB : '+company.rib+'</div>':'')+
    '</div>'+
  '</div>';
}
function renderInvoiceBleuQty(inv,tpl){ return renderInvoiceBleu(inv,tpl,true); }
function renderInvoiceBleuFlat(inv,tpl){ return renderInvoiceBleu(inv,tpl,false); }

/* ---------------------------------------------------------------- *
 * 4. Sobre — le recapitulatif de TVA par taux, sous le tableau
 * ---------------------------------------------------------------- */
function renderInvoiceSobre(inv,tpl){
  var company=escObj(state.company), client=escObj(getClient(inv.clientId));
  var totals=calcInvoiceTotals(inv), g=tpl.color||'#475569';
  var noTva=hideTva(inv);
  var recap=proVatRecap(inv).filter(function(r){return r.rate>0;});
  var rows=(inv.items||[]).map(function(it){
    var line=proLine(inv,it);
    return '<tr>'+
      '<td style="padding:9px 10px;font-size:11.5px;border-bottom:1px solid #e2e8f0">'+esc(it.description)+'</td>'+
      '<td style="padding:9px 8px;font-size:11.5px;text-align:center;border-bottom:1px solid #e2e8f0">'+esc(String(it.qty||0))+'</td>'+
      '<td style="padding:9px 8px;font-size:11.5px;text-align:center;border-bottom:1px solid #e2e8f0">'+(it.unite?esc(it.unite):'—')+'</td>'+
      '<td style="padding:9px 8px;font-size:11.5px;text-align:right;border-bottom:1px solid #e2e8f0">'+formatMoney(it.unitPrice)+'</td>'+
      '<td style="padding:9px 8px;font-size:11.5px;text-align:right;border-bottom:1px solid #e2e8f0">'+formatMoney(line)+'</td>'+
      (noTva?'':'<td style="padding:9px 10px;font-size:11.5px;text-align:right;border-bottom:1px solid #e2e8f0">'+esc(String(it.tva||0))+'&nbsp;%</td>')+
      '</tr>';
  }).join('');
  var th=function(label,align,w){
    return '<th style="padding:9px 10px;font-size:10.5px;font-weight:700;text-align:'+(align||'left')+';color:#334155'+(w?';width:'+w:'')+'">'+label+'</th>';
  };
  return '<div class="invoice-paper" id="invoice-paper" style="padding:34px 38px;font-family:Inter,Arial,sans-serif;color:#0f172a">'+
    '<div style="font-size:10.5px;color:#334155;line-height:1.65">'+
      '<div style="font-weight:700;border-bottom:1px solid #94a3b8;display:inline-block">'+(company.name||'')+'</div>'+
      '<div style="white-space:pre-line">'+(company.address||'')+'</div>'+
    '</div>'+
    '<div style="text-align:right;margin-top:26px;font-size:12px;font-weight:700;line-height:1.65">'+
      '<div>'+client.name+'</div>'+
      '<div style="font-weight:500;white-space:pre-line">'+(client.address||'')+'</div>'+
      (proIds(client)?'<div style="font-weight:400;font-size:9.5px;color:#64748b;margin-top:3px">'+proIds(client)+'</div>':'')+
    '</div>'+
    '<div style="background:#e2e8f0;padding:8px 14px;margin-top:26px;text-align:right;font-size:15px;font-weight:800;letter-spacing:.02em;color:#0f172a">'+docTitle(inv)+'</div>'+
    '<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px">'+
      '<div style="font-size:11.5px;font-weight:700;line-height:1.9">'+
        '<div>Numéro : <span style="font-weight:500">'+esc(inv.number)+'</span></div>'+
        '<div>Date : <span style="font-weight:500">'+formatDate(inv.date)+'</span></div>'+
        (inv.dueDate?'<div>Échéance : <span style="font-weight:500">'+formatDate(inv.dueDate)+'</span></div>':'')+
        refLine(inv)+
      '</div>'+
      '<div style="font-size:10px;color:#64748b">page 1</div>'+
    '</div>'+
    (inv.objet?'<div style="margin-top:10px;font-size:12px;font-weight:700">Objet : <span style="font-weight:500">'+esc(inv.objet)+'</span></div>':'')+
    '<table style="width:100%;border-collapse:collapse;margin-top:14px;border:1px solid #cbd5e1">'+
      '<thead><tr style="background:#e2e8f0">'+
        th('Description')+th('Quantité','center','62px')+th('Unité','center','58px')+
        th('Prix unitaire HT','right','96px')+th('Total HT','right','96px')+(noTva?'':th('TVA','right','56px'))+
      '</tr></thead><tbody>'+rows+'</tbody></table>'+
    '<div style="display:flex;gap:16px;margin-top:16px;align-items:flex-start">'+
      (noTva?'<div style="flex:1"></div>':
      '<table style="border-collapse:collapse;border:1px solid #cbd5e1;font-size:11px;flex:1">'+
        '<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0"></td>'+
            '<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">Total HT</td>'+
            '<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700">Total TVA</td></tr>'+
        recap.map(function(r){
          return '<tr><td style="padding:6px 10px;border-bottom:1px solid #f1f5f9">TVA '+r.rate+'&nbsp;%</td>'+
            '<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right">'+formatMoney(r.base)+'</td>'+
            '<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;text-align:right">'+formatMoney(r.tva)+'</td></tr>';
        }).join('')+
      '</table>')+
      '<table style="border-collapse:collapse;border:1px solid #cbd5e1;font-size:11.5px;min-width:245px">'+
        '<tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">Total HT</td>'+
            '<td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">'+formatMoney(totals.ht)+'</td></tr>'+
        (noTva?'':recap.map(function(r){
          return '<tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">TVA '+r.rate+'&nbsp;%</td>'+
            '<td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">'+formatMoney(r.tva)+'</td></tr>';
        }).join(''))+
        (totals.port?'<tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">Frais de port</td><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;text-align:right">'+formatMoney(totals.port)+'</td></tr>':'')+
        (totals.timbre?'<tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0">Droit de timbre</td><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;text-align:right">'+formatMoney(totals.timbre)+'</td></tr>':'')+
        '<tr style="background:#e2e8f0"><td style="padding:8px 12px;font-weight:800">'+((totals.port||totals.timbre)?'Net à payer':'Total TTC')+'</td>'+
            '<td style="padding:8px 12px;text-align:right;font-weight:800">'+formatMoney(totals.net)+'</td></tr>'+
      '</table>'+
    '</div>'+
    proFooterNotes(inv)+
    '<div style="margin-top:14px;font-size:11px;color:#334155;line-height:1.8">'+
      '<div>Conditions de paiement : à réception de facture.</div>'+
      '<div style="margin-top:8px">Nous vous remercions de votre confiance.<br/>Cordialement.</div>'+
    '</div>'+
    '<div style="display:flex;justify-content:space-between;gap:20px;margin-top:26px;padding-top:12px;border-top:1px solid '+g+';font-size:9.5px;color:#475569;line-height:1.75">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-weight:700">'+(company.name||'')+'</div>'+
        '<div style="white-space:pre-line">'+(company.address||'')+'</div>'+
        (company.phone?'<div>Tél. : '+company.phone+'</div>':'')+
        (company.email?'<div>'+company.email+'</div>':'')+
      '</div>'+
      '<div style="flex:1;min-width:0">'+
        (company.rib?'<div style="font-weight:700">Coordonnées bancaires</div><div>'+(company.banque||'')+'</div><div>RIB : '+company.rib+'</div>':'')+
        (proIds(company)?'<div style="margin-top:4px">'+proIds(company)+'</div>':'')+
      '</div>'+
      signatureBlock({label:'Le gérant', width:140})+
    '</div>'+
  '</div>';
}

/* ---------------------------------------------------------------- *
 * 5. Épuré — titre centre, filets fins, rien d'autre
 * ---------------------------------------------------------------- */
function renderInvoiceEpure(inv,tpl){
  var company=escObj(state.company), client=escObj(getClient(inv.clientId));
  var totals=calcInvoiceTotals(inv), c=tpl.color||'#0f172a';
  var noTva=hideTva(inv);
  var recap=proVatRecap(inv).filter(function(r){return r.rate>0;});
  var rows=(inv.items||[]).map(function(it){
    var line=proLine(inv,it);
    return '<tr>'+
      '<td style="padding:10px 0;font-size:13px">'+esc(it.description)+'</td>'+
      '<td style="padding:10px 8px;font-size:13px;text-align:right">'+esc(String(it.qty||0))+(it.unite?' '+esc(it.unite):'')+'</td>'+
      '<td style="padding:10px 8px;font-size:13px;text-align:right">'+formatMoney(it.unitPrice)+'</td>'+
      (noTva?'':'<td style="padding:10px 8px;font-size:13px;text-align:right">'+esc(String(it.tva||0))+'&nbsp;%</td>')+
      '<td style="padding:10px 0;font-size:13px;text-align:right">'+formatMoney(line)+'</td></tr>';
  }).join('');
  var col=function(a,b,cc){
    return '<div style="flex:1;min-width:0;text-align:'+(cc||'left')+'">'+a+b+'</div>';
  };
  return '<div class="invoice-paper" id="invoice-paper" style="padding:40px 44px;font-family:Inter,Arial,sans-serif;color:#0f172a">'+
    (company.logo?'<img src="'+company.logo+'" style="max-height:56px;max-width:190px;object-fit:contain"/>':
      '<div style="font-size:19px;font-weight:800;color:'+c+'">'+(company.name||'')+'</div>')+
    '<div style="height:1px;background:#cbd5e1;margin:24px 0 20px"></div>'+
    '<div style="display:flex;justify-content:space-between;gap:24px">'+
      '<div style="min-width:0">'+
        '<div style="font-size:12.5px;color:#475569">Destinataire :</div>'+
        '<div style="font-size:14px;font-weight:700;margin-top:2px">'+client.name+'</div>'+
        '<div style="font-size:12.5px;color:#334155;white-space:pre-line;line-height:1.7">'+(client.address||'')+'</div>'+
        (proIds(client)?'<div style="font-size:10px;color:#64748b;margin-top:3px">'+proIds(client)+'</div>':'')+
      '</div>'+
      '<div style="text-align:right;font-size:12.5px;color:#334155;line-height:1.9">'+
        '<div>Date de facturation : <strong>'+formatDate(inv.date)+'</strong></div>'+
        (inv.dueDate?'<div>Échéance : <strong>'+formatDate(inv.dueDate)+'</strong></div>':'')+
        refLine(inv)+
      '</div>'+
    '</div>'+
    '<div style="text-align:center;font-size:23px;font-weight:800;margin:34px 0 4px;letter-spacing:-.01em">'+docTitle(inv)+' № '+esc(inv.number)+'</div>'+
    (inv.objet?'<div style="text-align:center;font-size:12.5px;color:#475569;margin-bottom:6px">'+esc(inv.objet)+'</div>':'')+
    '<div style="height:1px;background:#cbd5e1;margin:20px 0 0"></div>'+
    '<table style="width:100%;border-collapse:collapse">'+
      '<thead><tr>'+
        '<th style="padding:12px 0;font-size:12.5px;text-align:left;font-weight:700">Désignation</th>'+
        '<th style="padding:12px 8px;font-size:12.5px;text-align:right;font-weight:700;width:80px">Quantité</th>'+
        '<th style="padding:12px 8px;font-size:12.5px;text-align:right;font-weight:700;width:100px">Prix</th>'+
        (noTva?'':'<th style="padding:12px 8px;font-size:12.5px;text-align:right;font-weight:700;width:64px">TVA</th>')+
        '<th style="padding:12px 0;font-size:12.5px;text-align:right;font-weight:700;width:110px">Total</th>'+
      '</tr></thead>'+
      '<tbody style="border-top:1px solid #cbd5e1">'+rows+'</tbody></table>'+
    '<div style="height:1px;background:#cbd5e1;margin:0 0 16px"></div>'+
    '<div style="text-align:right;font-size:13px;line-height:2">'+
      '<div>Total HT : '+formatMoney(totals.ht)+'</div>'+
      (noTva?'':recap.map(function(r){return '<div>TVA ('+r.rate+'&nbsp;%) : '+formatMoney(r.tva)+'</div>';}).join(''))+
      (totals.port?'<div>Frais de port : '+formatMoney(totals.port)+'</div>':'')+
      (totals.timbre?'<div>Droit de timbre : '+formatMoney(totals.timbre)+'</div>':'')+
      '<div style="font-weight:800;font-size:15px">'+((totals.port||totals.timbre)?'Net à payer':'Total TTC')+' : '+formatMoney(totals.net)+'</div>'+
    '</div>'+
    proFooterNotes(inv)+
    '<div style="display:flex;justify-content:flex-end;margin-top:20px">'+signatureBlock({})+'</div>'+
    '<div style="height:1px;background:#cbd5e1;margin:24px 0 14px"></div>'+
    '<div style="display:flex;gap:20px;font-size:11px;color:#334155;line-height:1.8">'+
      col('<div style="font-weight:700">'+(company.name||'')+'</div>', (proIds(company)?'<div style="font-size:9.5px;color:#64748b">'+proIds(company)+'</div>':''))+
      col('<div style="white-space:pre-line">'+(company.address||'')+'</div>', (company.phone?'<div>Tél : '+company.phone+'</div>':'')+(company.email?'<div>'+company.email+'</div>':''), 'center')+
      col((company.banque?'<div>'+company.banque+'</div>':''), (company.rib?'<div>RIB : '+company.rib+'</div>':''), 'right')+
    '</div>'+
  '</div>';
}
