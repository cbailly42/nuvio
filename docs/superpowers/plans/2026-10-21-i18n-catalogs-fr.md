# Refonte i18n en catalogues à clés + français — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** remplacer les paires inline `hgTr('pl', 'en')` par des catalogues JSON à clés compilés au build, sans régression PL/EN, puis ajouter le français (interface + doc).

**Architecture :** les sources appellent `hgT('ns.key', params)` ; `src/locales/<code>.json` contient les textes. Au build, les clés statiques sont remplacées par des index entiers et les catalogues compilés en tableaux (`dist/locales/<code>.<hash>.json`, chargés à la demande, préchargés par le chargeur `nuvio.js`) ; l'anglais est embarqué. La migration est outillée par un script qui prouve l'équivalence texte par texte.

**Tech Stack :** JS navigateur (parts concaténées, une seule portée), Python 3 (outils de build, `unittest`), Node 22 (`node:test`), esbuild 0.28.2 (existant), Playwright Python + Chrome (déjà utilisés par `tests/local_ha.py`).

**Spec :** `docs/superpowers/specs/2026-10-21-i18n-catalogs-fr-design.md`

## Global Constraints

- Rien sur le dépôt de l'auteur original (push, issue, PR, commentaire) sans accord explicite de Corentin au moment de l'action. Push sur le fork `cbailly42/nuvio` autorisés.
- `dist/` est versionné : tout commit qui touche `src/` ou `src/locales/` inclut le `dist/` régénéré par `python3 tools/build.py`, comme le fait l'amont.
- Aucune nouvelle dépendance runtime ni devDependency (seulement `node:test`, `unittest`, Playwright déjà requis).
- Home Assistant 2024.8.0+ ; cible esbuild `es2020`.
- Langue source : `en`. Langues requises (complètes) : `en`, `pl`, `fr`.
- Clés : JSON imbriqué, segments `snake_case`, la clé décrit le rôle du texte.
- Variables `{name}` ; pluriels par suffixes `_zero _one _two _few _many _other` choisis par `Intl.PluralRules(locale)` avec `params.count`.
- Préfixes dynamiques : `states.`, `weather.` uniquement (plus ceux ajoutés explicitement à `DYN_PREFIXES`).
- Repli : langue choisie → `en` → clé brute ; dynamique : → valeur de repli fournie.
- Délai maximal d'attente du catalogue : 3000 ms.
- Clé de stockage de la langue : `home-glass:lang` dans les sources (`nuvio:lang` après `brand()`).
- Catalogues compilés : `dist/locales/<code>.<hash8>.json`, hash = md5 du contenu JSON compilé, 8 caractères.
- Le hash du core est calculé **après** compaction et injection du manifeste et de `en`.
- Français : vouvoiement, espace insécable (U+00A0) avant `: ; ! ?` et à l'intérieur de « », vocabulaire de l'interface française de HA.
- Après les tâches 5 à 8 : texte affiché PL et EN strictement identique à la v2.16.0 (instantané § Task 3).

## Review Focus

1. **Carte Nuvio seule dans un tableau de bord HA classique** (sans la stratégie) avec langue `fr` : elle doit passer en français à l'arrivée du catalogue, sans rechargement → test dans Task 4.
2. **Chargeur en cache périmé** (HACS / service worker) avec un core plus récent : le préchargement doit utiliser le fichier de catalogue indiqué par `nuvio-version.json`, et le core ignorer un préchargement dont le fichier diffère de son manifeste → tests dans Task 2 et Task 1.
3. **Langue stockée qui n'existe plus** (code retiré, valeur corrompue) : retour à la détection automatique, pas de catalogue introuvable en boucle → test dans Task 1.
4. **Langue communautaire partielle** (clé absente, forme plurielle absente, variable manquante dans les paramètres) : texte anglais pour la clé concernée, jamais `{name}` ni `undefined` à l'écran → tests dans Task 1.
5. **Catalogue inaccessible** (HA hors ligne, 404, JSON invalide) : `ready()` se résout tout de suite en anglais, sans attendre 3 s ni boucler → test dans Task 1.

---

### Task 1 : Runtime i18n (`hg-i18n.part.js`)

**Files :**
- Create : `src/parts/hg-i18n.part.js`
- Create : `tests/js/harness.mjs`, `tests/js/i18n-runtime.test.mjs`, `tests/js/fixtures/` (catalogues compilés de test)
- Modify : `tools/build.py` (`CORE = ['hg-i18n.part.js', 'hg-select.part.js', …]`)
- Modify : `package.json` (`"scripts": { "test": "node --test tests/js/ && python3 -m unittest discover -s tests/py" }`)

**Interfaces :**
- Produces :
  - format compilé `Catalog = { m: { name: string, locale: string }, t: Array<string | Forms | null>, d: { [dynKey: string]: string | Forms } }`, `Forms = { zero?, one?, two?, few?, many?, other: string }`
  - `const HG_I18N_MANIFEST = /*__HG_I18N_MANIFEST__*/[]` → `Array<{ code, name, locale, file: string | null }>` (`file` null pour `en`)
  - `const HG_I18N_EN = /*__HG_I18N_EN__*/null` → `Catalog`
  - `HGI18n.code: string`, `HGI18n.has(code): boolean`, `HGI18n.locale(code?): string`, `HGI18n.list(): Array<[code, name]>`
  - `HGI18n.load(code): Promise<boolean>` — réutilise `window.__hgI18nPre` si `{ code, file }` égalent ceux du manifeste ; sinon `fetch(HG_ASSET + file)` ; mémorise les échecs (pas de nouvelle tentative dans la session)
  - `HGI18n.ready(code, ms = 3000): Promise<void>` — se résout au chargement, à l'échec, ou au délai ; si le catalogue arrive après le délai : `HGI18n.code = code` puis `window.dispatchEvent(new CustomEvent('hg-lang'))`
  - `hgT(key: number | string, params?: object): string`
  - `hgTLazy(key: number | string, params?: object): { toString(): string }`
  - `hgTD(dynKey: string, fallback: string): string` (préfixes dynamiques)
  - `hgTO(obj: object, map: { [prop]: string }): object` (getters `hgT`, remplace `hgTrO`)
  - `hgLangDetect(pref: string | null | undefined, navLangs: string[]): string`

- [ ] **Step 1 : harness.** `loadParts(files: string[], globals: object, names: string[]): object` lit `src/parts/<f>`, concatène, évalue dans `new Function(...Object.keys(globals), src + '; return {' + names + '}')`. Globals typiques : `window`, `navigator`, `localStorage`, `fetch`, `HG_ASSET`, `CustomEvent`.

- [ ] **Step 2 : tests (échouent).** Fixtures : `en` (index 0 `"Save"`, 1 `"Welcome, {name}!"`, 2 `{one: "{count} entity", other: "{count} entities"}`, `d: {"states.docked": "docked"}`), `pl` (`"Zapisz"`, `"Witaj, {name}!"`, `{one, few, many, other}`), `xx` partiel (`t: [null, "Hi {nom}", {other: "x"}]`).
  - `hgT(0)` → `"Save"` en `en`, `"Zapisz"` en `pl`.
  - `hgT(1, {name: 'Ana'})` → `"Witaj, Ana!"` ; `hgT(1, {})` → `"Witaj, !"` (variable manquante = chaîne vide).
  - pluriels PL : `count` 1 → `one`, 3 → `few`, 5 → `many`, 1.5 → `other`.
  - `xx` : `hgT(0)` → anglais ; `hgT(1, {name:'A'})` → anglais (la traduction ne contient pas `{name}`) ; `hgT(2, {count: 3})` → anglais si la forme `few`/`many`/`one` exigée manque, sinon la forme.
  - `hgT(99)` → `"#99"` ; `hgT('nope.key')` → `"nope.key"`.
  - `hgTD('states.docked', 'docked')` → `"w stacji"` en `pl` ; `hgTD('states.zzz', 'zzz')` → `"zzz"`.
  - `hgLangDetect(null, ['fr-FR','en'])` → `fr` (si manifeste contient `fr`) ; `(null, ['pt-BR'])` → `pt-br` si présent, sinon `pt`, sinon `en` ; `('gone', ['pl'])` → `pl` (code inconnu ignoré).
  - `load('fr')` avec `fetch` rejeté → `false`, deuxième appel → `false` sans nouvel appel `fetch`.
  - `load('fr')` avec réponse JSON invalide → `false`.
  - `ready('fr')` avec `fetch` rejeté se résout en moins de 50 ms ; avec `fetch` jamais résolu, se résout à 3000 ms (horloge simulée `node:test` `mock.timers`), puis événement `hg-lang` quand la promesse finit par se résoudre.
  - préchargement : `window.__hgI18nPre = { code: 'fr', file: 'locales/fr.aaaa.json', p }` avec manifeste `fr.aaaa` → `fetch` non appelé ; avec manifeste `fr.bbbb` → `fetch` appelé.

- [ ] **Step 3 :** `node --test tests/js/` → FAIL (fichier absent).
- [ ] **Step 4 : implémenter `src/parts/hg-i18n.part.js`.** Résolution : catalogue courant puis `HG_I18N_EN` ; une entrée est rejetée (→ anglais) si elle est `null`, si une variable de la source anglaise manque dans la traduction, ou si la forme plurielle demandée par `Intl.PluralRules` manque. Hors build (`HG_I18N_EN` null), `hgT` renvoie la clé. Échec de chargement : `console.warn` une fois, aucun toast.
- [ ] **Step 5 :** `node --test tests/js/` → PASS.
- [ ] **Step 6 : commit** `feat(i18n): runtime hgT, catalogues compilés, chargement et détection`.

### Task 2 : Compilation au build et préchargement

**Files :**
- Create : `tools/i18n_compile.py`, `tests/py/test_i18n_compile.py`, `tests/js/loader.test.mjs`
- Create : `src/locales/en.json`, `src/locales/pl.json` (minimaux : `_meta` + `common.save`)
- Modify : `tools/build.py` (`main()`, `LOADER`)

**Interfaces :**
- Consumes : format `Catalog`, placeholders `/*__HG_I18N_MANIFEST__*/[]` et `/*__HG_I18N_EN__*/null` (Task 1).
- Produces (`tools/i18n_compile.py`) :
  - `DYN_PREFIXES = ('states.', 'weather.')`, `PLURAL_SUFFIXES = ('zero','one','two','few','many','other')`
  - `flatten(nested: dict) -> dict[str, str | dict]` (regroupe `x_one`, `x_other`… sous `x` → dict de formes ; ignore `_meta`)
  - `assign_indices(en_flat: dict) -> dict[str, int]` (clés non dynamiques, triées)
  - `compile_catalog(flat: dict, idx: dict, meta: dict) -> dict` (`{m, t, d}`, clés absentes → `None`)
  - `rewrite_keys(js: str, idx: dict) -> str` : remplace les littéraux de clé dans `hgT(`, `hgTLazy(` et les valeurs de `hgTO(…, { … })` ; `ValueError` sur clé statique inconnue
  - `remaining_literals(js: str) -> list[str]`
  - `build_locales(src_dir: str, out_dir: str) -> tuple[list[dict], dict, dict]` (manifeste, `en` compilé, `idx`) ; écrit `out_dir/<code>.<hash8>.json`, supprime les anciens `*.<hash8>.json`
- `dist/nuvio-version.json` gagne `"locales": { "<code>": "locales/<code>.<hash8>.json" }`.
- Chargeur : `window.__nuvioI18nPre = { code, file, p: Promise<Catalog> }`.

- [ ] **Step 1 : tests Python (échouent)** : `flatten` (formes regroupées, `_meta` ignoré) ; `assign_indices` stable et sans clé dynamique ; `compile_catalog` (`t[idx['common.save']] == 'Enregistrer'`, clé absente → `None`, dynamique dans `d`) ; `rewrite_keys("hgT('common.save')")` → `"hgT(0)"`, `hgTLazy`, `hgTO(o, { a: 'common.save' })` réécrits, `hgT('states.' + s)` intact, clé inconnue → `ValueError` ; `remaining_literals` ; `build_locales` : noms hachés, suppression des anciens, même contenu → même nom.
- [ ] **Step 2 :** `python3 -m unittest discover -s tests/py` → FAIL.
- [ ] **Step 3 : implémenter `tools/i18n_compile.py`.**
- [ ] **Step 4 : intégrer à `build.py` `main()`**, après `brand(js)` : `build_locales` → `rewrite_keys` → injection manifeste et `en` → échec si `remaining_literals` non vide → calcul de `v`/hash → minify. Ajouter `locales` à `nuvio-version.json`.
- [ ] **Step 5 : `LOADER`** : après `latest()`, lire `j.locales` (le chargeur garde le JSON complet, pas seulement `core`), choisir la langue (`localStorage['nuvio:lang']` si présent dans `j.locales` ou `en`, sinon `navigator.languages` : code complet puis langue seule), et si ce n'est pas `en`, lancer `fetch(base + file)` **avant** `import(core)` et l'exposer dans `window.__nuvioI18nPre`. En cas d'échec de `nuvio-version.json` : aucun préchargement.
- [ ] **Step 6 : test Node `loader.test.mjs`** : rend `LOADER` via `python3 -c "import tools.build as b; …"` dans un dossier temporaire avec un faux core et un `nuvio-version.json` (`locales.fr`) ; `localStorage` `fr` → `fetch` du catalogue appelé avant la résolution de l'import du core et `__nuvioI18nPre.file` égal à celui de `nuvio-version.json` ; `localStorage` vide + `navigator.languages = ['en-US']` → aucun préchargement.
- [ ] **Step 7 :** `npm test` → PASS ; `python3 tools/build.py` → `dist/locales/pl.<hash>.json` présent.
- [ ] **Step 8 : commit** `feat(i18n): compilation des catalogues, compaction des clés, préchargement`.

### Task 3 : Instantané de texte (référence de non-régression)

**Files :**
- Create : `tests/i18n_snapshot.py`
- Modify : `tests/cards-demo.html` (paramètre `lang` : `pl` | `en` | `fr`, au lieu de `en`/`pl`)

**Interfaces :**
- Produces : `python3 tests/i18n_snapshot.py --lang pl --out tests/out/snap-pl.json` ; `--diff a.json b.json` (code de sortie 1 si différence, avec les lignes différentes).

- [ ] **Step 1 : implémenter.** Lance `python3 -m http.server` sur la racine, ouvre `tests/cards-demo.html?lang=<l>&mode=shots` et `tests/ui-gallery.html` dans Chrome (`/usr/bin/google-chrome`, comme `local_ha.py`), horloge figée `page.clock.install(time=datetime(2026, 10, 21, 10, 0))`, parcourt tous les shadow roots et relève par composant : nœuds texte non vides, `aria-label`, `title`, `placeholder`, `alt`. Sortie JSON triée et stable.
- [ ] **Step 2 : référence.** Sur `61a2167` (v2.16.0, avant toute modification de `src/`) : build, puis `snap-pl.json` et `snap-en.json` dans `tests/out/baseline/` (dossier déjà ignoré par `.gitignore`, non commité).
- [ ] **Step 3 :** deux exécutions successives sur le même build → `--diff` vide (instantané déterministe).
- [ ] **Step 4 : commit** `test(i18n): instantané de texte pour la non-régression`.

### Task 4 : Intégration (langue, stratégie, cartes, dates)

**Files :**
- Modify : `src/parts/hg-oss.part.js` (`hgLang`, `HGLang`, `HGStrategy.generate`)
- Modify : `src/parts/hg-core.part.js` (`hgCurLang`, `hgTr`, `HG_LOC`, `HGBase`)
- Modify : `src/parts/cards/logbook-card.part.js` (`hgAgoRel`)
- Test : `tests/js/i18n-integration.test.mjs`

**Interfaces :**
- Consumes : `HGI18n`, `hgLangDetect` (Task 1).
- Produces : `HGLang.LIST` = `HGI18n.list()` (getter) ; `HGLang.set(h, v, el)` attend `HGI18n.load(v)` avant `refresh` ; `hgLang(h, pref)` = `hgLangDetect(pref, navigator.languages || [navigator.language])` ; `HG_LOC()` = `HGI18n.locale(hgCurLang())`.

- [ ] **Step 1 : tests (échouent)** : `HGLang.set(…, 'pl')` avec un `fetch` différé → `refresh` (événement `hg-lang`) émis **après** la résolution du chargement ; `HGStrategy.generate` attend `HGI18n.ready(lang)` (un `hgGenerate` simulé reçoit le contrôle après la résolution) ; `HG_LOC()` → `pl-PL` / `en-GB` ; passerelle `hgTr('a', 'b')` → `'a'` si `pl`, `'b'` sinon, quel que soit l'ordre de `HGLang.LIST`.
- [ ] **Step 2 :** `node --test tests/js/` → FAIL.
- [ ] **Step 3 : implémenter.**
  - `hgTr` devient la passerelle `(pl, en) => (hgCurLang() === 'pl' ? pl : en)` (objets et tableaux inclus).
  - `HGBase` : registre `HG_LIVE = new Set()` de `WeakRef(this)` rempli dans le constructeur ; un seul écouteur `window` sur `hg-lang` appelle `rerender()` sur chaque instance encore connectée et purge les références mortes.
  - `hgAgoRel` : `new Intl.RelativeTimeFormat(HG_LOC(), …)`.
- [ ] **Step 4 :** `npm test` → PASS ; build ; `tests/i18n_snapshot.py` PL et EN → `--diff` vide contre la référence.
- [ ] **Step 5 : test manuel Review Focus 1** : page de test minimale (`tests/i18n-standalone.html`, une carte `nuvio-light-card` hors stratégie, `fetch` du catalogue retardé de 1 s) → le texte change sans rechargement. Ajouter ce cas à `tests/i18n_snapshot.py --standalone`.
- [ ] **Step 6 : commit** `feat(i18n): langues issues du manifeste, attente du catalogue, rerendu des cartes`.

### Task 5 : Script de migration — extraction et proposition

**Files :**
- Create : `tools/i18n_migrate.py`, `tests/py/test_i18n_migrate.py`, `tests/py/fixtures/migrate/*.part.js`

**Interfaces :**
- Consumes : `lex`, `tr_spans` de `tools/i18n_check.py` (import, sans modification).
- Produces :
  - `extract(root: str) -> list[Occ]`, `Occ = { file, line, start, end, kind: 'hgTr'|'hgTrLazy'|'hgTrO'|'dict', pl, en, params: list[str], manual: str | None }` ; `manual` ∈ `'concat'`, `'plural'`, `'object'`, `'array'`, `'expr'`, `'dict-dynamic'`
  - `propose(occs) -> list[Row]` (`Row = Occ + { key }`)
  - CSV `tools/i18n_migration_table.csv` : `key,file,line,kind,en,pl,params,manual,status` (`status` : `auto` | `review` | `manual`)
  - CLI : `python3 tools/i18n_migrate.py propose`

- [ ] **Step 1 : tests (échouent)**, sur fixtures : namespace `cards/alarm-card.part.js` → `cards.alarm`, `hg-edit.part.js` → `edit`, `ui/toast.part.js` → `ui.toast`, `shared/weather.part.js` → `shared.weather` ; slug des 4 premiers mots anglais, `[a-z0-9_]`, 40 caractères max, suffixe `_2` en cas de collision ; paire identique dans ≥ 3 modules → `common.<slug>` ; même EN, PL différent → deux clés ; `` `${m} min ago` `` → `params == ['m']`, en `"{m} min ago"` ; `${a.b}` → `manual == 'expr'` ; `hgTr('Język: ', 'Language: ') + x` → `'concat'` ; `hgTr({…}, {…})` → `'object'` ; tableau → `'array'` ; chaîne contenant `n === 1 ?` dans la même expression → `'plural'` ; dictionnaires `HG_I18N` → `nav.<k>`, `HG_WZ_T` → `wizard.<k>`, `HG_PL` → `states.<k>`, `HG_BG_SET` → `backgrounds.<id>` ; `HG_WX_SHORT` (indexé par texte polonais) → `'dict-dynamic'`.
- [ ] **Step 2 :** `python3 -m unittest tests/py/test_i18n_migrate.py` → FAIL.
- [ ] **Step 3 : implémenter `extract` et `propose`.**
- [ ] **Step 4 :** tests → PASS ; `python3 tools/i18n_migrate.py propose` sur `src/` → compte des lignes ≈ 2 430 ± 5 %, répartition `auto/review/manual` affichée.
- [ ] **Step 5 : commit** `feat(i18n): extraction et proposition de clés pour la migration`.

### Task 6 : Script de migration — application et preuve d'équivalence

**Files :**
- Modify : `tools/i18n_migrate.py`, `tests/py/test_i18n_migrate.py`

**Interfaces :**
- Produces : `apply(rows, ns: str) -> None` (fusionne dans `src/locales/en.json` et `pl.json`, réécrit les appels du namespace ; ignore les lignes `manual` non résolues) ; `verify(rows) -> list[str]` (écarts) ; CLI `apply --ns <ns>`, `verify`.

- [ ] **Step 1 : tests (échouent)** : après `apply`, `hgTr('Zapisz', 'Save')` → `hgT('edit.save')` ; `` hgTr(`${m} min temu`, `${m} min ago`) `` → `hgT('cards.smartlock.min_ago', { m })` ; `hgTrLazy` → `hgTLazy` ; `hgTrO(o, { a: ['x', 'y'] })` → `hgTO(o, { a: 'ns.y' })` ; `verify` : pour chaque ligne, substituer `${expr}` dans le texte d'origine et `{param}` dans le catalogue par le même jeton → égalité EN et PL, sinon écart listé ; `apply` refuse (exception) si `verify` renvoie des écarts sur le namespace.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS.
- [ ] **Step 5 : commit** `feat(i18n): application de la migration avec vérification d'équivalence`.

### Task 7 : Migration de `src/` (quatre lots)

**Files :** `src/parts/**`, `src/locales/en.json`, `src/locales/pl.json`, `tools/i18n_migration_table.csv`

**Interfaces :**
- Consumes : CLI de Tasks 5–6, `hgT`, `hgTLazy`, `hgTD`, `hgTO` (Task 1).

Pour **chaque lot**, dans cet ordre : relire les lignes `review` du CSV (renommer les clés maladroites) ; résoudre les lignes `manual` à la main (règles ci-dessous) ; `apply --ns` pour chaque namespace du lot avec un commit par namespace (`refactor(i18n): migre <ns>`) ; build ; `tests/i18n_snapshot.py` PL et EN → `--diff` vide contre la référence ; `npm test` → PASS.

Règles des cas manuels :
- `concat` → une clé avec variable (`"Language: {name}"`).
- `plural` → clé à formes (`entities_one`, `_few`, `_many`, `_other` en PL), appel `hgT(k, { count })`.
- `object` / `array` → une clé par élément.
- `expr` → variable nommée d'après son rôle (`{name}`, `{count}`, `{time}`).
- Tables d'états inline `{ armed_away: '…', … }[s]` → `hgTD('cards.<carte>.states.' + s, repli)` ; ajouter le préfixe à `DYN_PREFIXES`.
- `HG_PL[hgStN(x)]` → `hgTD('states.' + hgStN(x), x)`.
- `HG_WX_SHORT` → indexé par l'état météo HA (`weather.short.<state>`), via `hgTD`.
- Assistant (`HG_WZ_T[lang]`, `hgI(lang, k)`) : sélectionner une langue dans l'assistant fait `await HGI18n.load(code)` puis passe `HGI18n.code` à cette langue, et l'assistant redessine avec `hgT('wizard.…')`.

- [ ] **Step 1 : lot A** — `hg-i18n`, `hg-select`, `hg-oss`, `hg-core`, `hg-styles` et les dictionnaires (`nav`, `wizard`, `states`, `weather`, `backgrounds`, `common`).
- [ ] **Step 2 : lot B** — `ui/*`, `shared/*`.
- [ ] **Step 3 : lot C** — `cards/*`.
- [ ] **Step 4 : lot D** — `hg-roomx`, `hg-page`, `hg-edit`, `hg-looks`, `hg-lookr`, `hg-backup`, `hg-wall*`, `hg-users`, `hg-assist`.
- [ ] **Step 5 : vérification de fin** : `grep -rE "\bhgTr(Lazy|O)?\s*\(" src` → aucun résultat ; snapshot PL/EN identique.

### Task 8 : Nettoyage et nouveau `i18n_check.py`

**Files :**
- Modify : `src/parts/hg-core.part.js`, `hg-oss.part.js`, `cards/weather-card.part.js` (suppression de `hgTr`, `hgTrLazy`, `hgTrO`, `hgI`, `HG_I18N`, `HG_WZ_T`, `HG_PL`, `HG_WX_SHORT`)
- Rewrite : `tools/i18n_check.py` ; Create : `tests/py/test_i18n_check.py`, `tests/py/fixtures/check/`
- Modify : `tools/guard.py` (appel `i18n_check.py`, sortie 1 si erreur)

**Interfaces :**
- Produces : `REQUIRED = ('en', 'pl', 'fr')` ; `check(root) -> { errors: list[str], warnings: list[str], coverage: dict[code, float] }` ; CLI `--list`, `--json`, `--lang <code>`. Tant que `fr.json` n'existe pas (avant Task 9), `REQUIRED` est `('en', 'pl')`, puis `fr` est ajouté en Task 9.

- [ ] **Step 1 : tests (échouent)** sur fixtures, une erreur par cas : `hgT(x)` non littéral ; préfixe dynamique non déclaré dans `hgTD` ; clé utilisée absente de `en.json` ; clé de `en.json` inutilisée ; texte anglais en dur dans `aria-label=`/`title=`/`placeholder=` (heuristique actuelle reprise) ; JSON invalide ou clé en double (`object_pairs_hook`) ; `_meta` incomplet ; variable `{name}` absente d'une traduction ; forme plurielle requise manquante (catégories via `node -e "console.log(JSON.stringify(new Intl.PluralRules(l).resolvedOptions().pluralCategories))"`) ; langue requise incomplète → erreur, langue non requise incomplète → avertissement + couverture ; `--lang xx` liste les clés manquantes et obsolètes.
- [ ] **Step 2 :** FAIL. **Step 3 :** implémenter. **Step 4 :** PASS ; `python3 tools/i18n_check.py` sur `src/` → 0 erreur.
- [ ] **Step 5 :** supprimer l'ancienne API et les dictionnaires ; build ; snapshot PL/EN → `--diff` vide ; `python3 tools/guard.py` → OK.
- [ ] **Step 6 : mesure ponctuelle** : taille brute et gzip de `dist/nuvio-core.*.js` comparées à 1 413 609 / 415 975 octets, notées dans `docs/superpowers/notes/bundle-size.md`.
- [ ] **Step 7 : commit** `refactor(i18n): retrait de l'ancienne API, nouveau contrôle des catalogues`.

### Task 9 : Catalogue français

**Files :** Create `src/locales/fr.json` ; Modify `tools/i18n_check.py` (`REQUIRED` + `fr`), `tests/i18n_snapshot.py` (accepte `fr`), `tests/local_ha.py` (argument `--locale`, défaut `pl-PL`)

- [ ] **Step 1 :** `_meta: { "name": "Français", "locale": "fr-FR" }` ; traduire depuis `en.json`, `pl.json` en contexte, par namespace, selon les Global Constraints. Formes plurielles FR : `one`, `many`, `other`.
- [ ] **Step 2 :** `python3 tools/i18n_check.py --lang fr` → 0 clé manquante ; `python3 tools/i18n_check.py` → 0 erreur.
- [ ] **Step 3 :** build ; `tests/i18n_snapshot.py --lang fr` → aucune valeur ressemblant à une clé (`^[a-z_]+(\.[a-z0-9_]+)+$`) ni `#\d+`, et aucun texte identique à l'anglais hors liste blanche (noms propres, unités, `OK`, `Auto`…) ; relire la liste des textes signalés.
- [ ] **Step 4 :** vérification typographique automatique : aucune occurrence de ` :`, ` ;`, ` !`, ` ?` avec espace normale, ni de guillemets `"` dans les textes français.
- [ ] **Step 5 : commit** `feat(i18n): traduction française de l'interface`.

### Task 10 : Documentation

**Files :**
- Create : `README.fr.md`, `docs/fr/{components,configuration,development,features,installation,roadmap}.md`, `CHANGELOG.fr.md`
- Modify : `README.md`, `README.pl.md`, `docs/*.md`, `docs/pl/*.md` (barre de langues), `docs/configuration.md` + `docs/pl/configuration.md` (langues génériques, `language:` = tout code du manifeste, « Adding a language »), `docs/development.md` + `docs/pl/development.md` (clés, nommage, pluriels, `--lang`), `CONTRIBUTING.md` (changelog FR rattrapé par un contributeur)

- [ ] **Step 1 :** traduire selon la spec § 7 (source anglaise, polonais en contrôle ; code, YAML, identifiants inchangés ; liens vers `docs/fr/…` ; captures partagées ; historique complet du changelog).
- [ ] **Step 2 : vérification des liens** : script ponctuel listant chaque lien Markdown relatif de `README*.md`, `docs/**`, `CHANGELOG*.md` et vérifiant que la cible existe → 0 lien cassé ; chaque fichier FR a le même nombre de titres `#` que son équivalent anglais.
- [ ] **Step 3 : commit** `docs: documentation française et procédure d'ajout de langue`.

### Task 11 : Préparation de la validation et de la PR

**Files :** Create `docs/superpowers/notes/ha-checklist.md`, `docs/superpowers/notes/pr-description.md`

- [ ] **Step 1 :** checklist HA (spec § 8) : assistant et chaque vue ; mode édition, toasts, écrans de veille ; dates, nombres, « il y a … » ; changement de langue sans rechargement ; navigateur en `fr` ; carte seule hors stratégie ; aucune clé brute.
- [ ] **Step 2 :** brouillon de description de PR en anglais (motivation, prolongement de `HG_I18N`/`HG_WZ_T`, garantie de non-régression, mesure de taille, ajout d'une langue, propositions : anglais langue source, changelog FR).
- [ ] **Step 3 :** `npm test`, `python3 tools/i18n_check.py`, `python3 tools/guard.py` → tout vert.
- [ ] **Step 4 : commit** `docs: checklist de validation et brouillon de PR`. Pousser la branche sur le fork `cbailly42/nuvio` ; ne rien ouvrir chez l'auteur original : remettre la main à Corentin.
