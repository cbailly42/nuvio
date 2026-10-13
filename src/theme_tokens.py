#!/usr/bin/env python3
"""Zamiana kolorów zapisanych na sztywno w www/*.part.js na tokeny CSS (--hg-…) z wartością jasną i ciemną.
Źródło: theme_src/*.part.js (stan sprzed motywów) -> www/*.part.js + www/hg-tokens.part.js (dwa zestawy tokenów).
Reguły ciemne liczone z roli koloru (tekst / tło / obramowanie / cień / grafika / dane), ręczne poprawki w OVR.
python theme_tokens.py   (potem build.py)"""
import re, os, glob, colorsys, json
D = os.path.dirname(os.path.abspath(__file__))
PAT = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^)$]*\)")

def parse(l):
    l = l.strip().lower()
    if l.startswith('#'):
        h = l[1:]
        if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return r, g, b, a
    n = [float(x) for x in re.findall(r"[\d.]+", l)]
    return int(n[0]), int(n[1]), int(n[2]), (n[3] if len(n) > 3 else 1.0)

def fmt(r, g, b, a=1.0):
    r, g, b = (max(0, min(255, round(x))) for x in (r, g, b))
    if a >= 0.999: return '#%02X%02X%02X' % (r, g, b)
    return 'rgba(%d,%d,%d,%s)' % (r, g, b, ('%.3f' % a).rstrip('0').rstrip('.') if a > 0 else '0')

def hls(r, g, b): return colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
def from_hls(h, l, s, a): r, g, b = colorsys.hls_to_rgb(h, max(0, min(1, l)), max(0, min(1, s))); return fmt(r * 255, g * 255, b * 255, a)
def neutral(r, g, b): return max(r, g, b) - min(r, g, b) < 26
def key(l):
    r, g, b, a = parse(l)
    k = '%02x%02x%02x' % (r, g, b)
    if a < 0.999: k += '-' + ('%03d' % round(a * 100))
    return k

def dark(role, l, tag=''):
    r, g, b, a = parse(l); h, L, s = hls(r, g, b); neu = neutral(r, g, b)
    if tag == 'k': return fmt(r, g, b, a)                       # celowo bez zmian (np. gałka przełącznika, wskaźnik zakładki)
    if role == 'tx':
        if tag == 'inv': return '#1C1C1E'
        if tag == 'on': return fmt(r, g, b, a)
        if neu: return from_hls(h, 1 - L * 0.38, s, a) if L < 0.6 else fmt(r, g, b, a)
        return from_hls(h, 0.72, s, a) if L < 0.7 else fmt(r, g, b, a)
    if role == 'gx':
        if neu and L < 0.4: return fmt(255, 255, 255, min(a * 1.25, 0.9) if a < 1 else 0.85)
        if neu and L > 0.85: return fmt(44, 44, 48, a)
        if neu: return from_hls(h, 1.02 - L, s, a)
        return from_hls(h, 0.6, s, a) if L < 0.45 else fmt(r, g, b, a)
    if role == 'bg':
        if neu and L < 0.25:
            if a < 0.3: return fmt(255, 255, 255, min(a * 1.3, 0.16))
            if a >= 0.95: return '#ECECEF'
            return fmt(r, g, b, a)
        if neu and L > 0.8:
            if a < 0.3: return fmt(255, 255, 255, round(a * 0.6, 3))
            if a >= 0.85: return fmt(46, 46, 51, a)
            return fmt(255, 255, 255, round(0.05 + (a - 0.3) * 0.1, 3))
        if neu: return from_hls(h, max(0.24, 1.0 - L), s, a)
        if L > 0.78: return from_hls(h, 0.24, min(s, 0.5), a)        # jasne pastelowe tła -> ciemny odcień tej samej barwy
        if a < 0.3: return fmt(r, g, b, min(a * 1.6, 0.4))           # delikatne akcentowe podbarwienia -> mocniejsze na ciemnym
        return fmt(r, g, b, a)
    if role == 'bd':
        if neu and L > 0.8: return fmt(255, 255, 255, max(0.05, min(a * 0.14, 0.12))) if a < 0.999 else '#2C2C30'
        if neu and L < 0.25: return fmt(255, 255, 255, min(a * 1.4, 0.14))
        if neu: return fmt(255, 255, 255, 0.12)
        if L > 0.78: return from_hls(h, 0.3, min(s, 0.5), a)
        return fmt(r, g, b, a)
    if role == 'sh':
        if neu and L > 0.8: return fmt(255, 255, 255, min(a * 0.1, 0.08))
        if neu or L < 0.35: return fmt(0, 0, 0, min(a * 2.2, 0.6))
        return fmt(r, g, b, a)
    return fmt(r, g, b, a)   # 'ac': kolory danych / stanów (akcenty) bez zmian

PROPROLE = [(r'^(color|-webkit-text-fill-color|caret-color|outline|text-decoration-color)$', 'tx'),
            (r'^(fill|stroke|stop-color)$', 'gx'),
            (r'^(background|background-color|background-image|--ha-card-background|round|ckground)$', 'bg'),
            (r'^(border|border-[a-z-]+)$', 'bd'),
            (r'^(box-shadow|text-shadow|filter|--hg-card-sh)$', 'sh')]
# selektory, w których kolor ma zostać jak jest w obu schematach
KEEP = [r'^\.fb', r'^\.nb$', r'^\.tab\.act \.nb$', r'^\.tg i$', r'^\.ind, \.rind$', r'^\.tab\.act$', r'^\.ri\.act$', r'^\.tab sup$', r'^\.logo$', r'^\.ndot$', r'^button:focus-visible$',
        r'hg-camfs', r'^\.head ', r'^\.shade$', r'^\.bg$', r'^\.brand', r'^\.uin$', r'^\.uav$', r'^\.chev$', r'^\.tabs$', r'^\.tab$', r'^\.tab:hover$',
        r'^\.rail$', r'^\.ri$', r'^\.ri:hover$', r'^\.sheet-l \.scrim$']

def role_of(prop, ctx_js):
    for rx, ro in PROPROLE:
        if re.match(rx, prop): return ro
    if prop == '?': return 'bg'        # druga linia gradientu
    return 'ac'

def block_info(src, pos):
    # selektor = tekst od poprzedniego '}' / '`' do '{' przed literałem; blok = do następnego '}'
    o = src.rfind('{', 0, pos); c = src.rfind('}', 0, pos)
    if o < 0 or o < c: return None, ''
    st = max(src.rfind('}', 0, o), src.rfind('`', 0, o), src.rfind('\n', 0, o) if '\n' in src[src.rfind('\n', 0, o):o] else -1)
    sel = src[st + 1:o].strip().split('\n')[-1].strip()
    e = src.find('}', pos)
    return sel, src[o:e if e > 0 else pos + 200]

TOK = {}   # name -> (light, dark, role)
def tok(role, lit, tag=''):
    t = 'k' if tag == 'k' else tag
    name = '--hg-%s-%s%s' % (role, key(lit), ('-' + t) if t else '')
    TOK[name] = (fmt(*parse(lit)), dark(role, lit, tag), role)
    return name

def convert(src, fn):
    out = []; last = 0
    for m in PAT.finditer(src):
        lit = m.group(); s = m.start()
        line_start = src.rfind('\n', 0, s) + 1
        pre = src[max(line_start, s - 60):s]
        # komentarz /* … */ albo // – zostaw
        ls = src[line_start:s]
        if '//' in ls and not re.search(r"https?://|'[^']*//", ls): continue
        cs = src.rfind('/*', 0, s); ce = src.rfind('*/', 0, s)
        if cs > ce: continue
        # atrybut SVG stop-color="…"
        am = re.search(r'(stop-color|fill|stroke)="$', pre)
        pm = re.findall(r"([a-z-]+)\s*:\s*[^;:{}`'\"]*$", pre)
        jm = re.search(r"['\"]$", pre)
        if am:
            prop = am.group(1); role = 'gx'
        elif jm and not pm:
            prop = 'js'; role = 'ac'
        else:
            prop = pm[-1] if pm else '?'; role = role_of(prop, False)
            if prop not in ('?',) and role == 'ac' and not jm: role = 'bg' if prop == '?' else role
        sel, blk = block_info(src, s)
        tag = ''
        if sel is not None and any(re.search(k, sel) for k in KEEP) and fn in ('hg-page.part.js', 'hg-styles.part.js', 'hg-cards4.part.js'): tag = 'k'
        elif sel in ('.tg i', '.lv', '.chip.act', '.tab.act sup', '.on .bd', '.ill .ring .in'): tag = 'k' if sel != '.ill .ring .in' else ''
        if not tag and role == 'tx' and blk:
            r, g, b, a = parse(lit); h, L, sat = hls(r, g, b)
            bgs = [parse(x) for x in PAT.findall(' '.join(re.findall(r'background(?:-color)?\s*:\s*([^;}]*)', blk)))]
            if L > 0.85 and any(neutral(*c[:3]) and hls(*c[:3])[1] < 0.25 and c[3] >= 0.95 for c in bgs): tag = 'inv'
            elif L < 0.45 and any((not neutral(*c[:3]) and hls(*c[:3])[1] > 0.45 and hls(*c[:3])[2] > 0.35 and c[3] > 0.6) for c in bgs): tag = 'on'
        name = tok(role, lit, tag)
        out.append(src[last:s])
        if am:
            # stop-color="#x" -> style="stop-color:var(--…)"
            out[-1] = out[-1][:-len(am.group(0))]
            out.append('style="%s:var(%s)' % (prop, name)); last = m.end(); continue
        out.append('var(%s)' % name); last = m.end()
    out.append(src[last:])
    return ''.join(out)

# ręczne strojenie kluczowych powierzchni (po nazwie tokenu): (jasny bez zmian, ciemny)
OVR = json.load(open(os.path.join(D, 'theme_overrides.json'))) if os.path.exists(os.path.join(D, 'theme_overrides.json')) else {}

if __name__ == '__main__':
    for f in sorted(glob.glob(os.path.join(D, 'theme_src', '*.part.js'))):
        fn = os.path.basename(f)
        if fn == 'hg-core.part.js':
            open(os.path.join(D, 'www', fn), 'w').write(open(f).read()); continue
        open(os.path.join(D, 'www', fn), 'w').write(convert(open(f).read(), fn))
    for k, v in OVR.items():
        if k in TOK: TOK[k] = (v[0] or TOK[k][0], v[1] if v[1] else TOK[k][1], TOK[k][2]) if isinstance(v, list) else (TOK[k][0], v, TOK[k][2])
        else: print('OVR: brak tokenu', k)
    def _lt(k, c):
        # jasny: teksty na jasnym szkle -> prawie czarny (#111) lub ciemnoszary (#3A3D42), nigdy jasnoszary
        m = re.fullmatch(r'#([0-9A-Fa-f]{6})', c.strip())
        if not k.startswith('--hg-tx') or not m: return c
        r, g, b = (int(m.group(1)[i:i+2], 16) for i in (0, 2, 4))
        if max(r, g, b) - min(r, g, b) > 20: return c  # kolory (pomarańcz, akcenty) bez zmian
        if max(r, g, b) > 0xC0: return c  # białe/jasne na wypełnieniach akcentu
        return '#111111' if max(r, g, b) < 0x30 else '#3A3D42'
    L = '\n'.join('  %s:%s;' % (k, _lt(k, v[0])) for k, v in sorted(TOK.items()))
    Dk = '\n'.join('  %s:%s;' % (k, v[1]) for k, v in sorted(TOK.items()) if v[1] != v[0])
    def _boost(c):
        m = re.fullmatch(r'#([0-9A-Fa-f]{6})', c.strip())
        if not m: return None
        r, g, b = (int(m.group(1)[i:i+2], 16) for i in (0, 2, 4))
        if min(r, g, b) < 150 or max(r, g, b) - min(r, g, b) > 16: return None  # tylko jasne szarości (teksty drugorzędne)
        f = lambda x: round(x + (255 - x) * .45)
        return '#%02X%02X%02X' % (f(r), f(g), f(b))
    LB = '\n'.join('  %s:%s;' % (k, _boost(v[1])) for k, v in sorted(TOK.items()) if k.startswith('--hg-tx') and v[1] != v[0] and _boost(v[1]))
    js = open(os.path.join(D, 'theme_head.js')).read().replace('/*@LIGHT@*/', L).replace('/*@DARK@*/', Dk)
    sp = os.path.join(D, 'www', 'hg-styles.part.js')
    body = open(sp).read()
    open(sp, 'w').write(js + body)
    json.dump({k: list(v) for k, v in sorted(TOK.items())}, open(os.path.join(D, 'tt', 'tokens.json'), 'w'), indent=0)
    print('tokens', len(TOK), 'dark-differs', sum(1 for v in TOK.values() if v[0] != v[1]))
