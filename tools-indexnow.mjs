/* Prevenir les moteurs qu'une page a change, au lieu d'attendre qu'ils
   repassent.
 *
 * Bing recommandait IndexNow sur le tableau de bord du site. Le protocole
 * tient en deux choses : une cle publique servie a la racine du domaine, et
 * un envoi de la liste des adresses modifiees. Bing, Yandex et Seznam
 * partagent la meme soumission — une seule suffit pour les trois. Google n'y
 * participe pas et continue de passer a son rythme.
 *
 * La cle n'est pas un secret : le protocole exige qu'elle soit lisible par
 * tout le monde a la racine, et c'est precisement ce qui prouve au moteur que
 * celui qui soumet tient le domaine. Elle vit donc dans le depot comme
 * robots.txt.
 *
 * Les adresses viennent du sitemap construit, pas d'une liste tenue a la
 * main : une page ajoutee est soumise sans que personne ait a y penser, et
 * une page retiree cesse de l'etre.
 *
 *   node tools-indexnow.mjs            soumet toutes les adresses du sitemap
 *   node tools-indexnow.mjs --dry      montre ce qui partirait, sans envoyer
 */
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = '3aabb8798485c10b49cd4d563df39b15';
const HOST = 'www.facturedz.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const xml = await readFile(join(ROOT, 'public', 'sitemap.xml'), 'utf8');
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].trim());

if (!urls.length) {
  console.error('sitemap vide ou illisible : rien a soumettre');
  process.exit(1);
}
/* Une adresse d'un autre domaine ferait rejeter le lot entier. */
const foreign = urls.filter(u => !u.startsWith(`https://${HOST}/`));
if (foreign.length) {
  console.error(`le sitemap nomme un autre domaine, soumission annulee :\n  ${foreign.join('\n  ')}`);
  process.exit(1);
}

console.log(`${urls.length} adresses, cle ${KEY.slice(0, 8)}…`);
if (process.argv.includes('--dry')) {
  console.log(urls.join('\n'));
  console.log('(--dry : rien n\'a ete envoye)');
  process.exit(0);
}

const res = await fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls,
  }),
});
const body = await res.text().catch(() => '');
/* 200 et 202 valent tous deux acceptation ; 403 veut dire que la cle n'est
   pas encore servie a la racine — deployer avant de soumettre. */
console.log(`${res.status} ${res.statusText}${body ? ' — ' + body.slice(0, 200) : ''}`);
process.exit(res.status === 200 || res.status === 202 ? 0 : 1);
