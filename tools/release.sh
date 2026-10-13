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
# Only the zip is attached (manual install). No nuvio.js asset, so HACS installs the whole dist/ folder
# (assets included) and registers /hacsfiles/nuvio/nuvio.js as the dashboard resource.
rm -f /tmp/nuvio.zip && (cd dist && zip -qr /tmp/nuvio.zip nuvio.js assets)
# tag uruchamia też .github/workflows/release.yml – jeśli wydanie już istnieje, tylko podmień pliki
if gh release view "v$V" >/dev/null 2>&1; then gh release upload "v$V" /tmp/nuvio.zip --clobber
else gh release create "v$V" /tmp/nuvio.zip --title "Nuvio $V" --generate-notes --verify-tag; fi
