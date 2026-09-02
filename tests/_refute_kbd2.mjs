import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='/home/user/facture-pro/public';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon','.woff2':'font/woff2'};
const srv=http.createServer((req,res)=>{let u=decodeURIComponent(req.url.split('?')[0]); if(u==='/')u='/index.html';
 const f=path.join(ROOT,u); if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end('nf');return;}
 res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); fs.createReadStream(f).pipe(res);});
await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH});
async function run(loc){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(l=>{localStorage.setItem('fp_warn_seen','1');localStorage.setItem('fp_last_export',String(Date.now()-864e5));localStorage.setItem('fp_locale',l);},loc);
  const p=await ctx.newPage();
  await p.goto(`http://127.0.0.1:${port}/index.html`,{waitUntil:'networkidle'});
  await p.waitForFunction(()=>typeof window.showShortcuts==='function',{timeout:20000});
  await p.waitForTimeout(400);
  await p.keyboard.press('Shift+Slash'); await p.waitForTimeout(350);
  const r=await p.evaluate(()=>({lang:document.documentElement.lang,dir:document.documentElement.dir,
    kbds:[...document.querySelectorAll('#modal-root kbd')].map(k=>k.textContent),
    descs:[...document.querySelectorAll('#modal-root td:nth-child(2)')].map(k=>k.textContent.slice(0,14)),
    dirs:[...document.querySelectorAll('#modal-root kbd')].map(k=>getComputedStyle(k).direction)}));
  await ctx.close(); return r;
}
const fr=await run('fr'); const ar=await run('ar');
console.log('FR', JSON.stringify(fr));
console.log('AR', JSON.stringify(ar));
console.log('KEY COLUMN IDENTICAL IN BOTH LOCALES:', JSON.stringify(fr.kbds)===JSON.stringify(ar.kbds));
await browser.close(); srv.close();
