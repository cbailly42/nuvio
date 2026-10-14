/* shared/nv-card: wspólny układ nowych kart ogólnych (etap 6): szkło z klocków ui/, odstępy z tokenów, rozmiary S/M/L z zapytań kontenera.
   S (do 220 px): mniej odstępów, chowa .hide-s; L (od 420 px): pokazuje .show-l. */
const HG_NV_CSS = U(`
ha-card.glass{ display:flex; flex-direction:column; gap:var(--s2); padding:var(--s3); box-sizing:border-box; }
.nv-row{ display:flex; align-items:center; gap:var(--s1); min-width:0; } .nv-sp{ flex:1; min-width:0; }
.nv-name{ display:flex; flex-direction:column; min-width:0; flex:1; } .nv-name b{ font-size:var(--fs-md); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nv-name small{ font-size:var(--fs-xs); opacity:.6; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.nv-ic{ width:30u; height:30u; border-radius:50%; display:grid; place-items:center; flex:none; background:var(--hg-inner-bg); box-shadow:var(--hg-inner-hi);
  transition: background var(--hg-t-base) var(--hg-ease-out), color var(--hg-t-base) var(--hg-ease-out), box-shadow var(--hg-t-base) var(--hg-ease-out); }
.nv-ic ha-icon{ width:15u; height:15u; } .nv-ic.on{ background:var(--hg-accent); color:var(--hg-on-accent); box-shadow:0 0 14px var(--hg-accent-glow); }
button.nv-ic{ cursor:pointer; } button.nv-ic:active{ transform:scale(.94); }
.nv-mid{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:var(--s1); min-height:0; } .nv-mid > *{ flex-shrink:0; }
.nv-empty{ font-size:var(--fs-sm); opacity:.6; }
.un{ opacity:.55; }
.show-l{ display:none; }
@container (max-width: 220px){ ha-card.glass{ padding:var(--s2); gap:var(--s1); } .hide-s{ display:none !important; } }
@container (min-width: 420px){ .show-l{ display:revert; } }
`);
/* pierwsze imię zalogowanej osoby (powitanie) */
const hgFirstName = (h) => String((h && h.user && h.user.name) || '').trim().split(/\s+/)[0] || '';
/* menu ⋮ karty: szczegóły encji i ewentualne dodatkowe pozycje -> hgOverlay.menu */
const hgMoreMenu = (card, anchor, e, extra = []) => hgOverlay.menu(anchor, [...extra, { label: hgTr('Szczegóły', 'Details'), icon: 'mdi:information-outline', value: '__more' }])
  .then((v) => { if (v === '__more') H.fire(card, 'hass-more-info', { entityId: e }); return v; });
/* przeciąganie wartości 0..1 po elemencie (poziomo, albo po łuku dla svg.nv-arc); raz na węzeł, z klawiaturą */
const hgDragVal = (card, el, o) => {
  if (!card._once(el, 'drag')) return;
  const frac = (ev) => { const r = el.getBoundingClientRect();
    if (o.arc) { const x = ((ev.clientX - r.left) / r.width) * 200 - 100, y = 96 - ((ev.clientY - r.top) / r.height) * 104; const a = Math.atan2(Math.max(y, 0), x); return Math.max(0, Math.min(1, 1 - a / Math.PI)); }
    return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)); };
  let on = false;
  el.addEventListener('pointerdown', (ev) => { if (o.off && o.off()) return; on = true; try { el.setPointerCapture(ev.pointerId); } catch (x) { /* */ } card._busy = true; o.move(frac(ev)); ev.preventDefault(); });
  el.addEventListener('pointermove', (ev) => { if (on) o.move(frac(ev)); });
  const end = (ev) => { if (!on) return; on = false; card._busy = false; o.end(ev.type === 'pointercancel' ? null : frac(ev)); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', (ev) => { const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[ev.key]; if (!d || (o.off && o.off())) return; ev.preventDefault(); o.key(d); });
};
/* przykładowa konfiguracja dla wyboru kart HA (getStubConfig): pierwsza encja pasującej domeny */
const hgStub = (h, doms, f) => Object.keys((h && h.states) || {}).find((e) => doms.includes(hgDom(e)) && (!f || f(h.states[e])));
const hgNum = (s) => isFinite(parseFloat(s.state)) && !!s.attributes.unit_of_measurement;
