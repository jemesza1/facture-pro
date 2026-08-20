(function(){
function load(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(src)};document.head.appendChild(s);});}
var V="20260820c";
var core=["lib-calc.js","a.js","dash-fix.js","b1.js","b2a.js","b2b.js","c1.js","c2.js","extra.js","pro-polish.js","commerce.js","lib-xlsx.js","excel.js","backup.js","avoir.js","bl.js","depenses.js"];
try{localStorage.removeItem("fp_xai_key");}catch(e){}
core.reduce(function(p,f){return p.then(function(){return load(f+"?v="+V);});},Promise.resolve())
.then(function(){
  try{if(typeof applyLocale==="function")applyLocale();}catch(e){}
  try{if(typeof initApp==="function")initApp();else{loadData();var _p=(typeof state!=="undefined"&&state.currentPage)||"dashboard";var _ok=["dashboard","invoices","devis","products","payments","expenses","debts","clients","templates","settings","help","terms"];navigate(_ok.indexOf(_p)>-1?_p:"dashboard");}}catch(e){console.error(e);}
  try{if(typeof paintBackupNotice==="function")paintBackupNotice();}catch(e){}
  try{lucide.createIcons();}catch(e){}
})
.catch(function(e){console.error("Load fail",e);var m=document.getElementById("main-content");if(m)m.innerHTML="<p class=\"p-4 text-red-600\">Erreur chargement. Ctrl+Shift+R.</p>";});
})();
