#!/usr/bin/env python3
"""i18n guard: every user-facing string in src/ must be a PL/EN pair (hgTr, hgTrO, hgTrLazy or a 'pl', 'en' literal pair).
Flags (1) Polish text without an English partner, (2) English text in UI positions (aria-label, title, placeholder, alt,
text between tags, toasts) that is not translated. Exit 1 on findings. Usage: i18n_check.py [--list] [--json]"""
import os, re, sys, json
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PL = re.compile(r"[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|\b(nie|jest|się|oraz|lub|dla|zapisz|usuń|dodaj|wybierz|brak|włącz|wyłącz|edytuj|zamknij|anuluj|gotowe|ustawienia|widok|karta|kafel|tło|pokój|pokoje|zmień|pokaż|ukryj|domyślny|domyślne|szukaj|wróć|dalej|nazwa|ikona|tytuł|kolor|rozmiar|tylko|wszystko|wszyscy|teraz|dzisiaj|jutro|wczoraj|godz|minut|sekund|dni|temperatura|wilgotność|zużycie|moc)\b", re.I)
WORD = re.compile(r"[A-Za-z]{3,}")
SKIP_FILES = ()
# literals that are not prose: ids, css, urls, entity ids, icon names, html tags only, numbers
NOTPROSE = re.compile(r"^(?:[\w.\-:/#%?&=+@*]+|mdi:[\w-]+|\s*)$")

def lex(src):
    """yield (kind, start, end, text) for strings and code; kind in str|tpl|code. Template literals are split into text parts and ${} code."""
    i, n = 0, len(src); out = []
    def tpl(i):  # i at char after backtick; returns index after closing backtick
        buf_start = i; lit0 = i - 1
        while i < n:
            c = src[i]
            if c == '\\': i += 2; continue
            if c == '`': out.append(('tpl', buf_start, i, src[buf_start:i])); out.append(('lit', lit0, i + 1, '')); return i + 1
            if c == '$' and i + 1 < n and src[i + 1] == '{':
                out.append(('tpl', buf_start, i, src[buf_start:i])); i = code(i + 2, '}'); buf_start = i; continue
            i += 1
        return i
    def code(i, end):
        depth = 0
        while i < n:
            c = src[i]
            if c in '\'"':
                q = c; j = i + 1
                while j < n and src[j] != q:
                    if src[j] == '\\': j += 1
                    if src[j] == '\n': break
                    j += 1
                out.append(('str', i + 1, j, src[i + 1:j])); i = j + 1; continue
            if c == '`': i = tpl(i + 1); continue
            if c == '/' and i + 1 < n and src[i + 1] == '/': j = src.find('\n', i); i = n if j < 0 else j; continue
            if c == '/' and i + 1 < n and src[i + 1] == '*': j = src.find('*/', i + 2); i = n if j < 0 else j + 2; continue
            if c == '/':  # regex literal heuristic: previous non-space char is an operator or ( , = : [ ! & | ? { } ;
                k = i - 1
                while k >= 0 and src[k] in ' \t': k -= 1
                if k < 0 or src[k] in '(,=:[!&|?{};\n' or src[max(0, k - 5):k + 1].endswith('return'):
                    j = i + 1; cls = False
                    while j < n and src[j] != '\n':
                        if src[j] == '\\': j += 2; continue
                        if src[j] == '[': cls = True
                        elif src[j] == ']': cls = False
                        elif src[j] == '/' and not cls: break
                        j += 1
                    i = j + 1; continue
            if c in '({[': depth += 1
            elif c in ')}]':
                if depth == 0 and c == end: return i + 1
                depth -= 1
            i += 1
        return i
    code(0, None); return out

def tr_spans(src):
    """character ranges covered by hgTr(...), hgTrLazy(...), hgTrO(...) calls"""
    sp = []
    for m in re.finditer(r"\b(hgTr|hgTrLazy|hgTrO|L)\s*\(", src):
        i = m.end(); d = 1; n = len(src); q = None
        while i < n and d:
            c = src[i]
            if q:
                if c == '\\': i += 2; continue
                if c == q: q = None
            elif c in '\'"`': q = c
            elif c == '(': d += 1
            elif c == ')': d -= 1
            i += 1
        sp.append((m.start(), i))
    return sp

TECH = re.compile(r"^[\d.,\s~+\-]*(?:min|h|s|kWh(?: PV)?|kW|W|Wh|V|A|Hz|CPU|RAM|BETA|LIVE|PV|EV|AC|DC|UV|PM2\.5|PM10|CO2|VOC|Wi-?Fi|LAN|WAN|IP|MAC|DNS|SSID|Home Assistant|Assist|Nuvio|HACS|Zigbee|Matter|Bluetooth|zł|°C|°F|%|lx|ppm|mdi:…|OK|ID|URL|HTTP|API|alarm|Auto|Turbo|Smart|Standard|Max|Mop|Start|Stop|Eco|Eko)$")
# PL-only dictionaries whose English is the raw HA value (by design, see hgTr fallback)
PL_FALLBACK = ('HG_PL', 'HG_WX_SHORT')

def close_of(src, i):
    """i just after an opening { or [ ; returns index after the matching closer"""
    d = 1; q = None
    while i < len(src) and d:
        c = src[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
        elif c in '\'"`': q = c
        elif c in '{[(': d += 1
        elif c in '}])': d -= 1
        i += 1
    return i

def top_keys(body):
    """keys at depth 0 of an object body"""
    out = []; d = 0; q = None; i = 0; tok = re.compile(r"\s*(?:'([^']+)'|\"([^\"]+)\"|([A-Za-z_$][\w$]*))\s*:")
    expect = True
    while i < len(body):
        c = body[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
            i += 1; continue
        if d == 0 and expect:
            m = tok.match(body, i)
            if m: out.append(m.group(1) or m.group(2) or m.group(3)); i = m.end(); expect = False; continue
        if c in '\'"`': q = c
        elif c in '{[(': d += 1
        elif c in '}])': d -= 1
        elif c == ',' and d == 0: expect = True
        i += 1
    return out

def lang_dicts(src):
    """{ pl: { ... }, en: { ... } } language tables -> list of (line, pl_keys, en_keys, span)"""
    out = []
    for m in re.finditer(r"\bpl\s*:\s*\{", src):
        a = m.end(); b = close_of(src, a)
        n = re.match(r"\s*,\s*en\s*:\s*\{", src[b:])
        if not n: continue
        c = b + n.end(); e = close_of(src, c)
        out.append((src.count('\n', 0, m.start()) + 1, top_keys(src[a:b - 1]), top_keys(src[c:e - 1]), (m.start(), e)))
    return out

def maps(src):
    """const NAME = { k: 'v', ... } -> {NAME: (start, end, keys)}"""
    M = {}
    for m in re.finditer(r"\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*\{", src):
        i = m.end(); d = 1; q = None
        while i < len(src) and d:
            c = src[i]
            if q:
                if c == '\\': i += 2; continue
                if c == q: q = None
            elif c in '\'"`': q = c
            elif c == '{': d += 1
            elif c == '}': d -= 1
            i += 1
        body = src[m.end():i - 1]
        keys = re.findall(r"(?:^|[,{]\s*)(?:'([^']+)'|\"([^\"]+)\"|([A-Za-z_$][\w$]*))\s*:", body)
        M[m.group(1)] = (m.start(), i, [a or b or c for a, b, c in keys])
    return M

def check(path):
    src = open(path, encoding='utf-8').read(); allt = lex(src); sp = tr_spans(src); bad = []
    lits = [(a, b) for k, a, b, _ in allt if k == 'lit']; toks = [x for x in allt if x[0] != 'lit']
    def lit_of(a, b, kind):
        if kind == 'str': return a - 1, b + 1
        best = None
        for s0, e0 in lits:
            if s0 < a and b < e0 and (best is None or e0 - s0 < best[1] - best[0]): best = (s0, e0)
        return best or (a - 1, b + 1)
    NEXT = re.compile(r"\s*,\s*(?:(?:en|pl|on)\s*:\s*)?['\"`]"); PREV = re.compile(r"['\"`]\s*,\s*(?:(?:en|pl|on)\s*:\s*)?$")
    M = maps(src)
    def partner(n):
        for a, b in ((n + '_EN', None), (n[:-3] + '_EN' if n.endswith('_PL') else None, None)):
            if a and a in M: return a
        return None
    paired = []
    for n, (a, b, keys) in M.items():
        if n.endswith('_EN'): paired.append((a, b)); continue
        en = partner(n)
        if en:
            paired.append((a, b)); miss = [k for k in keys if k not in M[en][2]]
            for k in miss: bad.append((src.count('\n', 0, a) + 1, 'missing-en-key', f'{n}.{k} (no key in {en})'))
            for k in [k for k in M[en][2] if k not in keys]: bad.append((src.count('\n', 0, a) + 1, 'missing-pl-key', f'{en}.{k} (no key in {n})'))
        elif n in PL_FALLBACK: paired.append((a, b))
    for line, pk, ek, span in lang_dicts(src):
        paired.append(span)
        for k in pk:
            if k not in ek: bad.append((line, 'missing-en-key', f'pl.{k} has no en.{k}'))
        for k in ek:
            if k not in pk: bad.append((line, 'missing-pl-key', f'en.{k} has no pl.{k}'))
    inside = lambda a: any(s <= a < e for s, e in sp) or any(s <= a < e for s, e in paired)
    PAIRGAP = re.compile(r"['\"`]\s*,\s*(?:(?:en|pl|on)\s*:\s*)?['\"`]")
    for k, (kind, a, b, t) in enumerate(toks):
        if inside(a): continue
        line = src.count('\n', 0, a) + 1
        nxt = toks[k + 1] if k + 1 < len(toks) else None; prv = toks[k - 1] if k else None
        L0, L1 = lit_of(a, b, kind)
        pn = NEXT.match(src, L1) is not None
        pp = PREV.search(src[max(0, L0 - 40):L0]) is not None
        if kind == 'str':
            if not t.strip() or NOTPROSE.match(t) or pn or pp: continue
            if PL.search(t): bad.append((line, 'pl-only', t)); continue
            # English literal written straight into the DOM
            if WORD.search(t) and not TECH.match(t) and not re.search(r"[{};<>]", t) and re.search(r"\b(?:textContent|innerText|placeholder|ariaLabel|title)\s*=\s*$", src[max(0, a - 40):a - 1]):
                bad.append((line, 'en-dom', t))
            continue
        if pn or pp: continue
        t = re.sub(r"/\*.*?\*/", " ", t, flags=re.S)
        css = len(re.findall(r"[{};]", t)) >= 3 and re.search(r"[a-z-]+\s*:\s*[^;]+;", t)
        if css: continue
        for m in re.finditer(r"\b(aria-label|title|placeholder|alt)=\"([^\"$]*)\"", t):
            v = m.group(2).strip()
            if v and WORD.search(v) and not NOTPROSE.match(v) and not TECH.match(v): bad.append((line, m.group(1), v))
        for m in re.finditer(r">([^<>]+)<", t):
            v = m.group(1).strip()
            if v and WORD.search(v) and not TECH.match(v) and not re.search(r"[{};=]", v): bad.append((line, 'text', v))
        plain = re.sub(r"<[^>]*>", "\n", t)
        for v in [x.strip() for x in plain.split('\n')]:
            if v and PL.search(v) and not TECH.match(v) and not any(v == x[2] for x in bad): bad.append((line, 'pl-tpl', v))
    return bad

def main():
    files = []
    for d, _, fs in os.walk(os.path.join(R, 'src', 'parts')):
        for f in fs:
            if f.endswith('.js') and f not in SKIP_FILES: files.append(os.path.join(d, f))
    allbad = {}
    for p in sorted(files):
        b = check(p)
        if b: allbad[os.path.relpath(p, R)] = b
    n = sum(len(v) for v in allbad.values())
    if '--json' in sys.argv: print(json.dumps(allbad, ensure_ascii=False, indent=1)); return n
    if n:
        print(f'i18n: {n} untranslated UI strings')
        for f, b in allbad.items():
            for line, k, t in b[: (10**6 if '--list' in sys.argv else 5)]: print(f'  {f}:{line} [{k}] {t[:90]}')
    else: print('i18n OK – every UI string has PL and EN')
    return n
if __name__ == '__main__': sys.exit(1 if main() else 0)
