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
node --check dist/nuvio.js
python3 tools/guard.py
git add -A && git commit -qm "chore: release $V"
git tag -a "v$V" -m "Nuvio $V"
git push -q origin main "v$V"
# Bez załączników: HACS pobiera zasoby wydania zamiast dist/, więc wydanie nie ma plików i HACS
# instaluje cały dist/ (z assets/). Instalacja ręczna: dist/ z archiwum źródeł tagu.
if ! gh release view "v$V" >/dev/null 2>&1; then gh release create "v$V" --title "Nuvio $V" --generate-notes --verify-tag; fi
# weryfikacja: dist/nuvio.js w tagu ma nową wersję, wydanie nie ma załączników
T=$(mktemp -d); sleep 3
git show "v$V:dist/nuvio.js" > "$T/t.js"
grep -q "HG_BUILD = '$V+" "$T/t.js" || { echo "BŁĄD: dist/nuvio.js w v$V nie ma wersji $V"; exit 1; }
git ls-tree -r --name-only "v$V" dist/assets | grep -q . || { echo "BŁĄD: brak dist/assets w v$V"; exit 1; }
N=$(gh release view "v$V" --json assets -q '.assets | length'); [ "$N" = "0" ] || { echo "BŁĄD: wydanie v$V ma $N załączników (HACS pominie dist/)"; exit 1; }
echo "OK: v$V – dist/nuvio.js ma HG_BUILD $V, dist/assets jest, brak załączników"
