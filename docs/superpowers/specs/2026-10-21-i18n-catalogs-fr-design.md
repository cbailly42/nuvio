# Refonte i18n en catalogues à clés + traduction française

- **Date** : 2026-10-21
- **Statut** : design validé en conversation, spec à relire
- **Dépôt** : fork `cbailly42/nuvio` (base : v2.16.0, commit `61a2167`)

## 1. Objectif

Ajouter le français à Nuvio (interface + documentation), en refondant le système i18n pour que l'ajout de dizaines de langues ultérieures se fasse sans toucher au code.

- Usage personnel d'abord (fork de Corentin), proposition en PR à l'auteur ensuite.
- **Rien n'est publié sur le dépôt de l'auteur original** (issue, PR, commentaire, push) sans accord explicite de Corentin au moment de l'action. Les push sur le fork `cbailly42/nuvio` sont autorisés. La PR doit se suffire à elle-même.

### Critères de réussite

1. Interface entièrement en français (vouvoiement) dans Home Assistant, validée par Corentin.
2. Polonais et anglais strictement identiques à l'affichage avant/après la refonte.
3. Ajouter une langue = ajouter un fichier JSON (+ une ligne de manifeste générée), sans modifier le code.
4. Documentation française complète : `README.fr.md`, `docs/fr/` (6 fichiers), `CHANGELOG.fr.md` (historique complet).
5. `tools/i18n_check.py` passe sans erreur avec `en`, `pl`, `fr` complets.

### Hors périmètre

- Devise par défaut en zł / PLN (carte carburant, `livekid`, `hg-page`) : localisation régionale, à traiter séparément.
- Captures d'écran françaises dans la doc.
- Traduction de `docs/STATUS.md` (pas de version polonaise non plus).
- Plateforme de traduction communautaire (Weblate, Crowdin) : le format choisi la rend possible, sans la mettre en place.

## 2. État actuel (v2.16.0)

- Les textes sont des paires PL/EN écrites au point d'usage : `hgTr('pl', 'en')` (~2 196 appels, dont ~108 gabarits `` `...` ``, 4 avec objets, 5 avec tableaux), `hgTrO(obj, { k: [pl, en] })` (~190), `hgTrLazy(pl, en)` (~41).
- `hgTr` (`src/parts/hg-core.part.js`) sélectionne l'argument selon l'index de la langue dans `HGLang.LIST` ; repli sur l'anglais.
- Dictionnaires à clés déjà existants : `HG_I18N` (navigation, `hg-oss.part.js`), `HG_WZ_T` (assistant), `HG_PL` (états bruts HA, PL seulement), `HG_WX_SHORT` (météo abrégée, PL), `HG_BG_SET` (noms des fonds).
- `HG_LOC()` : table codée en dur `{ pl: 'pl-PL', en: 'en-GB' }`. Le logbook utilise `Intl.RelativeTimeFormat` figé sur `pl`/`en`.
- `tools/i18n_check.py` impose des paires PL/EN. Note : sa détection inclut `L(...)`, mais dans le code `L` est un nom de variable locale courant, pas une API i18n ; les textes concernés passent par `hgTr` à l'intérieur.
- `tools/build.py` produit `dist/nuvio.js` (chargeur) et `dist/nuvio-core.<hash>.js` (bundle à nom haché, cache immuable). `tools/guard.py` contrôle le bundle.
- `tests/local_ha.py` : test Playwright contre un HA local, locale `pl-PL` codée en dur.

## 3. Architecture

### 3.1 Catalogues

- `src/locales/en.json` : **référence et langue source**. Embarqué dans le bundle (repli toujours disponible).
- `src/locales/pl.json`, `src/locales/fr.json`, puis toute nouvelle langue : compilés par le build dans `dist/locales/<code>.<hash>.json` (nom haché par contenu, comme le core), chargés à la demande.
- Chaque catalogue source contient `"_meta": { "name": "Français", "locale": "fr-FR" }`.
- **Manifeste** généré par `build.py` et **embarqué dans le bundle** : `[{ code, name, locale, file }]`. Aucune requête réseau pour lister les langues ou détecter celle du navigateur.

### 3.1 bis Compaction des clés au build (contrainte de poids)

Objectif : la refonte ne doit pas alourdir le bundle. Mesure de référence (v2.16.0) : `nuvio-core` 1,41 Mo brut / 416 Ko gzip, dont ~39 Ko de textes PL et ~34 Ko de textes EN. Des clés littérales (~25 octets × ~2 500) ajouteraient ~150 Ko au bundle ; elles n'existent donc **que dans les sources**.

- `build.py` attribue à chaque clé statique un **index entier stable dans un build** (ordre trié des clés de `en.json`).
- Dans le bundle, `hgT('cards.smartlock.ago_minutes', p)` est réécrit en `hgT(842, p)` ; `hgTLazy` de même.
- Les catalogues compilés sont des **tableaux de textes** indexés : `{ "m": {name, locale}, "t": ["…", "…"], "d": { "states.docked": "…" } }`. Les pluriels occupent un index par forme (table `index de base → formes` générée).
- `en` compilé de la même façon et embarqué.
- **Exception** : les préfixes dynamiques (`states.*`, `weather.*`) restent dans une petite table à clés `d`, résolue à l'exécution.
- Les index ne sont jamais écrits à la main ni dans les sources ; un catalogue compilé ne vaut que pour le core de même build (le manifeste lie les deux par le hash).

**Résultat attendu** : bundle plus léger qu'en v2.16.0 (le polonais en sort), catalogue PL ou FR ~40 Ko brut / ~15 Ko gzip. Vérifié une seule fois, à la fin de la migration (§ 8), sans contrainte permanente sur la taille du bundle.

### 3.2 Clés

JSON imbriqué, segments en `snake_case`. La clé décrit le **rôle** du texte, pas son contenu.

| Espace | Contenu |
|---|---|
| `common.*` | textes partagés par au moins 3 modules (`common.save`, `common.cancel`) |
| `nav.*` | ex-`HG_I18N` |
| `wizard.*` | ex-`HG_WZ_T` |
| `edit.*`, `wall.*`, `backup.*`, `users.*`, `assist.*`, … | un espace par module `hg-*.part.js` |
| `ui.*`, `shared.*` | blocs `ui/` et `shared/` |
| `cards.<carte>.*` | une carte (`cards.smartlock.ago_minutes`) |
| `states.*` | ex-`HG_PL` (états bruts HA) |
| `weather.*` | ex-`HG_WX_SHORT` |
| `backgrounds.*` | noms de `HG_BG_SET` |

### 3.3 Messages

- Variables nommées : `"Bienvenue, {name} !"`.
- Pluriels par suffixes (format i18next JSON v4) : `entities_one`, `entities_few`, `entities_many`, `entities_other` ; la forme est choisie par `Intl.PluralRules(locale)` avec le paramètre `count`.
- Pas d'ICU complet (YAGNI).

### 3.4 API

| Ancien | Nouveau |
|---|---|
| `hgTr('pl', 'en')` | `hgT('ns.key', params?)` |
| `hgTrLazy(pl, en)` | `hgTLazy('ns.key', params?)` (objet `toString`, résolu à l'usage) |
| `hgTrO(o, { k: [pl, en] })` | getters appelant `hgT('ns.k')`, ou appel direct |
| `hgTr({…}, {…})`, `hgTr([…], […])` | une clé par élément |
| `hgI(lang, k)` | `hgT('nav.k')` |
| `HGLang.LIST` codé en dur | dérivé du manifeste |
| `HG_LOC()` table | `_meta.locale` du manifeste |

**Repli** : langue choisie → `en` → clé brute affichée (volontairement visible).

## 4. Chargement à l'exécution

- **Choix de la langue** (ordre inchangé) : choix personnel (`HGLang`), option `language:` de la stratégie, assistant, navigateur.
- **Détection navigateur générique** : code complet (`pt-br`), puis langue seule (`pt`), puis `en`. Toute langue du manifeste est reconnue.
- **URL** : `HG_ASSET + 'locales/' + file` (même base que les fonds). Le nom haché garantit l'invalidation à chaque changement de contenu ; cache immuable entre deux releases.
- **Préchargement par le chargeur** : `dist/nuvio.js` devine la langue (choix stocké `home-glass:lang`, sinon langue du navigateur) et lance le téléchargement du catalogue **en parallèle** du core. Le catalogue (~15 Ko gzip) arrive avant le core (~400 Ko gzip) : aucune latence ajoutée. Le core récupère la promesse en cours au lieu de refaire la requête. Si la langue effective diffère (synchronisation depuis un autre appareil, option YAML `language:`, assistant), le core charge le bon catalogue ensuite — cas rare.
- **Anglais** : aucune requête, catalogue embarqué.
- **Premier rendu** : la stratégie (navigation, titres de vues) et les cartes attendent le catalogue, avec un délai maximum de 3 s. Au-delà : rendu en anglais puis `HGLang.refresh()` à l'arrivée du catalogue.
- **`hgT` reste synchrone** : il lit le catalogue en mémoire. Aucun site d'appel ne devient `async`.
- **Changement de langue** : `HGLang.set` charge le catalogue puis appelle `refresh()` (pas de rechargement de page, pas d'affichage mixte).
- **Erreurs** :
  - catalogue introuvable ou JSON invalide : anglais + `console.warn`, pas de toast ;
  - clé absente de la langue : anglais ;
  - clé absente partout : clé brute.
- **Dates et nombres** : `HG_LOC()` lit la locale du manifeste ; le logbook utilise `HG_LOC()` pour `RelativeTimeFormat`.

## 5. Migration

**Règle d'or** : après migration, l'affichage PL et EN est identique à l'existant. Le français n'arrive qu'après.

### 5.1 `tools/i18n_migrate.py`

Réutilise l'analyseur de `i18n_check.py` (`lex`, `tr_spans`).

1. **Extraction** de tous les appels `hgTr`, `hgTrO`, `hgTrLazy` et des dictionnaires `HG_I18N`, `HG_WZ_T`, `HG_PL`, `HG_WX_SHORT`, `HG_BG_SET` : fichier, ligne, texte PL, texte EN.
2. **Proposition de clés** :
   - espace de noms déduit du chemin (`cards/alarm-card.part.js` → `cards.alarm`) ;
   - nom = slug des premiers mots anglais ;
   - paire PL+EN identique dans au moins 3 modules → `common.*` ;
   - même EN avec PL différent → clés distinctes (contexte différent) ;
   - gabarit `` `${m} min ago` `` → `"{m} min ago"` si l'expression est un identifiant simple, sinon signalé.
3. **Table de revue** `tools/i18n_migration_table.csv` (`clé | fichier:ligne | en | pl | statut`), relue et corrigée à la main.
4. **Application** : écrit `en.json` et `pl.json`, réécrit les sites d'appel, un module (espace de noms) à la fois.
5. **Vérification d'équivalence** intégrée : pour chaque appel remplacé, le rendu de `en.json[clé]` et `pl.json[clé]` avec les variables substituées doit égaler l'ancien texte. Le moindre écart fait échouer le script.

Le script est **ré-exécutable** pour rattraper de nouveaux commits de l'auteur.

### 5.2 Cas traités à la main (listés par le script)

- Concaténations (`hgTr('Język: ', 'Language: ') + nom`) → message avec variable (`"Language: {name}"`).
- Pluriels écrits en code (`n === 1 ? … : …`, `'encji'`) → suffixes de pluriel.
- Appels avec objets ou tableaux.
- Variables d'interpolation non triviales.

### 5.3 Traduction française

`fr.json` est produit à partir de `en.json`, avec `pl.json` comme contexte.

- Vouvoiement.
- Typographie française : espace insécable avant `: ; ! ?`, guillemets « ».
- Vocabulaire de l'interface française de Home Assistant (entité, zone, tableau de bord, appareil…).

## 6. Outillage de contrôle — `tools/i18n_check.py` réécrit

Code de sortie 1 en cas d'erreur ; options `--list`, `--json` conservées ; nouvelle option `--lang <code>`.

**Code :**
- clés littérales uniquement ; exceptions : préfixes dynamiques déclarés dans l'outil (`states.`, `weather.`) ;
- clé utilisée absente de `en.json` → erreur ;
- clé de `en.json` inutilisée → erreur ;
- texte d'interface encore écrit en dur (aria-label, title, placeholder, texte entre balises, toasts) → erreur (heuristique actuelle conservée).

**Catalogues :**
- JSON valide, sans clé en double, `_meta` complètes ;
- mêmes variables `{…}` que l'anglais ;
- formes plurielles exigées par la langue (catégories obtenues via `Intl.PluralRules` en appelant Node) ;
- couverture : langues **requises** (`en`, `pl`, `fr`, liste dans l'outil) complètes, sinon erreur ; autres langues partielles autorisées, avec un avertissement et le pourcentage de couverture.

**`--lang <code>`** : liste les clés manquantes et obsolètes pour une langue.

**Build** :
- `build.py` compile (§ 3.1 bis) et hache les catalogues dans `dist/locales/`, réécrit les clés en index dans le bundle, génère le manifeste, supprime les anciens catalogues hachés ;
- `build.py` échoue si une clé littérale subsiste dans le bundle après compaction ;
- `guard.py` lance `i18n_check.py`.

## 7. Documentation

**Créés** :
- `README.fr.md` ;
- `docs/fr/{components,configuration,development,features,installation,roadmap}.md` ;
- `CHANGELOG.fr.md` (historique complet, 447 lignes).

**Règles de traduction** :
- traduction depuis l'anglais, polonais en contrôle ;
- mêmes règles de ton et de typographie que l'interface ;
- code, YAML, identifiants et options inchangés ;
- liens internes vers `docs/fr/…` ;
- captures partagées.

**Mis à jour en EN, PL et FR** :
- barre de langues `English · Polski · Français` en tête de chaque README et page de doc ;
- `configuration.md` : formulation générique des langues ; `language:` accepte tout code du manifeste ; procédure « Ajouter une langue » réécrite ;
- `development.md` : clés, conventions de nommage, pluriels, `i18n_check.py --lang` ;
- README : « Polish, English and French » ;
- `CONTRIBUTING.md` : l'auteur continue d'écrire le changelog en EN et PL ; les entrées FR manquantes sont rattrapées par un contributeur.

## 8. Tests

**Automatiques** (runner intégré `node:test`, sans nouvelle dépendance) :
- `hgT` :
  - repli langue → en → clé ;
  - variables ;
  - pluriels PL (`one/few/many/other`) et FR (`one/many/other`) ;
  - catalogue introuvable ou corrompu ;
  - délai de 3 s ;
  - changement de langue sans affichage mixte ;
- détection navigateur (`fr-FR`, `pt-BR`, langue inconnue) ;
- `build.py` : manifeste et catalogues hachés ; compaction : pour chaque clé, `catalogue_compilé.t[index]` égale le texte source, pluriels et préfixes dynamiques compris ; aucune clé littérale restante dans le bundle ;
- mesure ponctuelle en fin de phase 3 : taille brute et gzip de `nuvio-core` comparée à la v2.16.0 (1 413 609 octets / 415 975 octets gzip), consignée dans la description de PR ; pas de seuil dans le build ;
- chargeur : préchargement lancé en parallèle, promesse réutilisée par le core, second chargement si la langue effective diffère ;
- équivalence de migration (§ 5.1, étape 5) ;
- `i18n_check.py` sans erreur.

**Non-régression visuelle** :
- `tests/cards-demo.html` et `tests/ui-gallery.html` en PL et EN, avant et après la migration ;
- `tests/local_ha.py` paramétré par locale (aujourd'hui figé sur `pl-PL`) pour la PL, l'EN et la FR.

**Validation de Corentin dans HA** (build `dist/` installé via HACS sur son fork) :
- assistant et chaque vue ;
- mode édition, toasts, écrans de veille ;
- dates, nombres, « il y a … » ;
- changement de langue sans rechargement ;
- détection d'un navigateur en `fr` ;
- aucune clé brute visible.

## 9. Phases

Un seul projet, une seule PR, découpée en commits relisibles. Le travail peut être poussé sur le fork ; la PR vers l'auteur original n'est ouverte que sur décision explicite de Corentin.

1. **Infrastructure** : `hgT`, `hgTLazy`, chargement des catalogues, préchargement dans le chargeur, manifeste, compaction des clés dans `build.py`, `HG_LOC`, tests Node. `hgTr` est conservé comme passerelle temporaire.
2. **Migration** : script, table de revue, application avec un commit par espace de noms. PL et EN identiques.
3. **Nettoyage** : suppression de `hgTr`, `hgTrO`, `hgTrLazy`, `HG_I18N`, `HG_WZ_T`, `HG_PL`, `HG_WX_SHORT` ; réécriture de `i18n_check.py` ; `guard.py`.
4. **`fr.json`**.
5. **Documentation**.
6. **Validation dans HA** par Corentin, puis rédaction de la description de PR. La PR explique la refonte (scalabilité, prolongement de `HG_I18N`/`HG_WZ_T`, garantie de non-régression, ajout d'une langue) et propose les choix à valider par l'auteur : anglais comme langue source, gestion du changelog français.

## 10. Risques

- **Refus de la refonte par l'auteur** : risque accepté. Atténuation : PR autoportante, migration vérifiable, script ré-exécutable pour rester synchronisé avec l'amont.
- **Activité amont soutenue** (commits fréquents) : rebase avant chaque phase ; le script de migration et `--lang fr` rattrapent les nouvelles chaînes.
- **Qualité des clés générées** : relecture obligatoire de la table avant application.
- **Poids et délai de chargement** : compaction des clés (§ 3.1 bis), préchargement parallèle par le chargeur, cache immuable ; repli anglais après 3 s (coupure réseau uniquement).
- **Index de compaction incohérents** (core et catalogue de builds différents) : le manifeste embarqué référence le catalogue par son hash ; test dédié (§ 8).
