/* ===== Wygaszacz „Tablica” (2.0): data i godzina, wschód/zachód słońca, odliczanie do wydarzenia, pogoda z prognozą godzinową, najbliższe wydarzenia,
   teraz gra, zdjęcie i temperatury w pokojach. Ustawienia w HGL.data.wall: style 'photo' | 'board', bt (motyw auto/light/dark), hd (nagłówek: dzień / godzina),
   bk { sun, cnt, wx, cal, np, tmp, pic, hum } (włączone elementy), ord (kolejność kart), wxE (encja pogody), calX / roomX (wykluczone kalendarze i pokoje).
   Kolory przez K() (interpolacja): tokenizer motywu ich nie zmienia, motyw tablicy wybiera się w ustawieniach. */
const HG_WB_CARDS = [['cal', 'Najbliższe wydarzenia', 'Coming up', 'mdi:calendar-blank-outline'], ['np', 'Teraz gra', 'Now playing', 'mdi:music'],
  ['pic', 'Zdjęcie', 'Photo', 'mdi:image-outline'], ['tmp', 'Temperatury w pokojach', 'Room temperatures', 'mdi:thermometer']];
const HG_WB_BK = [['wx', 'Pogoda', 'Weather'], ['sun', 'Wschód i zachód', 'Sunrise & sunset'], ['cnt', 'Odliczanie', 'Countdown'], ['cal', 'Kalendarz', 'Calendar'],
  ['np', 'Teraz gra', 'Now playing'], ['pic', 'Zdjęcie', 'Photo'], ['tmp', 'Temperatury', 'Temperatures'], ['hum', 'Wilgotność', 'Humidity']];
const HG_WB_SS = `
.nwb{ --nb-bg:${K(236,238,242,1)}; --nb-card:${K(255,255,255,1)}; --nb-tx:${K(17,19,23,1)}; --nb-tx2:${K(17,19,23,.56)}; --nb-ln:${K(17,19,23,.08)}; --nb-chip:${K(255,255,255,1)}; --nb-sh:0 1px 2px ${K(0,0,0,.05)}, 0 8px 28px ${K(20,30,50,.07)};
  position:absolute; inset:0; box-sizing:border-box; display:flex; flex-direction:column; gap:clamp(12px, 2.2vmin, 24px); padding:calc(clamp(16px, 3.4vmin, 40px) + env(safe-area-inset-top, 0px)) calc(clamp(16px, 3.4vmin, 40px) + env(safe-area-inset-right, 0px)) calc(clamp(40px, 6vmin, 64px) + env(safe-area-inset-bottom, 0px)) calc(clamp(16px, 3.4vmin, 40px) + env(safe-area-inset-left, 0px));
  background:var(--nb-bg); color:var(--nb-tx); filter:brightness(calc(1 - var(--nw-dim, 0) * .35)); transition:transform 5s cubic-bezier(.4,0,.2,1), filter .6s ease, opacity .4s ease; transform:translate(var(--nw-x, 0), var(--nw-y, 0)); }
.nwb.dk{ --nb-bg:${K(10,12,16,1)}; --nb-card:${K(26,29,35,1)}; --nb-tx:${K(244,246,250,1)}; --nb-tx2:${K(244,246,250,.58)}; --nb-ln:${K(255,255,255,.08)}; --nb-chip:${K(30,34,41,1)}; --nb-sh:0 1px 0 ${K(255,255,255,.04)} inset; }
.nb-top{ display:grid; grid-template-columns:minmax(0, 1.15fr) minmax(0, 1fr); gap:clamp(12px, 2.2vmin, 24px); align-items:stretch; }
.nb-top.one{ grid-template-columns:1fr; }
.nb-date{ min-width:0; display:flex; flex-direction:column; justify-content:center; gap:clamp(4px, 1vmin, 10px); }
.nb-h1{ margin:0; font-size:clamp(52px, 12.5vmin, 150px); font-weight:700; line-height:.92; letter-spacing:-.045em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-variant-numeric:tabular-nums; }
.nb-h1::first-letter{ text-transform:uppercase; }
.nb-h2{ display:flex; align-items:baseline; gap:.5em; flex-wrap:wrap; font-size:clamp(22px, 5vmin, 58px); font-weight:500; color:var(--nb-tx2); letter-spacing:-.02em; line-height:1.05; }
.nb-h2::first-letter{ text-transform:uppercase; } .nb-h2 time{ color:var(--nb-tx); font-weight:300; font-variant-numeric:tabular-nums; }
.nb-chips{ display:flex; flex-wrap:wrap; gap:8px; margin-top:clamp(6px, 1.4vmin, 14px); } .nb-chips:empty{ display:none; }
.nb-chip{ display:inline-flex; align-items:center; gap:7px; height:clamp(32px, 4.6vmin, 42px); padding:0 clamp(12px, 1.8vmin, 16px) 0 clamp(10px, 1.4vmin, 13px); border-radius:999px; background:var(--nb-chip); box-shadow:var(--nb-sh); font-size:clamp(13px, 1.9vmin, 17px); font-weight:600; white-space:nowrap; }
.nb-chip ha-icon{ --mdc-icon-size:18px; width:18px; height:18px; color:var(--c, currentColor); }
.nb-card{ position:relative; min-width:0; min-height:0; box-sizing:border-box; border-radius:clamp(18px, 2.6vmin, 28px); background:var(--nb-card); box-shadow:var(--nb-sh); padding:clamp(14px, 2.2vmin, 22px); overflow:hidden; animation:nwin .9s cubic-bezier(.2,.8,.2,1) both; }
.nb-wx{ color:${K(255,255,255,1)}; background:linear-gradient(160deg, var(--w1), var(--w2)); display:flex; flex-direction:column; gap:clamp(8px, 1.4vmin, 14px); text-shadow:0 1px 2px ${K(0,0,0,.18)}; }
.nb-wm{ display:flex; align-items:center; gap:clamp(6px, 1vmin, 12px); min-width:0; }
.nb-wm img{ flex:none; width:clamp(56px, 9vmin, 96px); height:clamp(56px, 9vmin, 96px); margin:-10px -6px -10px -10px; filter:drop-shadow(0 6px 16px ${K(0,0,0,.18)}); }
.nb-wm b{ font-size:clamp(46px, 9.5vmin, 104px); font-weight:300; letter-spacing:-.05em; line-height:.9; font-variant-numeric:tabular-nums; }
.nb-wi{ margin-left:auto; min-width:0; display:flex; flex-direction:column; align-items:flex-end; text-align:right; gap:3px; font-size:clamp(12px, 1.7vmin, 16px); font-weight:500; }
.nb-wi strong{ font-size:clamp(16px, 2.6vmin, 26px); font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; } .nb-wi span{ opacity:.85; font-variant-numeric:tabular-nums; }
.nb-wn{ font-size:clamp(12px, 1.7vmin, 16px); font-weight:600; opacity:.92; }
.nb-fc{ display:grid; grid-template-columns:repeat(var(--n, 6), 1fr); gap:2px; margin-top:auto; padding-top:clamp(6px, 1.2vmin, 12px); border-top:1px solid ${K(255,255,255,.22)}; }
.nb-fc div{ display:flex; flex-direction:column; align-items:center; font-size:clamp(12px, 1.7vmin, 16px); font-variant-numeric:tabular-nums; }
.nb-fc i{ font-style:normal; font-size:.85em; opacity:.8; font-weight:600; } .nb-fc img{ width:clamp(30px, 4.6vmin, 46px); height:clamp(30px, 4.6vmin, 46px); margin:-3px 0; } .nb-fc b{ font-weight:600; }
.nb-row{ flex:1; min-height:0; display:grid; grid-template-columns:repeat(var(--n, 3), minmax(0, 1fr)); gap:clamp(12px, 2.2vmin, 24px); }
.nb-row:empty{ display:none; }
.nb-hd{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin:0 0 clamp(8px, 1.4vmin, 14px); font-size:clamp(11px, 1.5vmin, 14px); font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:var(--nb-tx2); }
.nb-hd em{ font-style:normal; letter-spacing:.04em; }
.nb-ev{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
.nb-ev li{ display:flex; align-items:center; gap:10px; padding:clamp(8px, 1.3vmin, 12px) 0; border-top:1px solid var(--nb-ln); min-width:0; } .nb-ev li:first-child{ border-top:0; padding-top:0; }
.nb-ev li::before{ content:''; flex:none; align-self:stretch; width:4px; border-radius:2px; background:var(--c); }
.nb-ev div{ flex:1; min-width:0; } .nb-ev b{ display:block; font-size:clamp(15px, 2.2vmin, 20px); font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nb-ev small{ display:block; margin-top:2px; font-size:clamp(12px, 1.6vmin, 15px); color:var(--nb-tx2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-variant-numeric:tabular-nums; }
.nb-ev em{ flex:none; font-style:normal; font-size:clamp(12px, 1.6vmin, 15px); font-weight:700; color:${K(240,120,40,1)}; font-variant-numeric:tabular-nums; }
.nb-none{ margin:0; font-size:clamp(14px, 2vmin, 18px); color:var(--nb-tx2); }
.nb-pic, .nb-np{ padding:0; color:${K(255,255,255,1)}; background:${K(30,34,40,1)} center/cover no-repeat; display:flex; flex-direction:column; justify-content:flex-end; }
.nb-pic i, .nb-np i{ position:absolute; inset:0; background:center/cover no-repeat; transition:opacity 2s ease; }
.nb-pic i + i{ opacity:0; } .nb-pic.f i + i{ opacity:1; }
.nb-np{ background:radial-gradient(120% 90% at 20% 0%, ${K(120,96,220,1)}, transparent 60%), linear-gradient(160deg, ${K(56,44,110,1)}, ${K(18,16,34,1)}); }
.nb-np .ph{ position:absolute; right:-6%; top:-4%; --mdc-icon-size:min(22vmin, 60%); width:min(22vmin, 60%); height:auto; opacity:.12; }
.nb-np::after{ content:''; position:absolute; inset:0; background:linear-gradient(180deg, transparent 30%, ${K(0,0,0,.72)}); }
.nb-np > div{ position:relative; z-index:1; padding:clamp(14px, 2.2vmin, 22px); min-width:0; text-shadow:0 1px 3px ${K(0,0,0,.4)}; }
.nb-np small{ display:flex; align-items:center; gap:6px; font-size:clamp(11px, 1.5vmin, 14px); font-weight:700; letter-spacing:.1em; text-transform:uppercase; opacity:.85; }
.nb-np small ha-icon{ --mdc-icon-size:16px; width:16px; height:16px; }
.nb-np b{ display:block; margin-top:4px; font-size:clamp(18px, 2.8vmin, 28px); font-weight:700; line-height:1.1; letter-spacing:-.01em; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
.nb-np span{ display:block; margin-top:3px; font-size:clamp(13px, 1.9vmin, 17px); opacity:.85; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nb-np .eq{ display:inline-flex; align-items:flex-end; gap:2px; height:12px; margin-left:2px; } .nb-np .eq u{ width:3px; height:100%; background:currentColor; border-radius:1px; animation:nbeq 1s ease-in-out infinite alternate; transform-origin:bottom; }
.nb-np .eq u:nth-child(2){ animation-delay:-.4s; } .nb-np .eq u:nth-child(3){ animation-delay:-.7s; }
@keyframes nbeq{ from{ transform:scaleY(.3); } to{ transform:scaleY(1); } }
.nb-tl{ list-style:none; margin:0; padding:0; display:flex; flex-direction:column; }
.nb-tl li{ display:flex; align-items:center; gap:12px; padding:clamp(7px, 1.2vmin, 11px) 0; border-top:1px solid var(--nb-ln); min-width:0; } .nb-tl li:first-child{ border-top:0; padding-top:0; }
.nb-tl i{ flex:none; width:clamp(32px, 4.6vmin, 40px); height:clamp(32px, 4.6vmin, 40px); border-radius:50%; display:flex; align-items:center; justify-content:center; background:color-mix(in srgb, var(--c) 18%, transparent); color:var(--c); }
.nb-tl i ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; }
.nb-tl span{ flex:1; min-width:0; font-size:clamp(14px, 2vmin, 18px); font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nb-tl b{ flex:none; font-size:clamp(18px, 2.8vmin, 26px); font-weight:500; letter-spacing:-.02em; font-variant-numeric:tabular-nums; } .nb-tl small{ flex:none; width:3.2em; text-align:right; font-size:clamp(12px, 1.6vmin, 14px); color:var(--nb-tx2); font-variant-numeric:tabular-nums; }
.nw.bd .nw-h{ color:${K(17,19,23,.5)}; text-shadow:none; bottom:calc(clamp(12px, 2.2vmin, 22px) + env(safe-area-inset-bottom, 0px)); font-size:clamp(12px, 1.6vmin, 14px); }
.nw.bd.dk .nw-h{ color:${K(255,255,255,.5)}; }
.nw.bd.pin .nwb{ opacity:.18; filter:blur(24px); } .nw.bd.pin .nw-h{ opacity:0; }
@media (orientation:portrait){ .nb-top{ grid-template-columns:1fr; } .nb-row{ grid-template-columns:repeat(min(var(--n, 3), 2), minmax(0, 1fr)); grid-auto-rows:minmax(0, 1fr); } .nb-row > :last-child:nth-child(odd):not(:first-child){ grid-column:1 / -1; } }
@media (max-height:560px) and (orientation:landscape){ .nb-fc{ display:none; } .nb-row{ gap:10px; } }
@media (prefers-reduced-motion:reduce){ .nwb{ transition:none; } .nb-np .eq u{ animation:none; } .nb-card{ animation:none; } }
`;
const HG_WB_CSS = `
.wl-chips{ display:flex; flex-wrap:wrap; gap:6px; }
.wl-chips button{ all:unset; box-sizing:border-box; cursor:pointer; display:inline-flex; align-items:center; gap:6px; min-height:36px; padding:0 14px 0 10px; border-radius:999px; font-size:13px; font-weight:600; background:var(--hg-tile-bg); transition:background .2s ease, color .2s ease; }
.wl-chips button ha-icon{ --mdc-icon-size:16px; width:16px; height:16px; opacity:.35; }
.wl-chips button[aria-pressed=true]{ background:var(--hg-accent); color:var(--hg-on-accent); } .wl-chips button[aria-pressed=true] ha-icon{ opacity:1; }
.wl-chips button:focus-visible, .wl-ord button:focus-visible{ outline:2px solid var(--hg-accent); outline-offset:2px; }
.wl-ord{ display:flex; flex-direction:column; gap:4px; }
.wl-ord > div{ display:flex; align-items:center; gap:10px; min-height:44px; padding:0 4px 0 12px; border-radius:14px; background:var(--hg-tile-bg); font-size:14px; font-weight:600; }
.wl-ord > div.off{ opacity:.45; } .wl-ord span{ flex:1; min-width:0; } .wl-ord small{ font-weight:400; opacity:.65; font-size:12px; }
.wl-ord button{ all:unset; box-sizing:border-box; cursor:pointer; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
.wl-ord button:hover{ background:var(--hg-hover-fill, color-mix(in srgb, currentColor 8%, transparent)); } .wl-ord button[disabled]{ opacity:.25; pointer-events:none; }
.wl-ord ha-icon{ --mdc-icon-size:20px; width:20px; height:20px; }
`;
Object.assign(HGWall, {
  /* ---- ustawienia tablicy ---- */
  bget() { const w = (window.__hgL && window.__hgL.data && window.__hgL.data.wall) || {}, bk0 = w.bk && typeof w.bk === 'object' ? w.bk : {}, ids = HG_WB_CARDS.map((x) => x[0]);
    const bk = {}; for (const [k] of HG_WB_BK) bk[k] = bk0[k] !== false;
    const ord = (Array.isArray(w.ord) ? w.ord.filter((k) => ids.includes(k)) : []); for (const k of ids) if (!ord.includes(k)) ord.push(k);
    const L = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && /^[a-z0-9_.]+$/.test(x)) : []);
    return { style: w.style === 'board' ? 'board' : 'photo', bt: ['auto', 'light', 'dark'].includes(w.bt) ? w.bt : 'auto', hd: w.hd === 'time' ? 'time' : 'day', bk, ord: [...new Set(ord)],
      wxE: typeof w.wxE === 'string' && /^weather\.[a-z0-9_]+$/.test(w.wxE) ? w.wxE : '', calX: L(w.calX), roomX: L(w.roomX) }; },
  board() { return this.bget().style === 'board'; },
  /* ---- nakładka ---- */
  bdShell() { return `<style>${HG_WALL_SS}${HG_WB_SS}</style><div class="nwb" aria-hidden="false"><div class="nb-top"><div class="nb-date"><h1 class="nb-h1"></h1><div class="nb-h2"></div><div class="nb-chips"></div></div><div class="nb-card nb-wx" hidden></div></div><div class="nb-row"></div></div>
      <p class="nw-h">${H.esc(hgTr('Dotknij ekranu, aby wybudzić', 'Touch the screen to wake'))}</p>`; },
  bdStart(rm) { const el = this.el; el.classList.add('bd'); this._pi = 0; this._bdk = {};
    const b = el.querySelector('.nwb'), mv = () => { const v = Math.min(innerWidth, innerHeight) * 0.008; b.style.setProperty('--nw-x', ((Math.random() * 2 - 1) * v).toFixed(0) + 'px'); b.style.setProperty('--nw-y', ((Math.random() * 2 - 1) * v).toFixed(0) + 'px'); };
    if (!rm) { mv(); this._dr = setInterval(mv, 60000); }
    this._sl = setInterval(() => { this._pi++; this.bdPic(); }, 45000);
    this.bd(true); },
  _put(sel, html, hide) { const n = this.el && this.el.querySelector(sel); if (!n) return null; if (hide) { n.hidden = true; return n; } n.hidden = false; if (this._bdk[sel] !== html) { this._bdk[sel] = html; n.innerHTML = html; } return n; },
  tf() { const l = this.hass && this.hass.locale ? this.hass.locale.time_format : null; return new Intl.DateTimeFormat(HG_LOC(), Object.assign({ hour: '2-digit', minute: '2-digit' }, l === '12' ? { hour12: true } : l === '24' ? { hour12: false } : {})); },
  dark(B, h) { if (B.bt !== 'auto') return B.bt === 'dark'; const s = h && h.states['sun.sun']; return s ? s.state === 'below_horizon' : document.documentElement.getAttribute('data-hg-scheme') === 'dark'; },
  /* odświeżenie całej tablicy (zegar co minutę, stany HA najwyżej co 2 s); każdy blok przerysowany tylko po zmianie treści */
  bd(force) { const el = this.el, h = this.hass; if (!el || !h || !el.classList.contains('bd')) return;
    const now = Date.now(); if (!force && now - (this._bdt || 0) < 2000) { clearTimeout(this._bdq); this._bdq = setTimeout(() => this.bd(true), 2000 - (now - this._bdt)); return; } this._bdt = now;
    const B = this.bget(), c = this.get(), d = new Date(), tf = this.tf(), b = el.querySelector('.nwb');
    const dk = this.dark(B, h); b.classList.toggle('dk', dk); el.classList.toggle('dk', dk); el.style.setProperty('--nw-dim', c.dim);
    const wd = new Intl.DateTimeFormat(HG_LOC(), { weekday: 'long' }).format(d), dt = new Intl.DateTimeFormat(HG_LOC(), { day: 'numeric', month: 'long' }).format(d), tm = tf.format(d);
    if (B.hd === 'time') { this._put('.nb-h1', H.esc(tm)); this._put('.nb-h2', `<span>${H.esc(wd)}, ${H.esc(dt)}</span>`); }
    else { this._put('.nb-h1', H.esc(wd)); this._put('.nb-h2', `<span>${H.esc(dt)}</span><time>${H.esc(tm)}</time>`); }
    this.bdCal(h, B);
    this._put('.nb-chips', this.bdChips(h, B, tf));
    const wx = B.bk.wx ? this.bdWx(h, B) : ''; this._put('.nb-wx', wx, !wx); el.querySelector('.nb-top').classList.toggle('one', !wx);
    this.bdRow(h, B, tf); },
  bdChips(h, B, tf) { const out = [], chip = (ic, t, col) => `<span class="nb-chip"${col ? ` style="--c:${col}"` : ''}>${H.icon(ic)}${H.esc(t)}</span>`;
    const sun = h.states['sun.sun'];
    if (B.bk.sun && sun) { const r = new Date(sun.attributes.next_rising), s = new Date(sun.attributes.next_setting), R = [];
      if (!isNaN(r)) R.push([r, chip('mdi:weather-sunset-up', hgTr('Wschód ', 'Sunrise ') + tf.format(r), K(245,170,40,1))]);
      if (!isNaN(s)) R.push([s, chip('mdi:weather-sunset-down', hgTr('Zachód ', 'Sunset ') + tf.format(s), K(240,120,50,1))]);
      out.push(...R.sort((a, x) => a[0] - x[0]).map((x) => x[1])); }
    if (B.bk.cnt && this._bev) { const d0 = new Date(); d0.setHours(0, 0, 0, 0);
      const ev = this._bev.find((e) => e.ad && e.s > d0); if (ev) { const n = Math.round((ev.s - d0) / 864e5);
        out.push(chip('mdi:calendar-star', n === 1 ? hgTr(`${ev.t} jutro`, `${ev.t} tomorrow`) : hgTr(`${ev.t} za ${n} dni`, `${ev.t} in ${n} days`), K(130,110,240,1))); } }
    return out.join(''); },
  wxId(h, B) { if (B.wxE && H.ok(h.states[B.wxE])) return B.wxE; return Object.keys(h.states).find((e) => e.startsWith('weather.') && H.ok(h.states[e])) || ''; },
  bdWx(h, B) { const id = this.wxId(h, B); if (!id || typeof HGWx === 'undefined') return ''; const w = h.states[id], A = w.attributes;
    const u = A.temperature_unit || '°C', deg = (v) => (isFinite(v) ? H.esc(H.fmt(v, 0)) + (u.startsWith('°') ? '°' : ' ' + H.esc(u)) : '–'), sun = h.states['sun.sun'], night = !!sun && sun.state === 'below_horizon';
    const ic = (cnd, n) => H.esc(HGWx.icon({ icon_base: HG_ASSET + 'nuvio-meteo-', icon_v: '1' }, cnd, n, true));
    this.fc(h, id); const F = this._fc && this._fc.id === id ? this._fc : null, D = F && F.daily && F.daily[0], hi = D ? parseFloat(D.temperature) : NaN, lo = D ? parseFloat(D.templow) : NaN;
    const hr0 = F && F.hourly ? F.hourly.filter((x) => new Date(x.datetime) > Date.now() - 3600000).slice(0, 6) : [], dy = !hr0.length && F && F.daily ? F.daily.slice(0, 5) : [], hr = hr0.length ? hr0 : dy, tf = this.tf();
    const df = new Intl.DateTimeFormat(HG_LOC(), { weekday: 'short' }), lab = (x, i) => (i === 0 ? (dy.length ? hgTr('Dziś', 'Today') : hgTr('Teraz', 'Now')) : dy.length ? df.format(new Date(x.datetime)) : tf.format(new Date(x.datetime)));
    const pp = hr.length && hr[0].precipitation_probability != null ? Number(hr[0].precipitation_probability) : null, fl = parseFloat(A.apparent_temperature);
    const g = /night|clear-night/.test(w.state) || (night && /sunny|partly|clear/.test(w.state)) ? [K(30,40,80,1), K(70,86,140,1)] : /sunny|clear/.test(w.state) ? [K(56,132,226,1), K(120,182,240,1)]
      : /rain|pour|lightning|hail/.test(w.state) ? [K(64,80,106,1), K(112,128,154,1)] : /snow|fog/.test(w.state) ? [K(128,146,170,1), K(184,196,212,1)] : [K(104,128,160,1), K(160,178,202,1)];
    const fc = hr.map((x, i) => `<div><i>${H.esc(lab(x, i))}</i><img alt="" src="${ic(x.condition, false)}"><b>${deg(parseFloat(x.temperature))}</b></div>`).join('');
    const sub = [isFinite(fl) ? hgTr('Odczuwalna ', 'Feels like ') + deg(fl) : '', isFinite(hi) ? `${hgTr('Maks.', 'H')} ${deg(hi)}${isFinite(lo) ? ` · ${hgTr('Min.', 'L')} ${deg(lo)}` : ''}` : ''].filter(Boolean);
    const el = this.el && this.el.querySelector('.nb-wx'); if (el) { el.style.setProperty('--w1', g[0]); el.style.setProperty('--w2', g[1]); }
    return `<div class="nb-wm"><img alt="" src="${ic(w.state, night)}"><b>${deg(parseFloat(A.temperature))}</b><div class="nb-wi"><strong>${H.esc(HGWx.cn(w.state))}</strong>${sub.map((s) => `<span>${s}</span>`).join('')}</div></div>
      ${pp != null ? `<div class="nb-wn">${H.esc(hgTr(`Szansa opadów ${pp}%`, `Chance of rain ${pp}%`))}</div>` : ''}${fc ? `<div class="nb-fc" style="--n:${hr.length}">${fc}</div>` : ''}`; },
  /* wydarzenia na 60 dni (lista: 14 dni, odliczanie: najbliższe całodniowe), co 10 min */
  bdCal(h, B) { const ids = Object.keys(h.states).filter((e) => e.startsWith('calendar.') && !B.calX.includes(e)); if (!ids.length || !h.callApi) { this._bev = null; return; }
    const d0 = new Date(); d0.setHours(0, 0, 0, 0); const d1 = new Date(d0); d1.setDate(d1.getDate() + 60); const key = d0.toDateString() + ids.join();
    if (this._bevk === key && Date.now() - this._bevt < 600000) return; this._bevk = key; this._bevt = Date.now();
    const q = `?start=${encodeURIComponent(d0.toISOString())}&end=${encodeURIComponent(d1.toISOString())}`;
    Promise.all(ids.map((id) => h.callApi('GET', `calendars/${id}${q}`).catch(() => []))).then((rs) => {
      const L = []; for (const [ci, r] of rs.entries()) for (const e of (Array.isArray(r) ? r : [])) { const ad = !!(e.start && e.start.date && !e.start.dateTime), s = ad ? new Date(e.start.date + 'T00:00:00') : new Date(e.start && e.start.dateTime), en = ad ? new Date((e.end && e.end.date || e.start.date) + 'T00:00:00') : new Date(e.end && e.end.dateTime || s);
        if (isNaN(s)) continue; L.push({ ad, s, en, c: ci, t: String(e.summary || hgTr('Wydarzenie', 'Event')), loc: String(e.location || '').split(',')[0] }); }
      this._bev = L.sort((a, b) => (a.s - b.s) || (b.ad - a.ad)); if (this.el) this.bd(true); }); },
  bdRow(h, B, tf) { const row = this.el.querySelector('.nb-row'), parts = [];
    for (const k of B.ord) { if (!B.bk[k]) continue; const html = k === 'cal' ? this.bdEv(h, B, tf) : k === 'np' ? this.bdNp(h) : k === 'tmp' ? this.bdTmp(h, B) : k === 'pic' ? 'pic' : ''; if (html) parts.push([k, html]); }
    const key = parts.map((p) => p[0]).join(); if (row.dataset.k !== key) { row.dataset.k = key; row.style.setProperty('--n', parts.length || 1);
      row.innerHTML = parts.map(([k]) => `<section class="nb-card nb-${k}">${k === 'pic' ? '<i></i><i></i>' : ''}</section>`).join(''); this._bdk = Object.fromEntries(Object.entries(this._bdk).filter(([s]) => !s.startsWith('.nb-row'))); this._pf = null; }
    for (const [k, html] of parts) if (k !== 'pic') this._put(`.nb-row .nb-${k}`, html);
    this.bdPic(); },
  bdEv(h, B, tf) { if (this._bev == null) return Object.keys(h.states).some((e) => e.startsWith('calendar.') && !B.calX.includes(e)) ? `<h5 class="nb-hd">${H.esc(hgTr('Najbliższe', 'Coming up'))}</h5>` : '';
    const now = new Date(), d0 = new Date(now); d0.setHours(0, 0, 0, 0); const lim = new Date(d0); lim.setDate(lim.getDate() + 14);
    const E = this._bev.filter((e) => (e.ad ? e.en > d0 : e.en > now) && e.s < lim).slice(0, 5), today = this._bev.filter((e) => e.s < new Date(+d0 + 864e5) && (e.ad ? e.en > d0 : e.en > now)).length;
    const C = [K(122,184,255,1), K(255,159,110,1), K(126,224,168,1), K(213,155,255,1), K(255,211,110,1), K(255,127,168,1)], nx = E.find((e) => !e.ad && e.s > now && e.s < new Date(+d0 + 864e5));
    const day = (s) => { const n = Math.round((new Date(s).setHours(0, 0, 0, 0) - d0) / 864e5); return n <= 0 ? hgTr('Dziś', 'Today') : n === 1 ? hgTr('Jutro', 'Tomorrow') : new Intl.DateTimeFormat(HG_LOC(), { weekday: 'short', day: 'numeric', month: 'short' }).format(s); };
    const rel = (e) => { const m = Math.round((e.s - now) / 60000); return m < 60 ? hgTr(`za ${m} min`, `in ${m} min`) : m < 600 ? hgTr(`za ${Math.floor(m / 60)} h ${m % 60} min`, `in ${Math.floor(m / 60)} h ${m % 60} min`) : ''; };
    const hd = `<h5 class="nb-hd"><span>${H.esc(hgTr('Najbliższe', 'Coming up'))}</span>${today ? `<em>${H.esc(hgTr(`${today} dziś`, `${today} today`))}</em>` : ''}</h5>`;
    if (!E.length) return `${hd}<p class="nb-none">${H.esc(hgTr('Nic w planach na najbliższe dni', 'Nothing planned for the next days'))}</p>`;
    return `${hd}<ul class="nb-ev">${E.map((e) => { const when = e.ad ? day(e.s) + ' · ' + hgTr('cały dzień', 'all day') : e.s <= now ? hgTr('Teraz · do ', 'Now · until ') + tf.format(e.en) : day(e.s) + ' · ' + tf.format(e.s), r = e === nx ? rel(e) : '';
      return `<li style="--c:${C[e.c % C.length]}"><div><b>${H.esc(e.t)}</b><small>${H.esc(when + (e.loc ? ' · ' + e.loc : ''))}</small></div>${r ? `<em>${H.esc(r)}</em>` : ''}</li>`; }).join('')}</ul>`; },
  bdNp(h) { const L = Object.keys(h.states).filter((e) => e.startsWith('media_player.') && hgMpActive(h.states[e]) && (h.states[e].attributes.media_title || h.states[e].attributes.media_channel));
    const id = L.find((e) => h.states[e].state === 'playing') || L[0]; if (!id) return ''; const s = h.states[id], A = s.attributes, pl = s.state === 'playing';
    const sub = [A.media_artist || A.media_series_title || A.app_name, H.name(h, id, id)].filter(Boolean).join(' · '), pic = A.entity_picture ? String(A.entity_picture).replace(/["\\()]/g, '') : '';
    return `${pic ? `<i style="background-image:url(&quot;${H.esc(pic)}&quot;)"></i>` : `<ha-icon class="ph" icon="mdi:music-note"></ha-icon>`}<div><small>${H.icon('mdi:music')}${H.esc(pl ? hgTr('Teraz gra', 'Now playing') : hgTr('Wstrzymane', 'Paused'))}${pl ? '<span class="eq"><u></u><u></u><u></u></span>' : ''}</small><b>${H.esc(A.media_title || A.media_channel)}</b>${sub ? `<span>${H.esc(sub)}</span>` : ''}</div>`; },
  bdTmp(h, B) { if (typeof HGAreas === 'undefined') return ''; let R = []; try { R = HGAreas.model(h).rooms.filter((a) => a.temp && !B.roomX.includes(a.id)); } catch (e) { return ''; }
    const L = R.map((a) => ({ a, v: HGAreas.env(h, a) })).filter((x) => x.v.t != null); if (!L.length) return '';
    const n = Math.max(3, Math.min(8, Math.floor((innerHeight * (innerWidth > innerHeight ? .5 : .32)) / 56)));
    return `<h5 class="nb-hd"><span>${H.esc(hgTr('W domu', 'At home'))}</span></h5><ul class="nb-tl">${L.slice(0, n).map(({ a, v }) => `<li style="--c:${HGWx.tcol(v.t)}"><i>${H.icon(a.icon)}</i><span>${H.esc(a.name)}</span><b>${H.esc(H.fmt(v.t, 1))}°</b>${B.bk.hum ? `<small>${v.u != null ? H.esc(H.fmt(v.u, 0)) + '%' : ''}</small>` : ''}</li>`).join('')}</ul>`; },
  /* zdjęcie: tło dashboardu, pokaz slajdów albo własny adres (jak w klasycznym wygaszaczu), przenikanie co 45 s */
  bdPic() { const p = this.el && this.el.querySelector('.nb-row .nb-pic'); if (!p) return; const im = this.imgs(), u = im[this._pi % im.length];
    if (this._pf === u) return; const I = p.querySelectorAll('i'); if (I.length < 2) return;
    if (this._pf == null) { I[0].style.backgroundImage = u; p.classList.remove('f'); } else { const on = p.classList.contains('f'); I[on ? 0 : 1].style.backgroundImage = u; p.classList.toggle('f', !on); }
    this._pf = u; },
  /* ---- UI ustawień ---- */
  bdHtml(c, h) { const B = this.bget(), seg = (a, list, cur) => `<div class="wl-seg" style="--n:${list.length}">${list.map(([k, pl, en]) => `<button type="button" data-hge="${a}" data-v="${k}" aria-pressed="${cur === k}">${hgTr(pl, en)}</button>`).join('')}</div>`;
    const style = `<div class="wl-f" role="group" aria-labelledby="wl-st"><span id="wl-st">${hgTr('Wygląd wygaszacza', 'Screensaver style')}</span>${seg('wl-style', [['photo', 'Zegar na zdjęciu', 'Clock on photo'], ['board', 'Tablica', 'Board']], B.style)}</div>`;
    if (B.style !== 'board') return { top: style, board: '' };
    const W = Object.keys(h.states).filter((e) => e.startsWith('weather.')), Cs = Object.keys(h.states).filter((e) => e.startsWith('calendar.'));
    let R = []; try { R = HGAreas.model(h).rooms.filter((a) => a.temp); } catch (e) { /* bez pokoi */ }
    const chips = (a, list) => `<div class="wl-chips">${list.map(([k, l, on]) => `<button type="button" data-hge="${a}" data-v="${H.esc(k)}" aria-pressed="${on}">${H.icon('mdi:check')}${H.esc(l)}</button>`).join('')}</div>`;
    const cn = Object.fromEntries(HG_WB_CARDS.map(([k, pl, en, ic]) => [k, [hgTr(pl, en), ic]]));
    const ord = `<div class="wl-ord">${B.ord.map((k, i) => `<div class="${B.bk[k] ? '' : 'off'}">${H.icon(cn[k][1])}<span>${H.esc(cn[k][0])}${B.bk[k] ? '' : `<small> · ${hgTr('ukryte', 'hidden')}</small>`}</span>
      <button type="button" data-hge="wl-up" data-v="${k}" ${i === 0 ? 'disabled' : ''} aria-label="${hgTr('Wyżej', 'Move up')}">${H.icon('mdi:chevron-up')}</button><button type="button" data-hge="wl-dn" data-v="${k}" ${i === B.ord.length - 1 ? 'disabled' : ''} aria-label="${hgTr('Niżej', 'Move down')}">${H.icon('mdi:chevron-down')}</button></div>`).join('')}</div>`;
    const board = `
      <div class="wl-f" role="group" aria-labelledby="wl-bt"><span id="wl-bt">${hgTr('Motyw tablicy', 'Board theme')}</span>${seg('wl-bt', [['auto', 'Auto (słońce)', 'Auto (sun)'], ['light', 'Jasny', 'Light'], ['dark', 'Ciemny', 'Dark']], B.bt)}</div>
      <div class="wl-f" role="group" aria-labelledby="wl-hd"><span id="wl-hd">${hgTr('Nagłówek', 'Heading')}</span>${seg('wl-hd', [['day', 'Dzień tygodnia', 'Weekday'], ['time', 'Godzina', 'Time']], B.hd)}</div>
      <div class="wl-f" role="group" aria-labelledby="wl-bk"><span id="wl-bk">${hgTr('Elementy', 'Elements')}</span>${chips('wl-bk', HG_WB_BK.map(([k, pl, en]) => [k, hgTr(pl, en), B.bk[k]]))}</div>
      <div class="wl-f" role="group" aria-labelledby="wl-or"><span id="wl-or">${hgTr('Kolejność kart', 'Card order')}</span>${ord}</div>
      ${B.bk.wx && W.length > 1 ? `<label class="wl-f"><span>${hgTr('Pogoda', 'Weather')}</span><select class="hs-in" name="wl-wx"><option value="">${hgTr('Automatycznie', 'Automatic')}</option>${W.map((e) => `<option value="${H.esc(e)}"${e === B.wxE ? ' selected' : ''}>${H.esc(H.name(h, e, e))}</option>`).join('')}</select></label>` : ''}
      ${(B.bk.cal || B.bk.cnt) && Cs.length ? `<div class="wl-f" role="group" aria-labelledby="wl-cl"><span id="wl-cl">${hgTr('Kalendarze', 'Calendars')}</span>${chips('wl-cal', Cs.map((e) => [e, H.name(h, e, e), !B.calX.includes(e)]))}</div>` : ''}
      ${B.bk.tmp && R.length ? `<div class="wl-f" role="group" aria-labelledby="wl-rm"><span id="wl-rm">${hgTr('Pokoje na liście temperatur', 'Rooms in the temperature list')}</span>${chips('wl-room', R.map((a) => [a.id, a.name, !B.roomX.includes(a.id)]))}</div>` : ''}`;
    return { top: style, board }; },
  bdAct(p, b, a) { const B = this.bget(), v = b.dataset.v, tog = (L) => (L.includes(v) ? L.filter((x) => x !== v) : [...L, v]);
    if (a === 'wl-style') this.set({ style: v });
    else if (a === 'wl-bt') this.set({ bt: v });
    else if (a === 'wl-hd') this.set({ hd: v });
    else if (a === 'wl-bk') this.set({ bk: Object.assign({}, B.bk, { [v]: !B.bk[v] }) });
    else if (a === 'wl-up' || a === 'wl-dn') { const o = B.ord.slice(), i = o.indexOf(v), j = i + (a === 'wl-up' ? -1 : 1); if (i < 0 || j < 0 || j >= o.length) return; [o[i], o[j]] = [o[j], o[i]]; this.set({ ord: o }); }
    else if (a === 'wl-cal') this.set({ calX: tog(B.calX) });
    else if (a === 'wl-room') this.set({ roomX: tog(B.roomX) });
    else return false;
    this._bevk = ''; if (this.active && this.el && this.el.classList.contains('bd')) this.bd(true);
    p._eLook(); return true; },
});
