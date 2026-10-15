/* ===================== INTELIGENTNY ZAMEK: animowana kłódka w okrągłym przycisku, przytrzymanie do otwarcia (pierścień się wypełnia), zamykanie dotknięciem,
   kręcący się łuk w trakcie ruchu zamka, impuls po zmianie stanu, potrząśnięcie przy zacięciu, bateria i czujnik drzwi z tego samego urządzenia ===================== */
const HG_SL_C = { locked: '#13A89E', unlocked: '#FF9F43', open: '#FF9F43', jammed: '#FF4D4F', move: '#0A84FF', un: '#8E8E93' };
class HGSmartLockCard extends HGBase {
  static getStubConfig(h) { return { entity: hgStub(h, ['lock']) || null }; }
  defaults() { return { entity: null, name: null, title: hgTr('Zamek', 'Lock'), battery: null, door: null, hold: true }; }
  /* encja z tego samego urządzenia co zamek (rejestr HA), inaczej ten sam początek nazwy */
  static near(h, lock, f) { const S = (h && h.states) || {}, R = (h && h.entities) || {}, dev = lock && R[lock] && R[lock].device_id, L = Object.keys(S).filter((e) => e !== lock && f(e, S[e]));
    const base = lock ? lock.split('.')[1] : ''; return (dev && L.find((e) => R[e] && R[e].device_id === dev)) || (base && L.find((e) => e.split('.')[1].startsWith(base))) || null; }
  _bat() { const c = this._config, h = this._hass; if (c.battery) return c.battery; const a = h.states[c.entity] && h.states[c.entity].attributes;
    return a && a.battery_level != null ? '@attr' : HGSmartLockCard.near(h, c.entity, (e, s) => e.startsWith('sensor.') && s.attributes.device_class === 'battery'); }
  _door() { const c = this._config; return c.door || HGSmartLockCard.near(this._hass, c.entity, (e, s) => e.startsWith('binary_sensor.') && ['door', 'opening', 'window', 'garage_door'].includes(s.attributes.device_class)); }
  ents() { const b = this._bat(); return [this._config.entity, b && b !== '@attr' ? b : null, this._door()].filter(Boolean); }
  _changed() { this._entsC = null; return super._changed(); }
  _extraSig() { return [this._pend || '', this._pend ? Math.floor((Date.now() - this._pendT) / 9000) : 0, Math.floor(Date.now() / 60000)]; }
  css() { return HG_NV_CSS + U(`
ha-card.glass{ position:relative; overflow:hidden; display:flex; flex-direction:column; gap:0; padding:18u 18u 14u; min-height:300u; container-type:inline-size; isolation:isolate; --lk:${HG_SL_C.locked}; }
.hd{ display:flex; align-items:flex-start; justify-content:space-between; gap:10u; }
.hd > div{ min-width:0; } .hd small{ display:block; font-size:13px; opacity:.62; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; } .hd b{ display:block; margin-top:2u; font-size:19px; font-weight:600; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bt{ flex:none; display:inline-flex; align-items:center; gap:4u; height:28u; padding:0 10u 0 8u; border-radius:999px; font-size:13px; font-weight:600; font-variant-numeric:tabular-nums; background:color-mix(in srgb, currentColor 8%, transparent); }
.bt ha-icon{ --mdc-icon-size:18u; width:18u; height:18u; } .bt.low{ color:#FF4D4F; background:color-mix(in srgb, #FF4D4F 12%, transparent); }
/* środek: przycisk z kłódką i pierścieniem */
.mid{ flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10u; padding:14u 0 8u; }
.kb{ all:unset; box-sizing:border-box; position:relative; width:136u; height:136u; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; touch-action:manipulation; -webkit-tap-highlight-color:transparent;
  color:var(--lk); background:radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--lk) 16%, transparent), color-mix(in srgb, var(--lk) 6%, transparent) 70%);
  box-shadow:0 10u 34u color-mix(in srgb, var(--lk) 22%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--lk) 18%, transparent); transition:color .5s ease, box-shadow .5s ease, transform .25s cubic-bezier(.34,1.5,.5,1); }
.kb:active, .kb.hold{ transform:scale(.95); } .kb:focus-visible{ outline:3px solid var(--lk); outline-offset:4px; } .kb[disabled]{ cursor:default; }
.kb svg.rg{ position:absolute; inset:-9u; width:calc(100% + 18u); height:calc(100% + 18u); transform:rotate(-90deg); overflow:visible; pointer-events:none; }
.rg circle{ fill:none; stroke-width:4; stroke-linecap:round; } .rg .tr{ stroke:color-mix(in srgb, var(--lk) 14%, transparent); }
.rg .pg{ stroke:var(--lk); stroke-dasharray:100 100; stroke-dashoffset:100; opacity:0; transition:stroke-dashoffset .25s ease, opacity .25s ease; }
.kb.hold .rg .pg, .mv .rg .pg{ opacity:1; }
.kb.hold .rg .pg{ stroke-dashoffset:0; transition:stroke-dashoffset var(--hd, .9s) linear; }
.mv .rg .pg{ stroke-dasharray:28 72; stroke-dashoffset:0; transition:none; transform-origin:50% 50%; transform-box:fill-box; animation:slSpin 1s linear infinite; }
@keyframes slSpin{ to{ transform:rotate(360deg); } }
/* impuls po zmianie stanu */
.kb::after{ content:''; position:absolute; inset:0; border-radius:50%; border:2px solid var(--lk); opacity:0; pointer-events:none; }
.kb.pls::after{ animation:slPls .9s cubic-bezier(.2,.7,.3,1); } @keyframes slPls{ from{ opacity:.7; transform:scale(1); } to{ opacity:0; transform:scale(1.55); } }
/* kłódka: pałąk podnosi się i odchyla przy otwarciu */
.pl{ width:58u; height:58u; overflow:visible; } .pl .sh{ fill:none; stroke:currentColor; stroke-width:6.5; stroke-linecap:round; transform-box:fill-box; transform-origin:12% 100%; transition:transform .55s cubic-bezier(.34,1.56,.5,1); }
.pl .by{ fill:currentColor; } .pl .kh{ fill:var(--hg-card-bg, #fff); opacity:.9; transition:transform .45s cubic-bezier(.34,1.56,.5,1); transform-box:fill-box; transform-origin:50% 30%; }
.unl .pl .sh{ transform:translateY(-6px) rotate(-28deg); } .unl .pl .kh{ transform:rotate(90deg); }
.mv .pl .sh{ transform:translateY(-3px); }
.jam .pl{ animation:slShake .5s cubic-bezier(.36,.07,.19,.97) 2; } @keyframes slShake{ 10%, 90%{ transform:translateX(-1px); } 20%, 80%{ transform:translateX(3px); } 30%, 50%, 70%{ transform:translateX(-5px); } 40%, 60%{ transform:translateX(5px); } }
.st{ display:grid; text-align:center; } .st b{ font-size:22px; font-weight:700; letter-spacing:-.015em; color:var(--lk); transition:color .5s ease; }
.st b, .st small{ grid-area:auto; } .st small{ margin-top:3u; font-size:13px; opacity:.65; min-height:1.3em; }
.st b.in{ animation:slIn .4s cubic-bezier(.2,.8,.2,1) both; } @keyframes slIn{ from{ opacity:0; transform:translateY(8px); } }
/* dół: drzwi, otwarcie drzwi */
.ft{ display:flex; align-items:center; justify-content:center; gap:8u; flex-wrap:wrap; min-height:36u; }
.lc{ display:inline-flex; align-items:center; gap:6u; height:34u; padding:0 12u 0 10u; border-radius:999px; font-size:13px; font-weight:600; background:color-mix(in srgb, currentColor 7%, transparent); }
.lc ha-icon{ --mdc-icon-size:18u; width:18u; height:18u; } .lc.op{ color:#FF9F43; background:color-mix(in srgb, #FF9F43 13%, transparent); }
button.lc{ all:unset; box-sizing:border-box; cursor:pointer; display:inline-flex; align-items:center; gap:6u; height:34u; padding:0 14u 0 10u; border-radius:999px; font-size:13px; font-weight:600; color:var(--lk); background:color-mix(in srgb, var(--lk) 12%, transparent); }
button.lc:focus-visible{ outline:2px solid var(--lk); outline-offset:2px; }
@container (max-width:240px){ .kb{ width:104u; height:104u; } .pl{ width:44u; height:44u; } .st b{ font-size:18px; } .bt span{ display:none; } }
@media (prefers-reduced-motion:reduce){ .pl .sh, .pl .kh, .kb, .rg .pg{ transition:none; } .mv .rg .pg, .jam .pl, .kb.pls::after, .st b.in{ animation:none; } }
`); }
  _view(s) { const st = this._pend || s.state;
    if (!H.ok(s)) return { k: 'un', c: HG_SL_C.un, t: hgTr('Niedostępny', 'Unavailable') };
    if (st === 'jammed') return { k: 'jammed', c: HG_SL_C.jammed, t: hgTr('Zacięty', 'Jammed') };
    if (['locking', 'unlocking', 'opening'].includes(st)) return { k: 'move', c: HG_SL_C.move, t: st === 'locking' ? hgTr('Zamykanie…', 'Locking…') : st === 'opening' ? hgTr('Otwieranie drzwi…', 'Opening…') : hgTr('Otwieranie…', 'Unlocking…') };
    if (st === 'locked') return { k: 'locked', c: HG_SL_C.locked, t: hgTr('Zamknięty', 'Locked') };
    if (st === 'open') return { k: 'open', c: HG_SL_C.open, t: hgTr('Drzwi otwarte', 'Open') };
    return { k: 'unlocked', c: HG_SL_C.unlocked, t: hgTr('Otwarty', 'Unlocked') }; }
  _ago(s) { const m = Math.max(0, Math.round((Date.now() - new Date(s.last_changed)) / 60000));
    return m < 1 ? hgTr('przed chwilą', 'just now') : m < 60 ? hgTr(`${m} min temu`, `${m} min ago`) : m < 1440 ? hgTr(`${Math.floor(m / 60)} h temu`, `${Math.floor(m / 60)} h ago`) : new Intl.DateTimeFormat(HG_LOC(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(s.last_changed)); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><span class="nv-empty">${hgTr('Wybierz zamek', 'Choose a lock')}</span></ha-card>`;
    if (this._pend && (s.state !== this._pendFrom || Date.now() - this._pendT > 9000)) this._pend = null;
    const V = this._view(s), ok = H.ok(s), lk = V.k === 'locked', unl = ['unlocked', 'open'].includes(V.k), mv = V.k === 'move';
    const b = this._bat(), bv = b === '@attr' ? Number(s.attributes.battery_level) : b && h.states[b] ? Number(h.states[b].state) : NaN;
    const bi = !isFinite(bv) ? '' : `<span class="bt ${bv <= 20 ? 'low' : ''}" title="${H.esc(hgTr('Bateria', 'Battery'))}">${H.icon(bv <= 10 ? 'mdi:battery-alert-variant-outline' : bv <= 35 ? 'mdi:battery-30' : bv <= 70 ? 'mdi:battery-60' : 'mdi:battery-high')}<span>${H.esc(H.fmt(bv, 0))}%</span></span>`;
    const d = this._door(), ds = d && h.states[d], dOpen = ds && ds.state === 'on';
    const hint = !ok ? '' : mv ? '' : lk ? (c.hold !== false ? hgTr('Przytrzymaj, aby otworzyć', 'Hold to unlock') : hgTr('Dotknij, aby otworzyć', 'Tap to unlock')) : V.k === 'jammed' ? hgTr('Sprawdź drzwi i spróbuj ponownie', 'Check the door and try again') : hgTr('Dotknij, aby zamknąć', 'Tap to lock');
    const canOpen = ok && (s.attributes.supported_features & 1) && !mv;
    const lbl = mv ? V.t : lk ? hgTr('Otwórz zamek', 'Unlock') : hgTr('Zamknij zamek', 'Lock');
    return `<ha-card class="glass ${unl ? 'unl' : ''} ${mv ? 'mv' : ''} ${V.k === 'jammed' ? 'jam' : ''}" style="--lk:${V.c};--hd:${c.hold === false ? '0s' : '.9s'}">
      <div class="hd"><div><small>${H.esc(c.name || H.name(h, c.entity))}</small><b>${H.esc(c.title)}</b></div>${bi}</div>
      <div class="mid"><button class="kb" ${ok && !mv ? '' : 'disabled'} aria-label="${H.esc(lbl)}">
          <svg class="rg" viewBox="0 0 100 100" aria-hidden="true"><circle class="tr" cx="50" cy="50" r="48" pathLength="100"/><circle class="pg" cx="50" cy="50" r="48" pathLength="100"/></svg>
          <svg class="pl" viewBox="0 0 48 48" aria-hidden="true"><path class="sh" d="M15 22 V15 a9 9 0 0 1 18 0 V22"/><rect class="by" x="8" y="21" width="32" height="24" rx="7"/><rect class="kh" x="22.2" y="28" width="3.6" height="9" rx="1.8"/></svg></button>
        <div class="st" aria-live="polite"><b data-key="slt-${H.esc(V.k)}" class="${this._lastK && this._lastK !== V.k ? 'in' : ''}">${H.esc(V.t)}</b><small>${H.esc(hint || (ok ? this._ago(s) : ''))}</small></div></div>
      <div class="ft">${ds ? `<span class="lc ${dOpen ? 'op' : ''}">${H.icon(dOpen ? 'mdi:door-open' : 'mdi:door-closed')}${H.esc(dOpen ? hgTr('Drzwi otwarte', 'Door open') : hgTr('Drzwi zamknięte', 'Door closed'))}</span>` : ''}${canOpen ? `<button class="lc" data-act="open">${H.icon('mdi:door-open')}${H.esc(hgTr('Otwórz drzwi', 'Open door'))}</button>` : ''}</div></ha-card>`; }
  /* przytrzymanie: pierścień wypełnia się w --hd; puszczenie wcześniej anuluje. Zamykanie: zwykłe dotknięcie. Klawiatura: Enter/Spacja działa jak dotyk */
  afterRender() { const s = H.st(this._hass, this._config.entity), V = s && this._view(s), kb = this.$.querySelector('.kb');
    if (V && this._lastK && this._lastK !== V.k && V.k !== 'move' && kb) { kb.classList.remove('pls'); void kb.offsetWidth; kb.classList.add('pls'); if (V.k === 'locked' || V.k === 'unlocked') H.haptic(V.k === 'locked' ? 'medium' : 'light'); }
    if (V) this._lastK = V.k; if (!kb || !this._once(kb, 'hold')) return;
    const start = (e) => { if (kb.disabled || this._ht) return; const st = H.st(this._hass, this._config.entity); if (!st) return; const lk = st.state === 'locked';
      if (e && e.pointerType === 'mouse' && e.button !== 0) return;
      if (!lk || this._config.hold === false) { this._fire(lk ? 'unlock' : 'lock'); return; }
      kb.classList.add('hold'); H.haptic('selection'); this._ht = setTimeout(() => { this._ht = 0; kb.classList.remove('hold'); this._fire('unlock'); }, 900); };
    const stop = () => { if (!this._ht) return; clearTimeout(this._ht); this._ht = 0; kb.classList.remove('hold'); };
    kb.addEventListener('pointerdown', (e) => { try { kb.setPointerCapture(e.pointerId); } catch (x) { /* syntetyczne zdarzenie */ } start(e); });
    kb.addEventListener('pointerup', stop); kb.addEventListener('pointercancel', stop); kb.addEventListener('lostpointercapture', stop);
    kb.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(null); } });
    kb.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') stop(); });
    kb.addEventListener('contextmenu', (e) => e.preventDefault()); }
  async _fire(svc) { const c = this._config, h = this._hass, s = H.st(h, c.entity); if (!s) return; const data = { entity_id: c.entity };
    if (s.attributes.code_format) { const r = await hgOverlay.dialog({ title: c.name || H.name(h, c.entity), text: hgTr('Podaj kod zamka.', 'Enter the lock code.'), width: 340, collect: true,
      html: `<input name="code" type="password" inputmode="numeric" autocomplete="one-time-code" aria-label="${hgTr('Kod', 'Code')}" autofocus style="height:44px;border-radius:12px;border:0;padding:0 14px;font:inherit;font-size:16px;background:var(--hg-inner-bg);color:inherit;box-shadow:var(--hg-inner-hi)">`,
      actions: [{ label: hgTr('Anuluj', 'Cancel'), value: false }, { label: svc === 'lock' ? hgTr('Zamknij', 'Lock') : hgTr('Otwórz', 'Unlock'), value: true, kind: 'primary' }] });
      if (!r || !r.value) return; data.code = r.data.code; }
    H.haptic('medium'); this._pend = svc === 'lock' ? 'locking' : svc === 'open' ? 'opening' : 'unlocking'; this._pendFrom = s.state; this._pendT = Date.now(); this.rerender();
    setTimeout(() => this.rerender(), 9100); H.call(h, 'lock', svc, data); }
  onAct(a) { if (a === 'open') this._fire('open'); }
  disconnectedCallback() { super.disconnectedCallback(); clearTimeout(this._ht); this._ht = 0; }
  getCardSize() { return 5; }
  getGridOptions() { return { columns: 6, rows: 5 }; }
}
hgReg('hg-smartlock-card', HGSmartLockCard, hgTr('Nuvio – Inteligentny zamek', 'Nuvio – Smart lock'), hgTr('Animowana kłódka, przytrzymanie do otwarcia, bateria i drzwi', 'Animated padlock, hold to unlock, battery and door'));
