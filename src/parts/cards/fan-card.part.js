/* ===================== WENTYLATOR: prędkość na łuku, tryby jako pigułki ===================== */
class HGFanCard extends HGArcCard {
  static getStubConfig(h) { return { entity: hgStub(h, ['fan']) || null }; }
  defaults() { return { entity: null, name: null, icon: 'mdi:fan' }; }
  css() { return super.css() + U(`.pm{ display:flex; gap:4u; flex-wrap:wrap; justify-content:center; } .on-spin ha-icon{ animation: var(--hg-loop, nvSpin 1.6s linear infinite); } @keyframes nvSpin{ to{ transform:rotate(360deg); } } @media (prefers-reduced-motion: reduce){ .on-spin ha-icon{ animation:none; } }`); }
  extra(s) { const pm = s.attributes.preset_modes || []; if (!pm.length) return '';
    return `<div class="pm hide-s">${pm.map((m) => hgUI.pill(m.replace(/_/g, ' '), { act: 'pm', on: s.attributes.preset_mode === m, data: { m } })).join('')}</div>`; }
  onAct(a, t) { if (a === 'pm') return H.call(this._hass, 'fan', 'set_preset_mode', { entity_id: this._config.entity, preset_mode: t.dataset.m }); return super.onAct(a, t); }
}
hgReg('hg-fan-card', HGFanCard, hgTLazy('cards.fan.picker_name'), hgTLazy('cards.fan.picker_description'));
