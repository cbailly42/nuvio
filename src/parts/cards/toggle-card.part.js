/* ===================== KAFELEK PRZEŁĄCZNIKA: jedna encja w wierszu (ikona, nazwa i stan, przełącznik, ⋮) ===================== */
class HGToggleCard extends HGBase {
  static getStubConfig(h) { return { entity: hgStub(h, ['light', 'switch', 'fan', 'input_boolean']) || null }; }
  defaults() { return { entity: null, name: null, icon: null }; }
  css() { return HG_NV_CSS + U(`ha-card.glass{ flex-direction:row; align-items:center; padding:var(--s2) var(--s2) var(--s2) var(--s3); }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><span class="nv-empty">${hgT('cards.toggle.choose_a_device')}</span></ha-card>`;
    const on = !['off', 'closed', 'locked', 'idle', 'standby', 'unavailable', 'unknown'].includes(s.state), ok = H.ok(s), nm = c.name || H.name(h, c.entity);
    const ic = c.icon || s.attributes.icon || ({ light: 'mdi:lightbulb', switch: 'mdi:power-plug', fan: 'mdi:fan', input_boolean: 'mdi:toggle-switch', media_player: 'mdi:speaker', climate: 'mdi:thermostat' }[hgDom(c.entity)] || 'mdi:power');
    return `<ha-card class="glass ${ok ? '' : 'un'}"><button class="nv-ic ${on ? 'on' : ''}" data-act="more" aria-label="${H.esc(nm)}">${H.icon(ic)}</button>
      <div class="nv-name"><b>${H.esc(nm)}</b><small>${H.esc(H.T(h, s))}</small></div>${hgUI.switch(on, 'tog', nm, !ok)}<span class="hide-s">${hgUI.iconBtn('mdi:dots-vertical', 'menu', hgT('common.more'), { bare: true, size: 'sm' })}</span></ha-card>`; }
  onAct(a, t) { const e = this._config.entity;
    if (a === 'tog') { H.haptic(); return H.call(this._hass, 'homeassistant', 'toggle', { entity_id: e }); }
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: e });
    if (a === 'menu') return hgMoreMenu(this, t, e); }
  getGridOptions() { return { columns: 6, rows: 1 }; }
}
hgReg('hg-toggle-card', HGToggleCard, hgTLazy('cards.toggle.picker_name'), hgTLazy('cards.toggle.picker_description'));
