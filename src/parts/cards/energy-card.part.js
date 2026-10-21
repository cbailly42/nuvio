/* ===================== ENERGIA ===================== */
class HGEnergyCard extends HGBase {
  defaults() {
    return { title: hgT('cards.energy.energy'), icon: 'mdi:star-four-points', entities: [], max_power: 17250, thresholds: { low: 30, high: 70 },
      labels: { low: hgT('cards.energy.low_usage'), medium: hgT('cards.energy.medium_usage'), high: hgT('cards.energy.high_usage') }, expand: null,
      calc_label: hgT('cards.energy.sum_of_phases_vs') };
  }
  setConfig(c) { super.setConfig(hgDeep(this.defaults(), c)); }
  ents() { return this._config.entities; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; padding:var(--s2) var(--s3) var(--s3); }
.hd .ic{ color:var(--hg-accent-tx); width:11u; height:11u; }
.sub{ font-size:var(--fs-sm); font-weight:400; margin-top:5u; }
.grow{ flex:1; min-height:6u; }
.scale{ display:flex; justify-content:space-between; font-size:var(--fs-sm); color:#2B2E33; padding:0 1u; margin-bottom:7u; }
.bar{ position:relative; height:46u; border-radius:var(--r-sm); background:#fff; overflow:hidden; }
.fill{ position:absolute; left:0; top:0; bottom:0; border-radius:var(--r-sm); background:var(--hg-accent); min-width:18u; transition: width .6s cubic-bezier(.3,.7,.3,1); }
.fill i{ position:absolute; right:12u; top:30%; bottom:30%; width:2u; border-radius:2u; background:#fff; }
/* compact: wiersz „Moc teraz” z cienkim paskiem (główny widok) */
ha-card.glass.cmp{ padding:var(--s2) var(--s3) var(--s2); gap:0; }
.cmp .row{ display:flex; align-items:baseline; gap:var(--s1); margin-top:6u; }
.cmp .row b{ font-size:calc(17u * var(--hg-fsv, 1)); font-weight:600; letter-spacing:-.01em; } .cmp .row span{ font-size:var(--fs-sm); color:#5A5E64; }
.cmp .bar{ height:10u; border-radius:5u; margin-top:8u; } .cmp .fill{ border-radius:5u; min-width:6u; } .cmp .fill i{ display:none; }
`);
  }
  data() {
    const c = this._config; let tot = 0, n = 0;
    for (const e of c.entities) { const v = hgW(this._hass, e); if (v != null) { tot += Math.abs(v); n++; } }   // obciążenie fazy = |P| (eksport PV też płynie przez zabezpieczenie)
    if (!n) return null;
    const pct = Math.max(0, Math.min(100, (tot / c.max_power) * 100));
    return { tot, pct, lvl: pct < c.thresholds.low ? 'low' : pct < c.thresholds.high ? 'medium' : 'high' };
  }
  render() {
    const c = this._config, d = this.data();
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
      ${c.expand ? `<button class="ib" data-act="expand" aria-label="${hgT('common.expand')}" title="${hgT('common.details')}">${H.icon('mdi:arrow-expand')}</button>` : ''}</div>`;
    if (!d) return `<ha-card class="glass warm">${hd}<div class="ph"><b>${hgT('common.no_data_source')}</b>${hgT('cards.energy.power_sensors_unavailable')}</div></ha-card>`;
    const pr = Math.round(d.pct);
    if (c.compact) {
      const kw = d.tot >= 1000 ? `${H.fmt(d.tot / 1000, 2)} kW` : `${H.fmt(d.tot, 0)} W`;
      return `<ha-card class="glass warm cmp" title="${H.esc(`${c.calc_label}: ${H.fmt(d.tot, 0)} W ${hgT('common.of')} ${H.fmt(c.max_power / 1000, 2)} kW`)}">${hd}
        <div class="row"><b>${kw}</b><span>${pr}% · ${H.esc(c.labels[d.lvl])}</span></div>
        <div class="bar" role="meter" aria-label="${hgT('cards.energy.load')}" aria-valuenow="${pr}" aria-valuemin="0" aria-valuemax="100"><div class="fill" style="width:${d.pct.toFixed(1)}%"><i></i></div></div></ha-card>`;
    }
    const tip = `${c.calc_label}: ${c.entities.map((e) => `${H.name(this._hass, e)} ${H.fmt(Math.abs(hgW(this._hass, e) || 0), 0)} W`).join(' + ')} = ${H.fmt(d.tot, 0)} W ${hgT('common.of')} ${H.fmt(c.max_power / 1000, 2)} kW`;
    return `<ha-card class="glass warm" title="${H.esc(tip)}">${hd}
      <div class="sub">${pr}% · ${H.esc(c.labels[d.lvl])}</div><div class="grow"></div>
      <div class="scale"><span>0</span><span>50</span><span>100</span></div>
      <div class="bar" role="meter" aria-label="${hgT('cards.energy.load')}" aria-valuenow="${pr}" aria-valuemin="0" aria-valuemax="100"><div class="fill" style="width:${d.pct.toFixed(1)}%"><i></i></div></div></ha-card>`;
  }
  onAct(a) { if (a === 'expand') H.action(this, this._hass, this._config.expand); }
}
hgReg('hg-energy-card', HGEnergyCard, hgTLazy('cards.energy.picker_name'), hgTLazy('cards.energy.picker_description'));
