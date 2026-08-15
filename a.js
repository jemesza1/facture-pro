/* HOTFIX loader - restore full a.js from last good commit */
(function(){
  var s=document.createElement('script');
  s.src='https://cdn.jsdelivr.net/gh/jemesza1/facture-pro@88fa9a3e24a2df7049507a7286e66175fa858a5a/a.js';
  s.async=false;
  document.head.appendChild(s);
})();
