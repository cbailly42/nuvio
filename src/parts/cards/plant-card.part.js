/* --- roślina: wilgotność gleby, światło, temperatura, nawożenie (przewodność) i bateria czujnika; zakres min–max jako pas, znacznik pokazuje odczyt --- */
/* [klucz, device_class, atrybut encji plant.*, ikona, domyślne min, max, skala paska]; nazwa: HG_PLANT_L[klucz] */
const HG_PLANT = [
  ['moisture', 'moisture', 'moisture', 'mdi:water-outline', 15, 60, 100],
  ['illuminance', 'illuminance', 'brightness', 'mdi:white-balance-sunny', 1500, 40000, 60000],
  ['temperature', 'temperature', 'temperature', 'mdi:thermometer', 10, 32, 40],
  ['conductivity', 'conductivity', 'conductivity', 'mdi:spa-outline', 350, 2000, 3000],
];
const HG_PLANT_L = { moisture: hgTLazy('cards.plant.metrics.moisture'), illuminance: hgTLazy('cards.plant.metrics.illuminance'), temperature: hgTLazy('cards.plant.metrics.temperature'), conductivity: hgTLazy('cards.plant.metrics.conductivity') };
/* [za mało, za dużo] */
const HG_PLANT_MSG = { moisture: [hgTLazy('cards.plant.alerts.moisture_low'), hgTLazy('cards.plant.alerts.moisture_high')], illuminance: [hgTLazy('cards.plant.alerts.illuminance_low'), hgTLazy('cards.plant.alerts.illuminance_high')], temperature: [hgTLazy('cards.plant.alerts.temperature_low'), hgTLazy('cards.plant.alerts.temperature_high')], conductivity: [hgTLazy('cards.plant.alerts.conductivity_low'), hgTLazy('cards.plant.alerts.conductivity_high')] };
class HGPlantCard extends HGBase {
  static getStubConfig(h) { const S = (h && h.states) || {}, p = Object.keys(S).find((e) => e.startsWith('plant.')), m = Object.keys(S).find((e) => e.startsWith('sensor.') && S[e].attributes.device_class === 'moisture');
    return p ? { entity: p } : { moisture: m || null }; }
  defaults() { return { entity: null, name: null, moisture: null, illuminance: null, temperature: null, conductivity: null, battery: null, image: null, min_moisture: null, max_moisture: null, min_illuminance: null, max_illuminance: null, min_temperature: null, max_temperature: null, min_conductivity: null, max_conductivity: null }; }
  /* czujnik danej klasy: wpisany w konfiguracji, a jeśli brak – z tego samego urządzenia co czujnik wilgotności (np. Mi Flora) */
  _sens(k, dc) { const c = this._config, h = this._hass; if (c[k]) return c[k]; const base = c.moisture || c.illuminance || c.conductivity; if (!base || !h) return null;
    const R = h.entities || {}, dev = R[base] && R[base].device_id; if (!dev) return null;
    return Object.keys(h.states).find((e) => e.startsWith('sensor.') && R[e] && R[e].device_id === dev && h.states[e].attributes.device_class === dc) || null; }
  ents() { const c = this._config; return [c.entity, ...HG_PLANT.map((m) => this._sens(m[0], m[1])), this._sens('battery', 'battery')].filter(Boolean); }
  _changed() { this._entsC = null; return super._changed(); }
  /* odczyty: encja plant.* (atrybuty) albo osobne czujniki */
  _rows() { const c = this._config, h = this._hass, P = c.entity && h.states[c.entity], pa = (P && P.attributes) || {};
    return HG_PLANT.map((m) => { const id = this._sens(m[0], m[1]), s = id && h.states[id], raw = s ? s.state : pa[m[2]], v = parseFloat(raw);
      const unit = s ? s.attributes.unit_of_measurement || '' : ((pa.unit_of_measurement_dict || {})[m[2]] || { moisture: '%', brightness: 'lx', temperature: '°C', conductivity: 'µS/cm' }[m[2]]);
      const lo = c['min_' + m[0]] ?? pa['min_' + m[2]] ?? m[4], hi = c['max_' + m[0]] ?? pa['max_' + m[2]] ?? m[5];
      return { m, id: id || c.entity, has: !!s || pa[m[2]] != null, v: isFinite(v) ? v : null, unit, lo: +lo, hi: +hi }; }).filter((r) => r.has); }
  css() { return HG_G14_CSS + U(`
.pl{ display:flex; flex-direction:column; gap:10px; min-width:0; }
.mr{ all:unset; box-sizing:border-box; cursor:pointer; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; column-gap:10px; row-gap:6px; min-width:0; padding:2px 0; border-radius:10px; }
.mr:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:3px; }
.mr > ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; opacity:.8; } .mr .nm{ font-size:13.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .mr .vl{ font-size:13.5px; font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; } .mr .vl small{ font-weight:500; opacity:.62; margin-left:2px; }
.mr.bad .vl, .mr.bad > ha-icon{ color:var(--hg-warn, #F5A524); opacity:1; }
.rgb{ grid-column:2 / -1; position:relative; height:6px; border-radius:3px; background:color-mix(in srgb, currentColor 10%, transparent); }
.rgb .ok{ position:absolute; top:0; bottom:0; border-radius:3px; background:color-mix(in srgb, var(--hg-accent) 45%, transparent); }
.rgb .mk{ position:absolute; top:50%; width:12px; height:12px; margin:-6px 0 0 -6px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.35), 0 0 0 2px var(--hg-accent); transition:left .6s cubic-bezier(.2,.8,.2,1); }
.mr.bad .rgb .mk{ box-shadow:0 1px 4px rgba(0,0,0,.35), 0 0 0 2px var(--hg-warn, #F5A524); }
.bt{ display:inline-flex; align-items:center; gap:3px; flex:none; margin-left:auto; font-size:12px; opacity:.7; font-variant-numeric:tabular-nums; } .bt ha-icon{ --mdc-icon-size:16px; width:16px; height:16px; } .bt.lo{ color:#FF6B57; opacity:1; }
.ph2{ width:40px; height:40px; flex:none; border-radius:50%; object-fit:cover; }
@container (max-width: 240px){ .mr{ column-gap:8px; grid-template-columns:minmax(0,1fr) auto; } .mr > ha-icon{ display:none; } .rgb{ grid-column:1 / -1; } .bt span{ display:none; } }
@container (min-width: 420px){ .pl{ display:grid; grid-template-columns:1fr 1fr; column-gap:18px; row-gap:12px; } }
@media (prefers-reduced-motion:reduce){ .rgb .mk{ transition:none; } }
`); }
  render() { const c = this._config, h = this._hass, P = c.entity && h.states[c.entity], R = this._rows();
    if (!R.length) return `<ha-card class="glass"><div class="ph"><b>${hgT('cards.plant.choose_a_plant_or')}</b>${hgT('cards.plant.a_plant_entity_or')}</div></ha-card>`;
    const bad = [];
    const rows = R.map((r) => { const m = r.m, span = m[6], pos = (x) => Math.max(0, Math.min(100, (x / span) * 100)), st = r.v == null ? 0 : r.v < r.lo ? -1 : r.v > r.hi ? 1 : 0;
      if (st) { const g = HG_PLANT_MSG[m[0]][st < 0 ? 0 : 1]; bad.push(String(g)); }
      const dv = r.v == null ? '–' : m[0] === 'illuminance' && r.v >= 10000 ? H.fmt(r.v / 1000, 1) + 'k' : H.fmt(r.v, m[0] === 'temperature' ? 1 : 0);
      return `<button class="mr${st ? ' bad' : ''}" data-act="more" data-e="${H.esc(r.id)}" aria-label="${HG_PLANT_L[m[0]]}: ${dv} ${H.esc(r.unit)}, ${hgT('cards.plant.range')} ${H.fmt(r.lo, 0)}–${H.fmt(r.hi, 0)}">${H.icon(m[3])}<span class="nm">${HG_PLANT_L[m[0]]}</span><span class="vl">${dv}<small>${H.esc(r.unit)}</small></span>
        <span class="rgb" aria-hidden="true"><span class="ok" style="left:${pos(r.lo).toFixed(1)}%;width:${Math.max(2, pos(r.hi) - pos(r.lo)).toFixed(1)}%"></span>${r.v == null ? '' : `<span class="mk" style="left:${pos(r.v).toFixed(1)}%"></span>`}</span></button>`; }).join('');
    const bid = this._sens('battery', 'battery'), bv = bid ? H.num(h, bid) : P && P.attributes.battery != null ? Number(P.attributes.battery) : null;
    const bat = bv == null ? '' : `<span class="bt${bv <= 15 ? ' lo' : ''}" title="${hgT('cards.plant.sensor_battery')}">${H.icon(bv <= 15 ? 'mdi:battery-alert-variant-outline' : 'mdi:battery-outline')}<span>${H.fmt(bv, 0)}%</span></span>`;
    const nm = c.name || (P ? H.name(h, c.entity) : R[0] && R[0].id ? H.name(h, R[0].id).replace(/\s*(wilgotność|moisture|soil moisture)$/i, '') : hgT('cards.plant.plant'));
    const sub = bad.length ? bad.join(' · ') : hgT('cards.plant.all_good');
    const head = c.image ? `<div class="gh"><img class="ph2" src="${H.esc(c.image)}" alt=""><span class="gn"><b>${H.esc(nm)}</b><small>${H.esc(sub)}</small></span>${bat}</div>` : hgHead(bad.length ? 'mdi:flower-outline' : 'mdi:flower', nm, H.esc(sub), !bad.length, bat);
    return `<ha-card class="glass">${head}<div class="pl">${rows}</div></ha-card>`; }
  onAct(a, t) { if (a === 'more') hgMore(this, t.dataset.e); }
  getGridOptions() { return { columns: 6, rows: 'auto' }; }
}
hgReg('hg-plant-card', HGPlantCard, hgTLazy('cards.plant.picker_name'), hgTLazy('cards.plant.picker_description'));
