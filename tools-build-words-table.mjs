/* Le tableau des sommes courantes de montant-en-lettres.html.
 *
 * Les lignes sont ecrites en dur dans la page pour qu'un robot les voie sans
 * executer de script — c'est toute leur raison d'etre, repondre a « 9000
 * dinars en lettres » depuis les resultats de recherche. Mais du texte fige a
 * cote d'une fonction vivante finit par mentir : les accords de vingt et de
 * cent ont change apres coup, et le tableau, lui, ne bouge pas tout seul.
 *
 * Ce script le reecrit depuis amountInWords et amountInWordsAr. Le harnais
 * verifie ensuite chaque ligne dans le navigateur, si bien qu'oublier de
 * relancer ce script fait echouer la suite plutot que de passer inapercu.
 *
 *   node tools-build-words-table.mjs
 *
 * Il n'est pas dans `npm run build` : rien ne l'appelle en deploiement, et le
 * fichier qu'il modifie est un fichier source, pas une sortie.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PAGE = join(ROOT, 'montant-en-lettres.html');

/* Les sommes que les gens tapent reellement, relevees dans la Search Console.
   Pas une suite ronde inventee : 18 000 et 170 000 sont la parce qu'on les
   cherche. */
const AMOUNTS = [1000, 2000, 3000, 5000, 9000, 10000, 15000, 18000, 20000, 25000,
                 30000, 50000, 60000, 80000, 100000, 150000, 170000, 200000,
                 500000, 1000000];

const ctx = createContext({ window: {} });
runInContext(await readFile(join(ROOT, 'lib-calc.js'), 'utf8'), ctx);

/* L'espace fine insecable est celle qu'Intl pose dans le reste du site. */
const group = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const rows = AMOUNTS.map(n =>
  '        <tr><td class="py-1.5 pe-4 font-semibold whitespace-nowrap" dir="ltr">' +
  group(n) + ' DA</td>' +
  '<td class="py-1.5 pe-4" dir="ltr" lang="fr">' + ctx.amountInWords(n) + '</td>' +
  '<td class="py-1.5" dir="rtl" lang="ar">' + ctx.window.amountInWordsAr(n) + '</td></tr>'
).join('\n');

const html = await readFile(PAGE, 'utf8');
const re = /(<tbody id="tbl-amounts"[^>]*>\n)[\s\S]*?(\n\s*<\/tbody>)/;
if (!re.test(html)) { console.error('tbody id="tbl-amounts" introuvable'); process.exit(1); }
const out = html.replace(re, (_, open, close) => open + rows + close);
await writeFile(PAGE, out);
console.log(AMOUNTS.length + ' lignes reecrites dans montant-en-lettres.html');
