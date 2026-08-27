import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext(); await ctx.route('**fonts.g**',r=>r.abort());
const num = s => parseFloat(String(s).replace(/[^\d,.-]/g,'').replace(/\s/g,'').replace(',','.'));
let bad=0;
const eq=(name,got,want,eps=0.02)=>{const ok=Math.abs(got-want)<=eps;if(!ok)bad++;console.log((ok?'  ok  ':'  FAIL')+' '+name.padEnd(46)+got+'  (want '+want+')');};

// ---------- MARGE ----------
const pg=await ctx.newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(e.message.slice(0,80)));
await pg.goto('http://127.0.0.1:8899/calcul-marge.html',{waitUntil:'load'}); await pg.waitForTimeout(1200);
async function marge(pa,val,mode,rate){
  await pg.click(`button.seg[data-mode="${mode}"]`);
  await pg.click(`button.seg[data-rate="${rate}"]`);
  await pg.fill('#pa',String(pa)); await pg.fill('#val',String(val));
  await pg.waitForTimeout(180);
  return pg.evaluate(()=>({pvht:document.getElementById('v-pvht').textContent,
    pvttc:document.getElementById('v-pvttc').textContent, marge:document.getElementById('v-marge').textContent,
    tmarge:document.getElementById('v-tmarge').textContent, tmarque:document.getElementById('v-tmarque').textContent,
    coef:document.getElementById('v-coef').textContent, err:document.getElementById('err').classList.contains('hidden')?'':document.getElementById('err').textContent}));
}
console.log('\n== MARGE ==');
// the worked example from the page: 1000 @ 40% marge -> PV 1400, marque 28.6%
let r=await marge(1000,40,'marge',19);
eq('marge 40% -> PV HT',num(r.pvht),1400); eq('  -> taux de marque',num(r.tmarque),28.6,0.06);
eq('  -> TTC @19%',num(r.pvttc),1666);
// 1000 @ 40% marque -> PV 1666.67
r=await marge(1000,40,'marque',19);
eq('marque 40% -> PV HT',num(r.pvht),1666.67,0.02); eq('  -> taux de marge',num(r.tmarge),66.7,0.06);
// coefficient 1.5 on 1000, TVA 19 -> PV TTC = 1500
r=await marge(1000,1.5,'coef',19);
eq('coef 1,5 -> PV TTC',num(r.pvttc),1500); eq('  -> coef back',num(r.coef),1.5,0.002);
// known selling price 1666 TTC @19 -> HT 1400
r=await marge(1000,1666,'pv',19);
eq('PV TTC 1666 -> PV HT',num(r.pvht),1400,0.6);
// exonere: TTC == HT
r=await marge(1000,25,'marge',0);
eq('exonere -> TTC == HT',num(r.pvttc),1250);
// guards
r=await marge(1000,100,'marque',19); console.log('  marque 100% guard  :', r.err?'shown':'MISSING'); if(!r.err)bad++;
r=await marge(1000,0.8,'coef',19);   console.log('  coef < 1 guard     :', r.err?'shown':'MISSING'); if(!r.err)bad++;
r=await marge(1000,500,'pv',19);     console.log('  selling at a loss  :', r.err?'shown':'MISSING'); if(!r.err)bad++;
console.log('  script errors      :', errs.length?errs.join(' | '):'none'); if(errs.length)bad++;

// ---------- POURCENTAGE ----------
const p2=await ctx.newPage(); const e2=[]; p2.on('pageerror',e=>e2.push(e.message.slice(0,80)));
await p2.goto('http://127.0.0.1:8899/calcul-pourcentage.html',{waitUntil:'load'}); await p2.waitForTimeout(1000);
async function pc(a,bb,op){
  await p2.click(`button.seg[data-op="${op}"]`);
  await p2.fill('#a',String(a)); await p2.fill('#b',String(bb));
  await p2.waitForTimeout(150);
  return p2.evaluate(()=>[1,2,3].map(i=>document.getElementById('v'+i).textContent));
}
console.log('\n== POURCENTAGE ==');
let v=await pc(10000,20,'remise');  eq('remise 20% of 10000',num(v[2]),8000);
v=await pc(8000,20,'hausse');       eq('then +20% -> not 10000',num(v[2]),9600);
v=await pc(8000,25,'hausse');       eq('but +25% -> 10000',num(v[2]),10000);
v=await pc(10000,19,'part');        eq('19% of 10000',num(v[2]),1900);
v=await pc(10000,12000,'ecart');    eq('10000 -> 12000',num(v[2]),20);
v=await pc(12000,10000,'ecart');    eq('12000 -> 10000',num(v[2]),16.67,0.02);
v=await pc(0,100,'ecart');          console.log('  zero base            :', v[2]==='—'?'blank ok':'LEAKED '+v[2]); if(v[2]!=='—')bad++;
console.log('  script errors        :', e2.length?e2.join(' | '):'none'); if(e2.length)bad++;

console.log('\n'+(bad?('*** '+bad+' PROBLEM(S)'):'all correct'));
await b.close();
