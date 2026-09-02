function renderInvoiceHTML(inv){
  const tpl=getTpl(inv.template);
  /* Une seule decision pour tout le document : si une ligne ou un total porte
     des centimes, le papier les imprime partout ; sinon il reste en dinars
     ronds, comme avant. Un papier ou le sous-total est arrondi et le total
     aussi, chacun de son cote, ne s'additionne pas. */
  if(typeof setMoneyDecimals==='function'){
    const tt=calcInvoiceTotals(inv);
    const centimes=[tt.ht,tt.tva,tt.ttc,tt.port,tt.timbre,tt.net]
      .concat((inv.items||[]).map(function(it){return (it.qty||0)*(it.unitPrice||0);}))
      .some(function(v){return Math.abs(v-Math.round(v))>0.004;});
    setMoneyDecimals(centimes);
  }
  /* A delivery note is a different document, not an invoice with the prices
     painted out. It gets its own layout — quantities, units, two signatures —
     and takes only the colour of whichever template was chosen, so it still
     looks like the rest of the stationery. */
  if(isBl(inv))return renderBonLivraison(inv,tpl);
  if(tpl.layout==='dz')return renderInvoiceDZ(inv,tpl);
  if(tpl.layout==='studio')return renderInvoiceStudio(inv,tpl);
  /* Les cinq mises en page reprises sur des factures reelles vivent dans
     templates-pro.js, charge apres celui-ci. Les appels ont lieu au rendu,
     pas au chargement, mais le garde-fou reste : un fichier qui n'aurait pas
     ete servi ne doit pas laisser un ecran blanc a la place d'une facture. */
  if(tpl.layout==='frbox'&&typeof renderInvoiceFrBox==='function')return renderInvoiceFrBox(inv,tpl);
  if(tpl.layout==='bleuq'&&typeof renderInvoiceBleuQty==='function')return renderInvoiceBleuQty(inv,tpl);
  if(tpl.layout==='bleus'&&typeof renderInvoiceBleuFlat==='function')return renderInvoiceBleuFlat(inv,tpl);
  if(tpl.layout==='sobre'&&typeof renderInvoiceSobre==='function')return renderInvoiceSobre(inv,tpl);
  if(tpl.layout==='epure'&&typeof renderInvoiceEpure==='function')return renderInvoiceEpure(inv,tpl);
  return renderInvoiceDZ(inv,tpl);
}

/* Nothing here reads calcInvoiceTotals: the paper shows no money at all, which
   is what the client signs for and what keeps the books unable to count the
   same goods twice. */
function renderBonLivraison(inv,tpl){
  const company=escObj(state.company), client=escObj(getClient(inv.clientId));
  const g=tpl.color||'#006233', g2=tpl.color2||tpl.color||'#059669';
  const logo=company.logo
    ?`<img src="${company.logo}" style="max-height:46px;max-width:100px;object-fit:contain"/>`
    :`<div style="width:52px;height:52px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:${g};font-weight:800;font-size:17px">${(company.name||'FP').slice(0,2).toUpperCase()}</div>`;
  const rows=(inv.items||[]).map((it,i)=>`<tr style="background:${i%2?'#f8fafc':'#ffffff'}">
      <td style="padding:11px 12px;font-size:12px;border-bottom:1px solid #eef2f7">${esc(it.description)}</td>
      <td style="padding:11px 8px;text-align:center;font-size:12px;font-weight:600;border-bottom:1px solid #eef2f7">${it.qty}</td>
      <td style="padding:11px 8px;text-align:center;font-size:12px;color:#64748b;border-bottom:1px solid #eef2f7">${esc(it.unite||'—')}</td>
    </tr>`).join('');
  const sig=(title,dateLabel)=>`<div style="flex:1">
        <div style="font-size:10.5px;font-weight:700;color:${g};margin-bottom:6px">${title}</div>
        <div style="font-size:10px;color:#94a3b8">${dateLabel} : ......................</div>
        <div style="height:38px;border-bottom:1px solid #cbd5e1;margin-top:8px"></div>
        <div style="font-size:9.5px;color:#94a3b8;margin-top:5px">Signature</div>
      </div>`;
  return `<div class="invoice-paper" id="invoice-paper" style="padding:0;font-family:Inter,Arial,sans-serif;color:#0f172a;overflow:hidden">
    <div style="background:linear-gradient(100deg,${g},${g2});padding:26px 32px;display:flex;justify-content:space-between;align-items:flex-start;gap:18px">
      <div style="display:flex;align-items:center;gap:14px">
        ${logo}
        <div>
          <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.1">${docTitle(inv)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.85);margin-top:2px">${company.name||''}</div>
        </div>
      </div>
      <div style="text-align:right;font-size:10.5px;color:rgba(255,255,255,.92);line-height:1.7">
        <div style="font-size:13px;font-weight:700;color:#fff">${esc(inv.number)}</div>
        ${legalLines(company,false)||'<div>—</div>'}
      </div>
    </div>
    <div style="padding:26px 32px 32px">
      <div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:22px">
        <div style="flex:1;min-width:0">
          <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.09em;color:${g};font-weight:700;margin-bottom:5px">Livré à</div>
          <div style="font-weight:700;font-size:14px">${client.name}</div>
          <div style="font-size:11px;color:#64748b;white-space:pre-line;margin-top:2px">${client.address||''}</div>
          ${legalLines(client,false)?`<div style="font-size:9.5px;color:#94a3b8;margin-top:4px;line-height:1.6">${legalLines(client,false)}</div>`:''}
        </div>
        <div style="text-align:right;font-size:11px;color:#475569;line-height:1.9">
          <div><span style="color:#94a3b8">Date&nbsp;:</span> <strong>${formatDate(inv.date)}</strong></div>
          ${inv.refNumber?`<div><span style="color:#94a3b8">Facture&nbsp;:</span> <strong>${esc(inv.refNumber)}</strong></div>`:''}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:6px;overflow:hidden">
        <thead><tr style="background:${g};color:#fff">
          <th style="padding:11px 12px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Désignation</th>
          <th style="padding:11px 8px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Quantité livrée</th>
          <th style="padding:11px 8px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Unité</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${inv.notes?`<div style="white-space:pre-line;margin-top:14px;font-size:11px;color:#64748b">${esc(inv.notes)}</div>`:''}
      <div style="margin-top:26px;padding:14px;background:#f8fafc;border:1px solid #eef2f7;border-radius:6px;font-size:10.5px;color:#64748b">
        Le présent bon ne vaut pas facture. Les montants figurent sur la facture ${inv.refNumber?esc(inv.refNumber):'correspondante'}.
      </div>
      <div style="display:flex;gap:32px;margin-top:26px;padding-top:18px;border-top:1px solid #eef2f7">
        ${sig('Visa du client','Reçu le')}
        ${sig('Visa du fournisseur','Livré le')}
      </div>
    </div>
  </div>`;
}
function renderInvoiceClassic(inv,tpl){
  const company=escObj(state.company), client=escObj(getClient(inv.clientId)), totals=calcInvoiceTotals(inv);
  const color=tpl.color||'#0f172a', words=amountInWords(totals.net);
  const logo=company.logo?`<img src="${company.logo}" style="max-height:52px;max-width:110px;object-fit:contain;margin-bottom:8px"/>`:'';
  const rows=(inv.items||[]).map(it=>{
    /* Signed with the document: a paper showing +20 000 on the line and
       -20 000 in the subtotal is a paper nobody can file. */
    const line=(it.qty||0)*(it.unitPrice||0)*(isAvoir(inv)?-1:1);
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px">${esc(it.description)}</td>
      <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;font-size:12px">${it.qty}${it.unite?" "+esc(it.unite):""}</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;font-size:12px">${formatMoney(it.unitPrice)}</td>
      <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;font-size:12px">${it.tva}%</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;font-size:12px">${formatMoney(vatAmount(line,it.tva))}</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;font-size:12px">${formatMoney(line)}</td>
    </tr>`;
  }).join('');
  return `<div class="invoice-paper" id="invoice-paper" style="padding:32px;font-family:Inter,Arial,sans-serif;color:#0f172a">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>${logo}<div style="font-size:17px;font-weight:700;color:${color}">${company.name||''}</div>
        <div style="font-size:11px;color:#64748b;white-space:pre-line">${company.address||''}</div>
        <div style="font-size:9.5px;margin-top:4px;line-height:1.6;color:#64748b">${legalLines(company,false)||'—'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:800;color:${color}">${docTitle(inv)}</div>
        <div style="font-size:13px;font-weight:600">${esc(inv.number)}</div>
        ${refLine(inv)}
        <div style="font-size:11px;color:#64748b">Date: ${formatDate(inv.date)}</div>
        ${inv.dueDate?`<div style="font-size:11px;color:#64748b">Échéance: ${formatDate(inv.dueDate)}</div>`:''}
      </div>
    </div>
    <div style="margin:16px 0;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
      <div style="font-size:10px;color:#64748b;margin-bottom:4px">Facturé à</div>
      <div style="font-weight:600">${client.name}</div>
      <div style="font-size:11px;white-space:pre-line;color:#475569">${client.address||''}</div>
      ${legalLines(client,false)?`<div style="font-size:9.5px;margin-top:4px;line-height:1.6;color:#64748b">${legalLines(client,false)}</div>`:''}
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:${color};color:#fff">
        <th style="padding:8px;text-align:left;font-size:11px">Désignation</th>
        <th style="padding:8px;text-align:center;font-size:11px">Qté</th>
        <th style="padding:8px;text-align:right;font-size:11px">P.U. HT</th>
        <th style="padding:8px;text-align:center;font-size:11px">TVA&nbsp;%</th>
        <th style="padding:8px;text-align:right;font-size:11px">Montant TVA</th>
        <th style="padding:8px;text-align:right;font-size:11px">Total HT</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end">
      <div style="width:220px;font-size:12px">
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#64748b">Sous-total HT</span><span>${formatMoney(totals.ht)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#64748b">TVA</span><span>${formatMoney(totals.tva)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:3px;border-top:2px solid ${color};font-size:14px;font-weight:700"><span>Total TTC</span><span>${formatMoney(totals.ttc)}</span></div>
        ${totals.port?`<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#64748b">Frais de port</span><span>${formatMoney(totals.port)}</span></div>`:''}
        ${totals.timbre?`<div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#64748b">Droit de timbre</span><span>${formatMoney(totals.timbre)}</span></div>`:''}
        ${(totals.timbre||totals.port)?`<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid ${color};font-size:14px;font-weight:700"><span>Net à payer</span><span>${formatMoney(totals.net)}</span></div>`:''}
      </div>
    </div>
<div style="margin-top:10px;font-size:10.5px;color:#64748b">Mode de règlement : ${payLabel(inv)}</div>
    <div style="margin-top:12px;font-size:11px;font-style:italic">${wordsLead(inv)} : <strong>${words}</strong></div>
    ${company.rib?`<div style="margin-top:16px;font-size:10px;color:#64748b">RIB: ${company.rib} — ${company.banque||''}</div>`:''}
  </div>`;
}
/* Invoices stay in French: they are legal documents. */
function payLabel(inv){
  var m=(inv&&inv.paymentMode)||'virement';
  return {virement:'Virement bancaire',especes:'Espèces',cheque:'Chèque',carte:'Carte / TPE'}[m]||'Virement bancaire';
}
/* The note is the sentence the client actually reads at the bottom of the
   paper. It announced a bank transfer whatever the mode field said, so an
   invoice settled in cash still instructed the client to wire the money. */
function payNote(mode){
  return {virement:'Paiement par virement bancaire.',
          especes:'Paiement en espèces.',
          cheque:'Paiement par chèque.',
          carte:'Paiement par carte / TPE.'}[mode||'virement']||'Paiement par virement bancaire.';
}
/* True while the note is still one we wrote. Anything the user typed is theirs
   and must survive a change of payment mode. */
function isDefaultPayNote(s){
  s=(s||'').trim();
  if(!s)return true;
  return ['virement','especes','cheque','carte'].some(function(m){return payNote(m)===s;});
}
function legalLines(e,inline){
  const L=[];
  if(e.nif)L.push('NIF : '+esc(e.nif));
  if(e.nin)L.push('NIN : '+esc(e.nin));
  if(e.nis)L.push('NIS : '+esc(e.nis));
  if(e.rc)L.push('RC : '+esc(e.rc));
  if(e.ai)L.push('AI : '+esc(e.ai));
  if(!L.length)return '';
  return inline?L.join(' &nbsp;·&nbsp; '):L.map(x=>'<div>'+x+'</div>').join('');
}
function renderInvoiceDZ(inv,tpl){
  const company=escObj(state.company), client=escObj(getClient(inv.clientId)), totals=calcInvoiceTotals(inv);
  const g=tpl.color||'#006233', g2=tpl.color2||'#059669', words=amountInWords(totals.net);
  const logo=company.logo
    ?`<img src="${company.logo}" style="max-height:46px;max-width:100px;object-fit:contain"/>`
    :`<div style="width:52px;height:52px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:${g};font-weight:800;font-size:17px">${(company.name||'FP').slice(0,2).toUpperCase()}</div>`;
  const rows=(inv.items||[]).map((it,i)=>{
    /* Signed with the document: a paper showing +20 000 on the line and
       -20 000 in the subtotal is a paper nobody can file. */
    const line=(it.qty||0)*(it.unitPrice||0)*(isAvoir(inv)?-1:1);
    const bg=i%2?'#f8fafc':'#ffffff';
    return `<tr style="background:${bg}">
      <td style="padding:10px 12px;font-size:12px;border-bottom:1px solid #eef2f7">${esc(it.description)}</td>
      <td style="padding:10px 8px;text-align:center;font-size:12px;border-bottom:1px solid #eef2f7">${it.qty}${it.unite?" "+esc(it.unite):""}</td>
      <td style="padding:10px 8px;text-align:right;font-size:12px;border-bottom:1px solid #eef2f7">${formatMoney(it.unitPrice)}</td>
      <td style="padding:10px 8px;text-align:center;font-size:12px;border-bottom:1px solid #eef2f7">${it.tva}%</td>
      <td style="padding:10px 8px;text-align:right;font-size:12px;border-bottom:1px solid #eef2f7">${formatMoney(vatAmount(line,it.tva))}</td>
      <td style="padding:10px 12px;text-align:right;font-size:12px;font-weight:600;border-bottom:1px solid #eef2f7">${formatMoney(line)}</td>
    </tr>`;
  }).join('');
  return `<div class="invoice-paper" id="invoice-paper" style="padding:0;font-family:Inter,Arial,sans-serif;color:#0f172a;overflow:hidden">
    <div style="background:linear-gradient(100deg,${g},${g2});padding:26px 32px;display:flex;justify-content:space-between;align-items:flex-start;gap:18px">
      <div style="display:flex;align-items:center;gap:14px">
        ${logo}
        <div>
          <div style="font-size:25px;font-weight:800;color:#fff;letter-spacing:-.02em;line-height:1.1">${docTitle(inv)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.85);margin-top:2px">${company.name||''}</div>
        </div>
      </div>
      <div style="text-align:right;font-size:10.5px;color:rgba(255,255,255,.92);line-height:1.7">
        <div style="font-size:13px;font-weight:700;color:#fff">${esc(inv.number)}</div>
        ${legalLines(company,false)||'<div>—</div>'}
      </div>
    </div>
    <div style="padding:26px 32px 32px">
      <div style="display:flex;justify-content:space-between;gap:24px;margin-bottom:22px">
        <div style="flex:1;min-width:0">
          <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:.09em;color:${g};font-weight:700;margin-bottom:5px">Facturé à</div>
          <div style="font-weight:700;font-size:14px">${client.name}</div>
          <div style="font-size:11px;color:#64748b;white-space:pre-line;margin-top:2px">${client.address||''}</div>
          ${legalLines(client,false)?`<div style="font-size:9.5px;color:#94a3b8;margin-top:4px;line-height:1.6">${legalLines(client,false)}</div>`:''}
        </div>
        <div style="text-align:right;font-size:11px;color:#475569;line-height:1.9">
          <div><span style="color:#94a3b8">Date&nbsp;:</span> <strong>${formatDate(inv.date)}</strong></div>
          ${inv.dueDate?`<div><span style="color:#94a3b8">Échéance&nbsp;:</span> <strong>${formatDate(inv.dueDate)}</strong></div>`:''}
          <div style="font-size:10px;color:#94a3b8;white-space:pre-line;margin-top:4px">${company.address||''}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:6px;overflow:hidden">
        <thead><tr style="background:${g};color:#fff">
          <th style="padding:11px 12px;text-align:left;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Désignation</th>
          <th style="padding:11px 8px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Qté</th>
          <th style="padding:11px 8px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">P.U. HT</th>
          <th style="padding:11px 8px;text-align:center;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">TVA&nbsp;%</th>
          <th style="padding:11px 8px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Montant TVA</th>
          <th style="padding:11px 12px;text-align:right;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase">Total HT</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-top:18px">
        <div style="width:250px;border-radius:6px;overflow:hidden">
          <div style="display:flex;justify-content:space-between;padding:8px 14px;font-size:12px;background:#f1f5f9;color:#475569"><span>Sous-total HT</span><span>${formatMoney(totals.ht)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 14px;font-size:12px;background:#f8fafc;color:#475569"><span>TVA</span><span>${formatMoney(totals.tva)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:11px 14px;font-size:14.5px;font-weight:800;background:${g};color:#fff"><span>Total TTC</span><span>${formatMoney(totals.ttc)}</span></div>
          ${totals.port?`<div style="display:flex;justify-content:space-between;padding:8px 14px;font-size:12px;background:#f1f5f9;color:#475569"><span>Frais de port</span><span>${formatMoney(totals.port)}</span></div>`:''}
          ${totals.timbre?`<div style="display:flex;justify-content:space-between;padding:8px 14px;font-size:12px;background:#f8fafc;color:#475569"><span>Droit de timbre</span><span>${formatMoney(totals.timbre)}</span></div>`:''}
          ${(totals.timbre||totals.port)?`<div style="display:flex;justify-content:space-between;padding:11px 14px;font-size:14.5px;font-weight:800;background:${g2};color:#fff"><span>Net à payer</span><span>${formatMoney(totals.net)}</span></div>`:''}
        </div>
      </div>
<div style="margin-top:12px;font-size:10.5px;color:#64748b">Mode de règlement : ${payLabel(inv)}</div>
      <div style="margin-top:18px;padding:11px 14px;background:#f0fdf4;border-left:3px solid ${g2};border-radius:4px;font-size:11px;font-style:italic">
        ${wordsLead(inv)} : <strong>${words}</strong>
      </div>
      ${exemptNote(inv)}
      ${inv.notes?`<div style="white-space:pre-line;margin-top:12px;font-size:11px;color:#64748b">${esc(inv.notes)}</div>`:''}
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-top:26px;padding-top:16px;border-top:1px solid #eef2f7">
        <div style="font-size:10px;color:#94a3b8;line-height:1.7">
          ${company.rib?`<div>RIB : ${company.rib} — ${company.banque||''}</div>`:''}
          ${company.email||company.phone?`<div>${company.email||''}${company.email&&company.phone?' · ':''}${company.phone||''}</div>`:''}
        </div>
        ${signatureBlock({width:150})}
      </div>
    </div>
  </div>`;
}
function renderInvoiceStudio(inv,tpl){
  const company=escObj(state.company), client=escObj(getClient(inv.clientId)), totals=calcInvoiceTotals(inv);
  const c1=tpl.color||'#0ea5e9', c2=tpl.color2||tpl.color||'#0369a1', words=amountInWords(totals.net);
  const logo=company.logo?`<img src="${company.logo}" style="max-height:56px;max-width:120px;object-fit:contain"/>`:'';
  const rows=(inv.items||[]).map(it=>{
    /* Signed with the document: a paper showing +20 000 on the line and
       -20 000 in the subtotal is a paper nobody can file. */
    const line=(it.qty||0)*(it.unitPrice||0)*(isAvoir(inv)?-1:1);
    return `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:9px 12px;font-size:12px">${esc(it.description)}</td>
      <td style="padding:9px 8px;text-align:center;font-size:12px">${it.qty}${it.unite?" "+esc(it.unite):""}</td>
      <td style="padding:9px 8px;text-align:right;font-size:12px">${formatMoney(it.unitPrice)}</td>
      <td style="padding:9px 8px;text-align:center;font-size:12px">${it.tva}%</td>
      <td style="padding:9px 8px;text-align:right;font-size:12px">${formatMoney(vatAmount(line,it.tva))}</td>
      <td style="padding:9px 8px;text-align:right;font-size:12px;font-weight:600">${formatMoney(line)}</td>
    </tr>`;
  }).join('');
  return `<div class="invoice-paper" id="invoice-paper" style="padding:40px;font-family:Inter,Arial,sans-serif;color:#0f172a">
    <div style="height:6px;border-radius:3px;background:linear-gradient(90deg,${c1},${c2});margin-bottom:28px"></div>
    <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <div style="display:flex;gap:12px;align-items:flex-start">
        ${logo}
        <div>
          <div style="font-size:18px;font-weight:700">${company.name||''}</div>
          <div style="font-size:11px;color:#64748b;white-space:pre-line">${company.address||''}</div>
          <div style="font-size:9.5px;color:#94a3b8;margin-top:4px;line-height:1.6">${legalLines(company,false)||'—'}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:${c2}">FACTURE</div>
        <div style="font-size:13px;color:#64748b">${esc(inv.number)}</div>
        <div style="font-size:11px;margin-top:8px">Date : <strong>${formatDate(inv.date)}</strong></div>
        ${inv.dueDate?`<div style="font-size:11px">Échéance : <strong>${formatDate(inv.dueDate)}</strong></div>`:''}
      </div>
    </div>
    <div style="margin-top:24px;border:1px solid #f1f5f9;background:#f8fafc;border-radius:8px;padding:12px 16px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8">Facturé à</div>
      <div style="font-weight:600;margin-top:2px">${client.name}</div>
      <div style="font-size:11px;color:#64748b;white-space:pre-line">${client.address||''}</div>
      ${legalLines(client,false)?`<div style="font-size:9.5px;color:#94a3b8;margin-top:3px;line-height:1.6">${legalLines(client,false)}</div>`:''}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:24px">
      <thead><tr style="background:#f1f5f9;color:#475569">
        <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600">Désignation</th>
        <th style="padding:9px 8px;text-align:center;font-size:11px;font-weight:600">Qté</th>
        <th style="padding:9px 8px;text-align:right;font-size:11px;font-weight:600">P.U. HT</th>
        <th style="padding:9px 8px;text-align:center;font-size:11px;font-weight:600">TVA&nbsp;%</th>
        <th style="padding:9px 8px;text-align:right;font-size:11px;font-weight:600">Montant TVA</th>
        <th style="padding:9px 8px;text-align:right;font-size:11px;font-weight:600">Total HT</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-top:16px">
      <div style="width:215px;font-size:12px">
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b"><span>Sous-total HT</span><span>${formatMoney(totals.ht)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b"><span>TVA</span><span>${formatMoney(totals.tva)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:4px;border-top:2px solid #0f172a;font-size:14px;font-weight:700"><span>Total TTC</span><span>${formatMoney(totals.ttc)}</span></div>
        ${totals.port?`<div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b"><span>Frais de port</span><span>${formatMoney(totals.port)}</span></div>`:''}
        ${totals.timbre?`<div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b"><span>Droit de timbre</span><span>${formatMoney(totals.timbre)}</span></div>`:''}
        ${(totals.timbre||totals.port)?`<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #0f172a;font-size:14px;font-weight:700"><span>Net à payer</span><span>${formatMoney(totals.net)}</span></div>`:''}
      </div>
    </div>
<div style="margin-top:10px;font-size:10.5px;color:#64748b">Mode de règlement : ${payLabel(inv)}</div>
    <div style="margin-top:16px;font-size:11px;font-style:italic">${wordsLead(inv)} : <strong>${words}</strong></div>
    ${inv.notes?`<div style="white-space:pre-line;margin-top:12px;font-size:11px;color:#64748b">${esc(inv.notes)}</div>`:''}
    ${company.rib?`<div style="margin-top:8px;font-size:10px;color:#94a3b8">RIB: ${company.rib} — ${company.banque||''}</div>`:''}
  </div>`;
}
function previewInvoice(id){
  const inv=state.invoices.find(i=>i.id===id);if(!inv)return;
  const root=document.getElementById('preview-root');
  const body=document.getElementById('preview-body');
  if(!root||!body)return;
  body.innerHTML=renderInvoiceHTML(inv);
  root.classList.remove('hidden');
  window._previewInvId=id;
  try{lucide.createIcons();}catch(e){}
}
function previewTemplate(tid){
  const demo={id:'demo',number:'FAC-DEMO-001',clientId:state.clients[0]&&state.clients[0].id||'',template:tid,date:todayISO(),status:'brouillon',items:[{description:'Prestation exemple',qty:1,unitPrice:100000,tva:19}],notes:''};
  const root=document.getElementById('preview-root');
  const body=document.getElementById('preview-body');
  if(!root||!body)return;
  body.innerHTML=renderInvoiceHTML(demo);
  root.classList.remove('hidden');
  window._previewInvId=null;
}
function closePreview(){
  const root=document.getElementById('preview-root');
  if(root)root.classList.add('hidden');
  window._previewInvId=null;
}
async function downloadPDF(){
  const paper=document.getElementById('invoice-paper');
  if(!paper)return toast('Ouvrez un aperçu d\'abord','err');
  const btnTxt='Génération du PDF…';
  toast(btnTxt);
  try{
    const PAGE_W=794;
    // Big canvases blow up memory on phones. Scale down for tall invoices.
    const approxH=paper.scrollHeight||1200;
    const scale=(approxH>2200||innerWidth<640)?1.5:2;
    const canvas=await html2canvas(paper,{
      scale:scale,useCORS:true,backgroundColor:'#ffffff',
      windowWidth:PAGE_W+80,logging:false,
      onclone:function(doc){
        doc.documentElement.setAttribute('dir','ltr');
        const el=doc.getElementById('invoice-paper');
        if(el){
          el.style.direction='ltr';el.style.textAlign='left';
          el.style.width=PAGE_W+'px';el.style.maxWidth=PAGE_W+'px';
          el.style.minHeight='0';el.style.boxShadow='none';el.style.margin='0';
        }
      }
    });
    if(!canvas||!canvas.width||!canvas.height)throw new Error('canvas vide');
    // JPEG is far smaller than PNG — the usual cause of failed saves on mobile.
    const img=canvas.toDataURL('image/jpeg',0.92);
    if(!img||img.length<1000)throw new Error('image vide');
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF('p','mm','a4');
    const PW=210,PH=297;
    const imgH=canvas.height*PW/canvas.width;
    if(imgH<=PH){
      pdf.addImage(img,'JPEG',0,0,PW,imgH);
    }else{
      // long invoice -> real pages, instead of shrinking it to unreadable
      let pos=0,left=imgH;
      pdf.addImage(img,'JPEG',0,0,PW,imgH);
      left-=PH;
      while(left>0){pos-=PH;pdf.addPage();pdf.addImage(img,'JPEG',0,pos,PW,imgH);left-=PH;}
    }
    const name=(window._previewInvId&&state.invoices.find(i=>i.id===window._previewInvId)||{}).number||'facture';
    pdf.save(name+'.pdf');
    toast('PDF téléchargé');
  }catch(e){
    console.error('PDF',e);
    toast('Erreur PDF : '+(e&&e.message?e.message:'inconnue'),'err');
  }
}
function downloadPdf(){downloadPDF();}
function initApp(){
  loadData();
  if(localStorage.getItem('facturepro_dark')==='1'){state.dark=true;document.documentElement.classList.add('dark');}
  var ok=['dashboard','invoices','devis','products','payments','expenses','debts','clients','templates','settings','help','terms','releve','recurring','outils'];
  var p=state.currentPage;
  navigate(ok.indexOf(p)>-1?p:'dashboard');
}
