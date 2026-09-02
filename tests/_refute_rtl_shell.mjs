import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const ROOT='/home/user/facture-pro/public';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
const srv=createServer(async(rq,rs)=>{let u=decodeURIComponent(rq.url.split('?')[0]);if(u==='/')u='/index.html';
 try{const b=await readFile(join(ROOT,u));rs.writeHead(200,{'Content-Type':T[extname(u)]||'text/plain'});rs.end(b);}catch{rs.writeHead(404);rs.end('nf');}});
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const B=`http://127.0.0.1:${srv.address().port}`;
const br=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
const ctx=await br.newContext({viewport:{width:412,height:915}});
const pg=await ctx.newPage();
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{
  localStorage.setItem('fp_locale','ar');
  localStorage.setItem('fp_warn_seen','1');
  localStorage.setItem('fp_last_export',String(Date.now()-864e5));
  localStorage.setItem('facturepro_dz_v24', JSON.stringify({company:{name:'شركة الأطلس'},clients:[],invoices:[],products:[],devis:[],payments:[],expenses:[],recurring:[],nextInvoiceNumber:1,nextAvoirNumber:1,nextDevisNumber:1,currentPage:'dashboard'}));
});
await pg.goto(`${B}/index.html`);
await pg.waitForTimeout(1200);
console.log('lang/dir', await pg.evaluate(()=>[document.documentElement.lang,document.documentElement.dir]));
// 1. sidebar tagline
const tag = await pg.evaluate(()=>{const p=document.querySelector('#sidebar p.text-xs');return p?{text:p.textContent,vis:!!p.offsetParent||true}:null;});
console.log('tagline:', JSON.stringify(tag));
// 2. hamburger before opening
const dump = async(label)=>{
  const rows = await pg.evaluate(()=>Array.from(document.querySelectorAll('button')).map(b=>{
    const r=b.getBoundingClientRect();
    const vis = r.width>0&&r.height>0&&getComputedStyle(b).visibility!=='hidden'&&r.right>0&&r.left<innerWidth&&r.bottom>0&&r.top<innerHeight;
    return {al:b.getAttribute('aria-label'), i18n:b.getAttribute('data-i18n-aria'), vis, box:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};
  }).filter(x=>x.al));
  console.log(label, JSON.stringify(rows,null,0));
};
await dump('BEFORE-OPEN aria buttons:');
// open sidebar via hamburger
await pg.click('button[aria-label="Menu"]');
await pg.waitForTimeout(600);
await dump('AFTER-OPEN aria buttons:');
const sbText = await pg.evaluate(()=>document.getElementById('sidebar').innerText);
console.log('--- sidebar innerText ---\n'+sbText+'\n---');
// French leftovers visible on screen
const fr = await pg.evaluate(()=>{
  const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  while(w.nextNode()){const n=w.currentNode;const s=n.nodeValue.trim();if(!s)continue;
    const el=n.parentElement;const r=el.getBoundingClientRect();
    if(!(r.width>0&&r.height>0))continue;
    if(/[؀-ۿ]/.test(s))continue;
    if(/[A-Za-zÀ-ÿ]{3,}/.test(s))out.push({s,tag:el.tagName,cls:el.className&&String(el.className).slice(0,40)});
  }return out;});
console.log('non-Arabic visible text:', JSON.stringify(fr,null,1));
// now backup warn button: force it visible
const bw = await pg.evaluate(()=>{const d=document.getElementById('local-warn');return d?d.className:'none';});
console.log('local-warn class:', bw);
console.log('pageerrors:', errs);
await br.close();srv.close();
