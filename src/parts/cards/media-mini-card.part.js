/* --- mini odtwarzacz --- */
class HGMediaMiniCard extends HGBase {
  defaults() { return { entity: null, name: null }; }
  css() { return HG_G14_CSS + U(`ha-card.glass{ flex-direction:row; align-items:center; gap:12px; } .art{ flex:none; width:56px; height:56px; border-radius:12px; background:color-mix(in srgb, currentColor 10%, transparent) center/cover; display:grid; place-items:center; } .art ha-icon{ width:26px; height:26px; opacity:.6; }
.mt{ flex:1; min-width:0; display:flex; flex-direction:column; } .mt b{ font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .mt small{ font-size:12px; opacity:.66; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .cb{ display:flex; gap:4px; flex:none; }
@container (max-width: 240px){ .art{ width:44px; height:44px; } .cb .pv{ display:none; } }`); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${hgTr('Wybierz odtwarzacz', 'Choose a player')}</b>${hgTr('Dowolny media_player', 'Any media_player')}</div></ha-card>`;
    const a = s.attributes, pl = s.state === 'playing', img = a.entity_picture_local || a.entity_picture;
    return `<ha-card class="glass"><span class="art" style="${img ? `background-image:url('${H.esc(img)}')` : ''}">${img ? '' : H.icon('mdi:music-note')}</span><span class="mt"><b>${H.esc(a.media_title || c.name || H.name(h, c.entity))}</b><small>${H.esc(a.media_artist || (H.ok(s) ? H.t(h, s) : hgTr('niedostępny', 'unavailable')))}</small></span>
      <span class="cb"><button class="gb r pv" data-act="m" data-s="media_previous_track" aria-label="${hgTr('Poprzedni', 'Previous')}">${H.icon('mdi:skip-previous')}</button><button class="gb r${pl ? ' ok' : ''}" data-act="m" data-s="media_play_pause" aria-label="${pl ? hgTr('Pauza', 'Pause') : hgTr('Odtwórz', 'Play')}">${H.icon(pl ? 'mdi:pause' : 'mdi:play')}</button><button class="gb r" data-act="m" data-s="media_next_track" aria-label="${hgTr('Następny', 'Next')}">${H.icon('mdi:skip-next')}</button></span></ha-card>`; }
  onAct(a, t) { if (a === 'm') H.call(this._hass, 'media_player', t.dataset.s, { entity_id: this._config.entity }); }
  getGridOptions() { return { columns: 6, rows: 1 }; }
}
hgReg('hg-media-mini-card', HGMediaMiniCard, hgTr('Home Glass – Mini odtwarzacz', 'Home Glass – Mini player'), hgTr('Okładka, tytuł i przyciski w jednym wierszu', 'Artwork, title and buttons in one row'));
