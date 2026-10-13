/* ===================== statystyki (wspólne) ===================== */
const HGStats = {
  cache: {},
  async daily(hass, ids, days) {
    const key = ids.join(',') + days;
    const now = Date.now(), c = this.cache[key];
    if (c && now - c.t < 5 * 60 * 1000) return c.v;
    if (this.inflight && this.inflight[key]) return this.inflight[key];
    (this.inflight = this.inflight || {})[key] = this._fetch(hass, ids, days, key, now).finally(() => { delete this.inflight[key]; });
    return this.inflight[key];
  },
  /* granice dni w strefie HA (Europe/Warsaw), niezależnie od strefy przeglądarki */
  tz(hass) { return (hass && hass.config && hass.config.time_zone) || Intl.DateTimeFormat().resolvedOptions().timeZone; },
  key(d, tz) { return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); },
  midnight(ms, tz) {   // północ w strefie tz dla dnia zawierającego ms
    const k = this.key(new Date(ms), tz), [y, m, d] = k.split('-').map(Number);
    let t = Date.UTC(y, m - 1, d);
    for (let i = 0; i < 3; i++) { const off = this.offset(t, tz); t = Date.UTC(y, m - 1, d) - off; }
    return t;
  },
  offset(ms, tz) { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000; },
  async _fetch(hass, ids, days, key, now) {
    const tz = this.tz(hass);
    const t0 = this.midnight(Date.now(), tz);
    const dayStarts = [...Array(days)].map((_, i) => this.midnight(t0 - (days - 1 - i) * 86400000 + 43200000, tz));
    const start = new Date(dayStarts[0]);
    const r = await hass.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), statistic_ids: ids, period: 'day', types: ['change'], units: { energy: 'kWh' } });
    const out = {};
    for (const id of ids) {
      const m = {};
      for (const row of r[id] || []) { const d = new Date(typeof row.start === 'number' ? row.start : Date.parse(row.start)); m[this.key(d, tz)] = row.change || 0; }
      out[id] = m;
    }
    // dni jako Date w południe danego dnia (getDay/getDate poprawne także poza strefą HA); klucz = data w strefie HA
    const dd = dayStarts.map((t) => { const k = this.key(new Date(t + 43200000), tz), [y, mo, da] = k.split('-').map(Number); const d = new Date(y, mo - 1, da, 12); d.__k = k; return d; });
    const v = { days: dd, keys: dd.map((d) => d.__k), byId: out, has: ids.some((id) => (r[id] || []).length), present: Object.fromEntries(ids.map((id) => [id, new Set((r[id] || []).map((row) => this.key(new Date(typeof row.start === 'number' ? row.start : Date.parse(row.start)), tz)))])) };
    this.cache[key] = { t: now, v };
    return v;
  },
};

/* ===================== SOLAR ===================== */
class HGSolarCard extends HGBase {
  defaults() {
    return { title: 'Energia słoneczna dziś', icon: 'mdi:solar-panel', statistic: null, today_entity: null, days: 7,
      caption: 'kWh czystej energii', offline_label: 'falownik offline', locale: 'pl-PL', expand: null, no_data: 'Brak źródła danych' };
  }
  ents() { return [this._config.today_entity, this._config.status_entity].filter(Boolean); }
  _extraSig() { return [this._data ? this._data.t : 0, this._sel, this._w]; }
  connectedCallback() { super.connectedCallback();
    this._load();
    this._iv = setInterval(() => this._load(true), 5 * 60 * 1000);
    this._ro = new ResizeObserver(() => { const w = Math.round(this.getBoundingClientRect().width); if (w && w !== this._w) { this._w = w; this.rerender(); } });
    this._ro.observe(this);
  }
  disconnectedCallback() { clearInterval(this._iv); this._ro && this._ro.disconnect(); }
  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._load(); this._update(); }
  get hass() { return this._hass; }
  async _load(force) {
    if (!this._hass || !this._config || !this._config.statistic || (this._loading && !force)) return;
    this._loading = true;
    try {
      if (force) HGStats.cache = {};
      const v = await HGStats.daily(this._hass, [this._config.statistic], this._config.days);
      this._data = { t: Date.now(), v }; this._err = null;
    } catch (e) { this._err = String(e && e.message || e); }
    this._loading = false; this.rerender();
  }
  css() {
    return U(`
ha-card.glass{ padding:0; display:flex; flex-direction:column; }
.top{ padding:var(--s2) var(--s3) 0 var(--s3); position:relative; z-index:3; }
.v{ display:flex; align-items:baseline; gap:var(--s1); margin-top:9u; }
.v b{ font-size:calc(15u * var(--hg-fsv, 1)); font-weight:400; letter-spacing:-.01em; }
.v span{ font-size:var(--fs-xs); color:#5A5E64; }

.ch{ position:relative; flex:1; min-height:60u; }
svg{ position:absolute; left:0; top:0; width:100%; height:100%; overflow:visible; }
.ln{ fill:none; stroke:var(--hg-accent); stroke-width:1.4; stroke-linejoin:round; vector-effect:non-scaling-stroke; }
.band{ position:absolute; top:0; bottom:0; right:0; background: rgba(120,95,80,.08); }
.lb{ position:absolute; left:0; right:0; bottom:9u; height:12u; }
.lb button{ position:absolute; top:50%; transform:translate(-50%,-50%); font-size:var(--fs-xs); color:#3B3F45; padding:var(--s1) var(--s1); min-height:var(--hg-tgt, 0px); min-width:var(--hg-tgt, 0px); }
.lb button.sel{ font-weight:400; }
.dot{ position:absolute; width:5u; height:5u; border-radius:50%; background:#fff; border:1px solid var(--hg-accent); transform:translate(-50%,-50%); }
.tip{ position:absolute; transform:translate(-50%,-100%); margin-top:-8u; background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:var(--r-sm); padding:var(--s1) var(--s2); font-size:var(--fs-xs); line-height:1.4; white-space:nowrap; color:#2B2E33; box-shadow:var(--hg-sh); z-index:4; }
.tip b{ font-weight:400; } .tip .dl{ color:#9A9EA4; }
.tip::after{ content:''; position:absolute; left:50%; bottom:-3u; width:4u; height:4u; background:#fff; border-right:1px solid rgba(0,0,0,.06); border-bottom:1px solid rgba(0,0,0,.06); transform:translateX(-50%) rotate(45deg); }
.hit{ position:absolute; inset:0; }
`);
  }
  render() {
    const c = this._config;
    const ts0 = H.st(this._hass, c.today_entity);
    const off0 = c.today_entity && (!ts0 || ts0.state === 'unavailable');
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>${off0 ? `<span class="note" title="${H.esc(c.today_entity)}: niedostępny">${H.esc(c.offline_label)}</span>` : ''}
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="Rozwiń" title="Szczegóły">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
    if (!c.statistic || this._err || (this._data && !this._data.v.has)) {
      return `<ha-card class="glass"><div class="top">${hd}</div><div class="ph" style="padding:0 14px"><b>${H.esc(c.no_data)}</b>${H.esc(this._err || c.statistic || '')}</div></ha-card>`;
    }
    if (!this._data) return `<ha-card class="glass"><div class="top">${hd}<div class="v"><span>…</span></div></div></ha-card>`;
    const { days, byId } = this._data.v; const m = byId[c.statistic];
    const vals = days.map((d) => Math.max(0, m[d.__k || H.dayKey(d)] || 0));
    const ts = H.st(this._hass, c.today_entity);
    const todayState = ts && H.ok(ts) ? parseFloat(ts.state) : null;
    if (todayState != null && isFinite(todayState) && todayState > vals[vals.length - 1]) vals[vals.length - 1] = todayState;
    const n = vals.length, sel = this._sel == null ? n - 1 : this._sel;
    const W = this._w || 400, Hh = 100;
    const pad = 0.06, xs = vals.map((_, i) => (pad + (i * (1 - 2 * pad)) / (n - 1)) * 100);
    const mx = Math.max(...vals, 0.001) * 1.15;
    const yv = (v) => 70 - (v / mx) * 58;   // % wysokości wykresu
    const pts = vals.map((v, i) => [xs[i], yv(v)]);
    const line = [[0, pts[0][1]], ...pts, [100, pts[n - 1][1]]];
    const dl = line.map((p, i) => `${i ? 'L' : 'M'}${(p[0] * W / 100).toFixed(1)},${p[1].toFixed(2)}`).join(' ');
    const area = `${dl} L${W},${Hh} L0,${Hh} Z`;
    const prev = sel > 0 ? vals[sel - 1] : null, cur = vals[sel];
    const delta = prev ? ((cur - prev) / prev) * 100 : null;
    const dd = days[sel];
    const dlab = `<b>${dd.getDate()}</b> ${H.esc(dd.toLocaleDateString(c.locale, { day: 'numeric', month: 'long' }).replace(/^\d+\s*/, ''))}`;
    const today = vals[n - 1];
    return `<ha-card class="glass"><div class="top">${hd}
      <div class="v"><b>${H.fmt(today, 1)}</b><span>${H.esc(c.caption)}</span></div></div>
      <div class="ch">
        <svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" aria-hidden="true">
          <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hg-accent)" stop-opacity=".75"/><stop offset="1" stop-color="#FBD9C4" stop-opacity=".55"/></linearGradient></defs>
          <path d="${area}" fill="url(#g)"/><path class="ln" d="${dl}"/></svg>
        <div class="band" style="left:${xs[sel]}%"></div>
        <span class="dot" style="left:${xs[sel]}%;top:${pts[sel][1]}%"></span>
        <div class="tip" style="left:${Math.min(Math.max(xs[sel], 12), 88)}%;top:${pts[sel][1]}%">${dlab}<br><b>${H.fmt(cur, 1)} kWh</b><br><span class="dl">${delta == null ? '—' : (delta >= 0 ? '↑' : '↓') + H.fmt(Math.abs(delta), 2) + '%'}</span></div>
        <div class="lb">${days.map((d, i) => `<button class="${i === sel ? 'sel' : ''}" style="left:${xs[i]}%" data-act="sel" data-i="${i}" title="${H.esc(d.toLocaleDateString(c.locale))}: ${H.fmt(vals[i], 1)} kWh">${H.DAYS[d.getDay()]}</button>`).join('')}</div>
      </div></ha-card>`;
  }
  onAct(a, el) {
    if (a === 'sel') { this._sel = Number(el.dataset.i); this.rerender(); }
    if (a === 'expand') H.action(this, this._hass, this._config.expand);
  }
  getGridOptions() { return { columns: 12, rows: 3 }; }
}
hgReg('hg-solar-card', HGSolarCard, 'Home Glass – Solar', 'Produkcja PV z ostatnich dni (statystyki)');

/* ===================== BARS (raport zużycia) ===================== */
class HGBarsCard extends HGBase {
  defaults() { return { title: 'Zużycie z sieci', icon: 'mdi:transmission-tower', statistics: [], labels: [], colors: ['var(--hg-accent)', 'var(--hg-accent)', 'var(--hg-accent)', 'var(--hg-accent)'], days: 7, unit: 'kWh', locale: 'pl-PL', expand: null, no_data: 'Brak źródła danych' }; }
  ents() { return []; }
  _extraSig() { return [this._data ? this._data.t : 0]; }
  connectedCallback() { super.connectedCallback(); this._load(); this._iv = setInterval(() => this._load(), 15 * 60 * 1000); }
  disconnectedCallback() { clearInterval(this._iv); }
  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._load(); this._update(); }
  get hass() { return this._hass; }
  async _load() {
    if (!this._hass || !this._config || this._loading) return; this._loading = true;
    try { this._data = { t: Date.now(), v: await HGStats.daily(this._hass, this._config.statistics, this._config.days) }; this._err = null; }
    catch (e) { this._err = String(e && e.message || e); }
    this._loading = false; this.rerender();
  }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; }
.sum{ display:flex; align-items:baseline; gap:var(--s1); margin-top:8u; } .sum b{ font-size:calc(15u * var(--hg-fsv, 1)); font-weight:400; } .sum span{ font-size:var(--fs-sm); color:#4D5157; }
.lg{ display:flex; gap:var(--s2); flex-wrap:wrap; font-size:var(--fs-xs); color:#4D5157; margin-top:6u; } .lg i{ display:inline-block; width:8u; height:8u; border-radius:3u; margin-right:4u; vertical-align:-1u; }
.bars{ flex:1; display:flex; align-items:flex-end; gap:var(--s1); margin-top:10u; min-height:80u; }
.b{ flex:1; display:flex; flex-direction:column; align-items:center; gap:4u; height:100%; justify-content:flex-end; }
.st{ width:100%; max-width:30u; display:flex; flex-direction:column-reverse; border-radius:var(--r-sm); overflow:hidden; background:rgba(255,255,255,.5); }
.st div{ width:100%; }
.b small{ font-size:var(--fs-xs); color:#3B3F45; } .b em{ font-style:normal; font-size:var(--fs-xs); color:#6A6E75; }
`);
  }
  render() {
    const c = this._config;
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="Rozwiń" title="Szczegóły">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
    if (this._err || (this._data && !this._data.v.has)) return `<ha-card class="glass">${hd}<div class="ph"><b>${H.esc(c.no_data)}</b>${H.esc(this._err || '')}</div></ha-card>`;
    if (!this._data) return `<ha-card class="glass">${hd}</ha-card>`;
    const { days, byId } = this._data.v;
    const rows = days.map((d) => c.statistics.map((id) => Math.max(0, byId[id][d.__k || H.dayKey(d)] || 0)));
    const tot = rows.map((r) => r.reduce((a, b) => a + b, 0)); const mx = Math.max(...tot, 0.001);
    const week = tot.reduce((a, b) => a + b, 0);
    return `<ha-card class="glass">${hd}
      <div class="sum"><b>${H.fmt(week, 1)}</b><span>${H.esc(c.unit)} · ${c.days} dni</span></div>
      <div class="lg">${c.statistics.map((id, i) => `<span><i style="background:${c.colors[i % c.colors.length]}"></i>${H.esc(c.labels[i] || id)}</span>`).join('')}</div>
      <div class="bars">${rows.map((r, i) => `<div class="b" title="${H.esc(days[i].toLocaleDateString(c.locale))}: ${H.fmt(tot[i], 1)} ${c.unit}"><em>${H.fmt(tot[i], 1)}</em>
        <div class="st" style="height:${Math.max(3, (tot[i] / mx) * 100)}%">${r.map((v, j) => `<div style="height:${tot[i] ? (v / tot[i]) * 100 : 0}%;background:${c.colors[j % c.colors.length]}"></div>`).join('')}</div>
        <small>${H.DAYS[days[i].getDay()]}</small></div>`).join('')}</div></ha-card>`;
  }
  onAct(a) { if (a === 'expand') H.action(this, this._hass, this._config.expand); }
}
hgReg('hg-bars-card', HGBarsCard, 'Home Glass – Bars', 'Dzienne zużycie z statystyk (słupki)');

/* ===================== MEDIA ===================== */
class HGMediaCard extends HGBase {
  defaults() { return { name: null, icon: 'mdi:speaker' }; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); }
.row{ display:flex; align-items:center; gap:var(--s2); min-width:0; }
.art{ width:44u; height:44u; border-radius:var(--r-sm); flex:none; background:rgba(255,255,255,.75) center/cover; display:flex; align-items:center; justify-content:center; box-shadow:var(--hg-sh); }
.art ha-icon{ width:20u; height:20u; color:#4D5157; }
.tx{ min-width:0; flex:1; } .tx b{ display:block; font-size:var(--fs-md); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tx span{ display:block; font-size:var(--fs-sm); color:#4D5157; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ctl{ display:flex; align-items:center; justify-content:center; gap:var(--s2); margin-top:auto; }
.cb{ width:max(30u, 40px); height:max(30u, 40px); border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.75); position:relative; }
.cb ha-icon{ width:20px; height:20px; } .cb.pp{ width:max(34u, 44px); height:max(34u, 44px); background:var(--hg-accent); } .cb.pp ha-icon{ width:24px; height:24px; }
@media (pointer:coarse){ .cb::before{ content:''; position:absolute; inset:-7px; } }
.playing .art{ animation: hgpulse 3s ease-in-out infinite; }
`);
  }
  render() {
    const c = this._config, s = H.st(this._hass, c.entity);
    const nm = c.name || H.name(this._hass, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${H.esc(nm)}</b>brak encji</div></ha-card>`;
    const a = s.attributes, sf = a.supported_features || 0, st = s.state;
    const pic = a.entity_picture ? `style="background-image:url('${H.esc(a.entity_picture)}')"` : '';
    const sub = [a.media_title, a.media_artist].filter(Boolean).join(' · ') || H.stateLabel(st);
    const AL = { prev: 'Poprzedni', next: 'Następny', on: 'Włącz', off: 'Wyłącz' };
    const b = (f, act, ic, cls = '') => (sf & f ? `<button class="cb ${cls}" data-act="${act}" aria-label="${AL[act]}" title="${AL[act]}">${H.icon(ic)}</button>` : '');
    const unav = st === 'unavailable';
    return `<ha-card class="glass ${st === 'playing' ? 'playing' : ''}"><div class="row"><div class="art" ${pic}>${pic ? '' : H.icon(c.icon)}</div>
      <div class="tx"><b>${H.esc(nm)}</b><span>${H.esc(sub)}</span></div>
      <button class="ib kebab" data-act="more" aria-label="Więcej" title="Więcej">${H.icon('mdi:dots-vertical')}</button></div>
      ${unav ? '' : `<div class="ctl">${b(16, 'prev', 'mdi:skip-previous')}${(sf & 1) || (sf & 16384) ? `<button class="cb pp" data-act="pp" aria-label="Odtwórz/pauza">${H.icon(st === 'playing' ? 'mdi:pause' : 'mdi:play')}</button>` : ''}${b(32, 'next', 'mdi:skip-next')}
        ${st === 'off' ? b(128, 'on', 'mdi:power') : b(256, 'off', 'mdi:power')}</div>`}</ha-card>`;
  }
  onAct(a) {
    const e = this._config.entity, id = { entity_id: e };
    const m = { prev: 'media_previous_track', next: 'media_next_track', pp: 'media_play_pause', on: 'turn_on', off: 'turn_off' };
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: e });
    if (m[a]) return H.call(this._hass, 'media_player', m[a], id);
  }
}
hgReg('hg-media-card', HGMediaCard, 'Home Glass – Media', 'Odtwarzacz w stylu glass');

/* ===================== PERSON ===================== */
const hgAvatar = (hass, e, cls = 'av') => {
  const s = H.st(hass, e); const nm = H.name(hass, e, e);
  const pic = s && s.attributes.entity_picture;
  const ini = nm.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const hues = [32, 200, 280, 140, 350]; const h = hues[[...nm].reduce((a, ch) => a + ch.charCodeAt(0), 0) % hues.length];
  return pic ? `<span class="${cls}" style="background-image:url('${H.esc(pic)}')"></span>`
    : `<span class="${cls} ini" style="background:hsl(${h},55%,50%)">${H.esc(ini)}</span>`;
};
class HGPersonCard extends HGBase {
  defaults() { return { home_label: 'W domu', away_label: 'Poza domem', locale: 'pl-PL' }; }
  css() {
    return U(`
ha-card.glass{ display:flex; align-items:center; gap:var(--s2); cursor:pointer; }
.av{ width:52u; height:52u; border-radius:var(--r-md); background:center/cover; flex:none; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:600; font-size:calc(17u * var(--hg-fsv, 1));
  box-shadow: 0 0 0 2u rgba(255,255,255,.9); }
.home .av{ box-shadow: 0 0 0 2u var(--hg-accent); }
.tx b{ display:block; font-size:var(--fs-md); font-weight:400; } .tx span{ display:flex; align-items:center; gap:4u; font-size:var(--fs-sm); color:#4D5157; margin-top:3u; }
.tx span ha-icon{ width:11u; height:11u; } .tx small{ display:block; font-size:var(--fs-xs); color:#7A7E85; margin-top:2u; }
`);
  }
  render() {
    const c = this._config, s = H.st(this._hass, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${H.esc(c.entity)}</b>brak encji</div></ha-card>`;
    const home = s.state === 'home';
    const zone = home ? c.home_label : s.state === 'not_home' ? c.away_label : H.stateLabel(s.state);
    const since = new Date(s.last_changed);
    const mins = Math.round((Date.now() - since) / 60000);
    const rel = mins < 60 ? `${mins} min` : mins < 1440 ? `${Math.round(mins / 60)} godz.` : Math.round(mins / 1440) === 1 ? '1 dnia' : `${Math.round(mins / 1440)} dni`;
    return `<ha-card class="glass ${home ? 'home' : ''}" data-act="more">${hgAvatar(this._hass, c.entity)}
      <div class="tx"><b>${H.esc(c.name || s.attributes.friendly_name)}</b><span>${H.icon(home ? 'mdi:home' : 'mdi:map-marker')}${H.esc(zone)}</span><small>od ${rel}</small></div></ha-card>`;
  }
  _extraSig() { return Math.floor(Date.now() / 60000); }
  onAct() { H.fire(this, 'hass-more-info', { entityId: this._config.entity }); }
}
hgReg('hg-person-card', HGPersonCard, 'Home Glass – Person', 'Osoba z awatarem i strefą');

/* ===================== LINK ===================== */
class HGLinkCard extends HGBase {
  defaults() { return { title: 'Otwórz', subtitle: '', icon: 'mdi:open-in-new', action: null, entity: null }; }
  css() {
    return U(`
ha-card.glass{ display:flex; align-items:center; gap:var(--s2); cursor:pointer; }
.bub{ width:34u; height:34u; border-radius:var(--r-sm); background:rgba(255,255,255,.85); display:flex; align-items:center; justify-content:center; flex:none; }
.bub ha-icon{ width:18u; height:18u; }
b{ display:block; font-size:var(--fs-md); font-weight:400; } span{ display:block; font-size:var(--fs-xs); color:#6A6E74; margin-top:2u; }
.chev{ margin-left:auto; width:16u; height:16u; color:#4D5157; }
`);
  }
  render() {
    const c = this._config; const s = c.entity && H.st(this._hass, c.entity);
    const sub = c.subtitle || (s ? H.T(this._hass, s) : '');
    return `<ha-card class="glass" data-act="go" role="link" tabindex="0"><span class="bub">${H.icon(c.icon)}</span><div><b>${H.esc(c.title)}</b><span>${H.esc(sub)}</span></div>${H.icon('mdi:chevron-right', 'chev')}</ha-card>`;
  }
  onAct() { H.action(this, this._hass, this._config.action); }
}
hgReg('hg-link-card', HGLinkCard, 'Home Glass – Link', 'Kafel nawigacji / akcji');
