/* ===================== POGODA NA ZEWNĄTRZ ===================== */
/* Źródło: weather.<x> (stan + atrybuty), prognoza godzinowa i dzienna przez WS weather/subscribe_forecast (jedna subskrypcja na typ,
   współdzielona przez wszystkie instancje karty), temperatura „teraz” z fizycznego czujnika zewnętrznego (CFG temp_sensor), słońce z sun.sun.
   Ikony: Meteocons (basmilius/weather-icons, MIT) hostowane lokalnie; animowana tylko duża ikona, w lite / reduced-motion wersja statyczna. */
const HG_WX_COND = {
  'clear-night': ['Bezchmurnie', 'clear-night', 'clear-night'], sunny: ['Słonecznie', 'clear-day', 'clear-night'], partlycloudy: ['Częściowe zachmurzenie', 'partly-cloudy-day', 'partly-cloudy-night'],
  cloudy: ['Pochmurno', 'cloudy', 'cloudy'], fog: ['Mgła', 'fog-day', 'fog-night'], rainy: ['Deszcz', 'rain', 'rain'], pouring: ['Ulewa', 'extreme-rain', 'extreme-rain'],
  snowy: ['Śnieg', 'snow', 'snow'], 'snowy-rainy': ['Deszcz ze śniegiem', 'sleet', 'sleet'], hail: ['Grad', 'hail', 'hail'], lightning: ['Burza', 'thunderstorms', 'thunderstorms'],
  'lightning-rainy': ['Burza z deszczem', 'thunderstorms-rain', 'thunderstorms-rain'], windy: ['Wietrznie', 'wind', 'wind'], 'windy-variant': ['Wietrznie, pochmurno', 'wind', 'wind'],
  exceptional: ['Zjawisko wyjątkowe', 'not-available', 'not-available'],
};
const HG_WX_SHORT = { 'Częściowe zachmurzenie': 'Częś. zachm.', 'Deszcz ze śniegiem': 'Deszcz/śnieg', 'Burza z deszczem': 'Burza, deszcz', 'Wietrznie, pochmurno': 'Wietrznie', 'Zjawisko wyjątkowe': 'Wyjątkowe' };
const HGWx = {
  subs: new Map(),   // key entity|type -> { data, cbs:Set, unsub, pending }
  sub(hass, entity, type, cb) {
    const k = entity + '|' + type; let s = this.subs.get(k);
    if (!s) {
      s = { data: null, cbs: new Set(), unsub: null };
      this.subs.set(k, s);
      try {
        s.pending = hass.connection.subscribeMessage((m) => { s.data = (m && m.forecast) || []; for (const f of s.cbs) f(s.data); }, { type: 'weather/subscribe_forecast', forecast_type: type, entity_id: entity });
        s.pending.then((u) => { s.unsub = u; if (!s.cbs.size) { u(); this.subs.delete(k); } }, () => { this.subs.delete(k); });
      } catch (e) { this.subs.delete(k); }
    }
    s.cbs.add(cb); if (s.data) cb(s.data);
    return () => { s.cbs.delete(cb); if (!s.cbs.size && s.unsub) { s.unsub(); this.subs.delete(k); } };
  },
  still: () => (typeof hgLite === 'function' && hgLite()) || matchMedia('(prefers-reduced-motion: reduce)').matches,
  icon(cfg, cond, night, anim) {
    const d = HG_WX_COND[cond] || HG_WX_COND.exceptional, f = night ? d[2] : d[1];
    return `${cfg.icon_base}${anim && !this.still() ? '' : 'static/'}${f}.svg?v=${cfg.icon_v}`;
  },
  // kolor temperatury: zimno (niebieski) -> ciepło (pomarańcz)
  tcol(t) {
    const st = [[-10, [76, 130, 230]], [0, [90, 170, 235]], [10, [96, 196, 160]], [18, [245, 196, 70]], [26, [245, 130, 50]], [34, [230, 70, 60]]];
    if (t <= st[0][0]) return `rgb(${st[0][1]})`; if (t >= st[st.length - 1][0]) return `rgb(${st[st.length - 1][1]})`;
    for (let i = 1; i < st.length; i++) if (t <= st[i][0]) { const [a, ca] = st[i - 1], [b, cb] = st[i], k = (t - a) / (b - a); return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * k)).join(',')})`; }
  },
  hm: (d) => d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
};
class HGWeatherCard extends HGBase {
  defaults() { return { entity: '', temp_sensor: null, sun: 'sun.sun', hours: 24, title: 'Na zewnątrz', icon_base: HG_ASSET + 'assets/meteocons/', icon_v: '1', variant: 'card' }; }
  ents() { const c = this._config; return [c.entity, c.temp_sensor, c.sun].filter(Boolean); }
  _extraSig() { return [this._hv || 0, this._dv || 0, Math.floor(Date.now() / 600000)]; }
  setConfig(c) { const o = this._config; if (o && this._u && ((c && c.entity) || '') !== o.entity) { for (const u of this._u) u(); this._u = null; this._hourly = this._daily = this._hf = this._df = null; }
    super.setConfig(c); if (this._hass && !this._u) this._subscribe(); }
  set hass(h) { const first = !this._hass; this._hass = h; if (first || !this._u) this._subscribe(); this._update(); }
  get hass() { return this._hass; }
  connectedCallback() { super.connectedCallback(); if (this._hass) this._subscribe(); }
  disconnectedCallback() { for (const u of this._u || []) u(); this._u = null; this._closeX(); }
  _subscribe() {
    const c = this._config; if (!c || !this._hass || this._u || !this.isConnected) return;
    const fp = (d) => JSON.stringify((d || []).slice(0, 30).map((x) => [x.datetime, x.condition, x.temperature, x.templow, x.precipitation, x.precipitation_probability, x.wind_speed]));
    this._u = [
      HGWx.sub(this._hass, c.entity, 'hourly', (d) => { const f = fp(d); if (f === this._hf) return; this._hf = f; this._hourly = d; this._hv = (this._hv || 0) + 1; this._update(); this._xUpd(); }),
      HGWx.sub(this._hass, c.entity, 'daily', (d) => { const f = fp(d); if (f === this._df) return; this._df = f; this._daily = d; this._dv = (this._dv || 0) + 1; this._update(); this._xUpd(); }),
    ];
  }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; justify-content:space-between; gap:6u; padding:var(--s2) var(--s3) var(--s2); min-width:0; overflow:hidden; }
.hd .ic{ color:var(--hg-accent-tx); }
.hdb{ display:flex; align-items:center; gap:var(--s1); min-width:0; flex:1; background:none; padding:0; color:inherit; text-align:left; cursor:pointer; }
.now{ display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:var(--s1); min-width:0; }
.now img{ width:max(40u, 46px); height:max(40u, 46px); margin:-6u -4u -6u -6u; }
.cd{ min-width:0; display:flex; flex-direction:column; gap:2u; }
.cd b{ font-size:var(--fs-md); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.cd span{ font-size:var(--fs-sm); color:#4A4E54; white-space:nowrap; font-variant-numeric:tabular-nums; }
.tn{ font-size:clamp(34px, calc(var(--k) * 34), 52px); font-weight:300; line-height:1; letter-spacing:-.04em; font-variant-numeric:tabular-nums; color:#1E2023; }
.tn sup{ font-size:.45em; font-weight:400; vertical-align:top; margin-left:1px; position:relative; top:.15em; }
.strip{ flex:none; position:relative; overflow-x:auto; overflow-y:hidden; overscroll-behavior-x:contain; scrollbar-width:none; -webkit-overflow-scrolling:touch; touch-action:pan-x pan-y; margin:0 calc(var(--s3) * -1); padding:0 var(--s3); scroll-snap-type:x proximity; }
.strip::-webkit-scrollbar{ display:none; }
.hrs{ display:grid; grid-auto-flow:column; grid-auto-columns:max(34u, 42px); gap:2u; width:max-content; }
.h{ display:flex; flex-direction:column; align-items:center; gap:1u; padding:2u 0 0; scroll-snap-align:start; font-variant-numeric:tabular-nums; }
.h small{ font-size:var(--fs-xs); color:#5A5E64; } .h.nw small{ color:#1E2023; font-weight:600; }
.h img{ width:max(22u, 26px); height:max(22u, 26px); }
.h b{ font-size:var(--fs-sm); font-weight:600; color:#1E2023; }
.h i{ display:flex; align-items:center; gap:1px; font-style:normal; font-size:var(--fs-xs); color:#6A6E74; min-height:14px; white-space:nowrap; }
.h i ha-icon{ width:11px; height:11px; --mdc-icon-size:11px; }
.h i.wet{ color:var(--hg-accent-tx); font-weight:600; }
.h i.wn{ color:#6A6E74; }
.tl{ position:relative; height:4px; border-radius:2px; margin:3u 0 4u; }
.tl .kn{ position:absolute; top:50%; width:12px; height:12px; margin:-6px 0 0 -6px; border-radius:50%; background:#fff; box-shadow:0 0 0 2px rgba(0,0,0,.18), var(--hg-sh-sm); }
.sun{ flex:none; display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:var(--s1); font-size:var(--fs-xs); color:#4A4E54; font-variant-numeric:tabular-nums; border-top:1px solid rgba(0,0,0,.06); padding-top:var(--s1); }
.sun > span{ display:flex; align-items:center; gap:3u; white-space:nowrap; min-width:0; } .sun > span b{ font-size:var(--fs-sm); font-weight:600; color:#1E2023; }
.sun img{ width:22px; height:22px; margin:-4px -2px; }
.sun svg{ width:100%; height:max(22u, 26px); overflow:visible; }
.arc{ fill:none; stroke:rgba(0,0,0,.14); stroke-width:1.5; stroke-dasharray:3 3; vector-effect:non-scaling-stroke; }
.arcd{ fill:none; stroke:var(--hg-accent); stroke-width:2; vector-effect:non-scaling-stroke; }
.hz{ stroke:rgba(0,0,0,.12); stroke-width:1; vector-effect:non-scaling-stroke; }
.ph{ font-size:var(--fs-sm); color:#5A5E64; padding:var(--s1) 0; }
/* wariant „hero”: na zdjęciu, bez tła/ramki; typografia jak ekran blokady iOS (biały tekst, warstwowy miękki cień) */
:host([variant=hero]){ display:block; --wx-u: var(--hg-u0, 1.3px); }
.hero{ position:relative; display:flex; flex-direction:column; align-items:flex-start; gap:8px; background:none; border:0; padding:0; margin:0; color:#fff; text-align:left; cursor:pointer;
  text-shadow:0 2px 24px rgba(0,0,0,.25), 0 1px 3px rgba(0,0,0,.2); font-variant-numeric:tabular-nums; -webkit-tap-highlight-color:transparent; outline:none; isolation:isolate; }
/* bardzo miękkie przyciemnienie za blokiem (bez widocznej krawędzi) – czytelność na jasnym niebie */
.hero::before{ content:''; position:absolute; z-index:-1; inset:-28% -22% -30% -18%; background:radial-gradient(closest-side, rgba(0,0,0,.20), rgba(0,0,0,.08) 60%, rgba(0,0,0,0)); pointer-events:none; }
.hero:focus-visible{ outline:1px solid rgba(255,255,255,.7); outline-offset:10px; border-radius:16px; }
.hero.anim{ animation:hgwxin .7s cubic-bezier(.2,.7,.2,1) both; }
@keyframes hgwxin{ from{ opacity:0; transform:translateY(6px); } }
@media (prefers-reduced-motion: reduce){ .hero.anim{ animation:none; } }
.hero .big{ display:flex; align-items:flex-start; font-size:clamp(72px, calc(var(--wx-u) * 73), 140px); font-weight:100; line-height:.9; letter-spacing:-.04em; font-feature-settings:'tnum' 1; }
.hero .big sup{ font-size:.36em; font-weight:200; line-height:1; margin:.06em 0 0 .04em; letter-spacing:0; }
/* ikona wyrównana do wysokości wersalików liczby */
.hero .big img{ width:.6em; height:.6em; margin:.02em 0 0 .14em; filter:drop-shadow(0 2px 10px rgba(0,0,0,.22)); }
.hero .cd2{ font-size:clamp(16px, calc(var(--wx-u) * 14.6), 28px); font-weight:500; letter-spacing:.01em; line-height:1.2; }
.hero .mm{ display:flex; gap:1.1em; font-size:clamp(13px, calc(var(--wx-u) * 12), 23px); font-weight:400; line-height:1.2; }
.hero .mm span{ display:inline-flex; align-items:baseline; gap:.25em; } .hero .mm i{ font-style:normal; font-weight:200; opacity:.75; }
.hero .nx{ display:flex; margin-top:8px; font-size:clamp(12px, calc(var(--wx-u) * 11.3), 21px); }
.hero .hc{ display:flex; flex-direction:column; align-items:center; gap:4px; padding:0 1em; min-width:2.6em; }
.hero .hc:first-child{ padding-left:0; align-items:flex-start; } .hero .hc + .hc{ border-left:1px solid rgba(255,255,255,.18); }
.hero .hc small{ font-size:.78em; font-weight:500; letter-spacing:.06em; text-transform:uppercase; opacity:.6; }
.hero .hc img{ width:1.9em; height:1.9em; margin:-.15em 0; }
.hero .hc b{ font-weight:400; }
.hero .hc em{ font-style:normal; font-size:.78em; font-weight:400; color:var(--hg-accent-faint); line-height:1; }
/* wariant kompaktowy (tablet pionowo / telefon): chip obok cen paliw */
.chip{ display:inline-flex; align-items:center; gap:6px; box-sizing:border-box; height:var(--chip-h, 100%); min-height:var(--chip-h, 32px); padding:0 var(--chip-pr, 12px) 0 var(--chip-pl, 6px); border-radius:var(--chip-r, 12px); position:relative; isolation:isolate; background:transparent;
  border: var(--glass-border, 1px solid transparent); box-shadow: var(--glass-shadow, none); color:#1E2023; font-size:var(--fs-sm); white-space:nowrap; cursor:pointer; font-variant-numeric:tabular-nums; }
.chip::after{ content:''; position:absolute; inset:0; border-radius:inherit; z-index:-1; pointer-events:none; background: var(--glass-bg, rgba(255,255,255,.6)); -webkit-backdrop-filter: var(--glass-bf, none); backdrop-filter: var(--glass-bf, none); }
.chip img{ width:var(--chip-ic, 26px); height:var(--chip-ic, 26px); flex:none; } .chip .s{ display:none; }
@media (max-width:600px){ .chip .f{ display:none; } .chip .s{ display:inline; } } .chip b{ font-weight:600; } .chip span{ color:#3A3D42; }
/* szczegóły: kolumny bez odstępów -> gradient wyrównany do środków godzin */
.sc2{ width:max-content; min-width:100%; }
.hrs.al{ gap:0; grid-auto-columns:56px; }
`);
  }
  _pu() { const w = this._hass && this._hass.states[this._config.entity]; return (w && w.attributes.precipitation_unit) || 'mm'; }
  _tNow() {
    const h = this._hass, c = this._config, s = h.states[c.temp_sensor];
    if (H.ok(s) && isFinite(parseFloat(s.state))) return { v: parseFloat(s.state), src: 'sensor' };
    const w = h.states[c.entity]; const t = w && parseFloat(w.attributes.temperature);
    return isFinite(t) ? { v: t, src: 'weather' } : null;
  }
  _night(d) {
    const s = this._hass.states[this._config.sun]; if (!s) return false;
    const r = Date.parse(s.attributes.next_rising), st = Date.parse(s.attributes.next_setting); if (!isFinite(r) || !isFinite(st)) return false;
    // dla czasu d: noc, jeśli d leży między zachodem a wschodem (przybliżenie dobowe z najbliższych zdarzeń)
    const day = 86400000, t = d.getTime();
    let sr = r, ss = st; while (sr - day > t) sr -= day; while (ss - day > t) ss -= day;
    while (sr < t - day) sr += day; while (ss < t - day) ss += day;
    const lastRise = sr <= t ? sr : sr - day, lastSet = ss <= t ? ss : ss - day;
    return lastSet > lastRise;
  }
  _hrs() {
    const now = Date.now();
    return (this._hourly || []).filter((f) => Date.parse(f.datetime) > now - 3600000).slice(0, this._config.hours);
  }
  _hourCells(hr, wide) {
    const c = this._config, pu = this._pu();
    return hr.map((f, i) => {
      const d = new Date(f.datetime), pp = f.precipitation_probability, mm = f.precipitation, ws = f.wind_speed;
      const pr = pp != null ? `<i class="${pp > 30 ? 'wet' : ''}">${H.icon('mdi:water')}${Math.round(pp)}%</i>` : mm != null ? `<i class="${mm > 0 ? 'wet' : ''}">${mm > 0 ? H.icon('mdi:water') + H.fmt(mm, 1) + (wide ? ' ' + pu : '') : ''}</i>` : '';
      const wn = wide && ws != null ? `<i class="wn">${H.icon('mdi:weather-windy')}${H.fmt(ws, 0)}</i>` : '';
      const mmx = wide && pp != null && mm != null && mm > 0 ? `<i class="wet">${H.fmt(mm, 1)} ${pu}</i>` : '';
      return `<div class="h ${i === 0 ? 'nw' : ''}" role="listitem" aria-label="${H.esc(`${i === 0 ? 'Teraz' : 'Godz. ' + d.getHours()}: ${(HG_WX_COND[f.condition] || [f.condition])[0]}, ${H.fmt(f.temperature, 0)}°${pp != null ? `, opady ${Math.round(pp)}%` : mm != null ? `, opady ${H.fmt(mm, 1)} ${pu}` : ''}`)}">
        <small>${i === 0 ? 'Teraz' : String(d.getHours()).padStart(2, '0')}</small><img src="${HGWx.icon(c, f.condition, this._night(d), false)}" alt="" loading="lazy" decoding="async"><b>${H.fmt(f.temperature, 0)}°</b>${pr}${mmx}${wn}</div>`;
    }).join('');
  }
  _tline(hr) {
    if (hr.length < 2) return '';
    const ts = hr.map((f) => f.temperature).filter((t) => t != null); if (ts.length < 2) return '';
    const stops = hr.map((f, i) => f.temperature == null ? '' : `${HGWx.tcol(f.temperature)} ${((i + .5) / hr.length * 100).toFixed(1)}%`).filter(Boolean).join(',');
    const t0 = Date.parse(hr[0].datetime), frac = Math.max(0, Math.min(1, (Date.now() - t0) / 3600000));
    const kx = ((frac + .5) / hr.length) * 100;
    return `<div class="tl" style="background:linear-gradient(90deg, ${stops})" aria-hidden="true"><span class="kn" style="left:${kx.toFixed(2)}%"></span></div>`;
  }
  _sun() {
    const s = this._hass.states[this._config.sun]; if (!s) return '';
    const r = Date.parse(s.attributes.next_rising), st = Date.parse(s.attributes.next_setting); if (!isFinite(r) || !isFinite(st)) return '';
    const now = Date.now(), up = st < r;          // słońce nad horyzontem, jeśli najbliższy jest zachód
    // pozycja: dzień = (teraz − wschód dziś) / (zachód − wschód dziś); wschód dziś ≈ jutrzejszy − 24 h (oś łuku, nie wyświetlana godzina)
    let p, night = !up;
    if (up) { const r0 = r - 86400000; p = (now - r0) / Math.max(1, st - r0); }
    else { const s0 = st > r ? st - 86400000 : st; p = (now - s0) / Math.max(1, r - s0); }
    p = Math.max(0, Math.min(1, p));
    const x = p * 100, y = night ? 30 + Math.sin(p * Math.PI) * 6 : 30 - Math.sin(p * Math.PI) * 26;
    const pts = []; for (let i = 0; i <= 20; i++) { const q = i / 20; pts.push(`${(q * 100).toFixed(1)},${(30 - Math.sin(q * Math.PI) * 26).toFixed(1)}`); }
    const done = []; if (!night) for (let i = 0; i <= 20; i++) { const q = (i / 20) * p; done.push(`${(q * 100).toFixed(1)},${(30 - Math.sin(q * Math.PI) * 26).toFixed(1)}`); }
    const svg = `<svg viewBox="0 -2 100 40" preserveAspectRatio="none" aria-hidden="true"><line class="hz" x1="0" y1="30" x2="100" y2="30"/><polyline class="arc" points="${pts.join(' ')}"/>${done.length ? `<polyline class="arcd" points="${done.join(' ')}"/>` : ''}
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" fill="${night ? '#9AA6C8' : 'var(--hg-accent)'}" stroke="#fff" stroke-width="1.2" vector-effect="non-scaling-stroke" transform="scale(1 1)"/></svg>`;
    const c = this._config, ri = `${c.icon_base}static/sunrise.svg?v=${c.icon_v}`, si = `${c.icon_base}static/sunset.svg?v=${c.icon_v}`;
    const lab = (t) => { const d = new Date(t), today = new Date().toDateString() === d.toDateString(); return HGWx.hm(d) + (today ? '' : ' jutro'); };
    return `<div class="sun" aria-label="${H.esc(`Wschód słońca ${lab(r)}, zachód ${lab(st)}`)}"><span><img src="${ri}" alt=""><span><b>${HGWx.hm(new Date(r))}</b> wschód${new Date().toDateString() === new Date(r).toDateString() ? '' : ' (jutro)'}</span></span>${svg}<span><span><b>${HGWx.hm(new Date(st))}</b> zachód${new Date().toDateString() === new Date(st).toDateString() ? '' : ' (jutro)'}</span><img src="${si}" alt=""></span></div>`;
  }
  _minmax() {
    const d0 = (this._daily || [])[0];
    if (d0 && new Date(d0.datetime).toDateString() === new Date().toDateString() && d0.temperature != null) return [d0.temperature, d0.templow];
    const today = new Date().toDateString(), hs = (this._hourly || []).filter((f) => new Date(f.datetime).toDateString() === today).map((f) => f.temperature).filter((t) => t != null);
    return hs.length ? [Math.max(...hs), Math.min(...hs)] : null;
  }
  render() {
    const h = this._hass, c = this._config, w = h.states[c.entity];
    if (c.variant === 'hero') return this._hero(w);
    const hd = (inner) => `<div class="hd"><button class="hdb" data-act="more" aria-label="${H.esc(c.title + ' – szczegóły pogody')}">${H.icon('mdi:weather-partly-cloudy', 'ic')}<span class="tt">${H.esc(c.title)}</span></button>${inner || ''}</div>`;
    if (!H.ok(w)) return `<ha-card class="glass">${hd()}<div class="ph">Pogoda niedostępna</div></ha-card>`;
    const tn = this._tNow(), cond = HG_WX_COND[w.state] || [w.state], mm = this._minmax(), night = this._night(new Date());
    const hr = this._hrs();
    const exp = `<button class="ib" data-act="expand" aria-label="Prognoza szczegółowa" title="Prognoza 24 h i dni">${H.icon('mdi:arrow-expand')}</button>`;
    return `<ha-card class="glass">${hd(exp)}
      <div class="now"><img src="${HGWx.icon(c, w.state, night, true)}" alt="" decoding="async"><div class="cd"><b>${H.esc(cond[0])}</b>${mm ? `<span>Maks ${H.fmt(mm[0], 0)}° · Min ${mm[1] != null ? H.fmt(mm[1], 0) + '°' : '–'}</span>` : ''}</div>
        ${tn ? `<div class="tn" title="${tn.src === 'sensor' ? 'Czujnik zewnętrzny' : 'Prognoza (brak czujnika)'}">${H.fmt(tn.v, Math.abs(tn.v) < 10 ? 1 : 0)}<sup>°</sup></div>` : ''}</div>
      ${hr.length ? `<div class="strip" tabindex="0" aria-label="Prognoza godzinowa"><div class="hrs" role="list">${this._hourCells(hr, false)}</div>${this._tline(hr)}</div>` : ''}
      ${this._sun()}</ha-card>`;
  }
  _hero(w) {
    const c = this._config;
    if (!H.ok(w)) return '';
    const t = parseFloat(w.attributes.temperature), cond = (HG_WX_COND[w.state] || [w.state])[0], mm = this._minmax(), night = this._night(new Date());
    const lbl = `Na zewnątrz: ${isFinite(t) ? H.fmt(t, 0) + '°' : ''}, ${cond}${mm ? `, maks ${H.fmt(mm[0], 0)}°, min ${H.fmt(mm[1], 0)}°` : ''} – prognoza szczegółowa`;
    const chip = `<button class="chip" data-act="expand" aria-label="${H.esc(lbl)}" title="${H.esc(cond)}"><img src="${HGWx.icon(c, w.state, night, false)}" alt=""><b>${isFinite(t) ? H.fmt(t, 0) + '°' : ''}</b><span class="f">${H.esc(cond)}</span><span class="s">${H.esc(HG_WX_SHORT[cond] || cond)}</span></button>`;
    if (this.hasAttribute('compact')) return chip;
    const first = !this._shown, pu = this._pu(); this._shown = true;
    const nx = this._hrs().slice(1, 6).map((f) => { const d = new Date(f.datetime);
      return `<span class="hc"><small>${String(d.getHours()).padStart(2, '0')}</small><img src="${HGWx.icon(c, f.condition, this._night(d), false)}" alt=""><b>${H.fmt(f.temperature, 0)}°</b>${f.precipitation > 0 ? `<em>${H.fmt(f.precipitation, 1)} ${pu}</em>` : ''}</span>`; }).join('');
    return `<button class="hero ${first && !HGWx.still() ? 'anim' : ''}" data-act="expand" aria-label="${H.esc(lbl)}" title="Prognoza szczegółowa">
      <span class="big">${isFinite(t) ? H.fmt(t, 0) : '–'}<sup>°</sup><img src="${HGWx.icon(c, w.state, night, true)}" alt=""></span>
      <span class="cd2">${H.esc(cond)}</span>${mm ? `<span class="mm"><span><i>↑</i>${H.fmt(mm[0], 0)}°</span>${mm[1] != null ? `<span><i>↓</i>${H.fmt(mm[1], 0)}°</span>` : ''}</span>` : ''}${nx ? `<span class="nx" aria-hidden="true">${nx}</span>` : ''}</button>`;
  }
  static get observedAttributes() { return ['compact']; }
  attributeChangedCallback() { if (this._hass && this._config) this.rerender(); }
  onAct(a) {
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: this._config.entity });
    if (a === 'expand') return this._openX();
  }
  /* szczegóły pogody: dialog w document.body (poza panelem z contain/transform), styl iOS Weather w naszym szkle */
  _openX() {
    if (this._x) return;
    const x = this._x = document.createElement('div'); x.className = 'hg-wx-x';
    const sr = x.attachShadow({ mode: 'open' });
    sr.innerHTML = `<style>${HG_BASE}${U(`
:host{ position:fixed; inset:0; z-index:9000; display:flex; align-items:center; justify-content:center; padding:16px; background:rgba(14,16,20,.32); animation:f .18s ease; }
@keyframes f{ from{ opacity:0; } }
@media (prefers-reduced-motion: reduce){ :host{ animation:none; } }
.root{ width:min(680px, 100%); min-width:0; height:auto !important; }
.dlg{ box-sizing:border-box; width:100%; max-height:min(90vh, 820px); overflow-x:hidden; overflow-y:auto; overscroll-behavior:contain; display:flex; flex-direction:column; gap:24px; padding:24px;
  border-radius:var(--r-lg); background:var(--hg-panel-flat, rgba(236,238,242,.94)); -webkit-backdrop-filter:blur(24px); backdrop-filter:blur(24px);
  border:1px solid var(--hg-glass-bd); box-shadow:var(--hg-sh); color:#1E2023; font-variant-numeric:tabular-nums; }
.top{ display:flex; align-items:center; gap:12px; min-width:0; }
.top img{ width:56px; height:56px; margin:-8px -4px; flex:none; }
.top .tx{ flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.top .tx small{ font-size:var(--fs-sm); color:#4A4E54; } .top .tx b{ font-size:20px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.top .tx b span{ font-weight:300; }
.cls{ width:40px; height:40px; flex:none; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.05); color:#1E2023; }
.cls ha-icon{ width:20px; height:20px; }
.sec{ display:flex; flex-direction:column; gap:8px; min-width:0; }
.sh{ font-size:var(--fs-xs); font-weight:600; color:#5A5E64; text-transform:uppercase; letter-spacing:.06em; }
.det{ display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; }
.t{ display:flex; flex-direction:column; gap:4px; padding:12px; border-radius:var(--r-sm); background:rgba(0,0,0,.035); min-width:0; }
.t span{ display:flex; align-items:center; gap:4px; font-size:var(--fs-xs); color:#4A4E54; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .t ha-icon{ width:16px; height:16px; flex:none; color:#5A5E64; }
.t b{ font-size:18px; font-weight:600; white-space:nowrap; } .t b em{ font-style:normal; font-size:var(--fs-xs); font-weight:400; color:#4A4E54; margin-left:2px; }
.hs{ overflow-x:auto; overflow-y:hidden; scrollbar-width:none; overscroll-behavior-x:contain; touch-action:pan-x pan-y; padding:4px 0;
  -webkit-mask-image:linear-gradient(90deg, transparent, #000 16px, #000 calc(100% - 24px), transparent); mask-image:linear-gradient(90deg, transparent, #000 16px, #000 calc(100% - 24px), transparent); }
.hs::-webkit-scrollbar{ display:none; }
.hr{ display:grid; grid-auto-flow:column; grid-auto-columns:52px; width:max-content; padding:0 16px; }
.hc{ display:flex; flex-direction:column; align-items:center; gap:4px; }
.hc small{ font-size:var(--fs-xs); color:#5A5E64; } .hc.nw small{ color:#1E2023; font-weight:600; }
.hc img{ width:30px; height:30px; } .hc b{ font-size:var(--fs-md); font-weight:500; }
.hc i{ font-style:normal; font-size:11px; color:var(--hg-accent-tx); min-height:13px; white-space:nowrap; }
.hc .d{ width:6px; height:6px; border-radius:50%; margin-top:2px; }
.days{ display:flex; flex-direction:column; }
.dy{ display:grid; grid-template-columns:minmax(64px, 1.1fr) 36px 40px 34px minmax(80px, 2fr) 34px; align-items:center; gap:8px; min-height:48px; font-size:var(--fs-md); }
.dy + .dy{ border-top:1px solid rgba(0,0,0,.07); }
.dy .n{ font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .dy img{ width:36px; height:36px; }
.dy .p{ font-size:11px; color:var(--hg-accent-tx); white-space:nowrap; } .dy .lo{ color:#5A5E64; text-align:right; } .dy .hi{ text-align:right; font-weight:600; }
.rg{ position:relative; height:6px; border-radius:3px; background:rgba(0,0,0,.07); }
.rg i{ position:absolute; top:0; bottom:0; border-radius:3px; } .rg u{ position:absolute; top:50%; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%; background:currentColor; box-shadow:0 0 0 2px var(--hg-panel-flat, rgb(236 238 242)), 0 1px 3px rgba(0,0,0,.3); }
.sun{ display:grid; grid-template-columns:auto 1fr auto; align-items:end; gap:12px; }
.sun .e{ display:flex; flex-direction:column; align-items:center; gap:2px; font-size:var(--fs-xs); color:#4A4E54; white-space:nowrap; }
.sun .e img{ width:32px; height:32px; margin:-4px 0; } .sun .e b{ font-size:var(--fs-md); font-weight:600; color:#1E2023; }
.sun svg{ width:100%; max-width:240px; height:auto; justify-self:center; overflow:visible; }
.sun .hz{ stroke:rgba(0,0,0,.18); stroke-width:1; } .sun .rem{ fill:none; stroke:rgba(0,0,0,.22); stroke-width:1.5; stroke-dasharray:4 5; } .sun .dn{ fill:none; stroke:var(--hg-accent); stroke-width:2.5; stroke-linecap:round; }
@media (max-width: 520px){ .dlg{ padding:20px 16px; gap:20px; } .det{ grid-template-columns:repeat(2, minmax(0, 1fr)); }
  .dy{ grid-template-columns:minmax(56px, 1fr) 30px 30px minmax(56px, 1.6fr) 30px; } .dy .p{ display:none; } .dy img{ width:30px; height:30px; } }
`)}</style><div class="root"></div>`;
    x.addEventListener('click', (e) => { const p = e.composedPath(); if (p[0] === x || p.some((n) => n.dataset && n.dataset.act === 'xclose')) this._closeX(); });
    this._xKey = (e) => { if (e.key === 'Escape') this._closeX(); }; document.addEventListener('keydown', this._xKey);
    document.body.appendChild(x); this._xUpd(); this._sunToday();
  }
  /* dzisiejszy wschód/zachód: z historii sun.sun (przejścia below/above_horizon od północy), reszta z next_rising/next_setting */
  async _sunToday() {
    const h = this._hass, c = this._config; if (!h || !h.callWS) return;
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    if (this._sunDay === d0.getTime()) return;
    try {
      const r = await h.callWS({ type: 'history/history_during_period', start_time: d0.toISOString(), entity_ids: [c.sun], minimal_response: true, no_attributes: true });
      const L = (r && r[c.sun]) || []; let rise = null, set = null, prev = null;
      for (const x of L) { const t = (x.lu || x.lc || 0) * 1000, s = x.s; if (prev && prev !== s && t >= d0.getTime()) { if (s === 'above_horizon' && !rise) rise = t; if (s === 'below_horizon' && rise && !set) set = t; } prev = s; }
      this._sunDay = d0.getTime(); this._sunHist = { rise, set }; this._xUpd();
    } catch (e) { /* bez historii: tylko najbliższe zdarzenia */ }
  }
  _sunTimes() {
    const s = this._hass.states[this._config.sun]; if (!s) return null;
    const nr = Date.parse(s.attributes.next_rising), ns = Date.parse(s.attributes.next_setting);
    const today = (t) => isFinite(t) && new Date(t).toDateString() === new Date().toDateString();
    const hs = this._sunHist || {};
    const rise = today(nr) ? { t: nr } : hs.rise ? { t: hs.rise } : isFinite(nr) ? { t: nr, tm: true } : null;
    const set = today(ns) ? { t: ns } : hs.set ? { t: hs.set } : isFinite(ns) ? { t: ns, tm: true } : null;
    return { rise, set, up: s.state === 'above_horizon' };
  }
  _sunSvg(st) {
    if (!st || !st.rise || !st.set) return '';
    const now = Date.now(), A = (p) => [150 - 130 * Math.cos(Math.PI * p), 104 - 84 * Math.sin(Math.PI * p)];
    let dot;
    if (st.up && !st.rise.tm && !st.set.tm) {
      const p = Math.max(0, Math.min(1, (now - st.rise.t) / Math.max(1, st.set.t - st.rise.t))), [x, y] = A(p);
      dot = `<path class="dn" d="M20,104 A130,84 0 0 1 ${x.toFixed(1)},${y.toFixed(1)}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" style="fill:var(--hg-accent)" stroke="#fff" stroke-width="2.5"/>`;
    } else {
      // noc: księżyc pod horyzontem, pozycja wg czasu do wschodu
      const s0 = st.set.tm ? st.set.t - 86400000 : st.set.t, r1 = st.rise.tm ? st.rise.t : st.rise.t + 86400000;
      const p = Math.max(0, Math.min(1, (now - s0) / Math.max(1, r1 - s0)));
      dot = `<circle cx="${(20 + 260 * p).toFixed(1)}" cy="${(116 + 8 * Math.sin(Math.PI * p)).toFixed(1)}" r="7" fill="#9AA6C8" stroke="#fff" stroke-width="2"/>`;
    }
    return `<svg viewBox="0 0 300 130" aria-hidden="true"><line class="hz" x1="0" y1="104" x2="300" y2="104"/><path class="rem" d="M20,104 A130,84 0 0 1 280,104"/>${dot}</svg>`;
  }
  _xUpd() {
    if (!this._x) return;
    const c = this._config, h = this._hass, w = h.states[c.entity]; if (!w) return;
    const at = w.attributes, pu = at.precipitation_unit || 'mm', cond = (HG_WX_COND[w.state] || [w.state])[0], t = parseFloat(at.temperature), night = this._night(new Date());
    const DN = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const dl = (d) => { const t0 = new Date(); t0.setHours(0, 0, 0, 0); const dd = new Date(d); dd.setHours(0, 0, 0, 0); const n = Math.round((dd - t0) / 86400000); return n === 0 ? 'Dziś' : n === 1 ? 'Jutro' : DN[dd.getDay()]; };
    // kafle szczegółów (tylko prawdziwe atrybuty)
    const WD = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], wd = at.wind_bearing == null || at.wind_bearing === '' ? '' : isFinite(at.wind_bearing) ? WD[((Math.round(at.wind_bearing / 45) % 8) + 8) % 8] : String(at.wind_bearing);
    const det = [at.humidity != null ? ['mdi:water-percent', 'Wilgotność', H.fmt(at.humidity, 0), '%'] : null,
      at.wind_speed != null ? ['mdi:weather-windy', 'Wiatr', H.fmt(at.wind_speed, 0), `${at.wind_speed_unit || 'km/h'}${wd ? ' ' + wd : ''}`] : null,
      at.pressure != null ? ['mdi:gauge', 'Ciśnienie', H.fmt(at.pressure, 0), at.pressure_unit || 'hPa'] : null,
      at.uv_index != null ? ['mdi:white-balance-sunny', 'UV', H.fmt(at.uv_index, 1), ''] : null].filter(Boolean)
      .map(([i, l, v, u]) => `<div class="t"><span>${H.icon(i)}${l}</span><b>${H.esc(v)}${u ? `<em>${H.esc(u)}</em>` : ''}</b></div>`).join('');
    // godziny
    const hr = this._hrs();
    const hrs = hr.map((f, i) => { const d = new Date(f.datetime);
      return `<div class="hc ${i === 0 ? 'nw' : ''}"><small>${i === 0 ? 'Teraz' : String(d.getHours()).padStart(2, '0')}</small><img src="${HGWx.icon(c, f.condition, this._night(d), false)}" alt="" loading="lazy"><b>${H.fmt(f.temperature, 0)}°</b>
        <span class="d" style="background:${HGWx.tcol(f.temperature)}"></span><i>${f.precipitation > 0 ? H.fmt(f.precipitation, 1) + ' ' + pu : ''}</i></div>`; }).join('');
    // dni: pasek zakresu na wspólnej skali
    const D = (this._daily || []).slice(0, 7).filter((f) => f.temperature != null);
    const lo = Math.min(...D.map((f) => f.templow ?? f.temperature)), hi = Math.max(...D.map((f) => f.temperature)), sp = Math.max(1, hi - lo);
    const days = D.map((f) => { const a = f.templow ?? f.temperature, b = f.temperature, L = ((a - lo) / sp) * 100, Wd = Math.max(4, ((b - a) / sp) * 100), isT = dl(f.datetime) === 'Dziś';
      const nowDot = isT && isFinite(t) ? `<u style="left:${Math.max(0, Math.min(100, ((t - lo) / sp) * 100)).toFixed(1)}%"></u>` : '';
      return `<div class="dy" aria-label="${H.esc(`${dl(f.datetime)}: ${(HG_WX_COND[f.condition] || [f.condition])[0]}, ${H.fmt(a, 0)}° do ${H.fmt(b, 0)}°${f.precipitation > 0 ? `, opady ${H.fmt(f.precipitation, 1)} ${pu}` : ''}`)}">
        <span class="n">${H.esc(dl(f.datetime))}</span><img src="${HGWx.icon(c, f.condition, false, false)}" alt="" title="${H.esc((HG_WX_COND[f.condition] || [f.condition])[0])}"><span class="p">${f.precipitation > 0 ? H.fmt(f.precipitation, 1) + ' ' + pu : ''}</span>
        <span class="lo">${H.fmt(a, 0)}°</span><span class="rg"><i style="left:${L.toFixed(1)}%;width:${Wd.toFixed(1)}%;background:linear-gradient(90deg, ${HGWx.tcol(a)}, ${HGWx.tcol(b)})"></i>${nowDot}</span><span class="hi">${H.fmt(b, 0)}°</span></div>`; }).join('');
    // słońce
    const st = this._sunTimes(), svg = this._sunSvg(st), ic = (n) => `${c.icon_base}static/${n}.svg?v=${c.icon_v}`;
    const se = (o, lab, icn) => o ? `<div class="e"><img src="${ic(icn)}" alt=""><b>${HGWx.hm(new Date(o.t))}</b><span>${lab}${o.tm ? ' jutro' : ''}</span></div>` : '<div></div>';
    this._x.shadowRoot.querySelector('.root').innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="Pogoda – szczegóły">
      <div class="top"><img src="${HGWx.icon(c, w.state, night, true)}" alt=""><div class="tx"><small>${H.esc(c.title)}</small><b>${isFinite(t) ? H.fmt(t, 0) + '°' : ''} <span>· ${H.esc(cond)}</span></b></div><button class="cls" data-act="xclose" aria-label="Zamknij">${H.icon('mdi:close')}</button></div>
      ${det ? `<div class="det">${det}</div>` : ''}
      ${hrs ? `<div class="sec"><div class="sh">Najbliższe ${hr.length} h</div><div class="hs" tabindex="0" aria-label="Prognoza godzinowa"><div class="hr">${hrs}</div></div></div>` : ''}
      ${days ? `<div class="sec"><div class="sh">Kolejne dni</div><div class="days">${days}</div></div>` : ''}
      ${st && (st.rise || st.set) ? `<div class="sec"><div class="sh">Słońce</div><div class="sun">${se(st.rise, 'wschód', 'sunrise')}${svg || '<div></div>'}${se(st.set, 'zachód', 'sunset')}</div></div>` : ''}</div>`;
    const cl = this._x.shadowRoot.querySelector('.cls'); if (cl && !this._xFocused) { this._xFocused = true; cl.focus(); }
  }
  _closeX() { if (!this._x) return; this._x.remove(); this._x = null; this._xFocused = false; document.removeEventListener('keydown', this._xKey); }
  getCardSize() { return 5; }
}
hgReg('hg-weather-card', HGWeatherCard, 'Home Glass – Pogoda', 'Na zewnątrz: teraz, prognoza godzinowa, słońce; szczegóły z dniami');
