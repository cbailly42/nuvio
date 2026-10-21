/* --- światło: włącz, jasność, temperatura barwy --- */
class HGLampCard extends HGBase {
  defaults() { return { entity: null, name: null, icon: null }; }
  css() { return HG_G14_CSS + U(`.pr{ display:flex; gap:6px; flex-wrap:wrap; } .pr .gb{ flex:1 1 0; min-width:0; } .lv{ font-size:13px; opacity:.7; font-variant-numeric:tabular-nums; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgT('cards.lamp.choose_a_light')}</b>${hgT('cards.lamp.any_light_entity')}</div></ha-card>`;
    const a = s.attributes, on = s.state === 'on', dim = (a.supported_color_modes || []).some((m) => m !== 'onoff'), b = on ? (a.brightness == null ? 100 : Math.round(a.brightness / 2.55)) : 0, ct = (a.supported_color_modes || []).includes('color_temp');
    const sw = `<button class="gsw" role="switch" aria-checked="${on}" aria-label="${H.esc(c.name || H.name(h, c.entity))}" data-act="tog"><span class="gkn"></span></button>`;
    return `<ha-card class="glass">${hgHead(c.icon || a.icon || (on ? 'mdi:lightbulb-on' : 'mdi:lightbulb-outline'), c.name || H.name(h, c.entity), H.ok(s) ? (on ? (dim ? `${b}%` : hgT('common.on_neut')) : hgT('common.off_neut')) : hgT('common.state_unavailable'), on, sw)}
      ${dim ? `<input class="rg" type="range" min="1" max="100" value="${b || 1}" style="--v:${b}%" aria-label="${hgT('common.brightness')}" data-k="b">` : ''}
      ${dim ? `<div class="pr hide-xs">${[25, 50, 100].map((p) => `<button class="gb" data-act="br" data-p="${p}" aria-pressed="${on && Math.abs(b - p) < 3}">${p}%</button>`).join('')}${ct ? `<button class="gb hide-s" data-act="ct" data-k="w" aria-label="${hgT('cards.lamp.warm')}">${H.icon('mdi:weather-sunset')}</button><button class="gb hide-s" data-act="ct" data-k="c" aria-label="${hgT('cards.lamp.cool')}">${H.icon('mdi:snowflake')}</button>` : ''}</div>` : ''}</ha-card>`; }
  afterRender() { const r = this.$.querySelector('input[data-k=b]'); if (!r || !this._once(r)) return; r.addEventListener('input', () => r.style.setProperty('--v', r.value + '%')); r.addEventListener('change', () => H.call(this._hass, 'light', 'turn_on', { entity_id: this._config.entity, brightness_pct: +r.value })); }
  onAct(a, t) { const e = this._config.entity, h = this._hass; if (a === 'tog') H.call(h, 'light', 'toggle', { entity_id: e });
    if (a === 'br') H.call(h, 'light', 'turn_on', { entity_id: e, brightness_pct: +t.dataset.p });
    if (a === 'ct') { const s = H.st(h, e), at = s.attributes; H.call(h, 'light', 'turn_on', { entity_id: e, color_temp_kelvin: t.dataset.k === 'w' ? (at.min_color_temp_kelvin || 2700) : (at.max_color_temp_kelvin || 6500) }); } }
  getGridOptions() { return { columns: 6, rows: 2 }; }
}
hgReg('hg-lamp-card', HGLampCard, hgTLazy('cards.lamp.picker_name'), hgTLazy('cards.lamp.picker_description'));
