/* ===================== WARUNEK: karty widoczne tylko, gdy warunki są spełnione (jak conditional w HA) =====================
   conditions: [{ condition: 'state', entity, state | state_not }, { condition: 'numeric_state', entity, above, below }, { condition: 'screen', media_query },
   { condition: 'user', users }, { condition: 'and' | 'or', conditions }]; stara forma { entity, state } też działa. W podglądzie edytora zawsze widoczne. */
const hgCondEnts = (L, a = []) => { for (const c of L || []) { if (c && c.entity) a.push(c.entity); if (c && c.conditions) hgCondEnts(c.conditions, a); } return a; };
const hgCondOk = (h, L) => (L || []).every((c) => { if (!c) return true; const k = c.condition || (c.entity ? (c.above != null || c.below != null ? 'numeric_state' : 'state') : '');
  if (k === 'and') return hgCondOk(h, c.conditions); if (k === 'or') return (c.conditions || []).some((x) => hgCondOk(h, [x]));
  if (k === 'screen') { try { return !c.media_query || matchMedia(c.media_query).matches; } catch (e) { return true; } }
  if (k === 'user') return !c.users || !c.users.length || (h.user && c.users.includes(h.user.id));
  const s = h.states[c.entity]; if (!s) return false;
  if (k === 'numeric_state') { const v = parseFloat(s.state); return isFinite(v) && (c.above == null || v > +c.above) && (c.below == null || v < +c.below); }
  const has = (x) => [].concat(x).map(String).includes(s.state);
  return (c.state == null || has(c.state)) && (c.state_not == null || !has(c.state_not)); });
class HGConditionalCard extends HGStackCard {
  static getStubConfig(h) { const e = hgStub(h, ['light', 'switch']); return { conditions: e ? [{ condition: 'state', entity: e, state: 'on' }] : [], cards: [{ type: 'custom:nuvio-toggle-card', ...HGToggleCard.getStubConfig(h) }] }; }
  defaults() { return Object.assign(super.defaults(), { conditions: [], glass: false, divider: false }); }
  ents() { return hgCondEnts(this._config.conditions); }
  key() { return 'c'; }
  vis() { return !!this._hgPv || hgCondOk(this._hass, this._config.conditions); }
  _extraSig() { return [this._nw, this._mq]; }
  render() { const on = this.vis(); this.toggleAttribute('hidden', !on); this.style.display = on ? '' : 'none'; return on ? super.render() : '<div data-key="off"></div>'; }
  afterRender() { if (this.vis()) super.afterRender(); }
  /* warunek ekranu: zmiana szerokości okna przelicza widoczność */
  connectedCallback() { super.connectedCallback(); const Q = (this._config && this._config.conditions || []).filter((c) => c && c.condition === 'screen' && c.media_query); if (Q.length && !this._mqL) { this._mqL = Q.map((c) => { const m = matchMedia(c.media_query), f = () => { this._mq = (this._mq || 0) + 1; this._update(); }; m.addEventListener('change', f); return () => m.removeEventListener('change', f); }); } }
  disconnectedCallback() { super.disconnectedCallback(); if (this._mqL) { this._mqL.forEach((f) => f()); this._mqL = null; } }
}
hgReg('hg-conditional-card', HGConditionalCard, hgTLazy('cards.conditional.picker_name'), hgTLazy('cards.conditional.picker_description'));
