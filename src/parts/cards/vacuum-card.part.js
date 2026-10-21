/* --- odkurzacz --- */
class HGVacuumCard extends HGBase {
  defaults() { return { entity: null, name: null }; }
  css() { return HG_G14_CSS + U(`.ac{ display:flex; gap:6px; flex-wrap:wrap; } .ac .gb{ flex:1 1 0; min-width:0; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgT('cards.vacuum.choose_a_vacuum')}</b>${hgT('cards.vacuum.a_vacuum_or_lawn')}</div></ha-card>`;
    const a = s.attributes, run = ['cleaning', 'mowing', 'returning'].includes(s.state), bat = a.battery_level;
    const SL = { cleaning: hgT('common.cleaning'), docked: hgT('cards.vacuum.docked'), idle: hgT('cards.vacuum.idle'), paused: hgT('cards.vacuum.paused'), returning: hgT('cards.vacuum.returning'), error: hgT('cards.vacuum.error'), mowing: hgT('cards.vacuum.mowing') };
    return `<ha-card class="glass">${hgHead(hgDom(c.entity) === 'lawn_mower' ? 'mdi:robot-mower-outline' : 'mdi:robot-vacuum', c.name || H.name(h, c.entity), H.esc(SL[s.state] || H.t(h, s)) + (bat != null ? ` · ${H.fmt(bat, 0)}%` : ''), run)}
      <div class="ac">${run ? `<button class="gb" data-act="v" data-s="pause">${H.icon('mdi:pause')}<span class="hide-s">${hgT('common.pause')}</span></button>` : `<button class="gb ok" data-act="v" data-s="start">${H.icon('mdi:play')}<span class="hide-s">${hgT('cards.vacuum.start')}</span></button>`}<button class="gb" data-act="v" data-s="return_to_base">${H.icon('mdi:home-import-outline')}<span class="hide-s">${hgT('cards.vacuum.dock')}</span></button><button class="gb hide-xs" data-act="more" aria-label="${hgT('common.more')}">${H.icon('mdi:dots-horizontal')}</button></div></ha-card>`; }
  onAct(a, t) { const c = this._config, d = hgDom(c.entity); if (a === 'more') return hgMore(this, c.entity);
    if (a === 'v') { const sv = d === 'lawn_mower' ? { start: 'start_mowing', pause: 'pause', return_to_base: 'dock' }[t.dataset.s] : t.dataset.s; H.call(this._hass, d, sv, { entity_id: c.entity }); } }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-vacuum-card', HGVacuumCard, hgTLazy('cards.vacuum.picker_name'), hgTLazy('cards.vacuum.picker_description'));
