(function(){
function load(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(src)};document.head.appendChild(s);});}
var GOOD='https://cdn.jsdelivr.net/gh/jemesza1/facture-pro@88fa9a3e24a2df7049507a7286e66175fa858a5a/';
var files=[
  GOOD+'a.js',
  'dash-fix.js',
  'b1.js',
  'b2a.js',
  'b2b.js',
  GOOD+'c1.js',
  GOOD+'c2.js'
];
files.reduce(function(p,f){return p.then(function(){return load(f);});},Promise.resolve())
.then(function(){
  try{if(typeof applyLocale==="function")applyLocale();}catch(e){}
  try{if(typeof initApp==="function")initApp();else{loadData();var _p=(typeof state!=="undefined"&&state.currentPage)||"dashboard";var _ok=["dashboard","invoices","clients","templates","settings","help","terms"];navigate(_ok.indexOf(_p)>-1?_p:"dashboard");}}catch(e){console.error(e);}
  try{lucide.createIcons();}catch(e){}
})
.catch(function(e){console.error("Load fail",e);var m=document.getElementById("main-content");if(m)m.innerHTML="<p class=\"p-4 text-red-600\">Erreur chargement. Ctrl+Shift+R.</p>";});
})();
