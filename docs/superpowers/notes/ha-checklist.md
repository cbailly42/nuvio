# Checklist de validation dans Home Assistant (français)

Pour Corentin. Cette validation ne peut pas être faite hors de votre Home Assistant (spec § 8). Cochez au fur et à mesure ; notez pour chaque défaut l'écran, la langue active et le texte fautif (capture si possible).

## 0. Installation de la version à tester

Le build de référence est celui de la branche `ccr-20154da5-ss5q37` du fork `cbailly42/nuvio` (ou d'une release du fork, si vous en créez une).

- [ ] **Voie principale : installation manuelle depuis un checkout de la branche** `ccr-20154da5-ss5q37` du fork (`git clone -b ccr-20154da5-ss5q37 https://github.com/cbailly42/nuvio`). Copier tout le contenu de `dist/` (`nuvio.js`, `nuvio-core.<hash>.js`, `nuvio-locale-*`, `nuvio-font-*`, `nuvio-bg-*`, `nuvio-meteo-*`, tous à plat) dans `/config/www/nuvio/` et ajouter la ressource `/local/nuvio/nuvio.js` (type : **module JavaScript**), comme dans `docs/installation.md` (section *Manual*). Si Nuvio est déjà installé via HACS, désactiver d'abord l'ancienne ressource `/hacsfiles/nuvio/nuvio.js` pour ne pas charger deux builds.
- [ ] **Voie HACS (décision de Corentin, rien n'est fait ici)** : HACS ne propose que la branche par défaut tant que le dépôt n'a pas de release, et télécharge la dernière release s'il y en a une. La branche par défaut du fork (`main`) ne contient pas ce travail. Pour tester via HACS, il faut donc d'abord soit fusionner la branche dans `main` du fork, soit publier une release / un tag du fork. Ensuite : HACS → ⋮ → *Custom repositories* → `https://github.com/cbailly42/nuvio`, catégorie **Dashboard**, installer **Nuvio** (ressource `/hacsfiles/nuvio/nuvio.js`).
- [ ] Fichiers attendus (HACS : `/config/www/community/nuvio/`, manuel : `/config/www/nuvio/`) : **`nuvio.js`**, **`nuvio-core.<hash>.js`**, **`nuvio-locale-fr.<hash>.json`** et **`nuvio-locale-pl.<hash>.json`** (l'anglais est embarqué dans le core ; tous à plat, comme les `nuvio-bg-*`). Sans les catalogues, l'interface reste en anglais et la console affiche un `console.warn`.
- [ ] **Confirmer le build chargé** : onglet Réseau du navigateur, le fichier `nuvio-core.<hash>.js` doit porter le hash du build testé (hash du `dist/nuvio-core.*.js` du checkout) ; en mode édition, la fenêtre « Ajouter un composant » affiche la version du bundle chargé (`v…`, infobulle « version du bundle chargé »). Vider le cache / recharger en forçant après chaque mise à jour.
- [ ] Tableau de bord : Paramètres → Tableaux de bord → *Ajouter* → *Nouveau tableau de bord à partir de zéro*, éditeur de configuration brute :

  ```yaml
  strategy:
    type: custom:nuvio
  ```

- [ ] Ouvrir la console du navigateur (F12) pendant toute la validation : aucune erreur rouge liée à Nuvio, pas de `404` sur `nuvio-locale-*.json`.

## 1. Assistant de premier lancement (wizard)

Utiliser un profil / navigateur neuf (ou réinitialiser le choix de langue : le choix est stocké dans `localStorage` (`nuvio:lang`) et dans les données utilisateur HA (même clé), donc le remettre sur *Automatique* dans les réglages Nuvio, ou utiliser un nouvel utilisateur HA) pour relancer l'assistant.

- [ ] Étape de choix de la langue : EN, PL et FR proposés avec leur nom (Français) et leur drapeau.
- [ ] Choisir Français : l'assistant passe en français immédiatement, sans rechargement.
- [ ] Parcourir **chaque étape** de l'assistant : titres, explications, boutons (Suivant / Retour / Terminer…), champs, messages d'erreur, résumé final.
- [ ] Vouvoiement cohérent, espaces insécables avant `: ; ! ? »`, pas de texte anglais ou polonais résiduel.

## 2. Chaque vue du tableau de bord

Pour chaque vue générée (accueil, pièces, lumières, climat, sécurité, médias, énergie, météo, agenda, utilisateurs, assistant… selon vos entités) :

- [ ] Titre de la vue et navigation (barre / menu latéral) en français ; salutation « Bonjour, <prénom> ».
- [ ] Cartes : libellés, états (allumé, éteint, ouvert, fermé, indisponible…), unités, boutons, tooltips, info-bulles.
- [ ] États bruts de Home Assistant traduits (`states.*`) ; météo (conditions, prévisions courtes).
- [ ] Pluriels corrects (« 1 entité » / « 2 entités », « 0 »…).
- [ ] Menu utilisateur, paramètres Nuvio, fenêtre de sauvegarde / import, utilisateurs, Assist.
- [ ] Sélecteur de cartes (picker) : noms et descriptions des cartes Nuvio en français.
- [ ] Les valeurs brutes d'attribut HA (par ex. `auto`, `sleep`, `humidifying`) peuvent rester en anglais : connu, hors périmètre (voir description de PR).

## 3. Mode édition

- [ ] Entrer en mode édition : barre d'outils, panneaux, inspecteur, libellés de tailles, sélecteurs.
- [ ] Ajouter / déplacer / supprimer une carte et une section : tous les textes en français.
- [ ] Éditeurs de cartes (formulaires, aides, options déroulantes, avertissements).
- [ ] Messages de confirmation et boîtes de dialogue.
- [ ] Sauvegarde / restauration de la configuration : libellés et erreurs d'import.

## 4. Toasts et messages

- [ ] Déclencher des toasts (enregistrement, erreur, copie, changement de langue…) : texte en français, `aria-label` du toast.
- [ ] Message d'erreur ou état « hors ligne / indisponible » d'une carte.

## 5. Écrans de veille

- [ ] Activer chaque écran de veille (horloge, verre, etc.) : date, jour de la semaine, mois en français, format 24 h.
- [ ] Texte d'invite pour quitter la veille, météo / agenda affichés dans la veille.

## 6. Dates, nombres, « il y a … »

- [ ] Dates longues et courtes (jours, mois) en français ; premier jour de semaine cohérent avec la locale.
- [ ] Nombres : virgule décimale, séparateur de milliers, espace insécable avant `%`, `°C`, `kWh`, `W` quand c'est attendu. (Connu : certains rendus d'unité sans espace insécable, typographie seule.)
- [ ] Prix / devise : la devise par défaut reste le zł (hors périmètre).
- [ ] Journal d'activité (logbook), cartes serrure, caméras, agenda : « il y a 5 min », « il y a 2 h », « hier » formés par `Intl.RelativeTimeFormat` en `fr-FR`.
- [ ] Durées / minuteurs (« 4 min », « 1 h 20 »).

## 7. Changement de langue sans rechargement

- [ ] Réglages ou menu utilisateur : PL → FR → EN → FR, **sans rechargement de page**.
- [ ] Après chaque changement : aucun affichage mixte (ni polonais dans le français, ni l'inverse), y compris cartes, navigation, titres de vues, sélecteur de cartes, fenêtres ouvertes.
- [ ] Le choix persiste après rechargement ; il est synchronisé sur un second appareil (utilisateur identique), qui change alors de langue.
- [ ] Option YAML `language: fr` de la stratégie : prise en compte ; `language: de` (non disponible) : retombe sur la langue du navigateur (changement de comportement assumé).

## 8. Navigateur en français

- [ ] Profil navigateur neuf (ou fenêtre privée) dont la langue préférée est `fr` / `fr-FR` / `fr-CA`, sans choix Nuvio ni option `language:` : Nuvio s'ouvre en français.
- [ ] Navigateur en langue inconnue (par ex. `de`) : anglais.
- [ ] Onglet Réseau : `nuvio-locale-fr.<hash>.json` est demandé en parallèle du core (préchargement par `nuvio.js`) ; aucune requête de catalogue en anglais.

## 9. Carte seule hors stratégie (tableau de bord classique)

- [ ] Dans un tableau de bord Lovelace classique (sans la stratégie Nuvio), ajouter une carte Nuvio (par ex. `type: custom:nuvio-light-card`) via YAML ou le sélecteur.
- [ ] Avec un navigateur ou un choix en français : la carte peut s'afficher brièvement en anglais, puis **passe en français à l'arrivée du catalogue**, sans rechargement (comportement attendu, voir description de PR).
- [ ] Même test avec le choix PL.

## 10. Aucune clé brute visible

- [ ] Sur tous les écrans ci-dessus : aucun texte du type `cards.xxx.yyy`, `edit.zzz` ou `#123` (clé brute = texte manquant dans toutes les langues).
- [ ] Rechercher (Ctrl+F) `cards.`, `edit.`, `nav.`, `wizard.`, `states.` dans la page et les shadow DOM visibles.
- [ ] Console : aucun `console.warn` de clé ou de catalogue manquant.

## 11. Non-régression PL et EN

- [ ] En polonais et en anglais, l'affichage est identique à la v2.16.0, hormis les changements listés dans la description de PR (pluriels polonais « otwarte » / « kafelki », `SLEEP` → `Sleep` du purificateur).
- [ ] Le flux EN du composant « flow » : une erreur préexistante (identique à la v2.16.0) peut apparaître ; ce n'est pas une régression.

## Retour

Lister les défauts trouvés (écran, langue, texte attendu) : ils se corrigent dans `src/locales/fr.json` puis `python3 tools/build.py`. Une fois la validation terminée, c'est à vous de décider d'ouvrir (ou non) la PR vers l'auteur ; rien n'est publié chez lui sans votre accord.
