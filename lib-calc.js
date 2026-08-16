/* FacturePro — shared calculations.
 *
 * Loaded first by app.js and directly by the public tool pages, so the
 * calculator someone finds through a search runs the same code as the one
 * inside the application. It must stay free of any dependency on `state`,
 * the DOM or the translations — everything it needs arrives as an argument.
 */

/* ---- Amount in words (French) ---- */
function numberToWords(n){if(n===0)return'zéro';const units=['','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf'];const tens=['','','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt'];function under1000(num){if(num<20)return units[num];if(num<100){const t=Math.floor(num/10),u=num%10;if(t===7||t===9)return tens[t]+(u===1&&t===7?' et ':'-')+under1000(10+u);return tens[t]+(u===1&&t!==8?' et ':(u?'-':''))+(t===8&&u===0?'s':units[u]);}const h=Math.floor(num/100),r=num%100;return(h>1?units[h]+' ':'')+'cent'+(h>1&&r===0?'s':'')+(r?' '+under1000(r):'');}if(n<1000)return under1000(n);if(n<1000000){const th=Math.floor(n/1000),r=n%1000;return(th>1?under1000(th)+' ':'')+'mille'+(r?' '+under1000(r):'');}if(n<1e9){const m=Math.floor(n/1e6),r=n%1e6;return under1000(m)+' million'+(m>1?'s':'')+(r?' '+numberToWords(r):'');}return String(n);}
function amountInWords(amount){const n=Math.round(amount||0);if(n===0)return'Zéro dinar';const w=numberToWords(n);return w.charAt(0).toUpperCase()+w.slice(1)+' dinars';}

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
