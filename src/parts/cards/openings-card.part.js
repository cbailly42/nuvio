/* --- drzwi i okna (otwarcia) --- */
const HG_OPEN_DC = ['door', 'window', 'garage_door', 'opening'];
class HGOpeningsCard extends HGBase {
  defaults() { return { title: null, entities: [], only_open: false }; }
  _list() { const c = this._config, h = this._hass; return (c.entities && c.entities.length ? c.entities : hgEnts(h, ['binary_sensor'], HG_OPEN_DC)).filter((e) => h.states[e]); }
  ents() { return this._hass ? this._list() : (this._config.entities || []); }
  css() { return HG_G14_CSS; }
  render() { const c = this._config, h = this._hass, xs = this._list(), op = xs.filter((e) => h.states[e].state === 'on');
    if (!xs.length) return `<ha-card class="glass"><div class="ph"><b>${hgT('cards.openings.no_opening_sensors')}</b>${hgT('cards.openings.pick_door_and_window')}</div></ha-card>`;
    const ic = (e, on) => { const dc = h.states[e].attributes.device_class; return dc === 'window' ? (on ? 'mdi:window-open-variant' : 'mdi:window-closed-variant') : dc === 'garage_door' ? (on ? 'mdi:garage-open' : 'mdi:garage') : (on ? 'mdi:door-open' : 'mdi:door-closed'); };
    const L = [...op, ...(c.only_open ? [] : xs.filter((e) => !op.includes(e)))];
    if (xs.length === 1) { const e = xs[0], on = op.length > 0, s = h.states[e]; return `<ha-card class="glass"><button style="all:unset;cursor:pointer;display:flex;flex-direction:column;gap:10px" data-act="more" data-e="${H.esc(e)}">${hgHead(ic(e, on), c.title || H.name(h, e), H.esc(hgAgo14(s.last_changed)), on)}<span class="big">${on ? hgT('cards.openings.open') : hgT('cards.openings.closed')}</span></button></ha-card>`; }
    return `<ha-card class="glass">${hgHead(op.length ? 'mdi:door-open' : 'mdi:door-closed-lock', c.title || hgT('cards.openings.doors_and_windows'), op.length ? hgT('cards.openings.open_count', { count: op.length }) : hgT('cards.openings.all_closed'), !op.length, `<span class="cnt${op.length ? ' al' : ''}">${op.length}/${xs.length}</span>`)}
      <div class="ls">${L.length ? L.map((e) => { const on = h.states[e].state === 'on'; return `<button class="li${on ? ' al' : ''}" style="all:unset;display:flex;align-items:center;gap:10px;min-height:40px;cursor:pointer" data-act="more" data-e="${H.esc(e)}">${H.icon(ic(e, on))}<span class="nm">${H.esc(H.name(h, e))}</span><span class="vl">${on ? hgT('common.state_open') : `<span class="hide-s">${H.esc(hgAgo14(h.states[e].last_changed))}</span>`}</span></button>`; }).join('') : `<div class="ph">${hgT('cards.openings.nothing_is_open')}</div>`}</div></ha-card>`; }
  onAct(a, t) { if (a === 'more') hgMore(this, t.dataset.e); }
  getGridOptions() { return { columns: 6, rows: 4 }; }
}
hgReg('hg-openings-card', HGOpeningsCard, hgTLazy('cards.openings.picker_name'), hgTLazy('cards.openings.picker_description'));
