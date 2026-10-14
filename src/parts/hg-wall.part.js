/* ===== Tryb tabletu ściennego: po bezczynności wygaszacz z zegarem i zdjęciem, przyciemnienie, wybudzanie dotykiem albo czujnikiem ruchu.
   Ustawienia: HGL.data.wall = { on, idle (s), dim (0–0.9), src: 'bg' | 'slides' | 'url', url, sensor (binary_sensor) } – dane użytkownika HA jak „app”,
   zapisywane razem z układem. Domyślnie wyłączone. Sekcja w arkuszu Wygląd (HGWall.html), wygaszacz to nakładka na <body> (Popover API → nad dialogami HA). */
const HG_WALL_CSS = `
.wl ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; flex:none; }
.wl-sw{ all:unset; box-sizing:border-box; cursor:pointer; display:flex; align-items:center; gap:12px; min-height:48px; padding:6px 4px 6px 12px; border-radius:16px; background:var(--ui-sec, var(--hg-tile-bg)); box-shadow:var(--ui-rim, none); font-size:14px; font-weight:600; }
.wl-sw > span{ flex:1; min-width:0; } .wl-sw small{ display:block; font-weight:400; opacity:.65; font-size:12px; }
.wl-sw i{ position:relative; flex:none; width:46px; height:28px; border-radius:999px; background:color-mix(in srgb, currentColor 22%, transparent); transition:background .25s ease; margin-right:6px; }
.wl-sw i::after{ content:''; position:absolute; top:3px; left:3px; width:22px; height:22px; border-radius:50%; background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.3); transition:transform .25s cubic-bezier(.2,.8,.2,1); }
.wl-sw[aria-checked=true] i{ background:var(--hg-accent); box-shadow:0 0 10px var(--hg-accent-glow, transparent); } .wl-sw[aria-checked=true] i::after{ transform:translateX(18px); }
.wl-sw:focus-visible, .wl-seg button:focus-visible, .wl-tb:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.wl-f{ display:flex; flex-direction:column; gap:8px; } .wl-f > span{ font-size:12.5px; font-weight:600; opacity:.75; display:flex; align-items:center; }
.wl-f > span em{ margin-left:auto; font-style:normal; font-variant-numeric:tabular-nums; padding:2px 10px; border-radius:999px; background:var(--hg-accent); color:var(--hg-on-accent); font-size:12px; }
.wl-seg{ display:grid; grid-template-columns:repeat(var(--n, 3), 1fr); gap:3px; padding:3px; border-radius:16px; background:var(--hg-tile-bg); }
.wl-seg button{ all:unset; box-sizing:border-box; cursor:pointer; min-height:40px; padding:4px 6px; border-radius:13px; text-align:center; font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; line-height:1.15; transition:background .2s ease, color .2s ease; }
.wl-seg button:hover{ background:var(--hg-hover-fill, color-mix(in srgb, currentColor 8%, transparent)); }
.wl-seg [aria-pressed=true]{ background:var(--hg-accent); color:var(--hg-on-accent); }
.wl-tb{ all:unset; box-sizing:border-box; cursor:pointer; align-self:flex-start; height:40px; padding:0 18px; border-radius:999px; display:inline-flex; align-items:center; gap:8px; font-size:14px; font-weight:600; background:var(--ui-sec, var(--hg-tile-bg)); box-shadow:var(--ui-rim, inset 0 0 0 1px color-mix(in srgb, currentColor 18%, transparent)); }
.wl-tb:hover{ background:var(--hg-hover-fill, color-mix(in srgb, currentColor 8%, transparent)); }
@media (max-width:520px){ .wl-seg.six{ grid-template-columns:repeat(3, 1fr); } }
@media (prefers-reduced-motion:reduce){ .wl-sw i, .wl-sw i::after, .wl-seg button{ transition:none; } }
`;
const K = (r, g, b, a) => 'rgb' + `a(${r},${g},${b},${a})`;   /* kolory wygaszacza przez interpolację: tokenizer motywu ich nie rusza (nakładka jest zawsze ciemna) */
const HG_WALL_SS = `
.nw{ position:fixed; inset:0; margin:0; padding:0; border:0; max-width:none; max-height:none; width:100%; height:100%; overflow:hidden; background:${K(5,7,11,1)}; color:${K(255,255,255,1)}; z-index:2147483000;
  font-family:'DM Sans','HG DM Sans',system-ui,sans-serif; -webkit-font-smoothing:antialiased; cursor:none; opacity:0; transition:opacity 1.4s ease; outline:none; user-select:none; -webkit-user-select:none; touch-action:none; }
.nw.in{ opacity:1; } .nw.out{ opacity:0; transition-duration:.4s; }
.nw-bg{ position:absolute; inset:-3%; background-size:cover; background-position:center; opacity:0; transition:opacity 2.4s ease; animation:nwkb 48s ease-in-out infinite alternate; animation-play-state:var(--hg-play, running); will-change:transform, opacity; }
.nw-bg.on{ opacity:1; }
@keyframes nwkb{ from{ transform:scale(1) translate3d(0,0,0); } to{ transform:scale(1.07) translate3d(-1.2%, -.8%, 0); } }
.nw-sh{ position:absolute; inset:0; background:radial-gradient(120% 95% at 50% 45%, transparent 55%, ${K(0,0,0,.38)} 100%), ${K(4,6,10,'var(--nw-dim, .5)')}; }
.nw-c{ position:absolute; inset:0; display:grid; place-items:center; padding:24px; }
.nw-g{ display:flex; flex-direction:column; align-items:center; transition:transform 5s cubic-bezier(.4,0,.2,1); transform:translate(var(--nw-x, 0), var(--nw-y, 0)); text-align:center; }
.nw-t{ font-size:clamp(72px, 24vmin, 260px); font-weight:300; line-height:.95; letter-spacing:-.03em; font-variant-numeric:tabular-nums; text-shadow:0 4px 40px ${K(0,0,0,.45)}; }
.nw-d{ position:absolute; left:clamp(20px, 4vmin, 48px); bottom:calc(clamp(18px, 4vmin, 44px) + env(safe-area-inset-bottom, 0px)); font-size:clamp(16px, 3.2vmin, 32px); font-weight:500; opacity:.92; letter-spacing:.01em; text-shadow:0 2px 14px ${K(0,0,0,.5)}; } .nw-d::first-letter{ text-transform:uppercase; }
.nw-w{ position:absolute; right:clamp(20px, 4vmin, 48px); top:calc(clamp(18px, 4vmin, 44px) + env(safe-area-inset-top, 0px)); display:flex; align-items:center; gap:clamp(8px, 1.6vmin, 16px); text-shadow:0 2px 14px ${K(0,0,0,.5)}; }
.nw-w[hidden]{ display:none; } .nw-w img{ width:clamp(44px, 9vmin, 92px); height:clamp(44px, 9vmin, 92px); filter:drop-shadow(0 2px 10px ${K(0,0,0,.4)}); }
.nw-w b{ display:block; font-size:clamp(28px, 6.4vmin, 64px); font-weight:400; line-height:1; font-variant-numeric:tabular-nums; } .nw-w small{ display:block; margin-top:4px; font-size:clamp(13px, 2.2vmin, 20px); opacity:.85; font-weight:500; }
.nw-h{ position:absolute; left:0; right:0; bottom:calc(22px + env(safe-area-inset-bottom, 0px)); text-align:center; font-size:clamp(12px, 2vmin, 15px); opacity:.55; letter-spacing:.04em; text-shadow:0 1px 8px ${K(0,0,0,.6)}; animation:nwh 4s ease-in-out infinite; }
@keyframes nwh{ 0%, 100%{ opacity:.25; } 50%{ opacity:.6; } }
@media (prefers-reduced-motion:reduce){ .nw, .nw.out{ transition-duration:.2s; } .nw-bg{ animation:none; transition-duration:.2s; } .nw-g{ transition:none; } .nw-h{ animation:none; opacity:.55; } }
`;
const HGWall = window.__hgWall || (window.__hgWall = {
  IDLES: [30, 60, 120, 300, 600, 1800],
  SRCS: [['bg', 'Tło dashboardu', 'Dashboard background'], ['slides', 'Pokaz slajdów', 'Slideshow'], ['url', 'Własny adres', 'Custom URL']],
  last: Date.now(), active: false, page: null, hass: null, el: null, _t: null, _ck: null, _sl: null, _dr: null, _wl: null, _wired: false, _ms: undefined, _foc: null, _sv: null,
  /* ---- ustawienia ---- */
  get() { const w = (window.__hgL && window.__hgL.data && window.__hgL.data.wall) || {}, n = (v, a, b, d) => { v = Number(v); return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
    return { on: w.on === true, idle: n(w.idle, 15, 7200, 120), dim: n(w.dim, 0, 0.9, 0.5), src: this.SRCS.some((s) => s[0] === w.src) ? w.src : 'bg',
      url: typeof w.url === 'string' && /^(\/|https?:\/\/)/.test(w.url) && !/[\s"'()<>\\]/.test(w.url) ? w.url : '',
      sensor: typeof w.sensor === 'string' && /^binary_sensor\.[a-z0-9_]+$/.test(w.sensor) ? w.sensor : '' }; },
  /* zapis do HA (frontend/set_user_data) z opóźnieniem – suwak przyciemnienia strzela wieloma zdarzeniami; bez tego load() po przeładowaniu nadpisywał lokalną zmianę danymi z serwera */
  set(p) { HGL.data.wall = Object.assign({}, this.get(), p); HGL._ls(); this.sync();
    clearTimeout(this._sv); this._sv = setTimeout(() => { this._sv = null; HGL.save(this.hass || window.__hgHass).catch(() => {}); }, 400); },
  /* ---- silnik bezczynności ---- */
  tick(h, page) { this.hass = h; this.page = page; this.sync(); this.motion(h); },
  sync() { const c = this.get();
    if (!this._wired) { this._wired = true; const bump = () => { this.last = Date.now(); };
      for (const t of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.addEventListener(t, bump, { capture: true, passive: true });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) { this.last = Date.now(); this.arm(); } }); }
    if (!c.on) { clearTimeout(this._t); this._t = null; if (this.active) this.hide(); return; }
    if (!this._t && !this.active) this.arm();
    else if (this.active && this.el) { this.el.style.setProperty('--nw-dim', c.dim); this.wx(); } },
  arm(ms) { clearTimeout(this._t); const c = this.get(); if (!c.on) { this._t = null; return; }
    this._t = setTimeout(() => this.check(), Math.max(1000, ms != null ? ms : c.idle * 1000 - (Date.now() - this.last))); },
  /* nakładka tylko na widocznym dashboardzie Nuvio, nie w trybie edycji i nie w tle przeglądarki */
  canShow() { const p = this.page; return !!(p && p.isConnected && !p._hgHidden && !p._editing && !(window.__hgL && window.__hgL.editing) && !document.hidden); },
  check() { this._t = null; const c = this.get(); if (!c.on || this.active) return;
    const left = c.idle * 1000 - (Date.now() - this.last);
    if (left > 500) return this.arm(left);
    if (!this.canShow()) { this.last = Date.now(); return this.arm(); }
    this.show(); },
  motion(h) { const c = this.get(); if (!c.on || !c.sensor) { this._ms = undefined; return; }
    const s = h && h.states ? h.states[c.sensor] : null, st = s ? s.state : null;
    if (this._ms !== undefined && st === 'on' && this._ms !== 'on' && this.active) this.wake('motion');
    this._ms = st; },
  /* ---- zdjęcia ---- */
  imgs() { const c = this.get(), A = HGApp.get(), port = window.innerHeight > window.innerWidth, one = (b) => { if (!b) return null; const u = port && b.v2p ? HGApp.bgImg({ kind: 'image', v: b.v2p }) : HGApp.bgImg(b); return u; };
    if (c.src === 'url' && c.url) return [HGApp.bgImg({ kind: 'image', v: c.url })];
    if (c.src === 'slides') { const l = (typeof HG_BGS !== 'undefined' ? HG_BGS : []).map(([u, , pu]) => one(u ? { kind: 'image', v: u, v2p: pu || '' } : window.HG_DEFAULT_BG)).filter(Boolean);
      if (A.bg && A.bg.kind === 'image') { const x = one(A.bg); if (x && !l.includes(x)) l.unshift(x); }
      if (l.length) return [...new Set(l)]; }
    const B = A.bg || window.HG_DEFAULT_BG, x = one(B); return [x || `linear-gradient(160deg, ${(window.HG_DEFAULT_BG_FB || {}).v || '#16202B'}, ${(window.HG_DEFAULT_BG_FB || {}).v2 || '#05070A'})`]; },
  /* ---- nakładka ---- */
  show() { if (this.active) return; const c = this.get(), h = this.hass, rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.active = true; clearTimeout(this._t); this._t = null; this._foc = document.activeElement;
    const el = this.el = document.createElement('div'); el.className = 'nw'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', hgTr('Wygaszacz ekranu', 'Screensaver')); el.tabIndex = -1;
    el.style.setProperty('--nw-dim', c.dim);
    el.innerHTML = `<style>${HG_WALL_SS}</style><div class="nw-bg" aria-hidden="true"></div><div class="nw-bg" aria-hidden="true"></div><div class="nw-sh" aria-hidden="true"></div>
      <div class="nw-c"><div class="nw-g"><time class="nw-t"></time></div></div><div class="nw-d"></div><div class="nw-w" hidden></div><p class="nw-h">${H.esc(hgTr('Dotknij ekranu, aby wybudzić', 'Touch the screen to wake'))}</p>`;
    const wk = (e) => { e.preventDefault(); e.stopPropagation(); this.wake('touch'); };
    el.addEventListener('pointerdown', wk); el.addEventListener('keydown', wk); el.addEventListener('wheel', wk, { passive: false }); el.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(el);
    try { el.popover = 'manual'; el.showPopover(); } catch (e) { /* bez Popover API: wystarczy z-index */ }
    this.clock(); this.photos(rm); this.drift(rm);
    requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('in'); el.focus({ preventScroll: true }); }));
    try { if (navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then((l) => { if (this.active) this._wl = l; else l.release(); }, () => {}); } catch (e) { /* ekran może zgasnąć wg systemu */ } },
  clock() { clearTimeout(this._ck); const el = this.el; if (!el) return;
    const l = this.hass && this.hass.locale ? this.hass.locale.time_format : null, o = l === '12' ? { hour12: true } : l === '24' ? { hour12: false } : {}, d = new Date();
    el.querySelector('.nw-t').textContent = new Intl.DateTimeFormat(HG_LOC(), Object.assign({ hour: '2-digit', minute: '2-digit' }, o)).format(d);
    el.querySelector('.nw-d').textContent = new Intl.DateTimeFormat(HG_LOC(), { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    this.wx();
    this._ck = setTimeout(() => this.clock(), 60000 - (Date.now() % 60000) + 50); },
  /* pogoda w prawym górnym rogu, tylko gdy w HA jest encja weather */
  wx() { const el = this.el, h = this.hass, box = el && el.querySelector('.nw-w'); if (!box) return;
    const id = Object.keys((h && h.states) || {}).find((e) => e.startsWith('weather.') && h.states[e].state !== 'unavailable' && h.states[e].state !== 'unknown'), w = id ? h.states[id] : null;
    if (!w || typeof HGWx === 'undefined') { box.hidden = true; return; }
    const t = parseFloat(w.attributes.temperature), u = w.attributes.temperature_unit || (h.config && h.config.unit_system && h.config.unit_system.temperature) || '°C', sun = h.states['sun.sun'], night = !!sun && sun.state === 'below_horizon';
    const html = `<img alt="" src="${H.esc(HGWx.icon({ icon_base: HG_ASSET + 'nuvio-meteo-', icon_v: '1' }, w.state, night, true))}"><span>${isFinite(t) ? `<b>${H.esc(H.fmt(t, 0))}${H.esc(u.startsWith('°') ? '°' : ' ' + u)}</b>` : ''}<small>${H.esc(HGWx.cn(w.state))}</small></span>`;
    if (box.dataset.k !== html) { box.dataset.k = html; box.innerHTML = html; } box.hidden = false; },
  /* dwie warstwy zdjęcia: płynne przenikanie (pokaz slajdów co 45 s) */
  photos(rm) { const L = [...this.el.querySelectorAll('.nw-bg')], im = this.imgs(); let i = Math.floor(Math.random() * im.length), f = 0;
    const put = () => { const t = L[f]; t.style.backgroundImage = im[i % im.length]; t.classList.add('on'); L[1 - f].classList.remove('on'); f = 1 - f; i++; };
    put();
    if (im.length > 1 && !rm) this._sl = setInterval(put, 45000); },
  /* ochrona przed wypaleniem: zegar co minutę lekko zmienia położenie */
  drift(rm) { const g = this.el.querySelector('.nw-g'), mv = () => { const v = Math.min(innerWidth, innerHeight) * 0.07; g.style.setProperty('--nw-x', ((Math.random() * 2 - 1) * v).toFixed(0) + 'px'); g.style.setProperty('--nw-y', ((Math.random() * 2 - 1) * v).toFixed(0) + 'px'); };
    mv(); this._dr = setInterval(mv, 60000); },
  wake(why) { if (!this.active || !this.el) return; const el = this.el; this.active = false; this.el = null; this.last = Date.now(); this._ms = undefined;
    clearTimeout(this._ck); clearInterval(this._sl); clearInterval(this._dr); try { if (this._wl) this._wl.release(); } catch (e) { /* bez znaczenia */ } this._wl = null;
    el.classList.remove('in'); el.classList.add('out'); el.style.pointerEvents = 'auto';   /* nakładka zostaje na czas wygaszenia: dotknięcie nie „przebija” się do kafla pod spodem */
    setTimeout(() => { try { el.hidePopover(); } catch (e) { /* bez Popover API */ } el.remove(); }, 450);
    const f = this._foc; this._foc = null; try { if (f && f.isConnected && f.focus) f.focus({ preventScroll: true }); } catch (e) { /* bez znaczenia */ }
    this.arm(); },
  hide() { if (this.active) this.wake('off'); },
  /* ---- UI: sekcja w arkuszu Wygląd (tylko admin, jak edycja układu) ---- */
  admin(p) { const h = p && p._hass; return !!(h && h.user && h.user.is_admin); },
  fmt(s) { return s < 60 ? s + ' s' : Math.round(s / 60) + ' min'; },
  sensors(h) { const R = Object.keys((h && h.states) || {}).filter((e) => e.startsWith('binary_sensor.')), pri = (e) => (['motion', 'occupancy', 'presence'].includes((h.states[e].attributes || {}).device_class) ? 0 : 1), nm = (e) => (h.states[e].attributes || {}).friendly_name || e;
    return R.sort((a, b) => pri(a) - pri(b) || nm(a).localeCompare(nm(b), HG_LOC())).map((e) => [e, nm(e)]); },
  html(p) { if (!this.admin(p)) return ''; const c = this.get(), h = p._hass, dv = Math.round(c.dim * 100), idles = this.IDLES.includes(c.idle) ? this.IDLES : [...this.IDLES, c.idle].sort((a, b) => a - b);
    const sens = this.sensors(h), cur = c.sensor && !sens.some((s) => s[0] === c.sensor) ? [[c.sensor, c.sensor]] : [];
    const body = !c.on ? '' : `
      <div class="wl-f" role="group" aria-labelledby="wl-i"><span id="wl-i">${hgTr('Włącz po bezczynności', 'Start after inactivity')}</span><div class="wl-seg six" style="--n:${idles.length}">${idles.map((s) => `<button type="button" data-hge="wl-idle" data-v="${s}" aria-pressed="${c.idle === s}">${this.fmt(s)}</button>`).join('')}</div></div>
      <div class="wl-f"><span>${hgTr('Przyciemnienie', 'Dimming')}<em class="wl-dv">${dv}%</em></span><input class="lk-rg" type="range" min="0" max="90" step="5" name="wl-dim" value="${Math.round(dv / 5) * 5}" style="--v:${dv / 0.9}%" aria-label="${hgTr('Przyciemnienie wygaszacza', 'Screensaver dimming')}"></div>
      <div class="wl-f" role="group" aria-labelledby="wl-s"><span id="wl-s">${hgTr('Zdjęcie', 'Photo')}</span><div class="wl-seg" style="--n:3">${this.SRCS.map(([k, pl, en]) => `<button type="button" data-hge="wl-src" data-v="${k}" aria-pressed="${c.src === k}">${hgTr(pl, en)}</button>`).join('')}</div>
        ${c.src === 'url' ? `<span class="hs-s lk-url">${H.icon('mdi:link-variant')}<input class="hs-in" name="wl-url" placeholder="${hgTr('Adres zdjęcia: https://… lub /local/…', 'Image URL: https://… or /local/…')}" value="${H.esc(c.url)}" autocomplete="off" aria-label="${hgTr('Adres zdjęcia wygaszacza', 'Screensaver image URL')}"></span>` : ''}</div>
      <label class="wl-f"><span>${hgTr('Czujnik ruchu (wybudzanie)', 'Motion sensor (wake)')}</span><select class="hs-in" name="wl-sensor"><option value="">${hgTr('Brak, tylko dotyk', 'None, touch only')}</option>${[...cur, ...sens].map(([e, n]) => `<option value="${H.esc(e)}"${e === c.sensor ? ' selected' : ''}>${H.esc(n)}</option>`).join('')}</select></label>
      <button type="button" class="wl-tb" data-hge="wl-test">${H.icon('mdi:play-circle-outline')}<span>${hgTr('Podgląd wygaszacza', 'Preview screensaver')}</span></button>`;
    return `<section class="lk-g wl" aria-labelledby="wl-h"><style>${HG_WALL_CSS}</style><h4 id="wl-h">${H.icon('mdi:tablet-dashboard')}${hgTr('Tryb tabletu ściennego', 'Wall tablet mode')}</h4>
      <small class="lk-hn">${hgTr('Po bezczynności zegar ze zdjęciem i przyciemnieniem; dotyk lub czujnik ruchu budzi ekran. Ustawienie dotyczy konta użytkownika HA.', 'After inactivity: a clock over a dimmed photo; touch or a motion sensor wakes the screen. Applies to this Home Assistant user.')}</small>
      <button type="button" class="wl-sw" role="switch" data-hge="wl-on" aria-checked="${c.on}"><span>${hgTr('Wygaszacz', 'Screensaver')}<small>${c.on ? hgTr('Włączony', 'On') : hgTr('Wyłączony', 'Off')}</small></span><i aria-hidden="true"></i></button>${body}</section>`; },
  wire(p, S) { if (!this.admin(p)) return;
    const rg = S.querySelector('[name=wl-dim]'); if (rg) rg.addEventListener('input', () => { rg.style.setProperty('--v', rg.value / 0.9 + '%'); S.querySelector('.wl-dv').textContent = rg.value + '%'; this.set({ dim: rg.value / 100 }); });
    const se = S.querySelector('[name=wl-sensor]'); if (se) se.addEventListener('change', () => { this._ms = undefined; this.set({ sensor: se.value }); });
    const u = S.querySelector('[name=wl-url]'); if (u) u.addEventListener('change', () => { const v = u.value.trim();
      if (v && !/^(\/|https?:\/\/)/.test(v)) return p._eToast(hgTr('Podaj adres https:// lub /local/…', 'Enter an https:// or /local/… address'));
      this.set({ url: v }); }); },
  act(p, b, a) { if (!this.admin(p)) return;
    if (a === 'wl-on') { this.last = Date.now(); this.set({ on: !this.get().on }); return p._eLook(); }
    if (a === 'wl-idle') { this.last = Date.now(); this.set({ idle: Number(b.dataset.v) }); return p._eLook(); }
    if (a === 'wl-src') { this.set({ src: b.dataset.v }); return p._eLook(); }
    if (a === 'wl-test') { this.hass = this.hass || p._hass; this.page = this.page || p; this.show(); } },
});
window.HGWall = HGWall;
