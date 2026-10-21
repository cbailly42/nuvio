#!/usr/bin/env python3
"""i18n migration, part 1: extract every inline PL/EN pair from src/parts and propose catalog keys.
  extract(root) -> [Occ]      one per hgTr / hgTrLazy call, per hgTrO entry, per dictionary entry
  propose(occs, existing=None) -> [Row]   Occ + key + status; existing = rows of a previous CSV whose keys are kept
  CLI: i18n_migrate.py propose [--root src] [--out tools/i18n_migration_table.csv] [--fresh]

Occ = {file, line, start, end, kind, pl, en, params, manual, name, dkey}   (the CSV does NOT carry start/end: Task 6 calls extract() again for ranges)
A hgTr( nested in a template argument of another hgTr is its own Occ (code inside ${}); the outer one is manual `expr`.
extract() raises if a hgTr( / hgTrLazy( / hgTrO( in the source is neither an Occ, nor in a gateway definition / dictionary / comment / string text.
  kind    hgTr | hgTrLazy | hgTrO | dict ; start/end = character range of the call, of the `[pl, en]` entry (hgTrO) or of the
          dictionary value (dict: the PL value; en_start/en_end give the EN value when there is one)
  manual  None | concat | plural | object | array | expr | dict-dynamic   (see § 5.2 of the spec)
  name    dictionary name (dict only) ; dkey = entry key (hgTrO entry key, dictionary key, HG_BG_SET id)
  For manual rows pl/en hold the raw source text of the arguments. For HG_PL, en is the raw HA state (= its key).
  For HG_WX_SHORT (dict-dynamic) pl is the dictionary key (the PL index text) and en its short value: not a language pair.
Key status: manual (any manual reason) | review (key may be clumsy: promoted to common.*, collision suffix _2.., slug cut at
40 chars, slug under 3 chars or empty, accented/non-ASCII letters in the first words, dictionary key that had to be rewritten) | auto.
"""
import os, re, sys, csv, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i18n_check import lex, tr_spans   # reused as-is (note: tr_spans also reports L(...); we drop those)

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLUMNS = ['key', 'file', 'line', 'kind', 'en', 'pl', 'params', 'manual', 'status']
DICTS = {'HG_I18N': 'nav', 'HG_WZ_T': 'wizard', 'HG_PL': 'states', 'HG_BG_SET': 'backgrounds', 'HG_WX_SHORT': 'weather'}
MAX_SLUG, SLUG_WORDS, COMMON_MODULES = 40, 4, 3
IDENT = re.compile(r"^[A-Za-z_$][\w$]*$")
COND1 = re.compile(r"(?:[!=]==?\s*1|>\s*1)\s*\?\s*$")
COND2 = re.compile(r"(?:[!=]==?\s*1|>\s*1)\s*\?\s*(?:hgTr(?:Lazy)?\(.*\)|'[^']*'|\"[^\"]*\")\s*:\s*$")
PLURAL = re.compile(r"[!=]==?\s*1\b|>\s*1\b|<\s*2\b|%\s*10\b")

# ---------------------------------------------------------------- scanning
def skip_str(s, i):
    """s[i] is a quote or backtick; returns the index after the closing one (template ${} may nest)"""
    q = s[i]; i += 1; n = len(s)
    while i < n:
        c = s[i]
        if c == '\\': i += 2; continue
        if c == q: return i + 1
        if q == '`' and c == '$' and s[i + 1:i + 2] == '{': i = group_end(s, i + 2); continue
        i += 1
    return n

def group_end(s, i):
    """i just after an opener ( [ {  -> index after the matching closer (strings and comments skipped)"""
    d = 1; n = len(s)
    while i < n:
        c = s[i]
        if c in '\'"`': i = skip_str(s, i); continue
        if c == '/' and s[i + 1:i + 2] == '/': j = s.find('\n', i); i = n if j < 0 else j; continue
        if c == '/' and s[i + 1:i + 2] == '*': j = s.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c in '([{': d += 1
        elif c in ')]}':
            d -= 1
            if not d: return i + 1
        i += 1
    return n

def split_top(s, a, b):
    """top-level comma separated spans of s[a:b], trimmed; empty ones dropped"""
    out = []; i = a; st = a
    def push(x, y):
        while x < y and s[x] in ' \t\r\n': x += 1
        while y > x and s[y - 1] in ' \t\r\n': y -= 1
        if y > x: out.append((x, y))
    while i < b:
        c = s[i]
        if c in '\'"`': i = skip_str(s, i); continue
        if c == '/' and s[i + 1:i + 2] == '/': j = s.find('\n', i); i = b if j < 0 else j; continue
        if c == '/' and s[i + 1:i + 2] == '*': j = s.find('*/', i + 2); i = b if j < 0 else j + 2; continue
        if c in '([{': i = group_end(s, i + 1); continue
        if c == ',': push(st, i); st = i + 1
        i += 1
    push(st, min(b, len(s))); return out

ESC = {'n': '\n', 't': '\t', 'r': '\r', 'b': '\b', 'f': '\f', 'v': '\v', '0': '\0'}
def unescape(t):
    def f(m):
        e = m.group(1)
        if e[0] == 'u': return chr(int(e[1:], 16))
        if e[0] == 'x': return chr(int(e[1:], 16))
        if e == '\n': return ''
        return ESC.get(e, e)
    return re.sub(r"\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|[\s\S])", f, t)

def parse_arg(s, a, b):
    """-> (type, text, params, bad) ; type str|obj|arr|other. text = decoded literal (template: ${id} -> {id}) or raw source"""
    raw = re.sub(r"\s+", " ", s[a:b]).strip()
    if s[a] == '{': return 'obj', raw, [], False
    if s[a] == '[': return 'arr', raw, [], False
    if s[a] in '\'"' and skip_str(s, a) == b: return 'str', unescape(s[a + 1:b - 1]), [], False
    if s[a] == '`' and skip_str(s, a) == b:
        out = []; params = []; bad = False; i = a + 1; st = i
        while i < b - 1:
            c = s[i]
            if c == '\\': i += 2; continue
            if c == '$' and s[i + 1] == '{':
                out.append(unescape(s[st:i])); j = group_end(s, i + 2); e = s[i + 2:j - 1].strip()
                if IDENT.match(e): out.append('{' + e + '}'); params.append(e) if e not in params else None
                else: out.append('${' + e + '}'); bad = 'plural' if '?' in e and PLURAL.search(e) else (bad or 'expr')
                i = st = j; continue
            i += 1
        out.append(unescape(s[st:b - 1])); return 'str', ''.join(out), params, bad
    return 'other', raw, [], False

def has_plus(s, a, b):
    """top-level '+' (not ++) outside strings/brackets in s[a:b]"""
    i = a
    while i < b:
        c = s[i]
        if c in '\'"`': i = skip_str(s, i); continue
        if c in '([{': i = group_end(s, i + 1); continue
        if c == '+' and s[i + 1:i + 2] != '+' and s[i - 1:i] != '+': return True
        i += 1
    return False

def classify(s, spans, call_a, call_b, near=True):
    """spans = the (pl, en) argument spans -> (pl, en, params, manual)"""
    if len(spans) != 2:
        raw = [re.sub(r"\s+", " ", s[a:b]) for a, b in spans] + ['', '']
        return raw[0], raw[1], [], 'expr'
    P = [parse_arg(s, a, b) for a, b in spans]
    pl, en = P[0][1], P[1][1]; params = []
    for p in P:
        for x in p[2]:
            if x not in params: params.append(x)
    if any(p[0] == 'obj' for p in P): return pl, en, [], 'object'
    if any(p[0] == 'arr' for p in P): return pl, en, [], 'array'
    pre = s[:call_a].rstrip(); post = s[call_b:call_b + 8].lstrip(' \t')
    plus = (pre.endswith('+') and not pre.endswith('++')) or (post.startswith('+') and not post.startswith('++')) \
        or any(p[0] == 'other' and has_plus(s, *sp) for p, sp in zip(P, spans))
    if plus: return pl, en, [], 'concat'
    ls = s.rfind('\n', 0, call_a) + 1; win = s[max(ls, call_a - 200):call_a]   # a `n === 1 ? hgTr(..) : hgTr(..)` pair on one line
    if COND1.search(win) or COND2.search(win): return pl, en, params, 'plural'
    bad = [p[3] for p in P if p[3]]
    if any(p[0] == 'other' for p in P): return pl, en, [], 'expr'
    if 'plural' in bad: return pl, en, [], 'plural'
    if bad: return pl, en, [], 'expr'
    return pl, en, params, None

# ---------------------------------------------------------------- extraction
def line_of(s, i): return s.count('\n', 0, i) + 1

def find_assign(s, name):
    m = re.search(r"\bconst\s+" + name + r"\s*=", s)
    return m

def snake(k):
    k = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", k)
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", k.lower())).strip('_')

def obj_entries(s, a, b):
    """entries of an object literal body s[a:b] -> [(key, (va, vb))]"""
    out = []
    for x, y in split_top(s, a, b):
        m = re.match(r"(?:'([^']*)'|\"([^\"]*)\"|([\w$]+))\s*:\s*", s[x:y])
        if m: out.append((next(g for g in m.groups() if g is not None), (x + m.end(), y)))
    return out

def dict_occ(file, s, name, dkey, va, vb, **kw):
    o = {'file': file, 'line': line_of(s, va), 'start': va, 'end': vb, 'kind': 'dict', 'pl': '', 'en': '', 'params': [], 'manual': None, 'name': name, 'dkey': dkey}
    o.update(kw); return o

def lit(s, a, b):
    t = parse_arg(s, a, b); return t if t[0] == 'str' and not t[3] else None

def extract_dicts(file, s):
    occs = []; spans = []
    for name in ('HG_I18N', 'HG_WZ_T'):
        m = find_assign(s, name)
        if not m: continue
        i = s.index('{', m.end()); e = group_end(s, i + 1); spans.append((m.start(), e))
        langs = {k: v for k, v in obj_entries(s, i + 1, e - 1)}
        if 'pl' not in langs or 'en' not in langs: continue
        pl = {k: v for k, v in obj_entries(s, langs['pl'][0] + 1, langs['pl'][1] - 1)}
        en = {k: v for k, v in obj_entries(s, langs['en'][0] + 1, langs['en'][1] - 1)}
        for k, (pa, pb) in pl.items():
            ea, eb = en.get(k, (None, None))
            o = dict_occ(file, s, name, k, pa, pb, en_start=ea, en_end=eb)
            if s[pa] == '[':
                o['pl'], o['en'], o['manual'] = re.sub(r"\s+", " ", s[pa:pb]), re.sub(r"\s+", " ", s[ea:eb]) if ea else '', 'array'
            else:
                p, q = lit(s, pa, pb), lit(s, ea, eb) if ea else None
                if p and q: o['pl'], o['en'] = p[1], q[1]; o['params'] = p[2] + [x for x in q[2] if x not in p[2]]
                else: o['pl'], o['en'], o['manual'] = re.sub(r"\s+", " ", s[pa:pb]), re.sub(r"\s+", " ", s[ea:eb]) if ea else '', 'expr'
            occs.append(o)
    for o in occs:
        if o['kind'] == 'dict' and not o['manual']: o['params'] = list(dict.fromkeys(re.findall(r"\{([A-Za-z_]\w*)\}", o['en'] + '\0' + o['pl'])))
    m = find_assign(s, 'HG_PL')
    if m:
        i = s.index('{', m.end()); e = group_end(s, i + 1); spans.append((m.start(), e))
        for k, (a, b) in obj_entries(s, i + 1, e - 1):
            p = lit(s, a, b); o = dict_occ(file, s, 'HG_PL', k, a, b, en_start=None, en_end=None)
            o['pl'], o['en'] = (p[1], k) if p else (re.sub(r"\s+", " ", s[a:b]), k)
            if not p: o['manual'] = 'expr'
            occs.append(o)
    m = find_assign(s, 'HG_WX_SHORT')
    if m:
        i = s.index('{', m.end()); e = group_end(s, i + 1); spans.append((m.start(), e))
        for k, (a, b) in obj_entries(s, i + 1, e - 1):
            p = lit(s, a, b); o = dict_occ(file, s, 'HG_WX_SHORT', k, a, b, en_start=None, en_end=None)
            o['pl'], o['en'], o['manual'] = k, p[1] if p else re.sub(r"\s+", " ", s[a:b]), 'dict-dynamic'
            occs.append(o)
    m = find_assign(s, 'HG_BG_SET')
    if m:
        i = s.index('[', m.end()); e = group_end(s, i + 1); mm = re.match(r"\s*\.map\s*\(", s[e:])
        spans.append((m.start(), group_end(s, e + mm.end()) if mm else e))   # the .map(...) holds hgTrLazy(pl, en) with variables: gateway, not an occurrence
        for x, y in split_top(s, i + 1, e - 1):
            if s[x] != '[': continue
            f = split_top(s, x + 1, y - 1); L = [lit(s, a, b) for a, b in f]
            if len(f) == 3 and all(L):
                occs.append(dict_occ(file, s, 'HG_BG_SET', L[0][1], x, y, pl=L[1][1], en=L[2][1]))
    return occs, spans

def scan_regions(s):
    """(comments, text): character ranges of comments and of string / template text (not ${} code). Same lexical rules as
    i18n_check.lex, which drops comments without reporting where they were, so the ranges are recomputed here."""
    comments = []; text = []; n = len(s)
    def tpl(i):
        st = i
        while i < n:
            c = s[i]
            if c == '\\': i += 2; continue
            if c == '`': text.append((st, i)); return i + 1
            if c == '$' and s[i + 1:i + 2] == '{': text.append((st, i)); i = code(i + 2, '}'); st = i; continue
            i += 1
        text.append((st, n)); return n
    def code(i, end):
        depth = 0
        while i < n:
            c = s[i]
            if c in '\'"':
                j = i + 1
                while j < n and s[j] != c:
                    if s[j] == '\\': j += 1
                    if j < n and s[j] == '\n': break
                    j += 1
                text.append((i + 1, j)); i = j + 1; continue
            if c == '`': i = tpl(i + 1); continue
            if c == '/' and s[i + 1:i + 2] == '/': j = s.find('\n', i); j = n if j < 0 else j; comments.append((i, j)); i = j; continue
            if c == '/' and s[i + 1:i + 2] == '*': j = s.find('*/', i + 2); j = n if j < 0 else j + 2; comments.append((i, j)); i = j; continue
            if c == '/':   # regex literal heuristic, as in lex
                k = i - 1
                while k >= 0 and s[k] in ' \t': k -= 1
                if k < 0 or s[k] in '(,=:[!&|?{};\n' or s[max(0, k - 5):k + 1].endswith('return'):
                    j = i + 1; cls = False
                    while j < n and s[j] != '\n':
                        if s[j] == '\\': j += 2; continue
                        if s[j] == '[': cls = True
                        elif s[j] == ']': cls = False
                        elif s[j] == '/' and not cls: break
                        j += 1
                    i = j + 1; continue
            if c in '({[': depth += 1
            elif c in ')}]':
                if depth == 0 and c == end: return i + 1
                depth -= 1
            i += 1
        return i
    code(0, None); return comments, text

CALL = re.compile(r"\bhgTr(?:Lazy|O)?\s*\(")

def gateway_spans(s):
    out = []
    for m in re.finditer(r"\bconst\s+(?:hgTr|hgTrLazy|hgTrO)\s*=", s):
        j = s.find('\n', m.start()); out.append((m.start(), len(s) if j < 0 else j))
    return out

def extract_file(root, path, check=True):
    with open(path, encoding='utf-8') as f: s = f.read()
    file = os.path.relpath(path, root).replace(os.sep, '/')
    occs, dspans = extract_dicts(file, s); gate = gateway_spans(s)
    comments, text = scan_regions(s); skip = dspans + gate
    inside = lambda spans, a: any(x <= a < y for x, y in spans)
    for a, e in tr_spans(s):
        m = re.match(r"(hgTrLazy|hgTrO|hgTr)\s*\(", s[a:e])
        if not m: continue          # L(...) is a local helper name, not an i18n API
        if inside(skip, a) or inside(comments, a) or inside(text, a): continue
        fn = m.group(1); spans = split_top(s, a + m.end(), e - 1)
        if fn == 'hgTrO':
            if len(spans) == 2 and s[spans[1][0]] == '{':
                for k, (va, vb) in obj_entries(s, spans[1][0] + 1, spans[1][1] - 1):
                    if s[va] == '[': pl, en, params, man = classify(s, split_top(s, va + 1, vb - 1), va, vb)
                    else: pl, en, params, man = re.sub(r"\s+", " ", s[va:vb]), '', [], 'expr'
                    occs.append({'file': file, 'line': line_of(s, va), 'start': va, 'end': vb, 'kind': 'hgTrO', 'pl': pl, 'en': en, 'params': params, 'manual': man, 'name': None, 'dkey': k})
            else:
                occs.append({'file': file, 'line': line_of(s, a), 'start': a, 'end': e, 'kind': 'hgTrO', 'pl': re.sub(r"\s+", " ", s[a:e]), 'en': '', 'params': [], 'manual': 'expr', 'name': None, 'dkey': None})
            continue
        pl, en, params, man = classify(s, spans, a, e)
        occs.append({'file': file, 'line': line_of(s, a), 'start': a, 'end': e, 'kind': fn, 'pl': pl, 'en': en, 'params': params, 'manual': man, 'name': None, 'dkey': None})
    if check: completeness(file, s, occs, dspans, gate, comments, text)
    return occs

ACCOUNTED = {}   # explicit allowlist: {(file, line): reason} of hgTr( sites that are legitimately not occurrences (none needed today)

def completeness(file, s, occs, dspans, gate, comments, text):
    """every hgTr( / hgTrLazy( / hgTrO( in the source must be an extracted Occ (or enclose one: an hgTrO call whose entries are
    occurrences), sit in a gateway definition / dictionary / comment / string text, or be allowlisted. Anything else: error."""
    lost = []
    for m in CALL.finditer(s):
        a = m.start()
        if any(o['start'] == a for o in occs) or any(a <= o['start'] and o['end'] <= tr_end(s, a) for o in occs if o['kind'] == 'hgTrO' and m.group().startswith('hgTrO')): continue
        if any(x <= a < y for x, y in dspans + gate + comments + text) or (file, line_of(s, a)) in ACCOUNTED: continue
        lost.append(f'{file}:{line_of(s, a)}')
    if lost: raise RuntimeError('i18n_migrate: hgTr call(s) neither extracted nor accounted for: ' + ', '.join(lost))

def tr_end(s, a): return group_end(s, s.index('(', a) + 1)

def extract(root):
    base = os.path.join(root, 'parts')
    if not os.path.isdir(base): base = root
    files = []
    for d, _, fs in os.walk(base):
        files += [os.path.join(d, f) for f in fs if f.endswith('.js')]
    out = []
    for p in sorted(files, key=lambda p: os.path.relpath(p, root).replace(os.sep, '/')):
        out += sorted(extract_file(root, p), key=lambda o: (o['start'], o['end']))
    return out

# ---------------------------------------------------------------- keys
def namespace(file):
    p = file.replace(os.sep, '/')
    p = p[len('parts/'):] if p.startswith('parts/') else p
    parts = p.split('/'); base = re.sub(r"\.part\.js$|\.js$", "", parts[-1])
    if len(parts) == 1: base = re.sub(r"^hg-", "", base)
    elif parts[0] == 'cards': base = re.sub(r"-card$", "", base)
    return '.'.join([snake(x) for x in parts[:-1]] + [snake(base)])

PL_LETTERS = str.maketrans({'ł': 'l', 'Ł': 'L', 'ø': 'o', 'đ': 'd', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe'})
def slug(en):
    """first 4 words of the English text, [a-z0-9_], at most 40 chars"""
    t = unicodedata.normalize('NFKD', re.sub(r"\{[A-Za-z_$][\w$]*\}", " ", en).translate(PL_LETTERS))
    words = re.findall(r"[a-z0-9]+", ''.join(c for c in t if not unicodedata.combining(c)).lower())
    return '_'.join(words[:SLUG_WORDS])[:MAX_SLUG].strip('_')

def slug_flags(en):
    """why the slug of en may be clumsy"""
    why = []; full = '_'.join(re.findall(r"[a-z0-9]+", ''.join(c for c in unicodedata.normalize('NFKD', re.sub(r"\{[A-Za-z_$][\w$]*\}", " ", en).translate(PL_LETTERS)) if not unicodedata.combining(c)).lower())[:SLUG_WORDS])
    sl = slug(en)
    if len(full) > MAX_SLUG: why.append('truncated')
    if len(sl) < 3: why.append('short' if sl else 'empty')
    first = ' '.join(re.sub(r"\{[A-Za-z_$][\w$]*\}", " ", en).split()[:SLUG_WORDS])
    if any(c.isalpha() and ord(c.translate(PL_LETTERS)[0]) > 127 and not unicodedata.combining(c) and not unicodedata.normalize('NFKD', c)[0].isascii() for c in first): why.append('non-ascii')
    return why

def csv_text(o):
    return (o['file'], o['pl'], o['en'])

def propose(occs, existing=None):
    mods = {}
    for o in occs:
        if o['kind'] != 'dict' and not o['manual']: mods.setdefault((o['pl'], o['en']), set()).add(o['file'])
    kept_f, kept_t = {}, {}
    for r in existing or []:
        e = (r['key'], r.get('status')); kept_f.setdefault((r['file'], r['en'], r['pl']), []).append(e); kept_t.setdefault((r['en'], r['pl']), []).append(e)
    used = {}; prefixes = set()
    def reg(k):
        used[k] = 1; p = k.split('.')
        for i in range(1, len(p)): prefixes.add('.'.join(p[:i]))
    def free(k):
        p = k.split('.')
        return k not in used and k not in prefixes and not any('.'.join(p[:i]) in used for i in range(1, len(p)))
    for r in existing or []: reg(r['key'])
    ident = {}; rows = []; cnt = {}; seen = {}
    for o in occs:
        r = dict(o); why = []; key = None
        if o['kind'] == 'dict':
            ns = DICTS[o['name']]
            if o['name'] == 'HG_WX_SHORT': base_leaf = slug(o['dkey']) or 'text'
            else: base_leaf = snake(o['dkey'])
            if o['name'] in ('HG_I18N', 'HG_PL') and base_leaf != o['dkey']: why.append('rewritten')
            if not base_leaf: base_leaf = 'text'; why.append('empty')
            ns_key = ns + '.' + base_leaf; idn = (ns, o['dkey'])
        else:
            files = mods.get((o['pl'], o['en']), ())
            common = not o['manual'] and len(files) >= COMMON_MODULES
            ns = 'common' if common else namespace(o['file'])
            sl = slug(o['en']) or slug(o['pl']) or 'text'; why += slug_flags(o['en']) if slug(o['en']) else ['empty']
            if common: why.append('common')
            ns_key = ns + '.' + sl; idn = (ns, o['pl'], o['en'])
        kst = None
        for lst in (kept_f.get((o['file'], o['en'], o['pl'])), kept_t.get((o['en'], o['pl']))):
            if lst:
                i = cnt.get(id(lst), 0); key, kst = lst[min(i, len(lst) - 1)]; cnt[id(lst)] = i + 1; break
        if key is not None: why = ['kept']; ident.setdefault(idn, (key, why))
        elif idn in ident: key, why = ident[idn]
        else:
            key = ns_key; n = 2
            while not free(key): key = f'{ns_key}_{n}'; n += 1
            if n > 2: why.append('collision')
            reg(key); ident[idn] = (key, why)
        r['key'] = key; r['why'] = why
        if o['manual']: r['status'] = 'manual'
        elif why == ['kept']: r['status'] = kst if kst in ('auto', 'review') else 'review'   # a hand-edited status survives; manual -> no longer manual: look again
        else: r['status'] = 'review' if why else 'auto'
        rows.append(r)
    return rows

# ---------------------------------------------------------------- csv
def write_csv(rows, path):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, lineterminator='\n'); w.writerow(COLUMNS)
        for r in rows: w.writerow([r['key'], r['file'], r['line'], r['kind'], r['en'], r['pl'], ','.join(r['params']), r['manual'] or '', r['status']])

def read_csv(path):
    with open(path, encoding='utf-8', newline='') as f: rows = list(csv.DictReader(f))
    for r in rows: r['line'] = int(r['line']); r['params'] = [x for x in r['params'].split(',') if x]; r['manual'] = r['manual'] or None
    return rows

def summary(rows):
    from collections import Counter
    out = [f"{len(rows)} rows"]
    out.append('kind:   ' + ', '.join(f'{k}={v}' for k, v in sorted(Counter(r['kind'] for r in rows).items())))
    out.append('status: ' + ', '.join(f'{k}={v}' for k, v in sorted(Counter(r['status'] for r in rows).items())))
    out.append('manual: ' + ', '.join(f'{k}={v}' for k, v in sorted(Counter(r['manual'] for r in rows if r['manual']).items())))
    out.append('review reasons: ' + ', '.join(f'{k}={v}' for k, v in sorted(Counter(w for r in rows if r['status'] == 'review' for w in r['why']).items())))
    return '\n'.join(out)

def main(argv):
    if not argv or argv[0] != 'propose': print(__doc__); return 2
    a = argv[1:]; opt = lambda n, d: a[a.index(n) + 1] if n in a else d
    root = os.path.abspath(opt('--root', os.path.join(R, 'src'))); out = os.path.abspath(opt('--out', os.path.join(R, 'tools', 'i18n_migration_table.csv')))
    existing = read_csv(out) if os.path.exists(out) and '--fresh' not in a else None
    rows = propose(extract(root), existing); write_csv(rows, out)
    print(f"{os.path.relpath(out, R)}: " + summary(rows) + ('\n(kept keys from the existing table)' if existing else '')); return 0

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
