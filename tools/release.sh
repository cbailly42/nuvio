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
sed -i '' "s/v${OLD//./\\.}/v$V/g" README.md README.pl.md
python3 tools/build.py </dev/null
node --check dist/nuvio.js
python3 tools/guard.py
git add -A && git commit -qm "chore: release $V"
git tag -a "v$V" -m "Nuvio $V"
git push -q origin main "v$V"
rm -f /tmp/nuvio.zip && (cd dist && zip -qr /tmp/nuvio.zip nuvio.js assets)
gh release create "v$V" dist/nuvio.js /tmp/nuvio.zip --title "Nuvio $V" --generate-notes --verify-tag
