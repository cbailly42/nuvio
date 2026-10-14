/* ===== ui/overlay: jeden menedżer nakładek nad pulpitem: tooltip, popover, menu, sheet, dialog, alert dialog, toast.
   Pilnuje kolejności (stos), fokusu (pułapka w oknach modalnych, powrót do przycisku po zamknięciu), klawisza Escape i animacji
   wejścia/wyjścia z tokenów ruchu. Jedna warstwa rozmycia pod nakładką (scrim), sama nakładka bez rozmycia na rozmyciu.
   prefers-reduced-motion: zamiast ruchu krótki fade. ===== */
const hgOverlay = window.__hgOverlay || (() => {
  const CSS = `
:host{ all:initial; position:fixed; inset:0; z-index:10010; pointer-events:none; font-family:'HG DM Sans','DM Sans',-apple-system,system-ui,'Segoe UI',Roboto,sans-serif; -webkit-font-smoothing:antialiased; color:var(--hg-chrome-fg, #1C1C1E); }
*{ box-sizing:border-box; }
button{ font:inherit; color:inherit; background:none; border:0; padding:0; margin:0; cursor:pointer; -webkit-tap-highlight-color:transparent; }
ha-icon{ display:inline-flex; --mdc-icon-size:100%; }
.scrim{ position:fixed; inset:0; pointer-events:auto; background:rgba(8,10,14,.32); -webkit-backdrop-filter:blur(calc(10px * var(--hg-bf, 1))); backdrop-filter:blur(calc(10px * var(--hg-bf, 1)));
  animation: nvScrim var(--hg-t-base, 200ms) var(--hg-ease-out, ease-out) both; }
.scrim.out{ animation: nvScrim var(--hg-t-base, 200ms) var(--hg-ease-in, ease-in) reverse both; }
.glass{ pointer-events:auto; background: var(--hg-glass-sheen, none), var(--hg-panel-flat, rgba(236,238,242,.9)); box-shadow: var(--hg-edge, 0 0 0 transparent), var(--hg-shadow-float, 0 8px 24px rgba(0,0,0,.2));
  -webkit-backdrop-filter: blur(calc(24px * var(--hg-bf, 1))) saturate(140%); backdrop-filter: blur(calc(24px * var(--hg-bf, 1))) saturate(140%); }
/* dialog i alert dialog: środek ekranu, skala 0.94 -> 1 */
.dlg{ position:fixed; left:50%; top:50%; width:min(var(--w, 400px), calc(100vw - 32px)); max-height:calc(100dvh - 48px); overflow:auto; transform:translate(-50%, -50%);
  border-radius:var(--hg-radius, 24px); padding:24px; display:flex; flex-direction:column; gap:14px; animation: nvPop var(--hg-t-slow, 320ms) var(--hg-ease-out, ease-out) both; }
.dlg.out{ animation: nvPopOut var(--hg-t-base, 200ms) var(--hg-ease-in, ease-in) both; }
.dlg h2{ margin:0; font-size:var(--hg-fs-4, 18px); font-weight:600; letter-spacing:-.01em; } .dlg .tx{ margin:0; font-size:var(--hg-fs-2, 13px); opacity:.75; line-height:1.45; }
.dlg.bare{ padding:0; gap:0; overflow:hidden; }
.acts{ display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap; margin-top:4px; }
.btn{ height:44px; padding:0 20px; border-radius:999px; font-size:var(--hg-fs-2, 13px); font-weight:600; background:var(--hg-inner-bg, rgba(0,0,0,.06)); box-shadow:var(--hg-inner-hi, none);
  transition: transform var(--hg-t-fast, 120ms) var(--hg-ease-out, ease-out), background var(--hg-t-base, 200ms); }
.btn:active{ transform:scale(.96); } .btn:focus-visible, .x:focus-visible, .mi:focus-visible{ outline:2px solid var(--hg-accent, #63D71E); outline-offset:2px; }
.btn.primary{ background:var(--hg-accent, #63D71E); color:var(--hg-on-accent, #0B0F0A); box-shadow:0 0 14px var(--hg-accent-glow, transparent); }
.btn.danger{ background:#E5484D; color:#fff; }
.x{ position:absolute; top:14px; right:14px; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:var(--hg-inner-bg, rgba(0,0,0,.06)); }
.x ha-icon{ width:18px; height:18px; }
/* sheet: od dołu na telefonie, z prawej na szerokim ekranie; przeciągnięcie w dół zamyka */
.sheet{ position:fixed; display:flex; flex-direction:column; overflow:hidden; }
.sheet .hd{ display:flex; align-items:center; gap:10px; padding:18px 20px 10px; min-height:60px; } .sheet .hd h2{ margin:0; flex:1; font-size:var(--hg-fs-4, 18px); font-weight:600; }
.sheet .hd .x{ position:static; }
.sheet .bd{ flex:1; overflow:auto; padding:6px 20px 20px; overscroll-behavior:contain; }
.sheet.side{ top:12px; right:12px; bottom:12px; width:min(420px, calc(100vw - 24px)); border-radius:var(--hg-radius, 24px); animation: nvSide var(--hg-t-slow, 320ms) var(--hg-spring, ease-out) both; }
.sheet.side.out{ animation: nvSideOut var(--hg-t-base, 200ms) var(--hg-ease-in, ease-in) both; }
.sheet.bottom{ left:0; right:0; bottom:0; max-height:88dvh; border-radius:var(--hg-radius, 24px) var(--hg-radius, 24px) 0 0; padding-bottom:env(safe-area-inset-bottom, 0px); animation: nvUp var(--hg-t-slow, 320ms) var(--hg-spring, ease-out) both; touch-action:pan-x; }
.sheet.bottom.out{ animation: nvDown var(--hg-t-base, 200ms) var(--hg-ease-in, ease-in) both; }
.sheet.bottom::before{ content:''; display:block; width:40px; height:5px; border-radius:3px; margin:8px auto 0; background:currentColor; opacity:.25; }
/* popover i menu: przy przycisku, skala od strony przycisku */
.pop{ position:fixed; min-width:180px; max-width:min(340px, calc(100vw - 16px)); max-height:min(420px, calc(100dvh - 16px)); overflow:auto; border-radius:var(--hg-radius-in, 16px); padding:8px;
  transform-origin: var(--ox, 50%) var(--oy, 0%); animation: nvPopS var(--hg-t-base, 200ms) var(--hg-ease-out, ease-out) both; }
.pop.out{ animation: nvPopSOut var(--hg-t-fast, 120ms) var(--hg-ease-in, ease-in) both; }
.mi{ display:flex; align-items:center; gap:10px; width:100%; min-height:44px; padding:0 12px; border-radius:12px; font-size:var(--hg-fs-2, 13px); text-align:left;
  animation: nvIn var(--hg-t-base, 200ms) var(--hg-ease-out, ease-out) both; animation-delay: calc(var(--i, 0) * 20ms); }
.mi ha-icon{ width:18px; height:18px; opacity:.8; } .mi.danger{ color:#E5484D; } .mi[aria-checked=true]::after{ content:'✓'; margin-left:auto; color:var(--hg-accent-tx, inherit); }
@media (hover:hover){ .mi:hover{ background:var(--hg-inner-bg-h, rgba(0,0,0,.06)); } }
.sep{ height:1px; margin:6px 8px; background:currentColor; opacity:.1; }
/* tooltip: biała pigułka jak dymek wartości w projekcie */
.tip{ position:fixed; pointer-events:none; max-width:260px; padding:6px 10px; border-radius:10px; background:#fff; color:#111; font-size:12px; font-weight:500; line-height:1.3;
  box-shadow:0 6px 18px rgba(0,0,0,.22); animation: nvTip var(--hg-t-fast, 120ms) var(--hg-ease-out, ease-out) both; }
@keyframes nvFade{ from{ opacity:0; } }
/* rozmycie od pierwszej klatki (bez błysku ostrego tła), animuje się tylko przyciemnienie */
@keyframes nvScrim{ from{ background:transparent; } }
@keyframes nvPop{ from{ opacity:0; transform:translate(-50%, -50%) scale(.94); } }
@keyframes nvPopOut{ to{ opacity:0; transform:translate(-50%, -50%) scale(.96); } }
@keyframes nvSide{ from{ opacity:.4; transform:translateX(105%); } }
@keyframes nvSideOut{ to{ opacity:.4; transform:translateX(105%); } }
@keyframes nvUp{ from{ transform:translateY(100%); } }
@keyframes nvDown{ to{ transform:translateY(100%); } }
@keyframes nvPopS{ from{ opacity:0; transform:scale(.96); } }
@keyframes nvPopSOut{ to{ opacity:0; transform:scale(.97); } }
@keyframes nvIn{ from{ opacity:0; transform:translateY(4px); } }
@keyframes nvTip{ from{ opacity:0; transform:translateY(4px); } }
@media (prefers-reduced-motion: reduce){ .dlg, .dlg.out, .sheet, .sheet.out, .pop, .pop.out, .mi, .tip{ animation-name: nvFade !important; } .dlg.out, .sheet.out, .pop.out{ animation-direction: reverse !important; } }`;
  let host = null, root = null; const stack = [];
  const R = () => {
    if (host && host.isConnected) return root;
    host = document.createElement('div'); host.id = 'hg-overlay'; root = host.attachShadow({ mode: 'open' });
    const st = document.createElement('style'); st.textContent = CSS; root.appendChild(st); document.body.appendChild(host);
    return root;
  };
  const esc = (s) => H.esc(s);
  const deep = () => { let a = document.activeElement; while (a && a.shadowRoot && a.shadowRoot.activeElement) a = a.shadowRoot.activeElement; return a; };
  const focusables = (el) => [...el.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])')];
  const leave = (el, done) => { if (!el) return done && done(); el.classList.add('out'); let fin = false; const f = () => { if (fin) return; fin = true; el.remove(); done && done(); };
    el.addEventListener('animationend', f, { once: true }); setTimeout(f, 400); };
  /* wspólne otwarcie: el (+ scrim dla modalnych), Escape, pułapka fokusu, powrót fokusu */
  const open = (el, o = {}) => {
    const r = R(), back = deep(); let scrim = null;
    if (o.modal) { scrim = document.createElement('div'); scrim.className = 'scrim'; r.appendChild(scrim);
      scrim.addEventListener('click', () => { if (o.dismiss !== false) close(undefined); }); }
    r.appendChild(el);
    const item = { el, scrim, modal: !!o.modal, close: null, dismiss: o.dismiss !== false };
    const close = (v) => { const i = stack.indexOf(item); if (i < 0) return; stack.splice(i, 1);
      leave(el); if (scrim) leave(scrim); if (back && back.focus && back.isConnected) try { back.focus({ preventScroll: true }); } catch (e) { /* */ }
      o.onClose && o.onClose(v); };
    item.close = close; stack.push(item);
    if (o.modal) el.addEventListener('keydown', (e) => { if (e.key !== 'Tab') return; const f = focusables(el); if (!f.length) return;
      const a = el.getRootNode().activeElement; if (e.shiftKey && a === f[0]) { e.preventDefault(); f.at(-1).focus(); } else if (!e.shiftKey && a === f.at(-1)) { e.preventDefault(); f[0].focus(); } });
    requestAnimationFrame(() => { const f = el.querySelector('[autofocus]') || focusables(el)[0]; if (f && o.focus !== false) f.focus({ preventScroll: true }); });
    return item;
  };
  document.addEventListener('keydown', (e) => { if (e.key !== 'Escape' || !stack.length) return; const top = stack.at(-1); if (!top.dismiss) return; e.stopPropagation(); top.close(undefined); }, true);
  /* pozycja przy elemencie (także w shadow DOM): pod spodem, a gdy brak miejsca nad; w poziomie w granicach ekranu */
  const place = (el, anchor, gap = 8) => {
    const a = anchor.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, vw = innerWidth, vh = innerHeight;
    let top = a.bottom + gap, oy = '0%'; if (top + h > vh - 8 && a.top - gap - h > 8) { top = a.top - gap - h; oy = '100%'; }
    let left = Math.min(Math.max(8, a.left + a.width / 2 - w / 2), vw - w - 8); if (w > a.width * 1.6) left = Math.min(Math.max(8, a.right - w), vw - w - 8);
    el.style.top = Math.max(8, top) + 'px'; el.style.left = left + 'px';
    el.style.setProperty('--ox', (a.left + a.width / 2 - left) + 'px'); el.style.setProperty('--oy', oy);
  };
  const api = {
    /* dialog({ title, text, html, actions: [{ label, value, kind: 'primary'|'danger' }], dismiss, width, collect, bare, mount }) -> Promise(value)
       bare: bez paddingu i przycisku X (treść ma własny nagłówek); mount(el, close): wstawienie własnego elementu (np. z shadow root karty)
       collect: true -> Promise({ value, data: { name: wartość pól } }) dla pól z atrybutem name w html */
    dialog(o = {}) { return new Promise((res) => {
      const el = document.createElement('div'); el.className = 'glass dlg'; el.setAttribute('role', o.alert ? 'alertdialog' : 'dialog'); el.setAttribute('aria-modal', 'true');
      if (o.width) el.style.setProperty('--w', o.width + 'px'); if (o.bare) el.classList.add('bare');
      const id = 'd' + Math.random().toString(36).slice(2, 7); el.setAttribute('aria-labelledby', id + 't');
      el.innerHTML = `${o.alert || o.bare ? '' : `<button class="x" data-v="__x" aria-label="${esc(hgTr('Zamknij', 'Close'))}"><ha-icon icon="mdi:close"></ha-icon></button>`}${o.title ? `<h2 id="${id}t">${esc(o.title)}</h2>` : ''}${o.text ? `<p class="tx">${esc(o.text)}</p>` : ''}${o.html || ''}
        ${(o.actions || []).length ? `<div class="acts">${o.actions.map((a, i) => `<button class="btn ${a.kind || ''}" data-i="${i}"${a.focus ? ' autofocus' : ''}>${esc(a.label)}</button>`).join('')}</div>` : ''}`;
      let it = null;
      el.addEventListener('click', (e) => { const b = e.composedPath().find((n) => n.dataset && (n.dataset.i != null || n.dataset.v)); if (!b) return;
        const v = b.dataset.v === '__x' ? undefined : o.actions[+b.dataset.i].value;
        it.close(o.collect ? { value: v, data: Object.fromEntries([...el.querySelectorAll('input[name], select[name], textarea[name]')].map((f) => [f.name, f.value])) } : v); });
      /* Enter w polu tekstowym = główny przycisk */
      el.addEventListener('keydown', (e) => { if (e.key !== 'Enter' || !e.composedPath()[0].matches || !e.composedPath()[0].matches('input')) return; const p = el.querySelector('.btn.primary, .btn.danger'); if (p) { e.preventDefault(); p.click(); } });
      it = open(el, { modal: true, focus: !o.mount, dismiss: o.dismiss !== false && !o.alert, onClose: (v) => res(v) });
      if (o.mount) o.mount(el, (v) => it.close(v));
    }); },
    /* alert dialog: potwierdzenie; fokus na bezpiecznym przycisku, bez zamykania kliknięciem obok */
    alert(title, text, ok = hgTr('Potwierdź', 'Confirm'), danger = true, info = false) {
      return api.dialog({ alert: true, title, text, width: 380, actions: [...(info ? [] : [{ label: hgTr('Anuluj', 'Cancel'), value: false, focus: true }]), { label: ok, value: true, kind: danger ? 'danger' : 'primary', focus: info }] })
        .then((v) => v === true);
    },
    /* sheet({ title, html, side: 'auto'|'bottom'|'side' }) -> { el, body, close } ; przeciągnięcie w dół zamyka dolny */
    sheet(o = {}) {
      const side = o.side && o.side !== 'auto' ? o.side : (innerWidth < 700 ? 'bottom' : 'side');
      const el = document.createElement('div'); el.className = 'glass sheet ' + side; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', o.title || '');
      el.innerHTML = `<div class="hd"><h2>${esc(o.title || '')}</h2><button class="x" aria-label="${esc(hgTr('Zamknij', 'Close'))}"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="bd">${o.html || ''}</div>`;
      const it = open(el, { modal: true, onClose: o.onClose });
      el.querySelector('.x').addEventListener('click', () => it.close());
      if (side === 'bottom') { let y0 = null, dy = 0;
        el.addEventListener('pointerdown', (e) => { if (e.target.closest && e.target.closest('.bd') && el.querySelector('.bd').scrollTop > 0) return; y0 = e.clientY; dy = 0; el.style.transition = 'none'; });
        el.addEventListener('pointermove', (e) => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); el.style.transform = `translateY(${dy}px)`; });
        const up = () => { if (y0 == null) return; y0 = null; el.style.transition = 'transform var(--hg-t-base) var(--hg-ease-out)'; if (dy > 90) it.close(); else el.style.transform = ''; };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); }
      return { el, body: el.querySelector('.bd'), close: (v) => it.close(v) };
    },
    /* popover(anchor, html) -> { el, close } ; zamyka klik poza nim i Escape */
    popover(anchor, html, o = {}) {
      const el = document.createElement('div'); el.className = 'glass pop'; el.setAttribute('role', o.role || 'dialog'); el.innerHTML = html;
      const it = open(el, { onClose: o.onClose, focus: o.focus }); place(el, anchor);
      const away = (e) => { if (!e.composedPath().includes(el) && !e.composedPath().includes(anchor)) { it.close(); } };
      setTimeout(() => document.addEventListener('pointerdown', away, true), 0);
      const ro = () => place(el, anchor); addEventListener('resize', ro);
      const c0 = it.close; it.close = (v) => { document.removeEventListener('pointerdown', away, true); removeEventListener('resize', ro); c0(v); };
      return { el, close: (v) => it.close(v) };
    },
    /* menu(anchor, [{ label, icon, value, danger, checked } | '-']) -> Promise(value) ; strzałki, Enter, Escape */
    menu(anchor, items, o = {}) { return new Promise((res) => {
      const html = items.map((m, i) => m === '-' ? '<div class="sep" role="separator"></div>' : `<button class="mi ${m.danger ? 'danger' : ''}" role="${m.checked != null ? 'menuitemradio' : 'menuitem'}"${m.checked != null ? ` aria-checked="${!!m.checked}"` : ''} data-i="${i}" style="--i:${i}">${m.icon ? `<ha-icon icon="${esc(m.icon)}"></ha-icon>` : ''}<span>${esc(m.label)}</span></button>`).join('');
      let val; const p = api.popover(anchor, html, { role: 'menu', onClose: () => res(val) });
      p.el.addEventListener('click', (e) => { const b = e.composedPath().find((n) => n.dataset && n.dataset.i != null); if (!b) return; val = items[+b.dataset.i].value; p.close(); });
      p.el.addEventListener('keydown', (e) => { const f = [...p.el.querySelectorAll('.mi')], a = f.indexOf(p.el.getRootNode().activeElement);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); f.at((a + (e.key === 'ArrowDown' ? 1 : -1) + f.length) % f.length).focus(); } });
    }); },
    /* toast(text, { action, onAction }) – stos powiadomień HGToast (ui/toast) */
    toast(text, o = {}) { return HGToast.show(text, o.onAction, o.action); },
    /* tooltip(anchor, text) – zwykle automatycznie z atrybutu title (niżej) */
    tip(anchor, text) { api.untip(); const el = document.createElement('div'); el.className = 'tip'; el.setAttribute('role', 'tooltip'); el.textContent = text; R().appendChild(el); place(el, anchor, 6);
      if (parseFloat(el.style.top) < anchor.getBoundingClientRect().top) el.style.top = (anchor.getBoundingClientRect().top - el.offsetHeight - 6) + 'px'; api._tip = el; },
    untip() { if (api._tip) { api._tip.remove(); api._tip = null; } },
    get open() { return stack.length > 0; },
    closeAll() { while (stack.length) stack.at(-1).close(undefined); },
  };
  /* podpowiedzi: atrybut title w elementach Nuvio zamienia się w szklany tooltip (natywny title na dotyku nie działa,
     a na komputerze pojawia się z opóźnieniem i w stylu systemu). Tylko w komponentach hg-/nuvio-, nie w HA. */
  let tt = 0, cur = null;
  const ours = (path) => path.some((n) => n.tagName && (/^(HG|NUVIO)-/.test(n.tagName) || /^(hg|nuvio)-/.test(n.id || '')));
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return; const path = e.composedPath(); if (!ours(path)) return;
    const t = path.find((n) => n.getAttribute && (n.hasAttribute('title') || n.hasAttribute('data-nv-tip')));
    if (!t || t === cur) return; cur = t;
    if (t.hasAttribute('title')) { const v = t.getAttribute('title'); t.removeAttribute('title'); if (v) { t.setAttribute('data-nv-tip', v); if (!t.hasAttribute('aria-label') && !t.textContent.trim()) t.setAttribute('aria-label', v); } }
    clearTimeout(tt); api.untip(); const v = t.getAttribute('data-nv-tip'); if (!v || t.textContent.trim() === v.trim()) return;
    tt = setTimeout(() => { if (cur === t && t.isConnected) api.tip(t, v); }, 400);
  }, true);
  document.addEventListener('pointerout', (e) => { if (!cur) return; const to = e.relatedTarget; if (to && (to === cur || (cur.contains && cur.contains(to)))) return; clearTimeout(tt); cur = null; api.untip(); }, true);
  ['pointerdown', 'scroll', 'wheel'].forEach((ev) => document.addEventListener(ev, () => { clearTimeout(tt); cur = null; api.untip(); }, { capture: true, passive: true }));
  document.addEventListener('focusin', (e) => { const t = e.composedPath()[0]; if (!t || !t.getAttribute || !ours(e.composedPath())) return; const v = t.getAttribute('data-nv-tip') || t.getAttribute('title'); if (v && t.matches(':focus-visible')) api.tip(t, v); }, true);
  document.addEventListener('focusout', () => api.untip(), true);
  window.__hgOverlay = api;
  return api;
})();
