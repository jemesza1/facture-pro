function renderInvoiceHTML(inv){
  const tpl=getTpl(inv.template);
  if(tpl.layout==='studio')return renderInvoiceStudio(inv,tpl);
  return renderInvoiceClassic(inv,tpl);
}
function renderInvoiceClassic(inv,tpl){
  const company=state.company, client=getClient(inv.clientId), totals=calcInvoiceTotals(inv);
  const color=tpl.color||'#0f172a', words=amountInWords(totals.ttc);
  const logo=company.logo?`<img src="${company.logo}" style="max-height:52px;max-width:110px;object-fit:contain;margin-bottom:8px"/>`:'';
  const rows=(inv.items||[]).map(it=>{
    const line=(it.qty||0)*(it.unitPrice||0);
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px">${it.description}</td>
      <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;font-size:12px">${it.qty}</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;font-size:12px">${formatMoney(it.unitPrice)}</td>
      <td style="padding:8px;text-align:center;border-bottom:1px solid #e2e8f0;font-size:12px">${it.tva}%</td>
      <td style="padding:8px;text-align:right;border-bottom:1px solid #e2e8f0;font-size:12px">${formatMoney(line)}</td>
    </tr>`;
  }).join('');
  return `<div class="invoice-paper" id="invoice-paper" style="padding:32px;font-family:Inter,Arial,sans-serif;color:#0f172a">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
      <div>${logo}<div style="font-size:17px;font-weight:700;color:${color}">${company.name||''}</div>
        <div style="font-size:11px;color:#64748b;white-space:pre-line">${company.address||''}</div>
        <div style="font-size:10px;margin-top:4px">NIF: ${company.nif||'—'} | RC: ${company.rc||'—'}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:800;color:${color}">FACTURE</div>
        <div style="font-size:13px;font-weight:600">${inv.number}</div>
        <div style="font-size:11px;color:#64748b">Date: ${formatDate(inv.date)}</div>
        ${inv.dueDate?`<div style="font-size:11px;color:#64748b">Échéance: ${formatDate(inv.dueDate)}</div>`:''}
      </div>
    </div>
    <div style="margin:16px 0;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
      <div style="font-size:10px;color:#64748b;margin-bottom:4px">Facturé à</div>
      <div style="font-weight:600">${client.name}</div>
      <div style="font-size:11px;white-space:pre-line;color:#475569">${client.address||''}</div>
      ${client.nif?`<div style="font-size:10px;margin-top:4px">NIF: ${client.nif}</div>`:''}
    </div>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:${color};color:#fff">
        <th style="padding:8px;text-align:left;font-size:11px">Désignation</th>
        <th style="padding:8px;text-align:center;font-size:11px">Qté</th>
        <th style="padding:8px;text-align:right;font-size:11px">P.U. HT</th>
        <th style="padding:8px;text-align:center;font-size:11px">TVA</th>
        <th style="padding:8px;text-align:right;font-size:11px">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end">
      <div style="width:220px;font-size:12px">
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#64748b">Sous-total HT</span><span>${formatMoney(totals.ht)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span style="color:#64748b">TVA</span><span>${formatMoney(totals.tva)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:3px;border-top:2px solid ${color};font-size:14px;font-weight:700"><span>Total TTC</span><span>${formatMoney(totals.ttc)}</span></div>
      </div>
    </div>
    <div style="margin-top:12px;font-size:11px;font-style:italic">Arrêté la présente facture à la somme de : <strong>${words}</strong></div>
    ${company.rib?`<div style="margin-top:16px;font-size:10px;color:#64748b">RIB: ${company.rib} — ${company.banque||''}</div>`:''}
    <div style="margin-top:8px;font-size:9px;color:#94a3b8">Created by CheMs SoUu · FacturePro Algérie</div>
  </div>`;
}
function renderInvoiceStudio(inv,tpl){
  const company=state.company, client=getClient(inv.clientId), totals=calcInvoiceTotals(inv);
  const c1=tpl.color||'#0ea5e9', c2=tpl.color2||tpl.color||'#0369a1', words=amountInWords(totals.ttc);
  const logo=company.logo?`<img src="${company.logo}" style="max-height:56px;max-width:120px;object-fit:contain"/>`:'';
  const rows=(inv.items||[]).map(it=>{
    const line=(it.qty||0)*(it.unitPrice||0);
    return `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:9px 12px;font-size:12px">${it.description}</td>
      <td style="padding:9px 8px;text-align:center;font-size:12px">${it.qty}</td>
      <td style="padding:9px 8px;text-align:right;font-size:12px">${formatMoney(it.unitPrice)}</td>
      <td style="padding:9px 8px;text-align:center;font-size:12px">${it.tva}%</td>
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
          <div style="font-size:10px;color:#94a3b8;margin-top:4px">NIF: ${company.nif||'—'} | RC: ${company.rc||'—'}</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:${c2}">FACTURE</div>
        <div style="font-size:13px;color:#64748b">${inv.number}</div>
        <div style="font-size:11px;margin-top:8px">Date : <strong>${formatDate(inv.date)}</strong></div>
        ${inv.dueDate?`<div style="font-size:11px">Échéance : <strong>${formatDate(inv.dueDate)}</strong></div>`:''}
      </div>
    </div>
    <div style="margin-top:24px;border:1px solid #f1f5f9;background:#f8fafc;border-radius:8px;padding:12px 16px">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8">Facturé à</div>
      <div style="font-weight:600;margin-top:2px">${client.name}</div>
      <div style="font-size:11px;color:#64748b;white-space:pre-line">${client.address||''}</div>
      ${client.nif?`<div style="font-size:10px;color:#94a3b8;margin-top:2px">NIF: ${client.nif}</div>`:''}
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:24px">
      <thead><tr style="background:#f1f5f9;color:#475569">
        <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600">Désignation</th>
        <th style="padding:9px 8px;text-align:center;font-size:11px;font-weight:600">Qté</th>
        <th style="padding:9px 8px;text-align:right;font-size:11px;font-weight:600">P.U. HT</th>
        <th style="padding:9px 8px;text-align:center;font-size:11px;font-weight:600">TVA</th>
        <th style="padding:9px 8px;text-align:right;font-size:11px;font-weight:600">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end;margin-top:16px">
      <div style="width:215px;font-size:12px">
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b"><span>Sous-total HT</span><span>${formatMoney(totals.ht)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b"><span>TVA</span><span>${formatMoney(totals.tva)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;margin-top:4px;border-top:2px solid #0f172a;font-size:14px;font-weight:700"><span>Total TTC</span><span>${formatMoney(totals.ttc)}</span></div>
      </div>
    </div>
    <div style="margin-top:16px;font-size:11px;font-style:italic">Arrêté la présente facture à la somme de : <strong>${words}</strong></div>
    ${inv.notes?`<div style="margin-top:12px;font-size:11px;color:#64748b">${inv.notes}</div>`:''}
    ${company.rib?`<div style="margin-top:8px;font-size:10px;color:#94a3b8">RIB: ${company.rib} — ${company.banque||''}</div>`:''}
    <div style="margin-top:8px;font-size:9px;color:#cbd5e1">Created by CheMs SoUu · FacturePro Algérie</div>
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
  const demo={id:'demo',number:'FAC-DEMO-001',clientId:state.clients[0]&&state.clients[0].id||'',template:tid,date:new Date().toISOString().slice(0,10),status:'brouillon',items:[{description:'Prestation exemple',qty:1,unitPrice:100000,tva:19}],notes:''};
  const root=document.getElementById('preview-root');
  const body=document.getElementById('preview-body');
  if(!root||!body)return;
  body.innerHTML=renderInvoiceHTML(demo);
  root.classList.remove('hidden');
}
function closePreview(){
  const root=document.getElementById('preview-root');
  if(root)root.classList.add('hidden');
  window._previewInvId=null;
}
async function downloadPDF(){
  const paper=document.getElementById('invoice-paper');
  if(!paper)return toast('Ouvrez un aperçu d\'abord','err');
  try{
    const canvas=await html2canvas(paper,{scale:2,useCORS:true,backgroundColor:'#ffffff'});
    const img=canvas.toDataURL('image/png');
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF('p','mm','a4');
    const w=210, h=canvas.height*w/canvas.width;
    pdf.addImage(img,'PNG',0,0,w,Math.min(h,297));
    const name=(window._previewInvId&&state.invoices.find(i=>i.id===window._previewInvId)||{}).number||'facture';
    pdf.save(name+'.pdf');
    toast('PDF téléchargé');
  }catch(e){console.error(e);toast('Erreur PDF','err');}
}
function downloadPdf(){downloadPDF();}
function initApp(){
  loadData();
  if(localStorage.getItem('facturepro_dark')==='1'){state.dark=true;document.documentElement.classList.add('dark');}
  navigate('dashboard');
}
