/* ===================== KAMERY ===================== */
/* hg-camera-card  = jeden kafel kamery: migawka (camera_proxy) co N s tylko gdy widoczna, podmiana bez mrugnięcia (preload + decode),
                     natywne proporcje klatki (naturalWidth/Height, zapamiętane w localStorage -> brak skoku układu),
                     shimmer zamiast czarnego pola, sterowanie (Na żywo, pełny ekran) jako szklana nakładka po najechaniu / dotknięciu.
   hg-cameras-card = grupa: działające kamery jako duże kafle, niedostępne zwinięte do rzędu chipów „Niedostępne: …”.
   Na żywo = natywna karta picture-entity (camera_view: live), najwyżej jedna transmisja naraz (HGLive). */
const HGLive = { cur: null, set(card) { if (this.cur && this.cur !== card) this.cur._stopLive(); this.cur = card; }, clear(card) { if (this.cur === card) this.cur = null; } };
/* Nakładka pełnoekranowa kamery: w shadowRoot <home-assistant> (poza warstwami z backdrop-filter, które psują position:fixed),
   czarne tło 100vw × 100dvh z safe-area, strumień na żywo (picture-entity camera_view: live), zamykanie: X, Escape, przesunięcie w dół. */
const HGCamFS = {
  el: null, card: null,
  css: `.hg-camfs{position:fixed;inset:0;z-index:2147483000;background:#000;display:flex;align-items:center;justify-content:center;width:100vw;height:100vh;height:100dvh;
    touch-action:none;opacity:0;transition:opacity .2s ease, transform .25s ease;overscroll-behavior:contain;-webkit-user-select:none;user-select:none}
  .hg-camfs.in{opacity:1}
  .hg-camfs .st{width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);box-sizing:border-box}
  .hg-camfs .box{width:min(100%, calc((100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom)) * var(--a)));aspect-ratio:var(--a);max-height:100%;position:relative}
  .hg-camfs .box > *{display:block;width:100%;height:100%;--ha-card-border-radius:0;--ha-card-border-width:0;--ha-card-background:#000;--ha-card-box-shadow:none}
  .hg-camfs .bar{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top) + 10px) calc(env(safe-area-inset-right) + 12px) 24px calc(env(safe-area-inset-left) + 16px);
    background:rgba(0,0,0,.45);color:#fff;font:400 15px/1.2 'HG DM Sans',system-ui,sans-serif;pointer-events:none}
  .hg-camfs .bar b{flex:1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .hg-camfs .bar i{font-style:normal;font-size:11px;padding:3px 8px;border-radius:9px;background:#E5484D;letter-spacing:.04em}
  .hg-camfs .x{pointer-events:auto;width:48px;height:48px;border-radius:50%;border:0;background:rgba(255,255,255,.18);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  .hg-camfs .x ha-icon{--mdc-icon-size:26px}
  .hg-camfs .hint{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 14px);transform:translateX(-50%);color:rgba(255,255,255,.55);font:12px system-ui,sans-serif;pointer-events:none}
  @media (prefers-reduced-motion: reduce){.hg-camfs{transition:none}}`,
  async open(card) {
    if (this.el) this.close(true);
    card._stopLive && card._liveOn && card._stopLive(true);
    const c = card._config, a = hgAsp.get(c.entity) || c.aspect || 16 / 9, name = c.name || H.name(card._hass, c.entity);
    const el = document.createElement('div'); el.className = 'hg-camfs'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Kamera ' + name + ' – pełny ekran');
    el.style.setProperty('--a', a);
    el.innerHTML = `<style>${this.css}</style><div class="st"><div class="box"></div></div><div class="bar"><b>${H.esc(name)}</b><i>NA ŻYWO</i><button class="x" aria-label="Zamknij pełny ekran" title="Zamknij (Esc)"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="hint">Przesuń w dół, aby zamknąć</div>`;
    // w drzewie <home-assistant> (ale poza panelem z backdrop-filter): elementy HA (ha-camera-stream) biorą hass z kontekstu dostawcy
    const ha = document.querySelector('home-assistant');
    (ha && ha.shadowRoot ? ha.shadowRoot : document.body).appendChild(el); this.el = el; this.card = card; this.entity = c.entity; this._prevFocus = document.activeElement;
    // zmiana widoku zamyka nakładkę; obrót / przebudowa kafli kamer – nie (hass dostarcza dowolna karta tej samej kamery)
    this._loc = () => { if (!location.pathname.endsWith('/' + (this._view || ''))) this.close(true); };
    this._view = location.pathname.split('/').pop(); window.addEventListener('location-changed', this._loc); window.addEventListener('popstate', this._loc);
    this._prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => el.classList.add('in'));
    const x = el.querySelector('.x'); x.addEventListener('click', (e) => { e.stopPropagation(); this.close(); }); x.focus({ preventScroll: true });
    this._key = (e) => { if (e.key === 'Escape') { e.preventDefault(); this.close(); } }; document.addEventListener('keydown', this._key, true);
    // przesunięcie w dół (dotyk lub mysz): zamyka po > 90 px w pionie
    let y0 = null, x0 = 0;
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('.x')) return; y0 = e.clientY; x0 = e.clientX; }, { passive: true });
    el.addEventListener('pointermove', (e) => { if (y0 == null) return; const dy = e.clientY - y0; if (dy > 0 && Math.abs(dy) > Math.abs(e.clientX - x0)) { el.style.transform = `translateY(${dy * 0.6}px)`; el.style.opacity = String(Math.max(0.35, 1 - dy / 500)); } }, { passive: true });
    const end = (e) => { if (y0 == null) return; const dy = e.clientY - y0; y0 = null; if (dy > 90) this.close(); else { el.style.transform = ''; el.style.opacity = ''; } };
    el.addEventListener('pointerup', end, { passive: true }); el.addEventListener('pointercancel', () => { y0 = null; el.style.transform = ''; el.style.opacity = ''; }, { passive: true });
    this._rs = () => { if (this.el) this.el.style.setProperty('--a', a); }; window.addEventListener('orientationchange', this._rs);
    try {
      const helpers = window.loadCardHelpers ? await window.loadCardHelpers() : null;
      if (!helpers || this.el !== el) return;
      if (card._nl ? card._nl() : c.no_live) {   // bez strumienia: powiększona migawka podglądu odświeżana co 2 s
        const box = el.querySelector('.box'), img = document.createElement('img'); img.alt = ''; img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block';
        box.appendChild(img); const lb = el.querySelector('.bar i'); if (lb) lb.textContent = 'PODGLĄD';
        const tick = () => { const s = H.st(this.card ? this.card._hass : card._hass, card._ent ? card._ent() : c.entity); if (!s || !s.attributes.entity_picture) return;
          const u = s.attributes.entity_picture, pre = new Image(); pre.onload = () => { if (pre.naturalWidth >= 16) img.src = pre.src; }; pre.src = u + (u.includes('?') ? '&' : '?') + '_t=' + Date.now(); };
        tick(); this._pv = setInterval(() => { if (this.el === el) tick(); }, 2000); return;
      }
      const fe = c.fs_entity && H.ok(card._hass.states[c.fs_entity]) ? c.fs_entity : (card._ent ? card._ent() : c.entity);   // pełny ekran: strumień główny (main), kafel: sub/podgląd
      const live = helpers.createCardElement({ type: 'picture-entity', entity: fe, camera_view: 'live', show_name: false, show_state: false, tap_action: { action: 'none' }, hold_action: { action: 'none' } });
      live.hass = card._hass; this.live = live; el.querySelector('.box').appendChild(live);
    } catch (err) { el.querySelector('.box').textContent = 'Nie można uruchomić podglądu'; }
  },
  hass(h) { if (this.live) this.live.hass = h; },
  close(now) {
    clearInterval(this._pv); this._pv = 0;
    const el = this.el; if (!el) return;
    this.el = null; this.live = null; const card = this.card; this.card = null;
    document.removeEventListener('keydown', this._key, true); window.removeEventListener('orientationchange', this._rs);
    window.removeEventListener('location-changed', this._loc); window.removeEventListener('popstate', this._loc); this.entity = null;
    document.documentElement.style.overflow = this._prevOverflow || '';
    const rm = () => el.remove();
    if (now || hgReduced()) rm(); else { el.classList.remove('in'); el.style.opacity = '0'; setTimeout(rm, 220); }
    if (card && card.isConnected && card._snap) card._snap();
    try { this._prevFocus && this._prevFocus.focus && this._prevFocus.focus({ preventScroll: true }); } catch (e) { /* */ }
  },
};
if (!window.HGCamFS) window.HGCamFS = HGCamFS;   // diagnostyka / testy (pierwsza załadowana kopia)
const hgCamUn = (s) => !s || s.state === 'unavailable' || s.state === 'unknown';
const hgAsp = {
  get(e) { try { const v = parseFloat(localStorage.getItem('home-glass:asp:' + e)); return v > 0.3 && v < 4 ? v : null; } catch (err) { return null; } },
  set(e, v) { try { localStorage.setItem('home-glass:asp:' + e, v.toFixed(4)); } catch (err) { /* prywatny tryb */ } },
};
const HG_CAM_CSS = `
.tile{ display:flex; flex-direction:column; gap:var(--s1); height:100%; min-width:0; }
.hd{ padding:0 2u; min-height:18u; }
.hd .ic{ width:11u; height:11u; color:#5A5E64; }
.st{ font-size:var(--fs-xs); line-height:1; padding:4u var(--s1); border-radius:var(--r-sm); background:rgba(255,255,255,.72); color:#5A5E64; white-space:nowrap; display:inline-flex; align-items:center; gap:4u; }
.hd .st{ display:none !important; } .chips[hidden]{ display:none !important; }
.st::before{ content:''; width:5u; height:5u; border-radius:50%; background:#9AA0A6; }
.st.ok::before{ background:var(--hg-accent); }
.st.rec{ color:#B3261E; } .st.rec::before{ background:#E53935; animation:hgpulse 1.6s infinite; }
.st.live{ color:var(--hg-on-accent); background:var(--hg-accent); } .st.live::before{ background:#fff; animation:hgpulse 1.2s infinite; }
.fr{ position:relative; border-radius:var(--r-sm); overflow:hidden; background:rgba(30,36,46,.18); width:min(100%, calc(var(--frmax, 100000px) * var(--aspn))); aspect-ratio: var(--aspn);
  margin:0 auto; flex:none; cursor:pointer; touch-action:manipulation; isolation:isolate; transform:translateZ(0); }
.fr img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; display:block; opacity:0; transition:opacity .35s ease; }
.fr.ok img{ opacity:1; }
.shim{ position:absolute; inset:0; overflow:hidden; background:rgba(214,218,224,.55); transition:opacity .4s ease; animation:hgshim 1.6s ease-in-out infinite; }
.shim::after{ content:none; }
.fr.ok .shim{ opacity:0; animation:none; }
@keyframes hgshim{ 0%,100%{ opacity:1; } 50%{ opacity:.55; } }
.fr .live{ position:absolute; inset:0; display:none; background:#000; }
.fr.err .shim{ animation:none; display:flex; align-items:center; justify-content:center; }
.fr.err .shim::after{ content:'Brak obrazu z kamery'; font-size:var(--fs-sm); color:#4A4E54; }
.fr.on .live{ display:block; } .fr.on img, .fr.on .shim{ visibility:hidden; }
.fr .live > *{ display:block; height:100%; --ha-card-border-radius:0; --ha-card-border-width:0; --ha-card-box-shadow:none; --ha-card-background:#000; }
.ov{ position:absolute; left:0; right:0; bottom:0; display:flex; align-items:flex-end; justify-content:space-between; gap:var(--s1); padding:var(--s1); z-index:3;
  background:rgba(10,14,20,.32); opacity:0; transform:translateY(4u); transition:opacity .25s ease, transform .25s cubic-bezier(.2,.8,.2,1); }
.fr.show .ov, .fr.on .ov{ opacity:1; transform:none; }
@media (hover:hover){ .fr:hover .ov{ opacity:1; transform:none; } }
.pb{ position:relative; height:max(calc(var(--k) * 26), 40px, var(--hg-tgt, 0px)); min-width:max(calc(var(--k) * 26), 40px, var(--hg-tgt, 0px)); justify-content:center; padding:0 var(--s2); border-radius:999px;
  background:rgba(255,255,255,.22); border:0; color:#fff; font-size:var(--fs-sm); font-weight:400; display:inline-flex; align-items:center; gap:5u;
  -webkit-backdrop-filter: var(--hg-inner-bf, blur(10px) saturate(140%)); backdrop-filter: var(--hg-inner-bf, blur(10px) saturate(140%)); box-shadow:var(--hg-card-sh, var(--hg-sh)); }
.pb.ic{ padding:0; width:max(calc(var(--k) * 26), 40px, var(--hg-tgt, 0px)); }
.pb ha-icon{ width:20px; height:20px; }
.pb:hover{ background:rgba(255,255,255,.32); }
.fr:fullscreen{ border-radius:0; width:100%; height:100%; background:#000; aspect-ratio:auto; }
.fr:-webkit-full-screen{ border-radius:0; width:100%; height:100%; background:#000; aspect-ratio:auto; }
.fr:-webkit-full-screen{ border-radius:0; width:100%; height:100%; background:#000; }
.un{ display:flex; align-items:center; gap:var(--s1); color:#6A6E74; font-size:var(--fs-sm); padding:4u 2u; }
.un ha-icon{ width:16u; height:16u; }
`;
class HGCameraCard extends HGBase {
  defaults() { return { name: null, refresh: 10, aspect: 16 / 9, embedded: false, cover: false, fs_entity: null, fallback: null, no_live: false, live_needs_fs: false }; }
  // bez strumienia: no_live albo (live_needs_fs i encja pełnego ekranu niedostępna -> sam podgląd MQTT nie ma strumienia)
  _nl() { const c = this._config; return !!c.no_live || (!!c.live_needs_fs && !(c.fs_entity && this._hass && H.ok(this._hass.states[c.fs_entity]))); }
  /* źródło miniatury: entity (np. podgląd MQTT), a gdy niedostępne – fallback (np. _sub) */
  _ent() { const c = this._config, h = this._hass, L = [c.entity, ...[].concat(c.fallback || [])]; return (h && L.find((e) => !hgCamUn(H.st(h, e)))) || c.entity; }   // encje mogą jeszcze nie istnieć
  _liveEnt() { const c = this._config; return c.fs_entity && this._hass && H.ok(this._hass.states[c.fs_entity]) ? c.fs_entity : this._ent(); }
  css() { return U(HG_CAM_CSS + `ha-card.glass{ padding:var(--s1) var(--s1) var(--s2); } ha-card.glass.bare{ padding:var(--s1); }
/* kafel w siatce Kamer: obraz na całą szerokość 16:9 (cover), wysokość karty = obraz + smukły nagłówek */
ha-card.glass.cv{ height:auto; padding:var(--s1) var(--s1) var(--s1); } .cv .tile{ height:auto; } .cv .hd{ min-height:max(18u, 28px); }
.cv .fr{ width:100% !important; aspect-ratio:var(--aspn, 16 / 9) !important; }
.cv .un{ aspect-ratio:16 / 9; color:#45494F; flex-direction:column; justify-content:center; gap:var(--s1); border-radius:var(--r-sm); background:rgba(30,36,46,.08); padding:0; } .cv .un ha-icon{ width:28px; height:28px; opacity:.7; } .cv .fr img{ object-fit:cover; }
.fr:fullscreen img, .fr:-webkit-full-screen img{ object-fit:contain; }`); }
  /* szkielet budowany raz; zmiany stanu aktualizują tylko tekst/klasy (bez podmiany <img> -> bez mrugania) */
  _update() {
    if (!this._config || !this._hass) return;
    const c = this._config, s = H.st(this._hass, this._ent()), un = hgCamUn(s);
    if (!this._sk || this._skUn !== un) this._skeleton(un);
    const nm = c.name || (s && s.attributes.friendly_name) || c.entity;
    const live = !!this._liveOn;
    const stl = un ? (this._nl() || c.cover ? 'offline' : 'niedostępna') : live ? 'na żywo' : { recording: 'nagrywa', streaming: 'transmisja', idle: 'bezczynna' }[s.state] || H.stateLabel(s.state);
    const cls = 'st ' + (un ? '' : live ? 'live' : s.state === 'recording' ? 'rec' : 'ok');
    if (this._ttl.textContent !== nm) this._ttl.textContent = nm;
    if (this._st.textContent !== stl) this._st.textContent = stl;
    if (this._st.className !== cls) this._st.className = cls;
    if (!un) {
      const pic = s.attributes.entity_picture;
      if (pic && !this._loaded && pic !== this._lastPic) { this._lastPic = pic; this._snap(); }
    }
  }
  _skeleton(un) {
    const c = this._config, asp = hgAsp.get(c.entity) || c.aspect;
    this._sk = true; this._skUn = un; this._loaded = false; this._lastPic = null; this._snapErr = 0;
    if (this._liveOn) this._stopLive(true);
    const hd = `<div class="hd">${H.icon('mdi:cctv', 'ic')}<span class="tt"></span><span class="sp"></span><span class="st"></span>
      <button class="ib kebab" data-act="more" aria-label="Szczegóły kamery" title="Szczegóły">${H.icon('mdi:dots-vertical')}</button></div>`;
    const body = un ? `<div class="un">${H.icon('mdi:cctv-off')}<span>${c.cover ? 'Brak połączenia z kamerą' : 'Kamera niedostępna'}</span></div>`
      : `<div class="fr" data-act="frame" style="--aspn:${asp}"><div class="shim"></div><img alt="" decoding="async"><div class="live"></div>
          <div class="ov">${this._nl() ? '<span></span>' : `<button class="pb" data-act="live" aria-label="Podgląd na żywo">${H.icon('mdi:play')}<span>Na żywo</span></button>`}
          <button class="pb ic" data-act="full" aria-label="Pełny ekran" title="Pełny ekran">${H.icon('mdi:fullscreen')}</button></div></div>`;
    this.$.innerHTML = `<ha-card class="glass ${c.embedded ? 'bare' : ''} ${c.cover ? 'cv' : ''}"><div class="tile">${hd}${body}</div></ha-card>`;
    this._ttl = this.$.querySelector('.tt');   /* nie _tt: to pole timera dotyku w HGBase */ this._st = this.$.querySelector('.st');
    this._fr = this.$.querySelector('.fr'); this._img = this.$.querySelector('img'); this._lb = this.$.querySelector('[data-act=live]');
    if (this._io) this._io.disconnect();
    if (this._fr) {
      this._io = new IntersectionObserver((en) => { this._vis = en.some((e) => e.isIntersecting); if (this._vis) this._snap(); });
      this._io.observe(this._fr);
    }
  }
  _snap() {
    const s = H.st(this._hass, this._ent());
    if (!this._img || hgCamUn(s) || !s.attributes.entity_picture || document.hidden || this._vis === false || this._liveOn || this._loading) return;
    const u = s.attributes.entity_picture, src = u + (u.includes('?') ? '&' : '?') + '_t=' + Date.now();
    const pre = new Image(); this._loading = true;
    const done = () => { this._loading = false; };
    // migawka nie działa (np. błąd uwierzytelnienia kamery): zamiast wiecznego shimmera komunikat; „Na żywo” nadal dostępne
    const fail = () => { done(); if (++this._snapErr >= 2 && !this._loaded && this._fr) this._fr.classList.add('err'); };
    pre.onload = () => {
      const fin = () => {
        done(); if (!this._img) return;
        if (!pre.naturalWidth || pre.naturalWidth < 16 || pre.naturalHeight < 16) return fail();   // pusta/uszkodzona migawka: zostaw ostatnią dobrą klatkę
        this._img.src = src;
        if (pre.naturalWidth && pre.naturalHeight) {
          const a = pre.naturalWidth / pre.naturalHeight;
          if (Math.abs(a - (parseFloat(this._fr.style.getPropertyValue('--aspn')) || 0)) > 0.01) { this._fr.style.setProperty('--aspn', a.toFixed(4)); hgAsp.set(this._config.entity, a); }
        }
        this._snapErr = 0; this._fr.classList.remove('err'); if (!this._loaded) { this._loaded = true; this._fr.classList.add('ok'); }
      };
      pre.decode ? pre.decode().then(fin, fin) : fin();
    };
    pre.onerror = fail;
    pre.src = src;
  }
  connectedCallback() { super.connectedCallback();
    clearInterval(this._iv);
    // tyk co 2 s: miniatura co `refresh` s; na pełnym ekranie (Fullscreen API) co 2 s
    this._iv = setInterval(() => { const fs = document.fullscreenElement === this._fr || document.webkitFullscreenElement === this._fr;
      if (fs || Date.now() - (this._lastSnap || 0) >= Math.max(2, this._config ? this._config.refresh : 10) * 1000 - 300) { this._lastSnap = Date.now(); this._snap(); } }, 2000);
    if (this._fr && this._io) this._io.observe(this._fr);
  }
  disconnectedCallback() { clearInterval(this._iv); this._stopLive(); this._io && this._io.disconnect(); }
  _ctl(show) {
    if (!this._fr) return;
    clearTimeout(this._ctlT);
    this._fr.classList.toggle('show', show);
    if (show && !this._liveOn) this._ctlT = setTimeout(() => this._fr && this._fr.classList.remove('show'), 4000);
  }
  _paintLive() {
    if (this._fr) this._fr.classList.toggle('on', !!this._liveOn);
    if (this._lb) { this._lb.innerHTML = `${H.icon(this._liveOn ? 'mdi:stop' : 'mdi:play')}<span>${this._liveOn ? 'Stop' : 'Na żywo'}</span>`; this._lb.setAttribute('aria-label', this._liveOn ? 'Zatrzymaj podgląd na żywo' : 'Podgląd na żywo'); }
    this._update();
  }
  async _startLive() {
    if (this._nl()) return this._full();
    const helpers = window.loadCardHelpers ? await window.loadCardHelpers() : null; if (!helpers || !this._fr) return;
    HGLive.set(this);
    this._liveEl = helpers.createCardElement({ type: 'picture-entity', entity: this._liveEnt(), camera_view: 'live', show_name: false, show_state: false, tap_action: { action: 'none' } });
    this._liveEl.hass = this._hass; this._liveOn = true;
    this._fr.querySelector('.live').appendChild(this._liveEl);
    this._paintLive();
  }
  _stopLive(silent) {
    if (!this._liveOn) return; this._liveOn = false;
    if (this._liveEl) this._liveEl.remove(); this._liveEl = null; HGLive.clear(this);
    if (!silent) { this._paintLive(); this._ctl(false); this._snap(); }
  }
  set hass(h) { this._hass = h; if (this._liveEl) this._liveEl.hass = h; if (HGCamFS.entity && this._config && HGCamFS.entity === this._config.entity) { HGCamFS.card = this; HGCamFS.hass(h); } this._update(); }
  get hass() { return this._hass; }
  onAct(a) {
    const e = this._liveEnt();
    if (a === 'more') return H.fire(this, 'hass-more-info', { entityId: e });
    if (a === 'frame' && this._nl()) return this._full();   // tylko podgląd (bez strumienia): powiększony obraz
    if (a === 'frame') {
      // mysz: klik = na żywo; dotyk: 1. dotknięcie pokazuje sterowanie, 2. włącza podgląd na żywo
      const hover = window.matchMedia && matchMedia('(hover:hover)').matches;
      if (this._liveOn) return this._ctl(!this._fr.classList.contains('show'));
      if (!hover && !this._fr.classList.contains('show')) return this._ctl(true);
      return this._startLive();
    }
    if (a === 'live') return this._liveOn ? this._stopLive() : this._startLive();
    if (a === 'full') return this._full();
  }
  /* Pełny ekran: Fullscreen API tylko tam, gdzie naprawdę działa (Chromium/Firefox/Safari na Macu). iPhone/iPad Safari
     i aplikacja HA (WKWebView/Android WebView) często nie mają API albo odrzucają je w shadow DOM -> własna nakładka
     na całe okno (HGCamFS). Jeśli API nie wejdzie w pełny ekran w 450 ms, też przechodzimy na nakładkę: nigdy martwy przycisk. */
  _full() {
    const fr = this._fr, d = document;
    const req = fr && (fr.requestFullscreen || fr.webkitRequestFullscreen);
    const enabled = d.fullscreenEnabled || d.webkitFullscreenEnabled;
    const touchWebKit = /AppleWebKit/.test(navigator.userAgent) && !/Chrome|Chromium|Edg|Firefox/.test(navigator.userAgent) && navigator.maxTouchPoints > 0;
    const app = /Home Assistant|HomeAssistant/i.test(navigator.userAgent) || !!window.externalApp || !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.getExternalAuth);
    if (!req || !enabled || touchWebKit || app || window.__hgForceFsOverlay) return HGCamFS.open(this);
    let fell = false; const fall = () => { if (fell) return; fell = true; HGCamFS.open(this); };
    if (!this._liveOn) this._startLive();
    try {
      const r = req.call(fr);
      if (r && r.then) r.then(() => {}, fall);
      setTimeout(() => { if (!(d.fullscreenElement || d.webkitFullscreenElement)) fall(); }, 450);
    } catch (err) { fall(); }
  }
  getCardSize() { return 4; }
  getGridOptions() { return { columns: 6, rows: 4 }; }
}
hgReg('hg-camera-card', HGCameraCard, 'Home Glass – Kamera', 'Migawka odświeżana co kilka sekund, podgląd na żywo po dotknięciu');

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
.lbl{ display:inline-flex; align-items:center; height:max(calc(var(--k) * 24), var(--hg-tgt, 0px)); padding:0 var(--s1); border-radius:var(--r-sm); background:rgba(255,255,255,.62); font-size:var(--fs-sm); color:#3A3E44; font-weight:400; margin-right:2u; }
.chip{ position:relative; display:inline-flex; align-items:center; gap:5u; height:max(calc(var(--k) * 24), var(--hg-tgt, 0px)); padding:0 var(--s2); border-radius:var(--r-sm); font-size:var(--fs-sm); color:#4A4E54;
  background:rgba(255,255,255,.62); border:1px solid rgba(255,255,255,.75); box-shadow:var(--hg-sh); transition:background .2s; }
.chip:hover{ background:rgba(255,255,255,.8); }
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
    for (const t of this._tiles.values()) t.hass = h;
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
    if (!av.length) this._grid.insertAdjacentHTML('beforeend', `<div class="empty">${H.icon('mdi:cctv-off')}<span>Żadna kamera nie jest teraz dostępna</span></div>`);
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
