#!/usr/bin/env python3
"""Fail the build if the shipped JS contains house-specific entity ids, areas or private URLs."""
import re, sys, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
js = open(os.path.join(R, 'dist', 'nuvio.js')).read()
bad = []
for pat in [r"home-glass", r"\bhg-(?:page|[a-z]+-card)\b", r"/local/images/", r"\b(?:sensor|light|switch|climate|person|media_player|camera|binary_sensor|weather|script|scene)\.[a-z0-9]+_[a-z0-9_]+\b"]:
    for m in re.finditer(pat, js):
        s = js[max(0, m.start() - 40):m.end() + 20].replace('\n', ' ')
        if re.search(r'vacuum_clean_segment|\.turn_on|\.turn_off|\.toggle', s): continue
        bad.append(s)
# optional HACS packages must never be imported / fetched by Nuvio itself (detection only)
for m in re.finditer(r"(?:import\s*\(|import\s+[^;]*from\s*|fetch\s*\()\s*['\"`][^'\"`]*(?:kiosk-mode|custom-sidebar|card-mod)", js): bad.append('optional package loaded directly: ' + m.group(0)[:80])
# assets flat in dist/ (HACS downloads only files directly in dist/): no subfolders, no old asset paths
dd = os.path.join(R, 'dist')
for f in os.listdir(dd):
    if os.path.isdir(os.path.join(dd, f)): bad.append(f'subfolder in dist/ (HACS skips it): {f}')
if 'assets/' in js: bad.append('old assets/ path in dist/nuvio.js')
for need in ('nuvio-font-dmsans-latin.woff2', 'nuvio-font-dmsans-latin-ext.woff2', 'nuvio-bg-default-wide.webp', 'nuvio-bg-default-portrait.webp', 'nuvio-meteo-static-sunrise.svg', 'CREDITS.md'):
    if not os.path.exists(os.path.join(dd, need)): bad.append(f'missing dist/{need}')
# every bundled background listed in dist/CREDITS.md and within size budget
cr = open(os.path.join(dd, 'CREDITS.md')).read() if os.path.exists(os.path.join(dd, 'CREDITS.md')) else ''
for f in sorted(os.listdir(dd)):
    if not (f.startswith('nuvio-bg-') and f.endswith('.webp')): continue
    i, kind = f[len('nuvio-bg-'):-5].rsplit('-', 1); kb = os.path.getsize(os.path.join(dd, f)) / 1024
    if f'`{i}`' not in cr: bad.append(f'background {f} missing from CREDITS.md')
    if kb > {'wide': 350, 'portrait': 320, 'thumb': 16}.get(kind, 0): bad.append(f'background {f} too large ({kb:.0f} KB)')
if bad:
    print('HARDCODED CONTENT FOUND:'); [print('  ', b) for b in bad[:40]]; sys.exit(1)
print('guard OK – no house-specific ids in dist/nuvio.js')
