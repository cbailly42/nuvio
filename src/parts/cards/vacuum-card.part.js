/* --- odkurzacz --- */
class HGVacuumCard extends HGBase {
  defaults() { return { entity: null, name: null }; }
  css() { return HG_G14_CSS + U(`.ac{ display:flex; gap:6px; flex-wrap:wrap; } .ac .gb{ flex:1 1 0; min-width:0; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz odkurzacz', 'Choose a vacuum')}</b>${hgTr('Encja vacuum lub lawn_mower', 'A vacuum or lawn_mower entity')}</div></ha-card>`;
    const a = s.attributes, run = ['cleaning', 'mowing', 'returning'].includes(s.state), bat = a.battery_level;
    const SL = { cleaning: hgTr('Sprząta', 'Cleaning'), docked: hgTr('W stacji', 'Docked'), idle: hgTr('Bezczynny', 'Idle'), paused: hgTr('Wstrzymany', 'Paused'), returning: hgTr('Wraca do stacji', 'Returning'), error: hgTr('Błąd', 'Error'), mowing: hgTr('Kosi', 'Mowing') };
    return `<ha-card class="glass">${hgHead(hgDom(c.entity) === 'lawn_mower' ? 'mdi:robot-mower-outline' : 'mdi:robot-vacuum', c.name || H.name(h, c.entity), H.esc(SL[s.state] || H.t(h, s)) + (bat != null ? ` · ${H.fmt(bat, 0)}%` : ''), run)}
      <div class="ac">${run ? `<button class="gb" data-act="v" data-s="pause">${H.icon('mdi:pause')}<span class="hide-s">${hgTr('Pauza', 'Pause')}</span></button>` : `<button class="gb ok" data-act="v" data-s="start">${H.icon('mdi:play')}<span class="hide-s">${hgTr('Start', 'Start')}</span></button>`}<button class="gb" data-act="v" data-s="return_to_base">${H.icon('mdi:home-import-outline')}<span class="hide-s">${hgTr('Do stacji', 'Dock')}</span></button><button class="gb hide-xs" data-act="more" aria-label="${hgTr('Więcej', 'More')}">${H.icon('mdi:dots-horizontal')}</button></div></ha-card>`; }
  onAct(a, t) { const c = this._config, d = hgDom(c.entity); if (a === 'more') return hgMore(this, c.entity);
    if (a === 'v') { const sv = d === 'lawn_mower' ? { start: 'start_mowing', pause: 'pause', return_to_base: 'dock' }[t.dataset.s] : t.dataset.s; H.call(this._hass, d, sv, { entity_id: c.entity }); } }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-vacuum-card', HGVacuumCard, hgTr('Home Glass – Odkurzacz', 'Home Glass – Vacuum'), hgTr('Stan, bateria i sterowanie robotem', 'Robot state, battery and controls'));
