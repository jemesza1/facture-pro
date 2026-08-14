(function(){
function load(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(src)};document.head.appendChild(s);});}
Promise.resolve()
.then(function(){return load('a.js');})
.then(function(){return load('b.js');})
.then(function(){return load('c.js');})
.then(function(){try{if(typeof applyLocale==='function')applyLocale();}catch(e){}try{lucide.createIcons();}catch(e){}})
.catch(function(e){console.error('Load fail',e);var m=document.getElementById('main-content');if(m)m.innerHTML='<p class="p-4 text-red-600">Erreur chargement. Rechargez.</p>';});
})();
