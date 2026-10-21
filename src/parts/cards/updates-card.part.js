/* --- aktualizacje --- */
class HGUpdatesCard extends HGBase {
  defaults() { return { title: null }; }
  _list() { const h = this._hass; return hgEnts(h, ['update']).filter((e) => h.states[e].state === 'on'); }
  ents() { return this._hass ? this._list() : []; }
  _extraSig() { return this._hass ? this._list().join() : ''; }
  css() { return HG_G14_CSS; }
  render() { const c = this._config, h = this._hass, xs = this._list();
    return `<ha-card class="glass">${hgHead(xs.length ? 'mdi:package-up' : 'mdi:package-variant-closed-check', c.title || hgT('cards.updates.updates'), xs.length ? hgT('cards.updates.available_count', { count: xs.length }) : hgT('cards.updates.everything_up_to_date'), !xs.length, xs.length ? `<span class="cnt al">${xs.length}</span>` : '')}
      ${xs.length ? `<div class="ls">${xs.map((e) => { const a = h.states[e].attributes; return `<button class="li" style="all:unset;display:flex;align-items:center;gap:10px;min-height:40px;cursor:pointer" data-act="more" data-e="${H.esc(e)}">${H.icon('mdi:arrow-up-circle-outline')}<span class="nm">${H.esc(a.title || H.name(h, e))}</span><span class="vl hide-s">${H.esc(a.latest_version || '')}</span></button>`; }).join('')}</div>` : ''}</ha-card>`; }
  onAct(a, t) { if (a === 'more') hgMore(this, t.dataset.e); }
  getGridOptions() { return { columns: 6, rows: 3 }; }
}
hgReg('hg-updates-card', HGUpdatesCard, hgTLazy('cards.updates.picker_name'), hgTLazy('cards.updates.picker_description'));
