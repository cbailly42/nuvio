/* --- schody (sekwencja świateł dół / góra z czujnikami ruchu) i ciepła woda (CWU) jako osobne widżety --- */
class HGStairsCard extends HGRoomCard {
  defaults() { return { stairs: null, areas: {} }; }
  ents() { const S = this._config.stairs; return S ? [S.group, S.automation, S.bottom && S.bottom.light, S.bottom && S.bottom.motion, S.top && S.top.light, S.top && S.top.motion].filter(Boolean) : []; }
  _area() { return null; } _extraSig() { return 0; } _changed() { return HGBase.prototype._changed.call(this); }
  render() { this._a = { id: '_st', name: '', strip: [] }; const S = this._config.stairs;
    return S && S.bottom && S.top ? this._stairs(S) : `<ha-card class="glass"><div class="empty"><b>${hgTr('Schody', 'Stairs')}</b>${hgTr('Ustaw światła i czujniki dołu i góry.', 'Set the bottom and top lights and sensors.')}</div></ha-card>`; }
}
hgReg('hg-stairs-card', HGStairsCard, hgTr('Home Glass – Schody', 'Home Glass – Stairs'), hgTr('Sekwencja świateł schodów z czujnikami dołu i góry', 'Stair light sequence with bottom and top sensors'));
