/* ===== Tryb edycji układu (admin): kolejność (przeciąganie + FLIP), ukrywanie/przywracanie, rozmiar S/M/L, dodawanie kafli z encji HA.
   Układ: nadpisania na bazie CFG z build.py, per zakres (widok / „rooms” / „room:<id>” / „<widok>:tiles”).
   Zapis: dane użytkownika HA (websocket frontend/set_user_data, klucz home_glass_layout – synchronizacja między urządzeniami),
   kopia w localStorage (home-glass:layout) jako zapas / natychmiastowy odczyt. */
const HGL = window.__hgL || (window.__hgL = {
  KEY: 'home_glass_layout', LS: 'home-glass:layout',
  data: (() => { try { return JSON.parse(localStorage.getItem('home-glass:layout') || 'null') || { v: 1, ts: 0, s: {} }; } catch (e) { return { v: 1, ts: 0, s: {} }; } })(),
  subs: new Set(), loaded: false, _p: null,
  get(sc) { const x = this.data.s[sc] || {}; return { order: x.order || [], hidden: x.hidden || [], size: x.size || {}, added: x.added || [], names: x.names || {}, conf: x.conf || {} }; },
  set(sc, v) { const o = { order: v.order || [], hidden: v.hidden || [], size: v.size || {}, added: v.added || [], names: v.names || {}, conf: v.conf || {} };
    for (const k of Object.keys(o.conf)) if (!o.conf[k] || !Object.keys(o.conf[k]).length) delete o.conf[k];
    if (!o.order.length && !o.hidden.length && !Object.keys(o.size).length && !o.added.length && !Object.keys(o.names).length && !Object.keys(o.conf).length) delete this.data.s[sc]; else this.data.s[sc] = o; },
  load(h) {
    if (this._p) return this._p;
    const c = h && h.connection;
    this._p = !c ? Promise.resolve() : c.sendMessagePromise({ type: 'frontend/get_user_data', key: this.KEY }).then((r) => {
      const v = r && r.value; this.loaded = true;
      if (v && v.s && (v.ts || 0) >= (this.data.ts || 0)) { this.data = v; this._ls(); this.notify(); }
      HGApp.apply();
    }, () => { this.loaded = true; });
    return this._p;
  },
  _ls() { try { localStorage.setItem(this.LS, JSON.stringify(this.data)); } catch (e) {} },
  save(h) {
    this.data.ts = Date.now(); this._ls();
    if (window.__hgDryRun || !h || !h.connection) return Promise.resolve('local');
    return h.connection.sendMessagePromise({ type: 'frontend/set_user_data', key: this.KEY, value: this.data }).then(() => 'ha', () => 'local');
  },
  notify() { HGApp.apply(); for (const f of [...this.subs]) try { f(); } catch (e) {} },
  /* kolejność listy elementów wg zapisanych kluczy (nieznane na końcu, w kolejności bazowej) */
  sort(items, key, order) { if (!order.length) return items; const ix = new Map(order.map((k, i) => [k, i]));
    return items.map((x, i) => [x, i]).sort((a, b) => ((ix.has(key(a[0])) ? ix.get(key(a[0])) : 1e3 + a[1]) - (ix.has(key(b[0])) ? ix.get(key(b[0])) : 1e3 + b[1]))).map((x) => x[0]); },
  szc(sz) { return sz === 'm' ? 'hgsz-m' : sz === 'l' ? 'hgsz-l' : ''; },
});
/* ===== Wygląd: akcent (tinty i tekst na akcencie liczone wg WCAG) + tło (zdjęcie / URL / przesłane / kolor / gradient) + przyciemnienie ===== */
const HG_ACCENTS = [[('#' + '63D71E'), 'Limonka'], [('#' + '3DDC97'), 'Mięta'], [('#' + '2EC4D6'), 'Turkus'], [('#' + '4C9BFF'), 'Błękit'], [('#' + 'A78BFA'), 'Fiolet'], [('#' + 'FF6FAE'), 'Róż'], [('#' + 'FF9F43'), 'Pomarańcz'], [('#' + 'F5C542'), 'Złoto']];
const HG_BGS = [...(window.HG_BG_SET || [['', 'Domyślne']]), ...(window.HG_USER_BGS || [])];   /* [url, nazwa, url pionowy, miniatura]; pierwszy = domyślny (bg = null) */   /* własne zdjęcia: URL / przesłanie; gradienty w sekcji „Kolor lub gradient” */
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
  get() { return (HGL.data.app) || {}; },
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
      else if (!B._st) { B._st = 'wait'; const im = new Image(); im.onload = () => { B._st = 'ok'; }; im.onerror = () => { B._st = 'bad'; this.apply(); }; im.src = B.v; } }
    const img = this.bgImg(B), img2 = B && B.v2p ? this.bgImg({ kind: 'image', v: B.v2p }) : img;
    const dim = a.dim != null ? Math.max(0, Math.min(1, a.dim)) : null;
    let css = '';
    const L = Object.assign({}, T ? T.light : {}, img ? { '--hg-bg-wide': img, '--hg-bg-portrait': img2 } : {});
    const D = Object.assign({}, T ? T.dark : {}, img ? { '--hg-bg-wide': img, '--hg-bg-portrait': img2 } : {}, dim != null ? { '--hg-night': 'rgb' + `a(6,8,12,${(dim * 0.65).toFixed(3)})`, '--hg-photo-filter': `brightness(${(1 - dim * 0.45).toFixed(3)}) saturate(.9)` } : {});
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
const HG_TYPES = { tog: 'Przełącznik', btn: 'Przycisk', compact: 'Kompaktowy', minimal: 'Minimalny', val: 'Odczyt', chart: 'Z wykresem', clim: 'Klimat', media: 'Multimedia', cam: 'Kamera', cover: 'Roleta', run: 'Akcja' };
const hgTypesFor = (h, e) => { const d = e.split('.')[0], s = h.states[e], k = HG_TILE_KIND(e), num = s && s.state !== '' && isFinite(Number(s.state));
  if (k === 'tog') return ['tog', 'btn', 'compact', 'minimal']; if (k === 'run') return ['run', 'btn', 'compact', 'minimal']; if (k === 'clim') return ['clim', 'val', 'chart', 'compact', 'minimal'];
  if (k === 'media') return ['media', 'compact', 'minimal']; if (k === 'cam') return ['cam', 'compact', 'minimal']; if (k === 'cover') return ['cover', 'compact', 'minimal'];
  return num || d === 'sensor' ? ['val', 'chart', 'compact', 'minimal'] : ['val', 'compact', 'minimal']; };
const hgTypeOpts = (h, e) => hgTypesFor(h, e).map((t, i) => [t, i ? HG_TYPES[t] : 'Normalny']);
/* historia (24 h) do wykresów – pamięć 5 min, odświeżenie kart po pobraniu */
const HG_HIST = window.__hgHist || (window.__hgHist = { m: new Map(), get(h, e, cb) { const c = this.m.get(e); if (c && Date.now() - c.t < 300000) return c.d; if (c && c.p) return c.d;
  const o = { t: Date.now(), d: c ? c.d : null, p: true }; this.m.set(e, o);
  if (h && h.callWS) h.callWS({ type: 'history/history_during_period', start_time: new Date(Date.now() - 864e5).toISOString(), entity_ids: [e], minimal_response: true, no_attributes: true, significant_changes_only: false })
    .then((r) => { const a = (r && r[e]) || []; o.d = a.map((x) => [x.lu * 1000 || Date.parse(x.last_updated || x.last_changed), Number(x.s != null ? x.s : x.state)]).filter((x) => isFinite(x[1])); o.p = false; o.t = Date.now(); cb && cb(); }, () => { o.p = false; o.d = []; });
  return o.d; } });
const hgSpark = (pts) => { if (!pts || pts.length < 2) return '<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none"></svg>';
  const t0 = pts[0][0], t1 = pts[pts.length - 1][0] || t0 + 1, v = pts.map((p) => p[1]), lo = Math.min(...v), hi = Math.max(...v), rg = hi - lo || 1;
  const P = pts.map((p) => `${((p[0] - t0) / (t1 - t0 || 1) * 100).toFixed(2)},${(28 - (p[1] - lo) / rg * 26).toFixed(2)}`).join(' ');
  return `<svg class="sp" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,30 ${P} 100,30" fill="var(--hg-accent-soft)"/><polyline points="${P}" fill="none" stroke="var(--hg-accent)" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`; };
/* podgląd karty w „Ustawieniach karty”: zawartość wyższa niż ramka zostaje proporcjonalnie zmniejszona (bez wylewania na listę encji) */
function hgPvFit(box, el) { let n = 0; const fit = () => { if (!box.isConnected) return; el.style.transform = ''; el.style.width = '';
    const H0 = box.clientHeight, h1 = el.scrollHeight; if (H0 && h1 > H0 + 2) { const s = Math.max(0.3, H0 / h1); el.style.transform = `scale(${s.toFixed(3)})`; el.style.width = `${(100 / s).toFixed(2)}%`; }
    if (++n < 6) setTimeout(fit, n * 350); }; requestAnimationFrame(fit); }
const HG_KIND_LBL = { tog: 'Przełącznik', clim: 'Klimat', media: 'Multimedia', cam: 'Kamera', cover: 'Roleta', run: 'Akcja', val: 'Odczyt' };
const HG_DOM_ICON2 = { light: 'mdi:lightbulb-outline', switch: 'mdi:toggle-switch-outline', fan: 'mdi:fan', input_boolean: 'mdi:toggle-switch-outline', automation: 'mdi:robot-outline',
  lock: 'mdi:lock-outline', climate: 'mdi:thermostat', media_player: 'mdi:speaker', camera: 'mdi:cctv', cover: 'mdi:window-shutter', sensor: 'mdi:gauge', binary_sensor: 'mdi:checkbox-blank-circle-outline',
  scene: 'mdi:palette-outline', script: 'mdi:script-text-outline', button: 'mdi:gesture-tap-button', weather: 'mdi:weather-partly-cloudy', person: 'mdi:account', water_heater: 'mdi:water-boiler' };
const hgTileHtml = (h, e, sz, o) => {
  o = o || {}; const s0 = h.states[e]; if (!s0) return '';
  const s = o.n || o.i ? Object.assign({}, s0, { attributes: Object.assign({}, s0.attributes, o.n ? { friendly_name: o.n } : {}, o.i ? { icon: o.i } : {}) }) : s0;
  const k0 = HG_TILE_KIND(e), k = o.t && hgTypesFor(h, e).includes(o.t) ? o.t : k0, d = e.split('.')[0], nm = s.attributes.friendly_name || H.name(h, e), ok = H.ok(s), on = ['on', 'open', 'unlocked', 'playing', 'heat', 'cool', 'auto', 'heat_cool', 'dry', 'fan_only'].includes(s.state);
  const ic = s.attributes.icon || HG_DOM_ICON2[d] || 'mdi:circle-outline', cls = `hgtl k-${k} ${HGL.szc(sz)} ${on ? 'on' : ''} ${ok ? '' : 'un'}`;
  const hd = `<span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? H.T(h, s) : 'Niedostępne')}</small></span>`;
  const actE = k0 === 'run' ? 'trun' : k0 === 'tog' ? 'ttog' : 'tmore';
  if (k === 'compact') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="${actE}" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b></span><small class="cs">${H.esc(ok ? H.T(h, s) + (s.attributes.unit_of_measurement && isFinite(Number(s.state)) ? ' ' + s.attributes.unit_of_measurement : '') : 'Niedostępne')}</small></button></div>`;
  if (k === 'minimal') { const n0 = Number(s.state), v0 = isFinite(n0) && s.state !== '' ? H.fmt(n0, Math.abs(n0) >= 100 ? 0 : 1) + (s.attributes.unit_of_measurement ? ' ' + s.attributes.unit_of_measurement : '') : ok ? H.T(h, s) : '–';
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb mm" data-act="${actE}" data-e="${H.esc(e)}" title="${H.esc(nm)}" aria-label="${H.esc(nm + ': ' + v0)}"><span class="ti">${H.icon(ic)}</span><small>${H.esc(v0)}</small></button></div>`; }
  if (k === 'btn') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb bb" data-act="${actE}" data-e="${H.esc(e)}" aria-pressed="${on}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(ok ? H.T(h, s) : 'Niedostępne')}</small></span></button></div>`;
  if (k === 'chart') { const pts = HG_HIST.get(h, e, () => { HGL.notify(); }), cur = k0 === 'clim' ? s.attributes.current_temperature : Number(s.state), u = k0 === 'clim' ? '°' : (s.attributes.unit_of_measurement || '');
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>Ostatnie 24 h</small></span></button><span class="tv">${H.esc(cur != null && isFinite(cur) ? H.fmt(cur, Math.abs(cur) >= 100 ? 0 : 1) : '–')}<em>${H.esc(u)}</em></span>${hgSpark(k0 === 'clim' ? null : pts)}</div>`; }
  if (k === 'val' && k0 === 'clim') { const ct = s.attributes.current_temperature; return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b><small>${H.esc(H.T(h, s))}</small></span></button><span class="tv">${ct != null ? H.fmt(ct, 1) : '–'}<em>°</em></span></div>`; }
  if (k === 'clim') return `<div class="${cls}" data-hgk="${H.esc(e)}"><div class="acslot" data-ac="${H.esc(e)}"${o && o.n ? ` data-n="${H.esc(o.n)}"` : ''}></div></div>`;
  if (k === 'cam') return `<div class="${cls}" data-hgk="${H.esc(e)}"><div class="camslot" data-cam="${H.esc(e)}"></div></div>`;
  if (k === 'tog') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${hd}</button>${ok ? `<button class="tg ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${H.esc(nm)}" data-act="ttog" data-e="${H.esc(e)}"><i></i></button>` : ''}</div>`;
  if (k === 'run') return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="trun" data-e="${H.esc(e)}">${hd}</button><button class="rb" data-act="trun" data-e="${H.esc(e)}" aria-label="${H.esc('Uruchom: ' + nm)}">${H.icon('mdi:play')}</button></div>`;
  if (k === 'cover') { const p = s.attributes.current_position;
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${hd}</button><div class="cv">${[['open_cover', 'mdi:chevron-up', 'Otwórz'], ['stop_cover', 'mdi:stop', 'Zatrzymaj'], ['close_cover', 'mdi:chevron-down', 'Zamknij']].map(([sv, i2, l]) => `<button data-act="tcov" data-s="${sv}" data-e="${H.esc(e)}" aria-label="${l}" ${ok ? '' : 'disabled'}>${H.icon(i2)}</button>`).join('')}${p != null ? `<em>${p}%</em>` : ''}</div></div>`; }
  if (k === 'media') { const a = s.attributes, t = a.media_title || '', ar = a.media_artist || a.app_name || '', pic = a.entity_picture;
    return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}">${pic ? `<img class="ma" alt="" src="${H.esc(pic)}">` : `<span class="ti">${H.icon(ic)}</span>`}<span class="tn"><b>${H.esc(t || nm)}</b><small>${H.esc(t ? (ar || nm) : (ok ? H.T(h, s) : 'Niedostępne'))}</small></span></button>
      <div class="mc"><button data-act="tmp" data-e="${H.esc(e)}" aria-label="Odtwórz / pauza" ${ok && s.state !== 'off' ? '' : 'disabled'}>${H.icon(s.state === 'playing' ? 'mdi:pause' : 'mdi:play')}</button><button class="pw ${s.state !== 'off' && ok ? 'on' : ''}" data-act="tmw" data-e="${H.esc(e)}" aria-label="Zasilanie" ${ok ? '' : 'disabled'}>${H.icon('mdi:power')}</button></div></div>`; }
  const u = s.attributes.unit_of_measurement || '', n = Number(s.state), num = s.state !== '' && isFinite(n);
  const v = num ? H.fmt(n, Math.abs(n) >= 100 ? 0 : 1) : H.T(h, s);
  return `<div class="${cls}" data-hgk="${H.esc(e)}"><button class="hgtb" data-act="tmore" data-e="${H.esc(e)}"><span class="ti">${H.icon(ic)}</span><span class="tn"><b>${H.esc(nm)}</b></span></button><span class="tv${num ? '' : ' tx'}">${H.esc(ok ? v : '–')}${num && u ? `<em>${H.esc(u)}</em>` : ''}</span></div>`;
};
const HG_TILE_CSS = `
.tg2{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 210px), 1fr)); gap:12px; }
.hgtl{ position:relative; display:flex; align-items:center; gap:10px; min-width:0; min-height:76px; padding:12px 14px; border-radius:18px; background:var(--hg-glass-lite, var(--hg-glass-bg)); box-shadow:var(--hg-card-sh, none); color:inherit; }
.hgtl.hgsz-m{ grid-column:span 2; } .hgtl.hgsz-l{ grid-column:1 / -1; }
@container (max-width: 460px){ .hgtl.hgsz-m{ grid-column:1 / -1; } }
.hgtl.k-clim, .hgtl.k-cam{ padding:0; background:none; box-shadow:none; display:block; }
.hgtl.k-clim > div, .hgtl.k-cam > div{ height:100%; }
.hgtl .hgtb{ flex:1 1 0; display:flex; flex-wrap:nowrap; align-items:center; gap:10px; min-width:0; overflow:hidden; background:none; border:0; padding:0; color:inherit; font:inherit; text-align:left; cursor:pointer; }
.hgtl .ti{ flex:none; position:static; margin:0; width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--hg-tile-bg); }
.hgtl .ti ha-icon{ width:20px; height:20px; }
.hgtl.on .ti{ background:var(--hg-accent); color:var(--hg-on-accent); }
.hgtl .tn{ display:flex; flex-direction:column; flex:1 1 0; min-width:0; overflow:hidden; } .hgtl .tn b{ font-weight:500; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; line-clamp:2; white-space:normal; overflow:hidden; overflow-wrap:anywhere; line-height:1.25; }
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
.hgtl.k-card{ padding:0; background:none; box-shadow:none; display:block; min-height:0; } .hgtl.k-card > .cmslot{ display:block; height:100%; } .hgtl.k-card > .cmslot > *{ display:block; height:100%; }
`;
/* wspólne akcje kafli (dodanych) – używane przez hg-tiles-card i hg-room-card */
const hgTileAct = (card, act, t) => {
  const h = card._hass, e = t.dataset.e, s = e && h.states[e]; if (!s) return false;
  const d = e.split('.')[0];
  if (act === 'tmore') { H.fire(card, 'hass-more-info', { entityId: e }); return true; }
  if (act === 'ttog') { if (d === 'lock') H.call(h, 'lock', s.state === 'locked' ? 'unlock' : 'lock', { entity_id: e }); else H.call(h, 'homeassistant', 'toggle', { entity_id: e }); return true; }
  if (act === 'trun') { H.call(h, d === 'scene' ? 'scene' : d === 'script' ? 'script' : d, d === 'scene' || d === 'script' ? 'turn_on' : 'press', { entity_id: e }); return true; }
  if (act === 'tcov') { H.call(h, 'cover', t.dataset.s, { entity_id: e }); return true; }
  if (act === 'tmp') { H.call(h, 'media_player', 'media_play_pause', { entity_id: e }); return true; }
  if (act === 'tmw') { H.call(h, 'media_player', s.state === 'off' ? 'turn_on' : 'turn_off', { entity_id: e }); return true; }
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
  { id: 'switch', n: 'Światło / przełącznik', d: 'Włącz i wyłącz jednym dotknięciem', i: 'mdi:lightbulb-outline', tile: 'tog', slots: [{ k: 'e', l: 'Urządzenie', dom: ['light', 'switch', 'fan', 'input_boolean', 'lock', 'automation', 'humidifier', 'valve', 'siren'], req: 1 }] },
  { id: 'sensor', n: 'Odczyt czujnika', d: 'Wartość lub stan dowolnego czujnika', i: 'mdi:gauge', tile: 'val', slots: [{ k: 'e', l: 'Czujnik', dom: ['sensor', 'binary_sensor', 'input_number', 'counter', 'water_heater'], req: 1 }] },
  { id: 'chart', n: 'Czujnik z wykresem', d: 'Wartość i wykres z ostatnich 24 h', i: 'mdi:chart-areaspline', tile: 'chart', slots: [{ k: 'e', l: 'Czujnik liczbowy', dom: ['sensor'], num: 1, req: 1 }] },
  { id: 'climate', n: 'Klimatyzacja', d: 'Temperatura, tryby i nawiew', i: 'mdi:thermostat', tile: 'clim', slots: [{ k: 'e', l: 'Termostat / klimatyzator', dom: ['climate'], req: 1 }] },
  { id: 'cover', n: 'Roleta / brama', d: 'Otwórz, zatrzymaj, zamknij', i: 'mdi:window-shutter', tile: 'cover', slots: [{ k: 'e', l: 'Roleta', dom: ['cover'], req: 1 }] },
  { id: 'run', n: 'Scena / skrypt', d: 'Jeden przycisk uruchamiający', i: 'mdi:play-circle-outline', tile: 'run', slots: [{ k: 'e', l: 'Scena lub skrypt', dom: ['scene', 'script', 'button', 'input_button'], req: 1 }] },
  { id: 'media1', n: 'Odtwarzacz', d: 'Okładka, tytuł i sterowanie', i: 'mdi:speaker', tile: 'media', slots: [{ k: 'e', l: 'Odtwarzacz', dom: ['media_player'], req: 1 }] },
  { id: 'cam1', n: 'Kamera', d: 'Migawka i podgląd na żywo', i: 'mdi:cctv', tile: 'cam', slots: [{ k: 'e', l: 'Kamera', dom: ['camera'], req: 1 }] },
  { id: 'scenes', n: 'Sceny i skrypty', d: 'Kilka przycisków w jednej karcie', i: 'mdi:palette-outline', card: 'hg-scenes-card', slots: [{ k: 'scripts', l: 'Sceny / skrypty', dom: ['scene', 'script'], multi: 1, obj: 1, req: 1 }],
    cfg: (v) => ({ scripts: v.scripts }) },
  { id: 'cameras', n: 'Siatka kamer', d: 'Wszystkie wybrane kamery naraz', i: 'mdi:view-grid-outline', card: 'hg-cameras-card', slots: [{ k: 'entities', l: 'Kamery', dom: ['camera'], multi: 1, req: 1 }], cfg: (v) => ({ entities: v.entities }) },
  { id: 'players', n: 'Multimedia', d: 'Lista odtwarzaczy z głośnością', i: 'mdi:play-box-multiple-outline', card: 'hg-players-card', slots: [{ k: 'entities', l: 'Odtwarzacze', dom: ['media_player'], multi: 1, req: 1 }], cfg: (v) => ({ entities: v.entities }) },
  { id: 'power', n: 'Moc teraz', d: 'Moc chwilowa z linią z ostatnich godzin', i: 'mdi:flash-outline', card: 'hg-power-card', slots: [{ k: 'entities', l: 'Czujnik mocy', dom: ['sensor'], dc: ['power'], multi: 1, req: 1 }], cfg: (v) => ({ entities: v.entities, max_power: 10000, hours: 6 }) },
  { id: 'energy', n: 'Energia – statystyki', d: 'Zużycie i produkcja: dziś, tydzień, miesiąc', i: 'mdi:lightning-bolt-outline', card: 'hg-energy-stats-card', slots: [{ k: 'consumption', l: 'Zużycie (kWh)', dom: ['sensor'], dc: ['energy'], req: 1 }, { k: 'production', l: 'Produkcja (kWh, opcjonalnie)', dom: ['sensor'], dc: ['energy'] }],
    cfg: (v) => ({ consumption: v.consumption, ...(v.production ? { production: v.production } : {}) }) },
  { id: 'weather', n: 'Pogoda', d: 'Teraz, prognoza godzinowa, słońce', i: 'mdi:weather-partly-cloudy', card: 'hg-weather-card', slots: [{ k: 'entity', l: 'Prognoza', dom: ['weather'], req: 1 }], cfg: (v, h) => ({ entity: v.entity, hours: 24, ...(h.states['sun.sun'] ? { sun: 'sun.sun' } : {}) }) },
  { id: 'people', n: 'Domownicy', d: 'Kto jest w domu, strefy i czas', i: 'mdi:account-group-outline', card: 'hg-people-card', slots: [{ k: 'persons', l: 'Osoby', dom: ['person'], multi: 1, req: 1 }], cfg: (v) => ({ persons: v.persons }) },
  { id: 'alarm', n: 'Alarm', d: 'Uzbrajanie i rozbrajanie z kodem', i: 'mdi:shield-home-outline', card: 'hg-alarm-card', slots: [{ k: 'entity', l: 'Centrala alarmu', dom: ['alarm_control_panel'], req: 1 }], cfg: (v) => ({ entity: v.entity }) },
  { id: 'robots', n: 'Roboty', d: 'Odkurzacze i kosiarki: stan i sterowanie', i: 'mdi:robot-vacuum', card: 'hg-robots-card', slots: [{ k: 'entities', l: 'Roboty', dom: ['vacuum', 'lawn_mower'], multi: 1, req: 1 }], cfg: (v) => ({ entities: v.entities }) },
  { id: 'agenda', n: 'Kalendarz', d: 'Agenda lub widok miesiąca', i: 'mdi:calendar-month-outline', card: 'hg-agenda-card', cards: { agenda: 'hg-agenda-card', month: 'hg-month-card' }, modes: [['agenda', 'Agenda', 'mdi:format-list-bulleted'], ['month', 'Miesiąc', 'mdi:calendar-month-outline']],
    slots: [{ k: 'calendars', l: 'Kalendarze', dom: ['calendar'], multi: 1, req: 1 }], cfg: (v) => (v.mode === 'month' ? { calendars: v.calendars } : { calendars: v.calendars, days: 14 }) },
  { id: 'slider', n: 'Suwak', d: 'Jasność, głośność, wentylator, roleta, liczba', i: 'mdi:tune-variant', card: 'hg-slider-card', modes: [['h', 'Poziomy', 'mdi:arrow-left-right'], ['v', 'Pionowy', 'mdi:arrow-up-down']],
    slots: [{ k: 'e', l: 'Encja', dom: ['light', 'media_player', 'fan', 'cover', 'valve', 'input_number', 'number'], req: 1 }], cfg: (v) => ({ entity: v.e, mode: v.mode || 'h' }) },
  { id: 'button', n: 'Przycisk', d: 'Skrypt, scena, button.press lub akcja', i: 'mdi:gesture-tap-button', card: 'hg-button-card', modes: [['tile', 'Kafel', 'mdi:square-rounded-outline'], ['pill', 'Wiersz', 'mdi:minus-box-outline']],
    slots: [{ k: 'e', l: 'Encja', dom: ['script', 'scene', 'button', 'input_button', 'automation', 'lock', 'switch'], req: 1 }], cfg: (v) => ({ entity: v.e, mode: v.mode || 'tile' }) },
  { id: 'entities', n: 'Lista encji', d: 'Wiersze z przełącznikiem lub wartością', i: 'mdi:format-list-checks', card: 'hg-entities-card',
    slots: [{ k: 'entities', l: 'Encje', dom: ['light', 'switch', 'fan', 'input_boolean', 'siren', 'humidifier', 'sensor', 'binary_sensor', 'script', 'scene', 'button', 'input_button', 'lock', 'cover', 'climate', 'media_player', 'person'], pref: ['light', 'switch', 'fan', 'input_boolean'], multi: 1, req: 1 }], cfg: (v) => ({ entities: v.entities }) },
  { id: 'select', n: 'Wybór', d: 'Opcje input_select i select', i: 'mdi:form-dropdown', card: 'hg-select-card', modes: [['chips', 'Przyciski', 'mdi:dots-horizontal'], ['list', 'Lista', 'mdi:format-list-bulleted']],
    slots: [{ k: 'e', l: 'Encja', dom: ['input_select', 'select'], req: 1 }], cfg: (v) => ({ entity: v.e, mode: v.mode || 'chips' }) },
  { id: 'stepper', n: 'Licznik', d: 'Plus i minus dla liczników i wartości', i: 'mdi:plus-minus-variant', card: 'hg-stepper-card',
    slots: [{ k: 'e', l: 'Encja', dom: ['counter', 'input_number', 'number'], req: 1 }], cfg: (v) => ({ entity: v.e }) },
  { id: 'gauge', n: 'Wskaźnik', d: 'Wartość czujnika na łuku', i: 'mdi:gauge', card: 'hg-gauge-card', slots: [{ k: 'e', l: 'Czujnik liczbowy', dom: ['sensor', 'input_number', 'number'], num: 1, req: 1 }], cfg: (v) => ({ entity: v.e }) },
  { id: 'map', n: 'Mapa', d: 'Domownicy, urządzenia i strefy na mapie', i: 'mdi:map-outline', card: 'hg-map-card', slots: [{ k: 'entities', l: 'Osoby, urządzenia, strefy', dom: ['person', 'device_tracker', 'zone'], loc: 1, multi: 1, req: 1 }],
    cfg: (v) => ({ entities: v.entities, theme_mode: 'auto', hours_to_show: 0 }) },
];
/* domyślny rozmiar nowego komponentu: duże karty od razu M / L, proste kafle S */
const HG_COMP_Z = { climate: 'm', media1: 'm', cam1: 'm', chart: 'm', scenes: 'm', cameras: 'l', players: 'm', power: 'm', energy: 'm', weather: 'm', people: 'm', alarm: 'm', robots: 'm', agenda: 'm', map: 'l', slider: 'm', entities: 'm', select: 'm' };
/* kandydaci do slotu: domena, device_class, liczba; bez ukrytych / diagnostycznych */
const hgSlotCands = (h, sl) => Object.keys(h.states).filter((e) => { const d = e.split('.')[0], s = h.states[e], r = (h.entities || {})[e];
  if (!sl.dom.includes(d) || (r && (r.hidden || r.entity_category))) return false; if (sl.dc && !sl.dc.includes(s.attributes.device_class)) return false; if (sl.num && !hgIsNum(h, e)) return false; if (sl.loc && s.attributes.latitude == null) return false; return true; })
  .sort((a, b) => (sl.pref ? ((sl.pref.indexOf(a.split('.')[0]) + 1 || 99) - (sl.pref.indexOf(b.split('.')[0]) + 1 || 99)) : 0) || H.name(h, a).localeCompare(H.name(h, b)));
const hgCompOk = (C) => !C.card || !!customElements.get(C.card);
const hgCompCard = (C, v) => (C.cards && v && C.cards[v.mode]) || C.card;
const HG_CM = window.__hgCm || (window.__hgCm = new Map());   /* klucz dodanego komponentu -> { c, cfg } (do montowania w slotach) */
const hgCmHtml = (x, sz) => { HG_CM.set(x.e, { c: x.c, cfg: Object.assign({}, x.cfg, x.n ? { title: x.n, name: x.n } : {}, x.i ? { icon: x.i } : {}) });
  return `<div class="hgtl k-card ${HGL.szc(sz)}" data-hgk="${H.esc(x.e)}"><div class="cmslot" data-cm="${H.esc(x.e)}"></div></div>`; };
const hgCmSlots = (card) => { const h = card._hass; card._cmM = card._cmM || new Map();
  for (const slot of card.$.querySelectorAll('.cmslot[data-cm]')) { const k = slot.dataset.cm, m = HG_CM.get(k); if (!m || !customElements.get(m.c)) continue; const sig = k + JSON.stringify(m.cfg); let el = card._cmM.get(sig);
    if (!el) { el = document.createElement(m.c); try { el.setConfig(Object.assign({ type: 'custom:' + m.c }, m.cfg)); } catch (e) { /* zła konfiguracja – pusta karta */ } card._cmM.set(sig, el); }
    if (el.parentElement !== slot) slot.appendChild(el); el.hass = h; } };
const HG_COMP_CSS = `
.cg{ display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:10px; } @media (max-width:560px){ .cg{ grid-template-columns:repeat(2, minmax(0,1fr)); } }
.cg button{ all:unset; cursor:pointer; box-sizing:border-box; display:flex; flex-direction:column; gap:8px; padding:8px; border-radius:20px; background:var(--hg-tile-bg); box-shadow:inset 0 0 0 1px color-mix(in srgb, currentColor 8%, transparent); transition:transform .15s, box-shadow .15s; min-width:0; }
.cg button:hover:not(.na){ transform:translateY(-2px); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--hg-accent) 60%, transparent), 0 10px 24px rgba(0,0,0,.18); } .cg button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.cg .th{ position:relative; height:96px; border-radius:14px; overflow:hidden; background:color-mix(in srgb, currentColor 6%, transparent); pointer-events:none; } .cg .th > .tg2, .cg .th > .cmf{ position:absolute; left:0; top:0; width:250%; transform:scale(.4); transform-origin:top left; }
.cg .th .ph{ position:absolute; inset:0; display:grid; place-items:center; } .cg .th .ph ha-icon{ width:34px; height:34px; opacity:.5; }
.cg b{ font-size:14px; font-weight:600; display:flex; align-items:center; gap:6px; } .cg b ha-icon{ width:18px; height:18px; opacity:.75; flex:none; } .cg small{ font-size:12px; opacity:.66; line-height:1.3; }
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
const HGToast = window.__hgToast || (window.__hgToast = {
  L: [], el: null,
  box() { if (this.el && this.el.isConnected) return this.el; const el = this.el = document.createElement('section'); el.className = 'hgt'; el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-label', 'Powiadomienia');
    const st = document.createElement('style'); st.textContent = `.hgt{ position:fixed; left:50%; bottom:calc(20px + env(safe-area-inset-bottom, 0px)); transform:translateX(-50%); z-index:10000; width:min(380px, calc(100vw - 24px)); height:0; font:500 14px/1.3 'DM Sans', system-ui, sans-serif; }
.hgt .t{ position:absolute; left:0; right:0; bottom:0; box-sizing:border-box; display:flex; align-items:center; gap:10px; min-height:48px; padding:8px 8px 8px 16px; border-radius:20px; background:rgba(30,32,35,.84); color:#F5F6F7; box-shadow:0 12px 32px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.12); -webkit-backdrop-filter:blur(20px) saturate(180%); backdrop-filter:blur(20px) saturate(180%);
  transition:transform .38s cubic-bezier(.2,.9,.25,1), opacity .3s; transform-origin:bottom center; cursor:pointer; touch-action:pan-y; user-select:none; pointer-events:auto; will-change:transform; }
.hgt .t.in{ opacity:0; transform:translateY(24px) scale(.96); } .hgt .t.out{ opacity:0; transform:translateY(16px) scale(.9) !important; }
.hgt .t::before{ content:''; flex:none; width:8px; height:8px; border-radius:50%; background:var(--hg-accent, #63D71E); } .hgt.lt .t{ background:rgba(255,255,255,.9); color:#1E2023; box-shadow:0 12px 32px rgba(0,0,0,.14), inset 0 0 0 1px rgba(0,0,0,.08); } .hgt .t span{ flex:1; min-width:0; } .hgt .t em{ font-style:normal; font-weight:600; font-size:12px; padding:2px 8px; border-radius:999px; background:color-mix(in srgb, currentColor 12%, transparent); }
.hgt .t button{ all:unset; cursor:pointer; font-weight:700; font-size:13px; height:32px; padding:0 14px; display:inline-flex; align-items:center; border-radius:999px; background:var(--hg-accent, #63D71E); color:#0B0F0A; font-weight:600; transition:transform 150ms; } .hgt .t button:active{ transform:scale(.96); } .hgt .t button:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; }
@media (prefers-reduced-motion:reduce){ .hgt .t{ transition:opacity .2s; } }`;
    el.appendChild(st); document.body.appendChild(el);
    el.addEventListener('mouseenter', () => { this.exp = true; this.pause(true); this.lay(); }); el.addEventListener('mouseleave', () => { this.exp = false; this.pause(false); this.lay(); });
    return el; },
  lay() { const v = this.L.filter((x) => !x.gone).slice(-6).reverse(); let y = 0;
    v.forEach((x, i) => { const n = x.n; n.style.zIndex = 100 - i; n.style.pointerEvents = i < 3 ? 'auto' : 'none';
      if (this.exp) { n.style.transform = `translateY(${-y}px)`; n.style.opacity = i < 3 ? 1 : 0; y += n.offsetHeight + 8; }
      else n.style.transform = `translateY(${-i * 10}px) scale(${1 - i * 0.05})`, n.style.opacity = i < 3 ? (i ? 0.9 - i * 0.15 : 1) : 0; }); },
  pause(p) { const now = Date.now(); for (const x of this.L) { if (p) { if (x.tm) { clearTimeout(x.tm); x.tm = 0; x.left = Math.max(800, x.end - now); } } else if (!x.tm && !x.gone) this.arm(x, x.left || 2600); } },
  arm(x, ms) { clearTimeout(x.tm); x.end = Date.now() + ms; x.tm = setTimeout(() => this.drop(x), ms); },
  drop(x) { if (x.gone) return; x.gone = true; clearTimeout(x.tm); x.n.classList.add('out'); setTimeout(() => { x.n.remove(); this.L = this.L.filter((y) => y !== x); this.lay(); }, 320); this.lay(); },
  show(t, undo) { const box = this.box(), ms = undo ? 6000 : 2600; box.classList.toggle('lt', typeof HGTheme !== 'undefined' && !HGTheme.dark); box.style.bottom = `calc(${this.off || 20}px + env(safe-area-inset-bottom, 0px))`;
    const same = this.L.find((x) => !x.gone && x.t === t && !undo && !x.undo);
    if (same) { same.c++; same.n.querySelector('em') ? (same.n.querySelector('em').textContent = '×' + same.c) : same.n.querySelector('span').insertAdjacentHTML('afterend', `<em>×${same.c}</em>`); this.L = this.L.filter((y) => y !== same).concat(same); this.arm(same, ms); return this.lay(); }
    const n = document.createElement('div'); n.className = 't in'; n.setAttribute('role', 'status'); const sp = document.createElement('span'); sp.textContent = t; n.appendChild(sp);
    const x = { t, n, c: 1, undo: !!undo };
    if (undo) { const u = document.createElement('button'); u.textContent = 'Cofnij'; u.addEventListener('click', (ev) => { ev.stopPropagation(); this.drop(x); undo(); }); n.appendChild(u); }
    let sx = null; n.addEventListener('pointerdown', (e) => { sx = e.clientX; }); n.addEventListener('pointermove', (e) => { if (sx != null && Math.abs(e.clientX - sx) > 6) n.style.translate = (e.clientX - sx) + 'px 0'; });
    n.addEventListener('pointerup', (e) => { const dx = sx == null ? 0 : e.clientX - sx; sx = null; n.style.translate = ''; if (Math.abs(dx) > 60 || (Math.abs(dx) < 6 && !e.target.closest('button') && (this.exp || window.matchMedia('(hover:none)').matches))) this.drop(x); else if (Math.abs(dx) < 6 && !this.exp) { this.exp = true; this.lay(); } });
    box.appendChild(n); this.L.push(x); requestAnimationFrame(() => { n.classList.remove('in'); this.lay(); }); if (this.L.filter((y) => !y.gone).length > 6) this.drop(this.L.find((y) => !y.gone));
    if (!this.exp) this.arm(x, ms); else x.left = ms; },
});
const HG_HEAD_LIM = { t: 28, s: 48 };
const HG_COMP_EDIT = {
  _eHeadBtn() { const hd = this._headEl; if (!hd || this._config.room_head || hd.querySelector('.hge-hd')) return; const h1 = hd.querySelector('h1'); if (!h1) return;
    const b = document.createElement('button'); b.className = 'hge-hd'; b.dataset.hge = 'headedit'; b.setAttribute('aria-label', 'Edytuj tytuł i podtytuł'); b.title = 'Edytuj tytuł i podtytuł'; b.innerHTML = H.icon('mdi:pencil'); hd.insertBefore(b, h1.nextSibling); },
  _eHeadGet() { return Object.assign({}, (HGL.get(this._pageScope()).conf || {})._head || {}); },
  _eHead() { const c = this._config, H0 = this._eHeadGet(), ui = this._userInfo(); this._eSheet('cfg'); const S = this._eSheetEl; this._eHd = H0;
    const fld = (k, l, ph, lim) => `<label class="hs-fl"><span>${l} <em class="hd-c" data-c="${k}">${(H0[k] || '').length}/${lim}</em></span><span class="hs-s"><input class="hs-in" name="${k}" maxlength="${lim}" value="${H.esc(H0[k] || '')}" placeholder="${H.esc(ph)}" autocomplete="off"></span></label>`;
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="Tytuł widoku"><style>${HG_STY_CSS}
      .hd-c{ font-style:normal; opacity:.55; font-size:11px; margin-left:6px; } .hd-c.ov{ color:#FF6B6B; opacity:1; } .hd-pv{ display:grid; grid-template-columns:1.6fr 1.1fr .8fr; gap:10px; align-items:start; } @media (max-width:560px){ .hd-pv{ grid-template-columns:1fr; } }
      .hd-d{ border-radius:16px; padding:12px; background:var(--hg-tile-bg); min-width:0; } .hd-d small{ display:block; font-size:11px; opacity:.55; margin-bottom:6px; } .hd-d b{ display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; font-weight:600; line-height:1.18; } .hd-d p{ margin:4px 0 0; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; opacity:.85; line-height:1.2; }
      .hd-d.d b{ font-size:20px; } .hd-d.d p{ font-size:17px; } .hd-d.t b{ font-size:17px; } .hd-d.t p{ font-size:14px; } .hd-d.m b{ font-size:15px; } .hd-d.m p{ font-size:12.5px; }
      .hd-v{ display:none; } .hd-v.on{ display:block; } .hd-hint{ font-size:12px; opacity:.6; margin:-4px 0 4px; }</style>
      <div class="hs-h"><b>Tytuł i podtytuł</b><button class="hs-x" data-hge="sheetclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>Podgląd na urządzeniach</small><div class="hd-pv"></div></div>
      ${fld('t', 'Tytuł', c.title, HG_HEAD_LIM.t)}${fld('s', 'Podtytuł', c.subtitle, HG_HEAD_LIM.s)}
      <p class="hd-hint">Wstaw {name}, aby pokazać imię zalogowanej osoby (teraz: ${H.esc(ui.first || 'brak')}).</p>
      <button class="hs-r hs-add" data-hge="hdvar"><span class="hs-i">${H.icon('mdi:cellphone-link')}</span><span class="hs-t"><b>Krótsze wersje dla telefonu i tabletu</b><small>Opcjonalne – puste pola używają wersji głównej</small></span></button>
      <div class="hd-v${H0.tm || H0.sm || H0.tt || H0.st ? ' on' : ''}">${fld('tt', 'Tytuł – tablet', 'jak główny', HG_HEAD_LIM.t)}${fld('st', 'Podtytuł – tablet', 'jak główny', HG_HEAD_LIM.s)}${fld('tm', 'Tytuł – telefon', 'jak główny', 22)}${fld('sm', 'Podtytuł – telefon', 'jak główny', 36)}</div>
      </div><div class="hs-ac"><button class="hs-b2" data-hge="hdreset">Przywróć domyślne</button><button class="hs-b" data-hge="hdok">Zapisz</button></div></div>`;
    for (const i of S.querySelectorAll('input.hs-in')) i.addEventListener('input', () => this._eHeadPv());
    this._eHeadPv(); },
  _eHeadVals() { const S = this._eSheetEl, o = {}; for (const i of S.querySelectorAll('input.hs-in')) { const v = i.value.trim(); if (v) o[i.name] = v; } return o; },
  _eHeadPv() { const S = this._eSheetEl, c = this._config, V = this._eHeadVals(), nm = this._userInfo().first || '';
    for (const i of S.querySelectorAll('input.hs-in')) { const ce = S.querySelector(`.hd-c[data-c="${i.name}"]`); if (ce) { ce.textContent = i.value.length + '/' + i.maxLength; ce.classList.toggle('ov', i.value.length >= i.maxLength); } }
    const r = (s) => H.esc(String(s || '').replace(/\{name\}/g, nm)), one = (cls, l, t, s) => `<div class="hd-d ${cls}"><small>${l}</small><b>${r(t)}</b><p>${r(s)}</p></div>`;
    const T = V.t || c.title, Su = V.s || c.subtitle;
    S.querySelector('.hd-pv').innerHTML = one('d', 'Komputer', T, Su) + one('t', 'Tablet', V.tt || T, V.st || Su) + one('m', 'Telefon', V.tm || T, V.sm || Su); },
  _eHeadAct(a) { const sc = this._pageScope();
    if (a === 'hdvar') { this._eSheetEl.querySelector('.hd-v').classList.toggle('on'); return; }
    const V = a === 'hdreset' ? {} : this._eHeadVals();
    this._eSet(sc, (L) => { if (Object.keys(V).length) L.conf._head = V; else delete L.conf._head; });
    this._eSheet(false);
    this._paintHead(); this._eHeadBtn(); this._eToast(a === 'hdreset' ? 'Przywrócono domyślny tytuł' : 'Zapisano tytuł'); },
  _eGhostSweep() { if (!this._eOn && !this.classList.contains('hge')) {} for (const ct of this._eConts()) for (const it of this._eItems(ct)) { const g = hgIsGhost(it), d = it.querySelector(':scope > .hge');
      if (g) { if (d) d.remove(); it.classList.add('hge-ghost'); } else if (it.classList.contains('hge-ghost')) { it.classList.remove('hge-ghost'); } } },
  /* krok 1: galeria komponentów */
  _eGallery(ct, scOver) {
    const h = this._hass; this._eSheet('cfg'); const S = this._eSheetEl; const sc = scOver || (ct ? (ct.page ? ct.scope + ':tiles' : ct.scope) : (this._pageScope() + ':tiles')); this._eGalSc = sc; this._eGalCt = ct;
    const room = sc.startsWith('room:'), list = HG_COMP.filter(hgCompOk).filter((C) => !room || C.tile);
    const card = (C) => { const req = C.slots.filter((x) => x.req), miss = req.find((sl) => !hgSlotCands(h, sl).length);
      return `<button class="${miss ? 'na' : ''}" data-hge="cgo" data-c="${C.id}" ${miss ? 'aria-disabled="true"' : ''}><div class="th" data-th="${C.id}"><div class="ph">${H.icon(C.i)}</div></div><b>${H.icon(C.i)}${H.esc(C.n)}</b><small>${H.esc(C.d)}${miss ? `<em>Brak encji: ${H.esc(miss.l.toLowerCase())} (${H.esc(miss.dom.join(', '))}${miss.dc ? ' · ' + H.esc(miss.dc.join(', ')) : ''})</em>` : ''}</small></button>`; };
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="Dodaj komponent"><style>${HG_STY_CSS}${HG_COMP_CSS}</style><div class="hs-h"><b>Dodaj komponent</b><button class="hs-x" data-hge="sheetclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="cq"><button class="hs-r" data-hge="cgent" style="min-height:48px">${H.icon('mdi:magnify')}<span class="hs-t"><b>Szukaj encji</b><small>Szybkie dodanie pojedynczej encji jako kafelka</small></span></button></div>
      <div class="cg" role="list">${list.map(card).join('')}</div></div></div>`;
    /* miniatury na żywo: kafel z pierwszą pasującą encją albo pomniejszona karta */
    requestAnimationFrame(() => { for (const C of list) { const th = S.querySelector(`[data-th="${C.id}"]`); if (!th) continue; const v = this._eCompDef(C); if (!v) continue;
      const box = document.createElement('div'); if (C.tile) { box.className = 'tg2 one'; box.innerHTML = hgTileHtml(h, v.e, 's', { t: C.tile }); hgSlots({ _hass: h, $: box }); }
      else { box.className = 'cmf'; const cc = hgCompCard(C, v), el = document.createElement(cc); try { el.setConfig(Object.assign({ type: 'custom:' + cc }, C.cfg(v, h))); el._hgPv = true; } catch (e) { continue; } box.appendChild(el); el.hass = h; }
      th.firstChild.remove(); th.appendChild(box); } });
  },
  /* domyślne wartości slotów (pierwsze pasujące encje, listy: do 4) */
  _eCompDef(C) { const h = this._hass, v = {};
    for (const sl of C.slots) { const cs = hgSlotCands(h, sl); if (!cs.length) { if (sl.req) return null; continue; }
      v[sl.k] = sl.multi ? cs.slice(0, sl.k === 'entities' && C.id === 'power' ? 1 : 4).map((e) => (sl.obj ? { entity: e, name: H.name(h, e), ...(h.states[e].attributes.icon ? { icon: h.states[e].attributes.icon } : {}) } : e)) : cs[0]; }
    return v; },
  /* krok 2: formularz komponentu (dodawanie i edycja – ten sam arkusz) */
  _eComp(cid, st) {
    const h = this._hass, C = HG_COMP.find((x) => x.id === cid); if (!C) return; this._eSheet('cfg'); const S = this._eSheetEl;
    const R = this._eCompR = st || { cid, sc: this._eGalSc, v: this._eCompDef(C) || {}, t: C.tile || '', n: '', i: '', z: HG_COMP_Z[C.id] || 's' };
    const ed = !!R.edit, eid = (x) => (typeof x === 'string' ? x : x && x.entity), ico = (e) => (h.states[e] && h.states[e].attributes.icon) || HG_DOM_ICON2[String(e).split('.')[0]] || 'mdi:circle-outline';
    const slot = (sl) => { const v = R.v[sl.k];
      if (!sl.multi) return `<div class="hs-fl"><span>${H.esc(sl.l)}${sl.req ? '' : ''}</span><div class="hs-r hs-er"><button class="hs-eb" data-hge="cslot" data-k="${sl.k}"><span class="hs-i">${H.icon(v ? ico(v) : 'mdi:plus')}</span><span class="hs-t"><b>${H.esc(v ? H.name(h, v) : 'Wybierz encję')}</b><small>${H.esc(v || sl.dom.join(', '))}</small></span><span class="hs-p" title="Zmień">${H.icon(v ? 'mdi:swap-horizontal' : 'mdi:plus')}</span></button>${v && !sl.req ? `<button class="hs-del" data-hge="cdel" data-k="${sl.k}" aria-label="Usuń">${H.icon('mdi:close')}</button>` : ''}</div></div>`;
      const A = v || [];
      return `<div class="hs-fl hs-ents"><span>${H.esc(sl.l)}</span>${A.map((y, i) => `<div class="hs-r hs-er" data-ak="${sl.k}" data-ai="${i}"><span class="hs-dg" data-hgdrag aria-label="Przeciągnij, aby zmienić kolejność">${H.icon('mdi:drag-vertical')}</span><button class="hs-eb" data-hge="cslot" data-k="${sl.k}" data-i="${i}"><span class="hs-i">${H.icon(ico(eid(y)))}</span><span class="hs-t"><b><em class="hs-ix">${i + 1}</em>${H.esc(H.name(h, eid(y)))}</b><small>${H.esc(eid(y))}</small></span><span class="hs-p">${H.icon('mdi:swap-horizontal')}</span></button><button class="hs-del" data-hge="cdel" data-k="${sl.k}" data-i="${i}" aria-label="Usuń">${H.icon('mdi:close')}</button></div>`).join('')}
        <button class="hs-r hs-add" data-hge="cslot" data-k="${sl.k}" data-i="${A.length}"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>Dodaj encję</b><small>${H.esc(sl.dom.join(', '))}${sl.dc ? ' · ' + H.esc(sl.dc.join(', ')) : ''}</small></span></button></div>`; };
    const main = C.tile ? R.v.e : null, T = main ? hgTypeOpts(h, main).filter(([t]) => t !== C.tile).length ? hgTypeOpts(h, main) : [[C.tile, 'Normalny']] : null;
    const okReq = C.slots.every((sl) => !sl.req || (sl.multi ? (R.v[sl.k] || []).length : R.v[sl.k]));
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${H.esc(C.n)}"><style>${HG_STY_CSS}${HG_COMP_CSS}</style><div class="hs-h"><b>${H.icon(C.i)} ${H.esc(C.n)}</b><button class="hs-x" data-hge="sheetclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>Podgląd na żywo</small><div class="hs-pvb"></div></div>
      ${C.slots.map(slot).join('')}
      ${C.modes ? `<div class="hs-fl"><span>Tryb wyświetlania</span><div class="hs-f wrap" role="group" aria-label="Tryb wyświetlania">${C.modes.map(([m, l, ic]) => `<button data-hge="cmod" data-m="${m}" aria-pressed="${(R.v.mode || C.modes[0][0]) === m}">${H.icon(ic)}${l}</button>`).join('')}</div></div>` : ''}
      ${T && main ? `<div class="hs-fl"><span>Tryb wyświetlania</span>${hgStyleCards(h, main, T, R.t || T[0][0], 'ctyp')}</div>` : ''}
      <label class="hs-fl"><span>Nazwa</span><span class="hs-s"><input class="hs-in" name="n" value="${H.esc(R.n)}" placeholder="${H.esc(main ? H.name(h, main) : C.n)}" autocomplete="off"></span></label>
      <label class="hs-fl"><span>Ikona (np. mdi:sofa)</span><span class="hs-s">${H.icon(R.i || C.i)}<input class="hs-in" name="i" value="${H.esc(R.i)}" placeholder="mdi:…" autocomplete="off"></span></label>
      ${R.sc && R.sc.startsWith('room:') ? '' : `<div class="hs-fl"><span>Rozmiar</span><div class="hs-f wrap" role="group" aria-label="Rozmiar">${[['s', 'S · mały'], ['m', 'M · średni'], ['l', 'L · cała szerokość']].map(([v, l]) => `<button data-hge="cz" data-z="${v}" aria-pressed="${R.z === v}">${l}</button>`).join('')}</div></div>`}
      </div><div class="hs-ac"><button class="hs-b2" data-hge="${ed ? 'sheetclose' : 'cback'}">${ed ? 'Anuluj' : 'Wstecz'}</button><button class="hs-b" data-hge="cok" ${okReq ? '' : 'disabled'}>${H.icon(ed ? 'mdi:check' : 'mdi:plus')}<span>${ed ? 'Zapisz' : 'Dodaj'}</span></button></div></div>`;
    for (const n of S.querySelectorAll('input[name]')) n.addEventListener('input', () => { R[n.name] = n.value.trim(); if (n.name === 'i') { const ic = n.parentElement.querySelector('ha-icon'); if (ic && /^mdi:[a-z0-9-]+$/.test(R.i)) ic.setAttribute('icon', R.i); } this._eCompPv(); });
    requestAnimationFrame(() => this._eCompDrag()); this._eCompPv();
  },
  _eCompPv() { const R = this._eCompR, C = HG_COMP.find((x) => x.id === R.cid), h = this._hass, pv = this._eSheetEl && this._eSheetEl.querySelector('.hs-pvb'); if (!pv || !C) return;
    const n = R.n, i = /^mdi:[a-z0-9-]+$/.test(R.i || '') ? R.i : '';
    if (C.tile) { pv.className = 'hs-pvb tg2'; pv.innerHTML = R.v.e ? hgTileHtml(h, R.v.e, R.z === 's' ? 's' : R.z, { t: R.t || C.tile, n, i }) : '<p class="hs-e">Wybierz encję</p>'; hgSlots({ _hass: h, $: pv }); hgPvLive(pv); return; }
    const ok = C.slots.every((sl) => !sl.req || (sl.multi ? (R.v[sl.k] || []).length : R.v[sl.k])); if (!ok) { pv.className = 'hs-pvb'; pv.innerHTML = '<p class="hs-e">Wybierz encje</p>'; return; }
    pv.className = 'hs-pvb live'; pv.innerHTML = ''; const box = document.createElement('div'); box.className = 'hs-pvf'; box.style.height = '300px'; const cc = hgCompCard(C, R.v), el = document.createElement(cc);
    try { el.setConfig(Object.assign({ type: 'custom:' + cc }, C.cfg(R.v, h), n ? { title: n, name: n } : {}, i ? { icon: i } : {})); } catch (e) { /* pusta */ } el._hgPv = true; box.appendChild(el); pv.appendChild(box); el.hass = h; this._ePvEl = el; hgPvFit(box, el); },
  _eCompDrag() { const S = this._eSheetEl; if (!S) return;
    for (const hd of S.querySelectorAll('[data-hgdrag]')) hd.addEventListener('pointerdown', (ev) => { const row = hd.closest('.hs-er'), key = row.dataset.ak, box = row.parentElement; ev.preventDefault(); ev.stopPropagation(); hd.setPointerCapture(ev.pointerId); row.classList.add('drag');
      const rows = () => [...box.querySelectorAll(`.hs-er[data-ak="${CSS.escape(key)}"]`)];
      const mv = (e) => { const sib = rows().filter((x) => x !== row); let ref = null; for (const x of sib) { const r = x.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { ref = x; break; } }
        const last = sib[sib.length - 1]; if (ref) { if (row.nextElementSibling !== ref) box.insertBefore(row, ref); } else if (last && last.nextElementSibling !== row) box.insertBefore(row, last.nextElementSibling); };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); row.classList.remove('drag');
        const ord = rows().map((x) => +x.dataset.ai), R = this._eCompR, A = R.v[key] || []; if (ord.every((v, i) => v === i)) return; R.v[key] = ord.map((i) => A[i]); this._eComp(R.cid, R); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); }); },
  _eCompAct(a, b) { const R = this._eCompR, h = this._hass;
    if (a === 'cgent') return this._eSheet('add', this._eGalCt, this._eGalSc);
    if (a === 'cgo') { if (b.classList.contains('na')) return; this._eCompR = null; return this._eComp(b.dataset.c); }
    if (a === 'cback') return this._eGallery(this._eGalCt, this._eGalSc);
    if (a === 'ctyp') { R.t = b.dataset.t; for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } return this._eCompPv(); }
    if (a === 'cmod') { R.v = Object.assign({}, R.v, { mode: b.dataset.m }); for (const x of b.parentElement.children) x.setAttribute('aria-pressed', x === b); return this._eCompPv(); }
    if (a === 'cz') { R.z = b.dataset.z; for (const x of b.parentElement.children) x.setAttribute('aria-pressed', x === b); return this._eCompPv(); }
    const C = HG_COMP.find((x) => x.id === R.cid), sl = C && C.slots.find((x) => x.k === b.dataset.k);
    if (a === 'cdel') { if (sl.multi) { R.v[sl.k] = (R.v[sl.k] || []).slice(); R.v[sl.k].splice(+b.dataset.i, 1); } else delete R.v[sl.k]; return this._eComp(R.cid, R); }
    if (a === 'cslot') { const cur = sl.multi ? (R.v[sl.k] || []).map((y) => (typeof y === 'string' ? y : y.entity)) : [];
      const cset = new Set(hgSlotCands(h, sl)); /* raz, nie per encja (O(n²) zamrażało przeglądarkę) */
      this._eRepl = { comp: { k: sl.k, i: b.dataset.i != null ? +b.dataset.i : null }, doms: sl.dom, flt: (e) => cset.has(e), excl: cur.filter((_, i) => i !== +b.dataset.i) };
      return this._eSheet('add', null, this._eGalSc || R.sc); }
    if (a === 'cok') { const sc = R.sc || this._eGalSc, n = R.n, i = /^mdi:[a-z0-9-]+$/.test(R.i || '') ? R.i : '';
      this._eSet(sc, (L) => { let key;
        if (C.tile) { const e = R.v.e; key = e; const x0 = R.edit ? L.added.find((y) => y.e === R.edit) : null, x = { e, ...(R.t && R.t !== C.tile ? { t: R.t } : R.t === C.tile && hgTypesFor(h, e)[0] !== C.tile ? { t: C.tile } : {}), ...(n ? { n } : {}), ...(i ? { i } : {}), comp: C.id };
          if (x0) Object.assign(x0, x); else if (!L.added.some((y) => y.e === e)) L.added.push(x); L.hidden = L.hidden.filter((y) => y !== e); }
        else { key = R.edit || ('c:' + C.id + ':' + Date.now().toString(36)); const x = { e: key, c: hgCompCard(C, R.v), comp: C.id, cfg: C.cfg(R.v, h), v: R.v, ...(n ? { n } : {}), ...(i ? { i } : {}) };
          const j = L.added.findIndex((y) => y.e === key); if (j >= 0) L.added[j] = x; else L.added.push(x); }
        if (R.z && R.z !== 's') L.size[key] = R.z; else delete L.size[key]; });
      this._eSheet(false); this._eToast((R.edit ? 'Zapisano: ' : 'Dodano: ') + (n || C.n)); this._eCompR = null;
      return this._eRefresh(sc.endsWith(':tiles') && !(this._cards || []).some((c) => c.tagName === 'HG-TILES-CARD')); }
  },
  /* powrót z wyboru encji do formularza */
  _eCompPick(nv) { const R = this._eCompR, P = this._eRepl.comp, C = HG_COMP.find((x) => x.id === R.cid), sl = C.slots.find((x) => x.k === P.k), h = this._hass;
    if (sl.multi) { const A = (R.v[sl.k] || []).slice(), it = sl.obj ? { entity: nv, name: H.name(h, nv), ...(h.states[nv] && h.states[nv].attributes.icon ? { icon: h.states[nv].attributes.icon } : {}) } : nv; if (P.i != null && P.i < A.length) A[P.i] = it; else A.push(it); R.v[sl.k] = A; }
    else { R.v[sl.k] = nv; if (sl.k === 'e' && C.tile) R.t = C.tile; }
    this._eRepl = null; this._eComp(R.cid, R); },
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
hgReg('hg-tiles-card', HGTilesCard, 'Home Glass – Moje kafelki', 'Kafelki dodane w trybie edycji');

/* style trybu edycji wstrzykiwane do cieni kart (elementy z data-hgk w kontenerach data-hgl) */
const HGE_CSS = `
.hge-on > .hge-ghost{ display:none !important; }
[data-hgl] > [data-hgk]{ position:relative; }
.hge-on [data-hgl] > [data-hgk], [data-hgl].hge-on > [data-hgk]{ outline:1.5px dashed var(--hg-accent); outline-offset:3px; border-radius:var(--r-md, 18px); animation:hgeW 1.6s ease-in-out infinite; touch-action:pan-y; user-select:none; -webkit-user-select:none; }
[data-hgl] > [data-hgk]:nth-child(2n){ animation-delay:-.8s; }
@keyframes hgeW{ 0%,100%{ rotate:-.35deg } 50%{ rotate:.35deg } }
@media (prefers-reduced-motion: reduce){ [data-hgl] > [data-hgk]{ animation:none !important; } }
:host([lite]) [data-hgl] > [data-hgk], .hge-lite [data-hgl] > [data-hgk]{ animation:none !important; }
[data-hgk].hge-drag{ animation:none !important; z-index:20; box-shadow:0 18px 48px rgba(0,0,0,.35) !important; outline-style:solid !important; cursor:grabbing; }
.hge{ position:absolute; inset:0; z-index:15; pointer-events:none; border-radius:inherit; }
.hge *{ pointer-events:auto !important; }
.hge button{ position:absolute; display:flex; align-items:center; justify-content:center; border:0; cursor:pointer; font:600 12px/1 inherit; color:var(--hg-on-accent); background:var(--hg-accent); box-shadow:0 4px 14px rgba(0,0,0,.28); -webkit-tap-highlight-color:transparent; }
.hge .hx{ top:-10px; right:-10px; width:30px; height:30px; border-radius:50%; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); }
.hge .hh{ top:-10px; left:-10px; width:30px; height:30px; border-radius:50%; cursor:grab; touch-action:none; }
.hge .hs{ position:absolute; bottom:8px; right:8px; height:28px; padding:0 3px; border-radius:999px; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); gap:2px; display:flex; align-items:center; box-shadow:0 4px 14px rgba(0,0,0,.28); }
.hge .hs i{ font-style:normal; cursor:pointer; width:24px; height:22px; border-radius:999px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; pointer-events:auto; }
.hge .hs i.on{ background:var(--hg-accent); color:var(--hg-on-accent); }
.hge ha-icon{ width:18px; height:18px; --mdc-icon-size:18px; pointer-events:none; }
.hge-on > .hgtl:not(.k-clim):not(.k-cam){ padding-bottom:42px; }
.hge-cf{ position:absolute; top:26px; right:6px; z-index:3; display:flex; align-items:center; gap:6px; padding:6px 6px 6px 12px; border-radius:999px; background:var(--hg-thumb, #fff); color:var(--hg-on-accent); font:500 13px/1.2 inherit; box-shadow:0 8px 24px rgba(0,0,0,.3); max-width:calc(100% - 12px); }
.hge-cf span{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hge .hge-cf button{ position:static; height:30px; padding:0 12px; border-radius:999px; box-shadow:none; flex:none; }
.hge .hge-cf button[data-hge=cfno]{ background:rgba(0,0,0,.08); }
/* kontener dodanych kafli to nie slot: bez własnej ramki (ramki mają kafle w środku) */
.hge-on > [data-hgk="_tiles"], [data-hgl].hge-on > [data-hgk="_tiles"]{ outline:none !important; animation:none !important; }
.hge-add{ display:flex; align-items:center; justify-content:center; gap:8px; min-height:76px; border-radius:var(--r-md, 18px); border:1.5px dashed var(--hg-accent); background:var(--hg-accent-faint, rgba(160,230,60,.08)); color:inherit; font:500 15px/1 inherit; cursor:pointer; break-inside:avoid; margin:0 0 11px; width:100%; }
.hge-add ha-icon{ width:22px; height:22px; color:var(--hg-accent-tx); }
`;

/* ===== silnik edycji (metody hg-page) ===== */

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
.lk-bgs button{ all:unset; cursor:pointer; display:flex; flex-direction:column; gap:6px; font-size:12px; min-width:0; }
.lk-bgs span{ position:relative; display:block; aspect-ratio:16/10; border-radius:14px; overflow:hidden; box-shadow:0 0 0 1px color-mix(in srgb, currentColor 10%, transparent); transition:box-shadow .15s; }
.lk-bgs img{ width:100%; height:100%; object-fit:cover; display:block; }
.lk-bgs span ha-icon{ position:absolute; top:6px; right:6px; width:16px; height:16px; padding:3px; border-radius:50%; background:var(--hg-accent); color:var(--hg-on-accent); opacity:0; transform:scale(.6); transition:.15s; }
.lk-bgs [aria-pressed=true] span{ box-shadow:0 0 0 2px var(--hg-glass-bg, #1E242C), 0 0 0 4px var(--hg-accent, #63D71E); } .lk-bgs [aria-pressed=true] span ha-icon{ opacity:1; transform:none; }
.lk-bgs small{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:.8; } .lk-bgs button:focus-visible span{ outline:2px solid var(--hg-accent); outline-offset:2px; }
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
const HG_GRP_LBL = { players: 'Multimedia', cameras: 'Kamery', scenes: 'Sceny', people: 'Domownicy', persons: 'Domownicy', lights: 'Światła', robots: 'Roboty', power: 'Moc', covers: 'Rolety' };
const HG_GRP_TYPES = [['card', 'Karta'], ['g-list', 'Lista'], ['g-grid', 'Siatka'], ['g-car', 'Karuzela'], ['g-clist', 'Kompaktowa lista']];
function hgStyleCards(h, e, opts, cur, act, room) {
  return `<div class="hs-sty" role="radiogroup" aria-label="Styl">${opts.map(([t, l]) => { const sel = cur === t;
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
.hs-ac > .hs-b{ background:var(--hg-accent); color:var(--hg-on-accent); padding:0 24px; }
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
  _keys(cards) { const seen = {}; return cards.map((cc) => { const b = `${String(cc.type || '').replace('custom:', '')}|${cc.entity || (cc.entities && cc.entities[0]) || cc.title || cc.area || ''}`; seen[b] = (seen[b] || 0) + 1; return seen[b] > 1 ? `${b}#${seen[b]}` : b; }); },
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
    if (tl.added.length) out.push({ type: 'custom:hg-tiles-card', scope: sc + ':tiles', _k: '_tiles', span: 'full', min_h: 40, _tiles: true });
    return out;
  },
  _isAdmin() { return !!(this._hass && this._hass.user && this._hass.user.is_admin); },
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
    if (this._editing || !this._isAdmin()) return;
    this._editing = true; this._eSnap = JSON.stringify(HGL.data);
    this._menuOpen = false; this._paintTop(true);
    this.setAttribute('editing', '');
    for (const sc of Object.keys(HGL.data.s || {})) { const L = HGL.get(sc); if (hgCleanL(L)) HGL.set(sc, L); }
    this._eWire(); this._eDecorate(); this._eGhostSweep(); this._eHeadBtn(); this._eBar();
    clearInterval(this._eGh); this._eGh = setInterval(() => { if (!this._editing) return clearInterval(this._eGh); if (this._drag && this._drag.on) return; this._eGhostSweep(); this._eDecorate(); }, 700);
  },
  _editExit(save) {
    if (!this._editing) return;
    this._editing = false; this.removeAttribute('editing'); clearInterval(this._eGh); for (const ct of this._eConts()) for (const g of ct.el.querySelectorAll(':scope > .hge-ghost')) g.classList.remove('hge-ghost');
    if (!save) { HGL.data = JSON.parse(this._eSnap); HGL._ls(); }
    const fin = () => { HG_FREEZE.on = false; HG_FREEZE.release(); this._eUnwire(); if (this._eBarEl) { this._eBarEl.remove(); this._eBarEl = null; } this._eSheet(false);
      HGL.notify(); if (this.isConnected) this._build(); };
    if (save) HGL.save(this._hass).then((w) => { this._eToast(w === 'ha' ? 'Zapisano układ (synchronizacja przez Home Assistant)' : 'Zapisano układ na tym urządzeniu'); fin(); }); else fin();
  },
  /* toaster w stylu Sonner: jeden kontener na dole (safe-area), najnowszy na wierzchu, starsze schowane za nim (max 3),
     rozwija się po najechaniu / dotknięciu, przesunięcie lub dotyk zamyka, auto-zamknięcie pauzowane, identyczne komunikaty łączone (×n) */
  _eToast(t, undo) { HGToast.off = this._editing ? 84 : 20; HGToast.show(t, undo); },
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
        d.innerHTML = `<button class="hh" data-hge="drag" aria-label="Przeciągnij, aby zmienić kolejność" title="Przeciągnij">${H.icon('mdi:drag')}</button>`
          + `<button class="hx" data-hge="hide" aria-label="Ukryj kafelek" title="Ukryj">${H.icon('mdi:close')}</button>`
          + (canSz ? `<span class="hs" role="group" aria-label="Rozmiar">${['s', 'm', 'l'].map((x) => `<i role="button" tabindex="0" class="${z === x ? 'on' : ''}" data-hge="size" data-z="${x}" aria-pressed="${z === x}" aria-label="Rozmiar ${x.toUpperCase()}">${x.toUpperCase()}</i>`).join('')}</span>` : '');
        d._ct = ct; d._it = it; it.appendChild(d);
      }
      if (!ct.el.querySelector(':scope > .hge-addw') && (ct.page || /^(rooms|room:)/.test(ct.scope) || ct.scope.endsWith(':tiles'))) {
        if (ct.scope.endsWith(':tiles')) continue;               // „+ Dodaj” jest na poziomie widoku
        const w = document.createElement(ct.page ? 'div' : 'div'); w.className = 'hge-addw' + (ct.page ? ' cw' : '');
        if (ct.page) { w.style.gridColumn = '1 / -1'; w.style.gridArea = 'auto'; }
        if (!ct.page && ct.el.classList.contains('grid')) w.style.gridColumn = '1 / -1';
        w.innerHTML = `<button class="hge-add" data-hge="add">${H.icon('mdi:plus')}<span>Dodaj</span></button>`;
        w.firstChild._ct = ct; ct.el.appendChild(w);
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
    let b = this._eBarEl; if (b && !b.isConnected) this.shadowRoot.appendChild(b); if (!b) { b = this._eBarEl = document.createElement('div'); b.className = 'hge-bar'; b.setAttribute('role', 'toolbar'); b.setAttribute('aria-label', 'Edycja układu'); this.shadowRoot.appendChild(b); }
    const nh = this._eHidden().length;
    b.innerHTML = `<span class="hgt">${H.icon('mdi:pencil')}<b>Edycja układu</b></span>
      <button data-hge="hidden" ${nh ? '' : 'disabled'}>${H.icon('mdi:eye-outline')}<span>Przywróć ukryte${nh ? ` · ${nh}` : ''}</span></button>
      <button data-hge="look">${H.icon('mdi:palette-outline')}<span>Wygląd</span></button>
      <button data-hge="reset">${H.icon('mdi:restore')}<span>Przywróć domyślny układ</span></button>
      <button data-hge="cancel">Anuluj</button><button class="ok" data-hge="done">${H.icon('mdi:check')}<span>Gotowe</span></button>`;
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
      else n = k.replace(/^sec:/, 'Sekcja: ');
      out.push({ sc, k, n });
    }
    return out;
  },
  _eSet(sc, f) { const L = HGL.get(sc); f(L); HGL.set(sc, L); },
  _eWire() {
    const onDown = (e) => this._eDown(e), onClick = (e) => this._eClick(e), onTm = (e) => { if (this._drag && this._drag.on) e.preventDefault(); }, onKey = (e) => { if (e.key === 'Escape') { if (this._eSheetOpen) this._eSheet(false); else this._editExit(false); } };
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
    const a = b.dataset.hge;
    if (a === 'done') return this._editExit(true);
    if (a === 'cancel') return this._editExit(false);
    if (a === 'reset') { const ps = this._pageScope(); const sc = new Set(this._eConts().map((c) => c.scope)); if (ps) { sc.add(ps); sc.add(ps + ':tiles'); }
      for (const s of sc) HGL.set(s, {}); this._eToast('Przywrócono domyślny układ widoku (zapisz „Gotowe”)'); return this._eRefresh(true); }
    if (a === 'hidden') return this._eSheet('hidden');
    if (a === 'look') return this._eLook();
    if (a === 'headedit') return this._eHead();
    if (a === 'hdok' || a === 'hdreset' || a === 'hdvar') return this._eHeadAct(a, b);
    if (a.startsWith('lx-') && window.HGLookX) return HGLookX.act(this, b, a);
    if (a === 'acc') { this._eApp((A) => { A.accent = b.dataset.c; }); return this._eLook(); }
    if (a === 'bgp') { this._eApp((A) => { A.bg = b.dataset.v ? { kind: 'image', v: b.dataset.v, v2p: b.dataset.p || '' } : null; }); return this._eLook(); }
    if (a === 'bgurl') { const v = this._eSheetEl.querySelector('[name=bgurl]').value.trim(); if (!/^(\/|https:\/\/)/.test(v)) return this._eToast('Podaj adres https:// lub /local/…'); this._eApp((A) => { A.bg = { kind: 'url', v }; }); return this._eLook(); }
    if (a === 'bgcol') { const S = this._eSheetEl, c1 = S.querySelector('[name=bgc1]').value, c2 = S.querySelector('[name=bgc2]').value; this._eApp((A) => { A.bg = b.dataset.k === 'gradient' ? { kind: 'gradient', v: c1, v2: c2 } : { kind: 'color', v: c1 }; }); return this._eLook(); }
    if (a === 'bgup') return this._eSheetEl.querySelector('input[type=file]').click();
    if (a === 'lookreset') { HGL.data.app = {}; HGApp.apply(); this._eToast('Przywrócono domyślny wygląd'); return this._eLook(); }
    if (a === 'add') { const ct0 = b._ct || (b.closest('.hge-addw') && b.closest('.hge-addw').firstChild._ct); return ct0 && ct0.scope === 'rooms' ? this._eSheet('add', ct0) : this._eGallery(ct0); }
    if (/^c(go|gent|back|typ|mod|z|del|slot|ok)$/.test(a)) return this._eCompAct(a, b);
    if (a === 'restore') { this._eSet(b.dataset.sc, (L) => { L.hidden = L.hidden.filter((x) => x !== b.dataset.k); }); this._eSheet(false); return this._eRefresh(b.dataset.sc === this._pageScope()); }
    if (a === 'sheetclose') return this._eSheet(false);
    if (a === 'pick' && b.dataset.sc !== 'rooms' && !b.dataset.t) return this._eAddStep(b.dataset.sc, b.dataset.e, b.dataset.n);
    if (a === 'addt') { for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } const pv = this._eSheetEl.querySelector('.hs-pvb'); pv.innerHTML = hgTileHtml(this._hass, this._eAddE, 's', { t: b.dataset.t }); hgSlots({ _hass: this._hass, $: pv }); hgPvLive(pv); return; }
    if (a === 'addok') { const t = (this._eSheetEl.querySelector('[data-hge=addt][aria-pressed=true]') || { dataset: {} }).dataset.t, T0 = hgTypesFor(this._hass, this._eAddE)[0];
      const fake = { dataset: { hge: 'pick', sc: this._eAddSc, e: this._eAddE, n: this._eAddN || '', t: t && t !== T0 ? t : 'def' } }; return this._eCtl(fake, e); }
    if (a === 'addback') return this._eSheet('add', null, this._eSc);
    if (a === 'pick') { const sc = b.dataset.sc; const tt = b.dataset.t && b.dataset.t !== 'def' ? b.dataset.t : ''; this._eSet(sc, (L) => { L.hidden = L.hidden.filter((x) => x !== b.dataset.e); if (!L.added.some((x) => x.e === b.dataset.e)) L.added.push(tt ? { e: b.dataset.e, t: tt } : { e: b.dataset.e }); });
      this._eSheet(false); this._eToast('Dodano: ' + (b.dataset.n || b.dataset.e)); return this._eRefresh(sc.endsWith(':tiles') && !(this._cards || []).some((c) => c.tagName === 'HG-TILES-CARD')); }
    if (a === 'repl' && this._eRepl && this._eRepl.comp) return this._eCompPick(b.dataset.e);
    if (a === 'repl') { const R = this._eRepl; this._eRepl = null; const nv = b.dataset.e; this._eCfgSet(R, nv); this._eSheet(false); this._eToast(R.add ? 'Dodano encję' : 'Zmieniono encję');
      const k2 = R.S.kind === 'added' ? nv : R.k, pg = R.sc === this._pageScope(); const re = () => { const ct = this._eConts().find((c) => c.scope === R.sc); if (ct) setTimeout(() => this._eCfg(ct, k2), 120); };
      const pr = this._eRefresh(pg); if (pr && pr.then) pr.then(re); else requestAnimationFrame(re); return; }
    if (a === 'cfgsave') return this._eCfgSave();
    if (a === 'cfgz' || a === 'cfgt') { for (const x of b.parentElement.children) { x.setAttribute('aria-pressed', x === b); x.setAttribute('aria-checked', x === b); } if (a === 'cfgt') this._eCfgPv(); return; }
    if (a === 'cfgadd') { const n = ((this._eCfgArrGet(this._eCfgR, b.dataset.k)) || []).length; this._eRepl = Object.assign({}, this._eCfgR, { path: b.dataset.k + '.' + n, old: '', add: true, doms: b.dataset.d ? b.dataset.d.split(',') : null, excl: (this._eCfgArrGet(this._eCfgR, b.dataset.k) || []).map((y) => (typeof y === 'string' ? y : y && y.entity)) }); return this._eSheet('add', null, this._eCfgR.sc); }
    if (a === 'cfgdel') { const i = +b.dataset.i; return this._eCfgArr(this._eCfgR, b.dataset.k, (A) => { A.splice(i, 1); }, 'Usunięto encję'); }
    if (a === 'cfgent') { this._eRepl = Object.assign({}, this._eCfgR, { path: b.dataset.p, old: b.dataset.v }); return this._eSheet('add', null, this._eCfgR.sc); }
    if (a === 'filter') { this._eF = b.dataset.f; return this._eSheetList(); }
    const d = b._d || b.closest('.hge'); if (!d) return;
    const ct = d._ct, it = d._it, k = it.dataset.hgk;
    if (a === 'hide' && !b.dataset.ok) {
      const nm = (it.querySelector('.sh, .nm, .tn b, .hd b, b') || {}).textContent || 'ten element';
      const q = document.createElement('div'); q.className = 'hge-cf'; q.innerHTML = `<span>Usunąć „${H.esc(nm.trim().slice(0, 40))}”?</span><button data-hge="hide" data-ok="1">Usuń</button><button data-hge="cfno">Nie</button>`;
      d.appendChild(q); for (const x of q.querySelectorAll('button')) x._d = d; return;
    }
    if (a === 'cfno') { const q = b.closest('.hge-cf'); if (q) q.remove(); return; }
    if (a === 'hide') {
      const prev = JSON.stringify(HGL.data.s[ct.scope] || null);
      const added = HGL.get(ct.scope).added.some((x) => x.e === k);
      this._eSet(ct.scope, (L) => { if (added) L.added = L.added.filter((x) => x.e !== k); else if (!L.hidden.includes(k)) L.hidden.push(k); });
      const rest = this._eItems(ct).filter((x) => x !== it); const fr = rest.map((x) => x.getBoundingClientRect());
      it.style.display = 'none'; if (ct.page) it.hidden = true;
      this._eFlipFrom(rest, fr); this._eBar();
      this._eToast(added ? 'Usunięto kafelek' : 'Usunięto – przywrócisz w „Przywróć ukryte”', () => { const v = JSON.parse(prev); if (v) HGL.data.s[ct.scope] = v; else delete HGL.data.s[ct.scope]; this._eRefresh(ct.page); });
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
    if (e.button > 0) return;
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
      const all = this._lkeys; const ord = base.map((a, i) => byArea.get(a) || all[i]);
      this._eSet(ct.scope, (L) => { L.order = ord; });
    } else this._eSet(ct.scope, (L) => { L.order = items.map((w) => w.dataset.hgk); });
  },
  /* arkusz: „Dodaj” (wyszukiwarka encji / pokoi) albo „Przywróć ukryte” */
  /* ===== jeden arkusz ustawień dla każdego kafelka / karty / pokoju / sekcji ===== */
  _eSubj(ct, k) {
    const h = this._hass, sc = ct.scope, L = HGL.get(sc), cf = L.conf[k] || {}, x = L.added.find((y) => y.e === k);
    const ok = (v) => typeof v === 'string' && !!h.states[v];
    const LBL = { entity: 'Główna encja', temperature: 'Temperatura', temp: 'Temperatura', humidity: 'Wilgotność', hum: 'Wilgotność', power: 'Moc', energy: 'Energia', climate: 'Klimatyzacja', camera: 'Kamera', person: 'Osoba', entities: 'Encja', cameras: 'Kamera', camera_entity: 'Kamera', persons: 'Osoba', media_players: 'Odtwarzacz', lights: 'Światło', sensors: 'Czujnik' };
    if (x) return { kind: 'added', x, ents: [{ p: 'e', l: 'Encja', v: x.e }], types: hgTypeOpts(h, x.e), t: x.t || hgTypesFor(h, x.e)[0], n: x.n || '', i: x.i || '', dn: H.name(h, x.e), main: x.e };
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
      return { kind: 'card', cc, grp, ents: ents.slice(0, 40), types: grp ? HG_GRP_TYPES : [['card', 'Normalny'], ...(main ? hgTypesFor(h, main).map((t) => [t, HG_TYPES[t]]) : [])], t: (grp && cf.t && !cf.t.startsWith('g-')) ? 'card' : (cf.t || 'card'), n: cf.n || '', i: cf.i || '', dn: cc.title || cc.name || HG_GRP_LBL[k.split('|')[0].replace(/^(hg|nuvio)-|-card$/g, '')] || k.split('|')[0].replace(/^hg-|-card$/g, ''), main }; }
    if (sc === 'rooms') { const ac = (this._cards || []).map((c) => c._config && c._config.areas).find(Boolean) || {}, a = HGAreas.model(h, ac).byId[k] || {};
      return { kind: 'room', a, ents: [{ p: 'temp', l: 'Temperatura', v: cf.temp || (a.temp && a.temp.e) || '' }, { p: 'hum', l: 'Wilgotność', v: cf.hum || (a.hum && a.hum.e) || '' }],
        types: [['', 'Normalny'], ['compact', 'Kompaktowy'], ['minimal', 'Minimalny']], t: cf.t || '', n: cf.n || '', i: cf.i || '', dn: a.name || k }; }
    const it = ct.el.querySelector(`:scope > [data-hgk="${CSS.escape(k)}"]`), sw = (L.conf._swap) || {}, seen = new Set(), ents = [];
    if (it) for (const el of it.querySelectorAll('[data-e],[data-ac],[data-cam]')) { const v = el.dataset.e || el.dataset.ac || el.dataset.cam; if (ok(v) && !seen.has(v)) { seen.add(v); ents.push({ p: 'swap', l: ents.length ? 'Encja' : 'Główna encja', v }); } }
    const hd = it && it.querySelector('.sh');
    return { kind: 'sec', ents: ents.slice(0, 12), types: [['', 'Normalny'], ['compact', 'Kompaktowy'], ['minimal', 'Minimalny']], t: cf.t || '', n: L.names[k] || '', i: cf.i || '', dn: hd ? hd.textContent.replace(/\d+.*$/, '').trim() : k, it };
  },
  _eCfg(ct, k) {
    { const L0 = HGL.get(ct.scope); if (hgDedupConf(JSON.parse(JSON.stringify(L0)))) this._eSet(ct.scope, (L) => { hgDedupConf(L); }); }
    { const x0 = HGL.get(ct.scope).added.find((y) => y.e === k); if (x0 && x0.comp && HG_COMP.some((C) => C.id === x0.comp)) { const C = HG_COMP.find((c) => c.id === x0.comp);
      this._eGalSc = ct.scope; this._eGalCt = ct; return this._eComp(C.id, { cid: C.id, sc: ct.scope, edit: k, v: x0.v ? JSON.parse(JSON.stringify(x0.v)) : { e: x0.e }, t: x0.t || C.tile || '', n: x0.n || '', i: x0.i || '', z: HGL.get(ct.scope).size[k] || 's' }); } }
    const h = this._hass, sc = ct.scope, L = HGL.get(sc), z = L.size[k] || 's', canSz = ct.page ? !this._config.panel.areas : ct.sz;
    const S0 = this._eSubj(ct, k); this._eCfgR = { sc, k, ct, S: S0 }; this._eSheet('cfg');
    const S = this._eSheetEl, ttl = { added: 'Ustawienia kafelka', card: 'Ustawienia karty', room: 'Ustawienia pokoju', sec: 'Ustawienia sekcji' }[S0.kind]; requestAnimationFrame(() => this._eEntDrag());
    const ico = (v) => (h.states[v] && h.states[v].attributes.icon) || HG_DOM_ICON2[String(v).split('.')[0]] || 'mdi:circle-outline';
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="${ttl}"><style>${HG_STY_CSS}</style><div class="hs-h"><b>${ttl}</b><button class="hs-x" data-hge="sheetclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div>
      <div class="hs-sc">
      <div class="hs-pv"><small>Podgląd na żywo</small><div class="hs-pvb"></div></div>
      ${S0.ents.length ? `<div class="hs-fl hs-ents"><span>Encje</span>${S0.ents.map((x) => x.add ? `<button class="hs-r hs-add" data-hge="cfgadd" data-k="${H.esc(x.add)}" data-d="${H.esc(x.doms.join(','))}"><span class="hs-i">${H.icon('mdi:plus')}</span><span class="hs-t"><b>Dodaj encję</b><small>${H.esc(x.doms.join(', '))}</small></span></button>`
        : `<div class="hs-r hs-er" ${x.ak ? `data-ak="${H.esc(x.ak)}" data-ai="${x.ai}"` : ''}>${x.ak ? `<span class="hs-dg" data-hgdrag aria-label="Przeciągnij, aby zmienić kolejność" title="Przeciągnij">${H.icon('mdi:drag-vertical')}</span>` : ''}<button class="hs-eb" data-hge="cfgent" data-p="${H.esc(x.p)}" data-v="${H.esc(x.v)}"><span class="hs-i">${H.icon(x.v ? ico(x.v) : 'mdi:plus')}</span><span class="hs-t"><b>${x.ak ? `<em class="hs-ix">${x.ai + 1}</em>` : ''}${H.esc(x.v ? H.name(h, x.v) : 'Wybierz encję')}</b><small>${H.esc(x.ak ? (x.v || '—') : x.l + ' · ' + (x.v || '—'))}</small></span><span class="hs-p" title="Zmień">${H.icon('mdi:swap-horizontal')}</span></button>${x.ak ? `<button class="hs-del" data-hge="cfgdel" data-k="${H.esc(x.ak)}" data-i="${x.ai}" aria-label="Usuń" title="Usuń">${H.icon('mdi:close')}</button>` : ''}</div>`).join('')}</div>` : ''}
      <div class="hs-fl"><span>Tryb wyświetlania</span>${hgStyleCards(h, S0.main || (S0.kind === 'added' ? k : ''), S0.types, S0.t, 'cfgt', S0.kind === 'room' || S0.kind === 'sec')}</div>
      <label class="hs-fl"><span>Nazwa</span><span class="hs-s"><input class="hs-in" name="n" value="${H.esc(S0.n)}" placeholder="${H.esc(S0.dn)}" autocomplete="off"></span></label>
      <label class="hs-fl"><span>Ikona (np. mdi:sofa)</span><span class="hs-s">${H.icon(S0.i || 'mdi:shape-outline')}<input class="hs-in" name="i" value="${H.esc(S0.i)}" placeholder="mdi:…" autocomplete="off"></span></label>
      ${canSz ? `<div class="hs-fl"><span>Rozmiar</span><div class="hs-f wrap" role="group" aria-label="Rozmiar">${[['s', 'S · mały'], ['m', 'M · średni'], ['l', 'L · cała szerokość']].map(([v, l]) => `<button data-hge="cfgz" data-z="${v}" aria-pressed="${z === v}">${l}</button>`).join('')}</div></div>` : ''}
      </div>
      <div class="hs-ac"><button class="hs-b2" data-hge="sheetclose">Anuluj</button><button class="hs-b" data-hge="cfgsave">Zapisz</button></div></div>`;
    for (const n of S.querySelectorAll('input[name]')) n.addEventListener('input', () => { if (n.name === 'i') { const ic = n.parentElement.querySelector('ha-icon'); if (ic && /^mdi:[a-z0-9-]+$/.test(n.value.trim())) ic.setAttribute('icon', n.value.trim()); } this._eCfgPv(); });
    this._eCfgPv();
  },
  _eCfgVals() { const S = this._eSheetEl, g = (q) => S.querySelector(q);
    return { n: g('[name=n]').value.trim(), i: /^mdi:[a-z0-9-]+$/.test(g('[name=i]').value.trim()) ? g('[name=i]').value.trim() : '', t: (g('[data-hge=cfgt][aria-pressed=true]') || { dataset: { t: '' } }).dataset.t, z: (g('[data-hge=cfgz][aria-pressed=true]') || { dataset: {} }).dataset.z }; },
  /* podgląd: kafel (typy kafli) albo kopia bieżącego elementu z klasą trybu, nazwą i ikoną */
  _eCfgPv() {
    const R = this._eCfgR, S0 = R.S, h = this._hass, pv = this._eSheetEl && this._eSheetEl.querySelector('.hs-pvb'); if (!pv) return;
    const V = this._eCfgVals();
    if (S0.kind === 'card' && V.t && V.t.startsWith('g-')) { const es = S0.ents.filter((x) => x.ak).map((x) => x.v), tt = V.t === 'g-list' ? 'compact' : V.t === 'g-clist' ? 'minimal' : '';
      pv.className = 'hs-pvb'; pv.innerHTML = `<div class="hgg ${V.t}"><div class="hgg-h"><b>${H.esc(V.n || S0.dn)}</b><small>${es.length}</small></div><div class="hgg-b">${es.slice(0, 8).map((e) => `<div class="tg2 one">${hgTileHtml(h, e, 's', tt && hgTypesFor(h, e).includes(tt) ? { t: tt } : {})}</div>`).join('')}</div></div>`; hgSlots({ _hass: h, $: pv }); return; }
    if (S0.kind === 'added' || (S0.kind === 'card' && V.t && V.t !== 'card')) { pv.className = 'hs-pvb tg2'; pv.innerHTML = hgTileHtml(h, S0.main, 's', { t: V.t, n: V.n, i: V.i }); hgSlots({ _hass: h, $: pv }); hgPvLive(pv); return; }
    const it = R.ct.el.querySelector(`:scope > [data-hgk="${CSS.escape(R.k)}"]`); if (!it) { pv.innerHTML = ''; return; }
    if (S0.kind === 'card') { const src = [...it.querySelectorAll('*')].find((x) => x.tagName.includes('-') && x.setConfig); if (src) {
      const cf = (HGL.get(R.sc).conf[R.k] || {}), cfg = Object.assign({}, S0.cc, cf.set || {}); if (V.n) { cfg.title = V.n; cfg.name = V.n; } if (V.i) cfg.icon = V.i;
      const el = document.createElement(src.tagName.toLowerCase()); el._hgPv = true; try { el.setConfig(cfg); } catch (e) { /* zła konfiguracja – pokaż pusty */ }
      const hh = Math.min(360, Math.max(120, it.getBoundingClientRect().height || 220));
      pv.className = 'hs-pvb live'; pv.innerHTML = ''; const box = document.createElement('div'); box.className = 'hs-pvf'; box.style.cssText = `height:${hh}px;`; box.appendChild(el); pv.appendChild(box); el.hass = h; this._ePvEl = el; hgPvLive(pv); hgPvFit(box, el); return; } }
    const cl = it.cloneNode(true); for (const x of cl.querySelectorAll('.hge, .hge-cf')) x.remove();
    cl.classList.remove('hgm-compact', 'hgm-minimal'); if (V.t) cl.classList.add('hgm-' + V.t); cl.style.cssText = 'animation:none;outline:none;width:100%;transform:none;';
    const nmEl = cl.querySelector('.nm, .sh'); if (nmEl && V.n) { const ic0 = nmEl.querySelector('ha-icon'); nmEl.textContent = V.n; if (ic0) nmEl.prepend(ic0); }
    const icEl = cl.querySelector('.ic ha-icon, .sh ha-icon'); if (icEl && V.i) icEl.setAttribute('icon', V.i);
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
        this._eCfgArr(this._eCfgR, key, (A) => { const src = A.slice(); A.length = 0; for (const i of ord) A.push(src[i]); for (let i = 0; i < src.length; i++) if (!ord.includes(i)) A.push(src[i]); }, 'Zmieniono kolejność'); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); });
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
      if (V.z) { if (V.z === 's') delete L.size[R.k]; else L.size[R.k] = V.z; }
    });
    this._eSheet(false); this._eToast('Zapisano ustawienia'); return this._eRefresh(R.sc === this._pageScope());
  },
  /* krok 2 dodawania: styl widżetu z podglądem na żywo */
  _eAddStep(sc, e, n) {
    const h = this._hass, S = this._eSheetEl, T = hgTypeOpts(h, e); this._eAddE = e;
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide" role="dialog" aria-modal="true" aria-label="Styl widżetu"><style>${HG_STY_CSS}</style><div class="hs-h"><b>Styl widżetu</b><button class="hs-x" data-hge="sheetclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div><div class="hs-sc">
      <div class="hs-pv"><small>Podgląd na żywo · ${H.esc(n || H.name(h, e))}</small><div class="hs-pvb tg2">${hgTileHtml(h, e, 's', { t: T[0][0] })}</div></div>
      <div class="hs-fl"><span>Styl</span>${hgStyleCards(h, e, T, T[0][0], 'addt')}</div></div>
      <div class="hs-ac"><button class="hs-b2" data-hge="addback">Wstecz</button><button class="hs-b" data-hge="addok">${H.icon('mdi:plus')}<span>Dodaj</span></button></div></div>`;
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
    S.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet wide lk" role="dialog" aria-modal="true" aria-label="Wygląd"><style>${HG_LOOK_CSS}</style><div class="hs-h"><b>Wygląd</b><button class="hs-x" data-hge="sheetclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div><div class="hs-sc lk-sc">
      <section class="lk-g"><h4>${H.icon('mdi:palette-outline')}Akcent</h4>
        <div class="lk-sw">${HG_ACCENTS.map(([c, l]) => `<button data-hge="acc" data-c="${c}" aria-pressed="${acc === c.toUpperCase()}" aria-label="${l}"><i style="--c:${c}">${ck}</i><small>${l}</small></button>`).join('')}
        <label class="lk-cc" aria-pressed="${isC}"><i style="--c:${isC ? acc : 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)'}">${isC ? ck : H.icon('mdi:eyedropper-variant')}</i><input type="color" name="acc" value="${acc}" aria-label="Własny kolor akcentu"><small>Własny</small></label></div>
        <div class="lk-pv" aria-label="Podgląd"><div class="lk-pc"><span class="lk-pi" style="background:${acc};color:${T.light['--hg-on-accent']}">${H.icon('mdi:lightbulb-on')}</span><span class="lk-pt"><b>Lampa</b><small style="color:var(--hg-accent-tx)">Włączone · 80%</small></span></div><span class="lk-pb" style="background:${acc};color:${T.light['--hg-on-accent']}">${ck} Aktywny</span></div></section>
      <section class="lk-g"><h4>${H.icon('mdi:image-outline')}Tło</h4>
        <div class="lk-bgs">${HG_BGS.map(([u, l, pu, th], i) => { const on = i ? !!bg && bg.kind !== 'color' && bg.kind !== 'gradient' && bg.v === u : !bg;
          const src = th || u || (HG_DEFAULT_BG.kind === 'image' ? HG_DEFAULT_BG.v : '');
          return `<button data-hge="bgp" data-v="${i ? H.esc(u) : ''}" data-p="${H.esc(pu || '')}" aria-pressed="${on}" title="${H.esc(l)}"><span style="background:linear-gradient(160deg, ${HG_DEFAULT_BG_FB.v}, ${HG_DEFAULT_BG_FB.v2})">${src ? `<img alt="" loading="lazy" decoding="async" src="${H.esc(src)}" onerror="this.remove()">` : ''}${ck}</span><small>${H.esc(i ? l : (l || 'Domyślne'))}</small></button>`; }).join('')}</div>
        <div class="lk-row"><span class="hs-s lk-url">${H.icon('mdi:link-variant')}<input class="hs-in" name="bgurl" placeholder="Adres zdjęcia: https://… lub /local/…" value="${H.esc(bg && bg.kind === 'url' ? bg.v : '')}" autocomplete="off"><button class="lk-mini" data-hge="bgurl">Ustaw</button></span>
          <button class="lk-up" data-hge="bgup" title="Prześlij zdjęcie do Home Assistant">${H.icon('mdi:upload')}<span>Prześlij</span></button><input type="file" accept="image/*" hidden></div>
        <div class="lk-grd"><div class="lk-gp" style="background:linear-gradient(135deg,${c1},${c2})"></div>
          <label class="lk-st"><input type="color" name="bgc1" value="${c1}" aria-label="Kolor 1"><i style="background:${c1}"></i>Kolor 1</label>
          <label class="lk-st"><input type="color" name="bgc2" value="${c2}" aria-label="Kolor 2"><i style="background:${c2}"></i>Kolor 2</label>
          <div class="lk-seg"><button data-hge="bgcol" data-k="color" aria-pressed="${!!bg && bg.kind === 'color'}">Jednolity</button><button data-hge="bgcol" data-k="gradient" aria-pressed="${!!bg && bg.kind === 'gradient'}">Gradient</button></div></div></section>
      <section class="lk-g"><h4>${H.icon('mdi:brightness-6')}Przyciemnienie<em class="dv">${dv}%</em></h4><small class="lk-hn">Dotyczy tła w trybie ciemnym</small>
        <input class="lk-rg" type="range" min="0" max="100" step="1" name="dim" value="${dv}" style="--v:${dv}%" aria-label="Przyciemnienie tła"></section>
      ${window.HGLookX ? HGLookX.html(this) : ''}
      </div><div class="lk-ft"><button class="lk-gh" data-hge="lookreset">${H.icon('mdi:restore')}Przywróć domyślne</button><button class="lk-ok" data-hge="sheetclose">Gotowe</button></div></div>`;
    const gu = () => { const v1 = S.querySelector('[name=bgc1]').value, v2 = S.querySelector('[name=bgc2]').value; S.querySelector('.lk-gp').style.background = `linear-gradient(135deg,${v1},${v2})`; S.querySelectorAll('.lk-st i')[0].style.background = v1; S.querySelectorAll('.lk-st i')[1].style.background = v2; };
    S.querySelectorAll('[name=bgc1],[name=bgc2]').forEach((x) => x.addEventListener('input', gu));
    S.querySelector('[name=acc]').addEventListener('change', (e) => { this._eApp((A2) => { A2.accent = e.target.value.toUpperCase(); }); this._eLook(); });
    const rg = S.querySelector('[name=dim]'); rg.addEventListener('input', () => { rg.style.setProperty('--v', rg.value + '%'); S.querySelector('.dv').textContent = rg.value + '%'; this._eApp((A2) => { A2.dim = rg.value / 100; }); });
    S.querySelector('input[type=file]').addEventListener('change', (e) => this._eUpload(e.target.files && e.target.files[0]));
  },
  /* przesłanie zdjęcia: integracja „image_upload” HA (/api/image/upload), serwowane z /api/image/serve/<id>/original */
  _eUpload(f) {
    if (!f) return; const h = this._hass, tok = h && h.auth && h.auth.data && h.auth.data.access_token; if (!tok) return this._eToast('Brak sesji – nie można przesłać');
    const fd = new FormData(); fd.append('file', f, f.name); this._eToast('Przesyłanie…');
    fetch('/api/image/upload', { method: 'POST', headers: { Authorization: 'Bearer ' + tok }, body: fd }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((j) => {
      const u = `/api/image/serve/${j.id}/original`; this._eApp((A) => { A.bg = { kind: 'url', v: u }; }); this._eToast('Ustawiono przesłane zdjęcie'); this._eLook(); }, (e) => this._eToast('Nie udało się przesłać (' + e + ')'));
  },
  _eSheet(mode, ct, scOver) {
    if (!mode) { this._eRepl = null; this._eSheetOpen = false; if (this._eSheetEl) { this._eSheetEl.remove(); this._eSheetEl = null; } return; }
    this._eSheetOpen = mode; this._eSheetCt = ct; this._eF = 'all'; this._eQ = '';
    let L = this._eSheetEl; if (L && !L.isConnected) this.shadowRoot.appendChild(L); if (!L) { L = this._eSheetEl = document.createElement('div'); L.className = 'hge-sheet-l'; this.shadowRoot.appendChild(L); }
    if (!this.shadowRoot.querySelector('style[data-hgt]')) { const st = document.createElement('style'); st.dataset.hgt = '1'; st.textContent = HG_TILE_CSS; this.shadowRoot.appendChild(st); }
    if (mode === 'cfg') return;
    if (mode === 'hidden') { const hid = this._eHidden();
      L.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet" role="dialog" aria-modal="true" aria-label="Przywróć ukryte"><div class="hs-h"><b>Przywróć ukryte</b><button class="hs-x" data-hge="sheetclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div>
        <div class="hs-l">${hid.length ? hid.map((x) => `<div class="hs-r"><span class="hs-i">${H.icon('mdi:eye-off-outline')}</span><span class="hs-t"><b>${H.esc(x.n)}</b><small>${H.esc(x.sc === this._pageScope() ? 'Karta widoku' : x.sc === 'rooms' ? 'Pokój' : x.sc.startsWith('room:') ? 'Sekcja pokoju' : 'Kafelek')}</small></span><button class="hs-b" data-hge="restore" data-sc="${H.esc(x.sc)}" data-k="${H.esc(x.k)}">Przywróć</button></div>`).join('') : '<p class="hs-e">Brak ukrytych elementów w tym widoku.</p>'}</div></div>`;
      return;
    }
    if (!scOver) this._eRepl = null;
    const sc = scOver || (ct ? (ct.page ? ct.scope + ':tiles' : ct.scope) : (this._pageScope() + ':tiles')); this._eSc = sc;
    const rooms = sc === 'rooms' && !this._eRepl;
    L.innerHTML = `<div class="hge-scrim" data-hge="sheetclose"></div><div class="hge-sheet" role="dialog" aria-modal="true" aria-label="Dodaj kafelek"><div class="hs-h"><b>${this._eRepl ? 'Zmień encję' : rooms ? 'Dodaj pokój' : sc.startsWith('room:') ? 'Dodaj do pokoju' : 'Dodaj kafelek'}</b><button class="hs-x" data-hge="sheetclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div>
      <label class="hs-s">${H.icon('mdi:magnify')}<input type="search" placeholder="${rooms ? 'Szukaj obszaru' : 'Szukaj po nazwie, pokoju lub domenie'}" aria-label="Szukaj" autocomplete="off"><button class="hs-clr" type="button" hidden aria-label="Wyczyść">${H.icon('mdi:close')}</button></label>
      ${rooms ? '' : `<div class="hs-f" role="group" aria-label="Rodzaj">${[['all', 'Wszystkie'], ['light', 'Światła'], ['tog', 'Przełączniki'], ['val', 'Czujniki'], ['clim', 'Klimat'], ['media', 'Multimedia'], ['cam', 'Kamery'], ['cover', 'Rolety'], ['run', 'Sceny i skrypty']].map(([f, l]) => `<button data-hge="filter" data-f="${f}" aria-pressed="${f === 'all'}">${l}</button>`).join('')}</div>`}
      ${rooms ? '' : '<div class="hs-pv" aria-live="polite"></div>'}<div class="hs-l" role="list"></div></div>`;
    const inp = L.querySelector('input'), clr = L.querySelector('.hs-clr'); inp.addEventListener('input', () => { this._eQ = inp.value; clr.hidden = !inp.value; this._eSheetList(); });
    clr.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); inp.value = ''; this._eQ = ''; clr.hidden = true; this._eSheetList(); inp.focus(); }, true);
    this._eSheetList(); setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 60);
  },
  /* encje już widoczne w widoku: atrybuty data-e/data-ac/data-cam/data-entity w DOM (głęboko) + identyfikatory w konfiguracji kart */
  _eShown() {
    const h = this._hass, S = new Set();
    const rx = /\b[a-z_]+\.[a-z0-9_]+\b/g, js = JSON.stringify(this._config.cards || []);
    for (const m of js.match(rx) || []) if (h.states[m]) S.add(m);
    const walk = (r, d) => { if (!r || d > 4) return; for (const el of r.querySelectorAll('[data-e],[data-ac],[data-cam],[data-entity],[data-hgk]')) { for (const v of [el.dataset.e, el.dataset.ac, el.dataset.cam, el.dataset.entity, el.dataset.hgk]) if (v && h.states[v]) S.add(v); }
      for (const el of r.querySelectorAll('*')) if (el.shadowRoot && el.tagName.startsWith('HG-')) walk(el.shadowRoot, d + 1); };
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
      lst.innerHTML = list.length ? list.map((a) => `<button class="hs-r" role="listitem" data-hge="pick" data-sc="rooms" data-e="${H.esc(a.id)}" data-n="${H.esc(a.name)}"><span class="hs-i">${H.icon(a.icon)}</span><span class="hs-t"><b>${H.esc(a.name)}</b><small>${a.ents.length} ${a.ents.length === 1 ? 'encja' : 'encji'}${hid.has(a.id) ? ' · ukryty' : ''}</small></span><span class="hs-p">${H.icon('mdi:plus')}</span></button>`).join('') : '<p class="hs-e">Wszystkie obszary są już na liście.</p>';
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
    const coll = new Intl.Collator('pl'); arr.sort((a, b) => coll.compare(a.nm, b.nm));
    const sh = arr; this._eArr = arr;
    const pv = L.querySelector('.hs-pv'); if (pv) { const fx = this._eF === 'all' ? null : this._eF;
      pv.innerHTML = sh.length ? `<small>Podgląd${fx ? ' · ' + H.esc(fx === 'light' ? 'Światło' : (HG_KIND_LBL[fx] || '')) : ''}</small><div class="tg2">${hgTileHtml(h, sh[0].e)}</div>` : ''; hgSlots({ _hass: h, $: pv }); hgPvLive(pv); }
    const row = (x) => `<button class="hs-r" role="listitem" data-hge="${this._eRepl ? 'repl' : 'pick'}" data-sc="${H.esc(sc)}" data-e="${H.esc(x.e)}" data-n="${H.esc(x.nm)}"><span class="hs-i">${H.icon(x.s.attributes.icon || HG_DOM_ICON2[x.e.split('.')[0]] || 'mdi:circle-outline')}</span><span class="hs-t"><b>${H.esc(x.nm)}</b><small>${H.esc([HG_KIND_LBL[x.k], x.an, this._eRepl && shown.has(x.e) ? 'już na widoku' : '', H.ok(x.s) ? H.T(h, x.s) : 'niedostępne'].filter(Boolean).join(' · '))}</small></span><span class="hs-p">${H.icon(this._eRepl ? 'mdi:swap-horizontal' : 'mdi:plus')}</span></button>`;
    /* leniwe renderowanie: porcje po 60, kolejne przy przewijaniu (bez limitu) */
    if (this._eIO) this._eIO.disconnect();
    if (!sh.length) { lst.innerHTML = `<p class="hs-e">${this._eRepl ? 'Brak pasujących encji.' : 'Brak pasujących encji (już widoczne są pomijane).'}</p>`; return; }
    let n = 0; lst.innerHTML = `<small class="hs-cnt">${sh.length} ${sh.length === 1 ? 'encja' : 'encji'}</small>`;
    const more = () => { const st = lst.querySelector('.hs-more'); st && st.remove(); lst.insertAdjacentHTML('beforeend', sh.slice(n, n + 60).map(row).join('')); n += 60;
      if (n < sh.length) { lst.insertAdjacentHTML('beforeend', '<i class="hs-more" aria-hidden="true"></i>'); this._eIO.observe(lst.querySelector('.hs-more')); } };
    this._eIO = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) more(); }, { root: lst, rootMargin: '300px' });
    more();
  },
};
Object.assign(HGPage.prototype, HG_EDIT, HG_COMP_EDIT);
