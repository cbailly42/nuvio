/* ===================== MEDIA ===================== */
class HGMediaCard extends HGBase {
  defaults() { return { name: null, icon: 'mdi:speaker' }; }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s1); }
.row{ display:flex; align-items:center; gap:var(--s2); min-width:0; }
.art{ width:44u; height:44u; border-radius:var(--r-sm); flex:none; background:rgba(255,255,255,.75) center/cover; display:flex; align-items:center; justify-content:center; box-shadow:var(--hg-sh); }
.art ha-icon{ width:20u; height:20u; color:#4D5157; }
.tx{ min-width:0; flex:1; } .tx b{ display:block; font-size:var(--fs-md); font-weight:400; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tx span{ display:block; font-size:var(--fs-sm); color:#4D5157; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ctl{ display:flex; align-items:center; justify-content:center; gap:var(--s2); margin-top:auto; }
.cb{ width:max(30u, 40px); height:max(30u, 40px); border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.75); position:relative; }
.cb ha-icon{ width:20px; height:20px; } .cb.pp{ width:max(34u, 44px); height:max(34u, 44px); background:var(--hg-accent); } .cb.pp ha-icon{ width:24px; height:24px; }
@media (pointer:coarse){ .cb::before{ content:''; position:absolute; inset:-7px; } }
.playing .art{ animation: var(--hg-loop, hgpulse 3s ease-in-out infinite); }
`);
  }
  render() {
    const c = this._config, s = H.st(this._hass, c.entity);
    const nm = c.name || H.name(this._hass, c.entity);
    if (!s) return `<ha-card class="glass"><div class="ph"><b>${H.esc(nm)}</b>${hgT('cards.media.entity_not_found')}</div></ha-card>`;
    const a = s.attributes, sf = a.supported_features || 0, st = s.state;
    const pic = a.entity_picture ? `style="background-image:url('${H.cssUrl(a.entity_picture)}')"` : '';
    const sub = [a.media_title, a.media_artist].filter(Boolean).join(' · ') || H.stateLabel(st);
    const AL = { prev: hgT('common.previous_track'), next: hgT('common.next_track'), on: hgT('common.turn_on'), off: hgT('common.turn_off') };
    const b = (f, act, ic, cls = '') => (sf & f ? `<button class="cb ${cls}" data-act="${act}" aria-label="${AL[act]}" title="${AL[act]}">${H.icon(ic)}</button>` : '');
    const unav = st === 'unavailable';
    return `<ha-card class="glass ${st === 'playing' ? 'playing' : ''}"><div class="row"><div class="art" ${pic}>${pic ? '' : H.icon(c.icon)}</div>
      <div class="tx"><b>${H.esc(nm)}</b><span>${H.esc(sub)}</span></div>
      <button class="ib kebab" data-act="more" aria-label="${hgT('common.more')}" title="${hgT('common.more')}">${H.icon('mdi:dots-vertical')}</button></div>
      ${unav ? '' : `<div class="ctl">${b(16, 'prev', 'mdi:skip-previous')}${(sf & 1) || (sf & 16384) ? `<button class="cb pp" data-act="pp" aria-label="${hgT('cards.media.play_pause')}">${H.icon(st === 'playing' ? 'mdi:pause' : 'mdi:play')}</button>` : ''}${b(32, 'next', 'mdi:skip-next')}
        ${st === 'off' ? b(128, 'on', 'mdi:power') : b(256, 'off', 'mdi:power')}</div>`}</ha-card>`;
  }
  onAct(a) {
    const e = this._config.entity, id = { entity_id: e };
    const m = { prev: 'media_previous_track', next: 'media_next_track', pp: 'media_play_pause', on: 'turn_on', off: 'turn_off' };
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: e });
    if (m[a]) return H.call(this._hass, 'media_player', m[a], id);
  }
}
hgReg('hg-media-card', HGMediaCard, hgTLazy('cards.media.picker_name'), hgTLazy('cards.media.picker_description'));
