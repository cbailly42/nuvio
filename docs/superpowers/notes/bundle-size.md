# Poids du bundle après la refonte i18n (mesure ponctuelle, Task 8)

Mesure unique demandée par la spec (§ 3.1 bis, § 8) ; aucun seuil n'est appliqué au build.

**Méthode** : `stat -c %s <fichier>` pour la taille brute, `gzip -9 -c <fichier> | wc -c` pour la taille gzip (le nom du fichier est
stocké dans l'en-tête gzip). Cette méthode redonne exactement la référence v2.16.0 : `dist/nuvio-core.8ce6783f.js` (commit `61a2167`)
= 1 413 609 octets bruts / 415 975 octets gzip.

| Fichier | Brut (octets) | gzip -9 (octets) | Écart brut vs v2.16.0 | Écart gzip vs v2.16.0 |
|---|---:|---:|---:|---:|
| `nuvio-core.8ce6783f.js` (v2.16.0, référence) | 1 413 609 | 415 975 | – | – |
| `nuvio-core.37b9d890.js` (avant Task 8, `11d1aab`) | 1 376 611 | 393 015 | −36 998 (−2,6 %) | −22 960 (−5,5 %) |
| `nuvio-core.0cdae8ae.js` (Task 8) | **1 370 975** | **390 274** | **−42 634 (−3,0 %)** | **−25 701 (−6,2 %)** |
| `nuvio-locale-pl.05001990.json` (avant Task 8) | 67 475 | 21 657 | | |
| `nuvio-locale-pl.4ea2f8ad.json` (Task 8) | **70 401** | **22 099** | | |

Le core embarque toujours l'anglais compilé (`HG_I18N_EN`) et le manifeste ; le polonais n'est téléchargé que si la langue
active est `pl`. Un utilisateur polonais charge donc 390 274 + 22 099 = 412 373 octets gzip (−3 602 par rapport à la v2.16.0),
un utilisateur anglais 390 274 (−25 701).

Le catalogue PL compilé (70 Ko brut / 22 Ko gzip) dépasse l'estimation de la spec (~40 Ko / ~15 Ko) : il contient aussi les
tables dynamiques `d` (états HA, météo, options des cartes) et les formes plurielles `one/few/many/other` ; la passe R17 de la
Task 8 (clés à `{count}` passées en pluriel, texte identique dans chaque forme pour ne rien changer à l'affichage) ajoute
~2,9 Ko brut / ~0,4 Ko gzip.
