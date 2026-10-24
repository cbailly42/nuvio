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
const HG_ACCENTS = [[('#' + '63D71E'), hgTLazy('accents.lime')], [('#' + '3DDC97'), hgTLazy('accents.mint')], [('#' + '2EC4D6'), hgTLazy('accents.teal')], [('#' + '4C9BFF'), hgTLazy('accents.sky_blue')], [('#' + 'A78BFA'), hgTLazy('accents.violet')], [('#' + 'FF6FAE'), hgTLazy('accents.pink')], [('#' + 'FF9F43'), hgTLazy('accents.orange')], [('#' + 'F5C542'), hgTLazy('accents.gold')]];   /* [kolor, nazwa (hgTLazy, rozwiązywana przy użyciu)] */
const HG_BGS = [...(window.HG_BG_SET || [['', hgTLazy('edit.default')]]), ...(window.HG_USER_BGS || [])];   /* [url, nazwa, url pionowy, miniatura]; pierwszy = domyślny (bg = null) */   /* własne zdjęcia: URL / przesłanie; gradienty w sekcji „Kolor lub gradient” */
/* tła: wbudowane + galeria użytkownika zapisana w układzie (app.gallery: [{u, n, p, t}]) */
const hgBgList = () => { let g = []; try { g = (HGApp.get() || {}).gallery || []; } catch (e) { g = []; } return [...HG_BGS, ...g.filter((x) => x && x.u).map((x) => [x.u, x.n || hgT('edit.custom'), x.p || '', x.t || ''])]; };
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
    /* wbudowane tła: stare podfoldery (< 0.3.4) i adresy zapisane z adresem serwera innego urządzenia -> bieżąca baza paczki (hgBgFix) */
    const mig = (u) => (typeof hgBgFix === 'function' ? hgBgFix(u) : u);
    if (o.bg && typeof o.bg === 'object' && o.bg.kind === 'image') { const v = mig(o.bg.v), v2 = mig(o.bg.v2p); if (v !== o.bg.v || v2 !== o.bg.v2p) { o.bg = Object.assign({}, o.bg, { v, v2p: v2 }); if (HGL.data.app) HGL.data.app.bg = o.bg; } }
    const b = o.bg; if (b && typeof b === 'object') { const okC = b.kind === 'color' || b.kind === 'gradient' ? hx(b.v) && (b.v2 == null || hx(b.v2)) : typeof b.v === 'string' && /^(\/|https?:\/\/)/.test(b.v) && !/[\s"'()<>\\]/.test(b.v); if (!okC) delete o.bg; }
    return o; },
  set(v) { HGL.data.app = v; this.apply(); },
  css(o) { return Object.entries(o).map(([k, v]) => `${k}: ${v} !important;`).join(' '); },
  bgImg(b) { if (!b) return null;
    if (b.kind === 'color') return `linear-gradient(${b.v}, ${b.v})`;
    if (b.kind === 'gradient') return `linear-gradient(160deg, ${b.v}, ${b.v2 || ('#' + '000000')})`;
    const fx = (u) => String(typeof hgBgFix === 'function' ? hgBgFix(u) : u).replace(/'/g, '%27');
    if (b.kind === 'image' && b.v) return `url('${fx(b.v)}')`;
    if (b.v && /^(\/|https:\/\/)/.test(b.v)) return `url('${fx(b.v)}')`; return null; },
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
    /* styl pulpitu (HGLooks): kształt zawsze, szkło tylko z rozmyciem (bez rozmycia zostaje gęste wypełnienie z motywu) */
    const X = window.HGLooks && a.look ? HGLooks.vars(a.look) : null;
    if (X) { if (Object.keys(X.r).length) css += `:root:root, hg-page:not([x]){ ${this.css(X.r)} }\n`;
      css += `:root:root:not([data-hg-blur=off]), :root:not([data-hg-blur=off]) hg-page:not([x]){ ${this.css(X.light)} }\n:root:root[data-hg-scheme=dark]:not([data-hg-blur=off]), :root[data-hg-scheme=dark]:not([data-hg-blur=off]) hg-page:not([x]){ ${this.css(X.dark)} }\n`; }
    if (st.textContent !== css) st.textContent = css;
  },
});
const HG_TILE_KIND = (e) => { const d = e.split('.')[0];
  if (['light', 'switch', 'fan', 'input_boolean', 'automation', 'lock', 'siren', 'humidifier', 'valve'].includes(d)) return 'tog';
  if (d === 'climate') return 'clim'; if (d === 'media_player') return 'media'; if (d === 'camera') return 'cam'; if (d === 'cover') return 'cover';
  if (['scene', 'script', 'button', 'input_button'].includes(d)) return 'run'; return 'val'; };
/* typy wyświetlania zgodne z domeną encji */
/* nazwy typów: gettery – język rozwiązywany przy użyciu */
const HG_TYPES = hgTO({}, { tog: 'edit.switch', btn: 'edit.button', compact: 'edit.compact', minimal: 'edit.minimal', val: 'edit.reading', chart: 'edit.with_chart', clim: 'edit.climate', media: 'common.media', cam: 'edit.camera', cover: 'edit.cover', run: 'edit.action' });
const hgTypesFor = (h, e) => { const d = e.split('.')[0], s = h.states[e], k = HG_TILE_KIND(e), num = s && s.state !== '' && isFinite(Number(s.state));
  if (k === 'tog') return ['tog', 'btn', 'compact', 'minimal']; if (k === 'run') return ['run', 'btn', 'compact', 'minimal']; if (k === 'clim') return ['clim', 'val', 'chart', 'compact', 'minimal'];
  if (k === 'media') return ['media', 'compact', 'minimal']; if (k === 'cam') return ['cam', 'compact', 'minimal']; if (k === 'cover') return ['cover', 'compact', 'minimal'];
  return num || d === 'sensor' ? ['val', 'chart', 'compact', 'minimal'] : ['val', 'compact', 'minimal']; };
const hgTypeOpts = (h, e) => hgTypesFor(h, e).map((t, i) => [t, i ? HG_TYPES[t] : hgT('edit.tile_type_default')]);
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
const HG_KIND_LBL = hgTO({}, { tog: 'edit.switch', clim: 'edit.climate', media: 'common.media', cam: 'edit.camera', cover: 'edit.cover', run: 'edit.action', val: 'edit.reading' });
const HG_DOM_ICON2 = { light: 'mdi:lightbulb-outline', switch: 'mdi:toggle-switch-outline', fan: 'mdi:fan', input_boolean: 'mdi:toggle-switch-outline', automation: 'mdi:robot-outline',
  lock: 'mdi:lock-outline', climate: 'mdi:thermostat', media_player: 'mdi:speaker', camera: 'mdi:cctv', cover: 'mdi:window-shutter', sensor: 'mdi:gauge', binary_sensor: 'mdi:checkbox-blank-circle-outline',
  scene: 'mdi:palette-outline', script: 'mdi:script-text-outline', button: 'mdi:gesture-tap-button', weather: 'mdi:weather-partly-cloudy', person: 'mdi:account', water_heater: 'mdi:water-boiler' };
const hgTileHtml = (h, e, sz, o) => {
  o = o || {}; const s0 = h.states[e]; if (!s0) return '';
  const s = o.n || o.i ? Object.assign({}, s0, { attributes: Object.assign({}, s0.attributes, o.n ? { friendly_name: o.n } : {}, o.i ? { icon: o.i } : {}) }) : s0;
  const k0 = HG_TILE_KIND(e), k = o.t && hgTypesFor(h, e).includes(o.t) ? o.t : k0, d = e.split('.')[0], nm = s.attributes.friendly_name || H.name(h, e), ok = H.ok(s), on = ['on', 'open', 'unlocked', 'playing', 'heat', 'cool', 'auto', 'heat_cool', 'dry', 'fan_only'].includes(s.state);
  const ic = s.attributes.icon || HG_DOM_ICON2[d] || 'mdi:circle-outline', cls = `hgtl k-${k} ${HGL.szc(sz)} ${on ? 'on' : ''} ${ok ? '' : 'un'}`;
  const hd = `<span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? H.T(h, s) : hgT('common.unavailable'))}</small></span>`;
  const actE = k0 === 'run' ? 'trun' : k0 === 'tog' ? 'ttog' : 'tmore';
  if (k === 'compact') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="${actE}" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b></span><small class="cs">${H.esc(ok ? H.T(h, s) + (s.attributes.unit_of_measurement && isFinite(Number(s.state)) ? ' ' + s.attributes.unit_of_measurement : '') : hgT('common.unavailable'))}</small></button></div>`;
  if (k === 'minimal') { const n0 = Number(s.state), v0 = isFinite(n0) && s.state !== '' ? H.fmt(n0, Math.abs(n0) >= 100 ? 0 : 1) + (s.attributes.unit_of_measurement ? ' ' + s.attributes.unit_of_measurement : '') : ok ? H.T(h, s) : '–';
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb mm" data-act="${actE}" data-e="${H.esc(e)}" title="${H.esc(nm)}" aria-label="${H.esc(H.lv(nm, v0))}"><span class="ti">${H.icon(ic)}</span><small>${H.esc(v0)}</small></button></div>`; }
  if (k === 'btn') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb bb" data-act="${actE}" data-e="${H.esc(e)}" aria-pressed="${on}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? H.T(h, s) : hgT('common.unavailable'))}</small></span></button></div>`;
  if (k === 'chart') { const pts = HG_HIST.get(h, e, () => { HGL.notify(); }), cur = k0 === 'clim' ? s.attributes.current_temperature : Number(s.state), u = k0 === 'clim' ? '°' : (s.attributes.unit_of_measurement || '');
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b>${o.capOff ? '' : `<small>${H.esc(o.cap || hgT('edit.last_24_h'))}</small>`}</span></button><span class="tv">${H.esc(cur != null && isFinite(cur) ? H.fmt(cur, Math.abs(cur) >= 100 ? 0 : 1) : '–')}<em>${H.esc(u)}</em></span>${hgSpark(k0 === 'clim' ? null : pts)}</div>`; }
  if (k === 'val' && k0 === 'clim') { const ct = s.attributes.current_temperature; return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(H.T(h, s))}</small></span></button><span class="tv">${ct != null ? H.fmt(ct, 1) : '–'}<em>°</em></span></div>`; }
  if (k === 'clim') return `<div class="${cls}" data-hgk="${H.esc(e)}"><div class="acslot" data-ac="${H.esc(e)}"${o && o.n ? ` data-n="${H.esc(o.n)}"` : ''}></div></div>`;
  if (k === 'cam') return `<div class="${cls}" data-hgk="${H.esc(e)}"><div class="camslot" data-cam="${H.esc(e)}"></div></div>`;
  if (k === 'tog') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${hd}</button>${ok ? `<button class="tg ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${H.esc(nm)}" data-act="ttog" data-e="${H.esc(e)}"><i></i></button>` : ''}</div>`;
  if (k === 'run') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="trun" data-e="${H.esc(e)}">${hd}</button><button class="rb" data-act="trun" data-e="${H.esc(e)}" aria-label="${H.esc(hgT('edit.run_aria', { name: nm }))}">${H.icon('mdi:play')}</button></div>`;
  if (k === 'cover') { const p = s.attributes.current_position;
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${hd}</button><div class="cv">${[['open_cover', 'mdi:chevron-up', hgT('common.open')], ['stop_cover', 'mdi:stop', hgT('common.stop')], ['close_cover', 'mdi:chevron-down', hgT('common.close')]].map(([sv, i2, l]) => `<button data-act="tcov" data-s="${sv}" data-e="${H.esc(e)}" aria-label="${l}" ${ok ? '' : 'disabled'}>${H.icon(i2)}</button>`).join('')}${p != null ? `<em>${H.pct(p)}</em>` : ''}</div></div>`; }
  if (k === 'media') { const a = s.attributes, t = a.media_title || '', ar = a.media_artist || a.app_name || '', pic = a.entity_picture;
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${pic ? `<img class="ma" alt="" src="${H.esc(pic)}">` : `<span class="ti">${H.icon(ic)}</span>`}<span class="tn"><b>${H.esc(t || nm)}</b><small>${H.esc(t ? (ar || nm) : (ok ? H.T(h, s) : hgT('common.unavailable')))}</small></span></button>
      <div class="mc"><button data-act="tmp" data-e="${H.esc(e)}" aria-label="${hgT('edit.play_pause')}" ${ok && s.state !== 'off' ? '' : 'disabled'}>${H.icon(s.state === 'playing' ? 'mdi:pause' : 'mdi:play')}</button><button class="pw ${s.state !== 'off' && ok ? 'on' : ''}" data-act="tmw" data-e="${H.esc(e)}" aria-label="${hgT('common.power')}" ${ok ? '' : 'disabled'}>${H.icon('mdi:power')}</button></div></div>`; }
  const u = s.attributes.unit_of_measurement || '', n = Number(s.state), num = s.state !== '' && isFinite(n);
  const v = num ? H.fmt(n, Math.abs(n) >= 100 ? 0 : 1) : H.T(h, s), nd = !ok || ['unknown', 'unavailable', ''].includes(String(s.state)) || v === '–' || v === '';
  return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b></span></button><span class="tv${num ? '' : ' tx'}${nd ? ' nd' : ''}">${H.esc(nd ? hgT('edit.no_data') : v)}${num && u ? `<em>${H.esc(u)}</em>` : ''}</span></div>`;
};
/* wybór ikony: pole tekstowe mdi:xxx (wpisywanie dowolne) + szklany panel z wyszukiwaniem, siatką ikon MDI z listy HA, ostatnimi i obsługą klawiatury */
let hgIcList = null; const hgIcLoad = () => (hgIcList = hgIcList || fetch('/static/mdi/iconList.json').then((r) => (r.ok ? r.json() : [])).catch(() => []));
const hgIcRecent = () => { try { return JSON.parse(localStorage.getItem('nuvio:icons') || '[]').filter((x) => /^mdi:[a-z0-9-]+$/.test(x)).slice(0, 12); } catch (e) { return []; } };
const hgIcWire = (S) => { const inp = S && S.querySelector('.hge-sheet input[name=i]'); if (!inp || inp._icw) return; inp._icw = 1;
  const box = inp.closest('.hs-s'), fl = inp.closest('.hs-fl'); fl.classList.add('hs-ipw'); const pv = box.querySelector('ha-icon');
  const ob = document.createElement('button'); ob.type = 'button'; ob.className = 'hs-ipb'; ob.setAttribute('aria-haspopup', 'dialog'); ob.setAttribute('aria-expanded', 'false'); ob.setAttribute('aria-label', hgT('edit.choose_icon')); ob.innerHTML = H.icon('mdi:chevron-down'); box.appendChild(ob);
  box.style.cursor = 'pointer'; box.addEventListener('click', (e) => { if (e.target.closest('.hs-ipb')) return; e.preventDefault(); if (!pop) open(); });
  let pop = null, tok = null; const cur = () => inp.value.trim();
  const pick = (ic) => { inp.value = ic; inp.dispatchEvent(new Event('input', { bubbles: true })); if (pv && /^mdi:[a-z0-9-]+$/.test(ic)) pv.setAttribute('icon', ic);
    try { localStorage.setItem('nuvio:icons', JSON.stringify([ic, ...hgIcRecent().filter((x) => x !== ic)].slice(0, 12))); } catch (e) { /* tryb prywatny */ } close(); inp.focus(); };
  const btns = (L) => L.map((n) => `<button type="button" role="option" data-ic="${H.esc(n)}" aria-selected="${n === cur()}" title="${H.esc(n)}" aria-label="${H.esc(n.replace('mdi:', ''))}">${H.icon(n)}</button>`).join('');
  const close = () => { if (!pop) return; const p0 = pop; pop = null; p0.classList.add('out'); const rm = () => p0.remove(); p0.addEventListener('animationend', rm, { once: true }); setTimeout(rm, 180); if (tok) { hgsOpen.delete(tok); tok = null; } ob.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', out, true); };
  const out = (e) => { if (pop && !e.composedPath().includes(fl)) close(); };
  const fill = async (q) => { const g = pop && pop.querySelector('.hs-ipg.all'); if (!g) return; const L = await hgIcLoad(); if (!pop || !g.isConnected) return; q = q.toLowerCase().replace(/^mdi:/, '').trim();
    let n = 0; const R = []; for (const x of L) { if (!q || x.name.includes(q) || (x.keywords || []).some((k) => k.includes(q))) { n++; if (R.length < 160) R.push('mdi:' + x.name); } }
    const lb = pop.querySelector('.hs-ipl'); if (lb) lb.innerHTML = `${q ? hgT('edit.results') : hgT('edit.all_icons')}<em>${n > R.length ? R.length + ' / ' + n : n}</em>`;
    g.classList.remove('fresh'); g.removeAttribute('aria-busy'); g.innerHTML = R.length ? btns([...new Set(R)]) : `<div class="hs-ipe">${hgT('edit.no_icons_you_can')}</div>`; g.scrollTop = 0; void g.offsetWidth; g.classList.add('fresh'); };
  const open = () => { if (pop) return close(); pop = document.createElement('div'); pop.className = 'hs-ipp'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', hgT('edit.choose_icon'));
    const rc = hgIcRecent();
    pop.innerHTML = `<label class="hs-s">${H.icon('mdi:magnify')}<input type="search" placeholder="${hgT('edit.search_icons_e_g')}" aria-label="${hgT('edit.search_icons')}" autocomplete="off"></label>${rc.length ? `<small>${hgT('edit.recent')}</small><div class="hs-ipg rc" role="listbox">${btns(rc)}</div>` : ''}<small class="hs-ipl">${hgT('edit.all_icons')}</small><div class="hs-ipg all" role="listbox" aria-busy="true">${'<i class="hs-ipk"></i>'.repeat(24)}</div>`;
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
  inp.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); open(); } });
  inp.addEventListener('input', (e) => { if (!e.isTrusted) return; if (pv && /^mdi:[a-z0-9-]+$/.test(cur())) pv.setAttribute('icon', cur()); if (!pop) open(); else { const q = pop.querySelector('input[type=search]'); if (q) { q.value = cur(); fill(q.value); } } }); };
const hgSzSeg = (act, cur) => `<div class="hs-seg" role="group" aria-label="${hgT('edit.size')}">${[['s', hgTLazy('edit.size_small')], ['m', hgTLazy('edit.size_medium')], ['l', hgTLazy('edit.size_full_width')]].map(([v, lb]) => `<button type="button" data-hge="${act}" data-z="${v}" aria-pressed="${cur === v}"><span class="sg sg-${v}" aria-hidden="true"><i></i><i></i><i></i></span><span>${lb}</span></button>`).join('')}</div>`;
const HG_TILE_CSS = `
.tg2{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 210px), 1fr)); gap:12px; grid-auto-flow:row dense; } .tg2.ord{ grid-auto-flow:row; } .tg2[data-hgl]:not(.one){ grid-template-columns:var(--hg-vcols-tpl, repeat(auto-fill, minmax(min(100%, 210px), 1fr))); gap:12px; }
.hgtl{ position:relative; display:flex; align-items:center; gap:10px; min-width:0; min-height:76px; padding:12px 14px; border-radius:18px; background:var(--hg-glass-lite, var(--hg-glass-bg)); box-shadow:var(--hg-card-sh, none); color:inherit; }
.hgtl.hgsz-m{ grid-column:span 2; } .hgtl.hgsz-l{ grid-column:1 / -1; } .hgtl{ container-type:inline-size; }
@container (max-width: 460px){ .hgtl.hgsz-m{ grid-column:1 / -1; } }
.hgtl.k-clim, .hgtl.k-cam{ padding:0; background:none; box-shadow:none; display:block; }
.hgtl.k-clim > div, .hgtl.k-cam > div{ height:100%; }
.hgtl .hgtb{ flex:1 1 0; display:flex; flex-wrap:nowrap; align-items:center; gap:10px; min-width:0; overflow:visible; align-self:stretch; background:none; border:0; padding:0; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.hgtl .ti{ flex:none; position:static; margin:0; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--hg-tile-bg); }
.hgtl .ti ha-icon{ width:20px; height:20px; }
.hgtl.on .ti{ background:var(--hg-accent); color:var(--hg-on-accent); }
.hgtl .tn{ display:flex; flex-direction:column; flex:1 1 0; min-width:0; overflow:hidden; } .hgtl .tn b{ font-weight:500; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; white-space:normal; overflow:hidden; text-overflow:ellipsis; overflow-wrap:normal; word-break:normal; -webkit-hyphens:auto; hyphens:auto; line-height:1.3; padding-block:1px; }
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
/* wąski kafel: przyciski rolety i odtwarzacza schodzą pod nazwę. flex-wrap jest poza @container,
   bo zapytanie nie styluje samego kontenera (.hgtl), a potomkowie z flex-basis 100% bez zawijania wychodzą poza kafel (#53). */
.hgtl.k-cover, .hgtl.k-media{ flex-wrap:wrap; row-gap:8px; }
@container (max-width: 330px){ .hgtl.k-cover .hgtb, .hgtl.k-media .hgtb{ flex:1 0 100%; }
  .hgtl.k-cover .cv{ flex:1 0 100%; justify-content:space-between; } .hgtl.k-media .mc{ flex:1 0 100%; justify-content:flex-end; } }
/* wąski kafel z wartością: mniejsza liczba i bez ikony, żeby nazwa się mieściła */
@container (max-width: 210px){ .hgtl:has(.tv) .ti{ display:none; } .hgtl .tv{ font-size:22px; } .hgtl .tv em{ font-size:11px; } }
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
  hgTO({ id: 'switch', i: 'mdi:lightbulb-outline', tile: 'tog', slots: [hgTO({ k: 'e', dom: ['light', 'switch', 'fan', 'input_boolean', 'lock', 'automation', 'humidifier', 'valve', 'siren'], req: 1 }, { l: 'edit.device' })] }, { n: 'edit.light_switch', d: 'edit.turn_on_and_off' }),
  hgTO({ id: 'sensor', i: 'mdi:gauge', tile: 'val', slots: [hgTO({ k: 'e', dom: ['sensor', 'binary_sensor', 'input_number', 'counter', 'water_heater'], req: 1 }, { l: 'common.sensor' })] }, { n: 'edit.sensor_reading', d: 'edit.value_or_state_of' }),
  hgTO({ id: 'chart', i: 'mdi:chart-areaspline', tile: 'chart', slots: [hgTO({ k: 'e', dom: ['sensor'], num: 1, req: 1 }, { l: 'edit.numeric_sensor' })] }, { n: 'edit.sensor_with_chart', d: 'edit.value_and_chart_for' }),
  hgTO({ id: 'climate', i: 'mdi:thermostat', tile: 'clim', slots: [hgTO({ k: 'e', dom: ['climate'], req: 1 }, { l: 'edit.thermostat_ac' })] }, { n: 'common.air_conditioning', d: 'edit.temperature_modes_and_fan' }),
  hgTO({ id: 'cover', i: 'mdi:window-shutter', tile: 'cover', slots: [hgTO({ k: 'e', dom: ['cover'], req: 1 }, { l: 'edit.cover' })] }, { n: 'edit.cover_gate', d: 'edit.open_stop_close' }),
  hgTO({ id: 'run', i: 'mdi:play-circle-outline', tile: 'run', slots: [hgTO({ k: 'e', dom: ['scene', 'script', 'button', 'input_button'], req: 1 }, { l: 'edit.scene_or_script' })] }, { n: 'edit.scene_script', d: 'edit.one_button_to_run' }),
  hgTO({ id: 'media1', i: 'mdi:speaker', tile: 'media', slots: [hgTO({ k: 'e', dom: ['media_player'], req: 1 }, { l: 'edit.media_player' })] }, { n: 'edit.media_player', d: 'edit.artwork_title_and_controls' }),
  hgTO({ id: 'cam1', i: 'mdi:cctv', tile: 'cam', slots: [hgTO({ k: 'e', dom: ['camera'], req: 1 }, { l: 'edit.camera' })] }, { n: 'edit.camera', d: 'edit.snapshot_and_live_view' }),
  hgTO({ id: 'scenes', i: 'mdi:palette-outline', card: 'hg-scenes-card', slots: [hgTO({ k: 'scripts', dom: ['scene', 'script'], multi: 1, obj: 1, req: 1 }, { l: 'edit.scenes_scripts' })],
    cfg: (v) => ({ scripts: v.scripts }) }, { n: 'edit.scenes_and_scripts', d: 'edit.several_buttons_in_one_card' }),
  hgTO({ id: 'cameras', i: 'mdi:view-grid-outline', card: 'hg-cameras-card', slots: [hgTO({ k: 'entities', dom: ['camera'], multi: 1, req: 1 }, { l: 'edit.cameras' })], cfg: (v) => ({ entities: v.entities }) }, { n: 'edit.camera_grid', d: 'edit.all_selected_cameras_at' }),
  hgTO({ id: 'players', i: 'mdi:play-box-multiple-outline', card: 'hg-players-card', slots: [hgTO({ k: 'entities', dom: ['media_player'], multi: 1, req: 1 }, { l: 'edit.media_players' })], cfg: (v) => ({ entities: v.entities }) }, { n: 'common.media', d: 'edit.player_list_with_volume' }),
  hgTO({ id: 'power', i: 'mdi:flash-outline', card: 'hg-power-card', slots: [hgTO({ k: 'entities', dom: ['sensor'], dc: ['power', 'energy'], multi: 1, req: 1 }, { l: 'edit.sensor_power_energy_forecast' })],
    opts: [{ k: 'hours', t: 'num', l: hgTLazy('edit.options.hours_on_chart'), ph: '6' }, { k: 'max_power', t: 'num', l: hgTLazy('edit.options.max_power_bar_w'), ph: '10000' },
      { k: 'max', t: 'num', l: hgTLazy('edit.options.bar_scale_end') },
      { k: 'chart_label', l: hgTLazy('edit.options.chart_caption_examples'), ph: '-6 h' }, { k: 'hide_chart_label', t: 'bool', l: hgTLazy('edit.options.hide_chart_labels') },
      { k: 'show_level', t: 'bool', l: hgTLazy('edit.options.show_level') },
      { k: 'forecast', t: 'bool', l: hgTLazy('edit.options.forecast_source') },
      { k: 'forecast_entities', t: 'list', l: hgTLazy('edit.options.forecast_entities') },
      { k: 'forecast_attribute', l: hgTLazy('edit.options.forecast_attribute'), ph: 'detailedForecast' }, { k: 'forecast_value', l: hgTLazy('edit.options.forecast_value_field'), ph: 'pv_estimate' },
      { k: 'forecast_days', t: 'num', l: hgTLazy('edit.options.forecast_days_ahead'), ph: '1' }, { k: 'forecast_hours', t: 'num', l: hgTLazy('edit.options.forecast_hours_ahead') }],
    cfg: (v) => ({ entities: v.entities, max_power: 10000, hours: 6 }) }, { n: 'common.power_now', d: 'edit.value_with_a_bar' }),
  hgTO({ id: 'energy', i: 'mdi:lightning-bolt-outline', card: 'hg-energy-stats-card', slots: [hgTO({ k: 'consumption', dom: ['sensor'], dc: ['energy'], req: 1 }, { l: 'edit.consumption_kwh' }), hgTO({ k: 'production', dom: ['sensor'], dc: ['energy'] }, { l: 'edit.production_kwh_optional' })],
    cfg: (v) => ({ consumption: v.consumption, ...(v.production ? { production: v.production } : {}) }) }, { n: 'edit.energy_statistics', d: 'edit.consumption_and_production_today' }),
  hgTO({ id: 'weather', i: 'mdi:weather-partly-cloudy', card: 'hg-weather-card', slots: [hgTO({ k: 'entity', dom: ['weather'], req: 1 }, { l: 'edit.forecast' })], cfg: (v, h) => ({ entity: v.entity, hours: 24, ...(h.states['sun.sun'] ? { sun: 'sun.sun' } : {}), ...((v.o || {}).hero ? { variant: 'hero' } : {}) }),
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'hero', t: 'bool', l: hgTLazy('edit.options.weather_hero') },
      { k: 'size', t: 'sel', l: hgTLazy('edit.options.weather_size'), choices: () => [['', hgT('lookr.size_m')], ['s', hgT('lookr.size_s')], ['l', hgT('lookr.size_l')]] }] }, { n: 'common.weather', d: 'edit.now_hourly_forecast_sun' }),
  hgTO({ id: 'people', i: 'mdi:account-group-outline', card: 'hg-people-card', slots: [hgTO({ k: 'persons', dom: ['person'], multi: 1, req: 1 }, { l: 'edit.people' })], cfg: (v) => ({ persons: v.persons }) }, { n: 'edit.household', d: 'edit.who_is_home_zones' }),
  hgTO({ id: 'alarm', i: 'mdi:shield-home-outline', card: 'hg-alarm-card', slots: [hgTO({ k: 'entity', dom: ['alarm_control_panel'], req: 1 }, { l: 'edit.alarm_panel' })], cfg: (v) => ({ entity: v.entity }) }, { n: 'edit.alarm', d: 'edit.arm_and_disarm_with' }),
  hgTO({ id: 'robots', i: 'mdi:robot-vacuum', card: 'hg-robots-card', slots: [hgTO({ k: 'entities', dom: ['vacuum', 'lawn_mower'], multi: 1, req: 1 }, { l: 'edit.robots' })], cfg: (v) => ({ entities: v.entities }) }, { n: 'edit.robots', d: 'edit.vacuums_and_mowers_status' }),
  hgTO({ id: 'agenda', i: 'mdi:calendar-month-outline', card: 'hg-agenda-card', cards: { agenda: 'hg-agenda-card', month: 'hg-month-card' }, modes: [['agenda', hgTLazy('edit.modes.agenda'), 'mdi:format-list-bulleted'], ['month', hgTLazy('edit.modes.month'), 'mdi:calendar-month-outline']],
    slots: [hgTO({ k: 'calendars', dom: ['calendar'], multi: 1, req: 1, all: 1 }, { l: 'edit.calendars' })], cfg: (v) => (v.mode === 'month' ? { calendars: v.calendars } : { calendars: v.calendars, days: 14 }) }, { n: 'common.calendar', d: 'edit.agenda_or_month_view' }),
  hgTO({ id: 'slider', i: 'mdi:tune-variant', card: 'hg-slider-card', modes: [['h', hgTLazy('edit.modes.horizontal'), 'mdi:arrow-left-right'], ['v', hgTLazy('edit.modes.vertical'), 'mdi:arrow-up-down']],
    slots: [hgTO({ k: 'e', dom: ['light', 'media_player', 'fan', 'cover', 'valve', 'input_number', 'number'], req: 1 }, { l: 'edit.entity' })], cfg: (v) => ({ entity: v.e, mode: v.mode || 'h' }) }, { n: 'edit.slider', d: 'edit.brightness_volume_fan_cover' }),
  hgTO({ id: 'button', i: 'mdi:gesture-tap-button', card: 'hg-button-card', modes: [['tile', hgTLazy('edit.modes.tile'), 'mdi:square-rounded-outline'], ['pill', hgTLazy('edit.modes.row'), 'mdi:minus-box-outline']],
    slots: [hgTO({ k: 'e', dom: ['script', 'scene', 'button', 'input_button', 'automation', 'lock', 'switch'], req: 1 }, { l: 'edit.entity' })], cfg: (v) => ({ entity: v.e, mode: v.mode || 'tile' }) }, { n: 'edit.button', d: 'edit.script_scene_button_press' }),
  hgTO({ id: 'entities', i: 'mdi:format-list-checks', card: 'hg-entities-card',
    slots: [hgTO({ k: 'entities', dom: ['light', 'switch', 'fan', 'input_boolean', 'siren', 'humidifier', 'sensor', 'binary_sensor', 'script', 'scene', 'button', 'input_button', 'lock', 'cover', 'climate', 'media_player', 'person'], pref: ['light', 'switch', 'fan', 'input_boolean'], multi: 1, req: 1 }, { l: 'edit.entities' })], cfg: (v) => ({ entities: v.entities }) }, { n: 'edit.entity_list', d: 'edit.rows_with_a_toggle' }),
  hgTO({ id: 'select', i: 'mdi:form-dropdown', card: 'hg-select-card', modes: [['chips', hgTLazy('edit.modes.buttons'), 'mdi:dots-horizontal'], ['list', hgTLazy('edit.modes.list'), 'mdi:format-list-bulleted']],
    slots: [hgTO({ k: 'e', dom: ['input_select', 'select'], req: 1 }, { l: 'edit.entity' })], cfg: (v) => ({ entity: v.e, mode: v.mode || 'chips' }) }, { n: 'edit.select', d: 'edit.input_select_and_select' }),
  hgTO({ id: 'stepper', i: 'mdi:plus-minus-variant', card: 'hg-stepper-card',
    slots: [hgTO({ k: 'e', dom: ['counter', 'input_number', 'number'], req: 1 }, { l: 'edit.entity' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.stepper', d: 'edit.plus_and_minus_for' }),
  hgTO({ id: 'gauge', i: 'mdi:gauge', card: 'hg-gauge-card', slots: [hgTO({ k: 'e', dom: ['sensor', 'input_number', 'number'], num: 1, req: 1 }, { l: 'edit.numeric_sensor' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.gauge', d: 'edit.sensor_value_on_an' }),
  hgTO({ id: 'map', i: 'mdi:map-outline', card: 'hg-map-card', slots: [hgTO({ k: 'entities', dom: ['person', 'device_tracker', 'zone'], loc: 1, multi: 1, req: 1 }, { l: 'edit.people_devices_zones' })],
    cfg: (v) => ({ entities: v.entities, theme_mode: 'auto', hours_to_show: 0 }) }, { n: 'common.map', d: 'edit.people_devices_and_zones' }),
  /* --- karty z Home Glass (pełna konfiguracja: sloty, opcje i JSON zaawansowany) --- */
  hgTO({ id: 'ac', i: 'mdi:air-conditioner', card: 'hg-ac-card', slots: [hgTO({ k: 'entity', dom: ['climate'], req: 1 }, { l: 'edit.ac_thermostat' })], opts: [{ k: 'title', l: hgTLazy('edit.options.title') }],
    cfg: (v) => ({ entity: v.entity }) }, { n: 'edit.air_conditioning_card', d: 'edit.large_card_temperature_modes' }),
  hgTO({ id: 'acremote', i: 'mdi:remote', card: 'hg-acremote-card', slots: [hgTO({ k: 'entity', dom: ['climate'], req: 1 }, { l: 'edit.air_conditioner' })], opts: [{ k: 'title', l: hgTLazy('edit.options.title') }],
    cfg: (v) => ({ entity: v.entity }) }, { n: 'edit.ac_remote', d: 'edit.live_airflow_setpoint_mode' }),
  hgTO({ id: 'week', i: 'mdi:chart-bar', card: 'hg-week-card', slots: [hgTO({ k: 'consumption', dom: ['sensor'], dc: ['energy'], multi: 1, req: 1 }, { l: 'edit.consumption_kwh' }), hgTO({ k: 'production', dom: ['sensor'], dc: ['energy'], multi: 1 }, { l: 'edit.production_kwh' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'days', t: 'num', l: hgTLazy('edit.options.number_of_days'), ph: '7' }, { k: 'expand', t: 'nav', l: hgTLazy('edit.options.on_tap_open_path'), ph: '/nuvio/energia' }],
    cfg: (v) => ({ consumption: v.consumption || [], production: v.production || [] }) }, { n: 'edit.energy_week', d: 'edit.consumption_and_production_bars' }),
  hgTO({ id: 'yield', i: 'mdi:calendar-weather', card: 'hg-yield-card', slots: [hgTO({ k: 'entities', dom: ['sensor'], dc: ['energy'], multi: 1, req: 1 }, { l: 'edit.daily_sensors' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'capacity', l: hgTLazy('edit.options.capacity_kw'), ph: '3.4' }, { k: 'good', t: 'num', l: hgTLazy('edit.options.good_day_from'), ph: '3.5' }, { k: 'poor', t: 'num', l: hgTLazy('edit.options.poor_day_below'), ph: '1.5' },
      { k: 'unit', l: hgTLazy('edit.options.unit'), ph: 'kWh' }, { k: 'decimals', t: 'num', l: hgTLazy('edit.options.decimal_places'), ph: '1' }],
    cfg: (v) => ({ entities: v.entities || [] }) }, { n: 'edit.production_forecast', d: 'edit.daily_bars_for_the' }),
  hgTO({ id: 'phases', i: 'mdi:sine-wave', card: 'hg-phases-card', slots: [hgTO({ k: 'power', dom: ['sensor'], dc: ['power'], multi: 1, req: 1 }, { l: 'edit.phase_power_l1_l2' }), hgTO({ k: 'voltage', dom: ['sensor'], dc: ['voltage'], multi: 1 }, { l: 'edit.phase_voltage' }), hgTO({ k: 'current', dom: ['sensor'], dc: ['current'], multi: 1 }, { l: 'edit.phase_current' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'max_power', t: 'num', l: hgTLazy('edit.options.max_total_power_w'), ph: '17250' }, { k: 'phase_max', t: 'num', l: hgTLazy('edit.options.max_phase_power_w'), ph: '5750' }],
    cfg: (v) => ({ phases: (v.power || []).map((e, i) => ({ name: 'L' + (i + 1), power: e, ...((v.voltage || [])[i] ? { voltage: v.voltage[i] } : {}), ...((v.current || [])[i] ? { current: v.current[i] } : {}) })) }) }, { n: 'edit.phases', d: 'edit.power_voltage_and_current' }),
  hgTO({ id: 'pv', i: 'mdi:solar-power-variant-outline', card: 'hg-pv-card', slots: [hgTO({ k: 'power', dom: ['sensor'], dc: ['power'], req: 1 }, { l: 'edit.pv_power_w' }), hgTO({ k: 'today', dom: ['sensor'], dc: ['energy'] }, { l: 'edit.production_today_kwh' }), hgTO({ k: 'state', dom: ['sensor', 'binary_sensor'] }, { l: 'edit.inverter_state' }), hgTO({ k: 'temperature', dom: ['sensor'], dc: ['temperature'] }, { l: 'edit.inverter_temperature' }), hgTO({ k: 'strings', dom: ['sensor'], dc: ['power'], multi: 1, obj: 1 }, { l: 'edit.strings' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }], cfg: (v) => ({ power: v.power, today: v.today || null, state: v.state || null, temperature: v.temperature || null, strings: v.strings || [] }) }, { n: 'edit.solar', d: 'edit.power_today_strings_and' }),
  hgTO({ id: 'flow', i: 'mdi:transmission-tower-export', card: 'hg-flow-card', slots: [hgTO({ k: 'grid', dom: ['sensor'], dc: ['power'], multi: 1, one: 1, req: 1, rank: HG_FLOW_RX.grid, auto: 'rank' }, { l: 'edit.grid_power_import_export' }),
    hgTO({ k: 'solar', dom: ['sensor'], dc: ['power'], multi: 1, one: 1, rank: HG_FLOW_RX.solar, auto: 'rank' }, { l: 'edit.solar_power_several_sum' }),
    hgTO({ k: 'battery', dom: ['sensor'], dc: ['power'], multi: 1, rank: HG_FLOW_RX.battery, auto: 'rank' }, { l: 'edit.battery_power_discharge_charge' }),
    hgTO({ k: 'battery_soc', dom: ['sensor'], dc: ['battery'], multi: 1, rank: HG_FLOW_RX.battery, auto: 'rank' }, { l: 'edit.battery_level_in_the' }),
    hgTO({ k: 'grid_export', dom: ['sensor'], dc: ['power'], multi: 1, auto: 'none' }, { l: 'edit.grid_export_separate_sensors' }),
    hgTO({ k: 'home', dom: ['sensor'], dc: ['power'], multi: 1, auto: 'none' }, { l: 'edit.home_usage_empty_from' })],
    opts: [{ k: 'invert_grid', t: 'bool', l: hgTLazy('edit.options.invert_grid_sign') }, { k: 'invert_battery', t: 'bool', l: hgTLazy('edit.options.invert_battery_sign') }],
    /* baterie jako osobne obiekty: poziom z tego samego urządzenia co moc, inaczej wg kolejności */
    cfg: (v, h) => { const L = (x) => hgArr(x), o = Object.fromEntries(['grid', 'solar', 'grid_export', 'home'].filter((k) => L(v[k]).length).map((k) => [k, L(v[k]).length > 1 ? L(v[k]) : L(v[k])[0]]));
      const P = L(v.battery), S = L(v.battery_soc), R = (h && h.entities) || {}, used = new Set();
      const bs = P.map((p) => { const d = R[p] && R[p].device_id, m = d && S.find((e) => !used.has(e) && R[e] && R[e].device_id === d); if (m) used.add(m); return { power: p, soc: m || null }; });
      for (const b of bs) if (!b.soc) { const m = S.find((e) => !used.has(e)); if (m) { used.add(m); b.soc = m; } }
      for (const e of S) if (!used.has(e)) bs.push({ power: null, soc: e });
      if (bs.length) o.batteries = bs.slice(0, 4).map((b) => Object.fromEntries(Object.entries(b).filter(([, x]) => x)));
      return o; } }, { n: 'edit.energy_flow', d: 'edit.grid_solar_batteries_and' }),
  hgTO({ id: 'net', i: 'mdi:lan', card: 'hg-net-card', modes: [['wan', hgTLazy('edit.modes.internet'), 'mdi:web'], ['gw', hgTLazy('edit.modes.gateway'), 'mdi:router-network'], ['wlan', hgTLazy('edit.modes.wi_fi'), 'mdi:wifi'], ['dev', hgTLazy('edit.modes.devices'), 'mdi:devices'], ['cl', hgTLazy('edit.modes.clients'), 'mdi:account-network-outline']], slots: [],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }], cfg: (v) => ({ section: v.mode || 'wan', net: {} }) }, { n: 'edit.network', d: 'edit.internet_gateway_wi_fi' }),
  hgTO({ id: 'sensors', i: 'mdi:motion-sensor', card: 'hg-sensors-card', slots: [hgTO({ k: 'include', dom: ['binary_sensor', 'sensor'], multi: 1 }, { l: 'edit.extra_sensors' }), hgTO({ k: 'exclude', dom: ['binary_sensor', 'sensor'], multi: 1 }, { l: 'edit.skip_sensors' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'device_classes', t: 'list', l: hgTLazy('edit.options.device_classes'), ph: 'motion, door, window, smoke, moisture' }],
    cfg: (v) => ({ include: v.include || [], exclude: v.exclude || [] }) }, { n: 'edit.home_sensors', d: 'edit.motion_doors_windows_smoke' }),
  hgTO({ id: 'link', i: 'mdi:open-in-new', card: 'hg-link-card', slots: [hgTO({ k: 'entity', dom: ['sensor', 'binary_sensor', 'switch', 'light', 'input_boolean', 'update', 'person', 'climate'] }, { l: 'edit.entity_with_state_optional' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'subtitle', l: hgTLazy('edit.options.subtitle') }, { k: 'action', t: 'nav', l: hgTLazy('edit.options.open_path_or_url'), ph: '/config' }],
    cfg: (v) => ({ entity: v.entity || null }) }, { n: 'edit.shortcut', d: 'edit.tile_with_a_title' }),
  hgTO({ id: 'person', i: 'mdi:account-circle-outline', card: 'hg-person-card', slots: [hgTO({ k: 'entity', dom: ['person'], req: 1 }, { l: 'edit.person' })],
    opts: [{ k: 'home_label', l: hgTLazy('edit.options.home_label') }, { k: 'away_label', l: hgTLazy('edit.options.away_label') }], cfg: (v) => ({ entity: v.entity }) }, { n: 'edit.person', d: 'edit.photo_zone_and_time' }),
  hgTO({ id: 'rooms', i: 'mdi:sofa-outline', card: 'hg-areas-card', slots: [], opts: [{ k: 'room_path', l: hgTLazy('edit.options.room_view_path'), ph: '/nuvio/pokoj' }],
    cfg: () => ({ room_path: (location.pathname.split('/').slice(0, 2).join('/') || '/nuvio') + '/pokoj' }) }, { n: 'common.rooms', d: 'edit.room_tiles_with_temperature' }),
  hgTO({ id: 'room', i: 'mdi:door-open', card: 'hg-room-card', slots: [], opts: [{ k: 'room', t: 'room', l: hgTLazy('edit.options.room') }],
    cfg: (v, h) => { const L = HGAreas.model(h).list.filter((a) => a.id !== '_none'); return L.length ? { room: L[0].id } : {}; } }, { n: 'common.room', d: 'edit.all_devices_of_one_room' }),
  hgTO({ id: 'appliance', i: 'mdi:washing-machine', card: 'hg-appliance-card', slots: [hgTO({ k: 'entity', dom: ['sensor', 'select', 'switch', 'binary_sensor', 'button', 'number', 'water_heater', 'event'], req: 1, pref: ['sensor'], rank: /washer|pralk|dryer|susz|dishwasher|zmywar|DA_WM|machine_state|job_state/i }, { l: 'edit.any_entity_of_the' })],
    opts: [], cfg: (v) => ({ entity: v.entity }) }, { n: 'edit.appliance', d: 'edit.washer_dryer_dishwasher_state' }),
  hgTO({ id: 'cwu', i: 'mdi:water-boiler', card: 'hg-cwu-card', slots: [hgTO({ k: 'heater', dom: ['water_heater', 'climate'], req: 1 }, { l: 'edit.water_heater' }), hgTO({ k: 'heating', dom: ['binary_sensor', 'switch', 'sensor'] }, { l: 'edit.heating_state' }), hgTO({ k: 'power', dom: ['sensor'], dc: ['power'] }, { l: 'edit.power_w' }), hgTO({ k: 'remaining', dom: ['sensor'] }, { l: 'edit.time_to_heat' }), hgTO({ k: 'consumption', dom: ['sensor'], dc: ['energy'] }, { l: 'edit.consumption_kwh' }), hgTO({ k: 'keep', dom: ['switch', 'input_boolean'] }, { l: 'edit.keep_temperature' }), hgTO({ k: 'switches', dom: ['switch', 'input_boolean'], multi: 1 }, { l: 'edit.switches' })],
    opts: [], cfg: (v) => ({ cwu: { heater: v.heater, heating: v.heating || null, power: v.power || null, remaining: v.remaining || null, consumption: v.consumption || null, keep: v.keep || null, switches: (v.switches || []).map((e) => [e]) } }) }, { n: 'edit.hot_water', d: 'edit.temperature_heating_power_time' }),
  hgTO({ id: 'stairs', i: 'mdi:stairs', card: 'hg-stairs-card', slots: [hgTO({ k: 'bl', dom: ['light', 'switch'], req: 1 }, { l: 'edit.bottom_light' }), hgTO({ k: 'bm', dom: ['binary_sensor'], req: 1 }, { l: 'edit.bottom_motion' }), hgTO({ k: 'tl', dom: ['light', 'switch'], req: 1 }, { l: 'edit.top_light' }), hgTO({ k: 'tm', dom: ['binary_sensor'], req: 1 }, { l: 'edit.top_motion' }), hgTO({ k: 'group', dom: ['light'] }, { l: 'edit.stair_light_group' }), hgTO({ k: 'automation', dom: ['automation'] }, { l: 'edit.sequence_automation' })],
    opts: [], cfg: (v) => ({ stairs: { group: v.group || null, automation: v.automation || null, bottom: { light: v.bl, motion: v.bm }, top: { light: v.tl, motion: v.tm } } }) }, { n: 'edit.stairs', d: 'edit.bottom_and_top_light' }),
  hgTO({ id: 'fuel', i: 'mdi:gas-station-outline', card: 'hg-fuel-card', slots: [hgTO({ k: 'prices', dom: ['sensor', 'input_number'], multi: 1, obj: 1 }, { l: 'edit.prices_empty_from_look' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }], cfg: (v) => ({ fuel: (v.prices || []).map((x) => ({ label: x.name || x.entity, entity: x.entity, ...(x.change ? { change: x.change } : {}) })) }) }, { n: 'common.fuel_prices', d: 'edit.prices_from_sensors_with' }),
  /* 0.9: karty ogólne */
  hgTO({ id: 'light', i: 'mdi:lightbulb-on-outline', card: 'hg-lamp-card', slots: [hgTO({ k: 'e', dom: ['light'], req: 1 }, { l: 'edit.light' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.light_with_brightness', d: 'edit.switch_brightness_slider_quick' }),
  hgTO({ id: 'thermo', i: 'mdi:thermostat', card: 'hg-thermo-card', slots: [hgTO({ k: 'e', dom: ['climate', 'water_heater'], req: 1 }, { l: 'edit.thermostat' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.thermostat', d: 'edit.target_temperature_up_and' }),
  hgTO({ id: 'value', i: 'mdi:numeric', card: 'hg-value-card', slots: [hgTO({ k: 'e', dom: ['sensor', 'input_number', 'number', 'counter', 'binary_sensor', 'input_text'], req: 1 }, { l: 'edit.entity' })], opts: [{ k: 'warn', t: 'num', l: hgTLazy('edit.options.warning_threshold') }, { k: 'alert', t: 'num', l: hgTLazy('edit.options.alert_threshold') }, { k: 'decimals', t: 'num', l: hgTLazy('edit.options.decimals'), ph: '1' }], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.big_value', d: 'edit.one_number_with_colour' }),
  hgTO({ id: 'history', i: 'mdi:chart-multiline', card: 'hg-history-card', slots: [hgTO({ k: 'entities', dom: ['sensor'], num: 1, multi: 1, req: 1 }, { l: 'edit.numeric_sensors' })], opts: [{ k: 'hours', t: 'num', l: hgTLazy('edit.options.range_hours'), ph: '24' }], cfg: (v) => ({ entities: v.entities }) }, { n: 'edit.history_graph', d: 'edit.several_sensors_on_one_chart' }),
  hgTO({ id: 'openings', i: 'mdi:door-open', card: 'hg-openings-card', slots: [hgTO({ k: 'entities', dom: ['binary_sensor'], multi: 1 }, { l: 'edit.sensors_empty_all_doors' })], opts: [{ k: 'only_open', t: 'bool', l: hgTLazy('edit.options.only_open_ones') }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: 'edit.doors_and_windows', d: 'edit.opening_sensors_open_ones' }),
  hgTO({ id: 'battery', i: 'mdi:battery-heart-variant', card: 'hg-battery-card', slots: [hgTO({ k: 'entities', dom: ['sensor'], dc: ['battery'], multi: 1 }, { l: 'edit.sensors_empty_detect_automatically' })], opts: [{ k: 'low', t: 'num', l: hgTLazy('edit.options.low_level'), ph: '20' }, { k: 'limit', t: 'num', l: hgTLazy('edit.options.show_at_most') }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: 'edit.batteries', d: 'edit.weakest_batteries_first' }),
  hgTO({ id: 'vacuum', i: 'mdi:robot-vacuum', card: 'hg-vacuum-card', slots: [hgTO({ k: 'e', dom: ['vacuum', 'lawn_mower'], req: 1 }, { l: 'edit.robot' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.vacuum', d: 'edit.one_robot_state_battery' }),
  hgTO({ id: 'mediamini', i: 'mdi:music-box-outline', card: 'hg-media-mini-card', slots: [hgTO({ k: 'e', dom: ['media_player'], req: 1 }, { l: 'edit.media_player' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.mini_player', d: 'edit.artwork_title_and_buttons' }),
  hgTO({ id: 'clock', i: 'mdi:clock-outline', card: 'hg-clock-card', slots: [], opts: [{ k: 'seconds', t: 'bool', l: hgTLazy('edit.options.seconds') }, { k: 'hour12', t: 'bool', l: hgTLazy('edit.options.clock_12_hour') }], cfg: () => ({}) }, { n: 'edit.clock', d: 'edit.time_and_date' }),
  hgTO({ id: 'sun', i: 'mdi:weather-sunset', card: 'hg-sun-card', slots: [], cfg: () => ({ entity: 'sun.sun' }) }, { n: 'common.sun', d: 'edit.sunrise_sunset_and_sun' }),
  hgTO({ id: 'note', i: 'mdi:note-text-outline', card: 'hg-note-card', slots: [], opts: [{ k: 'text', t: 'txt', l: hgTLazy('edit.options.note_text') }], cfg: () => ({}) }, { n: 'edit.note', d: 'edit.text_with_simple_formatting' }),
  hgTO({ id: 'image', i: 'mdi:image-outline', card: 'hg-image-card', modes: [['image', hgTLazy('edit.modes.image'), 'mdi:image-outline'], ['iframe', hgTLazy('edit.modes.page'), 'mdi:web']], slots: [], opts: [{ k: 'url', l: hgTLazy('edit.options.image_address'), ph: 'https://' }, { k: 'ratio', l: hgTLazy('edit.options.aspect_ratio'), ph: '16/9' }, { k: 'refresh', t: 'num', l: hgTLazy('edit.options.image_refresh_s') }], cfg: (v) => ({ mode: v.mode || 'image' }) }, { n: 'edit.image_or_page', d: 'edit.picture_from_a_url' }),
  hgTO({ id: 'updates', i: 'mdi:package-up', card: 'hg-updates-card', slots: [], cfg: () => ({}) }, { n: 'edit.updates', d: 'edit.available_home_assistant_updates' }),
  hgTO({ id: 'child', i: 'mdi:human-child', card: 'hg-kid-card', slots: [], opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'child', l: hgTLazy('edit.options.child_name') }], cfg: () => ({}) }, { n: 'edit.child_livekid', d: 'edit.presence_check_in_check' }),
  /* nowe karty ogólne (0.16.0): klocki ui/, rozmiary S/M/L */
  hgTO({ id: 'hero', i: 'mdi:hand-wave-outline', card: 'hg-hero-card', slots: [hgTO({ k: 'e', dom: ['weather', 'sensor', 'alarm_control_panel'] }, { l: 'edit.state_under_the_tagline' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title_with_name', { name: '{name}' }) }, { k: 'subtitle', l: hgTLazy('edit.options.tagline') }, { k: 'image', l: hgTLazy('edit.options.photo_address') }], cfg: (v) => (v.e ? { entity: v.e } : {}) }, { n: 'edit.greeting', d: 'edit.large_greeting_with_your' }),
  hgTO({ id: 'toggle', i: 'mdi:toggle-switch-outline', card: 'hg-toggle-card', slots: [hgTO({ k: 'e', dom: HG_TOGGLE_DOM, req: 1 }, { l: 'edit.device' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.toggle_tile', d: 'edit.name_state_and_switch' }),
  hgTO({ id: 'progress', i: 'mdi:progress-helper', card: 'hg-progress-card', slots: [hgTO({ k: 'e', dom: ['sensor', 'input_number', 'number'], num: 1, req: 1 }, { l: 'edit.numeric_sensor' })],
    opts: [{ k: 'max', t: 'num', l: hgTLazy('edit.options.maximum') }, { k: 'warn', t: 'num', l: hgTLazy('edit.options.warning_threshold') }, { k: 'bad', t: 'num', l: hgTLazy('edit.options.alert_threshold') }], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.progress_bar', d: 'edit.a_value_on_a' }),
  hgTO({ id: 'arc', i: 'mdi:gauge-low', card: 'hg-arc-card', slots: [hgTO({ k: 'e', dom: ['light', 'fan', 'cover', 'media_player', 'input_number', 'number'], req: 1 }, { l: 'edit.entity' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.arc', d: 'edit.brightness_or_level_on' }),
  hgTO({ id: 'chart2', i: 'mdi:chart-bell-curve-cumulative', card: 'hg-chart-card', modes: [['area', hgTLazy('edit.modes.area'), 'mdi:chart-areaspline'], ['line', hgTLazy('edit.modes.line'), 'mdi:chart-line'], ['bars', hgTLazy('edit.modes.bars'), 'mdi:chart-bar']],
    slots: [hgTO({ k: 'e', dom: ['sensor'], num: 1, req: 1 }, { l: 'edit.numeric_sensor' })], opts: [{ k: 'hours', t: 'num', l: hgTLazy('edit.options.hours_back') }], cfg: (v) => ({ entity: v.e, style: v.mode || 'area' }) }, { n: 'edit.chart', d: 'edit.line_area_or_bars' }),
  hgTO({ id: 'roomc', i: 'mdi:sofa-outline', card: 'hg-room-compact-card', slots: [hgTO({ k: 'temperature', dom: ['sensor'], dc: ['temperature'] }, { l: 'edit.temperature' }), hgTO({ k: 'entity', dom: ['light', 'fan', 'cover', 'switch'] }, { l: 'edit.light_or_device' })],
    opts: [{ k: 'name', l: hgTLazy('edit.options.room_name') }], cfg: (v) => ({ ...(v.temperature ? { temperature: v.temperature } : {}), ...(v.entity ? { entity: v.entity } : {}) }) }, { n: 'edit.compact_room', d: 'edit.temperature_switch_and_brightness' }),
  hgTO({ id: 'actions', i: 'mdi:gesture-tap', card: 'hg-actions-card', slots: [hgTO({ k: 'entities', dom: ['scene', 'script', 'button', 'input_button', 'light', 'switch', 'automation'], multi: 1, req: 1 }, { l: 'edit.scenes_scripts_devices' })],
    cfg: (v) => ({ actions: (v.entities || []).map((e) => ({ entity: e })) }) }, { n: 'edit.quick_actions', d: 'edit.a_row_of_round' }),
  hgTO({ id: 'family', i: 'mdi:account-heart-outline', card: 'hg-family-card', slots: [hgTO({ k: 'persons', dom: ['person'], multi: 1 }, { l: 'edit.people_empty_all' })], cfg: (v) => (v.persons && v.persons.length ? { persons: v.persons } : {}) }, { n: 'edit.family_avatars', d: 'edit.avatars_and_who_is' }),
  hgTO({ id: 'cover2', i: 'mdi:window-shutter-settings', card: 'hg-cover-card', slots: [hgTO({ k: 'e', dom: ['cover'], req: 1 }, { l: 'edit.cover_or_gate' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.cover_with_position', d: 'edit.draggable_bar_and_buttons' }),
  hgTO({ id: 'smartlock', i: 'mdi:lock-smart', card: 'hg-smartlock-card', slots: [hgTO({ k: 'e', dom: ['lock'], req: 1 }, { l: 'edit.lock' }), hgTO({ k: 'door', dom: ['binary_sensor'], dc: ['door', 'opening', 'window', 'garage_door'] }, { l: 'edit.door_sensor_empty_automatic' }), hgTO({ k: 'battery', dom: ['sensor'], dc: ['battery'] }, { l: 'edit.battery_empty_automatic' })],
    cfg: (v) => ({ entity: v.e, door: v.door || null, battery: v.battery || null }) }, { n: 'edit.smart_lock', d: 'edit.animated_padlock_hold_to' }),
  hgTO({ id: 'lock', i: 'mdi:lock-outline', card: 'hg-lock-card', slots: [hgTO({ k: 'e', dom: ['lock'], req: 1 }, { l: 'edit.lock' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.lock', d: 'edit.unlock_with_confirmation' }),
  hgTO({ id: 'fan', i: 'mdi:fan', card: 'hg-fan-card', slots: [hgTO({ k: 'e', dom: ['fan'], req: 1 }, { l: 'common.fan' })], cfg: (v) => ({ entity: v.e }) }, { n: 'common.fan', d: 'edit.speed_on_an_arc' }),
  hgTO({ id: 'todo', i: 'mdi:checkbox-marked-circle-outline', card: 'hg-todo-card', slots: [hgTO({ k: 'e', dom: ['todo'], req: 1 }, { l: 'edit.to_do_list' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.to_do_list', d: 'edit.add_and_tick_off' }),
  hgTO({ id: 'glance', i: 'mdi:view-dashboard-variant-outline', card: 'hg-glance-card', slots: [hgTO({ k: 'entities', dom: ['light', 'switch', 'binary_sensor', 'sensor', 'person', 'device_tracker', 'input_boolean', 'input_select', 'select', 'lock', 'cover', 'climate', 'media_player', 'alarm_control_panel', 'fan', 'vacuum', 'humidifier', 'timer', 'sun', 'weather', 'number', 'input_number', 'automation', 'update', 'calendar'], multi: 1, req: 1 }, { l: 'edit.entities' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'columns', t: 'num', l: hgTLazy('edit.options.columns_empty_automatic') }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: 'edit.glance', d: 'edit.several_entities_in_a' }),
  hgTO({ id: 'stat', i: 'mdi:chart-box-outline', card: 'hg-stat-card', slots: [hgTO({ k: 'e', dom: ['sensor', 'input_number', 'number'], num: 1, req: 1 }, { l: 'edit.numeric_sensor' })],
    opts: [{ k: 'hours', t: 'num', l: hgTLazy('edit.options.starting_period_hours'), ph: '24' }], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.statistics', d: 'edit.minimum_average_maximum_and' }),
  hgTO({ id: 'humid', i: 'mdi:air-humidifier', card: 'hg-humidifier-card', slots: [hgTO({ k: 'e', dom: ['humidifier'], req: 1 }, { l: 'edit.humidifier_or_dehumidifier' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.humidifier', d: 'edit.target_humidity_on_an' }),
  hgTO({ id: 'purifier', i: 'mdi:air-purifier', card: 'hg-purifier-card', slots: [hgTO({ k: 'e', dom: ['fan'], req: 1 }, { l: 'edit.air_purifier_fan_entity' }), hgTO({ k: 'pm', dom: ['sensor', 'air_quality'], dc: ['pm25'] }, { l: 'edit.pm2_5_sensor_empty' })],
    cfg: (v) => ({ entity: v.e, pm: v.pm || null }) }, { n: 'edit.air_purifier', d: 'edit.pm2_5_with_air' }),
  hgTO({ id: 'airq', i: 'mdi:air-filter', card: 'hg-airq-card', slots: [hgTO({ k: 'entities', dom: ['sensor'], dc: ['carbon_dioxide', 'pm25', 'pm10', 'volatile_organic_compounds', 'volatile_organic_compounds_parts', 'nitrogen_dioxide', 'aqi', 'humidity'], multi: 1, auto: 'none' }, { l: 'edit.sensors_empty_detect_automatically' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: 'common.air_quality', d: 'edit.co2_particulates_voc_and' }),
  hgTO({ id: 'plant', i: 'mdi:flower-outline', card: 'hg-plant-card', slots: [hgTO({ k: 'e', dom: ['plant'] }, { l: 'edit.plant_plant_entity_optional' }), hgTO({ k: 'moisture', dom: ['sensor'], dc: ['moisture'] }, { l: 'edit.soil_moisture' }),
    hgTO({ k: 'illuminance', dom: ['sensor'], dc: ['illuminance'], auto: 'none' }, { l: 'edit.light_empty_from_the' }), hgTO({ k: 'temperature', dom: ['sensor'], dc: ['temperature'], auto: 'none' }, { l: 'edit.temperature_empty_from_the' }),
    hgTO({ k: 'conductivity', dom: ['sensor'], dc: ['conductivity'], auto: 'none' }, { l: 'edit.fertility_empty_from_the' }), hgTO({ k: 'battery', dom: ['sensor'], dc: ['battery'], auto: 'none' }, { l: 'edit.battery_empty_from_the' })],
    opts: [{ k: 'name', l: hgTLazy('edit.options.plant_name') }, { k: 'min_moisture', t: 'num', l: hgTLazy('edit.options.moisture_min'), ph: '15' }, { k: 'max_moisture', t: 'num', l: hgTLazy('edit.options.moisture_max'), ph: '60' }],
    cfg: (v) => { const o = {}; if (v.e) o.entity = v.e; for (const k of ['moisture', 'illuminance', 'temperature', 'conductivity', 'battery']) if (v[k]) o[k] = v[k]; return o; } }, { n: 'edit.plant', d: 'edit.soil_moisture_light_and' }),
  hgTO({ id: 'eprice', i: 'mdi:cash-clock', card: 'hg-eprice-card', slots: [hgTO({ k: 'e', dom: ['sensor'], req: 1, rank: /price|cena|ceny|nord ?pool|entso|tibber|pstryk|energi|electricity|prąd|prad|rce/i }, { l: 'edit.price_sensor_with_hourly' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'window', t: 'num', l: hgTLazy('edit.options.cheapest_window_hours'), ph: '3' }, { k: 'decimals', t: 'num', l: hgTLazy('edit.options.decimal_places'), ph: '2' }], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.electricity_price', d: 'edit.hourly_prices_today_and' }),
  hgTO({ id: 'timer', i: 'mdi:timer-outline', card: 'hg-timer-card', slots: [hgTO({ k: 'e', dom: ['timer'], req: 1 }, { l: 'edit.timer' })], cfg: (v) => ({ entity: v.e }) }, { n: 'edit.timer_card', d: 'edit.countdown_on_an_arc' }),
  hgTO({ id: 'logbook', i: 'mdi:history', card: 'hg-logbook-card', slots: [hgTO({ k: 'entities', dom: ['light', 'switch', 'binary_sensor', 'sensor', 'person', 'device_tracker', 'input_boolean', 'input_select', 'select', 'lock', 'cover', 'climate', 'media_player', 'alarm_control_panel', 'fan', 'vacuum', 'humidifier', 'timer', 'sun', 'weather', 'number', 'input_number', 'automation', 'update', 'calendar'], multi: 1, req: 1 }, { l: 'edit.entities' })],
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'hours', t: 'num', l: hgTLazy('edit.options.last_hours'), ph: '24' }, { k: 'max', t: 'num', l: hgTLazy('edit.options.most_entries'), ph: '6' }], cfg: (v) => ({ entities: v.entities || [] }) }, { n: 'edit.logbook', d: 'edit.recent_changes_of_chosen' }),
  hgTO({ id: 'webpage', i: 'mdi:web', card: 'hg-webpage-card', slots: [],
    opts: [{ k: 'url', l: hgTLazy('edit.options.page_address'), ph: 'https://' }, { k: 'title', l: hgTLazy('edit.options.title') }, { k: 'aspect_ratio', l: hgTLazy('edit.options.aspect_ratio_examples'), ph: '16:9' }, { k: 'height', t: 'num', l: hgTLazy('edit.options.fixed_height') }], cfg: () => ({}) }, { n: 'edit.web_page', d: 'edit.any_address_in_a' }),
  /* ----- Układ: kontenery jak w HA (siatka, stos pionowy, stos poziomy); dzieci w polu „Karty w kontenerze” ----- */
  hgTO({ id: 'grid', cat: 'layout', kids: 1, i: 'mdi:view-grid-outline', card: 'hg-grid-card', slots: [], cfg: (v) => ({ cards: v.cards || [] }),
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'columns', t: 'num', l: hgTLazy('edit.options.grid_columns'), ph: '3' }, { k: 'gap', t: 'num', l: hgTLazy('edit.options.gap_px'), ph: '12' },
      { k: 'square', t: 'bool', l: hgTLazy('edit.options.square_cells') }, { k: 'glass', t: 'bool', l: hgTLazy('edit.options.one_glass_for_grid') }] },
    { n: 'edit.grid', d: 'edit.cards_in_columns_like' }),
  hgTO({ id: 'vstack', cat: 'layout', kids: 1, i: 'mdi:view-agenda-outline', card: 'hg-stack-card', slots: [], cfg: (v) => Object.assign({ direction: 'vertical', cards: v.cards || [] }, (v.o || {}).flat ? { glass: false } : {}, (v.o || {}).nodiv ? { divider: false } : {}),
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'gap', t: 'num', l: hgTLazy('edit.options.gap_px'), ph: '0' }, { k: 'flat', t: 'bool', l: hgTLazy('edit.options.each_card_own_glass') }, { k: 'nodiv', t: 'bool', l: hgTLazy('edit.options.no_lines_between_cards') }] },
    { n: 'edit.vertical_stack', d: 'edit.cards_one_below_another' }),
  hgTO({ id: 'hstack', cat: 'layout', kids: 1, i: 'mdi:view-column-outline', card: 'hg-stack-card', slots: [], cfg: (v) => Object.assign({ direction: 'horizontal', cards: v.cards || [] }, (v.o || {}).flat ? { glass: false } : {}, (v.o || {}).nodiv ? { divider: false } : {}),
    opts: [{ k: 'title', l: hgTLazy('edit.options.title') }, { k: 'gap', t: 'num', l: hgTLazy('edit.options.gap_px'), ph: '0' }, { k: 'ratio', t: 'list', l: hgTLazy('edit.options.width_ratio'), ph: '1, 1' },
      { k: 'wrap_below', t: 'num', l: hgTLazy('edit.options.stack_vertically_below_px'), ph: '420' }, { k: 'flat', t: 'bool', l: hgTLazy('edit.options.each_card_own_glass') }, { k: 'nodiv', t: 'bool', l: hgTLazy('edit.options.no_lines_between_cards') }] },
    { n: 'edit.horizontal_stack', d: 'edit.cards_side_by_side' }),
  hgTO({ id: 'cond', cat: 'layout', kids: 1, i: 'mdi:eye-check-outline', card: 'hg-conditional-card', slots: [hgTO({ k: 'e', dom: ['light', 'switch', 'binary_sensor', 'sensor', 'person', 'device_tracker', 'input_boolean', 'input_select', 'select', 'lock', 'cover', 'climate', 'media_player', 'alarm_control_panel', 'fan', 'vacuum', 'humidifier', 'timer', 'sun', 'weather', 'number', 'input_number', 'automation', 'update', 'calendar'] }, { l: 'edit.condition_entity' })],
    cfg: (v) => { const O = v.o || {}, C = []; if (v.e) { const st = String(O.state || '').split(',').map((x) => x.trim()).filter(Boolean);
        if (O.above !== undefined && O.above !== '' || O.below !== undefined && O.below !== '') C.push(Object.assign({ condition: 'numeric_state', entity: v.e }, isFinite(+O.above) && O.above !== '' ? { above: +O.above } : {}, isFinite(+O.below) && O.below !== '' ? { below: +O.below } : {}));
        else C.push({ condition: 'state', entity: v.e, [O.not ? 'state_not' : 'state']: st.length > 1 ? st : st[0] || 'on' }); }
      if (O.screen) C.push({ condition: 'screen', media_query: O.screen === 'phone' ? '(max-width: 767px)' : O.screen === 'big' ? '(min-width: 768px)' : O.screen });
      return { conditions: C, cards: v.cards || [] }; },
    opts: [{ k: 'state', l: hgTLazy('edit.options.condition_state'), ph: 'on' }, { k: 'not', t: 'bool', l: hgTLazy('edit.options.condition_not') },
      { k: 'above', t: 'num', l: hgTLazy('edit.options.condition_above') }, { k: 'below', t: 'num', l: hgTLazy('edit.options.condition_below') }, { k: 'screen', l: hgTLazy('edit.options.condition_screen'), ph: 'phone' }] },
    { n: 'edit.conditional', d: 'edit.cards_shown_only_when' }),
  hgTO({ id: 'hacard', cat: 'layout', i: 'mdi:code-braces', card: 'hg-stack-card', slots: [], cardOf: (v) => hgHaTag(hgHaCard(v)) || 'hg-stack-card',
    cfg: (v) => { const c = hgHaCard(v); if (!c) return { cards: [] }; if (hgHaTag(c)) { const o = Object.assign({}, c); delete o.type; return o; } return { direction: 'vertical', glass: false, divider: false, cards: [c] }; },
    opts: [{ k: 'src', t: 'txt', code: 1, l: hgTLazy('edit.options.ha_card_yaml'), ph: 'type: grid\ncolumns: 2\ncards:\n  - type: tile\n    entity: …' }] },
    { n: 'edit.card_from_ha_yaml', d: 'edit.paste_a_card_or' }),
];
/* domyślny rozmiar nowego komponentu: duże karty od razu M / L, proste kafle S */
const HG_COMP_Z = { airq: 'm', plant: 'm', eprice: 'm', child: 'm', flow: 'l', glance: 'l', stat: 'm', humid: 'm', timer: 'm', logbook: 'm', webpage: 'l', cond: 'm', grid: 'l', vstack: 'm', hstack: 'l', hacard: 'm', history: 'm', image: 'm', ac: 'm', acremote: 'm', week: 'm', yield: 'm', phases: 'm', pv: 'm', net: 'm', sensors: 'm', rooms: 'l', room: 'l', appliance: 'm', cwu: 'm', stairs: 'm', fuel: 's', climate: 'm', media1: 'm', cam1: 'm', chart: 'm', scenes: 'm', cameras: 'l', players: 'm', power: 'm', energy: 'm', weather: 'm', people: 'm', alarm: 'm', robots: 'm', agenda: 'm', map: 'l', slider: 'm', entities: 'm', select: 'm' };
/* kandydaci do slotu: domena, device_class, liczba; bez ukrytych / diagnostycznych */
/* span karty panelu -> rozmiar S / M / L */
const hgSpanZ = (sp) => (sp === 'full' ? 'l' : +sp >= 2 ? 'm' : 's');
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
const hgPwPick = (cur, hge, extra = '') => `<div class="hg-pw" role="radiogroup" aria-label="${hgT('edit.panel_width')}">${[['narrow', hgT('edit.narrow_panel'), hgT('edit.right_column_left_side')], ['wide', hgT('edit.full_width_panel'), hgT('edit.like_the_rooms_view')]].map(([k, l, d]) => `<button type="button" role="radio" data-hge="${hge}" data-w="${k}"${extra} aria-checked="${cur === k}"><span class="hg-pwv ${k}" aria-hidden="true"><i></i><em></em><u></u></span><span><b>${l}</b><small>${d}</small></span></button>`).join('')}</div><p class="hg-pwn">${hgT('edit.on_phones_the_panel')}</p>`;
const hgPwMark = (b) => { for (const x of b.parentElement.querySelectorAll('[role=radio]')) x.setAttribute('aria-checked', String(x === b)); };
window.hgPwPick = hgPwPick; window.hgPwMark = hgPwMark; window.HG_PW_CSS = HG_PW_CSS;
/* pełna konfiguracja komponentu: sloty → cfg(), pola opcji (v.o) i JSON zaawansowany (v.x, nadpisuje wszystko) */
const hgOptVal = (o, val) => (val == null || val === '' ? undefined : o.t === 'num' ? (isFinite(+String(val).trim().replace(',', '.')) && String(val).trim() !== '' ? +String(val).trim().replace(',', '.') : undefined) : o.t === 'bool' ? !!val : o.t === 'nav' ? (/^https?:/.test(val) ? { url: val } : { navigate: val }) : o.t === 'list' ? String(val).split(',').map((x) => x.trim()).filter(Boolean) : val);
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
  if (C.tile) return Object.assign({ type: 'custom:hg-tiles-card', single: Object.assign({ e: R.v.e, t: R.t || C.tile }, n ? { n } : {}, i ? { i } : {}) }, meta, R.t ? { nv_t: R.t } : {});
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
/* nadpisanie karty widoku (conf.set): null usuwa pole z bazowej konfiguracji */
const hgSetMerge = (c, set) => { const o = Object.assign({}, c, set || {}); for (const q in set || {}) if (set[q] === null) delete o[q]; return o; };
const hgKidName = (k) => { const C = HG_COMP.find((c) => c.id === k.nv_comp); return k.nv_n || k.title || k.name || (C && C.n) || String(k.type || '').replace(/^custom:/, ''); };
const hgKidIcon = (k) => { const C = HG_COMP.find((c) => c.id === k.nv_comp); return k.nv_i || k.icon || (C && C.i) || 'mdi:card-outline'; };
/* testy i zrzuty (tests/cards-demo.html): lista komponentów i budowanie konfiguracji jak w galerii */
window.__hgCompT = { list: HG_COMP, card: hgCompCard, cfg: hgCompCfg, kid: hgKidCfg, cands: (h, sl) => hgSlotCands(h, sl) };
const HG_CM = window.__hgCm || (window.__hgCm = new Map());   /* klucz dodanego komponentu -> { c, cfg } (do montowania w slotach) */
const hgCmHtml = (x, sz) => { HG_CM.set(x.e, { c: x.c, cfg: Object.assign({}, x.cfg, x.n ? { title: x.n, name: x.n } : {}, x.i ? { icon: x.i } : {}) });
  return `<div class="hgtl k-card ${HGL.szc(sz)}" data-hgk="${H.esc(x.e)}"><div class="cmslot" data-cm="${H.esc(x.e)}"></div></div>`; };
const hgCmSlots = (card) => { const h = card._hass; card._cmM = card._cmM || new Map();
  for (const slot of card.$.querySelectorAll('.cmslot[data-cm]')) { const k = slot.dataset.cm, m = HG_CM.get(k); if (!m || !customElements.get(m.c)) continue; const sig = k + JSON.stringify(m.cfg); let el = card._cmM.get(sig);
    if (!el) { el = document.createElement(m.c); try { el.setConfig(Object.assign({ type: 'custom:' + m.c }, m.cfg)); } catch (e) { /* zła konfiguracja – pusta karta */ } card._cmM.set(sig, el); }
    if (el.parentElement !== slot) slot.appendChild(el); el.hass = h; } };
/* ===== makiety podglądu w galerii „Dodaj komponent”: przykładowe dane, ten sam system wizualny (szkło, akcent, czarny na akcencie) ===== */
const HG_MOCK_CSS = `
.mk{ position:absolute; inset:0; display:flex; flex-direction:column; padding:10px 12px 20px; box-sizing:border-box; color:inherit; font-size:11px; line-height:1.2; }
.mk-in{ flex:1; min-height:0; min-width:0; display:flex; flex-direction:column; justify-content:center; gap:6px; }
.mk-tag{ position:absolute; right:10px; bottom:5px; line-height:1; font-size:9px; letter-spacing:.04em; text-transform:uppercase; opacity:.5; font-weight:600; }
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
const hgMockHtml = (id) => { const I = (i) => H.icon(i), tag = `<span class="mk-tag">${hgT('edit.preview')}</span>`;
  const spark = (pts, fill) => `<svg viewBox="0 0 100 34" preserveAspectRatio="none" style="width:100%;height:36px">${fill ? `<path d="M0 34 L${pts} L100 34Z" class="accf" opacity=".18"/>` : ''}<polyline points="${pts}" fill="none" class="acc mk-dash" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  const M = {
    glance: `<div style="display:flex;justify-content:space-around">${[['mdi:lightbulb', 1], ['mdi:lock', 0], ['mdi:door', 0], ['mdi:fan', 1]].map(([i, on]) => `<div style="display:flex;flex-direction:column;align-items:center;gap:3px"><span class="mk-cir ${on ? 'on' : ''}">${I(i)}</span><span class="mk-s">${on ? hgT('common.on_short') : hgT('common.off_short')}</span></div>`).join('')}</div>`,
    stat: `<div class="mk-v">21,4<small>°C</small></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">${[[hgT('edit.mock.min'), '17,9'], [hgT('edit.avg'), '20,8'], [hgT('edit.mock.max'), '23,1']].map(([l, v]) => `<div class="mk-g" style="padding:4px 6px"><span class="mk-s">${l}</span><br><b>${v}</b></div>`).join('')}</div>`,
    humid: `<div class="mk-r"><span class="mk-cir on" style="width:28px;height:28px">${I('mdi:water-percent')}</span><b style="font-size:18px;font-weight:300">55%</b><span class="mk-s">${hgT('edit.now_48')}</span></div>`,
    airq: [['CO₂', '612', 'ppm', '#2FB36B', 30], ['PM2.5', '18', 'µg/m³', '#F5B83D', 45], [hgT('edit.voc'), '140', 'ppb', '#2FB36B', 14]].map(([l, v, u, c, w]) => `<div class="mk-r"><span style="width:42px;flex:none" class="mk-s">${l}</span><span style="flex:1;height:5px;border-radius:3px;background:color-mix(in srgb, currentColor 12%, transparent)"><i style="display:block;height:100%;width:${w}%;border-radius:3px;background:${c}"></i></span><b style="flex:none;min-width:58px;text-align:right">${v}<small style="opacity:.6;font-weight:500;font-size:9px"> ${u}</small></b></div>`).join(''),
    plant: `<div class="mk-r"><span class="mk-cir on" style="width:24px;height:24px">${I('mdi:flower')}</span><span>${hgT('edit.monstera_water_me')}</span></div>${[['mdi:water-outline', 18, 15, 45, 12], ['mdi:white-balance-sunny', 55, 25, 60, 50]].map(([i, v, a, b]) => `<div class="mk-r"><span class="mk-ic">${I(i)}</span><span style="flex:1;position:relative;height:5px;border-radius:3px;background:color-mix(in srgb, currentColor 12%, transparent)"><i style="position:absolute;top:0;bottom:0;left:${a}%;width:${b - a}%;border-radius:3px;background:color-mix(in srgb, var(--hg-accent) 45%, transparent)"></i><i style="position:absolute;top:-3px;left:${v}%;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px var(--hg-accent)"></i></span></div>`).join('')}`,
    eprice: `<div class="mk-r"><b style="font-size:18px;font-weight:600">0,48<small style="font-size:10px;opacity:.6;font-weight:500"> zł/kWh</small></b><span class="mk-s" style="margin-left:auto;padding:2px 7px;border-radius:999px;background:var(--hg-accent);color:#111;opacity:1">${hgT('edit.cheap')}</span></div><div style="display:flex;align-items:flex-end;gap:2px;height:34px">${[40, 34, 30, 28, 30, 42, 66, 80, 70, 52, 38, 26, 22, 24, 34, 50, 78, 92, 86, 70, 58, 50, 46, 42].map((v, i) => `<i style="flex:1;height:${v}%;border-radius:2px 2px 0 0;background:${v < 35 ? 'var(--hg-accent)' : v > 70 ? '#FF8A3D' : 'color-mix(in srgb, currentColor 26%, transparent)'};${i < 10 ? 'opacity:.4' : ''}"></i>`).join('')}</div>`,
    timer: `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><b style="font-size:22px;font-weight:300;font-variant-numeric:tabular-nums">4:32</b><span style="display:flex;gap:6px"><span class="mk-btn">${I('mdi:pause')}${hgT('common.pause')}</span><span class="mk-btn gh">${I('mdi:stop')}</span></span></div>`,
    logbook: [['mdi:door', hgT('edit.door_open'), '2 min'], ['mdi:lightbulb', hgT('edit.living_room_on'), '9 min'], ['mdi:lock', hgT('edit.lock_locked'), '1 h']].map(([i, t, a]) => `<div class="mk-r"><span class="mk-ic">${I(i)}</span><span>${t}</span><span class="mk-s" style="flex:none">${a}</span></div>`).join(''),
    webpage: `<div style="flex:1;border-radius:10px;background:color-mix(in srgb, currentColor 8%, transparent);display:flex;flex-direction:column;overflow:hidden"><div style="display:flex;gap:4px;padding:5px 7px;opacity:.6">${'<i style="width:6px;height:6px;border-radius:50%;background:currentColor"></i>'.repeat(3)}</div><div style="flex:1;display:grid;place-items:center">${I('mdi:web')}</div></div>`,
    cond: `<div class="mk-r"><span class="mk-ic on">${I('mdi:eye-check-outline')}</span><span>${hgT('edit.when_someone_is_home')}</span></div><div style="border-radius:8px;border:1px dashed color-mix(in srgb, currentColor 30%, transparent);padding:6px 8px" class="mk-s">${hgT('edit.cards_shown_conditionally')}</div>`,
    hacard: `<div style="font:10px ui-monospace,monospace;line-height:1.5;opacity:.85"><div>type: grid</div><div>cards:</div><div>&nbsp;&nbsp;- type: tile</div></div>`,
    grid: `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;flex:1">${'<i style="border-radius:6px;background:currentColor;opacity:.14;min-height:18px"></i>'.repeat(5)}<i style="border-radius:6px;background:var(--hg-accent);opacity:.7"></i></div>`,
    vstack: `<div style="display:flex;flex-direction:column;gap:0;flex:1;border-radius:8px;background:color-mix(in srgb, currentColor 8%, transparent)">${[0, 1, 2].map((i) => `<div class="mk-r" style="padding:4px 6px;${i ? 'border-top:1px solid color-mix(in srgb, currentColor 10%, transparent)' : ''}"><span class="mk-cir${i ? '' : ' on'}" style="width:10px;height:10px"></span><span style="flex:1;height:5px;border-radius:3px;background:currentColor;opacity:.2"></span></div>`).join('')}</div>`,
    hstack: `<div style="display:flex;gap:0;flex:1;border-radius:8px;background:color-mix(in srgb, currentColor 8%, transparent)">${[0, 1, 2].map((i) => `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:4px;${i ? 'border-left:1px solid color-mix(in srgb, currentColor 10%, transparent)' : ''}"><span class="mk-cir${i === 1 ? ' on' : ''}" style="width:12px;height:12px"></span><span style="width:60%;height:5px;border-radius:3px;background:currentColor;opacity:.2"></span></div>`).join('')}</div>`,
    hero: `<div style="font-size:15px;font-weight:600;line-height:1.1">${hgT('edit.hey_anna')}</div><div style="font-size:11px;opacity:.75">${hgT('edit.your_whole_home_in')}</div>`,
    toggle: `<div class="mk-r"><span class="mk-cir on" style="width:24px;height:24px">${I('mdi:lightbulb')}</span><span>${hgT('edit.kitchen')}</span><span class="mk-sw on"></span></div>`,
    progress: `<div class="mk-r"><b style="font-size:18px;font-weight:300">62%</b><span style="opacity:.6">${hgT('common.medium')}</span></div><div class="mk-tr" style="height:12px"><i style="--w:62%"></i></div>`,
    arc: `<svg viewBox="0 0 100 52" style="width:80%;margin:0 auto;display:block"><path d="M8 48 A42 42 0 0 1 92 48" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="6" stroke-dasharray="1.5 4"/><path d="M8 48 A42 42 0 0 1 80 18" fill="none" class="acc" stroke-width="6" stroke-dasharray="1.5 4"/></svg>`,
    chart2: spark('0,26 12,22 24,24 36,15 48,18 60,10 72,14 84,6 100,4', 1),
    roomc: `<div class="mk-r"><b style="font-size:18px;font-weight:300">22,5°</b><span></span><span class="mk-sw on"></span></div><div class="mk-tr" style="height:6px"><i style="--w:55%"></i></div>`,
    actions: `<div style="display:flex;gap:6px;justify-content:center">${['mdi:magnify', 'mdi:plus', 'mdi:minus', 'mdi:close'].map((i, n) => `<span class="mk-cir ${n ? '' : 'on'}" style="width:24px;height:24px">${I(i)}</span>`).join('')}</div>`,
    family: `<div class="mk-r"><span>${hgT('edit.2_of_3_at')}</span>${['A', 'M', 'Z'].map((x) => `<span class="mk-cir" style="width:22px;height:22px;margin-left:-6px">${x}</span>`).join('')}</div>`,
    cover2: `<div class="mk-r"><b style="font-size:18px;font-weight:300">40%</b></div><div class="mk-tr" style="height:10px"><i style="--w:40%"></i></div>`,
    lock: `<div class="mk-r"><span class="mk-cir on" style="width:28px;height:28px">${I('mdi:lock')}</span><span>${hgT('edit.locked')}</span></div>`,
    fan: `<div class="mk-r"><span class="mk-cir on" style="width:28px;height:28px">${I('mdi:fan')}</span><b>66%</b></div>`,
    todo: `<div class="mk-r"><span class="mk-cir on" style="width:14px;height:14px"></span><span>${hgT('edit.buy_milk')}</span></div><div class="mk-r"><span class="mk-cir" style="width:14px;height:14px"></span><span>${hgT('edit.water_plants')}</span></div>`,
    slider: `<div class="mk-r"><span>${hgT('edit.living_room_brightness')}</span><b>72%</b></div><div class="mk-tr" style="height:14px"><i style="--w:72%"></i></div>`,
    button: `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="mk-cir on" style="width:38px;height:38px">${I('mdi:power')}</span><span>${hgT('edit.run')}</span></div>`,
    entities: [['mdi:lightbulb', hgT('edit.lamp'), 1], ['mdi:fan', hgT('common.fan'), 0], ['mdi:television', 'TV', 1]].map(([i, n, on]) => `<div class="mk-r${on ? ' mk-on' : ''}"><span class="mk-ic">${I(i)}</span><span>${n}</span><span class="mk-sw${on ? ' on' : ''}"></span></div>`).join(''),
    select: `<span class="mk-s">${hgT('common.mode')}</span><div class="mk-chip"><span>${hgT('edit.comfort')}</span>${I('mdi:chevron-down')}</div>`,
    stepper: `<span class="mk-s">${hgT('edit.counter')}</span><div class="mk-st"><span class="mk-cir">−</span><b>12</b><span class="mk-cir on">+</span></div>`,
    gauge: `<div style="display:grid;place-items:center"><svg viewBox="0 0 100 58" style="width:110px;height:64px"><path d="M10 52 A40 40 0 0 1 90 52" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="9" stroke-linecap="round"/><path d="M10 52 A40 40 0 0 1 78 22" fill="none" class="acc mk-dash" stroke-width="9" stroke-linecap="round"/><text x="50" y="50" text-anchor="middle" font-size="17" font-weight="600" fill="currentColor">64%</text></svg></div>`,
    switch: `<div class="mk-g mk-r mk-on" style="padding:10px"><span class="mk-ic">${I('mdi:lightbulb-on')}</span><span><b>${hgT('edit.lamp')}</b><br><span class="mk-s">${hgT('common.on_neut')}</span></span><span class="mk-sw on"></span></div>`,
    sensor: `<div class="mk-g" style="padding:10px"><div class="mk-r"><span class="mk-ic">${I('mdi:thermometer')}</span><span class="mk-s">${hgT('edit.temperature')}</span></div><div class="mk-v">21.4<small>°C</small></div></div>`,
    chart: `<div class="mk-r"><span class="mk-s">${hgT('edit.humidity_24_h')}</span><b>48%</b></div>${spark('0,24 12,20 24,22 36,14 48,17 60,9 72,13 84,6 100,10', 1)}`,
    climate: `<div style="display:flex;align-items:center;justify-content:center;gap:12px"><span class="mk-cir">‹</span><div style="text-align:center"><div class="mk-s">${hgT('common.heating')}</div><div class="mk-v">21<small>°</small></div></div><span class="mk-cir">›</span></div><div class="mk-tr"><i style="--w:55%"></i></div>`,
    cover: `<div class="mk-r"><span class="mk-ic">${I('mdi:window-shutter')}</span><span>${hgT('edit.blind_40')}</span></div><div class="mk-grid"><span class="mk-sc">${I('mdi:arrow-up')}</span><span class="mk-sc">${I('mdi:stop')}</span><span class="mk-sc on">${I('mdi:arrow-down')}</span></div>`,
    run: `<div class="mk-g mk-r" style="padding:10px"><span class="mk-ic on">${I('mdi:play')}</span><span><b>${hgT('edit.good_night')}</b><br><span class="mk-s">${hgT('edit.scene')}</span></span></div>`,
    media1: `<div class="mk-r"><span class="mk-art"></span><span style="min-width:0"><b>${hgT('edit.song')}</b><br><span class="mk-s">${hgT('edit.artist')}</span></span></div><div class="mk-tr" style="height:5px"><i style="--w:38%"></i></div>`,
    cam1: `<div class="mk-cam" style="flex:1"><span class="mk-live"><i></i>${hgT('edit.mock.live')}</span></div>`,
    scenes: `<div class="mk-grid" style="--c:3">${[['mdi:weather-sunset-up', 1], ['mdi:movie-open', 0], ['mdi:weather-night', 0], ['mdi:home-export-outline', 0], ['mdi:silverware-fork-knife', 0], ['mdi:sofa', 0]].map(([i, on]) => `<span class="mk-sc${on ? ' on' : ''}">${I(i)}</span>`).join('')}</div>`,
    cameras: `<div class="mk-grid" style="--c:2;flex:1">${[0, 1, 2, 3].map((k) => `<div class="mk-cam" style="min-height:34px">${k ? '' : `<span class="mk-live"><i></i>${hgT('edit.mock.live')}</span>`}</div>`).join('')}</div>`,
    players: [[hgT('edit.living_room'), 1], [hgT('edit.kitchen'), 0]].map(([n, on]) => `<div class="mk-r"><span class="mk-art" style="width:24px;height:24px;border-radius:7px${on ? '' : ';filter:grayscale(1);opacity:.5'}"></span><span>${n}</span><span class="mk-ic${on ? ' on' : ''}">${I(on ? 'mdi:pause' : 'mdi:play')}</span></div>`).join(''),
    power: `<div class="mk-r"><span class="mk-v">3,42<small> kW</small></span></div><div class="mk-tr" style="height:8px"><i style="--w:34%"></i></div><span class="mk-s">${hgT('edit.35_of_average')}</span>`,
    energy: `<div style="display:flex;align-items:flex-end;gap:5px;height:52px">${[40, 62, 35, 80, 55, 70, 46].map((v, k) => `<i style="flex:1;height:${v}%;border-radius:4px;background:${k === 3 ? 'var(--hg-accent)' : 'rgba(255,255,255,.18)'}"></i>`).join('')}</div><span class="mk-s">${hgT('edit.energy_week')}</span>`,
    weather: `<div class="mk-r"><span style="font-size:24px;line-height:1">⛅</span><span class="mk-v" style="font-weight:300">8°</span><span class="mk-s" style="margin-left:auto">↑12° ↓5°</span></div><div style="display:flex;justify-content:space-between">${['9°', '11°', '11°', '12°'].map((t, k) => `<span style="display:flex;flex-direction:column;align-items:center;gap:2px"><span class="mk-s">${k ? 10 + k : hgT('common.now_cap')}</span><b>${t}</b></span>`).join('')}</div>`,
    people: `<div style="display:flex;gap:6px;justify-content:center">${[['M', '#a3e635'], ['A', '#7dd3fc'], ['Z', '#f9a8d4']].map(([l, c]) => `<span class="mk-av" style="background:${c}">${l}</span>`).join('')}</div><span class="mk-s" style="text-align:center">${hgT('edit.2_people_home')}</span>`,
    alarm: `<div class="mk-r"><span class="mk-ic on" style="width:34px;height:34px">${I('mdi:shield-check')}</span><span><b>${hgT('edit.armed')}</b><br><span class="mk-s">${hgT('edit.away')}</span></span></div>`,
    robots: `<div class="mk-r"><span class="mk-ic on" style="width:34px;height:34px;border-radius:50%">${I('mdi:robot-vacuum')}</span><span><b>${hgT('common.cleaning')}</b><br><span class="mk-s">${hgT('edit.battery_82')}</span></span></div><div class="mk-tr" style="height:5px"><i style="--w:60%"></i></div>`,
    agenda: [['09:00', hgT('edit.meeting')], ['18:30', hgT('edit.workout')]].map(([t, n], k) => `<div class="mk-r"><i style="flex:none;width:3px;height:22px;border-radius:2px;background:${k ? 'rgba(255,255,255,.3)' : 'var(--hg-accent)'}"></i><span><b>${n}</b><br><span class="mk-s">${t}</span></span></div>`).join(''),
    ac: `<div style="display:flex;align-items:center;justify-content:center;gap:12px"><span class="mk-cir">−</span><div style="text-align:center"><div class="mk-s">${hgT('common.cooling')}</div><span class="mk-v">22<small>°</small></span></div><span class="mk-cir on">+</span></div>`,
    acremote: `<svg viewBox="0 0 120 40" style="width:100%;height:30px;flex:none"><g fill="none" stroke="#3D8BF5" stroke-linecap="round">${[30, 46, 62, 78, 94].map((x) => `<path class="mk-fl" d="M${x} 21 Q${x - 3} 30 ${x + (x - 62) * .4} 39"/>`).join('')}</g><rect x="22" y="2" width="76" height="18" rx="6" fill="${'#' + 'FBFCFD'}"/><rect x="29" y="14" width="62" height="2.5" rx="1.2" fill="${'#' + 'D5DAE0'}"/><circle cx="91" cy="7" r="1.5" fill="#3D8BF5"/></svg><div class="mk-st" style="gap:6px"><span class="mk-cir">−</span><span class="mk-v" style="font-weight:200;font-size:22px">22<small>°</small></span><span class="mk-cir on">+</span></div><i style="display:block;height:5px;border-radius:3px;margin:0 6px;background:linear-gradient(90deg,#2F7CF6,#8DBBF5 42%,#F6BE8C 58%,#F2762A)"></i>`,
    week: `<div style="display:flex;align-items:flex-end;gap:5px;height:52px">${[50, 72, 40, 66, 58, 80, 45].map((v) => `<i style="flex:1;height:${v}%;border-radius:4px;background:var(--hg-accent,#63D71E);opacity:.8"></i>`).join('')}</div><span class="mk-s">${hgT('edit.last_7_days')}</span>`,
    yield: `<div style="display:flex;align-items:flex-end;gap:5px;height:52px">${[[80, 1], [62, 0], [30, 2], [24, 2], [55, 0], [86, 1], [70, 1]].map(([v, k]) => `<i style="flex:1;height:${v}%;border-radius:999px;background:${['var(--hg-accent,#63D71E)', 'rgba(255,255,255,.45)', '#FF8A3D'][k]};opacity:.85"></i>`).join('')}</div><span class="mk-s">${hgT('edit.next_7_days')}</span>`,
    phases: ['L1', 'L2', 'L3'].map((l, k) => `<div class="mk-r"><span class="mk-s">${l}</span><div class="mk-tr" style="flex:1"><i style="--w:${[42, 68, 25][k]}%"></i></div><b>${[1.2, 2.1, 0.7][k]} kW</b></div>`).join(''),
    flow: `<svg viewBox="0 0 100 62" style="width:100%;height:100%;max-height:96px"><g fill="none" stroke-linecap="round"><path d="M22 31 L78 31" stroke="#5AA2FF" stroke-opacity=".35" stroke-width=".8"/><path d="M44 15 Q18 11 14 23" stroke="#F5B53D" stroke-opacity=".35" stroke-width=".8"/><path d="M56 15 Q82 11 86 23" stroke="#F5B53D" stroke-opacity=".35" stroke-width=".8"/><path d="M56 47 Q82 51 86 39" stroke="#A78BFA" stroke-opacity=".35" stroke-width=".8"/>
      <path class="mk-fl" d="M56 15 Q82 11 86 23" stroke="#F5B53D"/><path class="mk-fl" d="M44 15 Q18 11 14 23" stroke="#F5B53D"/><path class="mk-fl" d="M56 47 Q82 51 86 39" stroke="#A78BFA"/></g>
      ${[[50, 9, '#F5B53D', '2,8'], [14, 31, '#5AA2FF', '0,9'], [86, 31, 'var(--hg-accent)', '2,4'], [50, 53, '#A78BFA', '76%']].map(([x, y, c, t]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="rgba(255,255,255,.10)" stroke="${c}" stroke-width="1.4"/><text x="${x}" y="${y + 1.8}" text-anchor="middle" font-size="5.2" font-weight="600" fill="currentColor">${t}</text>`).join('')}</svg>`,
    pv: `<div class="mk-r"><span class="mk-ic on">${I('mdi:solar-power-variant')}</span><span class="mk-v">4,8<small> kW</small></span></div><div class="mk-tr" style="height:6px"><i style="--w:58%"></i></div><div class="mk-r"><span class="mk-s">${hgT('common.today')}</span><b style="margin-left:auto">21,4 kWh</b></div>`,
    net: `<div class="mk-r"><span class="mk-ic on">${I('mdi:web')}</span><span><b>${hgT('edit.online')}</b><br><span class="mk-s">↓ 512 · ↑ 98 Mb/s</span></span></div>`,
    sensors: [['mdi:motion-sensor', hgT('edit.motion_hall'), 1], ['mdi:door-closed', hgT('edit.front_door'), 0]].map(([i, n, on]) => `<div class="mk-r${on ? ' mk-on' : ''}"><span class="mk-ic${on ? ' on' : ''}">${I(i)}</span><span>${n}</span></div>`).join(''),
    link: `<div class="mk-g mk-r" style="padding:10px"><span class="mk-ic on">${I('mdi:open-in-new')}</span><span><b>${hgT('edit.settings')}</b><br><span class="mk-s">${hgT('common.open')}</span></span></div>`,
    person: `<div style="display:flex;flex-direction:column;align-items:center;gap:6px"><span class="mk-av" style="background:#a3e635;width:40px;height:40px">M</span><span class="mk-s">${hgT('common.at_home')}</span></div>`,
    rooms: `<div class="mk-grid" style="--c:2;gap:4px">${[[hgT('edit.living'), '21,5°', 1], [hgT('edit.kitchen'), '22,1°', 0], [hgT('edit.bedroom'), '19,8°', 0], [hgT('edit.bath'), '23,0°', 0]].map(([n, t, on]) => `<div class="mk-g" style="padding:5px 6px;min-width:0;display:flex;flex-direction:column;gap:1px;font-size:10.5px${on ? ';box-shadow:inset 0 0 0 1px var(--hg-accent)' : ''}"><b style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</b><span class="mk-s">${t} · 48%</span></div>`).join('')}</div>`,
    room: `<div class="mk-r"><span class="mk-ic on">${I('mdi:sofa')}</span><b>${hgT('edit.living_room')}</b></div><div class="mk-grid" style="--c:3"><span class="mk-sc">${I('mdi:lightbulb')}</span><span class="mk-sc">${I('mdi:television')}</span><span class="mk-sc">${I('mdi:thermometer')}</span></div>`,
    appliance: `<div class="mk-r"><span class="mk-ic on">${I('mdi:washing-machine')}</span><span style="min-width:0"><b>${hgT('edit.washer')}</b><br><span class="mk-s">${hgT('edit.cotton_40')}</span></span><b style="margin-left:auto">42 min</b></div><div class="mk-tr" style="height:6px"><i style="--w:64%"></i></div>`,
    cwu: `<div class="mk-r"><span class="mk-ic on">${I('mdi:water-boiler')}</span><span class="mk-v">52<small>°C</small></span></div><div class="mk-tr"><i style="--w:70%"></i></div><span class="mk-s">${hgT('edit.heating_1_9_kw')}</span>`,
    stairs: `<div class="mk-r"><span class="mk-ic on">${I('mdi:stairs-up')}</span><span><b>${hgT('edit.stairs')}</b><br><span class="mk-s">${hgT('edit.motion_below_going_up')}</span></span></div><div style="display:flex;align-items:flex-end;gap:3px;height:30px">${[1, 1, 1, 1, .9, .7, .45, .25, .12, .08].map((o, k) => `<i style="flex:1;height:${30 + k * 7}%;border-radius:3px;background:var(--hg-accent);opacity:${o}"></i>`).join('')}</div>`,
    fuel: [['PB95', '6.29'], ['ON', '6.41'], ['LPG', '2.99']].map(([l, v]) => `<div class="mk-r"><span class="mk-chip"><span>${l}</span></span><b>${v} zł</b></div>`).join(''),
    light: `<div class="mk-r"><span class="mk-cir on" style="width:30px;height:30px">${I('mdi:lightbulb-on')}</span><span><b>${hgT('edit.living_room')}</b><br><span class="mk-s">${hgT('edit.on_72')}</span></span></div><div class="mk-tr" style="height:12px"><i style="--w:72%"></i></div>`,
    thermo: `<div style="display:grid;place-items:center"><svg viewBox="0 0 100 58" style="width:104px;height:60px"><path d="M10 52 A40 40 0 0 1 90 52" fill="none" stroke="currentColor" stroke-opacity=".16" stroke-width="7" stroke-linecap="round"/><path d="M10 52 A40 40 0 0 1 70 18" fill="none" stroke="#F59E0B" stroke-width="7" stroke-linecap="round"/><text x="50" y="47" text-anchor="middle" font-size="19" font-weight="300" fill="currentColor">21,5°</text></svg><span class="mk-s">${hgT('edit.heating_to_22')}</span></div>`,
    value: `<span class="mk-s">${hgT('edit.water_usage')}</span><div class="mk-v">128<small> l</small></div><span class="mk-s">${hgT('common.today_lower')}</span>`,
    history: `<div class="mk-r"><span class="mk-s">${hgT('edit.living_bedroom')}</span></div><svg viewBox="0 0 100 34" preserveAspectRatio="none" style="width:100%;height:40px"><polyline points="0,22 15,18 30,20 45,12 60,15 75,8 100,10" fill="none" class="acc" stroke-width="2" vector-effect="non-scaling-stroke"/><polyline points="0,28 15,26 30,27 45,22 60,24 75,19 100,21" fill="none" stroke="#7dd3fc" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`,
    openings: [['mdi:door-open', hgT('edit.patio'), 1], ['mdi:window-closed-variant', hgT('edit.kitchen'), 0], ['mdi:door-closed', hgT('edit.entrance'), 0]].map(([i, n, on]) => `<div class="mk-r${on ? ' mk-on' : ''}"><span class="mk-ic${on ? ' on' : ''}">${I(i)}</span><span>${n}</span><span class="mk-s" style="margin-left:auto">${on ? hgT('common.state_open') : hgT('edit.closed')}</span></div>`).join(''),
    battery: [[hgT('common.motion'), 12, '#FF6B63'], [hgT('edit.remote'), 38, '#F5B53D'], [hgT('edit.lock'), 86, 'var(--hg-accent)']].map(([n, v, c]) => `<div class="mk-r"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</span><span style="width:38%;height:6px;border-radius:3px;background:color-mix(in srgb, currentColor 14%, transparent);position:relative;overflow:hidden"><i style="position:absolute;inset:0 auto 0 0;width:${v}%;background:${c};border-radius:3px"></i></span><b style="width:30px;text-align:right">${v}%</b></div>`).join(''),
    vacuum: `<div class="mk-r"><span class="mk-ic on" style="width:34px;height:34px;border-radius:50%">${I('mdi:robot-vacuum')}</span><span><b>${hgT('common.cleaning')}</b><br><span class="mk-s">${hgT('edit.battery_82')}</span></span></div><div style="display:flex;gap:6px"><span class="mk-btn">${I('mdi:pause')}${hgT('common.pause')}</span><span class="mk-btn">${I('mdi:home-import-outline')}${hgT('edit.dock')}</span></div>`,
    mediamini: `<div class="mk-r"><span class="mk-art" style="width:34px;height:34px"></span><span style="min-width:0"><b>${hgT('edit.song')}</b><br><span class="mk-s">${hgT('edit.artist')}</span></span><span class="mk-cir on" style="width:26px;height:26px;margin-left:auto">${I('mdi:pause')}</span></div>`,
    clock: `<div style="display:flex;flex-direction:column;align-items:center;gap:2px"><b style="font-size:30px;font-weight:200;letter-spacing:-.03em;font-variant-numeric:tabular-nums;line-height:1">10:32</b><span class="mk-s">${hgT('edit.thursday_15_october')}</span></div>`,
    sun: `<svg viewBox="0 0 100 40" style="width:100%;height:46px"><line x1="0" y1="32" x2="100" y2="32" stroke="currentColor" stroke-opacity=".2"/><path d="M8 32 Q50 -8 92 32" fill="none" stroke="currentColor" stroke-opacity=".3" stroke-dasharray="2 3"/><path d="M8 32 Q26 10 40 9" fill="none" stroke="#F5B53D" stroke-width="2"/><circle cx="40" cy="9" r="4" fill="#F5B53D" stroke="#fff" stroke-width="1"/></svg><div class="mk-r"><span class="mk-s">${I('mdi:weather-sunset-up')} 07:02</span><span class="mk-s" style="margin-left:auto">17:53 ${I('mdi:weather-sunset-down')}</span></div>`,
    note: `<div style="font-size:12px;line-height:1.45"><b>${hgT('edit.for_the_weekend')}</b><div style="opacity:.75">• ${hgT('edit.water_the_plants')}</div><div style="opacity:.75">• ${hgT('edit.take_out_the_trash')}</div></div>`,
    image: `<div style="flex:1;border-radius:10px;background:linear-gradient(160deg,#7dd3fc 0%,#a78bfa 55%,#f9a8d4 100%);position:relative;overflow:hidden"><svg viewBox="0 0 100 40" preserveAspectRatio="none" style="position:absolute;inset:auto 0 0 0;width:100%;height:60%"><path d="M0 40 L0 26 L22 12 L40 26 L58 8 L100 30 L100 40Z" fill="rgba(255,255,255,.35)"/></svg><span style="position:absolute;left:14%;top:18%;width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,.85)"></span></div>`,
    child: `<div class="mk-r"><span class="mk-ic on">${I('mdi:human-child')}</span><span><b>${hgT('edit.zoe')}</b><br><span class="mk-s">${hgT('common.at_facility')}</span></span></div>` + [['mdi:login', hgT('common.check_in'), '08:12'], ['mdi:silverware-fork-knife', hgT('edit.meals'), '3']].map(([i, n, v]) => `<div class="mk-r"><span class="mk-ic">${I(i)}</span><span>${n}</span><b style="margin-left:auto">${v}</b></div>`).join(''),
    updates: [['mdi:home-assistant', 'Core', '2026.10.2'], ['mdi:puzzle-outline', 'HACS', '2.1.0']].map(([i, n, v]) => `<div class="mk-r"><span class="mk-ic on">${I(i)}</span><b>${n}</b><span class="mk-s" style="margin-left:auto">→ ${v}</span></div>`).join(''),
    smartlock: `<div style="display:flex;align-items:center;gap:12px;justify-content:center"><span class="mk-cir on" style="width:46px;height:46px;box-shadow:0 0 0 6px color-mix(in srgb, var(--hg-accent) 22%, transparent)">${I('mdi:lock')}</span><span style="display:flex;flex-direction:column;gap:3px"><b style="font-size:14px">${hgT('edit.locked')}</b><span class="mk-s" style="white-space:nowrap">${hgT('edit.hold_to_open')}</span></span></div>`,
    purifier: `<div class="mk-r"><span class="mk-ic on" style="width:30px;height:30px;border-radius:50%">${I('mdi:air-purifier')}</span><span class="mk-v" style="font-weight:300">8<small> µg/m³</small></span><span class="mk-sw on"></span></div><svg viewBox="0 0 100 16" preserveAspectRatio="none" style="width:100%;height:14px"><path class="acc mk-dash" fill="none" stroke-width="1.6" d="M0 8 Q6 2 12 8 T24 8 T36 8 T48 8 T60 8 T72 8 T84 8 T96 8 T108 8"/></svg><div class="mk-r"><span class="mk-s">PM2,5 · ${hgT('edit.good')}</span><span class="mk-s" style="text-align:right">${hgT('edit.auto_mode')}</span></div>`,
    map: `<div class="mk-map" style="flex:1"><span class="mk-pin" style="left:30%;top:35%"></span><span class="mk-pin" style="left:66%;top:52%;filter:hue-rotate(160deg)"></span></div>`,
  };
  return `<div class="mk" aria-hidden="true"><div class="mk-in">${M[id] || `<div style="display:grid;place-items:center;opacity:.5">${I('mdi:card-outline')}</div>`}</div>${tag}</div>`; };
/* makieta wyższa lub szersza niż miniatura (długie nazwy, mniejsza miniatura na telefonie): pomniejszenie zamiast ucięcia */
const hgMkFit = (root) => { for (const el of root.querySelectorAll('.mk-in')) { el.style.zoom = ''; const h = el.clientHeight, w = el.clientWidth; if (!h || !w) continue;
  const z = Math.min(1, h / el.scrollHeight, w / el.scrollWidth); if (z < 0.99) el.style.zoom = Math.max(0.55, z).toFixed(3); } };
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
class HGTilesCard extends HGBase {
  constructor() { super(); this._sub = () => this.rerender(); }
  connectedCallback() { super.connectedCallback(); HGL.subs.add(this._sub); }
  disconnectedCallback() { HGL.subs.delete(this._sub); }
  ents() { if (this._config.group) return this._config.group.es.slice(); if (this._config.single) return [this._config.single.e]; const o = []; for (const x of HGL.get(this._config.scope).added) { if (this._config.one && x.e !== this._config.one) continue; if (!x.c) { if (x.e) o.push(x.e); continue; } for (const v of Object.values(x.v || {})) for (const y of [].concat(v)) { const e = typeof y === 'string' ? y : y && y.entity; if (e) o.push(e); } } return o; }
  _extraSig() { return this._config.single ? (HG_HIST.m.get(this._config.single.e) || {}).t || 0 : [HGL.data.s[this._config.scope] || null, [...HG_HIST.m.values()].map((x) => x.t).join()]; }
  css() { return `:host{ display:block; height:auto; container-type:inline-size; }` + HG_TILE_CSS; }
  render() {
    const h = this._hass; if (this._config.group) { const G = this._config.group, tt = G.lay === 'g-list' ? 'compact' : G.lay === 'g-clist' ? 'minimal' : '';
      return `<div class="hgg ${G.lay}">${G.n ? `<div class="hgg-h">${G.i ? H.icon(G.i) : ''}<b>${H.esc(G.n)}</b><small>${G.es.length}</small></div>` : ''}<div class="hgg-b">${G.es.map((e) => `<div class="tg2 one">${hgTileHtml(h, e, 's', tt && hgTypesFor(h, e).includes(tt) ? { t: tt } : {})}</div>`).join('')}</div></div>`; }
    if (this._config.single) return `<div class="tg2 one">${hgTileHtml(h, this._config.single.e, 's', this._config.single)}</div>`;
    const L = HGL.get(this._config.scope), hid = new Set(L.hidden);
    if (this._config.one) { const x = L.added.find((y) => y.e === this._config.one); if (!x) return '';
      if (!x.c) return h.states[x.e] ? `<div class="tg2 one">${hgTileHtml(h, x.e, 's', x)}</div>` : '';   /* zwykły kafel jako osobna karta panelu (#17) */
      return customElements.get(x.c) ? `<div class="tg2 one">${hgCmHtml(x, 's')}</div>` : ''; }
    const it = HGL.sort(L.added.filter((x) => (x.c ? !this._config.nocomp && customElements.get(x.c) : h.states[x.e]) && !hid.has(x.e)), (x) => x.e, L.order);
    return `<div class="tg2${L.order.length || it.some((x) => x.c) ? ' ord' : ''}" data-hgl="${H.esc(this._config.scope)}" data-hgsz="1">${it.map((x) => (x.c ? hgCmHtml(x, L.size[x.e]) : hgTileHtml(h, x.e, L.size[x.e], x))).join('')}</div>`;
  }
  afterRender() { hgSlots(this); hgCmSlots(this); }
  onAct(act, t) { hgTileAct(this, act, t); }
}
hgReg('hg-tiles-card', HGTilesCard, hgTLazy('edit.tiles_card.picker_name'), hgTLazy('edit.tiles_card.picker_description'));

/* style trybu edycji wstrzykiwane do cieni kart (elementy z data-hgk w kontenerach data-hgl) */
const HGDraft = window.HGDraft = {
  defer(page, o) { const d = page._eDraft = page._eDraft || { reload: false, dash: null }; if (o && o.reload) d.reload = true; if (o && o.dash) d.dash = o.dash; d.n = (d.n || 0) + 1; return d; },
  pending(page) { return !!(page && page._eDraft && page._eDraft.n); },
  discard(page) { page._eDraft = null; if (typeof HGLookX !== 'undefined') { HGLookX.pend = null; HGLookX.kpend = false; HGLookX.cv = null; HGLookX.dash = null; } },
  /* zwraca 'reload' albo 'build'; błąd zapisu konfiguracji pulpitu przerywa (szkic zostaje) */
  async commit(page, h) { const d = page._eDraft; page._eDraft = null; if (!d) return 'build';
    if (d.dash && !window.__hgDryRun) await h.callWS({ type: 'lovelace/config/save', url_path: HG_DASH(), config: d.dash });
    return d.reload ? 'reload' : 'build'; },
};
const HG_SET_PAGES = () => [
  ['general', 'mdi:tune-variant', hgT('settings.pg.general'), 'general'],
  ['theme', 'mdi:palette-outline', hgT('settings.pg.theme'), 'look'], ['bg', 'mdi:image-outline', hgT('settings.pg.bg'), 'look'], ['header', 'mdi:page-layout-header', hgT('settings.pg.header'), 'look'],
  ['views', 'mdi:view-carousel-outline', hgT('settings.pg.views'), 'dash'], ['rooms', 'mdi:sofa-outline', hgT('settings.pg.rooms'), 'dash'],
  ['wall', 'mdi:tablet-dashboard', hgT('settings.pg.wall'), 'wall'], ['security', 'mdi:shield-lock-outline', hgT('settings.pg.security'), 'wall'],
  ['assist', 'mdi:microphone-message', hgT('settings.pg.assist'), 'sys'], ['users', 'mdi:account-multiple-outline', hgT('settings.pg.users'), 'sys'], ['integrations', 'mdi:puzzle-outline', hgT('settings.pg.integrations'), 'sys'],
  ['backup', 'mdi:backup-restore', hgT('settings.pg.backup'), 'sys'], ['about', 'mdi:information-outline', hgT('settings.pg.about'), 'sys']];
const hgSetNorm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').toLowerCase();
const hgSetWords = window.hgSetWords = (q) => hgSetNorm(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const hgSetMatch = window.hgSetMatch = (text, W) => { const T = hgSetNorm(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean); return W.length > 0 && W.every((w) => T.some((t) => t.startsWith(w))); };
const hgSetText = (root) => { const o = []; const w = (n) => { for (const c of n.childNodes) { if (c.nodeType === 3) o.push(c.nodeValue); else if (c.nodeType === 1 && !/^(STYLE|SCRIPT|TEMPLATE|OPTION|SVG)$/i.test(c.tagName) && !c.hidden && c.getAttribute('aria-hidden') !== 'true') { for (const at of ['aria-label', 'placeholder', 'title']) { const v = c.getAttribute(at); if (v) o.push(v); } w(c); } } }; w(root); return o.join(' '); };
const hgSetPage = window.hgSetPage = (k, has) => { const p = HG_SET_LEGACY[k] || k; return has && !has.has(p) ? [...has][0] || 'general' : p || 'general'; };
const HG_THUMB_T = new Set(['tog', 'btn', 'compact', 'minimal', 'val', 'chart', 'run', 'cover', 'media']);
const HG_SCHEMA = { '': 'n', card: 'n', compact: 'c', minimal: 'm', clim: 'k', cam: 'v', media: 'p' };
/* karty grupowe (wiele encji): układ całego zestawu; pojedyncze kafelki mają własne style */
const HG_GRP_LBL = hgTO({}, { players: 'common.media', cameras: 'edit.cameras', scenes: 'edit.scenes', people: 'edit.household', persons: 'edit.household', lights: 'edit.lights', robots: 'edit.robots', power: 'edit.power', covers: 'edit.covers' });
const HG_GRP_TYPES = [hgTO(['card'], { 1: 'edit.group_types.card' }), hgTO(['g-list'], { 1: 'edit.group_types.list' }), hgTO(['g-grid'], { 1: 'edit.group_types.grid' }), hgTO(['g-car'], { 1: 'edit.group_types.carousel' }), hgTO(['g-clist'], { 1: 'edit.group_types.compact_list' })];   /* [typ, etykieta]; etykieta to getter – język przy użyciu */

/* The editor (settings sheets, drag and drop and every _e* method) lives in its own chunk, dist/nuvio-edit.js, imported the first time
   someone enters edit mode; a plain dashboard visit never downloads it. The chunk re-applies the page methods, then says hello. */
const HGEditLoad = window.__hgEditLoad || (window.__hgEditLoad = (() => { let p = null;
  return () => (p = p || import(/* webpackIgnore: true */ (typeof HG_ASSET === 'string' ? HG_ASSET : '') + 'nuvio-edit.js')); })());
window.addEventListener('hg-edit-ready', () => {
  HGPage.prototype._editEnter = HGPage.prototype._editEnterReal; delete HGPage.prototype._editEnterReal;
  for (const pg of document.querySelectorAll('hg-page, nuvio-page')) if (pg._hgWantEdit) { pg._hgWantEdit = false; if (pg._editEnter) pg._editEnter(); }
});
/* until the chunk arrives: remember the intent and fetch it */
HGPage.prototype._editEnterReal = HGPage.prototype._editEnter;
HGPage.prototype._editEnter = function () { this._hgWantEdit = true; return HGEditLoad().catch(() => { this._hgWantEdit = false; }); };
