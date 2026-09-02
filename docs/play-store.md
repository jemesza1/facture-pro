# La fiche Google Play

Tout ce qu'il faut coller dans la Play Console, et rien d'autre. Les images
sont dans `static/` et se refont avec `npm run shots` (jamais dans le build :
il faut un navigateur, et Vercel n'en a pas).

---

## Identité

| Champ | Valeur |
|---|---|
| Nom de l'application | **FacturePro Algérie** |
| Nom du package | `com.facturedz.app` |
| Catégorie | Entreprise (Business) |
| Site web | `https://www.facturedz.com` |
| Politique de confidentialité | `https://www.facturedz.com/conditions.html` |
| Type | Gratuite, sans achat intégré, sans publicité |

Le nom du package est définitif : Google ne permet pas de le changer après la
première publication, et `assetlinks.json` le nomme.

---

## Description courte (80 caractères max)

**Français**
```
Factures conformes à la fiscalité algérienne. Hors ligne, sans compte.
```
*(69 caractères)*

**العربية**
```
فواتير مطابقة للقانون الجزائري. بدون إنترنت، وبدون حساب.
```

---

## Description complète (4000 caractères max)

**Français**

```
FacturePro établit des factures conformes à la réglementation algérienne, sur
votre téléphone, sans connexion et sans créer de compte.

CE QU'ELLE FAIT
• Factures, devis, factures proforma, bons de livraison et bons de commande
• TVA 19 % et 9 %, calcul automatique
• Droit de timbre appliqué au paiement en espèces (art. 100 du Code du timbre)
• NIF, NIS, RC, AI — les mentions que l'administration exige
• Montant en toutes lettres, en français et en arabe
• Export PDF et Excel
• Suivi des paiements, des créances et des dépenses
• Relevé de compte par client
• Factures récurrentes
• Gestion des produits et du stock
• 34 modèles de facture
• Signature électronique apposée sur chaque facture
• Régime sans TVA (IFU, auto-entrepreneur) : mention légale automatique

OUTILS GRATUITS INCLUS
Calcul de la TVA, du droit de timbre, de la marge et du prix de vente, des
pourcentages et remises, du salaire net. Montant en lettres. Guide du G50,
plan comptable SCF, mentions obligatoires sur une facture.

VOS DONNÉES RESTENT CHEZ VOUS
Aucun compte, aucun serveur, aucune inscription. Vos factures et vos clients
sont enregistrés dans votre appareil et n'en sortent pas. Une sauvegarde vers
un fichier ou vers votre propre Google Drive reste possible, à votre demande.

FRANÇAIS ET ARABE
Toute l'application bascule d'une langue à l'autre, y compris le sens de
lecture.

SANS CONNEXION
Une fois ouverte, l'application fonctionne sans réseau. Utile en déplacement,
en dépôt, sur un chantier.

GRATUITE
Pas d'abonnement, pas d'achat intégré, pas de publicité.
```

**العربية**

```
FacturePro يُصدر فواتير مطابقة للتشريع الجزائري، من هاتفك، بدون إنترنت وبدون
إنشاء حساب.

ماذا يفعل
• فواتير، عروض أسعار، فواتير أولية، وصولات تسليم ووصولات طلب
• الرسم على القيمة المضافة 19% و9%، بحساب تلقائي
• حق الطابع عند الدفع نقداً (المادة 100 من قانون الطابع)
• NIF وNIS وRC وAI — البيانات التي تطلبها الإدارة
• المبلغ بالحروف، بالفرنسية والعربية
• تصدير PDF وExcel
• متابعة المدفوعات والديون والمصاريف
• كشف حساب لكل عميل
• فواتير متكررة
• تسيير المنتجات والمخزون
• 34 نموذج فاتورة
• توقيع إلكتروني يُطبع على كل فاتورة
• نظام بدون رسم (الضريبة الجزافية، مشروع ذاتي): العبارة القانونية تلقائياً

أدوات مجانية مدمجة
حساب الرسم على القيمة المضافة، حق الطابع، الربح وسعر البيع، النسب والتخفيضات،
الأجر الصافي. المبلغ بالحروف. دليل G50، دليل الحسابات SCF، البيانات الإجبارية
في الفاتورة.

بياناتك تبقى عندك
لا حساب، لا خادم، لا تسجيل. فواتيرك وعملاؤك محفوظون في جهازك ولا يغادرونه.
يمكنك حفظ نسخة في ملف أو في Google Drive الخاص بك، متى أردت.

بالفرنسية والعربية
التطبيق كله ينتقل بين اللغتين، بما في ذلك اتجاه القراءة.

بدون إنترنت
بعد فتحه أول مرة، يعمل التطبيق بدون شبكة. مفيد في التنقل، في المخزن، في الورشة.

مجاني
لا اشتراك، لا شراء داخل التطبيق، لا إعلانات.
```

---

## Images

| Fichier | Format | Usage Play |
|---|---|---|
| `static/icon-512.png` | 512×512 | Icône de l'application |
| `static/play-feature.png` | 1024×500 | Image de couverture (obligatoire) |
| `static/shot-dashboard.png` | 1080×1920 | Capture téléphone 1 |
| `static/shot-factures.png` | 1080×1920 | Capture téléphone 2 |
| `static/shot-outils.png` | 1080×1920 | Capture téléphone 3 (arabe) |
| `static/shot-invoice.png` | 1920×1080 | Capture tablette / grand écran |
| `static/shot-wide.png` | 1920×1080 | Capture tablette / grand écran |

Play demande **au moins 2** captures téléphone ; il y en a 3, dont une en
arabe, ce qui montre le bilinguisme sans avoir à l'expliquer.

---

## Questionnaire de classification du contenu

Application de gestion, sans contenu généré par les utilisateurs, sans
publicité, sans achat, sans localisation, sans partage de données. La réponse
est « non » à toutes les questions sur la violence, le sexe, les jeux d'argent
et les substances. Classification attendue : **Tout public / PEGI 3**.

## Sécurité des données

| Question | Réponse |
|---|---|
| L'application collecte-t-elle des données ? | **Non** |
| Les partage-t-elle avec des tiers ? | **Non** |
| Les données sont-elles chiffrées en transit ? | Oui (HTTPS) |
| L'utilisateur peut-il demander leur suppression ? | Oui — elles sont dans son appareil, il les efface lui-même |

C'est vrai et vérifiable : l'application ne fait aucune requête vers un autre
domaine, et une vérification du harnais l'impose (« nothing the page asked for
left this origin at all »). Vercel Web Analytics ne compte que des pages vues,
et le service worker laisse passer son signal sans le mettre en cache.

---

## Ce qui reste à faire, dans l'ordre

1. **Créer l'application** dans la Play Console — nom, langue par défaut
   (français), gratuite.
2. **Générer le paquet** avec [PWABuilder](https://www.pwabuilder.com) ou
   [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) à partir de
   `https://www.facturedz.com`. Nom de package : `com.facturedz.app`.
3. **Envoyer le `.aab`** et activer la signature par Google Play.
4. **Relever l'empreinte SHA-256** que la Play Console affiche alors
   (Configuration → Intégrité de l'application → certificat de signature),
   la placer dans `static/.well-known/assetlinks.json`, puis déployer.
   Tant qu'elle manque, l'application s'ouvre avec la barre d'adresse de
   Chrome : c'est le seul symptôme, et il disparaît dès que le fichier est en
   ligne.
5. **Test fermé** : 12 testeurs, inscrits sans interruption pendant 14 jours.
   Un testeur qui se désinscrit puis revient remet son compteur à zéro.
6. **Demander l'accès à la production**, une fois les 14 jours écoulés.

Le point 4 est le seul qui touche ce dépôt. Le reste se passe dans la console.
