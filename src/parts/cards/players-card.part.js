/* ===================== MULTIMEDIA + ENERGIA ===================== */
/* --- hg-players-card: odtwarzacze (konfigurowane + wykryte), aktywne duże z okładką, bezczynne kompaktowe, niedostępne jako chipy --- */
const HG_MP = { PAUSE: 1, SEEK: 2, VOL_SET: 4, MUTE: 8, PREV: 16, NEXT: 32, ON: 128, OFF: 256, VOL_STEP: 1024, SOURCE: 2048, STOP: 4096, PLAY: 16384 };
const HG_MP_ST = { playing: 'Odtwarza', paused: 'Wstrzymano', idle: 'Bezczynny', on: 'Włączony', off: 'Wyłączony', standby: 'Czuwanie', buffering: 'Buforowanie…', unavailable: 'Niedostępny', unknown: 'Nieznany' };
const HG_MP_ST_EN = { playing: 'Playing', paused: 'Paused', idle: 'Idle', on: 'On', off: 'Off', standby: 'Standby', buffering: 'Buffering…', unavailable: 'Unavailable', unknown: 'Unknown' };
const hgMpSt = (st) => (hgCurLang() === 'en' ? HG_MP_ST_EN : HG_MP_ST)[st];
class HGPlayersCard extends HGBase {
  defaults() {
    return { title: 'Multimedia', icon: 'mdi:play-box-multiple-outline', entities: [], names: {}, icons: {}, discover: true,
      exclude_platforms: ['browser_mod'], exclude: [] };
  }
  _list() {
    const h = this._hass, c = this._config;
    if (this._lc && this._lc.st === h.states && this._lc.ent === h.entities) return this._lc.list;   // te same obiekty -> bez liczenia
    const key = hgNKeys(h.states) + ':' + (h.entities ? hgNKeys(h.entities) : 0);
    if (this._lc && this._lc.key === key && this._lc.ent === h.entities) { this._lc.st = h.states; return this._lc.list; }
    const reg = h.entities || {}, seen = new Set(), names = new Map(), out = [];
    const nm = (e) => c.names[e] || (h.states[e] && h.states[e].attributes.friendly_name) || e;
    const add = (e, forced) => {
      const s = h.states[e], r = reg[e] || {};
      if (!s || seen.has(e)) return;
      if (!forced && (r.hidden || r.entity_category || c.exclude_platforms.includes(r.platform) || c.exclude.includes(e) || !H.ok(s))) return;
      const n = nm(e).trim().toLowerCase().replace(/\+$/, '');
      // duplikaty (ta sama nazwa / to samo urządzenie z kilku integracji, np. Cast + Music Assistant) -> zostaje pierwszy
      if (!forced && (names.has(n) || (r.device_id && seen.has('dev:' + r.device_id)))) return;
      seen.add(e); names.set(n, e); if (r.device_id) seen.add('dev:' + r.device_id);
      out.push(e);
    };
    for (const e of c.entities) add(e, true);
    if (c.discover) for (const e of Object.keys(h.states)) if (e.startsWith('media_player.')) add(e, false);
    this._lc = { key, st: h.states, ent: h.entities, list: out }; this._entsC = null;
    return out;
  }
  ents() { return this._hass ? this._list() : this._config.entities; }
  _extraSig() { return [this._lc && this._lc.key]; }
  _update(force) {
    // nie przerysowuj, gdy użytkownik ma otwartą listę źródeł / przeciąga głośność
    const a = this.shadowRoot.activeElement;
    if (a && (a.tagName === 'SELECT' || a.tagName === 'INPUT') && this._config && this._hass) { if (this._changed()) this._pendingUpd = true; return; }
    super._update(force);
  }
  connectedCallback() { super.connectedCallback();
    if (this._wired) return; this._wired = true;
    this.shadowRoot.addEventListener('change', (e) => {
      const t = e.target, en = t.dataset && t.dataset.e; if (!en) return;
      if (t.dataset.act === 'vol') H.call(this._hass, 'media_player', 'volume_set', { entity_id: en, volume_level: Number(t.value) / 100 });
      if (t.dataset.act === 'src' && t.value) H.call(this._hass, 'media_player', 'select_source', { entity_id: en, source: t.value });
      t.blur(); if (this._pendingUpd) { this._pendingUpd = false; setTimeout(() => this._update(true), 50); }
    });
    this.shadowRoot.addEventListener('input', (e) => { const t = e.target; if (t.dataset && t.dataset.act === 'vol') { const o = t.parentNode.querySelector('output'); if (o) o.textContent = t.value + '%'; } }, { passive: true });
    this.shadowRoot.addEventListener('focusout', () => { if (this._pendingUpd) { this._pendingUpd = false; setTimeout(() => this._update(true), 50); } });
  }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s2) var(--s3) var(--s3); height:auto; min-height:100%; }
.hd .cnt{ font-size:var(--fs-xs); color:#5A5E64; font-weight:400; }
.big{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, calc(var(--k) * 250)), 1fr)); gap:var(--s2); }
.pl{ position:relative; display:flex; flex-direction:column; gap:var(--s1); padding:var(--s2); border-radius:var(--r-md); background:var(--hg-inner-bg); border:0; box-shadow:var(--hg-inner-hi); overflow:hidden; min-width:0; contain:layout paint; }
.pl .art{ position:relative; display:flex; gap:var(--s2); align-items:center; min-width:0; }
.cov{ width:64u; height:64u; border-radius:var(--r-sm); flex:none; background:#E9ECEF center/cover no-repeat; display:flex; align-items:center; justify-content:center; color:#8A8E94; box-shadow:var(--hg-sh); }
.cov ha-icon{ width:28u; height:28u; }
.meta{ min-width:0; flex:1; display:flex; flex-direction:column; gap:2u; }
.meta .who{ display:flex; align-items:center; gap:5u; font-size:var(--fs-xs); color:#5A5E64; min-width:0; }
.meta .who b{ font-weight:600; color:#2A2D31; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.meta .ttl{ font-size:var(--fs-md); font-weight:600; line-height:1.2; color:#16181B; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.meta .sub{ font-size:var(--fs-sm); color:#4A4E54; line-height:1.25; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
.dot{ width:6u; height:6u; border-radius:50%; background:#9AA0A6; flex:none; } .playing .dot, .on .dot{ background:var(--hg-accent); } .playing .dot{ animation:hgpulse 1.6s infinite; } .paused .dot{ background:var(--hg-accent); }
.pg{ display:flex; align-items:center; gap:var(--s1); font-size:var(--fs-xs); color:#5A5E64; font-variant-numeric:tabular-nums; }
.pg .tr{ position:relative; flex:1; height:4u; border-radius:2u; background:rgba(0,0,0,.08); overflow:hidden; }
.pg .tr i{ position:absolute; left:0; top:0; bottom:0; border-radius:2u; background:var(--hg-accent); width:var(--p0); }
.playing .pg .tr i{ animation:hgprog var(--dur) linear forwards; }
@keyframes hgprog{ to{ width:100% } }
.ctl{ display:flex; align-items:center; gap:4u; }
.cb{ position:relative; width:max(calc(var(--k) * 30), 40px, var(--hg-tgt, 0px)); height:max(calc(var(--k) * 30), 40px, var(--hg-tgt, 0px)); border-radius:50%; display:flex; align-items:center; justify-content:center; color:#2A2D31; flex:none; transition:background .2s, transform .15s; }
.cb:hover{ background:rgba(0,0,0,.05); } .cb:active{ transform:scale(.92); } .cb ha-icon{ width:20px; height:20px; }
.cb.main{ background:#1F2125; color:#fff; } .cb.main ha-icon{ width:24px; height:24px; }
.cb.pw.on{ color:var(--hg-accent-tx); } .cb.soft{ background:rgba(0,0,0,.06); }
.sp2{ flex:1; }
.vol{ display:flex; align-items:center; gap:var(--s1); flex:1; min-width:calc(var(--k) * 90); }
.vol ha-icon{ width:14u; height:14u; color:#5A5E64; flex:none; }
.vol output{ font-size:var(--fs-xs); color:#5A5E64; width:24u; text-align:right; font-variant-numeric:tabular-nums; }
input[type=range]{ -webkit-appearance:none; appearance:none; flex:1; min-width:0; height:max(calc(var(--k) * 20), var(--hg-tgt, 0px)); background:transparent; margin:0; touch-action:pan-y; }
input[type=range]::-webkit-slider-runnable-track{ height:4u; border-radius:2u; background:linear-gradient(90deg, var(--hg-accent) var(--v), rgba(0,0,0,.1) var(--v)); }
input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; width:14u; height:14u; margin-top:-5u; border-radius:50%; background:var(--hg-thumb); box-shadow:var(--hg-thumb-sh); }
input[type=range]::-moz-range-track{ height:4u; border-radius:2u; background:rgba(0,0,0,.1); } input[type=range]::-moz-range-progress{ height:4u; border-radius:2u; background:var(--hg-accent); }
input[type=range]::-moz-range-thumb{ width:14u; height:14u; border:0; border-radius:50%; background:var(--hg-thumb); box-shadow:var(--hg-thumb-sh); }
.row2{ display:flex; align-items:center; gap:var(--s1); flex-wrap:wrap; }
select{ font:inherit; font-size:var(--fs-sm); color:#2A2D31; height:max(calc(var(--k) * 26), var(--hg-tgt, 0px)); max-width:100%; min-width:0; flex:0 1 calc(var(--k) * 150); padding:0 var(--s4) 0 var(--s1); border-radius:var(--r-sm); border:1px solid rgba(0,0,0,.08);
  background:rgba(255,255,255,.75) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%235A5E64' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E") no-repeat right 5px center/16px; -webkit-appearance:none; appearance:none; }
.sm{ display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, calc(var(--k) * 190)), 1fr)); gap:var(--s1); }
.ci{ display:flex; align-items:center; gap:var(--s1); padding:var(--s1) var(--s1) var(--s1) var(--s1); border-radius:var(--r-md); background:var(--hg-inner-bg); border:0; box-shadow:var(--hg-inner-hi); min-width:0; }
.ci .cov{ width:34u; height:34u; border-radius:var(--r-sm); box-shadow:none; } .ci .cov ha-icon{ width:17u; height:17u; }
.ci .meta .ttl{ font-size:var(--fs-sm); -webkit-line-clamp:1; } .ci .meta .sub{ font-size:var(--fs-xs); }
.un{ display:flex; flex-wrap:wrap; gap:5u; align-items:center; font-size:var(--fs-xs); color:#5A5E64; }
.un span{ padding:3u var(--s1); border-radius:var(--r-sm); background:rgba(255,255,255,.45); }
.empty{ font-size:var(--fs-sm); color:#5A5E64; padding:var(--s2) 2u; }
`);
  }
  _ctl(e, s, big) {
    const f = Number(s.attributes.supported_features) || 0, st = s.state, ic = (x) => H.icon(x);
    const playing = st === 'playing';
    const btn = (act, icon, lbl, cls = '') => `<button class="cb ${cls}" data-act="${act}" data-e="${e}" aria-label="${lbl}" title="${lbl}">${ic(icon)}</button>`;
    let h = '';
    if (big && (f & HG_MP.PREV)) h += btn('prev', 'mdi:skip-previous', hgTr('Poprzedni', 'Previous'));
    if (!big && ['off', 'standby'].includes(st)) return h;          // wyłączony: tylko przycisk zasilania
    if (f & (HG_MP.PAUSE | HG_MP.PLAY)) h += btn('pp', playing ? 'mdi:pause' : 'mdi:play', playing ? hgTr('Pauza', 'Pause') : hgTr('Odtwarzaj', 'Play'), big ? 'main' : 'soft');
    else if (playing && (f & HG_MP.STOP)) h += btn('stop', 'mdi:stop', 'Stop', 'main');
    if (big && (f & HG_MP.NEXT)) h += btn('next', 'mdi:skip-next', hgTr('Następny', 'Next'));
    return h;
  }
  _pw(e, s) {
    const f = Number(s.attributes.supported_features) || 0, on = !['off', 'standby'].includes(s.state);
    if (!(f & (on ? HG_MP.OFF : HG_MP.ON))) return '';
    return `<button class="cb pw ${on ? 'on' : ''}" data-act="power" data-e="${e}" aria-label="${on ? hgTr('Wyłącz', 'Turn off') : hgTr('Włącz', 'Turn on')}" aria-pressed="${on}" title="${on ? hgTr('Wyłącz', 'Turn off') : hgTr('Włącz', 'Turn on')}">${H.icon('mdi:power')}</button>`;
  }
  _cov(e, s, cls = '') {
    const a = s.attributes, pic = a.entity_picture, icon = this._config.icons[e] || (/tv|dekoder|tele/.test(e) ? 'mdi:television-box' : /nest|gh|home/.test(e) ? 'mdi:cast-audio' : 'mdi:speaker');
    return pic ? `<span class="cov ${cls}" style="background-image:url('${H.cssUrl(pic)}')" aria-hidden="true"></span>` : `<span class="cov ${cls}" aria-hidden="true">${H.icon(icon)}</span>`;
  }
  render() {
    const c = this._config, h = this._hass, list = this._list(), nm = (e) => c.names[e] || H.name(h, e);
    const act = [], idle = [], un = [];
    for (const e of list) { const s = h.states[e]; if (!H.ok(s)) un.push(e); else if (hgMpActive(s)) act.push(e); else idle.push(e); }
    const fmtT = (x) => { x = Math.max(0, Math.round(x)); const hh = Math.floor(x / 3600), m = Math.floor((x % 3600) / 60), ss = x % 60; return (hh ? hh + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); };
    const big = act.map((e) => {
      const s = h.states[e], a = s.attributes, f = Number(a.supported_features) || 0;
      const title = a.media_title || a.media_channel || a.app_name || hgMpSt(s.state) || s.state;
      const sub = [a.media_artist || a.media_series_title, a.media_album_name].filter(Boolean).join(' · ') || (a.app_name && a.app_name !== title ? a.app_name : '') || (a.media_start_time ? `${a.media_start_time}–${a.media_end_time || ''}` : '');
      let pg = '';
      if (a.media_duration > 0 && a.media_position != null) {
        const upd = Date.parse(a.media_position_updated_at || s.last_updated), pos = Math.min(a.media_duration, a.media_position + (s.state === 'playing' ? (Date.now() - upd) / 1000 : 0));
        pg = `<div class="pg"><span>${fmtT(pos)}</span><span class="tr"><i style="--p0:${((pos / a.media_duration) * 100).toFixed(2)}%;--dur:${Math.max(0, a.media_duration - pos).toFixed(0)}s"></i></span><span>${fmtT(a.media_duration)}</span></div>`;
      } else if (typeof a.media_start_time === 'string' && typeof a.media_end_time === 'string') {
        // program TV (Enigma2): postęp audycji wg godzin z EPG
        const [sh, sm] = a.media_start_time.split(':').map(Number), [eh, em] = a.media_end_time.split(':').map(Number);
        const now = new Date(), st0 = new Date(now); st0.setHours(sh, sm, 0, 0); const en = new Date(now); en.setHours(eh, em, 0, 0); if (en <= st0) en.setDate(en.getDate() + 1);
        const dur = (en - st0) / 1000, pos = Math.min(dur, Math.max(0, (now - st0) / 1000));
        if (dur > 0 && dur < 86400) pg = `<div class="pg"><span>${H.esc(a.media_start_time)}</span><span class="tr"><i style="--p0:${((pos / dur) * 100).toFixed(2)}%;--dur:${(dur - pos).toFixed(0)}s"></i></span><span>${H.esc(a.media_end_time)}</span></div>`;
      }
      const vol = (f & HG_MP.VOL_SET) && a.volume_level != null ? Math.round(a.volume_level * 100) : null;
      const volH = vol != null ? `<label class="vol">${H.icon(a.is_volume_muted ? 'mdi:volume-off' : 'mdi:volume-high')}<input type="range" min="0" max="100" step="1" value="${vol}" style="--v:${vol}%" data-act="vol" data-e="${e}" aria-label="${hgTr('Głośność', 'Volume')}: ${H.esc(nm(e))}"><output>${vol}%</output></label>`
        : (f & HG_MP.VOL_STEP) ? `<span class="vol">${H.icon('mdi:volume-high')}<button class="cb" data-act="vdn" data-e="${e}" aria-label="${hgTr('Ciszej', 'Volume down')}">${H.icon('mdi:minus')}</button><button class="cb" data-act="vup" data-e="${e}" aria-label="${hgTr('Głośniej', 'Volume up')}">${H.icon('mdi:plus')}</button></span>` : '';
      const srcs = (f & HG_MP.SOURCE) && Array.isArray(a.source_list) && a.source_list.length ? a.source_list : null;
      const srcH = srcs ? `<select data-act="src" data-e="${e}" aria-label="${hgTr('Źródło', 'Source')}: ${H.esc(nm(e))}">${(a.source && !srcs.includes(a.source) ? [a.source] : []).concat(srcs).map((x) => `<option ${x === a.source || x === a.app_name ? 'selected' : ''}>${H.esc(x)}</option>`).join('')}${!a.source && !srcs.includes(a.app_name) ? `<option selected value="">${hgTr('Źródło…', 'Source…')}</option>` : ''}</select>` : '';
      return `<div class="pl ${s.state}"><div class="art">${this._cov(e, s)}<div class="meta"><span class="who"><i class="dot"></i><b>${H.esc(nm(e))}</b><span>· ${H.esc(hgMpSt(s.state) || s.state)}</span></span>
          <span class="ttl">${H.esc(title)}</span>${sub ? `<span class="sub">${H.esc(sub)}</span>` : ''}</div></div>
        ${pg}<div class="ctl">${this._ctl(e, s, true)}<span class="sp2"></span>${this._pw(e, s)}<button class="cb" data-act="more" data-e="${e}" aria-label="${hgTr('Szczegóły', 'Details')}" title="${hgTr('Szczegóły', 'Details')}">${H.icon('mdi:dots-horizontal')}</button></div>
        ${volH || srcH ? `<div class="row2">${volH}${srcH}</div>` : ''}</div>`;
    }).join('');
    const sm = idle.map((e) => { const s = h.states[e], a = s.attributes;
      return `<div class="ci ${s.state}">${this._cov(e, s)}<div class="meta"><span class="ttl">${H.esc(nm(e))}</span><span class="sub">${H.esc(hgMpSt(s.state) || s.state)}${a.app_name ? ' · ' + H.esc(a.app_name) : ''}</span></div>
        ${this._ctl(e, s, false)}${this._pw(e, s)}</div>`; }).join('');
    const unN = [...new Set(un.map(nm))];
    const unH = unN.length ? `<div class="un">${hgTr('Niedostępne:', 'Unavailable:')}${unN.map((x) => `<span>${H.esc(x)}</span>`).join('')}</div>` : '';
    return `<ha-card class="glass"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span><span class="cnt">${act.length ? `${act.length} ${hgTr('aktywne', 'active')}` : hgTr('nic nie gra', 'nothing playing')}</span></div>
      ${big ? `<div class="big">${big}</div>` : ''}${sm ? `<div class="sm">${sm}</div>` : ''}${!big && !sm ? `<div class="empty">${hgTr('Brak dostępnych odtwarzaczy', 'No available players')}</div>` : ''}${unH}</ha-card>`;
  }
  onAct(a, t) {
    const e = t.dataset.e, s = H.st(this._hass, e), m = (sv, d = {}) => H.call(this._hass, 'media_player', sv, { entity_id: e, ...d });
    if (a === 'pp') return m(s && s.state === 'playing' ? 'media_pause' : 'media_play');
    if (a === 'stop') return m('media_stop');
    if (a === 'prev') return m('media_previous_track');
    if (a === 'next') return m('media_next_track');
    if (a === 'vup') return m('volume_up');
    if (a === 'vdn') return m('volume_down');
    if (a === 'power') return m(s && !['off', 'standby'].includes(s.state) ? 'turn_off' : 'turn_on');
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: e });
  }
  getCardSize() { return 6; }
}
hgReg('hg-players-card', HGPlayersCard, 'Home Glass – Multimedia', hgTr('Odtwarzacze: okładka, tytuł, postęp, sterowanie, głośność, źródło', 'Players: artwork, title, progress, controls, volume, source'));
