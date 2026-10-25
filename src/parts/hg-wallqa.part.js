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
  actions(e) { return Object.keys(this.DOM[this.dom(e)] || {}); },
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
    const d = this.dom(item.e), svc = (this.DOM[d] || {})[item.a];
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
};
window.HGWallQA = HGWallQA;
