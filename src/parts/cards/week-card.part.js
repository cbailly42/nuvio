/* hg-week-card: zużycie z sieci i produkcja PV z 7 dni (statystyki długoterminowe, typ „change”, okres dzień, dni wg strefy HA).
   Te same statystyki co panel Energia HA (energy/get_prefs: grid stat_energy_from, solar stat_energy_from). */
class HGWeekCard extends HGBase {
  defaults() {
    return { title: hgTr('Energia · tydzień', 'Energy · week'), icon: 'mdi:chart-bar', days: 7, consumption: [], production: [], expand: null,
      labels: { consumption: hgTr('Zużycie', 'Consumption'), production: hgTr('Produkcja', 'Production') }, colors: { consumption: 'var(--hg-accent)', production: 'var(--hg-accent-lo)' } };
  }
  setConfig(c) { super.setConfig(hgDeep(this.defaults(), c)); }
  ents() { return []; }
  _extraSig() { return [this._data ? this._data.t : 0, this._sel, this._hide ? [...this._hide].join() : '']; }
  connectedCallback() { super.connectedCallback(); this._load(); clearInterval(this._iv); this._iv = setInterval(() => this._load(true), 5 * 60 * 1000);
    this._vis = () => { if (!document.hidden) this._load(); }; document.addEventListener('visibilitychange', this._vis); }
  disconnectedCallback() { clearInterval(this._iv); document.removeEventListener('visibilitychange', this._vis); }
  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._load(); this._update(); }
  get hass() { return this._hass; }
  async _load(force) {
    const c = this._config; if (!this._hass || !c || this._loading) return;
    this._loading = true;
    try {
      const ids = c.consumption.concat(c.production);
      if (force) delete HGStats.cache[ids.join(',') + c.days];
      const v = await HGStats.daily(this._hass, ids, c.days);
      this._data = { t: Date.now(), v }; this._err = null;
    } catch (e) { this._err = String(e && e.message || e); }
    this._loading = false; this.rerender();
  }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); padding:var(--s2) var(--s3) var(--s2); }
.sums{ display:flex; gap:var(--s3); flex-wrap:wrap; }
.sm{ position:relative; display:flex; flex-direction:column; align-items:flex-start; text-align:left; min-height:var(--hg-tgt, 0px); justify-content:center; transition:opacity .2s; }
.sm.off{ opacity:.4; }
.sm small{ font-size:var(--fs-xs); color:#5A5E64; display:flex; align-items:center; gap:4u; } .sm small i{ width:6u; height:6u; border-radius:50%; background:var(--c); }
.sm b{ font-size:calc(18u * var(--hg-fsv, 1)); font-weight:300; letter-spacing:-.01em; } .sm b em{ font-style:normal; font-size:var(--fs-xs); font-weight:400; color:#5A5E64; margin-left:3u; }
.ch{ position:relative; flex:1; min-height:60u; max-height:200u; display:grid; grid-template-columns:repeat(var(--n), 1fr); }
.ch::after{ content:''; position:absolute; left:0; right:0; bottom:15u; height:1px; background:rgba(30,32,36,.12); pointer-events:none; }
.d{ position:relative; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:5u; border-radius:var(--r-sm); padding-top:3u; min-width:0; }
.d.sel{ background:var(--hg-tile-bg); }
.bs{ position:relative; flex:1; min-height:0; width:100%; }
/* absolutnie pozycjonowany kontener => procentowe wysokości słupków liczone od stałej wysokości wykresu */
.bw{ position:absolute; left:0; right:0; top:13u; bottom:0; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; }
.pr{ position:relative; display:flex; align-items:flex-end; justify-content:center; gap:3u; min-height:1px; }
.pr i{ display:block; width:7u; height:var(--h); min-height:2px; border-radius:999px; background:linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 25%, transparent)); transform-origin:bottom; animation:hgbar .6s cubic-bezier(.2,.8,.2,1) both; }
.today .pr i{ opacity:.5; }
.pr i.nd{ width:5u; height:5u; min-height:0; border-radius:50%; background:#C3C6CA; animation:none; margin:0 1u -2.5u; }
@keyframes hgbar{ from{ transform:scaleY(0) } }
.d small{ font-size:var(--fs-xs); color:#5A5E64; line-height:10u; height:10u; } .d.today small{ color:#1E2023; font-weight:600; }
.val{ position:absolute; bottom:calc(100% + 1u); left:50%; transform:translateX(-50%); font-size:var(--fs-xs); color:#3B3F45; white-space:nowrap; line-height:12u; }
.today .val{ font-weight:600; }
.tip{ position:absolute; bottom:calc(100% + 2u); left:50%; transform:translateX(-50%); background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:var(--r-sm); padding:var(--s1) var(--s2); font-size:var(--fs-xs); line-height:1.4; white-space:nowrap; color:#2B2E33; box-shadow:var(--hg-sh);
  z-index:5; pointer-events:none; text-align:left; }
.tip b{ font-weight:600; } .tip i{ display:inline-block; width:6u; height:6u; border-radius:50%; margin-right:4u; }
.d:nth-child(-n+2) .tip{ left:0; transform:none; } .d:nth-last-child(-n+2) .tip{ left:auto; right:0; transform:none; }
.note{ font-size:var(--fs-xs); color:#8A8E94; display:flex; align-items:center; gap:5u; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.note i{ width:5u; height:5u; border-radius:50%; background:#C3C6CA; flex:none; }
.hd .tt{ min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
ha-card.glass{ container-type:inline-size; }
/* wąska karta (S): sumy obok siebie, wartości nad słupkami tylko dla dziś (reszta po dotknięciu dnia) */
@container (max-width: 300px){ .nd2{ display:none; } .sums{ display:grid; grid-template-columns:1fr 1fr; gap:var(--s1); } .sm{ min-width:0; } .sm small{ white-space:nowrap; }
  .sm b{ font-size:calc(15u * var(--hg-fsv, 1)); display:flex; flex-direction:column; } .sm b em{ margin-left:0; white-space:nowrap; }
  .d:not(.today) .val{ display:none; } .pr{ gap:2u; } .pr i{ width:5u; } }
@container (max-width: 380px){ .d:not(.today):not(:nth-child(even)) .val{ display:none; } }
`);
  }
  render() {
    const c = this._config;
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="${hgTr('Panel energii', 'Energy dashboard')}" title="${hgTr('Panel energii', 'Energy dashboard')}">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
    if (this._err) return `<ha-card class="glass">${hd}<div class="ph"><b>${hgTr('Brak źródła danych', 'No data source')}</b>${H.esc(this._err)}</div></ha-card>`;
    if (!this._data) return `<ha-card class="glass">${hd}<div class="ph">${hgTr('Wczytywanie statystyk…', 'Loading statistics…')}</div></ha-card>`;
    const { days, byId, present } = this._data.v, n = days.length;
    const ser = ['consumption', 'production'].filter((k) => c[k].length).map((k) => {
      const vals = days.map((d) => c[k].reduce((a, id) => a + Math.max(0, (byId[id] || {})[d.__k] || 0), 0));
      const has = days.map((d) => c[k].some((id) => present[id] && present[id].has(d.__k)));
      return { k, vals, has, tot: vals.reduce((a, b) => a + b, 0), color: c.colors[k], label: c.labels[k] };
    });
    const hide = this._hide || new Set(), vis = ser.filter((s) => !hide.has(s.k));
    const mx = Math.max(0.001, ...vis.flatMap((s) => s.vals)), sel = this._sel;
    const sums = ser.map((s) => `<button class="sm ${hide.has(s.k) ? 'off' : ''}" data-act="ser" data-k="${s.k}" style="--c:${s.color}" aria-pressed="${!hide.has(s.k)}" title="${H.esc(s.label)}: ${hgTr('pokaż/ukryj na wykresie', 'show/hide on chart')}">
      <small><i></i><span>${H.esc(s.label)}<span class="nd2"> · ${n} ${hgTr('dni', 'days')}</span></span></small><b>${H.fmt(s.tot, 1)}<em>kWh · ${hgTr('dziś', 'today')} ${H.fmt(s.vals[n - 1], 1)}</em></b></button>`).join('');
    const dayName = (d, i) => (i === n - 1 ? hgTr('dziś', 'today') : H.DAYS[d.getDay()]);
    const cols = days.map((d, i) => {
      const pm = Math.max(0, ...vis.map((s) => (s.has[i] ? s.vals[i] : 0)));
      const bars = vis.map((s) => (!s.has[i] ? `<i class="nd" title="${hgTr('brak danych', 'no data')}"></i>` : `<i style="--c:${s.color};--h:${pm > 0 ? (s.vals[i] / pm) * 100 : 0}%;animation-delay:${i * 35}ms"></i>`)).join('');
      const tip = sel === i ? `<span class="tip">${H.esc(d.toLocaleDateString(HG_LOC(), { weekday: 'long', day: 'numeric', month: 'long' }))}${i === n - 1 ? hgTr(' (do teraz)', ' (so far)') : ''}<br>${ser.map((s) => `<i style="background:${s.color}"></i>${H.esc(s.label)}: <b>${s.has[i] ? H.fmt(s.vals[i], 2) + ' kWh' : hgTr('brak danych', 'no data')}</b>`).join('<br>')}</span>` : '';
      const top = vis[0] && vis[0].has[i] ? `<span class="val">${H.fmt(vis[0].vals[i], 1)}</span>` : '';
      const pair = `<span class="pr" style="height:${(pm / mx) * 100}%">${top}${bars}</span>`;
      return `<button class="d ${sel === i ? 'sel' : ''} ${i === n - 1 ? 'today' : ''}" data-act="day" data-i="${i}" aria-label="${H.esc(d.toLocaleDateString(HG_LOC()))}: ${ser.map((s) => `${s.label} ${s.has[i] ? H.fmt(s.vals[i], 1) + ' kWh' : hgTr('brak danych', 'no data')}`).join(', ')}">${tip}<span class="bs"><span class="bw">${pair}</span></span><small>${dayName(d, i)}</small></button>`;
    }).join('');
    const pv = ser.find((s) => s.k === 'production');
    const gaps = pv ? days.filter((d, i) => !pv.has[i]).map((d, i) => d) : [];
    const note = gaps.length ? `<div class="note" title="${hgTr('W te dni falownik nie przesłał danych do HA', 'The inverter sent no data to HA on these days')}"><i></i>${hgTr('brak danych z falownika', 'no inverter data')} (${gaps.map((d) => H.DAYS[d.getDay()]).join(', ')})</div>` : '';
    return `<ha-card class="glass">${hd}<div class="sums">${sums}</div><div class="ch" style="--n:${n}">${cols}</div>${note}</ha-card>`;
  }
  onAct(a, t) {
    if (a === 'day') { const i = Number(t.dataset.i); this._sel = this._sel === i ? null : i; return this.rerender(); }
    if (a === 'ser') { const h = this._hide = this._hide || new Set(); const k = t.dataset.k; if (h.has(k)) h.delete(k); else { h.clear(); h.add(k); } return this.rerender(); }   // nigdy oba ukryte: druga seria przełącza widok
    if (a === 'expand') H.action(this, this._hass, this._config.expand);
  }
  getGridOptions() { return { columns: 12, rows: 3 }; }
}
hgReg('hg-week-card', HGWeekCard, hgTr('Home Glass – Energia tydzień', 'Home Glass – Energy week'), hgTr('Zużycie z sieci i produkcja PV z 7 dni (statystyki)', 'Grid consumption and PV production over 7 days (statistics)'));
