/* ===== i18n: katalogi skompilowane przy budowaniu (tools/build.py wstawia manifest i angielski), hgT synchroniczne ===== */
const HG_I18N_MANIFEST = /*__HG_I18N_MANIFEST__*/[];
const HG_I18N_EN = /*__HG_I18N_EN__*/null;
const HGI18n = {
  code: 'en', cache: {}, pend: {}, bad: {}, pr: {},
  ent(c) { return HG_I18N_MANIFEST.find((x) => x.code === c); },
  has(c) { return !!this.ent(c); },
  locale(c) { const e = this.ent(c || this.code); return (e && e.locale) || 'en'; },
  list() { return HG_I18N_MANIFEST.map((x) => [x.code, x.name]); },
  /* katalog z sieci albo z przedładowania przez loader (tylko gdy ten sam kod i plik co w manifeście); błąd zapamiętany do końca sesji */
  load(c) {
    if (c === 'en' || this.cache[c]) return Promise.resolve(true);
    const e = this.ent(c); if (!e || !e.file || this.bad[c]) return Promise.resolve(false);
    if (this.pend[c]) return this.pend[c];
    const pre = window.__hgI18nPre, use = pre && pre.code === c && pre.file === e.file && pre.p;
    return this.pend[c] = Promise.resolve(use || fetch(HG_ASSET + e.file)).then((r) => (r && typeof r.json === 'function' ? (r.ok === false ? Promise.reject(new Error('HTTP ' + r.status)) : r.json()) : r)).then((j) => {
      if (!j || !Array.isArray(j.t)) throw new Error('bad catalog'); this.cache[c] = j; delete this.pend[c]; return true;
    }).catch((x) => { delete this.pend[c]; this.bad[c] = 1; try { console.warn('[nuvio] i18n: cannot load "' + c + '" catalog, using English', x); } catch (e2) { /* brak */ } return false; });
  },
  /* czeka na katalog (maks. ms); po terminie renderuje po angielsku, a gdy katalog dotrze: kod + zdarzenie hg-lang */
  ready(c, ms = 3000) {
    if (!this.has(c)) return Promise.resolve();
    let late = false, t;
    const p = this.load(c).then((ok) => { if (ok) { this.code = c; if (late) window.dispatchEvent(new CustomEvent('hg-lang')); } });
    return Promise.race([p, new Promise((r) => { t = setTimeout(() => { late = true; r(); }, ms); })]).then(() => clearTimeout(t));
  },
};
const hgI18nVars = (s) => (s.match(/\{\w+\}/g) || []);
const hgI18nPick = (v, p, loc) => {
  if (typeof v === 'string') return v;
  if (!v || typeof v !== 'object') return null;
  let cat = 'other';
  if (p && p.count != null) { try { cat = (HGI18n.pr[loc] || (HGI18n.pr[loc] = new Intl.PluralRules(loc))).select(+p.count); } catch (e) { cat = 'other'; } }
  const s = v[cat]; return typeof s === 'string' ? [s, cat] : null;
};
/* wpis tłumaczenia odrzucany (-> angielski): brak, brak formy liczby albo brak zmiennej ze źródła (formy one/zero/two mogą pominąć liczbę) */
const hgI18nRes = (key, p) => {
  const en = HG_I18N_EN; if (!en) return typeof key === 'number' ? '#' + key : String(key);
  const ev = typeof key === 'number' ? en.t[key] : null; if (ev == null) return typeof key === 'number' ? '#' + key : String(key);
  const sub = (s) => s.replace(/\{(\w+)\}/g, (m, k) => (p && p[k] != null ? p[k] : ''));
  const one = (v, loc) => { const r = hgI18nPick(v, p, loc); return r == null ? null : typeof r === 'string' ? [r, 'other'] : r; };
  const cur = HGI18n.cache[HGI18n.code], tv = cur && HGI18n.code !== 'en' ? cur.t[key] : null;
  const e = one(ev, en.m.locale), t = tv == null ? null : one(tv, HGI18n.locale());
  if (t && (!e || /^(one|zero|two)$/.test(t[1]) || hgI18nVars(e[0]).every((x) => t[0].includes(x)))) return sub(t[0]);
  return e ? sub(e[0]) : '#' + key;
};
const hgT = (key, params) => hgI18nRes(key, params);
const hgTLazy = (key, params) => ({ toString: () => hgT(key, params), valueOf: () => hgT(key, params), toJSON: () => hgT(key, params) });
/* prefiksy dynamiczne (states., weather.): tabela d, wartość zapasowa gdy brak */
const hgTD = (k, fb) => {
  const cur = HGI18n.cache[HGI18n.code], en = HG_I18N_EN;
  for (const [c, loc] of [[HGI18n.code !== 'en' && cur, HGI18n.locale()], [en, 'en']]) {
    const r = c && c.d && c.d[k] != null ? hgI18nPick(c.d[k], null, loc) : null; if (r != null) return typeof r === 'string' ? r : r[0];
  } return fb;
};
/* obiekt z getterami hgT (zamiast hgTrO): map { właściwość: klucz } */
const hgTO = (o, map) => { for (const [k, key] of Object.entries(map)) Object.defineProperty(o, k, { get: () => hgT(key), enumerable: true, configurable: true }); return o; };
/* wybór języka: zapisany (jeśli istnieje w manifeście), potem języki przeglądarki: pełny kod (pt-br), sama język (pt), na końcu en */
const hgLangDetect = (pref, nav) => {
  const n = (s) => String(s || '').toLowerCase().replace(/_/g, '-');
  if (pref && HGI18n.has(n(pref))) return n(pref);
  for (const l of nav || []) for (const c of [n(l), n(l).split('-')[0]]) if (c && HGI18n.has(c)) return c;
  return 'en';
};
