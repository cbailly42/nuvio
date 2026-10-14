class HGPersonCard extends HGBase {
  defaults() { return { home_label: hgTr('W domu', 'Home'), away_label: hgTr('Poza domem', 'Away'), locale: null }; }
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
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${H.esc(c.entity)}</b>${hgTr('brak encji', 'entity not found')}</div></ha-card>`;
    const home = s.state === 'home';
    const zone = home ? c.home_label : s.state === 'not_home' ? c.away_label : H.stateLabel(s.state);
    const since = new Date(s.last_changed);
    const mins = Math.round((Date.now() - since) / 60000);
    const rel = mins < 60 ? `${mins} min` : mins < 1440 ? hgTr(`${Math.round(mins / 60)} godz.`, `${Math.round(mins / 60)} h`) : Math.round(mins / 1440) === 1 ? hgTr('1 dnia', '1 day') : hgTr(`${Math.round(mins / 1440)} dni`, `${Math.round(mins / 1440)} days`);
    return `<ha-card class="glass ${home ? 'home' : ''}" data-act="more">${hgAvatar(this._hass, c.entity)}
      <div class="tx"><b>${H.esc(c.name || s.attributes.friendly_name)}</b><span>${H.icon(home ? 'mdi:home' : 'mdi:map-marker')}${H.esc(zone)}</span><small>${hgTr('od', 'for')} ${rel}</small></div></ha-card>`;
  }
  _extraSig() { return Math.floor(Date.now() / 60000); }
  onAct() { H.fire(this, 'hass-more-info', { entityId: this._config.entity }); }
}
hgReg('hg-person-card', HGPersonCard, 'Home Glass – Person', 'Osoba z awatarem i strefą');
