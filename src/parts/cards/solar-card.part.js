/* ===================== SOLAR ===================== */
class HGSolarCard extends HGBase {
  defaults() {
    return { title: hgTr('Energia słoneczna dziś', 'Solar energy today'), icon: 'mdi:solar-panel', statistic: null, today_entity: null, days: 7,
      caption: hgTr('kWh czystej energii', 'kWh of clean energy'), offline_label: hgTr('falownik offline', 'inverter offline'), locale: null, expand: null, no_data: hgTr('Brak źródła danych', 'No data source') };
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
      if (force) delete HGStats.cache[this._config.statistic + this._config.days];   // tylko własny wpis (inne karty zachowują pamięć)
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
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>${off0 ? `<span class="note" title="${H.esc(c.today_entity)}: ${hgTr('niedostępny', 'unavailable')}">${H.esc(c.offline_label)}</span>` : ''}
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="${hgTr('Rozwiń', 'Expand')}" title="${hgTr('Szczegóły', 'Details')}">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
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
    const pad = 0.06, xs = vals.map((_, i) => (n > 1 ? pad + (i * (1 - 2 * pad)) / (n - 1) : 0.5) * 100);   // days:1 -> punkt na środku
    const mx = Math.max(...vals, 0.001) * 1.15;
    const yv = (v) => 70 - (v / mx) * 58;   // % wysokości wykresu
    const pts = vals.map((v, i) => [xs[i], yv(v)]);
    const line = [[0, pts[0][1]], ...pts, [100, pts[n - 1][1]]];
    const dl = line.map((p, i) => `${i ? 'L' : 'M'}${(p[0] * W / 100).toFixed(1)},${p[1].toFixed(2)}`).join(' ');
    const area = `${dl} L${W},${Hh} L0,${Hh} Z`;
    const prev = sel > 0 ? vals[sel - 1] : null, cur = vals[sel];
    const delta = prev ? ((cur - prev) / prev) * 100 : null;
    const dd = days[sel];
    const dlab = `<b>${dd.getDate()}</b> ${H.esc(dd.toLocaleDateString(c.locale || HG_LOC(), { day: 'numeric', month: 'long' }).replace(/^\d+\s*/, ''))}`;
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
        <div class="lb">${days.map((d, i) => `<button class="${i === sel ? 'sel' : ''}" style="left:${xs[i]}%" data-act="sel" data-i="${i}" title="${H.esc(d.toLocaleDateString(c.locale || HG_LOC()))}: ${H.fmt(vals[i], 1)} kWh">${H.DAYS[d.getDay()]}</button>`).join('')}</div>
      </div></ha-card>`;
  }
  onAct(a, el) {
    if (a === 'sel') { this._sel = Number(el.dataset.i); this.rerender(); }
    if (a === 'expand') H.action(this, this._hass, this._config.expand);
  }
  getGridOptions() { return { columns: 12, rows: 3 }; }
}
hgReg('hg-solar-card', HGSolarCard, 'Home Glass – Solar', 'Produkcja PV z ostatnich dni (statystyki)');
