class HGCamerasCard extends HGBase {
  defaults() { return { entities: [], names: {}, fs: {}, fb: {}, refresh_map: {}, nolive: [], pin: [], refresh: 10 }; }
  css() {
    return U(`
ha-card.wrap{ background:none; border:0; box-shadow:none; padding:0; height:auto; display:flex; flex-direction:column; gap:var(--s2); }
/* liczba kolumn wg szerokości kontenera (panel), nie okna: ~1280 -> 2, 1440–1640 -> 3, 1920+ -> 4, bardzo szerokie -> 5 */
ha-card.wrap{ container-type:inline-size; }
.grid{ display:grid; gap:var(--s2); align-items:start; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); }
@container (min-width: 560px){ .grid{ --cols:2; } }
@container (min-width: 1200px){ .grid{ --cols:3; } }
@container (min-width: 1600px){ .grid{ --cols:4; } }
@container (min-width: 2400px){ .grid{ --cols:5; } }
.grid.n1{ grid-template-columns:minmax(0, min(100%, 720px)); justify-content:center; }
.empty{ display:flex; align-items:center; gap:var(--s2); padding:var(--s3); border-radius:var(--r-md); background:rgba(255,255,255,.55); color:#5A5E64; font-size:var(--fs-sm); }
.empty ha-icon{ width:20u; height:20u; }
.chips{ display:flex; flex-wrap:wrap; align-items:center; gap:var(--s1); padding:0 2u; }
.chips:empty{ display:none; }
.lbl{ display:inline-flex; align-items:center; height:max(calc(var(--k) * 24), var(--hg-tgt, 0px)); padding:0 var(--s1); border-radius:var(--r-sm); background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi); font-size:var(--fs-sm); color:#3A3E44; font-weight:400; margin-right:2u; }
.chip{ position:relative; display:inline-flex; align-items:center; gap:5u; height:max(calc(var(--k) * 24), var(--hg-tgt, 0px)); padding:0 var(--s2); border-radius:var(--r-sm); font-size:var(--fs-sm); color:#4A4E54;
  background:var(--hg-inner-bg); border:0; box-shadow:var(--hg-inner-hi); transition:background .2s; }
.chip:hover{ background:var(--hg-inner-bg-h); }
.chip ha-icon{ width:12u; height:12u; color:#8A8E94; }
`);
  }
  _update() {
    if (!this._config || !this._hass) return;
    const c = this._config, h = this._hass;
    const dn = (e) => !(c.pin || []).includes(e) && hgCamUn(H.st(h, e)) && ![].concat((c.fb || {})[e] || []).some((f) => !hgCamUn(H.st(h, f)));   // przypięte: zawsze kafel   // niedostępna, gdy też brak zapasowej
    const av = c.entities.filter((e) => !dn(e)), un = c.entities.filter(dn);
    const sig = av.join(',') + '|' + un.map((e) => e + H.name(h, e)).join(',');
    if (sig !== this._lsig) { this._lsig = sig; this._layoutCams(av, un); }
    for (const t of this._tiles.values()) hgPass(t, h);
  }
  _layoutCams(av, un) {
    const c = this._config, h = this._hass;
    if (!this._tiles) this._tiles = new Map();
    if (!this._grid) {
      this.$.innerHTML = `<ha-card class="wrap"><div class="grid"></div><div class="chips"></div></ha-card>`;
      this._grid = this.$.querySelector('.grid'); this._chips = this.$.querySelector('.chips');
    }
    for (const [e, t] of this._tiles) if (!av.includes(e)) { t.remove(); this._tiles.delete(e); }
    for (const e of av) {
      let t = this._tiles.get(e);
      if (!t) { t = document.createElement('hg-camera-card'); t.setConfig({ type: 'custom:hg-camera-card', entity: e, name: c.names[e] || null, refresh: (c.refresh_map && c.refresh_map[e]) || c.refresh, embedded: true, cover: true, no_live: (c.nolive || []).includes(e), live_needs_fs: (c.needfs || []).includes(e), ...(c.fb && c.fb[e] ? { fallback: c.fb[e] } : {}), ...(c.fs && c.fs[e] ? { fs_entity: c.fs[e] } : {}) }); t.hass = h; this._tiles.set(e, t); }
      this._grid.appendChild(t);     // appendChild przenosi istniejący kafel (zachowuje stan i obraz)
    }
    const empty = this._grid.querySelector('.empty'); if (empty) empty.remove();
    if (!av.length) this._grid.insertAdjacentHTML('beforeend', `<div class="empty">${H.icon('mdi:cctv-off')}<span>${hgTr('Żadna kamera nie jest teraz dostępna', 'No cameras are available right now')}</span></div>`);
    const n = av.length, rows = n <= 2 ? 1 : Math.ceil(n / 2);
    this._grid.className = `grid n${Math.min(n, 4)} ${n > 1 ? 'multi' : ''}`;
    this._grid.style.setProperty('--rows', rows);
    this._grid.style.setProperty('--chips-h', '0px');   // bez plakietek pod kamerami (decyzja użytkownika)
    this._chips.innerHTML = ''; this._chips.hidden = true;
  }
  onAct(a, t) { if (a === 'more') H.fire(this, 'hass-more-info', { entityId: t.dataset.e }); }
  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, rows: 6 }; }
}
hgReg('hg-cameras-card', HGCamerasCard, 'Home Glass – Kamery', 'Działające kamery jako duże kafle, niedostępne jako chipy');
