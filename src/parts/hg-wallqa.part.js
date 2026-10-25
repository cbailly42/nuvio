/* Szybkie przyciski na wygaszaczu (#49): do 3 szklanych przycisków (encja + akcja) na wspólnej warstwie .nw-qa, we wszystkich stylach.
   Dotyk wykonuje akcję bez wybudzenia (HGWall.wk → qaTap). Konfiguracja: HGL.data.wall.qa = [{ e, a, ic, n, hold }], walidacja w norm().
   Usługa HA powstaje wyłącznie z tabeli DOM; kod alarmu jest wpisywany przy każdej akcji, idzie do HA jako code i nigdzie nie jest zapisywany. */
const HG_QA_CSS = `
.nw-qa{ position:absolute; z-index:8; right:calc(clamp(20px, 4vmin, 48px) + env(safe-area-inset-right, 0px)); bottom:calc(clamp(20px, 4vmin, 48px) + env(safe-area-inset-bottom, 0px)); display:flex; gap:clamp(12px, 2vmin, 20px); }
.nw.lk .nw-qa, .nw.pin .nw-qa{ display:none; }
.nw-qb{ all:unset; box-sizing:border-box; position:relative; cursor:pointer; width:clamp(52px, 8.5vmin, 72px); height:clamp(52px, 8.5vmin, 72px); border-radius:50%; display:flex; align-items:center; justify-content:center; color:${K(255, 255, 255, 1)}; background:${K(255, 255, 255, .14)}; box-shadow:inset 0 0 0 1px ${K(255, 255, 255, .26)}, 0 6px 22px ${K(0, 0, 0, .28)}; -webkit-backdrop-filter:var(--hg-bfo, blur(18px) saturate(1.4)); backdrop-filter:var(--hg-bfo, blur(18px) saturate(1.4)); transition:transform .15s ease, background .2s ease; -webkit-tap-highlight-color:transparent; touch-action:none; }
.nw-qb ha-icon{ --mdc-icon-size:clamp(24px, 3.8vmin, 32px); width:clamp(24px, 3.8vmin, 32px); height:clamp(24px, 3.8vmin, 32px); }
.nw-qb[data-on="1"]{ background:${K(255, 255, 255, .3)}; }
.nw-qb:active, .nw-qb.hd{ transform:scale(.9); }
.nw-qb:focus-visible{ outline:2px solid ${K(255, 255, 255, .9)}; outline-offset:3px; }
.nw-qb[data-st="busy"]{ opacity:.7; }
.nw-qb[data-st="ok"]{ background:${K(190, 255, 170, .45)}; }
.nw-qb[data-st="err"]{ background:${K(255, 170, 160, .45)}; }
.nw-qr{ position:absolute; inset:-4px; border-radius:50%; box-shadow:0 0 0 3px ${K(255, 255, 255, .9)}; opacity:0; pointer-events:none; }
.nw-qb.hd .nw-qr{ animation:nwqh var(--nw-qh, .6s) linear forwards; }
@keyframes nwqh{ from{ opacity:.25; transform:scale(.72); } to{ opacity:1; transform:scale(1); } }
.nw-qi{ all:unset; box-sizing:border-box; width:min(80vw, 320px); height:48px; padding:0 18px; border-radius:24px; text-align:center; font-size:18px; letter-spacing:.2em; color:${K(255, 255, 255, 1)}; background:${K(255, 255, 255, .14)}; box-shadow:inset 0 0 0 1px ${K(255, 255, 255, .26)}; user-select:text; -webkit-user-select:text; touch-action:auto; }
.nw-qi:focus-visible{ outline:2px solid ${K(255, 255, 255, .9)}; outline-offset:3px; }
@media (prefers-reduced-motion:reduce){ .nw-qb{ transition:none; } .nw-qb.hd .nw-qr{ animation:none; opacity:1; } }
`;
const HGWallQA = {
  MAX: 3,
  HOLD: 600,
  CSS: HG_QA_CSS,
  /* domena → dozwolone akcje → [domena usługi, usługa]; nic spoza tej tabeli nie jest wywoływane */
  DOM: {
    script: { press: ['script', 'turn_on'] },
    scene: { press: ['scene', 'turn_on'] },
    button: { press: ['button', 'press'] },
    input_button: { press: ['input_button', 'press'] },
    switch: { toggle: ['homeassistant', 'toggle'], on: ['homeassistant', 'turn_on'], off: ['homeassistant', 'turn_off'] },
    light: { toggle: ['homeassistant', 'toggle'], on: ['homeassistant', 'turn_on'], off: ['homeassistant', 'turn_off'] },
    fan: { toggle: ['homeassistant', 'toggle'], on: ['homeassistant', 'turn_on'], off: ['homeassistant', 'turn_off'] },
    input_boolean: { toggle: ['homeassistant', 'toggle'], on: ['homeassistant', 'turn_on'], off: ['homeassistant', 'turn_off'] },
    cover: { open: ['cover', 'open_cover'], close: ['cover', 'close_cover'], toggle: ['cover', 'toggle'] },
    alarm_control_panel: { arm_away: ['alarm_control_panel', 'alarm_arm_away'], arm_home: ['alarm_control_panel', 'alarm_arm_home'], arm_night: ['alarm_control_panel', 'alarm_arm_night'], disarm: ['alarm_control_panel', 'alarm_disarm'] },
  },
  ICON: { script: 'mdi:script-text-play', scene: 'mdi:palette', button: 'mdi:gesture-tap-button', input_button: 'mdi:gesture-tap-button', switch: 'mdi:toggle-switch', light: 'mdi:lightbulb', fan: 'mdi:fan', input_boolean: 'mdi:toggle-switch', cover: 'mdi:window-shutter', alarm_control_panel: 'mdi:shield-home' },
  dom(e) { return String(e || '').split('.')[0]; },
  /* tylko własne właściwości tabeli DOM: 'constructor', 'toString', '__proto__' nie są domeną ani akcją */
  svc(e, a) {
    const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k), d = this.dom(e);
    return own(this.DOM, d) && own(this.DOM[d], a) ? this.DOM[d][a] : null;
  },
  actions(e) {
    const d = this.dom(e);
    return Object.prototype.hasOwnProperty.call(this.DOM, d) ? Object.keys(this.DOM[d]) : [];
  },
  /* roleta i alarm domyślnie wymagają przytrzymania (przypadkowy dotyk nie otwiera bramy) */
  hold(e) { return ['cover', 'alarm_control_panel'].includes(this.dom(e)); },
  norm(list) {
    const out = [];
    for (const x of Array.isArray(list) ? list : []) {
      if (out.length >= this.MAX) break;
      if (!x || typeof x !== 'object') continue;
      const e = typeof x.e === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(x.e) ? x.e : '';
      const acts = this.actions(e);
      if (!e || !acts.includes(x.a)) continue;
      out.push({
        e, a: x.a,
        ic: typeof x.ic === 'string' && /^mdi:[a-z0-9-]{1,60}$/.test(x.ic) ? x.ic : '',
        n: typeof x.n === 'string' ? x.n.trim().slice(0, 24) : '',
        hold: typeof x.hold === 'boolean' ? x.hold : this.hold(e),
      });
    }
    return out;
  },
  isOn(e, s) {
    if (!s) return false;
    const d = this.dom(e), t = s.state;
    if (d === 'alarm_control_panel') return /^(armed|arming|pending|triggered)/.test(t);
    if (d === 'cover') return t === 'open' || t === 'opening';
    if (['switch', 'light', 'fan', 'input_boolean'].includes(d)) return t === 'on';
    return false;
  },
  /* wywołanie usługi dla pozycji; need = trzeba najpierw zapytać o kod (alarm z code_format; rozbrajanie, a uzbrajanie gdy code_arm_required) */
  plan(item, s, code) {
    const d = this.dom(item.e), svc = this.svc(item.e, item.a);
    if (!svc) return null;
    const at = (s && s.attributes) || {};
    const fmt = d === 'alarm_control_panel' && (at.code_format === 'number' || at.code_format === 'text') ? at.code_format : '';
    const need = !!fmt && (item.a === 'disarm' || at.code_arm_required === true);
    const data = { entity_id: item.e };
    if (need && code) data.code = String(code);
    return { domain: svc[0], service: svc[1], data, need, fmt };
  },
  /* klawisz panelu kodu → nowy bufor i ewentualnie submit/cancel (czysta funkcja, kod żyje tylko w pamięci) */
  codeKey(buf, k) {
    if (k === 'del') return { buf: buf.slice(0, -1) };
    if (k === 'ok') return buf ? { buf, submit: true } : { buf };
    if (k === 'cancel') return { buf: '', cancel: true };
    if (/^[0-9]$/.test(k) && buf.length < 12) return { buf: buf + k };
    return { buf };
  },
  /* stan pozycji na przycisku: busy → ok/err, potem wygasa */
  mark(w, i, s) {
    const b = w.el && w.el.querySelector(`.nw-qb[data-qi="${i}"]`);
    if (!b) return;
    this._mt = this._mt || {};
    clearTimeout(this._mt[i]);
    b.dataset.st = s;
    if (s !== 'busy') this._mt[i] = setTimeout(() => { delete b.dataset.st; }, s === 'err' ? 2000 : 1200);
  },
  /* wykonanie bez wybudzania wygaszacza; alarm z kodem najpierw pyta o kod (ask) */
  exec(w, i, code) {
    const it = w.get().qa[i];
    if (!it || !w.hass) return Promise.resolve(false);
    const p = this.plan(it, w.hass.states[it.e], code);
    if (!p) return Promise.resolve(false);
    if (p.need && !code) { this.ask(w, i, it, p.fmt); return Promise.resolve(false); }
    this.mark(w, i, 'busy');
    return Promise.resolve()
      .then(() => H.call(w.hass, p.domain, p.service, p.data))
      .then(() => { this.mark(w, i, 'ok'); return true; }, () => { H.haptic('heavy'); this.mark(w, i, 'err'); return false; });
  },
  /* pointerdown z HGWall.wk: true = obsłużone (bez budzenia) */
  tap(w, e) {
    const b = e.target && e.target.closest && e.target.closest('.nw-qb');
    if (!b) return false;
    w.last = Date.now();
    const i = Number(b.dataset.qi), it = w.get().qa[i];
    if (!it) return true;
    if (!it.hold) { H.haptic('light'); this.exec(w, i); return true; }
    this.press(w, b, i);
    return true;
  },
  press(w, b, i) {
    this.cancelHold();
    const it = w.get().qa[i];
    b.classList.add('hd');
    const end = () => {
      clearTimeout(this._ht);
      if (this._end === end) this._end = null;
      b.classList.remove('hd');
      for (const t of ['pointerup', 'pointercancel']) window.removeEventListener(t, end, true);
    };
    this._end = end;
    for (const t of ['pointerup', 'pointercancel']) window.addEventListener(t, end, true);
    this._ht = setTimeout(() => {
      end();
      /* saver zamknięty/zablokowany albo konfiguracja zmieniona w trakcie przytrzymania: bez akcji */
      const cur = w.get().qa[i];
      if (!b.isConnected || w.locked || !it || !cur || cur.e !== it.e || cur.a !== it.a) return;
      H.haptic('medium');
      this.exec(w, i);
    }, this.HOLD);
  },
  layer(w) {
    const h = w.hass;
    return w.get().qa.map((it, i) => {
      const nm = it.n || H.name(h, it.e, it.e), lb = it.hold ? hgT('wallqa.hold_to', { name: nm }) : nm;
      const on = this.isOn(it.e, h && h.states[it.e]) ? 1 : 0;
      return `<button type="button" class="nw-qb" data-qi="${i}" data-on="${on}" aria-label="${H.esc(lb)}">${H.icon(it.ic || this.ICON[this.dom(it.e)])}<i class="nw-qr" aria-hidden="true"></i></button>`;
    }).join('');
  },
  fill(w, L) {
    const list = w.get().qa;
    L.dataset.k = JSON.stringify(list);
    L.style.setProperty('--nw-qh', `${this.HOLD}ms`);
    L.innerHTML = `<style>${HG_QA_CSS}</style>${this.layer(w)}`;
  },
  /* warstwa przycisków w .nw (wspólna dla stylów photo/board/glass); wywołane w show() przed wstawieniem do body */
  mount(w, el) {
    this._c = null;
    clearTimeout(this._ct);
    clearTimeout(this._ht);
    if (!w.get().qa.length) return;
    const L = document.createElement('div');
    L.className = 'nw-qa';
    L.setAttribute('role', 'group');
    L.setAttribute('aria-label', hgT('wallqa.group'));
    this.fill(w, L);
    el.appendChild(L);
  },
  /* przy każdej zmianie hass/konfiguracji: odbuduj przy zmianie listy, inaczej tylko data-on */
  paint(w) {
    const el = w.el;
    if (!el) return;
    const list = w.get().qa, L = el.querySelector('.nw-qa');
    if (!L) { if (list.length) this.mount(w, el); return; }
    if (!list.length) { L.remove(); return; }
    if (L.dataset.k !== JSON.stringify(list)) { this.fill(w, L); return; }
    for (const b of L.querySelectorAll('.nw-qb')) {
      const it = list[Number(b.dataset.qi)];
      const on = it && this.isOn(it.e, w.hass && w.hass.states[it.e]) ? '1' : '0';
      if (it && b.dataset.on !== on) b.dataset.on = on;
    }
  },
  /* panel kodu jak pinpad wygaszacza (HGWall.padEl), ale kod żyje tylko w this._c.buf (i w chwilowym polu tekstowym) i idzie do HA jako code */
  ask(w, i, it, fmt) {
    const el = w && w.el;
    if (!el || w.locked) return;
    this.close(w);
    const nm = it.n || H.name(w.hass, it.e, it.e);
    const pp = fmt === 'text' ? this.textPanel(nm) : w.padEl(nm, hgT('wallqa.cancel'));
    pp.classList.add('qc');
    const lead = pp.querySelector('.nw-pt > span:nth-of-type(2)');
    if (lead) lead.textContent = hgT('wallqa.enter_code');
    if (fmt !== 'text') pp.insertAdjacentHTML('beforeend', `<button type="button" class="nw-lb" data-k="ok"><span>${H.esc(hgT('wallqa.confirm'))}</span></button>`);
    this._c = { i, buf: '', fmt, pin: !el.classList.contains('pin') };
    el.classList.add('pin');
    /* dotyk w panel nie dochodzi do HGWall.wk (nie budzi wygaszacza) */
    pp.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const b = e.target.closest && e.target.closest('button');
      if (!b) return;
      e.preventDefault();
      w.last = Date.now();
      this.key(w, b.dataset.k);
    });
    const inp = pp.querySelector('.nw-qi');
    if (inp) {
      /* klawisze w polu nie docierają do keydown na nakładce (ten budzi wygaszacz i robi preventDefault) */
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        this.timer(w);
        if (e.key === 'Enter') { e.preventDefault(); this.key(w, 'ok'); }
        if (e.key === 'Escape') { e.preventDefault(); this.key(w, 'cancel'); }
      });
    }
    el.appendChild(pp);
    this.dots(w);
    this.timer(w);
    if (inp) inp.focus();
  },
  textPanel(nm) {
    const pp = document.createElement('div');
    pp.className = 'nw-pp';
    pp.setAttribute('role', 'group');
    pp.setAttribute('aria-label', nm);
    pp.innerHTML = `<div class="nw-pt"><span class="nw-li">${H.icon('mdi:shield-lock')}</span><span></span></div><input class="nw-qi" type="password" autocomplete="off" aria-label="${H.esc(hgT('wallqa.enter_code'))}"><button type="button" class="nw-lb" data-k="ok"><span>${H.esc(hgT('wallqa.confirm'))}</span></button><button type="button" class="nw-lb" data-k="lock"><span>${H.esc(hgT('wallqa.cancel'))}</span></button>`;
    return pp;
  },
  dots(w) {
    const d = w && w.el && w.el.querySelector('.nw-pp.qc .nw-dots');
    if (d) d.innerHTML = '<i class="on"></i>'.repeat((this._c || { buf: '' }).buf.length);
  },
  /* 20 s bez dotyku zamyka panel */
  timer(w) {
    clearTimeout(this._ct);
    this._ct = setTimeout(() => this.close(w), 20000);
  },
  key(w, k) {
    const c = this._c;
    if (!c) return;
    const inp = w && w.el && w.el.querySelector('.nw-pp.qc .nw-qi');
    if (c.fmt === 'text' && inp) c.buf = inp.value;
    const r = this.codeKey(c.buf, k === 'lock' ? 'cancel' : k);
    c.buf = r.buf;
    if (r.cancel) { this.close(w); return; }
    this.dots(w);
    this.timer(w);
    if (r.submit) { const { i } = c, code = c.buf; this.close(w); this.exec(w, i, code); }
  },
  /* przerywa oczekujące przytrzymanie (timer + nasłuch pointerup/pointercancel) */
  cancelHold() {
    clearTimeout(this._ht);
    if (this._end) this._end();
    this._end = null;
  },
  /* zamyka przytrzymanie i panel kodu; nie rzuca nawet gdy w/w.el to null (lockNow woła to bardzo wcześnie) */
  close(w) {
    this.cancelHold();
    clearTimeout(this._ct);
    const c = this._c;
    this._c = null;
    if (c) c.buf = '';
    const el = w && w.el;
    if (!el) return;
    const pp = el.querySelector('.nw-pp.qc');
    if (!pp) return;
    const inp = pp.querySelector('.nw-qi');
    if (inp) inp.value = '';
    pp.remove();
    if (c && c.pin) el.classList.remove('pin');
    if (el.focus) el.focus({ preventScroll: true });
  },
};
window.HGWallQA = HGWallQA;
