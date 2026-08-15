/* FacturePro — Grok AI assistant (optional). API key stored only in localStorage. */
(function(){
  var KEY = 'fp_xai_key';
  var MODEL = 'grok-3-mini';

  function getXaiKey(){
    try { return localStorage.getItem(KEY) || ''; } catch(e){ return ''; }
  }
  function setXaiKey(v){
    try {
      if(v) localStorage.setItem(KEY, v.trim());
      else localStorage.removeItem(KEY);
    } catch(e){}
  }

  window.saveXaiKey = function(){
    var el = document.getElementById('set-xai-key');
    if(!el) return;
    setXaiKey(el.value);
    toast(typeof t==='function' ? t('toast.saved') : 'Enregistr\u00e9');
  };

  function aiPanelHtml(){
    var ar = (typeof locale!=='undefined' && locale==='ar');
    return '<div class="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 space-y-2">'+
      '<div class="flex items-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">'+
        '<i data-lucide="sparkles" class="w-4 h-4"></i> '+
        (ar ? '\u0625\u0646\u0634\u0627\u0621 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a (Grok)' : 'Cr\u00e9er avec Grok AI')+
      '</div>'+
      '<textarea id="ai-prompt" class="form-input text-sm" rows="2" placeholder="'+
        (ar ? '\u0645\u062b\u0627\u0644: \u0641\u0627\u062a\u0648\u0631\u0629 \u0644\u0640 SARL Atlas \u2014 \u0635\u064a\u0627\u0646\u0629 50000 \u062f\u062c \u0648\u0642\u0637\u0639 \u063a\u064a\u0627\u0631 20000 \u062f\u062c\u060c TVA 19%' :
              'Ex: Facture pour SARL Atlas \u2014 maintenance 50000 DA et pi\u00e8ces 20000 DA, TVA 19%')+
      '"></textarea>'+
      '<button type="button" id="ai-fill-btn" onclick="fillInvoiceWithAI()" class="btn-primary text-sm py-1.5 px-3">'+
        '<i data-lucide="wand-2" class="w-4 h-4"></i> '+
        (ar ? '\u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629' : 'Remplir la facture')+
      '</button>'+
      '<p id="ai-status" class="text-xs text-slate-500 hidden"></p>'+
    '</div>';
  }

  function settingsCardHtml(){
    var ar = (typeof locale!=='undefined' && locale==='ar');
    var k = getXaiKey();
    var masked = k ? (k.slice(0,6)+'\u2026'+k.slice(-4)) : '';
    return '<div class="card p-5 space-y-3">'+
      '<h3 class="font-semibold text-lg flex items-center gap-2"><i data-lucide="sparkles" class="w-5 h-5 text-emerald-600"></i> '+
      (ar ? '\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a (Grok)' : 'Intelligence artificielle (Grok)')+'</h3>'+
      '<p class="text-xs text-slate-500">'+(ar
        ? '\u0627\u0644\u0645\u0641\u062a\u0627\u062d \u064a\u064f\u062d\u0641\u0638 \u0641\u0642\u0637 \u0641\u064a \u0645\u062a\u0635\u0641\u062d\u0643. \u0627\u062d\u0635\u0644 \u0639\u0644\u064a\u0647 \u0645\u0646 console.x.ai'
        : 'La cl\u00e9 est stock\u00e9e uniquement dans votre navigateur. Obtenez-la sur console.x.ai')+'</p>'+
      '<div><label class="form-label">'+(ar ? '\u0645\u0641\u062a\u0627\u062d API Grok' : 'Cl\u00e9 API Grok')+'</label>'+
        '<input id="set-xai-key" type="password" class="form-input ltr-code" placeholder="xai-..." value="'+esc(k)+'" autocomplete="off" /></div>'+
      (masked ? '<p class="text-xs text-slate-400">'+masked+'</p>' : '')+
      '<button type="button" onclick="saveXaiKey()" class="btn-secondary text-sm"><i data-lucide="key" class="w-4 h-4"></i> '+
        (ar ? '\u062d\u0641\u0638 \u0627\u0644\u0645\u0641\u062a\u0627\u062d' : 'Enregistrer la cl\u00e9')+'</button>'+
    '</div>';
  }

  var _rs = window.renderSettings;
  if(typeof _rs === 'function'){
    window.renderSettings = function(){
      var html = _rs.apply(this, arguments);
      return html + settingsCardHtml();
    };
  }

  var _oni = window.openNewInvoice;
  if(typeof _oni === 'function'){
    window.openNewInvoice = function(editId){
      _oni.apply(this, arguments);
      setTimeout(function(){
        var body = document.querySelector('#modal-root .modal-body');
        if(!body || document.getElementById('ai-prompt')) return;
        var wrap = document.createElement('div');
        wrap.innerHTML = aiPanelHtml();
        body.insertBefore(wrap.firstChild, body.firstChild);
        try { lucide.createIcons(); } catch(e){}
      }, 30);
    };
  }

  function setStatus(msg, isErr){
    var el = document.getElementById('ai-status');
    if(!el) return;
    el.classList.remove('hidden');
    el.textContent = msg;
    el.className = 'text-xs ' + (isErr ? 'text-red-600' : 'text-slate-500');
  }

  window.fillInvoiceWithAI = async function(){
    var key = getXaiKey();
    var ar = (typeof locale!=='undefined' && locale==='ar');
    if(!key){
      setStatus(ar ? '\u0623\u0636\u0641 \u0645\u0641\u062a\u0627\u062d Grok \u0641\u064a \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0623\u0648\u0644\u0627\u064b' : 'Ajoutez d\u2019abord la cl\u00e9 Grok dans Param\u00e8tres', true);
      return;
    }
    var promptEl = document.getElementById('ai-prompt');
    var text = promptEl ? promptEl.value.trim() : '';
    if(!text){
      setStatus(ar ? '\u0627\u0643\u062a\u0628 \u0648\u0635\u0641 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629' : '\u00c9crivez la description de la facture', true);
      return;
    }
    var btn = document.getElementById('ai-fill-btn');
    if(btn){ btn.disabled = true; btn.classList.add('opacity-60'); }
    setStatus(ar ? '\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u2026' : 'Analyse en cours\u2026');

    var system = 'You are an assistant for Algerian invoicing (FacturePro). '+
      'Extract invoice data from the user message. Reply with ONLY valid JSON, no markdown, no explanation. Schema:\n'+
      '{"clientName":"string","items":[{"description":"string","qty":number,"unitPrice":number,"tva":number}],"notes":"string","dueDays":number}\n'+
      'Rules: currency is Algerian Dinar (DA). Default TVA is 19 if not specified. qty default 1. unitPrice is number without currency symbol. dueDays default 30. '+
      'If language is Arabic or French, keep item descriptions in the same language.';

    try {
      var res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text }
          ]
        })
      });
      if(!res.ok){
        var errTxt = await res.text().catch(function(){return '';});
        throw new Error('API '+res.status+(errTxt?': '+errTxt.slice(0,120):''));
      }
      var data = await res.json();
      var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
      content = content.replace(/```json/gi,'').replace(/```/g,'').trim();
      var parsed = JSON.parse(content);
      applyAiToForm(parsed);
      setStatus(ar ? '\u062a\u0645 \u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u0641\u0627\u062a\u0648\u0631\u0629 \u2713' : 'Facture remplie \u2713');
    } catch(e){
      console.error(e);
      setStatus((ar ? '\u062e\u0637\u0623: ' : 'Erreur: ') + (e.message || e), true);
    } finally {
      if(btn){ btn.disabled = false; btn.classList.remove('opacity-60'); }
    }
  };

  function applyAiToForm(parsed){
    if(!parsed || typeof parsed !== 'object') return;
    if(parsed.clientName && typeof state !== 'undefined'){
      var name = String(parsed.clientName).trim().toLowerCase();
      var found = (state.clients||[]).find(function(c){ return (c.name||'').toLowerCase() === name || (c.name||'').toLowerCase().indexOf(name)>=0; });
      var sel = document.getElementById('inv-client');
      if(sel && found){ sel.value = found.id; }
      else if(sel && parsed.clientName){
        try { toast((typeof locale!=='undefined'&&locale==='ar')
          ? '\u0627\u0644\u0639\u0645\u064a\u0644 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f \u2014 \u0627\u062e\u062a\u0631\u0647 \u0623\u0648 \u0623\u0636\u0641\u0647 \u0645\u0646 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621'
          : 'Client introuvable \u2014 s\u00e9lectionnez-le ou cr\u00e9ez-le'); } catch(e){}
      }
    }
    if(parsed.dueDays && document.getElementById('inv-due')){
      var d = new Date();
      d.setDate(d.getDate() + (parseInt(parsed.dueDays,10)||30));
      document.getElementById('inv-due').value = d.toISOString().slice(0,10);
    }
    if(parsed.notes && document.getElementById('inv-notes')){
      document.getElementById('inv-notes').value = String(parsed.notes);
    }
    var items = Array.isArray(parsed.items) ? parsed.items : [];
    if(items.length && typeof itemRowHtml === 'function'){
      var box = document.getElementById('items-container');
      if(box){
        box.innerHTML = items.map(function(it){
          return itemRowHtml({
            description: it.description || '',
            qty: Number(it.qty)||1,
            unitPrice: Number(it.unitPrice)||0,
            tva: (it.tva!=null ? Number(it.tva) : 19)
          });
        }).join('');
        try { lucide.createIcons(); } catch(e){}
      }
    }
  }
})();
