/* ===================== SCENY + MOC + TYDZIEŃ ENERGII (główny widok) ===================== */
/* hg-scenes-card: skrypty jako duże pigułki. Tap -> script.turn_on (w tle), fala (ripple) od miejsca dotyku, potem ✓;
   gdy skrypt działa (stan „on”) – obracający się pierścień, „Działa…”, przycisk zablokowany. */
class HGScenesCard extends HGBase {
  defaults() { return { title: 'Sceny', icon: 'mdi:play-circle-outline', scripts: [] }; }
  ents() { return this._config.scripts.map((x) => x.entity); }
  _extraSig() { return [this._ok || '']; }
  css() {
    return U(`
.hd{ min-height:16u; }
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); padding:var(--s2) var(--s2) var(--s2); height:auto; }
.row{ display:grid; grid-template-columns:1fr 1fr; gap:var(--s1); }
.p{ position:relative; overflow:hidden; display:flex; align-items:center; gap:10px; height:52px; padding:0 12px 0 10px; border-radius:var(--r-md); min-width:0;
  background:var(--hg-tile-bg); border:0; box-shadow:0 4px 14px rgba(0,0,0,.12); text-align:left; cursor:pointer; transition:background .3s, transform .15s cubic-bezier(.2,0,0,1), box-shadow .2s; }
.p:focus-visible{ outline:none; box-shadow:0 0 0 2px var(--hg-accent); }
.p.ok{ background:var(--hg-accent-soft); } .p.ok .ic{ background:var(--hg-accent) !important; color:var(--hg-on-accent) !important; }
.p:active{ transform:scale(.96); } .p[disabled]{ cursor:default; }
.ic{ position:relative; width:32px; height:32px; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; background:var(--hg-accent-faint); color:var(--hg-accent-tx); transition:background .3s; }
.ic ha-icon{ width:18px; height:18px; }
.run .ic::after{ content:''; position:absolute; inset:-3px; border-radius:50%; border:2px solid transparent; border-top-color:var(--c); border-right-color:var(--c); animation:hgspin 1s linear infinite; }
.run{ opacity:.85; }
 .ok .ic ha-icon{ animation:hgpop .45s cubic-bezier(.2,.8,.2,1.4); }
@keyframes hgpop{ 0%{ transform:scale(.3); opacity:0 } 100%{ transform:scale(1); opacity:1 } }
.tx{ min-width:0; font-size:min(var(--fs-md), 15px); font-weight:600; letter-spacing:-.005em; line-height:1.15; white-space:nowrap; }
.row{ container-type:inline-size; }
/* za wąsko na ikonę obok etykiety (każdy przycisk < ~135px): ikona nad etykietą, bez ucinania */
@container (max-width: 280px){ .p{ flex-direction:column; justify-content:center; gap:4px; padding:6px 4px; height:auto; min-height:64px; text-align:center; } .tx{ font-size:min(var(--fs-sm), 13px); } }
.rp{ position:absolute; width:20u; height:20u; margin:-10u 0 0 -10u; border-radius:50%; background:var(--c); opacity:.3; pointer-events:none; transform:scale(0); animation:hgrip .6s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes hgrip{ to{ transform:scale(16); opacity:0 } }
.un{ opacity:.5; }
`);
  }
  render() {
    const c = this._config;
    const items = c.scripts.map((x, i) => {
      const s = H.st(this._hass, x.entity), un = !H.ok(s), run = s && s.state === 'on', ok = this._ok === x.entity && !run;
      const nm = x.name || (s && s.attributes.friendly_name) || x.entity;
      const sub = un ? 'niedostępny' : run ? 'działa…' : ok ? 'uruchomiono' : 'uruchom';
      return `<button class="p lift ${run ? 'run' : ''} ${ok ? 'ok' : ''} ${un ? 'un' : ''}" style="--c:${x.color || 'var(--hg-accent)'}" data-act="run" data-i="${i}" ${un || run ? 'disabled' : ''} aria-label="${H.esc(nm)}: ${sub}" title="${H.esc(nm)} – ${sub}" aria-busy="${!!run}">
        <span class="ic">${H.icon(ok ? 'mdi:check' : x.icon || (s && s.attributes.icon) || 'mdi:play')}</span><span class="tx">${H.esc(nm)}</span></button>`;
    }).join('');
    return `<ha-card class="glass"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span></div><div class="row">${items}</div></ha-card>`;
  }
  onAct(a, t, e) {
    if (a !== 'run') return;
    const x = this._config.scripts[Number(t.dataset.i)]; if (!x) return;
    const r = t.getBoundingClientRect(), px = (e && e.clientX ? e.clientX : r.left + r.width / 2) - r.left, py = (e && e.clientY ? e.clientY : r.top + r.height / 2) - r.top;
    const rp = document.createElement('i'); rp.className = 'rp'; rp.style.left = px + 'px'; rp.style.top = py + 'px'; t.appendChild(rp);
    H.call(this._hass, 'script', 'turn_on', { entity_id: x.entity });
    clearTimeout(this._okT); clearTimeout(this._okT2);
    this._okT2 = setTimeout(() => { this._ok = x.entity; this.rerender(); this._okT = setTimeout(() => { this._ok = ''; this.rerender(); }, 2200); }, 420);
  }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-scenes-card', HGScenesCard, 'Home Glass – Sceny', 'Skrypty jako przyciski z animacją potwierdzenia');

/* hg-power-card: moc teraz (suma faz) + linia z ostatnich godzin (statystyki 5-minutowe „mean”) + cienki pasek obciążenia */
class HGPowerCard extends HGBase {
  defaults() { return { title: 'Moc teraz', icon: 'mdi:flash-outline', entities: [], max_power: 17250, hours: 6, expand: null }; }
  ents() { return this._config.entities; }
  _extraSig() { return [this._sp ? this._sp.t : 0]; }
  connectedCallback() { super.connectedCallback(); this._load(); clearInterval(this._iv); this._iv = setInterval(() => this._load(), 5 * 60 * 1000); }
  disconnectedCallback() { clearInterval(this._iv); }
  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._load(); this._update(); }
  get hass() { return this._hass; }
  async _load() {
    const c = this._config; if (!this._hass || !c || this._loading) return; this._loading = true;
    try {
      const start = new Date(Date.now() - c.hours * 3600000);
      const r = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), period: '5minute', statistic_ids: c.entities, types: ['mean'], units: { power: 'W' } });
      const m = new Map();
      for (const id of c.entities) for (const row of r[id] || []) { const t = typeof row.start === 'number' ? row.start : Date.parse(row.start); m.set(t, (m.get(t) || 0) + Math.abs(row.mean || 0)); }
      this._sp = { t: Date.now(), pts: [...m.entries()].sort((a, b) => a[0] - b[0]) };
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
.ax{ display:flex; justify-content:space-between; font-size:var(--fs-xs); color:#8A8E94; }
.bar{ height:4u; border-radius:2u; background:rgba(0,0,0,.07); overflow:hidden; margin-top:6u; } .bar i{ display:block; height:100%; border-radius:2u; background:var(--hg-accent); transition:width .6s cubic-bezier(.2,.8,.2,1); }
`);
  }
  render() {
    const c = this._config, h = this._hass;
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="Raporty" title="Raporty">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
    let tot = 0, n = 0; for (const e of c.entities) { const v = H.num(h, e); if (v != null) { tot += Math.abs(v); n++; } }
    if (!n) return `<ha-card class="glass warm">${hd}<div class="ph"><b>Brak źródła danych</b>Czujniki mocy niedostępne</div></ha-card>`;
    const pct = Math.max(0, Math.min(100, (tot / c.max_power) * 100));
    const lvl = pct < 30 ? 'Niskie' : pct < 70 ? 'Średnie' : 'Wysokie';
    const kw = tot >= 1000 ? [H.fmt(tot / 1000, 2), 'kW'] : [H.fmt(tot, 0), 'W'];
    const pts = (this._sp ? this._sp.pts : []).concat([[Date.now(), tot]]);
    let svg = '';
    if (pts.length > 2) {
      const t0 = pts[0][0], t1 = pts[pts.length - 1][0], mx = Math.max(...pts.map((p) => p[1]), 1) * 1.1;
      const xy = pts.map((p) => [((p[0] - t0) / Math.max(1, t1 - t0)) * 100, 100 - (p[1] / mx) * 100]);
      const f = (v) => v.toFixed(2);
      let d = `M${f(xy[0][0])},${f(xy[0][1])}`;
      for (let i = 0; i < xy.length - 1; i++) { const p0 = xy[i - 1] || xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] || p2;
        d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`; }
      this._lastY = xy[xy.length - 1][1];
      svg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hg-accent)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--hg-accent)" stop-opacity="0"/></linearGradient></defs>
        <path d="${d} L100,100 L0,100 Z" fill="url(#pg)"/><path class="ln" d="${d}"/></svg>`;
    }
    const tip = `${c.entities.map((e) => `${H.name(h, e)}: ${H.fmt(Math.abs(H.num(h, e) || 0), 0)} W`).join(', ')} · ${Math.round(pct)}% z ${H.fmt(c.max_power / 1000, 2)} kW`;
    return `<ha-card class="glass warm" title="${H.esc(tip)}">${hd}
      <div class="v"><b>${kw[0]}</b><span>${kw[1]} · ${Math.round(pct)}% ${lvl}</span></div>
      <div class="gg" style="--p:${pct.toFixed(1)}%" title="${Math.round(pct)}% ${lvl}"><i></i></div><div class="gl"><span>0</span><span>100%</span></div>
      <div class="spk">${svg}${svg ? `<span class="dot" style="left:100%;top:${this._lastY}%"></span><span class="tipb" style="left:100%;top:${this._lastY}%">${kw[0]} ${kw[1]}</span>` : ''}</div>${svg ? `<div class="ax"><span>−${c.hours} h</span><span>teraz</span></div>` : ''}
      </ha-card>`;
  }
  onAct(a) { if (a === 'expand') H.action(this, this._hass, this._config.expand); }
}
hgReg('hg-power-card', HGPowerCard, 'Home Glass – Moc', 'Moc teraz z linią z ostatnich godzin');

/* hg-script-card: kafel uruchamiający skrypt. Tap -> script.turn_on (w tle), fala (ripple) od miejsca dotyku, potem ✓;
   gdy skrypt działa (stan „on”) – obracający się pierścień, „Działa…”, przycisk zablokowany. */
class HGScriptCard extends HGBase {
  defaults() { return { name: null, icon: null, subtitle: 'Dotknij, aby uruchomić', color: 'var(--hg-accent)' }; }
  _extraSig() { return [this._ok ? 1 : 0]; }
  css() {
    return U(`
ha-card.glass{ padding:0; }
.b{ position:relative; width:100%; height:100%; display:flex; flex-direction:column; align-items:flex-start; justify-content:space-between; gap:var(--s1); padding:var(--s2) var(--s2); text-align:left; overflow:hidden; border-radius:inherit; }
.b[disabled]{ cursor:default; }
.ic{ position:relative; width:34u; height:34u; border-radius:var(--r-sm); display:flex; align-items:center; justify-content:center; background:#fff; color:var(--c); box-shadow:var(--hg-sh); transition:background .3s, color .3s; }
.ic ha-icon{ width:18u; height:18u; transition:transform .3s cubic-bezier(.2,.8,.2,1), opacity .2s; }
.run .ic{ background:var(--c); color:#fff; }
.run .ic::after{ content:''; position:absolute; inset:-4u; border-radius:var(--r-md); border:2u solid transparent; border-top-color:var(--c); border-right-color:var(--c); animation:hgspin 1s linear infinite; }
.ok .ic{ background:var(--hg-accent); color:var(--hg-on-accent); } .ok .ic ha-icon{ animation:hgpop .45s cubic-bezier(.2,.8,.2,1.4); }
@keyframes hgpop{ 0%{ transform:scale(.3); opacity:0 } 100%{ transform:scale(1); opacity:1 } }
.tx b{ display:block; font-size:var(--fs-md); font-weight:600; letter-spacing:-.01em; }
.tx span{ display:block; font-size:var(--fs-xs); color:#5A5E64; margin-top:2u; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.run .tx span{ color:var(--c); font-weight:400; } .ok .tx span{ color:var(--hg-accent-tx); font-weight:400; }
.rp{ position:absolute; width:20u; height:20u; margin:-10u 0 0 -10u; border-radius:50%; background:var(--c); opacity:.35; pointer-events:none; transform:scale(0); animation:hgrip .6s cubic-bezier(.2,.8,.2,1) forwards; }
@keyframes hgrip{ to{ transform:scale(18); opacity:0 } }
.un{ opacity:.55; }
`);
  }
  render() {
    const c = this._config, s = H.st(this._hass, c.entity);
    const un = !H.ok(s), run = s && s.state === 'on', ok = this._ok && !run;
    const nm = c.name || (s && s.attributes.friendly_name) || c.entity;
    const ic = ok ? 'mdi:check' : c.icon || (s && s.attributes.icon) || 'mdi:script-text-play-outline';
    const sub = un ? 'Skrypt niedostępny' : run ? 'Działa…' : ok ? 'Uruchomiono' : c.subtitle;
    return `<ha-card class="glass ${run ? 'run' : ''} ${ok ? 'ok' : ''} ${un ? 'un' : ''}" style="--c:${c.color}">
      <button class="b" data-act="run" ${un || run ? 'disabled' : ''} aria-label="${H.esc(nm)}: ${H.esc(sub)}" aria-busy="${!!run}">
        <span class="ic">${H.icon(ic)}</span><span class="tx"><b>${H.esc(nm)}</b><span>${H.esc(sub)}</span></span></button></ha-card>`;
  }
  onAct(a, t, e) {
    if (a !== 'run') return;
    const r = t.getBoundingClientRect(), x = (e && e.clientX ? e.clientX : r.left + r.width / 2) - r.left, y = (e && e.clientY ? e.clientY : r.top + r.height / 2) - r.top;
    const rp = document.createElement('i'); rp.className = 'rp'; rp.style.left = x + 'px'; rp.style.top = y + 'px'; t.appendChild(rp); setTimeout(() => rp.remove(), 650);
    H.call(this._hass, 'script', 'turn_on', { entity_id: this._config.entity });
    clearTimeout(this._okT);
    setTimeout(() => { this._ok = true; this.rerender(); this._okT = setTimeout(() => { this._ok = false; this.rerender(); }, 2200); }, 280);
  }
  getGridOptions() { return { columns: 3, rows: 2 }; }
}
hgReg('hg-script-card', HGScriptCard, 'Home Glass – Skrypt', 'Kafel uruchamiający skrypt z animacją potwierdzenia');

/* hg-week-card: zużycie z sieci i produkcja PV z 7 dni (statystyki długoterminowe, typ „change”, okres dzień, dni wg strefy HA).
   Te same statystyki co panel Energia HA (energy/get_prefs: grid stat_energy_from, solar stat_energy_from). */
class HGWeekCard extends HGBase {
  defaults() {
    return { title: 'Energia · tydzień', icon: 'mdi:chart-bar', days: 7, consumption: [], production: [], expand: null,
      labels: { consumption: 'Zużycie', production: 'Produkcja' }, colors: { consumption: 'var(--hg-accent)', production: 'var(--hg-accent-lo)' } };
  }
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
`);
  }
  render() {
    const c = this._config;
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="Panel energii" title="Panel energii">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
    if (this._err) return `<ha-card class="glass">${hd}<div class="ph"><b>Brak źródła danych</b>${H.esc(this._err)}</div></ha-card>`;
    if (!this._data) return `<ha-card class="glass">${hd}<div class="ph">Wczytywanie statystyk…</div></ha-card>`;
    const { days, byId, present } = this._data.v, n = days.length;
    const ser = ['consumption', 'production'].filter((k) => c[k].length).map((k) => {
      const vals = days.map((d) => c[k].reduce((a, id) => a + Math.max(0, (byId[id] || {})[d.__k] || 0), 0));
      const has = days.map((d) => c[k].some((id) => present[id] && present[id].has(d.__k)));
      return { k, vals, has, tot: vals.reduce((a, b) => a + b, 0), color: c.colors[k], label: c.labels[k] };
    });
    const hide = this._hide || new Set(), vis = ser.filter((s) => !hide.has(s.k));
    const mx = Math.max(0.001, ...vis.flatMap((s) => s.vals)), sel = this._sel;
    const sums = ser.map((s) => `<button class="sm ${hide.has(s.k) ? 'off' : ''}" data-act="ser" data-k="${s.k}" style="--c:${s.color}" aria-pressed="${!hide.has(s.k)}" title="${H.esc(s.label)}: pokaż/ukryj na wykresie">
      <small><i></i>${H.esc(s.label)} · 7 dni</small><b>${H.fmt(s.tot, 1)}<em>kWh · dziś ${H.fmt(s.vals[n - 1], 1)}</em></b></button>`).join('');
    const dayName = (d, i) => (i === n - 1 ? 'dziś' : H.DAYS[d.getDay()]);
    const cols = days.map((d, i) => {
      const pm = Math.max(0, ...vis.map((s) => (s.has[i] ? s.vals[i] : 0)));
      const bars = vis.map((s) => (!s.has[i] ? `<i class="nd" title="brak danych"></i>` : `<i style="--c:${s.color};--h:${pm > 0 ? (s.vals[i] / pm) * 100 : 0}%;animation-delay:${i * 35}ms"></i>`)).join('');
      const tip = sel === i ? `<span class="tip">${H.esc(d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }))}${i === n - 1 ? ' (do teraz)' : ''}<br>${ser.map((s) => `<i style="background:${s.color}"></i>${H.esc(s.label)}: <b>${s.has[i] ? H.fmt(s.vals[i], 2) + ' kWh' : 'brak danych'}</b>`).join('<br>')}</span>` : '';
      const top = vis[0] && vis[0].has[i] ? `<span class="val">${H.fmt(vis[0].vals[i], 1)}</span>` : '';
      const pair = `<span class="pr" style="height:${(pm / mx) * 100}%">${top}${bars}</span>`;
      return `<button class="d ${sel === i ? 'sel' : ''} ${i === n - 1 ? 'today' : ''}" data-act="day" data-i="${i}" aria-label="${H.esc(d.toLocaleDateString('pl-PL'))}: ${ser.map((s) => `${s.label} ${s.has[i] ? H.fmt(s.vals[i], 1) + ' kWh' : 'brak danych'}`).join(', ')}">${tip}<span class="bs"><span class="bw">${pair}</span></span><small>${dayName(d, i)}</small></button>`;
    }).join('');
    const pv = ser.find((s) => s.k === 'production');
    const gaps = pv ? days.filter((d, i) => !pv.has[i]).map((d, i) => d) : [];
    const note = gaps.length ? `<div class="note" title="W te dni falownik nie przesłał danych do HA"><i></i>brak danych z falownika (${gaps.map((d) => H.DAYS[d.getDay()]).join(', ')})</div>` : '';
    return `<ha-card class="glass">${hd}<div class="sums">${sums}</div><div class="ch" style="--n:${n}">${cols}</div>${note}</ha-card>`;
  }
  onAct(a, t) {
    if (a === 'day') { const i = Number(t.dataset.i); this._sel = this._sel === i ? null : i; return this.rerender(); }
    if (a === 'ser') { const h = this._hide = this._hide || new Set(); const k = t.dataset.k; if (h.has(k)) h.delete(k); else { h.clear(); h.add(k); } return this.rerender(); }   // nigdy oba ukryte: druga seria przełącza widok
    if (a === 'expand') H.action(this, this._hass, this._config.expand);
  }
  getGridOptions() { return { columns: 12, rows: 3 }; }
}
hgReg('hg-week-card', HGWeekCard, 'Home Glass – Energia tydzień', 'Zużycie z sieci i produkcja PV z 7 dni (statystyki)');
