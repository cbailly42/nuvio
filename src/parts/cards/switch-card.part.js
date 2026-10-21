/* ===================== PRZEŁĄCZNIK (Wi-Fi / Kuchnia / pokoje) ===================== */
class HGSwitchCard extends HGBase {
  defaults() { return { title: null, subtitle: null, icon: 'mdi:toggle-switch-outline', layout: 'row', more: true, info_entity: null }; }
  list() { const c = this._config; return c.entities || [c.entity]; }
  ents() { return this.list().concat(this._config.info_entity ? [this._config.info_entity] : []); }
  css() {
    return U(`
ha-card.glass{ display:flex; align-items:center; gap:var(--s1); padding:0 var(--s1) 0 var(--s3); }
.ic{ width:12u; height:12u; flex:none; color:#2A2D31; }
.tt{ font-size:var(--fs-md); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.tt small{ font-size:var(--fs-xs); color:#5A5E64; margin-left:5u; }
.sp{ flex:1; }
ha-card.tile{ flex-direction:column; align-items:stretch; justify-content:space-between; padding:var(--s2) var(--s1) var(--s2) var(--s3); gap:0; }
.tile .row{ display:flex; align-items:center; gap:var(--s1); }
.tile .ic{ width:15u; height:15u; }
.tile.on .ic{ color:var(--hg-accent-tx); }
.tile .nm{ font-size:var(--fs-md); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tile .stt{ font-size:var(--fs-xs); color:#7A7E84; margin-top:2u; }
`);
  }
  render() {
    const c = this._config, ids = this.list();
    const ss = ids.map((e) => H.st(this._hass, e));
    const avail = ss.some((s) => s && s.state !== 'unavailable');
    const onN = ss.filter((s) => s && s.state === 'on').length, on = onN > 0;
    const title = c.title || H.name(this._hass, ids[0]);
    let tip = `${title}: ${avail ? H.stateLabel(on ? 'on' : 'off') : hgT('common.state_unavailable')}`;
    if (c.info_entity) { const s = H.st(this._hass, c.info_entity); tip += ' · ' + hgT('cards.switch.internet_status', { status: s && s.state === 'on' ? hgT('cards.switch.connected') : hgT('cards.switch.disconnected') }); }
    const tg = this.toggleHtml(on, 'toggle', !avail, title);
    const kb = c.more ? `<button class="ib kebab" data-act="more" aria-label="${hgT('common.more')}" title="${hgT('common.more')}">${H.icon('mdi:dots-vertical')}</button>` : '';
    if (c.layout === 'tile') {
      const st = !avail ? hgT('common.state_unavailable') : on ? (ids.length > 1 ? `${hgT('common.on_neut')} · ${onN}/${ids.length}` : hgT('common.on_neut')) : hgT('common.off_neut');
      return `<ha-card class="glass tile ${on ? 'on' : ''}" title="${H.esc(tip)}"><div class="row">${H.icon(c.icon, 'ic')}<span class="sp"></span>${tg}${kb}</div>
        <div><div class="nm">${H.esc(title)}</div><div class="stt">${H.esc(st)}</div></div></ha-card>`;
    }
    return `<ha-card class="glass ${on ? 'on' : ''}" title="${H.esc(tip)}">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(title)}${c.subtitle ? `<small>(${H.esc(c.subtitle)})</small>` : ''}</span><span class="sp"></span>${tg}${kb}</ha-card>`;
  }
  onAct(a) {
    const ids = this.list();
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: this._config.more_entity || ids[0] });
    if (a === 'toggle') {
      const on = ids.some((e) => { const s = H.st(this._hass, e); return s && s.state === 'on'; });
      return H.call(this._hass, 'homeassistant', on ? 'turn_off' : 'turn_on', { entity_id: ids.filter((e) => { const s = H.st(this._hass, e); return s && s.state !== 'unavailable'; }) });
    }
  }
  getGridOptions() { return { columns: 6, rows: 1 }; }
}
hgReg('hg-switch-card', HGSwitchCard, hgTLazy('cards.switch.picker_name'), hgTLazy('cards.switch.picker_description'));
