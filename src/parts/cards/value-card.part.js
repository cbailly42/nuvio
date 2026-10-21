/* --- duża wartość --- */
class HGValueCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null, warn: null, alert: null, decimals: 1 }; }
  css() { return HG_G14_CSS + U(`ha-card.glass{ justify-content:space-between; } .big.w{ color:#F5B83D; } .big.a{ color:#FF6B57; } .ft{ font-size:12px; opacity:.6; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgT('common.choose_entity')}</b>${hgT('cards.value.a_sensor_or_any')}</div></ha-card>`;
    const v = s.state === '' ? NaN : Number(s.state), num = isFinite(v), u = s.attributes.unit_of_measurement || '', cl = num && c.alert != null && v >= +c.alert ? ' a' : num && c.warn != null && v >= +c.warn ? ' w' : '';
    return `<ha-card class="glass" data-act="more" style="cursor:pointer">${hgHead(c.icon || s.attributes.icon || 'mdi:numeric', c.name || H.name(h, c.entity), '', !cl)}<span class="big${cl}">${num ? H.fmt(v, +c.decimals || 0) : H.esc(H.t(h, s))}${num && u ? `<small>${H.esc(u)}</small>` : ''}</span><span class="ft hide-xs">${H.esc(hgAgo14(s.last_changed))}</span></ha-card>`; }
  onAct(a) { if (a === 'more') hgMore(this, this._config.entity); }
  getGridOptions() { return { columns: 3, rows: 2 }; }
}
hgReg('hg-value-card', HGValueCard, hgTLazy('cards.value.picker_name'), hgTLazy('cards.value.picker_description'));
