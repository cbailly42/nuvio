#!/usr/bin/env python3
"""Build dist/home-glass.js from src/parts (tokenizer -> concat). No Home Assistant access, no secrets."""
import os, sys, shutil, subprocess, hashlib, tempfile, json
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS = ['hg-select.part.js', 'hg-oss.part.js', 'hg-core.part.js', 'hg-styles.part.js'] + [f'hg-cards{i}.part.js' for i in range(1, 13)] + ['hg-roomx.part.js', 'hg-page.part.js', 'hg-edit.part.js', 'hg-backup.part.js', 'hg-wall.part.js']
import re
def brand(js):
    """Nuvio branding at build time: element tags hg-* -> nuvio-*, storage keys, names. Sources stay in sync with the private build."""
    tags = sorted(set(re.findall(r"hgReg\('(hg-[a-z-]+)'", js)) | {'hg-page'}, key=len, reverse=True)
    for t in tags:
        n = 'nuvio-' + t[3:]
        js = re.sub(r'(?<![-\w])' + re.escape(t) + r'(?![-\w])', n, js)
        js = re.sub(r'(?<![-\w])' + re.escape(t.upper()) + r'(?![-\w])', n.upper(), js)
    for a, b in [('ll-strategy-dashboard-home-glass', 'll-strategy-dashboard-nuvio'), ('home_glass_layout', 'nuvio_layout'), ('/hacsfiles/home-glass/', '/hacsfiles/nuvio/'),
                 ('home-glass:', 'nuvio:'), ("'home-glass'", "'nuvio'"), ('Home Glass – ', 'Nuvio – '), ('Home Glass', 'Nuvio'), ('home-glass', 'nuvio'), ('Witaj w nuvio', 'Witaj w Nuvio'), ('Welcome to nuvio', 'Welcome to Nuvio')]:
        js = js.replace(a, b)
    return js
def main():
    w = tempfile.mkdtemp(prefix='hgb-')
    try:
        os.makedirs(os.path.join(w, 'www')); os.makedirs(os.path.join(w, 'tt'))
        shutil.copytree(os.path.join(R, 'src', 'parts'), os.path.join(w, 'theme_src'))
        for f in ('theme_tokens.py', 'theme_head.js', 'theme_overrides.json'):
            if os.path.exists(os.path.join(R, 'src', f)): shutil.copy(os.path.join(R, 'src', f), w)
        subprocess.run([sys.executable, os.path.join(w, 'theme_tokens.py')], check=True, cwd=w)
        js = '\n'.join(open(os.path.join(w, 'www', p)).read() for p in PARTS)
        ver = json.load(open(os.path.join(R, 'package.json')))['version'] if os.path.exists(os.path.join(R, 'package.json')) else '0.0.0'
        v = ver + '+' + hashlib.md5(js.encode()).hexdigest()[:8]
        js = js.replace("'__HG_BUILD__'", "'%s'" % v, 1)
        js = brand(js)
        os.makedirs(os.path.join(R, 'dist'), exist_ok=True)
        open(os.path.join(R, 'dist', 'nuvio.js'), 'w').write(js)
        print('built dist/nuvio.js', v, len(js) // 1024, 'KB')
    finally:
        shutil.rmtree(w, ignore_errors=True)
if __name__ == '__main__': main()
