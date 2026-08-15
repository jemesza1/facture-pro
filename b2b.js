function importData(e){
  const file=e.target.files?.[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    try{
      const data=JSON.parse(ev.target.result);
      if(!data||typeof data!=='object')throw new Error('format');
      // validate before touching saved data — a bad file must not destroy it
      if('clients' in data && !Array.isArray(data.clients))throw new Error('clients');
      if('invoices' in data && !Array.isArray(data.invoices))throw new Error('invoices');
      if('company' in data && (typeof data.company!=='object'||!data.company))throw new Error('company');
      const clients=(data.clients||[]).filter(c=>c&&typeof c==='object'&&c.name).map(c=>({...c,id:c.id||uid()}));
      const invoices=(data.invoices||[]).filter(i=>i&&typeof i==='object'&&i.number)
        .map(i=>({...i,id:i.id||uid(),items:Array.isArray(i.items)?i.items:[]}));
      if(!clients.length&&!invoices.length)throw new Error('vide');
      state.clients=clients;
      state.invoices=invoices;
      if(data.company)state.company={...defaultCompany,...data.company};
      const n=Number(data.nextInvoiceNumber);
      state.nextInvoiceNumber=Number.isFinite(n)&&n>0?n:(invoices.length+1);
      saveData();toast(`Import OK — ${invoices.length} facture(s), ${clients.length} client(s)`);renderPage();
    }catch(err){console.error('import',err);toast('Fichier invalide — import annulé','err');}
  };
  reader.onerror=()=>toast('Lecture du fichier impossible','err');
  reader.readAsText(file);
}
function renderHelp(){return`<div class="max-w-3xl space-y-5"><div class="card p-5"><h3 class="font-semibold text-lg mb-3">Comment utiliser FacturePro</h3><ol class="space-y-3 text-sm list-decimal list-inside"><li><strong>Paramètres</strong> — Renseignez NIF, NIS, RC, AI, RIB de votre entreprise.</li><li><strong>Clients</strong> — Ajoutez vos clients (avec NIF si pro).</li><li><strong>Nouvelle facture</strong> — Choisissez client + modèle (24) + lignes + TVA.</li><li><strong>Suivi</strong> — Changez le statut directement dans le tableau.</li><li><strong>PDF</strong> — Aperçu (œil) puis téléchargez. Montant en lettres inclus.</li><li><strong>Export</strong> — Sauvegardez vos données en JSON.</li></ol></div><div class="card p-5 bg-sky-50 border border-sky-200"><p class="text-sm"><strong>Conseil :</strong> Commencez par <button onclick="navigate('settings')" class="text-sky-600 underline font-medium">Paramètres</button>, puis clients, puis factures.</p></div></div>`;}
function renderTerms(){return`<div class="max-w-3xl"><div class="card p-5 space-y-3 text-sm"><h3 class="font-semibold text-lg">Conditions d'utilisation</h3><p>FacturePro est un outil de facturation pour entreprises et indépendants en Algérie.</p><p><strong>1. Utilisation</strong> — Vous êtes responsable des infos saisies. L'outil aide à la conformité Décret 05-468.</p><p><strong>2. Données</strong> — Stockées localement dans votre navigateur (localStorage). Exportez régulièrement.</p><p><strong>3. Mentions légales</strong> — Chaque facture inclut NIF, NIS, RC, AI, montant en lettres, RIB.</p><p><strong>4. Limitation</strong> — Fourni tel quel. Aucune responsabilité en cas de perte de données.</p><p class="text-xs text-slate-400 mt-4">Created by CheMs SoUu</p></div></div>`;}
function openModal(html){document.getElementById('modal-root').innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()">${html}</div>`;try{lucide.createIcons();}catch(e){}}
function closeModal(){document.getElementById('modal-root').innerHTML='';}
function openClientModal(id=null){const client=id?state.clients.find(c=>c.id===id):{name:'',email:'',address:'',nif:'',nis:'',rc:'',ai:'',phone:''};openModal(`<div class="modal" onclick="event.stopPropagation()"><div class="modal-header"><h3 class="font-semibold">${id?'Modifier':'Nouveau'} client</h3><button onclick="closeModal()" class="btn-ghost p-2"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="modal-body space-y-3"><div><label class="form-label">Nom *</label><input id="cli-name" class="form-input" value="${client.name||''}" /></div><div><label class="form-label">NIF</label><input id="cli-nif" class="form-input" value="${client.nif||''}" /></div><div class="grid grid-cols-2 gap-3"><div><label class="form-label">NIS</label><input id="cli-nis" class="form-input" value="${client.nis||''}" /></div><div><label class="form-label">RC</label><input id="cli-rc" class="form-input" placeholder="16/00-0000000B00" value="${client.rc||''}" /></div></div><div><label class="form-label">Article d\'imposition (AI)</label><input id="cli-ai" class="form-input" value="${client.ai||''}" /></div><div><label class="form-label">Email</label><input id="cli-email" class="form-input" value="${client.email||''}" /></div><div><label class="form-label">Adresse</label><textarea id="cli-address" class="form-input" rows="2">${client.address||''}</textarea></div><div><label class="form-label">Téléphone</label><input id="cli-phone" class="form-input" value="${client.phone||''}" /></div></div><div class="modal-footer"><button onclick="closeModal()" class="btn-secondary">Retour</button><button onclick="saveClient('${id||''}')" class="btn-primary">Enregistrer</button></div></div>`);}
function saveClient(id){const data={name:document.getElementById('cli-name').value.trim(),nif:document.getElementById('cli-nif').value.trim(),nis:document.getElementById('cli-nis').value.trim(),rc:document.getElementById('cli-rc').value.trim(),ai:document.getElementById('cli-ai').value.trim(),email:document.getElementById('cli-email').value.trim(),address:document.getElementById('cli-address').value.trim(),phone:document.getElementById('cli-phone').value.trim()};if(!data.name)return toast('Nom obligatoire','err');if(id){const idx=state.clients.findIndex(c=>c.id===id);if(idx<0)return toast('Client introuvable','err');state.clients[idx]={...state.clients[idx],...data};}else state.clients.push({id:uid(),...data});saveData();closeModal();toast(id?'Modifié':'Ajouté');renderPage();}
