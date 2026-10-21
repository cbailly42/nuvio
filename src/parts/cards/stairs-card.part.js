/* --- schody (sekwencja świateł dół / góra z czujnikami ruchu) i ciepła woda (CWU) jako osobne widżety --- */
class HGStairsCard extends HGRoomCard {
  defaults() { return { stairs: null, areas: {} }; }
  ents() { const S = this._config.stairs; return S ? [S.group, S.automation, S.bottom && S.bottom.light, S.bottom && S.bottom.motion, S.top && S.top.light, S.top && S.top.motion].filter(Boolean) : []; }
  _area() { return null; } _extraSig() { return 0; } _changed() { return HGBase.prototype._changed.call(this); }
  render() { this._a = { id: '_st', name: '', strip: [] }; const S = this._config.stairs;
    return S && S.bottom && S.top ? this._stairs(S) : `<ha-card class="glass"><div class="empty"><b>${hgT('cards.stairs.stairs')}</b>${hgT('cards.stairs.set_the_bottom_and')}</div></ha-card>`; }
}
hgReg('hg-stairs-card', HGStairsCard, hgTLazy('cards.stairs.picker_name'), hgTLazy('cards.stairs.picker_description'));
