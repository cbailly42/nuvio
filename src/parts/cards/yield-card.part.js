/* hg-yield-card: prognoza produkcji na kolejne dni, jeden czujnik na dzień (pierwszy = dziś), stan = energia dnia.
   Ocena dnia: z mocą instalacji (capacity, liczba albo encja) uzysk na kW porównany z progami good / poor, bez niej względem najlepszego dnia okresu. */
class HGYieldCard extends HGBase {
  static getStubConfig(h) { const S = (h && h.states) || {}; return { entities: Object.keys(S).filter((e) => hgDom(e) === 'sensor' && S[e].attributes.device_class === 'energy' && hgNum(S[e])).slice(0, 7) }; }
  defaults() { return { entities: [], title: null, icon: 'mdi:calendar-weather', capacity: null, good: 3.5, poor: 1.5, unit: null, decimals: 1 }; }
  ents() { const c = this._config; return [...(c.entities || []), ...(typeof c.capacity === 'string' && c.capacity.includes('.') && !isFinite(+c.capacity) ? [c.capacity] : [])]; }
  _extraSig() { return [this._sel, new Date().getDate()]; }
  /* moc odniesienia w kW: liczba z konfiguracji albo stan encji (W zamieniane na kW) */
  _cap() { const c = this._config, v = c.capacity; if (v == null || v === '') return null;
    if (isFinite(+v)) return +v > 0 ? +v : null;
    const s = H.st(this._hass, v); if (!H.ok(s) || !isFinite(parseFloat(s.state))) return null;
    const n = parseFloat(s.state), u = String(s.attributes.unit_of_measurement || '').toLowerCase();
    const kw = u === 'w' || u === 'wp' ? n / 1000 : u === 'mw' || u === 'mwp' ? n * 1000 : n; return kw > 0 ? kw : null; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); padding:var(--s2) var(--s3) var(--s2); container-type:inline-size; }
.hd .tt{ min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sum{ display:flex; align-items:baseline; gap:var(--s2); flex-wrap:wrap; }
.sum b{ font-size:calc(18u * var(--hg-fsv, 1)); font-weight:var(--hg-fw-num, 300); letter-spacing:-.01em; } .sum b em{ font-style:normal; font-size:var(--fs-xs); font-weight:400; color:#5A5E64; margin-left:3u; }
.lv{ font-size:var(--fs-xs); font-weight:600; padding:3px 10px; border-radius:var(--hg-radius-pill, 999px); color:#111214; background:var(--c); white-space:nowrap; }
.lg{ display:flex; gap:var(--s2); flex-wrap:wrap; font-size:var(--fs-xs); color:#5A5E64; } .lg span{ display:inline-flex; align-items:center; gap:4u; } .lg i{ width:6u; height:6u; border-radius:50%; background:var(--c); }
.ch{ position:relative; flex:1 0 auto; min-height:190px; display:grid; grid-template-columns:repeat(var(--n), 1fr); gap:2px; }
.ch::after{ content:''; position:absolute; left:0; right:0; bottom:22px; height:1px; background:rgba(30,32,36,.14); pointer-events:none; }
.d{ all:unset; box-sizing:border-box; cursor:pointer; position:relative; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:6px; border-radius:var(--r-sm); padding-top:3u; min-width:0; }
.d:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:-2px; }
.d.sel{ background:var(--hg-tile-bg); }
.bs{ position:relative; flex:1; min-height:0; width:100%; }
.bw{ position:absolute; left:0; right:0; top:20px; bottom:0; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; }
.pr{ position:relative; display:flex; align-items:flex-end; justify-content:center; min-height:6px; transition:height var(--hg-t-slow, 320ms) var(--hg-ease-out, ease-out); }
.pr i{ display:block; width:clamp(9px, calc(100cqi / var(--n) * .38), 32px); height:100%; min-height:8px; border-radius:999px; background:linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 25%, transparent)); transform-origin:bottom; animation:hgbar .6s cubic-bezier(.2,.8,.2,1) both; }
.pr i.z{ min-height:2px; opacity:.35; }
.pr i.nd{ width:5u; height:5u; min-height:0; border-radius:50%; background:#C3C6CA; animation:none; margin-bottom:-2.5u; }
@keyframes hgbar{ from{ transform:scaleY(0) } }
.d small{ font-size:max(12px, var(--fs-xs)); color:#5A5E64; line-height:16px; height:16px; white-space:nowrap; } .d small .ln{ display:none; } .d.today small{ color:#1E2023; font-weight:600; }
.val{ position:absolute; bottom:calc(100% + 3px); left:50%; transform:translateX(-50%); font-size:max(12.5px, var(--fs-xs)); font-weight:500; color:#3B3F45; white-space:nowrap; line-height:16px; }
.today .val, .best .val{ font-weight:600; }
.tip{ position:absolute; bottom:calc(100% + 2u); left:50%; transform:translateX(-50%); background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:var(--r-sm); padding:var(--s1) var(--s2); font-size:var(--fs-xs); line-height:1.4; white-space:nowrap; color:#2B2E33; box-shadow:var(--hg-sh);
  z-index:5; pointer-events:none; text-align:left; }
.tip b{ font-weight:600; } .tip i{ display:inline-block; width:6u; height:6u; border-radius:50%; margin-right:4u; background:var(--c); }
.d:nth-child(-n+2) .tip{ left:0; transform:none; } .d:nth-last-child(-n+2) .tip{ left:auto; right:0; transform:none; }
@container (max-width: 300px){ .ch{ min-height:150px; } .lg{ display:none; } .sum b{ font-size:calc(15u * var(--hg-fsv, 1)); } .d:not(.today):not(.best) .val{ display:none; } }
@container (max-width: 380px){ .lv{ display:none; } }
@container (min-width: 560px){ .ch{ min-height:250px; } .d small .ln{ display:inline; } .d small .sn{ display:none; } }
@media (prefers-reduced-motion:reduce){ .pr i{ animation:none; } .pr{ transition:none; } }
`);
  }
  render() {
    const c = this._config, h = this._hass, L = c.entities || [];
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title || hgT('cards.yield.default_title'))}</span><span class="sp"></span></div>`;
    if (!L.length) return `<ha-card class="glass">${hd}<div class="ph"><b>${hgT('cards.yield.choose_sensors')}</b>${hgT('cards.yield.choose_sensors_hint')}</div></ha-card>`;
    const dec = c.decimals != null && c.decimals !== '' && isFinite(+c.decimals) ? +c.decimals : 1;
    const s0 = L.map((e) => H.st(h, e)).find((s) => s), unit = c.unit || (s0 && s0.attributes.unit_of_measurement) || 'kWh';
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const days = L.map((e, i) => { const s = H.st(h, e), n = H.ok(s) ? parseFloat(s.state) : NaN, d = new Date(d0); d.setDate(d0.getDate() + i);
      return { e, d, has: isFinite(n), v: isFinite(n) ? Math.max(0, n) : 0 }; });
    const ok = days.filter((x) => x.has), n = days.length, mx = Math.max(0.001, ...ok.map((x) => x.v));
    const cap = this._cap(), good = isFinite(+c.good) && c.good !== '' ? +c.good : 3.5, poor = isFinite(+c.poor) && c.poor !== '' ? +c.poor : 1.5;
    /* poziom dnia: [klucz, kolor]; uzysk na kW gdy znana moc, inaczej udział w najlepszym dniu */
    const LV = { good: 'var(--hg-accent)', average: 'color-mix(in srgb, currentColor 42%, transparent)', poor: '#FF8A3D' };
    const level = (v) => { const r = cap ? v / cap : v / mx, g = cap ? good : 0.75, p = cap ? poor : 0.4; return r >= g ? 'good' : r < p ? 'poor' : 'average'; };
    days.forEach((x) => { x.lv = x.has ? level(x.v) : null; });
    const best = ok.length ? ok.reduce((a, x) => (x.v > a.v ? x : a), ok[0]) : null;
    const tot = ok.reduce((a, x) => a + x.v, 0), sel = this._sel;
    const fv = (v) => H.fmt(v, dec), dayName = (x, i) => (i === 0 ? `<span class="ln">${hgT('common.today_lower')}</span><span class="sn">${H.DAYS[x.d.getDay()]}</span>` : H.DAYS[x.d.getDay()]);
    const lvName = (k) => ({ good: hgT('cards.yield.levels.good'), average: hgT('cards.yield.levels.average'), poor: hgT('cards.yield.levels.poor') }[k]);
    const cols = days.map((x, i) => {
      const bar = !x.has ? `<i class="nd" title="${hgT('common.no_data')}"></i>` : `<i class="${x.v > 0 ? '' : 'z'}" style="animation-delay:${i * 35}ms"></i>`;
      const hp = x.has ? (x.v / mx) * 100 : 0, lvl = x.lv ? lvName(x.lv) : hgT('common.no_data');
      const tip = sel === i ? `<span class="tip">${H.esc(x.d.toLocaleDateString(HG_LOC(), { weekday: 'long', day: 'numeric', month: 'long' }))}<br>${x.has ? `<i></i><b>${fv(x.v)} ${H.esc(unit)}</b> · ${H.esc(lvl)}${cap ? `<br>${hgT('cards.yield.per_kw', { value: H.fmt(x.v / cap, 2) })}` : ''}` : hgT('common.no_data')}</span>` : '';
      return `<button class="d ${sel === i ? 'sel' : ''} ${i === 0 ? 'today' : ''} ${best === x ? 'best' : ''}" data-act="day" data-i="${i}" style="--c:${x.lv ? LV[x.lv] : '#C3C6CA'}" aria-pressed="${sel === i}" aria-label="${H.lv(H.esc(x.d.toLocaleDateString(HG_LOC(), { weekday: 'long', day: 'numeric', month: 'long' })), x.has ? `${fv(x.v)} ${H.esc(unit)}, ${H.esc(lvl)}` : hgT('common.no_data'))}">${tip}<span class="bs"><span class="bw"><span class="pr" style="height:${hp}%">${x.has ? `<span class="val">${fv(x.v)}</span>` : ''}${bar}</span></span></span><small>${dayName(x, i)}</small></button>`;
    }).join('');
    const pill = best ? `<span class="lv" style="--c:${LV[best.lv]}">${H.lv(hgT('cards.yield.best_day'), H.esc(best === days[0] ? hgT('common.today_lower') : H.DAYS[best.d.getDay()]))}</span>` : '';
    const lg = `<div class="lg">${['good', 'average', 'poor'].map((k) => `<span style="--c:${LV[k]}"><i></i>${H.esc(lvName(k))}</span>`).join('')}</div>`;
    return `<ha-card class="glass">${hd}
      <div class="sum"><b>${ok.length ? fv(tot) : '–'}<em>${H.esc(unit)} · ${hgT('cards.yield.days_count', { count: n })}</em></b>${pill}</div>
      ${lg}<div class="ch" style="--n:${n}">${cols}</div></ha-card>`;
  }
  onAct(a, t) { if (a === 'day') { const i = Number(t.dataset.i); this._sel = this._sel === i ? null : i; this.rerender(); } }
  getGridOptions() { return { columns: 12, rows: 4 }; }
}
hgReg('hg-yield-card', HGYieldCard, hgTLazy('cards.yield.picker_name'), hgTLazy('cards.yield.picker_description'));
