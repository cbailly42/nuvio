/* ===================== MINUTNIK: pozostały czas na łuku, start, pauza, anuluj (encja timer) ===================== */
const hgDur = (x) => { if (x == null) return NaN; if (typeof x === 'number') return x; const p = String(x).split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : +p[0]; };
const hgClock = (sec) => { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, z = (n) => String(n).padStart(2, '0'); return h ? `${h}:${z(m)}:${z(s)}` : `${m}:${z(s)}`; };
class HGTimerCard extends HGBase {
  static getStubConfig(h) { return { entity: hgStub(h, ['timer']) || null }; }
  defaults() { return { entity: null, name: null, icon: 'mdi:timer-outline' }; }
  css() { return HG_NV_CSS + U(`
.tw{ position:relative; max-width:240u; width:100%; margin:0 auto; } .tw .nv-big{ position:absolute; left:0; right:0; bottom:0; }
.bt{ display:flex; gap:var(--s1); justify-content:center; flex-wrap:wrap; }
`); }
  left(s) { const a = s.attributes; if (s.state === 'active' && a.finishes_at) return (Date.parse(a.finishes_at) - Date.now()) / 1000; if (s.state === 'paused') return hgDur(a.remaining); return hgDur(a.duration); }
  render() { const c = this._config, h = this._hass, s = H.st(h, c.entity);
    if (!s) return `<ha-card class="glass"><span class="nv-empty">${hgT('cards.timer.choose_a_timer')}</span></ha-card>`;
    const tot = hgDur(s.attributes.duration) || 0, l = this.left(s), p = tot ? Math.max(0, Math.min(100, (l / tot) * 100)) : 0, act = s.state === 'active', pau = s.state === 'paused';
    const st = act ? hgT('cards.timer.running') : pau ? hgT('cards.timer.paused') : hgT('cards.timer.ready');
    return `<ha-card class="glass ${H.ok(s) ? '' : 'un'}">${hgUI.header(c.name || H.name(h, c.entity), { icon: c.icon || s.attributes.icon, sub: st })}
      <div class="nv-mid"><div class="tw" role="timer" aria-live="off" aria-label="${H.esc(hgClock(l))}">${hgUI.arc(p, { label: hgT('cards.timer.remaining') })}<div class="nv-big col"><span class="nv-v" style="font-variant-numeric:tabular-nums">${hgClock(isFinite(l) ? l : 0)}</span><span class="nv-c">${st}</span></div></div>
      <div class="bt">${act ? hgUI.pill(hgT('common.pause'), { act: 'pause', icon: 'mdi:pause' }) : hgUI.pill(pau ? hgT('common.resume') : hgT('cards.timer.start'), { act: 'start', icon: 'mdi:play', on: true })}${act || pau ? hgUI.pill(hgT('common.cancel'), { act: 'cancel', icon: 'mdi:stop' }) : ''}</div></div></ha-card>`; }
  /* odliczanie: przerysowanie co sekundę tylko wtedy, gdy minutnik działa */
  afterRender() { const s = H.st(this._hass, this._config.entity), on = !!s && s.state === 'active' && this.isConnected;
    if (on && !this._tk) this._tk = setInterval(() => (this.isConnected ? (document.hidden || this._off || this.rerender()) : (clearInterval(this._tk), (this._tk = 0))), 1000);
    if (!on && this._tk) { clearInterval(this._tk); this._tk = 0; } }
  disconnectedCallback() { if (this._tk) { clearInterval(this._tk); this._tk = 0; } }
  connectedCallback() { super.connectedCallback(); if (this._html != null) this.rerender(); }
  onAct(a) { if (['start', 'pause', 'cancel'].includes(a)) { H.haptic(); H.call(this._hass, 'timer', a, { entity_id: this._config.entity }); } }
  getGridOptions() { return { columns: 6, rows: 3 }; }
}
hgReg('hg-timer-card', HGTimerCard, hgTLazy('cards.timer.picker_name'), hgTLazy('cards.timer.picker_description'));
