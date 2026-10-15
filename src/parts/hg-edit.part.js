/* ===== Tryb edycji układu (admin): kolejność (przeciąganie + FLIP), ukrywanie/przywracanie, rozmiar S/M/L, dodawanie kafli z encji HA.
   Układ: nadpisania na bazie CFG z build.py, per zakres (widok / „rooms” / „room:<id>” / „<widok>:tiles”).
   Zapis: dane użytkownika HA (websocket frontend/set_user_data, klucz home_glass_layout – synchronizacja między urządzeniami),
   kopia w localStorage (home-glass:layout) jako zapas / natychmiastowy odczyt. */
const HGL = window.__hgL || (window.__hgL = {
  KEY: 'home_glass_layout', LS: 'home-glass:layout',
  /* kopia lokalna per użytkownik HA (wspólny tablet): klucz home-glass:layout:<user_id>; „:last” = ostatni użytkownik do natychmiastowego odczytu przed load() */
  _lsKey(uid) { return this.LS + ':' + (uid || 'anon'); },
  _lsRead(uid) { try { const v = JSON.parse(localStorage.getItem(this._lsKey(uid)) || 'null'); return v && v.s ? v : null; } catch (e) { return null; } },
  data: (() => { try { const u = localStorage.getItem('home-glass:layout:last'); const v = u && JSON.parse(localStorage.getItem('home-glass:layout:' + u) || 'null'); return v && v.s ? v : { v: 1, ts: 0, s: {} }; } catch (e) { return { v: 1, ts: 0, s: {} }; } })(),
  subs: new Set(), loaded: false, failed: false, editing: false, _p: null, _uid: null, _base: null, mode: 'own', _sub: null, _mine: 0,
  get(sc) { const x = this.data.s[sc] || {}; return { order: x.order || [], hidden: x.hidden || [], size: x.size || {}, added: x.added || [], names: x.names || {}, conf: x.conf || {} }; },
  set(sc, v) { const o = { order: v.order || [], hidden: v.hidden || [], size: v.size || {}, added: v.added || [], names: v.names || {}, conf: v.conf || {} };
    for (const k of Object.keys(o.conf)) if (!o.conf[k] || !Object.keys(o.conf[k]).length) delete o.conf[k];
    if (!o.order.length && !o.hidden.length && !Object.keys(o.size).length && !o.added.length && !Object.keys(o.names).length && !Object.keys(o.conf).length) delete this.data.s[sc]; else this.data.s[sc] = o; },
  SECS: ['app', 'wiz', 'pw', 'wall', 'assist'],
  /* zrzut stanu serwera (po load/save) – przy zapisie wysyłamy tylko to, co zmieniło się względem niego */
  _snap(v) { const x = v || { s: {} }, o = { s: Object.fromEntries(Object.entries(x.s || {}).map(([k, y]) => [k, JSON.stringify(y)])) }; for (const k of this.SECS) o[k] = JSON.stringify(x[k] || null); return o; },
  /* wspólny dashboard: edycja tylko dla admina; własny układ: każdy edytuje swój */
  canEdit(h) { const u = h && h.user; return !!(u && (u.is_admin || (this.loaded && this.mode === 'own'))); },
  load(h) {
    if (this._p) return this._p;
    const c = h && h.connection, uid = h && h.user && h.user.id;
    if (uid && uid !== this._uid) {
      this._uid = uid; try { localStorage.setItem('home-glass:layout:last', uid); } catch (e) {}
      if (this.data.uid !== uid) this.data = this._lsRead(uid) || { v: 1, ts: 0, s: {} };   /* cudzy układ z poprzedniej sesji -> odrzuć */
    }
    this._p = !c ? Promise.resolve() : HGShared.eff(h).then(async (E) => {
      /* pierwsze uruchomienie po aktualizacji: układ admina staje się wspólnym dla wszystkich */
      if (!E.doc && h.user && h.user.is_admin && !window.__hgDryRun) try { if (await HGShared.create(h, E.user)) E = await HGShared.eff(h); } catch (e) { /* zostaje własny */ }
      /* widoki ukryte dla tej osoby zmienione przez admina: nawigację buduje strategia, więc przeładowanie strony */
      const off = hgViewOff(h, E.doc && E.doc.data && E.doc.data.wiz), vk = JSON.stringify([...new Set([...Object.keys((E.doc && E.doc.data && E.doc.data.wiz && E.doc.data.wiz.vu) || {})])].filter(off));
      if (this._vk != null && vk !== this._vk && !this.editing && !window.__hgDryRun) { this._vk = vk; location.reload(); return; } this._vk = vk;
      const v = E.data; this.loaded = true; this.mode = E.mode; this._base = this._snap(E.seeded ? null : v);
      /* serwer jest źródłem prawdy (zegary urządzeń się różnią); w trakcie edycji nie podmieniamy danych – scalenie nastąpi przy zapisie */
      if (!this.editing) { if (v) this.data = this.cl(v); else if (E.mode === 'shared') this.data = { v: 1, ts: 0, s: {} }; this._ls(); this.notify(); }
      HGApp.apply(); this._watch(h);
    }, () => { this.loaded = true; this.failed = true; });
    return this._p;
  },
  cl(x) { return JSON.parse(JSON.stringify(x)); },
  /* zmiana wspólnego układu lub listy osób z własnym układem (inny admin, inne urządzenie): odśwież na żywo */
  _watch(h) { if (this._sub || !h.connection || !h.connection.subscribeEvents) return; this._sub = 1;
    h.connection.subscribeEvents((ev) => { if (!ev || !ev.data || ev.data.url_path !== HGShared.URL || Date.now() - this._mine < 3000) return;
      clearTimeout(this._wt); this._wt = setTimeout(() => this.reload(window.__hgHass || h), 300); }, 'lovelace_updated').then((u) => { this._sub = u; }, () => { this._sub = null; }); },
  reload(h) { if (this.editing || !h) return; this._p = null; return this.load(h); },
  _ls() { try { if (this._uid) this.data.uid = this._uid; localStorage.setItem(this._lsKey(this._uid || this.data.uid), JSON.stringify(this.data)); } catch (e) {} },
  /* nałożenie lokalnych zmian na świeżą wersję z serwera: tylko zakresy / klucze zmienione względem _base (inne urządzenie mogło zapisać w międzyczasie) */
  _merge(srv, secs, withS) {
    const base = this._base || this._snap(null), out = srv ? this.cl(srv) : { v: 1, s: {} };
    out.s = out.s || {};
    if (withS) for (const k of new Set([...Object.keys(this.data.s), ...Object.keys(base.s)])) {
      const mine = this.data.s[k] ? JSON.stringify(this.data.s[k]) : undefined;
      if (mine === base.s[k]) continue;                       /* zakres niezmieniony lokalnie -> zostaje wersja z serwera */
      if (mine === undefined) delete out.s[k]; else out.s[k] = this.data.s[k];
    }
    /* sekcje app / wiz / pw / wall / assist: scalanie per klucz – druga karta przeglądarki z innym ustawieniem nie nadpisuje pozostałych kluczy (np. szerokości panelu innego widoku) */
    for (const k of secs) { const mine = this.data[k] || null; if (JSON.stringify(mine) === base[k]) continue;
      let b0 = null; try { b0 = JSON.parse(base[k] || 'null'); } catch (e) { b0 = null; }
      if (!mine) { delete out[k]; continue; }
      if (!b0 || typeof b0 !== 'object' || typeof mine !== 'object' || Array.isArray(mine)) { out[k] = mine; continue; }
      const res = Object.assign({}, out[k] && typeof out[k] === 'object' ? out[k] : {});
      for (const sk of new Set([...Object.keys(mine), ...Object.keys(b0)])) { if (JSON.stringify(mine[sk]) === JSON.stringify(b0[sk])) continue; if (sk in mine) res[sk] = mine[sk]; else delete res[sk]; }
      out[k] = res; }
    out.ts = this.data.ts; delete out.uid; return out;
  },
  _changed(secs, withS) { const b = this._base || this._snap(null), n = this._snap(this.data); return secs.some((k) => n[k] !== b[k]) || (withS && JSON.stringify(n.s) !== JSON.stringify(b.s)); },
  _putUser(h, v) { return h.connection.sendMessagePromise({ type: 'frontend/set_user_data', key: this.KEY, value: v }); },
  /* zapis: własny układ -> dane użytkownika HA; wspólny -> pulpit nuvio-shared (tylko admin), sekcje osobiste (PERS) zawsze do danych użytkownika */
  async save(h) {
    this.data.ts = Date.now();
    if (window.__hgDryRun || !h || !h.connection) { this._ls(); return 'local'; }
    try {
      if (this.mode !== 'shared') {
        const out = this._merge(await HGShared.user(h), this.SECS, true);
        await this._putUser(h, out); this.data = out;
      } else {
        const P = HGShared.PERS, SH = this.SECS.filter((k) => !P.includes(k)), res = {};
        if (this._changed(P, false)) { const u = this._merge(await HGShared.user(h), P, false); await this._putUser(h, u); for (const k of P) res[k] = u[k]; }
        else for (const k of P) res[k] = this.data[k];
        if (this._changed(SH, true)) {
          if (!(h.user && h.user.is_admin)) { this._ls(); return 'local'; }   /* wspólny układ zmienia tylko admin */
          const doc = await HGShared.doc(h); if (!doc) throw new Error('no shared');
          const d = this._merge(doc.data, SH, true); for (const k of P) delete d[k];
          this._mine = Date.now(); await HGShared.put(h, Object.assign({}, doc, { data: d })); Object.assign(res, d);
        } else Object.assign(res, this.cl(Object.assign({}, this.data, { assist: undefined })));
        for (const k of P) if (res[k] === undefined) delete res[k];
        res.s = res.s || {}; res.ts = this.data.ts; delete res.uid; this.data = res;
      }
      this._base = this._snap(this.data); this._ls(); this.failed = false; this.notify();
      return 'ha';
    } catch (e) { this._ls(); return 'local'; }
  },
  notify() { HGApp.apply(); for (const f of [...this.subs]) try { f(); } catch (e) {} },
  /* kolejność listy elementów wg zapisanych kluczy (nieznane na końcu, w kolejności bazowej) */
  sort(items, key, order) { if (!order.length) return items; const ix = new Map(order.map((k, i) => [k, i]));
    return items.map((x, i) => [x, i]).sort((a, b) => ((ix.has(key(a[0])) ? ix.get(key(a[0])) : 1e3 + a[1]) - (ix.has(key(b[0])) ? ix.get(key(b[0])) : 1e3 + b[1]))).map((x) => x[0]); },
  szc(sz) { return sz === 'm' ? 'hgsz-m' : sz === 'l' ? 'hgsz-l' : ''; },
});
/* ===== Wygląd: akcent (tinty i tekst na akcencie liczone wg WCAG) + tło (zdjęcie / URL / przesłane / kolor / gradient) + przyciemnienie ===== */
const HG_ACCENTS = [[('#' + '63D71E'), 'Limonka', 'Lime'], [('#' + '3DDC97'), 'Mięta', 'Mint'], [('#' + '2EC4D6'), 'Turkus', 'Teal'], [('#' + '4C9BFF'), 'Błękit', 'Sky blue'], [('#' + 'A78BFA'), 'Fiolet', 'Violet'], [('#' + 'FF6FAE'), 'Róż', 'Pink'], [('#' + 'FF9F43'), 'Pomarańcz', 'Orange'], [('#' + 'F5C542'), 'Złoto', 'Gold']];   /* [kolor, nazwa PL, nazwa EN] – nazwa wybierana przy użyciu */
const HG_BGS = [...(window.HG_BG_SET || [['', hgTrLazy('Domyślne', 'Default')]]), ...(window.HG_USER_BGS || [])];   /* [url, nazwa, url pionowy, miniatura]; pierwszy = domyślny (bg = null) */   /* własne zdjęcia: URL / przesłanie; gradienty w sekcji „Kolor lub gradient” */
/* tła: wbudowane + galeria użytkownika zapisana w układzie (app.gallery: [{u, n, p, t}]) */
const hgBgList = () => { let g = []; try { g = (HGApp.get() || {}).gallery || []; } catch (e) { g = []; } return [...HG_BGS, ...g.filter((x) => x && x.u).map((x) => [x.u, x.n || hgTr('Własne', 'Custom'), x.p || '', x.t || ''])]; };
const HGApp = window.__hgApp || (window.__hgApp = {
  toRgb(hx) { const m = /^#?([0-9a-f]{6})$/i.exec(hx || ''); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; },
  hex(c) { return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase(); },
  lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); },
  cr(a, b) { const x = this.lum(a), y = this.lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); },
  mix(c, d, t) { return c.map((v, i) => v + (d[i] - v) * t); },
  /* kolor tekstu w akcencie: najbliższy odcień z kontrastem >= 5 względem tła */
  tx(c, bg) { const tgt = this.lum(bg) > 0.5 ? [0, 0, 0] : [255, 255, 255]; for (let t = 0; t <= 1; t += 0.04) { const m = this.mix(c, tgt, t); if (this.cr(m, bg) >= 5) return this.hex(m); } return this.hex(tgt); },
  tokens(hx) { const c = this.toRgb(hx); if (!c) return null; const r = c.join(',');
    const on = this.cr(c, [11, 15, 10]) >= this.cr(c, [255, 255, 255]) ? ('#' + '0B0F0A') : ('#' + 'FFFFFF');
    const base = { '--hg-accent': this.hex(c), '--hg-on-accent': on, '--hg-accent-hi': this.hex(this.mix(c, [255, 255, 255], 0.25)), '--hg-accent-lo': this.hex(this.mix(c, [0, 0, 0], 0.35)),
      '--hg-accent-soft': 'rgb' + `a(${r},.22)`, '--hg-accent-faint': 'rgb' + `a(${r},.10)`, '--hg-accent-glow': 'rgb' + `a(${r},.30)` };
    return { light: Object.assign({}, base, { '--hg-accent-tx': this.tx(c, [236, 238, 241]) }), dark: Object.assign({}, base, { '--hg-accent-tx': this.tx(c, [40, 44, 50]) }) }; },
  /* dane wyglądu trafiają do CSS i atrybutów HTML: kolory tylko #RRGGBB, adres tła tylko /… lub https://… */
  get() { const a = HGL.data.app || {}, hx = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v), o = Object.assign({}, a);
    if (o.accent != null && !hx(o.accent)) delete o.accent; if (o.dim != null && !isFinite(Number(o.dim))) delete o.dim;
    /* migracja: tła zapisane przez wersje < 0.3.4 (stare podfoldery backgrounds i bg) -> płaskie nuvio-bg-x.webp obok paczki */
    const mig = (u) => (typeof u === 'string' && typeof HG_ASSET === 'string' ? u.replace(/^.*\/assets\/(?:backgrounds|bg)\/([a-z0-9-]+\.webp)(?:\?.*)?$/, (m, f) => HG_ASSET + 'nuvio-bg-' + f) : u);
    if (o.bg && typeof o.bg === 'object' && o.bg.kind === 'image') { const v = mig(o.bg.v), v2 = mig(o.bg.v2p); if (v !== o.bg.v || v2 !== o.bg.v2p) { o.bg = Object.assign({}, o.bg, { v, v2p: v2 }); if (HGL.data.app) HGL.data.app.bg = o.bg; } }
    const b = o.bg; if (b && typeof b === 'object') { const okC = b.kind === 'color' || b.kind === 'gradient' ? hx(b.v) && (b.v2 == null || hx(b.v2)) : typeof b.v === 'string' && /^(\/|https?:\/\/)/.test(b.v) && !/[\s"'()<>\\]/.test(b.v); if (!okC) delete o.bg; }
    return o; },
  set(v) { HGL.data.app = v; this.apply(); },
  css(o) { return Object.entries(o).map(([k, v]) => `${k}: ${v} !important;`).join(' '); },
  bgImg(b) { if (!b) return null;
    if (b.kind === 'color') return `linear-gradient(${b.v}, ${b.v})`;
    if (b.kind === 'gradient') return `linear-gradient(160deg, ${b.v}, ${b.v2 || ('#' + '000000')})`;
    if (b.kind === 'image' && b.v) return `url('${String(b.v).replace(/'/g, '%27')}')`;
    if (b.v && /^(\/|https:\/\/)/.test(b.v)) return `url('${String(b.v).replace(/'/g, '%27')}')`; return null; },
  apply() {
    const a = this.get(); let st = document.getElementById('hg-app-style');
    if (!st) { st = document.createElement('style'); st.id = 'hg-app-style'; document.head.appendChild(st); }
    const T = a.accent && a.accent.toUpperCase() !== ('#' + '63D71E') ? this.tokens(a.accent) : null;
    let B = a.bg || window.HG_DEFAULT_BG;
    if (!a.bg && B && B.kind === 'image') { /* domyślne zdjęcie: sprawdź raz, czy się wczytuje; błąd -> gradient zapasowy */
      if (B._st === 'bad') B = window.HG_DEFAULT_BG_FB;
      else if (!B._st) { B._st = 'wait'; const im = new Image(); im.onload = () => { B._st = 'ok'; };
        im.onerror = () => { const c = !B._cdn && typeof hgCdn === 'function' && hgCdn(B.v); if (c) { console.warn('Nuvio: local background failed, using CDN', B.v); B._cdn = 1; B.v2p = hgCdn(B.v2p) || B.v2p; B.v = c; B._st = ''; } else B._st = 'bad'; this.apply(); }; im.src = B.v; } }
    /* wybrane tło z pliku obok paczki: sprawdź raz, przy błędzie podstaw kopię z CDN (tylko w pamięci, bez zmiany zapisu) */
    if (a.bg && a.bg.kind === 'image' && typeof hgCdn === 'function' && hgCdn(a.bg.v)) { const M = (window.__hgBgAlt = window.__hgBgAlt || {}), v0 = a.bg.v;
      if (M[v0] === undefined) { M[v0] = null; const im = new Image(); im.onload = () => { M[v0] = ''; }; im.onerror = () => { console.warn('Nuvio: local background failed, using CDN', v0); M[v0] = hgCdn(v0); this.apply(); }; im.src = v0; }
      if (M[v0]) B = Object.assign({}, a.bg, { v: M[v0], v2p: hgCdn(a.bg.v2p) || M[v0] }); }
    const img = this.bgImg(B), img2 = B && B.v2p ? this.bgImg({ kind: 'image', v: B.v2p }) : img;
    const dim = a.dim != null ? Math.max(0, Math.min(1, a.dim)) : null;
    let css = '';
    const L = Object.assign({}, T ? T.light : {}, img ? { '--hg-bg-wide': img, '--hg-bg-portrait': img2 } : {});
    /* punkt ostrości tła (app.bg.pos = "x% y%") */
    if (a.bg && typeof a.bg.pos === 'string' && /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/.test(a.bg.pos)) L['--hg-bg-pos'] = a.bg.pos;
    const D = Object.assign({}, T ? T.dark : {}, img ? { '--hg-bg-wide': img, '--hg-bg-portrait': img2 } : {}, dim != null ? { '--hg-night': 'rgb' + `a(6,8,12,${(1 - (1 - dim * 0.65) * (1 - dim * 0.45)).toFixed(3)})` } : {});   /* przyciemnienie tylko nakładką: filter na pełnoekranowym zdjęciu dzielił tło na kafle GPU i dawał szwy pod szkłem */
    if (Object.keys(L).length) css += `:root:root, hg-page:not([x]){ ${this.css(L)} }\n`;
    if (Object.keys(D).length) css += `:root:root[data-hg-scheme=dark], :root[data-hg-scheme=dark] hg-page:not([x]){ ${this.css(D)} }\n`;
    if (st.textContent !== css) st.textContent = css;
  },
});
const HG_TILE_KIND = (e) => { const d = e.split('.')[0];
  if (['light', 'switch', 'fan', 'input_boolean', 'automation', 'lock', 'siren', 'humidifier', 'valve'].includes(d)) return 'tog';
  if (d === 'climate') return 'clim'; if (d === 'media_player') return 'media'; if (d === 'camera') return 'cam'; if (d === 'cover') return 'cover';
  if (['scene', 'script', 'button', 'input_button'].includes(d)) return 'run'; return 'val'; };
/* typy wyświetlania zgodne z domeną encji */
/* nazwy typów: gettery – język rozwiązywany przy użyciu */
const hgTrO = (o, m) => { for (const [k, [pl, en]] of Object.entries(m)) Object.defineProperty(o, k, { get: () => hgTr(pl, en), enumerable: true, configurable: true }); return o; };
const HG_TYPES = hgTrO({}, { tog: ['Przełącznik', 'Switch'], btn: ['Przycisk', 'Button'], compact: ['Kompaktowy', 'Compact'], minimal: ['Minimalny', 'Minimal'], val: ['Odczyt', 'Reading'], chart: ['Z wykresem', 'With chart'], clim: ['Klimat', 'Climate'], media: ['Multimedia', 'Media'], cam: ['Kamera', 'Camera'], cover: ['Roleta', 'Cover'], run: ['Akcja', 'Action'] });
const hgTypesFor = (h, e) => { const d = e.split('.')[0], s = h.states[e], k = HG_TILE_KIND(e), num = s && s.state !== '' && isFinite(Number(s.state));
  if (k === 'tog') return ['tog', 'btn', 'compact', 'minimal']; if (k === 'run') return ['run', 'btn', 'compact', 'minimal']; if (k === 'clim') return ['clim', 'val', 'chart', 'compact', 'minimal'];
  if (k === 'media') return ['media', 'compact', 'minimal']; if (k === 'cam') return ['cam', 'compact', 'minimal']; if (k === 'cover') return ['cover', 'compact', 'minimal'];
  return num || d === 'sensor' ? ['val', 'chart', 'compact', 'minimal'] : ['val', 'compact', 'minimal']; };
const hgTypeOpts = (h, e) => hgTypesFor(h, e).map((t, i) => [t, i ? HG_TYPES[t] : hgTr('Normalny', 'Default')]);
/* historia (24 h) do wykresów – pamięć 5 min, odświeżenie kart po pobraniu */
const HG_HIST = window.__hgHist || (window.__hgHist = { m: new Map(), get(h, e, cb) { const c = this.m.get(e); if (c && (c.p || Date.now() - c.t < 300000)) return c.d;
  const o = { t: Date.now(), d: c ? c.d : null, p: true }; this.m.set(e, o);
  hgHistory(h, e, 24).then((a) => { o.d = a.map((x) => [x.t, x.v]); o.p = false; o.t = Date.now(); cb && cb(); });   // wspólna pamięć ui/history
  return o.d; } });
const hgSpark = (pts) => { if (!pts || pts.length < 2) return '<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none"></svg>';
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0] || t0 + 1, v = pts.map((p) => p[1]), lo = Math.min(...v), hi = Math.max(...v), rg = hi - lo || 1;
  const P = pts.map((p) => `${((p[0] - t0) / (t1 - t0 || 1) * 100).toFixed(2)},${(28 - (p[1] - lo) / rg * 26).toFixed(2)}`).join(' ');
  return `<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,30 ${P} 100,30" fill="var(--hg-accent-soft)"/><polyline points="${P}" fill="none" stroke="var(--hg-accent)" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`; };
/* podgląd karty w „Ustawieniach karty”: zawartość wyższa niż ramka zostaje proporcjonalnie zmniejszona (bez wylewania na listę encji) */
function hgPvFit(box, el, w, h) { let n = 0;
  /* podgląd w rozmiarze, jaki karta ma (albo dostanie) na stronie: szerokość w, wysokość h albo naturalna; potem całość skalowana do ramki (bez rozciągania na pełną szerokość arkusza i bez pustego miejsca) */
  const fit = () => { if (!box.isConnected) return;
    const aw = box.clientWidth, mh = parseFloat(getComputedStyle(box).maxHeight) || 360; if (!aw) { if (++n < 8) setTimeout(fit, 120); return; }
    const W = Math.max(160, Math.round(w || Math.min(aw, 420)));
    el.style.transform = ''; el.style.width = W + 'px'; el.style.height = h ? h + 'px' : '';
    let H0 = h || el.scrollHeight || el.getBoundingClientRect().height; if (!h && H0 < 72) { H0 = 220; el.style.height = H0 + 'px'; }
    const sc = Math.min(1, aw / W, mh / H0), dx = Math.max(0, (aw - W * sc) / 2);
    el.style.transform = `translateX(${dx.toFixed(1)}px) scale(${sc.toFixed(3)})`; box.style.height = Math.ceil(H0 * sc) + 'px';
    if (++n < 6) setTimeout(fit, n * 350); };
  requestAnimationFrame(fit); }
const HG_KIND_LBL = hgTrO({}, { tog: ['Przełącznik', 'Switch'], clim: ['Klimat', 'Climate'], media: ['Multimedia', 'Media'], cam: ['Kamera', 'Camera'], cover: ['Roleta', 'Cover'], run: ['Akcja', 'Action'], val: ['Odczyt', 'Reading'] });
const HG_DOM_ICON2 = { light: 'mdi:lightbulb-outline', switch: 'mdi:toggle-switch-outline', fan: 'mdi:fan', input_boolean: 'mdi:toggle-switch-outline', automation: 'mdi:robot-outline',
  lock: 'mdi:lock-outline', climate: 'mdi:thermostat', media_player: 'mdi:speaker', camera: 'mdi:cctv', cover: 'mdi:window-shutter', sensor: 'mdi:gauge', binary_sensor: 'mdi:checkbox-blank-circle-outline',
  scene: 'mdi:palette-outline', script: 'mdi:script-text-outline', button: 'mdi:gesture-tap-button', weather: 'mdi:weather-partly-cloudy', person: 'mdi:account', water_heater: 'mdi:water-boiler' };
const hgTileHtml = (h, e, sz, o) => {
  o = o || {}; const s0 = h.states[e]; if (!s0) return '';
  const s = o.n || o.i ? Object.assign({}, s0, { attributes: Object.assign({}, s0.attributes, o.n ? { friendly_name: o.n } : {}, o.i ? { icon: o.i } : {}) }) : s0;
  const k0 = HG_TILE_KIND(e), k = o.t && hgTypesFor(h, e).includes(o.t) ? o.t : k0, d = e.split('.')[0], nm = s.attributes.friendly_name || H.name(h, e), ok = H.ok(s), on = ['on', 'open', 'unlocked', 'playing', 'heat', 'cool', 'auto', 'heat_cool', 'dry', 'fan_only'].includes(s.state);
  const ic = s.attributes.icon || HG_DOM_ICON2[d] || 'mdi:circle-outline', cls = `hgtl k-${k} ${HGL.szc(sz)} ${on ? 'on' : ''} ${ok ? '' : 'un'}`;
  const hd = `<span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? H.T(h, s) : hgTr('Niedostępne', 'Unavailable'))}</small></span>`;
  const actE = k0 === 'run' ? 'trun' : k0 === 'tog' ? 'ttog' : 'tmore';
  if (k === 'compact') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="${actE}" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b></span><small class="cs">${H.esc(ok ? H.T(h, s) + (s.attributes.unit_of_measurement && isFinite(Number(s.state)) ? ' ' + s.attributes.unit_of_measurement : '') : hgTr('Niedostępne', 'Unavailable'))}</small></button></div>`;
  if (k === 'minimal') { const n0 = Number(s.state), v0 = isFinite(n0) && s.state !== '' ? H.fmt(n0, Math.abs(n0) >= 100 ? 0 : 1) + (s.attributes.unit_of_measurement ? ' ' + s.attributes.unit_of_measurement : '') : ok ? H.T(h, s) : '–';
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb mm" data-act="${actE}" data-e="${H.esc(e)}" title="${H.esc(nm)}" aria-label="${H.esc(nm + ': ' + v0)}"><span class="ti">${H.icon(ic)}</span><small>${H.esc(v0)}</small></button></div>`; }
  if (k === 'btn') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb bb" data-act="${actE}" data-e="${H.esc(e)}" aria-pressed="${on}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? H.T(h, s) : hgTr('Niedostępne', 'Unavailable'))}</small></span></button></div>`;
  if (k === 'chart') { const pts = HG_HIST.get(h, e, () => { HGL.notify(); }), cur = k0 === 'clim' ? s.attributes.current_temperature : Number(s.state), u = k0 === 'clim' ? '°' : (s.attributes.unit_of_measurement || '');
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${hgTr('Ostatnie 24 h', 'Last 24 h')}</small></span></button><span class="tv">${H.esc(cur != null && isFinite(cur) ? H.fmt(cur, Math.abs(cur) >= 100 ? 0 : 1) : '–')}<em>${H.esc(u)}</em></span>${hgSpark(k0 === 'clim' ? null : pts)}</div>`; }
  if (k === 'val' && k0 === 'clim') { const ct = s.attributes.current_temperature; return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(H.T(h, s))}</small></span></button><span class="tv">${ct != null ? H.fmt(ct, 1) : '–'}<em>°</em></span></div>`; }
  if (k === 'clim') return `<div class="${cls}" data-hgk="${H.esc(e)}"><div class="acslot" data-ac="${H.esc(e)}"${o && o.n ? ` data-n="${H.esc(o.n)}"` : ''}></div></div>`;
  if (k === 'cam') return `<div class="${cls}" data-hgk="${H.esc(e)}"><div class="camslot" data-cam="${H.esc(e)}"></div></div>`;
  if (k === 'tog') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${hd}</button>${ok ? `<button class="tg ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${H.esc(nm)}" data-act="ttog" data-e="${H.esc(e)}"><i></i></button>` : ''}</div>`;
  if (k === 'run') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="trun" data-e="${H.esc(e)}">${hd}</button><button class="rb" data-act="trun" data-e="${H.esc(e)}" aria-label="${H.esc(hgTr('Uruchom: ', 'Run: ') + nm)}">${H.icon('mdi:play')}</button></div>`;
  if (k === 'cover') { const p = s.attributes.current_position;
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${hd}</button><div class="cv">${[['open_cover', 'mdi:chevron-up', hgTr('Otwórz', 'Open')], ['stop_cover', 'mdi:stop', hgTr('Zatrzymaj', 'Stop')], ['close_cover', 'mdi:chevron-down', hgTr('Zamknij', 'Close')]].map(([sv, i2, l]) => `<button data-act="tcov" data-s="${sv}" data-e="${H.esc(e)}" aria-label="${l}" ${ok ? '' : 'disabled'}>${H.icon(i2)}</button>`).join('')}${p != null ? `<em>${p}%</em>` : ''}</div></div>`; }
  if (k === 'media') { const a = s.attributes, t = a.media_title || '', ar = a.media_artist || a.app_name || '', pic = a.entity_picture;
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${pic ? `<img class="ma" alt="" src="${H.esc(pic)}">` : `<span class="ti">${H.icon(ic)}</span>`}<span class="tn"><b>${H.esc(t || nm)}</b><small>${H.esc(t ? (ar || nm) : (ok ? H.T(h, s) : hgTr('Niedostępne', 'Unavailable')))}</small></span></button>
      <div class="mc"><button data-act="tmp" data-e="${H.esc(e)}" aria-label="${hgTr('Odtwórz / pauza', 'Play / pause')}" ${ok && s.state !== 'off' ? '' : 'disabled'}>${H.icon(s.state === 'playing' ? 'mdi:pause' : 'mdi:play')}</button><button class="pw ${s.state !== 'off' && ok ? 'on' : ''}" data-act="tmw" data-e="${H.esc(e)}" aria-label="${hgTr('Zasilanie', 'Power')}" ${ok ? '' : 'disabled'}>${H.icon('mdi:power')}</button></div></div>`; }
  const u = s.attributes.unit_of_measurement || '', n = Number(s.state), num = s.state !== '' && isFinite(n);
  const v = num ? H.fmt(n, Math.abs(n) >= 100 ? 0 : 1) : H.T(h, s), nd = !ok || ['unknown', 'unavailable', ''].includes(String(s.state)) || v === '–' || v === '';
  return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b></span></button><span class="tv${num ? '' : ' tx'}${nd ? ' nd' : ''}">${H.esc(nd ? hgTr('Brak danych', 'No data') : v)}${num && u ? `<em>${H.esc(u)}</em>` : ''}</span></div>`;
};
/* wybór ikony: pole tekstowe mdi:xxx (wpisywanie dowolne) + szklany panel z wyszukiwaniem, siatką ikon MDI z listy HA, ostatnimi i obsługą klawiatury */
let hgIcList = null; const hgIcLoad = () => (hgIcList = hgIcList || fetch('/static/mdi/iconList.json').then((r) => (r.ok ? r.json() : [])).catch(() => []));
const hgIcRecent = () => { try { return JSON.parse(localStorage.getItem('nuvio:icons') || '[]').filter((x) => /^mdi:[a-z0-9-]+$/.test(x)).slice(0, 12); } catch (e) { return []; } };
const hgIcWire = (S) => { const inp = S && S.querySelector('.hge-sheet input[name=i]'); if (!inp || inp._icw) return; inp._icw = 1;
  const box = inp.closest('.hs-s'), fl = inp.closest('.hs-fl'); fl.classList.add('hs-ipw'); const pv = box.querySelector('ha-icon');
  const ob = document.createElement('button'); ob.type = 'button'; ob.className = 'hs-ipb'; ob.setAttribute('aria-haspopup', 'dialog'); ob.setAttribute('aria-expanded', 'false'); ob.setAttribute('aria-label', hgTr('Wybierz ikonę', 'Choose icon')); ob.innerHTML = H.icon('mdi:chevron-down'); box.appendChild(ob);
  if (pv) { pv.style.cursor = 'pointer'; pv.addEventListener('click', (e) => { e.preventDefault(); open(); }); }
  let pop = null, tok = null; const cur = () => inp.value.trim();
  const pick = (ic) => { inp.value = ic; inp.dispatchEvent(new Event('input', { bubbles: true })); if (pv && /^mdi:[a-z0-9-]+$/.test(ic)) pv.setAttribute('icon', ic);
    try { localStorage.setItem('nuvio:icons', JSON.stringify([ic, ...hgIcRecent().filter((x) => x !== ic)].slice(0, 12))); } catch (e) { /* tryb prywatny */ } close(); inp.focus(); };
  const btns = (L) => L.map((n) => `<button type="button" role="option" data-ic="${H.esc(n)}" aria-selected="${n === cur()}" title="${H.esc(n)}" aria-label="${H.esc(n.replace('mdi:', ''))}">${H.icon(n)}</button>`).join('');
  const close = () => { if (!pop) return; const p0 = pop; pop = null; p0.classList.add('out'); const rm = () => p0.remove(); p0.addEventListener('animationend', rm, { once: true }); setTimeout(rm, 180); if (tok) { hgsOpen.delete(tok); tok = null; } ob.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', out, true); };
  const out = (e) => { if (pop && !e.composedPath().includes(fl)) close(); };
  const fill = async (q) => { const g = pop && pop.querySelector('.hs-ipg.all'); if (!g) return; const L = await hgIcLoad(); if (!pop || !g.isConnected) return; q = q.toLowerCase().replace(/^mdi:/, '').trim();
    let n = 0; const R = []; for (const x of L) { if (!q || x.name.includes(q) || (x.keywords || []).some((k) => k.includes(q))) { n++; if (R.length < 160) R.push('mdi:' + x.name); } }
    const lb = pop.querySelector('.hs-ipl'); if (lb) lb.innerHTML = `${q ? hgTr('Wyniki', 'Results') : hgTr('Wszystkie ikony', 'All icons')}<em>${n > R.length ? R.length + ' / ' + n : n}</em>`;
    g.classList.remove('fresh'); g.removeAttribute('aria-busy'); g.innerHTML = R.length ? btns([...new Set(R)]) : `<div class="hs-ipe">${hgTr('Brak ikon. Możesz wpisać nazwę mdi:… w polu.', 'No icons. You can type an mdi:… name in the field.')}</div>`; g.scrollTop = 0; void g.offsetWidth; g.classList.add('fresh'); };
  const open = () => { if (pop) return close(); pop = document.createElement('div'); pop.className = 'hs-ipp'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', hgTr('Wybierz ikonę', 'Choose icon'));
    const rc = hgIcRecent();
    pop.innerHTML = `<label class="hs-s">${H.icon('mdi:magnify')}<input type="search" placeholder="${hgTr('Szukaj ikony (np. sofa, lampa)', 'Search icons (e.g. sofa, lamp)')}" aria-label="${hgTr('Szukaj ikony', 'Search icons')}" autocomplete="off"></label>${rc.length ? `<small>${hgTr('Ostatnie', 'Recent')}</small><div class="hs-ipg rc" role="listbox">${btns(rc)}</div>` : ''}<small class="hs-ipl">${hgTr('Wszystkie ikony', 'All icons')}</small><div class="hs-ipg all" role="listbox" aria-busy="true">${'<i class="hs-ipk"></i>'.repeat(24)}</div>`;
    fl.appendChild(pop); const r = pop.getBoundingClientRect(), sc = fl.closest('.hs-sc'), sr = sc && sc.getBoundingClientRect(); if (sr && r.bottom > sr.bottom && r.top - sr.top > r.height + 60) pop.classList.add('up'); else if (sc && r.bottom > sr.bottom) sc.scrollTop += r.bottom - sr.bottom + 8;
    tok = {}; hgsOpen.add(tok); ob.setAttribute('aria-expanded', 'true'); document.addEventListener('pointerdown', out, true);
    const q = pop.querySelector('input'); q.addEventListener('input', () => fill(q.value)); q.focus({ preventScroll: true }); fill(/^mdi:/.test(cur()) ? '' : cur());
    pop.addEventListener('click', (e) => { const b = e.target.closest('[data-ic]'); if (b) { e.preventDefault(); e.stopPropagation(); pick(b.dataset.ic); } });
    pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); ob.focus(); return; }
      const all = [...pop.querySelectorAll('[data-ic]')], i = all.indexOf(e.target.closest && e.target.closest('[data-ic]')), g = pop.querySelector('.hs-ipg.all'), cols = Math.max(1, Math.round(g.clientWidth / 44));
      if (e.target === q && (e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); const f = g.querySelector('[data-ic]'); if (e.key === 'Enter' && f && q.value.trim()) return pick(f.dataset.ic); if (f) f.focus(); return; }
      if (i < 0) return; const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (mv) { e.preventDefault(); const j = i + mv; if (j < 0) return q.focus(); if (all[j]) all[j].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); all[0].focus(); } else if (e.key === 'End') { e.preventDefault(); all[all.length - 1].focus(); } }); };
  ob.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); open(); });
  inp.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); open(); } }); };
const hgSzSeg = (act, cur) => `<div class="hs-seg" role="group" aria-label="${hgTr('Rozmiar', 'Size')}">${[['s', 'Mały', 'Small'], ['m', 'Średni', 'Medium'], ['l', 'Cała szerokość', 'Full width']].map(([v, pl, en]) => `<button type="button" data-hge="${act}" data-z="${v}" aria-pressed="${cur === v}"><span class="sg sg-${v}" aria-hidden="true"><i></i><i></i><i></i></span><span>${hgTr(pl, en)}</span></button>`).join('')}</div>`;
const HG_TILE_CSS = `
.tg2{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 210px), 1fr)); gap:12px; grid-auto-flow:row dense; } .tg2[data-hgl]:not(.one){ grid-template-columns:var(--hg-vcols-tpl, repeat(auto-fill, minmax(min(100%, 210px), 1fr))); gap:12px; }
.hgtl{ position:relative; display:flex; align-items:center; gap:10px; min-width:0; min-height:76px; padding:12px 14px; border-radius:18px; background:var(--hg-glass-lite, var(--hg-glass-bg)); box-shadow:var(--hg-card-sh, none); color:inherit; }
.hgtl.hgsz-m{ grid-column:span 2; } .hgtl.hgsz-l{ grid-column:1 / -1; } .hgtl{ container-type:inline-size; }
@container (max-width: 460px){ .hgtl.hgsz-m{ grid-column:1 / -1; } }
.hgtl.k-clim, .hgtl.k-cam{ padding:0; background:none; box-shadow:none; display:block; }
.hgtl.k-clim > div, .hgtl.k-cam > div{ height:100%; }
.hgtl .hgtb{ flex:1 1 0; display:flex; flex-wrap:nowrap; align-items:center; gap:10px; min-width:0; overflow:visible; align-self:stretch; background:none; border:0; padding:0; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.hgtl .ti{ flex:none; position:static; margin:0; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--hg-tile-bg); }
.hgtl .ti ha-icon{ width:20px; height:20px; }
.hgtl.on .ti{ background:var(--hg-accent); color:var(--hg-on-accent); }
.hgtl .tn{ display:flex; flex-direction:column; flex:1 1 0; min-width:0; overflow:hidden; } .hgtl .tn b{ font-weight:500; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; white-space:normal; overflow:hidden; text-overflow:ellipsis; overflow-wrap:break-word; word-break:break-word; line-height:1.3; padding-block:1px; }
.hgtl .tn{ justify-content:center; } .hgtl .tv.nd{ font-size:13px; font-weight:500; opacity:.6; white-space:nowrap; }
.hgtl .tn small{ opacity:.66; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .hgtl.on .tn small{ color:var(--hg-accent-tx); opacity:1; }
.hgtl .tv{ flex:none; margin-left:auto; align-self:center; text-align:right; font-size:30px; font-weight:200; letter-spacing:-.02em; font-variant-numeric:tabular-nums; white-space:nowrap; } .hgtl .tv.tx{ font-size:15px; font-weight:600; letter-spacing:0; max-width:45%; overflow:hidden; text-overflow:ellipsis; } .hgtl .tv em{ font-style:normal; font-size:13px; opacity:.65; margin-left:3px; font-weight:400; }
.hgtl.un{ opacity:.6; }
.tg2.one{ grid-template-columns:1fr; height:100%; } .tg2.one > .hgtl{ height:100%; }
.hgg{ display:flex; flex-direction:column; gap:10px; min-width:0; } .hgg-h{ display:flex; align-items:center; gap:8px; padding:2px 4px; } .hgg-h ha-icon{ width:20px; height:20px; opacity:.8; } .hgg-h b{ font-size:15px; font-weight:600; flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; } .hgg-h small{ opacity:.55; font-size:12px; }
.hgg-b{ display:grid; gap:10px; min-width:0; } .hgg-b .tg2.one{ height:auto; }
.g-list .hgg-b, .g-clist .hgg-b{ grid-template-columns:1fr; } .g-clist .hgg-b{ gap:6px; }
.g-grid .hgg-b{ grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); }
.g-car .hgg-b{ grid-auto-flow:column; grid-auto-columns:minmax(240px, 46%); overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; padding-bottom:2px; } .g-car .hgg-b > *{ scroll-snap-align:start; } .g-car .hgg-b::-webkit-scrollbar{ display:none; }
.hgtl.k-compact{ min-height:52px; padding:6px 12px 6px 6px; border-radius:999px; } .hgtl.k-compact .ti{ width:36px; height:36px; } .hgtl.k-compact .cs{ flex:none; margin-left:auto; opacity:.8; font-size:13px; white-space:nowrap; }
.hgtl.k-minimal{ min-height:0; padding:10px; justify-content:center; } .hgtl.k-minimal .mm{ flex-direction:column; gap:6px; align-items:center; text-align:center; } .hgtl.k-minimal small{ font-size:13px; opacity:.85; white-space:nowrap; }
.hgtl.k-btn{ min-height:120px; } .hgtl.k-btn .bb{ flex-direction:column; align-items:flex-start; justify-content:space-between; height:100%; gap:14px; } .hgtl.k-btn .ti{ width:48px; height:48px; } .hgtl.k-btn .ti ha-icon{ width:24px; height:24px; }
.hgtl.k-chart{ flex-wrap:wrap; min-height:120px; align-content:flex-start; } .hgtl.k-chart .sp{ flex:1 0 100%; height:44px; margin-top:4px; }
.hgtl .cv, .hgtl .mc{ display:flex; align-items:center; gap:6px; flex:none; }
.hgtl .cv button, .hgtl .mc button, .hgtl .rb{ width:40px; height:40px; border-radius:50%; border:0; display:flex; align-items:center; justify-content:center; background:var(--hg-tile-bg); color:inherit; cursor:pointer; }
.hgtl .mc .pw.on{ background:var(--hg-accent); color:var(--hg-on-accent); } .hgtl .cv em{ font-style:normal; font-size:12px; opacity:.66; }
.hgtl .ma{ width:44px; height:44px; border-radius:12px; object-fit:cover; flex:none; }
.hgtl button:disabled{ opacity:.45; cursor:default; }
.hgtl.k-card{ padding:0; background:none; box-shadow:none; display:block; min-height:0; } .hgtl.k-card > .cmslot{ display:block; height:100%; container-type:inline-size; container-name:hgcm; } .hgtl.k-card > .cmslot > *{ display:block; height:100%; }
`;
/* wspólne akcje kafli (dodanych) – używane przez hg-tiles-card i hg-room-card */
const hgTileAct = (card, act, t) => {
  const h = card._hass, e = t.dataset.e, s = e && h.states[e]; if (!s) return false;
  const d = e.split('.')[0];
  if (act === 'tmore') { H.fire(card, 'hass-more-info', { entityId: e }); return true; }
  if (act === 'ttog') { if (d === 'lock') H.call(h, 'lock', s.state === 'locked' ? 'unlock' : 'lock', { entity_id: e }); else H.call(h, 'homeassistant', 'toggle', { entity_id: e }); return true; }
  if (act === 'trun') { H.call(h, d === 'scene' ? 'scene' : d === 'script' ? 'script' : d, d === 'scene' || d === 'script' ? 'turn_on' : 'press', { entity_id: e }); return true; }
  if (act === 'tcov') { H.call(h, 'cover', t.dataset.s, { entity_id: e }); return true; }
  if (act === 'tmp') { const f = s.attributes.supported_features || 0, pp = (f & 1) && (f & 16384); H.call(h, 'media_player', pp ? 'media_play_pause' : s.state === 'playing' ? 'media_pause' : 'media_play', { entity_id: e }); return true; }
  if (act === 'tmw') { H.call(h, 'media_player', ['off', 'standby'].includes(s.state) ? 'turn_on' : 'turn_off', { entity_id: e }); return true; }
  return false;
};
/* osadzenie kart klimatyzacji / kamer w slotach (jak w karcie pokoju) */
const hgSlots = (card) => {
  const h = card._hass; card._acM = card._acM || new Map(); card._camM = card._camM || new Map();
  for (const slot of card.$.querySelectorAll('.acslot[data-ac]')) { const e = slot.dataset.ac, nn = slot.dataset.n || '', mk = e + '|' + nn; let el = card._acM.get(mk);
    if (!el) { el = document.createElement('hg-ac-card'); el.setConfig({ entity: e, title: nn || H.name(h, e), compact: true }); if (card._hgPvHost) el._hgPv = true; card._acM.set(mk, el); } slot.appendChild(el); el.hass = h; }
  for (const slot of card.$.querySelectorAll('.camslot[data-cam]')) { const e = slot.dataset.cam; let el = card._camM.get(e);
    if (!el) { el = document.createElement('hg-camera-card'); el.setConfig({ entity: e, name: H.name(h, e), embedded: true }); card._camM.set(e, el); } slot.appendChild(el); el.hass = h; }
};
/* ===== „+ Dodaj”: najpierw komponent (galeria), potem jego formularz (sloty encji, nazwa, ikona, styl, rozmiar, podgląd na żywo) ===== */
const hgIsNum = (h, e) => { const s = h.states[e]; return !!s && s.state !== '' && isFinite(Number(s.state)); };
const HG_COMP = [
  hgTrO({ id: 'switch', i: 'mdi:lightbulb-outline', tile: 'tog', slots: [hgTrO({ k: 'e', dom: ['light', 'switch', 'fan', 'input_boolean', 'lock', 'automation', 'humidifier', 'valve', 'siren'], req: 1 }, { l: ['Urządzenie', 'Device'] })] }, { n: ['Światło / przełącznik', 'Light / switch'], d: ['Włącz i wyłącz jednym dotknięciem', 'Turn on and off with one tap'] }),
  hgTrO({ id: 'sensor', i: 'mdi:gauge', tile: 'val', slots: [hgTrO({ k: 'e', dom: ['sensor', 'binary_sensor', 'input_number', 'counter', 'water_heater'], req: 1 }, { l: ['Czujnik', 'Sensor'] })] }, { n: ['Odczyt czujnika', 'Sensor reading'], d: ['Wartość lub stan dowolnego czujnika', 'Value or state of any sensor'] }),
  hgTrO({ id: 'chart', i: 'mdi:chart-areaspline', tile: 'chart', slots: [hgTrO({ k: 'e', dom: ['sensor'], num: 1, req: 1 }, { l: ['Czujnik liczbowy', 'Numeric sensor'] })] }, { n: ['Czujnik z wykresem', 'Sensor with chart'], d: ['Wartość i wykres z ostatnich 24 h', 'Value and chart for the last 24 h'] }),
  hgTrO({ id: 'climate', i: 'mdi:thermostat', tile: 'clim', slots: [hgTrO({ k: 'e', dom: ['climate'], req: 1 }, { l: ['Termostat / klimatyzator', 'Thermostat / AC'] })] }, { n: ['Klimatyzacja', 'Air conditioning'], d: ['Temperatura, tryby i nawiew', 'Temperature, modes and fan'] }),
  hgTrO({ id: 'cover', i: 'mdi:window-shutter', tile: 'cover', slots: [hgTrO({ k: 'e', dom: ['cover'], req: 1 }, { l: ['Roleta', 'Cover'] })] }, { n: ['Roleta / brama', 'Cover / gate'], d: ['Otwórz, zatrzymaj, zamknij', 'Open, stop, close'] }),
  hgTrO({ id: 'run', i: 'mdi:play-circle-outline', tile: 'run', slots: [hgTrO({ k: 'e', dom: ['scene', 'script', 'button', 'input_button'], req: 1 }, { l: ['Scena lub skrypt', 'Scene or script'] })] }, { n: ['Scena / skrypt', 'Scene / script'], d: ['Jeden przycisk uruchamiający', 'One button to run it'] }),
  hgTrO({ id: 'media1', i: 'mdi:speaker', tile: 'media', slots: [hgTrO({ k: 'e', dom: ['media_player'], req: 1 }, { l: ['Odtwarzacz', 'Media player'] })] }, { n: ['Odtwarzacz', 'Media player'], d: ['Okładka, tytuł i sterowanie', 'Artwork, title and controls'] }),
  hgTrO({ id: 'cam1', i: 'mdi:cctv', tile: 'cam', slots: [hgTrO({ k: 'e', dom: ['camera'], req: 1 }, { l: ['Kamera', 'Camera'] })] }, { n: ['Kamera', 'Camera'], d: ['Migawka i podgląd na żywo', 'Snapshot and live view'] }),
  hgTrO({ id: 'scenes', i: 'mdi:palette-outline', card: 'hg-scenes-card', slots: [hgTrO({ k: 'scripts', dom: ['scene', 'script'], multi: 1, obj: 1, req: 1 }, { l: ['Sceny / skrypty', 'Scenes / scripts'] })],
    cfg: (v) => ({ scripts: v.scripts }) }, { n: ['Sceny i skrypty', 'Scenes and scripts'], d: ['Kilka przycisków w jednej karcie', 'Several buttons in one card'] }),
  hgTrO({ id: 'cameras', i: 'mdi:view-grid-outline', card: 'hg-cameras-card', slots: [hgTrO({ k: 'entities', dom: ['camera'], multi: 1, req: 1 }, { l: ['Kamery', 'Cameras'] })], cfg: (v) => ({ entities: v.entities }) }, { n: ['Siatka kamer', 'Camera grid'], d: ['Wszystkie wybrane kamery naraz', 'All selected cameras at once'] }),
  hgTrO({ id: 'players', i: 'mdi:play-box-multiple-outline', card: 'hg-players-card', slots: [hgTrO({ k: 'entities', dom: ['media_player'], multi: 1, req: 1 }, { l: ['Odtwarzacze', 'Media players'] })], cfg: (v) => ({ entities: v.entities }) }, { n: ['Multimedia', 'Media'], d: ['Lista odtwarzaczy z głośnością', 'Player list with volume'] }),
  hgTrO({ id: 'power', i: 'mdi:flash-outline', card: 'hg-power-card', slots: [hgTrO({ k: 'entities', dom: ['sensor'], dc: ['power'], multi: 1, req: 1 }, { l: ['Czujnik mocy', 'Power sensor'] })], cfg: (v) => ({ entities: v.entities, max_power: 10000, hours: 6 }) }, { n: ['Moc teraz', 'Power now'], d: ['Moc chwilowa z linią z ostatnich godzin', 'Current power with a line for recent hours'] }),
  hgTrO({ id: 'energy', i: 'mdi:lightning-bolt-outline', card: 'hg-energy-stats-card', slots: [hgTrO({ k: 'consumption', dom: ['sensor'], dc: ['energy'], req: 1 }, { l: ['Zużycie (kWh)', 'Consumption (kWh)'] }), hgTrO({ k: 'production', dom: ['sensor'], dc: ['energy'] }, { l: ['Produkcja (kWh, opcjonalnie)', 'Production (kWh, optional)'] })],
    cfg: (v) => ({ consumption: v.consumption, ...(v.production ? { production: v.production } : {}) }) }, { n: ['Energia – statystyki', 'Energy – statistics'], d: ['Zużycie i produkcja: dziś, tydzień, miesiąc', 'Consumption and production: today, week, month'] }),
  hgTrO({ id: 'weather', i: 'mdi:weather-partly-cloudy', card: 'hg-weather-card', slots: [hgTrO({ k: 'entity', dom: ['weather'], req: 1 }, { l: ['Prognoza', 'Forecast'] })], cfg: (v, h) => ({ entity: v.entity, hours: 24, ...(h.states['sun.sun'] ? { sun: 'sun.sun' } : {}) }) }, { n: ['Pogoda', 'Weather'], d: ['Teraz, prognoza godzinowa, słońce', 'Now, hourly forecast, sun'] }),
  hgTrO({ id: 'people', i: 'mdi:account-group-outline', card: 'hg-people-card', slots: [hgTrO({ k: 'persons', dom: ['person'], multi: 1, req: 1 }, { l: ['Osoby', 'People'] })], cfg: (v) => ({ persons: v.persons }) }, { n: ['Domownicy', 'People'], d: ['Kto jest w domu, strefy i czas', 'Who is home, zones and time'] }),
  hgTrO({ id: 'alarm', i: 'mdi:shield-home-outline', card: 'hg-alarm-card', slots: [hgTrO({ k: 'entity', dom: ['alarm_control_panel'], req: 1 }, { l: ['Centrala alarmu', 'Alarm panel'] })], cfg: (v) => ({ entity: v.entity }) }, { n: ['Alarm', 'Alarm'], d: ['Uzbrajanie i rozbrajanie z kodem', 'Arm and disarm with a code'] }),
  hgTrO({ id: 'robots', i: 'mdi:robot-vacuum', card: 'hg-robots-card', slots: [hgTrO({ k: 'entities', dom: ['vacuum', 'lawn_mower'], multi: 1, req: 1 }, { l: ['Roboty', 'Robots'] })], cfg: (v) => ({ entities: v.entities }) }, { n: ['Roboty', 'Robots'], d: ['Odkurzacze i kosiarki: stan i sterowanie', 'Vacuums and mowers: status and control'] }),
  hgTrO({ id: 'agenda', i: 'mdi:calendar-month-outline', card: 'hg-agenda-card', cards: { agenda: 'hg-agenda-card', month: 'hg-month-card' }, modes: [['agenda', 'Agenda', 'Agenda', 'mdi:format-list-bulleted'], ['month', 'Miesiąc', 'Month', 'mdi:calendar-month-outline']],
    slots: [hgTrO({ k: 'calendars', dom: ['calendar'], multi: 1, req: 1 }, { l: ['Kalendarze', 'Calendars'] })], cfg: (v) => (v.mode === 'month' ? { calendars: v.calendars } : { calendars: v.calendars, days: 14 }) }, { n: ['Kalendarz', 'Calendar'], d: ['Agenda lub widok miesiąca', 'Agenda or month view'] }),
  hgTrO({ id: 'slider', i: 'mdi:tune-variant', card: 'hg-slider-card', modes: [['h', 'Poziomy', 'Horizontal', 'mdi:arrow-left-right'], ['v', 'Pionowy', 'Vertical', 'mdi:arrow-up-down']],
    slots: [hgTrO({ k: 'e', dom: ['light', 'media_player', 'fan', 'cover', 'valve', 'input_number', 'number'], req: 1 }, { l: ['Encja', 'Entity'] })], cfg: (v) => ({ entity: v.e, mode: v.mode || 'h' }) }, { n: ['Suwak', 'Slider'], d: ['Jasność, głośność, wentylator, roleta, liczba', 'Brightness, volume, fan, cover, number'] }),
  hgTrO({ id: 'button', i: 'mdi:gesture-tap-button', card: 'hg-button-card', modes: [['tile', 'Kafel', 'Tile', 'mdi:square-rounded-outline'], ['pill', 'Wiersz', 'Row', 'mdi:minus-box-outline']],
    slots: [hgTrO({ k: 'e', dom: ['script', 'scene', 'button', 'input_button', 'automation', 'lock', 'switch'], req: 1 }, { l: ['Encja', 'Entity'] })], cfg: (v) => ({ entity: v.e, mode: v.mode || 'tile' }) }, { n: ['Przycisk', 'Button'], d: ['Skrypt, scena, button.press lub akcja', 'Script, scene, button.press or action'] }),
  hgTrO({ id: 'entities', i: 'mdi:format-list-checks', card: 'hg-entities-card',
    slots: [hgTrO({ k: 'entities', dom: ['light', 'switch', 'fan', 'input_boolean', 'siren', 'humidifier', 'sensor', 'binary_sensor', 'script', 'scene', 'button', 'input_button', 'lock', 'cover', 'climate', 'media_player', 'person'], pref: ['light', 'switch', 'fan', 'input_boolean'], multi: 1, req: 1 }, { l: ['Encje', 'Entities'] })], cfg: (v) => ({ entities: v.entities }) }, { n: ['Lista encji', 'Entity list'], d: ['Wiersze z przełącznikiem lub wartością', 'Rows with a toggle or value'] }),
  hgTrO({ id: 'select', i: 'mdi:form-dropdown', card: 'hg-select-card', modes: [['chips', 'Przyciski', 'Buttons', 'mdi:dots-horizontal'], ['list', 'Lista', 'List', 'mdi:format-list-bulleted']],
    slots: [hgTrO({ k: 'e', dom: ['input_select', 'select'], req: 1 }, { l: ['Encja', 'Entity'] })], cfg: (v) => ({ entity: v.e, mode: v.mode || 'chips' }) }, { n: ['Wybór', 'Select'], d: ['Opcje input_select i select', 'input_select and select options'] }),
  hgTrO({ id: 'stepper', i: 'mdi:plus-minus-variant', card: 'hg-stepper-card',
    slots: [hgTrO({ k: 'e', dom: ['counter', 'input_number', 'number'], req: 1 }, { l: ['Encja', 'Entity'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Licznik', 'Stepper'], d: ['Plus i minus dla liczników i wartości', 'Plus and minus for counters and values'] }),
  hgTrO({ id: 'gauge', i: 'mdi:gauge', card: 'hg-gauge-card', slots: [hgTrO({ k: 'e', dom: ['sensor', 'input_number', 'number'], num: 1, req: 1 }, { l: ['Czujnik liczbowy', 'Numeric sensor'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Wskaźnik', 'Gauge'], d: ['Wartość czujnika na łuku', 'Sensor value on an arc'] }),
  hgTrO({ id: 'map', i: 'mdi:map-outline', card: 'hg-map-card', slots: [hgTrO({ k: 'entities', dom: ['person', 'device_tracker', 'zone'], loc: 1, multi: 1, req: 1 }, { l: ['Osoby, urządzenia, strefy', 'People, devices, zones'] })],
    cfg: (v) => ({ entities: v.entities, theme_mode: 'auto', hours_to_show: 0 }) }, { n: ['Mapa', 'Map'], d: ['Domownicy, urządzenia i strefy na mapie', 'People, devices and zones on a map'] }),
  /* --- karty z Home Glass (pełna konfiguracja: sloty, opcje i JSON zaawansowany) --- */
  hgTrO({ id: 'ac', i: 'mdi:air-conditioner', card: 'hg-ac-card', slots: [hgTrO({ k: 'entity', dom: ['climate'], req: 1 }, { l: ['Klimatyzator / termostat', 'AC / thermostat'] })], opts: [{ k: 'title', l: ['Tytuł', 'Title'] }],
    cfg: (v) => ({ entity: v.entity }) }, { n: ['Klimatyzacja (karta)', 'Air conditioning (card)'], d: ['Duża karta: temperatura, tryby, nawiew, harmonogram', 'Large card: temperature, modes, fan, schedule'] }),
  hgTrO({ id: 'week', i: 'mdi:chart-bar', card: 'hg-week-card', slots: [hgTrO({ k: 'consumption', dom: ['sensor'], dc: ['energy'], multi: 1, req: 1 }, { l: ['Zużycie (kWh)', 'Consumption (kWh)'] }), hgTrO({ k: 'production', dom: ['sensor'], dc: ['energy'], multi: 1 }, { l: ['Produkcja (kWh)', 'Production (kWh)'] })],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'days', t: 'num', l: ['Liczba dni', 'Number of days'], ph: '7' }, { k: 'expand', t: 'nav', l: ['Po dotknięciu otwórz (ścieżka)', 'On tap open (path)'], ph: '/nuvio/energia' }],
    cfg: (v) => ({ consumption: v.consumption || [], production: v.production || [] }) }, { n: ['Energia · tydzień', 'Energy · week'], d: ['Słupki zużycia i produkcji z ostatnich dni', 'Consumption and production bars for recent days'] }),
  hgTrO({ id: 'phases', i: 'mdi:sine-wave', card: 'hg-phases-card', slots: [hgTrO({ k: 'power', dom: ['sensor'], dc: ['power'], multi: 1, req: 1 }, { l: ['Moc faz (L1, L2, L3)', 'Phase power (L1, L2, L3)'] }), hgTrO({ k: 'voltage', dom: ['sensor'], dc: ['voltage'], multi: 1 }, { l: ['Napięcie faz', 'Phase voltage'] }), hgTrO({ k: 'current', dom: ['sensor'], dc: ['current'], multi: 1 }, { l: ['Prąd faz', 'Phase current'] })],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'max_power', t: 'num', l: ['Maks. moc łącznie (W)', 'Max total power (W)'], ph: '17250' }, { k: 'phase_max', t: 'num', l: ['Maks. moc fazy (W)', 'Max phase power (W)'], ph: '5750' }],
    cfg: (v) => ({ phases: (v.power || []).map((e, i) => ({ name: 'L' + (i + 1), power: e, ...((v.voltage || [])[i] ? { voltage: v.voltage[i] } : {}), ...((v.current || [])[i] ? { current: v.current[i] } : {}) })) }) }, { n: ['Fazy', 'Phases'], d: ['Moc, napięcie i prąd każdej fazy', 'Power, voltage and current per phase'] }),
  hgTrO({ id: 'pv', i: 'mdi:solar-power-variant-outline', card: 'hg-pv-card', slots: [hgTrO({ k: 'power', dom: ['sensor'], dc: ['power'], req: 1 }, { l: ['Moc PV (W)', 'PV power (W)'] }), hgTrO({ k: 'today', dom: ['sensor'], dc: ['energy'] }, { l: ['Produkcja dziś (kWh)', 'Production today (kWh)'] }), hgTrO({ k: 'state', dom: ['sensor', 'binary_sensor'] }, { l: ['Stan falownika', 'Inverter state'] }), hgTrO({ k: 'temperature', dom: ['sensor'], dc: ['temperature'] }, { l: ['Temperatura falownika', 'Inverter temperature'] }), hgTrO({ k: 'strings', dom: ['sensor'], dc: ['power'], multi: 1, obj: 1 }, { l: ['Stringi', 'Strings'] })],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }], cfg: (v) => ({ power: v.power, today: v.today || null, state: v.state || null, temperature: v.temperature || null, strings: v.strings || [] }) }, { n: ['Fotowoltaika', 'Solar'], d: ['Moc, produkcja dziś, stringi i falownik', 'Power, today, strings and inverter'] }),
  hgTrO({ id: 'flow', i: 'mdi:transmission-tower-export', card: 'hg-flow-card', slots: [hgTrO({ k: 'grid', dom: ['sensor'], dc: ['power'], multi: 1, one: 1, req: 1, rank: HG_FLOW_RX.grid, auto: 'rank' }, { l: ['Moc sieci (+ pobór, − oddawanie; kilka = suma, np. fazy)', 'Grid power (+ import, − export; several = sum, e.g. phases)'] }),
    hgTrO({ k: 'solar', dom: ['sensor'], dc: ['power'], multi: 1, one: 1, rank: HG_FLOW_RX.solar, auto: 'rank' }, { l: ['Moc paneli (kilka = suma falowników)', 'Solar power (several = sum of inverters)'] }),
    hgTrO({ k: 'battery', dom: ['sensor'], dc: ['power'], multi: 1, rank: HG_FLOW_RX.battery, auto: 'rank' }, { l: ['Moc baterii (+ rozładowanie, − ładowanie; każda osobno)', 'Battery power (+ discharge, − charge; each one separate)'] }),
    hgTrO({ k: 'battery_soc', dom: ['sensor'], dc: ['battery'], multi: 1, rank: HG_FLOW_RX.battery, auto: 'rank' }, { l: ['Poziom baterii (%, w tej samej kolejności)', 'Battery level (%, in the same order)'] }),
    hgTrO({ k: 'grid_export', dom: ['sensor'], dc: ['power'], multi: 1, auto: 'none' }, { l: ['Oddawanie do sieci (osobne czujniki, opcjonalnie)', 'Grid export (separate sensors, optional)'] }),
    hgTrO({ k: 'home', dom: ['sensor'], dc: ['power'], multi: 1, auto: 'none' }, { l: ['Zużycie domu (puste = z bilansu, kilka = suma)', 'Home usage (empty = from the balance, several = sum)'] })],
    opts: [{ k: 'invert_grid', t: 'bool', l: ['Odwróć znak sieci', 'Invert grid sign'] }, { k: 'invert_battery', t: 'bool', l: ['Odwróć znak baterii', 'Invert battery sign'] }],
    /* baterie jako osobne obiekty: poziom z tego samego urządzenia co moc, inaczej wg kolejności */
    cfg: (v, h) => { const L = (x) => hgArr(x), o = Object.fromEntries(['grid', 'solar', 'grid_export', 'home'].filter((k) => L(v[k]).length).map((k) => [k, L(v[k]).length > 1 ? L(v[k]) : L(v[k])[0]]));
      const P = L(v.battery), S = L(v.battery_soc), R = (h && h.entities) || {}, used = new Set();
      const bs = P.map((p) => { const d = R[p] && R[p].device_id, m = d && S.find((e) => !used.has(e) && R[e] && R[e].device_id === d); if (m) used.add(m); return { power: p, soc: m || null }; });
      for (const b of bs) if (!b.soc) { const m = S.find((e) => !used.has(e)); if (m) { used.add(m); b.soc = m; } }
      for (const e of S) if (!used.has(e)) bs.push({ power: null, soc: e });
      if (bs.length) o.batteries = bs.slice(0, 4).map((b) => Object.fromEntries(Object.entries(b).filter(([, x]) => x)));
      return o; } }, { n: ['Przepływ energii', 'Energy flow'], d: ['Sieć, panele, baterie i dom z animacją przepływu', 'Grid, solar, batteries and home with animated flow'] }),
  hgTrO({ id: 'net', i: 'mdi:lan', card: 'hg-net-card', modes: [['wan', 'Internet', 'Internet', 'mdi:web'], ['gw', 'Brama', 'Gateway', 'mdi:router-network'], ['wlan', 'Wi-Fi', 'Wi-Fi', 'mdi:wifi'], ['dev', 'Urządzenia', 'Devices', 'mdi:devices'], ['cl', 'Klienci', 'Clients', 'mdi:account-network-outline']], slots: [],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }], cfg: (v) => ({ section: v.mode || 'wan', net: {} }) }, { n: ['Sieć', 'Network'], d: ['Internet, brama, Wi-Fi, urządzenia, klienci (UniFi i inne)', 'Internet, gateway, Wi-Fi, devices, clients (UniFi and others)'] }),
  hgTrO({ id: 'sensors', i: 'mdi:motion-sensor', card: 'hg-sensors-card', slots: [hgTrO({ k: 'include', dom: ['binary_sensor', 'sensor'], multi: 1 }, { l: ['Dodatkowe czujniki', 'Extra sensors'] }), hgTrO({ k: 'exclude', dom: ['binary_sensor', 'sensor'], multi: 1 }, { l: ['Pomiń czujniki', 'Skip sensors'] })],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'device_classes', t: 'list', l: ['Rodzaje (device_class, po przecinku)', 'Kinds (device_class, comma separated)'], ph: 'motion, door, window, smoke, moisture' }],
    cfg: (v) => ({ include: v.include || [], exclude: v.exclude || [] }) }, { n: ['Czujniki domu', 'Home sensors'], d: ['Ruch, drzwi, okna, dym, zalanie: zakładki i historia', 'Motion, doors, windows, smoke, leaks: tabs and history'] }),
  hgTrO({ id: 'link', i: 'mdi:open-in-new', card: 'hg-link-card', slots: [hgTrO({ k: 'entity', dom: ['sensor', 'binary_sensor', 'switch', 'light', 'input_boolean', 'update', 'person', 'climate'] }, { l: ['Encja ze stanem (opcjonalnie)', 'Entity with state (optional)'] })],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'subtitle', l: ['Podtytuł', 'Subtitle'] }, { k: 'action', t: 'nav', l: ['Otwórz ścieżkę lub adres', 'Open path or URL'], ph: '/config' }],
    cfg: (v) => ({ entity: v.entity || null }) }, { n: ['Skrót', 'Shortcut'], d: ['Kafel z tytułem prowadzący do widoku lub strony', 'Tile with a title that opens a view or page'] }),
  hgTrO({ id: 'person', i: 'mdi:account-circle-outline', card: 'hg-person-card', slots: [hgTrO({ k: 'entity', dom: ['person'], req: 1 }, { l: ['Osoba', 'Person'] })],
    opts: [{ k: 'home_label', l: ['Etykieta „w domu”', '"Home" label'] }, { k: 'away_label', l: ['Etykieta „poza domem”', '"Away" label'] }], cfg: (v) => ({ entity: v.entity }) }, { n: ['Osoba', 'Person'], d: ['Zdjęcie, strefa i czas od zmiany', 'Photo, zone and time since change'] }),
  hgTrO({ id: 'rooms', i: 'mdi:sofa-outline', card: 'hg-areas-card', slots: [], opts: [{ k: 'room_path', l: ['Ścieżka widoku pokoju', 'Room view path'], ph: '/nuvio/pokoj' }],
    cfg: () => ({ room_path: (location.pathname.split('/').slice(0, 2).join('/') || '/nuvio') + '/pokoj' }) }, { n: ['Pokoje', 'Rooms'], d: ['Kafle pokoi z temperaturą, wilgotnością i aktywnymi urządzeniami (Wygląd → Pokoje)', 'Room tiles with temperature, humidity and active devices (Look → Rooms)'] }),
  hgTrO({ id: 'room', i: 'mdi:door-open', card: 'hg-room-card', slots: [], opts: [{ k: 'room', t: 'room', l: ['Pokój', 'Room'] }],
    cfg: (v, h) => { const L = HGAreas.model(h).list.filter((a) => a.id !== '_none'); return L.length ? { room: L[0].id } : {}; } }, { n: ['Pokój', 'Room'], d: ['Wszystkie urządzenia jednego pokoju w sekcjach', 'All devices of one room in sections'] }),
  hgTrO({ id: 'appliance', i: 'mdi:washing-machine', card: 'hg-appliance-card', slots: [hgTrO({ k: 'entity', dom: ['sensor', 'select', 'switch', 'binary_sensor', 'button', 'number', 'water_heater', 'event'], req: 1, pref: ['sensor'], rank: /washer|pralk|dryer|susz|dishwasher|zmywar|DA_WM|machine_state|job_state/i }, { l: ['Dowolna encja urządzenia', 'Any entity of the device'] })],
    opts: [], cfg: (v) => ({ entity: v.entity }) }, { n: ['Urządzenie AGD', 'Appliance'], d: ['Pralka, suszarka, zmywarka: stan, program, czas do końca, postęp', 'Washer, dryer, dishwasher: state, program, time left, progress'] }),
  hgTrO({ id: 'cwu', i: 'mdi:water-boiler', card: 'hg-cwu-card', slots: [hgTrO({ k: 'heater', dom: ['water_heater', 'climate'], req: 1 }, { l: ['Podgrzewacz', 'Water heater'] }), hgTrO({ k: 'heating', dom: ['binary_sensor', 'switch', 'sensor'] }, { l: ['Grzanie (stan)', 'Heating (state)'] }), hgTrO({ k: 'power', dom: ['sensor'], dc: ['power'] }, { l: ['Moc (W)', 'Power (W)'] }), hgTrO({ k: 'remaining', dom: ['sensor'] }, { l: ['Czas do nagrzania', 'Time to heat'] }), hgTrO({ k: 'consumption', dom: ['sensor'], dc: ['energy'] }, { l: ['Zużycie (kWh)', 'Consumption (kWh)'] }), hgTrO({ k: 'keep', dom: ['switch', 'input_boolean'] }, { l: ['Utrzymuj temperaturę', 'Keep temperature'] }), hgTrO({ k: 'switches', dom: ['switch', 'input_boolean'], multi: 1 }, { l: ['Przełączniki', 'Switches'] })],
    opts: [], cfg: (v) => ({ cwu: { heater: v.heater, heating: v.heating || null, power: v.power || null, remaining: v.remaining || null, consumption: v.consumption || null, keep: v.keep || null, switches: (v.switches || []).map((e) => [e]) } }) }, { n: ['Ciepła woda (CWU)', 'Hot water'], d: ['Temperatura, grzanie, moc, czas i przełączniki podgrzewacza', 'Temperature, heating, power, time and heater switches'] }),
  hgTrO({ id: 'stairs', i: 'mdi:stairs', card: 'hg-stairs-card', slots: [hgTrO({ k: 'bl', dom: ['light', 'switch'], req: 1 }, { l: ['Światło dół', 'Bottom light'] }), hgTrO({ k: 'bm', dom: ['binary_sensor'], req: 1 }, { l: ['Ruch dół', 'Bottom motion'] }), hgTrO({ k: 'tl', dom: ['light', 'switch'], req: 1 }, { l: ['Światło góra', 'Top light'] }), hgTrO({ k: 'tm', dom: ['binary_sensor'], req: 1 }, { l: ['Ruch góra', 'Top motion'] }), hgTrO({ k: 'group', dom: ['light'] }, { l: ['Grupa świateł schodów', 'Stair light group'] }), hgTrO({ k: 'automation', dom: ['automation'] }, { l: ['Automatyzacja sekwencji', 'Sequence automation'] })],
    opts: [], cfg: (v) => ({ stairs: { group: v.group || null, automation: v.automation || null, bottom: { light: v.bl, motion: v.bm }, top: { light: v.tl, motion: v.tm } } }) }, { n: ['Schody', 'Stairs'], d: ['Sekwencja świateł dół i góra z czujnikami ruchu', 'Bottom and top light sequence with motion sensors'] }),
  hgTrO({ id: 'fuel', i: 'mdi:gas-station-outline', card: 'hg-fuel-card', slots: [hgTrO({ k: 'prices', dom: ['sensor', 'input_number'], multi: 1, obj: 1 }, { l: ['Ceny (puste = z Wygląd → Nagłówek)', 'Prices (empty = from Look → Header)'] })],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }], cfg: (v) => ({ fuel: (v.prices || []).map((x) => ({ label: x.name || x.entity, entity: x.entity, ...(x.change ? { change: x.change } : {}) })) }) }, { n: ['Ceny paliw', 'Fuel prices'], d: ['Ceny z czujników z trendem na jutro', 'Prices from sensors with a trend for tomorrow'] }),
  /* 0.9: karty ogólne */
  hgTrO({ id: 'light', i: 'mdi:lightbulb-on-outline', card: 'hg-lamp-card', slots: [hgTrO({ k: 'e', dom: ['light'], req: 1 }, { l: ['Światło', 'Light'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Światło z jasnością', 'Light with brightness'], d: ['Włącznik, suwak jasności, szybkie poziomy i barwa', 'Switch, brightness slider, quick levels and colour temperature'] }),
  hgTrO({ id: 'thermo', i: 'mdi:thermostat', card: 'hg-thermo-card', slots: [hgTrO({ k: 'e', dom: ['climate', 'water_heater'], req: 1 }, { l: ['Termostat', 'Thermostat'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Termostat', 'Thermostat'], d: ['Temperatura zadana plus i minus oraz tryby', 'Target temperature up and down and modes'] }),
  hgTrO({ id: 'value', i: 'mdi:numeric', card: 'hg-value-card', slots: [hgTrO({ k: 'e', dom: ['sensor', 'input_number', 'number', 'counter', 'binary_sensor', 'input_text'], req: 1 }, { l: ['Encja', 'Entity'] })], opts: [{ k: 'warn', t: 'num', l: ['Próg ostrzeżenia', 'Warning threshold'] }, { k: 'alert', t: 'num', l: ['Próg alarmu', 'Alert threshold'] }, { k: 'decimals', t: 'num', l: ['Miejsca po przecinku', 'Decimals'], ph: '1' }], cfg: (v) => ({ entity: v.e }) }, { n: ['Duża wartość', 'Big value'], d: ['Jedna liczba z progami kolorów', 'One number with colour thresholds'] }),
  hgTrO({ id: 'history', i: 'mdi:chart-multiline', card: 'hg-history-card', slots: [hgTrO({ k: 'entities', dom: ['sensor'], num: 1, multi: 1, req: 1 }, { l: ['Czujniki liczbowe', 'Numeric sensors'] })], opts: [{ k: 'hours', t: 'num', l: ['Zakres (godziny)', 'Range (hours)'], ph: '24' }], cfg: (v) => ({ entities: v.entities }) }, { n: ['Wykres historii', 'History graph'], d: ['Kilka czujników na jednym wykresie', 'Several sensors on one chart'] }),
  hgTrO({ id: 'openings', i: 'mdi:door-open', card: 'hg-openings-card', slots: [hgTrO({ k: 'entities', dom: ['binary_sensor'], multi: 1 }, { l: ['Czujniki (puste = wszystkie drzwi i okna)', 'Sensors (empty = all doors and windows)'] })], opts: [{ k: 'only_open', t: 'bool', l: ['Tylko otwarte', 'Only open ones'] }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: ['Drzwi i okna', 'Doors and windows'], d: ['Czujniki otwarcia, otwarte na górze', 'Opening sensors, open ones first'] }),
  hgTrO({ id: 'battery', i: 'mdi:battery-heart-variant', card: 'hg-battery-card', slots: [hgTrO({ k: 'entities', dom: ['sensor'], dc: ['battery'], multi: 1 }, { l: ['Czujniki (puste = wykryj automatycznie)', 'Sensors (empty = detect automatically)'] })], opts: [{ k: 'low', t: 'num', l: ['Niski poziom (%)', 'Low level (%)'], ph: '20' }, { k: 'limit', t: 'num', l: ['Pokaż najwyżej', 'Show at most'] }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: ['Baterie', 'Batteries'], d: ['Najsłabsze baterie na górze', 'Weakest batteries first'] }),
  hgTrO({ id: 'vacuum', i: 'mdi:robot-vacuum', card: 'hg-vacuum-card', slots: [hgTrO({ k: 'e', dom: ['vacuum', 'lawn_mower'], req: 1 }, { l: ['Robot', 'Robot'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Odkurzacz', 'Vacuum'], d: ['Jeden robot: stan, bateria, start i stacja', 'One robot: state, battery, start and dock'] }),
  hgTrO({ id: 'mediamini', i: 'mdi:music-box-outline', card: 'hg-media-mini-card', slots: [hgTrO({ k: 'e', dom: ['media_player'], req: 1 }, { l: ['Odtwarzacz', 'Media player'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Mini odtwarzacz', 'Mini player'], d: ['Okładka, tytuł i przyciski w jednym wierszu', 'Artwork, title and buttons in one row'] }),
  hgTrO({ id: 'clock', i: 'mdi:clock-outline', card: 'hg-clock-card', slots: [], opts: [{ k: 'seconds', t: 'bool', l: ['Sekundy', 'Seconds'] }, { k: 'hour12', t: 'bool', l: ['Zegar 12 godzinny', '12 hour clock'] }], cfg: () => ({}) }, { n: ['Zegar', 'Clock'], d: ['Godzina i data', 'Time and date'] }),
  hgTrO({ id: 'sun', i: 'mdi:weather-sunset', card: 'hg-sun-card', slots: [], cfg: () => ({ entity: 'sun.sun' }) }, { n: ['Słońce', 'Sun'], d: ['Wschód, zachód i pozycja słońca', 'Sunrise, sunset and sun position'] }),
  hgTrO({ id: 'note', i: 'mdi:note-text-outline', card: 'hg-note-card', slots: [], opts: [{ k: 'text', t: 'txt', l: ['Treść (**pogrubienie**, *kursywa*, listy "- ")', 'Text (**bold**, *italic*, "- " lists)'] }], cfg: () => ({}) }, { n: ['Notatka', 'Note'], d: ['Tekst z prostym formatowaniem', 'Text with simple formatting'] }),
  hgTrO({ id: 'image', i: 'mdi:image-outline', card: 'hg-image-card', modes: [['image', 'Obraz', 'Image', 'mdi:image-outline'], ['iframe', 'Strona', 'Page', 'mdi:web']], slots: [], opts: [{ k: 'url', l: ['Adres (https://… lub /local/…)', 'Address (https://… or /local/…)'], ph: 'https://' }, { k: 'ratio', l: ['Proporcje', 'Aspect ratio'], ph: '16/9' }, { k: 'refresh', t: 'num', l: ['Odświeżanie obrazu (s)', 'Image refresh (s)'] }], cfg: (v) => ({ mode: v.mode || 'image' }) }, { n: ['Obraz lub strona', 'Image or page'], d: ['Zdjęcie z adresu albo strona w ramce', 'Picture from a URL or a page in a frame'] }),
  hgTrO({ id: 'updates', i: 'mdi:package-up', card: 'hg-updates-card', slots: [], cfg: () => ({}) }, { n: ['Aktualizacje', 'Updates'], d: ['Dostępne aktualizacje Home Assistant', 'Available Home Assistant updates'] }),
  /* nowe karty ogólne (0.16.0): klocki ui/, rozmiary S/M/L */
  hgTrO({ id: 'hero', i: 'mdi:hand-wave-outline', card: 'hg-hero-card', slots: [hgTrO({ k: 'e', dom: ['weather', 'sensor', 'alarm_control_panel'] }, { l: ['Stan pod hasłem (opcjonalnie)', 'State under the tagline (optional)'] })],
    opts: [{ k: 'title', l: ['Tytuł ({name} = imię)', 'Title ({name} = first name)'] }, { k: 'subtitle', l: ['Hasło', 'Tagline'] }, { k: 'image', l: ['Zdjęcie (https://… lub /local/…)', 'Photo (https://… or /local/…)'] }], cfg: (v) => (v.e ? { entity: v.e } : {}) }, { n: ['Powitanie', 'Greeting'], d: ['Duże powitanie z imieniem', 'Large greeting with your name'] }),
  hgTrO({ id: 'toggle', i: 'mdi:toggle-switch-outline', card: 'hg-toggle-card', slots: [hgTrO({ k: 'e', dom: HG_TOGGLE_DOM, req: 1 }, { l: ['Urządzenie', 'Device'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Kafelek przełącznika', 'Toggle tile'], d: ['Nazwa, stan i przełącznik w wierszu', 'Name, state and switch in a row'] }),
  hgTrO({ id: 'progress', i: 'mdi:progress-helper', card: 'hg-progress-card', slots: [hgTrO({ k: 'e', dom: ['sensor', 'input_number', 'number'], num: 1, req: 1 }, { l: ['Czujnik liczbowy', 'Numeric sensor'] })],
    opts: [{ k: 'max', t: 'num', l: ['Maksimum', 'Maximum'] }, { k: 'warn', t: 'num', l: ['Próg ostrzeżenia', 'Warning threshold'] }, { k: 'bad', t: 'num', l: ['Próg alarmu', 'Alert threshold'] }], cfg: (v) => ({ entity: v.e }) }, { n: ['Pasek postępu', 'Progress bar'], d: ['Wartość na grubym pasku z progami', 'A value on a thick bar with thresholds'] }),
  hgTrO({ id: 'arc', i: 'mdi:gauge-low', card: 'hg-arc-card', slots: [hgTrO({ k: 'e', dom: ['light', 'fan', 'cover', 'media_player', 'input_number', 'number'], req: 1 }, { l: ['Encja', 'Entity'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Łuk', 'Arc'], d: ['Jasność albo poziom na przeciąganym łuku', 'Brightness or level on a draggable arc'] }),
  hgTrO({ id: 'chart2', i: 'mdi:chart-bell-curve-cumulative', card: 'hg-chart-card', modes: [['area', 'Obszar', 'Area', 'mdi:chart-areaspline'], ['line', 'Linia', 'Line', 'mdi:chart-line'], ['bars', 'Słupki', 'Bars', 'mdi:chart-bar']],
    slots: [hgTrO({ k: 'e', dom: ['sensor'], num: 1, req: 1 }, { l: ['Czujnik liczbowy', 'Numeric sensor'] })], opts: [{ k: 'hours', t: 'num', l: ['Godziny wstecz', 'Hours back'] }], cfg: (v) => ({ entity: v.e, style: v.mode || 'area' }) }, { n: ['Wykres', 'Chart'], d: ['Linia, obszar albo słupki z historii', 'Line, area or bars from history'] }),
  hgTrO({ id: 'roomc', i: 'mdi:sofa-outline', card: 'hg-room-compact-card', slots: [hgTrO({ k: 'temperature', dom: ['sensor'], dc: ['temperature'] }, { l: ['Temperatura', 'Temperature'] }), hgTrO({ k: 'entity', dom: ['light', 'fan', 'cover', 'switch'] }, { l: ['Światło lub urządzenie', 'Light or device'] })],
    opts: [{ k: 'name', l: ['Nazwa pokoju', 'Room name'] }], cfg: (v) => ({ ...(v.temperature ? { temperature: v.temperature } : {}), ...(v.entity ? { entity: v.entity } : {}) }) }, { n: ['Pokój kompakt', 'Compact room'], d: ['Temperatura, przełącznik i linijka jasności', 'Temperature, switch and brightness ruler'] }),
  hgTrO({ id: 'actions', i: 'mdi:gesture-tap', card: 'hg-actions-card', slots: [hgTrO({ k: 'entities', dom: ['scene', 'script', 'button', 'input_button', 'light', 'switch', 'automation'], multi: 1, req: 1 }, { l: ['Sceny, skrypty, urządzenia', 'Scenes, scripts, devices'] })],
    cfg: (v) => ({ actions: (v.entities || []).map((e) => ({ entity: e })) }) }, { n: ['Szybkie akcje', 'Quick actions'], d: ['Rząd okrągłych przycisków', 'A row of round buttons'] }),
  hgTrO({ id: 'family', i: 'mdi:account-heart-outline', card: 'hg-family-card', slots: [hgTrO({ k: 'persons', dom: ['person'], multi: 1 }, { l: ['Osoby (puste = wszystkie)', 'People (empty = all)'] })], cfg: (v) => (v.persons && v.persons.length ? { persons: v.persons } : {}) }, { n: ['Domownicy (awatary)', 'Family (avatars)'], d: ['Awatary i kto jest w domu', 'Avatars and who is home'] }),
  hgTrO({ id: 'cover2', i: 'mdi:window-shutter-settings', card: 'hg-cover-card', slots: [hgTrO({ k: 'e', dom: ['cover'], req: 1 }, { l: ['Roleta lub brama', 'Cover or gate'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Roleta z pozycją', 'Cover with position'], d: ['Przeciągany pasek i przyciski', 'Draggable bar and buttons'] }),
  hgTrO({ id: 'lock', i: 'mdi:lock-outline', card: 'hg-lock-card', slots: [hgTrO({ k: 'e', dom: ['lock'], req: 1 }, { l: ['Zamek', 'Lock'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Zamek', 'Lock'], d: ['Odblokowanie z potwierdzeniem', 'Unlock with confirmation'] }),
  hgTrO({ id: 'fan', i: 'mdi:fan', card: 'hg-fan-card', slots: [hgTrO({ k: 'e', dom: ['fan'], req: 1 }, { l: ['Wentylator', 'Fan'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Wentylator', 'Fan'], d: ['Prędkość na łuku i tryby', 'Speed on an arc and modes'] }),
  hgTrO({ id: 'todo', i: 'mdi:checkbox-marked-circle-outline', card: 'hg-todo-card', slots: [hgTrO({ k: 'e', dom: ['todo'], req: 1 }, { l: ['Lista zadań', 'To-do list'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Lista zadań', 'To-do list'], d: ['Dodawanie i odhaczanie', 'Add and tick off'] }),
  hgTrO({ id: 'glance', i: 'mdi:view-dashboard-variant-outline', card: 'hg-glance-card', slots: [hgTrO({ k: 'entities', dom: ['light', 'switch', 'binary_sensor', 'sensor', 'person', 'device_tracker', 'input_boolean', 'input_select', 'select', 'lock', 'cover', 'climate', 'media_player', 'alarm_control_panel', 'fan', 'vacuum', 'humidifier', 'timer', 'sun', 'weather', 'number', 'input_number', 'automation', 'update', 'calendar'], multi: 1, req: 1 }, { l: ['Encje', 'Entities'] })],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'columns', t: 'num', l: ['Kolumny (puste = automatycznie)', 'Columns (empty = automatic)'] }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: ['Rzut oka', 'Glance'], d: ['Kilka encji w rzędzie: ikona, nazwa, stan', 'Several entities in a row: icon, name, state'] }),
  hgTrO({ id: 'stat', i: 'mdi:chart-box-outline', card: 'hg-stat-card', slots: [hgTrO({ k: 'e', dom: ['sensor', 'input_number', 'number'], num: 1, req: 1 }, { l: ['Czujnik liczbowy', 'Numeric sensor'] })],
    opts: [{ k: 'hours', t: 'num', l: ['Okres na start w godzinach (24, 168, 720)', 'Starting period in hours (24, 168, 720)'], ph: '24' }], cfg: (v) => ({ entity: v.e }) }, { n: ['Statystyka', 'Statistics'], d: ['Minimum, średnia, maksimum i zmiana', 'Minimum, average, maximum and change'] }),
  hgTrO({ id: 'humid', i: 'mdi:air-humidifier', card: 'hg-humidifier-card', slots: [hgTrO({ k: 'e', dom: ['humidifier'], req: 1 }, { l: ['Nawilżacz lub osuszacz', 'Humidifier or dehumidifier'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Nawilżacz', 'Humidifier'], d: ['Docelowa wilgotność na łuku i tryby', 'Target humidity on an arc and modes'] }),
  hgTrO({ id: 'timer', i: 'mdi:timer-outline', card: 'hg-timer-card', slots: [hgTrO({ k: 'e', dom: ['timer'], req: 1 }, { l: ['Minutnik (timer)', 'Timer'] })], cfg: (v) => ({ entity: v.e }) }, { n: ['Minutnik', 'Timer'], d: ['Odliczanie na łuku, start i pauza', 'Countdown on an arc, start and pause'] }),
  hgTrO({ id: 'logbook', i: 'mdi:history', card: 'hg-logbook-card', slots: [hgTrO({ k: 'entities', dom: ['light', 'switch', 'binary_sensor', 'sensor', 'person', 'device_tracker', 'input_boolean', 'input_select', 'select', 'lock', 'cover', 'climate', 'media_player', 'alarm_control_panel', 'fan', 'vacuum', 'humidifier', 'timer', 'sun', 'weather', 'number', 'input_number', 'automation', 'update', 'calendar'], multi: 1, req: 1 }, { l: ['Encje', 'Entities'] })],
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'hours', t: 'num', l: ['Ostatnie godziny', 'Last hours'], ph: '24' }, { k: 'max', t: 'num', l: ['Najwyżej wpisów', 'Most entries'], ph: '6' }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: ['Dziennik', 'Logbook'], d: ['Ostatnie zmiany wybranych encji', 'Recent changes of chosen entities'] }),
  hgTrO({ id: 'webpage', i: 'mdi:web', card: 'hg-webpage-card', slots: [],
    opts: [{ k: 'url', l: ['Adres strony (https://… albo /…)', 'Page address (https://… or /…)'], ph: 'https://' }, { k: 'title', l: ['Tytuł', 'Title'] }, { k: 'aspect_ratio', l: ['Proporcje (np. 16:9, 4:3, 1:1)', 'Aspect ratio (e.g. 16:9, 4:3, 1:1)'], ph: '16:9' }, { k: 'height', t: 'num', l: ['Albo stała wysokość (px)', 'Or a fixed height (px)'] }], cfg: () => ({}) }, { n: ['Strona WWW', 'Web page'], d: ['Dowolny adres w ramce', 'Any address in a frame'] }),
  /* ----- Układ: kontenery jak w HA (siatka, stos pionowy, stos poziomy); dzieci w polu „Karty w kontenerze” ----- */
  hgTrO({ id: 'grid', cat: 'layout', kids: 1, i: 'mdi:view-grid-outline', card: 'hg-grid-card', slots: [], cfg: (v) => ({ cards: v.cards || [] }),
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'columns', t: 'num', l: ['Kolumny (1–6, puste = 3)', 'Columns (1–6, empty = 3)'], ph: '3' }, { k: 'gap', t: 'num', l: ['Odstęp (px)', 'Gap (px)'], ph: '12' },
      { k: 'square', t: 'bool', l: ['Kwadratowe komórki', 'Square cells'] }, { k: 'glass', t: 'bool', l: ['Jedno szkło na całą siatkę', 'One glass for the whole grid'] }] },
    { n: ['Siatka', 'Grid'], d: ['Karty w kolumnach, jak siatka w HA', 'Cards in columns, like the HA grid'] }),
  hgTrO({ id: 'vstack', cat: 'layout', kids: 1, i: 'mdi:view-agenda-outline', card: 'hg-stack-card', slots: [], cfg: (v) => Object.assign({ direction: 'vertical', cards: v.cards || [] }, (v.o || {}).flat ? { glass: false } : {}, (v.o || {}).nodiv ? { divider: false } : {}),
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'gap', t: 'num', l: ['Odstęp (px)', 'Gap (px)'], ph: '0' }, { k: 'flat', t: 'bool', l: ['Każda karta we własnym szkle', 'Each card in its own glass'] }, { k: 'nodiv', t: 'bool', l: ['Bez linii między kartami', 'No lines between cards'] }] },
    { n: ['Stos pionowy', 'Vertical stack'], d: ['Karty jedna pod drugą w jednym szkle', 'Cards one below another in one glass'] }),
  hgTrO({ id: 'hstack', cat: 'layout', kids: 1, i: 'mdi:view-column-outline', card: 'hg-stack-card', slots: [], cfg: (v) => Object.assign({ direction: 'horizontal', cards: v.cards || [] }, (v.o || {}).flat ? { glass: false } : {}, (v.o || {}).nodiv ? { divider: false } : {}),
    opts: [{ k: 'title', l: ['Tytuł', 'Title'] }, { k: 'gap', t: 'num', l: ['Odstęp (px)', 'Gap (px)'], ph: '0' }, { k: 'ratio', t: 'list', l: ['Proporcje szerokości (np. 2, 1)', 'Width ratio (e.g. 2, 1)'], ph: '1, 1' },
      { k: 'wrap_below', t: 'num', l: ['Układaj pionowo poniżej (px)', 'Stack vertically below (px)'], ph: '420' }, { k: 'flat', t: 'bool', l: ['Każda karta we własnym szkle', 'Each card in its own glass'] }, { k: 'nodiv', t: 'bool', l: ['Bez linii między kartami', 'No lines between cards'] }] },
    { n: ['Stos poziomy', 'Horizontal stack'], d: ['Karty obok siebie, na wąskim ekranie pionowo', 'Cards side by side, stacked on narrow screens'] }),
  hgTrO({ id: 'cond', cat: 'layout', kids: 1, i: 'mdi:eye-check-outline', card: 'hg-conditional-card', slots: [hgTrO({ k: 'e', dom: ['light', 'switch', 'binary_sensor', 'sensor', 'person', 'device_tracker', 'input_boolean', 'input_select', 'select', 'lock', 'cover', 'climate', 'media_player', 'alarm_control_panel', 'fan', 'vacuum', 'humidifier', 'timer', 'sun', 'weather', 'number', 'input_number', 'automation', 'update', 'calendar'] }, { l: ['Encja warunku', 'Condition entity'] })],
    cfg: (v) => { const O = v.o || {}, C = []; if (v.e) { const st = String(O.state || '').split(',').map((x) => x.trim()).filter(Boolean);
        if (O.above !== undefined && O.above !== '' || O.below !== undefined && O.below !== '') C.push(Object.assign({ condition: 'numeric_state', entity: v.e }, isFinite(+O.above) && O.above !== '' ? { above: +O.above } : {}, isFinite(+O.below) && O.below !== '' ? { below: +O.below } : {}));
        else C.push({ condition: 'state', entity: v.e, [O.not ? 'state_not' : 'state']: st.length > 1 ? st : st[0] || 'on' }); }
      if (O.screen) C.push({ condition: 'screen', media_query: O.screen === 'phone' ? '(max-width: 767px)' : O.screen === 'big' ? '(min-width: 768px)' : O.screen });
      return { conditions: C, cards: v.cards || [] }; },
    opts: [{ k: 'state', l: ['Stan (np. on, home; kilka po przecinku)', 'State (e.g. on, home; several with commas)'], ph: 'on' }, { k: 'not', t: 'bool', l: ['Gdy stan jest inny', 'When the state is different'] },
      { k: 'above', t: 'num', l: ['Albo wartość powyżej', 'Or a value above'] }, { k: 'below', t: 'num', l: ['Albo wartość poniżej', 'Or a value below'] }, { k: 'screen', l: ['Tylko na ekranie: phone, big albo zapytanie CSS', 'Only on screen: phone, big or a CSS media query'], ph: 'phone' }] },
    { n: ['Warunek', 'Conditional'], d: ['Karty widoczne tylko przy spełnionym warunku', 'Cards shown only when a condition is met'] }),
  hgTrO({ id: 'hacard', cat: 'layout', i: 'mdi:code-braces', card: 'hg-stack-card', slots: [], cardOf: (v) => hgHaTag(hgHaCard(v)) || 'hg-stack-card',
    cfg: (v) => { const c = hgHaCard(v); if (!c) return { cards: [] }; if (hgHaTag(c)) { const o = Object.assign({}, c); delete o.type; return o; } return { direction: 'vertical', glass: false, divider: false, cards: [c] }; },
    opts: [{ k: 'src', t: 'txt', l: ['YAML albo JSON karty z Home Assistant', 'YAML or JSON of a Home Assistant card'], ph: 'type: grid\ncolumns: 2\ncards:\n  - type: tile\n    entity: …' }] },
    { n: ['Karta z HA (YAML)', 'Card from HA (YAML)'], d: ['Wklej kartę albo siatkę i stosy z HA', 'Paste a card, or a grid and stacks from HA'] }),
];
/* domyślny rozmiar nowego komponentu: duże karty od razu M / L, proste kafle S */
const HG_COMP_Z = { flow: 'l', glance: 'l', stat: 'm', humid: 'm', timer: 'm', logbook: 'm', webpage: 'l', cond: 'm', grid: 'l', vstack: 'm', hstack: 'l', hacard: 'm', history: 'm', image: 'm', ac: 'm', week: 'm', phases: 'm', pv: 'm', net: 'm', sensors: 'm', rooms: 'l', room: 'l', appliance: 'm', cwu: 'm', stairs: 'm', fuel: 's', climate: 'm', media1: 'm', cam1: 'm', chart: 'm', scenes: 'm', cameras: 'l', players: 'm', power: 'm', energy: 'm', weather: 'm', people: 'm', alarm: 'm', robots: 'm', agenda: 'm', map: 'l', slider: 'm', entities: 'm', select: 'm' };
/* kandydaci do slotu: domena, device_class, liczba; bez ukrytych / diagnostycznych */
const hgSlotCands = (h, sl) => Object.keys(h.states).filter((e) => { const d = e.split('.')[0], s = h.states[e], r = (h.entities || {})[e];
  if (!sl.dom.includes(d) || (r && (r.hidden || r.entity_category))) return false; if (sl.dc && !sl.dc.includes(s.attributes.device_class)) return false; if (sl.num && !hgIsNum(h, e)) return false; if (sl.loc && s.attributes.latitude == null) return false; return true; })
  .sort((a, b) => (sl.pref ? ((sl.pref.indexOf(a.split('.')[0]) + 1 || 99) - (sl.pref.indexOf(b.split('.')[0]) + 1 || 99)) : 0) || H.name(h, a).localeCompare(H.name(h, b)));
/* szerokość panelu widoku: wąski (kolumna po prawej) albo na całą szerokość; zapis w HGL.data.pw[widok] */
const HG_PW_CSS = `.hg-pw{ display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; } @media (max-width:520px){ .hg-pw{ grid-template-columns:1fr; } }
.hg-pw button{ all:unset; box-sizing:border-box; cursor:pointer; display:flex; gap:10px; align-items:center; padding:10px; border-radius:14px; background:var(--hg-tile-bg, rgba(255,255,255,.08)); transition:box-shadow .15s ease, background .15s ease; }
.hg-pw button:hover{ background:rgba(255,255,255,.12); } .hg-pw button:focus-visible{ box-shadow:0 0 0 2px var(--hg-accent); }
.hg-pw button[aria-checked=true]{ box-shadow:inset 0 0 0 1.5px var(--hg-accent); }
.hg-pw b{ display:block; font-size:13.5px; font-weight:600; } .hg-pw small{ display:block; font-size:11.5px; opacity:.66; line-height:1.3; margin-top:2px; }
.hg-pwv{ flex:none; position:relative; width:64px; height:42px; border-radius:8px; overflow:hidden; background:linear-gradient(150deg, #3b4a5a, #1b232c); box-shadow:inset 0 0 0 1px rgba(255,255,255,.12); }
.hg-pwv i{ position:absolute; left:5px; top:6px; width:5px; bottom:6px; border-radius:3px; background:rgba(255,255,255,.35); }
.hg-pwv em{ position:absolute; left:14px; top:7px; width:18px; height:4px; border-radius:2px; background:rgba(255,255,255,.7); }
.hg-pwv u{ position:absolute; border-radius:5px; background:rgba(255,255,255,.28); box-shadow:inset 0 0 0 1px rgba(255,255,255,.35); }
.hg-pwv.narrow u{ right:5px; top:6px; bottom:6px; width:24px; } .hg-pwv.wide u{ left:14px; right:5px; top:15px; bottom:6px; }
.hg-pw button[aria-checked=true] .hg-pwv u{ background:color-mix(in srgb, var(--hg-accent) 45%, rgba(255,255,255,.2)); }
.hg-pwn{ font-size:11.5px; opacity:.6; margin:6px 0 0; }`;
const hgPwPick = (cur, hge, extra = '') => `<div class="hg-pw" role="radiogroup" aria-label="${hgTr('Szerokość panelu', 'Panel width')}">${[['narrow', hgTr('Panel wąski', 'Narrow panel'), hgTr('Kolumna po prawej, lewa strona wolna na tytuł i tło', 'Right column, left side free for title and background')], ['wide', hgTr('Panel na całą szerokość', 'Full width panel'), hgTr('Jak w widoku Pokoje', 'Like the Rooms view')]].map(([k, l, d]) => `<button type="button" role="radio" data-hge="${hge}" data-w="${k}"${extra} aria-checked="${cur === k}"><span class="hg-pwv ${k}" aria-hidden="true"><i></i><em></em><u></u></span><span><b>${l}</b><small>${d}</small></span></button>`).join('')}</div><p class="hg-pwn">${hgTr('Na telefonie panel zawsze zajmuje całą szerokość.', 'On phones the panel is always full width.')}</p>`;
const hgPwMark = (b) => { for (const x of b.parentElement.querySelectorAll('[role=radio]')) x.setAttribute('aria-checked', String(x === b)); };
window.hgPwPick = hgPwPick; window.hgPwMark = hgPwMark; window.HG_PW_CSS = HG_PW_CSS;
/* pełna konfiguracja komponentu: sloty → cfg(), pola opcji (v.o) i JSON zaawansowany (v.x, nadpisuje wszystko) */
const hgOptVal = (o, val) => (val == null || val === '' ? undefined : o.t === 'num' ? (isFinite(+val) ? +val : undefined) : o.t === 'bool' ? !!val : o.t === 'nav' ? (/^https?:/.test(val) ? { url: val } : { navigate: val }) : o.t === 'list' ? String(val).split(',').map((x) => x.trim()).filter(Boolean) : val);
const hgCompCfg = (C, v, h) => { v = v || {}; const b = C.cfg ? C.cfg(v, h) : {}, O = v.o || {};
  for (const o of C.opts || []) { const x = hgOptVal(o, O[o.k]); if (x !== undefined) b[o.k] = x; }
  return Object.assign(b, v.x && typeof v.x === 'object' ? v.x : {}); };
const HG_COMP_BASIC = ['slider', 'button', 'entities', 'select', 'stepper', 'gauge'];
const hgCompOk = (C) => !C.card || !!customElements.get(C.card);
const hgCompCard = (C, v) => (C.cardOf && v && C.cardOf(v)) || (C.cards && v && C.cards[v.mode]) || C.card;
/* mały parser YAML dla kart HA (mapy, listy, skalary, [a, b], {a: 1}, bloki |); JSON też przechodzi */
const hgYaml = (src) => { const t = String(src || '').replace(/\t/g, '  ').trim(); if (!t) return null; if (/^[{[]/.test(t)) return JSON.parse(t);
  const cut = (l) => { let q = ''; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === q) q = ''; } else if (ch === '"' || ch === "'") q = ch; else if (ch === '#' && (i === 0 || /\s/.test(l[i - 1]))) return l.slice(0, i); } return l; };
  const L = []; let bk = -1;   /* linie bloku | i > zostają dosłownie (także # i puste) */
  for (const raw of t.split('\n')) { const ri = raw.length - raw.trimStart().length; if (bk >= 0 && (!raw.trim() || ri > bk)) { L.push({ raw, ind: bk + 1, txt: raw.trim(), blk: 1 }); continue; } bk = -1;
    const c = cut(raw).replace(/\s+$/, ''), x = { raw, ind: c.length - c.trimStart().length, txt: c.trim() }; if (!x.txt || x.txt === '---') continue; L.push(x); if (/:\s+[|>][-+]?$/.test(x.txt)) bk = x.ind; }
  let i = 0;
  const sc = (v) => { v = String(v).trim(); if (v === '' || /^(null|~)$/.test(v)) return null; if (/^".*"$/.test(v)) return JSON.parse(v); if (/^'.*'$/.test(v)) return v.slice(1, -1).replace(/''/g, "'");
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true'; if (/^-?\d+(\.\d+)?$/.test(v)) return +v;
    if (/^\[.*\]$/.test(v)) return v.slice(1, -1).split(',').map((x) => x.trim()).filter((x) => x !== '').map(sc);
    if (/^\{.*\}$/.test(v)) { const o = {}; for (const p of v.slice(1, -1).split(',')) { const m = p.match(/^\s*([^:]+):\s*(.*)$/); if (m) o[sc(m[1])] = sc(m[2]); } return o; } return v; };
  const isSeq = (x) => x.txt === '-' || x.txt.startsWith('- ');
  const block = (ind) => {
    if (isSeq(L[i])) { const a = []; while (i < L.length && L[i].ind === ind && isSeq(L[i])) { const rest = L[i].txt.slice(1).trimStart();
        if (!rest) { i++; a.push(i < L.length && L[i].ind > ind ? block(L[i].ind) : null); }
        else if (/^[^"'[{][^:]*:(\s|$)/.test(rest)) { L[i] = { raw: L[i].raw, ind: ind + L[i].txt.length - rest.length, txt: rest }; a.push(block(L[i].ind)); }
        else { a.push(sc(rest)); i++; } } return a; }
    const o = {}; while (i < L.length && L[i].ind === ind && !isSeq(L[i])) { const m = L[i].txt.match(/^("[^"]*"|'[^']*'|[^:]+?):(?:\s+(.*))?$/); if (!m) throw new Error('YAML: ' + L[i].txt);
      const k = sc(m[1]), v = (m[2] || '').trim(); i++;
      if (/^[|>][-+]?$/.test(v)) { const P = []; let bi = -1; while (i < L.length && L[i].blk) { const r = L[i].raw; if (bi < 0 && r.trim()) bi = r.length - r.trimStart().length; P.push(r.slice(Math.max(0, bi))); i++; } while (P.length && !P[P.length - 1].trim()) P.pop(); o[k] = P.join(v[0] === '|' ? '\n' : ' '); }
      else if (v) o[k] = sc(v);
      else if (i < L.length && (L[i].ind > ind || (L[i].ind === ind && isSeq(L[i])))) o[k] = block(L[i].ind);
      else o[k] = null; }
    return o; };
  const r = block(L[0].ind); if (i < L.length) throw new Error('YAML: ' + L[i].txt); return r; };
/* karta z YAML/JSON HA: kontener HA -> kontener Nuvio, inna karta HA -> owinięta w stos bez szkła (panel montuje karty Nuvio) */
const hgHaCard = (v) => { let c = null; try { c = hgYaml((v.o || {}).src); } catch (e) { c = null; } return c && typeof c === 'object' && !Array.isArray(c) && c.type ? hgFromHA(c) : null; };
const hgHaTag = (c) => (c && /^custom:/.test(c.type) && /-(stack|grid|tabs)-card$/.test(c.type) ? c.type.slice(7) : null);
/* dziecko kontenera z formularza komponentu (nv_* = dane do ponownej edycji, karta ich nie widzi) */
const hgKidCfg = (C, R, h) => { const n = R.n, i = /^mdi:[a-z0-9-]+$/.test(R.i || '') ? R.i : '', meta = { nv_comp: C.id, nv_v: JSON.parse(JSON.stringify(R.v || {})), ...(n ? { nv_n: n } : {}), ...(i ? { nv_i: i } : {}) };
  if (C.id === 'hacard') { const c = hgHaCard(R.v); return c ? Object.assign({}, c, meta) : null; }
  if (C.tile) return Object.assign({ type: 'custom:hg-tiles-card', single: Object.assign({ e: R.v.e }, R.t && R.t !== C.tile ? { t: R.t } : {}, n ? { n } : {}, i ? { i } : {}) }, meta, R.t ? { nv_t: R.t } : {});
  return Object.assign({ type: 'custom:' + hgCompCard(C, R.v) }, hgCompCfg(C, R.v, h), n ? { title: n, name: n } : {}, i ? { icon: i } : {}, meta); };
/* pozycja panelu (L.added) -> dziecko kontenera i z powrotem */
const hgAddedToKid = (x) => { const meta = { nv_comp: x.comp, nv_v: x.v ? JSON.parse(JSON.stringify(x.v)) : { e: x.e }, ...(x.n ? { nv_n: x.n } : {}), ...(x.i ? { nv_i: x.i } : {}), ...(x.t ? { nv_t: x.t } : {}) };
  if (!x.c) return Object.assign({ type: 'custom:hg-tiles-card', single: Object.assign({ e: x.e }, x.t ? { t: x.t } : {}, x.n ? { n: x.n } : {}, x.i ? { i: x.i } : {}) }, meta);
  return Object.assign({ type: 'custom:' + x.c }, x.cfg, x.n ? { title: x.n, name: x.n } : {}, x.i ? { icon: x.i } : {}, meta); };
const hgKidToAdded = (k) => { const C = HG_COMP.find((c) => c.id === k.nv_comp), clean = (o) => { const r = {}; for (const q in o) if (!/^nv_/.test(q) && q !== 'type' && q !== 'span') r[q] = o[q]; return r; };
  if (C && C.tile && k.single) return Object.assign({ e: k.single.e, comp: C.id }, k.single.t ? { t: k.single.t } : {}, k.nv_n ? { n: k.nv_n } : {}, k.nv_i ? { i: k.nv_i } : {});
  const key = 'c:' + (C ? C.id : 'vstack') + ':' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  if (C && C.id !== 'hacard' && /^custom:/.test(k.type)) return Object.assign({ e: key, c: k.type.slice(7), comp: C.id, cfg: clean(k), v: k.nv_v || {} }, k.nv_n ? { n: k.nv_n } : {}, k.nv_i ? { i: k.nv_i } : {});
  const kid = Object.assign({}, k); delete kid.span; const cfg = { direction: 'vertical', glass: false, divider: false, cards: [kid] };   // karta HA: w stosie bez szkła
  return { e: key, c: 'hg-stack-card', comp: 'vstack', cfg, v: { cards: [kid], o: { flat: true, nodiv: true } } }; };
const hgKidName = (k) => { const C = HG_COMP.find((c) => c.id === k.nv_comp); return k.nv_n || k.title || k.name || (C && C.n) || String(k.type || '').replace(/^custom:/, ''); };
const hgKidIcon = (k) => { const C = HG_COMP.find((c) => c.id === k.nv_comp); return k.nv_i || k.icon || (C && C.i) || 'mdi:card-outline'; };
const HG_CM = window.__hgCm || (window.__hgCm = new Map());   /* klucz dodanego komponentu -> { c, cfg } (do montowania w slotach) */
const hgCmHtml = (x, sz) => { HG_CM.set(x.e, { c: x.c, cfg: Object.assign({}, x.cfg, x.n ? { title: x.n, name: x.n } : {}, x.i ? { icon: x.i } : {}) });
  return `<div class="hgtl k-card ${HGL.szc(sz)}" data-hgk="${H.esc(x.e)}"><div class="cmslot" data-cm="${H.esc(x.e)}"></div></div>`; };
const hgCmSlots = (card) => { const h = card._hass; card._cmM = card._cmM || new Map();
  for (const slot of card.$.querySelectorAll('.cmslot[data-cm]')) { const k = slot.dataset.cm, m = HG_CM.get(k); if (!m || !customElements.get(m.c)) continue; const sig = k + JSON.stringify(m.cfg); let el = card._cmM.get(sig);
    if (!el) { el = document.createElement(m.c); try { el.setConfig(Object.assign({ type: 'custom:' + m.c }, m.cfg)); } catch (e) { /* zła konfiguracja – pusta karta */ } card._cmM.set(sig, el); }
    if (el.parentElement !== slot) slot.appendChild(el); el.hass = h; } };
/* ===== makiety podglądu w galerii „Dodaj komponent”: przykładowe dane, ten sam system wizualny (szkło, akcent, czarny na akcencie) ===== */
const HG_MOCK_CSS = `
.mk{ position:absolute; inset:0; display:flex; flex-direction:column; justify-content:center; gap:6px; padding:10px 12px; box-sizing:border-box; color:inherit; font-size:11px; line-height:1.2; }
.mk-tag{ position:absolute; right:8px; bottom:5px; font-size:9px; letter-spacing:.04em; text-transform:uppercase; opacity:.5; font-weight:600; }
.mk-g{ background:rgba(255,255,255,.10); border-radius:10px; box-shadow:inset 0 0 0 1px rgba(255,255,255,.10); }
.mk-r{ display:flex; align-items:center; gap:8px; min-width:0; } .mk-r > span{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.mk ha-icon{ width:16px; height:16px; --mdc-icon-size:16px; flex:none; } .mk-r > span.mk-ic, .mk-r > span.mk-sw, .mk-r > span.mk-art, .mk-r > span.mk-cir{ flex:none; overflow:visible; }
.mk-ic{ flex:none; width:24px; height:24px; border-radius:8px; display:grid; place-items:center; background:rgba(255,255,255,.12); } .mk-ic ha-icon{ width:15px; height:15px; --mdc-icon-size:15px; }
.mk-on .mk-ic, .mk-ic.on{ background:var(--hg-accent); color:var(--hg-on-accent, #111); }
.mk-sw{ flex:none; width:26px; height:15px; border-radius:8px; background:rgba(255,255,255,.22); position:relative; } .mk-sw::after{ content:''; position:absolute; left:2px; top:2px; width:11px; height:11px; border-radius:50%; background:#fff; transition:transform .3s; }
.mk-sw.on{ background:var(--hg-accent); } .mk-sw.on::after{ transform:translateX(11px); background:var(--hg-on-accent, #111); }
.mk-v{ font-size:22px; font-weight:600; letter-spacing:-.02em; } .mk-v small{ font-size:11px; opacity:.6; font-weight:500; margin-left:2px; }
.mk-s{ opacity:.6; font-size:10px; }
.mk-tr{ height:10px; border-radius:6px; background:rgba(255,255,255,.14); overflow:hidden; } .mk-tr i{ display:block; height:100%; width:var(--w,60%); background:var(--hg-accent); border-radius:inherit; transform-origin:left; animation:mkFill 1.1s cubic-bezier(.2,.8,.2,1) both; }
@keyframes mkFill{ from{ transform:scaleX(.15); } }
.mk-btn{ display:inline-flex; align-items:center; justify-content:center; gap:5px; height:26px; padding:0 12px; border-radius:13px; background:var(--hg-accent); color:var(--hg-on-accent, #111); font-weight:600; font-size:11px; }
.mk-btn.gh{ background:rgba(255,255,255,.12); color:inherit; } .mk-btn ha-icon{ width:14px; height:14px; --mdc-icon-size:14px; }
.mk-chip{ display:flex; align-items:center; justify-content:space-between; height:28px; padding:0 10px; border-radius:10px; background:rgba(255,255,255,.10); box-shadow:inset 0 0 0 1px var(--hg-accent); }
.mk-st{ display:flex; align-items:center; justify-content:space-between; gap:8px; } .mk-st b{ font-size:20px; font-weight:600; }
.mk-cir{ width:28px; height:28px; border-radius:50%; display:grid; place-items:center; background:rgba(255,255,255,.12); font-size:16px; font-weight:600; } .mk-cir.on{ background:var(--hg-accent); color:var(--hg-on-accent, #111); }
.mk svg{ display:block; overflow:visible; } .mk .acc{ stroke:var(--hg-accent); } .mk .accf{ fill:var(--hg-accent); }
.mk-dash{ stroke-dasharray:120; animation:mkArc 1.2s cubic-bezier(.2,.8,.2,1) both; } @keyframes mkArc{ from{ stroke-dashoffset:120; } }
.mk-grid{ display:grid; grid-template-columns:repeat(var(--c,3), minmax(0,1fr)); gap:5px; }
.mk-sc{ height:30px; border-radius:9px; display:grid; place-items:center; background:rgba(255,255,255,.10); } .mk-sc.on{ background:var(--hg-accent); color:var(--hg-on-accent, #111); } .mk-sc ha-icon{ width:15px; height:15px; --mdc-icon-size:15px; }
.mk-cam{ border-radius:10px; background:linear-gradient(160deg, #4a5a68, #222c35); position:relative; overflow:hidden; } .mk-cam::before{ content:''; position:absolute; left:10%; right:30%; bottom:0; height:45%; background:linear-gradient(#3d4a3a, #2a3428); clip-path:polygon(0 100%, 30% 20%, 55% 60%, 75% 10%, 100% 100%); opacity:.8; }
.mk-live{ position:absolute; left:6px; top:6px; display:flex; align-items:center; gap:4px; font-size:9px; font-weight:700; padding:2px 6px; border-radius:6px; background:rgba(0,0,0,.45); color:#fff; } .mk-live i{ width:6px; height:6px; border-radius:50%; background:#ff5a5a; animation:mkBlink 1.4s infinite; }
@keyframes mkBlink{ 50%{ opacity:.3; } }
.mk-art{ flex:none; width:42px; height:42px; border-radius:10px; background:linear-gradient(135deg, var(--hg-accent), #2a6cff); }
.mk-av{ width:26px; height:26px; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:700; color:#111; box-shadow:0 0 0 2px rgba(0,0,0,.25); }
.mk-map{ border-radius:10px; background:repeating-linear-gradient(35deg, rgba(255,255,255,.05) 0 8px, transparent 8px 16px), linear-gradient(160deg, #2c3a44, #1d262d); position:relative; }
.mk-pin{ position:absolute; width:12px; height:12px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); background:var(--hg-accent); box-shadow:0 0 0 3px color-mix(in srgb, var(--hg-accent) 30%, transparent); }
.mk-fl{ stroke-width:2.2; stroke-dasharray:0 6; animation:mkFl .5s linear infinite; } @keyframes mkFl{ to{ stroke-dashoffset:-6; } }
@media (prefers-reduced-motion:reduce){ .mk *{ animation:none !important; } }
`;
const hgMockHtml = (id) => { const I = (i) => H.icon(i), tag = `<span class="mk-tag">${hgTr('Podgląd', 'Preview')}</span>`;
  const spark = (pts, fill) => `<svg viewBox="0 0 100 34" preserveAspectRatio="none" style="width:100%;height:36px">${fill ? `<path d="M0 34 L${pts} L100 34Z" class="accf" opacity=".18"/>` : ''}<polyline points="${pts}" fill="none" class="acc mk-dash" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  const M = {
    glance: `<div style="display:flex;justify-content:space-around">${[['mdi:lightbulb', 1], ['mdi:lock', 0], ['mdi:door', 0], ['mdi:fan', 1]].map(([i, on]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><span class="mk-cir ${on ? 'on' : ''}">${I(i)}</span><span class="mk-s">${on ? hgTr('Wł.', 'On') : hgTr('Wył.', 'Off')}</span></div>`).join('')}</div>`,
    stat: `<div class="mk-v">21,4<small>°C</small></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${[['Min', '17,9'], [hgTr('Śr.', 'Avg'), '20,8'], ['Max', '23,1']].map(([l, v]) => `<div class="mk-g" style="padding:4px 6px"><span class="mk-s">${l}</span><br><b>${v}</b></div>`).join('')}</div>`,
    humid: `<div class="mk-r"><span class="mk-cir on" style="width:28px;height:28px">${I('mdi:water-percent')}</span><b style="font-size:18px;font-weight:300">55%</b><span class="mk-s">${hgTr('teraz 48%', 'now 48%')}</span></div>`,
    timer: `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><b style="font-size:22px;font-weight:300;font-variant-numeric:tabular-nums">4:32</b><span style="display:flex;gap:6px"><span class="mk-btn">${I('mdi:pause')}${hgTr('Pauza', 'Pause')}</span><span class="mk-btn gh">${I('mdi:stop')}</span></span></div>`,
    logbook: [['mdi:door', hgTr('Drzwi · otwarte', 'Door · open'), '2 min'], ['mdi:lightbulb', hgTr('Salon · wł.', 'Living room · on'), '9 min'], ['mdi:lock', hgTr('Zamek · zamknięty', 'Lock · locked'), '1 h']].map(([i, t, a]) => `<div class="mk-r"><span class="mk-ic">${I(i)}</span><span>${t}</span><span class="mk-s" style="flex:none">${a}</span></div>`).join(''),
    webpage: `<div style="flex:1;border-radius:10px;background:color-mix(in srgb, currentColor 8%, transparent);display:flex;flex-direction:column;overflow:hidden"><div style="display:flex;gap:4px;padding:5px 7px;opacity:.6">${'<i style="width:6px;height:6px;border-radius:50%;background:currentColor"></i>'.repeat(3)}</div><div style="flex:1;display:grid;place-items:center">${I('mdi:web')}</div></div>`,
    cond: `<div class="mk-r"><span class="mk-ic on">${I('mdi:eye-check-outline')}</span><span>${hgTr('Gdy ktoś jest w domu', 'When someone is home')}</span></div><div style="border-radius:8px;border:1px dashed color-mix(in srgb, currentColor 30%, transparent);padding:6px 8px" class="mk-s">${hgTr('karty pokazane warunkowo', 'cards shown conditionally')}</div>`,
    hacard: `<div style="font:10px ui-monospace,monospace;line-height:1.5;opacity:.85"><div>type: grid</div><div>cards:</div><div>&nbsp;&nbsp;- type: tile</div></div>`,
    grid: `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;flex:1">${'<i style="border-radius:6px;background:currentColor;opacity:.14;min-height:18px"></i>'.repeat(5)}<i style="border-radius:6px;background:var(--hg-accent);opacity:.7"></i></div>`,
    vstack: `<div style="display:flex;flex-direction:column;gap:0;flex:1;border-radius:8px;background:color-mix(in srgb, currentColor 8%, transparent)">${[0, 1, 2].map((i) => `<div class="mk-r" style="padding:4px 6px;${i ? 'border-top:1px solid color-mix(in srgb, currentColor 10%, transparent)' : ''}"><span class="mk-cir${i ? '' : ' on'}" style="width:10px;height:10px"></span><span style="flex:1;height:5px;border-radius:3px;background:currentColor;opacity:.2"></span></div>`).join('')}</div>`,
    hstack: `<div style="display:flex;gap:0;flex:1;border-radius:8px;background:color-mix(in srgb, currentColor 8%, transparent)">${[0, 1, 2].map((i) => `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;${i ? 'border-left:1px solid color-mix(in srgb, currentColor 10%, transparent)' : ''}"><span class="mk-cir${i === 1 ? ' on' : ''}" style="width:12px;height:12px"></span><span style="width:60%;height:5px;border-radius:3px;background:currentColor;opacity:.2"></span></div>`).join('')}</div>`,
    hero: `<div style="font-size:15px;font-weight:600;line-height:1.1">${hgTr('Hej, Anna!', 'Hey, Anna!')}</div><div style="font-size:11px;opacity:.75">${hgTr('Cały dom w jednym miejscu', 'Your whole home in one place')}</div>`,
    toggle: `<div class="mk-r"><span class="mk-cir on" style="width:24px;height:24px">${I('mdi:lightbulb')}</span><span>${hgTr('Kuchnia', 'Kitchen')}</span><span class="mk-sw on"></span></div>`,
    progress: `<div class="mk-r"><b style="font-size:18px;font-weight:300">62%</b><span style="opacity:.6">${hgTr('Średnie', 'Medium')}</span></div><div class="mk-tr" style="height:12px"><i style="--w:62%"></i></div>`,
    arc: `<svg viewBox="0 0 100 52" style="width:80%;margin:0 auto;display:block"><path d="M8 48 A42 42 0 0 1 92 48" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="6" stroke-dasharray="1.5 4"/><path d="M8 48 A42 42 0 0 1 80 18" fill="none" class="acc" stroke-width="6" stroke-dasharray="1.5 4"/></svg>`,
    chart2: spark('0,26 12,22 24,24 36,15 48,18 60,10 72,14 84,6 100,4', 1),
    roomc: `<div class="mk-r"><b style="font-size:18px;font-weight:300">22,5°</b><span></span><span class="mk-sw on"></span></div><div class="mk-tr" style="height:6px"><i style="--w:55%"></i></div>`,
    actions: `<div style="display:flex;gap:6px;justify-content:center">${['mdi:magnify', 'mdi:plus', 'mdi:minus', 'mdi:close'].map((i, n) => `<span class="mk-cir ${n ? '' : 'on'}" style="width:24px;height:24px">${I(i)}</span>`).join('')}</div>`,
    family: `<div class="mk-r"><span>${hgTr('2 z 3 w domu', '2 of 3 at home')}</span>${['A', 'M', 'Z'].map((x) => `<span class="mk-cir" style="width:22px;height:22px;margin-left:-6px">${x}</span>`).join('')}</div>`,
    cover2: `<div class="mk-r"><b style="font-size:18px;font-weight:300">40%</b></div><div class="mk-tr" style="height:10px"><i style="--w:40%"></i></div>`,
    lock: `<div class="mk-r"><span class="mk-cir on" style="width:28px;height:28px">${I('mdi:lock')}</span><span>${hgTr('Zamknięte', 'Locked')}</span></div>`,
    fan: `<div class="mk-r"><span class="mk-cir on" style="width:28px;height:28px">${I('mdi:fan')}</span><b>66%</b></div>`,
    todo: `<div class="mk-r"><span class="mk-cir on" style="width:14px;height:14px"></span><span>${hgTr('Kupić mleko', 'Buy milk')}</span></div><div class="mk-r"><span class="mk-cir" style="width:14px;height:14px"></span><span>${hgTr('Podlać kwiaty', 'Water plants')}</span></div>`,
    slider: `<div class="mk-r"><span>${hgTr('Salon · jasność', 'Living room · brightness')}</span><b>72%</b></div><div class="mk-tr" style="height:14px"><i style="--w:72%"></i></div>`,
    button: `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="mk-cir on" style="width:38px;height:38px">${I('mdi:power')}</span><span>${hgTr('Uruchom', 'Run')}</span></div>`,
    entities: [['mdi:lightbulb', hgTr('Lampa', 'Lamp'), 1], ['mdi:fan', hgTr('Wentylator', 'Fan'), 0], ['mdi:television', 'TV', 1]].map(([i, n, on]) => `<div class="mk-r${on ? ' mk-on' : ''}"><span class="mk-ic">${I(i)}</span><span>${n}</span><span class="mk-sw${on ? ' on' : ''}"></span></div>`).join(''),
    select: `<span class="mk-s">${hgTr('Tryb', 'Mode')}</span><div class="mk-chip"><span>${hgTr('Komfort', 'Comfort')}</span>${I('mdi:chevron-down')}</div>`,
    stepper: `<span class="mk-s">${hgTr('Licznik', 'Counter')}</span><div class="mk-st"><span class="mk-cir">−</span><b>12</b><span class="mk-cir on">+</span></div>`,
    gauge: `<div style="display:grid;place-items:center"><svg viewBox="0 0 100 58" style="width:110px;height:64px"><path d="M10 52 A40 40 0 0 1 90 52" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="9" stroke-linecap="round"/><path d="M10 52 A40 40 0 0 1 78 22" fill="none" class="acc mk-dash" stroke-width="9" stroke-linecap="round"/><text x="50" y="50" text-anchor="middle" font-size="17" font-weight="600" fill="currentColor">64%</text></svg></div>`,
    switch: `<div class="mk-g mk-r mk-on" style="padding:10px"><span class="mk-ic">${I('mdi:lightbulb-on')}</span><span><b>${hgTr('Lampa', 'Lamp')}</b><br><span class="mk-s">${hgTr('Włączone', 'On')}</span></span><span class="mk-sw on"></span></div>`,
    sensor: `<div class="mk-g" style="padding:10px"><div class="mk-r"><span class="mk-ic">${I('mdi:thermometer')}</span><span class="mk-s">${hgTr('Temperatura', 'Temperature')}</span></div><div class="mk-v">21.4<small>°C</small></div></div>`,
    chart: `<div class="mk-r"><span class="mk-s">${hgTr('Wilgotność · 24 h', 'Humidity · 24 h')}</span><b>48%</b></div>${spark('0,24 12,20 24,22 36,14 48,17 60,9 72,13 84,6 100,10', 1)}`,
    climate: `<div style="display:flex;align-items:center;justify-content:center;gap:12px"><span class="mk-cir">‹</span><div style="text-align:center"><div class="mk-s">${hgTr('Grzanie', 'Heating')}</div><div class="mk-v">21<small>°</small></div></div><span class="mk-cir">›</span></div><div class="mk-tr"><i style="--w:55%"></i></div>`,
    cover: `<div class="mk-r"><span class="mk-ic">${I('mdi:window-shutter')}</span><span>${hgTr('Roleta · 40%', 'Blind · 40%')}</span></div><div class="mk-grid"><span class="mk-sc">${I('mdi:arrow-up')}</span><span class="mk-sc">${I('mdi:stop')}</span><span class="mk-sc on">${I('mdi:arrow-down')}</span></div>`,
    run: `<div class="mk-g mk-r" style="padding:10px"><span class="mk-ic on">${I('mdi:play')}</span><span><b>${hgTr('Dobranoc', 'Good night')}</b><br><span class="mk-s">${hgTr('Scena', 'Scene')}</span></span></div>`,
    media1: `<div class="mk-r"><span class="mk-art"></span><span><b>${hgTr('Ulubiony utwór', 'Favourite song')}</b><br><span class="mk-s">${hgTr('Wykonawca', 'Artist')}</span></span></div><div class="mk-tr" style="height:5px"><i style="--w:38%"></i></div>`,
    cam1: `<div class="mk-cam" style="flex:1"><span class="mk-live"><i></i>LIVE</span></div>`,
    scenes: `<div class="mk-grid" style="--c:3">${[['mdi:weather-sunset-up', 1], ['mdi:movie-open', 0], ['mdi:weather-night', 0], ['mdi:home-export-outline', 0], ['mdi:silverware-fork-knife', 0], ['mdi:sofa', 0]].map(([i, on]) => `<span class="mk-sc${on ? ' on' : ''}">${I(i)}</span>`).join('')}</div>`,
    cameras: `<div class="mk-grid" style="--c:2;flex:1">${[0, 1, 2, 3].map((k) => `<div class="mk-cam" style="min-height:34px">${k ? '' : '<span class="mk-live"><i></i>LIVE</span>'}</div>`).join('')}</div>`,
    players: [[hgTr('Salon', 'Living room'), 1], [hgTr('Kuchnia', 'Kitchen'), 0]].map(([n, on]) => `<div class="mk-r"><span class="mk-art" style="width:24px;height:24px;border-radius:7px${on ? '' : ';filter:grayscale(1);opacity:.5'}"></span><span>${n}</span><span class="mk-ic${on ? ' on' : ''}">${I(on ? 'mdi:pause' : 'mdi:play')}</span></div>`).join(''),
    power: `<div class="mk-r"><span class="mk-v">3.42<small>kW</small></span><span></span><span class="mk-s">${hgTr('teraz', 'now')}</span></div><div class="mk-tr"><i style="--w:34%"></i></div>`,
    energy: `<div style="display:flex;align-items:flex-end;gap:5px;height:52px">${[40, 62, 35, 80, 55, 70, 46].map((v, k) => `<i style="flex:1;height:${v}%;border-radius:4px;background:${k === 3 ? 'var(--hg-accent)' : 'rgba(255,255,255,.18)'}"></i>`).join('')}</div><span class="mk-s">${hgTr('Energia · tydzień', 'Energy · week')}</span>`,
    weather: `<div class="mk-r"><span style="font-size:30px;line-height:1">⛅</span><span><span class="mk-v">22<small>°</small></span><br><span class="mk-s">${hgTr('Słonecznie', 'Sunny')}</span></span></div>`,
    people: `<div style="display:flex;gap:6px;justify-content:center">${[['M', '#a3e635'], ['A', '#7dd3fc'], ['Z', '#f9a8d4']].map(([l, c]) => `<span class="mk-av" style="background:${c}">${l}</span>`).join('')}</div><span class="mk-s" style="text-align:center">${hgTr('2 osoby w domu', '2 people home')}</span>`,
    alarm: `<div class="mk-r"><span class="mk-ic on" style="width:34px;height:34px">${I('mdi:shield-check')}</span><span><b>${hgTr('Uzbrojony', 'Armed')}</b><br><span class="mk-s">${hgTr('Poza domem', 'Away')}</span></span></div>`,
    robots: `<div class="mk-r"><span class="mk-ic on" style="width:34px;height:34px;border-radius:50%">${I('mdi:robot-vacuum')}</span><span><b>${hgTr('Sprząta', 'Cleaning')}</b><br><span class="mk-s">${hgTr('Bateria 82%', 'Battery 82%')}</span></span></div><div class="mk-tr" style="height:5px"><i style="--w:60%"></i></div>`,
    agenda: [['09:00', hgTr('Spotkanie', 'Meeting')], ['18:30', hgTr('Trening', 'Workout')]].map(([t, n], k) => `<div class="mk-r"><i style="flex:none;width:3px;height:22px;border-radius:2px;background:${k ? 'rgba(255,255,255,.3)' : 'var(--hg-accent)'}"></i><span><b>${n}</b><br><span class="mk-s">${t}</span></span></div>`).join(''),
    ac: `<div style="display:flex;align-items:center;justify-content:center;gap:12px"><span class="mk-cir">−</span><div style="text-align:center"><div class="mk-s">${hgTr('Chłodzenie', 'Cooling')}</div><span class="mk-v">22<small>°</small></span></div><span class="mk-cir on">+</span></div>`,
    week: `<div style="display:flex;align-items:flex-end;gap:5px;height:52px">${[50, 72, 40, 66, 58, 80, 45].map((v) => `<i style="flex:1;height:${v}%;border-radius:4px;background:var(--hg-accent,#63D71E);opacity:.8"></i>`).join('')}</div><span class="mk-s">${hgTr('Ostatnie 7 dni', 'Last 7 days')}</span>`,
    phases: ['L1', 'L2', 'L3'].map((l, k) => `<div class="mk-r"><span class="mk-s">${l}</span><div class="mk-tr" style="flex:1"><i style="--w:${[42, 68, 25][k]}%"></i></div><b>${[1.2, 2.1, 0.7][k]} kW</b></div>`).join(''),
    flow: `<svg viewBox="0 0 100 62" style="width:100%;height:100%;max-height:96px"><g fill="none" stroke-linecap="round"><path d="M22 31 L78 31" stroke="#5AA2FF" stroke-opacity=".35" stroke-width=".8"/><path d="M44 15 Q18 11 14 23" stroke="#F5B53D" stroke-opacity=".35" stroke-width=".8"/><path d="M56 15 Q82 11 86 23" stroke="#F5B53D" stroke-opacity=".35" stroke-width=".8"/><path d="M56 47 Q82 51 86 39" stroke="#A78BFA" stroke-opacity=".35" stroke-width=".8"/>
      <path class="mk-fl" d="M56 15 Q82 11 86 23" stroke="#F5B53D"/><path class="mk-fl" d="M44 15 Q18 11 14 23" stroke="#F5B53D"/><path class="mk-fl" d="M56 47 Q82 51 86 39" stroke="#A78BFA"/></g>
      ${[[50, 9, '#F5B53D', '2,8'], [14, 31, '#5AA2FF', '0,9'], [86, 31, 'var(--hg-accent)', '2,4'], [50, 53, '#A78BFA', '76%']].map(([x, y, c, t]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="rgba(255,255,255,.10)" stroke="${c}" stroke-width="1.4"/><text x="${x}" y="${y + 1.8}" text-anchor="middle" font-size="5.2" font-weight="600" fill="currentColor">${t}</text>`).join('')}</svg>`,
    pv: `<div class="mk-r"><span class="mk-ic on">${I('mdi:solar-power-variant')}</span><span class="mk-v">4.8<small>kW</small></span></div><div class="mk-r"><span class="mk-s">${hgTr('Dziś', 'Today')}</span><b>21.4 kWh</b></div>`,
    net: `<div class="mk-r"><span class="mk-ic on">${I('mdi:web')}</span><span><b>${hgTr('Online', 'Online')}</b><br><span class="mk-s">↓ 512 · ↑ 98 Mb/s</span></span></div>`,
    sensors: [['mdi:motion-sensor', hgTr('Ruch · korytarz', 'Motion · hall'), 1], ['mdi:door-closed', hgTr('Drzwi wejściowe', 'Front door'), 0]].map(([i, n, on]) => `<div class="mk-r${on ? ' mk-on' : ''}"><span class="mk-ic${on ? ' on' : ''}">${I(i)}</span><span>${n}</span></div>`).join(''),
    link: `<div class="mk-g mk-r" style="padding:10px"><span class="mk-ic on">${I('mdi:open-in-new')}</span><span><b>${hgTr('Ustawienia', 'Settings')}</b><br><span class="mk-s">${hgTr('Otwórz', 'Open')}</span></span></div>`,
    person: `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="mk-av" style="background:#a3e635;width:40px;height:40px">M</span><span class="mk-s">${hgTr('W domu', 'Home')}</span></div>`,
    rooms: `<div class="mk-grid" style="--c:2">${[[hgTr('Salon', 'Living'), '21.5°', 'mdi:sofa'], [hgTr('Kuchnia', 'Kitchen'), '22.1°', 'mdi:stove'], [hgTr('Sypialnia', 'Bedroom'), '19.8°', 'mdi:bed'], [hgTr('Łazienka', 'Bath'), '23.0°', 'mdi:shower']].map(([n, t, i]) => `<div class="mk-g" style="padding:6px"><span class="mk-ic">${I(i)}</span> <b>${n}</b><br><span class="mk-s">${t} · 48%</span></div>`).join('')}</div>`,
    room: `<div class="mk-r"><span class="mk-ic on">${I('mdi:sofa')}</span><b>${hgTr('Salon', 'Living room')}</b></div><div class="mk-grid" style="--c:3"><span class="mk-sc">${I('mdi:lightbulb')}</span><span class="mk-sc">${I('mdi:television')}</span><span class="mk-sc">${I('mdi:thermometer')}</span></div>`,
    appliance: `<div class="mk-r"><span class="mk-ic on">${I('mdi:washing-machine')}</span><span><b>${hgTr('Pralka · Bawełna', 'Washer · Cotton')}</b><br><span class="mk-s">${hgTr('jeszcze 42 min', '42 min left')}</span></span></div><div class="mk-tr"><i style="--w:64%"></i></div>`,
    cwu: `<div class="mk-r"><span class="mk-ic on">${I('mdi:water-boiler')}</span><span class="mk-v">52<small>°C</small></span></div><div class="mk-tr"><i style="--w:70%"></i></div><span class="mk-s">${hgTr('Grzanie · 1.9 kW', 'Heating · 1.9 kW')}</span>`,
    stairs: `<div class="mk-r"><span class="mk-ic on">${I('mdi:stairs-up')}</span><span><b>${hgTr('Schody', 'Stairs')}</b><br><span class="mk-s">${hgTr('dół → góra', 'bottom → top')}</span></span></div>`,
    fuel: [['PB95', '6.29'], ['ON', '6.41'], ['LPG', '2.99']].map(([l, v]) => `<div class="mk-r"><span class="mk-chip"><span>${l}</span></span><b>${v} zł</b></div>`).join(''),
    map: `<div class="mk-map" style="flex:1"><span class="mk-pin" style="left:30%;top:35%"></span><span class="mk-pin" style="left:66%;top:52%;filter:hue-rotate(160deg)"></span></div>`,
  };
  return `<div class="mk" aria-hidden="true">${M[id] || `<div style="display:grid;place-items:center;opacity:.5">${I('mdi:card-outline')}</div>`}${tag}</div>`; };
/* podgląd na żywo tylko z dobrą encją: wszystkie domyślne encje mają znany stan */
const hgPvGood = (h, v) => { if (window.__hgPvMock) return false; const es = []; for (const x of Object.values(v || {})) for (const y of [].concat(x)) { const e = typeof y === 'string' ? y : y && y.entity; if (e) es.push(e); }
  return es.length > 0 && es.every((e) => { const s = h.states[e]; return s && !['unknown', 'unavailable', ''].includes(s.state); }); };
const HG_COMP_CSS = `
.cgh{ margin:18px 2px 10px; font-size:13px; font-weight:600; letter-spacing:.02em; display:flex; flex-direction:column; gap:2px; } .cgh small{ font-size:12px; font-weight:400; opacity:.62; letter-spacing:0; } .cq + .cgh{ margin-top:14px; }
.cg{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:10px; } @media (max-width:560px){ .cg{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
.cg button{ all:unset; cursor:pointer; box-sizing:border-box; display:flex; flex-direction:column; gap:8px; padding:8px; border-radius:20px; background:var(--hg-tile-bg); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent); transition:transform .15s, box-shadow .15s; min-width:0; }
.cg button:hover:not(.na){ transform:translateY(-2px); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--hg-accent) 60%, transparent), 0 10px 24px rgba(0,0,0,.18); } .cg button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.cg .th{ position:relative; height:112px; flex:none; border-radius:14px; overflow:hidden; background:color-mix(in srgb, currentColor 6%, transparent); pointer-events:none; } .cg .th > .tg2, .cg .th > .cmf{ position:absolute; left:0; top:0; width:250%; transform:scale(.4); transform-origin:top left; }
.cg .th .ph{ position:absolute; inset:0; display:grid; place-items:center; } .cg .th .ph ha-icon{ width:34px; height:34px; opacity:.5; }
.cg b{ font-size:14px; font-weight:600; display:flex; align-items:center; gap:6px; } .cg b ha-icon{ width:18px; height:18px; opacity:.75; flex:none; } .cg small{ font-size:12px; opacity:.66; line-height:1.3; }
.cg{ grid-auto-rows:1fr; } .cg button{ min-width:0; } .cg b > span{ min-width:0; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; line-height:1.2; overflow-wrap:anywhere; }
.cg .cd{ display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; }
.cg .cna{ display:flex; align-items:center; gap:5px; margin-top:auto; font-size:11.5px; opacity:.85; font-weight:600; } .cg .cna ha-icon{ width:14px; height:14px; --mdc-icon-size:14px; flex:none; }
.cg .cdom{ font-size:10.5px; opacity:.45; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:-4px; }
.cg button.na{ opacity:1 !important; filter:none !important; } .cg button.na .th{ filter:saturate(.35); opacity:.7; } .cg button.na b, .cg button.na .cd{ opacity:.8; }
.cg .th.live{ background:transparent; }
.cg .th .mk{ animation:mkIn .35s cubic-bezier(.2,.8,.2,1) both; } @keyframes mkIn{ from{ transform:translateY(4px); opacity:.0; } }
@media (max-width:520px){ .cg .th{ height:96px; } .mk{ padding:8px 10px; } .mk-v{ font-size:19px; } }
.cg .na{ opacity:.48; cursor:default; } .cg .na small em{ font-style:normal; display:block; margin-top:3px; color:inherit; opacity:.95; }
.cq{ display:flex; gap:8px; align-items:center; } .cq .hs-s{ flex:1; }
.hs-pvb .cmf{ display:block; } .hs-pvf .cmf{ display:block; }
.hs-h b{ display:flex; align-items:center; gap:8px; } .hs-h b ha-icon, .cq > button > ha-icon{ width:22px; height:22px; --mdc-icon-size:22px; flex:none; opacity:.8; } .cq > button{ gap:12px; }
.cg .th > .tg2, .cg .th > .cmf{ width:182% !important; transform:scale(.55) !important; }
`;
/* lista encji bez duplikatów (po entity id; wpisy bez encji zostają) */
const hgDedupArr = (A) => { if (!Array.isArray(A)) return A; const s = new Set(); return A.filter((y) => { const e = typeof y === 'string' ? y : y && y.entity; if (!e) return true; if (s.has(e)) return false; s.add(e); return true; }); };
const hgDedupConf = (L) => { let ch = false; for (const cf of Object.values(L.conf || {})) { if (!cf || !cf.set) continue; for (const [k, v] of Object.entries(cf.set)) { const d = hgDedupArr(v); if (Array.isArray(v) && d.length !== v.length) { cf.set[k] = d; ch = true; } } }
  for (const x of L.added || []) for (const k of Object.keys(x.cfg || {})) { const v = x.cfg[k]; const d = hgDedupArr(v); if (Array.isArray(v) && d.length !== v.length) { x.cfg[k] = d; if (x.v && Array.isArray(x.v[k])) x.v[k] = hgDedupArr(x.v[k]); ch = true; } } return ch; };
/* pusty wrapper (karta bez treści po usunięciu / bez danych) – bez uchwytów, zwinięty; wraca, gdy treść się pojawi */
const hgIsGhost = (it) => { let hgt = 0; for (const c of it.children) { if (c.classList.contains('hge') || c.tagName === 'STYLE') continue; hgt += c.offsetHeight; } return hgt < 8 && !it.querySelector('.cmslot'); };
const hgCleanL = (L) => { let ch = false; const uq = (a) => { const r = [...new Set(a)]; if (r.length !== a.length) ch = true; return r; };
  L.hidden = uq(L.hidden || []); L.order = uq(L.order || []); const seen = new Set(); L.added = (L.added || []).filter((x) => { if (!x || !x.e || seen.has(x.e)) { ch = true; return false; } seen.add(x.e); return true; }); return ch; };
const HG_HEAD_LIM = { t: 28, s: 48 };
const HG_COMP_EDIT = {
  _eHeadBtn() { const hd = this._headEl; if (!hd || this._config.room_head || hd.querySelector('.hge-hd')) return; const h1 = hd.querySelector('h1'); if (!h1) return;
    const b = document.createElement('button'); b.className = 'hge-hd'; b.dataset.hge = 'headedit'; b.setAttribute('aria-label', hgTr('Edytuj tytuł i podtytuł', 'Edit title and subtitle')); b.title = hgTr('Edytuj tytuł i podtytuł', 'Edit title and subtitle'); b.innerHTML = H.icon('mdi:pencil'); hd.insertBefore(b, h1.nextSibling); },
  _eHeadGet() { return Object.assign({}, (HGL.get(this._pageScope()).conf || {})._head || {}); },
  _eHead() { this._eStk = []; this._eShT = (this._eShT || 0) + 1; this._eShSnap = null; const c = this._config, H0 = this._eHeadGet(), ui = this._userInfo(); this._eSheet('cfg'); const S = this._eSheetEl; this._eHd = H0;
    const fld = (k, l, ph, lim) => `<label class="hs-fl"><span>${l} <em class="hd-c" data-c="${k}">${(H0[k] || '').length}/${lim}</em></span><span class="hs-s"><input class="hs-in" name="${k}" maxlength="${lim}" value="${H.esc(H0[k] || '')}" placeholder="${H.esc(ph)}" autocomplete="off"></span></label>`;
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${hgTr('Tytuł widoku', 'View title')}"><style>${HG_STY_CSS}
      .hd-c{ font-style:normal; opacity:.55; font-size:11px; margin-left:6px; } .hd-c.ov{ color:#FF6B6B; opacity:1; } .hd-pv{ display:grid; grid-template-columns:1.6fr 1.1fr .8fr; gap:10px; align-items:start; } @media (max-width:560px){ .hd-pv{ grid-template-columns:1fr; } }
      .hd-d{ border-radius:16px; padding:12px; background:var(--hg-tile-bg); min-width:0; } .hd-d small{ display:block; font-size:11px; opacity:.55; margin-bottom:6px; } .hd-d b{ display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; font-weight:600; line-height:1.18; } .hd-d p{ margin:4px 0 0; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; opacity:.85; line-height:1.2; }
      .hd-d.d b{ font-size:20px; } .hd-d.d p{ font-size:17px; } .hd-d.t b{ font-size:17px; } .hd-d.t p{ font-size:14px; } .hd-d.m b{ font-size:15px; } .hd-d.m p{ font-size:12.5px; }
      .hd-v{ display:none; } .hd-v.on{ display:block; } .hd-hint{ font-size:12px; opacity:.6; margin:-4px 0 4px; }</style>
      <div class="hs-h"><b>${hgTr('Tytuł i podtytuł', 'Title and subtitle')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>${hgTr('Podgląd na urządzeniach', 'Preview on devices')}</small><div class="hd-pv"></div></div>
      ${fld('t', hgTr('Tytuł', 'Title'), c.title, HG_HEAD_LIM.t)}${fld('s', hgTr('Podtytuł', 'Subtitle'), c.subtitle, HG_HEAD_LIM.s)}
      <p class="hd-hint">${hgTr(`Wstaw {name}, aby pokazać imię zalogowanej osoby (teraz: ${H.esc(ui.first || 'brak')}).`, `Insert {name} to show the signed-in person's first name (now: ${H.esc(ui.first || 'none')}).`)}</p>
      <button class="hs-r hs-add" data-hge="hdvar"><span class="hs-i">${H.icon('mdi:cellphone-link')}</span><span class="hs-t"><b>${hgTr('Krótsze wersje dla telefonu i tabletu', 'Shorter versions for phone and tablet')}</b><small>${hgTr('Opcjonalne – puste pola używają wersji głównej', 'Optional – empty fields use the main version')}</small></span></button>
      <div class="hd-v${H0.tm || H0.sm || H0.tt || H0.st ? ' on' : ''}">${fld('tt', hgTr('Tytuł – tablet', 'Title – tablet'), hgTr('jak główny', 'same as main'), HG_HEAD_LIM.t)}${fld('st', hgTr('Podtytuł – tablet', 'Subtitle – tablet'), hgTr('jak główny', 'same as main'), HG_HEAD_LIM.s)}${fld('tm', hgTr('Tytuł – telefon', 'Title – phone'), hgTr('jak główny', 'same as main'), 22)}${fld('sm', hgTr('Podtytuł – telefon', 'Subtitle – phone'), hgTr('jak główny', 'same as main'), 36)}</div>
      </div>${this._panel ? `<div class="hs-fl"><span>${hgTr('Szerokość panelu', 'Panel width')}</span>${hgPwPick(this._pwCur(), 'pw')}</div>` : ''}<style>${HG_PW_CSS}</style>
      <div class="hs-ac"><button class="hs-b2" data-hge="hdreset">${hgTr('Przywróć domyślne', 'Restore defaults')}</button><button class="hs-b" data-hge="hdok">${hgTr('Zapisz', 'Save')}</button></div></div>`;
    for (const i of S.querySelectorAll('input.hs-in')) i.addEventListener('input', () => this._eHeadPv());
    this._eHeadPv(); },
  _eHeadVals() { const S = this._eSheetEl, o = {}; for (const i of S.querySelectorAll('input.hs-in')) { const v = i.value.trim(); if (v) o[i.name] = v; } return o; },
  _eHeadPv() { const S = this._eSheetEl, c = this._config, V = this._eHeadVals(), nm = this._userInfo().first || '';
    for (const i of S.querySelectorAll('input.hs-in')) { const ce = S.querySelector(`.hd-c[data-c="${i.name}"]`); if (ce) { ce.textContent = i.value.length + '/' + i.maxLength; ce.classList.toggle('ov', i.value.length >= i.maxLength); } }
    const r = (s) => H.esc(String(s || '').replace(/\{name\}/g, nm)), one = (cls, l, t, s) => `<div class="hd-d ${cls}"><small>${l}</small><b>${r(t)}</b><p>${r(s)}</p></div>`;
    const T = V.t || c.title, Su = V.s || c.subtitle;
    S.querySelector('.hd-pv').innerHTML = one('d', hgTr('Komputer', 'Desktop'), T, Su) + one('t', hgTr('Tablet', 'Tablet'), V.tt || T, V.st || Su) + one('m', hgTr('Telefon', 'Phone'), V.tm || T, V.sm || Su); },
  _eHeadAct(a) { const sc = this._pageScope();
    if (a === 'hdvar') { this._eSheetEl.querySelector('.hd-v').classList.toggle('on'); return; }
    const V = a === 'hdreset' ? {} : this._eHeadVals();
    this._eSet(sc, (L) => { if (Object.keys(V).length) L.conf._head = V; else delete L.conf._head; });
    this._eSheet(false);
    this._paintHead(); this._eHeadBtn(); this._eToast(a === 'hdreset' ? hgTr('Przywrócono domyślny tytuł', 'Default title restored') : hgTr('Zapisano tytuł', 'Title saved')); },
  _eGhostSweep() { if (!this._eOn && !this.classList.contains('hge')) {} for (const ct of this._eConts()) for (const it of this._eItems(ct)) { const g = hgIsGhost(it), d = it.querySelector(':scope > .hge');
      if (g) { if (d) d.remove(); it.classList.add('hge-ghost'); } else if (it.classList.contains('hge-ghost')) { it.classList.remove('hge-ghost'); } } },
  /* krok 1: galeria komponentów */
  _eGallery(ct, scOver) {
    const kN = (this._eKidStk || []).length, kid = kN > 0; if (!kid) { this._eStk = []; this._eShT = (this._eShT || 0) + 1; this._eShSnap = null; }   /* galeria to poziom główny, bez szkicu; w kontenerze to krok formularza */
    const h = this._hass; this._eSheet('cfg'); const S = this._eSheetEl; const sc = scOver || (ct ? (ct.page ? ct.scope + ':tiles' : ct.scope) : (this._pageScope() + ':tiles')); this._eGalSc = sc; this._eGalCt = ct;
    const room = sc.startsWith('room:') && !kid, list0 = HG_COMP.filter(hgCompOk).filter((C) => !room || C.tile || HG_COMP_BASIC.includes(C.id)),
      lay = room || kN >= HG_CONT_MAX ? [] : list0.filter((C) => C.cat === 'layout'), bas = list0.filter((C) => HG_COMP_BASIC.includes(C.id)), rest = list0.filter((C) => !HG_COMP_BASIC.includes(C.id) && C.cat !== 'layout'), list = [...lay, ...bas, ...rest];
    const card = (C) => { const req = C.slots.filter((x) => x.req), miss = req.find((sl) => !hgSlotCands(h, sl).length);
      const dom = miss ? `${miss.l.toLowerCase()}: ${miss.dom.join(', ')}${miss.dc ? ' · ' + miss.dc.join(', ') : ''}` : '';
      return `<button class="${miss ? 'na' : ''}" role="listitem" data-hge="cgo" data-c="${C.id}"${miss ? ` title="${H.esc(hgTr('Wymaga', 'Needs') + ' ' + dom)}"` : ''}><div class="th" data-th="${C.id}">${hgMockHtml(C.id)}</div><b>${H.icon(C.i)}<span>${H.esc(C.n)}</span></b><small class="cd">${H.esc(C.d)}</small>${miss ? `<small class="cna">${H.icon('mdi:link-variant-off')}<span>${hgTr('Brak pasującej encji', 'No matching entity')}</span></small><small class="cdom">${H.esc(dom)}</small>` : ''}</button>`; };
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${kid ? hgTr('Dodaj do kontenera', 'Add to container') : hgTr('Dodaj komponent', 'Add component')}"><style>${HG_STY_CSS}${HG_COMP_CSS}${HG_MOCK_CSS}</style><div class="hs-h"><b>${kid ? hgTr('Dodaj do kontenera', 'Add to container') : hgTr('Dodaj komponent', 'Add component')}<small style="margin-left:8px;font-weight:500;opacity:.55;font-size:12px" title="${hgTr('Wersja załadowanej paczki', 'Loaded bundle version')}">v${H.esc(String(HG_BUILD).split('+')[0])}</small></b><button class="hs-x" data-hge="sheetclose" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      ${kid ? '' : `<div class="cq"><button class="hs-r" data-hge="cgent" style="min-height:48px">${H.icon('mdi:magnify')}<span class="hs-t"><b>${hgTr('Szukaj encji', 'Search entities')}</b><small>${hgTr('Szybkie dodanie pojedynczej encji jako kafelka', 'Quickly add a single entity as a tile')}</small></span></button></div>`}
      ${lay.length ? `<h4 class="cgh">${hgTr('Układ', 'Layout')}<small>${hgTr('Kontenery jak w HA: siatka, stosy, warunek i karta z YAML', 'Containers like in HA: grid, stacks, conditional and a card from YAML')}</small></h4><div class="cg" role="list">${lay.map(card).join('')}</div>` : ''}
      ${bas.length ? `<h4 class="cgh">${hgTr('Podstawowe', 'Basic')}<small>${hgTr('Uniwersalne elementy dla dowolnych encji', 'General controls for any entity')}</small></h4><div class="cg" role="list">${bas.map(card).join('')}</div>` : ''}
      ${rest.length ? `<h4 class="cgh">${hgTr('Karty', 'Cards')}<small>${hgTr('Gotowe karty dla konkretnych rodzajów urządzeń', 'Ready made cards for specific device types')}</small></h4><div class="cg" role="list">${rest.map(card).join('')}</div>` : ''}</div></div>`;
    /* miniatury na żywo: kafel z pierwszą pasującą encją albo pomniejszona karta */
    requestAnimationFrame(() => { for (const C of list) { const th = S.querySelector(`[data-th="${C.id}"]`); if (!th) continue; const v = this._eCompDef(C); if (!v || (C.slots.length && !hgPvGood(h, v))) continue;   /* bez dobrej encji zostaje makieta */
      const box = document.createElement('div'); if (C.tile) { box.className = 'tg2 one'; box.innerHTML = hgTileHtml(h, v.e, 's', { t: C.tile }); hgSlots({ _hass: h, $: box }); }
      else { box.className = 'cmf'; const cc = hgCompCard(C, v), el = document.createElement(cc); try { el.setConfig(Object.assign({ type: 'custom:' + cc }, hgCompCfg(C, v, h))); el._hgPv = true; } catch (e) { continue; } box.appendChild(el); el.hass = h; }
      th.firstChild.remove(); th.appendChild(box); th.classList.add('live'); } });
  },
  /* domyślne wartości slotów (pierwsze pasujące encje, listy: do 4) */
  _eCompDef(C) { const h = this._hass, v = {};
    for (const sl of C.slots) { let cs = hgSlotCands(h, sl); if (sl.auto === 'none') continue; if (sl.rank) { const m = cs.filter((e) => sl.rank.test(e + ' ' + H.name(h, e))); cs = sl.auto === 'rank' ? m : [...m, ...cs.filter((e) => !m.includes(e))]; } if (!cs.length) { if (sl.req) return null; continue; }
      v[sl.k] = sl.multi ? cs.slice(0, sl.one || (sl.k === 'entities' && C.id === 'power') ? 1 : 4).map((e) => (sl.obj ? { entity: e, name: H.name(h, e), ...(h.states[e].attributes.icon ? { icon: h.states[e].attributes.icon } : {}) } : e)) : cs[0]; }
    return v; },
  /* krok 2: formularz komponentu (dodawanie i edycja – ten sam arkusz) */
  _eComp(cid, st) {
    const h = this._hass, C = HG_COMP.find((x) => x.id === cid); if (!C) return; this._eSheet('cfg'); const S = this._eSheetEl;
    if (!st && !this._eBacking && !(this._eStk || []).length) this._eSnapTake();
    const R = this._eCompR = st || { cid, sc: this._eGalSc, v: this._eCompDef(C) || {}, t: C.tile || '', n: '', i: '', z: HG_COMP_Z[C.id] || 's', ...((this._eKidStk || []).length ? { kid: 1 } : {}) };
    for (const sl of C.slots) if (sl.multi && R.v[sl.k] && !Array.isArray(R.v[sl.k])) R.v[sl.k] = [R.v[sl.k]];   /* zapis sprzed zmiany slotu na listę */
    const ed = !!R.edit && !R.kid, eid = (x) => (typeof x === 'string' ? x : x && x.entity), ico = (e) => (h.states[e] && h.states[e].attributes.icon) || HG_DOM_ICON2[String(e).split('.')[0]] || 'mdi:circle-outline';
    const slot = (sl) => { const v = R.v[sl.k];
      if (!sl.multi) return `<div class="hs-fl"><span>${H.esc(sl.l)}${sl.req ? '' : ''}</span><div class="hs-r hs-er"><button class="hs-eb" data-hge="cslot" data-k="${sl.k}"><span class="hs-i">${H.icon(v ? ico(v) : 'mdi:plus')}</span><span class="hs-t"><b>${H.esc(v ? H.name(h, v) : hgTr('Wybierz encję', 'Choose entity'))}</b><small>${H.esc(v || sl.dom.join(', '))}</small></span><span class="hs-p" title="${hgTr('Zmień', 'Change')}">${H.icon(v ? 'mdi:swap-horizontal' : 'mdi:plus')}</span></button>${v && !sl.req ? `<button class="hs-del" data-hge="cdel" data-k="${sl.k}" aria-label="${hgTr('Usuń', 'Remove')}">${H.icon('mdi:close')}</button>` : ''}</div></div>`;
      const A = v || [];
      return `<div class="hs-fl hs-ents"><span>${H.esc(sl.l)}</span>${A.map((y, i) => `<div class="hs-r hs-er" data-ak="${sl.k}" data-ai="${i}"><span class="hs-dg" data-hgdrag role="button" tabindex="0" aria-label="${hgTr('Przeciągnij lub użyj strzałek, aby zmienić kolejność', 'Drag or use arrow keys to reorder')}">${H.icon('mdi:drag-vertical')}</span><button class="hs-eb" data-hge="cslot" data-k="${sl.k}" data-i="${i}"><span class="hs-i">${H.icon(ico(eid(y)))}</span><span class="hs-t"><b><em class="hs-ix">${i + 1}</em>${H.esc(H.name(h, eid(y)))}</b><small>${H.esc(eid(y))}</small></span><span class="hs-p">${H.icon('mdi:swap-horizontal')}</span></button><button class="hs-del" data-hge="cdel" data-k="${sl.k}" data-i="${i}" aria-label="${hgTr('Usuń', 'Remove')}">${H.icon('mdi:close')}</button></div>`).join('')}
        <button class="hs-r hs-add" data-hge="cslot" data-k="${sl.k}" data-i="${A.length}"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>${hgTr('Dodaj encję', 'Add entity')}</b><small>${H.esc(sl.dom.join(', '))}${sl.dc ? ' · ' + H.esc(sl.dc.join(', ')) : ''}</small></span></button></div>`; };
    const main = C.tile ? R.v.e : null, T = main ? hgTypeOpts(h, main).filter(([t]) => t !== C.tile).length ? hgTypeOpts(h, main) : [[C.tile, hgTr('Normalny', 'Default')]] : null;
    const okReq = C.slots.every((sl) => !sl.req || (sl.multi ? (R.v[sl.k] || []).length : R.v[sl.k]));
    /* dzieci kontenera: kolejność (uchwyt), edycja, kopia, usunięcie, w siatce szerokość */
    const kids = () => { const A = R.v.cards || [], cols = C.id === 'grid' ? Math.max(1, +((R.v.o || {}).columns) || 3) : 0;
      return `<div class="hs-fl hs-ents"><span>${hgTr('Karty w kontenerze', 'Cards in the container')}</span>${A.length ? '' : `<p class="hs-e" style="margin:2px 0 4px;opacity:.7">${hgTr('Pusty kontener. Dodaj pierwszą kartę.', 'Empty container. Add the first card.')}</p>`}${A.map((k, i) => { const K = HG_COMP.find((c) => c.id === k.nv_comp), sp = Math.max(1, +k.span || 1);
        return `<div class="hs-r hs-er" data-ak="cards" data-ai="${i}"><span class="hs-dg" data-hgdrag role="button" tabindex="0" aria-label="${hgTr('Przeciągnij lub użyj strzałek, aby zmienić kolejność', 'Drag or use arrow keys to reorder')}">${H.icon('mdi:drag-vertical')}</span><button class="hs-eb" data-hge="kedit" data-i="${i}"><span class="hs-i">${H.icon(hgKidIcon(k))}</span><span class="hs-t"><b><em class="hs-ix">${i + 1}</em>${H.esc(hgKidName(k))}</b><small>${H.esc(K ? K.n : String(k.type || '').replace(/^custom:/, ''))}${hgIsCont(k) ? ' · ' + (k.cards || []).length + ' ' + hgTr('kart', 'cards') : ''}</small></span><span class="hs-p" title="${hgTr('Edytuj', 'Edit')}">${H.icon('mdi:pencil-outline')}</span></button>${cols > 1 ? `<button class="hs-del" data-hge="kspan" data-i="${i}" title="${hgTr('Szerokość w kolumnach', 'Width in columns')}" aria-label="${hgTr('Szerokość', 'Width')}: ${sp}" style="font:600 12px/1 inherit;width:auto;min-width:36px;padding:0 8px">${sp}×</button>` : ''}${ed ? `<button class="hs-del" data-hge="kout" data-i="${i}" title="${hgTr('Wyjmij na panel', 'Move out to the panel')}" aria-label="${hgTr('Wyjmij na panel', 'Move out to the panel')}">${H.icon('mdi:arrow-top-left-bold-box-outline')}</button>` : ''}<button class="hs-del" data-hge="kdup" data-i="${i}" title="${hgTr('Duplikuj', 'Duplicate')}" aria-label="${hgTr('Duplikuj', 'Duplicate')}">${H.icon('mdi:content-copy')}</button><button class="hs-del" data-hge="kdel" data-i="${i}" title="${hgTr('Usuń', 'Remove')}" aria-label="${hgTr('Usuń', 'Remove')}">${H.icon('mdi:close')}</button></div>`; }).join('')}
        <button class="hs-r hs-add" data-hge="kadd"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>${hgTr('Dodaj kartę', 'Add card')}</b><small>${hgTr('Dowolny komponent, kafelek albo karta z HA', 'Any component, tile or card from HA')}</small></span></button></div>`; };
    const tgts = ed ? (HGL.get(R.sc || this._eGalSc).added || []).filter((x) => x.e !== R.edit && x.v && HG_COMP.some((c) => c.id === x.comp && c.kids)) : [];
    const mv = tgts.length ? `<div class="hs-fl"><span>${hgTr('Przenieś do kontenera', 'Move into a container')}</span><div class="hs-f wrap" role="group" aria-label="${hgTr('Przenieś do kontenera', 'Move into a container')}">${tgts.map((x) => { const K = HG_COMP.find((c) => c.id === x.comp); return `<button data-hge="kmove" data-t="${H.esc(x.e)}">${H.icon(x.i || K.i)}${H.esc(x.n || K.n)}</button>`; }).join('')}</div></div>` : '';
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${H.esc(C.n)}"><style>${HG_STY_CSS}${HG_COMP_CSS}</style><div class="hs-h"><b>${H.icon(C.i)} ${H.esc(C.n)}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>${hgTr('Podgląd na żywo', 'Live preview')}</small><div class="hs-pvb"></div></div>
      ${C.slots.map(slot).join('')}${C.kids ? kids() : ''}
      ${C.modes ? `<div class="hs-fl"><span>${hgTr('Opcje komponentu', 'Component options')}</span><div class="hs-f wrap" role="group" aria-label="${hgTr('Opcje komponentu', 'Component options')}">${C.modes.map(([m, pl, en, ic]) => `<button data-hge="cmod" data-m="${m}" aria-pressed="${(R.v.mode || C.modes[0][0]) === m}">${H.icon(ic)}${H.esc(hgTr(pl, en))}</button>`).join('')}</div></div>` : ''}
      <label class="hs-fl"><span>${hgTr('Nazwa', 'Name')}</span><span class="hs-s"><input class="hs-in" name="n" value="${H.esc(R.n)}" placeholder="${H.esc(main ? H.name(h, main) : C.n)}" autocomplete="off"></span></label>
      <label class="hs-fl"><span>${hgTr('Ikona (np. mdi:sofa)', 'Icon (e.g. mdi:sofa)')}</span><span class="hs-s">${H.icon(R.i || C.i)}<input class="hs-in" name="i" value="${H.esc(R.i)}" placeholder="mdi:…" autocomplete="off"></span></label>
      ${(C.opts || []).map((o) => { const val = (R.v.o || {})[o.k] ?? '', l = hgTr(o.l[0], o.l[1]), a = `data-o="${o.k}"`;
        if (o.t === 'room') { const m = HGAreas.model(h); return hgForm.field(l, hgForm.select([['', hgTr('Z adresu (?area=)', 'From address (?area=)')], ...m.list.map((x) => [x.id, x.name])], val, a)); }
        if (o.t === 'txt') return hgForm.field(l, hgForm.area({ value: val, ph: o.ph, a, code: /YAML|JSON/.test(o.l[1]) }));
        if (o.t === 'bool') return hgForm.toggle(l, !!val, a);
        return hgForm.field(l, hgForm.text({ value: val, ph: o.ph, a, num: o.t === 'num' })); }).join('')}
      ${C.tile ? '' : hgForm.more(hgTr('Zaawansowana konfiguracja (JSON)', 'Advanced configuration (JSON)'), `<small class="nf-hint">${hgTr('Dowolne pola karty, np. etykiety, kolory, progi, akcje. Nadpisują ustawienia powyżej.', 'Any card fields, e.g. labels, colors, thresholds, actions. They override the settings above.')}</small>${hgForm.area({ code: 1, rows: 6, ph: '{ }', value: R.v.x ? JSON.stringify(R.v.x, null, 2) : '', a: 'data-x="1"' }).replace('class="nf-area', 'class="hs-js nf-area')}<small class="hs-jse nf-err" hidden>${hgTr('Niepoprawny JSON', 'Invalid JSON')}</small>`, !!R.v.x)}
      ${R.kid || (R.sc && R.sc.startsWith('room:')) ? '' : `<div class="hs-fl"><span>${hgTr('Rozmiar', 'Size')}</span>${hgSzSeg('cz', R.z)}</div>`}${mv}
      </div><div class="hs-ac"><button class="hs-b2" data-hge="${ed ? 'sheetclose' : 'cback'}">${ed ? hgTr('Anuluj', 'Cancel') : hgTr('Wstecz', 'Back')}</button><button class="hs-b" data-hge="cok" ${okReq ? '' : 'disabled'}>${H.icon(ed || (R.kid && R.edit) ? 'mdi:check' : 'mdi:plus')}<span>${ed || (R.kid && R.edit) ? hgTr('Zapisz', 'Save') : R.kid ? hgTr('Dodaj do kontenera', 'Add to container') : hgTr('Dodaj', 'Add')}</span></button></div></div>`;
    for (const n of S.querySelectorAll('input[name]')) n.addEventListener('input', () => { R[n.name] = n.value.trim(); if (n.name === 'i') { const ic = n.parentElement.querySelector('ha-icon'); if (ic && /^mdi:[a-z0-9-]+$/.test(R.i)) ic.setAttribute('icon', R.i); } this._eCompPv(); });
    for (const n of S.querySelectorAll('[data-o]')) n.addEventListener(n.tagName === 'SELECT' || n.type === 'checkbox' ? 'change' : 'input', () => { R.v = Object.assign({}, R.v, { o: Object.assign({}, R.v.o || {}, { [n.dataset.o]: n.type === 'checkbox' ? n.checked : n.value.trim() }) }); this._eCompPv(); });
    for (const n of S.querySelectorAll('textarea[data-x]')) n.addEventListener('input', () => { const t = n.value.trim(), er = S.querySelector('.hs-jse'), ok = S.querySelector('[data-hge="cok"]'); let x = null, bad = false;
      if (t) try { x = JSON.parse(t); if (!x || typeof x !== 'object' || Array.isArray(x)) bad = true; } catch (e) { bad = true; }
      if (er) er.hidden = !bad; R._xBad = bad; if (ok) ok.disabled = bad || !C.slots.every((sl) => !sl.req || (sl.multi ? (R.v[sl.k] || []).length : R.v[sl.k]));
      if (!bad) { R.v = Object.assign({}, R.v); if (x && Object.keys(x).length) R.v.x = x; else delete R.v.x; this._eCompPv(); } });
    hgIcWire(S);
    requestAnimationFrame(() => this._eCompDrag()); this._eCompPv();
  },
  _eCompPv() { const R = this._eCompR, C = HG_COMP.find((x) => x.id === R.cid), h = this._hass, pv = this._eSheetEl && this._eSheetEl.querySelector('.hs-pvb'); if (!pv || !C) return;
    const n = R.n, i = /^mdi:[a-z0-9-]+$/.test(R.i || '') ? R.i : '';
    if (C.tile) { pv.className = 'hs-pvb tg2'; pv.innerHTML = R.v.e ? hgTileHtml(h, R.v.e, R.z === 's' ? 's' : R.z, { t: R.t || C.tile, n, i }) : `<p class="hs-e">${hgTr('Wybierz encję', 'Choose an entity')}</p>`; hgSlots({ _hass: h, $: pv }); hgPvLive(pv); return; }
    if (C.id === 'hacard' && !hgHaCard(R.v)) { pv.className = 'hs-pvb'; pv.innerHTML = `<p class="hs-e">${(R.v.o || {}).src ? hgTr('Nie rozumiem tego YAML. Sprawdź wcięcia i pole type.', 'Cannot read this YAML. Check indentation and the type field.') : hgTr('Wklej YAML karty z edytora HA (Edytuj kartę, Pokaż edytor kodu).', 'Paste the card YAML from the HA editor (Edit card, Show code editor).')}</p>`; return; }
    const ok = C.slots.every((sl) => !sl.req || (sl.multi ? (R.v[sl.k] || []).length : R.v[sl.k])); if (!ok) { pv.className = 'hs-pvb'; pv.innerHTML = `<p class="hs-e">${hgTr('Wybierz encje', 'Choose entities')}</p>`; return; }
    pv.className = 'hs-pvb live'; pv.innerHTML = ''; const box = document.createElement('div'); box.className = 'hs-pvf'; const cc = hgCompCard(C, R.v), el = document.createElement(cc);
    try { el.setConfig(Object.assign({ type: 'custom:' + cc }, hgCompCfg(C, R.v, h), n ? { title: n, name: n } : {}, i ? { icon: i } : {})); } catch (e) { /* pusta */ } el._hgPv = true; box.appendChild(el); pv.appendChild(box); el.hass = h; this._ePvEl = el; hgPvFit(box, el, Math.min(440, (this._panelEl && this._panelEl.clientWidth) || 420)); },
  _eCompDrag() { const S = this._eSheetEl; if (!S) return;
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('pointerdown', (ev) => { const row = hd.closest('.hs-er'), key = row.dataset.ak, box = row.parentElement; ev.preventDefault(); ev.stopPropagation(); hd.setPointerCapture(ev.pointerId); row.classList.add('drag');
      const rows = () => [...box.querySelectorAll(`.hs-er[data-ak="${CSS.escape(key)}"]`)];
      const mv = (e) => { const sib = rows().filter((x) => x !== row); let ref = null; for (const x of sib) { const r = x.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { ref = x; break; } }
        const last = sib[sib.length - 1]; if (ref) { if (row.nextElementSibling !== ref) box.insertBefore(row, ref); } else if (last && last.nextElementSibling !== row) box.insertBefore(row, last.nextElementSibling); };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); row.classList.remove('drag');
        const ord = rows().map((x) => +x.dataset.ai), R = this._eCompR, A = R.v[key] || []; if (ord.every((v, i) => v === i)) return; R.v[key] = ord.map((i) => A[i]); this._eComp(R.cid, R); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); });
    /* klawiatura: strzałki góra/dół na uchwycie przesuwają encję */
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('keydown', (ev) => { if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return; ev.preventDefault(); ev.stopPropagation();
      const row = hd.closest('.hs-er'), key = row.dataset.ak, i = +row.dataset.ai, j = i + (ev.key === 'ArrowUp' ? -1 : 1), R = this._eCompR, A = (R.v[key] || []).slice(); if (j < 0 || j >= A.length) return;
      [A[i], A[j]] = [A[j], A[i]]; R.v[key] = A; this._eComp(R.cid, R); const nh = this._eSheetEl && this._eSheetEl.querySelector(`.hs-er[data-ak="${CSS.escape(key)}"][data-ai="${j}"] [data-hgdrag]`); if (nh) nh.focus(); }); },
  _eCompAct(a, b) { const R = this._eCompR, h = this._hass;
    if (a[0] === 'k') return this._eKidAct(a, b);
    if (a === 'cgent') { const ct = this._eGalCt, sc = this._eGalSc; return this._eGo(() => this._eGallery(ct, sc), () => this._eSheet('add', ct, sc)); }
    if (a === 'cgo') { const ct = this._eGalCt, sc = this._eGalSc; this._eCompR = null; return this._eGo(() => this._eGallery(ct, sc), () => this._eComp(b.dataset.c)); }
    if (a === 'cback') return this._eBack();
    if (a === 'ctyp') { R.t = b.dataset.t; for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } return this._eCompPv(); }
    if (a === 'cmod') { R.v = Object.assign({}, R.v, { mode: b.dataset.m }); for (const x of b.parentElement.children) x.setAttribute('aria-pressed', x === b); return this._eCompPv(); }
    if (a === 'cz') { R.z = b.dataset.z; for (const x of b.parentElement.children) x.setAttribute('aria-pressed', x === b); return this._eCompPv(); }
    const C = HG_COMP.find((x) => x.id === R.cid), sl = C && C.slots.find((x) => x.k === b.dataset.k);
    if (a === 'cdel') { if (sl.multi) { R.v[sl.k] = (R.v[sl.k] || []).slice(); R.v[sl.k].splice(+b.dataset.i, 1); } else delete R.v[sl.k]; return this._eComp(R.cid, R); }
    if (a === 'cslot') { const cur = sl.multi ? (R.v[sl.k] || []).map((y) => (typeof y === 'string' ? y : y.entity)) : [];
      const cset = new Set(hgSlotCands(h, sl)); /* raz, nie per encja (O(n²) zamrażało przeglądarkę) */
      this._eRepl = { comp: { k: sl.k, i: b.dataset.i != null ? +b.dataset.i : null }, doms: sl.dom, flt: (e) => cset.has(e), excl: cur.filter((_, i) => i !== +b.dataset.i) };
      const back = () => { this._eRepl = null; this._eComp(R.cid, this._eCompR || R); };
      return this._eGo(back, () => this._eSheet('add', null, this._eGalSc || R.sc)); }
    if (a === 'cok' && C.id === 'hacard' && !hgHaCard(R.v)) return this._eToast(hgTr('Najpierw wklej poprawny YAML karty', 'Paste a valid card YAML first'));
    if (a === 'cok' && R.kid) { if (R._xBad) return; const F = (this._eKidStk || []).pop(), kc = F && hgKidCfg(C, R, h); if (!kc) return;
      const P = F.R, A = (P.v.cards || []).slice(); if (F.i != null) { if (A[F.i] && A[F.i].span) kc.span = A[F.i].span; A[F.i] = kc; } else A.push(kc);
      P.v = Object.assign({}, P.v, { cards: A }); this._eStk.length = Math.min(this._eStk.length, F.d0); this._eRepl = null; this._eNav('b'); this._eComp(P.cid, P);
      return this._eToast((F.i != null ? hgTr('Zapisano: ', 'Saved: ') : hgTr('Dodano do kontenera: ', 'Added to container: ')) + hgKidName(kc)); }
    if (a === 'cok') { if (R._xBad) return; const sc = R.sc || this._eGalSc, n = R.n, i = /^mdi:[a-z0-9-]+$/.test(R.i || '') ? R.i : '';
      this._eSet(sc, (L) => { let key;
        if (C.tile) { const e = R.v.e; key = e; const x0 = R.edit ? L.added.find((y) => y.e === R.edit) : null, x = { e, ...(R.t && R.t !== C.tile ? { t: R.t } : R.t === C.tile && hgTypesFor(h, e)[0] !== C.tile ? { t: C.tile } : {}), ...(n ? { n } : {}), ...(i ? { i } : {}), comp: C.id };
          if (x0) Object.assign(x0, x); else if (!L.added.some((y) => y.e === e)) L.added.push(x); L.hidden = L.hidden.filter((y) => y !== e); }
        else { key = R.edit || ('c:' + C.id + ':' + Date.now().toString(36)); const x = { e: key, c: hgCompCard(C, R.v), comp: C.id, cfg: hgCompCfg(C, R.v, h), v: R.v, ...(n ? { n } : {}), ...(i ? { i } : {}) };
          const j = L.added.findIndex((y) => y.e === key); if (j >= 0) L.added[j] = x; else L.added.push(x); }
        if (R.z && R.z !== 's') L.size[key] = R.z; else delete L.size[key]; });
      this._eSheet(false); this._eToast((R.edit ? hgTr('Zapisano: ', 'Saved: ') : hgTr('Dodano: ', 'Added: ')) + (n || C.n)); this._eCompR = null;
      return this._eRefresh(sc.endsWith(':tiles') && !(this._cards || []).some((c) => c.tagName === 'HG-TILES-CARD')); }
  },
  /* dzieci kontenera: dodaj (galeria jako krok), edytuj (formularz komponentu albo YAML), kopia, usuń, szerokość w siatce */
  _eKidAct(a, b) { const R = this._eCompR, A = (R.v.cards || []).slice(), i = +b.dataset.i, C = HG_COMP.find((x) => x.id === R.cid);
    const set = (X) => { R.v = Object.assign({}, R.v, { cards: X }); this._eComp(R.cid, R); };
    if (a === 'kdel') { A.splice(i, 1); return set(A); }
    const sc0 = R.sc || this._eGalSc, nm = (o) => (/^mdi:[a-z0-9-]+$/.test(o.i || '') ? { i: o.i } : {});
    /* zapis kontenera z formularza (jak Zapisz) */
    const save = (L) => { const j = L.added.findIndex((y) => y.e === R.edit); if (j < 0) return; L.added[j] = Object.assign({ e: R.edit, c: hgCompCard(C, R.v), comp: C.id, cfg: hgCompCfg(C, R.v, this._hass), v: R.v }, R.n ? { n: R.n } : {}, nm(R)); };
    if (a === 'kout') { const k = A[i]; if (!k || !R.edit) return; A.splice(i, 1); R.v = Object.assign({}, R.v, { cards: A }); const x = hgKidToAdded(k);
      this._eSet(sc0, (L) => { save(L); if (!L.added.some((y) => y.e === x.e)) L.added.push(x); L.hidden = L.hidden.filter((y) => y !== x.e); });
      this._eToast(hgTr('Wyjęto na panel: ', 'Moved out to the panel: ') + hgKidName(k)); this._eComp(R.cid, R); return this._eRefresh(true); }
    if (a === 'kmove') { const kc = hgKidCfg(C, R, this._hass), te = b.dataset.t; if (!kc || !R.edit) return; let tn = '';
      this._eSet(sc0, (L) => { const T = L.added.find((y) => y.e === te), TC = T && HG_COMP.find((c) => c.id === T.comp); if (!TC) return; tn = T.n || TC.n;
        T.v = Object.assign({}, T.v, { cards: [...(T.v.cards || []), kc] }); T.cfg = hgCompCfg(TC, T.v, this._hass); L.added = L.added.filter((y) => y.e !== R.edit); delete L.size[R.edit]; });
      this._eSheet(false); this._eCompR = null; this._eToast(hgTr('Przeniesiono do: ', 'Moved into: ') + tn); return this._eRefresh(true); }
    if (a === 'kdup') { A.splice(i + 1, 0, JSON.parse(JSON.stringify(A[i]))); return set(A); }
    if (a === 'kspan') { const n = Math.max(1, +((R.v.o || {}).columns) || 3), k = Object.assign({}, A[i]), s0 = Math.max(1, +k.span || 1); if (s0 >= n) delete k.span; else k.span = s0 + 1; A[i] = k; return set(A); }
    const ct = this._eGalCt, sc = R.sc || this._eGalSc, back = () => { (this._eKidStk || []).pop(); this._eCompR = R; this._eComp(R.cid, R); };
    if (a === 'kadd') { if (!C || !C.kids) return; const d0 = this._eStk.length; (this._eKidStk = this._eKidStk || []).push({ R, i: null, d0 }); return this._eGo(back, () => this._eGallery(ct, sc)); }
    if (a === 'kedit') { const k = A[i]; if (!k) return; const K = HG_COMP.find((c) => c.id === k.nv_comp && c.id !== 'hacard');
      const st = K ? { cid: K.id, sc, v: JSON.parse(JSON.stringify(k.nv_v || {})), t: k.nv_t || K.tile || '', n: k.nv_n || '', i: k.nv_i || '', z: 's', kid: 1, edit: 1 }
        : { cid: 'hacard', sc, v: k.nv_comp === 'hacard' && k.nv_v ? JSON.parse(JSON.stringify(k.nv_v)) : { o: { src: JSON.stringify((() => { const o = {}; for (const q in k) if (!/^nv_/.test(q) && q !== 'span') o[q] = k[q]; return o; })(), null, 2) } }, t: '', n: k.nv_n || '', i: k.nv_i || '', z: 's', kid: 1, edit: 1 };
      const d0 = this._eStk.length; (this._eKidStk = this._eKidStk || []).push({ R, i, d0 }); return this._eGo(back, () => this._eComp(st.cid, st)); }
  },
  /* powrót z wyboru encji do formularza */
  _eCompPick(nv) { const R = this._eCompR, P = this._eRepl.comp, C = HG_COMP.find((x) => x.id === R.cid), sl = C.slots.find((x) => x.k === P.k), h = this._hass;
    if (sl.multi) { const A = (R.v[sl.k] || []).slice(), it = sl.obj ? { entity: nv, name: H.name(h, nv), ...(h.states[nv] && h.states[nv].attributes.icon ? { icon: h.states[nv].attributes.icon } : {}) } : nv; if (P.i != null && P.i < A.length) A[P.i] = it; else A.push(it); R.v[sl.k] = A; }
    else { R.v[sl.k] = nv; if (sl.k === 'e' && C.tile) R.t = C.tile; }
    this._eRepl = null; if ((this._eStk || []).length) this._eStk.pop(); this._eNav('b'); this._eComp(R.cid, R); },
};

/* karta dodanych kafli widoku (zakres „<widok>:tiles”) */
class HGTilesCard extends HGBase {
  constructor() { super(); this._sub = () => this.rerender(); }
  connectedCallback() { super.connectedCallback(); HGL.subs.add(this._sub); }
  disconnectedCallback() { HGL.subs.delete(this._sub); }
  ents() { if (this._config.group) return this._config.group.es.slice(); if (this._config.single) return [this._config.single.e]; const o = []; for (const x of HGL.get(this._config.scope).added) { if (!x.c) { if (x.e) o.push(x.e); continue; } for (const v of Object.values(x.v || {})) for (const y of [].concat(v)) { const e = typeof y === 'string' ? y : y && y.entity; if (e) o.push(e); } } return o; }
  _extraSig() { return this._config.single ? (HG_HIST.m.get(this._config.single.e) || {}).t || 0 : [HGL.data.s[this._config.scope] || null, [...HG_HIST.m.values()].map((x) => x.t).join()]; }
  css() { return `:host{ display:block; height:auto; container-type:inline-size; }` + HG_TILE_CSS; }
  render() {
    const h = this._hass; if (this._config.group) { const G = this._config.group, tt = G.lay === 'g-list' ? 'compact' : G.lay === 'g-clist' ? 'minimal' : '';
      return `<div class="hgg ${G.lay}">${G.n ? `<div class="hgg-h">${G.i ? H.icon(G.i) : ''}<b>${H.esc(G.n)}</b><small>${G.es.length}</small></div>` : ''}<div class="hgg-b">${G.es.map((e) => `<div class="tg2 one">${hgTileHtml(h, e, 's', tt && hgTypesFor(h, e).includes(tt) ? { t: tt } : {})}</div>`).join('')}</div></div>`; }
    if (this._config.single) return `<div class="tg2 one">${hgTileHtml(h, this._config.single.e, 's', this._config.single)}</div>`;
    const L = HGL.get(this._config.scope), hid = new Set(L.hidden);
    const it = HGL.sort(L.added.filter((x) => (x.c ? customElements.get(x.c) : h.states[x.e]) && !hid.has(x.e)), (x) => x.e, L.order);
    return `<div class="tg2" data-hgl="${H.esc(this._config.scope)}" data-hgsz="1">${it.map((x) => (x.c ? hgCmHtml(x, L.size[x.e]) : hgTileHtml(h, x.e, L.size[x.e], x))).join('')}</div>`;
  }
  afterRender() { hgSlots(this); hgCmSlots(this); }
  onAct(act, t) { hgTileAct(this, act, t); }
}
hgReg('hg-tiles-card', HGTilesCard, hgTr('Home Glass – Moje kafelki', 'Home Glass – My tiles'), hgTr('Kafelki dodane w trybie edycji', 'Tiles added in edit mode'));

/* style trybu edycji wstrzykiwane do cieni kart (elementy z data-hgk w kontenerach data-hgl) */
const HGE_CSS = `
.hge-on > .hge-ghost{ display:none !important; }
[data-hgl] > [data-hgk]{ position:relative; }
/* w układzie kolumnowym (masonry) blok jako inline-block: Chrome inaczej rysuje absolutne uchwyty i X pierwszego bloku kolumny w poprzedniej kolumnie */
.hge-on [data-hgl] > [data-hgk]:not([hidden]), [data-hgl].hge-on > [data-hgk]:not([hidden]){ display:inline-block; width:100%; vertical-align:top; break-inside:avoid; }
.hge-on [data-hgl] > [data-hgk], [data-hgl].hge-on > [data-hgk]{ outline:1.5px dashed var(--hg-accent); outline-offset:3px; border-radius:var(--r-md, 18px); animation:hgeW 1.6s ease-in-out infinite; touch-action:pan-y; user-select:none; -webkit-user-select:none; }
[data-hgl] > [data-hgk]:nth-child(2n){ animation-delay:-.8s; }
@keyframes hgeW{ 0%,100%{ rotate:-.35deg } 50%{ rotate:.35deg } }
@media (prefers-reduced-motion: reduce){ [data-hgl] > [data-hgk]{ animation:none !important; } }
:host([lite]) [data-hgl] > [data-hgk], .hge-lite [data-hgl] > [data-hgk]{ animation:none !important; }
[data-hgk].hge-drag{ animation:none !important; z-index:20; box-shadow:0 18px 48px rgba(0,0,0,.35) !important; outline-style:solid !important; cursor:grabbing; }
.hge{ position:absolute; inset:0; z-index:15; pointer-events:none; border-radius:inherit; }
.hge *{ pointer-events:auto !important; }
.hge button{ position:absolute; display:flex; align-items:center; justify-content:center; border:0; cursor:pointer; font:600 12px/1 inherit; color:var(--hg-on-accent); background:var(--hg-accent); box-shadow:0 4px 14px rgba(0,0,0,.28); -webkit-tap-highlight-color:transparent; }
.hge .hx{ top:-12px; right:12px; width:28px; height:28px; border-radius:50%; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); }
.hge .hh{ top:-12px; left:12px; width:28px; height:28px; border-radius:50%; cursor:grab; touch-action:none; }
.hge .hs{ position:absolute; bottom:-12px; left:50%; transform:translateX(-50%); height:26px; padding:0 3px; border-radius:999px; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); gap:2px; display:flex; align-items:center; box-shadow:0 4px 14px rgba(0,0,0,.28); }
.hge .hs i{ font-style:normal; cursor:pointer; width:24px; height:22px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; pointer-events:auto; }
.hge .hs i.on{ background:var(--hg-accent); color:var(--hg-on-accent); }
.hge ha-icon{ width:18px; height:18px; --mdc-icon-size:18px; pointer-events:none; }
.hge-on > .hgtl:not(.k-clim):not(.k-cam){ padding-bottom:18px; }
.hge-cf{ position:absolute; top:26px; right:6px; z-index:3; display:flex; align-items:center; gap:6px; padding:6px 6px 6px 12px; border-radius:999px; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); font:500 13px/1.2 inherit; box-shadow:0 8px 24px rgba(0,0,0,.3); max-width:calc(100% - 12px); }
.hge-cf span{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hge .hge-cf button{ position:static; height:30px; padding:0 12px; border-radius:999px; box-shadow:none; flex:none; }
.hge .hge-cf button[data-hge=cfno]{ background:rgba(0,0,0,.08); }
/* kontener dodanych kafli to nie slot: bez własnej ramki (ramki mają kafle w środku) */
.hge-on > [data-hgk="_tiles"], [data-hgl].hge-on > [data-hgk="_tiles"]{ outline:none !important; animation:none !important; }
.hge-add{ display:flex; align-items:center; justify-content:center; gap:8px; min-height:76px; border-radius:var(--r-md, 18px); border:1.5px dashed var(--hg-accent); background:var(--hg-accent-faint, rgba(160,230,60,.08)); color:inherit; font:500 15px/1 inherit; cursor:pointer; break-inside:avoid; margin:0; width:100%; box-sizing:border-box; }
.hge-addw{ min-height:76px; display:flex; align-self:start; } .hge-addw > .hge-add{ flex:1; }
.hge-add ha-icon{ width:22px; height:22px; color:var(--hg-accent-tx); }
`;

/* ===== silnik edycji (metody hg-page) ===== */

/* Ustawienia jako osobny panel z kartami: komputer = karty z lewej, telefon = przewijany pasek kart u góry */
const HG_LKT_CSS = (ks) => `${ks.map((k) => `.lkt[data-at=${k}] .lk-sc > [data-tab]:not([data-tab=${k}])`).join(', ')}{ display:none; }
.hge-sheet.lkt{ width:min(1120px, calc(100vw - 32px)); height:min(880px, calc(100vh - 40px)); max-height:none; display:grid; grid-template-columns:232px minmax(0, 1fr); grid-template-rows:auto minmax(0, 1fr) auto; column-gap:18px; }
.lkt > .hs-h, .lkt > .lk-ft{ grid-column:1 / -1; } .lkt > .hs-h b{ display:inline-flex; align-items:center; gap:10px; font-size:18px; } .lkt > .hs-h b ha-icon{ width:22px; height:22px; color:var(--hg-accent-tx, #63D71E); }
.lk-tabs{ display:flex; flex-direction:column; gap:4px; overflow:auto; padding:2px; }
.lk-tabs [role=tab]{ all:unset; cursor:pointer; position:relative; display:flex; align-items:center; gap:10px; min-height:44px; padding:0 14px; border-radius:14px; font-size:14px; font-weight:500; opacity:.78; transition:background .2s, opacity .2s, color .2s; }
.lk-tabs [role=tab] ha-icon{ width:20px; height:20px; flex:none; } .lk-tabs [role=tab]:hover{ opacity:1; background:color-mix(in srgb, currentColor 6%, transparent); }
.lk-tabs [role=tab][aria-selected=true]{ opacity:1; font-weight:600; background:color-mix(in srgb, var(--hg-accent, #63D71E) 18%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--hg-accent, #63D71E) 40%, transparent); }
.lk-tabs [role=tab][aria-selected=true] ha-icon{ color:var(--hg-accent-tx, #63D71E); } .lk-tabs [role=tab]:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; }
.lkt .lk-sc{ container:hgsh / inline-size; display:flex; flex-direction:column; gap:12px; overflow:auto; } .lkt .lk-sc.sw > [data-tab]{ animation:lktIn .32s cubic-bezier(.2,0,0,1) both; }
@keyframes lktIn{ from{ opacity:0; transform:translateY(8px); } to{ opacity:1; transform:none; } } @media (prefers-reduced-motion: reduce){ .lkt .lk-sc.sw > [data-tab]{ animation:none; } }
@media (max-width:820px){ .hge-sheet.lkt{ grid-template-columns:minmax(0, 1fr); grid-template-rows:auto auto minmax(0, 1fr) auto; } .lk-tabs{ flex-direction:row; overflow-x:auto; scrollbar-width:none; margin:0 -4px; } .lk-tabs::-webkit-scrollbar{ display:none; } .lk-tabs [role=tab]{ flex:none; min-height:40px; padding:0 12px; font-size:13px; border-radius:999px; } }
:host([mode=phone]) .hge-sheet.lkt{ width:100vw; height:92vh; grid-template-columns:minmax(0, 1fr); grid-template-rows:auto auto minmax(0, 1fr) auto; }
:host([mode=phone]) .lk-tabs{ flex-direction:row; overflow-x:auto; scrollbar-width:none; } :host([mode=phone]) .lk-tabs [role=tab]{ flex:none; min-height:40px; padding:0 12px; font-size:13px; border-radius:999px; }
`;
const HG_LOOK_CSS = `
.lk{ display:flex; flex-direction:column; max-height:min(86vh, calc(100dvh - 24px)); }
.lk .lk-sc{ gap:12px; flex:1 1 auto; min-height:0; scrollbar-width:thin; scrollbar-color:color-mix(in srgb, currentColor 22%, transparent) transparent; padding:2px 4px 8px 2px; }
.lk .lk-sc::-webkit-scrollbar{ width:6px; } .lk .lk-sc::-webkit-scrollbar-thumb{ background:color-mix(in srgb, currentColor 22%, transparent); border-radius:9px; } .lk .lk-sc::-webkit-scrollbar-track{ background:transparent; }
.lk-g{ position:relative; padding:14px; border-radius:20px; background:color-mix(in srgb, var(--hg-tile-bg) 70%, transparent); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent); display:flex; flex-direction:column; gap:12px; }
.lk-g h4{ margin:0; display:flex; align-items:center; gap:8px; font-size:14px; font-weight:600; letter-spacing:.01em; } .lk-g h4 ha-icon{ width:18px; height:18px; opacity:.7; }
.lk-g h4 em{ margin-left:auto; font-style:normal; font-variant-numeric:tabular-nums; padding:3px 10px; border-radius:999px; background:var(--hg-accent); color:var(--hg-on-accent); font-size:12px; }
.lk-hn{ margin-top:-8px; opacity:.6; font-size:12px; }
.lk-sw{ display:grid; grid-template-columns:repeat(auto-fill, minmax(58px,1fr)); gap:10px 6px; }
.lk-sw button, .lk-cc{ all:unset; position:relative; display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer; font-size:11px; }
.lk-sw i, .lk-cc i{ width:38px; height:38px; border-radius:50%; background:var(--c); display:grid; place-items:center; color:transparent; box-shadow:0 0 0 2px transparent; transition:box-shadow .15s, transform .15s; }
.lk-cc i{ background:var(--c); color:rgba(255,255,255,.95); } .lk-cc input{ position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; height:100%; }
.lk-sw ha-icon, .lk-cc ha-icon{ width:20px; height:20px; }
.lk-sw [aria-pressed=true] i, .lk-cc[aria-pressed=true] i{ color:#fff; box-shadow:0 0 0 2px var(--hg-tile-bg), 0 0 0 4px var(--c); mix-blend-mode:normal; }
.lk-sw [aria-pressed=true] i ha-icon{ filter:drop-shadow(0 1px 1px rgba(0,0,0,.35)); }
.lk-sw button:focus-visible i, .lk-cc:focus-within i{ outline:2px solid var(--hg-accent); outline-offset:3px; }
.lk-pv{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px; border-radius:16px; background:var(--hg-tile-bg); }
.lk-pc{ display:flex; align-items:center; gap:10px; min-width:0; } .lk-pi{ width:36px; height:36px; border-radius:12px; display:grid; place-items:center; flex:none; } .lk-pi ha-icon{ width:20px; height:20px; }
.lk-pt{ display:flex; flex-direction:column; font-size:13px; min-width:0; } .lk-pt small{ font-size:12px; font-weight:600; }
.lk-pb{ display:inline-flex; align-items:center; gap:4px; height:32px; padding:0 14px; border-radius:999px; font-size:13px; font-weight:600; flex:none; } .lk-pb ha-icon{ width:16px; height:16px; }
.lk-bgs{ display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:10px; } @media (max-width:520px){ .lk-bgs{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
.lk-bgs button{ all:unset; outline:none !important; -webkit-tap-highlight-color:transparent; cursor:pointer; display:flex; flex-direction:column; gap:6px; font-size:12px; min-width:0; }
.lk-bgs span{ position:relative; display:block; aspect-ratio:16/10; border-radius:14px; overflow:hidden; box-shadow:0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); transition:box-shadow .15s; }
.lk-bgs img{ width:100%; height:100%; object-fit:cover; display:block; }
.lk-bgs span ha-icon{ position:absolute; top:6px; right:6px; width:16px; height:16px; padding:3px; border-radius:50%; background:var(--hg-accent); color:var(--hg-on-accent); opacity:0; transform:scale(.6); transition:.15s; }
.lk-bgs [aria-pressed=true] span{ box-shadow:0 0 0 2px var(--hg-glass-bg, #1E242C), 0 0 0 4px var(--hg-accent, #63D71E); } .lk-bgs [aria-pressed=true] span ha-icon{ opacity:1; transform:none; }
.lk-bgs small{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.8; } .lk-bgs button:focus-visible span{ outline:none; box-shadow:0 0 0 2px var(--hg-glass-bg, #1E242C), 0 0 0 4px var(--hg-accent, #63D71E); }
.lk-bgs span[data-err]::after{ content:attr(data-et); position:absolute; inset:auto 6px 6px 6px; font-size:11px; line-height:1.2; padding:3px 6px; border-radius:8px; background:rgba(0,0,0,.45); color:#fff; text-align:center; }
.lk-row{ display:flex; gap:8px; align-items:center; } .lk-url{ flex:1 1 auto; min-width:0; }
.lk-mini{ all:unset; position:relative; z-index:1; cursor:pointer; height:32px; padding:0 12px; margin:0; border-radius:999px; background:var(--hg-accent); color:var(--hg-on-accent); font-size:13px; font-weight:600; display:grid; place-items:center; flex:none; }
.lk-up{ all:unset; cursor:pointer; height:44px; padding:0 14px; border-radius:999px; display:inline-flex; align-items:center; gap:6px; background:var(--hg-tile-bg); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); font-size:13px; font-weight:600; flex:none; } .lk-up ha-icon{ width:18px; height:18px; }
.lk-grd{ display:grid; grid-template-columns:64px 1fr 1fr; grid-template-rows:auto auto; gap:8px 10px; align-items:center; }
.lk-gp{ grid-row:span 2; width:64px; height:84px; border-radius:14px; box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 12%, transparent); }
.lk-st{ position:relative; display:flex; align-items:center; gap:8px; height:38px; padding:0 10px 0 6px; border-radius:999px; background:var(--hg-tile-bg); font-size:13px; cursor:pointer; min-width:0; }
.lk-st i{ width:26px; height:26px; border-radius:50%; flex:none; box-shadow:inset 0 0 0 1px rgba(255,255,255,.25); } .lk-st input{ position:absolute; inset:0; opacity:0; width:100%; height:100%; cursor:pointer; }
.lk-seg{ grid-column:2 / span 2; display:grid; grid-template-columns:1fr 1fr; padding:3px; border-radius:999px; background:var(--hg-tile-bg); }
.lk-seg button{ all:unset; cursor:pointer; height:32px; border-radius:999px; text-align:center; font-size:13px; font-weight:600; }
.lk-seg [aria-pressed=true]{ background:var(--hg-accent); color:var(--hg-on-accent); }
.lk-rg{ -webkit-appearance:none; appearance:none; width:100%; height:28px; background:transparent; margin:0; cursor:pointer; }
.lk-rg::-webkit-slider-runnable-track{ height:8px; border-radius:9px; background:linear-gradient(90deg, var(--hg-accent) var(--v), color-mix(in srgb, currentColor 14%, transparent) var(--v)); }
.lk-rg::-moz-range-track{ height:8px; border-radius:9px; background:linear-gradient(90deg, var(--hg-accent) var(--v), color-mix(in srgb, currentColor 14%, transparent) var(--v)); }
.lk-rg::-webkit-slider-thumb{ -webkit-appearance:none; width:24px; height:24px; margin-top:-8px; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3), 0 0 0 3px var(--hg-accent); }
.lk-rg::-moz-range-thumb{ width:22px; height:22px; border:0; border-radius:50%; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,.3), 0 0 0 3px var(--hg-accent); }
.lk-rg:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:4px; border-radius:9px; }
.lk-ft{ position:relative; display:flex; justify-content:space-between; gap:10px; padding-top:12px; margin-top:4px; border-top:1px solid color-mix(in srgb, currentColor 8%, transparent); flex:none; }
.lk-gh, .lk-ok{ all:unset; cursor:pointer; height:44px; padding:0 18px; border-radius:999px; display:inline-flex; align-items:center; gap:6px; font-size:14px; font-weight:600; }
.lk-gh{ box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent); } .lk-gh ha-icon{ width:18px; height:18px; }
.lk-ok{ background:var(--hg-accent); color:var(--hg-on-accent); padding:0 26px; }
.lk-gh:focus-visible, .lk-ok:focus-visible, .lk-up:focus-visible, .lk-mini:focus-visible, .lk-seg button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
@media (max-width:480px){ .lk-up span{ display:none; } .lk-up{ width:44px; padding:0; justify-content:center; } .lk-g{ padding:12px; } }
@media (max-height:500px){ .lk{ max-height:calc(100dvh - 16px); } .lk-bgs{ grid-template-columns:repeat(5, minmax(0,1fr)); } .lk-sw{ grid-template-columns:repeat(9, minmax(0,1fr)); } }
@media (prefers-reduced-motion: reduce){ .lk *{ transition:none !important; } }
`;
/* podgląd: karty w podglądzie omijają zamrożenie edycji i rysują się od razu */
function hgPvLive(pv) { const go = (r) => { for (const x of r.querySelectorAll('*')) { if (x.rerender && !x._hgPv) { x._hgPv = true; try { x.rerender(); } catch (e) { /* karta bez konfiguracji */ } } if (x.shadowRoot) go(x.shadowRoot); } }; go(pv); requestAnimationFrame(() => go(pv)); }
/* wybór stylu: karty z miniaturą danego stylu (ten sam komponent w „+ Dodaj” i w ustawieniach) */
const HG_THUMB_T = new Set(['tog', 'btn', 'compact', 'minimal', 'val', 'chart', 'run', 'cover', 'media']);
const HG_SCHEMA = { '': 'n', card: 'n', compact: 'c', minimal: 'm', clim: 'k', cam: 'v', media: 'p' };
/* karty grupowe (wiele encji): układ całego zestawu; pojedyncze kafelki mają własne style */
const HG_GRP_LBL = hgTrO({}, { players: ['Multimedia', 'Media'], cameras: ['Kamery', 'Cameras'], scenes: ['Sceny', 'Scenes'], people: ['Domownicy', 'People'], persons: ['Domownicy', 'People'], lights: ['Światła', 'Lights'], robots: ['Roboty', 'Robots'], power: ['Moc', 'Power'], covers: ['Rolety', 'Covers'] });
const HG_GRP_TYPES = [['card', 'Karta', 'Card'], ['g-list', 'Lista', 'List'], ['g-grid', 'Siatka', 'Grid'], ['g-car', 'Karuzela', 'Carousel'], ['g-clist', 'Kompaktowa lista', 'Compact list']].map(([t, pl, en]) => hgTrO([t], { 1: [pl, en] }));   /* [typ, etykieta]; etykieta to getter – język przy użyciu */
function hgStyleCards(h, e, opts, cur, act, room) {
  return `<div class="hs-sty" role="radiogroup" aria-label="${hgTr('Styl', 'Style')}">${opts.map(([t, l]) => { const sel = cur === t;
    const th = t === 'card' && opts === HG_GRP_TYPES ? `<div class="hs-th grp g-card" aria-hidden="true"><b></b><i></i><i></i><i></i><i></i></div>` : t.startsWith('g-') ? `<div class="hs-th grp ${t}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>` : e && h.states[e] && HG_THUMB_T.has(t) && !room ? `<div class="hs-th tile" aria-hidden="true"><div class="tg2">${hgTileHtml(h, e, 's', { t }).replace(/<(\/?)button\b/g, '<$1span').replace(/ (data-act|data-e|data-hgk)="[^"]*"/g, '')}</div></div>`
      : `<div class="hs-th sch s-${HG_SCHEMA[t] || 'n'}"><i></i><b></b><b></b><u></u></div>`;
    return `<button data-hge="${act}" data-t="${H.esc(t)}" role="radio" aria-checked="${sel}" aria-pressed="${sel}">${th}<span>${H.esc(l)}</span></button>`; }).join('')}</div>`;
}
const HG_STY_CSS = `
.hs-sty{ display:grid; grid-template-columns:repeat(auto-fill, minmax(132px, 1fr)); gap:10px; }
.hs-sty > button{ all:unset; box-sizing:border-box; cursor:pointer; display:flex; flex-direction:column; gap:8px; padding:8px 8px 10px; border-radius:18px; background:var(--hg-tile-bg); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); transition:box-shadow .15s, transform .15s; min-width:0; }
.hs-sty > button > span{ font-size:13px; font-weight:600; padding:0 4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hs-sty > button[aria-checked=true]{ box-shadow:inset 0 0 0 1.5px var(--hg-accent); }
.hs-sty > button:focus{ outline:none; } .hs-sty > button:focus-visible:not([aria-checked=true]){ outline:1.5px solid var(--hg-accent); outline-offset:2px; }
.hs-th.tile ha-icon, .hs-th.tile svg{ max-width:40px; max-height:40px; } .hs-th.tile .tg2 > *{ max-height:120px; overflow:hidden; }
.hs-th.grp{ display:grid; gap:4px; padding:8px; box-sizing:border-box; } .hs-th.grp i{ border-radius:6px; background:color-mix(in srgb, currentColor 16%, transparent); } .hs-th.grp i:first-of-type{ background:color-mix(in srgb, var(--hg-accent) 70%, transparent); }
.hs-th.g-card{ grid-template-columns:1fr 1fr; grid-template-rows:8px 1fr 1fr; } .hs-th.g-card b{ grid-column:1 / -1; width:40%; border-radius:4px; background:color-mix(in srgb, currentColor 35%, transparent); }
.hs-th.g-list{ grid-template-rows:repeat(4, 1fr); } .hs-th.g-grid{ grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; }
.hs-th.g-car{ grid-auto-flow:column; grid-auto-columns:42%; overflow:hidden; } .hs-th.g-clist{ grid-template-rows:repeat(4, 1fr); gap:3px; } .hs-th.g-clist i{ border-radius:999px; width:70%; }
.hs-sty > button[aria-checked=true] > span::before{ content:''; display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--hg-accent); margin-right:6px; vertical-align:1px; }
.hs-sty > button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.hs-th{ position:relative; height:64px; border-radius:12px; overflow:hidden; pointer-events:none; background:color-mix(in srgb, currentColor 5%, transparent); }
.hs-th.tile .tg2{ display:block; width:200%; transform:scale(.5); transform-origin:0 0; padding:8px; box-sizing:border-box; }
.hs-th.tile .hgtl{ min-height:0; } .hs-th.tile span.hgtb{ display:flex; align-items:center; gap:10px; min-width:0; flex:1; } .hs-th.tile .hgtl > span:not(.hgtb):not(.tv){ display:inline-flex; }
.hs-th.sch i{ position:absolute; left:10px; top:12px; width:22px; height:22px; border-radius:7px; background:var(--hg-accent); }
.hs-th.sch b{ position:absolute; left:40px; top:14px; height:6px; width:46%; border-radius:4px; background:color-mix(in srgb, currentColor 35%, transparent); } .hs-th.sch b + b{ top:26px; width:28%; opacity:.6; }
.hs-th.sch u{ position:absolute; left:10px; right:10px; bottom:10px; height:12px; border-radius:6px; background:color-mix(in srgb, currentColor 14%, transparent); }
.hs-th.s-c i{ top:21px; } .hs-th.s-c b{ top:24px; } .hs-th.s-c b + b, .hs-th.s-c u{ display:none; }
.hs-th.s-m i{ left:calc(50% - 11px); top:14px; } .hs-th.s-m b{ left:30%; width:40%; top:44px; } .hs-th.s-m b + b, .hs-th.s-m u{ display:none; }
.hs-th.s-k u{ height:20px; background:linear-gradient(90deg, var(--hg-accent) 0 40%, color-mix(in srgb, currentColor 14%, transparent) 40%); }
.hs-th.s-v{ background:linear-gradient(135deg, color-mix(in srgb, currentColor 22%, transparent), color-mix(in srgb, currentColor 6%, transparent)); } .hs-th.s-v i{ border-radius:50%; width:10px; height:10px; background:#e33; }
.hs-ac{ display:flex !important; justify-content:flex-end !important; align-items:center; gap:10px; }
.hs-ac > button{ all:unset; box-sizing:border-box; cursor:pointer; flex:none !important; width:auto !important; height:44px; padding:0 20px; border-radius:999px; display:inline-flex !important; align-items:center; gap:6px; font-size:14px; font-weight:600; line-height:1; white-space:nowrap; }
.hs-ac > button ha-icon{ width:18px; height:18px; flex:none; }
.hs-ac > .hs-b{ background:var(--hg-accent); color:var(--hg-on-accent); }
.hs-ac > button{ min-width:104px; justify-content:center; }
@media (max-width:600px){ .hs-ac{ flex-direction:column-reverse; align-items:stretch !important; } .hs-ac > button{ width:100% !important; } }
.hs-ac > .hs-b2{ box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent); color:inherit; background:none; }
.hs-ac > button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
`;
const HG_EDIT = {
  /* otwarty podgląd na żywo: nowy stan z HA -> karta (hass) albo przerysowanie kafla (max co 1 s) */
  _ePvTick(h) {
    const pv = this._eSheetEl.querySelector('.hs-pvb'); if (!pv) return;
    if (pv.classList.contains('live') && this._ePvEl) { this._ePvEl.hass = h; return; }
    for (const x of pv.querySelectorAll('hg-ac-card, hg-camera-card')) x.hass = h;
    if (this._ePvT) return; this._ePvT = setTimeout(() => { this._ePvT = 0; const p2 = this._eSheetEl && this._eSheetEl.querySelector('.hs-pvb'); if (!p2 || p2.classList.contains('live') || p2.querySelector('hg-ac-card, hg-camera-card')) return;
      if (this._eCfgR && this._eSheetEl.querySelector('[data-hge=cfgsave]')) this._eCfgPv();
      else { const b = this._eSheetEl.querySelector('[data-hge=addt][aria-pressed=true]'); if (b && this._eAddE) { p2.innerHTML = hgTileHtml(this._hass, this._eAddE, 's', { t: b.dataset.t }); hgSlots({ _hass: this._hass, $: p2 }); hgPvLive(p2); } } }, 1000);
  },
  /* klucz karty panelu: typ + pierwsza encja/tytuł/obszar (+ numer przy powtórzeniach) */
  _keys(cards) { const seen = {}; return cards.map((cc) => { const b = `${String(cc.type || '').replace('custom:', '')}|${cc._hgid || cc.entity || (cc.entities && cc.entities[0]) || cc.title || cc.area || ''}`; seen[b] = (seen[b] || 0) + 1; return seen[b] > 1 ? `${b}#${seen[b]}` : b; }); },
  _pageScope() { const v = this._config.view; return ['rooms', 'pokoj'].includes(v) ? null : v; },
  /* bazowe karty z CFG + nadpisania: kolejność (zamiana obszarów siatki albo kolejność DOM), ukryte, rozmiar, kafle dodane */
  _applyLayout(cards) {
    const sc = this._pageScope(); this._lkeys = this._keys(cards);
    if (!sc) return cards.map((cc, i) => Object.assign({}, cc, { _k: this._lkeys[i] }));
    const L = HGL.get(sc), keys = this._lkeys, areas = !!this._config.panel.areas;
    let out = cards.map((cc, i) => Object.assign({}, cc, { _k: keys[i] }));
    if (L.order.length) {
      if (areas) { const slot = out.map((c) => c.area), byK = new Map(out.map((c) => [c._k, c])); const used = new Set();
        const ord = L.order.filter((k) => byK.has(k)); if (ord.length === out.length) out = ord.map((k, i) => { used.add(k); return Object.assign({}, byK.get(k), { area: slot[i] }); }); }
      else out = HGL.sort(out, (c) => c._k, L.order);
    }
    out = out.map((c) => { const cf = L.conf[c._k]; if (!cf) return c; const o = Object.assign({}, c, cf.set || {});
      if (cf.n) { o.title = cf.n; o.name = cf.n; } if (cf.i) o.icon = cf.i;
      if (cf.t && cf.t.startsWith('g-')) { const st = this._hass && this._hass.states, es = []; for (const v of Object.values(o)) if (Array.isArray(v)) for (const y of v) { const e = typeof y === 'string' ? y : y && y.entity; if (e && st && st[e] && !es.includes(e)) es.push(e); }
        if (es.length) return { type: 'custom:hg-tiles-card', group: { es, lay: cf.t, n: cf.n || o.title || o.name || HG_GRP_LBL[String(o.type || '').replace(/^custom:(hg|nuvio)-|-card$/g, '')] || '', i: cf.i || o.icon || '' }, area: c.area, span: c.span, min_h: Math.min(c.min_h ?? 60, 60), _k: c._k }; return o; }
      if (cf.t && cf.t !== 'card') { const main = Object.entries(o).map(([, v]) => (typeof v === 'string' && this._hass && this._hass.states[v] ? v : Array.isArray(v) && typeof v[0] === 'string' && this._hass && this._hass.states[v[0]] ? v[0] : null)).find(Boolean);
        if (main) return { type: 'custom:hg-tiles-card', single: { e: main, t: cf.t, n: cf.n, i: cf.i }, area: c.area, span: c.span, min_h: Math.min(c.min_h ?? 60, 60), _k: c._k }; }
      return o; });
    for (const c of out) { const z = L.size[c._k]; if (z && !areas) { if (z === 'l') c.span = 'full'; else if (z === 'm') c.span = 2; else c.span = 1; } c._hid = L.hidden.includes(c._k); }
    const tl = HGL.get(sc + ':tiles');
    if (tl.added.length) { out.push({ type: 'custom:hg-tiles-card', scope: sc + ':tiles', _k: '_tiles', span: 'full', min_h: 40, _tiles: true });
      const hi = out.findIndex((c) => c.hint_sc); if (hi >= 0) out.push(out.splice(hi, 1)[0]); }   /* podpowiedź pod kafelkami */
    return out;
  },
  _isAdmin() { return !!(this._hass && this._hass.user && this._hass.user.is_admin); },
  /* edycja: admin (wspólny dashboard) albo osoba z własnym układem (HGShared.own) */
  _canEdit() { return HGL.canEdit(this._hass); },
  /* wszystkie kontenery edycji w widoku: panel (karty) + kontenery data-hgl w cieniach kart */
  _eConts() {
    const out = []; const sc = this._pageScope();
    if (sc) out.push({ el: this._panelEl, scope: sc, page: true, root: this.shadowRoot });
    const walk = (el, d) => { if (!el || !el.shadowRoot || d > 2) return; const r = el.shadowRoot;
      for (const c of r.querySelectorAll('[data-hgl]')) out.push({ el: c, scope: c.dataset.hgl, root: r, host: el, sz: !!c.dataset.hgsz });
      for (const x of r.querySelectorAll('hg-tiles-card, hg-areas-card, hg-room-card')) walk(x, d + 1); };
    for (const c of this._cards || []) walk(c, 0);
    return out;
  },
  _eItems(ct) { return ct.page ? [...ct.el.children].filter((w) => w.classList.contains('cw') && !w.hidden && w.dataset.hgk && w.dataset.hgk !== '_tiles') : [...ct.el.children].filter((x) => x.dataset && x.dataset.hgk); },
  _editEnter() {
    /* paczka z pamięci przeglądarki starsza niż na serwerze: raz na sesję komunikat z prośbą o odświeżenie */
    if (!window.__hgVerChk && typeof HG_ASSET === 'string' && typeof HG_BUILD === 'string' && !HG_BUILD.startsWith('__')) { window.__hgVerChk = 1;
      fetch(HG_ASSET + 'nuvio.js?nocache=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((t) => { const m = new RegExp('HG_BUILD = ' + "'" + "([^']+)'").exec(t || '');
        if (m && m[1] !== HG_BUILD) this._eToast(hgTr(`Załadowana wersja ${HG_BUILD.split('+')[0]} jest starsza niż na serwerze (${m[1].split('+')[0]}). Odśwież stronę bez pamięci podręcznej (Ctrl+Shift+R).`, `Loaded version ${HG_BUILD.split('+')[0]} differs from the server (${m[1].split('+')[0]}). Reload without cache (Ctrl+Shift+R).`)); }).catch(() => {}); }
    if (this._editing || !this._canEdit()) return;
    this._editing = true; HGL.editing = true; this._eSnap = JSON.stringify(HGL.data);
    this._menuOpen = false; this._paintTop(true);
    this.setAttribute('editing', '');
    for (const sc of Object.keys(HGL.data.s || {})) { const L = HGL.get(sc); if (hgCleanL(L)) HGL.set(sc, L); }
    this._eWire(); this._eDecorate(); this._eGhostSweep(); this._eHeadBtn(); this._eBar();
    clearInterval(this._eGh); this._eGh = setInterval(() => { if (!this._editing) return clearInterval(this._eGh); if (this._drag && this._drag.on) return; this._eGhostSweep(); this._eDecorate(); }, 700);
  },
  _eDirty() { return this._editing && this._eSnap !== JSON.stringify(HGL.data); },
  _editExit(save) {
    if (!this._editing) return;
    this._editing = false; HGL.editing = false; this.removeAttribute('editing'); clearInterval(this._eGh); for (const ct of this._eConts()) for (const g of ct.el.querySelectorAll(':scope > .hge-ghost')) g.classList.remove('hge-ghost');
    if (!save) { HGL.data = JSON.parse(this._eSnap); HGL._ls(); }
    const fin = () => { HG_FREEZE.on = false; HG_FREEZE.release(); this._eUnwire(); if (this._eBarEl) { this._eBarEl.remove(); this._eBarEl = null; } this._eSheet(false);
      HGL.notify(); if (this.isConnected) this._build(); };
    if (save) HGL.save(this._hass).then((w) => { this._eToast(w === 'ha' ? hgTr('Zapisano układ (synchronizacja przez Home Assistant)', 'Layout saved (synced via Home Assistant)') : hgTr('Zapisano układ na tym urządzeniu', 'Layout saved on this device')); fin(); }); else fin();
  },
  /* toaster w stylu Sonner: jeden kontener na dole (safe-area), najnowszy na wierzchu, starsze schowane za nim (max 3),
     rozwija się po najechaniu / dotknięciu, przesunięcie lub dotyk zamyka, auto-zamknięcie pauzowane, identyczne komunikaty łączone (×n) */
  _eToast(t, undo, ul) { HGToast.off = this._editing ? 84 : 20; HGToast.show(t, undo, ul); },
  /* odświeżenie po zmianie układu: karty przerysowane (z odmrożeniem), dekoracje od nowa */
  _eRefresh(page) {
    HG_FREEZE.on = false;
    if (page) { this._eSkipDeco = true; return this._build().then(() => { this._eSkipDeco = false; if (this._editing) { HG_FREEZE.on = true; requestAnimationFrame(() => this._eDecorate()); } }); }
    HGL.notify(); for (const c of this._cards || []) { try { c.rerender && c.rerender(); } catch (e) {} }
    const deep = (el, d) => { if (!el || !el.shadowRoot || d > 2) return; for (const x of el.shadowRoot.querySelectorAll('hg-areas-card, hg-room-card, hg-tiles-card')) { try { x.rerender(); } catch (e) {} deep(x, d + 1); } };
    for (const c of this._cards || []) deep(c, 0);
    requestAnimationFrame(() => { HG_FREEZE.on = true; this._eDecorate(); });
  },
  _eDecorate() {
    if (!this._editing) return;
    HG_FREEZE.on = true;
    const lite = this.hasAttribute('lite');
    for (const ct of this._eConts()) {
      if (!ct.root.querySelector('style[data-hge]')) { const st = document.createElement('style'); st.dataset.hge = '1'; st.textContent = HGE_CSS; ct.root.appendChild(st); }
      ct.el.classList.add('hge-on'); ct.el.classList.toggle('hge-lite', lite);
      const areas = ct.page && !!this._config.panel.areas;
      for (const it of this._eItems(ct)) {
        if (it.querySelector(':scope > .hge') || hgIsGhost(it)) continue;
        const k = it.dataset.hgk, L = HGL.get(ct.scope), z = L.size[k] || 's', canSz = ct.page ? !areas : ct.sz;
        const d = document.createElement('div'); d.className = 'hge';
        d.innerHTML = `<button class="hh" data-hge="drag" aria-label="${hgTr('Przeciągnij lub użyj strzałek, aby zmienić kolejność', 'Drag or use arrow keys to reorder')}" title="${hgTr('Przeciągnij', 'Drag')}">${H.icon('mdi:drag')}</button>`
          + `<button class="hx" data-hge="hide" aria-label="${hgTr('Ukryj kafelek', 'Hide tile')}" title="${hgTr('Ukryj', 'Hide')}">${H.icon('mdi:close')}</button>`
          + (canSz ? `<span class="hs" role="group" aria-label="${hgTr('Rozmiar', 'Size')}">${['s', 'm', 'l'].map((x) => `<i role="button" tabindex="0" class="${z === x ? 'on' : ''}" data-hge="size" data-z="${x}" aria-pressed="${z === x}" aria-label="${hgTr('Rozmiar', 'Size')} ${x.toUpperCase()}">${x.toUpperCase()}</i>`).join('')}</span>` : '');
        d._ct = ct; d._it = it; it.appendChild(d);
      }
      if (!ct.el.querySelector(':scope > .hge-addw') && (ct.page || /^(rooms|room:)/.test(ct.scope) || ct.scope.endsWith(':tiles'))) {
        if (ct.scope.endsWith(':tiles')) continue;               // „+ Dodaj” jest na poziomie widoku
        const w = document.createElement(ct.page ? 'div' : 'div'); w.className = 'hge-addw' + (ct.page ? ' cw' : '');
        if (ct.page) { w.style.gridColumn = ''; w.style.gridArea = 'auto'; }
        if (!ct.page && ct.el.classList.contains('grid')) w.style.gridColumn = '1 / -1';
        w.innerHTML = `<button class="hge-add" data-hge="add">${H.icon('mdi:plus')}<span>${hgTr('Dodaj', 'Add')}</span></button>`;
        w.firstChild._ct = ct; ct.el.appendChild(w); if (ct.page && this._masOn) requestAnimationFrame(() => this._masLay());
        if (!ct.page) ct.el.style.position = ct.el.style.position || 'relative';
      }
    }
    this._eBar();
  },
  _eUndecorate() {
    const all = this._eConts();
    for (const ct of all) { ct.el.classList.remove('hge-on'); for (const x of ct.el.querySelectorAll(':scope > [data-hgk] > .hge, :scope > .hge-addw')) x.remove(); const st = ct.root.querySelector('style[data-hge]'); if (st && ct.root !== this.shadowRoot) st.remove(); }
  },
  _eBar() {
    if (!this._editing) return;
    let b = this._eBarEl; if (b && !b.isConnected) this.shadowRoot.appendChild(b); if (!b) { b = this._eBarEl = document.createElement('div'); b.className = 'hge-bar'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', hgTr('Edycja układu', 'Edit layout')); this.shadowRoot.appendChild(b); }
    const nh = this._eHidden().length;
    b.innerHTML = `<span class="hgt">${H.icon('mdi:pencil')}<b>${hgTr('Edycja układu', 'Edit layout')}</b></span>
      <button data-hge="hidden" ${nh ? '' : 'disabled'}>${H.icon('mdi:eye-outline')}<span>${hgTr('Przywróć ukryte', 'Restore hidden')}${nh ? ` · ${nh}` : ''}</span></button>
      <button data-hge="look">${H.icon('mdi:palette-outline')}<span>${hgTr('Wygląd', 'Appearance')}</span></button>
      <button data-hge="reset">${H.icon('mdi:restore')}<span>${hgTr('Przywróć domyślny układ', 'Reset to default layout')}</span></button>
      <button data-hge="cancel">${hgTr('Anuluj', 'Cancel')}</button><button class="ok" data-hge="done">${H.icon('mdi:check')}<span>${hgTr('Gotowe', 'Done')}</span></button>`;
  },
  /* ukryte elementy wszystkich zakresów widoku */
  _eHidden() {
    const out = []; const h = this._hass, cfgA = (this._cards || []).map((c) => c._config && c._config.areas).find(Boolean);
    const scopes = new Set(this._eConts().map((c) => c.scope)); const ps = this._pageScope(); if (ps) { scopes.add(ps); scopes.add(ps + ':tiles'); }
    for (const sc of scopes) for (const k of HGL.get(sc).hidden) {
      let n = k;
      if (h.states[k]) n = H.name(h, k);
      else if (sc === ps) { const cc = (this._config.cards || [])[this._lkeys.indexOf(k)]; n = (cc && (cc.title || (cc.entity && H.name(h, cc.entity)))) || k.split('|')[0].replace(/^hg-|-card$/g, ''); }
      else if (sc === 'rooms') { const m = cfgA && HGAreas.model(h, cfgA); n = (m && m.byId[k] && m.byId[k].name) || k; }
      else n = k.replace(/^sec:/, hgTr('Sekcja: ', 'Section: '));
      out.push({ sc, k, n });
    }
    return out;
  },
  _eSet(sc, f) { const L = HGL.get(sc); f(L); HGL.set(sc, L); },
  _eWire() {
    const onDown = (e) => this._eDown(e), onClick = (e) => this._eClick(e), onTm = (e) => { if (this._drag && this._drag.on) e.preventDefault(); }, onKey = (e) => { if (e.key === 'Escape' && hgsOpen.size) return; if (e.key === 'Escape') { if (this._eSheetOpen) { const cf = this._eSheetEl && this._eSheetEl.querySelector('.hs-cf'); if (cf) cf.remove(); else if ((this._eStk || []).length) this._eBack(); else this._eClose(); } else if (!this._eDirty() || window.confirm(hgTr('Odrzucić niezapisane zmiany układu?', 'Discard unsaved layout changes?'))) this._editExit(false); }
      /* klawiatura: elementy role=button (chipy rozmiaru itd.) aktywowane Enter / Spacją */
      else if (/^Arrow(Up|Down|Left|Right)$/.test(e.key) && e.composedPath()[0] && e.composedPath()[0].dataset && e.composedPath()[0].dataset.hge === 'drag') { e.preventDefault(); this._eKeyMove(e.composedPath()[0], /Up|Left/.test(e.key) ? -1 : 1); }
      else if (e.key === 'Enter' || e.key === ' ') { const t = e.composedPath()[0]; if (t && t.tagName !== 'BUTTON' && t.getAttribute && t.getAttribute('role') === 'button' && t.dataset && t.dataset.hge) { e.preventDefault(); t.click(); } } };
    this._eL = [['pointerdown', onDown, true], ['click', onClick, true], ['touchmove', onTm, { passive: false, capture: true }], ['keydown', onKey, true]];
    for (const [t, f, o] of this._eL) window.addEventListener(t, f, o);
  },
  _eUnwire() { for (const [t, f, o] of this._eL || []) window.removeEventListener(t, f, o); this._eL = null; this._eUndecorate(); },
  _ePath(e) { const p = e.composedPath(); const ctl = p.find((n) => n.dataset && n.dataset.hge); const it = p.find((n) => n.dataset && n.dataset.hgk && n.parentElement && (n.parentElement.dataset.hgl || n.parentElement === this._panelEl));
    return { p, ctl, it, inBar: p.includes(this._eBarEl) || (this._eSheetEl && p.includes(this._eSheetEl)) }; },
  _eClick(e) {
    const { ctl, it, inBar } = this._ePath(e);
    if (ctl) { e.preventDefault(); e.stopPropagation(); return this._eCtl(ctl, e); }
    if (inBar) return;
    if (it) { e.preventDefault(); e.stopPropagation(); if (Date.now() - (this._eSwallow || 0) > 400) { const ct = this._eConts().find((c) => c.el === it.parentElement); if (ct) this._eCfg(ct, it.dataset.hgk); } }
  },
  _eCtl(b, e) {
    this._eTrig = b;
    const a = b.dataset.hge;
    if (a === 'done') return this._editExit(true);
    if (a === 'cancel') return this._editExit(false);
    if (a === 'reset') { const ps = this._pageScope(); const sc = new Set(this._eConts().map((c) => c.scope)); if (ps) { sc.add(ps); sc.add(ps + ':tiles'); }
      for (const s of sc) HGL.set(s, {}); this._eToast(hgTr('Przywrócono domyślny układ widoku (zapisz „Gotowe”)', 'View layout reset to default (save with “Done”)')); return this._eRefresh(true); }
    if (a === 'hidden') return this._eSheet('hidden');
    if (a === 'look') return this._eLook();
    if (a === 'headedit') return this._eHead();
    if (a === 'pw') { const v = this._config.view; HGL.data.pw = Object.assign({}, HGL.data.pw, { [v]: b.dataset.w }); hgPwMark(b); this._panelGrid(this.getAttribute('mode')); HGL.save(this._hass); return; }
    if (a === 'hdok' || a === 'hdreset' || a === 'hdvar') return this._eHeadAct(a, b);
    if (a.startsWith('lx-') && window.HGLookX) return HGLookX.act(this, b, a);
    if (a.startsWith('rx-') && window.HGRoomsX) return HGRoomsX.act(this, b, a);
    if (a.startsWith('wl-') && window.HGWall) return HGWall.act(this, b, a);
    if (a.startsWith('bk-') && window.HGBackup) return HGBackup.act(this, b, a);
    if (a.startsWith('us-') && window.HGUsers) return HGUsers.act(this, b, a);
    if (a.startsWith('as-') && window.HGAssistUI) return HGAssistUI.act(this, b, a);
    if (a === 'acc') { this._eApp((A) => { A.accent = b.dataset.c; }); return this._eLook(); }
    if (a === 'bgp') { this._eApp((A) => { A.bg = b.dataset.v ? { kind: 'image', v: b.dataset.v, v2p: b.dataset.p || '' } : null; }); return this._eLook(); }
    if (a === 'bgurl') { const v = this._eSheetEl.querySelector('[name=bgurl]').value.trim(); if (!/^(\/|https:\/\/)/.test(v)) return this._eToast(hgTr('Podaj adres https:// lub /local/…', 'Enter an https:// or /local/… address')); this._eApp((A) => { A.bg = { kind: 'url', v }; }); return this._eLook(); }
    if (a === 'bgcol') { const S = this._eSheetEl, c1 = S.querySelector('[name=bgc1]').value, c2 = S.querySelector('[name=bgc2]').value; this._eApp((A) => { A.bg = b.dataset.k === 'gradient' ? { kind: 'gradient', v: c1, v2: c2 } : { kind: 'color', v: c1 }; }); return this._eLook(); }
    if (a === 'bgup') return this._eSheetEl.querySelector('input[type=file]').click();
    if (a === 'lktab') { this._lkTab = b.dataset.k; const sh = this._eSheetEl && this._eSheetEl.querySelector('.hge-sheet.lk'); if (!sh) return; sh.dataset.at = b.dataset.k; for (const x of sh.querySelectorAll('.lk-tabs [role=tab]')) x.setAttribute('aria-selected', String(x === b)); const sc = sh.querySelector('.hs-sc'); if (sc) { sc.scrollTop = 0; sc.classList.remove('sw'); void sc.offsetWidth; sc.classList.add('sw'); } return; }
    if (a === 'lookreset') { HGL.data.app = {}; HGApp.apply(); this._eToast(hgTr('Przywrócono domyślny wygląd', 'Appearance reset to default')); return this._eLook(); }
    if (a === 'add') { const ct0 = b._ct || (b.closest('.hge-addw') && b.closest('.hge-addw').firstChild._ct); return ct0 && ct0.scope === 'rooms' ? this._eSheet('add', ct0) : this._eGallery(ct0); }
    if (/^(c(go|gent|back|typ|mod|z|del|slot|ok)|k(add|edit|dup|del|span|move|out))$/.test(a)) return this._eCompAct(a, b);
    if (a === 'restore') { this._eSet(b.dataset.sc, (L) => { L.hidden = L.hidden.filter((x) => x !== b.dataset.k); }); this._eSheet(false); return this._eRefresh(b.dataset.sc === this._pageScope()); }
    if (a === 'sback') return this._eBack();
    if (a === 'cfstay') { const c = b.closest('.hs-cf'); if (c) c.remove(); return; }
    if (a === 'cfdrop') return this._eSheet(false);
    if (a === 'sheetclose' && !b.matches('.hs-x, .hge-scrim, .hs-b2')) return this._eSheet(false);   /* przycisk główny (Gotowe) zatwierdza bez pytania */
    if (a === 'sheetclose') return (this._eStk || []).length && b.classList.contains('hs-x') ? this._eBack() : this._eClose();
    if (a === 'pick' && b.dataset.sc !== 'rooms' && !b.dataset.t) { const sc0 = this._eSc, ct0 = this._eSheetCt; return this._eGo(() => this._eSheet('add', ct0, sc0), () => this._eAddStep(b.dataset.sc, b.dataset.e, b.dataset.n)); }
    if (a === 'addt') { for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } const pv = this._eSheetEl.querySelector('.hs-pvb'); pv.innerHTML = hgTileHtml(this._hass, this._eAddE, 's', { t: b.dataset.t }); hgSlots({ _hass: this._hass, $: pv }); hgPvLive(pv); return; }
    if (a === 'addok') { const t = (this._eSheetEl.querySelector('[data-hge=addt][aria-pressed=true]') || { dataset: {} }).dataset.t, T0 = hgTypesFor(this._hass, this._eAddE)[0];
      const fake = { dataset: { hge: 'pick', sc: this._eAddSc, e: this._eAddE, n: this._eAddN || '', t: t && t !== T0 ? t : 'def' } }; return this._eCtl(fake, e); }
    if (a === 'addback') return (this._eStk || []).length ? this._eBack() : this._eSheet('add', null, this._eSc);
    if (a === 'pick') { const sc = b.dataset.sc; const tt = b.dataset.t && b.dataset.t !== 'def' ? b.dataset.t : ''; this._eSet(sc, (L) => { L.hidden = L.hidden.filter((x) => x !== b.dataset.e); if (!L.added.some((x) => x.e === b.dataset.e)) L.added.push(tt ? { e: b.dataset.e, t: tt } : { e: b.dataset.e }); });
      this._eSheet(false); this._eToast(hgTr('Dodano: ', 'Added: ') + (b.dataset.n || b.dataset.e)); return this._eRefresh(sc.endsWith(':tiles') && !(this._cards || []).some((c) => c.tagName === 'HG-TILES-CARD')); }
    if (a === 'repl' && this._eRepl && this._eRepl.comp) return this._eCompPick(b.dataset.e);
    if (a === 'repl') { const R = this._eRepl; this._eRepl = null; const nv = b.dataset.e; this._eCfgSet(R, nv); this._eSheet(false); this._eToast(R.add ? hgTr('Dodano encję', 'Entity added') : hgTr('Zmieniono encję', 'Entity changed'));
      const k2 = R.S.kind === 'added' ? nv : R.k, pg = R.sc === this._pageScope(); const re = () => { const ct = this._eConts().find((c) => c.scope === R.sc); if (ct) setTimeout(() => this._eCfg(ct, k2), 120); };
      const pr = this._eRefresh(pg); if (pr && pr.then) pr.then(re); else requestAnimationFrame(re); return; }
    if (a === 'cfgsave') return this._eCfgSave();
    if (a === 'cfgz' || a === 'cfgt' || a === 'cfgw') { for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } if (a === 'cfgt') this._eCfgPv(); return; }
    if (a === 'cfgadd') { const n = ((this._eCfgArrGet(this._eCfgR, b.dataset.k)) || []).length; this._eRepl = Object.assign({}, this._eCfgR, { path: b.dataset.k + '.' + n, old: '', add: true, doms: b.dataset.d ? b.dataset.d.split(',') : null, excl: (this._eCfgArrGet(this._eCfgR, b.dataset.k) || []).map((y) => (typeof y === 'string' ? y : y && y.entity)) }); return this._eGo(() => this._eCfgBack(), () => this._eSheet('add', null, this._eCfgR.sc)); }
    if (a === 'cfgdel') { const i = +b.dataset.i; return this._eCfgArr(this._eCfgR, b.dataset.k, (A) => { A.splice(i, 1); }, hgTr('Usunięto encję', 'Entity removed')); }
    if (a === 'cfgent') { const R0 = this._eCfgR, ex = R0.S && R0.S.kind === 'added' ? HGL.get(R0.sc).added.map((y) => y.e).filter((e) => e !== b.dataset.v) : null;   /* kafel dodany: bez encji już obecnych w zakresie (duplikat klucza) */
      this._eRepl = Object.assign({}, R0, { path: b.dataset.p, old: b.dataset.v }, ex ? { excl: ex } : {}); return this._eGo(() => this._eCfgBack(), () => this._eSheet('add', null, this._eCfgR.sc)); }
    if (a === 'filter') { this._eF = b.dataset.f; return this._eSheetList(); }
    const d = b._d || b.closest('.hge'); if (!d) return;
    const ct = d._ct, it = d._it, k = it.dataset.hgk;
    if (a === 'hide' && !b.dataset.ok) {
      const nm = (it.querySelector('.sh, .nm, .tn b, .hd b, b') || {}).textContent || hgTr('ten element', 'this item');
      const q = document.createElement('div'); q.className = 'hge-cf'; q.innerHTML = `<span>${hgTr(`Usunąć „${H.esc(nm.trim().slice(0, 40))}”?`, `Remove “${H.esc(nm.trim().slice(0, 40))}”?`)}</span><button data-hge="hide" data-ok="1">${hgTr('Usuń', 'Remove')}</button><button data-hge="cfno">${hgTr('Nie', 'No')}</button>`;
      d.appendChild(q); for (const x of q.querySelectorAll('button')) x._d = d; return;
    }
    if (a === 'cfno') { const q = b.closest('.hge-cf'); if (q) q.remove(); return; }
    if (a === 'hide') {
      const A0 = HGL.get(ct.scope).added, ai = A0.findIndex((x) => x.e === k), added = ai >= 0, rem = added ? JSON.parse(JSON.stringify(A0[ai])) : null;
      this._eSet(ct.scope, (L) => { if (added) L.added = L.added.filter((x) => x.e !== k); else if (!L.hidden.includes(k)) L.hidden.push(k); });
      const rest = this._eItems(ct).filter((x) => x !== it); const fr = rest.map((x) => x.getBoundingClientRect());
      it.style.display = 'none'; if (ct.page) it.hidden = true;
      this._eFlipFrom(rest, fr); this._eBar();
      this._eToast(added ? hgTr('Usunięto kafelek', 'Tile removed') : hgTr('Usunięto – przywrócisz w „Przywróć ukryte”', 'Removed – bring it back with “Restore hidden”'), () => {
        /* cofnięcie tylko tego usunięcia – inne zmiany w zakresie z ostatnich sekund zostają */
        this._eSet(ct.scope, (L) => { if (added) { if (!L.added.some((x) => x.e === k)) L.added.splice(Math.min(ai, L.added.length), 0, rem); } else L.hidden = L.hidden.filter((x) => x !== k); });
        this._eRefresh(ct.page); });
      return;
    }
    if (a === 'size') { const z = b.dataset.z; this._eSet(ct.scope, (L) => { if (z === 's') delete L.size[k]; else L.size[k] = z; });
      const its = this._eItems(ct), fr = its.map((x) => x.getBoundingClientRect());
      if (ct.page) { it.style.gridColumn = z === 'l' ? '1 / -1' : z === 'm' ? 'span 2' : ''; }
      else { it.classList.remove('hgsz-m', 'hgsz-l'); if (z !== 's') it.classList.add('hgsz-' + z); }
      for (const x of d.querySelectorAll('[data-hge=size]')) { const on = x.dataset.z === z; x.setAttribute('aria-pressed', on); x.classList.toggle('on', on); }
      return this._eFlipFrom(its, fr);
    }
  },
  /* FLIP: elementy animowane z poprzedniego położenia do nowego */
  _eFlipFrom(items, before, skip) {
    if (hgReduced() || this.hasAttribute('lite')) return;
    items.forEach((x, i) => { if (x === skip || !before[i]) return; const r = x.getBoundingClientRect(), dx = before[i].left - r.left, dy = before[i].top - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      x.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,0,0,1)' }); });
  },
  /* przeciąganie: mysz – od razu z uchwytu albo po 6 px; dotyk – uchwyt od razu, kafel po przytrzymaniu 380 ms */
  _eDown(e) {
    if (e.button > 0 || e.isPrimary === false || (this._drag && this._drag.on)) return;   /* drugi palec nie przejmuje przeciągania */
    const { ctl, it, inBar } = this._ePath(e); if (inBar) return;
    if (ctl && ctl.dataset.hge !== 'drag') return;
    if (!it) return;
    const ct = this._eConts().find((c) => c.el === it.parentElement); if (!ct) return;
    const touch = e.pointerType !== 'mouse', handle = !!ctl;
    const D = this._drag = { it, ct, x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId, tx: 0, ty: 0 };
    const start = () => { if (this._drag !== D) return; D.on = true; it.classList.add('hge-drag'); D.r0 = it.getBoundingClientRect(); D.nx = D.r0.left; D.ny = D.r0.top; if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) {} };
    if (handle) start(); else if (touch) D.lp = setTimeout(start, 380);
    const mv = (ev) => {
      if (ev.pointerId !== D.id) return;
      const dx = ev.clientX - D.x0, dy = ev.clientY - D.y0;
      if (!D.on) { if (touch) { if (Math.hypot(dx, dy) > 8) end(); return; } if (Math.hypot(dx, dy) > 6) start(); else return; }
      ev.preventDefault();
      D.px = ev.clientX; D.py = ev.clientY;
      if (!D.raf) D.raf = requestAnimationFrame(() => { D.raf = 0; this._eMove(D); });
    };
    const end = (ev) => {
      clearTimeout(D.lp); window.removeEventListener('pointermove', mv, true); window.removeEventListener('pointerup', end, true); window.removeEventListener('pointercancel', end, true);
      if (this._drag !== D) return; this._drag = null;
      if (!D.on) return;
      D.on = false; const cur = `translate(${D.tx}px, ${D.ty}px)`;
      it.style.transform = ''; it.classList.remove('hge-drag');
      if (!hgReduced()) it.animate([{ transform: cur }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,0,0,1)' });
      this._eCommit(ct);
      this._eSwallow = Date.now();
      const sw = (c) => { if (Date.now() - this._eSwallow < 400) { c.preventDefault(); c.stopPropagation(); } window.removeEventListener('click', sw, true); };
      window.addEventListener('click', sw, true);
    };
    window.addEventListener('pointermove', mv, true); window.addEventListener('pointerup', end, true); window.addEventListener('pointercancel', end, true);
  },
  /* klawiatura: strzałki na uchwycie „Przeciągnij” przesuwają kafel o jedno miejsce (to samo co przeciągnięcie) */
  _eKeyMove(h, dir) {
    const it = h.closest('[data-hgk]'), ct = it && this._eConts().find((c) => c.el === it.parentElement); if (!ct) return;
    const items = this._eItems(ct), i = items.indexOf(it), tg = items[i + dir]; if (i < 0 || !tg) return;
    const before = items.map((o) => o.getBoundingClientRect());
    if (ct.page && this._config.panel.areas) { const an = (x) => getComputedStyle(x).gridRowStart, a1 = an(it), a2 = an(tg); it.style.gridArea = a2; tg.style.gridArea = a1; }
    else ct.el.insertBefore(it, dir > 0 ? tg.nextSibling : tg);
    this._eFlipFrom(items, before); this._eCommit(ct); h.focus();
  },
  _eMove(D) {
    const { it, ct } = D;
    // położenie naturalne (bez transformacji) -> przesunięcie tak, by kafel był pod palcem
    const place = () => { it.style.transform = 'none'; const r = it.getBoundingClientRect(); D.tx = D.px - D.x0 + D.r0.left - r.left; D.ty = D.py - D.y0 + D.r0.top - r.top; it.style.transform = `translate(${D.tx}px, ${D.ty}px)`; };
    place();
    const items = this._eItems(ct), x = D.px, y = D.py;
    const tg = items.find((o) => { if (o === it) return false; const r = o.getBoundingClientRect(); return x > r.left && x < r.right && y > r.top && y < r.bottom; });
    if (!tg || tg === D.last) { if (!tg) D.last = null; return; }
    D.last = tg;
    const before = items.map((o) => o.getBoundingClientRect());
    if (ct.page && this._config.panel.areas) { const an = (x) => getComputedStyle(x).gridRowStart, a1 = an(it), a2 = an(tg); it.style.gridArea = a2; tg.style.gridArea = a1; }
    else { const ia = items.indexOf(it), ib = items.indexOf(tg); ct.el.insertBefore(it, ia < ib ? tg.nextSibling : tg); }
    place();
    this._eFlipFrom(items, before, it);
  },
  _eCommit(ct) {
    const items = this._eItems(ct);
    if (ct.page && this._config.panel.areas) {
      const base = (this._config.cards || []).map((c) => c.area), byArea = new Map(items.map((w) => [getComputedStyle(w).gridRowStart, w.dataset.hgk]));
      /* sloty ukrytych kart: klucz z bieżącego układu (nie bazowego), bez duplikatów – inaczej ukryta karta znikała na stałe */
      const all = this._lkeys, cur = (this._lc || []).map((c) => c._k), vis = new Set(byArea.values());
      const ord = base.map((a, i) => byArea.get(a) || (cur[i] && !vis.has(cur[i]) ? cur[i] : null));
      const miss = all.filter((k) => !ord.includes(k)), seen = new Set();
      for (let i = 0; i < ord.length; i++) { if (!ord[i] || seen.has(ord[i])) ord[i] = miss.shift() || all[i]; seen.add(ord[i]); }
      this._eSet(ct.scope, (L) => { L.order = ord; });
    } else this._eSet(ct.scope, (L) => { L.order = items.map((w) => w.dataset.hgk); });
  },
  /* arkusz: „Dodaj” (wyszukiwarka encji / pokoi) albo „Przywróć ukryte” */
  /* ===== jeden arkusz ustawień dla każdego kafelka / karty / pokoju / sekcji ===== */
  _eSubj(ct, k) {
    const h = this._hass, sc = ct.scope, L = HGL.get(sc), cf = L.conf[k] || {}, x = L.added.find((y) => y.e === k);
    const ok = (v) => typeof v === 'string' && !!h.states[v];
    const LBL = { entity: hgTr('Główna encja', 'Main entity'), temperature: hgTr('Temperatura', 'Temperature'), temp: hgTr('Temperatura', 'Temperature'), humidity: hgTr('Wilgotność', 'Humidity'), hum: hgTr('Wilgotność', 'Humidity'), power: hgTr('Moc', 'Power'), energy: hgTr('Energia', 'Energy'), climate: hgTr('Klimatyzacja', 'Air conditioning'), camera: hgTr('Kamera', 'Camera'), person: hgTr('Osoba', 'Person'), entities: hgTr('Encja', 'Entity'), cameras: hgTr('Kamera', 'Camera'), camera_entity: hgTr('Kamera', 'Camera'), persons: hgTr('Osoba', 'Person'), media_players: hgTr('Odtwarzacz', 'Media player'), lights: hgTr('Światło', 'Light'), sensors: hgTr('Czujnik', 'Sensor') };
    if (x) return { kind: 'added', x, ents: [{ p: 'e', l: hgTr('Encja', 'Entity'), v: x.e }], types: hgTypeOpts(h, x.e), t: x.t || hgTypesFor(h, x.e)[0], n: x.n || '', i: x.i || '', dn: H.name(h, x.e), main: x.e };
    if (sc === this._pageScope()) { const cc = (this._config.cards || [])[this._lkeys.indexOf(k)] || {}, ents = [];
      const seenE = new Set(), adds = [], eidOf = (y) => (typeof y === 'string' ? y : y && y.entity);
      for (const [key, v] of Object.entries(cc)) { const cur = hgDedupArr(cf.set && cf.set[key] !== undefined ? cf.set[key] : v);
        if (ok(cur)) { if (!seenE.has(cur)) { seenE.add(cur); ents.push({ p: key, l: LBL[key] || key, v: cur }); } continue; }
        if (!Array.isArray(cur)) continue; const valid = cur.map(eidOf).filter(ok);
        /* lista-alias (te same encje pod inną nazwą klucza) – pomijamy, żeby nie dublować */
        if (!valid.length || valid.every((e) => seenE.has(e))) continue;
        cur.forEach((y, i) => { const yy = eidOf(y); if (ok(yy) && !seenE.has(yy)) { seenE.add(yy); ents.push({ p: key + '.' + i, l: `${LBL[key] || key} ${i + 1}`, v: yy, ak: key, ai: i }); } });
        adds.push({ add: key, doms: [...new Set(valid.map((e) => e.split('.')[0]))] }); }
      ents.push(...adds);
      const main = (ents[0] || {}).v;
      const grpN = ents.filter((x) => x.ak).length, grp = grpN >= 2;
      return { kind: 'card', cc, grp, ents: ents.slice(0, 40), types: grp ? HG_GRP_TYPES : [['card', hgTr('Normalny', 'Default')], ...(main ? hgTypesFor(h, main).map((t) => [t, HG_TYPES[t]]) : [])], t: (grp && cf.t && !cf.t.startsWith('g-')) ? 'card' : (cf.t || 'card'), n: cf.n || '', i: cf.i || '', dn: cc.title || cc.name || HG_GRP_LBL[k.split('|')[0].replace(/^(hg|nuvio)-|-card$/g, '')] || k.split('|')[0].replace(/^hg-|-card$/g, ''), main }; }
    if (sc === 'rooms') { const ac = (this._cards || []).map((c) => c._config && c._config.areas).find(Boolean) || {}, a = HGAreas.model(h, ac).byId[k] || {};
      return { kind: 'room', a, ents: [{ p: 'temp', l: hgTr('Temperatura', 'Temperature'), v: cf.temp || (a.temp && a.temp.e) || '' }, { p: 'hum', l: hgTr('Wilgotność', 'Humidity'), v: cf.hum || (a.hum && a.hum.e) || '' }],
        types: [['', hgTr('Normalny', 'Default')], ['compact', HG_TYPES.compact], ['minimal', HG_TYPES.minimal]], t: cf.t || '', n: cf.n || '', i: cf.i || '', dn: a.name || k }; }
    const it = ct.el.querySelector(`:scope > [data-hgk="${CSS.escape(k)}"]`), sw = (L.conf._swap) || {}, seen = new Set(), ents = [];
    if (it) for (const el of it.querySelectorAll('[data-e],[data-ac],[data-cam]')) { const v = el.dataset.e || el.dataset.ac || el.dataset.cam; if (ok(v) && !seen.has(v)) { seen.add(v); ents.push({ p: 'swap', l: ents.length ? hgTr('Encja', 'Entity') : hgTr('Główna encja', 'Main entity'), v }); } }
    const hd = it && it.querySelector('.sh');
    return { kind: 'sec', ents: ents.slice(0, 12), types: [['', hgTr('Normalny', 'Default')], ['compact', HG_TYPES.compact], ['minimal', HG_TYPES.minimal]], t: cf.t || '', n: L.names[k] || '', i: cf.i || '', dn: hd ? hd.textContent.replace(/\d+.*$/, '').trim() : k, it };
  },
  _eCfg(ct, k) { this._eStk = []; this._eKidStk = []; if (!this._eBacking) this._eSnapTake();
    { const L0 = HGL.get(ct.scope); if (hgDedupConf(JSON.parse(JSON.stringify(L0)))) this._eSet(ct.scope, (L) => { hgDedupConf(L); }); }
    { const x0 = HGL.get(ct.scope).added.find((y) => y.e === k); if (x0 && x0.comp && HG_COMP.some((C) => C.id === x0.comp)) { const C = HG_COMP.find((c) => c.id === x0.comp);
      this._eGalSc = ct.scope; this._eGalCt = ct; return this._eComp(C.id, { cid: C.id, sc: ct.scope, edit: k, v: x0.v ? JSON.parse(JSON.stringify(x0.v)) : { e: x0.e }, t: x0.t || C.tile || '', n: x0.n || '', i: x0.i || '', z: HGL.get(ct.scope).size[k] || 's' }); } }
    const h = this._hass, sc = ct.scope, L = HGL.get(sc), z = L.size[k] || 's', canSz = ct.page ? !this._config.panel.areas : ct.sz;
    const S0 = this._eSubj(ct, k); this._eCfgR = { sc, k, ct, S: S0 }; this._eSheet('cfg');
    const S = this._eSheetEl, ttl = { added: hgTr('Ustawienia kafelka', 'Tile settings'), card: hgTr('Ustawienia karty', 'Card settings'), room: hgTr('Ustawienia pokoju', 'Room settings'), sec: hgTr('Ustawienia sekcji', 'Section settings') }[S0.kind]; requestAnimationFrame(() => this._eEntDrag());
    const ico = (v) => (h.states[v] && h.states[v].attributes.icon) || HG_DOM_ICON2[String(v).split('.')[0]] || 'mdi:circle-outline';
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${ttl}"><style>${HG_STY_CSS}</style><div class="hs-h"><b>${ttl}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div>
      <div class="hs-sc">
      <div class="hs-pv"><small>${hgTr('Podgląd na żywo', 'Live preview')}</small><div class="hs-pvb"></div></div>
      ${S0.ents.length ? `<div class="hs-fl hs-ents"><span>${hgTr('Encje', 'Entities')}</span>${S0.ents.map((x) => x.add ? `<button class="hs-r hs-add" data-hge="cfgadd" data-k="${H.esc(x.add)}" data-d="${H.esc(x.doms.join(','))}"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>${hgTr('Dodaj encję', 'Add entity')}</b><small>${H.esc(x.doms.join(', '))}</small></span></button>`
        : `<div class="hs-r hs-er" ${x.ak ? `data-ak="${H.esc(x.ak)}" data-ai="${x.ai}"` : ''}>${x.ak ? `<span class="hs-dg" data-hgdrag role="button" tabindex="0" aria-label="${hgTr('Przeciągnij lub użyj strzałek, aby zmienić kolejność', 'Drag or use arrow keys to reorder')}" title="${hgTr('Przeciągnij', 'Drag')}">${H.icon('mdi:drag-vertical')}</span>` : ''}<button class="hs-eb" data-hge="cfgent" data-p="${H.esc(x.p)}" data-v="${H.esc(x.v)}"><span class="hs-i">${H.icon(x.v ? ico(x.v) : 'mdi:plus')}</span><span class="hs-t"><b>${x.ak ? `<em class="hs-ix">${x.ai + 1}</em>` : ''}${H.esc(x.v ? H.name(h, x.v) : hgTr('Wybierz encję', 'Choose entity'))}</b><small>${H.esc(x.ak ? (x.v || '—') : x.l + ' · ' + (x.v || '—'))}</small></span><span class="hs-p" title="${hgTr('Zmień', 'Change')}">${H.icon('mdi:swap-horizontal')}</span></button>${x.ak ? `<button class="hs-del" data-hge="cfgdel" data-k="${H.esc(x.ak)}" data-i="${x.ai}" aria-label="${hgTr('Usuń', 'Remove')}" title="${hgTr('Usuń', 'Remove')}">${H.icon('mdi:close')}</button>` : ''}</div>`).join('')}</div>` : ''}
      <div class="hs-fl"><span>${hgTr('Tryb wyświetlania', 'Display mode')}</span>${hgStyleCards(h, S0.main || (S0.kind === 'added' ? k : ''), S0.types, S0.t, 'cfgt', S0.kind === 'room' || S0.kind === 'sec')}</div>
      <label class="hs-fl"><span>${hgTr('Nazwa', 'Name')}</span><span class="hs-s"><input class="hs-in" name="n" value="${H.esc(S0.n)}" placeholder="${H.esc(S0.dn)}" autocomplete="off"></span></label>
      <label class="hs-fl"><span>${hgTr('Ikona (np. mdi:sofa)', 'Icon (e.g. mdi:sofa)')}</span><span class="hs-s">${H.icon(S0.i || 'mdi:shape-outline')}<input class="hs-in" name="i" value="${H.esc(S0.i)}" placeholder="mdi:…" autocomplete="off"></span></label>
      ${ct.page ? (() => { const w0 = (L.conf[k] && L.conf[k].w) || '', box = (f) => `<span aria-hidden="true" style="display:flex;gap:3px;width:44px;height:22px;flex:none"><i style="flex:1;border-radius:4px;background:${f ? 'currentColor' : 'color-mix(in srgb, currentColor 40%, transparent)'}"></i>${f ? '' : '<i style="flex:1;border-radius:4px;border:1.5px dashed color-mix(in srgb, currentColor 35%, transparent)"></i>'}</span>`;
        return `<div class="hs-fl"><span>${hgTr('Szerokość', 'Width')}</span><div class="hs-f wrap" role="radiogroup" aria-label="${hgTr('Szerokość', 'Width')}">${[['', hgTr('Automatyczna', 'Automatic'), null], ['full', hgTr('Pełna szerokość', 'Full width'), 1], ['half', hgTr('Połowa', 'Half'), 0]].map(([v, l, f]) => `<button data-hge="cfgw" data-w="${v}" role="radio" aria-pressed="${w0 === v}" aria-checked="${w0 === v}" style="gap:8px">${f == null ? '' : box(f)}${l}</button>`).join('')}</div><small style="opacity:.6;font-size:12px">${hgTr('Na telefonie każda sekcja ma pełną szerokość.', 'On phones every section is full width.')}</small></div>`; })() : ''}
      ${canSz ? `<div class="hs-fl"><span>${hgTr('Rozmiar', 'Size')}</span>${hgSzSeg('cfgz', z)}</div>` : ''}
      </div>
      <div class="hs-ac"><button class="hs-b2" data-hge="sheetclose">${hgTr('Anuluj', 'Cancel')}</button><button class="hs-b" data-hge="cfgsave">${hgTr('Zapisz', 'Save')}</button></div></div>`;
    for (const n of S.querySelectorAll('input[name]')) n.addEventListener('input', () => { if (n.name === 'i') { const ic = n.parentElement.querySelector('ha-icon'); if (ic && /^mdi:[a-z0-9-]+$/.test(n.value.trim())) ic.setAttribute('icon', n.value.trim()); } this._eCfgPv(); }); hgIcWire(S);
    this._eCfgPv();
  },
  _eCfgVals() { const S = this._eSheetEl, g = (q) => S.querySelector(q);
    return { n: g('[name=n]').value.trim(), i: /^mdi:[a-z0-9-]+$/.test(g('[name=i]').value.trim()) ? g('[name=i]').value.trim() : '', t: (g('[data-hge=cfgt][aria-pressed=true]') || { dataset: { t: '' } }).dataset.t, w: g('[data-hge=cfgw]') ? (g('[data-hge=cfgw][aria-pressed=true]') || { dataset: { w: '' } }).dataset.w : null, z: (g('[data-hge=cfgz][aria-pressed=true]') || { dataset: {} }).dataset.z }; },
  /* podgląd: kafel (typy kafli) albo kopia bieżącego elementu z klasą trybu, nazwą i ikoną */
  _eCfgPv() {
    const R = this._eCfgR, S0 = R.S, h = this._hass, pv = this._eSheetEl && this._eSheetEl.querySelector('.hs-pvb'); if (!pv) return;
    const V = this._eCfgVals();
    if (S0.kind === 'card' && V.t && V.t.startsWith('g-')) { const es = S0.ents.filter((x) => x.ak).map((x) => x.v), tt = V.t === 'g-list' ? 'compact' : V.t === 'g-clist' ? 'minimal' : '';
      const gi = V.i || (S0.cc && S0.cc.icon) || '';
      pv.className = 'hs-pvb'; pv.innerHTML = `<div class="hgg ${V.t}"><div class="hgg-h">${gi ? H.icon(gi) : ''}<b>${H.esc(V.n || S0.dn)}</b><small>${es.length}</small></div><div class="hgg-b">${es.slice(0, 8).map((e) => `<div class="tg2 one">${hgTileHtml(h, e, 's', tt && hgTypesFor(h, e).includes(tt) ? { t: tt } : {})}</div>`).join('')}</div></div>`; hgSlots({ _hass: h, $: pv }); return; }
    if (S0.kind === 'added' || (S0.kind === 'card' && V.t && V.t !== 'card')) { pv.className = 'hs-pvb tg2'; pv.innerHTML = hgTileHtml(h, S0.main, 's', { t: V.t, n: V.n, i: V.i }); hgSlots({ _hass: h, $: pv }); hgPvLive(pv); return; }
    const it = R.ct.el.querySelector(`:scope > [data-hgk="${CSS.escape(R.k)}"]`); if (!it) { pv.innerHTML = ''; return; }
    if (S0.kind === 'card') { const src = [...it.querySelectorAll('*')].find((x) => x.tagName.includes('-') && x.setConfig); if (src) {
      const cf = (HGL.get(R.sc).conf[R.k] || {}), cfg = Object.assign({}, S0.cc, cf.set || {}); if (V.n) { cfg.title = V.n; cfg.name = V.n; } if (V.i) cfg.icon = V.i;
      const el = document.createElement(src.tagName.toLowerCase()); el._hgPv = true; try { el.setConfig(cfg); } catch (e) { /* zła konfiguracja – pokaż pusty */ }
      const ir = it.getBoundingClientRect();
      pv.className = 'hs-pvb live'; pv.innerHTML = ''; const box = document.createElement('div'); box.className = 'hs-pvf'; box.appendChild(el); pv.appendChild(box); el.hass = h; this._ePvEl = el; hgPvLive(pv); hgPvFit(box, el, ir.width || 0, ir.height > 40 ? Math.round(ir.height) : 0); return; } }
    const cl = it.cloneNode(true); for (const x of cl.querySelectorAll('.hge, .hge-cf')) x.remove();
    cl.classList.remove('hgm-compact', 'hgm-minimal'); if (V.t) cl.classList.add('hgm-' + V.t); cl.style.cssText = 'animation:none;outline:none;width:100%;transform:none;';
    const nmEl = cl.querySelector('.nm, .sh'); if (nmEl && V.n) { const ic0 = nmEl.querySelector('ha-icon'); nmEl.textContent = V.n; if (ic0) nmEl.prepend(ic0); }
    const icEl = cl.querySelector('.sh ha-icon') || cl.querySelector('.ic ha-icon'); if (icEl && V.i) icEl.setAttribute('icon', V.i);
    pv.className = 'hs-pvb clone'; pv.innerHTML = ''; const host = document.createElement('div'); pv.appendChild(host);
    const sr = host.attachShadow({ mode: 'open' }); const src = R.ct.root; sr.innerHTML = [...src.querySelectorAll('style')].map((x) => x.outerHTML).join('');
    const wrap = document.createElement('div'); wrap.className = R.ct.el.className.replace('hge-on', ''); wrap.style.cssText = 'display:block;columns:auto;pointer-events:none'; wrap.appendChild(cl); sr.appendChild(wrap);
  },
  /* tablice encji karty (sceny, kamery, …): nadpisanie cf.set[key] – dodaj / usuń / kolejność, potem odśwież widok i wróć do ustawień */
  _eCfgArrGet(R, key) { const cf = HGL.get(R.sc).conf[R.k] || {}; return hgDedupArr((cf.set && cf.set[key]) || (R.S.cc && R.S.cc[key]) || []); },
  _eCfgArr(R, key, fn, msg) { const A = this._eCfgArrGet(R, key); fn(A);
    this._eSet(R.sc, (L) => { const cf = L.conf[R.k] = L.conf[R.k] || {}; cf.set = cf.set || {}; cf.set[key] = A; });
    if (msg) this._eToast(msg); const pg = R.sc === this._pageScope(), re = () => { const ct = this._eConts().find((c) => c.scope === R.sc); if (ct) setTimeout(() => this._eCfg(ct, R.k), 120); };
    const pr = this._eRefresh(pg); if (pr && pr.then) pr.then(re); else requestAnimationFrame(re); },
  _eEntDrag() { const S = this._eSheetEl; if (!S) return;
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('pointerdown', (ev) => { const row = hd.closest('.hs-er'), key = row.dataset.ak, box = row.parentElement; ev.preventDefault(); ev.stopPropagation();
      hd.setPointerCapture(ev.pointerId); row.classList.add('drag');
      const mv = (e) => { const sib = [...box.querySelectorAll(`.hs-er[data-ak="${CSS.escape(key)}"]`)].filter((x) => x !== row); let ref = null;
        for (const x of sib) { const r = x.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { ref = x; break; } }
        const last = sib[sib.length - 1]; if (ref) { if (row.nextElementSibling !== ref) box.insertBefore(row, ref); } else if (last && last.nextElementSibling !== row) box.insertBefore(row, last.nextElementSibling); };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); row.classList.remove('drag');
        const ord = [...box.querySelectorAll(`.hs-er[data-ak="${CSS.escape(key)}"]`)].map((x) => +x.dataset.ai); if (ord.every((v, i) => v === i)) return;
        this._eCfgArr(this._eCfgR, key, (A) => { const src = A.slice(); A.length = 0; for (const i of ord) A.push(src[i]); for (let i = 0; i < src.length; i++) if (!ord.includes(i)) A.push(src[i]); }, hgTr('Zmieniono kolejność', 'Order changed')); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); });
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('keydown', (ev) => { if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return; ev.preventDefault(); ev.stopPropagation();
      const row = hd.closest('.hs-er'), key = row.dataset.ak, i = +row.dataset.ai, j = i + (ev.key === 'ArrowUp' ? -1 : 1);
      if (j < 0 || j >= (this._eCfgArrGet(this._eCfgR, key) || []).length) return;
      this._eCfgArr(this._eCfgR, key, (A) => { [A[i], A[j]] = [A[j], A[i]]; }, hgTr('Zmieniono kolejność', 'Order changed'));
      setTimeout(() => { const nh = this._eSheetEl && this._eSheetEl.querySelector(`.hs-er[data-ak="${CSS.escape(key)}"][data-ai="${j}"] [data-hgdrag]`); if (nh) nh.focus(); }, 450); });
  },
  _eCfgSet(R, nv) {
    const S0 = R.S, p = R.path;
    this._eSet(R.sc, (L) => { const cf = L.conf[R.k] = L.conf[R.k] || {};
      if (S0.kind === 'added') { const x = L.added.find((y) => y.e === R.k); if (x) { if (L.size[R.k]) { L.size[nv] = L.size[R.k]; delete L.size[R.k]; } x.e = nv; } L.order = L.order.map((k) => (k === R.k ? nv : k)); delete L.conf[R.k]; }
      else if (S0.kind === 'card') { cf.set = cf.set || {}; const [key, idx] = p.split('.'); if (idx == null) cf.set[key] = nv; else { const base = (cf.set[key] || S0.cc[key] || []).slice(); if (R.add) { const o = base.find((y) => y && typeof y === 'object'), st = this._hass.states[nv]; base.push(o ? { entity: nv, name: (st && st.attributes.friendly_name) || nv, ...(st && st.attributes.icon ? { icon: st.attributes.icon } : {}) } : nv); } else base[+idx] = typeof base[+idx] === 'object' && base[+idx] ? Object.assign({}, base[+idx], { entity: nv }) : nv; cf.set[key] = base; } }
      else if (S0.kind === 'room') cf[p] = nv;
      else { const sw = L.conf._swap = L.conf._swap || {}; sw[R.old] = nv; }
    });
  },
  _eCfgSave() {
    const R = this._eCfgR, S0 = R.S, V = this._eCfgVals();
    this._eSet(R.sc, (L) => {
      if (S0.kind === 'added') { const x = L.added.find((y) => y.e === R.k); if (x) { for (const f of ['n', 'i', 't']) if (V[f]) x[f] = V[f]; else delete x[f]; } }
      else if (S0.kind === 'sec') { if (V.n) L.names[R.k] = V.n; else delete L.names[R.k]; const cf = L.conf[R.k] = L.conf[R.k] || {}; for (const f of ['i', 't']) if (V[f]) cf[f] = V[f]; else delete cf[f]; }
      else { const cf = L.conf[R.k] = L.conf[R.k] || {}; for (const f of ['n', 'i']) if (V[f]) cf[f] = V[f]; else delete cf[f]; if (V.t && V.t !== 'card') cf.t = V.t; else delete cf.t; }
      if (V.w != null) { const cw = L.conf[R.k] = L.conf[R.k] || {}; if (V.w === 'full' || V.w === 'half') cw.w = V.w; else delete cw.w; }
      if (V.z) { if (V.z === 's') delete L.size[R.k]; else L.size[R.k] = V.z; }
    });
    this._eSheet(false); this._eToast(hgTr('Zapisano ustawienia', 'Settings saved')); return this._eRefresh(R.sc === this._pageScope());
  },
  /* krok 2 dodawania: styl widżetu z podglądem na żywo */
  _eAddStep(sc, e, n) {
    const h = this._hass, S = this._eSheetEl, T = hgTypeOpts(h, e); this._eAddE = e;
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${hgTr('Styl widżetu', 'Widget style')}"><style>${HG_STY_CSS}</style><div class="hs-h"><b>${hgTr('Styl widżetu', 'Widget style')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>${hgTr('Podgląd na żywo', 'Live preview')} · ${H.esc(n || H.name(h, e))}</small><div class="hs-pvb tg2">${hgTileHtml(h, e, 's', { t: T[0][0] })}</div></div>
      <div class="hs-fl"><span>${hgTr('Styl', 'Style')}</span>${hgStyleCards(h, e, T, T[0][0], 'addt')}</div></div>
      <div class="hs-ac"><button class="hs-b2" data-hge="addback">${hgTr('Wstecz', 'Back')}</button><button class="hs-b" data-hge="addok">${H.icon('mdi:plus')}<span>${hgTr('Dodaj', 'Add')}</span></button></div></div>`;
    hgSlots({ _hass: h, $: S.querySelector('.hs-pvb') }); hgPvLive(S.querySelector('.hs-pvb')); this._eAddSc = sc; this._eAddN = n;
  },
  _eApp(f) { const A = Object.assign({}, HGApp.get()); f(A); HGApp.set(A); this._eBgSync(); },
  /* tło strony: nadpisanie z „Wygląd” ma pierwszeństwo przed zdjęciem z CFG (zmienne na hoście usuwane) */
  _eBgSync() { const A = HGApp.get(); if (A.bg) { this.style.removeProperty('--hg-bg-wide'); this.style.removeProperty('--hg-bg-portrait'); } else if (this._bgDef) { for (const [k, v] of this._bgDef) if (v) this.style.setProperty(k, `url('${v}')`); } this._glassRefresh && this._glassRefresh(); },
  _eLook() {
    /* zachowaj przewinięcie i fokus między przerysowaniami (bez skoku na górę) */
    { const S0 = this._eSheetEl, sc0 = S0 && S0.querySelector('.hge-sheet.lk .hs-sc'); if (sc0) { const fe = S0.querySelector(':focus') || (S0.getRootNode && S0.getRootNode().activeElement), key = fe && fe.dataset ? ['hge', 'v', 'k', 'c'].map((x) => fe.dataset[x] || '').join('|') : ''; const top = sc0.scrollTop;
      requestAnimationFrame(() => { const S1 = this._eSheetEl, sc1 = S1 && S1.querySelector('.hge-sheet.lk .hs-sc'); if (!sc1) return; sc1.scrollTop = top; if (key) { const el = [...S1.querySelectorAll('button')].find((b) => ['hge', 'v', 'k', 'c'].map((x) => b.dataset[x] || '').join('|') === key); if (el) el.focus({ preventScroll: true }); } }); } }
    this._eSheet('cfg'); const S = this._eSheetEl, A = HGApp.get(), acc = (A.accent || ('#' + '63D71E')).toUpperCase(), bg = A.bg || null, dim = A.dim != null ? A.dim : 0.4;
    const T = HGApp.tokens(acc);
    const isC = !HG_ACCENTS.some(([c]) => c.toUpperCase() === acc), c1 = bg && (bg.kind === 'color' || bg.kind === 'gradient') ? bg.v : ('#' + '16202B'), c2 = bg && bg.v2 ? bg.v2 : ('#' + '05070A'), dv = Math.round(dim * 100);
    const ck = H.icon('mdi:check');
    const TB = [['look', 'mdi:palette-outline', hgTr('Wygląd', 'Appearance')], ['views', 'mdi:view-carousel-outline', hgTr('Widoki', 'Views')], ['rooms', 'mdi:sofa-outline', hgTr('Pokoje', 'Rooms')], ['head', 'mdi:page-layout-header', hgTr('Nagłówek i nawigacja', 'Header and navigation')], ['bg', 'mdi:image-multiple-outline', hgTr('Tła', 'Backgrounds')], ['wall', 'mdi:tablet-dashboard', hgTr('Wygaszacz', 'Screensaver')], ['users', 'mdi:account-multiple-outline', hgTr('Użytkownicy', 'Users')], ['bk', 'mdi:backup-restore', hgTr('Kopia zapasowa', 'Backup')]];
    if (!TB.some((t) => t[0] === this._lkTab)) this._lkTab = 'look'; const at = this._lkTab;
    const html0 = `<div class="hs-sc lk-sc">
      <section class="lk-g" data-tab="look"><h4>${H.icon('mdi:palette-outline')}${hgTr('Akcent', 'Accent')}</h4>
        <div class="lk-sw">${HG_ACCENTS.map(([c, l0, l1]) => { const l = H.esc(hgTr(l0, l1)); return `<button data-hge="acc" data-c="${c}" aria-pressed="${acc === c.toUpperCase()}" aria-label="${l}"><i style="--c:${c}">${ck}</i><small>${l}</small></button>`; }).join('')}
        <label class="lk-cc" aria-pressed="${isC}"><i style="--c:${isC ? acc : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'}">${isC ? ck : H.icon('mdi:eyedropper-variant')}</i><input type="color" name="acc" value="${acc}" aria-label="${hgTr('Własny kolor akcentu', 'Custom accent colour')}"><small>${hgTr('Własny', 'Custom')}</small></label></div>
        <div class="lk-pv" aria-label="${hgTr('Podgląd', 'Preview')}"><div class="lk-pc"><span class="lk-pi" style="background:${acc};color:${T.light['--hg-on-accent']}">${H.icon('mdi:lightbulb-on')}</span><span class="lk-pt"><b>${hgTr('Lampa', 'Lamp')}</b><small style="color:var(--hg-accent-tx)">${hgTr('Włączone', 'On')} · 80%</small></span></div><span class="lk-pb" style="background:${acc};color:${T.light['--hg-on-accent']}">${ck} ${hgTr('Aktywny', 'Active')}</span></div></section>
      <section class="lk-g" data-tab="bg"><h4>${H.icon('mdi:image-outline')}${hgTr('Tło', 'Background')}</h4>
        <div class="lk-bgs">${hgBgList().map(([u, l, pu, th], i) => { const on = i ? !!bg && bg.kind !== 'color' && bg.kind !== 'gradient' && bg.v === u : !bg;
          const src = th || u || (HG_DEFAULT_BG.kind === 'image' ? HG_DEFAULT_BG.v : '');
          return `<button data-hge="bgp" data-v="${i ? H.esc(u) : ''}" data-p="${H.esc(pu || '')}" aria-pressed="${on}" title="${H.esc(l)}"><span data-et="${hgTr('Nie wczytano zdjęcia', 'Image not loaded')}" style="background:linear-gradient(160deg, ${HG_DEFAULT_BG_FB.v}, ${HG_DEFAULT_BG_FB.v2})">${src ? `<img alt="" loading="lazy" decoding="async" src="${H.esc(src)}" onerror="var c=!this.dataset.cdn&&window.hgCdn&&window.hgCdn(this.src);if(c){console.warn('Nuvio: local background failed, using CDN', this.src);this.dataset.cdn='1';this.src=c;}else{this.parentElement.dataset.err='1';console.warn('Nuvio: background not loaded', this.src);this.remove();}">` : ''}${ck}</span><small>${H.esc(i ? l : (l || hgTr('Domyślne', 'Default')))}</small></button>`; }).join('')}</div>
        <div class="lk-row"><span class="hs-s lk-url">${H.icon('mdi:link-variant')}<input class="hs-in" name="bgurl" placeholder="${hgTr('Adres zdjęcia: https://… lub /local/…', 'Image URL: https://… or /local/…')}" value="${H.esc(bg && bg.kind === 'url' ? bg.v : '')}" autocomplete="off"><button class="lk-mini" data-hge="bgurl">${hgTr('Ustaw', 'Set')}</button></span>
          <button class="lk-up" data-hge="bgup" title="${hgTr('Prześlij zdjęcie do Home Assistant', 'Upload an image to Home Assistant')}">${H.icon('mdi:upload')}<span>${hgTr('Prześlij', 'Upload')}</span></button><input type="file" accept="image/*" hidden></div>
        <div class="lk-grd"><div class="lk-gp" style="background:linear-gradient(135deg,${c1},${c2})"></div>
          <label class="lk-st"><input type="color" name="bgc1" value="${c1}" aria-label="${hgTr('Kolor 1', 'Colour 1')}"><i style="background:${c1}"></i>${hgTr('Kolor 1', 'Colour 1')}</label>
          <label class="lk-st"><input type="color" name="bgc2" value="${c2}" aria-label="${hgTr('Kolor 2', 'Colour 2')}"><i style="background:${c2}"></i>${hgTr('Kolor 2', 'Colour 2')}</label>
          <div class="lk-seg"><button data-hge="bgcol" data-k="color" aria-pressed="${!!bg && bg.kind === 'color'}">${hgTr('Jednolity', 'Solid')}</button><button data-hge="bgcol" data-k="gradient" aria-pressed="${!!bg && bg.kind === 'gradient'}">${hgTr('Gradient', 'Gradient')}</button></div></div></section>
      <section class="lk-g" data-tab="look"><h4>${H.icon('mdi:brightness-6')}${hgTr('Przyciemnienie', 'Dimming')}<em class="dv">${dv}%</em></h4><small class="lk-hn">${hgTr('Dotyczy tła w trybie ciemnym', 'Applies to the background in dark mode')}</small>
        <input class="lk-rg" type="range" min="0" max="100" step="1" name="dim" value="${dv}" style="--v:${dv}%" aria-label="${hgTr('Przyciemnienie tła', 'Background dimming')}"></section>
      ${window.HGLookX ? HGLookX.html(this) : ''}
      ${window.HGRoomsX ? HGRoomsX.html(this) : ''}
      ${window.HGAssistUI ? HGAssistUI.html(this) : ''}
      ${window.HGWall ? HGWall.html(this) : ''}
      ${window.HGUsers ? HGUsers.html(this) : ''}
      ${window.HGBackup ? HGBackup.html(this) : ''}
      </div>`;
    const has = new Set([...html0.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1])), tabs = TB.filter((t) => has.has(t[0]));
    const html = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide lk lkt" data-at="${at}" role="dialog" aria-modal="true" aria-label="${hgTr('Ustawienia', 'Settings')}"><style>${HG_LOOK_CSS}${HG_LKT_CSS(TB.map((t) => t[0]))}</style><div class="hs-h"><b>${H.icon('mdi:cog-outline')}${hgTr('Ustawienia', 'Settings')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div>
      <nav class="lk-tabs" role="tablist" aria-label="${hgTr('Sekcje ustawień', 'Settings sections')}">${tabs.map(([k, ic, l]) => `<button role="tab" data-hge="lktab" data-k="${k}" aria-selected="${k === at}">${H.icon(ic)}<span>${H.esc(l)}</span></button>`).join('')}</nav>${html0}<div class="lk-ft"><button class="lk-gh" data-hge="lookreset">${H.icon('mdi:restore')}${hgTr('Przywróć domyślne', 'Reset to default')}</button><button class="lk-ok" data-hge="sheetclose">${hgTr('Gotowe', 'Done')}</button></div></div>`;
    /* otwarty arkusz: aktualizacja na miejscu (bez ponownej animacji otwarcia), przewijany kontener zostaje, więc pozycja przewinięcia też */
    { const old = S.querySelector('.hge-sheet.lk'); if (old) { const tp = document.createElement('template'); tp.innerHTML = html; const nw = tp.content.querySelector('.hge-sheet');
      const oc = [...old.children], nc = [...nw.children];
      if (oc.length === nc.length) nc.forEach((n, j) => { const o = oc[j]; if (o.classList.contains('hs-sc') && n.classList.contains('hs-sc')) { const t0 = o.scrollTop; o.replaceChildren(...n.childNodes); o.scrollTop = t0; } else o.replaceWith(n); });
      else old.replaceChildren(...nw.childNodes); } else S.innerHTML = html; }
    const gu = () => { const v1 = S.querySelector('[name=bgc1]').value, v2 = S.querySelector('[name=bgc2]').value; S.querySelector('.lk-gp').style.background = `linear-gradient(135deg,${v1},${v2})`; S.querySelectorAll('.lk-st i')[0].style.background = v1; S.querySelectorAll('.lk-st i')[1].style.background = v2; };
    S.querySelectorAll('[name=bgc1],[name=bgc2]').forEach((x) => x.addEventListener('input', gu));
    S.querySelector('[name=acc]').addEventListener('change', (e) => { this._eApp((A2) => { A2.accent = e.target.value.toUpperCase(); }); this._eLook(); });
    const rg = S.querySelector('[name=dim]'); rg.addEventListener('input', () => { rg.style.setProperty('--v', rg.value + '%'); S.querySelector('.dv').textContent = rg.value + '%'; this._eApp((A2) => { A2.dim = rg.value / 100; }); });
    S.querySelector('input[type=file]').addEventListener('change', (e) => this._eUpload(e.target.files && e.target.files[0]));
    if (window.HGWall) HGWall.wire(this, S);
    if (window.HGRoomsX) HGRoomsX.wire(this, S);
    if (window.HGAssistUI) HGAssistUI.wire(this, S);
  },
  /* przesłanie zdjęcia: integracja „image_upload” HA (/api/image/upload), serwowane z /api/image/serve/<id>/original */
  /* nawigacja w arkuszu jako stos: zagnieżdżony krok (wybór encji, formularz) wraca do poprzedniego; zamyka tylko X na poziomie głównym */
  _eGo(back, fn) { const S = this._eSheetEl, sc = S && S.querySelector('.hge-sheet .hs-sc'), t = this._eTrig;
    const key = t && t.dataset ? ['hge', 'c', 'k', 'i', 'e', 't'].filter((x) => t.dataset[x] != null).map((x) => `[data-${x}="${CSS.escape(t.dataset[x])}"]`).join('') : '';
    (this._eStk = this._eStk || []).push({ back, top: sc ? sc.scrollTop : 0, key, form: this._eFormGet() }); this._eNav('f'); fn(); this._eFocusTitle(); },
  /* stan formularza kroku (pola i przełączniki aria-pressed), odtwarzany po powrocie, gdy krok czyta wartości z DOM */
  _eBk(t) { return ['hge', 'c', 'k', 'i', 'e', 't', 'v', 'w', 'z'].filter((x) => t.dataset[x] != null).map((x) => `[data-${x}="${CSS.escape(t.dataset[x])}"]`).join(''); },
  _eFormGet() { const S = this._eSheetEl, sh = S && S.querySelector('.hge-sheet'); if (!sh) return null;
    return { f: [...sh.querySelectorAll('input[name], select[name], textarea[name]')].map((i) => [i.name, i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value, i.type]), p: [...sh.querySelectorAll('[aria-pressed][data-hge]')].map((b) => [this._eBk(b), b.getAttribute('aria-pressed')]) }; },
  _eFormSet(F) { const S = this._eSheetEl, sh = S && S.querySelector('.hge-sheet'); if (!sh || !F) return;
    for (const [n, v, t] of F.f) { const i = sh.querySelector(`[name="${CSS.escape(n)}"]`); if (!i) continue; if (t === 'checkbox' || t === 'radio') i.checked = v; else if (i.value !== v) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } }
    for (const [k, v] of F.p) { const b = k && sh.querySelector(k); if (b) b.setAttribute('aria-pressed', v); } },
  _eBack() { const f = (this._eStk || []).pop(); if (!f) return this._eClose(); this._eRepl = null; this._eNav('b'); this._eBacking = true; try { (f.back || f)(); } finally { this._eBacking = false; } if (f.form) this._eFormSet(f.form);
    const S = this._eSheetEl; if (!S) return; const sc = S.querySelector('.hge-sheet .hs-sc'); if (sc && f.top) sc.scrollTop = f.top;
    requestAnimationFrame(() => { const sc2 = S.querySelector('.hge-sheet .hs-sc'); if (sc2 && f.top) sc2.scrollTop = f.top; const el = f.key && S.querySelector(f.key); if (el) el.focus({ preventScroll: true }); else this._eFocusTitle(); }); },
  _eFocusTitle() { requestAnimationFrame(() => { const t = this._eSheetEl && this._eSheetEl.querySelector('.hge-sheet .hs-h b'); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } }); },
  /* niezapisane zmiany: migawka stanu formularza przy otwarciu poziomu głównego */
  _eSnapVal() { const S = this._eSheetEl, rep = (k, v) => (v && (v.nodeType || typeof v === 'function') ? undefined : v);
    try { return JSON.stringify([this._eCompR, this._eCfgR && this._eCfgR.v, this._eCfgR && this._eCfgR.set, S ? [...S.querySelectorAll('.hge-sheet input:not([type=search]), .hge-sheet select, .hge-sheet textarea')].filter((i) => !i.closest('.hs-s.srch')).map((i) => i.type === 'checkbox' ? i.checked : i.value) : []], rep); } catch (e) { return ''; } },
  /* migawka formularza arkusza (osobna od this._eSnap trybu edycji): tylko formularze z zapisem (ustawienia karty, komponent) */
  _eSnapTake() { const t = this._eShT = (this._eShT || 0) + 1; this._eShSnap = null; requestAnimationFrame(() => { if (t === this._eShT) this._eShSnap = this._eSnapVal(); }); },
  _eDirtySheet() { return this._eShSnap != null && this._eSnapVal() !== this._eShSnap; },
  _eClose() { const S = this._eSheetEl, sh = S && S.querySelector('.hge-sheet'); if (!sh || !this._eDirtySheet()) return this._eSheet(false);
    if (sh.querySelector('.hs-cf')) return; sh.insertAdjacentHTML('beforeend', `<div class="hs-cf" role="alertdialog" aria-modal="true" aria-labelledby="hscf-t"><div class="hs-cfb"><b id="hscf-t">${hgTr('Odrzucić zmiany?', 'Discard changes?')}</b><small>${hgTr('Niezapisane zmiany w tym oknie zostaną utracone.', 'Unsaved changes in this sheet will be lost.')}</small><div><button class="hs-b2" data-hge="cfstay">${hgTr('Zostań', 'Stay')}</button><button class="hs-b hs-bd" data-hge="cfdrop">${hgTr('Odrzuć', 'Discard')}</button></div></div></div>`);
    requestAnimationFrame(() => { const b = sh.querySelector('[data-hge=cfstay]'); if (b) b.focus(); }); },
  _eNav(d) { const L = this._eSheetEl; if (!L) return; L.classList.remove('nav-f', 'nav-b'); void L.offsetWidth; L.classList.add('nav-' + d); clearTimeout(this._eNavT); this._eNavT = setTimeout(() => L.classList.remove('nav-f', 'nav-b'), 320); },
  _eCfgBack() { this._eRepl = null; const R = this._eCfgR, ct = R && this._eConts().find((c) => c.scope === R.sc); if (ct) this._eCfg(ct, R.k); else this._eSheet(false); },
  _eDeco() { const L = this._eSheetEl, n = (this._eStk || []).length; if (!L) return; const hd = L.querySelector('.hge-sheet .hs-h'); if (!hd) return;
    const bk = hd.querySelector('.hs-bk'); if (n && !bk) hd.insertAdjacentHTML('afterbegin', `<button class="hs-bk" data-hge="sback" aria-label="${hgTr('Wstecz', 'Back')}" title="${hgTr('Wstecz', 'Back')}">${H.icon('mdi:arrow-left')}</button>`); else if (!n && bk) bk.remove();
    const x = hd.querySelector('.hs-x'); if (x) x.setAttribute('aria-label', n ? hgTr('Wróć do poprzedniego kroku', 'Back to previous step') : hgTr('Zamknij', 'Close')); },
  _eUpload(f) {
    if (!f) return; const h = this._hass; if (!h || !h.fetchWithAuth) return this._eToast(hgTr('Brak sesji – nie można przesłać', 'No session – cannot upload'));
    const fd = new FormData(); fd.append('file', f, f.name); this._eToast(hgTr('Przesyłanie…', 'Uploading…'));
    /* fetchWithAuth odświeża wygasły token (tablety otwarte dłużej niż 30 min) */
    h.fetchWithAuth('/api/image/upload', { method: 'POST', body: fd }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((j) => {
      const u = `/api/image/serve/${j.id}/original`; this._eApp((A) => { A.bg = { kind: 'url', v: u }; }); this._eToast(hgTr('Ustawiono przesłane zdjęcie', 'Uploaded image set')); this._eLook(); }, (e) => this._eToast(hgTr('Nie udało się przesłać (', 'Upload failed (') + e + ')'));
  },
  _eSheet(mode, ct, scOver) {
    if (!mode) { this._eRepl = null; this._eStk = []; this._eKidStk = []; this._eShT = (this._eShT || 0) + 1; this._eShSnap = null; this._eSheetOpen = false; if (this._eSheetEl) { this._eSheetEl.remove(); this._eSheetEl = null; } return; }
    this._eSheetOpen = mode; this._eSheetCt = ct; if (!this._eBacking) { this._eF = 'all'; this._eQ = ''; }
    let L = this._eSheetEl; if (L && !L.isConnected) this.shadowRoot.appendChild(L); if (!L) { L = this._eSheetEl = document.createElement('div'); L.className = 'hge-sheet-l'; this.shadowRoot.appendChild(L); this._eStk = [];
      setTimeout(() => L.classList.add('opened'), 320); new MutationObserver(() => this._eDeco()).observe(L, { childList: true });
      let g = null; L.addEventListener('touchstart', (ev) => { const t = ev.touches[0], sh = L.querySelector('.hge-sheet'); if (!t || !sh) return; const r = sh.getBoundingClientRect(), sc = sh.querySelector('.hs-sc');
        g = { x: t.clientX, y: t.clientY, edge: t.clientX - r.left < 28, top: t.clientY - r.top < 64 || (sc && sc.scrollTop <= 0 && sc.contains(ev.target)) }; }, { passive: true });
      L.addEventListener('touchend', (ev) => { const t = ev.changedTouches[0]; if (!g || !t) return; const dx = t.clientX - g.x, dy = t.clientY - g.y, n = (this._eStk || []).length;
        if (g.edge && dx > 70 && Math.abs(dy) < 50 && n) this._eBack(); else if (g.top && dy > 90 && Math.abs(dx) < 60 && !n) this._eClose(); g = null; }, { passive: true }); }
    if (!this.shadowRoot.querySelector('style[data-hgt]')) { const st = document.createElement('style'); st.dataset.hgt = '1'; st.textContent = HG_TILE_CSS; this.shadowRoot.appendChild(st); }
    if (mode === 'cfg') return;
    if (mode === 'hidden') { const hid = this._eHidden();
      L.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet" role="dialog" aria-modal="true" aria-label="${hgTr('Przywróć ukryte', 'Restore hidden')}"><div class="hs-h"><b>${hgTr('Przywróć ukryte', 'Restore hidden')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div>
        <div class="hs-l">${hid.length ? hid.map((x) => `<div class="hs-r"><span class="hs-i">${H.icon('mdi:eye-off-outline')}</span><span class="hs-t"><b>${H.esc(x.n)}</b><small>${H.esc(x.sc === this._pageScope() ? hgTr('Karta widoku', 'View card') : x.sc === 'rooms' ? hgTr('Pokój', 'Room') : x.sc.startsWith('room:') ? hgTr('Sekcja pokoju', 'Room section') : hgTr('Kafelek', 'Tile'))}</small></span><button class="hs-b" data-hge="restore" data-sc="${H.esc(x.sc)}" data-k="${H.esc(x.k)}">${hgTr('Przywróć', 'Restore')}</button></div>`).join('') : `<p class="hs-e">${hgTr('Brak ukrytych elementów w tym widoku.', 'No hidden items in this view.')}</p>`}</div></div>`;
      return;
    }
    if (!scOver) this._eRepl = null;
    const sc = scOver || (ct ? (ct.page ? ct.scope + ':tiles' : ct.scope) : (this._pageScope() + ':tiles')); this._eSc = sc;
    const rooms = sc === 'rooms' && !this._eRepl;
    L.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet" role="dialog" aria-modal="true" aria-label="${hgTr('Dodaj kafelek', 'Add tile')}"><div class="hs-h"><b>${this._eRepl ? hgTr('Zmień encję', 'Change entity') : rooms ? hgTr('Dodaj pokój', 'Add room') : sc.startsWith('room:') ? hgTr('Dodaj do pokoju', 'Add to room') : hgTr('Dodaj kafelek', 'Add tile')}</b><button class="hs-x" data-hge="sheetclose" aria-label="${hgTr('Zamknij', 'Close')}">${H.icon('mdi:close')}</button></div>
      <label class="hs-s">${H.icon('mdi:magnify')}<input type="search" placeholder="${rooms ? hgTr('Szukaj obszaru', 'Search areas') : hgTr('Szukaj po nazwie, pokoju lub domenie', 'Search by name, room or domain')}" aria-label="${hgTr('Szukaj', 'Search')}" autocomplete="off"><button class="hs-clr" type="button" hidden aria-label="${hgTr('Wyczyść', 'Clear')}">${H.icon('mdi:close')}</button></label>
      ${rooms ? '' : `<div class="hs-f" role="group" aria-label="${hgTr('Rodzaj', 'Type')}">${[['all', hgTr('Wszystkie', 'All')], ['light', hgTr('Światła', 'Lights')], ['tog', hgTr('Przełączniki', 'Switches')], ['val', hgTr('Czujniki', 'Sensors')], ['clim', hgTr('Klimat', 'Climate')], ['media', hgTr('Multimedia', 'Media')], ['cam', hgTr('Kamery', 'Cameras')], ['cover', hgTr('Rolety', 'Covers')], ['run', hgTr('Sceny i skrypty', 'Scenes and scripts')]].map(([f, l]) => `<button data-hge="filter" data-f="${f}" aria-pressed="${f === 'all'}">${l}</button>`).join('')}</div>`}
      ${rooms ? '' : '<div class="hs-pv" aria-live="polite"></div>'}<div class="hs-l" role="list"></div></div>`;
    const inp = L.querySelector('input'), clr = L.querySelector('.hs-clr'); if (this._eQ) { inp.value = this._eQ; clr.hidden = false; } inp.addEventListener('input', () => { this._eQ = inp.value; clr.hidden = !inp.value; this._eSheetList(); });
    clr.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); inp.value = ''; this._eQ = ''; clr.hidden = true; this._eSheetList(); inp.focus(); }, true);
    this._eSheetList(); setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 60);
  },
  /* encje już widoczne w widoku: atrybuty data-e/data-ac/data-cam/data-entity w DOM (głęboko) + identyfikatory w konfiguracji kart */
  _eShown() {
    const h = this._hass, S = new Set();
    const rx = /\b[a-z_]+\.[a-z0-9_]+\b/g, js = JSON.stringify(this._config.cards || []);
    for (const m of js.match(rx) || []) if (h.states[m]) S.add(m);
    const walk = (r, d) => { if (!r || d > 4) return; for (const el of r.querySelectorAll('[data-e],[data-ac],[data-cam],[data-entity],[data-hgk]')) { for (const v of [el.dataset.e, el.dataset.ac, el.dataset.cam, el.dataset.entity, el.dataset.hgk]) if (v && h.states[v]) S.add(v); }
      for (const el of r.querySelectorAll('*')) if (el.shadowRoot && /^(HG|NUVIO)-/.test(el.tagName)) walk(el.shadowRoot, d + 1); };
    walk(this.shadowRoot, 0);
    for (const sc of Object.keys(HGL.data.s)) for (const x of HGL.get(sc).added) if (sc === this._eSc) S.add(x.e);
    return S;
  },
  _eSheetList() {
    const L = this._eSheetEl; if (!L) return; const lst = L.querySelector('.hs-l'); if (!lst) return;
    for (const b of L.querySelectorAll('[data-hge=filter]')) b.setAttribute('aria-pressed', b.dataset.f === this._eF);
    const h = this._hass, sc = this._eSc, q = (this._eQ || '').trim().toLowerCase();
    if (sc === 'rooms' && !this._eRepl) {
      const ac = (this._cards || []).map((c) => c._config && c._config.areas).find(Boolean) || {}; const m = HGAreas.model(h, ac);
      const shown = new Set([...m.rooms.map((a) => a.id), ...HGL.get('rooms').added.map((x) => x.e)]); const hid = new Set(HGL.get('rooms').hidden);
      const list = m.list.filter((a) => a.id !== '_none' && (!shown.has(a.id) || hid.has(a.id)) && (!q || hgNorm(a.name).includes(hgNorm(q))));
      lst.innerHTML = list.length ? list.map((a) => `<button class="hs-r" role="listitem" data-hge="pick" data-sc="rooms" data-e="${H.esc(a.id)}" data-n="${H.esc(a.name)}"><span class="hs-i">${H.icon(a.icon)}</span><span class="hs-t"><b>${H.esc(a.name)}</b><small>${a.ents.length} ${a.ents.length === 1 ? hgTr('encja', 'entity') : hgTr('encji', 'entities')}${hid.has(a.id) ? hgTr(' · ukryty', ' · hidden') : ''}</small></span><span class="hs-p">${H.icon('mdi:plus')}</span></button>`).join('') : `<p class="hs-e">${hgTr('Wszystkie obszary są już na liście.', 'All areas are already on the list.')}</p>`;
      return;
    }
    const shown = this._eShown(), f = this._eF, reg = h.entities || {}, areas = h.areas || {}, devs = h.devices || {};
    const skip = new Set(['zone', 'sun', 'persistent_notification', 'update', 'tts', 'stt', 'conversation', 'event', 'image', 'device_tracker', 'group', 'input_text', 'input_datetime', 'todo', 'calendar', 'weather', 'wake_word', 'assist_satellite', 'select', 'number', 'text', 'time', 'date', 'datetime', 'notify', 'ai_task']);
    const arr = [];
    for (const e of Object.keys(h.states)) {
      const d = e.split('.')[0]; if (skip.has(d) || (!this._eRepl && shown.has(e))) continue; if (this._eRepl && ((this._eRepl.doms && !this._eRepl.doms.includes(d)) || (this._eRepl.excl && this._eRepl.excl.includes(e)) || (this._eRepl.flt && !this._eRepl.flt(e)))) continue;
      const r = reg[e]; if (r && (r.hidden || r.entity_category)) continue;
      const k = HG_TILE_KIND(e);
      if (f !== 'all' && !(f === 'light' ? d === 'light' : f === 'tog' ? k === 'tog' && d !== 'light' : f === k)) continue;
      const s = h.states[e], nm = H.name(h, e), aid = r && (r.area_id || (r.device_id && devs[r.device_id] && devs[r.device_id].area_id)), an = aid && areas[aid] ? areas[aid].name : '';
      if (q && !(hgNorm(nm).includes(hgNorm(q)) || e.includes(q) || hgNorm(an).includes(hgNorm(q)))) continue;
      arr.push({ e, nm, an, k, s });
    }
    const coll = new Intl.Collator(HG_LOC()); arr.sort((a, b) => coll.compare(a.nm, b.nm));
    const sh = arr; this._eArr = arr;
    const pv = L.querySelector('.hs-pv'); if (pv) { const fx = this._eF === 'all' ? null : this._eF;
      pv.innerHTML = sh.length ? `<small>${hgTr('Podgląd', 'Preview')}${fx ? ' · ' + H.esc(fx === 'light' ? hgTr('Światło', 'Light') : (HG_KIND_LBL[fx] || '')) : ''}</small><div class="tg2">${hgTileHtml(h, sh[0].e)}</div>` : ''; hgSlots({ _hass: h, $: pv }); hgPvLive(pv); }
    const row = (x) => `<button class="hs-r" role="listitem" data-hge="${this._eRepl ? 'repl' : 'pick'}" data-sc="${H.esc(sc)}" data-e="${H.esc(x.e)}" data-n="${H.esc(x.nm)}"><span class="hs-i">${H.icon(x.s.attributes.icon || HG_DOM_ICON2[x.e.split('.')[0]] || 'mdi:circle-outline')}</span><span class="hs-t"><b>${H.esc(x.nm)}</b><small>${H.esc([HG_KIND_LBL[x.k], x.an, this._eRepl && shown.has(x.e) ? hgTr('już na widoku', 'already in view') : '', H.ok(x.s) ? H.T(h, x.s) : hgTr('niedostępne', 'unavailable')].filter(Boolean).join(' · '))}</small></span><span class="hs-p">${H.icon(this._eRepl ? 'mdi:swap-horizontal' : 'mdi:plus')}</span></button>`;
    /* leniwe renderowanie: porcje po 60, kolejne przy przewijaniu (bez limitu) */
    if (this._eIO) this._eIO.disconnect();
    if (!sh.length) { lst.innerHTML = `<p class="hs-e">${this._eRepl ? hgTr('Brak pasujących encji.', 'No matching entities.') : hgTr('Brak pasujących encji (już widoczne są pomijane).', 'No matching entities (those already shown are skipped).')}</p>`; return; }
    let n = 0; lst.innerHTML = `<small class="hs-cnt">${sh.length} ${sh.length === 1 ? hgTr('encja', 'entity') : hgTr('encji', 'entities')}</small>`;
    const more = () => { const st = lst.querySelector('.hs-more'); st && st.remove(); lst.insertAdjacentHTML('beforeend', sh.slice(n, n + 60).map(row).join('')); n += 60;
      if (n < sh.length) { lst.insertAdjacentHTML('beforeend', '<i class="hs-more" aria-hidden="true"></i>'); this._eIO.observe(lst.querySelector('.hs-more')); } };
    this._eIO = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) more(); }, { root: lst, rootMargin: '300px' });
    more();
  },
};
Object.assign(HGPage.prototype, HG_EDIT, HG_COMP_EDIT);
