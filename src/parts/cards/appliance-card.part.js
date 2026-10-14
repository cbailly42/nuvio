/* --- urządzenie AGD jako osobny widżet (pralka, suszarka, czajnik, poidełko, dowolne urządzenie): ten sam widok co w pokoju --- */
class HGApplianceCard extends HGRoomCard {
  defaults() { return { entity: '', device: '', areas: {} }; }
  _dev() { const h = this._hass, c = this._config, r = (h.entities || {})[c.entity]; return c.device || (r && r.device_id) || ''; }
  _devEnts() { const h = this._hass, d = this._dev(), reg = h.entities || {}; if (!d) return this._config.entity && h.states[this._config.entity] ? [this._config.entity] : [];
    return Object.keys(h.states).filter((e) => reg[e] && reg[e].device_id === d && !reg[e].hidden && !reg[e].entity_category); }
  ents() { return this._hass ? this._devEnts() : []; }
  _area() { return null; }
  _extraSig() { return [this._dev(), [...(this._devOpen || [])].join(',')]; }
  _changed() { return HGBase.prototype._changed.call(this); }
  render() { const h = this._hass, d = this._dev(), ents = this._devEnts(); this._a = { id: '_app', name: '', strip: [], ents };
    const out = ents.length ? this._devCard({ d: d || ents[0], ents }, this._a) : null;
    return out || `<ha-card class="glass"><div class="empty"><b>${hgTr('Brak urządzenia', 'No device')}</b>${hgTr('Wybierz encję urządzenia w ustawieniach widżetu.', 'Pick an entity of the device in the widget settings.')}</div></ha-card>`; }
}
hgReg('hg-appliance-card', HGApplianceCard, hgTr('Home Glass – Urządzenie AGD', 'Home Glass – Appliance'), hgTr('Pralka, suszarka, czajnik i inne urządzenia: stan, program, czas do końca, postęp', 'Washer, dryer, kettle and other devices: state, program, time left, progress'));
