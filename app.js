(function(){
function load(src){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(src)};document.head.appendChild(s);});}
var files=["a.js","b1.js","b2a.js","b2b.js","c1.js","c2.js"];
files.reduce(function(p,f){return p.then(function(){return load(f);});},Promise.resolve())
.then(function(){
  try{if(typeof applyLocale==="function")applyLocale();}catch(e){}
  try{if(typeof initApp==="function")initApp();else{loadData();navigate("dashboard");}}catch(e){console.error(e);}
  try{lucide.createIcons();}catch(e){}
})
.catch(function(e){console.error("Load fail",e);var m=document.getElementById("main-content");if(m)m.innerHTML="<p class=\"p-4 text-red-600\">Erreur chargement. Ctrl+Shift+R.</p>";});
})();
