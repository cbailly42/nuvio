#!/usr/bin/env bash
# Local release without GitHub Actions: ./tools/release.sh 0.1.2
set -euo pipefail
V="${1:?usage: tools/release.sh X.Y.Z}"
cd "$(dirname "$0")/.."
[ -z "$(git status --porcelain)" ] || { echo "Working tree not clean"; exit 1; }
git fetch -q origin && git merge -q --ff-only origin/main
OLD=$(python3 -c "import json;print(json.load(open('package.json'))['version'])")
python3 - "$V" <<'PY'
import json,sys; p=json.load(open('package.json')); p['version']=sys.argv[1]; json.dump(p,open('package.json','w'))
PY
python3 - "$OLD" "$V" README.md README.pl.md <<'PY'
import sys; o, n = sys.argv[1], sys.argv[2]
for f in sys.argv[3:]: t = open(f).read(); open(f, 'w').write(t.replace('v' + o, 'v' + n))
PY
python3 tools/build.py </dev/null
T0=$(mktemp -d) && cp dist/nuvio.js "$T0/nuvio.mjs" && node --check "$T0/nuvio.mjs" && cp dist/nuvio-core.*.js "$T0/core.mjs" && node --check "$T0/core.mjs"
python3 tools/guard.py
git add -A && git commit -qm "chore: release $V"
git tag -a "v$V" -m "Nuvio $V"
git push -q origin main "v$V"
# Bez załączników: HACS pobiera zasoby wydania zamiast dist/, więc wydanie nie ma plików i HACS
# instaluje pliki leżące bezpośrednio w dist/ (bez podfolderów, stąd płaskie nuvio-font-*, nuvio-bg-*, nuvio-meteo-*).
# Instalacja ręczna: dist/ z archiwum źródeł tagu.
if ! gh release view "v$V" >/dev/null 2>&1; then gh release create "v$V" --title "Nuvio $V" --generate-notes --verify-tag; fi
# weryfikacja: dist/nuvio.js w tagu ma nową wersję, wydanie nie ma załączników
T=$(mktemp -d); sleep 3
git show "v$V:dist/nuvio.js" > "$T/t.js"
grep -q "HG_BUILD = '$V+" "$T/t.js" || { echo "BŁĄD: dist/nuvio.js w v$V nie ma wersji $V"; exit 1; }
for f in nuvio-version.json $(python3 -c "import json;print(json.load(open('dist/nuvio-version.json'))['core'])") nuvio-font-dmsans-latin.woff2 nuvio-bg-default-wide.webp nuvio-meteo-static-sunrise.svg CREDITS.md; do git cat-file -e "v$V:dist/$f" 2>/dev/null || { echo "BŁĄD: brak dist/$f w v$V"; exit 1; }; done
git ls-tree -d --name-only "v$V" dist/ | grep -q . && { echo "BŁĄD: podfolder w dist/ w v$V (HACS go pominie)"; exit 1; }
N=$(gh release view "v$V" --json assets -q '.assets | length'); [ "$N" = "0" ] || { echo "BŁĄD: wydanie v$V ma $N załączników (HACS pominie dist/)"; exit 1; }
echo "OK: v$V: dist/nuvio.js ma HG_BUILD $V, płaskie zasoby są, brak załączników"
