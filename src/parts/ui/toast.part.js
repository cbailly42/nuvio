/* ===== ui/toast: stos powiadomień (dół ekranu): zwinięty w talię, rozwija się po najechaniu, przesunięcie w bok zamyka, opcjonalny przycisk akcji (Cofnij).
   API: HGToast.show(tekst, onAction?, etykietaAkcji?) albo hgOverlay.toast(tekst, { onAction, action }). ===== */
const HGToast = window.__hgToast || (window.__hgToast = {
  L: [], el: null,
  box() { if (this.el && this.el.isConnected) return this.el; const el = this.el = document.createElement('section'); el.className = 'hgt'; el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-label', hgTr('Powiadomienia', 'Notifications'));
    const st = document.createElement('style'); st.textContent = `.hgt{ position:fixed; left:50%; bottom:calc(20px + env(safe-area-inset-bottom, 0px)); transform:translateX(-50%); z-index:10020; width:min(380px, calc(100vw - 24px)); height:0; font:500 14px/1.3 'DM Sans', system-ui, sans-serif; }
.hgt .t{ position:absolute; left:0; right:0; bottom:0; box-sizing:border-box; display:flex; align-items:center; gap:10px; min-height:48px; padding:8px 8px 8px 16px; border-radius:var(--hg-radius-in, 16px); background:rgba(30,32,35,.84); color:#F5F6F7; box-shadow:0 12px 32px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.12); -webkit-backdrop-filter:var(--hg-bfo, blur(20px) saturate(180%)); backdrop-filter:var(--hg-bfo, blur(20px) saturate(180%));
  transition:transform var(--hg-t-slow, 320ms) var(--hg-spring, cubic-bezier(.2,.9,.25,1)), opacity var(--hg-t-base, 200ms); transform-origin:bottom center; cursor:pointer; touch-action:pan-y; user-select:none; pointer-events:auto; will-change:transform; }
.hgt .t.in{ opacity:0; transform:translateY(24px) scale(.96); } .hgt .t.out{ opacity:0; transform:translateY(16px) scale(.9) !important; }
.hgt .t::before{ content:''; flex:none; width:8px; height:8px; border-radius:50%; background:var(--hg-accent, #63D71E); } .hgt.lt .t{ background:rgba(255,255,255,.9); color:#1E2023; box-shadow:0 12px 32px rgba(0,0,0,.14), inset 0 0 0 1px rgba(0,0,0,.08); } .hgt .t span{ flex:1; min-width:0; } .hgt .t em{ font-style:normal; font-weight:600; font-size:12px; padding:2px 8px; border-radius:999px; background:color-mix(in srgb, currentColor 12%, transparent); }
.hgt .t button{ all:unset; cursor:pointer; font-weight:700; font-size:13px; height:32px; padding:0 14px; display:inline-flex; align-items:center; border-radius:999px; background:var(--hg-accent, #63D71E); color:var(--hg-on-accent, #0B0F0A); font-weight:600; transition:transform 150ms; } .hgt .t button:active{ transform:scale(.96); } .hgt .t button:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; }
@media (prefers-reduced-motion:reduce){ .hgt .t{ transition:opacity .2s; } }`;
    el.appendChild(st); document.body.appendChild(el);
    el.addEventListener('mouseenter', () => { this.exp = true; this.pause(true); this.lay(); }); el.addEventListener('mouseleave', () => { this.exp = false; this.pause(false); this.lay(); });
    return el; },
  lay() { const v = this.L.filter((x) => !x.gone).slice(-6).reverse(); let y = 0;
    v.forEach((x, i) => { const n = x.n; n.style.zIndex = 100 - i; n.style.pointerEvents = i < 3 ? 'auto' : 'none';
      if (this.exp) { n.style.transform = `translateY(${-y}px)`; n.style.opacity = i < 3 ? 1 : 0; y += n.offsetHeight + 8; }
      else n.style.transform = `translateY(${-i * 10}px) scale(${1 - i * 0.05})`, n.style.opacity = i < 3 ? (i ? 0.9 - i * 0.15 : 1) : 0; }); },
  pause(p) { const now = Date.now(); for (const x of this.L) { if (p) { if (x.tm) { clearTimeout(x.tm); x.tm = 0; x.left = Math.max(800, x.end - now); } } else if (!x.tm && !x.gone) this.arm(x, x.left || 2600); } },
  arm(x, ms) { clearTimeout(x.tm); x.end = Date.now() + ms; x.tm = setTimeout(() => this.drop(x), ms); },
  drop(x) { if (x.gone) return; x.gone = true; clearTimeout(x.tm); x.n.classList.add('out'); setTimeout(() => { x.n.remove(); this.L = this.L.filter((y) => y !== x); this.lay(); }, 320); this.lay(); },
  show(t, undo, ul) { const box = this.box(), ms = undo ? (ul ? 12000 : 6000) : 2600; box.classList.toggle('lt', typeof HGTheme !== 'undefined' && !HGTheme.dark); box.style.bottom = `calc(${this.off || 20}px + env(safe-area-inset-bottom, 0px))`;
    const same = this.L.find((x) => !x.gone && x.t === t && !undo && !x.undo);
    if (same) { same.c++; same.n.querySelector('em') ? (same.n.querySelector('em').textContent = '×' + same.c) : same.n.querySelector('span').insertAdjacentHTML('afterend', `<em>×${same.c}</em>`); this.L = this.L.filter((y) => y !== same).concat(same); this.arm(same, ms); return this.lay(); }
    const n = document.createElement('div'); n.className = 't in'; n.setAttribute('role', 'status'); const sp = document.createElement('span'); sp.textContent = t; n.appendChild(sp);
    const x = { t, n, c: 1, undo: !!undo };
    if (undo) { const u = document.createElement('button'); u.textContent = ul || hgTr('Cofnij', 'Undo'); u.addEventListener('click', (ev) => { ev.stopPropagation(); this.drop(x); undo(); }); n.appendChild(u); }
    let sx = null; n.addEventListener('pointerdown', (e) => { sx = e.clientX; }); n.addEventListener('pointermove', (e) => { if (sx != null && Math.abs(e.clientX - sx) > 6) n.style.translate = (e.clientX - sx) + 'px 0'; });
    n.addEventListener('pointerup', (e) => { const dx = sx == null ? 0 : e.clientX - sx; sx = null; n.style.translate = ''; if (Math.abs(dx) > 60 || (Math.abs(dx) < 6 && !e.target.closest('button') && (this.exp || window.matchMedia('(hover:none)').matches))) this.drop(x); else if (Math.abs(dx) < 6 && !this.exp) { this.exp = true; this.lay(); } });
    box.appendChild(n); this.L.push(x); requestAnimationFrame(() => { n.classList.remove('in'); this.lay(); }); if (this.L.filter((y) => !y.gone).length > 6) this.drop(this.L.find((y) => !y.gone));
    if (!this.exp) this.arm(x, ms); else x.left = ms; },
});
