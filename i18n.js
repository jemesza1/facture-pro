/* FacturePro i18n FR/AR */
const I18N={
fr:{
nav:{dashboard:'Tableau de bord',invoices:'Factures',clients:'Clients',templates:'Modèles',settings:'Paramètres',help:'Aide',terms:'Conditions'},
actions:{newInvoice:'Nouvelle facture',newClient:'Nouveau client',save:'Enregistrer',back:'Retour',delete:'Supprimer',edit:'Modifier',preview:'Aperçu',pdf:'PDF',print:'Imprimer',addLine:'Ajouter une ligne',seeAll:'Voir tout',duplicate:'Dupliquer',export:'Exporter',import:'Importer'},
stats:{paid:'CA payé',pending:'En attente',overdue:'En retard',month:'Ce mois'},
inv:{title:'FACTURE',recent:'Dernières factures',empty:'Aucune facture',number:'N°',client:'Client',amount:'Montant',status:'Statut',date:'Date',due:'Échéance',billedTo:'Facturé à',desc:'Désignation',qty:'Qté',unit:'P.U. HT',vat:'TVA',subtotal:'Sous-total',totalTtc:'Total TTC',notes:'Conditions de paiement',words:'Arrêté la présente facture à la somme de'},
status:{brouillon:'Brouillon',envoyee:'Envoyée',payee:'Payée',enretard:'En retard',annulee:'Annulée'},
clients:{title:'Clients',empty:'Aucun client',name:'Nom',email:'Email',phone:'Téléphone',address:'Adresse',nif:'NIF'},
company:{name:'Raison sociale',address:'Adresse',nif:'NIF',nis:'NIS',rc:'RC',ai:'AI',rib:'RIB',bank:'Banque',logo:'Logo'},
tpl:{title:'24 modèles professionnels',pick:'Choisissez un modèle pour vos factures'},
help:{title:'Comment utiliser FacturePro',s1:'1. Renseignez votre entreprise dans Paramètres (NIF, RC, RIB).',s2:'2. Ajoutez vos clients.',s3:'3. Créez une facture, choisissez un modèle, téléchargez le PDF.',s4:'Vos données restent dans votre navigateur (localStorage).'},
terms:{title:"Conditions d'utilisation",p1:'FacturePro est un outil local. Aucune donnée n\'est envoyée sur nos serveurs.',p2:'Vous êtes responsable de la conformité de vos factures avec la législation algérienne.',p3:'Sauvegardez régulièrement via Export JSON.'},
privacy:'Vos données sont traitées localement dans votre navigateur et ne sont jamais stockées sur nos serveurs. · Created by CheMs SoUu',
langBtn:'العربية',
confirmDeleteClient:'Supprimer ce client ?',
confirmDeleteClientInvoices:'Ce client a des factures.\n\nOK = supprimer le client (les factures restent)\nAnnuler = ne rien faire',
deleted:'Client supprimé',
currency:' DA'
},
ar:{
nav:{dashboard:'لوحة التحكم',invoices:'الفواتير',clients:'العملاء',templates:'القوالب',settings:'الإعدادات',help:'المساعدة',terms:'الشروط'},
actions:{newInvoice:'فاتورة جديدة',newClient:'عميل جديد',save:'حفظ',back:'رجوع',delete:'حذف',edit:'تعديل',preview:'معاينة',pdf:'PDF',print:'طباعة',addLine:'إضافة سطر',seeAll:'عرض الكل',duplicate:'نسخ',export:'تصدير',import:'استيراد'},
stats:{paid:'رقم الأعمال المدفوع',pending:'قيد الانتظار',overdue:'متأخرة',month:'هذا الشهر'},
inv:{title:'فاتورة',recent:'آخر الفواتير',empty:'لا توجد فواتير',number:'رقم',client:'العميل',amount:'المبلغ',status:'الحالة',date:'التاريخ',due:'الاستحقاق',billedTo:'فاتورة إلى',desc:'البيان',qty:'الكمية',unit:'سعر الوحدة',vat:'الضريبة',subtotal:'المجموع الفرعي',totalTtc:'المجموع شامل الضريبة',notes:'شروط الدفع',words:'حررت هذه الفاتورة بمبلغ'},
status:{brouillon:'مسودة',envoyee:'مرسلة',payee:'مدفوعة',enretard:'متأخرة',annulee:'ملغاة'},
clients:{title:'العملاء',empty:'لا يوجد عملاء',name:'الاسم',email:'البريد',phone:'الهاتف',address:'العنوان',nif:'الرقم الجبائي'},
company:{name:'اسم الشركة',address:'العنوان',nif:'الرقم الجبائي',nis:'الرقم الإحصائي',rc:'السجل التجاري',ai:'المادة الضريبية',rib:'رقم الحساب',bank:'البنك',logo:'الشعار'},
tpl:{title:'24 قالبًا احترافيًا',pick:'اختر قالبًا لفواتيرك'},
help:{title:'كيفية استخدام فاتورة برو',s1:'1. أدخل بيانات شركتك في الإعدادات (NIF، RC، RIB).',s2:'2. أضف عملاءك.',s3:'3. أنشئ فاتورة، اختر قالبًا، حمّل PDF.',s4:'بياناتك تبقى في متصفحك فقط.'},
terms:{title:'شروط الاستخدام',p1:'فاتورة برو أداة محلية. لا تُرسل أي بيانات إلى خوادمنا.',p2:'أنت مسؤول عن توافق فواتيرك مع القانون الجزائري.',p3:'احفظ نسخة عبر تصدير JSON بانتظام.'},
privacy:'بياناتك تُعالَج محليًا في متصفحك ولا تُخزَّن أبدًا على خوادمنا. · Created by CheMs SoUu',
langBtn:'Français',
confirmDeleteClient:'حذف هذا العميل؟',
confirmDeleteClientInvoices:'هذا العميل لديه فواتير.\n\nموافق = حذف العميل (الفواتير تبقى)\nإلغاء = لا شيء',
deleted:'تم حذف العميل',
currency:' د.ج'
}
};
let locale=localStorage.getItem('fp_locale')||'fr';
function t(path){const parts=path.split('.');let cur=I18N[locale]||I18N.fr;for(const p of parts){if(cur==null)return path;cur=cur[p];}return typeof cur==='string'?cur:path;}
function toggleLocale(){locale=locale==='fr'?'ar':'fr';localStorage.setItem('fp_locale',locale);try{var sb=document.getElementById('sidebar');if(sb){sb.classList.add('-translate-x-full');sb.classList.remove('translate-x-0');}var ov=document.getElementById('sidebar-overlay');if(ov)ov.classList.add('hidden');if(typeof state!=='undefined')state.sidebarOpen=false;}catch(e){}applyLocale();if(typeof renderPage==='function')renderPage();}
function applyLocale(){
  document.documentElement.lang=locale;
  document.documentElement.dir=locale==='ar'?'rtl':'ltr';
  document.body.classList.toggle('font-arabic',locale==='ar');
  document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.getAttribute('data-i18n');if(k)el.textContent=t(k);});
  const btn=document.getElementById('lang-toggle');if(btn)btn.textContent=t('langBtn');
  if(typeof STATUS!=='undefined'){Object.keys(STATUS).forEach(k=>{if(I18N[locale].status[k])STATUS[k].label=I18N[locale].status[k];});}
  if(typeof lucide!=='undefined')try{lucide.createIcons();}catch(e){}
}
