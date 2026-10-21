/* hg-power-card: moc teraz (suma faz) + linia z ostatnich godzin (statystyki 5-minutowe „mean”) + cienki pasek obciążenia */
class HGPowerCard extends HGBase {
  defaults() { return { title: hgT('common.power_now'), icon: 'mdi:flash-outline', entities: [], max_power: 17250, max: null, hours: 6, chart_label: '', hide_chart_label: false, show_level: null, expand: null,
    source: 'history', forecast: false, forecast_entities: [], forecast_attribute: '', forecast_value: '', forecast_type: 'hourly', forecast_days: null, forecast_hours: null }; }
  /* moc (W, kW, MW albo device_class power) liczona w W; każda inna jednostka (kWh, Wh, %, …) pokazywana tak, jak podaje czujnik */
  _unit() { const h = this._hass; for (const e of this._config.entities) { const s = h && h.states[e]; if (s) return String(s.attributes.unit_of_measurement || '').trim(); } return ''; }
  _isPow() { const h = this._hass, u = this._unit(); if (/^(W|kW|MW)$/.test(u)) return true; if (u) return false; const s = h && h.states[this._config.entities[0]]; return !!(s && s.attributes.device_class === 'power'); }
  ents() { return this._fc() ? [...new Set(this._config.entities.concat(this._fcEnts()))] : this._config.entities; }
  /* prognoza zamiast historii: source: forecast (YAML) albo przełącznik forecast w edytorze */
  _fc() { const c = this._config; return c.source === 'forecast' || c.forecast === true; }
  _fcEnts() { const c = this._config, L = Array.isArray(c.forecast_entities) ? c.forecast_entities : c.forecast_entities ? [c.forecast_entities] : []; return L.length ? L : c.entities; }
  _fcH() { const c = this._config; return +c.forecast_hours > 0 ? +c.forecast_hours : +c.forecast_days > 0 ? +c.forecast_days * 24 : 24; }
  /* punkty prognozy [czas, wartość] na najbliższe _fcH() godzin.
     Solcast (BJReplay/ha-solcast-solar): atrybuty detailedForecast (co 30 min) / detailedHourly (co 1 h) czujników dziennych
     forecast_today, forecast_tomorrow, forecast_day_3..7; lista { period_start, pv_estimate, pv_estimate10, pv_estimate90 } w kW.
     Pogoda: akcja weather.get_forecasts (odpowiedź { encja: { forecast: [{ datetime, temperature, ... }] } }). */
  _fcPts() { const c = this._config, h = this._hass, now = Date.now(), end = now + this._fcH() * 3600000, m = new Map(), vk = c.forecast_value || '';
    const add = (L) => { for (const x of Array.isArray(L) ? L : []) { if (!x || typeof x !== 'object') continue; const t = Date.parse(x.period_start || x.datetime || x.start || ''); if (!isFinite(t)) continue;
      const k = vk || ['pv_estimate', 'value', 'temperature', 'native_temperature'].find((y) => x[y] != null); const v = parseFloat(k ? x[k] : NaN); if (!isFinite(v)) continue;
      if (t < now - 1800000 || t > end) continue; m.set(t, (m.get(t) || 0) + v); } };
    for (const e of this._fcEnts()) { if (e.startsWith('weather.')) { add(this._wx && this._wx[e]); continue; } const s = h && h.states[e]; if (!s) continue; const a = s.attributes || {};
      add(a[c.forecast_attribute || (a.detailedForecast ? 'detailedForecast' : a.detailedHourly ? 'detailedHourly' : 'forecast')]); }
    return [...m.entries()].sort((a, b) => a[0] - b[0]); }
  _extraSig() { return [this._sp ? this._sp.t : 0]; }
  connectedCallback() { super.connectedCallback(); this._load(); clearInterval(this._iv); this._iv = setInterval(() => this._load(), 5 * 60 * 1000); }
  disconnectedCallback() { clearInterval(this._iv); }
  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._load(); this._update(); }
  get hass() { return this._hass; }
  async _load() {
    const c = this._config; if (!this._hass || !c || this._loading) return;
    if (this._fc()) { const W = this._fcEnts().filter((e) => e.startsWith('weather.')); if (!W.length) return; this._loading = true;
      try { const r = await this._hass.connection.sendMessagePromise({ type: 'call_service', domain: 'weather', service: 'get_forecasts', service_data: { type: c.forecast_type || 'hourly' }, target: { entity_id: W }, return_response: true });
        const o = {}; for (const e of W) o[e] = (((r && r.response) || {})[e] || {}).forecast || []; this._wx = o; } catch (e) { this._wx = {}; }
      this._sp = { t: Date.now(), pts: [] }; this._loading = false; this.rerender(); return; }
    this._loading = true;
    try {
      const start = new Date(Date.now() - c.hours * 3600000);
      const pw = this._isPow(), r = await this._hass.callWS(Object.assign({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), period: '5minute', statistic_ids: c.entities, types: ['mean'] }, pw ? { units: { power: 'W' } } : {}));
      const m = new Map(); let rows = 0;
      for (const id of c.entities) for (const row of r[id] || []) { if (row.mean == null) continue; rows++; const t = typeof row.start === 'number' ? row.start : Date.parse(row.start); m.set(t, (m.get(t) || 0) + (pw ? Math.abs(row.mean) : row.mean)); }
      let pts = [...m.entries()].sort((a, b) => a[0] - b[0]);
      /* czujnik bez statystyk (np. prognoza bez state_class): zwykła historia stanów, kilka czujników sumowanych w punktach zmian */
      if (!rows) { const hr = await this._hass.callWS({ type: 'history/history_during_period', start_time: start.toISOString(), entity_ids: c.entities, minimal_response: true, no_attributes: true, significant_changes_only: false });
        const ser = c.entities.map((id) => (hr[id] || []).map((x) => [(x.lu || x.lc || 0) * 1000, parseFloat(x.s)]).filter((x) => isFinite(x[1]) && x[0] > 0));
        const ts = [...new Set(ser.flat().map((x) => x[0]))].sort((a, b) => a - b), idx = ser.map(() => -1);
        pts = ts.map((t) => { let v = 0; ser.forEach((S, k) => { while (idx[k] + 1 < S.length && S[idx[k] + 1][0] <= t) idx[k]++; if (idx[k] >= 0) v += S[idx[k]][1]; }); return [t, v]; });
        if (pw) { const f = { W: 1, kW: 1000, MW: 1e6 }[this._unit()] || 1; pts = pts.map((x) => [x[0], Math.abs(x[1] * f)]); } }
      this._sp = { t: Date.now(), pts };
    } catch (e) { this._sp = { t: Date.now(), pts: [] }; }
    this._loading = false; this.rerender();
  }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; padding:var(--s2) var(--s3) var(--s2); }

.v{ display:flex; align-items:baseline; gap:var(--s1); margin-top:5u; } .v b{ font-size:calc(24u * var(--hg-fsv, 1)); font-weight:300; letter-spacing:-.03em; } .v span{ font-size:var(--fs-sm); color:#5A5E64; }
.spk{ position:relative; flex:1; min-height:26u; max-height:150u; margin:4u 0 6u; }
.spk svg{ position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.gg{ position:relative; height:18u; border-radius:999px; margin-top:6u; overflow:hidden; background:repeating-linear-gradient(-55deg, rgba(128,134,140,.35) 0 2px, transparent 2px 6px); }
.gg i{ position:absolute; left:0; top:0; bottom:0; width:var(--p); min-width:18u; border-radius:999px; background:linear-gradient(90deg, var(--hg-accent), var(--hg-accent-hi)); box-shadow:0 0 12px var(--hg-accent-glow); transition:width .6s cubic-bezier(.2,.8,.2,1); }
.gl{ display:flex; justify-content:space-between; font-size:var(--fs-xs); color:#8A8E94; margin-top:3u; }
.tipb{ position:absolute; transform:translate(-100%,-130%); background:#fff; color:#1E2023; font-size:var(--fs-xs); font-weight:600; padding:3u 7u; border-radius:999px; white-space:nowrap; box-shadow:0 4px 12px rgba(0,0,0,.18); pointer-events:none; }
.dot{ position:absolute; width:8px; height:8px; margin:-4px 0 0 -4px; border-radius:50%; background:#fff; box-shadow:0 0 0 3px var(--hg-accent-soft); }
.ln{ fill:none; stroke:var(--hg-accent); stroke-width:1.6; stroke-linejoin:round; stroke-linecap:round; vector-effect:non-scaling-stroke; }
.axd{ position:relative; height:12u; font-size:var(--fs-xs); color:#8A8E94; } .axd span{ position:absolute; top:0; white-space:nowrap; padding-left:3u; }
.dl{ stroke:rgba(128,134,140,.35); stroke-width:1; stroke-dasharray:2 3; vector-effect:non-scaling-stroke; }
.ax{ display:flex; justify-content:space-between; font-size:var(--fs-xs); color:#8A8E94; }
.bar{ height:4u; border-radius:2u; background:rgba(0,0,0,.07); overflow:hidden; margin-top:6u; } .bar i{ display:block; height:100%; border-radius:2u; background:var(--hg-accent); transition:width .6s cubic-bezier(.2,.8,.2,1); }
`);
  }
  render() {
    const c = this._config, h = this._hass;
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="${hgT('cards.power.reports')}" title="${hgT('cards.power.reports')}">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
    const pw = this._isPow(), u = this._unit();
    let tot = 0, n = 0; for (const e of c.entities) { const v = pw ? hgW(h, e) : H.num(h, e); if (v != null) { tot += pw ? Math.abs(v) : v; n++; } }
    if (!n) return `<ha-card class="glass warm">${hd}<div class="ph"><b>${hgT('common.no_data_source')}</b>${pw ? hgT('cards.power.power_sensors_unavailable') : hgT('cards.power.sensors_unavailable')}</div></ha-card>`;
    const fc = this._fc(), pts = fc ? this._fcPts() : (this._sp ? this._sp.pts : []).concat([[Date.now(), tot]]);
    /* skala paska: moc z max_power (W); inne jednostki z „max” albo z największej wartości na wykresie */
    const mxV = pw ? (+c.max > 0 ? +c.max * ({ kW: 1000, MW: 1e6 }[u] || 1) : c.max_power) : (+c.max > 0 ? +c.max : Math.max(...(fc ? [] : pts).map((p) => Math.abs(p[1])), Math.abs(tot)) || 1);
    const pct = Math.max(0, Math.min(100, (tot / mxV) * 100));
    const lvl = (c.show_level ?? pw) ? (pct < 30 ? hgT('cards.power.low') : pct < 70 ? hgT('common.medium') : hgT('cards.power.high')) : '';
    const dg = (v) => (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
    const kw = pw ? (tot >= 1000 ? [H.fmt(tot / 1000, 2), 'kW'] : [H.fmt(tot, 0), 'W']) : [H.fmt(tot, dg(tot)), u];
    const sub = [kw[1], pw || +c.max > 0 ? `${H.pct(Math.round(pct))}${lvl ? ' ' + lvl : ''}` : ''].filter(Boolean).join(' · ');
    const gR = pw && !(+c.max > 0) ? H.pct(100) : `${H.fmt(pw ? mxV / (mxV >= 1000 ? 1000 : 1) : mxV, dg(pw && mxV >= 1000 ? mxV / 1000 : mxV))} ${pw ? (mxV >= 1000 ? 'kW' : 'W') : u}`.trim();
    const axL = c.chart_label ? String(c.chart_label) : fc ? hgT('common.now') : `−${c.hours} h`;
    let svg = '';
    let days = '';
    if (pts.length > 2) {
      const t0 = pts[0][0], t1 = pts[pts.length - 1][0];
      /* oś prognozy: etykiety dni (skrót dnia tygodnia) w miejscu północy; przy krótkim zakresie tylko teraz / +N h */
      if (fc && t1 - t0 > 36 * 3600000) { const D = []; const d = new Date(t0); d.setHours(24, 0, 0, 0); const wd = new Intl.DateTimeFormat(HG_LOC(), { weekday: 'short' });
        const lab = (t, ld) => `<span style="left:${(((t - t0) / (t1 - t0)) * 100).toFixed(2)}%">${H.esc(wd.format(new Date(ld)))}</span>`;
        if (d.getTime() - t0 > 6 * 3600000) D.push(lab(t0, t0)); for (; d.getTime() < t1; d.setDate(d.getDate() + 1)) if (t1 - d.getTime() > 6 * 3600000) D.push(lab(d.getTime(), d.getTime() + 3600000));
        days = `<div class="axd">${D.join('')}</div>`; }
      const mx = Math.max(...pts.map((p) => p[1]), pw ? 1 : 1e-9) * 1.1, mn = pw ? 0 : Math.min(0, ...pts.map((p) => p[1]));
      const xy = pts.map((p) => [((p[0] - t0) / Math.max(1, t1 - t0)) * 100, 100 - ((p[1] - mn) / (mx - mn || 1)) * 100]);
      const f = (v) => v.toFixed(2);
      let d = `M${f(xy[0][0])},${f(xy[0][1])}`;
      for (let i = 0; i < xy.length - 1; i++) { const p0 = xy[i - 1] || xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] || p2;
        d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`; }
      this._lastY = xy[fc ? 0 : xy.length - 1][1];
      if (fc) { this._fcTicks = pts.length > 1 ? [...new Set(pts.map((p) => new Date(p[0]).toDateString()))].slice(1).map((ds) => { const t = new Date(ds).getTime(); return ((t - t0) / Math.max(1, t1 - t0)) * 100; }) : []; }
      svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hg-accent)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--hg-accent)" stop-opacity="0"/></linearGradient></defs>
        <path d="${d} L100,100 L0,100 Z" fill="url(#pg)"/><path class="ln" d="${d}"/>${fc ? (this._fcTicks || []).map((x) => `<line class="dl" x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" y1="0" y2="100"/>`).join('') : ''}</svg>`;
    }
    const tip = pw ? `${c.entities.map((e) => H.lv(H.name(h, e), `${H.fmt(Math.abs(hgW(h, e) || 0), 0)} W`)).join(', ')} · ${H.pct(Math.round(pct))} ${hgT('common.of')} ${H.fmt(mxV / 1000, 2)} kW` : c.entities.map((e) => H.lv(H.name(h, e), `${H.fmt(H.num(h, e) ?? 0, dg(H.num(h, e) ?? 0))} ${u}`)).join(', ');
    return `<ha-card class="glass warm" title="${H.esc(tip)}">${hd}
      <div class="v"><b>${kw[0]}</b><span>${H.esc(sub)}</span></div>
      <div class="gg" style="--p:${pct.toFixed(1)}%" title="${H.esc(`${H.pct(Math.round(pct))}${lvl ? ' ' + lvl : ''}`)}"><i></i></div><div class="gl"><span>0</span><span>${H.esc(gR)}</span></div>
      <div class="spk">${svg}${svg ? `<span class="dot" style="left:${fc ? 0 : 100}%;top:${this._lastY}%"></span>${fc ? '' : `<span class="tipb" style="left:100%;top:${this._lastY}%">${kw[0]} ${H.esc(kw[1])}</span>`}` : ''}</div>${svg && !c.hide_chart_label ? (fc && days ? days : `<div class="ax">${fc ? `<span>${H.esc(axL)}</span><span>+${H.esc(String(Math.round(this._fcH())))} h</span>` : `<span>${H.esc(axL)}</span><span>${hgT('common.now')}</span>`}</div>`) : ''}
      </ha-card>`;
  }
  onAct(a) { if (a === 'expand') H.action(this, this._hass, this._config.expand); }
}
hgReg('hg-power-card', HGPowerCard, hgTLazy('cards.power.picker_name'), hgTLazy('cards.power.picker_description'));
