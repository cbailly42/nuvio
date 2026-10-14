/* ===== hg-select: jeden szklany select dla całego Nuvio =====
   Progresywne ulepszenie: natywny <select> zostaje w DOM jako źródło prawdy (value, 'change', formularze),
   a obok niego rysujemy szklany przycisk i listę (ARIA listbox). Wystarczy hgSelWatch(shadowRoot). */
const HGS_CSS = `
.hgs-n{ position:absolute !important; width:1px !important; height:1px !important; opacity:0 !important; pointer-events:none !important; overflow:hidden !important; clip-path:inset(50%) !important; }
.hgs-t{ all:unset; box-sizing:border-box; display:flex; align-items:center; gap:8px; width:100%; min-height:40px; padding:0 10px 0 12px; border-radius:12px; cursor:pointer;
  font:inherit; font-size:14px; color:inherit; background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.16); box-shadow:inset 0 1px 0 rgba(255,255,255,.08);
  transition:border-color .15s ease, background .15s ease, box-shadow .15s ease; -webkit-tap-highlight-color:transparent; }
.hgs-t:hover{ background:rgba(255,255,255,.12); border-color:rgba(255,255,255,.26); }
.hgs-t:focus-visible, .hgs-t[aria-expanded=true]{ border-color:var(--hg-accent, #a3e635); box-shadow:0 0 0 3px color-mix(in srgb, var(--hg-accent, #a3e635) 28%, transparent); }
.hgs-t[disabled]{ opacity:.5; cursor:default; }
.hgs-v{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:left; }
.hgs-c{ flex:none; width:18px; height:18px; opacity:.7; transition:transform .22s cubic-bezier(.2,.8,.2,1); }
.hgs-t[aria-expanded=true] .hgs-c{ transform:rotate(180deg); }
.hgs-l{ position:fixed; z-index:2147483000; box-sizing:border-box; margin:0; padding:6px; list-style:none; overflow:auto; overscroll-behavior:contain; border-radius:16px; color:#fff;
  background:rgba(28,32,38,.62); -webkit-backdrop-filter:blur(22px) saturate(160%); backdrop-filter:blur(22px) saturate(160%);
  border:1px solid rgba(255,255,255,.16); box-shadow:0 18px 48px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.10);
  font-size:14px; clip-path:inset(0 0 100% 0 round 16px); transform:translateY(-6px) scale(.98); transform-origin:top center;
  transition:clip-path .24s cubic-bezier(.2,.8,.2,1), transform .24s cubic-bezier(.2,.8,.2,1); }
.hgs-l.up{ clip-path:inset(100% 0 0 0 round 16px); transform:translateY(6px) scale(.98); transform-origin:bottom center; }
.hgs-l.in{ clip-path:inset(0 0 0 0 round 16px); transform:none; }
.hgs-o{ display:flex; align-items:center; gap:10px; min-height:40px; padding:0 10px 0 12px; border-radius:10px; cursor:pointer; user-select:none; opacity:0; transform:translateY(-3px);
  transition:background .12s ease, opacity .2s ease, transform .2s ease; }
.hgs-l.in .hgs-o{ opacity:1; transform:none; }
.hgs-o > span{ flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hgs-o.on{ background:rgba(255,255,255,.12); }
.hgs-o[aria-selected=true]{ color:var(--hg-accent, #a3e635); font-weight:600; }
.hgs-o svg{ flex:none; width:18px; height:18px; opacity:0; transform:scale(.6); transition:opacity .15s ease, transform .2s cubic-bezier(.2,.8,.2,1); }
.hgs-o[aria-selected=true] svg{ opacity:1; transform:none; }
.hgs-o[aria-disabled=true]{ opacity:.4 !important; cursor:default; }
@media (pointer:coarse){ .hgs-t{ min-height:44px; font-size:16px; } .hgs-o{ min-height:46px; font-size:16px; } }
@media (prefers-reduced-motion:reduce){ .hgs-l, .hgs-o, .hgs-c, .hgs-o svg{ transition:none !important; } }
@media (prefers-color-scheme:light){ :host(:not([dark])) .hgs-l.lt{ background:rgba(255,255,255,.72); color:#1F2125; border-color:rgba(0,0,0,.08); } }
`;
const HGS_CHEV = '<svg class="hgs-c" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.41 8.58 12 13.17l4.59-4.59L18 10l-6 6-6-6z"/></svg>';
const HGS_TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
let hgsN = 0; const hgsOpen = new Set();   /* inne handlery Escape (arkusz, menu) ustępują, dopóki lista jest otwarta */   /* otwarte listy: zamykane, gdy ich przycisk zniknie z DOM (przerysowanie arkusza) */
const hgsEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function hgSelUp(sel) {
  if (sel.dataset.hgs || sel.multiple || sel.size > 1) return;
  const root = sel.getRootNode(); if (!root || !root.appendChild) return;
  if (!root.querySelector('style[data-hgs]')) { const st = document.createElement('style'); st.dataset.hgs = '1'; st.textContent = HGS_CSS; (root.head || root).appendChild(st); }
  const id = 'hgs' + (++hgsN); sel.dataset.hgs = id; sel.classList.add('hgs-n'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
  const t = document.createElement('button'); t.type = 'button'; t.className = 'hgs-t'; t.setAttribute('aria-haspopup', 'listbox'); t.setAttribute('aria-expanded', 'false');
  const lab = sel.getAttribute('aria-label') || (sel.closest('label') && (sel.closest('label').querySelector('span') || {}).textContent) || '';
  if (lab) t.setAttribute('aria-label', lab.trim());
  sel.after(t);
  let L = null, act = -1, ta = '', taT = 0;
  const opts = () => [...sel.options];
  const paint = () => { const o = sel.options[sel.selectedIndex]; t.innerHTML = `<span class="hgs-v">${hgsEsc(o ? o.text : '')}</span>${HGS_CHEV}`; t.disabled = sel.disabled; };
  const mark = (i) => { act = i; if (!L) return; L.querySelectorAll('.hgs-o').forEach((n, k) => n.classList.toggle('on', k === i)); const n = L.children[i]; if (n) { L.setAttribute('aria-activedescendant', n.id); n.scrollIntoView({ block: 'nearest' }); } };
  const pick = (i) => { const o = sel.options[i]; if (!o || o.disabled) return; if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true, composed: true })); sel.dispatchEvent(new Event('change', { bubbles: true, composed: true })); } paint(); close(true); };
  const place = () => { if (!L) return; const r = t.getBoundingClientRect(), vh = innerHeight, vw = innerWidth, gap = 6;
    const want = Math.min(L.scrollHeight, 320), below = vh - r.bottom - gap - 8, above = r.top - gap - 8, up = below < Math.min(want, 200) && above > below;
    const w = Math.max(r.width, Math.min(220, vw - 16)); L.style.width = w + 'px'; L.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
    L.style.maxHeight = Math.max(120, Math.min(320, up ? above : below)) + 'px';
    if (up) { L.style.top = ''; L.style.bottom = (vh - r.top + gap) + 'px'; } else { L.style.bottom = ''; L.style.top = (r.bottom + gap) + 'px'; }
    L.classList.toggle('up', up);
    /* przodek z backdrop-filter/transform (np. okno Assist) staje się blokiem zawierającym dla position:fixed: przesuń listę o różnicę, żeby stała przy przycisku */
    const lx = parseFloat(L.style.left), b = L.getBoundingClientRect(), dx = b.left - lx;
    if (Math.abs(dx) > 0.5) L.style.left = (lx - dx) + 'px';
    if (up) { const dy = b.bottom - (r.top - gap); if (Math.abs(dy) > 0.5) L.style.bottom = (parseFloat(L.style.bottom) + dy) + 'px'; }
    else { const dy = b.top - (r.bottom + gap); if (Math.abs(dy) > 0.5) L.style.top = (parseFloat(L.style.top) - dy) + 'px'; } };
  const out = (e) => { if (!L) return; const p = e.composedPath(); if (!p.includes(L) && !p.includes(t)) close(false); };
  const rep = () => place();
  const gone = () => { if (!t.isConnected) close(false); };
  function open() { if (L || sel.disabled) return; L = document.createElement('ul'); L.className = 'hgs-l'; L.id = id + 'l'; L.setAttribute('role', 'listbox'); L.tabIndex = -1;
    if (lab) L.setAttribute('aria-label', lab.trim());
    L.innerHTML = opts().map((o, i) => `<li class="hgs-o" role="option" id="${id}o${i}" aria-selected="${i === sel.selectedIndex}"${o.disabled ? ' aria-disabled="true"' : ''} style="transition-delay:${Math.min(i, 8) * 18}ms">${HGS_TICK}<span>${hgsEsc(o.text)}</span></li>`).join('');
    root.appendChild(L); hgsOpen.add(gone); if (t.getRootNode().activeElement !== t) t.focus({ preventScroll: true }); t.setAttribute('aria-expanded', 'true'); t.setAttribute('aria-controls', L.id); place(); mark(Math.max(0, sel.selectedIndex));
    L.addEventListener('pointerdown', (e) => e.preventDefault());   // fokus zostaje na przycisku
    L.addEventListener('click', (e) => { const li = e.target.closest('.hgs-o'); if (li) pick([...L.children].indexOf(li)); });
    L.addEventListener('pointermove', (e) => { const li = e.target.closest('.hgs-o'); if (li) { const i = [...L.children].indexOf(li); if (i !== act) mark(i); } });
    requestAnimationFrame(() => L && L.classList.add('in'));
    document.addEventListener('pointerdown', out, true); addEventListener('resize', rep); addEventListener('scroll', rep, true); }
  function close(focus) { if (!L) return; const l = L; L = null; hgsOpen.delete(gone); t.setAttribute('aria-expanded', 'false'); t.removeAttribute('aria-controls');
    l.classList.remove('in'); l.style.pointerEvents = 'none'; setTimeout(() => l.remove(), 240);
    document.removeEventListener('pointerdown', out, true); removeEventListener('resize', rep); removeEventListener('scroll', rep, true); if (focus && t.isConnected) t.focus(); }
  const step = (d) => { const o = opts(); let i = act; for (let k = 0; k < o.length; k++) { i = (i + d + o.length) % o.length; if (!o[i].disabled) break; } mark(i); };
  t.addEventListener('click', () => (L ? close(true) : open()));
  t.addEventListener('keydown', (e) => { const k = e.key;
    if (!L && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); open(); return; }
    if (!L) { if (k.length === 1) { e.preventDefault(); open(); } else return; }
    if (k === 'ArrowDown') { e.preventDefault(); step(1); } else if (k === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (k === 'Home') { e.preventDefault(); mark(0); } else if (k === 'End') { e.preventDefault(); mark(sel.options.length - 1); }
    else if (k === 'Enter' || k === ' ') { if (k === ' ' && ta) { ta += ' '; e.preventDefault(); return; } e.preventDefault(); pick(act); }
    else if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (k === 'Tab') close(false);
    if (k.length === 1 && k !== ' ' || (k === ' ' && ta)) { clearTimeout(taT); ta += k.toLowerCase(); taT = setTimeout(() => { ta = ''; }, 600);
      const o = opts(), n = o.length; for (let s = 0; s < n; s++) { const i = (act + (ta.length === 1 ? 1 : 0) + s) % n; if (o[i].text.toLowerCase().startsWith(ta)) { mark(i); break; } } } });
  sel.addEventListener('change', paint);
  new MutationObserver(paint).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  paint();
}
function hgSelWatch(root) {
  if (!root || root.__hgs) return; root.__hgs = 1;
  const scan = () => root.querySelectorAll('select:not([data-hgs])').forEach(hgSelUp);
  new MutationObserver((m) => { hgsOpen.forEach((f) => f()); if (m.some((r) => r.addedNodes.length)) scan(); }).observe(root, { childList: true, subtree: true }); scan();
}
window.hgSelWatch = hgSelWatch;
