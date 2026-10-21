#!/usr/bin/env python3
"""i18n migration, part 1: extract every inline PL/EN pair from src/parts and propose catalog keys.
  extract(root) -> [Occ]      one per hgTr / hgTrLazy call, per hgTrO entry, per dictionary entry
  propose(occs, existing=None) -> [Row]   Occ + key + status; existing = rows of a previous CSV whose keys are kept
  verify(rows, root) -> [str]   equivalence proof: original source text vs catalog text, [] when every row is equal
  apply(rows, ns, root)         merge the namespace's rows into src/locales/{en,pl}.json and rewrite its calls (atomic)
  CLI: i18n_migrate.py propose [--root src] [--out tools/i18n_migration_table.csv] [--fresh]
       i18n_migrate.py verify  [--root src] [--table tools/i18n_migration_table.csv] [--ns <ns>]
       i18n_migrate.py apply --ns <ns> [--root src] [--table ...]

Occ = {file, line, start, end, kind, pl, en, params, manual, name, dkey}   (the CSV does NOT carry start/end: Task 6 calls extract() again for ranges)
A hgTr( nested in a template argument of another hgTr is its own Occ (code inside ${}); the outer one is manual `expr`.
extract() raises if a hgTr( / hgTrLazy( / hgTrO( in the source is neither an Occ, nor in a gateway definition / dictionary / comment / string text.
  kind    hgTr | hgTrLazy | hgTrO | dict ; start/end = character range of the call, of the `[pl, en]` entry (hgTrO) or of the
          dictionary value (dict: the PL value; en_start/en_end give the EN value when there is one)
  manual  None | concat | plural | object | array | expr | dict-dynamic | load-time   (see § 5.2 of the spec)
          load-time = an hgTr(pl, en) outside any function / method / arrow / getter / class body: it runs at module load, when the
          catalog is not loaded yet (hgT would answer in English where hgTr answers in Polish): resolved by hand. hgTrLazy / hgTrO are
          resolved at use time (toString / getter) and are never load-time.
  name    dictionary name (dict only) ; dkey = entry key (hgTrO entry key, dictionary key, HG_BG_SET id)
  For manual rows pl/en hold the raw source text of the arguments. For HG_PL, en is the raw HA state (= its key).
  For HG_WX_SHORT (dict-dynamic) pl is the dictionary key (the PL index text) and en its short value: not a language pair.
Key status: manual (any manual reason) | review (key may be clumsy: promoted to common.*, collision suffix _2.., slug cut at
40 chars, slug under 3 chars or empty, accented/non-ASCII letters in the first words, dictionary key that had to be rewritten) | auto.
"""
import os, re, sys, csv, json, subprocess, shutil, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from i18n_check import lex, tr_spans
from i18n_compile import PLURAL_SUFFIXES, flatten   # reused as-is (note: tr_spans also reports L(...); we drop those)

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLUMNS = ['key', 'file', 'line', 'kind', 'en', 'pl', 'params', 'manual', 'status']
DICTS = {'HG_I18N': 'nav', 'HG_WZ_T': 'wizard', 'HG_PL': 'states', 'HG_BG_SET': 'backgrounds', 'HG_WX_SHORT': 'weather'}
MAX_SLUG, SLUG_WORDS, COMMON_MODULES = 40, 4, 3
PLURAL_END = re.compile(r"_(%s)$" % '|'.join(PLURAL_SUFFIXES))   # the build reads a final _one/_other.. as a plural form of the key before it
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

NOT_FN = ('if', 'for', 'while', 'switch', 'catch', 'with')
def expr_end(s, i):
    """end of an arrow's expression body starting at i: first top-level , ; or closing bracket"""
    n = len(s)
    while i < n:
        c = s[i]
        if c in '\'"`': i = skip_str(s, i); continue
        if c == '/' and s[i + 1:i + 2] == '/': j = s.find('\n', i); i = n if j < 0 else j; continue
        if c == '/' and s[i + 1:i + 2] == '*': j = s.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if c in '([{': i = group_end(s, i + 1); continue
        if c in ',;)]}': return i
        i += 1
    return n

def function_ranges(s):
    """character ranges that run at call time, not at module load: bodies of function / method / getter / arrow (block or expression)
    and of classes (field initializers run at construction). Same lexical rules as scan_regions."""
    n = len(s); ranges = []; closes = {}
    def body_is_fn(i):
        p = i - 1
        while p >= 0 and s[p] in ' \t\r\n': p -= 1
        if p >= 1 and s[p - 1:p + 1] == '=>': return True
        if p >= 0 and s[p] == ')' and p in closes:
            before = s[:closes[p]].rstrip()
            m = re.search(r"([A-Za-z_$][\w$]*)$", before)
            fn = bool(re.search(r"\bfunction\s*\*$", before)) or (bool(m) and m.group(1) not in NOT_FN)
            if fn: ranges.append((closes[p], p + 1))   # default parameter values run at call time
            return fn
        return bool(re.search(r"\bclass\b[^{};]*$", s[max(0, i - 300):i]))
    def tpl(i):
        while i < n:
            c = s[i]
            if c == '\\': i += 2; continue
            if c == '`': return i + 1
            if c == '$' and s[i + 1:i + 2] == '{': i = code(i + 2, '}'); continue
            i += 1
        return n
    def code(i, end):
        stack = []
        while i < n:
            c = s[i]
            if c in '\'"':
                j = i + 1
                while j < n and s[j] != c:
                    if s[j] == '\\': j += 1
                    if j < n and s[j] == '\n': break
                    j += 1
                i = j + 1; continue
            if c == '`': i = tpl(i + 1); continue
            if c == '/' and s[i + 1:i + 2] == '/': j = s.find('\n', i); i = n if j < 0 else j; continue
            if c == '/' and s[i + 1:i + 2] == '*': j = s.find('*/', i + 2); i = n if j < 0 else j + 2; continue
            if c == '/':
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
            if c == '=' and s[i + 1:i + 2] == '>':
                k = i - 1
                while k >= 0 and s[k] in ' \t\r\n': k -= 1
                if k >= 0 and s[k] == ')' and k in closes: ranges.append((closes[k], k + 1))   # default parameter values run at call time
                j = i + 2
                while j < n and s[j] in ' \t\r\n': j += 1
                if j < n and s[j] != '{': ranges.append((j, expr_end(s, j)))
                i += 2; continue
            if c in '([{': stack.append((c, i, c == '{' and body_is_fn(i)))
            elif c in ')]}':
                if not stack:
                    if c == end: return i + 1
                else:
                    o, pos, fn = stack.pop()
                    if c == ')': closes[i] = pos
                    if fn: ranges.append((pos, i + 1))
            i += 1
        return n
    code(0, None); return ranges

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
    fns = function_ranges(s)
    for o in occs:
        if o['kind'] == 'hgTr' and not o['manual'] and not any(a <= o['start'] < b for a, b in fns): o['manual'] = 'load-time'
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
    existing = [r for r in existing or [] if not PLURAL_END.search(r['key'])]   # a key that the build would read as a plural form is proposed again
    for r in existing:
        e = (r['key'], r.get('status')); kept_f.setdefault((r['file'], r['en'], r['pl']), []).append(e); kept_t.setdefault((r['en'], r['pl']), []).append(e)
    used = {}; prefixes = set()
    def reg(k):
        used[k] = 1; p = k.split('.')
        for i in range(1, len(p)): prefixes.add('.'.join(p[:i]))
    def free(k):
        p = k.split('.')
        return k not in used and k not in prefixes and not any('.'.join(p[:i]) in used for i in range(1, len(p)))
    for r in existing: reg(r['key'])
    ident = {}; rows = []; cnt = {}; seen = {}
    for o in occs:
        r = dict(o); why = []; key = None
        if o['kind'] == 'dict':
            ns = DICTS[o['name']]
            if o['name'] == 'HG_WX_SHORT': base_leaf = slug(o['dkey']) or 'text'
            else: base_leaf = snake(o['dkey'])
            if o['name'] in ('HG_I18N', 'HG_PL') and base_leaf != o['dkey']: why.append('rewritten')
            if not base_leaf: base_leaf = 'text'; why.append('empty')
            if PLURAL_END.search(base_leaf): base_leaf += '_text'; why.append('plural-suffix')
            ns_key = ns + '.' + base_leaf; idn = (ns, o['dkey'])
        else:
            files = mods.get((o['pl'], o['en']), ())
            common = not o['manual'] and len(files) >= COMMON_MODULES
            ns = 'common' if common else namespace(o['file'])
            sl = slug(o['en']) or slug(o['pl']) or 'text'; why += slug_flags(o['en']) if slug(o['en']) else ['empty']
            if PLURAL_END.search(sl): sl += '_text'; why.append('plural-suffix')
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

# ---------------------------------------------------------------- verify / apply
class EquivalenceError(RuntimeError): pass

KEY_RE = re.compile(r"^[a-z0-9_]+(\.[a-z0-9_]+)+$")
PH = re.compile(r"\{([A-Za-z_$][\w$]*)\}")

def join_rows(occs, rows):
    """attach to every extracted Occ its CSV row (stable identity: same file + kind + original text, in order; then same file + kind + line,
    for rows whose en/pl the human edited). The result keeps the Occ fields (ranges, original pl/en/params as src_*) and takes
    key / en / pl / params / status from the CSV. Returns (joined, unmatched occs, unmatched rows): rows without an Occ are
    migrated ones (source already rewritten) or hand-edited ones; plan() decides which."""
    by_file = {}
    for r in rows: by_file.setdefault(r['file'], []).append(r)
    used = set(); out = []; lost = []; pending = []
    for o in occs:
        c = next((r for r in by_file.get(o['file'], []) if id(r) not in used and r['kind'] == o['kind'] and r['en'] == o['en'] and r['pl'] == o['pl']), None)
        if c: used.add(id(c)); out.append((o, c))
        else: pending.append(o)
    for o in pending:
        c = next((r for r in by_file.get(o['file'], []) if id(r) not in used and r['kind'] == o['kind'] and int(r['line']) == o['line']), None)
        if c: used.add(id(c)); out.append((o, c))
        else: lost.append(o)
    joined = []
    for o, c in sorted(out, key=lambda x: (x[0]['file'], x[0]['start'], x[0]['end'])):
        j = dict(o); j.update(key=c['key'], en=c['en'], pl=c['pl'], params=list(c['params']), status=c['status'])
        j.update(src_pl=o['pl'], src_en=o['en'], src_params=list(o['params'])); joined.append(j)
    return joined, lost, [r for r in rows if id(r) not in used]

def migrates(j): return j['status'] != 'manual'              # unresolved manual rows are skipped
def rewrites(j): return migrates(j) and not j['manual'] and j['kind'] != 'dict'   # hand-resolved manual rows and dictionaries: catalogs only

def tokens(text, names):
    """text with each {name} (name in names) replaced by a token numbered by the name's position in names"""
    return PH.sub(lambda m: f'\0{names.index(m.group(1))}\0' if m.group(1) in names else m.group(0), text)

def esc_at(s, k):
    n = 0
    while k - 1 - n >= 0 and s[k - 1 - n] == '\\': n += 1
    return n % 2 == 1

def concat_render(s, o):
    """the source of a `hgTr(..) + x + 'lit'` chain as {lang: text with {ident} for each bare identifier} and its identifiers in order,
    or None (with the reason) when the chain holds anything but string literals and bare identifiers"""
    ID = re.compile(r"[A-Za-z_$][\w$]*")
    left = []; pos = o['start']
    while True:
        q = pos
        while q > 0 and s[q - 1] in ' \t\r\n': q -= 1
        if q < 2 or s[q - 1] != '+' or s[q - 2] == '+': break
        q -= 1
        while q > 0 and s[q - 1] in ' \t\r\n': q -= 1
        ch = s[q - 1:q]
        if ch and ch in '\'"`':
            k = q - 2
            while k >= 0 and not (s[k] == ch and not esc_at(s, k)): k -= 1
            if k < 0: return None, 'unterminated literal'
            body = s[k + 1:q - 1]
            if ch == '`' and '${' in body: return None, 'template literal with ${}'
            left.append(('lit', unescape(body))); pos = k
        else:
            m = re.search(r"[A-Za-z_$][\w$]*$", s[:q])
            if not m or s[m.start() - 1:m.start()] in ('.', '$') : return None, 'operand is not a literal or a bare identifier'
            left.append(('id', m.group())); pos = m.start()
    start = pos
    right = []; pos = o['end']
    while True:
        q = pos
        while q < len(s) and s[q] in ' \t\r\n': q += 1
        if s[q:q + 1] != '+' or s[q + 1:q + 2] == '+': break
        q += 1
        while q < len(s) and s[q] in ' \t\r\n': q += 1
        if s[q:q + 1] and s[q] in '\'"`':
            e = skip_str(s, q); body = s[q + 1:e - 1]
            if s[q] == '`' and '${' in body: return None, 'template literal with ${}'
            right.append(('lit', unescape(body))); pos = e
        else:
            m = ID.match(s, q)
            if not m or re.match(r"\s*[.(\[`]", s[m.end():]): return None, 'operand is not a literal or a bare identifier'
            right.append(('id', m.group())); pos = m.end()
    p = start
    while p > 0 and s[p - 1] in ' \t\r\n': p -= 1
    if p and s[p - 1] not in '=(,:?{;[}&|!>' and not s[:p].endswith('return'): return None, 'concatenation is part of a larger expression'
    q = pos
    while q < len(s) and s[q] in ' \t\r\n': q += 1
    if q < len(s) and s[q] not in ';),]}:?': return None, 'concatenation is part of a larger expression'
    names = []
    for kind, v in list(reversed(left)) + [('call', None)] + right:
        for n in (o['src_params'] if kind == 'call' else [v] if kind == 'id' else []):
            if n not in names: names.append(n)
    out = {}
    for lang in ('en', 'pl'):
        out[lang] = ''.join(v if k == 'lit' else '{' + v + '}' for k, v in list(reversed(left))) + o['src_' + lang] + ''.join(v if k == 'lit' else '{' + v + '}' for k, v in right)
    return (out, names), None

def check_row(j, src):
    """-> (discrepancies, unverified reason or None) for one joined row; the equivalence test of spec 3.3. src(file) -> source text"""
    where = f"{j['file']}:{j['line']} [{j['key']}]"; bad = []; nv = None
    if not KEY_RE.match(j['key']): bad.append(f"{where}: invalid key {j['key']!r} (lowercase snake_case segments, dotted)")
    if PLURAL_END.search(j['key']): bad.append(f"{where}: key ends in a plural suffix, the build reads it as a plural form of {PLURAL_END.sub('', j['key'])!r}")
    if not migrates(j): return bad, nv
    cp = j['params']
    for lang in ('en', 'pl'):
        for m in PH.finditer(j[lang]):
            if m.group(1) not in cp: bad.append(f"{where}: {lang} text uses {{{m.group(1)}}} which is not a declared parameter {cp} (renders empty)")
    if set(PH.findall(j['en'])) != set(PH.findall(j['pl'])): bad.append(f"{where}: EN and PL use different placeholders: {sorted(set(PH.findall(j['en'])))} vs {sorted(set(PH.findall(j['pl'])))}")
    def compare(texts, sp):
        if len(sp) != len(cp): bad.append(f"{where}: {len(cp)} catalog parameter(s) {cp} for {len(sp)} in the source {sp}"); return
        for lang in ('en', 'pl'):
            if tokens(texts[lang], sp) != tokens(j[lang], cp): bad.append(f"{where}: {lang} differs\n    source:  {texts[lang]!r}\n    catalog: {j[lang]!r}")
    if rewrites(j) or (j['kind'] == 'dict' and not j['manual']):
        if j['kind'] == 'hgTrO' and cp: bad.append(f"{where}: hgTrO entries take no parameters"); return bad, nv
        compare({'en': j['src_en'], 'pl': j['src_pl']}, j['src_params'])
    elif j['manual'] == 'concat' and j['kind'] in ('hgTr', 'hgTrLazy'):
        r, why = concat_render(src(j['file']), j)
        if r: compare(r[0], r[1])
        else: nv = f"{where} (concat: {why})"
    else: nv = f"{where} ({j['manual']})"
    return bad, nv

def file_ns(j): return namespace(j['file'])

def read_catalog(root, code):
    p = os.path.join(root, 'locales', code + '.json')
    if not os.path.exists(p): return {}
    with open(p, encoding='utf-8') as f: return json.load(f)

def plan(rows, root, ns=None):
    """-> (joined rows in scope, discrepancies, not verified). Scope = rows whose FILE belongs to ns (all when ns is None)."""
    joined, lost, spare = join_rows(extract(root), rows); bad = []; nv = []; cache = {}
    def src(f):
        if f not in cache:
            with open(os.path.join(root, f), encoding='utf-8') as fh: cache[f] = fh.read()
        return cache[f]
    inscope = lambda f: ns is None or namespace(f) == ns
    scope = [j for j in joined if inscope(j['file'])]
    for o in lost:
        if inscope(o['file']) and not o['manual']:
            bad.append(f"{o['file']}:{o['line']}: no row in the table for {o['kind']} {o['pl']!r} / {o['en']!r} (stale table: re-run propose)")
    for j in scope:
        b, n = check_row(j, src); bad += b
        if n: nv.append(n)
    flat = {c: flatten(read_catalog(root, c)) for c in ('en', 'pl')}
    for r in spare:      # a hand-resolved row that no longer matches any call: fine once its text is in the catalogs, a loss otherwise
        if inscope(r['file']) and r['status'] != 'manual' and r['manual']:
            if not all(flat[c].get(r['key']) == r[c] for c in ('en', 'pl')):
                bad.append(f"{r['file']}:{r['line']} [{r['key']}]: hand-resolved row ({r['manual']}) matches no call in the source and its text is not in the catalogs")
    return scope, bad, nv

def verify(rows, root=None, ns=None):
    return plan(rows, root or os.path.join(R, 'src'), ns)[1]

def unverified(rows, root=None, ns=None):
    """migrating rows whose original cannot be compared mechanically (plural / object / array / expr / unsupported concat): covered by the text snapshot"""
    return plan(rows, root or os.path.join(R, 'src'), ns)[2]

def call_text(j):
    key = j['key']
    if j['kind'] == 'hgTrO': return f"'{key}'"
    fn = 'hgTLazy' if j['kind'] == 'hgTrLazy' else 'hgT'
    if not j['src_params']: return f"{fn}('{key}')"
    args = ', '.join(s if s == c else f'{c}: {s}' for c, s in zip(j['params'], j['src_params']))
    return f"{fn}('{key}', {{ {args} }})"

def nested_set(tree, key, text, code):
    cur = tree; ks = key.split('.')
    for k in ks[:-1]:
        cur = cur.setdefault(k, {})
        if not isinstance(cur, dict): raise RuntimeError(f"catalog {code}: key {key} collides with the text at {k}")
    leaf = ks[-1]
    if isinstance(cur.get(leaf), dict): raise RuntimeError(f"catalog {code}: key {key} is a prefix of existing keys")
    if leaf in cur and cur[leaf] != text: raise RuntimeError(f"catalog {code}: key {key} already holds {cur[leaf]!r}, migration wants {text!r}")
    cur[leaf] = text

def dump_catalog(c):
    """_meta first (as is), every other level sorted by key"""
    def srt(n): return {k: srt(n[k]) for k in sorted(n)} if isinstance(n, dict) else n
    out = {'_meta': c['_meta']} if '_meta' in c else {}
    out.update(srt({k: v for k, v in c.items() if k != '_meta'}))
    return json.dumps(out, indent=2, ensure_ascii=False) + '\n'

def check_syntax(files):
    """files {path: source}; every one must parse as an ES module (esbuild transform; parts hold top-level code and import.meta)"""
    node = shutil.which('node') or '/opt/node22/bin/node'
    js = "const e=require(process.argv[1]+'/node_modules/esbuild');const f=JSON.parse(require('fs').readFileSync(0,'utf8'));let bad=[];" \
         "for(const [p,s] of Object.entries(f)){try{e.transformSync(s,{loader:'js',format:'esm',target:'es2020'})}catch(x){bad.push(p+': '+x.message.split('\\n')[0])}}" \
         "if(bad.length){console.error(bad.join('\\n'));process.exit(1)}"
    r = subprocess.run([node, '-e', js, R], input=json.dumps(files), capture_output=True, text=True)
    if r.returncode: raise RuntimeError('i18n_migrate: rewritten source does not parse:\n' + r.stderr.strip())

def apply(rows, ns, root=None):
    """Migrate namespace ns: a row belongs to ns by its FILE's namespace (so a module's common.* rows migrate with the module).
    Atomic: verify, merge and rewrite are computed in memory, syntax-checked, and only then written."""
    root = root or os.path.join(R, 'src')
    scope, bad, _ = plan(rows, root, ns)
    if bad: raise EquivalenceError(f'i18n_migrate: {len(bad)} discrepancy(ies) in namespace {ns!r}, nothing written:\n' + '\n'.join(bad))
    cats = {}
    for code in ('en', 'pl'):
        with open(os.path.join(root, 'locales', code + '.json'), encoding='utf-8') as f: cats[code] = json.load(f)
    for j in scope:
        if migrates(j):
            for code in ('en', 'pl'): nested_set(cats[code], j['key'], j[code], code)
    for code in ('en', 'pl'):
        fl = flatten(cats[code])
        for j in scope:
            if migrates(j) and not isinstance(fl.get(j['key']), str): raise RuntimeError(f"catalog {code}: key {j['key']} is not a plain text entry once flattened (plural suffix or collision)")
    srcs = {}
    for j in scope:
        if rewrites(j): srcs.setdefault(j['file'], []).append(j)
    new_src = {}
    for file, js in srcs.items():
        with open(os.path.join(root, file), encoding='utf-8') as f: s = f.read()
        for j in sorted(js, key=lambda j: j['start'], reverse=True):
            s = s[:j['start']] + call_text(j) + s[j['end']:]
        new_src[file] = s
    # hgTrO( ... ) calls whose entries were all rewritten become hgTO( ... )
    for file, s in list(new_src.items()):
        new_src[file] = rename_hgTrO(s)
    if new_src: check_syntax(new_src)
    for file, s in new_src.items():
        with open(os.path.join(root, file), 'w', encoding='utf-8', newline='') as f: f.write(s)
    for code in ('en', 'pl'):
        with open(os.path.join(root, 'locales', code + '.json'), 'w', encoding='utf-8', newline='') as f: f.write(dump_catalog(cats[code]))

def rename_hgTrO(s):
    """hgTrO(o, { a: 'ns.key', ... }) -> hgTO(...) once no [pl, en] entry is left in the call; the gateway definition is left alone"""
    out = []; last = 0
    for m in re.finditer(r"\bhgTrO\s*\(", s):
        a = m.start()
        if re.search(r"\bconst\s+$", s[max(0, a - 12):a]): continue
        sp = split_top(s, m.end(), group_end(s, m.end()) - 1)
        if len(sp) == 2 and s[sp[1][0]] == '{':
            kinds = {s[va] == '[' for _, (va, _vb) in obj_entries(s, sp[1][0] + 1, sp[1][1] - 1)}
            if kinds == {True, False}: raise RuntimeError(f"i18n_migrate: hgTrO call at offset {a} has both migrated and unmigrated entries: migrate or hand-edit all of them")
            if kinds == {False}: out.append(s[last:a]); out.append('hgTO('); last = m.end()
    out.append(s[last:]); return ''.join(out)

def main(argv):
    if not argv or argv[0] not in ('propose', 'verify', 'apply'): print(__doc__); return 2
    cmd = argv[0]; a = argv[1:]; opt = lambda n, d: a[a.index(n) + 1] if n in a else d
    root = os.path.abspath(opt('--root', os.path.join(R, 'src')))
    if cmd in ('verify', 'apply'):
        table = os.path.abspath(opt('--table', opt('--out', os.path.join(R, 'tools', 'i18n_migration_table.csv')))); rows = read_csv(table); ns = opt('--ns', None)
        if cmd == 'apply':
            if not ns: print('apply needs --ns <ns>'); return 2
            apply(rows, ns, root=root); print(f'applied namespace {ns}'); return 0
        scope, bad, nv = plan(rows, root, ns)
        print('\n'.join(bad)); print(f'NOT VERIFIED: {len(nv)} rows (no mechanical comparison; cover them with the text snapshot)'); print('\n'.join('  ' + x for x in nv))
        print(f'{len(scope)} rows joined, {len(bad)} discrepancy(ies), {len(nv)} not verified'); return 1 if bad else 0
    out = os.path.abspath(opt('--out', os.path.join(R, 'tools', 'i18n_migration_table.csv')))
    existing = read_csv(out) if os.path.exists(out) and '--fresh' not in a else None
    rows = propose(extract(root), existing); write_csv(rows, out)
    print(f"{os.path.relpath(out, R)}: " + summary(rows) + ('\n(kept keys from the existing table)' if existing else '')); return 0

if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
