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
if bad:
    print('HARDCODED CONTENT FOUND:'); [print('  ', b) for b in bad[:40]]; sys.exit(1)
print('guard OK – no house-specific ids in dist/nuvio.js')
