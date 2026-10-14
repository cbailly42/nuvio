/* ===================== DOMOWNICY: awatary osób, kto jest w domu, przycisk dodania ===================== */
class HGFamilyCard extends HGBase {
  static getStubConfig() { return {}; }
  defaults() { return { title: hgTr('Domownicy', 'Family'), persons: null, add: true }; }
  list() { const c = this._config, h = this._hass; return c.persons && c.persons.length ? c.persons : Object.keys((h && h.states) || {}).filter((e) => e.startsWith('person.')).sort(); }
  ents() { return this.list(); }
  _changed() { this._entsC = null; return super._changed(); }
  css() { return HG_NV_CSS + U(`
.ls{ display:flex; flex-direction:column; gap:var(--s1); } .ls .nv-row{ font-size:var(--fs-sm); } .ls .nv-row small{ opacity:.6; margin-left:auto; }
.dot{ width:8px; height:8px; border-radius:50%; background:currentColor; opacity:.3; flex:none; } .dot.home{ background:var(--hg-accent); opacity:1; box-shadow:0 0 8px var(--hg-accent-glow); }
`); }
  render() { const c = this._config, h = this._hass, L = this.list().map((e) => ({ e, s: H.st(h, e) })).filter((x) => x.s);
    const home = L.filter((x) => x.s.state === 'home');
    const sub = L.length ? hgTr(`${home.length} z ${L.length} w domu`, `${home.length} of ${L.length} at home`) : hgTr('Brak osób w Home Assistant', 'No people in Home Assistant');
    const ppl = L.map((x) => ({ name: x.s.attributes.friendly_name || x.e, pic: x.s.attributes.entity_picture, home: x.s.state === 'home' }));
    return `<ha-card class="glass">${hgUI.header(c.title, { sub: '', right: '' })}<div class="nv-row"><div class="nv-name"><small>${H.esc(sub)}</small></div>${hgUI.avatars(ppl, { add: c.add ? 'add' : null })}</div>
      <div class="ls show-l">${L.map((x) => `<div class="nv-row" data-key="p-${H.esc(x.e)}"><span class="dot ${x.s.state === 'home' ? 'home' : ''}"></span><span>${H.esc(x.s.attributes.friendly_name || x.e)}</span><small>${H.esc(H.T(h, x.s))}</small></div>`).join('')}</div></ha-card>`; }
  onAct(a) { if (a === 'add') H.navigate('/config/person'); }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-family-card', HGFamilyCard, hgTr('Nuvio – Domownicy', 'Nuvio – Family'), hgTr('Awatary i kto jest teraz w domu', 'Avatars and who is home right now'));
