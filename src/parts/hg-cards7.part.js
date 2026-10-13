/* ===================== MULTIMEDIA + ENERGIA ===================== */
/* --- hg-players-card: odtwarzacze (konfigurowane + wykryte), aktywne duże z okładką, bezczynne kompaktowe, niedostępne jako chipy --- */
const HG_MP = { PAUSE: 1, SEEK: 2, VOL_SET: 4, MUTE: 8, PREV: 16, NEXT: 32, ON: 128, OFF: 256, VOL_STEP: 1024, SOURCE: 2048, STOP: 4096, PLAY: 16384 };
const HG_MP_ST = { playing: 'Odtwarza', paused: 'Wstrzymano', idle: 'Bezczynny', on: 'Włączony', off: 'Wyłączony', standby: 'Czuwanie', buffering: 'Buforowanie…', unavailable: 'Niedostępny', unknown: 'Nieznany' };
/* aktywny = coś gra / jest wstrzymane albo urządzenie włączone z treścią (np. dekoder Enigma2 ma stan „on” z kanałem) */
const hgMpActive = (s) => !!s && (['playing', 'paused', 'buffering'].includes(s.state) || (s.state === 'on' && !!(s.attributes.media_title || s.attributes.media_channel)));
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
.pl{ position:relative; display:flex; flex-direction:column; gap:var(--s1); padding:var(--s2); border-radius:var(--r-md); background:rgba(255,255,255,.62); border:1px solid rgba(255,255,255,.85); overflow:hidden; min-width:0; contain:layout paint; }
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
.ci{ display:flex; align-items:center; gap:var(--s1); padding:var(--s1) var(--s1) var(--s1) var(--s1); border-radius:var(--r-md); background:rgba(255,255,255,.5); border:1px solid rgba(255,255,255,.75); min-width:0; }
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
    if (big && (f & HG_MP.PREV)) h += btn('prev', 'mdi:skip-previous', 'Poprzedni');
    if (!big && ['off', 'standby'].includes(st)) return h;          // wyłączony: tylko przycisk zasilania
    if (f & (HG_MP.PAUSE | HG_MP.PLAY)) h += btn('pp', playing ? 'mdi:pause' : 'mdi:play', playing ? 'Pauza' : 'Odtwarzaj', big ? 'main' : 'soft');
    else if (playing && (f & HG_MP.STOP)) h += btn('stop', 'mdi:stop', 'Stop', 'main');
    if (big && (f & HG_MP.NEXT)) h += btn('next', 'mdi:skip-next', 'Następny');
    return h;
  }
  _pw(e, s) {
    const f = Number(s.attributes.supported_features) || 0, on = !['off', 'standby'].includes(s.state);
    if (!(f & (on ? HG_MP.OFF : HG_MP.ON))) return '';
    return `<button class="cb pw ${on ? 'on' : ''}" data-act="power" data-e="${e}" aria-label="${on ? 'Wyłącz' : 'Włącz'}" aria-pressed="${on}" title="${on ? 'Wyłącz' : 'Włącz'}">${H.icon('mdi:power')}</button>`;
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
      const title = a.media_title || a.media_channel || a.app_name || HG_MP_ST[s.state] || s.state;
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
      const volH = vol != null ? `<label class="vol">${H.icon(a.is_volume_muted ? 'mdi:volume-off' : 'mdi:volume-high')}<input type="range" min="0" max="100" step="1" value="${vol}" style="--v:${vol}%" data-act="vol" data-e="${e}" aria-label="Głośność: ${H.esc(nm(e))}"><output>${vol}%</output></label>`
        : (f & HG_MP.VOL_STEP) ? `<span class="vol">${H.icon('mdi:volume-high')}<button class="cb" data-act="vdn" data-e="${e}" aria-label="Ciszej">${H.icon('mdi:minus')}</button><button class="cb" data-act="vup" data-e="${e}" aria-label="Głośniej">${H.icon('mdi:plus')}</button></span>` : '';
      const srcs = (f & HG_MP.SOURCE) && Array.isArray(a.source_list) && a.source_list.length ? a.source_list : null;
      const srcH = srcs ? `<select data-act="src" data-e="${e}" aria-label="Źródło: ${H.esc(nm(e))}">${(a.source && !srcs.includes(a.source) ? [a.source] : []).concat(srcs).map((x) => `<option ${x === a.source || x === a.app_name ? 'selected' : ''}>${H.esc(x)}</option>`).join('')}${!a.source && !srcs.includes(a.app_name) ? '<option selected value="">Źródło…</option>' : ''}</select>` : '';
      return `<div class="pl ${s.state}"><div class="art">${this._cov(e, s)}<div class="meta"><span class="who"><i class="dot"></i><b>${H.esc(nm(e))}</b><span>· ${H.esc(HG_MP_ST[s.state] || s.state)}</span></span>
          <span class="ttl">${H.esc(title)}</span>${sub ? `<span class="sub">${H.esc(sub)}</span>` : ''}</div></div>
        ${pg}<div class="ctl">${this._ctl(e, s, true)}<span class="sp2"></span>${this._pw(e, s)}<button class="cb" data-act="more" data-e="${e}" aria-label="Szczegóły" title="Szczegóły">${H.icon('mdi:dots-horizontal')}</button></div>
        ${volH || srcH ? `<div class="row2">${volH}${srcH}</div>` : ''}</div>`;
    }).join('');
    const sm = idle.map((e) => { const s = h.states[e], a = s.attributes;
      return `<div class="ci ${s.state}">${this._cov(e, s)}<div class="meta"><span class="ttl">${H.esc(nm(e))}</span><span class="sub">${H.esc(HG_MP_ST[s.state] || s.state)}${a.app_name ? ' · ' + H.esc(a.app_name) : ''}</span></div>
        ${this._ctl(e, s, false)}${this._pw(e, s)}</div>`; }).join('');
    const unN = [...new Set(un.map(nm))];
    const unH = unN.length ? `<div class="un">Niedostępne:${unN.map((x) => `<span>${H.esc(x)}</span>`).join('')}</div>` : '';
    return `<ha-card class="glass"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span><span class="cnt">${act.length ? `${act.length} aktywne` : 'nic nie gra'}</span></div>
      ${big ? `<div class="big">${big}</div>` : ''}${sm ? `<div class="sm">${sm}</div>` : ''}${!big && !sm ? '<div class="empty">Brak dostępnych odtwarzaczy</div>' : ''}${unH}</ha-card>`;
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
hgReg('hg-players-card', HGPlayersCard, 'Home Glass – Multimedia', 'Odtwarzacze: okładka, tytuł, postęp, sterowanie, głośność, źródło');

/* --- hg-phases-card: moc teraz na fazach (zużycie), napięcia, prądy; kolor wg obciążenia --- */
const hgLoadCol = (p) => (p < 30 ? 'var(--hg-accent)' : p < 70 ? 'var(--hg-accent)' : '#E5484D');
class HGPhasesCard extends HGBase {
  defaults() { return { title: 'Moc teraz', icon: 'mdi:flash-outline', phases: [], max_power: 17250, phase_max: 5750 }; }
  ents() { return this._config.phases.flatMap((p) => [p.power, p.voltage, p.current]).filter(Boolean); }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s2) var(--s3) var(--s3); }
.hd .ic{ color:var(--hg-accent-tx); }
.tot{ display:flex; align-items:baseline; gap:var(--s1); flex-wrap:wrap; } .tot span{ white-space:nowrap; } .tot b{ font-size:calc(28u * var(--hg-fsv, 1)); font-weight:600; letter-spacing:-.02em; color:#16181B; } .tot span{ font-size:var(--fs-sm); color:#5A5E64; }
.lv{ font-style:normal; font-size:var(--fs-xs); font-weight:600; padding:2u var(--s1); border-radius:var(--r-sm); color:#111214; background:var(--c); white-space:nowrap; }
.ph{ display:grid; grid-template-columns:auto 1fr auto; align-items:center; column-gap:10u; row-gap:2u; padding:var(--s1) var(--s2); border-radius:var(--r-sm); background:rgba(255,255,255,.55); }
.ph .n{ font-size:var(--fs-sm); font-weight:600; color:#2A2D31; } .ph .w{ font-size:var(--fs-md); font-weight:600; font-variant-numeric:tabular-nums; text-align:right; }
.ph .b{ height:5u; border-radius:3u; background:rgba(0,0,0,.08); overflow:hidden; } .ph .b i{ display:block; height:100%; border-radius:3u; background:var(--c); transition:width .6s cubic-bezier(.2,.8,.2,1); }
.ph .va{ grid-column:1 / -1; display:flex; gap:var(--s2); font-size:var(--fs-xs); color:#5A5E64; font-variant-numeric:tabular-nums; }
.ph.na{ opacity:.55; }
.lst{ display:flex; flex-direction:column; gap:var(--s1); }
`);
  }
  render() {
    const c = this._config, h = this._hass;
    let tot = 0, n = 0;
    const rows = c.phases.map((p) => {
      const w = hgW(h, p.power), v = H.num(h, p.voltage), a = H.num(h, p.current);
      if (w == null) return `<div class="ph na"><span class="n">${H.esc(p.name)}</span><span class="b"></span><span class="w">–</span><div class="va">niedostępna</div></div>`;
      const ww = Math.abs(w); tot += ww; n++;
      const pct = Math.min(100, (ww / c.phase_max) * 100);
      return `<div class="ph" style="--c:${hgLoadCol(pct)}" title="${H.esc(p.name)}: ${H.fmt(ww, 0)} W · ${Math.round(pct)}% z ${H.fmt(c.phase_max, 0)} W"><span class="n">${H.esc(p.name)}</span>
        <span class="b" role="meter" aria-label="Obciążenie ${H.esc(p.name)}" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(1.5, pct).toFixed(1)}%"></i></span><span class="w">${H.fmt(ww, 0)} W</span>
        <div class="va"><span>${v != null ? H.fmt(v, 1) + ' V' : '– V'}</span><span>${a != null ? H.fmt(a, 2) + ' A' : '– A'}</span><span>${Math.round(pct)}% obciążenia</span></div></div>`;
    }).join('');
    const pct = Math.min(100, (tot / c.max_power) * 100), lvl = pct < 30 ? 'niskie' : pct < 70 ? 'średnie' : 'wysokie';
    const kw = tot >= 1000 ? [H.fmt(tot / 1000, 2), 'kW'] : [H.fmt(tot, 0), 'W'];
    return `<ha-card class="glass warm"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>${n ? `<em class="lv" style="--c:${hgLoadCol(pct)}">obciążenie ${lvl}</em>` : ''}</div>
      ${n ? `<div class="tot"><b>${kw[0]}</b><span>${kw[1]} · ${Math.round(pct)}% z ${H.fmt(c.max_power / 1000, 2)} kW</span></div>` : '<div class="ph"><b>Brak źródła danych</b></div>'}
      <div class="lst">${rows}</div></ha-card>`;
  }
  getCardSize() { return 4; }
}
hgReg('hg-phases-card', HGPhasesCard, 'Home Glass – Fazy', 'Moc, napięcie i prąd na fazach');

/* --- wspólne: preferencje panelu Energia HA (energy/get_prefs) --- */
const HGEnergyPrefs = {
  async get(hass) {
    if (this._v && Date.now() - this._t < 10 * 60 * 1000) return this._v;
    if (this._p) return this._p;
    this._p = hass.callWS({ type: 'energy/get_prefs' }).then((p) => {
      const src = p.energy_sources || [];
      const grid = src.filter((s) => s.type === 'grid'), solar = src.filter((s) => s.type === 'solar');
      // HA 2025+: grid ma flow_from[]; starsze wersje: stat_energy_from bezpośrednio
      const cons = grid.flatMap((g) => (g.flow_from ? g.flow_from.map((f) => f.stat_energy_from) : [g.stat_energy_from])).filter(Boolean);
      const prices = grid.flatMap((g) => (g.flow_from ? g.flow_from : [g])).map((f) => f.number_energy_price).filter((x) => x != null);
      const v = { consumption: cons, production: solar.map((s) => s.stat_energy_from).filter(Boolean),
        price: prices.length && prices.every((x) => x === prices[0]) ? prices[0] : null };
      this._v = v; this._t = Date.now(); return v;
    }).finally(() => { this._p = null; });
    return this._p;
  },
};
/* --- hg-energy-stats-card: dziś / ten tydzień / ten miesiąc (jak panel Energia HA) + wykres z przełącznikiem dzień/tydzień/miesiąc --- */
class HGEnergyStatsCard extends HGBase {
  defaults() {
    return { title: 'Zużycie i produkcja', icon: 'mdi:chart-bar', consumption: null, production: null, price: null, currency: 'zł',
      colors: { consumption: 'var(--hg-accent)', production: 'var(--hg-accent)' }, link: '/energy' };
  }
  setConfig(c) { super.setConfig(hgDeep(this.defaults(), c)); }
  ents() { return []; }
  _extraSig() { return [this._d ? this._d.t : 0, this._mode || 'week', this._sel]; }
  connectedCallback() { super.connectedCallback(); this._load(); clearInterval(this._iv); this._iv = setInterval(() => this._load(true), 5 * 60 * 1000); }
  disconnectedCallback() { clearInterval(this._iv); }
  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._load(); this._update(); }
  get hass() { return this._hass; }
  async _load(force) {
    const c = this._config, h = this._hass; if (!h || !c || this._loading) return; this._loading = true;
    try {
      let pr = {}; try { pr = await HGEnergyPrefs.get(h); } catch (e) { /* bez prefs -> konfiguracja karty */ }
      const cons = c.consumption || pr.consumption || [], prod = c.production || pr.production || [], price = c.price != null ? c.price : pr.price;
      const ids = cons.concat(prod), tz = HGStats.tz(h), now = Date.now();
      const t0 = HGStats.midnight(now, tz), key = HGStats.key(new Date(now), tz), [y, mo, da] = key.split('-').map(Number);
      const dow = (new Date(Date.UTC(y, mo - 1, da)).getUTCDay() + 6) % 7;            // 0 = poniedziałek (tydzień jak w HA)
      const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const nDays = Math.max(da, dow + 1);
      if (force) delete HGStats.cache[ids.join(',') + nDays];
      const daily = await HGStats.daily(h, ids, nDays);
      const hr = await h.callWS({ type: 'recorder/statistics_during_period', start_time: new Date(t0).toISOString(), statistic_ids: ids, period: 'hour', types: ['change'], units: { energy: 'kWh' } });
      const hours = [...Array(24)].map((_, i) => ({ c: 0, p: 0, hc: false, hp: false }));
      const hourOf = (ms) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(ms)));
      for (const id of ids) for (const row of hr[id] || []) { const t = typeof row.start === 'number' ? row.start : Date.parse(row.start); const k = hourOf(t); if (!hours[k]) continue;
        if (cons.includes(id)) { hours[k].c += Math.max(0, row.change || 0); hours[k].hc = true; } else { hours[k].p += Math.max(0, row.change || 0); hours[k].hp = true; } }
      const day = (k, set) => set.reduce((a, id) => a + Math.max(0, (daily.byId[id] || {})[k] || 0), 0);
      const has = (k, set) => set.some((id) => daily.present[id] && daily.present[id].has(k));
      const D = daily.days.map((d) => ({ d, k: d.__k, c: day(d.__k, cons), p: day(d.__k, prod), hc: has(d.__k, cons), hp: has(d.__k, prod) }));
      const sum = (arr, f) => arr.reduce((a, x) => a + x[f], 0);
      const today = D[D.length - 1], week = D.slice(-(dow + 1)), month = D.slice(-da);
      // ostatni dzień z produkcją (do notki o falowniku)
      const lastP = [...D].reverse().find((x) => x.hp && x.p > 0);
      this._d = { t: now, cons, prod, price, dow, dim, da, y, mo, hours, D, today, week, month, lastP,
        tot: { day: [today.c, today.p], week: [sum(week, 'c'), sum(week, 'p')], month: [sum(month, 'c'), sum(month, 'p')] },
        hasP: { day: today.hp, week: week.some((x) => x.hp), month: month.some((x) => x.hp) } };
      this._err = null;
    } catch (e) { this._err = String((e && e.message) || e); }
    this._loading = false; this.rerender();
  }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s2) var(--s3) var(--s2); }
.tiles{ display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:var(--s1); }
.tl{ display:flex; flex-direction:column; gap:3u; padding:var(--s1) var(--s2); border-radius:var(--r-sm); background:rgba(255,255,255,.55); text-align:left; min-width:0; position:relative; transition:background .2s; }
.tl.sel{ background:rgba(255,255,255,.9); box-shadow:var(--hg-sh); }
.tl small{ font-size:var(--fs-xs); color:#5A5E64; font-weight:400; }
.tl .r{ display:flex; align-items:baseline; gap:4u; font-variant-numeric:tabular-nums; white-space:nowrap; }
.tl .r i{ width:6u; height:6u; border-radius:50%; background:var(--c); flex:none; align-self:center; }
.tl .r b{ font-size:var(--fs-md); font-weight:600; letter-spacing:-.01em; } .tl .r span{ font-size:var(--fs-xs); color:#5A5E64; }
.tl .r.p b{ font-size:var(--fs-md); font-weight:400; }
.tl .cost{ font-size:var(--fs-xs); color:#4A4E54; }
.sw{ display:flex; gap:2u; padding:2u; border-radius:var(--r-sm); background:rgba(118,118,128,.12); }
.sw button{ position:relative; padding:0 var(--s2); height:max(calc(var(--k) * 22), var(--hg-tgt, 0px)); border-radius:calc(var(--r-sm) - 2u); font-size:var(--fs-xs); font-weight:400; color:#4A4E54; }
.sw button.act{ background:#fff; color:#16181B; font-weight:600; box-shadow:var(--hg-sh-sm); }
.lg{ display:flex; gap:var(--s2); font-size:var(--fs-xs); color:#5A5E64; align-items:center; } .lg i{ display:inline-block; width:6u; height:6u; border-radius:50%; margin-right:4u; }
.ch{ position:relative; flex:1; min-height:120u; max-height:230u; display:grid; grid-template-columns:repeat(var(--n), minmax(0, 1fr)); gap:var(--g); }
.ch::after{ content:''; position:absolute; left:0; right:0; bottom:13u; height:1px; background:rgba(30,32,36,.12); pointer-events:none; }
.d{ position:relative; display:flex; flex-direction:column; align-items:center; gap:3u; min-width:0; border-radius:var(--r-sm); }
.d.sel{ background:rgba(255,255,255,.45); }
.bs{ position:relative; flex:1; width:100%; }
.bw{ position:absolute; left:0; right:0; top:4u; bottom:0; display:flex; align-items:flex-end; justify-content:center; gap:var(--bg); }
.bw i{ display:block; width:var(--bw); max-width:9u; height:var(--h); min-height:1px; border-radius:3u 3u 1px 1px; background:var(--c); transform-origin:bottom; animation:hgbar .5s cubic-bezier(.2,.8,.2,1) both; }
.bw i.z{ height:0; min-height:0; } .bw i.nd{ width:4u; height:4u; min-height:0; border-radius:50%; background:#A9ADB2; animation:none; margin-bottom:-2u; }
.fut .bw{ opacity:.0; } .today .bw i{ opacity:.55; }
.d small{ font-size:max(7.5u, var(--hg-fs-min, 0px)); color:#5A5E64; line-height:10u; height:10u; white-space:nowrap; } .d.today small{ color:#16181B; font-weight:600; }
.d.lbl-skip small{ visibility:hidden; }
.tip{ position:absolute; bottom:calc(100% - 6u); left:50%; transform:translateX(-50%); background:#fff; border:1px solid rgba(0,0,0,.06); border-radius:var(--r-sm); padding:var(--s1) var(--s2); font-size:var(--fs-xs); line-height:1.4; white-space:nowrap; color:#2B2E33; box-shadow:var(--hg-sh);
  z-index:5; pointer-events:none; text-align:left; }
.tip i{ display:inline-block; width:6u; height:6u; border-radius:50%; margin-right:4u; }
.d.l .tip{ left:0; transform:none; } .d.r .tip{ left:auto; right:0; transform:none; }
.ft{ display:flex; align-items:center; gap:var(--s1); font-size:var(--fs-xs); color:#6A6E74; flex-wrap:wrap; }
.ft a{ margin-left:auto; color:var(--hg-accent-tx); font-weight:600; text-decoration:none; display:flex; align-items:center; gap:3u; min-height:var(--hg-tgt, 0px); } .ft a ha-icon{ width:12u; height:12u; }
.ctl{ display:flex; align-items:center; gap:var(--s2); flex-wrap:wrap; justify-content:space-between; }
`);
  }
  _bars() {
    const d = this._d, m = this._mode || 'week', DAYS = H.DAYS;
    if (m === 'day') {
      const nowH = Number(new Intl.DateTimeFormat('en-GB', { timeZone: HGStats.tz(this._hass), hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
      return d.hours.map((x, i) => ({ lbl: String(i), skip: i % 3 !== 0, c: x.c, p: x.p, hc: x.hc, hp: x.hp, fut: i > nowH, today: i === nowH, name: `${i}:00–${i + 1}:00` }));
    }
    if (m === 'week') {
      const wk = d.week;
      return [...Array(7)].map((_, i) => { const x = wk[i]; return x ? { lbl: DAYS[x.d.getDay()], c: x.c, p: x.p, hc: x.hc, hp: x.hp, today: i === wk.length - 1, name: x.d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }) }
        : { lbl: DAYS[(i + 1) % 7], fut: true, c: 0, p: 0, name: '' }; });
    }
    const mo = d.month;
    return [...Array(d.dim)].map((_, i) => { const x = mo[i]; return x ? { lbl: String(i + 1), skip: (i + 1) % 5 !== 0 && i !== 0, c: x.c, p: x.p, hc: x.hc, hp: x.hp, today: i === mo.length - 1, name: x.d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }) }
      : { lbl: String(i + 1), skip: (i + 1) % 5 !== 0, fut: true, c: 0, p: 0, name: '' }; });
  }
  render() {
    const c = this._config, col = c.colors;
    const hd = `<div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span></div>`;
    if (this._err) return `<ha-card class="glass">${hd}<div class="ph"><b>Brak źródła danych</b>${H.esc(this._err)}</div></ha-card>`;
    if (!this._d) return `<ha-card class="glass">${hd}<div class="ph">Wczytywanie statystyk…</div></ha-card>`;
    const d = this._d, m = this._mode || 'week', price = d.price;
    const T = [['day', 'Dziś'], ['week', 'Ten tydzień'], ['month', 'Ten miesiąc']];
    const tiles = T.map(([k, l]) => { const [cv, pv] = d.tot[k];
      return `<button class="tl ${m === k ? 'sel' : ''}" data-act="mode" data-m="${k}" aria-pressed="${m === k}" aria-label="${l}: zużycie ${H.fmt(cv, 1)} kWh, produkcja ${H.fmt(pv, 1)} kWh">
        <small>${l}</small><span class="r" style="--c:${col.consumption}"><i></i><b>${H.fmt(cv, cv < 10 ? 2 : 1)}</b><span>kWh</span></span>
        <span class="r p" style="--c:${col.production}"><i></i>${d.hasP[k] ? `<b>${H.fmt(pv, pv < 10 ? 2 : 1)}</b><span>kWh PV</span>` : '<b>–</b><span>PV brak danych</span>'}</span>
        ${price != null ? `<span class="cost">≈ ${H.fmt(cv * price, 2)} ${H.esc(c.currency)}</span>` : ''}</button>`; }).join('');
    const bars = this._bars(), n = bars.length;
    const mx = Math.max(0.001, ...bars.map((b) => Math.max(b.c, b.p)));
    const bw = m === 'month' ? 'calc(var(--k) * 3.2)' : m === 'day' ? 'calc(var(--k) * 4)' : 'calc(var(--k) * 8)';
    const sel = this._sel;
    const cols = bars.map((b, i) => {
      const bar = (v, hasV, cc) => (b.fut ? '' : !hasV ? `<i class="nd"></i>` : `<i class="${v <= 0 ? 'z' : ''}" style="--c:${cc};--h:${((v / mx) * 100).toFixed(1)}%;animation-delay:${Math.min(i * 15, 300)}ms"></i>`);
      const tip = sel === i && !b.fut ? `<span class="tip">${H.esc(b.name)}<br><i style="background:${col.consumption}"></i>Zużycie: <b>${b.hc ? H.fmt(b.c, 2) + ' kWh' : 'brak danych'}</b><br><i style="background:${col.production}"></i>Produkcja: <b>${b.hp ? H.fmt(b.p, 2) + ' kWh' : 'brak danych'}</b>${price != null && b.hc ? `<br>Koszt ≈ <b>${H.fmt(b.c * price, 2)} ${H.esc(c.currency)}</b>` : ''}</span>` : '';
      const side = i < n * 0.2 ? 'l' : i > n * 0.8 ? 'r' : '';
      return `<button class="d ${side} ${b.today ? 'today' : ''} ${b.fut ? 'fut' : ''} ${b.skip ? 'lbl-skip' : ''} ${sel === i ? 'sel' : ''}" data-act="bar" data-i="${i}" ${b.fut ? 'disabled tabindex="-1"' : ''} aria-label="${H.esc(b.name || b.lbl)}${b.fut ? '' : `: zużycie ${H.fmt(b.c, 2)} kWh, produkcja ${b.hp ? H.fmt(b.p, 2) + ' kWh' : 'brak danych'}`}">${tip}<span class="bs"><span class="bw">${bar(b.c, b.hc, col.consumption)}${bar(b.p, b.hp, col.production)}</span></span><small>${b.today ? (m === 'day' ? 'teraz' : 'dziś') : b.lbl}</small></button>`;
    }).join('');
    const sw = `<div class="sw" role="tablist">${T.map(([k, l]) => `<button role="tab" class="${m === k ? 'act' : ''}" data-act="mode" data-m="${k}" aria-selected="${m === k}">${['Dzień', 'Tydzień', 'Miesiąc'][T.findIndex((x) => x[0] === k)]}</button>`).join('')}</div>`;
    const anyNd = bars.some((b) => !b.fut && !b.hp);
    return `<ha-card class="glass">${hd}<div class="tiles">${tiles}</div>
      <div class="ctl">${sw}<span class="lg"><span><i style="background:${col.consumption}"></i>Zużycie z sieci</span><span><i style="background:${col.production}"></i>Produkcja PV</span></span></div>
      <div class="ch" style="--n:${n};--g:${m === 'week' ? 'calc(var(--k) * 6)' : '1px'};--bw:${bw};--bg:${m === 'week' ? 'calc(var(--k) * 3)' : '1px'}">${cols}</div>
      <div class="ft">${anyNd ? '<span>● szara kropka = brak danych z falownika</span>' : ''}${price != null ? `<span>cena ${H.fmt(price, 2)} ${H.esc(c.currency)}/kWh (z ustawień Energii)</span>` : ''}
        <a href="${H.esc(c.link)}" data-act="link">Panel Energia HA ${H.icon('mdi:arrow-top-right')}</a></div></ha-card>`;
  }
  onAct(a, t, e) {
    if (a === 'mode') { this._mode = t.dataset.m; this._sel = null; return this.rerender(); }
    if (a === 'bar') { const i = Number(t.dataset.i); this._sel = this._sel === i ? null : i; return this.rerender(); }
    if (a === 'link') { e.preventDefault(); H.navigate(this._config.link); }
  }
  getCardSize() { return 7; }
}
hgReg('hg-energy-stats-card', HGEnergyStatsCard, 'Home Glass – Energia (statystyki)', 'Dziś / tydzień / miesiąc i wykres zużycia vs produkcji');

/* --- hg-pv-card: stan falownika, produkcja teraz i dziś, ostatnia aktywność --- */
class HGPvCard extends HGBase {
  defaults() { return { title: 'Fotowoltaika', icon: 'mdi:solar-power-variant-outline', power: null, today: null, state: null, temperature: null, strings: [], extra: [] }; }
  ents() { const c = this._config; return [c.power, c.today, c.state, c.temperature, ...c.strings.map((s) => s.entity || s.power), ...c.extra].filter(Boolean); }
  _extraSig() { return [Math.floor(Date.now() / 60000), this._last ? this._last.t : 0]; }
  connectedCallback() { super.connectedCallback(); this._ld(); }
  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._ld(); this._update(); }
  get hass() { return this._hass; }
  async _ld() {
    // ostatni dzień z produkcją wg statystyk panelu Energia (gdy falownik offline)
    const h = this._hass; if (!h || this._ldg) return; this._ldg = true;
    try { const pr = await HGEnergyPrefs.get(h); if (pr.production.length) { const v = await HGStats.daily(h, pr.production, 30);
      const days = [...v.days].reverse(), sum = (d) => pr.production.reduce((a, id) => a + Math.max(0, (v.byId[id] || {})[d.__k] || 0), 0);
      this._today = days.length && days[0].toDateString() === new Date().toDateString() ? sum(days[0]) : null;   // dziś wg liczników całkowitych (dzienny czujnik falownika zeruje się po rozłączeniu)
      for (const d of days) { const s = pr.production.reduce((a, id) => a + Math.max(0, (v.byId[id] || {})[d.__k] || 0), 0); if (s > 0.05) { this._last = { t: Date.now(), d, s }; break; } }
      if (!this._last) this._last = { t: Date.now(), d: null, s: 0 }; else this._last.t = Date.now(); } } catch (e) { this._last = { t: Date.now(), d: null, s: 0 }; }
    // dziś wg historii czujnika dziennego: suma odcinków między zerowaniami (falownik zeruje licznik po każdym ponownym uruchomieniu;
    // licznik całkowity po powrocie skacze o produkcję z okresów, których HA nie widział -> zawyża)
    try { const c = this._config; if (c.today) { const m0 = new Date(HGStats.midnight(Date.now(), HGStats.tz(h)));   // północ w strefie HA
      const r = await h.callWS({ type: 'history/history_during_period', start_time: m0.toISOString(), entity_ids: [c.today], minimal_response: true, no_attributes: true });
      const arr = (r && r[c.today]) || []; let tot = 0, seg = 0, any = false;
      for (const x of arr) { const v = parseFloat(x.s != null ? x.s : x.state); if (!isFinite(v)) continue; any = true; if (v + 0.001 < seg) { tot += seg; seg = v; } else seg = v; }
      this._dsum = any ? tot + seg : null; } } catch (e) { this._dsum = null; }
    this._ldg = false; this.rerender();
  }
  css() {
    return U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s2) var(--s3) var(--s3); }
.hd .ic{ color:var(--hg-accent-tx); }
.st{ display:flex; align-items:center; gap:var(--s2); }
.bd{ width:40u; height:40u; border-radius:50%; flex:none; display:flex; align-items:center; justify-content:center; color:#fff; background:var(--c); }
.off .st b{ color:#4A4E54; }
.on .bd{ color:#1E2023; } .bd ha-icon{ width:20u; height:20u; } .on .bd ha-icon{ animation:hgspin 8s linear infinite; }
.st b{ display:block; font-size:var(--fs-md); font-weight:600; color:color-mix(in srgb, var(--c), var(--hg-ink, #000) calc(var(--hg-ink-p, 40%) * 1.7)); } .st div span{ display:block; font-size:var(--fs-xs); color:#5A5E64; margin-top:2u; }
.kv{ display:grid; grid-template-columns:repeat(auto-fit, minmax(max(calc(var(--k) * 84), 112px), 1fr)); gap:var(--s1); }
@media (max-width:600px){ .kv{ grid-template-columns:repeat(2, minmax(0, 1fr)); } }
.kv[hidden]{ display:none; } .kv div{ padding:var(--s1) var(--s1); border-radius:var(--r-sm); background:rgba(255,255,255,.55); min-width:0; } .kv small{ display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; font-size:var(--fs-xs); color:#5A5E64; overflow:hidden; line-height:1.25; min-height:2.5em; }
.kv b{ font-size:var(--fs-md); font-weight:600; font-variant-numeric:tabular-nums; white-space:nowrap; } .kv b em{ font-style:normal; font-size:var(--fs-xs); font-weight:400; color:#5A5E64; margin-left:2u; }
.pvn{ font-size:var(--fs-xs); color:#4A4E54; line-height:1.45; padding:var(--s1) var(--s2); border-radius:var(--r-sm); background:var(--hg-accent-faint); white-space:normal; }
`);
  }
  render() {
    const c = this._config, h = this._hass, s = H.st(h, c.power), on = H.ok(s);
    const w = hgW(h, c.power), td = H.num(h, c.today), tmp = H.num(h, c.temperature), dst = H.st(h, c.state);
    const col = on ? (w > 0 ? 'var(--hg-accent)' : '#6E747A') : '#6E747A';
    const since = s ? hgRel(new Date(s.last_changed)) : '';
    const lbl = on ? (w > 0 ? 'Produkuje' : 'Brak produkcji (noc / zachmurzenie)') : 'Falownik offline';
    if (this._last && Date.now() - this._last.t > 15 * 60000 && !this._ldg) { this._last.t = Date.now(); setTimeout(() => this._ld(), 0); }
    // „Dziś”: większa z wartości czujnika dziennego i przyrostu liczników całkowitych; 0 przy produkcji = brak danych
    // czujnik dzienny ma rozdzielczość 0,1 kWh: 0 przy produkcji = „< 0,1”; bez czujnika dziennego -> przyrost licznika całkowitego
    const dsum = this._dsum != null ? Math.max(this._dsum, td || 0) : td;
    const tday = dsum != null ? dsum : this._today;
    const dz = tday == null ? ['–', ''] : tday < 0.05 && w > 0 ? ['< 0,1', 'kWh'] : [H.fmt(tday, 1), 'kWh'];
    const kv = [['Teraz', w != null ? [H.fmt(w, 0), 'W'] : ['–', '']], ['Dziś', dz]];
    for (const st of c.strings) { const v = hgW(h, st.entity || st.power); kv.push([st.name, v != null ? [H.fmt(v, 0), 'W'] : ['–', '']]); }
    if (c.temperature) kv.push(['Temperatura falownika', tmp != null ? [H.fmt(tmp, 1), '°C'] : ['–', '']]);
    const L = this._last;
    const last = L && L.d ? `Ostatnia produkcja: <b>${H.esc(L.d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }))}</b> · ${H.fmt(L.s, 2)} kWh.` : L ? 'Brak produkcji w statystykach z ostatnich 30 dni.' : '';
    const note = !on ? `<div class="pvn">${last} Dni bez danych z falownika są na wykresach szarą kropką (nie zerem).</div>`
      : dst && H.ok(dst) ? `<div class="pvn" style="background:var(--hg-accent-faint)">Stan falownika: ${H.esc(H.t(h, dst))}</div>` : '';
    return `<ha-card class="glass warm ${on ? 'on' : 'off'}" style="--c:${col}"><div class="hd">${H.icon(c.icon, 'ic')}<span class="tt">${H.esc(c.title)}</span><span class="sp"></span>
        <button class="ib kebab" data-act="more" aria-label="Szczegóły falownika" title="Szczegóły i historia">${H.icon('mdi:dots-vertical')}</button></div>
      <div class="st"><span class="bd">${H.icon(on ? 'mdi:white-balance-sunny' : 'mdi:solar-panel')}</span><div><b>${lbl}</b><span>${on ? 'aktualizacja ' + H.esc(since) : since ? 'brak danych od ' + H.esc(since) : 'brak encji'}</span></div></div>
      ${on ? '' : ''}<div class="kv" ${on ? '' : 'hidden'}>${kv.map(([k, [v, u]]) => `<div><small>${H.esc(k)}</small><b>${v}<em>${u}</em></b></div>`).join('')}</div>${note}</ha-card>`;
  }
  onAct(a) { if (a === 'more') H.fire(this, 'hass-more-info', { entityId: this._config.power }); }
  getCardSize() { return 4; }
}
hgReg('hg-pv-card', HGPvCard, 'Home Glass – Fotowoltaika', 'Stan falownika, produkcja teraz i dziś');
