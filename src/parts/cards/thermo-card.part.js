/* --- termostat --- */
class HGThermoCard extends HGBase {
  defaults() { return { entity: null, name: null }; }
  css() { return HG_G14_CSS + U(`.tc{ display:flex; align-items:center; gap:10px; justify-content:space-between; } .tc .big{ text-align:center; flex:1; } .md{ display:flex; gap:6px; flex-wrap:wrap; } .md .gb{ flex:1 1 0; min-width:0; } .cur{ font-size:13px; opacity:.7; }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz termostat', 'Choose a thermostat')}</b>${hgTr('Encja climate lub water_heater', 'A climate or water_heater entity')}</div></ha-card>`;
    const a = s.attributes, tg = a.temperature ?? a.target_temp_low, cur = a.current_temperature, on = s.state !== 'off', u = (h.config && h.config.unit_system && h.config.unit_system.temperature) || '°C';
    const ML = { off: hgTr('Wył.', 'Off'), heat: hgTr('Grzanie', 'Heat'), cool: hgTr('Chłodzenie', 'Cool'), auto: 'Auto', heat_cool: 'Auto', dry: hgTr('Osuszanie', 'Dry'), fan_only: hgTr('Wentylator', 'Fan') };
    const MI = { off: 'mdi:power', heat: 'mdi:fire', cool: 'mdi:snowflake', auto: 'mdi:thermostat-auto', heat_cool: 'mdi:sun-snowflake-variant', dry: 'mdi:water-percent', fan_only: 'mdi:fan' };
    return `<ha-card class="glass">${hgHead('mdi:thermostat', c.name || H.name(h, c.entity), H.esc(ML[s.state] || s.state) + (cur != null ? ` · ${hgTr('teraz', 'now')} ${H.fmt(cur)}${u}` : ''), on)}
      <div class="tc"><button class="gb r" data-act="t" data-d="-1" aria-label="${hgTr('Niżej', 'Lower')}">${H.icon('mdi:minus')}</button><span class="big" aria-live="polite">${tg == null ? '–' : H.fmt(tg)}<small>${H.esc(u)}</small></span><button class="gb r" data-act="t" data-d="1" aria-label="${hgTr('Wyżej', 'Higher')}">${H.icon('mdi:plus')}</button></div>
      ${(a.hvac_modes || []).length ? `<div class="md hide-xs">${a.hvac_modes.slice(0, 5).map((m) => `<button class="gb" data-act="m" data-m="${H.esc(m)}" aria-pressed="${s.state === m}" title="${H.esc(ML[m] || m)}">${H.icon(MI[m] || 'mdi:thermostat')}<span class="hide-s">${H.esc(ML[m] || m)}</span></button>`).join('')}</div>` : ''}</ha-card>`; }
  onAct(a, t) { const c = this._config, h = this._hass, s = H.st(h, c.entity); if (!s) return; const d = hgDom(c.entity);
    if (a === 't') { const st = s.attributes.target_temp_step || (d === 'water_heater' ? 1 : 0.5), cur = s.attributes.temperature; if (cur == null) return; const v = Math.round((cur + st * +t.dataset.d) * 10) / 10; H.call(h, d, 'set_temperature', { entity_id: c.entity, temperature: v }); }
    if (a === 'm') H.call(h, d, d === 'water_heater' ? 'set_operation_mode' : 'set_hvac_mode', d === 'water_heater' ? { entity_id: c.entity, operation_mode: t.dataset.m } : { entity_id: c.entity, hvac_mode: t.dataset.m }); }
  getGridOptions() { return { columns: 6, rows: 3 }; }
}
hgReg('hg-thermo-card', HGThermoCard, hgTr('Home Glass – Termostat', 'Home Glass – Thermostat'), hgTr('Temperatura zadana i tryb', 'Target temperature and mode'));
