/* FacturePro — shared calculations.
 *
 * Loaded first by app.js and directly by the public tool pages, so the
 * calculator someone finds through a search runs the same code as the one
 * inside the application. It must stay free of any dependency on `state`,
 * the DOM or the translations — everything it needs arrives as an argument.
 */

/* ---- Amount in words (French) ---- */
function numberToWords(n){if(n===0)return'zéro';const units=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];const tens=['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];function under1000(num){if(num<20)return units[num];if(num<100){const t=Math.floor(num/10),u=num%10;if(t===7||t===9)return tens[t]+(u===1&&t===7?' et ':'-')+under1000(10+u);return tens[t]+(u===1&&t!==8?' et ':(u?'-':''))+(t===8&&u===0?'s':units[u]);}const h=Math.floor(num/100),r=num%100;return(h>1?units[h]+' ':'')+'cent'+(h>1&&r===0?'s':'')+(r?' '+under1000(r):'');}if(n<1000)return under1000(n);if(n<1000000){const th=Math.floor(n/1000),r=n%1000;return(th>1?under1000(th)+' ':'')+'mille'+(r?' '+under1000(r):'');}if(n<1e9){const m=Math.floor(n/1e6),r=n%1e6;return under1000(m)+' million'+(m>1?'s':'')+(r?' '+numberToWords(r):'');}return String(n);}
/* Negative amounts arrive from a credit note. numberToWords walks the digits
   and returns undefined below zero, which used to throw here and take the
   whole preview down with it. The wording is spelt out rather than made
   positive because the law asks the letters to match the figures, and the
   figures on an avoir are negative. */
function amountInWords(amount){
  const v=Math.round(amount||0);
  if(v===0)return'Zéro dinar';
  const w=numberToWords(Math.abs(v));
  const s=w.charAt(0).toUpperCase()+w.slice(1)+' dinars';
  return v<0 ? 'Moins '+s.charAt(0).toLowerCase()+s.slice(1) : s;
}

/* ---- TVA ----
   Algeria applies 19 % as the standard rate and 9 % as the reduced one; 0 %
   covers exempt lines. Nothing is rounded here: calcInvoiceTotals sums many
   lines and must round once at the end, not once per line. The display layer
   rounds. */
/* Written as ht * (rate/100), not ht * rate / 100. The two differ in the
   thirteenth decimal — 13333.33 at 9 % gives 1199.9996999999998 one way and
   1199.9997 the other — and calcInvoiceTotals has always used the first. This
   helper exists to unify the expression, not to quietly re-derive totals on
   invoices that are already issued. */
function vatAmount(ht, rate){ return (Number(ht) || 0) * ((Number(rate) || 0) / 100); }
function ttcFromHt(ht, rate){ return (Number(ht) || 0) + vatAmount(ht, rate); }
/* The one people actually need: a shelf price is TTC, the declaration wants HT. */
function htFromTtc(ttc, rate){ return (Number(ttc) || 0) / (1 + (Number(rate) || 0) / 100); }

/* ---- Droit de timbre — art. 100 du Code du timbre, barème LF 2025 ----
   Due on cash settlements only. Applied to the TTC amount:
       up to  30 000 DA  ->  1   %
       30 000 to 100 000 ->  1,5 %
       above 100 000     ->  2   %
   Minimum 5 DA, and no ceiling. The 10 000 DA cap that older guides still
   mention was abolished; do not reintroduce it, whatever a search result says. */
function timbreRate(a){return a<=30000?1:(a<=100000?1.5:2);}
function timbreFor(amount){
  var a=Math.round(Number(amount)||0);
  if(a<=0)return 0;
  var d=a*timbreRate(a)/100;
  if(d<5)d=5;
  return Math.round(d*100)/100;
}

/* ---- IRG sur les traitements et salaires — art. 104 du CIDTA ----
   Source: Direction Générale des Impôts, "IRG — Traitements et salaires",
   barème issu de l'art. 31 de la LF 2022. Consulté le 17/08/2026.

   Everything here takes the MONTHLY TAXABLE salary, not the gross one. The
   DGI lists what comes off first — retenues pour pensions ou retraites, and
   the cotisation ouvrière aux assurances sociales (9 % CNAS) — and the barème
   applies to what is left. Feeding this function a gross salary overstates the
   tax by thousands of dinars, so the caller does the subtraction.

   The brackets are stated annually; the retenue is "calculée par
   mensualisation", so a month is the annual tax on twelve months, divided by
   twelve. That is not the same as taxing one month against annual brackets.

   The 40 % abattement comes off the TAX, not off the salary, and is bounded
   at 1 000 and 1 500 DA a month.

   Two bands then get a second abattement, each with its own formula. The
   formulas look arbitrary and are not: each one is the straight line that
   sends the bottom of its band to zero and leaves the top of its band
   untouched. That is what makes them worth trusting, and it is what the tests
   assert — every constant below is wrong if those four endpoints do not land.
*/
var IRG_BRACKETS=[[240000,0],[480000,0.23],[960000,0.27],[1920000,0.30],[3840000,0.33],[Infinity,0.35]];

/* Tax on a full year of taxable income, before any abattement. */
function irgBareme(annual){
  var a=Number(annual)||0, tax=0, low=0, i;
  for(i=0;i<IRG_BRACKETS.length;i++){
    if(a<=low)break;
    tax+=(Math.min(a,IRG_BRACKETS[i][0])-low)*IRG_BRACKETS[i][1];
    low=IRG_BRACKETS[i][0];
  }
  return tax;
}

/* One month, after the 40 % abattement and nothing else. */
function irgFirstAbattement(monthly){
  var brut=irgBareme((Number(monthly)||0)*12)/12;
  if(brut<=0)return 0;
  return Math.max(0, brut-Math.min(1500, Math.max(1000, brut*0.40)));
}

/* The monthly retenue à la source.
   `reduced` selects the track for travailleurs handicapés et retraités, whose
   relief band runs to 42 500 instead of 35 000. */
function irgFor(monthly, reduced){
  var m=Number(monthly)||0;
  if(m<=30000)return 0;                                  /* exonération totale */
  var first=irgFirstAbattement(m);
  if(reduced)return m<=42500 ? Math.max(0, first*(93/61)-(81213/41)) : first;
  return m<=35000 ? Math.max(0, first*(137/51)-(27925/8)) : first;
}

/* Primes, rappels, gratifications: treated as a separate month and withheld
   flat, so they never push the salary into a higher bracket. */
function irgOnBonus(amount){ return (Number(amount)||0)*0.10; }
